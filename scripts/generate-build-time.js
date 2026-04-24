/**
 * Generate a TypeScript file with the build timestamp.
 * This file gets bundled into the build, so the timestamp is baked into the code.
 */

const fs = require('fs');
const path = require('path');

const buildTime = new Date().toISOString();
const content = `// Auto-generated at build time. Do not edit.
export const BUILD_TIME = '${buildTime}';
`;

const outPath = path.join(process.cwd(), 'lib', 'build-time.ts');
fs.writeFileSync(outPath, content);

console.log('✓ Generated lib/build-time.ts with timestamp:', buildTime);
