// Stage 4: "Papa's Taqueria" timing game
// Based on Protocol Sections 8.1.5 & 8.3 — DRE ≥99.99%, CO ≤100 mg/Nm³, 60s dwell

import { REFRIGERANTS } from "../data/refrigerants.js";

export class DestructionStage {
  constructor(gameState, canvas, ctx, hud, advanceStage) {
    this.state        = gameState;
    this.canvas       = canvas;
    this.ctx          = ctx;
    this.hud          = hud;
    this.advanceStage = advanceStage;

    // Protocol constants
    this.TEMP_MIN      = 850;
    this.TEMP_MAX      = 1200;
    this.CO_THRESHOLD  = 100;
    this.DRE_TARGET    = 99.99;
    this.MIN_DWELL_SEC = 60;

    this.queue      = [];
    this.chamber    = null;

    // Live physics state
    this.chamberTemp  = 900;
    this.coLevel      = 20;
    this.currentDRE   = 0;
    this.dwellTimer   = 0;
    this.feedRate     = 5;   // 1–10; player adjusts with arrow keys
    this.feedActive   = false;
    this.coAlarmTime  = 0;   // seconds CO has been above threshold
    this.physicsAccum = 0;   // ms accumulator for fixed-step physics
    this.tempHistory  = [];  // rolling 60-sample chart

    // Phase: "IDLE" | "WEIGHING" | "RUNNING" | "DIAGNOSTIC" | "EMPTY_WEIGH" | "DONE"
    this.phase = "IDLE";

    this.diagnosticComponents = [];

    this._keyHandler   = null;
    this._clickHandler = null;
  }

  start() {
    this.queue = [...this.state.transportedContainers];

    this._keyHandler = (e) => {
      if (!this.feedActive) return;
      if (e.key === "ArrowUp")   this.feedRate = Math.min(10, this.feedRate + 1);
      if (e.key === "ArrowDown") this.feedRate = Math.max(1,  this.feedRate - 1);
    };
    document.addEventListener("keydown", this._keyHandler);

    this.processNextContainer();
  }

  stop() {
    document.removeEventListener("keydown", this._keyHandler);
    if (this._clickHandler) {
      this.canvas.removeEventListener("click", this._clickHandler);
      this._clickHandler = null;
    }
  }

  update(dt) {
    if (this.phase !== "RUNNING") return;

    this.physicsAccum += dt;
    while (this.physicsAccum >= 100) {
      this.physicsAccum -= 100;
      this._tick();
    }
  }

  _tick() {
    this.updateChamberPhysics();
    this.currentDRE = this.calculateDRE();

    // Dwell only accumulates while temp is in green zone
    if (this.chamberTemp >= this.TEMP_MIN && this.chamberTemp <= this.TEMP_MAX) {
      this.dwellTimer += 0.1;
    }

    this.tempHistory.push(this.chamberTemp);
    if (this.tempHistory.length > 60) this.tempHistory.shift();

    // CO alarm accumulation
    if (this.coLevel > this.CO_THRESHOLD) {
      this.coAlarmTime += 0.1;
      if (this.coAlarmTime >= 15) {
        this.triggerCOAlarm();
      }
    } else {
      this.coAlarmTime = 0;
    }

    // Batch complete when dwell is met and DRE is sufficient
    if (this.dwellTimer >= this.MIN_DWELL_SEC && this.currentDRE >= this.DRE_TARGET) {
      this.completeBatch(this.chamber.container);
    }
  }

  render(ctx) {
    ctx.fillStyle = "#080c10";
    ctx.fillRect(0, 0, 900, 600);

    if (this.phase === "IDLE" || this.phase === "WEIGHING" || this.phase === "EMPTY_WEIGH") {
      this._renderIdle(ctx);
    } else if (this.phase === "DIAGNOSTIC") {
      this._renderDiagnostic(ctx);
    } else if (this.phase === "RUNNING") {
      this._renderChamber(ctx);
    }
  }

