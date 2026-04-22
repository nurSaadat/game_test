import { REFRIGERANTS } from "../data/refrigerants.js";

export class AggregationScene extends Phaser.Scene {
  constructor() {
    super({ key: "AggregationScene" });
  }

  create() {
    this.gs = this.registry.get("gameState");
    this.phase = "SORTING";
    this.binContents = { HFC: [], CFC: [], HCFC: [], MIXED: [] };
    this.labQueue = [];
    this.labCurrent = null;

    this.binDefs = {
      HFC:   { x: 520, y: 70,  w: 170, h: 112, colour: 0x29B6F6, colourStr: "#29B6F6" },
      CFC:   { x: 520, y: 192, w: 170, h: 112, colour: 0x66BB6A, colourStr: "#66BB6A" },
      HCFC:  { x: 520, y: 314, w: 170, h: 112, colour: 0xFFA726, colourStr: "#FFA726" },
      MIXED: { x: 520, y: 436, w: 170, h: 112, colour: 0xCE93D8, colourStr: "#CE93D8" },
    };

    // Pre-compute expected container count per tank
    for (const key of Object.keys(this.binDefs)) {
      const bin = this.binDefs[key];
      if (key === "MIXED") {
        bin._expectedCount = 0;
      } else {
        bin._expectedCount = this.gs.containers
          .filter(c => this._getRefrigerantClass(c.refrigerant) === key).length;
      }
      bin._filledCount = 0;
    }

    this.gfx = this.add.graphics();
    this.draggables = [];
    this.binZones = {};

    this._buildSortingUI();
  }

  _buildSortingUI() {
    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x0d1117, 1);
    bg.fillRect(0, 0, 900, 600);

    // Subtle warehouse floor
    bg.fillStyle(0x111820, 1);
    bg.fillRect(0, 540, 900, 60);
    bg.lineStyle(1, 0x1a2230, 0.4);
    for (let fx = 0; fx < 900; fx += 40) bg.lineBetween(fx, 540, fx, 600);

    this.add.text(20, 12, "STAGE 2 — AGGREGATION & SORTING", {
      fontFamily: "monospace", fontSize: "18px", color: "#79c0ff", fontStyle: "bold",
    });
    this.add.text(20, 38, "Drag canisters to the correct collection tank", {
      fontFamily: "monospace", fontSize: "13px", color: "#8b949e",
    });

    // Guide arrows between canister area and tanks
    const arrowG = this.add.graphics();
    arrowG.lineStyle(1, 0x30363d, 0.5);
    for (let ay = 130; ay < 480; ay += 120) {
      arrowG.lineBetween(250, ay, 490, ay);
      arrowG.fillStyle(0x30363d, 0.5);
      arrowG.fillTriangle(490, ay - 5, 490, ay + 5, 500, ay);
    }
    this.add.text(370, 290, "DRAG →", {
      fontFamily: "monospace", fontSize: "10px", color: "#30363d",
    }).setOrigin(0.5).setAngle(-5);

    // Build tank bins
    for (const [key, bin] of Object.entries(this.binDefs)) {
      this._drawTank(bin, key);

      const { bodyTop } = this._getTankMetrics(bin);
      bin._countText = this.add.text(bin.x + bin.w / 2, bodyTop + 34, "", {
        fontFamily: "monospace", fontSize: "10px", color: "#8b949e",
      }).setOrigin(0.5).setDepth(3);

      bin._kgText = this.add.text(bin.x + bin.w / 2, bodyTop + 47, "", {
        fontFamily: "monospace", fontSize: "10px", color: "#8b949e",
      }).setOrigin(0.5).setDepth(3);

      const zone = this.add.zone(bin.x + bin.w / 2, bin.y + bin.h / 2, bin.w, bin.h);
      zone.setRectangleDropZone(bin.w, bin.h);
      zone.binKey = key;
      this.binZones[key] = zone;
    }

    // Build draggable canisters in a 2-column grid
    this.gs.containers.forEach((c, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const cx = 55 + col * 90;
      const cy = 80 + row * 115;
      this._createDraggableCanister(c, cx, cy);
    });

