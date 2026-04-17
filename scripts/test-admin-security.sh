#!/bin/bash

# Admin Security Test Runner
# Runs comprehensive security tests for the admin system

echo "🔐 Running Admin Security Tests..."
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📋 Test Checklist:${NC}"
echo "  ✓ RLS Policy Tests"
echo "  ✓ API Route Security"
echo "  ✓ Helper Function Security"
echo "  ✓ Route Protection"
echo "  ✓ Data Isolation"
echo ""

# Run security tests
echo -e "${YELLOW}Running security tests...${NC}"
npm test -- __tests__/admin/security.test.ts --verbose

SECURITY_EXIT_CODE=$?

echo ""
echo -e "${YELLOW}Running integration tests...${NC}"
npm test -- __tests__/admin/integration.test.ts --verbose

INTEGRATION_EXIT_CODE=$?

echo ""
echo "================================"
echo ""

if [ $SECURITY_EXIT_CODE -eq 0 ] && [ $INTEGRATION_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    echo ""
    echo "Admin system is secure and ready for production."
    exit 0
else
    echo -e "${RED}❌ Some tests failed!${NC}"
    echo ""
    echo "Please fix failing tests before deploying to production."
    exit 1
fi
