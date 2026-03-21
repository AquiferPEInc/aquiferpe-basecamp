import React, { useState, useEffect } from 'react'
import { Client, Communication, CreateClientRequest, CommunicationType } from '../types'
import CompanySearch from './CompanySearch'
import { openInWindow } from '../lib/window-open'
import { supabase } from '../lib/supabase'

interface ClientDetailsPopupProps {
  client: Client
  onClose: () => void
  onClientUpdated?: (updatedClient: Client) => void
  onClientDeleted?: () => void
  initialEditMode?: boolean
}

// Helper function to get current local time in datetime-local format
const getCurrentLocalDateTime = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

export default function ClientDetailsPopup({ client, onClose, onClientUpdated, onClientDeleted, initialEditMode = false }: ClientDetailsPopupProps) {
  const [isEditing, setIsEditing] = useState(initialEditMode)
  const [communications, setCommunications] = useState<Communication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Edit client form state
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
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [editSuccess, setEditSuccess] = useState(false)

  // Add communication form state
  const [communicationEditingId, setCommunicationEditingId] = useState<number | null>(null)
  const [newNote, setNewNote] = useState('')
  const [newType, setNewType] = useState<CommunicationType>('email')
  const [newDate, setNewDate] = useState(getCurrentLocalDateTime())
  const [newReferenceId, setNewReferenceId] = useState('')
  const [submittingCommunication, setSubmittingCommunication] = useState(false)
  
  // Quick edit state for LinkedIn
  const [isQuickEditingLinkedin, setIsQuickEditingLinkedin] = useState(false)
  const [quickLinkedinValue, setQuickLinkedinValue] = useState('')

  // Quick edit state for Title
  const [isQuickEditingTitle, setIsQuickEditingTitle] = useState(false)
  const [quickTitleValue, setQuickTitleValue] = useState('')

  // Quick edit state for Location
  const [isQuickEditingLocation, setIsQuickEditingLocation] = useState(false)
  const [quickLocationValue, setQuickLocationValue] = useState('')

  // Quick edit state for Notes
  const [isQuickEditingNotes, setIsQuickEditingNotes] = useState(false)
  const [quickNotesValue, setQuickNotesValue] = useState('')

  // Initialize form data with client data
  useEffect(() => {
    if (client) {
      setFormData({
        first_name: client.first_name,
        last_name: client.last_name,
        email: client.email,
        title: client.title || '',
        location: client.location || '',
        experience: client.experience || '',
        company_id: client.company_id || undefined,
        verified: client.verified || false,
        linkedin: client.linkedin || '',
        active_status: client.active_status || 'Active',
        notes: client.notes || ''
      })
    }
  }, [client])

  const fetchCommunications = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('communication')
        .select('*')
        .eq('client_id', client.id)
        .order('date', { ascending: false })
      if (error) throw error
      setCommunications(data as unknown as Communication[])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCommunications()
  }, [client.id])

  const handleEditCommunication = (comm: Communication) => {
    setCommunicationEditingId(comm.id)
    setNewType(comm.type)
    setNewNote(comm.notes || '')
    setNewReferenceId(comm.reference_id || '')
    
    // Convert to local date time string
    const date = new Date(comm.date)
    const offset = date.getTimezoneOffset()
    const localDate = new Date(date.getTime() - (offset * 60 * 1000))
    setNewDate(localDate.toISOString().slice(0, 16))
  }

  const handleCancelEditCommunication = () => {
    setCommunicationEditingId(null)
    setNewNote('')
    setNewType('email')
    setNewDate(getCurrentLocalDateTime())
    setNewReferenceId('')
  }

  const handleDeleteCommunication = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this communication?')) return

    try {
      const { error } = await supabase
        .from('communication')
        .delete()
        .eq('id', id)
        
      if (error) throw error

      if (communicationEditingId === id) {
        handleCancelEditCommunication()
      }
      
      fetchCommunications()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    // Handle checkbox specifically
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleCompanySelect = (companyId: number) => {
    setFormData(prev => ({
      ...prev,
      company_id: companyId
    }))
  }

  const handleQuickLinkedinSave = async () => {
    try {
      const payload: CreateClientRequest = {
        first_name: client.first_name,
        last_name: client.last_name,
        email: client.email,
        title: client.title || undefined,
        location: client.location || undefined,
        experience: client.experience || undefined,
        company_id: client.company_id || undefined,
        verified: client.verified,
        linkedin: quickLinkedinValue.trim() || undefined
      }

      const { error } = await supabase
        .from('client')
        .update(payload)
        .eq('id', client.id)
        
      if (error) throw error
      
      if (onClientUpdated) onClientUpdated({ ...client, ...payload } as Client)
      setIsQuickEditingLinkedin(false)
    } catch (error) {
      console.error('Error saving LinkedIn URL:', error)
    }
  }

  const handleQuickTitleSave = async () => {
    try {
      const payload: CreateClientRequest = {
        first_name: client.first_name,
        last_name: client.last_name,
        email: client.email,
        title: quickTitleValue.trim() || undefined,
        location: client.location || undefined,
        experience: client.experience || undefined,
        company_id: client.company_id || undefined,
        verified: client.verified,
        linkedin: client.linkedin || undefined
      }

      const { error } = await supabase
        .from('client')
        .update(payload)
        .eq('id', client.id)
        
      if (error) throw error
      
      if (onClientUpdated) onClientUpdated({ ...client, ...payload } as Client)
      setIsQuickEditingTitle(false)
    } catch (error) {
      console.error('Error saving Title:', error)
    }
  }

  const handleQuickLocationSave = async () => {
    try {
      const payload: CreateClientRequest = {
        first_name: client.first_name,
        last_name: client.last_name,
        email: client.email,
        title: client.title || undefined,
        location: quickLocationValue.trim() || undefined,
        experience: client.experience || undefined,
        company_id: client.company_id || undefined,
        verified: client.verified,
        linkedin: client.linkedin || undefined
      }

      const { error } = await supabase
        .from('client')
        .update(payload)
        .eq('id', client.id)
        
      if (error) throw error
      
      if (onClientUpdated) onClientUpdated({ ...client, ...payload } as Client)
      setIsQuickEditingLocation(false)
    } catch (error) {
      console.error('Error saving Location:', error)
    }
  }

  const handleQuickNotesSave = async () => {
    try {
      const payload: CreateClientRequest = {
        first_name: client.first_name,
        last_name: client.last_name,
        email: client.email,
        title: client.title || undefined,
        location: client.location || undefined,
        experience: client.experience || undefined,
        company_id: client.company_id || undefined,
        verified: client.verified,
        linkedin: client.linkedin || undefined,
        active_status: client.active_status,
        notes: quickNotesValue.trim() || undefined
      }

      const { error } = await supabase
        .from('client')
        .update(payload)
        .eq('id', client.id)
        
      if (error) throw error
      
      if (onClientUpdated) onClientUpdated({ ...client, ...payload } as Client)
      setIsQuickEditingNotes(false)
    } catch (error) {
      console.error('Error saving Notes:', error)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setEditLoading(true)
    setEditError(null)

    try {
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

      const { error } = await supabase
        .from('client')
        .update(payload)
        .eq('id', client.id)
        
      if (error) throw error

      setEditSuccess(true)
      setIsEditing(false)
      if (onClientUpdated) {
        onClientUpdated({ ...client, ...payload } as Client)
      }

      setTimeout(() => {
        setEditSuccess(false)
      }, 3000)
    } catch (err: any) {
      setEditError(err.message || 'Failed to update client')
      console.error('Error updating client:', err)
    } finally {
      setEditLoading(false)
    }
  }

  const handleAddCommunication = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNote.trim()) return

    setSubmittingCommunication(true)
    try {
      const payload = {
        type: newType,
        notes: newNote,
        date: new Date(newDate).toISOString(),
        reference_id: newReferenceId,
      }
      
      if (communicationEditingId) {
        const { error } = await supabase
          .from('communication')
          .update(payload)
          .eq('id', communicationEditingId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('communication')
          .insert([{ ...payload, client_id: client.id }])
        if (error) throw error
      }

      handleCancelEditCommunication()
      fetchCommunications() // Refresh the communication list
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSubmittingCommunication(false)
    }
  }

  const handleToggleVerified = async () => {
    if (client.verified) return // Only for unverified -> verified

    if (!window.confirm(`Are you sure you want to mark ${client.first_name} ${client.last_name} as verified?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('client')
        .update({ verified: true })
        .eq('id', client.id)
        
      if (error) throw error

      if (onClientUpdated) {
        onClientUpdated({ ...client, verified: true })
      }
      setEditSuccess(true)
      setTimeout(() => setEditSuccess(false), 3000)
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleDeleteClient = async () => {
    const clientName = `${client.first_name} ${client.last_name}`
    if (!window.confirm(`Are you sure you want to delete client "${clientName}"? This action cannot be undone.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('client')
        .delete()
        .eq('id', client.id)
        
      if (error) throw error

      if (onClientDeleted) {
        onClientDeleted()
      }
      onClose()
    } catch (err: any) {
      alert(err.message || 'Failed to delete client')
      console.error('Error deleting client:', err)
    }
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col relative">
        {/* Floating Success Notification */}
        {editSuccess && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[60] pointer-events-none">
            <div className="bg-green-600 text-white px-6 py-2 rounded-full shadow-lg flex items-center space-x-2 animate-bounce">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="font-medium">Client updated successfully!</span>
            </div>
          </div>
        )}

        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Client Details</h2>
            <p className="text-slate-600">
              {client.first_name} {client.last_name}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="btn-primary"
              >
                Edit Client
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
            // Edit Client Form
            <div className="mb-8">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Edit Client Information</h3>
                <p className="text-slate-600">
                  Update the details of this client.
                </p>
              </div>

              {editError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="font-medium text-red-700">Error updating client</p>
                  <div className="text-sm text-red-600 mt-1 space-y-1">
                    {editError.split('\n').map((line, index) => (
                      <p key={index}>{line}</p>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleEditSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleEditChange}
                      required
                      className="input w-full"
                      placeholder="Enter first name"
                      disabled={editLoading}
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
                      onChange={handleEditChange}
                      required
                      className="input w-full"
                      placeholder="Enter last name"
                      disabled={editLoading}
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
                      onChange={handleEditChange}
                      required
                      className="input w-full"
                      placeholder="name@company.com"
                      disabled={editLoading}
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
                      onChange={handleEditChange}
                      className="input w-full"
                      placeholder="https://www.linkedin.com/in/username"
                      disabled={editLoading}
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
                      onChange={handleEditChange}
                      className="input w-full"
                      placeholder="e.g., VP of Engineering"
                      disabled={editLoading}
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
                      onChange={handleEditChange}
                      className="input w-full"
                      placeholder="e.g., New York, NY"
                      disabled={editLoading}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Experience
                    </label>
                    <textarea
                      name="experience"
                      value={formData.experience || ''}
                      onChange={handleEditChange}
                      rows={3}
                      className="input w-full"
                      placeholder="e.g., 10+ years in private equity, former consultant at..."
                      disabled={editLoading}
                    />
                  </div>

                  <div className="md:col-span-2 grid grid-cols-2 gap-6">
                    <label className="flex items-center space-x-2 cursor-pointer h-full pt-6">
                      <input
                        type="checkbox"
                        name="verified"
                        checked={formData.verified || false}
                        onChange={handleEditChange}
                        className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                        disabled={editLoading}
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
                        onChange={handleEditChange}
                        className="input w-full"
                        disabled={editLoading}
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
                      onChange={handleEditChange}
                      rows={3}
                      className="input w-full"
                      placeholder="Internal notes about the client..."
                      disabled={editLoading}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <CompanySearch
                      onSelectCompany={handleCompanySelect}
                      initialCompanyName={client.company_name || undefined}
                      required={false}
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
                    disabled={editLoading || !formData.first_name.trim() || !formData.last_name.trim() || !formData.email.trim()}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editLoading ? (
                      <>
                        <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                        Saving...
                      </>
                    ) : 'Update Client'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            // View Client Details
            <div className="mb-8">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Personal Information</h3>
                <div className="flex flex-col items-end space-y-2">
                  <div className="flex space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${client.active_status === 'Inactive' ? 'bg-gray-100 text-gray-800' : 'bg-blue-100 text-blue-800'}`}>
                      {client.active_status || 'Active'}
                    </span>
                    <span 
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${client.verified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800 cursor-pointer hover:bg-red-200 transition-colors'}`}
                      onClick={handleToggleVerified}
                      title={client.verified ? 'Verified Client' : 'Click to verify this client'}
                    >
                      <span className={`w-2 h-2 rounded-full mr-1.5 ${client.verified ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      {client.verified ? 'Verified' : 'Unverified'}
                    </span>
                  </div>
                  {!client.verified && (
                    <a
                       href={`https://www.google.com/search?q=${encodeURIComponent(`${client.first_name} ${client.last_name} ${client.company_name || ''} LinkedIn`)}`}
                      onClick={(e) => {
                        e.preventDefault()
                        openInWindow(`https://www.google.com/search?q=${encodeURIComponent(`${client.first_name} ${client.last_name} ${client.company_name || ''} LinkedIn`)}`)
                      }}
                      className="text-xs text-primary-600 hover:text-primary-800 font-medium flex items-center hover:underline"
                    >
                      <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.18 1-.78 1.85-1.63 2.42v2.01h2.64c1.55-1.42 2.43-3.52 2.43-5.94z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H3.18v2.13C5 19.92 8.27 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.78H3.18C2.42 9.12 2 10.52 2 12s.42 2.88 1.18 4.22l2.66-2.13z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 8.27 1 5 4.08 3.18 7.78l2.66 2.13c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                      Search on Google
                    </a>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-500">Full Name</label>
                    <p className="text-slate-900 font-medium">{client.first_name} {client.last_name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-500">Email</label>
                      {client.email}
                  </div>
                  <div 
                    onDoubleClick={() => {
                      setQuickLinkedinValue(client.linkedin || '')
                      setIsQuickEditingLinkedin(true)
                    }}
                    title="Double-click to edit"
                    className="cursor-pointer"
                  >
                    <label className="block text-sm font-medium text-slate-500">LinkedIn</label>
                    {isQuickEditingLinkedin ? (
                      <input
                        type="url"
                        value={quickLinkedinValue}
                        onChange={(e) => setQuickLinkedinValue(e.target.value)}
                        onBlur={handleQuickLinkedinSave}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleQuickLinkedinSave()
                          } else if (e.key === 'Escape') {
                            setIsQuickEditingLinkedin(false)
                          }
                        }}
                        autoFocus
                        className="input w-full py-1 px-2 text-sm mt-1"
                        placeholder="https://www.linkedin.com/in/username"
                      />
                    ) : client.linkedin ? (
                      <a
                        href={client.linkedin.startsWith('http') ? client.linkedin : `https://${client.linkedin}`}
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          openInWindow(client.linkedin!)
                        }}
                        className="text-primary-600 hover:text-primary-800 break-all"
                      >
                        {client.linkedin}
                      </a>
                    ) : (
                      <span className="text-slate-500 text-sm">Not specified</span>
                    )}
                  </div>
                  <div 
                    onDoubleClick={() => {
                      setQuickTitleValue(client.title || '')
                      setIsQuickEditingTitle(true)
                    }}
                    title="Double-click to edit"
                    className="cursor-pointer"
                  >
                    <label className="block text-sm font-medium text-slate-500">Title</label>
                    {isQuickEditingTitle ? (
                      <input
                        type="text"
                        value={quickTitleValue}
                        onChange={(e) => setQuickTitleValue(e.target.value)}
                        onBlur={handleQuickTitleSave}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleQuickTitleSave()
                          } else if (e.key === 'Escape') {
                            setIsQuickEditingTitle(false)
                          }
                        }}
                        autoFocus
                        className="input w-full py-1 px-2 text-sm mt-1"
                        placeholder="e.g., VP of Engineering"
                      />
                    ) : (
                      <p className="text-slate-900">{client.title || 'Not specified'}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-3">
                  <div
                    onDoubleClick={() => {
                      setQuickLocationValue(client.location || '')
                      setIsQuickEditingLocation(true)
                    }}
                    title="Double-click to edit"
                    className="cursor-pointer"
                  >
                    <label className="block text-sm font-medium text-slate-500">Location</label>
                    {isQuickEditingLocation ? (
                      <input
                        type="text"
                        value={quickLocationValue}
                        onChange={(e) => setQuickLocationValue(e.target.value)}
                        onBlur={handleQuickLocationSave}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleQuickLocationSave()
                          } else if (e.key === 'Escape') {
                            setIsQuickEditingLocation(false)
                          }
                        }}
                        autoFocus
                        className="input w-full py-1 px-2 text-sm mt-1"
                        placeholder="e.g., New York, NY"
                      />
                    ) : (
                      <p className="text-slate-900">{client.location || 'Not specified'}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-500">Company</label>
                    <p className="text-slate-900">{client.company_name || 'Not linked'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-500">Last Updated</label>
                    <p className="text-slate-900">
                      {new Date(client.updated_at).toLocaleDateString('en-US', {
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
                  <label className="block text-sm font-medium text-slate-500 mb-2">Experience</label>
                  <textarea
                    value={client.experience || 'Not specified'}
                    readOnly
                    rows={3}
                    className="input w-full bg-slate-50 cursor-default"
                  />
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-200">
                <div
                  onDoubleClick={() => {
                    setQuickNotesValue(client.notes || '')
                    setIsQuickEditingNotes(true)
                  }}
                  title="Double-click to edit"
                  className="cursor-pointer"
                >
                  <label className="block text-sm font-medium text-slate-500 mb-2">Notes</label>
                  {isQuickEditingNotes ? (
                    <textarea
                      value={quickNotesValue}
                      onChange={(e) => setQuickNotesValue(e.target.value)}
                      onBlur={handleQuickNotesSave}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleQuickNotesSave()
                        } else if (e.key === 'Escape') {
                          setIsQuickEditingNotes(false)
                        }
                      }}
                      autoFocus
                      rows={3}
                      className="input w-full"
                      placeholder="Internal notes..."
                    />
                  ) : (
                    <textarea
                      value={client.notes || 'No notes added'}
                      readOnly
                      rows={3}
                      className="input w-full bg-slate-50 cursor-pointer pointer-events-none"
                    />
                  )}
                </div>
              </div>
            </div>
          )}

                      {/* Communication History Section */}
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-slate-900">Communication History</h3>
                        <span className="text-sm text-slate-500">
                          {communications.length} record{communications.length !== 1 ? 's' : ''}
                        </span>
                      </div>
          
                      {loading ? (
                        <div className="text-center py-8">
                          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                          <p className="mt-2 text-slate-500">Loading communication history...</p>
                        </div>
                      ) : error ? (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <p className="text-red-700">Error loading communications: {error}</p>
                          <button
                            onClick={fetchCommunications}
                            className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
                          >
                            Try again
                          </button>
                        </div>
                      ) : communications.length === 0 ? (
                        <div className="text-center py-8 bg-slate-50 rounded-lg border border-slate-200">
                          <svg className="w-12 h-12 text-slate-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <p className="text-slate-700 font-medium">No communication records found</p>
                          <p className="text-slate-500 mt-1">Start a conversation with this client using the form below</p>
                        </div>
                      ) : (
                        <div className="space-y-4 mb-8">
                          {communications.map((comm) => (
                            <div key={comm.id} className={`bg-slate-50 p-4 rounded-lg border ${communicationEditingId === comm.id ? 'border-primary-500 ring-1 ring-primary-500' : 'border-slate-200'}`}>
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center space-x-2">
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${
                                    comm.type === 'email' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                                  }`}>
                                    {comm.type}
                                  </span>
                                  <span className="text-sm text-slate-500">
                                    {formatDateTime(comm.date)}
                                  </span>
                                </div>
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => handleEditCommunication(comm)}
                                    className="text-slate-400 hover:text-primary-600 transition-colors"
                                    title="Edit"
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteCommunication(comm.id)}
                                    className="text-slate-400 hover:text-red-600 transition-colors"
                                    title="Delete"
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                              <p className="text-slate-700 whitespace-pre-wrap">{comm.notes || 'No notes provided'}</p>
                            </div>
                          ))}
                        </div>
                      )}
          
                      {/* Add Communication Form */}
                      <div className="mt-8 pt-8 border-t border-slate-200">
                        <div className="mb-4 flex justify-between items-center">
                          <h3 className="text-lg font-semibold text-slate-900">
                            {communicationEditingId ? 'Edit Communication' : 'Add New Communication'}
                          </h3>
                          {communicationEditingId && (
                            <button
                              onClick={handleCancelEditCommunication}
                              className="text-xs text-red-600 hover:text-red-800 font-medium"
                            >
                              Cancel Edit
                            </button>
                          )}
                        </div>
                        <form onSubmit={handleAddCommunication} className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                              <div className="flex gap-4 p-2 border border-slate-200 rounded-lg">
                                <label className="flex items-center">
                                  <input
                                    type="radio"
                                    name="type"
                                    value="email"
                                    checked={newType === 'email'}
                                    onChange={(e) => setNewType(e.target.value as CommunicationType)}
                                    className="mr-2 text-primary-600 focus:ring-primary-500"
                                  />
                                  <span className="text-sm">Email</span>
                                </label>
                                <label className="flex items-center">
                                  <input
                                    type="radio"
                                    name="type"
                                    value="phone"
                                    checked={newType === 'phone'}
                                    onChange={(e) => setNewType(e.target.value as CommunicationType)}
                                    className="mr-2 text-primary-600 focus:ring-primary-500"
                                  />
                                  <span className="text-sm">Phone Call</span>
                                </label>
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Date & Time</label>
                              <input
                                type="datetime-local"
                                value={newDate}
                                onChange={(e) => setNewDate(e.target.value)}
                                className="input w-full"
                                required
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                            <textarea
                              value={newNote}
                              onChange={(e) => setNewNote(e.target.value)}
                              placeholder="Enter notes about the communication..."
                              className="input w-full h-24"
                              required
                            />
                          </div>
                          <div className="flex justify-end gap-3">
                            {communicationEditingId && (
                              <button
                                type="button"
                                onClick={handleCancelEditCommunication}
                                className="btn-secondary"
                              >
                                Cancel
                              </button>
                            )}
                            <button
                              type="submit"
                              disabled={submittingCommunication || !newNote.trim()}
                              className="btn-primary"
                            >
                              {submittingCommunication ? 'Saving...' : (communicationEditingId ? 'Update Communication' : 'Add Communication')}
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>        </div>

        <div className="p-6 border-t border-slate-200 bg-slate-50 rounded-b-lg flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleDeleteClient}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Delete Client
            </button>
          </div>
          <div className="flex space-x-2">
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