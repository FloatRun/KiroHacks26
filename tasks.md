# FirstAid AI — Tasks

## Critical Path

The following tasks are on the critical path. A delay in any of them delays the demo.

```
Bedrock KB verified (pre-event)
  → Lambda scaffold + IAM (Phase 1)
    → Stage 1 Parser integration (Phase 2)
      → Stage 2 KB Retrieval integration (Phase 2)
        → Stage 3 Formatter integration (Phase 2)
          → Clarification flow integration (Phase 2)
            → End-to-end Lambda test (Phase 2)
              → Frontend API client + TriageView (Phase 3)
                → Integration testing all 5 scenarios (Phase 5)
                  → Demo rehearsal (Phase 5)
```

Phases 2 and 3 run in parallel. Phase 4 (service finder + map) is not on the critical path for a passing demo but is required for the full demo script.

---

## Pre-Event Tasks
> Complete before the hackathon clock starts. These tasks have no time pressure but block everything else.

- [x] PE-1: Enable Amazon Bedrock model access for Anthropic Claude (claude-sonnet-4) in the target AWS region (us-west-2 or us-east-1). Verify via Bedrock console. [CRITICAL]
- [x] PE-2: Enable Amazon Bedrock model access for Amazon Titan Text Embeddings v2. Verify via Bedrock console. [CRITICAL]
- [ ] PE-3: Collect, clean, and format medical corpus documents (50–150 files, .txt or .md, named with scenario tag prefix). Target 15–20 scenarios: burns, cuts, choking, allergic reactions, head injuries, chest pain, fainting, poisoning, sprains, eye injuries, nosebleeds, animal bites, seizures, asthma attacks, hypoglycemia. [CRITICAL]
- [x] PE-4: Create S3 corpus bucket (`firstaid-ai-corpus`) and upload all corpus documents. [CRITICAL]
- [ ] PE-5: Create Bedrock Knowledge Base pointing at the corpus S3 bucket. Configure: fixed-size chunking (~300 tokens, 20% overlap), Titan Text Embeddings v2, OpenSearch Serverless vector store. [CRITICAL]
- [ ] PE-6: Run initial Knowledge Base ingestion and verify via Bedrock console test query. Confirm at least one scenario returns chunks with similarity score ≥ 0.5. [CRITICAL]
- [ ] PE-7: Store Google Places API key in AWS Systems Manager Parameter Store as SecureString at path `/firstaid-ai/places-api-key`. [CRITICAL]
- [x] PE-8: Configure Kiro steering documents in `.kiro/steering/`: architecture.md, api-contract.md, tool-schemas.md, component-map.md, demo-scenarios.md.
- [x] PE-9: Review requirements.md, design.md, and tasks.md for consistency. Confirm all five demo scenarios are covered.

---

## Phase 1 — Foundation (Hours 0–1.5)

### Infrastructure

- [ ] 1.1: Create frontend S3 bucket (`firstaid-ai-frontend`). Disable public access. Configure for static website hosting (index.html as default). [CRITICAL]
- [ ] 1.2: Create CloudFront distribution with S3 origin via OAC. Enable HTTPS. Set default root object to `index.html`. Configure 403/404 error responses to return `/index.html` with HTTP 200 (SPA routing fallback). [CRITICAL]
- [ ] 1.3: Create Lambda function (`firstaid-ai-triage`). Runtime: Node.js 20.x. Memory: 512 MB. Timeout: 15 seconds. [CRITICAL]
- [ ] 1.4: Create API Gateway HTTP API. Add route: `POST /api/triage` → Lambda integration. Configure CORS: allow origin = CloudFront distribution domain, allow methods = POST, allow headers = Content-Type. [CRITICAL]
- [ ] 1.5: Create Lambda IAM execution role with least-privilege policy: `bedrock:InvokeModel` (scoped to Claude model ARN), `bedrock-agent-runtime:Retrieve` (scoped to KB ARN), `ssm:GetParameter` (scoped to Places API key parameter ARN), `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents`. Attach role to Lambda. [CRITICAL]
- [ ] 1.6: Verify Lambda can be invoked via API Gateway with a test payload. Confirm CORS headers in response.

### Scaffolding

