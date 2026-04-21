import { REFRIGERANTS } from "../data/refrigerants.js";

export class AggregationScene extends Phaser.Scene {
  constructor() {
    super({ key: "AggregationScene" });
  }

  create() {
    this.gs = this.registry.get("gameState");
    this.phase = "SORTING";
    this.beltOffset = 0;
    this.binContents = { HFC: [], CFC: [], HCFC: [], MIXED: [] };
    this.labQueue = [];
    this.labCurrent = null;
    this.labSliderDragging = false;

    this.binDefs = {
      HFC:   { x: 685, y: 55,  w: 185, h: 115, colour: 0x29B6F6, colourStr: "#29B6F6" },
      CFC:   { x: 685, y: 188, w: 185, h: 115, colour: 0x66BB6A, colourStr: "#66BB6A" },
      HCFC:  { x: 685, y: 321, w: 185, h: 115, colour: 0xFFA726, colourStr: "#FFA726" },
      MIXED: { x: 685, y: 454, w: 185, h: 115, colour: 0xCE93D8, colourStr: "#CE93D8" },
    };

    this.gfx = this.add.graphics();
    this.draggables = [];
    this.binZones = {};

    this._buildSortingUI();
  }

  _buildSortingUI() {
    this.add.text(20, 12, "STAGE 2 — AGGREGATION & SORTING", {
      fontFamily: "monospace", fontSize: "18px", color: "#79c0ff", fontStyle: "bold",
    });
    this.add.text(20, 38, "Drag containers to the correct bin (HFC / CFC / HCFC / MIXED)", {
      fontFamily: "monospace", fontSize: "13px", color: "#8b949e",
    });

    for (const [key, bin] of Object.entries(this.binDefs)) {
      const g = this.add.graphics();
      g.fillStyle(0x141a24, 1);
      g.fillRect(bin.x, bin.y, bin.w, bin.h);
      g.lineStyle(2, bin.colour, 1);
      g.strokeRect(bin.x, bin.y, bin.w, bin.h);

      this.add.text(bin.x + bin.w / 2, bin.y + 16, key, {
        fontFamily: "monospace", fontSize: "14px", color: bin.colourStr, fontStyle: "bold",
      }).setOrigin(0.5);

      bin._countText = this.add.text(bin.x + bin.w / 2, bin.y + 42, "", {
        fontFamily: "monospace", fontSize: "11px", color: "#8b949e",
      }).setOrigin(0.5);

      bin._kgText = this.add.text(bin.x + bin.w / 2, bin.y + 58, "", {
        fontFamily: "monospace", fontSize: "11px", color: "#8b949e",
      }).setOrigin(0.5);

      const zone = this.add.zone(bin.x + bin.w / 2, bin.y + bin.h / 2, bin.w, bin.h);
      zone.setRectangleDropZone(bin.w, bin.h);
      zone.binKey = key;
      this.binZones[key] = zone;
    }

    this.gs.containers.forEach((c, i) => {
      this._createDraggableContainer(c, 30, 70 + i * 140);
    });

    this.progressText = this.add.text(20, 584, "Sorted: 0 / " + this.gs.containers.length, {
      fontFamily: "monospace", fontSize: "13px", color: "#8b949e",
    });

    this.input.on("drag", (pointer, obj, dragX, dragY) => {
      obj.x = dragX;
      obj.y = dragY;
    });

    this.input.on("drop", (pointer, obj, dropZone) => {
      const key = dropZone.binKey;
      if (!key) return;
      const ok = this._onContainerDrop(obj.containerData, key);
      if (ok) {
        obj.destroy();
        this.draggables = this.draggables.filter(d => d !== obj);
        this._updateBinTexts(key);
        const sorted = this.gs.containers.length - this.draggables.length;
        this.progressText.setText("Sorted: " + sorted + " / " + this.gs.containers.length);
        if (this.draggables.length === 0) {
          this.time.delayedCall(400, () => this._startLabPhase());
        }
      } else {
        obj.x = obj.input.dragStartX;
        obj.y = obj.input.dragStartY;
      }
    });

    this.input.on("dragend", (pointer, obj, dropped) => {
      if (!dropped) {
        obj.x = obj.input.dragStartX;
        obj.y = obj.input.dragStartY;
      }
    });
  }

