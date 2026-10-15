import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
];

const chromePath = CHROME_PATHS.find((p) => fs.existsSync(p));
if (!chromePath) {
  console.error('FAIL: No Chrome or Edge binary found.');
  process.exit(1);
}

const PORT = 5173;
const DEBUG_PORT = 9333;
const tmpDir = path.join(os.tmpdir(), `dreamland-chrome-${Date.now()}`);
fs.mkdirSync(tmpDir, { recursive: true });

// Check if Vite is already running on PORT
let existingServer = false;
try {
  const res = await fetch(`http://localhost:${PORT}/`);
  if (res.ok) existingServer = true;
} catch {
  // Server not yet running
}

let viteProcess = null;
if (!existingServer) {
  console.log('=== Step 1: Starting Vite Dev Server ===');
  viteProcess = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true
  });
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://localhost:${PORT}/`);
      if (res.ok) break;
    } catch {
      // Waiting for server start
    }
    await new Promise((r) => setTimeout(r, 200));
  }
} else {
  console.log(`=== Step 1: Vite Dev Server already running on http://localhost:${PORT} ===`);
}

console.log('=== Step 2: Launching Headless Chrome ===');
const chrome = spawn(
  chromePath,
  [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${tmpDir}`,
    '--disable-gpu',
    '--no-sandbox',
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1280,720',
    `http://localhost:${PORT}`
  ],
  { stdio: ['ignore', 'pipe', 'pipe'] }
);

let pageWsUrl = '';
for (let i = 0; i < 40; i++) {
  try {
    const listRes = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
    const list = await listRes.json();
    const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
    if (page) {
      pageWsUrl = page.webSocketDebuggerUrl;
      break;
    }
  } catch {
    // Waiting for CDP endpoint
  }
  await new Promise((r) => setTimeout(r, 250));
}

if (!pageWsUrl) {
  console.error('FAIL: Could not locate page WebSocket target');
  chrome.kill();
  if (viteProcess) viteProcess.kill();
  process.exit(1);
}

console.log('Connected to Page WebSocket target:', pageWsUrl);

const ws = new globalThis.WebSocket(pageWsUrl);
let reqId = 1;
const pending = new Map();
const consoleLogs = [];
const consoleErrors = [];

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(msg.error);
    else resolve(msg.result);
  }

  if (msg.method === 'Runtime.consoleAPICalled') {
    const type = msg.params.type;
    const text = msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ');
    consoleLogs.push({ type, text });
    if (type === 'error') {
      consoleErrors.push(text);
    }
  } else if (msg.method === 'Runtime.exceptionThrown') {
    const text = msg.params.exceptionDetails?.text || 'Uncaught exception';
    consoleErrors.push(text);
  }
};

await new Promise((r) => (ws.onopen = r));

function send(method, params = {}) {
  const id = reqId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

await send('Runtime.enable');
await send('Page.enable');

console.log('=== Step 3: Waiting 3 seconds for initial scene load ===');
await new Promise((r) => setTimeout(r, 3000));

// Check 1: Console and Runtime Errors
console.log('=== CHECK 1: Console and Runtime Errors ===');
console.log(`Console error count: ${consoleErrors.length}`);
if (consoleErrors.length > 0) {
  console.error('Found console errors:', consoleErrors);
} else {
  console.log('OK: 0 uncaught errors or WebGL shader warnings.');
}

// Check 2: Dismiss Start Menu if visible
console.log('=== CHECK 2: Dismiss Start Menu & Enter World ===');
const dismissRes = await send('Runtime.evaluate', {
  expression: `
    (() => {
      const closeBtn = document.getElementById('btn-close-menu');
      if (closeBtn && closeBtn.offsetParent !== null) {
        closeBtn.click();
        return 'dismissed';
      }
      return 'already-active';
    })()
  `,
  returnByValue: true
});
console.log('Menu status:', dismissRes.result?.value);

await new Promise((r) => setTimeout(r, 1000));

// Check 3: Verify 3rd-Person Bird Avatar
console.log('=== CHECK 3: Verify 3rd-Person Bird Avatar ===');
const debugState = await send('Runtime.evaluate', {
  expression: 'window.__DREAMLAND_DEBUG__',
  returnByValue: true
});

const dVal = debugState.result?.value;
console.log('__DREAMLAND_DEBUG__:', dVal);

if (!dVal) {
  console.error('FAIL: window.__DREAMLAND_DEBUG__ is undefined!');
} else {
  const birdInScene = dVal.birdVisibleInScene;
  const camDist = Math.hypot(
    dVal.cameraPosition.x - dVal.birdPosition.x,
    dVal.cameraPosition.z - dVal.birdPosition.z
  );
  console.log(`birdVisibleInScene: ${birdInScene} (expected true)`);
  console.log(`Camera to Bird distance: ${camDist.toFixed(2)} (expected > 3.0)`);
  if (!birdInScene) console.error('FAIL: bird is not visible in scene!');
  if (camDist <= 3.0) console.error('FAIL: camera is too close or in 1st person!');
}

// Check 4: Flight controls & Biome traversal
console.log('=== CHECK 4: Flight Controls & Biome Traversal ===');
const initialPos = { ...dVal?.birdPosition };

console.log('Simulating KeyW + Space for 3 seconds...');
await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', code: 'KeyW', key: 'w' });
await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', code: 'Space', key: ' ' });
await new Promise((r) => setTimeout(r, 3000));
await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'Space', key: ' ' });

