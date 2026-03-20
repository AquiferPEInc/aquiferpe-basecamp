export interface Company {
  id: number
  company_name: string
  size: number | null
  overview: string | null
  specialties: string | null
  website: string | null
  industry: string | null
  email: string | null
  phone: string | null
  linkedin: string | null
  acec_chapter: string | null
  street: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  client_count: number
  created_at: string
  updated_at: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface CompanySearchParams {
  q?: string
  page?: number
  limit?: number
}

export interface CreateCompanyRequest {
  company_name: string
  size?: number
  overview?: string
  specialties?: string
  website?: string
  industry?: string
  email?: string
  phone?: string
  linkedin?: string
  acec_chapter?: string
  street?: string
  city?: string
  state?: string
  zip_code?: string
}