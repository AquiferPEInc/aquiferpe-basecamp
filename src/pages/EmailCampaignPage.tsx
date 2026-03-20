import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLocation } from 'react-router-dom'
import { Client } from '../types'
import { supabase } from '../lib/supabase'
interface Campaign {
  id: number
  name: string
  reference_id: string
  description: string | null
  spreadsheet_id: string
  spreadsheet_url: string
  created_at: string
  updated_at: string
}

interface CampaignCreationResult {
  message: string;
  sheetId: string;
  sheetUrl: string;
  prospectsCount: number;
}

const generateReferenceId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export default function EmailCampaignPage() {
  const { session } = useAuth()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState<'generator' | 'view'>('generator')
  
  // Generator state
  const [campaignName, setCampaignName] = useState('')
  const [campaignReferenceId, setCampaignReferenceId] = useState(generateReferenceId())
  const [campaignDescription, setCampaignDescription] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preSelectedClients, setPreSelectedClients] = useState<Client[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [creationResult, setCreationResult] = useState<CampaignCreationResult | null>(null)
  const [creationError, setCreationError] = useState<string | null>(null)
  
  // View Campaigns State
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    if (activeTab === 'view') {
      fetchCampaigns()
    }
  }, [activeTab])

  useEffect(() => {
    if (location.state?.selectedClients) {
      setPreSelectedClients(location.state.selectedClients)
      setActiveTab('generator')
      // Clean up history state so refresh doesn't re-trigger if not desired, 
      // though typically harmless. We'll leave it to allow reload to persist selection if browser allows.
    }
  }, [location.state])

  const fetchCampaigns = async () => {
    setIsLoadingCampaigns(true)
    setFetchError(null)
    try {
      const { data, error } = await supabase
        .from('campaign')
        .select('*')
        .order('updated_at', { ascending: false })
      
      if (error) throw error
      
      setCampaigns(data || [])
    } catch (err: any) {
      console.error('Full error object (fetchCampaigns):', err)
      const errorDetails = err.details || err.error || err.message || 'An unknown error occurred.'
      setFetchError(`Failed to fetch campaigns: ${errorDetails}`)
    } finally {
      setIsLoadingCampaigns(false)
    }
  }

  const generateCSV = (clients: Client[]): string => {
    const headers = ['first_name', 'last_name', 'email']
    const csvContent = [
      headers.join(','),
      ...clients.map(client => 
        [client.first_name, client.last_name, client.email].map(field => `"${(field || '').replace(/"/g, '""')}"`).join(',')
      )
    ].join('\n')
    return csvContent
  }

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!campaignName || (!selectedFile && preSelectedClients.length === 0)) {
      setCreationError('Campaign name and prospect list are required.')
      return
    }

    setIsCreating(true)
    setCreationError(null)
    setCreationResult(null)

    let csvData = ''
    if (selectedFile) {
      csvData = await selectedFile.text()
    } else if (preSelectedClients.length > 0) {
      csvData = generateCSV(preSelectedClients)
    }

    try {
      const response = await fetch(`/api/campaigns`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          campaignName,
          campaignReferenceId,
          campaignDescription,
          csvData
        }),
      })
      const result = await response.json()

      if (!response.ok) {
        console.error('API Error Response (handleCreateCampaign):', result)
        throw result
      }

      setCreationResult(result)
      setCampaignName('')
      setCampaignReferenceId(generateReferenceId())
      setCampaignDescription('')
      setSelectedFile(null)
      setPreSelectedClients([])
    } catch (err: any) {
      console.error('Full error object (handleCreateCampaign):', err)
      const errorDetails = err.details || err.error || err.message || 'An unknown error occurred.'
      
      if (typeof errorDetails === 'string' && errorDetails.includes('storage quota')) {
        setCreationError('Failed to create campaign. The Google Drive storage quota has been exceeded. Please free up space in your Google Drive and try again.')
      } else {
        setCreationError(`Failed to create campaign: ${errorDetails}`)
      }
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteCampaign = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this campaign? This will permanently delete the campaign record and the associated Google Sheet.')) {
      return
    }

    try {
      // Keep using the Express endpoint for DELETE because it also deletes the Google Sheet!
      const response = await fetch(`/api/campaigns/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete campaign')
      }

      // Refresh campaigns
      fetchCampaigns()
    } catch (error: any) {
      console.error('Error deleting campaign:', error)
      alert(`Failed to delete campaign: ${error.message}`)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Email Campaign Manager</h1>
        <p className="text-slate-600 mt-2">
          Create and manage email campaigns with unique tracking links
        </p>
      </div>

      <div className="border-b border-slate-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('generator')}
            className={`${
              activeTab === 'generator'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Email Campaign Generator
          </button>
          <button
            onClick={() => setActiveTab('view')}
            className={`${
              activeTab === 'view'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            View Campaigns
          </button>
        </nav>
      </div>

      {activeTab === 'generator' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="card">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Create New Campaign</h2>

            <form onSubmit={handleCreateCampaign} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Campaign Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g., Q1 2025 Investor Outreach"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Campaign Reference ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g., abc"
                  value={campaignReferenceId}
                  onChange={(e) => setCampaignReferenceId(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="input"
                  placeholder="Brief description of the campaign objectives..."
                  rows={3}
                  value={campaignDescription}
                  onChange={(e) => setCampaignDescription(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Prospect List <span className="text-red-500">*</span>
                </label>
                
                {preSelectedClients.length > 0 ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium text-blue-900">Selected Clients ({preSelectedClients.length})</h3>
                      <button 
                        type="button"
                        onClick={() => {
                            setPreSelectedClients([])
                            setSelectedFile(null)
                        }}
                        className="text-sm text-blue-700 hover:text-blue-900 underline"
                      >
                        Clear Selection
                      </button>
                    </div>
                    <p className="text-sm text-blue-700 mb-2">
                        These clients will be used to generate the campaign.
                    </p>
                    <div className="max-h-40 overflow-y-auto bg-white rounded border border-blue-100 p-2 text-sm text-slate-600">
                        {preSelectedClients.map(c => (
                            <div key={c.id} className="truncate border-b last:border-0 border-slate-100 py-1">
                                {c.first_name} {c.last_name} &lt;{c.email}&gt;
                            </div>
                        ))}
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-primary-500 transition-colors">
                    <svg className="w-12 h-12 text-slate-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-slate-700 font-medium mb-2">Drop your file here or click to browse</p>
                    <p className="text-sm text-slate-500 mb-4">
                      Supports CSV. Required columns: first_name, last_name, email.
                    </p>
                    <input
                      type="file"
                      className="hidden"
                      id="file-upload"
                      accept=".csv"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    />
                    <label htmlFor="file-upload" className="btn-secondary cursor-pointer">
                      Choose File
                    </label>
                    {selectedFile && (
                      <div className="mt-4 p-3 bg-primary-50 rounded-lg border border-primary-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <svg className="w-5 h-5 text-primary-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm font-medium text-slate-900">{selectedFile.name}</span>
                          </div>
                          <button
                            onClick={() => setSelectedFile(null)}
                            className="text-slate-500 hover:text-slate-700"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {(selectedFile.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>


              <div className="pt-4 border-t border-slate-200">
                <button 
                  type="submit"
                  className="btn-primary w-full py-3 disabled:bg-slate-300 disabled:cursor-not-allowed"
                  disabled={isCreating || !campaignName.trim() || !campaignReferenceId.trim() || !campaignDescription.trim() || (!selectedFile && preSelectedClients.length === 0)}
                >
                  {isCreating ? 'Creating Campaign...' : 'Generate Campaign'}
                </button>
              </div>
            </form>
            
            {creationError && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <p className="font-medium">Error creating campaign</p>
                <pre className="text-sm mt-1 whitespace-pre-wrap">{creationError}</pre>
              </div>
            )}

            {creationResult && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-medium text-green-800">Campaign Created Successfully!</h3>
                <p className="text-sm text-green-700 mt-1">
                  {creationResult.prospectsCount} prospects processed.
                </p>
                <a 
                  href={creationResult.sheetUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-primary-600 hover:text-primary-800 font-medium mt-2 inline-block"
                >
                  Open Google Sheet →
                </a>
              </div>
            )}

          </div>
          
          <div className="space-y-6">
            <div className="card">
              <h2 className="text-xl font-bold text-slate-900 mb-4">How It Works</h2>
              <ol className="space-y-4">
                <li className="flex items-start">
                  <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-bold mr-3 flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900">Set Campaign Name</h4>
                    <p className="text-sm text-slate-600">A campaign name should follow date + email template format + optional ID, i.e. 12302025_clientA1_1</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-bold mr-3 flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900">Upload prospect list</h4>
                    <p className="text-sm text-slate-600">Select and export prospects from the Client page and upload the CSV</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-bold mr-3 flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900">Create and Run Campaign</h4>
                    <p className="text-sm text-slate-600">Create the campaign. Go to "View Campaigns" tab to open Google Sheet and use MailMeteor to send emails</p>
                  </div>
                </li>
              </ol>
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-900">Campaigns</h2>
            <button 
              onClick={fetchCampaigns} 
              className="text-primary-600 hover:text-primary-800 text-sm font-medium flex items-center"
              disabled={isLoadingCampaigns}
            >
              <svg className={`w-4 h-4 mr-1 ${isLoadingCampaigns ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>

          {fetchError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <p className="font-medium">Error loading campaigns</p>
              <pre className="text-sm mt-1 whitespace-pre-wrap">{fetchError}</pre>
            </div>
          )}

          {isLoadingCampaigns ? (
            <div className="py-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <p className="mt-4 text-slate-600">Loading campaigns...</p>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200 border-dashed">
              <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-slate-900">No campaigns found</h3>
              <p className="mt-1 text-sm text-slate-500">
                Create a new campaign to get started.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-slate-700 font-medium">Campaign Name</th>
                    <th className="text-left py-3 px-4 text-slate-700 font-medium">Ref ID</th>
                    <th className="text-left py-3 px-4 text-slate-700 font-medium">Description</th>
                    <th className="text-left py-3 px-4 text-slate-700 font-medium">Google Sheet</th>
                    <th className="text-left py-3 px-4 text-slate-700 font-medium">Last Modified</th>
                    <th className="text-right py-3 px-4 text-slate-700 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((campaign) => (
                    <tr key={campaign.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{campaign.name}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-600 text-sm">{campaign.reference_id || '-'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-600 text-sm max-w-md truncate" title={campaign.description || ''}>
                          {campaign.description || '-'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <a 
                          href={campaign.spreadsheet_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:text-primary-800 text-sm font-medium hover:underline flex items-center"
                        >
                          <svg className="w-4 h-4 mr-1 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                             <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                          </svg>
                          Open Sheet
                        </a>
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-sm">
                        {formatDate(campaign.updated_at)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeleteCampaign(campaign.id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium hover:underline"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="mt-8 text-center text-slate-500 text-sm">
        <p>This is a placeholder page for the Email Campaign Generator application.</p>
        <p className="mt-1">Full functionality will be implemented in future development.</p>
      </div>
    </div>
  )
}