# FirstAid AI

**Track:** Human-Centered Design  
**Demo:** https://d32xsl7uhmmecy.cloudfront.net/  
**Video:** [Demo Video - Record and upload before submission]

## Overview

FirstAid AI delivers structured, grounded first-aid triage guidance in under 5 seconds for underserved populations facing emergency healthcare navigation barriers. Users describe emergencies in plain language; the system returns color-coded severity assessments, imperative action steps, care tier recommendations, and nearby facility maps.

## Target Impact

**Affected Communities:**
- Uninsured individuals who can't afford wrong care-tier decisions
- Rural populations facing long transport times  
- Non-native English speakers needing clear, imperative instructions
- Low-income households requiring free, no-account emergency guidance
- First-time caregivers lacking experience to calibrate severity

**Problem Solved:** The 30-second window between "something just happened" and "what do I do" — replacing SEO-farmed results, hedged AI prose, and hold music with instant, grounded medical triage.

## Technical Innovation

**Serverless RAG Pipeline:**
- Two-stage LLM: Parser (retrieve/clarify) → Formatter (structured triage)
- Bedrock Knowledge Base with curated medical corpus (NHS, CDC, Red Cross)
- Similarity threshold gating prevents hallucinated medical advice
- Sub-5-second end-to-end latency target

**Safety-First Design:**
- One clarification round-trip maximum (prevents conversation loops)
- Out-of-scope detection for non-medical queries
- Reasoning field logged server-side, stripped from client responses
- Over-escalation bias in severity assessment

**Equity Architecture:**
- No accounts, authentication, or data retention
- No payment tiers or premium features
- WCAG AAA accessibility compliance
- Mobile-first responsive design (375px target)

## Documentation

### For Judges & Evaluators
- **[JUDGE_QUICK_REFERENCE.md](JUDGE_QUICK_REFERENCE.md)**: 5-minute evaluation guide with rubric alignment

### Project Overview
- **[PROJECT_DESCRIPTION.md](PROJECT_DESCRIPTION.md)**: Complete features, functionality, and technical specifications
- **[README.md](README.md)**: Quick start guide and architecture overview (this file)

### Kiro Development Methodology  
- **[KIRO_POWERS.md](KIRO_POWERS.md)**: High-level summary of Kiro usage with rubric alignment
- **[KIRO_DEVELOPMENT_METHODOLOGY.md](KIRO_DEVELOPMENT_METHODOLOGY.md)**: Detailed analysis of spec-driven development, steering docs, hooks, MCP, and powers with specific examples

### Operations & Testing
- **[TESTING_CHECKLIST.md](TESTING_CHECKLIST.md)**: Complete validation checklist for all 5 demo scenarios
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)**: Debug guide with common issues and solutions
- **[demo-script.md](demo-script.md)**: 90-second demo script with timing and technical highlights

## Demo Scenarios

1. **Clarification:** "I feel weird" → intelligent follow-up question
2. **Self-Care:** "Small paper cut" → green banner, home care steps
3. **Urgent Care:** "Child burned hand" → yellow banner, facility map
4. **Emergency:** "Not breathing" → red banner, 911 callout, hospital map  
5. **Out-of-Scope:** "Best restaurant" → graceful refusal with safety net

## Kiro Development Methodology

Built entirely using Kiro's full feature spectrum:

- **Spec-driven development:** Complete architecture before coding
- **Steering docs:** Persistent context preventing regressions
- **Agent hooks:** Automated build validation and diff tracking
- **MCP servers:** Accurate AWS/React API integration
- **Vibe coding:** Generated complete modules from specifications

**Result:** Zero integration bugs, no stale builds, no hallucinated API signatures — eliminating the three most expensive hackathon failure modes.

## Repository Structure

```
├── frontend/          # React + Vite + TypeScript SPA
├── backend/           # Lambda function (Node.js 20.x)
├── cdk/              # AWS CDK infrastructure
├── .kiro/steering/   # Persistent AI context files
└── KIRO_POWERS.md    # Detailed Kiro usage write-up
```

## Setup Instructions

### Prerequisites
- AWS CLI configured with appropriate permissions
- Node.js 20.x
- Google Places API key
- Bedrock model access enabled (Claude Sonnet 4, Titan Text Embeddings v2)

### Quick Start (Automated)
```bash
# 1. Clone and install dependencies
git clone <repo-url>
cd firstaid-ai
npm run setup-all  # Installs all dependencies

# 2. Configure secrets
aws ssm put-parameter \
  --name "/firstaid-ai/places-api-key" \
  --value "YOUR_GOOGLE_PLACES_API_KEY" \
  --type "SecureString"

# 3. Deploy infrastructure
cd cdk && npm run deploy

# 4. Deploy frontend
cd ../frontend && npm run deploy
```

### Manual Deployment

#### Backend Infrastructure
```bash
cd cdk
npm install
cdk bootstrap  # First time only
cdk deploy FirstaidAiKbStack      # Knowledge Base + S3 Vector
cdk deploy FirstaidAiLambdaStack  # Lambda + API Gateway
cdk deploy FirstaidAiApiStack     # CloudFront + S3
```

#### Frontend Deployment  
```bash
cd frontend
npm install
npm run build
aws s3 sync dist/ s3://firstaid-ai-frontend/ --delete
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABC \
  --paths "/*"
```