  _renderIdle(ctx) {
    ctx.fillStyle = "#79c0ff";
    ctx.font = "bold 22px monospace";
    ctx.textAlign = "center";
    ctx.fillText("STAGE 4 \u2014 DESTRUCTION", 450, 265);
    ctx.fillStyle = "#8b949e";
    ctx.font = "14px monospace";
    ctx.fillText("Preparing container...", 450, 298);
    ctx.textAlign = "left";
  }

  _renderChamber(ctx) {
    const container = this.chamber?.container;

    // Title bar
    ctx.fillStyle = "#161b22";
    ctx.fillRect(0, 0, 900, 42);
    ctx.strokeStyle = "#30363d";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, 42); ctx.lineTo(900, 42); ctx.stroke();

    ctx.fillStyle = "#79c0ff";
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "left";
    ctx.fillText("STAGE 4 \u2014 DESTRUCTION CHAMBER", 18, 27);

    if (container) {
      const mass = (container.confirmedMassKg || container.eligibleMassKg || container.massKg).toFixed(2);
      ctx.fillStyle = "#8b949e";
      ctx.font = "12px monospace";
      ctx.fillText(container.refrigerant + "  |  " + mass + " kg  |  " + container.fieldContainerId, 370, 27);
    }

    // ── Chamber silhouette ──────────────────────────────────────────────
    const cx = 300, cy = 55, cw = 340, ch = 345;
    ctx.fillStyle = "#110500";
    ctx.fillRect(cx, cy, cw, ch);
    ctx.strokeStyle = "#553322";
    ctx.lineWidth = 3;
    ctx.strokeRect(cx, cy, cw, ch);

