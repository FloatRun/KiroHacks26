# FirstAid AI — API Contract

## Endpoint

```
POST /api/triage
Content-Type: application/json
```

## Request Body

```typescript
interface TriageRequest {
  query: string;        // required, 1–500 characters
  location?: {
    lat: number;        // decimal degrees
    lng: number;        // decimal degrees
  };
}
```

## Response: Triage

```typescript
interface TriageResponse {
  type: "triage";
  severity: "self_care" | "urgent_care" | "emergency";
  steps: string[];      // 3–5 items, each ≤ 120 characters, imperative voice
  careTier: "self_care" | "urgent_care" | "emergency";
  outOfScope: boolean;
  facilities?: Facility[];
}

interface Facility {
  name: string;
  address: string;
  distanceMeters: number;
  openNow: boolean;
  lat: number;
  lng: number;
  placeId: string;
}
```

- `facilities` is present and non-empty only when `careTier !== "self_care"` AND location was provided AND Google Places returned results
- `reasoning` is stripped from this response — it is logged to CloudWatch only
- `outOfScope: true` means steps may be empty; frontend renders refusal UX

## Response: Clarification

```typescript
interface ClarificationResponse {
  type: "clarification";
  question: string;     // single sentence, ≤ 15 words
  reason: "too_vague" | "missing_severity" | "missing_subject" | "non_medical" | "ambiguous_scenario";
}
```

## Error Responses

| Status | Body | Cause |
|---|---|---|
| 400 | `{ error: "invalid_request", message: string }` | Missing/invalid query or malformed body |
| 503 | `{ error: "parser_unavailable" }` | Bedrock parser invocation failed |
| 503 | `{ error: "retrieval_unavailable" }` | Bedrock KB retrieval failed |
| 503 | `{ error: "triage_unavailable" }` | Bedrock formatter invocation failed |
| 504 | API Gateway default body | Lambda exceeded 15s timeout |

## Discriminator Pattern

All 200 responses include a `type` field. Frontend switches on this:

```typescript
type ApiResponse = TriageResponse | ClarificationResponse;

if (response.type === "clarification") { /* render ClarificationView */ }
if (response.type === "triage" && response.outOfScope) { /* render OutOfScopeRefusal */ }
if (response.type === "triage") { /* render TriageView */ }
```

## CORS

- `Access-Control-Allow-Origin`: CloudFront distribution domain only
- `Access-Control-Allow-Methods`: `POST`
- `Access-Control-Allow-Headers`: `Content-Type`
- All Lambda responses must include these headers

## Care Tier → UI Label Mapping

| careTier | Action Label |
|---|---|
| `self_care` | "Self-care at home" |
| `urgent_care` | "Seek urgent care within 1 hour" |
| `emergency` | "Call emergency services now" |

## Severity → UI Color Mapping

| severity | Tailwind class | Meaning |
|---|---|---|
| `self_care` | `bg-green-500` | Manageable at home |
| `urgent_care` | `bg-yellow-400` | Needs care soon |
| `emergency` | `bg-red-600` | Call 911 immediately |
