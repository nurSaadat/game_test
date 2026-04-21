import { CollectionStage } from "./stages/collection.js";
import { AggregationStage } from "./stages/aggregation.js";
import { TransportStage }   from "./stages/transport.js";
import { DestructionStage } from "./stages/destruction.js";
import { Scorecard }        from "./ui/scorecard.js";
import { HUD }              from "./ui/hud.js";

const canvas = document.getElementById("gameCanvas");
const ctx    = canvas.getContext("2d");
const hud    = new HUD();

// Game state — mirrors the real protocol's "chain of custody"
const gameState = {
  stage: "COLLECTION",
  containers: [],
  aggregatedContainers: [],
  transportedContainers: [],
  destroyedBatches: [],
  score: {
    grossCO2eAvoided: 0,
    projectEmissions: 0,
    netCO2eReduction: 0,
    creditsIssued: 0,
  },
  flags: {
    provenanceGapPenalty: false,
    leakagePenalty: false,
  }
};

// Dev: ?stage=TRANSPORT jumps directly to a stage with mock data
const startStage = new URLSearchParams(location.search).get("stage") || "COLLECTION";

if (startStage !== "COLLECTION") {
  gameState.containers = [
    { fieldContainerId: "FC-001", origin: { id:"CP-001" }, massKg: 2.3,  refrigerant: "HCFC-22",  collectionLog: {}, provenanceOk: true },
    { fieldContainerId: "FC-002", origin: { id:"CP-002" }, massKg: 45.0, refrigerant: "CFC-12",   collectionLog: {}, provenanceOk: true },
    { fieldContainerId: "FC-003", origin: { id:"CP-003" }, massKg: 0.7,  refrigerant: "HFC-134a", collectionLog: {}, provenanceOk: true },
  ];
}
if (startStage !== "COLLECTION" && startStage !== "AGGREGATION") {
  gameState.containers.forEach(c => {
    gameState.aggregatedContainers.push({
      ...c, eligibleMassKg: c.massKg * 0.98, GWPeffective: 1960, labVerified: true,
    });
  });
}
if (startStage === "TRANSPORT" || startStage === "DESTRUCTION" || startStage === "SCORECARD") {
  gameState.transportedContainers = gameState.aggregatedContainers.map(c => ({ ...c }));
}
if (startStage === "SCORECARD") {
  gameState.transportedContainers.forEach(c => {
    const cc = { "HFC-134a":0.326, "HFC-410A":0.108, "HCFC-22":0.242, "CFC-12":0.217 };
    const netMass = c.eligibleMassKg;
    const directCO2 = netMass * (cc[c.refrigerant] || 0.25);
    const gwps = { "HFC-134a":1530, "HFC-410A":2088, "HFC-404A":3922, "HFC-23":14600, "CFC-12":10200, "CFC-11":4750, "HCFC-22":1960 };
    const gwp = gwps[c.refrigerant] || 1960;
    gameState.destroyedBatches.push({
      containerId: c.fieldContainerId, refrigerant: c.refrigerant,
      massDestroyed: netMass, DRE: 99.9998, directCO2Emitted: directCO2,
      destructionTime: new Date().toISOString(), attestationSigned: true,
    });
    gameState.score.grossCO2eAvoided += (netMass / 1000) * gwp;
    gameState.score.projectEmissions += directCO2;
  });
  gameState.score.netCO2eReduction = Math.max(0,
    gameState.score.grossCO2eAvoided - gameState.score.projectEmissions);
  gameState.score.creditsIssued = Math.floor(gameState.score.netCO2eReduction);
}

const STAGE_LABELS = {
  COLLECTION:  "Stage 1 — Field Collection",
  AGGREGATION: "Stage 2 — Aggregation & Lab",
  TRANSPORT:   "Stage 3 — Transport",
  DESTRUCTION: "Stage 4 — Destruction",
  SCORECARD:   "Final Scorecard",
};

let activeStage   = null;
let transitioning = false;

function advanceStage() {
  const order = ["COLLECTION","AGGREGATION","TRANSPORT","DESTRUCTION","SCORECARD"];
  const nextIndex = order.indexOf(gameState.stage) + 1;
  if (nextIndex >= order.length) return;
  const nextKey = order[nextIndex];

  if (activeStage) activeStage.stop();
  hud.clearOverlay();
  transitioning = true;

  showTransitionOverlay(nextKey, () => {
    transitioning = false;
    gameState.stage = nextKey;
    activeStage = stages[nextKey];
    activeStage.start();
  });
}

