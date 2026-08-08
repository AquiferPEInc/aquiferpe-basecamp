export interface Architect {
  id: string
  houzz_id: string | null
  business_name: string
  typical_job_cost: string | null
  phone_number: string | null
  license_number: string | null
  website: string | null
  number_of_followers: number
  address: string | null
  facebook_link: string | null
  linkedin_link: string | null
  number_of_reviews: number
  review_score: number
  status: string
  linkedin_connected?: string | null
  summary?: string | null
  created_at: string
  updated_at: string
}
