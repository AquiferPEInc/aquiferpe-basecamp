import { useState } from 'react'
import { Architect } from '../types'
import { supabase } from '../lib/supabase'

interface ArchitectDetailsPopupProps {
  architect: Architect
  onClose: () => void
  onUpdate?: (updatedArchitect: Architect) => void
}

export default function ArchitectDetailsPopup({ architect, onClose, onUpdate }: ArchitectDetailsPopupProps) {
  const [currentConnectedStatus, setCurrentConnectedStatus] = useState(architect.linkedin_connected || 'Not Connected')
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [currentProfileStatus, setCurrentProfileStatus] = useState(architect.status || 'Active')
  const [updatingProfileStatus, setUpdatingProfileStatus] = useState(false)

  const handleStatusChange = async (newStatus: string) => {
    setUpdatingStatus(true)
    try {
      const { error } = await supabase
        .from('architect')
        .update({ linkedin_connected: newStatus, updated_at: new Date().toISOString() })
        .eq('id', architect.id)

      if (error) throw error
      
      setCurrentConnectedStatus(newStatus)
      if (onUpdate) {
        onUpdate({
          ...architect,
          linkedin_connected: newStatus,
          status: currentProfileStatus
        })
      }
    } catch (err) {
      console.error('Error updating Connection status:', err)
      alert('Failed to update Connection status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleProfileStatusChange = async (newStatus: string) => {
    setUpdatingProfileStatus(true)
    try {
      const { error } = await supabase
        .from('architect')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', architect.id)

      if (error) throw error
      
      setCurrentProfileStatus(newStatus)
      if (onUpdate) {
        onUpdate({
          ...architect,
          status: newStatus,
          linkedin_connected: currentConnectedStatus
        })
      }
    } catch (err) {
      console.error('Error updating Profile Status:', err)
      alert('Failed to update Profile Status')
    } finally {
      setUpdatingProfileStatus(false)
    }
  }

  const formatUrl = (url: string | null) => {
    if (!url) return '#'
    if (url.startsWith('http://') || url.startsWith('https://')) return url
    return `http://${url}`
  }

  const renderStars = (score: number) => {
    const fullStars = Math.floor(score)
    const hasHalfStar = score % 1 >= 0.5
    const stars = []
    
    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(
          <span key={i} className="text-amber-400 text-lg">★</span>
        )
      } else if (i === fullStars + 1 && hasHalfStar) {
        stars.push(
          <span key={i} className="text-amber-400 text-lg">⯪</span>
        )
      } else {
        stars.push(
          <span key={i} className="text-slate-200 text-lg">★</span>
        )
      }
    }
    return stars
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
          <div>
            <div className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border mb-2 ${
              currentProfileStatus === 'Active'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}>
              {currentProfileStatus}
            </div>
            <h2 className="text-2xl font-bold text-slate-900">{architect.business_name}</h2>
            {architect.address && (
              <p className="text-sm text-slate-500 mt-1 flex items-center">
                <svg className="w-4 h-4 mr-1 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {architect.address}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 flex-1">
          {/* Top Quick Stats */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
            <div>
              <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Rating</span>
              <div className="flex items-center justify-center mt-1">
                {renderStars(architect.review_score)}
                <span className="text-sm font-bold text-slate-700 ml-1.5">{architect.review_score}</span>
              </div>
              <span className="text-xs text-slate-500">({architect.number_of_reviews} reviews)</span>
            </div>
            <div>
              <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Followers</span>
              <span className="block text-lg font-bold text-slate-800 mt-1">{architect.number_of_followers.toLocaleString()}</span>
              <span className="text-xs text-slate-500">on Houzz</span>
            </div>
            <div>
              <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Typical Job Cost</span>
              <span className="block text-sm font-bold text-slate-800 mt-2 truncate px-1" title={architect.typical_job_cost || 'N/A'}>
                {architect.typical_job_cost || 'N/A'}
              </span>
            </div>
          </div>

          {/* Details Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1.5">
                Contact Details
              </h3>
              <div className="space-y-2.5">
                {architect.phone_number && architect.phone_number !== 'N/A' && (
                  <div className="text-sm text-slate-600 flex items-center">
                    <svg className="w-4 h-4 mr-2.5 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <a href={`tel:${architect.phone_number}`} className="hover:text-primary-600 transition-colors">
                      {architect.phone_number}
                    </a>
                  </div>
                )}
                {architect.website && architect.website !== 'http://' && architect.website !== 'N/A' && (
                  <div className="text-sm text-slate-600 flex items-center">
                    <svg className="w-4 h-4 mr-2.5 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9h18" />
                    </svg>
                    <a
                      href={formatUrl(architect.website)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:underline hover:text-primary-800 break-all"
                    >
                      {architect.website}
                    </a>
                  </div>
                )}
                {architect.license_number && architect.license_number !== 'N/A' && (
                  <div className="text-sm text-slate-600 flex items-start">
                    <svg className="w-4 h-4 mr-2.5 text-slate-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <div>
                      <span className="font-semibold block text-slate-500 text-xs uppercase">License</span>
                      <span className="block text-slate-700">{architect.license_number}</span>
                    </div>
                  </div>
                )}
                <div className="text-sm text-slate-600 flex items-start">
                  <svg className="w-4 h-4 mr-2.5 text-slate-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  <div>
                    <span className="font-semibold block text-slate-500 text-xs uppercase">Houzz ID</span>
                    <span className="block text-slate-700 font-mono">{architect.houzz_id || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1.5">
                Social Profiles
              </h3>
              <div className="flex items-center space-x-3">
                {architect.facebook_link && architect.facebook_link !== 'N/A' ? (
                  <a
                    href={formatUrl(architect.facebook_link)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors inline-flex items-center justify-center"
                    title="Facebook Page"
                  >
                    <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z" />
                    </svg>
                  </a>
                ) : (
                  <span
                    className="p-2 border border-slate-100 bg-slate-50/50 text-slate-300 rounded-lg cursor-not-allowed inline-flex items-center justify-center"
                    title="No Facebook Profile"
                  >
                    <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z" />
                    </svg>
                  </span>
                )}
                {architect.linkedin_link && architect.linkedin_link !== 'N/A' ? (
                  <a
                    href={formatUrl(architect.linkedin_link)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors inline-flex items-center justify-center"
                    title="LinkedIn Profile"
                  >
                    <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                    </svg>
                  </a>
                ) : (
                  <span
                    className="p-2 border border-slate-100 bg-slate-50/50 text-slate-300 rounded-lg cursor-not-allowed inline-flex items-center justify-center"
                    title="No LinkedIn Profile"
                  >
                    <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                    </svg>
                  </span>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Connection Status
                  </label>
                  <div className="relative">
                    <select
                      className="input w-full text-sm pr-10 py-2 bg-white"
                      value={currentConnectedStatus}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      disabled={updatingStatus}
                    >
                      <option value="Not Connected">Not Connected</option>
                      <option value="LinkedIn">LinkedIn</option>
                      <option value="Email">Email</option>
                      <option value="Phone">Phone</option>
                    </select>
                    {updatingStatus && (
                      <div className="absolute right-3 top-2.5">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Profile Status
                  </label>
                  <div className="relative">
                    <select
                      className="input w-full text-sm pr-10 py-2 bg-white"
                      value={currentProfileStatus}
                      onChange={(e) => handleProfileStatusChange(e.target.value)}
                      disabled={updatingProfileStatus}
                    >
                      <option value="Active">Active</option>
                      <option value="Closed">Closed</option>
                    </select>
                    {updatingProfileStatus && (
                      <div className="absolute right-3 top-2.5">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-400 rounded-b-xl">
          <span>Added: {new Date(architect.created_at).toLocaleDateString()}</span>
          <span>Last Updated: {new Date(architect.updated_at).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  )
}
