import { CollectionScene } from "./stages/collection.js";
import { AggregationScene } from "./stages/aggregation.js";
import { TransportScene } from "./stages/transport.js";
import { DestructionScene } from "./stages/destruction.js";
import { ScorecardScene } from "./ui/scorecard.js";
import { TransitionScene } from "./stages/transition.js";
import { HUD } from "./ui/hud.js";

const hud = new HUD();

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
  },
  hud,
};

const startStage = new URLSearchParams(location.search).get("stage") || "COLLECTION";

if (startStage !== "COLLECTION") {
  gameState.containers = [
    { fieldContainerId: "FC-001", origin: { id: "CP-001" }, massKg: 2.3, refrigerant: "HCFC-22", collectionLog: {}, provenanceOk: true },
    { fieldContainerId: "FC-002", origin: { id: "CP-002" }, massKg: 45.0, refrigerant: "CFC-12", collectionLog: {}, provenanceOk: true },
    { fieldContainerId: "FC-003", origin: { id: "CP-003" }, massKg: 0.7, refrigerant: "HFC-134a", collectionLog: {}, provenanceOk: true },
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
    const cc = { "HFC-134a": 0.326, "HFC-410A": 0.108, "HCFC-22": 0.242, "CFC-12": 0.217 };
    const netMass = c.eligibleMassKg;
    const directCO2 = netMass * (cc[c.refrigerant] || 0.25);
    const gwps = { "HFC-134a": 1530, "HFC-410A": 2088, "HFC-404A": 3922, "HFC-23": 14600, "CFC-12": 10200, "CFC-11": 4750, "HCFC-22": 1960 };
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

gameState.stage = startStage;

const SCENE_KEY_MAP = {
  COLLECTION: "CollectionScene",
  AGGREGATION: "AggregationScene",
  TRANSPORT: "TransportScene",
  DESTRUCTION: "DestructionScene",
  SCORECARD: "ScorecardScene",
};

class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }
  create() {
    const gs = this.registry.get("gameState");
    const keyMap = this.registry.get("SCENE_KEY_MAP");
    const sceneKey = keyMap[gs.stage];
    gs.hud.update(gs.stage, gs.score);
    this.scene.start(sceneKey);
  }
}

const config = {
  type: Phaser.AUTO,
  width: 900,
  height: 600,
  parent: "game-container",
  backgroundColor: "#0d1117",
  scene: [BootScene, CollectionScene, AggregationScene, TransportScene, DestructionScene, ScorecardScene, TransitionScene],
  callbacks: {
    preBoot: (game) => {
      game.registry.set("gameState", gameState);
      game.registry.set("SCENE_KEY_MAP", SCENE_KEY_MAP);
    },
  },
};

new Phaser.Game(config);
