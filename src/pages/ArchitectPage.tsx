import { useState, useEffect } from 'react'
import { Architect } from '../types'
import { supabase } from '../lib/supabase'
import ArchitectDetailsPopup from '../components/ArchitectDetailsPopup'

import { openInWindow } from '../lib/window-open'

const formatUrl = (url: string | null) => {
  if (!url) return '#'
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `http://${url}`
}
const geocodeLocation = async (query: string): Promise<{ lat: number, lng: number } | null> => {
  const cleanQuery = query.trim()
  if (!cleanQuery) return null

  // Check if 5-digit zipcode
  if (/^\d{5}$/.test(cleanQuery)) {
    try {
      const res = await fetch(`https://api.zippopotam.us/us/${cleanQuery}`)
      if (res.ok) {
        const json = await res.json()
        if (json.places && json.places[0]) {
          return {
            lat: parseFloat(json.places[0].latitude),
            lng: parseFloat(json.places[0].longitude)
          }
        }
      }
    } catch (err) {
      console.error('Zippopotam geocoding failed:', err)
    }
    return null
  }

  // Otherwise, assume it's a city name
  let city = cleanQuery
  let state = 'ca' // default to California

  const stateMatch = cleanQuery.match(/,\s*([a-zA-Z]{2})$/) || cleanQuery.match(/\s+([a-zA-Z]{2})$/)
  if (stateMatch) {
    state = stateMatch[1].toLowerCase()
    city = cleanQuery.substring(0, cleanQuery.length - stateMatch[0].length).trim()
  }

  try {
    const formattedCity = encodeURIComponent(city.toLowerCase().replace(/\s+/g, ' '))
    const res = await fetch(`https://api.zippopotam.us/us/${state}/${formattedCity}`)
    if (res.ok) {
      const json = await res.json()
      if (json.places && json.places[0]) {
        return {
          lat: parseFloat(json.places[0].latitude),
          lng: parseFloat(json.places[0].longitude)
        }
      }
    }
  } catch (err) {
    console.error('Zippopotam city geocoding failed:', err)
  }

  return null
}