- [ ] 1.7: Scaffold React + Vite + TypeScript + Tailwind CSS frontend project. Confirm `npm run dev` and `npm run build` succeed. [CRITICAL]
- [ ] 1.8: Define shared TypeScript types in `src/types/api.ts`: `TriageRequest`, `TriageResponse`, `ClarificationResponse`, `ErrorResponse`, `Facility`, `Severity`, `ClarificationReason`. [CRITICAL]
- [ ] 1.9: Scaffold Lambda TypeScript project with esbuild. Confirm `npm run build` produces `dist/handler.js`. [CRITICAL]
- [ ] 1.10: Write frontend deployment script: `aws s3 sync dist/ s3://firstaid-ai-frontend/ --delete` + CloudFront invalidation.
- [ ] 1.11: Write backend deployment script: TypeScript build + `aws lambda update-function-code`.
- [ ] 1.12: Create mock Lambda handler that returns a hardcoded `TriageResponse` with `type: "triage"`, `severity: "urgent_care"`, 3 steps, `careTier: "urgent_care"`, `outOfScope: false`. Deploy to Lambda. Verify frontend can call it.

---

## Phase 2 — Backend Core: LLM Pipeline (Hours 1.5–4) [PARALLEL with Phase 3]

### Lambda Handler Scaffolding

- [ ] 2.1: Implement request parsing and validation in Lambda handler: parse JSON body, validate `query` (required, string, max 500 chars), validate `location` (optional, lat/lng numbers). Return 400 on invalid input. [CRITICAL]
- [ ] 2.2: Implement SSM Parameter Store integration: read Places API key at cold start, cache in module scope. Use `@aws-sdk/client-ssm`. [CRITICAL]
- [ ] 2.3: Implement CORS response headers helper. All Lambda responses must include `Access-Control-Allow-Origin` set to CloudFront domain.

### Stage 1: Parser Integration [CRITICAL]

- [ ] 2.4: Implement `invokeParser(query: string)` function using `@aws-sdk/client-bedrock-runtime` `InvokeModelCommand`. Pass `parse_user_input` tool definition (verbatim from design.md). Set `tool_choice` to force tool use. [CRITICAL]
- [ ] 2.5: Write and hand-tune the parser system prompt (NOT Kiro-generated). Test against: "kid burned hand on stove" (expect retrieve), "it hurts" (expect clarify), "my dog bit me" (expect retrieve), "I feel weird" (expect clarify). [CRITICAL]
- [ ] 2.6: Implement clarification short-circuit: if parser returns `action: "clarify"`, return `{ type: "clarification", question, reason }` immediately. No KB or formatter calls. [CRITICAL]
- [ ] 2.7: Implement error handling for parser: catch InvokeModel errors and timeouts, return 503 `{ error: "parser_unavailable" }`.

### Stage 2: Knowledge Base Retrieval Integration [CRITICAL]

- [ ] 2.8: Implement `retrieveFromKnowledgeBase(normalizedQuery: string)` function using `@aws-sdk/client-bedrock-agent-runtime` `RetrieveCommand`. Request top 5 chunks. [CRITICAL]
- [ ] 2.9: Implement similarity threshold gate: compute `maxScore = Math.max(...chunks.map(c => c.score))`. If `maxScore < SIMILARITY_THRESHOLD` (default 0.5, read from env var), return out-of-scope triage response. [CRITICAL]
- [ ] 2.10: Implement error handling for retrieval: catch Retrieve errors and timeouts, return 503 `{ error: "retrieval_unavailable" }`.

### Stage 3: Formatter Integration [CRITICAL]

- [ ] 2.11: Implement `invokeFormatter(chunks, extractedContext)` function using `InvokeModelCommand`. Pass `submit_triage` tool definition (verbatim from design.md). Pass retrieved chunks as context in user message. Set `tool_choice` to force tool use. [CRITICAL]
- [ ] 2.12: Write and hand-tune the formatter system prompt (NOT Kiro-generated). Test against retrieved chunks for: burn scenario (expect 3–5 imperative steps, urgent_care or emergency), choking scenario (expect emergency), minor cut (expect self_care). [CRITICAL]
- [ ] 2.13: Implement reasoning log: extract `reasoning` from formatter output, write to CloudWatch via `console.log`. Strip from client response. [CRITICAL]
- [ ] 2.14: Implement out-of-scope gate: if formatter returns `outOfScope: true`, return out-of-scope triage response.
- [ ] 2.15: Implement error handling for formatter: catch InvokeModel errors and timeouts, return 503 `{ error: "triage_unavailable" }`.

