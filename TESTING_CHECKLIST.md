# FirstAid AI - Testing Checklist

## Pre-Demo Validation ✅

### Infrastructure Verification
- [ ] **AWS Bedrock Access**: Claude Sonnet 4 and Titan Text Embeddings v2 enabled
- [ ] **Knowledge Base**: Ingestion complete, test query returns chunks with score ≥ 0.5
- [ ] **Lambda Function**: Deployed and responding to test invocations
- [ ] **API Gateway**: CORS configured, POST /api/triage route working
- [ ] **CloudFront**: Distribution active, S3 origin accessible via OAC
- [ ] **SSM Parameter**: Google Places API key stored as SecureString

### Demo Scenarios (Critical Path)

#### Scenario 1: Clarification Flow
**Input:** `"I feel weird"`
- [ ] Returns `type: "clarification"`
- [ ] Question is ≤15 words
- [ ] Reason is valid enum value
- [ ] Frontend renders ClarificationView
- [ ] Original query shown as immutable
- [ ] Follow-up submission works: `"chest pain and left arm hurts"`
- [ ] Second submission returns triage response

#### Scenario 2: Self-Care
**Input:** `"I have a small paper cut on my finger"`
- [ ] Returns `type: "triage"`
- [ ] `severity: "self_care"`
- [ ] Green banner (`bg-green-500`) renders
- [ ] 3-5 steps, each ≤120 characters
- [ ] `careTier: "self_care"` → "Self-care at home"
- [ ] No emergency callout
- [ ] No map rendered
- [ ] `outOfScope: false`

#### Scenario 3: Urgent Care + Map
**Input:** `"my child burned their hand on the stove"` (location enabled)
- [ ] Returns `type: "triage"`
- [ ] `severity: "urgent_care"`
- [ ] Yellow banner (`bg-yellow-400`) renders
- [ ] 3-5 burn-specific steps
- [ ] `careTier: "urgent_care"` → "Seek urgent care within 1 hour"
- [ ] `facilities` array non-empty
- [ ] Map renders with facility pins
- [ ] User location marker distinct from facility pins
- [ ] Pin tap → popup with name + distance
- [ ] "Get Directions" button opens Google Maps

#### Scenario 4: Emergency + Map
**Input:** `"adult is not breathing and unresponsive"` (location enabled)
- [ ] Returns `type: "triage"`
- [ ] `severity: "emergency"`
- [ ] Red banner (`bg-red-600`) renders
- [ ] 3-5 CPR/emergency steps
- [ ] `careTier: "emergency"` → "Call emergency services now"
- [ ] Emergency callout: "Call 911" visible
- [ ] `facilities` array with hospitals
- [ ] Map renders with hospital pins
- [ ] All interactive elements ≥44×44px

#### Scenario 5: Out-of-Scope
**Input:** `"what is the best restaurant near me"`
- [ ] Returns `type: "triage"` with `outOfScope: true` OR similarity gate triggers
- [ ] OutOfScopeRefusal component renders
- [ ] No severity banner
- [ ] No steps list
- [ ] No map
- [ ] Plain language message with emergency number suggestion

### Error Handling
- [ ] **503 Parser Error**: Bedrock parser failure → error state with retry
- [ ] **503 Retrieval Error**: KB failure → error state with retry
- [ ] **503 Formatter Error**: Bedrock formatter failure → error state with retry
- [ ] **504 Timeout**: Lambda >15s → API Gateway timeout message
- [ ] **Places API Failure**: Continues with `facilities: []`, no crash
- [ ] **Geolocation Denied**: Triage works, shows "Enable location" message

### Performance Validation
- [ ] **End-to-end latency**: <5 seconds for happy path
- [ ] **Parser response**: <2 seconds
- [ ] **KB retrieval**: <1 second
- [ ] **Formatter response**: <2 seconds
- [ ] **Places API**: <1 second (when called)