  _createDraggableContainer(container, x, y) {
    const r = REFRIGERANTS.find(rf => rf.id === container.refrigerant);
    const colour = r ? r.colour : "#555";
    const colourNum = r ? parseInt(r.colour.slice(1), 16) : 0x555555;

    const g = this.add.graphics();
    g.fillStyle(colourNum, 0.13);
    g.fillRect(-75, -47, 150, 95);
    g.lineStyle(2, colourNum, 1);
    g.strokeRect(-75, -47, 150, 95);
    g.fillStyle(colourNum, 1);
    g.fillRect(57, -41, 10, 10);

    const t1 = this.add.text(-68, -35, container.refrigerant, {
      fontFamily: "monospace", fontSize: "12px", color: "#e6edf3", fontStyle: "bold",
    });
    const t2 = this.add.text(-68, -17, container.massKg + " kg", {
      fontFamily: "monospace", fontSize: "11px", color: "#8b949e",
    });
    const t3 = this.add.text(-68, 0, container.fieldContainerId, {
      fontFamily: "monospace", fontSize: "11px", color: "#8b949e",
    });

    const cont = this.add.container(x + 75, y + 47, [g, t1, t2, t3]);
    cont.setSize(150, 95);
    cont.setInteractive({ useHandCursor: true, draggable: true });
    this.input.setDraggable(cont);
    cont.containerData = container;
    this.draggables.push(cont);
  }

  _onContainerDrop(container, targetBin) {
    const containerType = this._getRefrigerantClass(container.refrigerant);
    if (targetBin === "MIXED" || targetBin === containerType) {
      this.binContents[targetBin].push(container);
      if (targetBin === "MIXED") {
        this.gs.hud.showAlert("⚠️ Mixed container! 2 samples required. GWP uses the LOWER result.");
      } else {
        this.gs.hud.showSuccess("✅ " + container.refrigerant + " → " + targetBin + " bin");
      }
      return true;
    } else {
      this.gs.hud.showAlert("❌ Wrong bin! " + container.refrigerant + " is " + containerType + ", not " + targetBin + ".");
      this.gs.score.projectEmissions += 50;
      return false;
    }
  }

  _updateBinTexts(key) {
    const bin = this.binDefs[key];
    const contents = this.binContents[key];
    if (contents.length > 0) {
      bin._countText.setText(contents.length + " container(s)");
      const kg = contents.reduce((s, c) => s + c.massKg, 0);
      bin._kgText.setText(kg.toFixed(1) + " kg");
    }
  }

  _startLabPhase() {
    this.phase = "LAB";
    this.labQueue = Object.entries(this.binContents)
      .filter(([, contents]) => contents.length > 0)
      .map(([key, contents]) => ({ binKey: key, containers: contents }));

    this.children.removeAll(true);
    this.gfx = this.add.graphics();
    this._nextLabSample();
  }

  _nextLabSample() {
    if (this.labQueue.length === 0) {
      this._advance();
      return;
    }

    const entry = this.labQueue.shift();
    const correctX = 140 + Math.floor(Math.random() * 320);
    const falsePeaks = [];
    for (let i = 0; i < 4; i++) {
      let px;
      do { px = 80 + Math.floor(Math.random() * 440); }
      while (Math.abs(px - correctX) < 40);
      falsePeaks.push(px);
    }

    this.labCurrent = {
      binKey: entry.binKey,
      containers: entry.containers,
      sliderX: 85,
      targetPeakX: correctX,
      falsePeakPositions: falsePeaks,
      confirmed: false,
    };

    this._buildLabUI();
  }

