import { supabase } from './supabase'

export type EsHit<T = Record<string, unknown>> = {
  _index: string
  _id: string
  _score?: number
  _source?: T
  highlight?: Record<string, string[]>
}

export type EsSearchResponse<T = Record<string, unknown>> = {
  hits: {
    total?: { value: number }
    hits: EsHit<T>[]
  }
  took?: number
}

export async function searchElasticsearch(query: string, selectedStates: string[] = [], size = 100): Promise<EsSearchResponse> {
  const start = Date.now()
  let sbQuery = supabase.from('freelancer').select('*')

  if (query) {
    const formattedQuery = query.trim().split(/\s+/).join(' & ')
    sbQuery = sbQuery.textSearch('fts', formattedQuery, { type: 'websearch' })
  }

  if (selectedStates && selectedStates.length > 0) {
    sbQuery = sbQuery.in('state', selectedStates)
  }

  const { data, error } = await sbQuery.limit(size)

  if (error) {
    throw new Error(`Search failed: ${error.message}`)
  }

  const hits = (data || []).map((row: any) => ({
    _index: 'freelancer',
    _id: row.id.toString(),
    _source: {
      url: row.linkedin_url,
      name: row.name,
      title: row.title,
      location: row.location_name,
      state: row.state,
      about: row.about,
      current_position: row.current_position,
      experience: row.experience,
      license: row.license
    }
  }))

  return {
    hits: {
      total: { value: hits.length },
      hits
    },
    took: Date.now() - start
  }
}

export async function getFreelancerCount(): Promise<number> {
  const { count, error } = await supabase
    .from('freelancer')
    .select('*', { count: 'exact', head: true })

  if (error) {
    throw new Error(`Failed to fetch freelancer count: ${error.message}`)
  }

  return count || 0
}

