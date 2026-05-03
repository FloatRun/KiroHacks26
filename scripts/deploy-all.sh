#!/bin/bash
set -e

echo "🚀 FirstAid AI - Complete Deployment Script"
echo "==========================================="

# Build backend
echo "🔨 Building backend..."
cd backend
npm run build
cd ..

# Deploy CDK stacks
echo "☁️  Deploying AWS infrastructure..."
cd cdk

echo "📚 Deploying Knowledge Base stack..."
cdk deploy FirstaidAiKbStack --require-approval never

echo "⚡ Deploying Lambda stack..."
cdk deploy FirstaidAiLambdaStack --require-approval never

echo "🌐 Deploying API stack..."
cdk deploy FirstaidAiApiStack --require-approval never

cd ..

# Build and deploy frontend
echo "🎨 Building and deploying frontend..."
cd frontend
npm run build

# Get S3 bucket name from CDK outputs
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name FirstaidAiApiStack \
  --query 'Stacks[0].Outputs[?OutputKey==`FrontendBucketName`].OutputValue' \
  --output text)

if [ -z "$BUCKET_NAME" ]; then
    echo "❌ Could not find S3 bucket name. Using default..."
    BUCKET_NAME="firstaid-ai-frontend"
fi

echo "📤 Uploading to S3 bucket: $BUCKET_NAME"
aws s3 sync dist/ s3://$BUCKET_NAME/ --delete

# Get CloudFront distribution ID
DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
  --stack-name FirstaidAiApiStack \
  --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' \
  --output text)

if [ -n "$DISTRIBUTION_ID" ]; then
    echo "🔄 Creating CloudFront invalidation..."
    aws cloudfront create-invalidation \
      --distribution-id $DISTRIBUTION_ID \
      --paths "/*"
else
    echo "⚠️  Could not find CloudFront distribution ID for invalidation"
fi

cd ..

# Get the final URL
CLOUDFRONT_URL=$(aws cloudformation describe-stacks \
  --stack-name FirstaidAiApiStack \
  --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontUrl`].OutputValue' \
  --output text)

echo ""
echo "🎉 Deployment complete!"
echo "📱 Frontend URL: ${CLOUDFRONT_URL:-https://d32xsl7uhmmecy.cloudfront.net/}"
echo "🔍 Test the 5 demo scenarios:"
echo "   1. 'I feel weird' (clarification)"
echo "   2. 'I have a small paper cut' (self-care)"
echo "   3. 'my child burned their hand on the stove' (urgent care + map)"
echo "   4. 'adult is not breathing and unresponsive' (emergency + map)"
echo "   5. 'what is the best restaurant near me' (out-of-scope)"
echo ""
echo "💡 S3 Vector accrues only storage charges (~\$0.06/GB/month) — no teardown required."