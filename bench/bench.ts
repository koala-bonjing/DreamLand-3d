import { BenchScene } from './scene';
import { BenchmarkHarness, SCENARIO_LADDER } from './harness';
import { ScenarioConfig, ScenarioResult, FullBenchReport } from './types';

const canvas = document.getElementById('webgl-canvas') as HTMLCanvasElement;
const fpsMeter = document.getElementById('fps-meter') as HTMLDivElement;
const renderMeter = document.getElementById('render-meter') as HTMLDivElement;
const statusText = document.getElementById('status-text') as HTMLDivElement;
const resultCard = document.getElementById('result-card') as HTMLDivElement;
const tierBadges = document.getElementById('tier-badges') as HTMLDivElement;
const resultSummary = document.getElementById('result-summary') as HTMLDivElement;
const btnLadder = document.getElementById('btn-run-ladder') as HTMLButtonElement;
const btnHeat = document.getElementById('btn-run-heat') as HTMLButtonElement;
const btnSingle = document.getElementById('btn-run-single') as HTMLButtonElement;
const btnCopy = document.getElementById('btn-copy-json') as HTMLButtonElement;

const selDpr = document.getElementById('sel-dpr') as HTMLSelectElement;
const selFog = document.getElementById('sel-fog') as HTMLSelectElement;
const selTrees = document.getElementById('sel-trees') as HTMLSelectElement;
const selRing = document.getElementById('sel-ring') as HTMLSelectElement;

const scene = new BenchScene(canvas);
const harness = new BenchmarkHarness(scene);

let isRunning = false;
let latestReport: FullBenchReport | null = null;

// Initial scene setup
scene.applyScenario({
  pixelRatio: parseFloat(selDpr.value),
  fogFar: parseFloat(selFog.value),
  trees: parseInt(selTrees.value, 10),
  chunkRing: parseInt(selRing.value, 10)
});

// Passive render loop when not in active test
let lastOverlayUpdate = 0;
let frameCount = 0;

