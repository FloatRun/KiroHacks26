# FirstAid AI — Project Structure

## Repository Layout

```
/
├── requirements.md          # Functional, non-functional, accessibility, equity requirements
├── design.md                # Architecture, API contract, LLM pipeline, component hierarchy
├── tasks.md                 # Phased implementation task list with critical path
├── .kiro/
│   └── steering/            # Persistent AI context files
│       ├── product.md
│       ├── tech.md
│       └── structure.md
├── frontend/                # React + Vite + TypeScript SPA
│   ├── src/
│   │   ├── api/
│   │   │   └── triage.ts    # postTriage() API client
│   │   ├── components/
│   │   │   ├── QueryInput.tsx
│   │   │   ├── SeverityBanner.tsx
│   │   │   ├── StepsList.tsx
│   │   │   ├── CareTierAction.tsx
│   │   │   ├── EmergencyNumberCallout.tsx
│   │   │   ├── ClarificationView.tsx
│   │   │   ├── FacilityMap.tsx
│   │   │   ├── OutOfScopeRefusal.tsx
│   │   │   ├── DisclaimerFooter.tsx
│   │   │   ├── LoadingState.tsx
│   │   │   └── ErrorState.tsx
│   │   ├── hooks/
│   │   │   └── useGeolocation.ts
│   │   ├── types/
│   │   │   └── api.ts       # Shared TypeScript types (TriageRequest, TriageResponse, etc.)
│   │   ├── views/
│   │   │   ├── LandingView.tsx
│   │   │   └── TriageView.tsx
│   │   └── App.tsx          # View state machine: landing → loading → triage|clarification|error
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── package.json
├── backend/                 # Lambda function (Node.js 20.x, TypeScript, esbuild)
│   ├── src/
│   │   ├── handler.ts       # Lambda entry point — orchestrates the full pipeline
│   │   ├── parser.ts        # invokeParser() — Stage 1 Bedrock call
│   │   ├── retrieval.ts     # retrieveFromKnowledgeBase() — Stage 2 KB call
│   │   ├── formatter.ts     # invokeFormatter() — Stage 3 Bedrock call
│   │   ├── places.ts        # findNearbyFacilities() — Google Places call
│   │   ├── ssm.ts           # getPlacesApiKey() — SSM cold-start cache
│   │   └── types/
│   │       └── api.ts       # Shared types (mirrors frontend types/api.ts)
│   ├── esbuild.config.js
│   └── package.json
└── corpus/                  # Medical protocol documents for Bedrock Knowledge Base
    └── {scenario-tag}-{source}-{sequence}.txt
        # e.g., burns-nhs-001.txt, choking-redcross-001.txt
```

## Naming Conventions

- **Corpus files:** `{scenario-tag}-{source}-{sequence}.txt` — e.g., `burns-nhs-001.txt`
- **React components:** PascalCase, one component per file
- **Hooks:** camelCase prefixed with `use` — e.g., `useGeolocation.ts`
- **API types:** defined in `types/api.ts`, shared between frontend and backend
- **Lambda modules:** one concern per file (parser, retrieval, formatter, places, ssm)

## Architecture Boundaries

- **Frontend** never calls Bedrock, SSM, or Google Places directly — all goes through `POST /api/triage`
- **Lambda handler** (`handler.ts`) is the sole orchestrator — it calls parser, retrieval, formatter, and places in sequence
- **`reasoning` field** from the formatter is logged to CloudWatch and stripped before the response reaches the client
- **Places API key** is read from SSM at Lambda cold start and cached in module scope — never hardcoded or logged
- **Geolocation** is prefetched on page load and passed in the request body — Lambda never calls geolocation APIs

## Frontend View State Machine

```
landing → (submit) → loading → triage
                             → clarification → (submit) → loading → triage
                                                                   → out-of-scope (if 2nd clarify)
                             → error (503/504)
```

## Critical Files

| File | Role |
|---|---|
| `backend/src/handler.ts` | Lambda orchestration — do not add business logic here, delegate to modules |
| `frontend/src/types/api.ts` | Source of truth for all API shapes — keep in sync with backend types |
| `frontend/src/App.tsx` | View state machine — all view transitions live here |
| `design.md` | Authoritative reference for tool schemas, system prompts, and API contract |
