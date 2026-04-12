# TavernKeep Test Suite

## Quick Start

```bash
# Install test dependencies
npm install --save-dev jest @testing-library/react @testing-library/jest-dom @types/jest glob

# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test suite
npm test -- security
npm test -- architecture

# Run with coverage
npm test -- --coverage
```

## Test Structure

```
__tests__/
├── security/           # Security & vulnerability tests
│   └── env-vars.test.ts
├── architecture/       # Code structure & conventions
│   └── file-structure.test.ts
├── functional/         # User flow tests (TODO)
└── integration/        # API & database tests (TODO)
```

## Current Tests

### Security Tests
- ✅ **Environment Variable Security**: Ensures API keys never leak to client
- ✅ **Service Role Key Check**: Verifies no service role key usage (anon key only)

### Architecture Tests
- ✅ **File Structure**: Validates project follows .windsurfrules conventions
- ✅ **Prompt Organization**: Ensures AI prompts are in /lib/prompts/
- ✅ **Validator Organization**: Ensures Zod schemas are in /lib/validators/
- ✅ **Component Naming**: Validates kebab-case naming convention

## Adding to CI

Add to `.github/workflows/ci.yml`:

```yaml
test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '20'
    - run: npm ci
    - run: npm test
```

## Next Steps

1. Install dependencies: `npm install --save-dev jest @testing-library/react @testing-library/jest-dom @types/jest glob`
2. Run tests: `npm test`
3. Add more tests from TESTING_STRATEGY.md as needed
4. Integrate into CI pipeline

## Test Philosophy

- **Security First**: All security tests must pass before deployment
- **Fast Feedback**: Tests should run in < 30 seconds
- **No Flaky Tests**: Tests must be deterministic
- **Clear Failures**: Error messages should explain what went wrong and how to fix it
