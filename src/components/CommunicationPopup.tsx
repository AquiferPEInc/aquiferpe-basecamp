import React, { useState, useEffect } from 'react'
import { Client, Communication, CommunicationType } from '../types'
import { supabase } from '../lib/supabase'

interface CommunicationPopupProps {
  client: Client
  onClose: () => void
}

// Helper to get local date string for datetime-local input
const getLocalDateString = (dateInput?: string | Date) => {
  const date = dateInput ? new Date(dateInput) : new Date()
  const offset = date.getTimezoneOffset()
  const localDate = new Date(date.getTime() - (offset * 60 * 1000))
  return localDate.toISOString().slice(0, 16)
}

export default function CommunicationPopup({ client, onClose }: CommunicationPopupProps) {
  const [communications, setCommunications] = useState<Communication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Form State
  const [editingId, setEditingId] = useState<number | null>(null)
  const [newNote, setNewNote] = useState('')
  const [newType, setNewType] = useState<CommunicationType>('email')
  const [newDate, setNewDate] = useState(getLocalDateString())
  const [newReferenceId, setNewReferenceId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchCommunications = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('communication')
        .select('*')
        .eq('client_id', client.id)
        .order('date', { ascending: false })
        
      if (error) {
        throw error
      }
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

  const handleEdit = (comm: Communication) => {
    setEditingId(comm.id)
    setNewType(comm.type)
    setNewNote(comm.notes || '')
    setNewDate(getLocalDateString(comm.date))
    setNewReferenceId(comm.reference_id || '')
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setNewNote('')
    setNewType('email')
    setNewDate(getLocalDateString())
    setNewReferenceId('')
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this communication?')) return

    try {
      const { error } = await supabase
        .from('communication')
        .delete()
        .eq('id', id)

      if (error) {
        throw error
      }

      // If we were editing the deleted item, cancel edit
      if (editingId === id) {
        handleCancelEdit()
      }
      
      fetchCommunications()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNote.trim()) return

    setSubmitting(true)
    try {
      const payload = {
        type: newType,
        notes: newNote,
        date: new Date(newDate).toISOString(),
        reference_id: newReferenceId,
      }

      if (editingId) {
        const { error } = await supabase
          .from('communication')
          .update(payload)
          .eq('id', editingId)
          
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('communication')
          .insert([{ ...payload, client_id: client.id }])
          
        if (error) throw error
      }

      handleCancelEdit() // Resets form
      fetchCommunications()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Communication History</h2>
            <p className="text-slate-600">
              {client.first_name} {client.last_name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <p className="mt-2 text-slate-500">Loading history...</p>
            </div>
          ) : error ? (
            <div className="text-red-600 text-center py-8">{error}</div>
          ) : communications.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No communication records found.
            </div>
          ) : (
            <div className="space-y-4">
              {communications.map((comm) => (
                <div key={comm.id} className={`bg-white p-4 rounded-lg shadow-sm border ${editingId === comm.id ? 'border-primary-500 ring-1 ring-primary-500' : 'border-slate-200'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${
                        comm.type === 'email' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {comm.type}
                      </span>
                      <span className="text-sm text-slate-500">
                        {new Date(comm.date).toLocaleString()}
                      </span>
                      {comm.reference_id && (
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                          Ref: {comm.reference_id}
                        </span>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(comm)}
                        className="text-slate-400 hover:text-primary-600 transition-colors"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(comm.id)}
                        className="text-slate-400 hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <p className="text-slate-700 whitespace-pre-wrap">{comm.notes}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-200 bg-white rounded-b-lg">
          <div className="mb-4 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
              {editingId ? 'Edit Communication' : 'Add New Communication'}
            </h3>
            {editingId && (
              <button
                onClick={handleCancelEdit}
                className="text-xs text-red-600 hover:text-red-800 font-medium"
              >
                Cancel Edit
              </button>
            )}
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <label className="block text-sm font-medium text-slate-700 mb-1">Reference ID (Optional)</label>
              <input
                type="text"
                value={newReferenceId}
                onChange={(e) => setNewReferenceId(e.target.value)}
                placeholder="External reference ID (e.g. ticket #)"
                className="input w-full"
              />
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
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={submitting || !newNote.trim()}
                className="btn-primary"
              >
                {submitting ? 'Saving...' : (editingId ? 'Update Communication' : 'Add Communication')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}