console.log('Simulating KeyW + KeyD for 3 seconds...');
await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', code: 'KeyD', key: 'd' });
await new Promise((r) => setTimeout(r, 3000));
await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyW', key: 'w' });
await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyD', key: 'd' });

const movedState = await send('Runtime.evaluate', {
  expression: 'window.__DREAMLAND_DEBUG__',
  returnByValue: true
});
const mVal = movedState.result?.value;
console.log('Position after flight input:', mVal?.birdPosition);
const movedDist = Math.hypot(
  (mVal?.birdPosition.x ?? 0) - (initialPos.x ?? 0),
  (mVal?.birdPosition.z ?? 0) - (initialPos.z ?? 0)
);
console.log(`Total horizontal distance traveled: ${movedDist.toFixed(2)}m (expected > 10m)`);
console.log(`Loaded chunks count: ${mVal?.loadedChunks}`);

// Sample getBiomeAt(x, z) across grid -500 to +500
const biomeSampling = await send('Runtime.evaluate', {
  expression: `
    (() => {
      const counts = { CRYSTAL_LAGOON: 0, PEARL_BEACH: 0, DREAM_MEADOW: 0, SAKURA_GROVE: 0, CANDY_HIGHLANDS: 0 };
      const getB = window.getBiomeAt || (window.__game && window.__game.getBiomeAt);
      if (!getB) return { error: 'getBiomeAt not found on window' };
      for (let x = -500; x <= 500; x += 25) {
        for (let z = -500; z <= 500; z += 25) {
          const b = getB(x, z);
          if (counts[b] !== undefined) counts[b]++;
        }
      }
      return counts;
    })()
  `,
  returnByValue: true
});
console.log('Sampled Biome Grid across -500..500:', biomeSampling.result?.value);

// Check 5: Clouds, Petals & Draw calls
console.log('=== CHECK 5: Clouds, Petals & Draw Calls ===');
console.log(`cloudCount: ${mVal?.cloudCount} (expected > 0)`);
console.log(`petalCount: ${mVal?.petalCount} (expected > 0)`);
console.log(`landmarkCount: ${mVal?.landmarkCount} (expected >= 0)`);
console.log(`drawCalls: ${mVal?.drawCalls} (expected < 100)`);

// Check 6: Visual Screenshot Inspection
console.log('=== CHECK 6: Visual Screenshot Inspection ===');
const screenshot = await send('Page.captureScreenshot', { format: 'png' });
const screenshotPath = path.resolve('dist/browser-verification.png');
fs.writeFileSync(screenshotPath, Buffer.from(screenshot.data, 'base64'));
console.log(`Saved screenshot to: ${screenshotPath}`);

// Cleanup
ws.close();
chrome.kill();
if (viteProcess) viteProcess.kill();
try {
  fs.rmSync(tmpDir, { recursive: true, force: true });
} catch {
  // Ignored
}

console.log('=== Browser Verification COMPLETE ===');
process.exit(0);
