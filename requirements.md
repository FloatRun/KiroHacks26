# FirstAid AI — Requirements

## Introduction

FirstAid AI is a full-stack web application designed to deliver structured, grounded first-aid triage guidance to people in acute emergency situations. The system accepts free-form natural language input, retrieves relevant medical protocol content from a curated knowledge base, and returns a concise, actionable triage card — all within 5 seconds.

This document defines the functional requirements, non-functional requirements, accessibility requirements, equity requirements, error handling requirements, success criteria, and hard exclusions for the v1 hackathon build.

---

## Affected Communities

FirstAid AI is designed specifically for populations who are underserved by existing emergency healthcare navigation tools:

- **Uninsured and underinsured individuals** who cannot afford to make the wrong care-tier decision (urgent care vs. ER vs. home care).
- **Rural populations** who face long transport times and need to know whether to drive 45 minutes to a hospital or manage at home.
- **Non-native English speakers** who may struggle with medically hedged prose and need plain, imperative instructions.
- **Low-income households** who need a free, no-account, no-tracking tool they can trust.
- **First-time parents and caregivers** who lack the experience to calibrate severity and need confident, grounded guidance fast.

The 30-second window between "something just happened" and "what do I do" is the design target. SEO-farmed results, hedged ChatGPT prose, and hold music are the failure modes this product replaces.

---

## Functional Requirements

### FR1: User Input

**EARS notation:** WHEN the user opens the application, the system SHALL display a single-page landing screen with an autofocused text input field.

**EARS notation:** WHEN the user types a description and presses Enter or clicks the submit button, the system SHALL submit the query for triage processing.

**Acceptance Criteria:**

- AC1.1: On page load, the text input field receives focus automatically without user interaction.
- AC1.2: The input field displays placeholder text: "Describe what happened — e.g., 'my son burned his hand on the stove'".
- AC1.3: The input field accepts free-form natural language up to 500 characters; input beyond 500 characters is rejected or truncated with a visible character count indicator.
- AC1.4: Pressing the Enter key while the input field is focused submits the query.
- AC1.5: Clicking or tapping the submit button submits the query.
- AC1.6: The submit button is disabled and the input field is non-interactive while a triage request is in flight.
- AC1.7: No login, account creation, or session persistence is required or offered.
- AC1.8: The landing screen renders correctly at 375×667px (iPhone SE) and at desktop widths up to 1440px.

**FR1.1 (Stretch Goal): Voice Input**

**EARS notation:** WHERE the browser supports the Web Speech API, WHEN the user clicks the microphone button, the system SHALL transcribe speech into the text input field.

**Acceptance Criteria:**

- AC1.1.1: A microphone button is rendered adjacent to the text input field on browsers that support `window.SpeechRecognition` or `window.webkitSpeechRecognition`.
- AC1.1.2: On browsers that do not support the Web Speech API, the microphone button is not rendered and no error is shown.
- AC1.1.3: Transcribed speech populates the text input field; the user may edit the transcription before submitting.
- AC1.1.4: If speech recognition fails or is denied, the input field remains functional for manual text entry.

> **Note:** FR1.1 is a stretch goal. It is not on the critical path and should only be implemented after Phases 1–4 are complete with time margin.

---

### FR2: Geolocation Prefetch

**EARS notation:** WHEN the application loads, the system SHALL request the user's geolocation via the browser Geolocation API and cache the coordinates in client state.

**EARS notation:** WHEN the user denies geolocation permission, the system SHALL degrade gracefully without blocking triage functionality.

**Acceptance Criteria:**

- AC2.1: On page load, `navigator.geolocation.getCurrentPosition()` is called before the user submits a query.
- AC2.2: If permission is granted, latitude and longitude are stored in client state and included in the POST /api/triage request body.
- AC2.3: If permission is denied or the API is unavailable, the application continues to function; the triage request is submitted without location data.
- AC2.4: When location is unavailable, the service finder section displays the message "Enable location to find nearby care" and no map is rendered.
- AC2.5: The geolocation request does not block the text input from being interactive.

---

### FR3: Triage Request Orchestration (Lambda — Two-Stage LLM Pipeline)

