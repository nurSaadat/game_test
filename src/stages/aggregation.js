// Stage 2: Sorting & purity testing
// Based on Protocol Sections 8.1.3, 8.1.4, 8.2 (Aggregation & Sample Analysis)

import { REFRIGERANTS } from "../data/refrigerants.js";

export class AggregationStage {
  constructor(gameState, canvas, ctx, hud, advanceStage) {
    this.state        = gameState;
    this.canvas       = canvas;
    this.ctx          = ctx;
    this.hud          = hud;
    this.advanceStage = advanceStage;

    this.phase          = "SORTING"; // "SORTING" | "LAB" | "DONE"
    this.containerRects = [];        // { container, x, y, w, h }
    this.dragging       = null;      // { container, rect, offsetX, offsetY, x, y }
    this.beltOffset     = 0;

    this.binRects = {
      HFC:   { x: 685, y:  55, w: 185, h: 115, colour: "#29B6F6" },
      CFC:   { x: 685, y: 188, w: 185, h: 115, colour: "#66BB6A" },
      HCFC:  { x: 685, y: 321, w: 185, h: 115, colour: "#FFA726" },
      MIXED: { x: 685, y: 454, w: 185, h: 115, colour: "#CE93D8" },
    };
    this.binContents = { HFC: [], CFC: [], HCFC: [], MIXED: [] };

    // Lab phase
    this.labQueue          = [];
    this.labCurrent        = null;
    this.labSliderDragging = false;

    this._mousedown = null;
    this._mousemove = null;
    this._mouseup   = null;
  }

  start() {
    this.phase          = "SORTING";
    this.binContents    = { HFC: [], CFC: [], HCFC: [], MIXED: [] };
    this.containerRects = this.state.containers.map((c, i) => ({
      container: c,
      x: 30,
      y: 70 + i * 140,
      w: 150,
      h: 95,
    }));

    this._mousedown = (e) => this._handleMouseDown(e);
    this._mousemove = (e) => this._handleMouseMove(e);
    this._mouseup   = (e) => this._handleMouseUp(e);
    this.canvas.addEventListener("mousedown", this._mousedown);
    this.canvas.addEventListener("mousemove", this._mousemove);
    this.canvas.addEventListener("mouseup",   this._mouseup);
  }

  stop() {
    this.canvas.removeEventListener("mousedown", this._mousedown);
    this.canvas.removeEventListener("mousemove", this._mousemove);
    this.canvas.removeEventListener("mouseup",   this._mouseup);
  }

  update(dt) {
    if (this.phase === "SORTING") {
      this.beltOffset = (this.beltOffset + dt * 0.08) % 40;
      // Transition to lab once all containers have been sorted
      if (this.containerRects.length === 0 && !this.dragging) {
        this.phase = "TRANSITIONING"; // prevent re-entry
        this._startLabPhase();
      }
    }
  }

  render(ctx) {
    ctx.fillStyle = "#111820";
    ctx.fillRect(0, 0, 900, 600);

    if (this.phase === "SORTING" || this.phase === "TRANSITIONING") {
      this._renderSorting(ctx);
    } else if (this.phase === "LAB") {
      this._renderLab(ctx);
    }
  }

  // ─────────────────────────── SORTING PHASE ───────────────────────────

