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

    this.add.text(20, 18, "STAGE 1 — FIELD COLLECTION", {
      fontFamily: "monospace", fontSize: "20px", color: "#79c0ff", fontStyle: "bold",
    });
    this.add.text(20, 46, "Click eligible equipment to collect. Avoid ineligible refrigerants.", {
      fontFamily: "monospace", fontSize: "13px", color: "#8b949e",
    });

    this.cardGraphics = [];
    this.collectionPoints.forEach(cp => {
      this._createCard(cp);
    });

    this.progressText = this.add.text(20, 584, "Collected: 0 / 3", {
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

  _createCard(cp) {
    const { x, y } = cp.position;
    const eligible = cp.eligible !== false;

    const g = this.add.graphics();
    g.fillStyle(eligible ? 0x1b2b1e : 0x2b1b1b, 1);
    g.fillRect(x, y, 170, 110);
    g.lineStyle(2, eligible ? 0x28613a : 0x6b2323, 1);
    g.strokeRect(x, y, 170, 110);

    this.add.text(x + 9, y + 10, cp.equipmentType, {
      fontFamily: "monospace", fontSize: "12px", color: "#e6edf3", fontStyle: "bold",
    });
    this.add.text(x + 9, y + 30, cp.refrigerant, {
      fontFamily: "monospace", fontSize: "12px", color: "#8b949e",
    });
    this.add.text(x + 9, y + 48, cp.massKg + " kg", {
      fontFamily: "monospace", fontSize: "12px", color: "#8b949e",
    });
    this.add.text(x + 9, y + 64, cp.status, {
      fontFamily: "monospace", fontSize: "11px", color: "#555d6b",
    });
    this.add.text(x + 9, y + 80, cp.id, {
      fontFamily: "monospace", fontSize: "11px", color: "#555d6b",
    });

    if (!eligible) {
      this.add.text(x + 9, y + 96, "INELIGIBLE", {
        fontFamily: "monospace", fontSize: "10px", color: "#f85149", fontStyle: "bold",
      });
    }

    cp._checkmark = this.add.text(x + 148, y + 60, "✓", {
      fontFamily: "monospace", fontSize: "32px", color: "#3fb950", fontStyle: "bold",
    }).setOrigin(0.5).setVisible(false);

    cp._cardGfx = g;

    const zone = this.add.zone(x + 85, y + 55, 170, 110).setInteractive({ useHandCursor: true });
    zone.on("pointerdown", () => {
      if (!this.collected.has(cp.id)) {
        this._onEquipmentClick(cp);
      }
    });
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
    cp._cardGfx.clear();
    cp._cardGfx.fillStyle(0x172b1f, 1);
    cp._cardGfx.fillRect(cp.position.x, cp.position.y, 170, 110);
    cp._cardGfx.lineStyle(2, 0x3fb950, 1);
    cp._cardGfx.strokeRect(cp.position.x, cp.position.y, 170, 110);
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
        massKg: 2.3, status: "end-of-life", position: { x: 70, y: 155 },
      },
      {
        id: "CP-002", equipmentType: "Industrial Chiller", refrigerant: "CFC-12",
        massKg: 45.0, status: "end-of-life", position: { x: 360, y: 240 },
        requiresSerialNumber: true,
      },
      {
        id: "CP-003", equipmentType: "Car AC", refrigerant: "HFC-134a",
        massKg: 0.7, status: "servicing", position: { x: 90, y: 370 },
      },
      {
        id: "CP-004", equipmentType: "CO₂ Heat Pump", refrigerant: "CO2-R744",
        massKg: 3.0, status: "end-of-life", position: { x: 590, y: 185 },
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
