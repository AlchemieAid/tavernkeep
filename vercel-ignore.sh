#!/bin/bash

# Only build on main branch or if specific files changed
# This helps conserve Vercel build minutes

echo "🔍 Checking if build is needed..."

# Always build on main branch
if [ "$VERCEL_GIT_COMMIT_REF" == "main" ]; then
  echo "✅ Main branch - building"
  exit 1
fi

# For other branches, check if important files changed
if git diff HEAD^ HEAD --quiet -- '*.ts' '*.tsx' '*.js' '*.jsx' 'package.json' 'package-lock.json' 'next.config.js' 'tsconfig.json'; then
  echo "⏭️  No code changes detected - skipping build"
  exit 0
else
  echo "✅ Code changes detected - building"
  exit 1
fi
