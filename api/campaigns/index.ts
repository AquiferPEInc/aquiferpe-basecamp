import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { Readable } from 'stream'
import csv from 'csv-parser'
import { createSheet, appendToSheet } from '../_lib/google-drive'
import { encrypt } from '../_lib/crypto'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const { campaignName, campaignReferenceId, campaignDescription, csvData } = req.body

  console.log(`Received campaign creation request for: ${campaignName} (${campaignReferenceId})`)

  if (!campaignName || !campaignReferenceId || !csvData) {
    return res.status(400).json({ error: 'Campaign name, reference ID and prospect data are required' })
  }

  try {
    // Check if campaign name or reference ID already exists
    const { data: existingName } = await supabase.from('campaign').select('id').eq('name', campaignName)
    if (existingName && existingName.length > 0) {
      return res.status(409).json({ error: 'A campaign with this name already exists. Please choose a different name.' })
    }

    const { data: existingRefId } = await supabase.from('campaign').select('id').eq('reference_id', campaignReferenceId)
    if (existingRefId && existingRefId.length > 0) {
      return res.status(409).json({ error: 'A campaign with this Reference ID already exists. Please choose a different one.' })
    }

    // 1. Create Google Sheet
    console.log(`Creating Google Sheet with name: ${campaignName}`)
    const sheet = await createSheet(campaignName, campaignDescription)
    if (!sheet || !sheet.id) {
      throw new Error('Failed to create Google Sheet')
    }
    console.log(`Google Sheet created with ID: ${sheet.id}`)

    // Save campaign to Supabase
    const { error: insertError } = await supabase
      .from('campaign')
      .insert({
        name: campaignName,
        reference_id: campaignReferenceId,
        description: campaignDescription,
        spreadsheet_id: sheet.id,
        spreadsheet_url: sheet.webViewLink
      })
      
    if (insertError) {
      throw insertError
    }
    console.log(`Campaign saved to Supabase: ${campaignName}`)

    // 2. Parse CSV and generate links
    const prospects: any[] = []
    let rowCount = 0
    const readable = Readable.from([csvData])
    
    readable
      .pipe(csv())
      .on('data', (row) => {
        const email = row.email || row.Email
        if (email) {
          rowCount++
          prospects.push({
            first_name: row.first_name || row['First Name'] || '',
            last_name: row.last_name || row['Last Name'] || '',
            email: email,
            link: `https://www.aquiferpe.com/about-us?contact_id=${encrypt(email)}`,
            reference_id: `${campaignReferenceId}_${rowCount}`
          })
        }
      })
      .on('end', async () => {
        try {
          console.log(`Parsed ${prospects.length} prospects. Appending to sheet...`)
          // 3. Append to Google Sheet
          const dataToAppend = prospects.map(p => [p.first_name, p.last_name, p.email, p.link, p.reference_id])
          
          if (dataToAppend.length > 0) {
            await appendToSheet(sheet.id!, dataToAppend)
          }
          console.log('Successfully appended data to sheet.')

          res.status(201).json({
            message: 'Campaign created successfully!',
            sheetId: sheet.id,
            sheetUrl: sheet.webViewLink,
            prospectsCount: prospects.length
          })
        } catch (error: any) {
          console.error('Error appending to sheet:', error)
          res.status(500).json({ error: 'Failed to append data to Google Sheet', details: error.message })
        }
      })
  } catch (error: any) {
    console.error('Error creating campaign:', error)
    res.status(500).json({ error: 'Failed to create campaign', details: error.message })
  }
}
