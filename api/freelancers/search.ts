import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
)

// Hardcoded API key for this public search endpoint.
const API_KEY = 'cebe645c5ea12e547b5cf1054c6ee84b6e69cb96e8ca87f1'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  if (req.headers['x-api-key'] !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const q = typeof req.query.q === 'string' ? req.query.q.trim() : ''
  if (!q) {
    return res.status(400).json({ error: 'Query parameter "q" is required' })
  }

  const requestedSize = parseInt(req.query.limit as string, 10)
  const size = Number.isFinite(requestedSize) ? Math.min(Math.max(requestedSize, 1), 100) : 50

  try {
    const { data, error } = await supabase.rpc('search_freelancers', {
      search_query: q,
      selected_states: [],
      result_size: size
    })

    if (error) throw error

    const results = (data || []).map((row: any) => ({
      id: row.id,
      abstract: row.abstract
    }))

    res.status(200).json({ results })
  } catch (error: any) {
    console.error('Freelancer search API error:', error)
    res.status(500).json({ error: 'Search failed', details: error.message })
  }
}
