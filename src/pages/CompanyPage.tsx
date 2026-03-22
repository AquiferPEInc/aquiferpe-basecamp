import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Company, PaginatedResponse } from '../types'
import AddCompanyForm from '../components/AddCompanyForm'
import CompanyDetailsPopup from '../components/CompanyDetailsPopup'
import SearchableFilter from '../components/SearchableFilter'
import MultiSelectFilter from '../components/MultiSelectFilter'
import { openInWindow } from '../lib/window-open'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

interface CompanyFilterPreset {
  id: string;
  name: string;
  acecChapter: string;
  city: string;
  website: string;
  hasClients: string;
}

interface CompanyPaginatedResponse extends PaginatedResponse<Company> { }

export default function CompanyPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [pagination, setPagination] = useState<CompanyPaginatedResponse['pagination']>({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  })
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [checkedCompanies, setCheckedCompanies] = useState<Set<number>>(new Set())
  const [presets, setPresets] = useState<CompanyFilterPreset[]>([])
  const [showSavePreset, setShowSavePreset] = useState(false)
  const [newPresetName, setNewPresetName] = useState('')
  const [acecChapterFilter, setAcecChapterFilter] = useState(() => {
    return localStorage.getItem('company_acec_filter') || ''
  })
  const [cityFilter, setCityFilter] = useState('')
  const [websiteFilter, setWebsiteFilter] = useState('true')
  const [hasClientsFilter, setHasClientsFilter] = useState('true')

  const fetchCompanies = async (page: number, limit: number, search: string = '') => {
    setLoading(true)
    setError(null)

    try {
      let query = supabase.from('company').select('*', { count: 'exact' })

      if (search.trim()) {
        const safeSearch = search.replace(/"/g, '\\"')
        const queryStr = `"%${safeSearch}%"`
        query = query.or(`company_name.ilike.${queryStr},acec_chapter.ilike.${queryStr},city.ilike.${queryStr}`)
      } else {
        if (acecChapterFilter) {
          if (acecChapterFilter.includes('|')) {
            query = query.in('acec_chapter', acecChapterFilter.split('|').map(s => s.trim()))
          } else {
            query = query.eq('acec_chapter', acecChapterFilter)
          }
        }
        if (cityFilter) {
          query = query.eq('city', cityFilter)
        }
        if (websiteFilter === 'true') {
          query = query.not('website', 'is', null).neq('website', '')
        } else if (websiteFilter === 'false') {
          query = query.or('website.is.null,website.eq.""')
        }
        if (hasClientsFilter === 'true') {
          query = query.gt('client_count', 0)
        } else if (hasClientsFilter === 'false') {
          query = query.or('client_count.is.null,client_count.eq.0')
        }
      }

      // Pagination
      const from = (page - 1) * limit
      const to = from + limit - 1

      const { data, error: sbError, count } = await query
        .order('company_name', { ascending: true })
        .range(from, to)

      if (sbError) throw sbError

      const total = count || 0
      setCompanies(data || [])
      setPagination({
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      })
      setCheckedCompanies(new Set())
    } catch (err: any) {
      setError(err.message || 'Failed to fetch companies')
      console.error('Error fetching companies:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCompanies(currentPage, pageSize, searchQuery)
  }, [currentPage, pageSize, searchQuery, acecChapterFilter, cityFilter, websiteFilter, hasClientsFilter])

  useEffect(() => {
    const fetchPresets = async () => {
      if (!user) return
      try {
        const { data, error } = await supabase
          .from('company_filter_presets')
          .select('*')
          .eq('user_id', user.id)
          .order('name', { ascending: true })

        if (error) throw error

        if (data) {
          setPresets(data.map(d => ({
            id: d.id,
            name: d.name,
            acecChapter: d.acec_chapter || '',
            city: d.city || '',
            website: d.website || '',
            hasClients: d.has_clients || ''
          })))
        }
      } catch (err) {
        console.error('Failed to load presets:', err)
      }
    }
    
    fetchPresets()
  }, [user])

  const fetchAcecChapterOptions = useCallback(async (search: string): Promise<string[]> => {
    try {
      let query = supabase.from('company').select('acec_chapter')
      if (search) {
        query = query.ilike('acec_chapter', `%${search}%`)
      }
      const { data, error } = await query
        .not('acec_chapter', 'is', null)
        .neq('acec_chapter', '')
        .limit(50)

      if (error) throw error
      
      const uniqueChapters = Array.from(new Set(data.map(d => d.acec_chapter)))
      return uniqueChapters
    } catch (error) {
      console.error('Error fetching acec chapter options:', error)
      return []
    }
  }, [])

  const fetchCityOptions = useCallback(async (search: string): Promise<string[]> => {
    try {
      let query = supabase.from('company').select('city')
      if (search) {
        query = query.ilike('city', `%${search}%`)
      }
      const { data, error } = await query
        .not('city', 'is', null)
        .neq('city', '')
        .limit(50)

      if (error) throw error
      
      const uniqueCities = Array.from(new Set(data.map(d => d.city)))
      return uniqueCities
    } catch (error) {
      console.error('Error fetching city options:', error)
      return []
    }
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1) // Reset to first page when searching
    fetchCompanies(1, pageSize, searchQuery)
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setCurrentPage(newPage)
    }
  }

  const handlePageSizeChange = (newSize: number) => {
    if (newSize >= 1 && newSize <= 100) {
      setPageSize(newSize)
      setCurrentPage(1) // Reset to first page when changing page size
    }
  }

  const handleCheckCompany = (companyId: number, checked: boolean) => {
    const newChecked = new Set(checkedCompanies)
    if (checked) {
      newChecked.add(companyId)
    } else {
      newChecked.delete(companyId)
    }
    setCheckedCompanies(newChecked)
  }

  const handleCheckAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(companies.map(c => c.id))
      setCheckedCompanies(allIds)
    } else {
      setCheckedCompanies(new Set())
    }
  }

  const handleViewAssociatedClients = () => {
    const selectedCompanyNames = companies
      .filter(c => checkedCompanies.has(c.id))
      .map(c => c.company_name)
    
    if (selectedCompanyNames.length > 0) {
      navigate(`/client?company_name=${encodeURIComponent(selectedCompanyNames.join('|'))}`)
    }
  }

  const totalSelectedClients = useMemo(() => {
    return companies
      .filter(c => checkedCompanies.has(c.id))
      .reduce((sum, c) => sum + (c.client_count || 0), 0)
  }, [companies, checkedCompanies])

  const handleAcecFilterChange = (value: string) => {
    setAcecChapterFilter(value)
    localStorage.setItem('company_acec_filter', value)
    setCurrentPage(1)
  }

  const handleSavePreset = async () => {
    if (!newPresetName.trim() || !user) return

    const name = newPresetName.trim()
    const existing = presets.find(p => p.name.toLowerCase() === name.toLowerCase())
    if (existing) {
      alert("A preset with this name already exists.")
      return
    }

    try {
      const { data, error } = await supabase
        .from('company_filter_presets')
        .insert({
          user_id: user.id,
          name: name,
          acec_chapter: acecChapterFilter,
          city: cityFilter,
          website: websiteFilter,
          has_clients: hasClientsFilter
        })
        .select()
        .single()

      if (error) throw error

      if (data) {
        const newPreset: CompanyFilterPreset = {
          id: data.id,
          name: data.name,
          acecChapter: data.acec_chapter || '',
          city: data.city || '',
          website: data.website || '',
          hasClients: data.has_clients || ''
        }
        setPresets([...presets, newPreset].sort((a, b) => a.name.localeCompare(b.name)))
        setNewPresetName('')
        setShowSavePreset(false)
      }
    } catch (err) {
      console.error('Failed to save preset:', err)
      alert("Failed to save preset.")
    }
  }

  const handleLoadPreset = (preset: CompanyFilterPreset) => {
    handleAcecFilterChange(preset.acecChapter)
    setCityFilter(preset.city)
    setWebsiteFilter(preset.website)
    setHasClientsFilter(preset.hasClients)
    setCurrentPage(1)
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Company Database</h1>
        <p className="text-sm text-slate-500 mt-2">
          Total Companies: <span className="font-semibold text-slate-700">{pagination.total.toLocaleString()}</span>
        </p>
      </div>

      {selectedCompany && (
        <CompanyDetailsPopup
          company={selectedCompany}
          onClose={() => setSelectedCompany(null)}
          onCompanyUpdated={(updatedCompany) => {
            setSelectedCompany(updatedCompany)
            fetchCompanies(currentPage, pageSize, searchQuery)
          }}
        />
      )}

      <div className="card">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Company Directory</h2>
            <p className="text-slate-600">
              {searchQuery ? `Search results for "${searchQuery}"` : 'Browse all companies in the database'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleViewAssociatedClients}
              disabled={checkedCompanies.size === 0}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              View Associated Clients ({totalSelectedClients})
            </button>
            <button
              className="btn-primary"
              onClick={() => setShowAddForm(true)}
            >
              Add New Company
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <form onSubmit={handleSearch} className="flex md:w-3/5">
            <input
              type="text"
              placeholder="Search companies or industries..."
              className="input rounded-r-none border-r-0 flex-grow"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              type="submit"
              className="btn-primary rounded-l-none px-4"
              disabled={loading}
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </form>
        </div>

        {/* Filters */}
        <div className="p-4 bg-slate-50 border-t border-b border-slate-200 mb-6 -mx-6 px-10 space-y-4">
          <div className="flex flex-wrap gap-6 items-end">
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">
                Presets
              </label>
              <div className="flex items-center space-x-2">
                <select
                  className="input py-1.5 text-sm w-44"
                  onChange={(e) => {
                    const val = e.target.value
                    if (val) {
                      const preset = presets.find(p => p.id === val)
                      if (preset) handleLoadPreset(preset)
                      e.target.value = '' // Reset selector
                    }
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>Load Preset...</option>
                  {presets.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <div className="relative">
                  <button
                    onClick={() => setShowSavePreset(!showSavePreset)}
                    className="text-sm text-primary-600 hover:text-primary-800 font-medium whitespace-nowrap mb-1.5"
                  >
                    Save
                  </button>
                  {showSavePreset && (
                    <div className="absolute top-8 left-0 z-10 w-64 p-3 bg-white border border-slate-200 rounded-lg shadow-lg">
                      <div className="flex flex-col space-y-2">
                        <label className="text-xs font-semibold text-slate-700">Preset Name</label>
                        <input
                          type="text"
                          className="input text-sm py-1.5"
                          placeholder="e.g. Active LA Comps"
                          value={newPresetName}
                          onChange={(e) => setNewPresetName(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSavePreset()
                            if (e.key === 'Escape') setShowSavePreset(false)
                          }}
                        />
                        <div className="flex justify-between items-center pt-2">
                          <button
                            className="text-xs font-medium text-slate-500 hover:text-slate-700"
                            onClick={() => setShowSavePreset(false)}
                          >
                            Cancel
                          </button>
                          <button
                            className="bg-primary-600 text-white text-xs font-medium px-3 py-1.5 rounded hover:bg-primary-700"
                            onClick={handleSavePreset}
                            disabled={!newPresetName.trim()}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <MultiSelectFilter
              label="ACEC Chapter"
              value={acecChapterFilter}
              onChange={handleAcecFilterChange}
              fetchOptions={fetchAcecChapterOptions}
              placeholder="Select chapters..."
            />
            <SearchableFilter
              label="City"
              value={cityFilter}
              onChange={(value) => {
                setCityFilter(value)
                setCurrentPage(1)
              }}
              fetchOptions={fetchCityOptions}
              placeholder="Search city..."
            />
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">
                Website Status
              </label>
              <select
                className="input py-1.5 text-sm w-48"
                value={websiteFilter}
                onChange={(e) => {
                  setWebsiteFilter(e.target.value)
                  setCurrentPage(1)
                }}
              >
                <option value="">All</option>
                <option value="true">Has Website</option>
                <option value="false">No Website</option>
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">
                Asso. Client
              </label>
              <select
                className="input py-1.5 text-sm w-48"
                value={hasClientsFilter}
                onChange={(e) => {
                  setHasClientsFilter(e.target.value)
                  setCurrentPage(1)
                }}
              >
                <option value="">All</option>
                <option value="true">Has Clients</option>
                <option value="false">No Clients</option>
              </select>
            </div>
            {(acecChapterFilter || cityFilter || websiteFilter !== 'true' || hasClientsFilter !== 'true') && (
              <button
                onClick={() => {
                  handleAcecFilterChange('')
                  setCityFilter('')
                  setWebsiteFilter('true')
                  setHasClientsFilter('true')
                  setCurrentPage(1)
                }}
                className="text-sm text-red-600 hover:text-red-800 font-medium mb-1.5"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Pagination Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-center space-x-4 mb-4 sm:mb-0">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-slate-600">Show:</span>
              <select
                className="input py-1 text-sm"
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                disabled={loading}
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
              <span className="text-sm text-slate-600 whitespace-nowrap">per page</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={!pagination.hasPrev || loading}
              className="px-3 py-1 text-sm font-medium rounded-lg border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              Previous
            </button>

            <div className="text-sm text-slate-700">
              Page <span className="font-semibold">{currentPage}</span> of{' '}
              <span className="font-semibold">{pagination.totalPages || 1}</span>
            </div>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={!pagination.hasNext || loading}
              className="px-3 py-1 text-sm font-medium rounded-lg border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              Next
            </button>
          </div>
        </div>

        {showAddForm && (
          <div className="mb-6">
            <AddCompanyForm
              onSuccess={() => {
                setShowAddForm(false)
                // Refresh the company list to show the new addition
                fetchCompanies(currentPage, pageSize, searchQuery)
              }}
              onCancel={() => {
                setShowAddForm(false)
              }}
            />
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <p className="font-medium">Error loading companies</p>
            <div className="text-sm mt-1 space-y-1">
              {error.split('\n').map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </div>
            <button
              onClick={() => fetchCompanies(currentPage, pageSize, searchQuery)}
              className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Try again
            </button>
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-slate-600">Loading companies...</p>
          </div>
        ) : companies.length === 0 ? (
          <div className="py-12 text-center">
            <svg className="w-12 h-12 text-slate-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-slate-700 font-medium">No companies found</p>
            <p className="text-slate-500 mt-1">
              {searchQuery ? 'Try a different search term' : 'No companies in the database yet'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="p-4 w-4">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-primary-600 rounded"
                      onChange={e => handleCheckAll(e.target.checked)}
                      checked={companies.length > 0 && companies.every(c => checkedCompanies.has(c.id))}
                    />
                  </th>
                  <th className="text-left py-3 px-4 text-slate-700 font-medium">Company Name</th>
                  <th className="text-left py-3 px-4 text-slate-700 font-medium">Website</th>
                  <th className="text-left py-3 px-4 text-slate-700 font-medium">ACEC Chapter</th>
                  <th className="text-left py-3 px-4 text-slate-700 font-medium">City</th>
                  <th className="text-left py-3 px-4 text-slate-700 font-medium">Asso. Clients</th>
                  <th className="text-left py-3 px-4 text-slate-700 font-medium">Overview</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => {
                  return (
                    <tr key={company.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-4 w-4">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-primary-600 rounded"
                          checked={checkedCompanies.has(company.id)}
                          onChange={e => handleCheckCompany(company.id, e.target.checked)}
                        />
                      </td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => setSelectedCompany(company)}
                          className="font-medium text-slate-900 hover:text-primary-700 text-left cursor-pointer"
                          aria-label={`View details for ${company.company_name}`}
                        >
                          {company.company_name}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        {company.website ? (
                          <a
                            href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                            onClick={(e) => {
                              e.preventDefault()
                              openInWindow(company.website!.startsWith('http') ? company.website! : `https://${company.website}`)
                            }}
                            className="text-sm text-primary-600 hover:text-primary-800 truncate block max-w-xs"
                          >
                            {company.website.replace(/^https?:\/\//, '')}
                          </a>
                        ) : (
                          <span className="text-slate-500 text-sm">Not specified</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-700 text-sm">
                        {company.acec_chapter || <span className="text-slate-500">Not specified</span>}
                      </td>
                      <td className="py-3 px-4 text-slate-700 text-sm">
                        {company.city || <span className="text-slate-500">Not specified</span>}
                      </td>
                      <td className="py-3 px-4 text-slate-700 text-sm">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {company.client_count || 0}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 text-sm" title={company.overview || ''}>
                        {company.overview ? (
                          <span className="cursor-help">
                            {company.overview.length > 175
                              ? `${company.overview.substring(0, 175)}...`
                              : company.overview}
                          </span>
                        ) : (
                          <span className="text-slate-500">Not specified</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Bottom Pagination */}
        {companies.length > 0 && (
          <div className="mt-6 flex flex-col sm:flex-row justify-between items-center pt-6 border-t border-slate-200">
            <div className="text-sm text-slate-600 mb-4 sm:mb-0">
              Showing {companies.length} of {pagination.total} companies
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(1)}
                disabled={!pagination.hasPrev || loading}
                className="px-3 py-1 text-sm font-medium rounded-lg border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                First
              </button>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={!pagination.hasPrev || loading}
                className="px-3 py-1 text-sm font-medium rounded-lg border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                Previous
              </button>
              <div className="px-3 py-1 text-sm font-medium text-slate-700">
                {currentPage} / {pagination.totalPages || 1}
              </div>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={!pagination.hasNext || loading}
                className="px-3 py-1 text-sm font-medium rounded-lg border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                Next
              </button>
              <button
                onClick={() => handlePageChange(pagination.totalPages)}
                disabled={!pagination.hasNext || loading}
                className="px-3 py-1 text-sm font-medium rounded-lg border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                Last
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 text-center text-slate-500 text-sm">
        <p>Data loaded from Supabase.</p>
      </div>
    </div>
  )
}
