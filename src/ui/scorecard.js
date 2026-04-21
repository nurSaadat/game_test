// GHG Statement / CO2e score tracker
// Mirrors the real Protocol's net CO2e reduction equation (Section 7.1)

import { REFRIGERANTS } from "../data/refrigerants.js";

export class Scorecard {
  constructor(gameState, canvas, ctx, hud, advanceStage) {
    this.state        = gameState;
    this.canvas       = canvas;
    this.ctx          = ctx;
    this.hud          = hud;
    this.advanceStage = advanceStage;

    this._clickHandler = null;
    this._renderData   = null;
  }

  start() {
    const { destroyedBatches, score, flags } = this.state;

    let baselineCO2e = 0;
    let projectCO2e  = 0;

    destroyedBatches.forEach(batch => {
      const r = REFRIGERANTS.find(r => r.id === batch.refrigerant);
      if (!r) return;
      // Baseline: 100% venting (Protocol Table 2 default)
      baselineCO2e += (batch.massDestroyed / 1000) * r.GWP;
      // Project: direct CO2 from destruction
      projectCO2e  += batch.directCO2Emitted;
    });

    // Transport leakage penalty (Protocol Section 7.3.4)
    if (flags.leakagePenalty) projectCO2e *= 1.15;

    const netReduction  = Math.max(0, baselineCO2e - projectCO2e);
    const creditsIssued = Math.floor(netReduction);

    this._renderData = {
      baselineCO2e:  baselineCO2e.toFixed(2),
      projectCO2e:   projectCO2e.toFixed(2),
      netReduction:  netReduction.toFixed(2),
      creditsIssued,
      grade:          this.getGrade(creditsIssued, flags),
      batches:        destroyedBatches,
      flags,
      reportingPeriod: "2026",
    };

    this._clickHandler = (e) => this._handleClick(e);
    this.canvas.addEventListener("click", this._clickHandler);
  }

  stop() {
    if (this._clickHandler) {
      this.canvas.removeEventListener("click", this._clickHandler);
      this._clickHandler = null;
    }
  }

  update(_dt) { /* static screen */ }

  render(ctx) {
    if (!this._renderData) return;
    const d = this._renderData;

    // Background
    ctx.fillStyle = "#0d1117";
    ctx.fillRect(0, 0, 900, 600);

    // Header
    ctx.fillStyle = "#161b22";
    ctx.fillRect(0, 0, 900, 78);
    ctx.strokeStyle = "#30363d";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, 78); ctx.lineTo(900, 78); ctx.stroke();

    ctx.fillStyle = "#79c0ff";
    ctx.font = "bold 20px monospace";
    ctx.textAlign = "center";
    ctx.fillText("GHG STATEMENT \u2014 CryoDestroy 2026", 450, 34);
    ctx.fillStyle = "#8b949e";
    ctx.font = "13px monospace";
    ctx.fillText("Reporting Period: " + d.reportingPeriod + "  |  Containers Destroyed: " + d.batches.length, 450, 58);

