# FirstAid AI — Demo Scenarios

Five scenarios must work end-to-end for a passing demo. Test in this order.

---

## Scenario 1 — Clarification

**Input:** `"I feel weird"`

**Expected pipeline:**
- Parser → `action: "clarify"`, `reason: "too_vague"`
- Lambda returns clarification response immediately (no KB or formatter call)

**Expected API response:**
```json
{
  "type": "clarification",
  "question": "Where do you feel weird — chest, head, stomach, or somewhere else?",
  "reason": "too_vague"
}
```

**Expected UI:** `ClarificationView` rendered with question prominent, original query shown as immutable label.

**Follow-up submission:** User types clarifying answer (e.g., `"chest pain and left arm hurts"`). Frontend POSTs `"I feel weird. chest pain and left arm hurts"`. Pipeline proceeds to retrieve → format → triage response.

**One-clarification limit:** If the second submission also returns `type: "clarification"`, frontend renders `OutOfScopeRefusal` without a third API call.

---

## Scenario 2 — Self-Care

**Input:** `"I have a small paper cut on my finger"`

**Expected pipeline:**
- Parser → `action: "retrieve"`, `normalizedQuery` ≈ `"minor finger laceration first aid"`
- KB retrieval → chunks with score ≥ 0.5
- Formatter → `severity: "self_care"`, 3–5 steps, `careTier: "self_care"`, `outOfScope: false`

**Expected API response:**
```json
{
  "type": "triage",
  "severity": "self_care",
  "steps": ["...", "...", "..."],
  "careTier": "self_care",
  "outOfScope": false
}
```

**Expected UI:**
- `SeverityBanner` green (`bg-green-500`)
- `StepsList` with 3–5 numbered steps
- `CareTierAction` → "Self-care at home"
- No `EmergencyNumberCallout`
- No `FacilityMap`

---

## Scenario 3 — Urgent Care with Map

**Input:** `"my child burned their hand on the stove"` (location enabled)

**Expected pipeline:**
- Parser → `action: "retrieve"`, `normalizedQuery` ≈ `"pediatric thermal burn hand first aid"`
- KB retrieval → chunks with score ≥ 0.5
- Formatter → `severity: "urgent_care"`, 3–5 steps, `careTier: "urgent_care"`, `outOfScope: false`
- Places API → top 3–5 urgent care facilities near user location

**Expected API response:**
```json
{
  "type": "triage",
  "severity": "urgent_care",
  "steps": ["...", "...", "...", "..."],
  "careTier": "urgent_care",
  "outOfScope": false,
  "facilities": [
    { "name": "...", "address": "...", "distanceMeters": 1200, "openNow": true, "lat": ..., "lng": ..., "placeId": "..." }
  ]
}
```

**Expected UI:**
- `SeverityBanner` yellow (`bg-yellow-400`)
- `CareTierAction` → "Seek urgent care within 1 hour"
- `FacilityMap` rendered with facility pins and user marker
- Pin tap → popup with name, distance, "Get Directions" button

---

## Scenario 4 — Emergency with Map

**Input:** `"adult is not breathing and unresponsive"` (location enabled)

**Expected pipeline:**
- Parser → `action: "retrieve"`, `normalizedQuery` ≈ `"adult unresponsive not breathing CPR emergency"`
- KB retrieval → chunks with score ≥ 0.5
- Formatter → `severity: "emergency"`, 3–5 steps, `careTier: "emergency"`, `outOfScope: false`
- Places API → top 3–5 hospitals near user location

**Expected API response:**
```json
{
  "type": "triage",
  "severity": "emergency",
  "steps": ["...", "...", "...", "..."],
  "careTier": "emergency",
  "outOfScope": false,
  "facilities": [...]
}
```

**Expected UI:**
- `SeverityBanner` red (`bg-red-600`)
- `CareTierAction` → "Call emergency services now"
- `EmergencyNumberCallout` visible → "Call 911"
- `FacilityMap` rendered with hospital pins and user marker

---

## Scenario 5 — Out-of-Scope Refusal

**Input:** `"what is the best restaurant near me"`

**Expected pipeline:**
- Parser → `action: "retrieve"` (non-medical but retrieval attempted), OR `action: "clarify"` with `reason: "non_medical"`
- If retrieved: KB similarity scores all < 0.5 → out-of-scope gate triggers
- If clarify with non_medical: Lambda returns clarification response; frontend treats as out-of-scope after one round

**Expected API response (similarity gate path):**
```json
{
  "type": "triage",
  "severity": "self_care",
  "steps": [],
  "careTier": "self_care",
  "outOfScope": true
}
```

**Expected UI:**
- `OutOfScopeRefusal` rendered — distinct UI, not a triage card
- No severity banner, no steps list, no map
- Plain language message with suggestion to call emergency number if needed

---

## Demo Order and Timing

Run scenarios in order 1 → 2 → 3 → 4 → 5. Target 90 seconds total.

| Scenario | Target time |
|---|---|
| 1 — Clarification | ~20s |
| 2 — Self-care | ~15s |
| 3 — Urgent care + map | ~20s |
| 4 — Emergency + map | ~20s |
| 5 — Out-of-scope | ~15s |

**Pre-demo checklist:**
- Location permission pre-granted on demo device
- CloudFront URL confirmed accessible
- CloudWatch logs open to show `reasoning` field (demonstrates grounding)
- Screenshot/recording fallback prepared for each scenario
