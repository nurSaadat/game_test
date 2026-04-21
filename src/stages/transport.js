// Stage 3: Avoid-obstacle mini-game
// Based on Protocol Section 8.1.4 (Transportation Segments) & Section 9 (Reconciliation)

export class TransportStage {
  constructor(gameState, canvas, ctx, hud, advanceStage) {
    this.state        = gameState;
    this.canvas       = canvas;
    this.ctx          = ctx;
    this.hud          = hud;
    this.advanceStage = advanceStage;

    this.truck = {
      x:    80,
      lane: 1,                 // 0=top 1=mid 2=bottom
      laneY: [155, 305, 455],
      visualY: 305,            // interpolated Y for smooth movement
      width:  90,
      height: 50,
      containerLeakPercent: 0,
    };

    this.obstacles    = [];
    this.floatingTexts = [];
    this.speed        = 3;
    this.distance     = 0;
    this.totalDist    = 2000;
    this.roadOffset   = 0;

    this.active            = false;
    this.inspectionPaused  = false;
    this.leakWarningShown  = false;

    this._keyHandler = null;
  }

  start() {
    this.active      = true;
    this.distance    = 0;
    this.roadOffset  = 0;
    this.floatingTexts = [];
    this.leakWarningShown = false;
    this.truck.lane  = 1;
    this.truck.visualY = this.truck.laneY[1];
    this.truck.containerLeakPercent = 0;

    this.spawnObstacles();

    this._keyHandler = (e) => {
      if (e.key === "ArrowUp"   && this.truck.lane > 0) this.truck.lane--;
      if (e.key === "ArrowDown" && this.truck.lane < 2) this.truck.lane++;
    };
    document.addEventListener("keydown", this._keyHandler);
  }

  stop() {
    document.removeEventListener("keydown", this._keyHandler);
    this.active = false;
  }

  update(dt) {
    if (!this.active || this.inspectionPaused) return;

    const step = this.speed * (dt / 16);

    // Scroll road and obstacles
    this.roadOffset = (this.roadOffset + step) % 50;
    this.obstacles.forEach(o => { o.x -= step; });
    this.obstacles = this.obstacles.filter(o => o.x > -80);

    // Smooth lane Y interpolation
    const targetY = this.truck.laneY[this.truck.lane];
    this.truck.visualY += (targetY - this.truck.visualY) * Math.min(1, 0.14 * (dt / 16));

    this.checkCollisions();

    // Leak threshold warning
    if (this.truck.containerLeakPercent > 10 && !this.leakWarningShown) {
      this.leakWarningShown = true;
      this.state.flags.leakagePenalty = true;
      this.hud.showAlert("\u26a0\ufe0f Cumulative loss >10%! Investigation required per Protocol Section 9.");
    }

    // Floating damage texts drift upward
    this.floatingTexts = this.floatingTexts
      .map(ft => ({ ...ft, y: ft.y - 0.9, life: ft.life - 1 }))
      .filter(ft => ft.life > 0);

    this.distance += step;
    if (this.distance >= this.totalDist) {
      this.completeStage();
    }
  }

  render(ctx) {
    this._drawRoad(ctx);
    this._drawObstacles(ctx);
    this._drawTruck(ctx);
    this._drawFloatingTexts(ctx);
    this._drawHUD(ctx);
  }

  // ─────────────────────────── DRAW HELPERS ─────────────────────────────

  _drawRoad(ctx) {
    // Sky
    ctx.fillStyle = "#0d1b2a";
    ctx.fillRect(0, 0, 900, 128);

    // Road surface
    ctx.fillStyle = "#242424";
    ctx.fillRect(0, 128, 900, 472);

    // Road shoulders
    ctx.fillStyle = "#3a3020";
    ctx.fillRect(0, 128, 900, 20);
    ctx.fillRect(0, 560, 900, 20);

    // White edge lines
    ctx.strokeStyle = "#cccccc";
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(0, 148); ctx.lineTo(900, 148); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 562); ctx.lineTo(900, 562); ctx.stroke();