**EARS notation:** WHEN the Lambda function receives a POST /api/triage request, the system SHALL execute a two-stage LLM pipeline to produce a structured triage response.

**Request body:**
```typescript
{
  query: string,          // required, max 500 characters
  location?: {
    lat: number,
    lng: number
  }
}
```

#### Stage 1: Input Parser

**EARS notation:** WHEN Lambda receives a valid triage request, the system SHALL invoke Amazon Bedrock Claude (claude-sonnet-4) with the `parse_user_input` tool definition to normalize the user's input or request clarification.

**Acceptance Criteria:**

- AC3.1: Lambda invokes Bedrock Claude with the `parse_user_input` tool and forces tool use via `tool_choice`.
- AC3.2: The parser tool schema matches the definition in the design document exactly (action, normalizedQuery, extractedContext, clarificationQuestion, clarificationReason).
- AC3.3: If the parser returns `action: "clarify"`, Lambda returns a clarification response immediately — no Knowledge Base retrieval or formatter invocation occurs.
- AC3.4: If the parser returns `action: "retrieve"`, Lambda proceeds to Stage 2 with `normalizedQuery`.
- AC3.5: The parser system prompt is hand-tuned per the design document constraints and is NOT auto-generated.
- AC3.6: A short but clear input such as "kid burned hand on stove" results in `action: "retrieve"`, not `action: "clarify"`.
- AC3.7: A genuinely ambiguous input such as "it hurts" results in `action: "clarify"`.

#### Stage 2: Knowledge Base Retrieval

**EARS notation:** WHEN the parser returns `action: "retrieve"`, the system SHALL query the Bedrock Knowledge Base using `normalizedQuery` and apply a similarity threshold gate.

**Acceptance Criteria:**

- AC3.8: Lambda calls the Bedrock Knowledge Base Retrieve API with `normalizedQuery` and requests the top 5 chunks.
- AC3.9: If the maximum similarity score across all returned chunks is below 0.5, Lambda returns an out-of-scope refusal response without invoking the formatter.
- AC3.10: If retrieval returns chunks with at least one score ≥ 0.5, Lambda proceeds to Stage 3 with the retrieved chunks.
- AC3.11: Retrieval failures (timeout, API error) return HTTP 503 with `{ error: "retrieval_unavailable" }`.

#### Stage 3: Triage Formatter

**EARS notation:** WHEN retrieval succeeds and passes the similarity threshold, the system SHALL invoke Amazon Bedrock Claude a second time with the `submit_triage` tool definition and the retrieved chunks as context.

**Acceptance Criteria:**

- AC3.12: Lambda invokes Bedrock Claude with the `submit_triage` tool and forces tool use via `tool_choice`.
- AC3.13: The formatter tool schema matches the definition in the design document exactly (severity, steps, careTier, reasoning, outOfScope).
- AC3.14: The formatter system prompt is hand-tuned per the design document constraints and is NOT auto-generated.
- AC3.15: If the formatter returns `outOfScope: true`, Lambda returns an out-of-scope refusal response.
- AC3.16: The `reasoning` field is logged server-side (CloudWatch) and is NOT included in the response returned to the client.
- AC3.17: If `careTier !== "self_care"` and location was provided in the request, Lambda calls the Google Places API (FR6) before returning.
- AC3.18: Lambda timeout is configured at 15 seconds; API Gateway returns 504 on timeout.

---

### FR3.1: Clarification Round-Trip

**EARS notation:** WHEN the parser returns `action: "clarify"`, the system SHALL return a clarification response and the frontend SHALL render a clarification UI and allow one follow-up submission.

**Backend clarification response shape:**
```typescript
{
  type: "clarification",
  question: string,       // single sentence, max 15 words
  reason: "too_vague" | "missing_severity" | "missing_subject" | "non_medical" | "ambiguous_scenario"
}
```

**Acceptance Criteria:**

- AC3.1.1: The clarification question is rendered prominently above the input field.
- AC3.1.2: The user's original query is displayed as an immutable label or pre-populated in the input field.
- AC3.1.3: The user types a clarifying answer and submits; the frontend constructs the new query as `${originalQuery}. ${clarificationAnswer}` and POSTs it as a fresh request.
- AC3.1.4: No more than one clarification round-trip is allowed per session. If the second submission also returns `action: "clarify"`, the frontend treats it as out-of-scope and renders the refusal UX without making a third request.
- AC3.1.5: The clarification question is 15 words or fewer.
- AC3.1.6: The clarification reason is one of the five defined enum values.

