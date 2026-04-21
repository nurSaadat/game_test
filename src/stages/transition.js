export class TransitionScene extends Phaser.Scene {
  constructor() {
    super({ key: "TransitionScene" });
  }

  init(data) {
    this.nextKey = data.nextKey;
  }

  create() {
    const gs = this.registry.get("gameState");
    const keyMap = this.registry.get("SCENE_KEY_MAP");
    const order = ["COLLECTION", "AGGREGATION", "TRANSPORT", "DESTRUCTION", "SCORECARD"];
    const stageNum = order.indexOf(this.nextKey);

    const containerCount = gs.containers.length;
    const totalMass = gs.aggregatedContainers
      .reduce((s, c) => s + (c.eligibleMassKg || c.massKg), 0);
    const penalties = [];
    if (gs.flags.provenanceGapPenalty) penalties.push("Provenance Gap");
    if (gs.flags.leakagePenalty) penalties.push("Leakage Penalty");

    this.cameras.main.setBackgroundColor("rgba(0,0,0,0.88)");

    if (this.nextKey === "SCORECARD") {
      this.add.text(450, 130, "GAME COMPLETE", {
        fontFamily: "monospace", fontSize: "40px", color: "#79c0ff", fontStyle: "bold",
      }).setOrigin(0.5);
    } else {
      this.add.text(450, 120, `STAGE ${stageNum} COMPLETE`, {
        fontFamily: "monospace", fontSize: "40px", color: "#79c0ff", fontStyle: "bold",
      }).setOrigin(0.5);
      this.add.text(450, 162, `↓  Next: ${STAGE_LABELS[this.nextKey]}`, {
        fontFamily: "monospace", fontSize: "20px", color: "#e6edf3", fontStyle: "bold",
      }).setOrigin(0.5);
    }

    const card = this.add.graphics();
    card.fillStyle(0x161b22, 1);
    card.fillRect(200, 200, 500, 252);
    card.lineStyle(1, 0x30363d, 1);
    card.strokeRect(200, 200, 500, 252);

    const rows = [
      ["Containers collected:", String(containerCount)],
      ["Total eligible mass:", totalMass.toFixed(2) + " kg"],
      ["Penalties:", penalties.length ? penalties.join(", ") : "None"],
      ["Net CO₂e avoided so far:", gs.score.netCO2eReduction.toFixed(1) + " t"],
    ];
    rows.forEach(([label, val], i) => {
      const ry = 232 + i * 50;
      this.add.text(224, ry, label, {
        fontFamily: "monospace", fontSize: "13px", color: "#8b949e",
      });
      this.add.text(224, ry + 18, val, {
        fontFamily: "monospace", fontSize: "14px", color: "#e6edf3", fontStyle: "bold",
      });
    });

    const btnLabel = this.nextKey === "SCORECARD" ? "VIEW SCORECARD →" : "NEXT STAGE →";
    const btn = this.add.graphics();
    btn.fillStyle(0x238636, 1);
    btn.fillRoundedRect(325, 480, 250, 46, 6);

    const btnText = this.add.text(450, 503, btnLabel, {
      fontFamily: "monospace", fontSize: "17px", color: "#ffffff", fontStyle: "bold",
    }).setOrigin(0.5);

    const hitZone = this.add.zone(450, 503, 250, 46).setInteractive({ useHandCursor: true });
    hitZone.on("pointerdown", () => {
      gs.stage = this.nextKey;
      gs.hud.update(this.nextKey, gs.score);
      this.scene.start(keyMap[this.nextKey]);
    });
  }
}

const STAGE_LABELS = {
  COLLECTION: "Stage 1 — Field Collection",
  AGGREGATION: "Stage 2 — Aggregation & Lab",
  TRANSPORT: "Stage 3 — Transport",
  DESTRUCTION: "Stage 4 — Destruction",
  SCORECARD: "Final Scorecard",
};
