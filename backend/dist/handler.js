// src/ssm.ts
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
var ssm = new SSMClient({});
var cachedApiKey;
async function getPlacesApiKey() {
  if (cachedApiKey) return cachedApiKey;
  const paramName = process.env.PLACES_API_KEY_PARAM ?? "/firstaid-ai/places-api-key";
  const result = await ssm.send(
    new GetParameterCommand({ Name: paramName, WithDecryption: true })
  );
  const value = result.Parameter?.Value;
  if (!value) throw new Error(`SSM parameter ${paramName} not found or empty`);
  cachedApiKey = value;
  return cachedApiKey;
}

// src/parser.ts
import {
  BedrockRuntimeClient,
  InvokeModelCommand
} from "@aws-sdk/client-bedrock-runtime";
var bedrock = new BedrockRuntimeClient({});
async function invokeParser(query) {
  const modelId = process.env.CLAUDE_MODEL_ID ?? "anthropic.claude-sonnet-4-20250514-v1:0";
  const tool = {
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
          enum: ["too_vague", "missing_severity", "missing_subject", "non_medical", "ambiguous_scenario"],
          description: "Why clarification is needed. Required when action === 'clarify'."
        }
      },
      required: ["action"]
    }
  };
  const systemPrompt = `You are a medical triage input parser. Your only job is to call the parse_user_input tool.

Rules:
- Default to action "retrieve" when the scenario and at least one severity signal are reasonably inferable from the input.
- A short but clear input ("kid burned hand on stove") is sufficient to retrieve. Do not ask for clarification on clear inputs.
- Use action "clarify" only when: the input is non-medical, the scenario cannot be guessed, severity signals are entirely absent AND the answer depends on severity, or the subject is unclear in a way that materially affects triage.
- Clarification questions must be a single sentence, under 15 words, asking only for the single most diagnostically important missing piece of information.
- Bias toward retrieve. When in doubt, retrieve.
- Never produce prose. Only call the tool.`;
  const body = JSON.stringify({
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: query }],
    tools: [tool],
    tool_choice: { type: "tool", name: "parse_user_input" }
  });
  const command = new InvokeModelCommand({
    modelId,
    contentType: "application/json",
    accept: "application/json",
    body: new TextEncoder().encode(body)
  });
  const response = await bedrock.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  const toolUse = responseBody.content?.find(
    (block) => block.type === "tool_use"
  );
  if (!toolUse?.input) {
    throw new Error("Parser did not return a tool_use block");
  }
  const input = toolUse.input;
  if (input.action === "clarify") {
    return {
      action: "clarify",
      clarificationQuestion: input.clarificationQuestion ?? "Can you describe what happened in more detail?",
      clarificationReason: input.clarificationReason ?? "too_vague"
    };
  }
  return {
    action: "retrieve",
    normalizedQuery: input.normalizedQuery ?? query,
    extractedContext: input.extractedContext ?? {}
  };
}

// src/retrieval.ts
import {
  BedrockAgentRuntimeClient,
  RetrieveCommand
} from "@aws-sdk/client-bedrock-agent-runtime";
var client = new BedrockAgentRuntimeClient({});
async function retrieveFromKnowledgeBase(normalizedQuery, topK = 5) {
  const knowledgeBaseId = process.env.KNOWLEDGE_BASE_ID;
  if (!knowledgeBaseId) {
    throw new Error("KNOWLEDGE_BASE_ID environment variable is not set");
  }
  const command = new RetrieveCommand({
    knowledgeBaseId,
    retrievalQuery: { text: normalizedQuery },
    retrievalConfiguration: {
      vectorSearchConfiguration: {
        numberOfResults: topK
      }
    }
  });
  const response = await client.send(command);
  const chunks = (response.retrievalResults ?? []).map((result) => ({
    text: result.content?.text ?? "",
    score: result.score ?? 0,
    sourceUri: result.location?.s3Location?.uri ?? result.location?.webLocation?.url ?? void 0
  }));
  const maxScore = chunks.length > 0 ? Math.max(...chunks.map((c) => c.score)) : 0;
  return { chunks, maxScore };
}

