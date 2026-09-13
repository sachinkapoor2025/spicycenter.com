#!/usr/bin/env bash
# Run backup → SpicyCorner product image import (requires AWS account 796174527529).
#
# One-time setup:
#   aws configure sso --profile 796174527529_AdministratorAccess
#   # or: aws configure --profile 796174527529_AdministratorAccess
#
# Usage:
#   AWS_PROFILE=796174527529_AdministratorAccess ./scripts/run-backup-image-import.sh
#   AWS_PROFILE=796174527529_AdministratorAccess ./scripts/run-backup-image-import.sh --match-only
#   LOCAL_BACKUP_DIR=/path/to/folders ./scripts/run-backup-image-import.sh

set -euo pipefail
cd "$(dirname "$0")/.."

EXPECTED_ACCOUNT="796174527529"
export AWS_REGION="${AWS_REGION:-us-east-1}"
export SOURCE_BUCKET="${SOURCE_BUCKET:-usarakhi-backup}"
export SOURCE_PREFIX="${SOURCE_PREFIX:-spicycenter.com}"
export UPLOAD_BUCKET="${UPLOAD_BUCKET:-spicycorner-prod-uploadbucket-dyr0xdywradd}"
export CLOUDFRONT_DOMAIN="${CLOUDFRONT_DOMAIN:-d2lfdzx32wxe94.cloudfront.net}"

ACCOUNT="$(aws sts get-caller-identity --query Account --output text 2>/dev/null || true)"
if [[ "$ACCOUNT" != "$EXPECTED_ACCOUNT" ]]; then
  echo "Error: AWS account is ${ACCOUNT:-unknown}, expected ${EXPECTED_ACCOUNT}."
  echo "Set AWS_PROFILE to your Administrator profile, e.g.:"
  echo "  export AWS_PROFILE=796174527529_AdministratorAccess"
  exit 1
fi

echo "Account OK (${ACCOUNT}). Source: ${SOURCE_BUCKET:-LOCAL_BACKUP_DIR}"

if [[ "${1:-}" == "--match-only" ]]; then
  npm run import:backup-images -- --match-only
  exit 0
fi

npm run import:backup-images -- --match-only
echo ""
read -r -p "Proceed with full import (compress, upload, update catalog)? [y/N] " ans
if [[ "${ans,,}" != "y" ]]; then
  echo "Stopped. Run full import with:"
  echo "  SOURCE_BUCKET=${SOURCE_BUCKET} UPLOAD_BUCKET=${UPLOAD_BUCKET} npm run import:backup-images"
  exit 0
fi

npm run import:backup-images
echo "Done. Consider: npm run sync:public-uploads && redeploy Amplify."
