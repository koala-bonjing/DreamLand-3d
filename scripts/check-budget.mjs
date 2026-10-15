import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const MAX_GZIP_KB = 250;
const DIST_DIR = path.resolve('dist');
const BUDGET_FILE = path.resolve('src/config/budget.ts');

console.log('--- Checking Performance Budget ---');

// 1. Verify src/config/budget.ts A15 limits
if (!fs.existsSync(BUDGET_FILE)) {
  console.error(`FAIL: Budget config not found at ${BUDGET_FILE}`);
  process.exit(1);
}

const budgetContent = fs.readFileSync(BUDGET_FILE, 'utf-8');

function extractValue(pattern, fallback = 0) {
  const match = budgetContent.match(pattern);
  return match ? Number(match[1].replace(/_/g, '')) : fallback;
}

const maxTris = extractValue(/maxTriangles:\s*([\d_]+)/);
const maxDrawCalls = extractValue(/maxDrawCalls:\s*([\d_]+)/);
const fogFar = extractValue(/fogFar:\s*([\d_]+)/);
const maxSprites = extractValue(/maxTransparentSprites:\s*([\d_]+)/);
const maxHeap = extractValue(/maxJsHeapMB:\s*([\d_]+)/);

const limits = [
  { name: 'A15 maxTriangles', val: maxTris, limit: 60000 },
  { name: 'A15 maxDrawCalls', val: maxDrawCalls, limit: 60 },
  { name: 'A15 fogFar', val: fogFar, limit: 100 },
  { name: 'A15 maxTransparentSprites', val: maxSprites, limit: 10 },
  { name: 'A15 maxJsHeapMB', val: maxHeap, limit: 150 }
];

let failed = false;
for (const item of limits) {
  if (item.val > item.limit) {
    console.error(`FAIL: ${item.name} is ${item.val}, exceeds budget limit ${item.limit}`);
    failed = true;
  } else {
    console.log(`OK: ${item.name} (${item.val} <= ${item.limit})`);
  }
}

// 2. Check main bundle gzipped size in dist/
if (!fs.existsSync(DIST_DIR)) {
  console.error(`FAIL: dist/ directory not found. Run 'npm run build' before check.`);
  process.exit(1);
}

function findMainJsFile(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = findMainJsFile(fullPath);
      if (nested) return nested;
    } else if (entry.isFile() && entry.name.endsWith('.js') && !entry.name.includes('bench')) {
      // primary js bundle
      return fullPath;
    }
  }
  return null;
}

const mainJsPath = findMainJsFile(DIST_DIR);
if (!mainJsPath) {
  console.error('FAIL: No main bundle JS file found in dist/');
  process.exit(1);
}

const fileBuffer = fs.readFileSync(mainJsPath);
const gzipped = zlib.gzipSync(fileBuffer);
const gzipKb = (gzipped.length / 1024).toFixed(2);

if (Number(gzipKb) > MAX_GZIP_KB) {
  console.error(`FAIL: Main bundle gzip size ${gzipKb} KB exceeds budget ${MAX_GZIP_KB} KB (${path.basename(mainJsPath)})`);
  failed = true;
} else {
  console.log(`OK: Main bundle gzip size ${gzipKb} KB <= ${MAX_GZIP_KB} KB (${path.basename(mainJsPath)})`);
}

if (failed) {
  console.error('Budget check FAILED.');
  process.exit(1);
}

console.log('All budget checks PASSED.');
process.exit(0);
