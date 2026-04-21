// Stage 1: Field collection
// Based on Protocol Section 8.1.2 (Point of Origin) verification requirements

export class CollectionStage {
  constructor(gameState, canvas, ctx, hud, advanceStage) {
    this.state        = gameState;
    this.canvas       = canvas;
    this.ctx          = ctx;
    this.hud          = hud;
    this.advanceStage = advanceStage;

    this.collectionPoints = [];
    this.collected        = new Set(); // IDs of successfully collected CPs
    this._clickHandler    = null;
  }

  start() {
    this.generateScene();
    this._clickHandler = (e) => this._handleClick(e);
    this.canvas.addEventListener("click", this._clickHandler);
  }

  stop() {
    this.canvas.removeEventListener("click", this._clickHandler);
  }

  update(_dt) { /* purely event-driven */ }

  render(ctx) {
    // Background — dark factory floor
    ctx.fillStyle = "#1a2332";
    ctx.fillRect(0, 0, 900, 600);

    // Grid lines for depth
    ctx.strokeStyle = "#1e2940";
    ctx.lineWidth = 1;
    for (let x = 0; x < 900; x += 60) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 600); ctx.stroke();
    }
    for (let y = 0; y < 600; y += 60) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(900, y); ctx.stroke();
    }

    // Title
    ctx.fillStyle = "#79c0ff";
    ctx.font = "bold 20px monospace";
    ctx.textAlign = "left";
    ctx.fillText("STAGE 1 \u2014 FIELD COLLECTION", 20, 36);
    ctx.fillStyle = "#8b949e";
    ctx.font = "13px monospace";
    ctx.fillText("Click eligible equipment to collect. Avoid ineligible refrigerants.", 20, 58);

    // Collection points
    this.collectionPoints.forEach(cp => {
      const { x, y } = cp.position;
      const collected = this.collected.has(cp.id);
      const eligible  = cp.eligible !== false;

      // Card background
      ctx.fillStyle = collected ? "#172b1f"
                    : eligible  ? "#1b2b1e"
                                : "#2b1b1b";
      ctx.fillRect(x, y, 170, 110);

      // Card border
      ctx.strokeStyle = collected ? "#3fb950"
                      : eligible  ? "#28613a"
                                  : "#6b2323";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, 170, 110);

      // Equipment type
      ctx.fillStyle = collected ? "#7ee787" : "#e6edf3";
      ctx.font = "bold 12px monospace";
      ctx.textAlign = "left";
      ctx.fillText(cp.equipmentType, x + 9, y + 22);

      // Refrigerant & mass
      ctx.fillStyle = "#8b949e";
      ctx.font = "12px monospace";
      ctx.fillText(cp.refrigerant, x + 9, y + 42);
      ctx.fillText(cp.massKg + " kg", x + 9, y + 60);
      ctx.fillStyle = "#555d6b";
      ctx.font = "11px monospace";
      ctx.fillText(cp.status, x + 9, y + 76);
      ctx.fillText(cp.id, x + 9, y + 92);

      // Collected checkmark
      if (collected) {
        ctx.fillStyle = "#3fb950";
        ctx.font = "bold 32px monospace";
        ctx.textAlign = "right";
        ctx.fillText("\u2713", x + 162, y + 80);
        ctx.textAlign = "left";
      }

      // Ineligible badge
      if (!eligible) {
        ctx.fillStyle = "#f85149";
        ctx.font = "bold 10px monospace";
        ctx.fillText("INELIGIBLE", x + 9, y + 104);
      }
    });

    // NEXT STAGE button — only when all 3 eligible items are collected
    if (this.collected.size >= 3) {
      ctx.fillStyle = "#238636";
      ctx.beginPath();
      ctx.roundRect(325, 530, 250, 50, 6);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 17px monospace";
      ctx.textAlign = "center";
      ctx.fillText("NEXT STAGE \u2192", 450, 562);
      ctx.textAlign = "left";
    }

    // Progress
    ctx.fillStyle = "#8b949e";
    ctx.font = "13px monospace";
    ctx.textAlign = "left";
    ctx.fillText("Collected: " + this.collected.size + " / 3", 20, 590);
  }

  _handleClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const mx   = e.clientX - rect.left;
    const my   = e.clientY - rect.top;

    // NEXT STAGE button
    if (this.collected.size >= 3 && mx >= 325 && mx <= 575 && my >= 530 && my <= 580) {
      this.advanceStage();
      return;
    }

    // Collection point boxes (AABB)
    for (const cp of this.collectionPoints) {
      const { x, y } = cp.position;
      if (mx >= x && mx <= x + 170 && my >= y && my <= y + 110) {
        if (!this.collected.has(cp.id)) {
          this.onEquipmentClick(cp);
        }
        return;
      }
    }
  }

  onEquipmentClick(cp) {
    if (cp.eligible === false) {
      this.hud.showAlert("\u26a0\ufe0f " + cp.refrigerant + " is NOT eligible under the protocol!");
      this.state.score.netCO2eReduction -= 50;
      return;
    }

    this.showCollectionLogForm(cp, (formData) => {
      const missing = this.validateCollectionLog(formData, cp);

      if (missing.length > 0) {
        this.hud.showAlert("Missing: " + missing.join(", ") + ". Provenance gap \u2014 mass EXCLUDED!");
        this.state.flags.provenanceGapPenalty = true;
        // Still mark collected so the stage can progress
        this.collected.add(cp.id);
        this.state.containers.push({
          fieldContainerId: "FC-" + Date.now(),
          origin:           cp,
          massKg:           cp.massKg,
          refrigerant:      cp.refrigerant,
          collectionLog:    formData,
          provenanceOk:     false,
        });
      } else {
        this.state.containers.push({
          fieldContainerId: "FC-" + Date.now(),
          origin:           cp,
          massKg:           cp.massKg,
          refrigerant:      cp.refrigerant,
          collectionLog:    formData,
          provenanceOk:     true,
        });
        this.collected.add(cp.id);
        this.hud.showSuccess("\u2705 Container logged! Chain of custody established.");
      }
    });
  }

  showCollectionLogForm(cp, callback) {
    const today       = new Date().toISOString().split("T")[0];
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
          Collection Log \u2014 ${cp.id}
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

    this.hud.showPanel(html);

    setTimeout(() => {
      const form = document.getElementById("collectionForm");
      if (!form) return;
      form.addEventListener("submit", (ev) => {
        ev.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());
        this.hud.clearOverlay();
        callback(data);
      });
    }, 0);
  }

  validateCollectionLog(form, cp) {
    const missing = [];
    if (!form.facilityAddress)  missing.push("Facility Address");
    if (!form.date)             missing.push("Date");
    if (!form.fieldContainerId) missing.push("Container ID");
    if (!form.equipmentType)    missing.push("Equipment Type");
    if (!form.approxQty)        missing.push("Approx Quantity");
    if (!form.equipmentStatus)  missing.push("Equipment Status");
    if (!form.attestation)      missing.push("Attestation Signature");
    if (cp.massKg > 10 && !form.serialNumber) missing.push("Serial Number (required >10 kg)");
    return missing;
  }

  generateScene() {
    this.collectionPoints = [
      {
        id: "CP-001",
        equipmentType: "Residential Split AC",
        refrigerant:   "HCFC-22",
        massKg:        2.3,
        status:        "end-of-life",
        position:      { x: 70, y: 155 },
      },
      {
        id: "CP-002",
        equipmentType:       "Industrial Chiller",
        refrigerant:         "CFC-12",
        massKg:              45.0,
        status:              "end-of-life",
        position:            { x: 360, y: 240 },
        requiresSerialNumber: true,
      },
      {
        id: "CP-003",
        equipmentType: "Car AC",
        refrigerant:   "HFC-134a",
        massKg:        0.7,
        status:        "servicing",
        position:      { x: 90, y: 370 },
      },
      {
        id: "CP-004",
        equipmentType: "CO\u2082 Heat Pump",
        refrigerant:   "CO2-R744",
        massKg:        3.0,
        status:        "end-of-life",
        position:      { x: 590, y: 185 },
        eligible:      false,
      },
    ];
  }
}

// Shared inline CSS for form inputs
const INPUT_CSS = `
  background:#0d1117; color:#e6edf3; border:1px solid #30363d;
  border-radius:4px; padding:5px 8px; font-family:monospace; font-size:13px;
  margin-top:3px;
`.replace(/\n\s*/g, "");