    // Lane dividers (animated dashes)
    ctx.strokeStyle = "#777";
    ctx.lineWidth = 2;
    ctx.setLineDash([30, 20]);
    ctx.lineDashOffset = -this.roadOffset;
    ctx.beginPath(); ctx.moveTo(0, 252); ctx.lineTo(900, 252); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 402); ctx.lineTo(900, 402); ctx.stroke();
    ctx.setLineDash([]);

    // Distance progress bar (very top strip)
    ctx.fillStyle = "#0d1117";
    ctx.fillRect(0, 0, 900, 20);
    const prog = Math.min(1, this.distance / this.totalDist);
    ctx.fillStyle = "#238636";
    ctx.fillRect(0, 0, prog * 900, 20);

    ctx.fillStyle = "#fff";
    ctx.font = "11px monospace";
    ctx.textAlign = "left";
    ctx.fillText("DISTANCE: " + Math.floor(this.distance) + " / " + this.totalDist + " m", 10, 14);
    ctx.fillStyle = "#79c0ff";
    ctx.textAlign = "right";
    ctx.fillText("FACILITY \u2192", 888, 14);
    ctx.textAlign = "left";
  }

  _drawTruck(ctx) {
    const tx = this.truck.x;
    const ty = this.truck.visualY - this.truck.height / 2;
    const tw = this.truck.width;
    const th = this.truck.height;

    // Container body
    ctx.fillStyle = "#3a6349";
    ctx.fillRect(tx, ty, tw - 24, th);

    // Danger stripes on container
    ctx.fillStyle = "#f0c030";
    ctx.fillRect(tx + 2, ty + th - 8, tw - 26, 6);

    // Cab
    ctx.fillStyle = "#2d4f38";
    ctx.fillRect(tx + tw - 24, ty + 5, 24, th - 5);

    // Windshield
    ctx.fillStyle = "#79c0ff";
    ctx.fillRect(tx + tw - 20, ty + 8, 14, 14);

    // Wheels
    ctx.fillStyle = "#111";
    const wheels = [
      [tx + 12, ty + th],
      [tx + 52, ty + th],
      [tx + tw - 10, ty + th],
    ];
    wheels.forEach(([wx, wy]) => {
      ctx.beginPath(); ctx.arc(wx, wy, 9, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#444"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(wx, wy, 5, 0, Math.PI * 2); ctx.stroke();
    });

    // Label
    ctx.fillStyle = "#e6edf3";
    ctx.font = "8px monospace";
    ctx.textAlign = "left";
    ctx.fillText("CRYO", tx + 5, ty + 20);
    ctx.fillText("REFRIG.", tx + 5, ty + 30);
  }

  _drawObstacles(ctx) {
    const laneY = this.truck.laneY;
    this.obstacles.forEach(obs => {
      const cy = laneY[obs.lane];

      if (obs.type === "pothole") {
        ctx.fillStyle = "#0a0a0a";
        ctx.beginPath();
        ctx.ellipse(obs.x + 20, cy + 18, 22, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#2a2a2a";
        ctx.lineWidth = 1;
        ctx.stroke();
        // crack lines
        ctx.strokeStyle = "#111";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(obs.x + 10, cy + 12); ctx.lineTo(obs.x + 30, cy + 24); ctx.stroke();

      } else if (obs.type === "debris") {
        ctx.fillStyle = "#8b7355";
        ctx.beginPath();
        const pts = [[0, 0],[22,-20],[44,-12],[48,6],[38,22],[8,18]];
        ctx.moveTo(obs.x + pts[0][0], cy + pts[0][1]);
        pts.slice(1).forEach(([dx, dy]) => ctx.lineTo(obs.x + dx, cy + dy));
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#5a4a35";
        ctx.lineWidth = 1;
        ctx.stroke();

      } else if (obs.type === "inspection") {
        // Posts
        ctx.fillStyle = "#ddd";
        ctx.fillRect(obs.x + 5,  cy - 75, 6, 90);
        ctx.fillRect(obs.x + 37, cy - 75, 6, 90);
        // Striped barrier arm
        for (let s = 0; s < 5; s++) {
          ctx.fillStyle = s % 2 === 0 ? "#f85149" : "#e6edf3";
          ctx.fillRect(obs.x, cy - 80 + s * 8, 48, 8);
        }
        // Sign
        ctx.fillStyle = "#ffa726";
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.fillText("INSPECT", obs.x + 24, cy - 84);
        ctx.textAlign = "left";
      }
    });
  }

  _drawFloatingTexts(ctx) {
    this.floatingTexts.forEach(ft => {
      ctx.globalAlpha = Math.min(1, ft.life / 25);
      ctx.fillStyle   = "#f85149";
      ctx.font        = "bold 13px monospace";
      ctx.textAlign   = "center";
      ctx.fillText(ft.text, ft.x, ft.y);
    });
    ctx.globalAlpha = 1;
    ctx.textAlign   = "left";
  }

  _drawHUD(ctx) {
    // Leak % box
    const leak      = this.truck.containerLeakPercent;
    const leakColor = leak > 10 ? "#f85149" : leak > 5 ? "#ffa726" : "#3fb950";

    ctx.fillStyle   = "#0d1117";
    ctx.fillRect(660, 22, 230, 60);
    ctx.strokeStyle = "#30363d";
    ctx.lineWidth   = 1;
    ctx.strokeRect(660, 22, 230, 60);

    ctx.fillStyle = "#8b949e";
    ctx.font      = "11px monospace";
    ctx.textAlign = "left";
    ctx.fillText("CUMULATIVE LEAK:", 670, 40);
    ctx.fillStyle = leakColor;
    ctx.font      = "bold 22px monospace";
    ctx.fillText(leak.toFixed(1) + "%", 670, 66);

    // Controls hint
    ctx.fillStyle = "#555d6b";
    ctx.font      = "11px monospace";
    ctx.fillText("\u2191\u2193 arrow keys to change lane", 20, 590);
  }

  // ─────────────────────────── COLLISIONS ──────────────────────────────

  checkCollisions() {
    const tx = this.truck.x;
    const ty = this.truck.visualY - this.truck.height / 2;
    const tw = this.truck.width;
    const th = this.truck.height;

    this.obstacles = this.obstacles.filter(obs => {
      const cy = this.truck.laneY[obs.lane];
      const hit = tx < obs.x + obs.width  &&
                  tx + tw > obs.x         &&
                  ty < cy + obs.height / 2 &&
                  ty + th > cy - obs.height / 2;

      if (!hit) return true; // keep obstacle

      if (obs.type === "inspection") {
        this.inspectionPaused = true;
        const hasDocs = this.hasDocumentation();

        const html = `
          <div style="
            position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
            background:#161b22; border:2px solid #ffa726; border-radius:8px;
            padding:24px; width:360px; color:#e6edf3; font-family:monospace;
            z-index:200; text-align:center; box-shadow:0 8px 32px rgba(0,0,0,0.7);
          ">
            <h3 style="color:#ffa726; margin:0 0 10px;">\uD83D\uDEC3 BORDER INSPECTION</h3>
            <p style="font-size:12px; color:#8b949e; margin:0 0 18px;">
              Protocol \u00a78.1.4: Bills of lading and container IDs required.
            </p>
            <button id="showDocsBtn" style="
              background:#238636; color:#fff; border:none; border-radius:4px;
              padding:10px 24px; font-family:monospace; font-size:14px; cursor:pointer;
            ">Show Documents</button>
          </div>`;

        this.hud.showPanel(html);

        setTimeout(() => {
          const btn = document.getElementById("showDocsBtn");
          if (!btn) return;
          btn.addEventListener("click", () => {
            this.hud.clearOverlay();
            this.inspectionPaused = false;
            if (hasDocs) {
              this.hud.showSuccess("\u2705 Documentation OK! Carry on.");
            } else {
              this.truck.containerLeakPercent += 15;
              this.state.flags.leakagePenalty  = true;
              this.hud.showAlert("\u274c Missing documentation! +15% leak penalty.");
            }
          });
        }, 0);
      } else {
        // pothole / debris
        obs.effect();
        const label = obs.type === "pothole" ? "-1.5% LEAK" : "-3% LEAK";
        this.showFloatingText(label, tx + 45, this.truck.visualY - 35);
      }

      return false; // consume obstacle
    });
  }

  hasDocumentation() {
    return this.state.containers.length > 0 && !this.state.flags.provenanceGapPenalty;
  }

  showFloatingText(text, x, y) {
    this.floatingTexts.push({ text, x, y, life: 55 });
  }

  completeStage() {
    this.active = false;
    this.stop();

    const leakFrac = Math.min(1, this.truck.containerLeakPercent / 100);
    this.state.aggregatedContainers.forEach(c => {
      c.eligibleMassKg = (c.eligibleMassKg || c.massKg) * (1 - leakFrac);
    });
    this.state.transportedContainers = this.state.aggregatedContainers.map(c => ({ ...c }));
    this.advanceStage();
  }

  spawnObstacles() {
    const types = [
      {
        type:   "pothole",
        effect: () => {
          this.truck.containerLeakPercent += 1.5;
          this.state.score.projectEmissions += 20;
        },
      },
      {
        type:   "debris",
        effect: () => {
          this.truck.containerLeakPercent += 3.0;
          this.state.score.projectEmissions += 50;
        },
      },
      {
        type:   "inspection",
        effect: () => {}, // handled in checkCollisions
      },
    ];

    this.obstacles = [];
    for (let i = 0; i < 22; i++) {
      const t = types[Math.floor(Math.random() * types.length)];
      this.obstacles.push({
        ...t,
        x:      720 + i * 120,
        lane:   Math.floor(Math.random() * 3),
        width:  52,
        height: 52,
      });
    }
  }
}