---

### FR4: Triage Formatter Response

**EARS notation:** WHEN the formatter produces a valid triage result, the system SHALL return a structured triage response to the client.

**Backend triage response shape:**
```typescript
{
  type: "triage",
  severity: "self_care" | "urgent_care" | "emergency",
  steps: string[],        // 3–5 items, each ≤ 120 characters
  careTier: "self_care" | "urgent_care" | "emergency",
  outOfScope: boolean,
  facilities?: Facility[]
}
```

**Acceptance Criteria:**

- AC4.1: The response includes `type: "triage"` as a discriminator field.
- AC4.2: `severity` is one of the three defined enum values.
- AC4.3: `steps` contains between 3 and 5 items inclusive.
- AC4.4: Each step is 120 characters or fewer, written in clear imperative voice.
- AC4.5: `careTier` matches `severity` (they are set by the same formatter invocation).
- AC4.6: `outOfScope` is a boolean; when `true`, the steps array may be empty and the client renders the refusal UX.
- AC4.7: `reasoning` is present in the formatter tool output but is stripped from the client response and written to CloudWatch logs.
- AC4.8: `facilities` is present and non-empty only when `careTier !== "self_care"` and location was provided and Google Places returned results.

---

### FR5: Triage Card UI

**EARS notation:** WHEN the client receives a triage response, the system SHALL render a triage card with severity, steps, care tier, and optional emergency callout.

**Acceptance Criteria:**

- AC5.1: The severity banner is color-coded: green for `self_care`, yellow for `urgent_care`, red for `emergency`.
- AC5.2: The severity label is rendered in a minimum 24px font size with WCAG AAA contrast ratio (≥ 7:1) against the banner background.
- AC5.3: First aid steps are rendered as a numbered list with generous line spacing (minimum 1.5× line height).
- AC5.4: The care tier recommendation includes a human-readable action label:
  - `self_care` → "Self-care at home"
  - `urgent_care` → "Seek urgent care within 1 hour"
  - `emergency` → "Call emergency services now"
- AC5.5: When `severity === "emergency"`, a prominent callout displays the local emergency number (hardcoded as 911 for v1).
- AC5.6: A persistent disclaimer footer is visible on all views: "Not medical advice. In an emergency, call your local emergency number directly."
- AC5.7: When `outOfScope === true`, the out-of-scope refusal state is rendered with a distinct UI (not a triage card).
- AC5.8: When the response type is `"clarification"`, the clarification UI is rendered (see FR3.1).
- AC5.9: A loading state is displayed while the triage request is in flight.
- AC5.10: An error state is displayed when the API returns a 503 or 504, with a retry option and the message "Service temporarily unavailable, please try again or call your local emergency number directly."

---

### FR6: Service Finder (Lambda → Google Places)

**EARS notation:** WHEN `careTier !== "self_care"` and location is available, the system SHALL query the Google Places API for nearby facilities and return them with the triage response.

**Acceptance Criteria:**

- AC6.1: For `careTier === "urgent_care"`, Lambda calls Google Places Nearby Search with keyword "urgent care" and radius 10000m.
- AC6.2: For `careTier === "emergency"`, Lambda calls Google Places Nearby Search with type "hospital" and radius 15000m.
- AC6.3: Results are filtered to facilities where `opening_hours.open_now === true`.
- AC6.4: Results are sorted by distance ascending using Haversine distance from the user's coordinates.
- AC6.5: The top 3–5 results are returned, each containing: `name`, `address`, `distanceMeters`, `openNow`, `lat`, `lng`, `placeId`.
- AC6.6: The Google Places API key is stored in AWS Systems Manager Parameter Store as a SecureString and is never hardcoded or logged.
- AC6.7: Lambda reads the API key from Parameter Store at cold start and caches it in module scope.
- AC6.8: If the Google Places API call fails or times out, Lambda returns the triage response with `facilities: []` and does not fail the entire request.

