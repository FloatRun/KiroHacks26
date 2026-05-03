#!/bin/bash
set -e

echo "🚀 FirstAid AI - Complete Setup Script"
echo "======================================"

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Please install and configure AWS CLI first."
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 20.x first."
    exit 1
fi

if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured. Run 'aws configure' first."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Install dependencies
echo "📦 Installing dependencies..."
cd backend && npm install
cd ../frontend && npm install  
cd ../cdk && npm install
cd ..

echo "✅ Dependencies installed"

# Build backend
echo "🔨 Building backend..."
cd backend && npm run build
cd ..

echo "✅ Backend built"

# Check for Google Places API key
echo "🔑 Checking for Google Places API key..."
if ! aws ssm get-parameter --name "/firstaid-ai/places-api-key" --with-decryption &> /dev/null; then
    echo "⚠️  Google Places API key not found in SSM Parameter Store"
    echo "Please set it manually:"
    echo "aws ssm put-parameter --name '/firstaid-ai/places-api-key' --value 'YOUR_API_KEY' --type 'SecureString'"
    echo ""
    echo "Continue anyway? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "✅ Google Places API key found"
fi

echo "🎉 Setup complete! Next steps:"
echo "1. Deploy infrastructure: cd cdk && npm run deploy"
echo "2. Deploy frontend: cd frontend && npm run deploy"
echo "3. Test at: https://d32xsl7uhmmecy.cloudfront.net/"