    this.progressText = this.add.text(20, 578, "Sorted: 0 / " + this.gs.containers.length, {
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

  // ═══════════════════════ CANISTER (draggable) ═══════════════════════

  _createDraggableCanister(container, x, y) {
    const cw = 60, ch = 70;
    const r = REFRIGERANTS.find(rf => rf.id === container.refrigerant);
    const colourNum = r ? parseInt(r.colour.slice(1), 16) : 0x555555;

    const g = this.add.graphics();
    this._drawCanisterShape(g, -cw / 2, -ch / 2, cw, ch, false, colourNum);

    const t1 = this.add.text(0, -4, container.refrigerant, {
      fontFamily: "monospace", fontSize: "9px", color: "#e6edf3", fontStyle: "bold",
    }).setOrigin(0.5);
    const t2 = this.add.text(0, 10, container.massKg + " kg", {
      fontFamily: "monospace", fontSize: "8px", color: "#c8d1da",
    }).setOrigin(0.5);

    const cont = this.add.container(x + cw / 2, y + ch / 2, [g, t1, t2]);
    cont.setSize(cw, ch);
    cont.setInteractive({ useHandCursor: true, draggable: true });
    this.input.setDraggable(cont);
    cont.containerData = container;
    cont.setDepth(10);
    this.draggables.push(cont);
  }

  _drawCanisterShape(g, x, y, w, h, isPlaceholder, tintColour) {
    const neckW = w * 0.3, neckH = h * 0.22;
    const neckX = x + (w - neckW) / 2;
    const bodyY = y + neckH, bodyH = h - neckH;

    if (isPlaceholder) {
      g.lineStyle(1, 0x2a3444, 0.8);
      g.strokeRoundedRect(neckX, y, neckW, neckH + 2, 2);
      g.strokeRoundedRect(x + 2, bodyY, w - 4, bodyH, 4);
      g.fillStyle(0x1a2230, 0.5);
      g.fillRoundedRect(neckX, y, neckW, neckH + 2, 2);
      g.fillRoundedRect(x + 2, bodyY, w - 4, bodyH, 4);
    } else {
      const bodyCol = tintColour || 0x4a7a5a;
      // Neck
      g.fillStyle(0x666666, 1);
      g.fillRoundedRect(neckX, y, neckW, neckH + 4, 2);
      // Valve
      g.fillStyle(0xf85149, 1);
      g.fillCircle(x + w / 2, y + 3, 3);
      // Body
      g.fillStyle(bodyCol, 0.35);
      g.fillRoundedRect(x + 2, bodyY, w - 4, bodyH, 4);
      // Highlights
      g.fillStyle(0xffffff, 0.08);
      g.fillRect(x + 6, bodyY + 3, 4, bodyH - 6);
      g.fillStyle(0x000000, 0.1);
      g.fillRect(x + w - 10, bodyY + 3, 4, bodyH - 6);
      // Pressure gauge dot
      g.fillStyle(0x1a2332, 1);
      g.fillCircle(x + w / 2, bodyY + bodyH * 0.65, 5);
      g.lineStyle(1, bodyCol, 1);
      g.strokeCircle(x + w / 2, bodyY + bodyH * 0.65, 5);
      // Outline
      g.lineStyle(1, bodyCol, 0.8);
      g.strokeRoundedRect(x + 2, bodyY, w - 4, bodyH, 4);
    }
  }

  // ═══════════════════════ TANK (drop target bin) ═══════════════════════

  _getTankMetrics(bin) {
    const domeH = bin.h * 0.2;
    const bodyTop = bin.y + domeH;
    const bodyH = bin.h * 0.72;
    const bodyX = bin.x + 10;
    const bodyW = bin.w - 20;
    return { domeH, bodyTop, bodyH, bodyX, bodyW };
  }

  _drawTank(bin, key) {
    const { x, y, w, h, colour, colourStr } = bin;
    const { domeH, bodyTop, bodyH, bodyX, bodyW } = this._getTankMetrics(bin);
    const n = bin._expectedCount;

    // Layer 1: tank background (body fill + dome fill)
    const bg = this.add.graphics().setDepth(1);

    // Shadow
    bg.fillStyle(0x000000, 0.2);
    bg.fillEllipse(x + w / 2, y + h - 2, w * 0.85, 10);

    // Main cylinder body background
    bg.fillStyle(0x141a24, 1);
    bg.fillRoundedRect(bodyX, bodyTop, bodyW, bodyH, 4);

    // Dome top background
    bg.fillStyle(0x141a24, 1);
    bg.fillEllipse(x + w / 2, bodyTop + 2, bodyW, domeH);

    // Base plate + feet
    bg.fillStyle(0x333333, 1);
    bg.fillRect(x + 6, bodyTop + bodyH - 2, w - 12, 6);
    bg.fillStyle(0x444444, 1);
    bg.fillRect(x + 14, y + h - 8, 10, 8);
    bg.fillRect(x + w - 24, y + h - 8, 10, 8);

    // Layer 2: liquid fill (drawn on top of background, below frame)
    bin._fillGfx = this.add.graphics().setDepth(2);

    // Layer 3: tank frame (outlines, details, dome stroke — all non-filled)
    const fr = this.add.graphics().setDepth(3);

    // Body outline
    fr.lineStyle(2, colour, 0.7);
    fr.strokeRoundedRect(bodyX, bodyTop, bodyW, bodyH, 4);

    // Dome outline + tint
    fr.lineStyle(2, colour, 0.7);
    fr.strokeEllipse(x + w / 2, bodyTop + 2, bodyW, domeH);
    fr.fillStyle(colour, 0.06);
    fr.fillEllipse(x + w / 2, bodyTop + 2, bodyW - 4, domeH - 2);

    // Segment divider lines inside body
    if (n > 1) {
      fr.lineStyle(1, colour, 0.2);
      for (let s = 1; s < n; s++) {
        const sy = bodyTop + bodyH - (s / n) * bodyH;
        fr.lineBetween(bodyX + 4, sy, bodyX + bodyW - 4, sy);
      }
    }

    // Segment count markers on right side
    if (n > 0) {
      for (let s = 0; s < n; s++) {
        const segY = bodyTop + bodyH - ((s + 0.5) / n) * bodyH;
        this.add.text(bodyX + bodyW + 6, segY, String(s + 1), {
          fontFamily: "monospace", fontSize: "8px", color: colourStr,
        }).setOrigin(0, 0.5).setDepth(4).setAlpha(0.35);
      }
    }

    // Valve neck on top
    fr.fillStyle(0x555555, 1);
    fr.fillRoundedRect(x + w / 2 - 7, y + 2, 14, domeH * 0.7, 2);
    fr.lineStyle(2, 0x888888, 1);
    fr.strokeCircle(x + w / 2, y + 4, 5);
    fr.fillStyle(0x666666, 1);
    fr.fillCircle(x + w / 2, y + 4, 2);

    // Vertical rivet lines
    fr.lineStyle(1, colour, 0.12);
    fr.lineBetween(bodyX + bodyW * 0.3, bodyTop + 8, bodyX + bodyW * 0.3, bodyTop + bodyH - 6);
    fr.lineBetween(bodyX + bodyW * 0.7, bodyTop + 8, bodyX + bodyW * 0.7, bodyTop + bodyH - 6);

    // Pressure gauge (side)
    fr.fillStyle(0x1a2332, 1);
    fr.fillCircle(bodyX + bodyW - 6, bodyTop + 18, 8);
    fr.lineStyle(1, 0x555555, 0.8);
    fr.strokeCircle(bodyX + bodyW - 6, bodyTop + 18, 8);
    fr.fillStyle(0x3fb950, 1);
    fr.fillCircle(bodyX + bodyW - 6, bodyTop + 18, 2);

    // Bin label
    this.add.text(x + w / 2, bodyTop + 18, key, {
      fontFamily: "monospace", fontSize: "16px", color: colourStr, fontStyle: "bold",
    }).setOrigin(0.5).setDepth(4);

    // Capacity label
    const capLabel = n > 0 ? "0/" + n : "overflow";
    bin._capacityText = this.add.text(x + w / 2, bodyTop + bodyH - 10, capLabel, {
      fontFamily: "monospace", fontSize: "9px", color: "#8b949e",
    }).setOrigin(0.5).setDepth(4);
  }

  _fillTankSegment(bin) {
    const { bodyTop, bodyH, bodyX, bodyW } = this._getTankMetrics(bin);
    const n = Math.max(1, bin._expectedCount || bin._filledCount);
    const filled = bin._filledCount;
    const fillH = (filled / n) * bodyH;
    const fillY = bodyTop + bodyH - fillH;

    const g = bin._fillGfx;
    g.clear();

    if (filled > 0) {
      // Liquid fill from bottom up
      g.fillStyle(bin.colour, 0.25);
      g.fillRect(bodyX + 3, fillY, bodyW - 6, fillH - 2);

      // Liquid surface highlight
      g.fillStyle(bin.colour, 0.15);
      g.fillRect(bodyX + 3, fillY, bodyW - 6, 3);

      // Bubble effect
      g.fillStyle(0xffffff, 0.08);
      for (let b = 0; b < filled; b++) {
        const bx = bodyX + 12 + (b * 31) % (bodyW - 24);
        const by = fillY + 8 + (b * 17) % Math.max(1, fillH - 16);
        g.fillCircle(bx, by, 2);
      }
    }

    // Update capacity label
    bin._capacityText.setText(filled + "/" + n);
  }

  // ═══════════════════════ DROP LOGIC ═══════════════════════

  _onContainerDrop(container, targetBin) {
    const containerType = this._getRefrigerantClass(container.refrigerant);
    if (targetBin === "MIXED" || targetBin === containerType) {
      this.binContents[targetBin].push(container);
      const bin = this.binDefs[targetBin];
      bin._filledCount++;
      if (targetBin === "MIXED" && bin._expectedCount === 0) {
        bin._expectedCount = 1;
      }
      if (bin._filledCount > bin._expectedCount) {
        bin._expectedCount = bin._filledCount;
      }
      this._fillTankSegment(bin);
      this._updateBinTexts(targetBin);
      if (targetBin === "MIXED") {
        this.gs.hud.showAlert("⚠️ Mixed container! 2 samples required. GWP uses the LOWER result.");
      } else {
        this.gs.hud.showSuccess("✅ " + container.refrigerant + " → " + targetBin + " tank");
      }
      return true;
    } else {
      this.gs.hud.showAlert("❌ Wrong tank! " + container.refrigerant + " is " + containerType + ", not " + targetBin + ".");
      this.gs.score.projectEmissions += 50;
      return false;
    }
  }

  _updateBinTexts(key) {
    const bin = this.binDefs[key];
    const contents = this.binContents[key];
    if (contents.length > 0) {
      bin._countText.setText(contents.length + " canister(s)");
      const kg = contents.reduce((s, c) => s + c.massKg, 0);
      bin._kgText.setText(kg.toFixed(1) + " kg");
    }
  }

  // ═══════════════════════ LAB PHASE ═══════════════════════

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
      sliderX: 65,
      targetPeakX: correctX,
      falsePeakPositions: falsePeaks,
      targetConcentration: 30 + Math.floor(Math.random() * 50),
      concDotValue: 0,
      cursorStopped: false,
      concDotStopped: false,
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
    this.add.text(20, 40, "Tank: " + lc.binKey + "   |   Press STOP to lock the cursor, then lock the concentration dot", {
      fontFamily: "monospace", fontSize: "13px", color: "#8b949e",
    });

    const g = this.gfx;

    // GC chart area
    g.fillStyle(0x161b22, 1);
    g.fillRect(40, 75, 560, 305);
    g.lineStyle(1, 0x30363d, 1);
    g.strokeRect(40, 75, 560, 305);

    g.lineStyle(1, 0x444444, 1);
    g.lineBetween(60, baseY, 580, baseY);

    this.add.text(320, 366, "Retention Time →", {
      fontFamily: "monospace", fontSize: "11px", color: "#555555",
    }).setOrigin(0.5);

    // False peaks
    for (const px of lc.falsePeakPositions) {
      g.fillStyle(0x383838, 1);
      g.fillTriangle(px, baseY, px + 11, baseY - 52, px + 22, baseY);
    }

    // Target peak
    const tp = lc.targetPeakX;
    g.fillStyle(0xffa726, 1);
    g.fillTriangle(tp, baseY, tp + 13, baseY - 92, tp + 26, baseY);

    // Green target zone (subtle)
    g.fillStyle(0x3fb950, 0.12);
    g.fillRect(tp - 8, 85, 50, 275);

    // ── Concentration meter (right panel) ──
    g.fillStyle(0x161b22, 1);
    g.fillRect(620, 75, 258, 305);
    g.lineStyle(1, 0x30363d, 1);
    g.strokeRect(620, 75, 258, 305);

    this.add.text(634, 90, "Tank: " + lc.binKey, {
      fontFamily: "monospace", fontSize: "13px", color: "#79c0ff", fontStyle: "bold",
    });
    this.add.text(634, 114, "Canisters:", {
      fontFamily: "monospace", fontSize: "11px", color: "#8b949e",
    });
    lc.containers.forEach((c, i) => {
      this.add.text(634, 136 + i * 20, c.refrigerant + "  " + c.massKg + " kg", {
        fontFamily: "monospace", fontSize: "11px", color: "#e6edf3",
      });
    });

    // Concentration gauge bar (vertical bar on right panel)
    const gaugeX = 820, gaugeY = 100, gaugeW = 30, gaugeH = 240;
    g.fillStyle(0x0d1117, 1);
    g.fillRect(gaugeX, gaugeY, gaugeW, gaugeH);
    g.lineStyle(1, 0x30363d, 1);
    g.strokeRect(gaugeX, gaugeY, gaugeW, gaugeH);

    // Green target zone on gauge
    const targetConc = lc.targetConcentration;
    const targetFrac = targetConc / 100;
    const greenH = gaugeH * 0.15;
    const greenY = gaugeY + gaugeH - targetFrac * gaugeH - greenH / 2;
    g.fillStyle(0x3fb950, 0.2);
    g.fillRect(gaugeX, greenY, gaugeW, greenH);

    // Gauge labels
    this.add.text(gaugeX + gaugeW / 2, gaugeY - 8, "CONC", {
      fontFamily: "monospace", fontSize: "8px", color: "#8b949e",
    }).setOrigin(0.5);
    this.add.text(gaugeX + gaugeW + 4, gaugeY, "100", {
      fontFamily: "monospace", fontSize: "7px", color: "#555555",
    });
    this.add.text(gaugeX + gaugeW + 4, gaugeY + gaugeH - 6, "0", {
      fontFamily: "monospace", fontSize: "7px", color: "#555555",
    });

    // Store gauge metrics for update loop
    lc.gaugeX = gaugeX;
    lc.gaugeY = gaugeY;
    lc.gaugeW = gaugeW;
    lc.gaugeH = gaugeH;

    // ── Auto-moving cursor (red vertical line) ──
    this.sliderLine = this.add.graphics();
    this.sliderHandle = this.add.circle(lc.sliderX, 83, 7, 0xf85149);
    this._drawSliderLine(lc.sliderX);

    // ── Auto-moving concentration dot ──
    this.concDotGfx = this.add.graphics();
    this.concDotY = gaugeY + gaugeH - (lc.concDotValue / 100) * gaugeH;
    this._drawConcDot();

    // ── Status labels ──
    this.cursorStatusText = this.add.text(60, 385, "▶ Cursor moving…", {
      fontFamily: "monospace", fontSize: "11px", color: "#f85149",
    });
    this.concStatusText = this.add.text(620, 355, "", {
      fontFamily: "monospace", fontSize: "11px", color: "#8b949e",
    });

    // ── STOP button ──
    this.stopBtnBg = this.add.graphics();
    this.stopBtnBg.fillStyle(0xf85149, 1);
    this.stopBtnBg.fillRoundedRect(290, 415, 210, 46, 6);
    this.stopBtnText = this.add.text(395, 438, "⏹  STOP CURSOR", {
      fontFamily: "monospace", fontSize: "15px", color: "#ffffff", fontStyle: "bold",
    }).setOrigin(0.5);
    const stopZone = this.add.zone(395, 438, 210, 46).setInteractive({ useHandCursor: true });
    stopZone.on("pointerdown", () => this._onStopPress());
  }

  _onStopPress() {
    const lc = this.labCurrent;
    if (lc.confirmed) return;

    if (!lc.cursorStopped) {
      // First press: stop the cursor
      lc.cursorStopped = true;
      this.cursorStatusText.setText("■ Cursor locked at " + Math.round(lc.sliderX));
      this.cursorStatusText.setColor("#3fb950");
      this.concStatusText.setText("▶ Concentration dot moving…");
      this.concStatusText.setColor("#f85149");
      this.stopBtnBg.clear();
      this.stopBtnBg.fillStyle(0xf85149, 1);
      this.stopBtnBg.fillRoundedRect(290, 415, 210, 46, 6);
      this.stopBtnText.setText("⏹  STOP DOT");
    } else if (!lc.concDotStopped) {
      // Second press: stop the concentration dot and evaluate
      lc.concDotStopped = true;
      lc.confirmed = true;
      this.concStatusText.setText("■ Concentration locked");
      this.concStatusText.setColor("#3fb950");
      this.stopBtnBg.clear();
      this.stopBtnBg.fillStyle(0x333333, 1);
      this.stopBtnBg.fillRoundedRect(290, 415, 210, 46, 6);
      this.stopBtnText.setText("EVALUATING…");
      this.time.delayedCall(500, () => this._evaluateLabResult());
    }
  }

  update(time, delta) {
    if (this.phase !== "LAB" || !this.labCurrent) return;
    const lc = this.labCurrent;
    if (lc.confirmed) return;

    const speed = 2; // pixels per frame tick (~120 px/s at 60fps) — use delta for consistency
    const pxPerMs = 0.12;

    // Auto-move cursor
    if (!lc.cursorStopped) {
      lc.sliderX += pxPerMs * delta;
      if (lc.sliderX > 570) lc.sliderX = 65;
      this.sliderHandle.x = lc.sliderX;
      this._drawSliderLine(lc.sliderX);
    }

    // Auto-move concentration dot (after cursor is stopped)
    if (lc.cursorStopped && !lc.concDotStopped) {
      lc.concDotValue += pxPerMs * delta * 0.4;
      if (lc.concDotValue > 100) lc.concDotValue = 0;
      this._drawConcDot();
    }
  }

  _drawSliderLine(x) {
    this.sliderLine.clear();
    this.sliderLine.lineStyle(2, 0xf85149, 1);
    this.sliderLine.lineBetween(x, 85, x, 350);
  }

  _drawConcDot() {
    const lc = this.labCurrent;
    const dotY = lc.gaugeY + lc.gaugeH - (lc.concDotValue / 100) * lc.gaugeH;
    this.concDotGfx.clear();
    this.concDotGfx.fillStyle(0xf85149, 1);
    this.concDotGfx.fillCircle(lc.gaugeX + lc.gaugeW / 2, dotY, 6);
    this.concDotGfx.lineStyle(1, 0xffffff, 0.4);
    this.concDotGfx.strokeCircle(lc.gaugeX + lc.gaugeW / 2, dotY, 6);
    // Horizontal indicator line
    this.concDotGfx.lineStyle(1, 0xf85149, 0.4);
    this.concDotGfx.lineBetween(lc.gaugeX - 10, dotY, lc.gaugeX, dotY);
  }

  _evaluateLabResult() {
    const lc = this.labCurrent;

    // Cursor accuracy: distance from slider to peak center
    const cursorDist = Math.abs(lc.sliderX - (lc.targetPeakX + 13));
    const cursorGood = cursorDist <= 28;

    // Concentration accuracy: distance from dot value to target concentration
    const concDist = Math.abs(lc.concDotValue - lc.targetConcentration);
    const concGood = concDist <= 8;

    const good = cursorGood && concGood;

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
      const reasons = [];
      if (!cursorGood) reasons.push("cursor off-peak");
      if (!concGood) reasons.push("concentration off-target");
      this.gs.hud.showAlert("⚠️ " + reasons.join(" + ") + ". Moisture: " + moisturePPM + " ppm | HBR: " + HBR + "% — deductions applied");
    }

    this.time.delayedCall(1600, () => this._nextLabSample());
  }

  // ═══════════════════════ HELPERS ═══════════════════════

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
