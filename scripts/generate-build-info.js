/**
 * Generate build info file
 * This script runs during the build process to capture the build timestamp
 */

const fs = require('fs');
const path = require('path');

const buildInfo = {
  timestamp: new Date().toISOString(),
  buildTime: Date.now(),
};

const buildInfoPath = path.join(process.cwd(), '.build-info.json');
fs.writeFileSync(buildInfoPath, JSON.stringify(buildInfo, null, 2));

console.log('✓ Generated .build-info.json with timestamp:', buildInfo.timestamp);
