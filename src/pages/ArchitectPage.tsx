import { useState, useEffect, useCallback } from 'react'
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
  const [hasWebsiteFilter, setHasWebsiteFilter] = useState(false)
  const [hasFacebookFilter, setHasFacebookFilter] = useState(false)
  const [hasLinkedinFilter, setHasLinkedinFilter] = useState(false)
  const [linkedinConnectedFilter, setLinkedinConnectedFilter] = useState('')

  const [selectedArchitect, setSelectedArchitect] = useState<Architect | null>(null)
  const [checkedArchitects, setCheckedArchitects] = useState<Set<string>>(new Set())



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
          has_website: hasWebsiteFilter ? true : null,
          has_facebook: hasFacebookFilter ? true : null,
          has_linkedin: hasLinkedinFilter ? true : null,
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

          if (hasWebsiteFilter) {
            query = query.not('website', 'is', null).neq('website', '').neq('website', 'http://').neq('website', 'N/A')
          }
          if (hasFacebookFilter) {
            query = query.not('facebook_link', 'is', null).neq('facebook_link', '').neq('facebook_link', 'N/A')
          }
          if (hasLinkedinFilter) {
            query = query.not('linkedin_link', 'is', null).neq('linkedin_link', '').neq('linkedin_link', 'N/A')
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
  }, [currentPage, pageSize, searchQuery, locationFilter, radiusFilter, minRating, hasWebsiteFilter, hasFacebookFilter, hasLinkedinFilter, linkedinConnectedFilter])

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
                Connected
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
                <option value="Connected">Connected</option>
                <option value="Pending">Pending</option>
                <option value="Not Connected">Not Connected</option>
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">
                Web Presense
              </label>
              <div className="flex flex-wrap gap-4 items-center h-[38px]">
                <label className="inline-flex items-center text-sm font-medium text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hasWebsiteFilter}
                    onChange={(e) => {
                      setHasWebsiteFilter(e.target.checked)
                      setCurrentPage(1)
                    }}
                    className="w-4 h-4 text-primary-600 rounded border-slate-300 mr-2"
                  />
                  Website
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



            {(locationFilter || radiusFilter !== '25' || minRating || hasWebsiteFilter || hasFacebookFilter || hasLinkedinFilter || linkedinConnectedFilter) && (
              <button
                onClick={() => {
                  setLocationFilter('')
                  setRadiusFilter('25')
                  setMinRating('')
                  setHasWebsiteFilter(false)
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
                  <th className="text-left py-3 px-4 text-slate-700 font-medium">Links</th>
                  <th className="text-left py-3 px-4 text-slate-700 font-medium">Rating</th>
                  <th className="text-left py-3 px-4 text-slate-700 font-medium">Location</th>
                  <th className="text-left py-3 px-4 text-slate-700 font-medium">Typical Job Cost</th>
                  <th className="text-left py-3 px-4 text-slate-700 font-medium">Connected</th>
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
                        <div className="flex items-center space-x-3">
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
                          arc.linkedin_connected === 'Connected'
                            ? 'bg-emerald-100 text-emerald-800'
                            : arc.linkedin_connected === 'Pending'
                            ? 'bg-blue-100 text-blue-800'
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

      <div className="mt-8 text-center text-slate-500 text-sm">
        <p>Data loaded from Supabase.</p>
      </div>
    </div>
  )
}
