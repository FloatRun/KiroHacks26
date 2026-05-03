# FirstAid AI — Tech Stack

## Frontend

- **Framework:** React (TypeScript)
- **Build tool:** Vite
- **Styling:** Tailwind CSS
- **Map:** Leaflet + react-leaflet (OpenStreetMap tiles, no API key)
- **Language:** TypeScript (strict)

## Backend

- **Runtime:** AWS Lambda — Node.js 20.x, TypeScript, bundled with esbuild
- **API:** AWS API Gateway HTTP API — single route `POST /api/triage`
- **LLM:** Amazon Bedrock — `anthropic.claude-sonnet-4-20250514-v1:0` (two invocations per request: parser + formatter)
- **RAG:** Amazon Bedrock Knowledge Base → S3 Vector (vector store) + Amazon Titan Text Embeddings v2
- **Secrets:** AWS SSM Parameter Store (SecureString) for Google Places API key
- **External API:** Google Places Nearby Search (facility finder)
- **Logs:** AWS CloudWatch (reasoning field, errors)

## Hosting / CDN

- **Frontend:** S3 (static) behind CloudFront with Origin Access Control (OAC)
- **Backend:** API Gateway → Lambda (invoked via CloudFront path `/api/triage`)

## AWS SDK Packages (Lambda)

- `@aws-sdk/client-bedrock-runtime` — `InvokeModelCommand`
- `@aws-sdk/client-bedrock-agent-runtime` — `RetrieveCommand`
- `@aws-sdk/client-ssm` — `GetParameterCommand`

## Lambda Configuration

| Property | Value |
|---|---|
| Memory | 512 MB |
| Timeout | 15 seconds |
| Handler | `dist/handler.handler` |
| Architecture | x86_64 |

## Key Environment Variables (Lambda)

| Variable | Purpose |
|---|---|
| `KNOWLEDGE_BASE_ID` | Bedrock KB ID |
| `CLAUDE_MODEL_ID` | `anthropic.claude-sonnet-4-20250514-v1:0` |
| `SIMILARITY_THRESHOLD` | Default `0.5` |
| `PLACES_API_KEY_PARAM` | SSM parameter path |
| `AWS_REGION` | `us-west-2` or `us-east-1` |

## Common Commands

### Frontend

```bash
npm run dev       # local dev server
npm run build     # Vite production build → dist/
npm run lint      # ESLint
```

### Backend (Lambda)

```bash
npm run build     # esbuild → dist/handler.js + zip
```

### Deploy Frontend

```bash
aws s3 sync dist/ s3://firstaid-ai-frontend/ --delete
aws cloudfront create-invalidation --distribution-id {ID} --paths "/*"
```

### Deploy Backend

```bash
aws lambda update-function-code \
  --function-name firstaid-ai-triage \
  --zip-file fileb://dist/handler.zip
```

## Hand-Tuned Artifacts (Do Not Auto-Generate)

The following must be authored and tested by humans — do not regenerate them:

- **Parser system prompt** — calibrates retrieve/clarify bias; must pass all 5 demo scenarios
- **Formatter system prompt** — enforces step count, character limits, over-escalation bias
- **Similarity threshold (0.5)** — empirically set against the scraped content
- **Source URL selection** — requires human judgment on source authority and scenario coverage across the 15–20 target scenarios
