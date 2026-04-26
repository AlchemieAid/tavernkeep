/**
 * Count lines of code across the project.
 * Run with: npm run loc
 */

const fs = require('fs');
const path = require('path');

const SKIP_DIRS = new Set([
  'node_modules', '.next', '.git', '.swc', 'dist', 'out', 'coverage',
]);

const EXTENSIONS = [
  '.ts', '.tsx', '.js', '.jsx', '.css', '.sql', '.json', '.md',
];

const counts = {};

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name));
    } else {
      const ext = path.extname(entry.name);
      if (!EXTENSIONS.includes(ext)) continue;
      const lines = fs.readFileSync(path.join(dir, entry.name), 'utf8').split('\n');
      const blank = lines.filter(l => l.trim() === '').length;
      if (!counts[ext]) counts[ext] = { files: 0, lines: 0, blank: 0 };
      counts[ext].files++;
      counts[ext].lines += lines.length;
      counts[ext].blank += blank;
    }
  }
}

walk(process.cwd());

console.log('\n📊 Lines of Code — TavernKeep\n');
console.log('Ext'.padEnd(8) + 'Files'.padStart(7) + 'Total'.padStart(9) + 'Code'.padStart(9) + 'Blank'.padStart(9));
console.log('─'.repeat(42));

let totalFiles = 0, totalLines = 0, totalBlank = 0;

for (const [ext, d] of Object.entries(counts).sort((a, b) => b[1].lines - a[1].lines)) {
  console.log(
    ext.padEnd(8) +
    String(d.files).padStart(7) +
    String(d.lines).padStart(9) +
    String(d.lines - d.blank).padStart(9) +
    String(d.blank).padStart(9)
  );
  totalFiles += d.files;
  totalLines += d.lines;
  totalBlank += d.blank;
}

console.log('─'.repeat(42));
console.log(
  'TOTAL'.padEnd(8) +
  String(totalFiles).padStart(7) +
  String(totalLines).padStart(9) +
  String(totalLines - totalBlank).padStart(9) +
  String(totalBlank).padStart(9)
);
console.log();
