"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/handler.ts
var handler_exports = {};
__export(handler_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(handler_exports);

// src/parser.ts
var import_client_bedrock_runtime = require("@aws-sdk/client-bedrock-runtime");
var client = new import_client_bedrock_runtime.BedrockRuntimeClient({ region: process.env.AWS_REGION });
var MODEL_ID = process.env.CLAUDE_MODEL_ID || "us.anthropic.claude-sonnet-4-20250514-v1:0";
var PARSER_SYSTEM_PROMPT = `You are a medical triage input parser. Your only job is to call the parse_user_input tool.

Rules:
- Default to action "retrieve" when the scenario and at least one severity signal are reasonably inferable from the input.
- A short but clear input ("kid burned hand on stove") is sufficient to retrieve. Do not ask for clarification on clear inputs.
- Use action "clarify" only when: the input is non-medical, the scenario cannot be guessed, severity signals are entirely absent AND the answer depends on severity, or the subject is unclear in a way that materially affects triage.
- Clarification questions must be a single sentence, under 15 words, asking only for the single most diagnostically important missing piece of information.
- Bias toward retrieve. When in doubt, retrieve.
- Never produce prose. Only call the tool.`;
var PARSE_USER_INPUT_TOOL = {
  name: "parse_user_input",
  description: "Parse the user's described situation into either a normalized retrieval query or a clarification request.",
  input_schema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["retrieve", "clarify"]
      },
      normalizedQuery: {
        type: "string",
        description: "A concise, retrieval-optimized phrasing of the user's situation. Required when action === 'retrieve'."
      },
      extractedContext: {
        type: "object",
        description: "Structured context extracted from input. Required when action === 'retrieve'.",
        properties: {
          scenario: {
            type: "string",
            description: "Primary scenario tag, e.g., 'burn', 'cut', 'allergic_reaction'"
          },
          severity_signals: {
            type: "array",
            items: { type: "string" },
            description: "Phrases indicating severity"
          },
          subject: {
            type: "string",
            description: "Who the situation is about, e.g., 'self', 'child', 'adult'"
          }
        }
      },
      clarificationQuestion: {
        type: "string",
        description: "A single short question to ask the user. Required when action === 'clarify'. Maximum 15 words."
      },
      clarificationReason: {
        type: "string",
        enum: [
          "too_vague",
          "missing_severity",
          "missing_subject",
          "non_medical",
          "ambiguous_scenario"
        ],
        description: "Why clarification is needed. Required when action === 'clarify'."
      }
    },
    required: ["action"]
  }
};
async function invokeParser(query) {
  const payload = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 1024,
    system: PARSER_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: query
      }
    ],
    tools: [PARSE_USER_INPUT_TOOL],
    tool_choice: { type: "tool", name: "parse_user_input" }
  };
  const command = new import_client_bedrock_runtime.InvokeModelCommand({
    modelId: MODEL_ID,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(payload)
  });
  const response = await client.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  const toolUse = responseBody.content?.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.name !== "parse_user_input") {
    throw new Error("Parser did not return expected tool use");
  }
  return toolUse.input;
}

// src/retrieval.ts
var import_client_bedrock_agent_runtime = require("@aws-sdk/client-bedrock-agent-runtime");
var client2 = new import_client_bedrock_agent_runtime.BedrockAgentRuntimeClient({ region: process.env.AWS_REGION });
var KNOWLEDGE_BASE_ID = process.env.KNOWLEDGE_BASE_ID;
var TOP_K = 5;
async function retrieveFromKnowledgeBase(normalizedQuery) {
  const command = new import_client_bedrock_agent_runtime.RetrieveCommand({
    knowledgeBaseId: KNOWLEDGE_BASE_ID,
    retrievalQuery: {
      text: normalizedQuery
    },
    retrievalConfiguration: {
      vectorSearchConfiguration: {
        numberOfResults: TOP_K
      }
    }
  });
  const response = await client2.send(command);
  if (!response.retrievalResults || response.retrievalResults.length === 0) {
    return [];
  }
  return response.retrievalResults.map((result) => ({
    text: result.content?.text || "",
    score: result.score || 0
  }));
}

