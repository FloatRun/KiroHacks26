import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import type { TriageRequest } from './types/api.js'
import { getPlacesApiKey } from './ssm.js'
import { invokeParser } from './parser.js'
import { retrieveFromKnowledgeBase } from './retrieval.js'
import { invokeFormatter } from './formatter.js'
import { findNearbyFacilities } from './places.js'

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

const SIMILARITY_THRESHOLD = parseFloat(process.env.SIMILARITY_THRESHOLD ?? '0.5')

export async function handler(
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> {
  // Handle CORS preflight
  if (event.requestContext?.http?.method === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' }
  }

  // ── 1. Parse and validate request body ──
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

  // ── 2. Read Places API key (cached after cold start) ──
  let apiKey: string | undefined
  try {
    apiKey = await getPlacesApiKey()
  } catch (err) {
    console.error('SSM getPlacesApiKey failed (non-fatal):', err)
  }

  // ── 3. Stage 1: Parser ──
  let parserResult
  try {
    parserResult = await invokeParser(query)
  } catch (err) {
    console.error('Parser invocation failed:', err)
    return respond(503, { error: 'parser_unavailable' })
  }

  // Clarification short-circuit — return immediately, skip KB and formatter
  if (parserResult.action === 'clarify') {
    return respond(200, {
      type: 'clarification',
      question: parserResult.clarificationQuestion,
      reason: parserResult.clarificationReason,
    })
  }

  // ── 4. Stage 2: Knowledge Base Retrieval ──
  let retrievalResult
  try {
    retrievalResult = await retrieveFromKnowledgeBase(parserResult.normalizedQuery)
  } catch (err) {
    console.error('KB retrieval failed:', err)
    return respond(503, { error: 'retrieval_unavailable' })
  }

  // Similarity threshold gate — out-of-scope if no chunk scores high enough
  if (retrievalResult.maxScore < SIMILARITY_THRESHOLD) {
    return respond(200, {
      type: 'triage',
      severity: 'self_care',
      steps: [],
      careTier: 'self_care',
      outOfScope: true,
    })
  }

  // ── 5. Stage 3: Formatter ──
  let formatterResult
  try {
    formatterResult = await invokeFormatter(
      retrievalResult.chunks,
      parserResult.extractedContext,
    )
  } catch (err) {
    console.error('Formatter invocation failed:', err)
    return respond(503, { error: 'triage_unavailable' })
  }

  // Log reasoning to CloudWatch — never returned to client
  console.log('Triage reasoning:', formatterResult.reasoning)

  // Formatter out-of-scope gate
  if (formatterResult.outOfScope) {
    return respond(200, {
      type: 'triage',
      severity: formatterResult.severity,
      steps: formatterResult.steps,
      careTier: formatterResult.careTier,
      outOfScope: true,
    })
  }

  // ── 6. Facility finder (conditional) ──
  let facilities: import('./types/api.js').Facility[] = []
  if (formatterResult.careTier !== 'self_care' && location && apiKey) {
    try {
      facilities = await findNearbyFacilities(formatterResult.careTier, location, apiKey)
    } catch (err) {
      console.error('Places API failed (non-fatal):', err)
      // Continue with empty facilities
    }
  }

  // ── 7. Return triage response ──
  return respond(200, {
    type: 'triage',
    severity: formatterResult.severity,
    steps: formatterResult.steps,
    careTier: formatterResult.careTier,
    outOfScope: false,
    ...(facilities.length > 0 ? { facilities } : {}),
  })
}