  _renderSorting(ctx) {
    ctx.fillStyle = "#79c0ff";
    ctx.font = "bold 18px monospace";
    ctx.textAlign = "left";
    ctx.fillText("STAGE 2 \u2014 AGGREGATION & SORTING", 20, 30);
    ctx.fillStyle = "#8b949e";
    ctx.font = "13px monospace";
    ctx.fillText("Drag containers to the correct bin (HFC / CFC / HCFC / MIXED)", 20, 52);

    // Conveyor belt tracks
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(20, 430); ctx.lineTo(650, 430); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(20, 455); ctx.lineTo(650, 455); ctx.stroke();

    // Animated belt dashes
    ctx.strokeStyle = "#444";
    ctx.lineWidth = 2;
    ctx.setLineDash([14, 10]);
    ctx.lineDashOffset = -this.beltOffset;
    ctx.beginPath(); ctx.moveTo(20, 442); ctx.lineTo(650, 442); ctx.stroke();
    ctx.setLineDash([]);

    // Bins
    for (const [key, bin] of Object.entries(this.binRects)) {
      ctx.fillStyle = "#141a24";
      ctx.fillRect(bin.x, bin.y, bin.w, bin.h);
      ctx.strokeStyle = bin.colour;
      ctx.lineWidth = 2;
      ctx.strokeRect(bin.x, bin.y, bin.w, bin.h);

      ctx.fillStyle = bin.colour;
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "center";
      ctx.fillText(key, bin.x + bin.w / 2, bin.y + 24);

      const contents = this.binContents[key];
      if (contents.length > 0) {
        ctx.fillStyle = "#8b949e";
        ctx.font = "11px monospace";
        ctx.fillText(contents.length + " container(s)", bin.x + bin.w / 2, bin.y + 46);
        const kg = contents.reduce((s, c) => s + c.massKg, 0);
        ctx.fillText(kg.toFixed(1) + " kg", bin.x + bin.w / 2, bin.y + 62);
      }
    }
    ctx.textAlign = "left";

    // Containers on belt (skip the one being dragged — drawn on top)
    for (const rect of this.containerRects) {
      if (this.dragging && this.dragging.rect === rect) continue;
      this._drawContainer(ctx, rect.container, rect.x, rect.y, rect.w, rect.h, 1.0);
    }

    // Dragging container on top
    if (this.dragging) {
      ctx.globalAlpha = 0.78;
      this._drawContainer(ctx, this.dragging.container, this.dragging.x, this.dragging.y, 150, 95, 1.0);
      ctx.globalAlpha = 1.0;
    }

    // Progress
    const total  = this.state.containers.length;
    const sorted = total - this.containerRects.length;
    ctx.fillStyle = "#8b949e";
    ctx.font = "13px monospace";
    ctx.fillText("Sorted: " + sorted + " / " + total, 20, 590);
  }

  _drawContainer(ctx, container, x, y, w, h) {
    const r      = REFRIGERANTS.find(rf => rf.id === container.refrigerant);
    const colour = r ? r.colour : "#555";
    ctx.fillStyle   = colour + "22";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = colour;
    ctx.lineWidth   = 2;
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = "#e6edf3";
    ctx.font      = "bold 12px monospace";
    ctx.textAlign = "left";
    ctx.fillText(container.refrigerant, x + 7, y + 22);
    ctx.fillStyle = "#8b949e";
    ctx.font      = "11px monospace";
    ctx.fillText(container.massKg + " kg", x + 7, y + 40);
    ctx.fillText(container.fieldContainerId, x + 7, y + 57);
    // small colour swatch
    ctx.fillStyle = colour;
    ctx.fillRect(x + w - 18, y + 6, 10, 10);
  }

  // ─────────────────────────── LAB PHASE ───────────────────────────────

  _startLabPhase() {
    this.labQueue = Object.entries(this.binContents)
      .filter(([, contents]) => contents.length > 0)
      .map(([key, contents]) => ({ binKey: key, containers: contents }));
    this.phase = "LAB";
    this._nextLabSample();
  }

  _nextLabSample() {
    if (this.labQueue.length === 0) {
      this.phase = "DONE";
      this.advanceStage();
      return;
    }

    const entry   = this.labQueue.shift();
    const correctX = 140 + Math.floor(Math.random() * 320);
    const falsePeaks = [];
    for (let i = 0; i < 4; i++) {
      let px;
      do { px = 80 + Math.floor(Math.random() * 440); }
      while (Math.abs(px - correctX) < 40);
      falsePeaks.push(px);
    }

    this.labCurrent = {
      binKey:            entry.binKey,
      containers:        entry.containers,
      sliderX:           85,
      targetPeakX:       correctX,
      falsePeakPositions: falsePeaks,
      confirmed:         false,
    };
  }

