// Extracts every inline <script>...</script> block from index.html and
// parses it as JS. Doesn't execute anything (safe for CI) — just fails
// the build on a syntax error, the same check done manually before every
// commit to this file.
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');
const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);

let ok = true;
blocks.forEach((code, i) => {
  try {
    new Function(code);
  } catch (e) {
    ok = false;
    console.error(`Script block ${i} failed to parse: ${e.message}`);
  }
});

console.log(`Checked ${blocks.length} inline <script> blocks.`);
if (!ok) process.exit(1);