export default function ArchitectPage() {
  const [architects, setArchitects] = useState<Architect[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [totalCount, setTotalCount] = useState(0)

  // Filters
  const [locationFilter, setLocationFilter] = useState('')
  const [radiusFilter, setRadiusFilter] = useState('25')
  const [minRating, setMinRating] = useState<string>('')
  const [hasFacebookFilter, setHasFacebookFilter] = useState(false)
  const [hasLinkedinFilter, setHasLinkedinFilter] = useState(false)
  const [hasEmailFilter, setHasEmailFilter] = useState(false)
  const [hasPhoneFilter, setHasPhoneFilter] = useState(false)
  const [linkedinConnectedFilter, setLinkedinConnectedFilter] = useState('')

  const [selectedArchitect, setSelectedArchitect] = useState<Architect | null>(null)
  const [checkedArchitects, setCheckedArchitects] = useState<Set<string>>(new Set())

  const [contactModal, setContactModal] = useState<{
    type: 'email' | 'phone'
    value: string
    title: string
  } | null>(null)
  const [contactCopied, setContactCopied] = useState(false)

  const handleCopyContact = (text: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setContactCopied(true)
    setTimeout(() => setContactCopied(false), 2000)
  }



  const fetchArchitects = async (page: number, limit: number, search: string = '') => {
    setLoading(true)
    setError(null)

    try {
      let userLat: number | null = null
      let userLng: number | null = null
      let isProximitySearch = false

      if (locationFilter.trim() && radiusFilter) {
        const coords = await geocodeLocation(locationFilter)
        if (coords) {
          userLat = coords.lat
          userLng = coords.lng
          isProximitySearch = true
        }
      }

      const from = (page - 1) * limit
      const to = from + limit - 1

      if (isProximitySearch && userLat !== null && userLng !== null) {
        const { data, error: sbError } = await supabase.rpc('get_architects_by_proximity', {
          user_lat: userLat,
          user_lng: userLng,
          max_distance_miles: parseFloat(radiusFilter),
          search_query: search.trim(),
          min_rating: minRating ? parseFloat(minRating) : null,
          has_website: null,
          has_facebook: hasFacebookFilter ? true : null,
          has_linkedin: hasLinkedinFilter ? true : null,
          has_email: hasEmailFilter ? true : null,
          has_phone: hasPhoneFilter ? true : null,
          linkedin_conn: linkedinConnectedFilter || '',
          page_size: limit,
          page_offset: from
        })

        if (sbError) throw sbError

        const total = (data && data[0]) ? parseInt(data[0].total_count) : 0
        setArchitects(data || [])
        setTotalCount(total)
      } else {
        let query = supabase.from('architect').select('*', { count: 'exact' }).neq('status', 'Closed')

        if (search.trim()) {
          const safeSearch = search.replace(/"/g, '\\"')
          const queryStr = `"%${safeSearch}%"`
          query = query.or(`business_name.ilike.${queryStr},address.ilike.${queryStr},license_number.ilike.${queryStr}`)
        } else {
          if (locationFilter.trim()) {
            query = query.ilike('address', `%${locationFilter.trim()}%`)
          }
          if (minRating) {
            query = query.gte('review_score', Number(minRating))
          }

          if (hasFacebookFilter) {
            query = query.not('facebook_link', 'is', null).neq('facebook_link', '').neq('facebook_link', 'N/A')
          }
          if (hasLinkedinFilter) {
            query = query.not('linkedin_link', 'is', null).neq('linkedin_link', '').neq('linkedin_link', 'N/A')
          }
          if (hasEmailFilter) {
            query = query.not('email', 'is', null).neq('email', '').neq('email', 'N/A')
          }
          if (hasPhoneFilter) {
            query = query.or('phone.not.is.null,phone_number.not.is.null')
          }
          if (linkedinConnectedFilter) {
            if (linkedinConnectedFilter === 'Not Connected') {
              query = query.or('linkedin_connected.eq."Not Connected",linkedin_connected.is.null')
            } else {
              query = query.eq('linkedin_connected', linkedinConnectedFilter)
            }
          }
        }

        const { data, error: sbError, count } = await query
          .order('review_score', { ascending: false })
          .order('number_of_reviews', { ascending: false })
          .order('business_name', { ascending: true })
          .range(from, to)

        if (sbError) throw sbError

        const total = count || 0
        setArchitects(data || [])
        setTotalCount(total)
      }

      setCheckedArchitects(new Set())
    } catch (err: any) {
      setError(err.message || 'Failed to fetch architects')
      console.error('Error fetching architects:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchArchitects(currentPage, pageSize, searchQuery)
  }, [currentPage, pageSize, searchQuery, locationFilter, radiusFilter, minRating, hasFacebookFilter, hasLinkedinFilter, hasEmailFilter, hasPhoneFilter, linkedinConnectedFilter])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    fetchArchitects(1, pageSize, searchQuery)
  }

  const handlePageChange = (newPage: number) => {
    const totalPages = Math.ceil(totalCount / pageSize)
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
    }
  }

  const handlePageSizeChange = (newSize: number) => {
    if (newSize >= 1 && newSize <= 100) {
      setPageSize(newSize)
      setCurrentPage(1)
    }
  }

  const handleCheckArchitect = (architectId: string, checked: boolean) => {
    const newChecked = new Set(checkedArchitects)
    if (checked) {
      newChecked.add(architectId)
    } else {
      newChecked.delete(architectId)
    }
    setCheckedArchitects(newChecked)
  }

  const handleCheckAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(architects.map(a => a.id))
      setCheckedArchitects(allIds)
    } else {
      setCheckedArchitects(new Set())
    }
  }

  const renderStars = (score: number) => {
    const fullStars = Math.floor(score)
    const hasHalfStar = score % 1 >= 0.5
    const stars = []
    
    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(<span key={i} className="text-amber-400">★</span>)
      } else if (i === fullStars + 1 && hasHalfStar) {
        stars.push(<span key={i} className="text-amber-400">⯪</span>)
      } else {
        stars.push(<span key={i} className="text-slate-200">★</span>)
      }
    }
    return stars
  }

  const handleArchitectUpdate = (updatedArc: Architect) => {
    if (updatedArc.status === 'Closed') {
      setArchitects(prev => prev.filter(a => a.id !== updatedArc.id))
      setSelectedArchitect(null)
    } else {
      setArchitects(prev => prev.map(a => a.id === updatedArc.id ? updatedArc : a))
      if (selectedArchitect && selectedArchitect.id === updatedArc.id) {
        setSelectedArchitect(updatedArc)
      }
    }
  }

  const totalPages = Math.ceil(totalCount / pageSize)
  const hasPrev = currentPage > 1
  const hasNext = currentPage < totalPages

  return (
    <div>
      <div className="mb-8 text-left">
        <h1 className="text-3xl font-bold text-slate-900">Architect Database</h1>
        <p className="text-sm text-slate-500 mt-2">
          Total Architects: <span className="font-semibold text-slate-700">{totalCount.toLocaleString()}</span>
        </p>
      </div>

      {selectedArchitect && (
        <ArchitectDetailsPopup
          architect={selectedArchitect}
          onClose={() => setSelectedArchitect(null)}
          onUpdate={handleArchitectUpdate}
        />
      )}

      <div className="card text-left">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Architect Directory</h2>
            <p className="text-slate-600">
              {searchQuery ? `Search results for "${searchQuery}"` : 'Browse all architects in the database'}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <form onSubmit={handleSearch} className="flex md:w-3/5">
            <input
              type="text"
              placeholder="Search business name, address, or license..."
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
                Location
              </label>
              <input
                type="text"
                placeholder="e.g. 90210 or Los Angeles"
                className="input py-1.5 text-sm w-48"
                value={locationFilter}
                onChange={(e) => {
                  setLocationFilter(e.target.value)
                  setCurrentPage(1)
                }}
              />
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">
                Radius
              </label>
              <select
                className="input py-1.5 text-sm w-28"
                value={radiusFilter}
                onChange={(e) => {
                  setRadiusFilter(e.target.value)
                  setCurrentPage(1)
                }}
              >

                <option value="25">25 miles</option>
                <option value="50">50 miles</option>
                <option value="75">75 miles</option>
                <option value="100">100 miles</option>
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">
                Rating
              </label>
              <select
                className="input py-1.5 text-sm w-32"
                value={minRating}
                onChange={(e) => {
                  setMinRating(e.target.value)
                  setCurrentPage(1)
                }}
              >
                <option value="">All</option>
                <option value="5">5 Stars Only</option>
                <option value="4">4+ Stars</option>
                <option value="3">3+ Stars</option>
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">
                Connection Status
              </label>
              <select
                className="input py-1.5 text-sm w-32"
                value={linkedinConnectedFilter}
                onChange={(e) => {
                  setLinkedinConnectedFilter(e.target.value)
                  setCurrentPage(1)
                }}
              >
                <option value="">All</option>
                <option value="Not Connected">Not Connected</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="Email">Email</option>
                <option value="Phone">Phone</option>
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">
                Contact & Presence
              </label>
              <div className="flex flex-wrap gap-4 items-center h-[38px]">
                <label className="inline-flex items-center text-sm font-medium text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hasEmailFilter}
                    onChange={(e) => {
                      setHasEmailFilter(e.target.checked)
                      setCurrentPage(1)
                    }}
                    className="w-4 h-4 text-primary-600 rounded border-slate-300 mr-2"
                  />
                  Has Email
                </label>
                <label className="inline-flex items-center text-sm font-medium text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hasPhoneFilter}
                    onChange={(e) => {
                      setHasPhoneFilter(e.target.checked)
                      setCurrentPage(1)
                    }}
                    className="w-4 h-4 text-primary-600 rounded border-slate-300 mr-2"
                  />
                  Has Phone
                </label>
                <label className="inline-flex items-center text-sm font-medium text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hasFacebookFilter}
                    onChange={(e) => {
                      setHasFacebookFilter(e.target.checked)
                      setCurrentPage(1)
                    }}
                    className="w-4 h-4 text-primary-600 rounded border-slate-300 mr-2"
                  />
                  Facebook
                </label>
                <label className="inline-flex items-center text-sm font-medium text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hasLinkedinFilter}
                    onChange={(e) => {
                      setHasLinkedinFilter(e.target.checked)
                      setCurrentPage(1)
                    }}
                    className="w-4 h-4 text-primary-600 rounded border-slate-300 mr-2"
                  />
                  LinkedIn
                </label>
              </div>
            </div>

            {(locationFilter || radiusFilter !== '25' || minRating || hasEmailFilter || hasPhoneFilter || hasFacebookFilter || hasLinkedinFilter || linkedinConnectedFilter) && (
              <button
                onClick={() => {
                  setLocationFilter('')
                  setRadiusFilter('25')
                  setMinRating('')
                  setHasEmailFilter(false)
                  setHasPhoneFilter(false)
                  setHasFacebookFilter(false)
                  setHasLinkedinFilter(false)
                  setLinkedinConnectedFilter('')
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
              disabled={!hasPrev || loading}
              className="px-3 py-1 text-sm font-medium rounded-lg border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              Previous
            </button>

            <div className="text-sm text-slate-700">
              Page <span className="font-semibold">{currentPage}</span> of{' '}
              <span className="font-semibold">{totalPages || 1}</span>
            </div>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={!hasNext || loading}
              className="px-3 py-1 text-sm font-medium rounded-lg border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              Next
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <p className="font-medium">Error loading architects</p>
            <p className="text-sm mt-1">{error}</p>
            <button
              onClick={() => fetchArchitects(currentPage, pageSize, searchQuery)}
              className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Try again
            </button>
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-slate-600">Loading architects...</p>
          </div>
        ) : architects.length === 0 ? (
          <div className="py-12 text-center">
            <svg className="w-12 h-12 text-slate-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-slate-700 font-medium">No architects found</p>
            <p className="text-slate-500 mt-1">
              {searchQuery ? 'Try a different search term' : 'No architects in the database yet'}
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
                      checked={architects.length > 0 && architects.every(a => checkedArchitects.has(a.id))}
                    />
                  </th>
                  <th className="text-left py-3 px-4 text-slate-700 font-medium">Business Name</th>
                  <th className="text-left py-3 px-4 text-slate-700 font-medium">Contacts</th>
                  <th className="text-left py-3 px-4 text-slate-700 font-medium">Rating</th>
                  <th className="text-left py-3 px-4 text-slate-700 font-medium">Location</th>
                  <th className="text-left py-3 px-4 text-slate-700 font-medium">Typical Job Cost</th>
                  <th className="text-left py-3 px-4 text-slate-700 font-medium">Connection Status</th>
                </tr>
              </thead>
              <tbody>
                {architects.map((arc) => {
                  return (
                    <tr key={arc.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-4 w-4">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-primary-600 rounded"
                          checked={checkedArchitects.has(arc.id)}
                          onChange={e => handleCheckArchitect(arc.id, e.target.checked)}
                        />
                      </td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => setSelectedArchitect(arc)}
                          className="font-medium text-slate-900 hover:text-primary-700 text-left cursor-pointer"
                          aria-label={`View details for ${arc.business_name}`}
                        >
                          {arc.business_name}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2.5">
                          {/* Website Link */}
                          {arc.website && arc.website !== 'http://' && arc.website !== 'N/A' ? (
                            <a
                              href={formatUrl(arc.website)}
                              onClick={(e) => {
                                e.preventDefault()
                                openInWindow(formatUrl(arc.website))
                              }}
                              className="text-primary-600 hover:text-primary-800 transition-colors"
                              title={`Website: ${arc.website}`}
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <circle cx="12" cy="12" r="10" />
                                <path d="M12 2a14.5 14.5 0 000 20 14.5 14.5 0 000-20M2 12h20M12 2a14.5 14.5 0 010 20 14.5 14.5 0 010-20M3.6 9h16.8M3.6 15h16.8" />
                              </svg>
                            </a>
                          ) : (
                            <span className="text-slate-300 cursor-not-allowed" title="No Website">
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <circle cx="12" cy="12" r="10" />
                                <path d="M12 2a14.5 14.5 0 000 20 14.5 14.5 0 000-20M2 12h20M12 2a14.5 14.5 0 010 20 14.5 14.5 0 010-20M3.6 9h16.8M3.6 15h16.8" />
                              </svg>
                            </span>
                          )}

                          {/* Facebook Link */}
                          {arc.facebook_link && arc.facebook_link !== 'N/A' ? (
                            <a
                              href={formatUrl(arc.facebook_link)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 transition-colors"
                              title={`Facebook: ${arc.facebook_link}`}
                            >
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z" />
                              </svg>
                            </a>
                          ) : (
                            <span className="text-slate-300 cursor-not-allowed" title="No Facebook Profile">
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z" />
                              </svg>
                            </span>
                          )}

                          {/* LinkedIn Link */}
                          {arc.linkedin_link && arc.linkedin_link !== 'N/A' ? (
                            <a
                              href={formatUrl(arc.linkedin_link)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sky-600 hover:text-sky-800 transition-colors"
                              title={`LinkedIn: ${arc.linkedin_link}`}
                            >
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                              </svg>
                            </a>
                          ) : (
                            <span className="text-slate-300 cursor-not-allowed" title="No LinkedIn Profile">
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                              </svg>
                            </span>
                          )}

                          {/* Email Link */}
                          {arc.email && arc.email !== 'N/A' ? (
                            <button
                              type="button"
                              onClick={() => setContactModal({
                                type: 'email',
                                value: arc.email!,
                                title: arc.business_name
                              })}
                              className="text-emerald-600 hover:text-emerald-800 transition-colors cursor-pointer"
                              title={`View Email: ${arc.email}`}
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                            </button>
                          ) : (
                            <span className="text-slate-300 cursor-not-allowed" title="No Email">
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                            </span>
                          )}

                          {/* Phone Link */}
                          {(arc.phone || arc.phone_number) && arc.phone !== 'N/A' && arc.phone_number !== 'N/A' ? (
                            <button
                              type="button"
                              onClick={() => setContactModal({
                                type: 'phone',
                                value: (arc.phone || arc.phone_number)!,
                                title: arc.business_name
                              })}
                              className="text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                              title={`View Phone: ${arc.phone || arc.phone_number}`}
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                            </button>
                          ) : (
                            <span className="text-slate-300 cursor-not-allowed" title="No Phone">
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700 text-sm whitespace-nowrap">
                        <div className="flex items-center space-x-1">
                          <span className="flex">{renderStars(arc.review_score)}</span>
                          <span className="text-slate-500 font-medium">
                            ({arc.number_of_reviews})
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700 text-sm">
                        {arc.address || <span className="text-slate-500">Not specified</span>}
                        {(arc as any).distance_miles !== undefined && (arc as any).distance_miles !== null && (
                          <span className="text-xs font-semibold text-primary-600 block mt-0.5 animate-pulse-once">
                            {parseFloat((arc as any).distance_miles).toFixed(1)} miles away
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-700 text-sm">
                        {arc.typical_job_cost || <span className="text-slate-500">Not specified</span>}
                      </td>
                      <td className="py-3 px-4 text-slate-700 text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          arc.linkedin_connected === 'LinkedIn'
                            ? 'bg-sky-100 text-sky-800'
                            : arc.linkedin_connected === 'Email'
                            ? 'bg-emerald-100 text-emerald-800'
                            : arc.linkedin_connected === 'Phone'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}>
                          {arc.linkedin_connected || 'Not Connected'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Bottom Pagination */}
        {architects.length > 0 && (
          <div className="mt-6 flex flex-col sm:flex-row justify-between items-center pt-6 border-t border-slate-200">
            <div className="text-sm text-slate-600 mb-4 sm:mb-0">
              Showing {architects.length} of {totalCount} architects
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(1)}
                disabled={!hasPrev || loading}
                className="px-3 py-1 text-sm font-medium rounded-lg border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                First
              </button>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={!hasPrev || loading}
                className="px-3 py-1 text-sm font-medium rounded-lg border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                Previous
              </button>
              <div className="px-3 py-1 text-sm font-medium text-slate-700">
                {currentPage} / {totalPages || 1}
              </div>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={!hasNext || loading}
                className="px-3 py-1 text-sm font-medium rounded-lg border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                Next
              </button>
              <button
                onClick={() => handlePageChange(totalPages)}
                disabled={!hasNext || loading}
                className="px-3 py-1 text-sm font-medium rounded-lg border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                Last
              </button>
            </div>
          </div>
        )}
      </div>

      {contactModal && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setContactModal(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                {contactModal.type === 'email' ? (
                  <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-200">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                ) : (
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-200">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-slate-900 text-lg leading-snug">{contactModal.title}</h3>
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                    {contactModal.type === 'email' ? 'Email Address' : 'Phone Number'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setContactModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="my-6 p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <p className="text-base font-semibold text-slate-800 break-all select-all font-mono">
                {contactModal.value}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleCopyContact(contactModal.value)}
                className="flex-1 btn-primary py-2.5 flex items-center justify-center gap-2 text-sm font-semibold"
              >
                {contactCopied ? (
                  <>
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>Copy to Clipboard</span>
                  </>
                )}
              </button>

              {contactModal.type === 'email' ? (
                <a
                  href={`mailto:${contactModal.value}`}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-lg transition-colors flex items-center gap-1.5"
                >
                  Send Email
                </a>
              ) : (
                <a
                  href={`tel:${contactModal.value}`}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-lg transition-colors flex items-center gap-1.5"
                >
                  Call Phone
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 text-center text-slate-500 text-sm">
        <p>Data loaded from Supabase.</p>
      </div>
    </div>
  )
}