### Accessibility Testing
- [ ] **Keyboard Navigation**: Tab through all elements, no focus traps
- [ ] **WCAG AAA Contrast**: Severity banners meet 7:1 ratio
- [ ] **Touch Targets**: All interactive elements ≥44×44px
- [ ] **Screen Reader**: VoiceOver/NVDA announces severity, steps, care tier
- [ ] **Loading States**: `aria-live="polite"` announcements
- [ ] **Error States**: `aria-live="assertive"` announcements

### Mobile Device Testing
- [ ] **375×667px (iPhone SE)**: All elements functional, no horizontal scroll
- [ ] **iOS Safari**: Geolocation prompt, map rendering, directions handoff
- [ ] **Android Chrome**: Same functionality as iOS
- [ ] **Location Permission**: Pre-grant for demo, test denial scenario

### CloudWatch Logging
- [ ] **Reasoning Field**: Logged server-side, stripped from client response
- [ ] **Error Logging**: Parser, retrieval, formatter failures logged
- [ ] **No Secrets**: API keys never logged

## Demo Day Preparation

### Pre-Demo Setup (5 minutes before)
- [ ] **Open CloudFront URL**: https://d32xsl7uhmmecy.cloudfront.net/
- [ ] **Grant Location Permission**: When prompted by browser
- [ ] **Open CloudWatch Logs**: In separate tab to show reasoning field
- [ ] **Test All 5 Scenarios**: Quick validation run
- [ ] **Prepare Fallback**: Screenshots/video ready

### Demo Script Timing
- [ ] **Scenario 1 (Clarification)**: 20 seconds
- [ ] **Scenario 2 (Self-Care)**: 15 seconds  
- [ ] **Scenario 3 (Urgent Care + Map)**: 20 seconds
- [ ] **Scenario 4 (Emergency + Map)**: 20 seconds
- [ ] **Scenario 5 (Out-of-Scope)**: 15 seconds
- [ ] **Total Demo Time**: 90 seconds
- [ ] **Q&A Buffer**: 2-3 minutes

### Fallback Materials
- [ ] **Screenshots**: Each scenario result captured
- [ ] **Screen Recording**: Full 90-second demo video
- [ ] **CloudWatch Screenshots**: Reasoning field examples
- [ ] **Architecture Diagram**: Visual for technical questions

## Post-Demo Teardown

### Cost Management
- [ ] **S3 Vector**: No urgent teardown needed (~$0.06/GB/month storage only)
- [ ] **Bedrock Knowledge Base**: Disable or delete
- [ ] **Lambda Function**: Delete or disable if not continuing
- [ ] **CloudFront**: Delete distribution if not continuing
- [ ] **S3 Bucket**: Empty and delete if not continuing

### Data Cleanup
- [ ] **SSM Parameter**: Delete Google Places API key
- [ ] **CloudWatch Logs**: Review retention settings
- [ ] **IAM Roles**: Clean up if not continuing

## Troubleshooting Guide

### Common Issues
| Issue | Cause | Solution |
|-------|-------|----------|
| 503 Parser Error | Bedrock model access | Check IAM permissions, model availability |
| Empty facilities array | Places API key missing | Verify SSM parameter exists |
| CORS errors | Wrong origin configured | Update API Gateway CORS settings |
| Map not rendering | Leaflet CSS missing | Check CSS import in index.html |
| Location not working | Permission denied | Grant permission, test fallback |

### Debug Commands
```bash
# Test Lambda directly
aws lambda invoke --function-name firstaid-ai-triage \
  --payload '{"body":"{\"query\":\"test\"}"}' response.json

# Check SSM parameter
aws ssm get-parameter --name "/firstaid-ai/places-api-key" --with-decryption

# View CloudWatch logs
aws logs describe-log-streams --log-group-name "/aws/lambda/firstaid-ai-triage"

# Test API Gateway
curl -X POST https://your-api-id.execute-api.region.amazonaws.com/api/triage \
  -H "Content-Type: application/json" \
  -d '{"query":"test query"}'
```

---

**Status**: [ ] All items checked and validated  
**Demo Ready**: [ ] Yes / [ ] No  
**Fallback Prepared**: [ ] Yes / [ ] No