### Clarification Flow Integration [CRITICAL]

- [ ] 2.16: Verify end-to-end clarification flow: submit ambiguous query → parser returns clarify → Lambda returns clarification response → (frontend in Phase 3 handles round-trip). [CRITICAL]
- [ ] 2.17: Confirm one-clarification-per-session limit is enforced client-side (Phase 3 task 3.7). Document that Lambda has no session state and does not enforce this limit.

### End-to-End Lambda Test

- [ ] 2.18: Test full happy path via API Gateway: submit "child burned hand on stove" with mock location → verify triage response with severity, steps, careTier. [CRITICAL]
- [ ] 2.19: Test out-of-scope path: submit "what is the capital of France" → verify out-of-scope triage response.
- [ ] 2.20: Test clarification path: submit "it hurts" → verify clarification response with question and reason.
- [ ] 2.21: Test 503 error paths by temporarily misconfiguring Bedrock permissions. Verify correct error codes returned.

---

## Phase 3 — Frontend Core (Hours 1.5–4) [PARALLEL with Phase 2]

### API Client

- [ ] 3.1: Implement `src/api/triage.ts`: `postTriage(request: TriageRequest): Promise<ApiResponse>`. Uses `fetch` to POST to `/api/triage`. Handles 200, 400, 503, 504. Throws typed errors. [CRITICAL]

### Geolocation

- [ ] 3.2: Implement geolocation prefetch in `App.tsx` or a `useGeolocation` hook. Call `navigator.geolocation.getCurrentPosition()` on mount. Store `{ lat, lng }` in state. Handle denial gracefully (set location to null). [CRITICAL]

### Core UI Components

- [ ] 3.3: Implement `QueryInput` component: autofocused text field, 500-char limit with counter, Enter-key submit, submit button, disabled state during loading. Tailwind mobile-first layout. [CRITICAL]
- [ ] 3.4: Implement `SeverityBanner` component: accepts `severity` prop, applies color classes (`bg-green-500`, `bg-yellow-400`, `bg-red-600`), renders severity label at minimum 24px with WCAG AAA contrast. [CRITICAL]
- [ ] 3.5: Implement `StepsList` component: renders `steps` array as `<ol>` with `<li>` items, 1.5× line height minimum. [CRITICAL]
- [ ] 3.6: Implement `CareTierAction` component: maps `careTier` to action label ("Self-care at home", "Seek urgent care within 1 hour", "Call emergency services now"). [CRITICAL]
- [ ] 3.7: Implement `EmergencyNumberCallout` component: conditionally rendered when `severity === "emergency"`. Displays "Call 911". Touch target ≥ 44×44px. [CRITICAL]
- [ ] 3.8: Implement `OutOfScopeRefusal` component: distinct UI for `outOfScope === true`. Plain language message. Includes suggestion to call emergency number.
- [ ] 3.9: Implement `DisclaimerFooter` component: persistent `<footer>` with disclaimer text. Rendered on all views.
- [ ] 3.10: Implement `LoadingState` component: spinner or skeleton. `aria-live="polite"` announcement.
- [ ] 3.11: Implement `ErrorState` component: plain language error message, retry button. `aria-live="assertive"` announcement.

### Clarification UI [CRITICAL]

- [ ] 3.12: Implement `ClarificationView`: renders when API response `type === "clarification"`. Displays `question` prominently. Shows original query as immutable label (`OriginalQueryDisplay`). Provides `ClarificationInput` text field. [CRITICAL]
- [ ] 3.13: Implement clarification submission logic: on submit, concatenate `${originalQuery}. ${clarificationAnswer}` and POST as fresh request. Track clarification count in component state. [CRITICAL]
- [ ] 3.14: Implement one-clarification-per-session limit: if clarification count ≥ 1 and response is again `type: "clarification"`, render `OutOfScopeRefusal` without making a third API call. [CRITICAL]

