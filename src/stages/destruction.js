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

    const grouped = {};
    this.gs.transportedContainers.forEach(c => {
      if (!grouped[c.refrigerant]) grouped[c.refrigerant] = [];
      grouped[c.refrigerant].push(c);
    });
    this.queue = Object.values(grouped);
    this.chamber = null;

    this.chamberTemp = 900;
    this.coLevel = 20;
    this.currentDRE = 0;
    this.dwellTimer = 0;
    this.feedRate = 5;
    this.damper = 50;
    this.feedActive = false;
    this.coAlarmTime = 0;
    this.physicsAccum = 0;
    this.tempHistory = [];
    this.tempDriftOffset = 0;
    this.tempDriftTarget = 0;
    this.tempDriftTimer = 0;

    this.phase = "IDLE";
    this.diagnosticComponents = [];

    this.gfx = this.add.graphics();

    this.cursors = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
    });

    this._processNextBatch();
  }

  update(time, delta) {
    if (this.phase !== "RUNNING") return;

    if (this.feedActive) {
      if (this.cursors.up.isDown) this.feedRate = Math.min(10, this.feedRate + 0.15);
      if (this.cursors.down.isDown) this.feedRate = Math.max(1, this.feedRate - 0.15);
      if (this.cursors.right.isDown) this.damper = Math.min(100, this.damper + 0.8);
      if (this.cursors.left.isDown) this.damper = Math.max(0, this.damper - 0.8);
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
      this._completeBatch();
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

    if (this.chamber) {
      const ch = this.chamber;
      const totalMass = (ch.confirmedTotalMass || ch.batch.reduce((s, c) => s + (c.eligibleMassKg || c.massKg), 0)).toFixed(2);
      const ids = ch.batch.map(c => c.fieldContainerId).join(", ");
      this.add.text(370, 8, ch.refrigerant + "  |  " + totalMass + " kg  |  " + ch.batch.length + " containers", {
        fontFamily: "monospace", fontSize: "12px", color: "#8b949e",
      });
      this.add.text(370, 24, "Required zone: " + this.TEMP_MIN + "–" + this.TEMP_MAX + "°C", {
        fontFamily: "monospace", fontSize: "10px", color: "#ffa726",
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
    g.fillRect(300, 415, 340, 24);
    g.fillStyle(inGreen ? 0x238636 : 0x444444, 1);
    g.fillRect(300, 415, 340 * dwellFrac, 24);
    g.lineStyle(1, 0x30363d, 1);
    g.strokeRect(300, 415, 340, 24);

    this.add.text(470, 427, "DWELL: " + this.dwellTimer.toFixed(1) + "s / " + this.MIN_DWELL_SEC + "s", {
      fontFamily: "monospace", fontSize: "11px", color: "#ffffff",
    }).setOrigin(0.5);

    // Feed rate
    this.add.text(300, 446, "FEED RATE (↑↓)", {
      fontFamily: "monospace", fontSize: "10px", color: "#8b949e",
    });
    const intFeed = Math.round(this.feedRate);
    for (let i = 0; i < 10; i++) {
      g.fillStyle(i < intFeed ? 0xffa726 : 0x1a1a1a, 1);
      g.fillRect(300 + i * 32, 458, 28, 14);
      g.lineStyle(1, 0x333333, 1);
      g.strokeRect(300 + i * 32, 458, 28, 14);
    }

    // Air damper
    this.add.text(300, 478, "AIR DAMPER (←→)", {
      fontFamily: "monospace", fontSize: "10px", color: "#8b949e",
    });
    const damperW = 320;
    const damperX = 300;
    const damperY = 490;
    g.fillStyle(0x1a1a1a, 1);
    g.fillRect(damperX, damperY, damperW, 14);
    g.lineStyle(1, 0x333333, 1);
    g.strokeRect(damperX, damperY, damperW, 14);

    // Sweet-spot indicator
    const idealDamper = 25 + this.feedRate * 5;
    const sweetMin = Math.max(0, idealDamper - 12);
    const sweetMax = Math.min(100, idealDamper + 12);
    const sweetPxL = damperX + (sweetMin / 100) * damperW;
    const sweetPxR = damperX + (sweetMax / 100) * damperW;
    g.fillStyle(0x3fb950, 0.25);
    g.fillRect(sweetPxL, damperY, sweetPxR - sweetPxL, 14);

    // Damper fill
    const damperFillW = (this.damper / 100) * damperW;
    const damperDev = Math.abs(this.damper - idealDamper) / 50;
    const damperColor = damperDev < 0.25 ? 0x58a6ff : damperDev < 0.5 ? 0xffa726 : 0xf85149;
    g.fillStyle(damperColor, 0.85);
    g.fillRect(damperX, damperY, damperFillW, 14);
    g.lineStyle(1, 0x333333, 1);
    g.strokeRect(damperX, damperY, damperW, 14);

    this.add.text(damperX + damperW + 8, damperY + 1, Math.round(this.damper) + "%", {
      fontFamily: "monospace", fontSize: "11px", color: "#e6edf3",
    });

    // O₂ balance label
    const o2Label = damperDev < 0.15 ? "O₂ BALANCED" : damperDev < 0.35 ? "O₂ SLIGHTLY OFF" : this.damper < idealDamper ? "O₂ STARVED" : "EXCESS AIR";
    const o2Color = damperDev < 0.15 ? "#3fb950" : damperDev < 0.35 ? "#ffa726" : "#f85149";
    this.add.text(damperX + damperW / 2, damperY + 20, o2Label, {
      fontFamily: "monospace", fontSize: "9px", color: o2Color,
    }).setOrigin(0.5, 0);

    // Temp history graph
    if (this.tempHistory.length > 1) {
      const gx = 300, gy = 520, gw = 340, gh = 68;
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

      // Refrigerant-specific zone label
      this.add.text(gx + gw - 4, gy + 4, this.TEMP_MIN + "–" + this.TEMP_MAX + "°C zone", {
        fontFamily: "monospace", fontSize: "9px", color: "#3fb950",
      }).setOrigin(1, 0);
    }

    // Controls legend (right panel, below CO gauge)
    const lx = 670, ly = 430;
    g.fillStyle(0x161b22, 0.9);
    g.fillRect(lx, ly, 220, 160);
    g.lineStyle(1, 0x30363d, 1);
    g.strokeRect(lx, ly, 220, 160);
    this.add.text(lx + 110, ly + 10, "CONTROLS", {
      fontFamily: "monospace", fontSize: "11px", color: "#79c0ff", fontStyle: "bold",
    }).setOrigin(0.5);
    const controls = [
      ["↑ / ↓", "Feed rate (fuel)"],
      ["← / →", "Air damper (O₂)"],
    ];
    controls.forEach(([key, desc], i) => {
      const row = ly + 28 + i * 18;
      this.add.text(lx + 8, row, key, {
        fontFamily: "monospace", fontSize: "11px", color: "#ffa726", fontStyle: "bold",
      });
      this.add.text(lx + 56, row, desc, {
        fontFamily: "monospace", fontSize: "10px", color: "#8b949e",
      });
    });
    const hints = [
      "Keep temp in the green zone",
      "Match damper to feed rate",
      "Low O₂ → CO spikes",
      "High O₂ → chamber cools",
      "Zone shifts per refrigerant",
    ];
    this.add.text(lx + 8, ly + 72, "TIPS", {
      fontFamily: "monospace", fontSize: "10px", color: "#58a6ff", fontStyle: "bold",
    });
    hints.forEach((h, i) => {
      this.add.text(lx + 10, ly + 86 + i * 14, "· " + h, {
        fontFamily: "monospace", fontSize: "9px", color: "#6e7681",
      });
    });

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

  _processNextBatch() {
    if (this.queue.length === 0) {
      this._completeStage();
      return;
    }

    const batch = this.queue.shift();
    const refrigerant = batch[0].refrigerant;
    this.chamber = { batch, refrigerant, weighed: false, DRE: 0, coAlarmCount: 0, wrongDiagCount: 0 };
    this.phase = "WEIGHING";
    this._render();

    this._showBatchWeighingDialog(batch, (totalMass) => {
      this.chamber.confirmedTotalMass = totalMass;
      this.chamber.weighed = true;
      this.dwellTimer = 0;
      this.coAlarmTime = 0;
      this.chamberTemp = 900;
      this.coLevel = 20;
      this.feedRate = 5;
      this.damper = 50;
      this.feedActive = true;
      this.tempHistory = [];
      this.physicsAccum = 0;
      this.tempDriftOffset = 0;
      this.tempDriftTarget = 0;
      this.tempDriftTimer = 0;

      const r = REFRIGERANTS.find(r => r.id === refrigerant);
      if (r && r.destroyTemp) {
        this.TEMP_MIN = r.destroyTemp.min;
        this.TEMP_MAX = r.destroyTemp.max;
      } else {
        this.TEMP_MIN = 850;
        this.TEMP_MAX = 1200;
      }

      this.phase = "RUNNING";
    });
  }

  _updateChamberPhysics() {
    // Damper controls O2 supply. Optimal O2 ratio is ~1.0 (stoichiometric).
    // damper 0–100 maps to o2Ratio 0–2. Sweet spot depends on feed rate:
    // higher feed = more fuel = need more air to match.
    const o2Ratio = this.damper / 50;
    const idealDamper = 25 + this.feedRate * 5;
    const o2Deviation = Math.abs(this.damper - idealDamper) / 50;

    // Temperature: damper affects combustion efficiency.
    // Too little air (lean O2) → smothered flame, temp drops.
    // Too much air (rich O2) → excess air cools the chamber.
    const damperTempPenalty = o2Deviation * 120;
    const baseTarget = 700 + this.feedRate * 60;
    const targetTemp = baseTarget - damperTempPenalty;

    // Thermal load drift: the sweet spot shifts over time as refrigerant
    // vaporizes and changes the chamber chemistry.
    this.tempDriftTimer += 0.1;
    if (this.tempDriftTimer >= 4) {
      this.tempDriftTimer = 0;
      this.tempDriftTarget = (Math.random() - 0.5) * 60;
    }
    this.tempDriftOffset += (this.tempDriftTarget - this.tempDriftOffset) * 0.06;

    this.chamberTemp += (targetTemp + this.tempDriftOffset - this.chamberTemp) * 0.04
      + (Math.random() - 0.5) * 20;
    this.chamberTemp = Math.max(700, Math.min(1300, this.chamberTemp));

    // CO production depends on both temperature AND O2 balance.
    // Bad O2 ratio means incomplete combustion even at correct temp.
    if (this.chamberTemp < this.TEMP_MIN) {
      this.coLevel += 7 + o2Deviation * 5;
    } else if (this.chamberTemp > this.TEMP_MAX) {
      this.coLevel += 4 + o2Deviation * 3;
    } else if (o2Deviation > 0.4) {
      this.coLevel += o2Deviation * 8;
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
    this.chamber.coAlarmCount++;

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
            this.damper = 50;
            this.feedActive = true;
            this.phase = "RUNNING";
            this.gs.hud.showSuccess("✅ Component fixed! Resuming destruction.");
          });
        } else {
          this.coLevel += 25;
          this.chamber.wrongDiagCount++;
          this.gs.hud.showAlert("Wrong component. CO level increased.");
        }
        this._render();
      });
      this._diagZones.push(zone);
    });
  }

  _completeBatch() {
    if (this.phase !== "RUNNING") return;
    this.feedActive = false;
    this.phase = "EMPTY_WEIGH";
    this._render();

    const ch = this.chamber;
    const confirmedMass = ch.confirmedTotalMass;
    const directCO2 = confirmedMass * this._getCarbonContent(ch.refrigerant);

    this._showBatchEmptyWeighDialog(ch, (emptyWeight) => {
      const netMass = Math.max(0, confirmedMass - emptyWeight);
      const batchTotal = ch.batch.reduce((s, c) => s + (c.eligibleMassKg || c.massKg), 0);

      ch.batch.forEach(c => {
        const fraction = (c.eligibleMassKg || c.massKg) / batchTotal;
        this.gs.destroyedBatches.push({
          containerId: c.fieldContainerId,
          refrigerant: ch.refrigerant,
          massDestroyed: netMass * fraction,
          DRE: this.currentDRE,
          directCO2Emitted: directCO2 * fraction,
          destructionTime: new Date().toISOString(),
          attestationSigned: true,
        });
      });

      this._calculateBatchScore(ch, netMass, directCO2);
      this.gs.hud.showSuccess("✅ Batch complete! " + ch.batch.length + " containers | DRE: " + this.currentDRE.toFixed(4) + "% | " + netMass.toFixed(2) + " kg");
      this.time.delayedCall(1600, () => this._processNextBatch());
    });
  }

  _showBatchWeighingDialog(batch, callback) {
    const refrigerant = batch[0].refrigerant;
    const totalMass = batch.reduce((s, c) => s + (c.eligibleMassKg || c.massKg), 0).toFixed(2);
    const containerList = batch.map(c =>
      '<div style="font-size:11px; color:#c8d1da; margin:2px 0;">' + c.fieldContainerId + ' — ' + (c.eligibleMassKg || c.massKg).toFixed(2) + ' kg</div>'
    ).join("");
    const html = `
      <div style="
        position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
        background:#161b22; border:2px solid #30363d; border-radius:8px;
        padding:24px; width:420px; color:#e6edf3; font-family:monospace;
        z-index:200; text-align:center; box-shadow:0 8px 32px rgba(0,0,0,0.7);
      ">
        <h3 style="color:#79c0ff; margin:0 0 10px;">⚖️ PRE-DESTRUCTION WEIGHING</h3>
        <p style="font-size:11px; color:#8b949e; margin:0 0 10px;">
          Protocol §8.1.5: Batch weighed ≤2 days before destruction.
        </p>
        <p style="font-size:14px; color:#ffa726; margin:0 0 8px; font-weight:bold;">${refrigerant} — ${batch.length} container(s)</p>
        <div style="text-align:left; margin:0 auto 12px; max-width:280px;">${containerList}</div>
        <label style="font-size:13px;">Confirmed Total Mass (kg):<br>
          <input id="weighInput" type="number" value="${totalMass}" step="0.01" style="
            margin-top:8px; width:160px; padding:6px; font-family:monospace;
            font-size:16px; text-align:center; background:#0d1117;
            color:#e6edf3; border:1px solid #30363d; border-radius:4px;">
        </label><br>
        <button id="confirmWeigh" style="
          margin-top:16px; background:#238636; color:#fff; border:none;
          border-radius:4px; padding:10px 24px; font-family:monospace;
          font-size:14px; cursor:pointer;
        ">Confirm Batch Weight</button>
      </div>`;

    this.gs.hud.showPanel(html);
    setTimeout(() => {
      const btn = document.getElementById("confirmWeigh");
      if (!btn) return;
      btn.addEventListener("click", () => {
        const w = parseFloat(document.getElementById("weighInput").value) || parseFloat(totalMass);
        this.gs.hud.clearOverlay();
        callback(w);
      });
    }, 0);
  }

  _showBatchEmptyWeighDialog(ch, callback) {
    const emptyDefault = (ch.confirmedTotalMass * 0.05).toFixed(2);
    const containerList = ch.batch.map(c =>
      '<div style="font-size:11px; color:#c8d1da; margin:2px 0;">' + c.fieldContainerId + '</div>'
    ).join("");
    const html = `
      <div style="
        position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
        background:#161b22; border:2px solid #30363d; border-radius:8px;
        padding:24px; width:420px; color:#e6edf3; font-family:monospace;
        z-index:200; text-align:center; box-shadow:0 8px 32px rgba(0,0,0,0.7);
      ">
        <h3 style="color:#3fb950; margin:0 0 10px;">✅ DESTRUCTION COMPLETE</h3>
        <p style="font-size:11px; color:#8b949e; margin:0 0 10px;">
          Protocol §8.1.5: Weigh empty containers ≤2 days after destruction.
        </p>
        <p style="font-size:14px; color:#ffa726; margin:0 0 8px; font-weight:bold;">${ch.refrigerant} — ${ch.batch.length} container(s)</p>
        <div style="text-align:left; margin:0 auto 12px; max-width:280px;">${containerList}</div>
        <label style="font-size:13px;">Total Empty Container Mass (kg):<br>
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

  _calculateBatchScore(ch, netMass, directCO2) {
    const r = REFRIGERANTS.find(r => r.id === ch.refrigerant);
    const gwp = r ? r.GWP : 1960;

    const dreFraction = this.currentDRE / 100;
    const creditableMass = netMass * dreFraction;
    const grossAvoided = (creditableMass / 1000) * gwp;

    const coAlarmPenalty = ch.coAlarmCount * 0.05 * grossAvoided;
    const diagPenalty = ch.wrongDiagCount * 0.03 * grossAvoided;

    this.gs.score.grossCO2eAvoided += grossAvoided;
    this.gs.score.projectEmissions += directCO2 + coAlarmPenalty + diagPenalty;
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
