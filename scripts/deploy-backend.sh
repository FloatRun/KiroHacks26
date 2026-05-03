#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# FirstAid AI — Backend Deployment Script
#
# Usage:
#   ./scripts/deploy-backend.sh
#
# Required environment variables:
#   LAMBDA_FUNCTION_NAME — Lambda function name (default: "firstaid-ai-triage")
# ─────────────────────────────────────────────────────────────────────────────

LAMBDA_FUNCTION_NAME="${LAMBDA_FUNCTION_NAME:-firstaid-ai-triage}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/../backend"

echo "── Building backend ──"
cd "$BACKEND_DIR"
npm run build

ZIP_PATH="$BACKEND_DIR/dist/handler.zip"

if [[ ! -f "$ZIP_PATH" ]]; then
  echo "Error: $ZIP_PATH not found. Build may have failed."
  exit 1
fi

echo ""
echo "── Deploying to Lambda: $LAMBDA_FUNCTION_NAME ──"
aws lambda update-function-code \
  --function-name "$LAMBDA_FUNCTION_NAME" \
  --zip-file "fileb://$ZIP_PATH" \
  --output text

echo ""
echo "✓ Backend deployed successfully."