    // Grade badge
    const gradeColours = { "A+": "#3fb950", "B": "#d29922", "C": "#f85149" };
    const gc = gradeColours[d.grade.grade] || "#555";
    ctx.fillStyle = gc;
    ctx.beginPath();
    ctx.arc(852, 39, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = `bold ${d.grade.grade === "A+" ? "18" : "22"}px monospace`;
    ctx.textAlign = "center";
    ctx.fillText(d.grade.grade, 852, 46);
    ctx.textAlign = "left";

    // ── Summary table (left) ───────────────────────────────────────────
    const tableRows = [
      ["Baseline CO\u2082e (if vented):",       d.baselineCO2e + " t"],
      ["Project Emissions (destruction):",       d.projectCO2e  + " t"],
      ["Net CO\u2082e Reduction:",               d.netReduction + " t"],
      ["Credits Issued:",                        d.creditsIssued + " tCO\u2082e"],
    ];
    tableRows.forEach(([label, val], i) => {
      const ry = 92 + i * 52;
      ctx.fillStyle = i % 2 === 0 ? "#0d1117" : "#111820";
      ctx.fillRect(18, ry, 480, 50);
      ctx.strokeStyle = "#21262d";
      ctx.lineWidth = 1;
      ctx.strokeRect(18, ry, 480, 50);
      ctx.fillStyle = "#8b949e";
      ctx.font = "12px monospace";
      ctx.textAlign = "left";
      ctx.fillText(label, 28, ry + 19);
      ctx.fillStyle = "#e6edf3";
      ctx.font = "bold 14px monospace";
      ctx.fillText(val, 28, ry + 38);
    });

    // ── DRE breakdown (right) ──────────────────────────────────────────
    const rightX  = 520;
    const cardH   = Math.min(d.batches.length, 5) * 72 + 32;
    ctx.fillStyle = "#161b22";
    ctx.fillRect(rightX, 90, 362, cardH);
    ctx.strokeStyle = "#30363d";
    ctx.lineWidth = 1;
    ctx.strokeRect(rightX, 90, 362, cardH);

    ctx.fillStyle = "#79c0ff";
    ctx.font = "bold 13px monospace";
    ctx.fillText("DESTRUCTION RECORDS", rightX + 14, 112);

    d.batches.slice(0, 5).forEach((b, i) => {
      const by = 120 + i * 72;
      ctx.fillStyle = "#1a2030";
      ctx.fillRect(rightX + 10, by, 340, 60);
      ctx.strokeStyle = "#30363d";
      ctx.strokeRect(rightX + 10, by, 340, 60);

      const r = REFRIGERANTS.find(rf => rf.id === b.refrigerant);
      const colour = r ? r.colour : "#79c0ff";
      ctx.fillStyle = colour;
      ctx.fillRect(rightX + 10, by, 5, 60);

      ctx.fillStyle = "#e6edf3";
      ctx.font = "12px monospace";
      ctx.fillText(b.refrigerant + "  \u2014  " + b.massDestroyed.toFixed(2) + " kg", rightX + 22, by + 20);
      ctx.fillStyle = b.DRE >= 99.99 ? "#3fb950" : "#f85149";
      ctx.fillText("DRE: " + b.DRE.toFixed(4) + "%", rightX + 22, by + 38);
      ctx.fillStyle = "#8b949e";
      ctx.font = "11px monospace";
      ctx.fillText("CO\u2082: " + b.directCO2Emitted.toFixed(4) + " t  |  " + b.containerId, rightX + 22, by + 54);
    });

    // ── Penalty flags ──────────────────────────────────────────────────
    let flagY = 310;
    if (d.flags.provenanceGapPenalty) {
      ctx.fillStyle = "#2d1010";
      ctx.fillRect(18, flagY, 480, 38);
      ctx.strokeStyle = "#f85149";
      ctx.lineWidth = 1;
      ctx.strokeRect(18, flagY, 480, 38);
      ctx.fillStyle = "#f85149";
      ctx.font = "12px monospace";
      ctx.fillText("\u26a0 Provenance Gap Detected \u2014 some containers excluded from eligible mass", 28, flagY + 24);
      flagY += 46;
    }
    if (d.flags.leakagePenalty) {
      ctx.fillStyle = "#2d1e08";
      ctx.fillRect(18, flagY, 480, 38);
      ctx.strokeStyle = "#ffa726";
      ctx.lineWidth = 1;
      ctx.strokeRect(18, flagY, 480, 38);
      ctx.fillStyle = "#ffa726";
      ctx.font = "12px monospace";
      ctx.fillText("\u26a0 Transport Leakage Penalty Applied (+15% project emissions)", 28, flagY + 24);
    }

    // ── Large credits display ──────────────────────────────────────────
    ctx.fillStyle = "#3fb950";
    ctx.font = "bold 56px monospace";
    ctx.textAlign = "center";
    ctx.fillText(String(d.creditsIssued), 255, 498);

    ctx.fillStyle = "#8b949e";
    ctx.font = "15px monospace";
    ctx.fillText("tCO\u2082e avoided", 255, 523);

    ctx.fillStyle = gc;
    ctx.font = "bold 14px monospace";
    ctx.fillText(d.grade.label, 255, 550);

    // ── PLAY AGAIN button ──────────────────────────────────────────────
    ctx.fillStyle = "#21262d";
    ctx.beginPath();
    ctx.roundRect(600, 540, 260, 44, 6);
    ctx.fill();
    ctx.strokeStyle = "#30363d";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#79c0ff";
    ctx.font = "bold 15px monospace";
    ctx.textAlign = "center";
    ctx.fillText("\u21ba  PLAY AGAIN", 730, 568);
    ctx.textAlign = "left";
  }

  _handleClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const mx   = e.clientX - rect.left;
    const my   = e.clientY - rect.top;
    if (mx >= 600 && mx <= 860 && my >= 540 && my <= 584) {
      window.location.reload();
    }
  }

  getGrade(credits, flags) {
    if (credits > 500 && !flags.provenanceGapPenalty && !flags.leakagePenalty)
      return { grade: "A+", label: "\uD83C\uDFC6 Verified! Credits Issued." };
    if (credits > 200)
      return { grade: "B",  label: "\u2705 Accepted with minor issues." };
    return   { grade: "C",  label: "\u26a0\ufe0f Needs improvement." };
  }
}
