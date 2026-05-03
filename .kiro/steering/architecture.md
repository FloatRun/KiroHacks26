# FirstAid AI — Architecture

## AWS Topology

```
User (Browser)
  → CloudFront (HTTPS)
      → S3 Frontend Bucket (OAC, no public access)
      → API Gateway HTTP API  →  Lambda (firstaid-ai-triage)
                                    → Bedrock Claude (Parser)
                                    → Bedrock Knowledge Base → S3 Vector
                                    → Bedrock Claude (Formatter)
                                    → Google Places API (conditional)
                                    → SSM Parameter Store (cold start)
                                    → CloudWatch Logs
```

- CloudFront serves both the SPA and proxies `/api/triage` to API Gateway
- S3 frontend bucket is private; CloudFront accesses it via Origin Access Control (OAC)
- CORS on API Gateway is restricted to the CloudFront distribution domain only

## Lambda Handler Pipeline

```
handler.ts
  1. Parse + validate request body (query, location)
  2. Read Places API key from SSM (cached in module scope after cold start)
  3. invokeParser(query)
       → if action === "clarify": return clarification response immediately
  4. retrieveFromKnowledgeBase(normalizedQuery, topK=5)
       → if maxScore < SIMILARITY_THRESHOLD: return out-of-scope response
  5. invokeFormatter(chunks, extractedContext)
       → log reasoning to CloudWatch (never returned to client)
       → if outOfScope === true: return out-of-scope response
  6. findNearbyFacilities(careTier, location, apiKey)  [only if careTier !== "self_care" && location present]
       → on failure: log error, continue with facilities: []
  7. Return triage response
```

## Lambda Configuration

| Property | Value |
|---|---|
| Runtime | Node.js 20.x |
| Memory | 512 MB |
| Timeout | 15 seconds |
| Handler | `dist/handler.handler` |
| Architecture | x86_64 |

## Environment Variables

| Variable | Value |
|---|---|
| `KNOWLEDGE_BASE_ID` | Bedrock KB ID |
| `CLAUDE_MODEL_ID` | `anthropic.claude-sonnet-4-20250514-v1:0` |
| `SIMILARITY_THRESHOLD` | `0.5` (default) |
| `PLACES_API_KEY_PARAM` | SSM parameter path |
| `AWS_REGION` | `us-west-2` or `us-east-1` |

## IAM — Lambda Execution Role (Least Privilege)

| Permission | Scope |
|---|---|
| `bedrock:InvokeModel` | Claude model ARN only |
| `bedrock-agent-runtime:Retrieve` | Specific KB ARN only |
| `ssm:GetParameter` | `/firstaid-ai/places-api-key` ARN only |
| `logs:CreateLogGroup/Stream/PutLogEvents` | `/aws/lambda/firstaid-ai-triage` log group |

## Bedrock Knowledge Base

| Property | Value |
|---|---|
| Data source | Bedrock built-in web scraper (curated URLs: NHS 111, MedlinePlus, CDC, Red Cross, WHO) |
| Chunking | Fixed-size, ~300 tokens, 20% overlap |
| Embedding model | Amazon Titan Text Embeddings v2 |
| Vector store | S3 Vector |
| Retrieval top-K | 5 |
| Similarity threshold | 0.5 (env var `SIMILARITY_THRESHOLD`) |

## Deployment

### Frontend
```bash
npm run build
aws s3 sync dist/ s3://firstaid-ai-frontend/ --delete
aws cloudfront create-invalidation --distribution-id {ID} --paths "/*"
```

### Backend
```bash
npm run build   # esbuild → dist/handler.js + handler.zip
aws lambda update-function-code \
  --function-name firstaid-ai-triage \
  --zip-file fileb://dist/handler.zip
```

## Cost Note

S3 Vector accrues only storage charges (~$0.06/GB/month) with no idle minimum — no teardown required after demo.
