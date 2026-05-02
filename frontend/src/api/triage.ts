import type { ApiResponse, TriageRequest } from '../types/api'

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * POST /api/triage
 *
 * Submits a triage request and returns the parsed API response.
 * Throws ApiError on 4xx/5xx responses.
 */
export async function postTriage(request: TriageRequest): Promise<ApiResponse> {
  if (!request.query || request.query.trim().length === 0) {
    throw new ApiError(400, 'Query is required')
  }
  if (request.query.length > 500) {
    throw new ApiError(400, 'Query must be 500 characters or fewer')
  }

  let response: Response
  try {
    response = await fetch('/api/triage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })
  } catch {
    // Network failure (offline, DNS, etc.)
    throw new ApiError(0, 'Network error — check your connection')
  }

  if (response.status === 400) {
    const body = await response.json().catch(() => ({}))
    throw new ApiError(400, body.message ?? 'Invalid request')
  }

  if (response.status === 503) {
    const body = await response.json().catch(() => ({}))
    throw new ApiError(503, body.error ?? 'service_unavailable')
  }

  if (response.status === 504) {
    throw new ApiError(504, 'gateway_timeout')
  }

  if (!response.ok) {
    throw new ApiError(response.status, `Unexpected status ${response.status}`)
  }

  const data: ApiResponse = await response.json()
  return data
}
