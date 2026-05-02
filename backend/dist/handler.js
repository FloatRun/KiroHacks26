import { createRequire } from 'module'; const require = createRequire(import.meta.url);

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
  if (location !== void 0) {
    if (typeof location !== "object" || typeof location.lat !== "number" || typeof location.lng !== "number") {
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
  return respond(200, {
    type: "triage",
    severity: "urgent_care",
    steps: [
      "Cool the burn under cool running water for 20 minutes.",
      "Do not apply ice, butter, or any cream to the burn.",
      "Cover loosely with a clean non-fluffy material like cling film."
    ],
    careTier: "urgent_care",
    outOfScope: false
  });
}
export {
  handler
};
//# sourceMappingURL=handler.js.map