---

### FR7: Map Display

**EARS notation:** WHEN the triage response includes facilities, the system SHALL render an embedded Leaflet map with facility pins and a user location marker.

**Acceptance Criteria:**

- AC7.1: A Leaflet map is rendered below the triage card when `facilities` is non-empty.
- AC7.2: Each facility is represented by a pin on the map at its lat/lng coordinates.
- AC7.3: The user's location is represented by a distinct marker icon (visually differentiated from facility pins).
- AC7.4: Tapping or clicking a facility pin opens an info window displaying the facility name and distance.
- AC7.5: The info window includes a "Get Directions" button that opens `https://www.google.com/maps/dir/?api=1&destination={lat},{lng}` in a new browser tab.
- AC7.6: The map is not rendered when `facilities` is empty or when location is unavailable.
- AC7.7: Map tiles are served from OpenStreetMap (no API key required for tiles).

---

## Non-Functional Requirements

### Performance

- NFR-P1: End-to-end latency from query submission to triage card render is under 5 seconds for the happy path (parser → retrieval → formatter → response) under normal load.
- NFR-P2: Lambda timeout is configured at 15 seconds. API Gateway returns 504 if Lambda does not respond within this window.
- NFR-P3: Geolocation prefetch runs in parallel with user input and does not add to triage latency.

### Scalability and Cost

- NFR-S1: The system is designed for hackathon-scale traffic (single-digit concurrent users). No auto-scaling configuration is required beyond Lambda defaults.
- NFR-S2: S3 Vector accrues only storage charges (~$0.06/GB/month) with no idle minimum; no urgent teardown is required after demo completion.

### Reliability

- NFR-R1: Each failure mode (parser failure, retrieval failure, formatter failure, Places failure, geolocation denial) has a defined degradation path that does not crash the application.
- NFR-R2: Google Places failure degrades gracefully to triage-only response; it does not block the triage result.

### Security

- NFR-SEC1: The Google Places API key is stored as a SecureString in AWS Systems Manager Parameter Store and is never returned to the client or written to logs.
- NFR-SEC2: Lambda IAM role follows least-privilege: `bedrock:InvokeModel` scoped to the Claude model ARN, `bedrock-agent-runtime:Retrieve` scoped to the specific Knowledge Base ARN, `ssm:GetParameter` scoped to the Places API key parameter ARN.
- NFR-SEC3: The frontend S3 bucket is not publicly accessible; access is restricted to CloudFront via Origin Access Control (OAC).
- NFR-SEC4: CORS on API Gateway is restricted to the CloudFront distribution domain.

### Mobile-First Responsive Design

- NFR-M1: Primary target viewport is 375×667px (iPhone SE). All UI elements must be fully functional at this size.
- NFR-M2: Layout is responsive up to 1440px desktop width.
- NFR-M3: No horizontal scrolling at any supported viewport width.

---

## Accessibility Requirements

Accessibility is a first-class requirement, not a post-hoc audit item. The affected communities include people under acute stress, people with disabilities, and people using assistive technologies.

- ACC1: All interactive elements (buttons, inputs, links) are reachable and operable via keyboard navigation (Tab, Enter, Space, arrow keys as appropriate).
- ACC2: Focus order follows a logical reading order; focus is never trapped outside a modal or interactive region.
- ACC3: All images, icons, and non-text elements have descriptive `alt` text or `aria-label` attributes.
- ACC4: The severity banner meets WCAG AAA contrast ratio (≥ 7:1) between text and background color.
- ACC5: All other text content meets WCAG AA contrast ratio (≥ 4.5:1 for normal text, ≥ 3:1 for large text).
- ACC6: The severity label font size is a minimum of 24px.
- ACC7: All touch targets (buttons, links, map pins) are a minimum of 44×44px.
- ACC8: The triage card and clarification UI are navigable and readable with a screen reader (VoiceOver on iOS, TalkBack on Android, NVDA/JAWS on desktop).
- ACC9: Semantic HTML is used throughout: `<main>`, `<nav>`, `<section>`, `<h1>`–`<h3>`, `<ol>`, `<button>`, `<input>` with associated `<label>`.
- ACC10: Loading and error states are announced to screen readers via `aria-live` regions.
- ACC11: Color is never the sole means of conveying information (severity is communicated by both color and text label).

