const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  // Get commit count on current branch (HEAD)
  const commitCount = execSync('git rev-list HEAD --count')
    .toString()
    .trim();

  const version = `v0.0.${commitCount}`;
  const buildTime = new Date().toISOString();

  // Write to .env file for Next.js to pick up at build time
  const envContent = `NEXT_PUBLIC_VERSION=${version}\nNEXT_PUBLIC_BUILD_TIME=${buildTime}\n`;
  const envPath = path.join(__dirname, '..', '.env.production');
  fs.writeFileSync(envPath, envContent);

  console.log(`Generated version: ${version} at ${buildTime}`);
} catch (error) {
  console.error('Failed to generate version:', error.message);
  // Fallback version
  const envContent = `NEXT_PUBLIC_VERSION=v0.0.0\nNEXT_PUBLIC_BUILD_TIME=${new Date().toISOString()}\n`;
  const envPath = path.join(__dirname, '..', '.env.production');
  fs.writeFileSync(envPath, envContent);
}
