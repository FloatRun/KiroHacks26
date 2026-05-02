# FirstAid AI — CDK Deployment Guide

## Prerequisites

1. AWS CLI configured with credentials
2. Node.js 20.x installed
3. Backend Lambda code built: `cd backend && npm install && npm run build`
4. Google Places API key ready

## Deploy

### 1. Build the CDK

```bash
cd cdk
npm install
npm run build
```

### 2. Bootstrap CDK (first time only)

```bash
npx cdk bootstrap aws://ACCOUNT-ID/us-west-2
```

### 3. Deploy both stacks

```bash
npx cdk deploy --all
```

This deploys:
- `FirstAidAiKbStack` — Knowledge Base, S3 corpus bucket, vector storage
- `FirstAidAiLambdaStack` — Lambda function, API Gateway, IAM roles

### 4. Set the Google Places API key

The SSM parameter is created with a placeholder value. Update it:

```bash
aws ssm put-parameter \
  --name /firstaid-ai/places-api-key \
  --value "YOUR_GOOGLE_PLACES_API_KEY" \
  --type SecureString \
  --overwrite
```

### 5. Upload corpus documents to S3

Get the corpus bucket name from the stack outputs:

```bash
aws s3 sync ../corpus/ s3://CORPUS-BUCKET-NAME/
```

### 6. Trigger Knowledge Base ingestion

Get the KB ID and Data Source ID from the stack outputs, then:

```bash
aws bedrock-agent start-ingestion-job \
  --knowledge-base-id KM7JPBMFIY \
  --data-source-id DATA-SOURCE-ID
```

Monitor ingestion status:

```bash
aws bedrock-agent list-ingestion-jobs \
  --knowledge-base-id KM7JPBMFIY \
  --data-source-id DATA-SOURCE-ID
```

### 7. Test the API

Get the API endpoint from the stack outputs:

```bash
curl -X POST https://API-ID.execute-api.us-west-2.amazonaws.com/api/triage \
  -H "Content-Type: application/json" \
  -d '{"query":"my child burned their hand on the stove","location":{"lat":35.28,"lng":-120.66}}'
```

## Stack Outputs

After deployment, note these outputs:

**FirstAidAiKbStack:**
- `CorpusBucketName` — S3 bucket for corpus documents
- `KnowledgeBaseId` — Bedrock KB ID (should be `KM7JPBMFIY`)
- `DataSourceId` — Bedrock Data Source ID

**FirstAidAiLambdaStack:**
- `ApiEndpoint` — Full triage endpoint URL
- `LambdaFunctionName` — `firstaid-ai-triage`
- `PlacesApiKeyParamName` — `/firstaid-ai/places-api-key`

## Update Lambda Code

After making changes to the Lambda code:

```bash
cd backend
npm run build
cd ../cdk
npx cdk deploy FirstAidAiLambdaStack
```

## Tear Down

**WARNING:** This deletes all resources including the Knowledge Base and corpus.

```bash
npx cdk destroy --all
```

## Troubleshooting

**Lambda can't invoke Bedrock:**
- Check IAM role has `bedrock:InvokeModel` permission
- Verify Claude model access is enabled in Bedrock console

**KB retrieval returns empty:**
- Check ingestion job completed successfully
- Verify corpus documents are in S3
- Check similarity threshold (default 0.5)

**Places API returns no facilities:**
- Verify API key is set in SSM
- Check API key has Places API enabled in Google Cloud Console
- Verify location coordinates are valid
