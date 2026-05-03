# FirstAid AI - Project Description

## Overview

FirstAid AI is a serverless web application that delivers structured, grounded first-aid triage guidance in under 5 seconds. Built specifically for underserved populations facing emergency healthcare navigation barriers, the system accepts free-form natural language descriptions of medical emergencies and returns color-coded severity assessments, imperative action steps, care tier recommendations, and maps of nearby medical facilities.

## Core Problem Statement

**The 30-second window between "something just happened" and "what do I do" is where people make life-or-death decisions.**

Existing solutions fail underserved communities:
- **Google searches** return SEO-farmed content with hedged language
- **ChatGPT** provides general advice with medical disclaimers
- **911 operators** are overwhelmed and may not provide first-aid guidance
- **Telehealth apps** require accounts, insurance, and payment

**Target Communities:**
- **Uninsured individuals** who can't afford wrong care-tier decisions (ER vs. urgent care vs. home)
- **Rural populations** facing 45+ minute transport times who need to know whether to drive or manage at home
- **Non-native English speakers** who struggle with medically hedged prose and need clear, imperative instructions
- **Low-income households** requiring free, no-account, no-tracking emergency guidance
- **First-time parents and caregivers** lacking experience to calibrate severity in pediatric emergencies

## Features & Functionality

### Core Triage Pipeline

**Two-Stage LLM Architecture:**
1. **Parser Stage**: Determines whether to retrieve medical information or ask for clarification
2. **Formatter Stage**: Structures retrieved medical protocols into actionable triage cards

**Input Processing:**
- Free-form natural language (up to 500 characters)
- Intelligent clarification when queries are too vague
- One clarification round-trip maximum (prevents conversation loops)

**Output Generation:**
- **Severity Assessment**: Self-care (green) / Urgent care (yellow) / Emergency (red)
- **Action Steps**: 3-5 imperative instructions, each ≤120 characters
- **Care Tier Recommendation**: "Self-care at home" / "Seek urgent care within 1 hour" / "Call emergency services now"
- **Emergency Callout**: Prominent 911 button for emergency-level situations

### Intelligent Facility Finding

**Location-Aware Recommendations:**
- Geolocation prefetch on page load (graceful degradation if denied)
- Google Places API integration for nearby medical facilities
- **Urgent Care**: Searches "urgent care" keyword within 10km radius
- **Emergency**: Searches hospitals within 15km radius
- Results filtered to currently open facilities only

**Interactive Map:**
- Leaflet map with OpenStreetMap tiles (no API key required)
- Facility pins with distance calculations
- User location marker (distinct from facility pins)
- Tap-to-reveal facility details with "Get Directions" handoff to Google Maps

### Safety-First Design

**Grounded Medical Advice:**
- Bedrock Knowledge Base with curated medical corpus (NHS 111, MedlinePlus, CDC, Red Cross, WHO)
- Similarity threshold gating (score <0.5 triggers out-of-scope refusal)
- Reasoning field logged server-side, stripped from client responses
- Over-escalation bias in severity assessment ("when in doubt, escalate")

**Privacy & Equity Architecture:**
- No user accounts, authentication, or session persistence
- No payment tiers or premium features
- No tracking pixels, analytics, or behavioral telemetry
- No data retention beyond single request duration

### Accessibility & Inclusion

**WCAG AAA Compliance:**
- Severity banners meet 7:1 contrast ratio
- All interactive elements ≥44×44px touch targets
- Complete keyboard navigation support
- Screen reader compatibility with semantic HTML and ARIA labels
- Loading and error states announced via `aria-live` regions

**Mobile-First Design:**
- Primary target: 375×667px (iPhone SE)
- Responsive up to 1440px desktop
- No horizontal scrolling at any supported width
- Touch-optimized map interactions

## Technical Innovation

### Serverless RAG Architecture

**AWS Bedrock Integration:**
- **Claude Sonnet 4**: Parser and formatter LLM invocations with forced tool use
- **Knowledge Base**: Vector search across curated medical protocols
- **Titan Text Embeddings v2**: Semantic similarity matching
- **OpenSearch Serverless**: Vector store for medical corpus

**Lambda Pipeline:**
```
Request → Parser → KB Retrieval → Similarity Gate → Formatter → Places API → Response
```

**Performance Targets:**
- End-to-end latency: <5 seconds
- Parser response: <2 seconds
- KB retrieval: <1 second
- Formatter response: <2 seconds

### Security & Reliability

**Least-Privilege IAM:**
- Bedrock permissions scoped to specific model ARNs
- Knowledge Base access limited to single KB ARN
- SSM Parameter access restricted to Places API key path only

