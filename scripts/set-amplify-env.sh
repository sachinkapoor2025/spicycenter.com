#!/usr/bin/env bash
# Set Amplify environment variables (sample placeholders — replace values in Amplify Console later).
# Requires: aws CLI, active AWS credentials with Amplify access.
#
# Usage:
#   export AWS_ACCESS_KEY_ID=...
#   export AWS_SECRET_ACCESS_KEY=...
#   export AWS_SESSION_TOKEN=...   # if using temporary creds
#   ./scripts/set-amplify-env.sh
#
# Or update one branch only:
#   ./scripts/set-amplify-env.sh main
#   ./scripts/set-amplify-env.sh dev

set -euo pipefail

APP_ID="${AMPLIFY_APP_ID:-d1vlvm5li37k6g}"
BRANCH="${1:-all}"

# Sample placeholders — replace in Amplify Console when you have real IDs
SAMPLE_ENV=$(cat <<'EOF'
{
  "NEXT_PUBLIC_SITE_URL": "https://www.usarakhi.com",
  "NEXT_PUBLIC_API_URL": "https://foqu2ap4qi.execute-api.us-east-1.amazonaws.com/prod",
  "NEXT_PUBLIC_CDN_URL": "https://d301af4ndyn9qx.cloudfront.net",
  "NEXT_PUBLIC_GTM_ID": "GTM-XXXXXXX",
  "NEXT_PUBLIC_GA4_ID": "G-XXXXXXXXXX",
  "NEXT_PUBLIC_META_PIXEL_ID": "1459099935879507",
  "NEXT_PUBLIC_CLARITY_ID": "xdpv6v2lq9",
  "NEXT_PUBLIC_BING_SITE_VERIFICATION": "SAMPLE_BING_VERIFICATION_CODE",
  "NEXT_PUBLIC_BING_UET_ID": "SAMPLE_BING_UET_TAG_ID",
  "NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION": "google882629f2a0f6ec6d"
}
EOF
)

update_branch() {
  local branch="$1"
  echo "Updating Amplify branch: $branch"

  # Merge with existing vars so we don't wipe Razorpay/Cognito keys already set
  EXISTING=$(aws amplify get-branch --app-id "$APP_ID" --branch-name "$branch" \
    --query 'branch.environmentVariables' --output json 2>/dev/null || echo '{}')

  MERGED=$(python3 -c "
import json, os
existing = json.loads(os.environ.get('EXISTING') or '{}')
samples = json.loads(os.environ.get('SAMPLE_ENV') or '{}')
merged = {**existing, **samples}  # samples override when script is re-run with new IDs
print(json.dumps(merged))
" EXISTING="$EXISTING" SAMPLE_ENV="$SAMPLE_ENV")

  # Amplify CLI expects KEY=VALUE,KEY=VALUE format for --environment-variables
  ENV_STRING=$(python3 -c "
import json, sys
d = json.loads(sys.stdin.read())
print(','.join(f'{k}={v}' for k, v in d.items()))
" <<< "$MERGED")

  aws amplify update-branch \
    --app-id "$APP_ID" \
    --branch-name "$branch" \
    --environment-variables "$ENV_STRING" \
    --output json \
    --query 'branch.branchName'

  echo "  ✓ $branch updated. Trigger redeploy from Amplify Console or push a commit."
}

if [[ "$BRANCH" == "all" ]]; then
  update_branch main
  update_branch dev
else
  update_branch "$BRANCH"
fi

echo ""
echo "Analytics IDs applied (Meta Pixel, Clarity). Set GTM/GA4/Bing in Amplify Console if needed:"
echo "  NEXT_PUBLIC_GTM_ID, NEXT_PUBLIC_GA4_ID, NEXT_PUBLIC_META_PIXEL_ID,"
echo "  NEXT_PUBLIC_CLARITY_ID, NEXT_PUBLIC_BING_SITE_VERIFICATION, NEXT_PUBLIC_BING_UET_ID,"
echo "  NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION"
