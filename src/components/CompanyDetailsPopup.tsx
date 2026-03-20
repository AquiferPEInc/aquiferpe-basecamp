import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Company, CreateCompanyRequest } from '../types/company'
import { openInWindow } from '../lib/window-open'
import { supabase } from '../lib/supabase'

interface CompanyDetailsPopupProps {
  company: Company
  onClose: () => void
  onCompanyUpdated?: (updatedCompany: Company) => void
  initialEditMode?: boolean
}

export default function CompanyDetailsPopup({ company, onClose, onCompanyUpdated, initialEditMode = false }: CompanyDetailsPopupProps) {
  const navigate = useNavigate()
  const [isEditing, setIsEditing] = useState(initialEditMode)
  const [formData, setFormData] = useState<CreateCompanyRequest>({
    company_name: '',
    size: undefined,
    overview: '',
    specialties: '',
    website: '',
    industry: '',
    email: '',
    phone: '',
    linkedin: '',
    street: '',
    city: '',
    state: '',
    zip_code: ''
  })
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [editSuccess, setEditSuccess] = useState(false)
  const [clientCount, setClientCount] = useState<number | null>(null)

  // In-place editing state for LinkedIn
  const [isEditingLinkedin, setIsEditingLinkedin] = useState(false)
  const [tempLinkedin, setTempLinkedin] = useState('')

  useEffect(() => {
    if (company?.id) {
      const fetchClientCount = async () => {
        try {
          const { count, error } = await supabase
            .from('client')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', company.id)
            
          if (!error) {
            setClientCount(count)
          }
        } catch (error) {
          console.error('Error fetching client count:', error)
        }
      }
      fetchClientCount()
    }
  }, [company])

  // Initialize form data with company data
  useEffect(() => {
    if (company) {
      setFormData({
        company_name: company.company_name,
        size: company.size || undefined,
        overview: company.overview || '',
        specialties: company.specialties || '',
        website: company.website || '',
        industry: company.industry || '',
        email: company.email || '',
        phone: company.phone || '',
        linkedin: company.linkedin || '',
        street: company.street || '',
        city: company.city || '',
        state: company.state || '',
        zip_code: company.zip_code || ''
      })
      setTempLinkedin(company.linkedin || '')
    }
  }, [company])

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    if (name === 'size') {
      const numValue = value === '' ? undefined : parseInt(value)
      setFormData(prev => ({
        ...prev,
        [name]: numValue
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setEditLoading(true)
    setEditError(null)

    try {
      const payload: CreateCompanyRequest = {
        company_name: formData.company_name.trim(),
        size: formData.size,
        overview: formData.overview?.trim() || undefined,
        specialties: formData.specialties?.trim() || undefined,
        website: formData.website?.trim() || undefined,
        industry: formData.industry?.trim() || undefined,
        email: formData.email?.trim() || undefined,
        phone: formData.phone?.trim() || undefined,
        linkedin: formData.linkedin?.trim() || undefined,
        street: formData.street?.trim() || undefined,
        city: formData.city?.trim() || undefined,
        state: formData.state?.trim() || undefined,
        zip_code: formData.zip_code?.trim() || undefined
      }

      const { error } = await supabase
        .from('company')
        .update(payload)
        .eq('id', company.id)

      if (error) {
        throw error
      }

      if (onCompanyUpdated) {
        onCompanyUpdated({ ...company, ...payload } as Company)
      }

      setEditSuccess(true)
      setIsEditing(false)
      
      setTimeout(() => {
        setEditSuccess(false)
      }, 3000)
    } catch (err: any) {
      let errorMessage = err.message || 'Failed to update company'

      if (errorMessage.includes('EHOSTUNREACH') || errorMessage.includes('ECONNREFUSED')) {
        errorMessage = 'Cannot connect to the database. The database server may be unavailable or unreachable from this environment.\n\n' +
          'If running in Claude Code, note that network access to internal hosts may be restricted. ' +
          'Try running the application in a local terminal instead.'
      }

      setEditError(errorMessage)
      console.error('Error updating company:', err)
    } finally {
      setEditLoading(false)
    }
  }

  const handleLinkedinUpdate = async () => {
    // Only update if value changed
    if (tempLinkedin === (company.linkedin || '')) {
      setIsEditingLinkedin(false)
      return
    }

    try {
      const payload: CreateCompanyRequest = {
        company_name: company.company_name,
        size: company.size || undefined,
        overview: company.overview || undefined,
        specialties: company.specialties || undefined,
        website: company.website || undefined,
        industry: company.industry || undefined,
        email: company.email || undefined,
        phone: company.phone || undefined,
        linkedin: tempLinkedin.trim() || undefined,
        street: company.street || undefined,
        city: company.city || undefined,
        state: company.state || undefined,
        zip_code: company.zip_code || undefined
      }

      const { error } = await supabase
        .from('company')
        .update(payload)
        .eq('id', company.id)

      if (!error) {
        if (onCompanyUpdated) {
          onCompanyUpdated({ ...company, ...payload } as Company)
        }
        setEditSuccess(true)
        setTimeout(() => {
          setEditSuccess(false)
        }, 3000)
      }
    } catch (error) {
      console.error('Error updating linkedin:', error)
      // Reset to original value on error
      setTempLinkedin(company.linkedin || '')
    } finally {
      setIsEditingLinkedin(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Company Details</h2>
            <p className="text-slate-600">{company.company_name}</p>
          </div>
          <div className="flex items-center space-x-2">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="btn-primary"
              >
                Edit Company
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isEditing ? (
            // Edit Company Form
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Edit Company Information</h3>
                <p className="text-slate-600">Update the details of this company.</p>
              </div>

              {editError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="font-medium text-red-700">Error updating company</p>
                  <div className="text-sm text-red-600 mt-1 space-y-1">
                    {editError.split('\n').map((line, index) => (
                      <p key={index}>{line}</p>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleEditSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Company Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="company_name"
                      value={formData.company_name}
                      onChange={handleEditChange}
                      required
                      className="input w-full"
                      placeholder="Enter company name"
                      disabled={editLoading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Industry
                    </label>
                    <input
                      type="text"
                      name="industry"
                      value={formData.industry || ''}
                      onChange={handleEditChange}
                      className="input w-full"
                      placeholder="e.g., Technology, Healthcare"
                      disabled={editLoading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Website
                    </label>
                    <input
                      type="text"
                      name="website"
                      value={formData.website || ''}
                      onChange={handleEditChange}
                      className="input w-full"
                      placeholder="e.g., www.example.com"
                      disabled={editLoading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      LinkedIn URL
                    </label>
                    <input
                      type="text"
                      name="linkedin"
                      value={formData.linkedin || ''}
                      onChange={handleEditChange}
                      className="input w-full"
                      placeholder="e.g., https://linkedin.com/company/..."
                      disabled={editLoading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email || ''}
                      onChange={handleEditChange}
                      className="input w-full"
                      placeholder="e.g., contact@company.com"
                      disabled={editLoading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone || ''}
                      onChange={handleEditChange}
                      className="input w-full"
                      placeholder="e.g., +1 (555) 123-4567"
                      disabled={editLoading}
                    />
                  </div>

                                    <div className="md:col-span-2">

                                      <label className="block text-sm font-medium text-slate-700 mb-2">

                                        Street Address

                                      </label>

                                      <input

                                        type="text"

                                        name="street"

                                        value={formData.street || ''}

                                        onChange={handleEditChange}

                                        className="input w-full"

                                        placeholder="e.g., 123 Main St"

                                        disabled={editLoading}

                                      />

                                    </div>

                  

                                    <div className="md:col-span-2 grid grid-cols-3 gap-4">

                                      <div>

                                        <label className="block text-sm font-medium text-slate-700 mb-2">

                                          City

                                        </label>

                                        <input

                                          type="text"

                                          name="city"

                                          value={formData.city || ''}

                                          onChange={handleEditChange}

                                          className="input w-full"

                                          placeholder="City"

                                          disabled={editLoading}

                                        />

                                      </div>

                                      <div>

                                        <label className="block text-sm font-medium text-slate-700 mb-2">

                                          State

                                        </label>

                                        <input

                                          type="text"

                                          name="state"

                                          value={formData.state || ''}

                                          onChange={handleEditChange}

                                          className="input w-full"

                                          placeholder="State"

                                          disabled={editLoading}

                                        />

                                      </div>

                                      <div>

                                        <label className="block text-sm font-medium text-slate-700 mb-2">

                                          Zip Code

                                        </label>

                                        <input

                                          type="text"

                                          name="zip_code"

                                          value={formData.zip_code || ''}

                                          onChange={handleEditChange}

                                          className="input w-full"

                                          placeholder="Zip"

                                          disabled={editLoading}

                                        />

                                      </div>

                                    </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Employees
                    </label>
                    <input
                      type="number"
                      name="size"
                      value={formData.size || ''}
                      onChange={handleEditChange}
                      className="input w-full"
                      placeholder="e.g., 500"
                      disabled={editLoading}
                      min="0"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Overview
                    </label>
                    <textarea
                      name="overview"
                      value={formData.overview || ''}
                      onChange={handleEditChange}
                      rows={4}
                      className="input w-full"
                      placeholder="Brief description of the company..."
                      disabled={editLoading}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Specialties
                    </label>
                    <textarea
                      name="specialties"
                      value={formData.specialties || ''}
                      onChange={handleEditChange}
                      rows={3}
                      className="input w-full"
                      placeholder="Key areas of expertise..."
                      disabled={editLoading}
                    />
                  </div>
                </div>

                <div className="mt-8 flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={editLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editLoading || !formData.company_name.trim()}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editLoading ? (
                      <>
                        <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                        Saving...
                      </>
                    ) : 'Update Company'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            // View Company Details
            <div>
              {editSuccess && (
                <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg flex items-center animate-fade-in-down">
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Company details saved successfully</span>
                </div>
              )}
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Company Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-500">Company Name</label>
                    <p className="text-slate-900 font-medium">{company.company_name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-500">Website</label>
                    {company.website ? (
                      <a
                        href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                        onClick={(e) => {
                          e.preventDefault()
                          openInWindow(company.website!.startsWith('http') ? company.website! : `https://${company.website}`)
                        }}
                        className="text-primary-600 hover:text-primary-800"
                      >
                        {company.website}
                      </a>
                    ) : (
                      <p className="text-slate-900">Not specified</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-500">Email</label>
                    {company.email ? (
                      <span className="text-sm">{company.email}</span>
                    ) : (
                      <p className="text-slate-900">Not specified</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-500">Phone</label>
                    <p className="text-slate-900">{company.phone || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-500">LinkedIn</label>
                    {isEditingLinkedin ? (
                      <input
                        type="url"
                        value={tempLinkedin}
                        onChange={(e) => setTempLinkedin(e.target.value)}
                        onBlur={handleLinkedinUpdate}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleLinkedinUpdate()
                          } else if (e.key === 'Escape') {
                            setTempLinkedin(company.linkedin || '')
                            setIsEditingLinkedin(false)
                          }
                        }}
                        autoFocus
                        className="input w-full h-8 text-sm mt-1"
                        placeholder="https://linkedin.com/..."
                      />
                    ) : (
                      <div
                        onDoubleClick={() => setIsEditingLinkedin(true)}
                        className="cursor-pointer hover:bg-slate-50 p-1 -m-1 rounded transition-colors group relative"
                        title="Double-click to edit"
                      >
                        {company.linkedin ? (
                          <a
                            href={company.linkedin.startsWith('http') ? company.linkedin : `https://${company.linkedin}`}
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              openInWindow(company.linkedin!.startsWith('http') ? company.linkedin! : `https://${company.linkedin}`)
                            }}
                            className="text-primary-600 hover:text-primary-800"
                          >
                            {company.linkedin}
                          </a>
                        ) : (
                          <p className="text-slate-900">Not specified</p>
                        )}
                        <span className="absolute right-0 top-1/2 -translate-y-1/2 text-xs text-slate-400 opacity-0 group-hover:opacity-100 mr-2">
                          Double-click to edit
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-500">Street Address</label>
                    <p className="text-slate-900">{company.street || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-500">City</label>
                    <p className="text-slate-900">{company.city || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-500">State</label>
                    <p className="text-slate-900">{company.state || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-500">Zip Code</label>
                    <p className="text-slate-900">{company.zip_code || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-500">Employee Count</label>
                    <p className="text-slate-900">{company.size ? company.size.toLocaleString() : 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-500">Last Updated</label>
                    <p className="text-slate-900">
                      {new Date(company.updated_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-200">
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-2">Overview</label>
                  <textarea
                    value={company.overview || 'Not specified'}
                    readOnly
                    rows={4}
                    className="input w-full bg-slate-50 cursor-default"
                  />
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-200">
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-2">Specialties</label>
                  <textarea
                    value={company.specialties || 'Not specified'}
                    readOnly
                    rows={3}
                    className="input w-full bg-slate-50 cursor-default"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-200 bg-slate-50 rounded-b-lg flex justify-end">
          <div className="flex space-x-2">
            {!isEditing && (
              <button
                onClick={() => {
                  onClose()
                  navigate(`/client?company_name=${encodeURIComponent(company.company_name)}`)
                }}
                disabled={clientCount === 0}
                className={`btn-secondary border-primary-200 ${clientCount === 0
                  ? 'text-slate-400 border-slate-200 cursor-not-allowed'
                  : 'text-primary-600 hover:text-primary-700 hover:bg-primary-50'
                  }`}
              >
                View Associated Clients {clientCount !== null ? `(${clientCount})` : ''}
              </button>
            )}
            {isEditing ? (
              <button
                onClick={() => setIsEditing(false)}
                className="btn-secondary"
              >
                Cancel Edit
              </button>
            ) : null}
            <button
              onClick={onClose}
              className="btn-secondary"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
