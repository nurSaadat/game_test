export class CollectionScene extends Phaser.Scene {
  constructor() {
    super({ key: "CollectionScene" });
  }

  create() {
    this.gs = this.registry.get("gameState");
    this.collected = new Set();

    this.generateScene();

    const bg = this.add.graphics();
    bg.fillStyle(0x1a2332, 1);
    bg.fillRect(0, 0, 900, 600);

    bg.lineStyle(1, 0x1e2940, 1);
    for (let x = 0; x < 900; x += 60) {
      bg.lineBetween(x, 0, x, 600);
    }
    for (let y = 0; y < 600; y += 60) {
      bg.lineBetween(0, y, 900, y);
    }

    // Concrete floor
    bg.fillStyle(0x1e2940, 0.3);
    bg.fillRect(0, 480, 900, 120);

    this.add.text(20, 18, "STAGE 1 — FIELD COLLECTION", {
      fontFamily: "monospace", fontSize: "20px", color: "#79c0ff", fontStyle: "bold",
    });
    this.add.text(20, 46, "Click equipment to collect refrigerant. Avoid ineligible items.", {
      fontFamily: "monospace", fontSize: "13px", color: "#8b949e",
    });

    this.collectionPoints.forEach(cp => {
      this._createEquipment(cp);
    });

    this.progressText = this.add.text(20, 574, "Collected: 0 / 3", {
      fontFamily: "monospace", fontSize: "13px", color: "#8b949e",
    });

    this.nextBtnGroup = this.add.container(0, 0);
    const nbg = this.add.graphics();
    nbg.fillStyle(0x238636, 1);
    nbg.fillRoundedRect(325, 530, 250, 50, 6);
    const nbt = this.add.text(450, 555, "NEXT STAGE →", {
      fontFamily: "monospace", fontSize: "17px", color: "#ffffff", fontStyle: "bold",
    }).setOrigin(0.5);
    const nbz = this.add.zone(450, 555, 250, 50).setInteractive({ useHandCursor: true });
    nbz.on("pointerdown", () => this._advance());
    this.nextBtnGroup.add([nbg, nbt, nbz]);
    this.nextBtnGroup.setVisible(false);
  }

  _createEquipment(cp) {
    const g = this.add.graphics();
    cp._cardGfx = g;

    const drawFn = {
      "Car AC": () => this._drawCar(g, cp),
      "Industrial Chiller": () => this._drawChiller(g, cp),
      "Residential Split AC": () => this._drawSplitAC(g, cp),
      "CO₂ Heat Pump": () => this._drawHeatPump(g, cp),
    };

    (drawFn[cp.equipmentType] || (() => this._drawGenericBox(g, cp)))();

    // Label below the equipment
    cp._nameText = this.add.text(cp.position.x + cp.hitW / 2, cp.position.y + cp.hitH + 6, cp.equipmentType, {
      fontFamily: "monospace", fontSize: "11px", color: "#e6edf3", fontStyle: "bold",
    }).setOrigin(0.5, 0);

    cp._infoText = this.add.text(cp.position.x + cp.hitW / 2, cp.position.y + cp.hitH + 22, cp.refrigerant + "  |  " + cp.massKg + " kg", {
      fontFamily: "monospace", fontSize: "10px", color: "#8b949e",
    }).setOrigin(0.5, 0);

    if (cp.eligible === false) {
      cp._ineligibleBadge = this.add.text(cp.position.x + cp.hitW / 2, cp.position.y + cp.hitH + 36, "⊘ INELIGIBLE", {
        fontFamily: "monospace", fontSize: "10px", color: "#f85149", fontStyle: "bold",
      }).setOrigin(0.5, 0);
    }

    cp._checkmark = this.add.text(cp.position.x + cp.hitW - 4, cp.position.y + 4, "✓", {
      fontFamily: "monospace", fontSize: "28px", color: "#3fb950", fontStyle: "bold",
    }).setOrigin(1, 0).setVisible(false).setDepth(10);

    // Highlight outline (shown on hover)
    const eligible = cp.eligible !== false;
    cp._highlight = this.add.graphics();
    cp._highlight.lineStyle(2, eligible ? 0x3fb950 : 0xf85149, 0.7);
    cp._highlight.strokeRoundedRect(cp.position.x - 4, cp.position.y - 4, cp.hitW + 8, cp.hitH + 8, 6);
    cp._highlight.setVisible(false);

    const zone = this.add.zone(cp.position.x + cp.hitW / 2, cp.position.y + cp.hitH / 2, cp.hitW, cp.hitH)
      .setInteractive({ useHandCursor: true });

    zone.on("pointerover", () => {
      if (!this.collected.has(cp.id)) cp._highlight.setVisible(true);
    });
    zone.on("pointerout", () => {
      cp._highlight.setVisible(false);
    });
    zone.on("pointerdown", () => {
      if (!this.collected.has(cp.id)) {
        this._onEquipmentClick(cp);
      }
    });
  }

  // ────────────── CAR (Car AC) ──────────────
  _drawCar(g, cp) {
    const x = cp.position.x, y = cp.position.y;
    cp.hitW = 180;
    cp.hitH = 100;

    // Shadow
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(x + 90, y + 98, 170, 14);

    // Body
    g.fillStyle(0x3a6080, 1);
    g.fillRoundedRect(x + 10, y + 48, 160, 42, 4);

    // Hood slope
    g.fillStyle(0x3a6080, 1);
    g.fillTriangle(x + 10, y + 48, x + 10, y + 90, x + 2, y + 90);

    // Trunk slope
    g.fillTriangle(x + 170, y + 48, x + 170, y + 90, x + 178, y + 90);

    // Cabin/roof
    g.fillStyle(0x2d4f6a, 1);
    g.fillRoundedRect(x + 45, y + 20, 90, 32, 6);

    // Windshield
    g.fillStyle(0x79c0ff, 0.6);
    g.fillTriangle(x + 45, y + 50, x + 50, y + 26, x + 72, y + 26);
    g.fillRect(x + 50, y + 26, 22, 24);

    // Rear window
    g.fillStyle(0x79c0ff, 0.5);
    g.fillTriangle(x + 135, y + 50, x + 130, y + 26, x + 112, y + 26);
    g.fillRect(x + 112, y + 26, 18, 24);

    // Side windows
    g.fillStyle(0x79c0ff, 0.4);
    g.fillRect(x + 75, y + 28, 34, 20);

    // Door line
    g.lineStyle(1, 0x2a4560, 1);
    g.lineBetween(x + 90, y + 48, x + 90, y + 86);

    // Headlights
    g.fillStyle(0xfff176, 1);
    g.fillCircle(x + 14, y + 60, 4);
    g.fillCircle(x + 14, y + 72, 4);

    // Taillights
    g.fillStyle(0xf85149, 1);
    g.fillCircle(x + 166, y + 60, 3);
    g.fillCircle(x + 166, y + 72, 3);

    // Wheels
    g.fillStyle(0x111111, 1);
    g.fillCircle(x + 42, y + 92, 12);
    g.fillCircle(x + 140, y + 92, 12);
    g.fillStyle(0x333333, 1);
    g.fillCircle(x + 42, y + 92, 7);
    g.fillCircle(x + 140, y + 92, 7);
    g.fillStyle(0x555555, 1);
    g.fillCircle(x + 42, y + 92, 3);
    g.fillCircle(x + 140, y + 92, 3);

    // "AC" label on car
    this.add.text(x + 90, y + 64, "A/C", {
      fontFamily: "monospace", fontSize: "9px", color: "#aaccee", fontStyle: "bold",
    }).setOrigin(0.5);
  }

  // ────────────── INDUSTRIAL CHILLER ──────────────
  _drawChiller(g, cp) {
    const x = cp.position.x, y = cp.position.y;
    cp.hitW = 200;
    cp.hitH = 140;

    // Shadow
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(x + 100, y + 138, 190, 14);

    // Main body
    g.fillStyle(0x4a5568, 1);
    g.fillRoundedRect(x + 10, y + 20, 180, 110, 4);

    // Panel lines
    g.lineStyle(1, 0x5a6578, 1);
    g.lineBetween(x + 70, y + 20, x + 70, y + 130);
    g.lineBetween(x + 130, y + 20, x + 130, y + 130);

    // Vent grilles on left panel
    g.lineStyle(1, 0x3a4558, 1);
    for (let i = 0; i < 6; i++) {
      g.lineBetween(x + 18, y + 35 + i * 14, x + 62, y + 35 + i * 14);
    }

    // Control panel (center)
    g.fillStyle(0x1a2332, 1);
    g.fillRoundedRect(x + 78, y + 32, 44, 50, 3);

    // Indicator lights
    g.fillStyle(0x3fb950, 1);
    g.fillCircle(x + 90, y + 44, 4);
    g.fillStyle(0xffa726, 1);
    g.fillCircle(x + 108, y + 44, 4);

    // Display
    g.fillStyle(0x0d1117, 1);
    g.fillRect(x + 82, y + 54, 36, 16);
    this.add.text(x + 100, y + 62, "12°C", {
      fontFamily: "monospace", fontSize: "8px", color: "#3fb950",
    }).setOrigin(0.5);

    // Pipes on right panel
    g.lineStyle(3, 0x29B6F6, 1);
    g.lineBetween(x + 140, y + 40, x + 140, y + 75);
    g.lineBetween(x + 140, y + 40, x + 175, y + 40);
    g.lineStyle(3, 0xf85149, 1);
    g.lineBetween(x + 160, y + 40, x + 160, y + 75);
    g.lineBetween(x + 160, y + 40, x + 175, y + 55);

    // Pipe connectors
    g.fillStyle(0x718096, 1);
    g.fillCircle(x + 175, y + 40, 4);
    g.fillCircle(x + 175, y + 55, 4);

    // Compressor hump on top
    g.fillStyle(0x5a6578, 1);
    g.fillRoundedRect(x + 30, y + 8, 60, 16, 4);
    g.lineStyle(1, 0x6a7588, 1);
    g.strokeRoundedRect(x + 30, y + 8, 60, 16, 4);

    // Legs
    g.fillStyle(0x3a4558, 1);
    g.fillRect(x + 20, y + 128, 10, 8);
    g.fillRect(x + 170, y + 128, 10, 8);

    // Warning label
    g.fillStyle(0xffa726, 0.8);
    g.fillRect(x + 78, y + 95, 44, 18);
    this.add.text(x + 100, y + 104, "CFC-12", {
      fontFamily: "monospace", fontSize: "8px", color: "#111111", fontStyle: "bold",
    }).setOrigin(0.5);
  }

  // ────────────── SPLIT AC (wall-mounted unit) ──────────────
  _drawSplitAC(g, cp) {
    const x = cp.position.x, y = cp.position.y;
    cp.hitW = 180;
    cp.hitH = 110;

    // Wall section
    g.fillStyle(0x2a3444, 1);
    g.fillRect(x, y, 180, 110);
    g.lineStyle(1, 0x3a4454, 0.5);
    for (let bx = 0; bx < 180; bx += 30) {
      g.lineBetween(x + bx, y, x + bx, y + 110);
    }

    // Wall bracket / mount
    g.fillStyle(0x555555, 1);
    g.fillRect(x + 30, y + 20, 6, 12);
    g.fillRect(x + 144, y + 20, 6, 12);

    // Main indoor unit body
    g.fillStyle(0xe8e8e8, 1);
    g.fillRoundedRect(x + 15, y + 28, 150, 50, 8);

    // Unit top edge highlight
    g.fillStyle(0xf5f5f5, 1);
    g.fillRoundedRect(x + 15, y + 28, 150, 8, { tl: 8, tr: 8, bl: 0, br: 0 });

    // Display panel
    g.fillStyle(0x1a1a1a, 1);
    g.fillRoundedRect(x + 125, y + 36, 30, 14, 3);
    this.add.text(x + 140, y + 43, "22°", {
      fontFamily: "monospace", fontSize: "7px", color: "#3fb950",
    }).setOrigin(0.5);

    // LED indicator
    g.fillStyle(0x3fb950, 1);
    g.fillCircle(x + 32, y + 43, 2);

    // Air flow louvers (bottom)
    g.fillStyle(0xd0d0d0, 1);
    g.fillRoundedRect(x + 20, y + 62, 140, 14, { tl: 0, tr: 0, bl: 6, br: 6 });
    g.lineStyle(1, 0xbbbbbb, 1);
    for (let i = 0; i < 7; i++) {
      const ly = y + 63 + i * 2;
      g.lineBetween(x + 24, ly, x + 156, ly);
    }

    // Air flow lines (animated feel)
    g.lineStyle(1, 0x79c0ff, 0.3);
    for (let i = 0; i < 5; i++) {
      const sx = x + 35 + i * 28;
      g.lineBetween(sx, y + 78, sx - 8, y + 95);
      g.lineBetween(sx - 8, y + 95, sx, y + 108);
    }

    // Brand label
    this.add.text(x + 90, y + 50, "COOL", {
      fontFamily: "monospace", fontSize: "8px", color: "#999999",
    }).setOrigin(0.5);
  }

  // ────────────── HEAT PUMP (outdoor unit) ──────────────
  _drawHeatPump(g, cp) {
    const x = cp.position.x, y = cp.position.y;
    cp.hitW = 160;
    cp.hitH = 140;

    // Shadow
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(x + 80, y + 138, 150, 12);

    // Main body
    g.fillStyle(0xb0b8c0, 1);
    g.fillRoundedRect(x + 10, y + 15, 140, 115, 4);

    // Top vent (circular fan area)
    g.fillStyle(0x888888, 1);
    g.fillCircle(x + 80, y + 60, 35);
    g.fillStyle(0x1a2332, 1);
    g.fillCircle(x + 80, y + 60, 32);

    // Fan grille
    g.lineStyle(1, 0x555555, 0.6);
    for (let i = -30; i <= 30; i += 6) {
      const x1 = x + 80 + i;
      const halfLen = Math.sqrt(32 * 32 - i * i);
      if (halfLen > 0) {
        g.lineBetween(x1, y + 60 - halfLen, x1, y + 60 + halfLen);
      }
    }

    // Fan blades
    g.fillStyle(0x444444, 1);
    for (let a = 0; a < 4; a++) {
      const angle = (a * Math.PI) / 2 + 0.3;
      const bx = x + 80 + Math.cos(angle) * 18;
      const by = y + 60 + Math.sin(angle) * 18;
      g.fillEllipse(bx, by, 16, 6);
    }
    // Fan center hub
    g.fillStyle(0x666666, 1);
    g.fillCircle(x + 80, y + 60, 5);

    // Side vents
    g.lineStyle(1, 0x999999, 1);
    for (let i = 0; i < 5; i++) {
      g.lineBetween(x + 14, y + 100 + i * 5, x + 55, y + 100 + i * 5);
      g.lineBetween(x + 105, y + 100 + i * 5, x + 146, y + 100 + i * 5);
    }

    // Pipes coming out the side
    g.lineStyle(3, 0x718096, 1);
    g.lineBetween(x + 150, y + 45, x + 165, y + 45);
    g.lineBetween(x + 165, y + 45, x + 165, y + 80);
    g.lineBetween(x + 150, y + 65, x + 160, y + 65);
    g.lineBetween(x + 160, y + 65, x + 160, y + 80);

    // Pipe connectors
    g.fillStyle(0x888888, 1);
    g.fillCircle(x + 165, y + 80, 3);
    g.fillCircle(x + 160, y + 80, 3);

    // "CO₂" label on unit
    g.fillStyle(0xffa726, 0.8);
    g.fillRoundedRect(x + 30, y + 20, 36, 14, 2);
    this.add.text(x + 48, y + 27, "CO₂", {
      fontFamily: "monospace", fontSize: "8px", color: "#111111", fontStyle: "bold",
    }).setOrigin(0.5);

    // Legs
    g.fillStyle(0x888888, 1);
    g.fillRect(x + 18, y + 128, 8, 8);
    g.fillRect(x + 134, y + 128, 8, 8);
  }

  _onEquipmentClick(cp) {
    if (cp.eligible === false) {
      this.gs.hud.showAlert("⚠️ " + cp.refrigerant + " is NOT eligible under the protocol!");
      this.gs.score.netCO2eReduction -= 50;
      return;
    }

    this._showCollectionLogForm(cp, (formData) => {
      const missing = this._validateCollectionLog(formData, cp);

      if (missing.length > 0) {
        this.gs.hud.showAlert("Missing: " + missing.join(", ") + ". Provenance gap — mass EXCLUDED!");
        this.gs.flags.provenanceGapPenalty = true;
        this.collected.add(cp.id);
        this.gs.containers.push({
          fieldContainerId: "FC-" + Date.now(),
          origin: cp,
          massKg: cp.massKg,
          refrigerant: cp.refrigerant,
          collectionLog: formData,
          provenanceOk: false,
        });
      } else {
        this.gs.containers.push({
          fieldContainerId: "FC-" + Date.now(),
          origin: cp,
          massKg: cp.massKg,
          refrigerant: cp.refrigerant,
          collectionLog: formData,
          provenanceOk: true,
        });
        this.collected.add(cp.id);
        this.gs.hud.showSuccess("✅ Container logged! Chain of custody established.");
      }

      this._markCollected(cp);
      this.progressText.setText("Collected: " + this.collected.size + " / 3");
      if (this.collected.size >= 3) {
        this.nextBtnGroup.setVisible(true);
      }
    });
  }

  _markCollected(cp) {
    cp._checkmark.setVisible(true);
    cp._highlight.setVisible(false);

    // Green tint overlay on collected item
    const overlay = this.add.graphics();
    overlay.fillStyle(0x3fb950, 0.12);
    overlay.fillRoundedRect(cp.position.x - 4, cp.position.y - 4, cp.hitW + 8, cp.hitH + 8, 6);
    overlay.lineStyle(2, 0x3fb950, 0.6);
    overlay.strokeRoundedRect(cp.position.x - 4, cp.position.y - 4, cp.hitW + 8, cp.hitH + 8, 6);
  }

  _showCollectionLogForm(cp, callback) {
    const today = new Date().toISOString().split("T")[0];
    const serialField = cp.requiresSerialNumber
      ? `<label>Serial Number <span style="color:#f85149">(required >10 kg)</span>:<br>
           <input type="text" name="serialNumber" value="SN-${cp.id}" style="width:100%;box-sizing:border-box;${INPUT_CSS}">
         </label>`
      : "";

    const html = `
      <div style="
        position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
        background:#161b22; border:2px solid #30363d; border-radius:8px;
        padding:24px; width:430px; color:#e6edf3; font-family:monospace; z-index:200;
        box-shadow:0 8px 32px rgba(0,0,0,0.7);
      ">
        <h3 style="margin:0 0 6px; color:#79c0ff; font-size:15px;">
          Collection Log — ${cp.id}
        </h3>
        <p style="margin:0 0 14px; font-size:11px; color:#8b949e;">
          ${cp.equipmentType} | ${cp.refrigerant} | ${cp.massKg} kg | ${cp.status}
        </p>
        <form id="collectionForm" style="display:flex;flex-direction:column;gap:8px;">
          <label>Facility Address:<br>
            <input type="text" name="facilityAddress" value="123 Industrial Ave" style="width:100%;box-sizing:border-box;${INPUT_CSS}">
          </label>
          <label>Date:<br>
            <input type="date" name="date" value="${today}" style="width:100%;box-sizing:border-box;${INPUT_CSS}">
          </label>
          <label>Container ID:<br>
            <input type="text" name="fieldContainerId" value="CONT-${cp.id}-${Date.now().toString().slice(-4)}" style="width:100%;box-sizing:border-box;${INPUT_CSS}">
          </label>
          <label>Equipment Type:<br>
            <input type="text" name="equipmentType" value="${cp.equipmentType}" style="width:100%;box-sizing:border-box;${INPUT_CSS}">
          </label>
          <label>Approx Quantity (kg):<br>
            <input type="number" name="approxQty" value="${cp.massKg}" step="0.1" style="width:100%;box-sizing:border-box;${INPUT_CSS}">
          </label>
          <label>Equipment Status:<br>
            <input type="text" name="equipmentStatus" value="${cp.status}" style="width:100%;box-sizing:border-box;${INPUT_CSS}">
          </label>
          <label>Attestation Signature:<br>
            <input type="text" name="attestation" value="Tech-A" style="width:100%;box-sizing:border-box;${INPUT_CSS}">
          </label>
          ${serialField}
          <button type="submit" style="
            margin-top:6px; background:#238636; color:#fff; border:none; border-radius:4px;
            padding:10px; font-family:monospace; font-size:14px; cursor:pointer;
          ">Submit Collection Log</button>
        </form>
      </div>`;

    this.gs.hud.showPanel(html);

    setTimeout(() => {
      const form = document.getElementById("collectionForm");
      if (!form) return;
      form.addEventListener("submit", (ev) => {
        ev.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());
        this.gs.hud.clearOverlay();
        callback(data);
      });
    }, 0);
  }

  _validateCollectionLog(form, cp) {
    const missing = [];
    if (!form.facilityAddress) missing.push("Facility Address");
    if (!form.date) missing.push("Date");
    if (!form.fieldContainerId) missing.push("Container ID");
    if (!form.equipmentType) missing.push("Equipment Type");
    if (!form.approxQty) missing.push("Approx Quantity");
    if (!form.equipmentStatus) missing.push("Equipment Status");
    if (!form.attestation) missing.push("Attestation Signature");
    if (cp.massKg > 10 && !form.serialNumber) missing.push("Serial Number (required >10 kg)");
    return missing;
  }

  _advance() {
    this.gs.hud.clearOverlay();
    this.scene.start("TransitionScene", { nextKey: "AGGREGATION" });
  }

  generateScene() {
    this.collectionPoints = [
      {
        id: "CP-001", equipmentType: "Residential Split AC", refrigerant: "HCFC-22",
        massKg: 2.3, status: "end-of-life", position: { x: 40, y: 90 },
      },
      {
        id: "CP-002", equipmentType: "Industrial Chiller", refrigerant: "CFC-12",
        massKg: 45.0, status: "end-of-life", position: { x: 340, y: 80 },
        requiresSerialNumber: true,
      },
      {
        id: "CP-003", equipmentType: "Car AC", refrigerant: "HFC-134a",
        massKg: 0.7, status: "servicing", position: { x: 40, y: 310 },
      },
      {
        id: "CP-004", equipmentType: "CO₂ Heat Pump", refrigerant: "CO2-R744",
        massKg: 3.0, status: "end-of-life", position: { x: 620, y: 90 },
        eligible: false,
      },
    ];
  }
}

const INPUT_CSS = `
  background:#0d1117; color:#e6edf3; border:1px solid #30363d;
  border-radius:4px; padding:5px 8px; font-family:monospace; font-size:13px;
  margin-top:3px;
`.replace(/\n\s*/g, "");
