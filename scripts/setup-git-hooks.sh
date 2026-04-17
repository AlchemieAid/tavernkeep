#!/bin/bash
# Setup Git Hooks with Husky
# Run this script to install pre-commit hooks that prevent type errors

echo "🔧 Setting up Git hooks with Husky..."

# Install Husky and lint-staged
npm install --save-dev husky lint-staged

# Initialize Husky
npx husky install

# Create pre-commit hook
npx husky add .husky/pre-commit "npx lint-staged"

echo "✅ Git hooks installed!"
echo ""
echo "Pre-commit hooks will now:"
echo "  - Run ESLint on staged files"
echo "  - Run TypeScript type-check on staged files"
echo "  - Prevent commits with type errors"
echo ""
echo "To bypass (not recommended): git commit --no-verify"