**Graceful Degradation:**
- Parser failure → 503 with retry option
- KB retrieval failure → 503 with retry option
- Formatter failure → 503 with retry option
- Places API failure → triage response with empty facilities array
- Geolocation denial → triage works, shows "Enable location" message

**Error Handling:**
- Every failure mode includes path forward (retry or call 911)
- No raw status codes or stack traces exposed to users
- Plain language error messages

## Demo Scenarios

The application handles five distinct user journeys:

### 1. Clarification Flow
**Input**: `"I feel weird"`
**Response**: Intelligent follow-up question
**Demonstrates**: Parser's ability to identify insufficient information and request specific clarification

### 2. Self-Care Scenario
**Input**: `"I have a small paper cut on my finger"`
**Response**: Green severity banner, home care instructions, no facility map
**Demonstrates**: Appropriate de-escalation for minor injuries

### 3. Urgent Care with Map
**Input**: `"my child burned their hand on the stove"`
**Response**: Yellow severity banner, burn-specific first aid, urgent care facility map
**Demonstrates**: Pediatric context affecting severity, facility finding integration

### 4. Emergency with Map
**Input**: `"adult is not breathing and unresponsive"`
**Response**: Red severity banner, CPR instructions, 911 callout, hospital map
**Demonstrates**: Maximum severity escalation with emergency protocols

### 5. Out-of-Scope Refusal
**Input**: `"what is the best restaurant near me"`
**Response**: Graceful refusal with safety net suggestion
**Demonstrates**: Non-medical query detection and safe fallback

## Social Impact & Scalability

### Measurable Outcomes

**Accessibility Improvements:**
- Zero-barrier access (no accounts, no payment, no app installation)
- Sub-5-second response time vs. minutes for traditional healthcare navigation
- Plain language instructions vs. medically hedged prose
- Visual severity coding for users with varying health literacy

**Cost Reduction:**
- Prevents inappropriate ER visits for self-care conditions
- Reduces urgent care visits that should be ER cases
- Eliminates "Dr. Google" misinformation leading to wrong care decisions

**Geographic Equity:**
- Works in rural areas with limited healthcare infrastructure
- Provides facility finding for areas without local medical knowledge
- Functions on low-bandwidth connections via CloudFront CDN

### Scalability Model

**Technical Scalability:**
- Serverless architecture auto-scales to thousands of concurrent users
- No operational overhead or server management required
- Global CDN distribution for low-latency access

**Cost Structure:**
- Development: ~$50/month (Lambda + API Gateway + CloudFront)
- Production (1K users/day): ~$200/month
- Marginal cost per user: <$0.01

**Content Scalability:**
- Medical corpus can be extended to additional scenarios without architectural changes
- Localization possible by swapping knowledge base content
- Multiple language support via corpus translation

## Future Enhancements

**Phase 2 Capabilities:**
- Voice input via Web Speech API (already stubbed in codebase)
- PWA installation for offline access to cached protocols
- Multi-language support with locale-specific medical guidance
- Integration with local emergency services for direct handoff

**Advanced Features:**
- Photo input for visual assessment (burns, wounds, rashes)
- Integration with wearable devices for vital sign context
- Telemedicine handoff for complex cases requiring human assessment
- Community health worker training mode

## Technical Specifications

**Frontend Stack:**
- React 18 with TypeScript (strict mode)
- Vite build system for fast development and optimized production builds
- Tailwind CSS for utility-first styling
- Leaflet + react-leaflet for mapping (OpenStreetMap tiles)

**Backend Stack:**
- AWS Lambda (Node.js 20.x runtime)
- API Gateway HTTP API with CORS configuration
- CloudFront distribution with Origin Access Control
- S3 static website hosting

**AI/ML Stack:**
- Amazon Bedrock Claude Sonnet 4 for LLM processing
- Amazon Bedrock Knowledge Base for RAG implementation
- Amazon Titan Text Embeddings v2 for semantic search
- OpenSearch Serverless for vector storage

**External Integrations:**
- Google Places API for facility finding
- AWS Systems Manager Parameter Store for secure key management
- CloudWatch for logging and monitoring

## Conclusion

FirstAid AI represents a novel approach to emergency healthcare navigation that prioritizes speed, accessibility, and safety for underserved populations. By combining serverless RAG architecture with real-time facility finding and safety-first design principles, the application addresses the critical 30-second decision window that can determine health outcomes in emergency situations.

The project demonstrates how modern AI capabilities can be responsibly deployed in healthcare contexts through grounded retrieval, similarity thresholding, and over-escalation bias, while maintaining the privacy and equity requirements essential for serving vulnerable communities.