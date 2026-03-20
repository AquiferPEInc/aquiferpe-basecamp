import { useState } from 'react'

interface SearchBarProps {
  initialQuery?: string
  onSearch: (q: string) => void
  loading?: boolean
}

export default function SearchBar({ initialQuery = '', onSearch, loading }: SearchBarProps) {
  const [q, setQ] = useState(initialQuery)

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault()
    onSearch(q)
  }

  return (
    <form onSubmit={submit} className="flex w-full max-w-3xl items-center gap-2">
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Enter keywords (e.g., hydro AND structural)"
        aria-label="Search keywords"
        className="input w-full"
      />
      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? 'Searching...' : 'Search'}
      </button>
    </form>
  )
}