// src/formatter.ts
import {
  BedrockRuntimeClient as BedrockRuntimeClient2,
  InvokeModelCommand as InvokeModelCommand2
} from "@aws-sdk/client-bedrock-runtime";
var bedrock2 = new BedrockRuntimeClient2({});
async function invokeFormatter(chunks, extractedContext) {
  const modelId = process.env.CLAUDE_MODEL_ID ?? "anthropic.claude-sonnet-4-20250514-v1:0";
  const tool = {
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
  const systemPrompt = `You are a medical triage formatter. Your only job is to call the submit_triage tool.

Rules:
- Answer ONLY from the provided retrieval context. Do not use your general medical knowledge.
- Each step must be under 120 characters, written in clear imperative voice, with no medical jargon.
- Produce exactly 3 to 5 steps. Distill the protocol \u2014 do not enumerate every sub-step.
- If the retrieval context is thin, ambiguous, or does not clearly address the scenario, set outOfScope to true.
- Bias toward over-escalation on severity. When uncertain between urgent_care and emergency, choose emergency.
- Never produce prose. Only call the tool.`;
  const contextBlock = chunks.length > 0 ? chunks.map((c, i) => `[Source ${i + 1} (score: ${c.score.toFixed(3)})]:
${c.text}`).join("\n\n") : "(No retrieval context available)";
  const contextSummary = [
    extractedContext.scenario && `Scenario: ${extractedContext.scenario}`,
    extractedContext.subject && `Subject: ${extractedContext.subject}`,
    extractedContext.severity_signals?.length && `Severity signals: ${extractedContext.severity_signals.join(", ")}`
  ].filter(Boolean).join("\n");
  const userMessage = `Retrieved medical protocol context:

${contextBlock}

${contextSummary ? `Extracted context:
${contextSummary}` : ""}`;
  const body = JSON.stringify({
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
    tools: [tool],
    tool_choice: { type: "tool", name: "submit_triage" }
  });
  const command = new InvokeModelCommand2({
    modelId,
    contentType: "application/json",
    accept: "application/json",
    body: new TextEncoder().encode(body)
  });
  const response = await bedrock2.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  const toolUse = responseBody.content?.find(
    (block) => block.type === "tool_use"
  );
  if (!toolUse?.input) {
    throw new Error("Formatter did not return a tool_use block");
  }
  const input = toolUse.input;
  return {
    severity: input.severity ?? "emergency",
    steps: input.steps ?? [],
    careTier: input.careTier ?? "emergency",
    reasoning: input.reasoning ?? "",
    outOfScope: input.outOfScope ?? false
  };
}

// src/places.ts
function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371e3;
  const toRad = (deg) => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
async function findNearbyFacilities(careTier, location, apiKey) {
  const baseUrl = "https://maps.googleapis.com/maps/api/place/nearbysearch/json";
  const params = new URLSearchParams({
    location: `${location.lat},${location.lng}`,
    key: apiKey
  });
  if (careTier === "urgent_care") {
    params.set("keyword", "urgent care");
    params.set("radius", "10000");
  } else if (careTier === "emergency") {
    params.set("type", "hospital");
    params.set("radius", "15000");
  } else {
    return [];
  }
  const url = `${baseUrl}?${params.toString()}`;
  const response = await fetch(url);
  if (!response.ok) {
    console.error(`Places API HTTP error: ${response.status}`);
    return [];
  }
  const data = await response.json();
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    console.error(`Places API status: ${data.status}`);
    return [];
  }
  const facilities = data.results.map((place) => ({
    name: place.name,
    address: place.vicinity ?? "",
    distanceMeters: haversineMeters(
      location.lat,
      location.lng,
      place.geometry.location.lat,
      place.geometry.location.lng
    ),
    openNow: place.opening_hours?.open_now ?? false,
    lat: place.geometry.location.lat,
    lng: place.geometry.location.lng,
    placeId: place.place_id
  })).sort((a, b) => a.distanceMeters - b.distanceMeters).slice(0, 5);
  return facilities;
}