  _renderLab(ctx) {
    if (!this.labCurrent) return;

    ctx.fillStyle = "#0d1117";
    ctx.fillRect(0, 0, 900, 600);

    ctx.fillStyle = "#79c0ff";
    ctx.font = "bold 18px monospace";
    ctx.textAlign = "left";
    ctx.fillText("LAB ANALYSIS \u2014 Gas Chromatography", 20, 32);
    ctx.fillStyle = "#8b949e";
    ctx.font = "13px monospace";
    ctx.fillText("Bin: " + this.labCurrent.binKey + "   |   Drag the red cursor to the correct peak, then CONFIRM", 20, 54);

    // GC panel
    ctx.fillStyle = "#161b22";
    ctx.fillRect(40, 75, 560, 305);
    ctx.strokeStyle = "#30363d";
    ctx.lineWidth = 1;
    ctx.strokeRect(40, 75, 560, 305);

    const baseY = 350;

    // Baseline
    ctx.strokeStyle = "#444";
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(60, baseY); ctx.lineTo(580, baseY); ctx.stroke();

    // Axis label
    ctx.fillStyle = "#555";
    ctx.font = "11px monospace";
    ctx.textAlign = "center";
    ctx.fillText("Retention Time \u2192", 320, 372);
    ctx.textAlign = "left";

    // False peaks
    ctx.fillStyle = "#383838";
    for (const px of this.labCurrent.falsePeakPositions) {
      ctx.beginPath();
      ctx.moveTo(px, baseY);
      ctx.lineTo(px + 11, baseY - 52);
      ctx.lineTo(px + 22, baseY);
      ctx.fill();
    }

    // Real target peak (orange)
    const tp = this.labCurrent.targetPeakX;
    ctx.fillStyle = "#ffa726";
    ctx.beginPath();
    ctx.moveTo(tp, baseY);
    ctx.lineTo(tp + 13, baseY - 92);
    ctx.lineTo(tp + 26, baseY);
    ctx.fill();

    // Correct zone highlight
    ctx.fillStyle = "rgba(63,185,80,0.12)";
    ctx.fillRect(tp - 8, 85, 50, 275);

    // Slider line
    const sx = this.labCurrent.sliderX;
    ctx.strokeStyle = "#f85149";
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(sx, 85); ctx.lineTo(sx, baseY); ctx.stroke();

    // Slider handle
    ctx.fillStyle = "#f85149";
    ctx.beginPath();
    ctx.arc(sx, 90, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "center";
    ctx.fillText("\u25bc", sx, 94);
    ctx.textAlign = "left";

    // Right panel — bin contents
    ctx.fillStyle = "#161b22";
    ctx.fillRect(620, 75, 258, 305);
    ctx.strokeStyle = "#30363d";
    ctx.strokeRect(620, 75, 258, 305);

    ctx.fillStyle = "#79c0ff";
    ctx.font = "bold 13px monospace";
    ctx.fillText("Bin: " + this.labCurrent.binKey, 634, 104);
    ctx.fillStyle = "#8b949e";
    ctx.font = "11px monospace";
    ctx.fillText("Containers:", 634, 124);
    this.labCurrent.containers.forEach((c, i) => {
      ctx.fillStyle = "#e6edf3";
      ctx.font = "12px monospace";
      ctx.fillText(c.refrigerant + "  " + c.massKg + " kg", 634, 146 + i * 24);
    });

    // Confirm button
    ctx.fillStyle = "#238636";
    ctx.beginPath();
    ctx.roundRect(290, 415, 210, 46, 6);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 15px monospace";
    ctx.textAlign = "center";
    ctx.fillText("CONFIRM READING", 395, 444);
    ctx.textAlign = "left";
  }

  // ─────────────────────────── MOUSE EVENTS ────────────────────────────

  _handleMouseDown(e) {
    const { x: mx, y: my } = this._mousePos(e);

    if (this.phase === "SORTING") {
      for (let i = this.containerRects.length - 1; i >= 0; i--) {
        const rect = this.containerRects[i];
        if (mx >= rect.x && mx <= rect.x + rect.w && my >= rect.y && my <= rect.y + rect.h) {
          this.dragging = {
            container: rect.container,
            rect,
            offsetX: mx - rect.x,
            offsetY: my - rect.y,
            x: rect.x,
            y: rect.y,
          };
          return;
        }
      }
    }

    if (this.phase === "LAB" && this.labCurrent) {
      const sx = this.labCurrent.sliderX;
      if (Math.abs(mx - sx) < 14 && my >= 82 && my <= 102) {
        this.labSliderDragging = true;
      }
    }
  }

  _handleMouseMove(e) {
    const { x: mx, y: my } = this._mousePos(e);

    if (this.dragging) {
      this.dragging.x = mx - this.dragging.offsetX;
      this.dragging.y = my - this.dragging.offsetY;
    }

    if (this.labSliderDragging && this.labCurrent) {
      this.labCurrent.sliderX = Math.max(65, Math.min(570, mx));
    }
  }

  _handleMouseUp(e) {
    const { x: mx, y: my } = this._mousePos(e);

    if (this.dragging) {
      let droppedOk = false;
      for (const [key, bin] of Object.entries(this.binRects)) {
        if (mx >= bin.x && mx <= bin.x + bin.w && my >= bin.y && my <= bin.y + bin.h) {
          droppedOk = this.onContainerDrop(this.dragging.container, key);
          break;
        }
      }
      if (droppedOk) {
        // Remove the rect that was being dragged
        this.containerRects = this.containerRects.filter(r => r !== this.dragging.rect);
      }
      // If not dropped successfully, the container snaps back (rect stays in array)
      this.dragging = null;
    }

    if (this.labSliderDragging) {
      this.labSliderDragging = false;
    }

    // CONFIRM button in lab phase
    if (this.phase === "LAB" && this.labCurrent && !this.labCurrent.confirmed) {
      if (mx >= 290 && mx <= 500 && my >= 415 && my <= 461) {
        this.labCurrent.confirmed = true;
        this._evaluateLabResult();
      }
    }
  }

  _mousePos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  // ─────────────────────────── GAME LOGIC ──────────────────────────────

  onContainerDrop(container, targetBin) {
    const containerType = this.getRefrigerantClass(container.refrigerant);

    if (targetBin === "MIXED" || targetBin === containerType) {
      this.binContents[targetBin].push(container);
      if (targetBin === "MIXED") {
        this.hud.showAlert("\u26a0\ufe0f Mixed container! 2 samples required. GWP uses the LOWER result.");
      } else {
        this.hud.showSuccess("\u2705 " + container.refrigerant + " \u2192 " + targetBin + " bin");
      }
      return true;
    } else {
      this.hud.showAlert("\u274c Wrong bin! " + container.refrigerant + " is " + containerType + ", not " + targetBin + ".");
      this.state.score.projectEmissions += 50;
      return false;
    }
  }

  _evaluateLabResult() {
    const dist = Math.abs(this.labCurrent.sliderX - (this.labCurrent.targetPeakX + 13));
    const good = dist <= 28;

    const moisturePPM = good ? 60    : 500;
    const HBR         = good ? 0.1   : 2.0;

    this.labCurrent.containers.forEach(c => {
      const eligibleMass = c.massKg * (1 - (moisturePPM / 1_000_000) - (HBR / 100));
      const r = REFRIGERANTS.find(rf => rf.id === c.refrigerant);
      this.state.aggregatedContainers.push({
        ...c,
        eligibleMassKg: eligibleMass,
        GWPeffective:   r ? r.GWP : 1960,
        labVerified:    true,
      });
    });

    if (good) {
      this.hud.showSuccess("\u2705 GC reading accepted! Moisture: " + moisturePPM + " ppm | HBR: " + HBR + "%");
    } else {
      this.hud.showAlert("\u26a0\ufe0f Off-target reading. Moisture: " + moisturePPM + " ppm | HBR: " + HBR + "% \u2014 deductions applied");
    }

    setTimeout(() => this._nextLabSample(), 1600);
  }

  getRefrigerantClass(refrigerantId) {
    const HFCs  = ["HFC-134a", "HFC-410A", "HFC-404A", "HFC-23"];
    const CFCs  = ["CFC-12", "CFC-11"];
    const HCFCs = ["HCFC-22"];
    if (HFCs.includes(refrigerantId))  return "HFC";
    if (CFCs.includes(refrigerantId))  return "CFC";
    if (HCFCs.includes(refrigerantId)) return "HCFC";
    return "OTHER";
  }
}
