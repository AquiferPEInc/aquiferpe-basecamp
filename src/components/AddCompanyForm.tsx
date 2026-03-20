import { useState, useEffect } from 'react'
import { CreateCompanyRequest, Company } from '../types'
import { supabase } from '../lib/supabase'

interface AddCompanyFormProps {
  onSuccess?: () => void
  onCancel?: () => void
  initialData?: Company
}

export default function AddCompanyForm({ onSuccess, onCancel, initialData }: AddCompanyFormProps) {
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

  useEffect(() => {
    if (initialData) {
      setFormData({
        company_name: initialData.company_name,
        size: initialData.size || undefined,
        overview: initialData.overview || '',
        specialties: initialData.specialties || '',
        website: initialData.website || '',
        industry: initialData.industry || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        linkedin: initialData.linkedin || '',
        street: initialData.street || '',
        city: initialData.city || '',
        state: initialData.state || '',
        zip_code: initialData.zip_code || ''
      })
    }
  }, [initialData])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target

    if (type === 'number') {
      setFormData(prev => ({
        ...prev,
        [name]: value === '' ? undefined : parseInt(value, 10)
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (initialData) {
        const { error: updateError } = await supabase
          .from('company')
          .update(formData)
          .eq('id', initialData.id)
        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from('company')
          .insert([formData])
        if (insertError) throw insertError
      }

      setSuccess(true)

      if (!initialData) {
        setFormData({
          company_name: '',
          size: undefined,
          overview: '',
          specialties: '',
          website: '',
          industry: '',
          email: '',
          phone: '',
          linkedin: ''
        })
      }

      // Call success callback after a short delay
      setTimeout(() => {
        if (onSuccess) onSuccess()
      }, 1500)
    } catch (err: any) {
      // Check for specific database connection errors and provide user-friendly message
      let errorMessage = err.message || 'Failed to save company'

      // Check for database connection errors
      if (errorMessage.includes('EHOSTUNREACH') || errorMessage.includes('ECONNREFUSED')) {
        errorMessage = 'Cannot connect to the database. The database server may be unavailable or unreachable from this environment.\n\n' +
          'If running in Claude Code, note that network access to internal hosts may be restricted. ' +
          'Try running the application in a local terminal instead.'
      } else if (errorMessage.includes('23505')) { // PostgreSQL unique violation
        errorMessage = 'A company with this name already exists. Please use a different company name.'
      }

      setError(errorMessage)
      console.error('Error saving company:', err)
    } finally {
      setLoading(false)
    }
  }

  const commonIndustries = [
    'SaaS',
    'FinTech',
    'Healthcare',
    'Renewable Energy',
    'Supply Chain',
    'Manufacturing',
    'Retail',
    'Education',
    'Technology',
    'Finance',
    'Real Estate',
    'Transportation',
    'Hospitality',
    'Construction',
    'Agriculture'
  ]

  if (success) {
    return (
      <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-green-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <div>
            <h3 className="font-medium text-green-800">Company {initialData ? 'updated' : 'created'} successfully!</h3>
            <p className="text-sm text-green-700 mt-1">The company record has been {initialData ? 'updated in' : 'added to'} the database.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">{initialData ? 'Edit Company' : 'Add New Company'}</h2>
        <p className="text-slate-600 mt-1">
          {initialData ? 'Update the details of this company.' : 'Fill in the details below to add a new company to the database.'}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="font-medium text-red-700">Error saving company</p>
          <div className="text-sm text-red-600 mt-1 space-y-1">
            {error.split('\n').map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Required Fields */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Company Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="company_name"
              value={formData.company_name}
              onChange={handleChange}
              required
              className="input w-full"
              placeholder="Enter company name"
              disabled={loading}
            />
          </div>

          {/* Industry */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Industry
            </label>
            <select
              name="industry"
              value={formData.industry || ''}
              onChange={handleChange}
              className="input w-full"
              disabled={loading}
            >
              <option value="">Select an industry</option>
              {commonIndustries.map(industry => (
                <option key={industry} value={industry}>{industry}</option>
              ))}
              <option value="other">Other (specify in overview)</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Street Address
            </label>
            <input
              type="text"
              name="street"
              value={formData.street || ''}
              onChange={handleChange}
              className="input w-full"
              placeholder="123 Main St"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-3 gap-4 md:col-span-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                City
              </label>
              <input
                type="text"
                name="city"
                value={formData.city || ''}
                onChange={handleChange}
                className="input w-full"
                placeholder="City"
                disabled={loading}
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
                onChange={handleChange}
                className="input w-full"
                placeholder="State"
                disabled={loading}
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
                onChange={handleChange}
                className="input w-full"
                placeholder="Zip Code"
                disabled={loading}
              />
            </div>
          </div>

          {/* Size */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Number of Employees
            </label>
            <input
              type="number"
              name="size"
              value={formData.size || ''}
              onChange={handleChange}
              min="0"
              className="input w-full"
              placeholder="e.g., 500"
              disabled={loading}
            />
          </div>

          {/* Website */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Website
            </label>
            <input
              type="url"
              name="website"
              value={formData.website || ''}
              onChange={handleChange}
              className="input w-full"
              placeholder="https://example.com"
              disabled={loading}
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email || ''}
              onChange={handleChange}
              className="input w-full"
              placeholder="contact@company.com"
              disabled={loading}
            />
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone || ''}
              onChange={handleChange}
              className="input w-full"
              placeholder="+1 (555) 123-4567"
              disabled={loading}
            />
          </div>

          {/* LinkedIn URL */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              LinkedIn URL
            </label>
            <input
              type="url"
              name="linkedin"
              value={formData.linkedin || ''}
              onChange={handleChange}
              className="input w-full"
              placeholder="https://linkedin.com/company/..."
              disabled={loading}
            />
          </div>

          {/* Specialties */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Specialties
            </label>
            <input
              type="text"
              name="specialties"
              value={formData.specialties || ''}
              onChange={handleChange}
              className="input w-full"
              placeholder="e.g., AI, Cloud Computing, Cybersecurity"
              disabled={loading}
            />
          </div>

          {/* Overview */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Overview
            </label>
            <textarea
              name="overview"
              value={formData.overview || ''}
              onChange={handleChange}
              rows={3}
              className="input w-full"
              placeholder="Brief description of the company..."
              disabled={loading}
            />
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
            disabled={loading || !formData.company_name.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                Saving...
              </>
            ) : (initialData ? 'Update Company' : 'Add Company')}
          </button>
        </div>
      </form>
    </div>
  )
}