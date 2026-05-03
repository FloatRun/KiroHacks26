# FirstAid AI - Troubleshooting Guide

## Quick Diagnosis

### Is the app loading at all?
- **URL**: https://d32xsl7uhmmecy.cloudfront.net/
- **Expected**: React app loads, text input is focused
- **If not**: Check CloudFront distribution status, S3 bucket contents

### Can you submit a query?
- **Test input**: `"hello"`
- **Expected**: Loading state, then triage response or clarification
- **If not**: Check API Gateway, Lambda function status

### Are you getting 503 errors?
- **Cause**: Bedrock model access or Lambda permissions
- **Check**: IAM role permissions, Bedrock model availability in region

## Common Issues & Solutions

### 🚨 Critical Issues

#### "Service temporarily unavailable" (503 errors)

**Symptoms**: All queries return 503, error state shows retry button

**Causes & Solutions**:
1. **Bedrock Model Access Not Enabled**
   ```bash
   # Check model access in AWS Console
   # Bedrock > Model access > Request access for:
   # - anthropic.claude-sonnet-4-20250514-v1:0
   # - amazon.titan-text-express-v1
   ```

2. **Lambda IAM Permissions Missing**
   ```bash
   # Check Lambda execution role has:
   aws iam get-role-policy --role-name FirstaidAiLambdaRole --policy-name BedrockPolicy
   
   # Should include:
   # - bedrock:InvokeModel (Claude model ARN)
   # - bedrock-agent-runtime:Retrieve (KB ARN)
   # - ssm:GetParameter (Places API key ARN)
   ```

3. **Knowledge Base Not Ready**
   ```bash
   # Check KB status in Bedrock console
   # Should be "Active" with ingestion "Completed"
   aws bedrock-agent get-knowledge-base --knowledge-base-id YOUR_KB_ID
   ```

#### Map not showing facilities (empty array)

**Symptoms**: Triage response works, but `facilities: []` for urgent/emergency

**Causes & Solutions**:
1. **Google Places API Key Missing**
   ```bash
   # Check SSM parameter exists
   aws ssm get-parameter --name "/firstaid-ai/places-api-key" --with-decryption
   
   # If missing, add it:
   aws ssm put-parameter \
     --name "/firstaid-ai/places-api-key" \
     --value "YOUR_GOOGLE_PLACES_API_KEY" \
     --type "SecureString"
   ```

2. **Places API Key Invalid/Expired**
   ```bash
   # Test key directly:
   curl "https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=37.7749,-122.4194&radius=1000&type=hospital&key=YOUR_KEY"
   ```

3. **Location Not Provided**
   - Grant location permission in browser
   - Check browser console for geolocation errors

#### CORS errors in browser console

**Symptoms**: Network errors, "blocked by CORS policy"

**Solution**: Update API Gateway CORS settings
```bash
# Check current CORS configuration
aws apigatewayv2 get-route --api-id YOUR_API_ID --route-id YOUR_ROUTE_ID

# Should allow:
# - Origin: https://d32xsl7uhmmecy.cloudfront.net
# - Methods: POST, OPTIONS
# - Headers: Content-Type
```

### ⚠️ Performance Issues

#### Slow response times (>10 seconds)

**Causes & Solutions**:
1. **Lambda Cold Start**
   - First request after deployment is slower
   - Subsequent requests should be <5s

2. **Knowledge Base Retrieval Slow**
   ```bash
   # Check Bedrock Knowledge Base sync status
   aws bedrock-agent get-knowledge-base --knowledge-base-id $KNOWLEDGE_BASE_ID
   # Should be "ACTIVE"
   ```

3. **Bedrock Throttling**
   - Check CloudWatch metrics for throttling
   - Consider increasing Lambda timeout if needed

#### Map loading slowly

**Causes & Solutions**:
1. **Leaflet CSS Missing**
   - Check `index.html` includes Leaflet CSS
   - Verify CDN accessibility

2. **Too Many Facility Results**
   - Google Places returns many results
   - Lambda filters to top 5, but processing takes time

### 🔧 UI/UX Issues

#### Text input not focused on load

**Solution**: Check `QueryInput` component `useEffect` hook
```typescript
useEffect(() => {
  inputRef.current?.focus();
}, []);
```

#### Severity banner colors wrong

**Check**: Tailwind CSS classes in `SeverityBanner`
- `self_care`: `bg-green-500`
- `urgent_care`: `bg-yellow-400`  
- `emergency`: `bg-red-600`

