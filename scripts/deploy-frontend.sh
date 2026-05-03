#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# FirstAid AI — Frontend Deployment Script
#
# Usage:
#   ./scripts/deploy-frontend.sh
#
# Required environment variables:
#   FRONTEND_BUCKET   — S3 bucket name (e.g. "firstaid-ai-frontend")
#   CLOUDFRONT_DIST_ID — CloudFront distribution ID (e.g. "E1A2B3C4D5E6F7")
# ─────────────────────────────────────────────────────────────────────────────

if [[ -z "${FRONTEND_BUCKET:-}" ]]; then
  echo "Error: FRONTEND_BUCKET environment variable is not set."
  echo "Usage: FRONTEND_BUCKET=firstaid-ai-frontend CLOUDFRONT_DIST_ID=EXXXXX ./scripts/deploy-frontend.sh"
  exit 1
fi

if [[ -z "${CLOUDFRONT_DIST_ID:-}" ]]; then
  echo "Error: CLOUDFRONT_DIST_ID environment variable is not set."
  echo "Usage: FRONTEND_BUCKET=firstaid-ai-frontend CLOUDFRONT_DIST_ID=EXXXXX ./scripts/deploy-frontend.sh"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/../frontend"

echo "── Building frontend ──"
cd "$FRONTEND_DIR"
npm run build

echo ""
echo "── Syncing to S3: s3://$FRONTEND_BUCKET ──"
aws s3 sync dist/ "s3://$FRONTEND_BUCKET/" --delete

echo ""
echo "── Invalidating CloudFront: $CLOUDFRONT_DIST_ID ──"
aws cloudfront create-invalidation \
  --distribution-id "$CLOUDFRONT_DIST_ID" \
  --paths "/*" \
  --output text

echo ""
echo "✓ Frontend deployed successfully."