### View Orchestration

- [ ] 3.15: Implement `App.tsx` view state machine: `landing` → `loading` → `triage | clarification | error`. Manage transitions based on API response type. [CRITICAL]
- [ ] 3.16: Implement `TriageView`: composes `SeverityBanner`, `StepsList`, `CareTierAction`, `EmergencyNumberCallout`, `FacilityMap` (placeholder), `OutOfScopeRefusal`. [CRITICAL]

### Accessibility and Responsive Layout

- [ ] 3.17: Audit all interactive elements for keyboard navigation (Tab order, Enter/Space activation). Fix any focus traps.
- [ ] 3.18: Add `aria-label` or `aria-labelledby` to all form elements and icon buttons.
- [ ] 3.19: Verify all touch targets are ≥ 44×44px on 375px viewport.
- [ ] 3.20: Verify WCAG AAA contrast on `SeverityBanner` for all three severity levels. Use a contrast checker tool.
- [ ] 3.21: Test with browser DevTools mobile emulation at 375×667px. Fix any layout overflow or truncation.

### Mocked Backend Integration

- [ ] 3.22: Wire frontend to mock Lambda (from task 1.12). Verify full render of `TriageView` with mocked data. Confirm loading and error states render correctly.

---

## Phase 4 — Service Finder and Map (Hours 4–5.5)

### Google Places Integration (Lambda)

- [ ] 4.1: Implement `findNearbyFacilities(careTier, location, apiKey)` function in Lambda. Map `urgent_care` → keyword "urgent care", radius 10000m. Map `emergency` → type "hospital", radius 15000m. [FR6]
- [ ] 4.2: Implement Places API response parsing: filter to `opening_hours.open_now === true`, compute Haversine distance from user coordinates, sort ascending, return top 3–5 results as `Facility[]`. [FR6]
- [ ] 4.3: Integrate `findNearbyFacilities` into Lambda handler: call only when `careTier !== "self_care"` and `location` is present. Wrap in try/catch; on failure, continue with `facilities: []`. [FR6]
- [ ] 4.4: Test Places integration via API Gateway with a real location and `urgent_care` scenario. Verify 3–5 facilities returned with correct fields.

### Leaflet Map Component (Frontend)

- [ ] 4.5: Install `leaflet` and `react-leaflet`. Add Leaflet CSS import. [FR7]
- [ ] 4.6: Implement `FacilityMap` component: initialize Leaflet map centered on user coordinates. Render facility pins (default marker). Render user location marker (distinct icon). [FR7]
- [ ] 4.7: Implement facility pin info window: on pin click/tap, show popup with facility name and distance (formatted as miles or km). [FR7]
- [ ] 4.8: Implement "Get Directions" button in info window: opens `https://www.google.com/maps/dir/?api=1&destination={lat},{lng}` in new tab. Touch target ≥ 44×44px. [FR7]
- [ ] 4.9: Integrate `FacilityMap` into `TriageView`: render only when `facilities` is non-empty. Pass user coordinates and facilities as props. [FR7]
- [ ] 4.10: Test map at 375px viewport. Verify pins are tappable, info window renders, directions link opens correctly.

---

## Phase 5 — Integration, Accessibility, Demo Prep (Hours 5.5–7)

### End-to-End Integration Testing

- [ ] 5.1: **Demo Scenario 1 — Clarification:** Submit "I feel weird". Verify: clarification response rendered, question displayed, user submits answer, triage response returned on second submission. [CRITICAL]
- [ ] 5.2: **Demo Scenario 2 — Self-Care:** Submit "I have a small paper cut on my finger". Verify: `severity: "self_care"`, green banner, 3–5 steps, "Self-care at home" label, no map rendered. [CRITICAL]
- [ ] 5.3: **Demo Scenario 3 — Urgent Care with Map:** Submit "my child burned their hand on the stove" with location enabled. Verify: `severity: "urgent_care"`, yellow banner, 3–5 steps, "Seek urgent care within 1 hour", map with facility pins rendered. [CRITICAL]
- [ ] 5.4: **Demo Scenario 4 — Emergency with Map:** Submit "adult is not breathing and unresponsive" with location enabled. Verify: `severity: "emergency"`, red banner, 3–5 steps, "Call emergency services now", 911 callout visible, map with hospital pins rendered. [CRITICAL]
- [ ] 5.5: **Demo Scenario 5 — Out-of-Scope Refusal:** Submit "what is the best restaurant near me". Verify: out-of-scope refusal UX rendered, no triage card, no map. [CRITICAL]
- [ ] 5.6: Test one-clarification-per-session limit: submit ambiguous query, receive clarification, submit another ambiguous answer, verify out-of-scope refusal rendered (no third API call). [CRITICAL]
- [ ] 5.7: Test geolocation denial: deny location permission, submit triage query, verify triage card renders without map, "Enable location to find nearby care" message shown.
- [ ] 5.8: Test 503 error state: temporarily break Lambda (invalid env var), submit query, verify error state renders with retry button and correct message.