  _buildLabUI() {
    this.children.removeAll(true);
    this.gfx = this.add.graphics();

    const lc = this.labCurrent;
    const baseY = 350;

    this.add.text(20, 14, "LAB ANALYSIS — Gas Chromatography", {
      fontFamily: "monospace", fontSize: "18px", color: "#79c0ff", fontStyle: "bold",
    });
    this.add.text(20, 40, "Bin: " + lc.binKey + "   |   Drag the red cursor to the correct peak, then CONFIRM", {
      fontFamily: "monospace", fontSize: "13px", color: "#8b949e",
    });

    const g = this.gfx;

    g.fillStyle(0x161b22, 1);
    g.fillRect(40, 75, 560, 305);
    g.lineStyle(1, 0x30363d, 1);
    g.strokeRect(40, 75, 560, 305);

    g.lineStyle(1, 0x444444, 1);
    g.lineBetween(60, baseY, 580, baseY);

    this.add.text(320, 366, "Retention Time →", {
      fontFamily: "monospace", fontSize: "11px", color: "#555555",
    }).setOrigin(0.5);

    for (const px of lc.falsePeakPositions) {
      g.fillStyle(0x383838, 1);
      g.fillTriangle(px, baseY, px + 11, baseY - 52, px + 22, baseY);
    }

    const tp = lc.targetPeakX;
    g.fillStyle(0xffa726, 1);
    g.fillTriangle(tp, baseY, tp + 13, baseY - 92, tp + 26, baseY);

    g.fillStyle(0x3fb950, 0.12);
    g.fillRect(tp - 8, 85, 50, 275);

    g.fillStyle(0x161b22, 1);
    g.fillRect(620, 75, 258, 305);
    g.lineStyle(1, 0x30363d, 1);
    g.strokeRect(620, 75, 258, 305);

    this.add.text(634, 90, "Bin: " + lc.binKey, {
      fontFamily: "monospace", fontSize: "13px", color: "#79c0ff", fontStyle: "bold",
    });
    this.add.text(634, 114, "Containers:", {
      fontFamily: "monospace", fontSize: "11px", color: "#8b949e",
    });
    lc.containers.forEach((c, i) => {
      this.add.text(634, 136 + i * 24, c.refrigerant + "  " + c.massKg + " kg", {
        fontFamily: "monospace", fontSize: "12px", color: "#e6edf3",
      });
    });

    this.sliderLine = this.add.graphics();
    this.sliderHandle = this.add.circle(lc.sliderX, 90, 9, 0xf85149).setInteractive({ useHandCursor: true, draggable: true });
    this.input.setDraggable(this.sliderHandle);

    this._drawSliderLine(lc.sliderX);

    this.input.on("drag", (pointer, obj, dragX) => {
      if (obj === this.sliderHandle) {
        const nx = Phaser.Math.Clamp(dragX, 65, 570);
        obj.x = nx;
        lc.sliderX = nx;
        this._drawSliderLine(nx);
      }
    });

    const confirmBg = this.add.graphics();
    confirmBg.fillStyle(0x238636, 1);
    confirmBg.fillRoundedRect(290, 415, 210, 46, 6);
    this.add.text(395, 438, "CONFIRM READING", {
      fontFamily: "monospace", fontSize: "15px", color: "#ffffff", fontStyle: "bold",
    }).setOrigin(0.5);
    const confirmZone = this.add.zone(395, 438, 210, 46).setInteractive({ useHandCursor: true });
    confirmZone.on("pointerdown", () => {
      if (!lc.confirmed) {
        lc.confirmed = true;
        this._evaluateLabResult();
      }
    });
  }

  _drawSliderLine(x) {
    this.sliderLine.clear();
    this.sliderLine.lineStyle(2, 0xf85149, 1);
    this.sliderLine.lineBetween(x, 85, x, 350);
  }

  _evaluateLabResult() {
    const lc = this.labCurrent;
    const dist = Math.abs(lc.sliderX - (lc.targetPeakX + 13));
    const good = dist <= 28;

    const moisturePPM = good ? 60 : 500;
    const HBR = good ? 0.1 : 2.0;

    lc.containers.forEach(c => {
      const eligibleMass = c.massKg * (1 - (moisturePPM / 1_000_000) - (HBR / 100));
      const r = REFRIGERANTS.find(rf => rf.id === c.refrigerant);
      this.gs.aggregatedContainers.push({
        ...c,
        eligibleMassKg: eligibleMass,
        GWPeffective: r ? r.GWP : 1960,
        labVerified: true,
      });
    });

    if (good) {
      this.gs.hud.showSuccess("✅ GC reading accepted! Moisture: " + moisturePPM + " ppm | HBR: " + HBR + "%");
    } else {
      this.gs.hud.showAlert("⚠️ Off-target reading. Moisture: " + moisturePPM + " ppm | HBR: " + HBR + "% — deductions applied");
    }

    this.time.delayedCall(1600, () => this._nextLabSample());
  }

  _getRefrigerantClass(refrigerantId) {
    const HFCs = ["HFC-134a", "HFC-410A", "HFC-404A", "HFC-23"];
    const CFCs = ["CFC-12", "CFC-11"];
    const HCFCs = ["HCFC-22"];
    if (HFCs.includes(refrigerantId)) return "HFC";
    if (CFCs.includes(refrigerantId)) return "CFC";
    if (HCFCs.includes(refrigerantId)) return "HCFC";
    return "OTHER";
  }

  _advance() {
    this.gs.hud.clearOverlay();
    this.scene.start("TransitionScene", { nextKey: "TRANSPORT" });
  }
}
