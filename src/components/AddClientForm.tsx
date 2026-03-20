import { useState, useEffect } from 'react'
import { CreateClientRequest, Client } from '../types'
import CompanySearch from './CompanySearch'
import { supabase } from '../lib/supabase'

interface AddClientFormProps {
  onSuccess?: () => void
  onCancel?: () => void
  initialData?: Client
}

export default function AddClientForm({ onSuccess, onCancel, initialData }: AddClientFormProps) {
  const [formData, setFormData] = useState<CreateClientRequest>({
    first_name: '',
    last_name: '',
    email: '',
    title: '',
    location: '',
    experience: '',
    company_id: undefined,
    verified: false,
    linkedin: '',
    active_status: 'Active',
    notes: ''
  })
  
  useEffect(() => {
    if (initialData) {
      setFormData({
        first_name: initialData.first_name,
        last_name: initialData.last_name,
        email: initialData.email,
        title: initialData.title || '',
        location: initialData.location || '',
        experience: initialData.experience || '',
        company_id: initialData.company_id || undefined,
        verified: initialData.verified || false,
        linkedin: initialData.linkedin || '',
        active_status: initialData.active_status || 'Active',
        notes: initialData.notes || ''
      })
    }
  }, [initialData])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleCompanySelect = (companyId: number) => {
    console.log('Company selected with ID:', companyId)
    setFormData(prev => ({
      ...prev,
      company_id: companyId
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validate company_id is required for new clients
      if (!initialData && !formData.company_id) {
        throw new Error('Company selection is required when creating a new client')
      }

      const payload: CreateClientRequest = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim(),
        title: formData.title?.trim() || undefined,
        location: formData.location?.trim() || undefined,
        experience: formData.experience?.trim() || undefined,
        company_id: formData.company_id,
        verified: formData.verified,
        linkedin: formData.linkedin?.trim() || undefined,
        active_status: formData.active_status,
        notes: formData.notes?.trim() || undefined
      }

      if (initialData) {
        const { error: updateError } = await supabase
          .from('client')
          .update(payload)
          .eq('id', initialData.id)
        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from('client')
          .insert([payload])
        if (insertError) throw insertError
      }

      setSuccess(true)
      
      if (!initialData) {
        setFormData({
          first_name: '',
          last_name: '',
          email: '',
          title: '',
          location: '',
          experience: '',
          company_id: undefined,
          verified: false,
          linkedin: '',
          active_status: 'Active',
          notes: ''
        })
      }

      setTimeout(() => {
        if (onSuccess) onSuccess()
      }, 1000)
    } catch (err: any) {
      let errorMessage = err.message || 'Failed to save client'

      if (errorMessage.includes('EHOSTUNREACH') || errorMessage.includes('ECONNREFUSED')) {
        errorMessage = 'Cannot connect to the database. The database server may be unavailable or unreachable from this environment.\n\n' +
                      'If running in Claude Code, note that network access to internal hosts may be restricted. ' +
                      'Try running the application in a local terminal instead.'
      } else if (errorMessage.includes('23505')) {
        errorMessage = 'A client with this email already exists. Please use a different email.'
      } else if (errorMessage.includes('23503')) {
        errorMessage = 'The specified company ID does not exist. Please check the company ID.'
      }

      setError(errorMessage)
      console.error('Error saving client:', err)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-green-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <div>
            <h3 className="font-medium text-green-800">Client {initialData ? 'updated' : 'created'} successfully!</h3>
            <p className="text-sm text-green-700 mt-1">The client record has been {initialData ? 'updated in' : 'added to'} the database.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">{initialData ? 'Edit Client' : 'Add New Client'}</h2>
        <p className="text-slate-600 mt-1">
          {initialData ? 'Update the details of this client.' : 'Fill in the details below to add a new client to the database.'}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="font-medium text-red-700">Error saving client</p>
          <div className="text-sm text-red-600 mt-1 space-y-1">
            {error.split('\n').map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              required
              className="input w-full"
              placeholder="Enter first name"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              required
              className="input w-full"
              placeholder="Enter last name"
              disabled={loading}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="input w-full"
              placeholder="name@company.com"
              disabled={loading}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              LinkedIn URL
            </label>
            <input
              type="url"
              name="linkedin"
              value={formData.linkedin || ''}
              onChange={handleChange}
              className="input w-full"
              placeholder="https://www.linkedin.com/in/username"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Title
            </label>
            <input
              type="text"
              name="title"
              value={formData.title || ''}
              onChange={handleChange}
              className="input w-full"
              placeholder="e.g., VP of Engineering"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Location
            </label>
            <input
              type="text"
              name="location"
              value={formData.location || ''}
              onChange={handleChange}
              className="input w-full"
              placeholder="e.g., New York, NY"
              disabled={loading}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Experience
            </label>
            <textarea
              name="experience"
              value={formData.experience || ''}
              onChange={handleChange}
              rows={3}
              className="input w-full"
              placeholder="e.g., 10+ years in private equity, former consultant at..."
              disabled={loading}
            />
          </div>

          <div className="md:col-span-2 grid grid-cols-2 gap-6">
            <label className="flex items-center space-x-2 cursor-pointer h-full pt-6">
              <input
                type="checkbox"
                name="verified"
                checked={formData.verified || false}
                onChange={handleChange}
                className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                disabled={loading}
              />
              <span className="text-sm font-medium text-slate-700">Verified Client</span>
            </label>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Status
              </label>
              <select
                name="active_status"
                value={formData.active_status || 'Active'}
                onChange={handleChange}
                className="input w-full"
                disabled={loading}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes || ''}
              onChange={handleChange}
              rows={3}
              className="input w-full"
              placeholder="Internal notes about the client..."
              disabled={loading}
            />
          </div>

          <div className="md:col-span-2">
            <CompanySearch onSelectCompany={handleCompanySelect} initialCompanyName={initialData?.company_name || undefined} required={!initialData} />
          </div>
        </div>

        <div className="mt-8 flex justify-end space-x-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading || !formData.first_name.trim() || !formData.last_name.trim() || !formData.email.trim() || (!initialData && !formData.company_id)}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                Saving...
              </>
            ) : (initialData ? 'Update Client' : 'Add Client')}
          </button>
        </div>
      </form>
    </div>
  )
}