### Mobile Device Testing

- [ ] 5.9: Open CloudFront URL on a physical mobile device (or BrowserStack). Test all five demo scenarios. Verify layout, touch targets, and map interaction.
- [ ] 5.10: Test on iOS Safari and Android Chrome. Verify geolocation prompt, map rendering, and directions handoff.

### Accessibility Audit

- [ ] 5.11: Run full keyboard navigation test: Tab through all interactive elements on landing, clarification, triage, and error views. Verify no focus traps, logical order.
- [ ] 5.12: Test with VoiceOver (iOS) or NVDA (desktop): navigate to triage result, verify severity, steps, and care tier are announced correctly. Verify `aria-live` regions announce loading and error states.
- [ ] 5.13: Run contrast check on all three severity banner colors. Confirm WCAG AAA (≥ 7:1) for severity label text. Confirm WCAG AA (≥ 4.5:1) for all other text.
- [ ] 5.14: Verify disclaimer footer is visible and readable on all views at 375px.

### Demo Preparation

- [ ] 5.15: Write demo script covering all five scenarios in order: clarification → self_care → urgent_care with map → emergency with map → out_of_scope. Target 90 seconds total. [CRITICAL]
- [ ] 5.16: Rehearse demo with full team. Identify any timing issues or UI rough edges. [CRITICAL]
- [ ] 5.17: Prepare fallback: screenshot or screen recording of each scenario in case of live demo failure.
- [ ] 5.18: Confirm CloudFront URL is accessible from demo device. Confirm location permission is pre-granted on demo device.
- [ ] 5.19: Verify CloudWatch logs show `reasoning` field for each triage request (demonstrates grounding).

### Stretch Goal: Voice Input (FR1.1)
> Only implement if Phases 1–4 are complete with time margin. Not on critical path.

- [ ] 5.20 [STRETCH]: Implement `useVoiceInput` hook using Web Speech API (`SpeechRecognition`). Detect browser support. [FR1.1]
- [ ] 5.21 [STRETCH]: Add microphone button to `QueryInput`. On click, start recognition. On result, populate text field. On error or unsupported browser, hide button silently. [FR1.1]
- [ ] 5.22 [STRETCH]: Test voice input on Chrome desktop and iOS Safari. Verify graceful fallback on unsupported browsers. [FR1.1]

---

## Post-Event Tasks

> Complete after the demo. Some of these have billing implications.

- [ ] POST-1: **[BILLING WARNING] Tear down OpenSearch Serverless collection.** OpenSearch Serverless continues to accrue charges even when idle. Delete the collection via AWS Console or CLI within 24 hours of demo completion. Estimated cost if left running: ~$700/month. [CRITICAL]
- [ ] POST-2: Delete or pause the Bedrock Knowledge Base (no ongoing charge once collection is deleted, but clean up for hygiene).
- [ ] POST-3: Delete or disable the Lambda function and API Gateway HTTP API if the project is not continuing.
- [ ] POST-4: Delete or disable the CloudFront distribution and empty/delete the frontend S3 bucket if the project is not continuing.
- [ ] POST-5: Retain the corpus S3 bucket and documents for potential future use. S3 storage cost is negligible.
- [ ] POST-6: Rotate or delete the Google Places API key in SSM Parameter Store if the project is not continuing.
- [ ] POST-7: Write a post-mortem: what worked, what didn't, what would be different in a production version.
