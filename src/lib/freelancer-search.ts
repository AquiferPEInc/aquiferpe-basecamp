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
  let data, error;

  if (query) {
    const { data: rpcData, error: rpcError } = await supabase.rpc('search_freelancers', {
      search_query: query,
      selected_states: selectedStates,
      result_size: size
    })
    data = rpcData;
    error = rpcError;
  } else {
    let sbQuery = supabase.from('freelancer').select('*')
    if (selectedStates && selectedStates.length > 0) {
      sbQuery = sbQuery.in('state', selectedStates)
    }
    const { data: selectData, error: selectError } = await sbQuery.limit(size)
    data = selectData;
    error = selectError;
  }

  if (error) {
    throw new Error(`Search failed: ${error.message}`)
  }

  if (data && data.length > 0) {
    console.log('Freelancer data sample keys:', Object.keys(data[0]))
    console.log('Freelancer name field value:', data[0].name)
  }

  const hits = (data || []).map((row: any) => ({
    _index: 'freelancer',
    _id: row.id.toString(),
    _source: {
      url: row.linkedin_url,
      name: row.name || (row.first_name || row.last_name ? `${row.first_name || ''} ${row.last_name || ''}`.trim() : undefined),
      title: row.title,
      location: row.location_name,
      state: row.state,
      about: row.about,
      current_position: row.current_position,
      experience: row.experience,
      license: row.license
    },
    _score: row.result_score,
    highlight: row.headline_about || row.headline_experience || row.headline_license ? {
      about: row.headline_about ? [row.headline_about] : undefined,
      experience: row.headline_experience ? [row.headline_experience] : undefined,
      license: row.headline_license ? [row.headline_license] : undefined
    } : undefined
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

