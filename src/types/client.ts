export interface Client {
  id: number
  first_name: string
  last_name: string
  email: string
  title: string | null
  location: string | null
  experience: string | null
  company_id: number | null
  company_name?: string | null  // Joined from company table
  created_at: string
  updated_at: string
  last_communication_date?: string | null  // Latest communication date
  verified: boolean
  linkedin?: string | null
  active_status: 'Active' | 'Inactive'
  notes?: string | null
}

export interface CreateClientRequest {
  first_name: string
  last_name: string
  email: string
  title?: string
  location?: string
  experience?: string
  company_id?: number
  verified?: boolean
  linkedin?: string
  active_status?: 'Active' | 'Inactive'
  notes?: string
}

export interface ClientSearchParams {
  q?: string
  page?: number
  limit?: number
  company_id?: number
  has_communication?: 'true' | 'false' | 'any'
  communication_start_date?: string
  communication_end_date?: string
  name_status?: 'full_name' | 'partial_name' | 'any'
  verified?: 'true' | 'false' | 'any'
  active_status?: 'Active' | 'Inactive' | 'any'
}