// src/handler.ts
var corsHeaders = {
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN ?? "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};
function respond(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", ...corsHeaders },
    body: JSON.stringify(body)
  };
}
var SIMILARITY_THRESHOLD = parseFloat(process.env.SIMILARITY_THRESHOLD ?? "0.5");
async function handler(event) {
  if (event.requestContext?.http?.method === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders, body: "" };
  }
  let parsed;
  try {
    parsed = JSON.parse(event.body ?? "{}");
  } catch {
    return respond(400, { error: "invalid_request", message: "Invalid JSON" });
  }
  const { query, location } = parsed;
  if (!query || typeof query !== "string" || query.trim().length === 0) {
    return respond(400, { error: "invalid_request", message: "query is required" });
  }
  if (query.length > 500) {
    return respond(400, {
      error: "invalid_request",
      message: "query must be 500 characters or fewer"
    });
  }
  if (location !== void 0 && location !== null) {
    if (typeof location !== "object" || typeof location.lat !== "number" || typeof location.lng !== "number" || !isFinite(location.lat) || !isFinite(location.lng) || location.lat < -90 || location.lat > 90 || location.lng < -180 || location.lng > 180) {
      return respond(400, {
        error: "invalid_request",
        message: "location must have numeric lat and lng"
      });
    }
  }
  let apiKey;
  try {
    apiKey = await getPlacesApiKey();
  } catch (err) {
    console.error("SSM getPlacesApiKey failed (non-fatal):", err);
  }
  let parserResult;
  try {
    parserResult = await invokeParser(query);
  } catch (err) {
    console.error("Parser invocation failed:", err);
    return respond(503, { error: "parser_unavailable" });
  }
  if (parserResult.action === "clarify") {
    return respond(200, {
      type: "clarification",
      question: parserResult.clarificationQuestion,
      reason: parserResult.clarificationReason
    });
  }
  let retrievalResult;
  try {
    retrievalResult = await retrieveFromKnowledgeBase(parserResult.normalizedQuery);
  } catch (err) {
    console.error("KB retrieval failed:", err);
    return respond(503, { error: "retrieval_unavailable" });
  }
  if (retrievalResult.maxScore < SIMILARITY_THRESHOLD) {
    return respond(200, {
      type: "triage",
      severity: "self_care",
      steps: [],
      careTier: "self_care",
      outOfScope: true
    });
  }
  let formatterResult;
  try {
    formatterResult = await invokeFormatter(
      retrievalResult.chunks,
      parserResult.extractedContext
    );
  } catch (err) {
    console.error("Formatter invocation failed:", err);
    return respond(503, { error: "triage_unavailable" });
  }
  console.log("Triage reasoning:", formatterResult.reasoning);
  if (formatterResult.outOfScope) {
    return respond(200, {
      type: "triage",
      severity: formatterResult.severity,
      steps: formatterResult.steps,
      careTier: formatterResult.careTier,
      outOfScope: true
    });
  }
  let facilities = [];
  if (formatterResult.careTier !== "self_care" && location && apiKey) {
    try {
      facilities = await findNearbyFacilities(formatterResult.careTier, location, apiKey);
    } catch (err) {
      console.error("Places API failed (non-fatal):", err);
    }
  }
  return respond(200, {
    type: "triage",
    severity: formatterResult.severity,
    steps: formatterResult.steps,
    careTier: formatterResult.careTier,
    outOfScope: false,
    ...facilities.length > 0 ? { facilities } : {}
  });
}
export {
  handler
};
//# sourceMappingURL=handler.js.map
