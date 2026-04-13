#!/bin/bash

# This script determines whether Vercel should build and deploy
# It checks if GitHub Actions CI has passed before allowing deployment

echo "🔍 Checking if build should proceed..."

# Only run checks on main branch
if [ "$VERCEL_GIT_COMMIT_REF" != "main" ]; then
  echo "✅ Not main branch - allowing build"
  exit 1  # Exit 1 = proceed with build
fi

# Check if this is a production deployment
if [ "$VERCEL_ENV" == "production" ]; then
  echo "🚀 Production deployment detected"
  
  # Get the commit SHA
  COMMIT_SHA="$VERCEL_GIT_COMMIT_SHA"
  
  # Use GitHub API to check CI status
  # Note: This requires GITHUB_TOKEN to be set in Vercel environment variables
  if [ -n "$GITHUB_TOKEN" ]; then
    echo "🔐 GitHub token found, checking CI status..."
    
    # Check GitHub Actions status for this commit
    CI_STATUS=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
      "https://api.github.com/repos/$VERCEL_GIT_REPO_OWNER/$VERCEL_GIT_REPO_SLUG/commits/$COMMIT_SHA/check-runs" \
      | jq -r '.check_runs[] | select(.name == "CI") | .conclusion')
    
    if [ "$CI_STATUS" == "success" ]; then
      echo "✅ GitHub Actions CI passed - proceeding with deployment"
      exit 1  # Exit 1 = proceed with build
    elif [ "$CI_STATUS" == "failure" ]; then
      echo "❌ GitHub Actions CI failed - skipping deployment"
      exit 0  # Exit 0 = skip build
    else
      echo "⏳ GitHub Actions CI status: $CI_STATUS - waiting..."
      echo "⚠️  Proceeding anyway (you may want to change this behavior)"
      exit 1  # Exit 1 = proceed with build
    fi
  else
    echo "⚠️  No GITHUB_TOKEN found - cannot check CI status"
    echo "⚠️  Proceeding with deployment anyway"
    exit 1  # Exit 1 = proceed with build
  fi
fi

# For non-production deployments (preview), always build
echo "✅ Preview deployment - allowing build"
exit 1  # Exit 1 = proceed with build
