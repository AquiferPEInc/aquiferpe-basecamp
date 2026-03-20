import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { deleteFile } from '../_lib/google-drive'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const { id } = req.query
    const campaignId = parseInt(id as string, 10)

    if (isNaN(campaignId)) {
      return res.status(400).json({ error: 'Invalid campaign ID' })
    }

    // Get campaign details to find spreadsheet_id
    const { data: campaignResult, error: fetchError } = await supabase
      .from('campaign')
      .select('*')
      .eq('id', campaignId)
      .single()

    if (fetchError || !campaignResult) {
      return res.status(404).json({ error: 'Campaign not found' })
    }

    const campaign = campaignResult

    // Delete spreadsheet from Google Drive
    try {
      if (campaign.spreadsheet_id) {
        console.log(`Deleting spreadsheet ${campaign.spreadsheet_id} for campaign ${campaignId}`)
        await deleteFile(campaign.spreadsheet_id)
      }
    } catch (driveError: any) {
      console.error('Error deleting Google Sheet:', driveError)
      if (driveError.code === 404 || (driveError.errors && driveError.errors[0]?.reason === 'notFound')) {
        console.log('Spreadsheet not found, proceeding with DB deletion.')
      }
    }

    // Delete from Supabase
    const { error: deleteError } = await supabase
      .from('campaign')
      .delete()
      .eq('id', campaignId)

    if (deleteError) {
      throw deleteError
    }

    res.json({ message: 'Campaign deleted successfully' })
  } catch (error: any) {
    console.error('Error deleting campaign:', error)
    res.status(500).json({ error: 'Failed to delete campaign', details: error.message })
  }
}
