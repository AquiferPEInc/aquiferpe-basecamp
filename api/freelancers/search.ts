import { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
)

// Hardcoded API keys for this endpoint, one per consuming service.
// `mask: false` marks a trusted internal consumer that receives the unmasked name.
const API_KEYS: Record<string, { mask: boolean }> = {
  'cebe645c5ea12e547b5cf1054c6ee84b6e69cb96e8ca87f1': { mask: false },
  '70807c940d5c4e3a1b6b2d33583e2971f690b06b08df4b80': { mask: true },
}

function maskName(name: string | null): string | null {
  if (!name) return name

  const truncated = name.split(',')[0]

  return truncated
    .split('')
    .map((char, i) => (i < 4 || !/[a-zA-Z]/.test(char) ? char : '*'))
    .join('')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const apiKey = req.headers['x-api-key']
  const keyConfig = typeof apiKey === 'string' ? API_KEYS[apiKey] : undefined
  if (!keyConfig) {
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
      name: keyConfig.mask ? maskName(row.name) : row.name,
      location: row.location_name,
      abstract: row.abstract,
      score: row.result_score
    }))

    res.status(200).json({ results })
  } catch (error: any) {
    console.error('Freelancer search API error:', error)
    res.status(500).json({ error: 'Search failed', details: error.message })
  }
}
