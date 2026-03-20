import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { readSheet } from './_lib/google-drive'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
)

// This endpoint is triggered directly by Vercel Cron
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Optional: secure the endpoint using a secret token passed from Vercel Crons
  const authHeader = req.headers.authorization
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }

  console.log('Starting campaign spreadsheet scan (Vercel Cron)...')

  try {
    // Fetch all campaigns
    const { data: campaigns, error: campaignError } = await supabase
      .from('campaign')
      .select('*')

    if (campaignError) throw campaignError

    console.log(`Found ${campaigns?.length || 0} campaigns to scan.`)

    for (const campaign of campaigns || []) {
      if (!campaign.spreadsheet_id) {
        continue
      }

      try {
        const rows = await readSheet(campaign.spreadsheet_id)

        if (!rows || rows.length < 2) {
          continue
        }

        const header = rows[0].map((h: any) => String(h).trim().toLowerCase())
        
        const statusIdx = header.indexOf('campaign status')
        const refIdIdx = header.indexOf('reference_id')
        const emailIdx = header.indexOf('email')

        if (statusIdx === -1) {
          // No tracking column
          continue
        }

        if (refIdIdx === -1 || emailIdx === -1) {
          console.warn(`Campaign "${campaign.name}" missing required "reference_id" or "email" columns.`)
          continue
        }

        let newCommunicationsCount = 0

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i]
          if (!row[statusIdx]) continue

          const status = String(row[statusIdx]).trim()
          
          if (status === 'EMAIL_SENT') {
            const refId = String(row[refIdIdx] || '').trim()
            const email = String(row[emailIdx] || '').trim().toLowerCase()

            if (refId && email) {
              // Check if communication already exists using reference_id
              const { data: commCheck } = await supabase
                .from('communication')
                .select('id')
                .eq('reference_id', refId)

              if (!commCheck || commCheck.length === 0) {
                // Find client
                const { data: clientCheck } = await supabase
                  .from('client')
                  .select('id')
                  .eq('email', email)
                  .single()

                if (clientCheck) {
                  const clientId = clientCheck.id
                  
                  // Create communication record
                  await supabase
                    .from('communication')
                    .insert({
                      client_id: clientId,
                      type: 'email',
                      notes: campaign.description || `Campaign: ${campaign.name}`,
                      reference_id: refId
                    })
                    
                  newCommunicationsCount++
                }
              }
            }
          }
        }

        if (newCommunicationsCount > 0) {
          console.log(`Created ${newCommunicationsCount} new communication records for campaign "${campaign.name}".`)
        }

      } catch (err: any) {
        console.error(`Failed to read/process sheet for campaign ${campaign.name}:`, err.message)
      }
    }

    console.log('Campaign scan completed.')
    return res.status(200).json({ success: true, message: 'Scan finished successfully.' })

  } catch (error: any) {
    console.error('Error during campaign scan:', error)
    return res.status(500).json({ success: false, error: error.message })
  }
}
