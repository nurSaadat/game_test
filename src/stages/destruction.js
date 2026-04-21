import { REFRIGERANTS } from "../data/refrigerants.js";

export class DestructionScene extends Phaser.Scene {
  constructor() {
    super({ key: "DestructionScene" });
  }

  create() {
    this.gs = this.registry.get("gameState");

    this.TEMP_MIN = 850;
    this.TEMP_MAX = 1200;
    this.CO_THRESHOLD = 100;
    this.DRE_TARGET = 99.99;
    this.MIN_DWELL_SEC = 20;

    this.queue = [...this.gs.transportedContainers];
    this.chamber = null;

    this.chamberTemp = 900;
    this.coLevel = 20;
    this.currentDRE = 0;
    this.dwellTimer = 0;
    this.feedRate = 5;
    this.feedActive = false;
    this.coAlarmTime = 0;
    this.physicsAccum = 0;
    this.tempHistory = [];

    this.phase = "IDLE";
    this.diagnosticComponents = [];

    this.gfx = this.add.graphics();

    this.cursors = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
    });

    this._processNextContainer();
  }

  update(time, delta) {
    if (this.phase !== "RUNNING") return;

    if (this.feedActive) {
      if (this.cursors.up.isDown) this.feedRate = Math.min(10, this.feedRate + 0.15);
      if (this.cursors.down.isDown) this.feedRate = Math.max(1, this.feedRate - 0.15);
    }

    this.physicsAccum += delta;
    while (this.physicsAccum >= 100) {
      this.physicsAccum -= 100;
      this._tick();
    }

    this._render();
  }

  _tick() {
    this._updateChamberPhysics();
    this.currentDRE = this._calculateDRE();

    if (this.chamberTemp >= this.TEMP_MIN && this.chamberTemp <= this.TEMP_MAX) {
      this.dwellTimer += 0.1;
    }

    this.tempHistory.push(this.chamberTemp);
    if (this.tempHistory.length > 60) this.tempHistory.shift();

    if (this.coLevel > this.CO_THRESHOLD) {
      this.coAlarmTime += 0.1;
      if (this.coAlarmTime >= 15) {
        this._triggerCOAlarm();
      }
    } else {
      this.coAlarmTime = 0;
    }

    if (this.dwellTimer >= this.MIN_DWELL_SEC && this.currentDRE >= this.DRE_TARGET) {
      this._completeBatch(this.chamber.container);
    }
  }

  _render() {
    this.gfx.clear();
    this.children.list.forEach(c => { if (c.type === "Text") c.destroy(); });

    if (this.phase === "IDLE" || this.phase === "WEIGHING" || this.phase === "EMPTY_WEIGH") {
      this._renderIdle();
    } else if (this.phase === "DIAGNOSTIC") {
      this._renderDiagnostic();
    } else if (this.phase === "RUNNING") {
      this._renderChamber();
    }
  }

  _renderIdle() {
    const g = this.gfx;
    g.fillStyle(0x080c10, 1);
    g.fillRect(0, 0, 900, 600);
    this.add.text(450, 265, "STAGE 4 — DESTRUCTION", {
      fontFamily: "monospace", fontSize: "22px", color: "#79c0ff", fontStyle: "bold",
    }).setOrigin(0.5);
    this.add.text(450, 298, "Preparing container...", {
      fontFamily: "monospace", fontSize: "14px", color: "#8b949e",
    }).setOrigin(0.5);
  }

  _renderChamber() {
    const g = this.gfx;
    const container = this.chamber?.container;

    g.fillStyle(0x080c10, 1);
    g.fillRect(0, 0, 900, 600);

    // Title bar
    g.fillStyle(0x161b22, 1);
    g.fillRect(0, 0, 900, 42);
    g.lineStyle(1, 0x30363d, 1);
    g.lineBetween(0, 42, 900, 42);

    this.add.text(18, 14, "STAGE 4 — DESTRUCTION CHAMBER", {
      fontFamily: "monospace", fontSize: "14px", color: "#79c0ff", fontStyle: "bold",
    });

    if (container) {
      const mass = (container.confirmedMassKg || container.eligibleMassKg || container.massKg).toFixed(2);
      this.add.text(370, 14, container.refrigerant + "  |  " + mass + " kg  |  " + container.fieldContainerId, {
        fontFamily: "monospace", fontSize: "12px", color: "#8b949e",
      });
    }

    // Chamber silhouette
    const cx = 300, cy = 55, cw = 340, ch = 345;
    g.fillStyle(0x110500, 1);
    g.fillRect(cx, cy, cw, ch);
    g.lineStyle(3, 0x553322, 1);
    g.strokeRect(cx, cy, cw, ch);

    // Chamber glow
    const tempFrac = Math.max(0, Math.min(1, (this.chamberTemp - 700) / 600));
    let gr, gg, gb;
    if (this.chamberTemp < this.TEMP_MIN) {
      gr = 30; gg = 70; gb = 160;
    } else if (this.chamberTemp > this.TEMP_MAX) {
      gr = 180; gg = 20; gb = 20;
    } else {
      gr = 220; gg = Math.floor(65 + tempFrac * 90); gb = 10;
    }
    const glowAlpha = 0.5;
    const glowColor = Phaser.Display.Color.GetColor(gr, gg, gb);
    g.fillStyle(glowColor, glowAlpha);
    g.fillRect(cx + 40, cy + 40, cw - 80, ch - 80);

    // Flame flicker
    if (this.feedActive) {
      for (let i = 0; i < 6; i++) {
        const px = cx + 70 + Math.random() * 200;
        const py = cy + ch - 20 - Math.random() * 90;
        const r = 4 + Math.random() * 7;
        g.fillStyle(Phaser.Display.Color.GetColor(255, Math.floor(80 + Math.random() * 120), 0), 0.5);
        g.fillCircle(px, py, r);
      }
    }

    // DRE badge
    const dreOk = this.currentDRE >= this.DRE_TARGET;
    this.add.text(cx + cw - 6, cy + 10, "DRE: " + this.currentDRE.toFixed(4) + "%", {
      fontFamily: "monospace", fontSize: "12px", color: dreOk ? "#3fb950" : "#f85149", fontStyle: "bold",
    }).setOrigin(1, 0);

    // Temperature gauge (left)
    this._drawGauge(g, 55, 50, 64, 360, this.chamberTemp, 700, 1300, this.TEMP_MIN, this.TEMP_MAX, "°C", Math.round(this.chamberTemp) + "", false);

    // CO meter (right)
    this._drawGauge(g, 790, 50, 64, 360, this.coLevel, 0, 200, 0, this.CO_THRESHOLD, "CO", Math.round(this.coLevel) + "", true);

    // Dwell timer bar
    const dwellFrac = Math.min(1, this.dwellTimer / this.MIN_DWELL_SEC);
    const inGreen = this.chamberTemp >= this.TEMP_MIN && this.chamberTemp <= this.TEMP_MAX;
    g.fillStyle(0x161b22, 1);
    g.fillRect(300, 420, 340, 28);
    g.fillStyle(inGreen ? 0x238636 : 0x444444, 1);
    g.fillRect(300, 420, 340 * dwellFrac, 28);
    g.lineStyle(1, 0x30363d, 1);
    g.strokeRect(300, 420, 340, 28);

    this.add.text(470, 434, "DWELL: " + this.dwellTimer.toFixed(1) + "s / " + this.MIN_DWELL_SEC + "s", {
      fontFamily: "monospace", fontSize: "12px", color: "#ffffff",
    }).setOrigin(0.5);

    // Feed rate
    this.add.text(300, 458, "FEED RATE", {
      fontFamily: "monospace", fontSize: "11px", color: "#8b949e",
    });
    const intFeed = Math.round(this.feedRate);
    for (let i = 0; i < 10; i++) {
      g.fillStyle(i < intFeed ? 0xffa726 : 0x1a1a1a, 1);
      g.fillRect(300 + i * 32, 470, 28, 18);
      g.lineStyle(1, 0x333333, 1);
      g.strokeRect(300 + i * 32, 470, 28, 18);
    }
    this.add.text(445, 500, "↑↓ arrow keys", {
      fontFamily: "monospace", fontSize: "10px", color: "#555555",
    });

    // Temp history graph
    if (this.tempHistory.length > 1) {
      const gx = 300, gy = 515, gw = 340, gh = 72;
      g.fillStyle(0x0d1117, 1);
      g.fillRect(gx, gy, gw, gh);
      g.lineStyle(1, 0x21262d, 1);
      g.strokeRect(gx, gy, gw, gh);

      const pMin = gy + gh - ((this.TEMP_MIN - 700) / 600) * gh;
      const pMax = gy + gh - ((this.TEMP_MAX - 700) / 600) * gh;
      g.fillStyle(0x3fb950, 0.1);
      g.fillRect(gx, pMax, gw, pMin - pMax);

      g.lineStyle(1.5, 0x79c0ff, 1);
      g.beginPath();
      this.tempHistory.forEach((t, i) => {
        const px = gx + (i / (this.tempHistory.length - 1)) * gw;
        const py = gy + gh - ((t - 700) / 600) * gh;
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      });
      g.strokePath();

      this.add.text(gx + 4, gy + 4, "Temp History", {
        fontFamily: "monospace", fontSize: "9px", color: "#555555",
      });
    }

    // CO alarm tint
    if (this.coAlarmTime > 0) {
      const af = Math.min(1, this.coAlarmTime / 15);
      g.fillStyle(0xf85149, af * 0.2);
      g.fillRect(0, 0, 900, 600);
      this.add.text(450, 50, "CO ALARM: " + this.coAlarmTime.toFixed(1) + "s / 15s before auto cut-off", {
        fontFamily: "monospace", fontSize: "12px", color: "#f85149", fontStyle: "bold",
      }).setOrigin(0.5);
    }
  }

  _drawGauge(g, x, y, w, h, value, min, max, greenMin, greenMax, topLabel, valLabel, invertGreen) {
    const frac = Math.max(0, Math.min(1, (value - min) / (max - min)));
    const fillH = frac * h;
    const fillY = y + h - fillH;

    g.fillStyle(0x0a0e14, 1);
    g.fillRect(x, y, w, h);
    g.lineStyle(1, 0x2a3040, 1);
    g.strokeRect(x, y, w, h);

    let colour;
    if (invertGreen) {
      colour = value > greenMax ? 0xf85149 : 0x3fb950;
    } else {
      colour = (value >= greenMin && value <= greenMax) ? 0x3fb950
        : value < greenMin ? 0x4d8cff : 0xf85149;
    }
    g.fillStyle(colour, 1);
    g.fillRect(x + 4, fillY, w - 8, fillH);

    const gMin = (greenMin - min) / (max - min);
    const gMax = (greenMax - min) / (max - min);
    g.fillStyle(0x3fb950, 0.18);
    g.fillRect(x, y + h - gMax * h, w, (gMax - gMin) * h);

    this.add.text(x + w / 2, y - 10, topLabel, {
      fontFamily: "monospace", fontSize: "10px", color: "#8b949e",
    }).setOrigin(0.5);
    this.add.text(x + w / 2, y + h + 12, valLabel, {
      fontFamily: "monospace", fontSize: "11px", color: "#e6edf3", fontStyle: "bold",
    }).setOrigin(0.5);
  }

  _renderDiagnostic() {
    const g = this.gfx;
    g.fillStyle(0x080c10, 1);
    g.fillRect(0, 0, 900, 600);
    g.fillStyle(0xf85149, 0.22);
    g.fillRect(0, 0, 900, 600);

    this.add.text(450, 68, "🚨 CO ALARM — FEED CUT OFF", {
      fontFamily: "monospace", fontSize: "26px", color: "#f85149", fontStyle: "bold",
    }).setOrigin(0.5);
    this.add.text(450, 105, "Click the faulty component to diagnose and resume:", {
      fontFamily: "monospace", fontSize: "14px", color: "#e6edf3",
    }).setOrigin(0.5);

    this.diagnosticComponents.forEach((comp, i) => {
      const bx = 85 + i * 185;
      const by = 155;
      const bw = 162, bh = 130;

      let bgCol = 0x161b22;
      let borderCol = 0x30363d;
      if (comp.clicked) {
        bgCol = comp.correct ? 0x1a3a1a : 0x3a1a1a;
        borderCol = comp.correct ? 0x3fb950 : 0xf85149;
      }
      g.fillStyle(bgCol, 1);
      g.fillRect(bx, by, bw, bh);
      g.lineStyle(2, borderCol, 1);
      g.strokeRect(bx, by, bw, bh);

      this.add.text(bx + bw / 2, by + 40, comp.name, {
        fontFamily: "monospace", fontSize: "13px", color: "#e6edf3", fontStyle: "bold",
      }).setOrigin(0.5);
      this.add.text(bx + bw / 2, by + 60, comp.desc, {
        fontFamily: "monospace", fontSize: "11px", color: "#8b949e",
      }).setOrigin(0.5);

      if (comp.clicked && comp.correct) {
        this.add.text(bx + bw / 2, by + 95, "✓ FIXED", {
          fontFamily: "monospace", fontSize: "18px", color: "#3fb950", fontStyle: "bold",
        }).setOrigin(0.5);
      } else if (comp.clicked && !comp.correct) {
        this.add.text(bx + bw / 2, by + 95, "✗ NOT THIS", {
          fontFamily: "monospace", fontSize: "14px", color: "#f85149", fontStyle: "bold",
        }).setOrigin(0.5);
      }
    });
  }

  _processNextContainer() {
    if (this.queue.length === 0) {
      this._completeStage();
      return;
    }

    const container = this.queue.shift();
    this.chamber = { container, weighed: false, DRE: 0 };
    this.phase = "WEIGHING";

    this._showWeighingDialog(container, (weight) => {
      container.confirmedMassKg = weight;
      this.chamber.weighed = true;
      this.dwellTimer = 0;
      this.coAlarmTime = 0;
      this.chamberTemp = 900;
      this.coLevel = 20;
      this.feedRate = 5;
      this.feedActive = true;
      this.tempHistory = [];
      this.physicsAccum = 0;
      this.phase = "RUNNING";
    });
  }

  _updateChamberPhysics() {
    const targetTemp = 700 + this.feedRate * 60;
    this.chamberTemp += (targetTemp - this.chamberTemp) * 0.04 + (Math.random() - 0.5) * 20;
    this.chamberTemp = Math.max(700, Math.min(1300, this.chamberTemp));

    if (this.chamberTemp < this.TEMP_MIN) {
      this.coLevel += 7;
    } else if (this.chamberTemp > this.TEMP_MAX) {
      this.coLevel += 4;
    } else {
      this.coLevel = Math.max(8, this.coLevel - 4 + (Math.random() - 0.5) * 6);
    }
    this.coLevel = Math.max(5, Math.min(200, this.coLevel));
  }

  _calculateDRE() {
    const tempFactor = this.chamberTemp >= this.TEMP_MIN ? 1 : 0.9;
    const coFactor = this.coLevel < this.CO_THRESHOLD ? 1 : 0.85;
    return 99.99 * tempFactor * coFactor;
  }

  _triggerCOAlarm() {
    if (this.phase !== "RUNNING") return;
    this.feedActive = false;
    this.phase = "DIAGNOSTIC";
    this.coAlarmTime = 0;

    const components = [
      { name: "Burner Nozzle", desc: "Fuel injection point" },
      { name: "Air Blower", desc: "Combustion air supply" },
      { name: "Fuel Valve", desc: "Gas flow regulator" },
      { name: "O₂ Sensor", desc: "Oxygen monitoring" },
    ];
    const correctIdx = Math.floor(Math.random() * 4);
    this.diagnosticComponents = components.map((c, i) => ({
      ...c, correct: i === correctIdx, clicked: false,
    }));

    this._render();

    // Create click zones over the diagnostic boxes
    this._diagZones = [];
    this.diagnosticComponents.forEach((comp, i) => {
      const bx = 85 + i * 185;
      const by = 155;
      const bw = 162, bh = 130;
      const zone = this.add.zone(bx + bw / 2, by + bh / 2, bw, bh).setInteractive({ useHandCursor: true });
      zone.on("pointerdown", () => {
        if (comp.clicked) return;
        comp.clicked = true;
        if (comp.correct) {
          this._diagZones.forEach(z => z.destroy());
          this._diagZones = [];
          this.time.delayedCall(900, () => {
            this.coLevel = 28;
            this.coAlarmTime = 0;
            this.feedActive = true;
            this.phase = "RUNNING";
            this.gs.hud.showSuccess("✅ Component fixed! Resuming destruction.");
          });
        } else {
          this.coLevel += 25;
          this.gs.hud.showAlert("Wrong component. CO level increased.");
        }
        this._render();
      });
      this._diagZones.push(zone);
    });
  }

  _completeBatch(container) {
    if (this.phase !== "RUNNING") return;
    this.feedActive = false;
    this.phase = "EMPTY_WEIGH";

    const confirmedMass = container.confirmedMassKg || container.eligibleMassKg || container.massKg;
    const directCO2 = confirmedMass * this._getCarbonContent(container.refrigerant);

    this._showEmptyWeighDialog(container, (emptyWeight) => {
      const netMass = Math.max(0, confirmedMass - emptyWeight);

      this.gs.destroyedBatches.push({
        containerId: container.fieldContainerId,
        refrigerant: container.refrigerant,
        massDestroyed: netMass,
        DRE: this.currentDRE,
        directCO2Emitted: directCO2,
        destructionTime: new Date().toISOString(),
        attestationSigned: true,
      });

      this._calculateAndApplyScore(container, netMass, directCO2);
      this.gs.hud.showSuccess("✅ Batch complete! DRE: " + this.currentDRE.toFixed(4) + "%  |  " + netMass.toFixed(2) + " kg destroyed");
      this.time.delayedCall(1600, () => this._processNextContainer());
    });
  }

  _showWeighingDialog(container, callback) {
    const mass = (container.eligibleMassKg || container.massKg).toFixed(2);
    const html = `
      <div style="
        position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
        background:#161b22; border:2px solid #30363d; border-radius:8px;
        padding:24px; width:380px; color:#e6edf3; font-family:monospace;
        z-index:200; text-align:center; box-shadow:0 8px 32px rgba(0,0,0,0.7);
      ">
        <h3 style="color:#79c0ff; margin:0 0 10px;">⚖️ PRE-DESTRUCTION WEIGHING</h3>
        <p style="font-size:11px; color:#8b949e; margin:0 0 14px;">
          Protocol §8.1.5: Container weighed ≤2 days before destruction.
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

    this.gs.hud.showPanel(html);
    setTimeout(() => {
      const btn = document.getElementById("confirmWeigh");
      if (!btn) return;
      btn.addEventListener("click", () => {
        const w = parseFloat(document.getElementById("weighInput").value) || parseFloat(mass);
        this.gs.hud.clearOverlay();
        callback(w);
      });
    }, 0);
  }

  _showEmptyWeighDialog(container, callback) {
    const confirmedMass = container.confirmedMassKg || container.eligibleMassKg || container.massKg;
    const emptyDefault = (confirmedMass * 0.05).toFixed(2);
    const html = `
      <div style="
        position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
        background:#161b22; border:2px solid #30363d; border-radius:8px;
        padding:24px; width:380px; color:#e6edf3; font-family:monospace;
        z-index:200; text-align:center; box-shadow:0 8px 32px rgba(0,0,0,0.7);
      ">
        <h3 style="color:#3fb950; margin:0 0 10px;">✅ DESTRUCTION COMPLETE</h3>
        <p style="font-size:11px; color:#8b949e; margin:0 0 14px;">
          Protocol §8.1.5: Weigh empty container ≤2 days after destruction.
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

    this.gs.hud.showPanel(html);
    setTimeout(() => {
      const btn = document.getElementById("confirmEmptyWeigh");
      if (!btn) return;
      btn.addEventListener("click", () => {
        const w = parseFloat(document.getElementById("emptyWeighInput").value) || parseFloat(emptyDefault);
        this.gs.hud.clearOverlay();
        callback(w);
      });
    }, 0);
  }

  _calculateAndApplyScore(container, netMass, directCO2) {
    const r = REFRIGERANTS.find(r => r.id === container.refrigerant);
    const gwp = r ? r.GWP : 1960;
    const grossAvoided = (netMass / 1000) * gwp;
    this.gs.score.grossCO2eAvoided += grossAvoided;
    this.gs.score.projectEmissions += directCO2;
    this.gs.score.netCO2eReduction = Math.max(
      0, this.gs.score.grossCO2eAvoided - this.gs.score.projectEmissions);
    this.gs.score.creditsIssued = Math.floor(this.gs.score.netCO2eReduction);
  }

  _completeStage() {
    this.phase = "DONE";
    this.gs.hud.clearOverlay();
    this.scene.start("TransitionScene", { nextKey: "SCORECARD" });
  }

  _getCarbonContent(refrigerantId) {
    const cc = { "HFC-134a": 0.326, "HFC-410A": 0.108, "HCFC-22": 0.242, "CFC-12": 0.217 };
    return cc[refrigerantId] || 0.25;
  }
}
