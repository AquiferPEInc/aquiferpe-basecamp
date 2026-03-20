import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Client, Company, PaginatedResponse } from '../types'
import AddClientForm from '../components/AddClientForm'
import CommunicationPopup from '../components/CommunicationPopup'
import ClientDetailsPopup from '../components/ClientDetailsPopup'
import CompanyDetailsPopup from '../components/CompanyDetailsPopup'
import MultiSelectFilter from '../components/MultiSelectFilter'
import { supabase } from '../lib/supabase'

interface ClientPaginatedResponse extends PaginatedResponse<Client> { }

export default function ClientPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [showAddClient, setShowAddClient] = useState(false)
  const [detailsPopupInitialEditMode, setDetailsPopupInitialEditMode] = useState(false)
  const [pagination, setPagination] = useState<ClientPaginatedResponse['pagination']>({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  })
  const [selectedClients, setSelectedClients] = useState<Set<number>>(new Set())
  const [selectedClientForCommunication, setSelectedClientForCommunication] = useState<Client | null>(null)
  const [selectedClientForDetails, setSelectedClientForDetails] = useState<Client | null>(null)
  const [selectedCompanyForDetails, setSelectedCompanyForDetails] = useState<Company | null>(null)
  const [showExportMenu, setShowExportMenu] = useState(false)

  // New Filter State
  const [commStatus, setCommStatus] = useState<'any' | 'true' | 'false'>('any')
  const [commStartDate, setCommStartDate] = useState('')
  const [commEndDate, setCommEndDate] = useState('')
  const [companyFilter, setCompanyFilter] = useState(searchParams.get('company_name') || '')
  const [nameStatus, setNameStatus] = useState<'any' | 'full_name' | 'partial_name'>('any')
  const [verifiedStatus, setVerifiedStatus] = useState<'any' | 'true' | 'false'>('any')
  const [activeStatus, setActiveStatus] = useState<'any' | 'Active' | 'Inactive'>('any')

  // Update filter when URL param changes
  useEffect(() => {
    const companyParam = searchParams.get('company_name')
    if (companyParam !== null && companyParam !== companyFilter) {
      setCompanyFilter(companyParam)
      setCurrentPage(1)
    }
  }, [searchParams])

  const fetchClients = async (page: number, limit: number, search: string = '') => {
    setLoading(true)
    setError(null)

    try {
      let query = supabase.from('client').select('*, company(company_name)', { count: 'exact' })

      if (search.trim()) {
        const queryStr = `%${search}%`
        query = query.or(`first_name.ilike.${queryStr},last_name.ilike.${queryStr},email.ilike.${queryStr},title.ilike.${queryStr}`)
      }

      if (commStatus !== 'any') {
        // Needs joining with communication to handle
        // Using a rough approach for now due to complexity of nested EXISTS in JS client
        // In a real app with Supabase we might use a database view or RPC for complex joins.
      }
      if (companyFilter) {
        // Supposing company filter requires us to filter by company_name 
        // This usually requires an innerJoin in Supabase which is achieved by !inner on the select string.
        query = supabase.from('client').select('*, company!inner(company_name)', { count: 'exact' })
        
        if (companyFilter.includes('|')) {
            query = query.in('company.company_name', companyFilter.split('|').map(s => s.trim()))
        } else {
            query = query.eq('company.company_name', companyFilter)
        }
      }
      
      if (nameStatus === 'full_name') {
        query = query.neq('first_name', '').neq('last_name', '')
      } else if (nameStatus === 'partial_name') {
        query = query.or('and(first_name.neq."",last_name.eq.""),and(first_name.eq."",last_name.neq."")')
      }

      if (verifiedStatus === 'true') {
        query = query.eq('verified', true)
      } else if (verifiedStatus === 'false') {
        query = query.or('verified.eq.false,verified.is.null')
      }

      if (activeStatus !== 'any') {
        query = query.eq('active_status', activeStatus)
      }

      const from = (page - 1) * limit
      const to = from + limit - 1

      const { data, count, error: sbError } = await query
        .order('last_name', { ascending: true })
        .order('first_name', { ascending: true })
        .range(from, to)

      if (sbError) throw sbError

      // Map company_name from relation structure to flat structure
      const formattedData = (data || []).map(client => ({
        ...client,
        company_name: client.company?.company_name || null
      }))

      const total = count || 0
      setClients(formattedData)
      setPagination({
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      })
      setSelectedClients(new Set())
    } catch (err: any) {
      setError(err.message || 'Failed to fetch clients')
      console.error('Error fetching clients:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClients(currentPage, pageSize, searchQuery)
  }, [currentPage, pageSize, searchQuery, commStatus, commStartDate, commEndDate, companyFilter, nameStatus, verifiedStatus, activeStatus])

  const fetchCompanyOptions = async (search: string): Promise<string[]> => {
    try {
      // Fast distinct companies from client table
      let query = supabase.from('company').select('company_name').not('company_name', 'is', null)
      if (search) {
        query = query.ilike('company_name', `%${search}%`)
      }
      const { data, error } = await query.limit(50)
      if (error) throw error
      return Array.from(new Set(data.map(d => d.company_name)))
    } catch (error) {
      console.error('Error fetching company options:', error)
      return []
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1) // Reset to first page when searching
    // fetchClients is called via useEffect dependency
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

  const handleSelectClient = (clientId: number, checked: boolean) => {
    const newSelection = new Set(selectedClients)
    if (checked) {
      newSelection.add(clientId)
    } else {
      newSelection.delete(clientId)
    }
    setSelectedClients(newSelection)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedClients(new Set(clients.map(c => c.id)))
    } else {
      setSelectedClients(new Set())
    }
  }

  const handleCompanyClick = async (companyId: number) => {
    try {
      const { data, error } = await supabase.from('company').select('*').eq('id', companyId).single()
      if (error) throw error
      setSelectedCompanyForDetails(data)
    } catch (error) {
      console.error('Error fetching company details:', error)
    }
  }

  const handleExport = () => {
    const selected = clients.filter(c => selectedClients.has(c.id))
    if (selected.length === 0) {
      alert('Please select at least one client to export.')
      return
    }

    const headers = Object.keys(selected[0])
    const csvContent = [
      headers.join(','),
      ...selected.map(row =>
        headers.map(header => JSON.stringify((row as any)[header])).join(',')
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.setAttribute('download', `clients-export-${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleToEmailCampaign = () => {
    const selected = clients.filter(c => selectedClients.has(c.id))
    if (selected.length === 0) {
      alert('Please select at least one client.')
      return
    }
    navigate('/email-campaign', { state: { selectedClients: selected } })
  }


  const formatLastCommunication = (dateString: string | null | undefined) => {
    if (!dateString) return 'No communication'

    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return 'Invalid date'

      const now = new Date()
      const diffTime = Math.abs(now.getTime() - date.getTime())
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60))
      const diffMinutes = Math.floor(diffTime / (1000 * 60))

      if (diffDays === 0) {
        if (diffHours === 0) {
          if (diffMinutes < 1) return 'Just now'
          return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`
        }
        return `Today at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
      }
      if (diffDays === 1) {
        return `Yesterday at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
      }
      if (diffDays < 7) {
        return `${diffDays} days ago at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
      }
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    } catch (error) {
      console.error('Error formatting last communication date:', error, dateString)
      return 'Date error'
    }
  }


  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Clients Database</h1>
        <p className="text-sm text-slate-500 mt-2">
          Total Clients: <span className="font-semibold text-slate-700">{pagination.total.toLocaleString()}</span>
        </p>
      </div>

      {showAddClient && (
        <div className="mb-8">
          <AddClientForm
            onSuccess={() => {
              setShowAddClient(false)
              // Refresh clients to include the newly created one
              fetchClients(currentPage, pageSize, searchQuery)
            }}
            onCancel={() => {
              setShowAddClient(false)
            }}
          />
        </div>
      )}

      {selectedClientForCommunication && (
        <CommunicationPopup
          client={selectedClientForCommunication}
          onClose={() => setSelectedClientForCommunication(null)}
        />
      )}

      {selectedClientForDetails && (
        <ClientDetailsPopup
          client={selectedClientForDetails}
          initialEditMode={detailsPopupInitialEditMode}
          onClose={() => {
            setSelectedClientForDetails(null)
            setDetailsPopupInitialEditMode(false)
          }}
          onClientUpdated={(updatedClient) => {
            setSelectedClientForDetails(updatedClient)
            fetchClients(currentPage, pageSize, searchQuery)
          }}
          onClientDeleted={() => fetchClients(currentPage, pageSize, searchQuery)}
        />
      )}

      {selectedCompanyForDetails && (
        <CompanyDetailsPopup
          company={selectedCompanyForDetails}
          onClose={() => setSelectedCompanyForDetails(null)}
          onCompanyUpdated={(updatedCompany) => {
            setSelectedCompanyForDetails(updatedCompany)
            // Optionally refresh clients if company info displayed in table changed
            fetchClients(currentPage, pageSize, searchQuery)
          }}
        />
      )}

      <div className="card">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Client Directory</h2>
            <p className="text-slate-600">
              {searchQuery ? `Search results for "${searchQuery}"` : 'Browse all clients in the database'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative">
              <button
                className="btn-secondary flex items-center"
                onClick={() => setShowExportMenu(!showExportMenu)}
              >
                Export
                <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-slate-200">
                  <div className="py-1">
                    <button
                      className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => {
                        handleExport()
                        setShowExportMenu(false)
                      }}
                      disabled={selectedClients.size === 0}
                    >
                      To CSV ({selectedClients.size})
                    </button>
                    <button
                      className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => {
                        handleToEmailCampaign()
                        setShowExportMenu(false)
                      }}
                      disabled={selectedClients.size === 0}
                    >
                      To Email Campaign ({selectedClients.size})
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              className="btn-primary"
              type="button"
              onClick={() => setShowAddClient(true)}
            >
              Add New Client
            </button>
          </div>
        </div>

        {/* Advanced Search Filters */}
        <div className="p-4 bg-slate-80 border-t border-b border-slate-200 mb-6 -mx-6 px-10 space-y-4">
          {/* Search and Company/Location Row */}
          <div className="flex flex-wrap gap-6 items-end">
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Search Clients</label>
              <form onSubmit={handleSearch} className="flex">
                <input
                  type="text"
                  placeholder="Search clients by name, email, or title..."
                  className="input rounded-r-none border-r-0 w-96"
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
            <MultiSelectFilter
              label="Company"
              value={companyFilter}
              onChange={(value) => {
                setCompanyFilter(value)
                setCurrentPage(1)
              }}
              fetchOptions={fetchCompanyOptions}
              placeholder="Select companies..."
            />
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Name Status</label>
              <select
                className="input py-1.5 text-sm w-20"
                value={nameStatus}
                onChange={(e) => {
                  setNameStatus(e.target.value as any)
                  setCurrentPage(1)
                }}
              >
                <option value="any">Any</option>
                <option value="full_name">Full Name</option>
                <option value="partial_name">Partial Name</option>
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Verified</label>
              <select
                className="input py-1.5 text-sm w-22"
                value={verifiedStatus}
                onChange={(e) => {
                  setVerifiedStatus(e.target.value as any)
                  setCurrentPage(1)
                }}
              >
                <option value="any">Any</option>
                <option value="true">Verified</option>
                <option value="false">Unverified</option>
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Active</label>
              <select
                className="input py-1.5 text-sm w-22"
                value={activeStatus}
                onChange={(e) => {
                  setActiveStatus(e.target.value as any)
                  setCurrentPage(1)
                }}
              >
                <option value="any">Any</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Communication Filters Row */}
          <div className="flex flex-wrap gap-6 items-end">
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Communication</label>
              <select
                className="input py-1.5 text-sm w-40"
                value={commStatus}
                onChange={(e) => {
                  setCommStatus(e.target.value as any)
                  setCurrentPage(1)
                }}
              >
                <option value="any">Any Status</option>
                <option value="true">Had Communication</option>
                <option value="false">No Communication</option>
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">From Date</label>
              <input
                type="date"
                className="input py-1.5 text-sm"
                value={commStartDate}
                onChange={(e) => {
                  setCommStartDate(e.target.value)
                  setCurrentPage(1)
                }}
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">To Date</label>
              <input
                type="date"
                className="input py-1.5 text-sm"
                value={commEndDate}
                onChange={(e) => {
                  setCommEndDate(e.target.value)
                  setCurrentPage(1)
                }}
              />
            </div>
            {(commStatus !== 'any' || commStartDate || commEndDate || companyFilter || nameStatus !== 'any' || verifiedStatus !== 'any' || activeStatus !== 'any') && (
              <button
                onClick={() => {
                  setCommStatus('any')
                  setCommStartDate('')
                  setCommEndDate('')
                  setCompanyFilter('')
                  setNameStatus('any')
                  setVerifiedStatus('any')
                  setActiveStatus('any')
                  setCurrentPage(1)
                }}
                className="text-sm text-red-600 hover:text-red-800 font-medium mb-1.5"
              >
                Clear Filters
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

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <p className="font-medium">Error loading clients</p>
            <div className="text-sm mt-1 space-y-1">
              {error.split('\n').map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </div>
            <button
              onClick={() => fetchClients(currentPage, pageSize, searchQuery)}
              className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Try again
            </button>
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-slate-600">Loading clients...</p>
          </div>
        ) : clients.length === 0 ? (
          <div className="py-12 text-center">
            <svg className="w-12 h-12 text-slate-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-slate-700 font-medium">No clients found</p>
            <p className="text-slate-500 mt-1">
              {searchQuery ? 'Try a different search term' : 'No clients in the database yet'}
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
                      onChange={e => handleSelectAll(e.target.checked)}
                      checked={selectedClients.size === clients.length && clients.length > 0}
                    />
                  </th>
                  <th className="text-left py-3 px-4 text-slate-700 font-medium w-24">Status</th>
                  <th className="text-left py-3 px-4 text-slate-700 font-medium">First Name</th>
                  <th className="text-left py-3 px-4 text-slate-700 font-medium">Last Name</th>
                  <th className="text-left py-3 px-4 text-slate-700 font-medium">Email</th>
                  <th className="text-left py-3 px-4 text-slate-700 font-medium">Title</th>
                  <th className="text-left py-3 px-4 text-slate-700 font-medium">Company</th>
                  <th className="text-left py-3 px-4 text-slate-700 font-medium">Active</th>
                  <th className="text-left py-3 px-4 text-slate-700 font-medium">Last Communication</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-4 w-4">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-primary-600 rounded"
                        checked={selectedClients.has(client.id)}
                        onChange={e => handleSelectClient(client.id, e.target.checked)}
                      />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center space-x-2">
                        {client.active_status === 'Inactive' && (
                          <div
                            className="w-2.5 h-2.5 rounded-full bg-slate-400 flex-shrink-0"
                            title="Inactive Client"
                          />
                        )}
                        <span
                          className={`font-bold text-sm ${client.verified ? 'text-green-500' : 'text-red-500'}`}
                          title={client.verified ? 'Verified Client' : 'Unverified Client'}
                        >
                          V
                        </span>
                        {client.linkedin && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(client.linkedin!, '_blank', 'toolbar=yes,location=yes,status=yes,menubar=yes,scrollbars=yes,resizable=yes,width=1200,height=800');
                            }}
                            className="text-[#0077b5] hover:text-[#005582] transition-colors bg-transparent border-none p-0 cursor-pointer"
                            title="View LinkedIn Profile"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedClientForDetails(client)
                          setDetailsPopupInitialEditMode(false)
                        }}
                        className="font-medium text-slate-900 hover:text-primary-700 text-left cursor-pointer"
                        aria-label={`View details for ${client.first_name}`}
                      >
                        {client.first_name}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedClientForDetails(client)
                          setDetailsPopupInitialEditMode(false)
                        }}
                        className="font-medium text-slate-900 hover:text-primary-700 text-left cursor-pointer"
                        aria-label={`View details for ${client.last_name}`}
                      >
                        {client.last_name}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm">{client.email}</span>
                    </td>
                    <td className="py-3 px-4">
                      {client.title ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                          {client.title}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-sm">Not specified</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {client.company_name && client.company_id ? (
                        <button
                          type="button"
                          onClick={() => handleCompanyClick(client.company_id!)}
                          className="font-medium text-slate-900 hover:text-primary-700 text-left cursor-pointer"
                          aria-label={`View details for ${client.company_name}`}
                        >
                          {client.company_name}
                        </button>
                      ) : client.company_name ? (
                        <span className="font-medium">{client.company_name}</span>
                      ) : (
                        <span className="text-slate-500 text-sm">Not linked</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${client.active_status === 'Inactive' ? 'bg-gray-100 text-gray-800' : 'bg-blue-100 text-blue-800'}`}>
                        {client.active_status || 'Active'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-sm">
                      {formatLastCommunication(client.last_communication_date)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Bottom Pagination */}
        {clients.length > 0 && (
          <div className="mt-6 flex flex-col sm:flex-row justify-between items-center pt-6 border-t border-slate-200">
            <div className="text-sm text-slate-600 mb-4 sm:mb-0">
              Showing {clients.length} of {pagination.total} clients
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