---

## Equity and Adoption Requirements

These requirements are directly tied to the affected community framing. They are non-negotiable for v1.

- EQ1: No user account, login, or registration is required at any point in the flow.
- EQ2: No payment, subscription, or premium tier exists.
- EQ3: No user data is retained beyond the duration of a single request. No database, no session storage, no analytics pipeline.
- EQ4: No tracking pixels, third-party analytics scripts, or behavioral telemetry are included.
- EQ5: The application is accessible via a public HTTPS URL with no app store installation required.
- EQ6: The application functions on low-end mobile hardware at 375×667px without requiring a high-bandwidth connection (assets are served via CloudFront CDN).
- EQ7: The disclaimer footer is persistent and visible on all views, ensuring users understand the tool's limitations.

---

## Error Handling Requirements

| Failure Mode | HTTP Status | Error Payload | Frontend Behavior |
|---|---|---|---|
| Bedrock parser failure/timeout | 503 | `{ error: "parser_unavailable" }` | "Service temporarily unavailable, please try again or call your local emergency number directly." + retry button |
| Bedrock KB retrieval failure/timeout | 503 | `{ error: "retrieval_unavailable" }` | Same as above |
| Bedrock formatter failure/timeout | 503 | `{ error: "triage_unavailable" }` | Same as above |
| Retrieval below similarity threshold | 200 | `{ type: "triage", outOfScope: true, ... }` | Out-of-scope refusal UX (not an error state) |
| Parser returns clarify | 200 | `{ type: "clarification", ... }` | Clarification UX (not an error state) |
| Google Places failure/timeout | 200 | `{ type: "triage", ..., facilities: [] }` | Triage card rendered; "Unable to load nearby facilities" shown in map area |
| Geolocation denied | N/A (client-side) | No location in request | Triage submitted without location; "Enable location to find nearby care" shown |
| Lambda timeout (15s) | 504 | API Gateway default | Generic error with retry option |

- ERR1: No error state shall leave the user without a path forward. Every error message includes either a retry option or the instruction to call their local emergency number directly.
- ERR2: Error messages are written in plain language, not technical jargon.
- ERR3: HTTP 5xx errors from the API are never surfaced as raw status codes or stack traces to the user.

---

## Success Criteria

1. A user can submit a text description and receive a structured triage response or clarification request in under 5 seconds.
2. The clarification round-trip works end-to-end: parser requests clarification, frontend renders clarification UI, user submits answer, triage response is returned.
3. The triage response is grounded in retrieved corpus content, not Claude's general knowledge (verified by checking retrieval chunks in CloudWatch logs).
4. Out-of-scope queries (non-medical, below similarity threshold) trigger the refusal path with a distinct UI.
5. The service finder returns relevant nearby facilities when location is available and `careTier !== "self_care"`.
6. The Leaflet map renders with facility pins, user marker, and functional "Get Directions" handoff.
7. The full flow is demonstrable on mobile and desktop in a 90-second live demo.
8. All infrastructure is provisionable and teardown-able via AWS Console or a single deployment script.
9. Full keyboard navigation is functional; WCAG AAA contrast on severity banners; all touch targets ≥ 44×44px.
10. The demo covers all five scenarios: clarification, `self_care`, `urgent_care` with map, `emergency` with map, out-of-scope refusal.

---

## Out of Scope (Hard Exclusions)

The following are explicitly excluded from v1. They must not be implemented, partially implemented, or stubbed in a way that implies future support.

- Photo or image input of any kind
- PWA installation, offline mode, or service workers
- Locale detection, internationalization, or non-English language support
- User accounts, authentication, history, or conversation continuity beyond a single request
- Insurance filtering, wait time data, or appointment booking
- Push notifications, SMS, or email
- Admin panel, analytics dashboard, or telemetry beyond CloudWatch error logs
- Medical coverage beyond the 15–20 scoped scenarios in the corpus
- Multi-region deployment
- Custom domain (CloudFront default domain is acceptable for demo)
- More than one clarification round-trip per session