#### Map pins not clickable on mobile

**Solution**: Ensure touch targets ≥44×44px
```css
.leaflet-marker-icon {
  min-width: 44px !important;
  min-height: 44px !important;
}
```

### 📱 Mobile-Specific Issues

#### Layout broken on small screens

**Check**: Responsive design at 375px viewport
```bash
# Test with browser DevTools mobile emulation
# All elements should be visible without horizontal scroll
```

#### Geolocation not working

**Causes & Solutions**:
1. **HTTPS Required**: Geolocation only works on HTTPS
2. **Permission Denied**: User must grant permission
3. **iOS Safari**: May require user gesture to trigger

#### "Get Directions" not opening

**Check**: Link format in `FacilityMap` component
```typescript
const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
```

## Debug Commands

### Test Lambda Function Directly
```bash
# Invoke Lambda with test payload
aws lambda invoke \
  --function-name firstaid-ai-triage \
  --payload '{"body":"{\"query\":\"test burn\"}"}' \
  response.json && cat response.json
```

### Check CloudWatch Logs
```bash
# Get recent log events
aws logs describe-log-streams \
  --log-group-name "/aws/lambda/firstaid-ai-triage" \
  --order-by LastEventTime --descending

# Get specific log stream
aws logs get-log-events \
  --log-group-name "/aws/lambda/firstaid-ai-triage" \
  --log-stream-name "STREAM_NAME"
```

### Test API Gateway Directly
```bash
# Test via curl
curl -X POST https://YOUR_API_ID.execute-api.REGION.amazonaws.com/api/triage \
  -H "Content-Type: application/json" \
  -H "Origin: https://d32xsl7uhmmecy.cloudfront.net" \
  -d '{"query":"child burned hand","location":{"lat":37.7749,"lng":-122.4194}}'
```

### Validate Knowledge Base
```bash
# Test retrieval directly
aws bedrock-agent-runtime retrieve \
  --knowledge-base-id YOUR_KB_ID \
  --retrieval-query "burn treatment first aid" \
  --retrieval-configuration '{"vectorSearchConfiguration":{"numberOfResults":5}}'
```

## Monitoring & Alerts

### Key CloudWatch Metrics
- **Lambda Duration**: Should be <15s (timeout)
- **Lambda Errors**: Should be 0% for successful requests
- **API Gateway 4xx/5xx**: Monitor error rates
- **Bedrock Invocations**: Track usage and throttling

### Log Analysis
```bash
# Search for errors in logs
aws logs filter-log-events \
  --log-group-name "/aws/lambda/firstaid-ai-triage" \
  --filter-pattern "ERROR"

# Search for specific scenarios
aws logs filter-log-events \
  --log-group-name "/aws/lambda/firstaid-ai-triage" \
  --filter-pattern "reasoning"
```

## Emergency Procedures

### Demo Day Failures

#### Complete System Down
1. **Use fallback screenshots** for each scenario
2. **Show screen recording** of working demo
3. **Walk through code** in IDE
4. **Explain architecture** with diagram

#### Partial Failures
1. **Map not working**: Focus on triage accuracy
2. **Slow responses**: Explain cold start, show cached responses
3. **CORS issues**: Use curl to demonstrate API working

### Post-Demo Cleanup

#### Immediate (Within 1 hour)
```bash
# Disable Lambda (optional)
aws lambda put-function-configuration \
  --function-name firstaid-ai-triage \
  --environment Variables='{}'
```

#### Within 24 hours
```bash
# Delete CloudFormation stacks
aws cloudformation delete-stack --stack-name FirstaidAiKbStack
aws cloudformation delete-stack --stack-name FirstaidAiLambdaStack  
aws cloudformation delete-stack --stack-name FirstaidAiApiStack

# Clean up SSM parameters
aws ssm delete-parameter --name "/firstaid-ai/places-api-key"
```

## Getting Help

### AWS Support
- **Bedrock Issues**: Check service health dashboard
- **Lambda Issues**: Review execution logs and metrics
- **API Gateway**: Test with AWS Console test feature

### Community Resources
- **React/Leaflet**: Check GitHub issues for known problems
- **Tailwind CSS**: Verify class names in documentation
- **TypeScript**: Check for type errors in IDE

### Contact Information
- **Primary**: Check CloudWatch logs first
- **Secondary**: Test individual components in isolation
- **Last Resort**: Use fallback demo materials