function animate(now: number) {
  if (!isRunning) {
    scene.render(now);
  }

  frameCount++;
  if (now - lastOverlayUpdate >= 500) {
    const elapsed = now - lastOverlayUpdate;
    const fps = Math.round((frameCount * 1000) / elapsed);
    const ms = (elapsed / frameCount).toFixed(1);
    fpsMeter.textContent = `FPS: ${fps} | Frame: ${ms} ms`;
    renderMeter.textContent = `Draws: ${scene.renderer.info.render.calls} | Tris: ${scene.renderer.info.render.triangles.toLocaleString()}`;
    frameCount = 0;
    lastOverlayUpdate = now;
  }

  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

function setUiDisabled(disabled: boolean) {
  isRunning = disabled;
  btnLadder.disabled = disabled;
  btnHeat.disabled = disabled;
  btnSingle.disabled = disabled;
  selDpr.disabled = disabled;
  selFog.disabled = disabled;
  selTrees.disabled = disabled;
  selRing.disabled = disabled;
}

function displayReport(report: FullBenchReport) {
  latestReport = report;
  resultCard.style.display = 'block';

  const badge30 = report.tierStatus.tier30fps
    ? '<span class="tier-badge tier-pass">30 FPS TIER: PASS</span>'
    : '<span class="tier-badge tier-fail">30 FPS TIER: FAIL</span>';

  const badge60 = report.tierStatus.tier60fps
    ? '<span class="tier-badge tier-pass" style="margin-left:6px;">60 FPS TIER: PASS</span>'
    : '<span class="tier-badge tier-fail" style="margin-left:6px;">60 FPS TIER: FAIL</span>';

  tierBadges.innerHTML = `${badge30} ${badge60}`;

  const rec = report.recommendedScenario;
  let summary = `<strong>Device Tier Estimate:</strong> ${report.deviceTierEstimate}<br/>`;
  summary += `<strong>Recommended Settings:</strong> DPR ${rec.pixelRatio} × Fog ${rec.fogFar}m × Trees ${rec.trees} × Ring ${rec.chunkRing}<br/>`;

  if (report.heatTest) {
    summary += `<strong>Heat Test (3m):</strong> Drop ${report.heatTest.fpsDropPercent}% (Final FPS: ${report.heatTest.samples[report.heatTest.samples.length - 1]?.fps})<br/>`;
  }

  summary += `<br/><strong>Scenarios Tested (${report.scenarios.length}):</strong><br/>`;
  report.scenarios.forEach((s, idx) => {
    summary += `#${idx + 1} [DPR:${s.scenario.pixelRatio} Fog:${s.scenario.fogFar}m T:${s.scenario.trees} R:${s.scenario.chunkRing}] → p95: ${s.p95}ms | avg: ${s.avgFps}fps | tris: ${s.triangles.toLocaleString()}<br/>`;
  });

  resultSummary.innerHTML = summary;
}

async function runLadder() {
  setUiDisabled(true);
  resultCard.style.display = 'none';
  const results: ScenarioResult[] = [];

  for (let i = 0; i < SCENARIO_LADDER.length; i++) {
    const sc = SCENARIO_LADDER[i];
    statusText.textContent = `Running ladder scenario ${i + 1}/${SCENARIO_LADDER.length}...`;

    const res = await harness.measureScenario(sc, (phase, sec, fps) => {
      statusText.textContent = `Scenario ${i + 1}/${SCENARIO_LADDER.length} [${phase.toUpperCase()}]: ${sec}s left (${fps.toFixed(0)} FPS)`;
    });
    results.push(res);
  }

  statusText.textContent = 'Generating report...';
  const report = harness.generateReport(results);
  displayReport(report);
  statusText.textContent = 'Ladder test complete!';
  setUiDisabled(false);
}

async function runHeat() {
  setUiDisabled(true);
  resultCard.style.display = 'none';

  const cfg: ScenarioConfig = latestReport?.recommendedScenario || {
    pixelRatio: 1.25,
    fogFar: 90,
    trees: 1500,
    chunkRing: 2
  };

  statusText.textContent = 'Starting 3-minute sustained heat test...';
  const heatRes = await harness.runHeatTest(cfg, (secLeft, sample) => {
    statusText.textContent = `Heat Test: ${secLeft}s left | Current FPS: ${sample.fps} | p95: ${sample.p95}ms`;
  });

  const baseResults = latestReport?.scenarios || [
    {
      scenario: cfg,
      p50: heatRes.samples[0]?.p95 || 30,
      p95: heatRes.samples[0]?.p95 || 30,
      p99: heatRes.samples[0]?.p95 || 30,
      avgFps: heatRes.samples[0]?.fps || 30,
      drawCalls: scene.renderer.info.render.calls,
      triangles: scene.renderer.info.render.triangles
    }
  ];

  const report = harness.generateReport(baseResults, heatRes);
  displayReport(report);
  statusText.textContent = 'Heat test complete!';
  setUiDisabled(false);
}

async function runSingle() {
  setUiDisabled(true);
  resultCard.style.display = 'none';

  const cfg: ScenarioConfig = {
    pixelRatio: parseFloat(selDpr.value),
    fogFar: parseFloat(selFog.value),
    trees: parseInt(selTrees.value, 10),
    chunkRing: parseInt(selRing.value, 10)
  };

  statusText.textContent = 'Running single scenario test...';
  const res = await harness.measureScenario(cfg, (phase, sec, fps) => {
    statusText.textContent = `Single test [${phase.toUpperCase()}]: ${sec}s left (${fps.toFixed(0)} FPS)`;
  });

  const report = harness.generateReport([res]);
  displayReport(report);
  statusText.textContent = 'Scenario test complete!';
  setUiDisabled(false);
}

btnLadder.addEventListener('click', runLadder);
btnHeat.addEventListener('click', runHeat);
btnSingle.addEventListener('click', runSingle);

btnCopy.addEventListener('click', async () => {
  if (!latestReport) return;
  const jsonStr = JSON.stringify(latestReport, null, 2);
  try {
    await navigator.clipboard.writeText(jsonStr);
    btnCopy.textContent = '✓ Copied JSON to Clipboard!';
    setTimeout(() => {
      btnCopy.textContent = '📋 Copy JSON for PROGRESS.md';
    }, 2500);
  } catch {
    btnCopy.textContent = 'Manual copy needed';
  }
});

// Check auto-run query parameter
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('auto') === '1') {
  runLadder();
}
