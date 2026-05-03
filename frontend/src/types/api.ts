// Shared TypeScript types — source of truth for all API shapes.
// Keep in sync with backend/src/types/api.ts.

export type Severity = 'self_care' | 'urgent_care' | 'emergency'

export type ClarificationReason =
  | 'too_vague'
  | 'missing_severity'
  | 'missing_subject'
  | 'non_medical'
  | 'ambiguous_scenario'

export interface TriageRequest {
  query: string
  language?: 'en' | 'es'
  location?: {
    lat: number
    lng: number
  }
}

export interface Facility {
  name: string
  address: string
  distanceMeters: number
  openNow: boolean
  lat: number
  lng: number
  placeId: string
}

export interface TriageResponse {
  type: 'triage'
  severity: Severity
  steps: string[]
  careTier: Severity
  outOfScope: boolean
  facilities?: Facility[]
}

export interface ClarificationResponse {
  type: 'clarification'
  question: string
  reason: ClarificationReason
}

export interface ErrorResponse {
  error:
    | 'parser_unavailable'
    | 'retrieval_unavailable'
    | 'triage_unavailable'
    | 'invalid_request'
  message?: string
}

export type ApiResponse = TriageResponse | ClarificationResponse