// src/formatter.ts
var import_client_bedrock_runtime2 = require("@aws-sdk/client-bedrock-runtime");
var client3 = new import_client_bedrock_runtime2.BedrockRuntimeClient({ region: process.env.AWS_REGION });
var MODEL_ID2 = process.env.CLAUDE_MODEL_ID || "us.anthropic.claude-sonnet-4-20250514-v1:0";
var FORMATTER_SYSTEM_PROMPT = `You are a medical triage formatter. Your only job is to call the submit_triage tool.

Rules:
- Answer ONLY from the provided retrieval context. Do not use your general medical knowledge.
- Each step must be under 120 characters, written in clear imperative voice, with no medical jargon.
- Produce exactly 3 to 5 steps. Distill the protocol \u2014 do not enumerate every sub-step.
- If the retrieval context is thin, ambiguous, or does not clearly address the scenario, set outOfScope to true.
- Bias toward over-escalation on severity. When uncertain between urgent_care and emergency, choose emergency.
- Never produce prose. Only call the tool.`;
var SUBMIT_TRIAGE_TOOL = {
  name: "submit_triage",
  description: "Submit the final triage card based strictly on the retrieved medical protocol context.",
  input_schema: {
    type: "object",
    properties: {
      severity: {
        type: "string",
        enum: ["self_care", "urgent_care", "emergency"]
      },
      steps: {
        type: "array",
        items: { type: "string", maxLength: 120 },
        minItems: 3,
        maxItems: 5,
        description: "Numbered first aid steps, each under 120 characters, written in clear imperative voice for a panicked layperson."
      },
      careTier: {
        type: "string",
        enum: ["self_care", "urgent_care", "emergency"]
      },
      reasoning: {
        type: "string",
        description: "Brief internal rationale for severity assignment. Logged server-side only."
      },
      outOfScope: {
        type: "boolean"
      }
    },
    required: ["severity", "steps", "careTier", "reasoning", "outOfScope"]
  }
};
async function invokeFormatter(chunks, extractedContext) {
  const contextText = chunks.map((chunk, i) => `[Chunk ${i + 1}, score ${chunk.score.toFixed(2)}]
${chunk.text}`).join("\n\n---\n\n");
  const userMessage = `Retrieved medical protocol context:

${contextText}

Extracted context from user query:
Scenario: ${extractedContext.scenario}
Severity signals: ${extractedContext.severity_signals.join(", ")}
Subject: ${extractedContext.subject}

Provide triage guidance based strictly on the retrieved context above.`;
  const payload = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 2048,
    system: FORMATTER_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: userMessage
      }
    ],
    tools: [SUBMIT_TRIAGE_TOOL],
    tool_choice: { type: "tool", name: "submit_triage" }
  };
  const command = new import_client_bedrock_runtime2.InvokeModelCommand({
    modelId: MODEL_ID2,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(payload)
  });
  const response = await client3.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  const toolUse = responseBody.content?.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.name !== "submit_triage") {
    throw new Error("Formatter did not return expected tool use");
  }
  return toolUse.input;
}

