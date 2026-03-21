
import { useState, useEffect } from 'react'
import { useMutation, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { searchElasticsearch, getFreelancerCount, EsSearchResponse } from '../lib/freelancer-search'
import SearchBar from '../components/freelancer/SearchBar'
import StateFilter from '../components/freelancer/StateFilter'
import ResultsList from '../components/freelancer/ResultsList'

const queryClient = new QueryClient()

export default function FreelancerPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <FreelancerSearch />
    </QueryClientProvider>
  )
}

function FreelancerSearch() {
  const [results, setResults] = useState<EsSearchResponse | null>(null)
  const [selectedStates, setSelectedStates] = useState<string[]>([])
  const [totalCount, setTotalCount] = useState<number | null>(null)
  const [countLoading, setCountLoading] = useState(true)
  const [lastQuery, setLastQuery] = useState('')

  const { mutate, isPending } = useMutation({
    mutationFn: ({ query, states }: { query: string; states: string[] }) => 
      searchElasticsearch(query, states),
    onSuccess: (data) => {
      setResults(data)
    },
    onError: (err: any) => {
      console.error(err)
      alert(`Search Error: ${err.message}`)
    },
  })

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const count = await getFreelancerCount()
        setTotalCount(count)
      } catch (error) {
        console.error('Error fetching freelancer count:', error)
      } finally {
        setCountLoading(false)
      }
    }
    fetchCount()
    
    // Initial fetch
    mutate({ query: '', states: [] })
  }, [mutate])

  // Re-trigger search when states change
  useEffect(() => {
    mutate({ query: lastQuery, states: selectedStates })
  }, [selectedStates, mutate])

  const handleSearch = (query: string) => {
    setLastQuery(query)
    mutate({ query, states: selectedStates })
  }

  return (
    <div>
      <div className="mb-8 text-left">
        <h1 className="text-3xl font-bold text-slate-900">Freelancer Search</h1>
        <p className="text-sm text-slate-500 mt-2">
          Total Freelancers: <span className="font-semibold text-slate-700">
            {countLoading ? 'Loading...' : (totalCount !== null ? totalCount.toLocaleString() : 'Error')}
          </span>
        </p>
      </div>

      <div className="card mb-8 max-w-2xl">
        <div className="flex flex-col items-left gap-4">
          <SearchBar onSearch={handleSearch} loading={isPending} />
          <div className="w-full max-w-sm">
            <StateFilter
              selectedStates={selectedStates}
              onStatesChange={setSelectedStates}
            />
          </div>
        </div>
      </div>
      
      {isPending && (
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-slate-600">Searching...</p>
        </div>
      )}

      {results && (
        <div className="card">
          <ResultsList hits={results.hits.hits} took={results.took} />
        </div>
      )}
    </div>
  )
}
