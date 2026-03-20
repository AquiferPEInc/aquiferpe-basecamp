import { useState, useEffect } from 'react'
import { Company } from '../types/company'

interface CompanySearchProps {
  onSelectCompany: (companyId: number) => void
  initialCompanyName?: string
  required?: boolean
}

import { supabase } from '../lib/supabase'

export default function CompanySearch({ onSelectCompany, initialCompanyName, required = false }: CompanySearchProps) {
  const [searchTerm, setSearchTerm] = useState(initialCompanyName || '')
  const [results, setResults] = useState<Company[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [initialized, setInitialized] = useState(false)

  // Initialize with prop but allow editing
  useEffect(() => {
    if (initialCompanyName && !initialized) {
      setSearchTerm(initialCompanyName)
      setInitialized(true)
    }
  }, [initialCompanyName, initialized])

  useEffect(() => {
    if (searchTerm.length < 2) {
      setResults([])
      setIsOpen(false)
      return
    }

    // Don't search if the search term matches the initial prop and user hasn't typed (prevents popup on load)
    if (initialCompanyName && searchTerm === initialCompanyName && !isOpen) {
        return
    }

    const fetchCompanies = async () => {
      setLoading(true)
      setError(null)
      setIsOpen(true)
      try {
        const { data, error: sbError } = await supabase
          .from('company')
          .select('*')
          .or(`company_name.ilike.%${searchTerm}%,acec_chapter.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%`)
          .order('company_name', { ascending: true })
          .limit(25)

        if (sbError) {
          throw sbError
        }
        setResults(data || [])
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    const debounceFetch = setTimeout(fetchCompanies, 300)
    return () => clearTimeout(debounceFetch)
  }, [searchTerm])


  const handleSelect = (company: Company) => {
    setSearchTerm(company.company_name)
    onSelectCompany(company.id)
    setIsOpen(false)
    setResults([])
  }

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-slate-700 mb-2">
        Company {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="input w-full"
        placeholder="Search for a company"
      />
      {isOpen && (
        <div className="absolute z-10 w-full bg-white border border-slate-300 rounded-lg mt-1 max-h-60 overflow-y-auto">
          {loading && <div className="p-2 text-slate-500">Loading...</div>}
          {error && <div className="p-2 text-red-500">{error}</div>}
          {!loading && !error && results.length === 0 && searchTerm.length >= 2 && (
            <div className="p-2 text-slate-500">No companies found</div>
          )}
          {results.map((company) => (
            <div
              key={company.id}
              className="p-2 hover:bg-slate-100 cursor-pointer"
              onClick={() => handleSelect(company)}
            >
              {company.company_name}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