function showTransitionOverlay(nextKey, onDone) {
  const order = ["COLLECTION","AGGREGATION","TRANSPORT","DESTRUCTION","SCORECARD"];
  const stageNum = order.indexOf(nextKey); // 0-based; stage 1 = index 0

  const containerCount = gameState.containers.length;
  const totalMass = gameState.aggregatedContainers
    .reduce((s, c) => s + (c.eligibleMassKg || c.massKg), 0);
  const penalties = [];
  if (gameState.flags.provenanceGapPenalty) penalties.push("Provenance Gap");
  if (gameState.flags.leakagePenalty)       penalties.push("Leakage Penalty");

  const btnX = 325, btnY = 480, btnW = 250, btnH = 46;

  // Draw once — rAF loop is paused (transitioning=true) so canvas won't be cleared
  ctx.fillStyle = "rgba(0,0,0,0.88)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#79c0ff";
  ctx.font = "bold 40px monospace";
  ctx.textAlign = "center";
  if (nextKey === "SCORECARD") {
    ctx.fillText("GAME COMPLETE", 450, 130);
  } else {
    ctx.fillText(`STAGE ${stageNum} COMPLETE`, 450, 120);
    ctx.fillStyle = "#e6edf3";
    ctx.font = "bold 20px monospace";
    ctx.fillText(`↓  Next: ${STAGE_LABELS[nextKey]}`, 450, 162);
  }

  // Stats card
  ctx.fillStyle = "#161b22";
  ctx.fillRect(200, 200, 500, 252);
  ctx.strokeStyle = "#30363d";
  ctx.lineWidth = 1;
  ctx.strokeRect(200, 200, 500, 252);

  const rows = [
    ["Containers collected:",        String(containerCount)],
    ["Total eligible mass:",          totalMass.toFixed(2) + " kg"],
    ["Penalties:",                    penalties.length ? penalties.join(", ") : "None"],
    ["Net CO\u2082e avoided so far:", gameState.score.netCO2eReduction.toFixed(1) + " t"],
  ];
  rows.forEach(([label, val], i) => {
    const ry = 232 + i * 50;
    ctx.fillStyle = "#8b949e";
    ctx.font = "13px monospace";
    ctx.textAlign = "left";
    ctx.fillText(label, 224, ry);
    ctx.fillStyle = "#e6edf3";
    ctx.font = "bold 14px monospace";
    ctx.fillText(val, 224, ry + 18);
  });

  // Button
  ctx.fillStyle = "#238636";
  ctx.beginPath();
  ctx.roundRect(btnX, btnY, btnW, btnH, 6);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 17px monospace";
  ctx.textAlign = "center";
  const btnLabel = nextKey === "SCORECARD" ? "VIEW SCORECARD \u2192" : "NEXT STAGE \u2192";
  ctx.fillText(btnLabel, btnX + btnW / 2, btnY + 30);
  ctx.textAlign = "left";

  function onClick(e) {
    const r  = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    if (mx >= btnX && mx <= btnX + btnW && my >= btnY && my <= btnY + btnH) {
      canvas.removeEventListener("click", onClick);
      onDone();
    }
  }
  canvas.addEventListener("click", onClick);
}

// Construct stages — advanceStage is passed as a callback to avoid circular imports
const stages = {
  COLLECTION:  new CollectionStage(gameState, canvas, ctx, hud, advanceStage),
  AGGREGATION: new AggregationStage(gameState, canvas, ctx, hud, advanceStage),
  TRANSPORT:   new TransportStage(gameState, canvas, ctx, hud, advanceStage),
  DESTRUCTION: new DestructionStage(gameState, canvas, ctx, hud, advanceStage),
  SCORECARD:   new Scorecard(gameState, canvas, ctx, hud, advanceStage),
};

// Central rAF game loop
let lastTime = 0;
function loop(timestamp) {
  const dt = Math.min(timestamp - lastTime, 100); // cap to prevent spiral-of-death
  lastTime = timestamp;

  if (!transitioning) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (activeStage) {
      activeStage.update(dt);
      // Re-check: update() may have called advanceStage() which draws the transition overlay.
      // If so, skip render so we don't paint over it.
      if (!transitioning) {
        activeStage.render(ctx);
      }
    }
  }

  hud.update(gameState.stage, gameState.score);
  requestAnimationFrame(loop);
}

// Boot
gameState.stage = startStage;
activeStage = stages[startStage];
activeStage.start();
requestAnimationFrame(loop);