// src/places.ts
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371e3;
  const \u03C61 = lat1 * Math.PI / 180;
  const \u03C62 = lat2 * Math.PI / 180;
  const \u0394\u03C6 = (lat2 - lat1) * Math.PI / 180;
  const \u0394\u03BB = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(\u0394\u03C6 / 2) * Math.sin(\u0394\u03C6 / 2) + Math.cos(\u03C61) * Math.cos(\u03C62) * Math.sin(\u0394\u03BB / 2) * Math.sin(\u0394\u03BB / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
async function findNearbyFacilities(careTier, location, apiKey) {
  if (careTier === "self_care") {
    return [];
  }
  const isEmergency = careTier === "emergency";
  const radius = isEmergency ? 15e3 : 1e4;
  const params = new URLSearchParams({
    location: `${location.lat},${location.lng}`,
    radius: radius.toString(),
    key: apiKey
  });
  if (isEmergency) {
    params.append("type", "hospital");
  } else {
    params.append("keyword", "urgent care");
  }
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Places API error: ${response.status}`);
  }
  const data = await response.json();
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(`Places API status: ${data.status}`);
  }
  if (!data.results || data.results.length === 0) {
    return [];
  }
  const facilities = data.results.filter((place) => place.opening_hours?.open_now !== false).map((place) => ({
    name: place.name,
    address: place.vicinity,
    distanceMeters: Math.round(
      haversineDistance(
        location.lat,
        location.lng,
        place.geometry.location.lat,
        place.geometry.location.lng
      )
    ),
    openNow: place.opening_hours?.open_now ?? true,
    lat: place.geometry.location.lat,
    lng: place.geometry.location.lng,
    placeId: place.place_id
  })).sort((a, b) => a.distanceMeters - b.distanceMeters).slice(0, 5);
  return facilities;
}

// src/ssm.ts
var import_client_ssm = require("@aws-sdk/client-ssm");
var client4 = new import_client_ssm.SSMClient({ region: process.env.AWS_REGION });
var PLACES_API_KEY_PARAM = process.env.PLACES_API_KEY_PARAM || "/firstaid-ai/places-api-key";
var cachedApiKey = null;
async function getPlacesApiKey() {
  if (cachedApiKey) {
    return cachedApiKey;
  }
  const command = new import_client_ssm.GetParameterCommand({
    Name: PLACES_API_KEY_PARAM,
    WithDecryption: true
  });
  const response = await client4.send(command);
  if (!response.Parameter?.Value) {
    throw new Error("Places API key not found in SSM");
  }
  cachedApiKey = response.Parameter.Value;
  return cachedApiKey;
}

// src/handler.ts
var SIMILARITY_THRESHOLD = parseFloat(process.env.SIMILARITY_THRESHOLD || "0.5");
var CLOUDFRONT_ORIGIN = process.env.CLOUDFRONT_ORIGIN || "*";
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": CLOUDFRONT_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };
}
function errorResponse(statusCode, error, message) {
  return {
    statusCode,
    headers: corsHeaders(),
    body: JSON.stringify({ error, ...message ? { message } : {} })
  };
}
function successResponse(body) {
  return {
    statusCode: 200,
    headers: corsHeaders(),
    body: JSON.stringify(body)
  };
}
async function handler(event) {
  if (event.requestContext.http.method === "OPTIONS") {
    return {
      statusCode: 204,
      headers: corsHeaders(),
      body: ""
    };
  }
  let request;
  try {
    if (!event.body) {
      return errorResponse(400, "invalid_request", "Request body is required");
    }
    request = JSON.parse(event.body);
  } catch {
    return errorResponse(400, "invalid_request", "Invalid JSON");
  }
  if (!request.query || typeof request.query !== "string" || request.query.trim().length === 0) {
    return errorResponse(400, "invalid_request", "query is required");
  }
  if (request.query.length > 500) {
    return errorResponse(400, "invalid_request", "query must be 500 characters or fewer");
  }
  let placesApiKey;
  try {
    placesApiKey = await getPlacesApiKey();
  } catch (err) {
    console.error("SSM error:", err);
    placesApiKey = "";
  }
  let parserResult;
  try {
    parserResult = await invokeParser(request.query);
  } catch (err) {
    console.error("Parser error:", err);
    return errorResponse(503, "parser_unavailable");
  }
  if (parserResult.action === "clarify") {
    return successResponse({
      type: "clarification",
      question: parserResult.clarificationQuestion,
      reason: parserResult.clarificationReason
    });
  }
  let chunks;
  try {
    chunks = await retrieveFromKnowledgeBase(parserResult.normalizedQuery);
  } catch (err) {
    console.error("Retrieval error:", err);
    return errorResponse(503, "retrieval_unavailable");
  }
  const maxScore = chunks.length > 0 ? Math.max(...chunks.map((c) => c.score)) : 0;
  if (maxScore < SIMILARITY_THRESHOLD) {
    console.log(`Out-of-scope: max similarity ${maxScore} < ${SIMILARITY_THRESHOLD}`);
    return successResponse({
      type: "triage",
      severity: "self_care",
      steps: [],
      careTier: "self_care",
      outOfScope: true
    });
  }
  let formatterResult;
  try {
    formatterResult = await invokeFormatter(chunks, parserResult.extractedContext);
  } catch (err) {
    console.error("Formatter error:", err);
    return errorResponse(503, "triage_unavailable");
  }
  console.log(
    JSON.stringify({
      reasoning: formatterResult.reasoning,
      query: request.query,
      normalizedQuery: parserResult.normalizedQuery,
      maxScore
    })
  );
  if (formatterResult.outOfScope) {
    return successResponse({
      type: "triage",
      severity: formatterResult.severity,
      steps: formatterResult.steps,
      careTier: formatterResult.careTier,
      outOfScope: true
    });
  }
  let facilities = [];
  if (formatterResult.careTier !== "self_care" && request.location && placesApiKey) {
    try {
      facilities = await findNearbyFacilities(
        formatterResult.careTier,
        request.location,
        placesApiKey
      );
    } catch (err) {
      console.error("Places API error:", err);
    }
  }
  return successResponse({
    type: "triage",
    severity: formatterResult.severity,
    steps: formatterResult.steps,
    careTier: formatterResult.careTier,
    outOfScope: false,
    ...facilities.length > 0 ? { facilities } : {}
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
