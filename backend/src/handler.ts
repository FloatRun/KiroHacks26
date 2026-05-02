import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import type { TriageRequest } from './types/api.js'
import { getPlacesApiKey } from './ssm.js'

/** CORS headers — CloudFront domain set via environment variable. */
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN ?? '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function respond(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
    body: JSON.stringify(body),
  }
}

export async function handler(
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> {
  // Handle CORS preflight
  if (event.requestContext?.http?.method === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' }
  }

  // ── Parse and validate request body ──
  let parsed: unknown
  try {
    parsed = JSON.parse(event.body ?? '{}')
  } catch {
    return respond(400, { error: 'invalid_request', message: 'Invalid JSON' })
  }

  const { query, location } = parsed as TriageRequest

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return respond(400, { error: 'invalid_request', message: 'query is required' })
  }
  if (query.length > 500) {
    return respond(400, {
      error: 'invalid_request',
      message: 'query must be 500 characters or fewer',
    })
  }
  if (location !== undefined) {
    if (
      typeof location !== 'object' ||
      typeof location.lat !== 'number' ||
      typeof location.lng !== 'number'
    ) {
      return respond(400, {
        error: 'invalid_request',
        message: 'location must have numeric lat and lng',
      })
    }
  }

  // ── Read Places API key (cached after cold start) ──
  let apiKey: string | undefined
  try {
    apiKey = await getPlacesApiKey()
  } catch (err) {
    console.error('SSM getPlacesApiKey failed (non-fatal):', err)
    // Non-fatal — Places lookup is optional. Pipeline continues without it.
  }

  // ── Mock response (task 1.12) ──
  // TODO: Replace with real pipeline (parser → KB retrieval → formatter → places)
  return respond(200, {
    type: 'triage',
    severity: 'urgent_care',
    steps: [
      'Cool the burn under cool running water for 20 minutes.',
      'Do not apply ice, butter, or any cream to the burn.',
      'Cover loosely with a clean non-fluffy material like cling film.',
    ],
    careTier: 'urgent_care',
    outOfScope: false,
  })
}
