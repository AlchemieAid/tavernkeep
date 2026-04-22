# CI/CD Pipeline

## Overview

This project uses GitHub Actions for continuous integration and deployment.

## Workflows

### CI Pipeline (`ci.yml`)

Runs on every push to `main` or `develop` branches and on all pull requests.

**Jobs:**

1. **Lint & Type Check**
   - Runs ESLint to catch code quality issues
   - Runs TypeScript type checking to catch type errors
   - Fast feedback on code quality

2. **Build**
   - Builds the Next.js application
   - Verifies all pages compile correctly
   - Checks for build-time errors
   - Requires lint/type-check to pass first

3. **Test** (optional)
   - Runs any tests in the project
   - Currently set to `continue-on-error` since tests are optional

## Required Secrets

Add these to your GitHub repository secrets (Settings → Secrets and variables → Actions):

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `OPENAI_API_KEY` - Your OpenAI API key

## Local Testing

Before pushing, you can run the same checks locally:

```bash
# Type check
npm run type-check

# Lint
npm run lint

# Build
npm run build
```

## Future Enhancements

Consider adding:

- **Unit tests** with Jest (standard framework for this project)
- **E2E tests** with Playwright or Cypress
- **Visual regression tests** with Percy or Chromatic
- **Database migration tests** to verify schema changes
- **Performance budgets** to catch bundle size increases
- **Security scanning** with Snyk or Dependabot
- **Automated deployment** to Vercel on successful builds
