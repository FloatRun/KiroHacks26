# FirstAid AI — Component Map

## Component Hierarchy

```
App
├── LandingView
│   └── QueryInput
├── ClarificationView
│   ├── ClarificationPrompt        (displays parser's question)
│   ├── OriginalQueryDisplay       (immutable label of first query)
│   └── ClarificationInput         (text field for clarifying answer)
├── TriageView
│   ├── SeverityBanner
│   ├── StepsList
│   ├── CareTierAction
│   ├── EmergencyNumberCallout     (only when severity === "emergency")
│   ├── FacilityMap                (only when facilities non-empty)
│   └── OutOfScopeRefusal          (only when outOfScope === true)
└── DisclaimerFooter               (persistent on all views)

LoadingState                       (shown while request in flight)
ErrorState                         (shown on 503/504)
```

---

## Component Responsibilities

### App
- Owns view state machine: `landing | loading | triage | clarification | error`
- Owns geolocation state (from `useGeolocation` hook)
- Owns clarification round-trip counter (max 1)
- On second consecutive `type: "clarification"` response, renders `OutOfScopeRefusal` without a third API call

### QueryInput
- Autofocused on mount
- 500-char limit with visible character counter
- Enter key and submit button both trigger submission
- Input and button disabled while request is in flight
- Optional microphone button (stretch goal FR1.1) — only rendered if `window.SpeechRecognition` or `window.webkitSpeechRecognition` exists

### ClarificationView
- Rendered when `response.type === "clarification"`
- Displays `question` prominently
- Shows original query as immutable text (not editable)
- On submit: concatenates `${originalQuery}. ${clarificationAnswer}` → POSTs as fresh request
- Tracks clarification count in state; if count ≥ 1 and next response is also clarification → render `OutOfScopeRefusal`

### SeverityBanner
- Props: `severity: "self_care" | "urgent_care" | "emergency"`
- Tailwind color classes: `bg-green-500` / `bg-yellow-400` / `bg-red-600`
- Text color: white, minimum 24px font size
- Must meet WCAG AAA contrast (≥ 7:1)
- Severity communicated by both color AND text label (never color alone)

### StepsList
- Renders `steps: string[]` as `<ol>` with `<li>` items
- Minimum 1.5× line height
- Each step is imperative voice, ≤ 120 characters

### CareTierAction
- Maps `careTier` to action label:
  - `self_care` → "Self-care at home"
  - `urgent_care` → "Seek urgent care within 1 hour"
  - `emergency` → "Call emergency services now"

### EmergencyNumberCallout
- Rendered only when `severity === "emergency"`
- Displays "Call 911" in large type
- Touch target ≥ 44×44px

### FacilityMap
- Rendered only when `facilities` is non-empty
- Leaflet map centered on user coordinates
- Facility pins: default marker
- User location: distinct marker icon
- Pin tap/click → popup with facility name + distance (miles or km)
- Popup includes "Get Directions" button → opens `https://www.google.com/maps/dir/?api=1&destination={lat},{lng}` in new tab
- Touch target for pins and button ≥ 44×44px
- Map tiles from OpenStreetMap (no API key)
- Not rendered when `facilities` is empty or location unavailable

### OutOfScopeRefusal
- Distinct UI — not a triage card
- Plain language message
- Includes suggestion to call emergency number directly

### DisclaimerFooter
- `<footer role="contentinfo">` — always rendered on all views
- Text: "Not medical advice. In an emergency, call your local emergency number directly."

### LoadingState
- Spinner or skeleton
- `aria-live="polite"` to announce loading to screen readers

### ErrorState
- Plain language error message (no raw status codes or stack traces)
- Retry button
- Message: "Service temporarily unavailable, please try again or call your local emergency number directly."
- `aria-live="assertive"` to announce error to screen readers

---

## Accessibility Requirements (All Components)

- All interactive elements reachable via keyboard (Tab, Enter, Space)
- All images, icons, non-text elements have `alt` or `aria-label`
- All touch targets ≥ 44×44px
- Semantic HTML throughout: `<main>`, `<section>`, `<h1>`–`<h3>`, `<ol>`, `<button>`, `<input>` with `<label>`
- WCAG AAA (≥ 7:1) contrast on `SeverityBanner`
- WCAG AA (≥ 4.5:1) contrast on all other text
- Loading and error states announced via `aria-live`

## Responsive Layout

- Primary target: 375×667px (iPhone SE)
- Supported up to 1440px desktop
- No horizontal scrolling at any supported width
- All elements fully functional at 375px