    // Chamber glow (radial gradient based on temp)
    const tempFrac = Math.max(0, Math.min(1, (this.chamberTemp - 700) / 600));
    let gr, gg, gb;
    if (this.chamberTemp < this.TEMP_MIN) {
      gr = 30;  gg = 70;  gb = 160;
    } else if (this.chamberTemp > this.TEMP_MAX) {
      gr = 180; gg = 20;  gb = 20;
    } else {
      gr = 220; gg = Math.floor(65 + tempFrac * 90); gb = 10;
    }
    const grad = ctx.createRadialGradient(cx + cw/2, cy + ch/2, 8, cx + cw/2, cy + ch/2, 175);
    grad.addColorStop(0, `rgba(${gr},${gg},${gb},0.85)`);
    grad.addColorStop(1, `rgba(${gr},${gg},${gb},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(cx, cy, cw, ch);

    // Flame flicker
    if (this.feedActive) {
      for (let i = 0; i < 6; i++) {
        const px = cx + 70 + Math.random() * 200;
        const py = cy + ch - 20 - Math.random() * 90;
        const r  = 4 + Math.random() * 7;
        ctx.fillStyle = `rgba(255,${Math.floor(80 + Math.random() * 120)},0,0.5)`;
        ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
      }
    }

    // DRE badge
    const dreOk = this.currentDRE >= this.DRE_TARGET;
    ctx.fillStyle = dreOk ? "#3fb950" : "#f85149";
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "right";
    ctx.fillText("DRE: " + this.currentDRE.toFixed(4) + "%", cx + cw - 6, cy + 20);
    ctx.textAlign = "left";

    // ── Temperature gauge (left) ─────────────────────────────────────────
    this._drawGauge(ctx, 55, 50, 64, 360, this.chamberTemp,
      700, 1300, this.TEMP_MIN, this.TEMP_MAX, "\u00b0C", Math.round(this.chamberTemp) + "", false);

    // ── CO meter (right) ─────────────────────────────────────────────────
    this._drawGauge(ctx, 790, 50, 64, 360, this.coLevel,
      0, 200, 0, this.CO_THRESHOLD, "CO", Math.round(this.coLevel) + "", true);

    // ── Dwell timer bar ──────────────────────────────────────────────────
    const dwellFrac = Math.min(1, this.dwellTimer / this.MIN_DWELL_SEC);
    const inGreen   = this.chamberTemp >= this.TEMP_MIN && this.chamberTemp <= this.TEMP_MAX;
    ctx.fillStyle = "#161b22";
    ctx.fillRect(300, 420, 340, 28);
    ctx.fillStyle = inGreen ? "#238636" : "#444";
    ctx.fillRect(300, 420, 340 * dwellFrac, 28);
    ctx.strokeStyle = "#30363d";
    ctx.lineWidth = 1;
    ctx.strokeRect(300, 420, 340, 28);
    ctx.fillStyle = "#fff";
    ctx.font = "12px monospace";
    ctx.textAlign = "center";
    ctx.fillText("DWELL: " + this.dwellTimer.toFixed(1) + "s / " + this.MIN_DWELL_SEC + "s", 470, 439);
    ctx.textAlign = "left";

    // ── Feed rate ────────────────────────────────────────────────────────
    ctx.fillStyle = "#8b949e";
    ctx.font = "11px monospace";
    ctx.fillText("FEED RATE", 300, 466);
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = i < this.feedRate ? "#ffa726" : "#1a1a1a";
      ctx.fillRect(300 + i * 32, 470, 28, 18);
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1;
      ctx.strokeRect(300 + i * 32, 470, 28, 18);
    }
    ctx.fillStyle = "#555";
    ctx.font = "10px monospace";
    ctx.fillText("\u2191\u2193 arrow keys", 445, 505);

    // ── Temp history graph ───────────────────────────────────────────────
    if (this.tempHistory.length > 1) {
      const gx = 300, gy = 515, gw = 340, gh = 72;
      ctx.fillStyle = "#0d1117";
      ctx.fillRect(gx, gy, gw, gh);
      ctx.strokeStyle = "#21262d";
      ctx.lineWidth = 1;
      ctx.strokeRect(gx, gy, gw, gh);

      // Green zone band
      const pMin = gy + gh - ((this.TEMP_MIN - 700) / 600) * gh;
      const pMax = gy + gh - ((this.TEMP_MAX - 700) / 600) * gh;
      ctx.fillStyle = "rgba(63,185,80,0.1)";
      ctx.fillRect(gx, pMax, gw, pMin - pMax);

      // Temp line
      ctx.strokeStyle = "#79c0ff";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      this.tempHistory.forEach((t, i) => {
        const px = gx + (i / (this.tempHistory.length - 1)) * gw;
        const py = gy + gh - ((t - 700) / 600) * gh;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      });
      ctx.stroke();

      ctx.fillStyle = "#555";
      ctx.font = "9px monospace";
      ctx.fillText("Temp History", gx + 4, gy + 11);
    }

    // ── CO alarm tint ────────────────────────────────────────────────────
    if (this.coAlarmTime > 0) {
      const af = Math.min(1, this.coAlarmTime / 15);
      ctx.fillStyle = `rgba(248,81,73,${af * 0.2})`;
      ctx.fillRect(0, 0, 900, 600);
      ctx.fillStyle = "#f85149";
      ctx.font = "bold 12px monospace";
      ctx.textAlign = "center";
      ctx.fillText("CO ALARM: " + this.coAlarmTime.toFixed(1) + "s / 15s before auto cut-off", 450, 57);
      ctx.textAlign = "left";
    }
  }

  _drawGauge(ctx, x, y, w, h, value, min, max, greenMin, greenMax, topLabel, valLabel, invertGreen) {
    const frac  = Math.max(0, Math.min(1, (value - min) / (max - min)));
    const fillH = frac * h;
    const fillY = y + h - fillH;

    // Background
    ctx.fillStyle = "#0a0e14";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "#2a3040";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    // Bar colour
    let colour;
    if (invertGreen) {
      colour = value > greenMax ? "#f85149" : "#3fb950";
    } else {
      colour = (value >= greenMin && value <= greenMax) ? "#3fb950"
             : value < greenMin ? "#4d8cff" : "#f85149";
    }
    ctx.fillStyle = colour;
    ctx.fillRect(x + 4, fillY, w - 8, fillH);

    // Green zone band
    const gMin = (greenMin - min) / (max - min);
    const gMax = (greenMax - min) / (max - min);
    ctx.fillStyle = "rgba(63,185,80,0.18)";
    ctx.fillRect(x, y + h - gMax * h, w, (gMax - gMin) * h);

    // Threshold line for inverted gauges (CO)
    if (invertGreen) {
      const thY = y + h - ((greenMax - min) / (max - min)) * h;
      ctx.strokeStyle = "rgba(248,81,73,0.6)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(x, thY); ctx.lineTo(x + w, thY); ctx.stroke();
      ctx.setLineDash([]);
    }

    // Labels
    ctx.fillStyle = "#8b949e";
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    ctx.fillText(topLabel, x + w / 2, y - 5);
    ctx.fillStyle = "#e6edf3";
    ctx.font = "bold 11px monospace";
    ctx.fillText(valLabel, x + w / 2, y + h + 18);
    ctx.textAlign = "left";
  }

  _renderDiagnostic(ctx) {
    // Red overlay
    ctx.fillStyle = "rgba(248,81,73,0.22)";
    ctx.fillRect(0, 0, 900, 600);

    ctx.fillStyle = "#f85149";
    ctx.font = "bold 26px monospace";
    ctx.textAlign = "center";
    ctx.fillText("\uD83D\uDEA8 CO ALARM \u2014 FEED CUT OFF", 450, 88);
    ctx.fillStyle = "#e6edf3";
    ctx.font = "14px monospace";
    ctx.fillText("Click the faulty component to diagnose and resume:", 450, 120);

    // 4 component boxes
    this.diagnosticComponents.forEach((comp, i) => {
      const bx = 85 + i * 185;
      const by = 155;
      const bw = 162, bh = 130;

      ctx.fillStyle = comp.clicked
        ? (comp.correct ? "#1a3a1a" : "#3a1a1a")
        : "#161b22";
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = comp.clicked
        ? (comp.correct ? "#3fb950" : "#f85149")
        : "#30363d";
      ctx.lineWidth = 2;
      ctx.strokeRect(bx, by, bw, bh);

      ctx.fillStyle = "#e6edf3";
      ctx.font = "bold 13px monospace";
      ctx.textAlign = "center";
      ctx.fillText(comp.name, bx + bw / 2, by + 46);
      ctx.fillStyle = "#8b949e";
      ctx.font = "11px monospace";
      ctx.fillText(comp.desc, bx + bw / 2, by + 66);

      if (comp.clicked && comp.correct) {
        ctx.fillStyle = "#3fb950";
        ctx.font = "bold 18px monospace";
        ctx.fillText("\u2713 FIXED", bx + bw / 2, by + 100);
      } else if (comp.clicked && !comp.correct) {
        ctx.fillStyle = "#f85149";
        ctx.font = "bold 14px monospace";
        ctx.fillText("\u2717 NOT THIS", bx + bw / 2, by + 100);
      }
    });

    ctx.textAlign = "left";
  }

  // ─────────────────────────── STAGE LOGIC ─────────────────────────────

  processNextContainer() {
    if (this.queue.length === 0) {
      this.completeStage();
      return;
    }

    const container = this.queue.shift();
    this.chamber = { container, weighed: false, DRE: 0 };
    this.phase   = "WEIGHING";

    this.showWeighingMinigame(container, (weight) => {
      container.confirmedMassKg = weight;
      this.chamber.weighed      = true;
      this.dwellTimer           = 0;
      this.coAlarmTime          = 0;
      this.chamberTemp          = 900;
      this.coLevel              = 20;
      this.feedRate             = 5;
      this.feedActive           = true;
      this.tempHistory          = [];
      this.physicsAccum         = 0;
      this.phase                = "RUNNING";
    });
  }

  updateChamberPhysics() {
    // Feed rate 1–10 maps to target temps ~755–1305°C
    const targetTemp = 700 + this.feedRate * 60;
    this.chamberTemp += (targetTemp - this.chamberTemp) * 0.04 + (Math.random() - 0.5) * 20;
    this.chamberTemp  = Math.max(700, Math.min(1300, this.chamberTemp));

    if (this.chamberTemp < this.TEMP_MIN) {
      this.coLevel += 7;  // incomplete combustion
    } else if (this.chamberTemp > this.TEMP_MAX) {
      this.coLevel += 4;  // overtemp also raises CO slightly
    } else {
      this.coLevel = Math.max(8, this.coLevel - 4 + (Math.random() - 0.5) * 6);
    }
    this.coLevel = Math.max(5, Math.min(200, this.coLevel));
  }

  calculateDRE() {
    const tempFactor = this.chamberTemp >= this.TEMP_MIN ? 1 : 0.9;
    const coFactor   = this.coLevel < this.CO_THRESHOLD  ? 1 : 0.85;
    return 99.99 * tempFactor * coFactor;
  }

  triggerCOAlarm() {
    if (this.phase !== "RUNNING") return;
    this.feedActive  = false;
    this.phase       = "DIAGNOSTIC";
    this.coAlarmTime = 0;

    const components = [
      { name: "Burner Nozzle",  desc: "Fuel injection point" },
      { name: "Air Blower",     desc: "Combustion air supply" },
      { name: "Fuel Valve",     desc: "Gas flow regulator"  },
      { name: "O\u2082 Sensor", desc: "Oxygen monitoring"   },
    ];
    const correctIdx = Math.floor(Math.random() * 4);
    this.diagnosticComponents = components.map((c, i) => ({
      ...c, correct: i === correctIdx, clicked: false,
    }));

    this._clickHandler = (e) => this._handleDiagnosticClick(e);
    this.canvas.addEventListener("click", this._clickHandler);
  }

  _handleDiagnosticClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const mx   = e.clientX - rect.left;
    const my   = e.clientY - rect.top;

    this.diagnosticComponents.forEach((comp, i) => {
      const bx = 85 + i * 185;
      const by = 155;
      if (mx >= bx && mx <= bx + 162 && my >= by && my <= by + 130) {
        if (comp.clicked) return;
        comp.clicked = true;
        if (comp.correct) {
          this.canvas.removeEventListener("click", this._clickHandler);
          this._clickHandler = null;
          setTimeout(() => {
            this.coLevel     = 28;
            this.coAlarmTime = 0;
            this.feedActive  = true;
            this.phase       = "RUNNING";
            this.hud.showSuccess("\u2705 Component fixed! Resuming destruction.");
          }, 900);
        } else {
          this.coLevel += 25;
          this.hud.showAlert("Wrong component. CO level increased.");
        }
      }
    });
  }

  completeBatch(container) {
    if (this.phase !== "RUNNING") return;
    this.feedActive = false;
    this.phase      = "EMPTY_WEIGH";

    const confirmedMass = container.confirmedMassKg || container.eligibleMassKg || container.massKg;
    const directCO2     = confirmedMass * this.getCarbonContent(container.refrigerant);

    this.showEmptyWeighMinigame(container, (emptyWeight) => {
      const netMass = Math.max(0, confirmedMass - emptyWeight);

      this.state.destroyedBatches.push({
        containerId:       container.fieldContainerId,
        refrigerant:       container.refrigerant,
        massDestroyed:     netMass,
        DRE:               this.currentDRE,
        directCO2Emitted:  directCO2,
        destructionTime:   new Date().toISOString(),
        attestationSigned: true,
      });

      this.calculateAndApplyScore(container, netMass, directCO2);
      this.hud.showSuccess("\u2705 Batch complete! DRE: " + this.currentDRE.toFixed(4) + "%  |  " + netMass.toFixed(2) + " kg destroyed");
      setTimeout(() => this.processNextContainer(), 1600);
    });
  }

  showWeighingMinigame(container, callback) {
    const mass = (container.eligibleMassKg || container.massKg).toFixed(2);
    const html = `
      <div style="
        position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
        background:#161b22; border:2px solid #30363d; border-radius:8px;
        padding:24px; width:380px; color:#e6edf3; font-family:monospace;
        z-index:200; text-align:center; box-shadow:0 8px 32px rgba(0,0,0,0.7);
      ">
        <h3 style="color:#79c0ff; margin:0 0 10px;">\u2696\ufe0f PRE-DESTRUCTION WEIGHING</h3>
        <p style="font-size:11px; color:#8b949e; margin:0 0 14px;">
          Protocol \u00a78.1.5: Container weighed \u22642 days before destruction.
        </p>
        <p style="font-size:13px; margin:0 0 10px;">${container.refrigerant} | ${container.fieldContainerId}</p>
        <label style="font-size:13px;">Confirmed Mass (kg):<br>
          <input id="weighInput" type="number" value="${mass}" step="0.01" style="
            margin-top:8px; width:160px; padding:6px; font-family:monospace;
            font-size:16px; text-align:center; background:#0d1117;
            color:#e6edf3; border:1px solid #30363d; border-radius:4px;">
        </label><br>
        <button id="confirmWeigh" style="
          margin-top:16px; background:#238636; color:#fff; border:none;
          border-radius:4px; padding:10px 24px; font-family:monospace;
          font-size:14px; cursor:pointer;
        ">Confirm Weight</button>
      </div>`;

    this.hud.showPanel(html);
    setTimeout(() => {
      const btn = document.getElementById("confirmWeigh");
      if (!btn) return;
      btn.addEventListener("click", () => {
        const w = parseFloat(document.getElementById("weighInput").value) || parseFloat(mass);
        this.hud.clearOverlay();
        callback(w);
      });
    }, 0);
  }

  showEmptyWeighMinigame(container, callback) {
    const confirmedMass  = container.confirmedMassKg || container.eligibleMassKg || container.massKg;
    const emptyDefault   = (confirmedMass * 0.05).toFixed(2);
    const html = `
      <div style="
        position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
        background:#161b22; border:2px solid #30363d; border-radius:8px;
        padding:24px; width:380px; color:#e6edf3; font-family:monospace;
        z-index:200; text-align:center; box-shadow:0 8px 32px rgba(0,0,0,0.7);
      ">
        <h3 style="color:#3fb950; margin:0 0 10px;">\u2705 DESTRUCTION COMPLETE</h3>
        <p style="font-size:11px; color:#8b949e; margin:0 0 14px;">
          Protocol \u00a78.1.5: Weigh empty container \u22642 days after destruction.
        </p>
        <p style="font-size:13px; margin:0 0 10px;">${container.refrigerant} | ${container.fieldContainerId}</p>
        <label style="font-size:13px;">Empty Container Mass (kg):<br>
          <input id="emptyWeighInput" type="number" value="${emptyDefault}" step="0.01" style="
            margin-top:8px; width:160px; padding:6px; font-family:monospace;
            font-size:16px; text-align:center; background:#0d1117;
            color:#e6edf3; border:1px solid #30363d; border-radius:4px;">
        </label><br>
        <button id="confirmEmptyWeigh" style="
          margin-top:16px; background:#238636; color:#fff; border:none;
          border-radius:4px; padding:10px 24px; font-family:monospace;
          font-size:14px; cursor:pointer;
        ">Confirm Empty Weight</button>
      </div>`;

    this.hud.showPanel(html);
    setTimeout(() => {
      const btn = document.getElementById("confirmEmptyWeigh");
      if (!btn) return;
      btn.addEventListener("click", () => {
        const w = parseFloat(document.getElementById("emptyWeighInput").value) || parseFloat(emptyDefault);
        this.hud.clearOverlay();
        callback(w);
      });
    }, 0);
  }

  calculateAndApplyScore(container, netMass, directCO2) {
    const r   = REFRIGERANTS.find(r => r.id === container.refrigerant);
    const gwp = r ? r.GWP : 1960;
    const grossAvoided = (netMass / 1000) * gwp;
    this.state.score.grossCO2eAvoided += grossAvoided;
    this.state.score.projectEmissions += directCO2;
    this.state.score.netCO2eReduction  = Math.max(
      0, this.state.score.grossCO2eAvoided - this.state.score.projectEmissions
    );
    this.state.score.creditsIssued = Math.floor(this.state.score.netCO2eReduction);
  }

  completeStage() {
    this.phase = "DONE";
    this.stop();
    this.advanceStage();
  }

  getCarbonContent(refrigerantId) {
    const cc = { "HFC-134a": 0.326, "HFC-410A": 0.108, "HCFC-22": 0.242, "CFC-12": 0.217 };
    return cc[refrigerantId] || 0.25;
  }
}
