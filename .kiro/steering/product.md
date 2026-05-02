# FirstAid AI — Product

## Summary

FirstAid AI is a serverless web application that delivers structured, grounded first-aid triage guidance in under 5 seconds. Users describe an emergency in plain language; the system returns a color-coded severity assessment, 3–5 imperative action steps, a care tier recommendation (self-care / urgent care / emergency), and optionally a map of nearby facilities.

## Target Users

Underserved populations who need fast, free, no-account emergency guidance: uninsured individuals, rural residents, non-native English speakers, low-income households, and first-time caregivers.

## Core User Flow

1. User opens the app — text input is autofocused
2. User types a description (e.g., "my son burned his hand on the stove") and submits
3. If the query is ambiguous, a single clarification question is shown; user answers and resubmits
4. A triage card is rendered: severity banner (green/yellow/red), numbered steps, care tier label
5. If care tier is urgent_care or emergency and location is available, a Leaflet map shows nearby facilities

## Key Constraints

- No login, accounts, or data retention — ever
- No payment or premium tier
- Single request/response — no conversation history
- Maximum one clarification round-trip per session
- 5-second end-to-end latency target
- v1 scope: 15–20 medical scenarios only (burns, cuts, choking, allergic reactions, head injuries, chest pain, fainting, poisoning, sprains, eye injuries, nosebleeds, animal bites, seizures, asthma attacks, hypoglycemia)

## Out of Scope (v1)

Photo input, PWA/offline mode, i18n, user accounts, insurance filtering, push notifications, admin panel, multi-region deployment, custom domain, more than one clarification round-trip.
