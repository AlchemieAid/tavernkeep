const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  // Get commit count
  const commitCount = execSync('git rev-list --all --count')
    .toString()
    .trim();

  // Get current timestamp in Eastern Time
  const now = new Date();
  const lastUpdated = now.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  // Create version info
  const versionInfo = {
    version: `v1.0.${commitCount}`,
    lastUpdated,
    buildTime: now.toISOString(),
  };

  // Write to file
  const outputPath = path.join(__dirname, '..', 'lib', 'version.json');
  fs.writeFileSync(outputPath, JSON.stringify(versionInfo, null, 2));

  console.log(`Generated version: ${versionInfo.version}`);
} catch (error) {
  console.error('Failed to generate version:', error.message);
  // Fallback version
  const fallbackVersion = {
    version: 'v1.0.0',
    lastUpdated: new Date().toLocaleString('en-US', {
      timeZone: 'America/New_York',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }),
    buildTime: new Date().toISOString(),
  };
  const outputPath = path.join(__dirname, '..', 'lib', 'version.json');
  fs.writeFileSync(outputPath, JSON.stringify(fallbackVersion, null, 2));
}
