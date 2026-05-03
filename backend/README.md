# FirstAid AI — Lambda Backend

## Build

```bash
npm install
npm run build
```

This produces `dist/handler.zip` ready for Lambda deployment.

## Deploy

```bash
aws lambda update-function-code \
  --function-name firstaid-ai-triage \
  --zip-file fileb://dist/handler.zip
```

## Environment Variables

Set these in the Lambda configuration:

| Variable | Value | Required |
|---|---|---|
| `KNOWLEDGE_BASE_ID` | Bedrock KB ID | Yes |
| `CLAUDE_MODEL_ID` | `anthropic.claude-sonnet-4-20250514-v1:0` | Yes |
| `SIMILARITY_THRESHOLD` | `0.5` | No (defaults to 0.5) |
| `PLACES_API_KEY_PARAM` | `/firstaid-ai/places-api-key` | No (defaults to this path) |
| `CLOUDFRONT_ORIGIN` | CloudFront distribution URL | No (defaults to `*`) |
| `AWS_REGION` | `us-west-2` or `us-east-1` | Yes (auto-set by Lambda) |

## IAM Permissions Required

The Lambda execution role needs:

- `bedrock:InvokeModel` on the Claude model ARN
- `bedrock-agent-runtime:Retrieve` on the Knowledge Base ARN
- `ssm:GetParameter` on the Places API key parameter ARN
- `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents`

## Handler Configuration

- **Handler:** `handler.handler`
- **Runtime:** Node.js 20.x
- **Memory:** 512 MB
- **Timeout:** 15 seconds
- **Architecture:** x86_64

## Testing Locally

You can't fully test locally without AWS credentials and a real Knowledge Base, but you can verify the build:

```bash
npm run typecheck
npm run build
```

The mock server in the repo root (`mock-server.js`) simulates the full API for frontend development.
