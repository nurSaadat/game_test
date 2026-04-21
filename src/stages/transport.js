export class TransportScene extends Phaser.Scene {
  constructor() {
    super({ key: "TransportScene" });
  }

  create() {
    this.gs = this.registry.get("gameState");

    this.truck = {
      x: 80,
      lane: 1,
      laneY: [155, 305, 455],
      visualY: 305,
      width: 90,
      height: 50,
      containerLeakPercent: 0,
    };

    this.obstacles = [];
    this.floatingTexts = [];
    this.speed = 3;
    this.distance = 0;
    this.totalDist = 2000;
    this.roadOffset = 0;
    this.active = true;
    this.inspectionPaused = false;
    this.leakWarningShown = false;

    this.gfx = this.add.graphics();

    this._spawnObstacles();

    // Persistent text elements (updated each frame, not recreated)
    this.distText = this.add.text(10, 3, "", {
      fontFamily: "monospace", fontSize: "11px", color: "#ffffff",
    }).setDepth(10);
    this.facilityText = this.add.text(888, 3, "FACILITY →", {
      fontFamily: "monospace", fontSize: "11px", color: "#79c0ff",
    }).setOrigin(1, 0).setDepth(10);
    this.leakLabel = this.add.text(670, 30, "CUMULATIVE LEAK:", {
      fontFamily: "monospace", fontSize: "11px", color: "#8b949e",
    }).setDepth(10);
    this.leakText = this.add.text(670, 50, "0.0%", {
      fontFamily: "monospace", fontSize: "22px", color: "#3fb950", fontStyle: "bold",
    }).setDepth(10);
    this.controlsText = this.add.text(20, 584, "↑↓ arrow keys to change lane", {
      fontFamily: "monospace", fontSize: "11px", color: "#555d6b",
    }).setDepth(10);

    this.cursors = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
    });
    this.canSwitch = true;
  }

  update(time, delta) {
    if (!this.active || this.inspectionPaused) return;

    if (this.cursors.up.isDown && this.canSwitch && this.truck.lane > 0) {
      this.truck.lane--;
      this.canSwitch = false;
    } else if (this.cursors.down.isDown && this.canSwitch && this.truck.lane < 2) {
      this.truck.lane++;
      this.canSwitch = false;
    }
    if (!this.cursors.up.isDown && !this.cursors.down.isDown) {
      this.canSwitch = true;
    }

    const step = this.speed * (delta / 16);

    this.roadOffset = (this.roadOffset + step) % 50;
    this.obstacles.forEach(o => { o.x -= step; });
    this.obstacles = this.obstacles.filter(o => o.x > -80);

    const targetY = this.truck.laneY[this.truck.lane];
    this.truck.visualY += (targetY - this.truck.visualY) * Math.min(1, 0.14 * (delta / 16));

    this._checkCollisions();

    if (this.truck.containerLeakPercent > 10 && !this.leakWarningShown) {
      this.leakWarningShown = true;
      this.gs.flags.leakagePenalty = true;
      this.gs.hud.showAlert("⚠️ Cumulative loss >10%! Investigation required per Protocol Section 9.");
    }

    this.floatingTexts = this.floatingTexts
      .map(ft => ({ ...ft, y: ft.y - 0.9, life: ft.life - 1 }))
      .filter(ft => ft.life > 0);

    this.distance += step;
    if (this.distance >= this.totalDist) {
      this._completeStage();
    }

    this._render();
  }

  _render() {
    const g = this.gfx;
    g.clear();

    this._drawRoad(g);
    this._drawObstacles(g);
    this._drawTruck(g);
    this._updateHUDText();
  }

  _drawRoad(g) {
    g.fillStyle(0x0d1b2a, 1);
    g.fillRect(0, 0, 900, 128);
    g.fillStyle(0x242424, 1);
    g.fillRect(0, 128, 900, 472);
    g.fillStyle(0x3a3020, 1);
    g.fillRect(0, 128, 900, 20);
    g.fillRect(0, 560, 900, 20);

    g.lineStyle(3, 0xcccccc, 1);
    g.lineBetween(0, 148, 900, 148);
    g.lineBetween(0, 562, 900, 562);

    // Lane dividers — draw manually with dashes
    const dashLen = 30, gapLen = 20;
    g.lineStyle(2, 0x777777, 1);
    for (const ly of [252, 402]) {
      let dx = -this.roadOffset;
      while (dx < 900) {
        const x1 = Math.max(0, dx);
        const x2 = Math.min(900, dx + dashLen);
        if (x2 > x1) {
          g.lineBetween(x1, ly, x2, ly);
        }
        dx += dashLen + gapLen;
      }
    }

    // Progress bar
    g.fillStyle(0x0d1117, 1);
    g.fillRect(0, 0, 900, 20);
    const prog = Math.min(1, this.distance / this.totalDist);
    g.fillStyle(0x238636, 1);
    g.fillRect(0, 0, prog * 900, 20);
  }

  _drawTruck(g) {
    const tx = this.truck.x;
    const ty = this.truck.visualY - this.truck.height / 2;
    const tw = this.truck.width;
    const th = this.truck.height;

    g.fillStyle(0x3a6349, 1);
    g.fillRect(tx, ty, tw - 24, th);
    g.fillStyle(0xf0c030, 1);
    g.fillRect(tx + 2, ty + th - 8, tw - 26, 6);
    g.fillStyle(0x2d4f38, 1);
    g.fillRect(tx + tw - 24, ty + 5, 24, th - 5);
    g.fillStyle(0x79c0ff, 1);
    g.fillRect(tx + tw - 20, ty + 8, 14, 14);

    g.fillStyle(0x111111, 1);
    const wheels = [[tx + 12, ty + th], [tx + 52, ty + th], [tx + tw - 10, ty + th]];
    wheels.forEach(([wx, wy]) => {
      g.fillCircle(wx, wy, 9);
      g.lineStyle(2, 0x444444, 1);
      g.strokeCircle(wx, wy, 5);
    });
  }

  _drawObstacles(g) {
    const laneY = this.truck.laneY;
    this.obstacles.forEach(obs => {
      const cy = laneY[obs.lane];
      if (obs.type === "pothole") {
        g.fillStyle(0x0a0a0a, 1);
        g.fillEllipse(obs.x + 20, cy + 18, 44, 20);
        g.lineStyle(1, 0x2a2a2a, 1);
        g.strokeEllipse(obs.x + 20, cy + 18, 44, 20);
      } else if (obs.type === "debris") {
        g.fillStyle(0x8b7355, 1);
        g.fillTriangle(obs.x, cy, obs.x + 24, cy - 20, obs.x + 48, cy + 6);
        g.lineStyle(1, 0x5a4a35, 1);
        g.strokeTriangle(obs.x, cy, obs.x + 24, cy - 20, obs.x + 48, cy + 6);
      } else if (obs.type === "inspection") {
        g.fillStyle(0xdddddd, 1);
        g.fillRect(obs.x + 5, cy - 75, 6, 90);
        g.fillRect(obs.x + 37, cy - 75, 6, 90);
        for (let s = 0; s < 5; s++) {
          g.fillStyle(s % 2 === 0 ? 0xf85149 : 0xe6edf3, 1);
          g.fillRect(obs.x, cy - 80 + s * 8, 48, 8);
        }
      }
    });
  }

  _updateHUDText() {
    const leak = this.truck.containerLeakPercent;
    const leakColorStr = leak > 10 ? "#f85149" : leak > 5 ? "#ffa726" : "#3fb950";

    const g = this.gfx;
    g.fillStyle(0x0d1117, 1);
    g.fillRect(660, 22, 230, 60);
    g.lineStyle(1, 0x30363d, 1);
    g.strokeRect(660, 22, 230, 60);

    this.distText.setText("DISTANCE: " + Math.floor(this.distance) + " / " + this.totalDist + " m");
    this.leakText.setText(leak.toFixed(1) + "%");
    this.leakText.setColor(leakColorStr);
  }

  _checkCollisions() {
    const tx = this.truck.x;
    const ty = this.truck.visualY - this.truck.height / 2;
    const tw = this.truck.width;
    const th = this.truck.height;

    this.obstacles = this.obstacles.filter(obs => {
      const cy = this.truck.laneY[obs.lane];
      const hit = tx < obs.x + obs.width &&
        tx + tw > obs.x &&
        ty < cy + obs.height / 2 &&
        ty + th > cy - obs.height / 2;

      if (!hit) return true;

      if (obs.type === "inspection") {
        this.inspectionPaused = true;
        const hasDocs = this._hasDocumentation();

        const html = `
          <div style="
            position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
            background:#161b22; border:2px solid #ffa726; border-radius:8px;
            padding:24px; width:360px; color:#e6edf3; font-family:monospace;
            z-index:200; text-align:center; box-shadow:0 8px 32px rgba(0,0,0,0.7);
          ">
            <h3 style="color:#ffa726; margin:0 0 10px;">🛃 BORDER INSPECTION</h3>
            <p style="font-size:12px; color:#8b949e; margin:0 0 18px;">
              Protocol §8.1.4: Bills of lading and container IDs required.
            </p>
            <button id="showDocsBtn" style="
              background:#238636; color:#fff; border:none; border-radius:4px;
              padding:10px 24px; font-family:monospace; font-size:14px; cursor:pointer;
            ">Show Documents</button>
          </div>`;

        this.gs.hud.showPanel(html);

        setTimeout(() => {
          const btn = document.getElementById("showDocsBtn");
          if (!btn) return;
          btn.addEventListener("click", () => {
            this.gs.hud.clearOverlay();
            this.inspectionPaused = false;
            if (hasDocs) {
              this.gs.hud.showSuccess("✅ Documentation OK! Carry on.");
            } else {
              this.truck.containerLeakPercent += 15;
              this.gs.flags.leakagePenalty = true;
              this.gs.hud.showAlert("❌ Missing documentation! +15% leak penalty.");
            }
          });
        }, 0);
      } else {
        obs.effect();
        const label = obs.type === "pothole" ? "-1.5% LEAK" : "-3% LEAK";
        this._showFloatingText(label, tx + 45, this.truck.visualY - 35);
      }

      return false;
    });
  }

  _hasDocumentation() {
    return this.gs.containers.length > 0 && !this.gs.flags.provenanceGapPenalty;
  }

  _showFloatingText(text, x, y) {
    const ft = this.add.text(x, y, text, {
      fontFamily: "monospace", fontSize: "13px", color: "#f85149", fontStyle: "bold",
    }).setOrigin(0.5);
    this.tweens.add({
      targets: ft, y: y - 50, alpha: 0, duration: 1400, ease: "Power2",
      onComplete: () => ft.destroy(),
    });
  }

  _completeStage() {
    this.active = false;

    const leakFrac = Math.min(1, this.truck.containerLeakPercent / 100);
    this.gs.aggregatedContainers.forEach(c => {
      c.eligibleMassKg = (c.eligibleMassKg || c.massKg) * (1 - leakFrac);
    });
    this.gs.transportedContainers = this.gs.aggregatedContainers.map(c => ({ ...c }));
    this.gs.hud.clearOverlay();
    this.scene.start("TransitionScene", { nextKey: "DESTRUCTION" });
  }

  _spawnObstacles() {
    const types = [
      {
        type: "pothole",
        effect: () => {
          this.truck.containerLeakPercent += 1.5;
          this.gs.score.projectEmissions += 20;
        },
      },
      {
        type: "debris",
        effect: () => {
          this.truck.containerLeakPercent += 3.0;
          this.gs.score.projectEmissions += 50;
        },
      },
      {
        type: "inspection",
        effect: () => {},
      },
    ];

    this.obstacles = [];
    for (let i = 0; i < 22; i++) {
      const t = types[Math.floor(Math.random() * types.length)];
      this.obstacles.push({
        ...t,
        x: 720 + i * 120,
        lane: Math.floor(Math.random() * 3),
        width: 52,
        height: 52,
      });
    }
  }
}
