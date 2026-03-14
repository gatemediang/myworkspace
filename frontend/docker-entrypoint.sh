#!/bin/sh
set -e

# Replace build-time placeholders with actual runtime env vars
# This allows NEXT_PUBLIC_* vars to be set in Railway without needing Docker build args

replace_placeholder() {
  PLACEHOLDER="$1"
  ACTUAL="$2"
  if [ -n "$ACTUAL" ] && [ "$ACTUAL" != "$PLACEHOLDER" ]; then
    find /app/.next -type f -name "*.js" | xargs sed -i "s|$PLACEHOLDER|$ACTUAL|g" 2>/dev/null || true
  fi
}

replace_placeholder "__NEXT_PUBLIC_API_URL__" "$NEXT_PUBLIC_API_URL"
replace_placeholder "__NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY__" "$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"

exec node server.js
