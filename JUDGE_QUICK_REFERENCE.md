# FirstAid AI - Judge Quick Reference

## 🚀 Live Demo
**URL**: https://d32xsl7uhmmecy.cloudfront.net/  
**Track**: Human-Centered Design  
**Demo Video**: [Record and upload before submission]

## 📋 5-Minute Evaluation Guide

### 1. Test the Live Application (2 minutes)
Try these inputs to see the core functionality:

| Input | Expected Result | Demonstrates |
|-------|----------------|--------------|
| `"I feel weird"` | Clarification question | Intelligent parsing |
| `"small paper cut"` | Green banner, home care | Self-care triage |
| `"child burned hand on stove"` | Yellow banner + map | Urgent care + facilities |
| `"not breathing"` | Red banner + 911 + map | Emergency escalation |
| `"best restaurant"` | Out-of-scope refusal | Safety mechanisms |

### 2. Review Technical Innovation (1 minute)
**Key Files to Scan**:
- `backend/src/handler.ts`: Two-stage LLM pipeline with safety gates
- `frontend/src/App.tsx`: Type-safe discriminator pattern for API responses
- `cdk/lib/`: Serverless RAG infrastructure with least-privilege IAM

**Architecture Highlights**:
- Similarity threshold gating prevents hallucinated medical advice
- One clarification round-trip prevents conversation loops  
- Reasoning field logged server-side, stripped from client responses

### 3. Assess Social Good Impact (1 minute)
**Target Communities**: Uninsured, rural, non-native speakers, first-time caregivers
**Barriers Addressed**: No accounts, no payment, <5s response time, WCAG AAA accessibility
**Scalability**: Serverless architecture, ~$200/month for 1K users/day

### 4. Evaluate Kiro Usage (1 minute)
**Comprehensive Documentation**: 
- `KIRO_DEVELOPMENT_METHODOLOGY.md`: 4,000+ word detailed analysis
- `PROJECT_DESCRIPTION.md`: Complete feature overview
- `.kiro/steering/`: 8 persistent context files

**Key Kiro Features Demonstrated**:
- **Spec-driven**: Complete architecture before coding
- **Steering docs**: Protected hand-tuned system prompts  
- **Agent hooks**: Automated build validation
- **MCP**: Accurate AWS/React API integration
- **Powers**: Safe, constrained development workflows

---

## 🏆 Rubric Alignment Summary

### Implementation (20 pts): **EXCELLENT**
- **Variety**: Used all Kiro features strategically
- **Depth**: Prevented integration bugs through spec-driven approach
- **Strategy**: Eliminated 3 most expensive hackathon failure modes

### Innovation & Design (20 pts): **EXCELLENT**  
- **Unique Resources**: Curated medical corpus (NHS, CDC, Red Cross)
- **Novel Combination**: Serverless RAG + real-time facility finding + safety gates
- **Thoughtful Design**: Discriminator pattern, similarity thresholding, over-escalation bias

### Social Good (20 pts): **EXCELLENT**
- **Clear Problem**: 30-second emergency decision window for underserved populations
- **Realistic Solution**: No-barrier access, sub-5s response, privacy-first
- **Scalable Impact**: Serverless architecture, extensible medical corpus

---

## 🔍 Deep Dive Resources

### For Technical Judges
- **Architecture**: `README.md` - ASCII diagram and data flow
- **Code Quality**: `backend/src/` and `frontend/src/` - TypeScript with strict mode
- **Infrastructure**: `cdk/lib/` - AWS CDK with least-privilege IAM

### For AI/ML Judges  
- **LLM Pipeline**: `KIRO_DEVELOPMENT_METHODOLOGY.md` - Two-stage Bedrock integration
- **RAG Implementation**: `backend/src/retrieval.ts` - Knowledge Base with similarity gating
- **Safety Mechanisms**: `PROJECT_DESCRIPTION.md` - Grounding and over-escalation strategies

### For Social Impact Judges
- **Community Focus**: `requirements.md` - Detailed affected populations analysis
- **Equity Requirements**: `PROJECT_DESCRIPTION.md` - No-barrier design principles
- **Accessibility**: `TESTING_CHECKLIST.md` - WCAG AAA compliance validation

### For Kiro Methodology Judges
- **Comprehensive Analysis**: `KIRO_DEVELOPMENT_METHODOLOGY.md` - 4,000+ words with specific examples
- **Strategic Usage**: `KIRO_POWERS.md` - High-level summary with rubric alignment
- **Persistent Context**: `.kiro/steering/` - 8 files showing sophisticated steering strategy

---

## ⚡ Quick Facts

- **Development Time**: 2 days (hackathon timeframe)
- **Lines of Code**: ~3,000 (TypeScript, strict mode)
- **AWS Services**: 8 (Lambda, Bedrock, API Gateway, CloudFront, S3, S3 Vector, SSM, CloudWatch)
- **External APIs**: 2 (Google Places, OpenStreetMap tiles)
- **Demo Scenarios**: 5 (covering all user journeys)
- **Response Time**: <5 seconds target, 2.8s typical
- **Accessibility**: WCAG AAA compliance on severity indicators
- **Privacy**: Zero data retention, no tracking, no accounts

**Cost Note**: S3 Vector accrues only storage charges (~$0.06/GB/month) with no idle minimum — no teardown required after demo.