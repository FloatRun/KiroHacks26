import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { invokeParser } from './parser.js'
import { retrieveFromKnowledgeBase } from './retrieval.js'
import { invokeFormatter } from './formatter.js'
import { findNearbyFacilities } from './places.js'
import { getPlacesApiKey } from './ssm.js'
import type { TriageRequest, ApiResponse, ErrorResponse } from './types/api.js'

const SIMILARITY_THRESHOLD = Number.parseFloat(process.env.SIMILARITY_THRESHOLD || '0.5')
const CLOUDFRONT_ORIGIN = process.env.CLOUDFRONT_ORIGIN || '*'

/**
 * CORS headers for all responses.
 */
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': CLOUDFRONT_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  }
}

/**
 * Error response helper.
 */
function errorResponse(
  statusCode: number,
  error: ErrorResponse['error'],
  message?: string,
): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: corsHeaders(),
    body: JSON.stringify({ error, ...(message ? { message } : {}) }),
  }
}

/**
 * Success response helper.
 */
function successResponse(body: ApiResponse): APIGatewayProxyResultV2 {
  return {
    statusCode: 200,
    headers: corsHeaders(),
    body: JSON.stringify(body),
  }
}

/**
 * Lambda handler — orchestrates the full triage pipeline.
 *
 * Pipeline:
 *   1. Parse + validate request
 *   2. Read Places API key from SSM (cached after cold start)
 *   3. Stage 1: Parser (retrieve or clarify)
 *   4. If clarify → return clarification response immediately
 *   5. Stage 2: KB Retrieval
 *   6. Similarity threshold gate
 *   7. Stage 3: Formatter
 *   8. Log reasoning (never returned to client)
 *   9. If outOfScope → return out-of-scope response
 *  10. Service finder (non-blocking, degrades gracefully)
 *  11. Return triage response
 */
export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  // Handle OPTIONS preflight
  if (event.requestContext.http.method === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders(),
      body: '',
    }
  }

  // 1. Parse and validate request body
  let request: TriageRequest
  try {
    if (!event.body) {
      return errorResponse(400, 'invalid_request', 'Request body is required')
    }
    request = JSON.parse(event.body)
  } catch {
    return errorResponse(400, 'invalid_request', 'Invalid JSON')
  }

  if (!request.query || typeof request.query !== 'string' || request.query.trim().length === 0) {
    return errorResponse(400, 'invalid_request', 'query is required')
  }

  if (request.query.length > 500) {
    return errorResponse(400, 'invalid_request', 'query must be 500 characters or fewer')
  }

  // 2. Read Places API key from SSM (cached in module scope after cold start)
  let placesApiKey: string
  try {
    placesApiKey = await getPlacesApiKey()
  } catch (err) {
    console.error('SSM error:', err)
    // Non-blocking — continue without Places support
    placesApiKey = ''
  }

  // 3. Stage 1: Parser
  let parserResult
  try {
    parserResult = await invokeParser(request.query, request.language || 'en')
  } catch (err) {
    console.error('Parser error:', err)
    return errorResponse(503, 'parser_unavailable')
  }

  // 4. Clarification short-circuit
  if (parserResult.action === 'clarify') {
    return successResponse({
      type: 'clarification',
      question: parserResult.clarificationQuestion,
      reason: parserResult.clarificationReason,
    })
  }

  // 5. Stage 2: Knowledge Base Retrieval
  let chunks
  try {
    chunks = await retrieveFromKnowledgeBase(parserResult.normalizedQuery)
  } catch (err) {
    console.error('Retrieval error:', err)
    return errorResponse(503, 'retrieval_unavailable')
  }

  // 6. Similarity threshold gate
  const maxScore = chunks.length > 0 ? Math.max(...chunks.map((c) => c.score)) : 0
  if (maxScore < SIMILARITY_THRESHOLD) {
    console.log(`Out-of-scope: max similarity ${maxScore} < ${SIMILARITY_THRESHOLD}`)
    return successResponse({
      type: 'triage',
      severity: 'self_care',
      steps: [],
      careTier: 'self_care',
      outOfScope: true,
    })
  }

  // 7. Stage 3: Formatter
  let formatterResult
  try {
    formatterResult = await invokeFormatter(chunks, parserResult.extractedContext, request.language || 'en')
  } catch (err) {
    console.error('Formatter error:', err)
    return errorResponse(503, 'triage_unavailable')
  }

  // 8. Log reasoning (never returned to client)
  console.log(
    JSON.stringify({
      reasoning: formatterResult.reasoning,
      query: request.query,
      normalizedQuery: parserResult.normalizedQuery,
      maxScore,
    }),
  )

  // 9. Out-of-scope from formatter
  if (formatterResult.outOfScope) {
    return successResponse({
      type: 'triage',
      severity: formatterResult.severity,
      steps: formatterResult.steps,
      careTier: formatterResult.careTier,
      outOfScope: true,
    })
  }

  // 10. Service finder (non-blocking)
  let facilities: Facility[] = []
  if (formatterResult.careTier !== 'self_care' && request.location && placesApiKey) {
    try {
      facilities = await findNearbyFacilities(
        formatterResult.careTier,
        request.location,
        placesApiKey,
      )
    } catch (err) {
      console.error('Places API error:', err)
      // Degrade gracefully — triage still returned
    }
  }

  // 11. Return triage response
  return successResponse({
    type: 'triage',
    severity: formatterResult.severity,
    steps: formatterResult.steps,
    careTier: formatterResult.careTier,
    outOfScope: false,
    ...(facilities.length > 0 ? { facilities } : {}),
  })
}
