export type CommunicationType = 'email' | 'phone'

export interface Communication {
  id: number
  client_id: number
  type: CommunicationType
  date: string
  notes: string | null
  reference_id: string | null
  created_at: string
  updated_at: string
}

export interface CreateCommunicationRequest {
  type: CommunicationType
  date: string
  notes?: string
  reference_id?: string
}