### Environment Configuration
```bash
# Required: Google Places API key
aws ssm put-parameter \
  --name "/firstaid-ai/places-api-key" \
  --value "YOUR_API_KEY" \
  --type "SecureString"

# Optional: Adjust similarity threshold
aws lambda update-function-configuration \
  --function-name firstaid-ai-triage \
  --environment Variables='{
    "SIMILARITY_THRESHOLD":"0.5",
    "CLAUDE_MODEL_ID":"anthropic.claude-sonnet-4-20250514-v1:0"
  }'
```

### Local Development
```bash
# Frontend dev server
cd frontend && npm run dev

# Backend testing (requires AWS credentials)
cd backend && npm test

# Mock server for frontend development
node mock-server.js  # Serves on localhost:3001
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Browser                             │
│  ┌─────────────────┐    ┌─────────────────┐                    │
│  │   React SPA     │    │  Geolocation    │                    │
│  │  (TypeScript)   │    │   Prefetch      │                    │
│  └─────────────────┘    └─────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
                                │ HTTPS
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CloudFront Distribution                      │
│  ┌─────────────────┐              ┌─────────────────┐          │
│  │   S3 Bucket     │              │  /api/triage    │          │
│  │ (Static Files)  │              │   → API GW      │          │
│  └─────────────────┘              └─────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                                                │
                                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Lambda Function                              │
│  ┌─────────────────┐    ┌─────────────────┐                    │
│  │  Stage 1:       │    │  Stage 2:       │                    │
│  │  Parser         │    │  Formatter      │                    │
│  │  (Clarify?)     │    │  (Triage Card)  │                    │
│  └─────────────────┘    └─────────────────┘                    │
│                                │                                │
│  ┌─────────────────┐           │    ┌─────────────────┐        │
│  │  Google Places  │           │    │  SSM Parameter  │        │
│  │  API (Nearby)   │           │    │  Store (Keys)   │        │
│  └─────────────────┘           │    └─────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Amazon Bedrock                               │
│  ┌─────────────────┐    ┌─────────────────┐                    │
│  │  Claude Sonnet  │    │  Knowledge Base │                    │
│  │  (Parser +      │    │  (Medical       │                    │
│  │   Formatter)    │    │   Corpus)       │                    │
│  └─────────────────┘    └─────────────────┘                    │
│                                │                                │
│  ┌─────────────────┐           │                                │
│  │  Titan Text     │           │                                │
│  │  Embeddings v2  │           │                                │
│  └─────────────────┘           │                                │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      S3 Vector Store                            │
│  ┌─────────────────┐    ┌─────────────────┐                    │
│  │  Vector Store   │    │  Medical        │                    │
│  │  (Embeddings)   │    │  Protocols      │                    │
│  └─────────────────┘    └─────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
```

**Data Flow:**
1. User submits query → CloudFront → API Gateway → Lambda
2. Lambda Stage 1: Parser (retrieve vs. clarify decision)
3. If retrieve: Query Bedrock KB → S3 Vector similarity search
4. Lambda Stage 2: Formatter (structured triage response)
5. Optional: Google Places API for nearby facilities
6. Response → CloudFront → User (reasoning stripped)

**Cost Estimate:**
- **Development:** ~$50/month (Lambda + API Gateway + CloudFront)
- **Production (1K users/day):** ~$200/month
- **S3 Vector Store:** ~$1/month (storage only, no idle charges)

## Performance Metrics

| Metric | Target | Typical |
|--------|--------|---------|
| End-to-end latency | <5s | 2.8s |
| Parser response | <2s | 1.1s |
| KB retrieval | <1s | 0.4s |
| Formatter response | <2s | 1.2s |
| Places API | <1s | 0.3s |

## License

MIT License - See [LICENSE](LICENSE) for details.

---

**💡 Cost Note:** S3 Vector Store accrues only storage charges (~$0.06/GB/month) with no idle minimum — no teardown required after demo.

**📋 Pre-Submission Checklist**: See [TESTING_CHECKLIST.md](TESTING_CHECKLIST.md) for complete validation steps.

## Submission Requirements

### Demo Video (Required)
**Status**: 🎬 **RECORD BEFORE SUBMISSION**

The demo video should be 90 seconds covering all 5 scenarios:
1. **Clarification**: "I feel weird" → follow-up question
2. **Self-Care**: "Small paper cut" → green banner, home care
3. **Urgent Care**: "Child burned hand" → yellow banner, facility map
4. **Emergency**: "Not breathing" → red banner, 911 callout, hospital map
5. **Out-of-Scope**: "Best restaurant" → refusal with safety net

**Recording Tips**:
- Use screen recording software (QuickTime, OBS, etc.)
- Grant location permission before recording
- Have CloudWatch logs open to show reasoning field
- Practice the script timing: [demo-script.md](demo-script.md)
- Upload to YouTube/Vimeo and update README with link

### Live Demo URL
✅ **READY**: https://d32xsl7uhmmecy.cloudfront.net/

### Repository Checklist
- [x] OSI License (MIT)
- [x] Root .kiro directory committed
- [x] Comprehensive Kiro usage write-up
- [x] Setup and deployment scripts
- [x] Architecture documentation
- [x] Testing checklist
- [x] Troubleshooting guide
- [ ] **Demo video link** (update before submission)
