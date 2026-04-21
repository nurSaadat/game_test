export class CollectionScene extends Phaser.Scene {
  constructor() {
    super({ key: "CollectionScene" });
  }

  create() {
    this.gs = this.registry.get("gameState");
    this.collected = new Set();
    this.generateScene();

    this._drawBackground();

    this.collectionPoints.forEach(cp => this._createEquipment(cp));

    // HUD bar at bottom
    const hud = this.add.graphics().setDepth(20);
    hud.fillStyle(0x0d1117, 0.92);
    hud.fillRect(0, 555, 900, 45);
    hud.lineStyle(1, 0x30363d, 1);
    hud.lineBetween(0, 555, 900, 555);

    this.add.text(20, 18, "STAGE 1 — FIELD COLLECTION", {
      fontFamily: "monospace", fontSize: "18px", color: "#79c0ff", fontStyle: "bold",
    }).setDepth(20).setAlpha(0.95);
    this.add.text(20, 40, "Click equipment to collect refrigerant.", {
      fontFamily: "monospace", fontSize: "12px", color: "#c8d1da",
    }).setDepth(20).setAlpha(0.9);

    this.progressText = this.add.text(20, 572, "Collected: 0 / 3", {
      fontFamily: "monospace", fontSize: "13px", color: "#8b949e",
    }).setDepth(21);

    this.nextBtnGroup = this.add.container(0, 0).setDepth(22);
    const nbg = this.add.graphics();
    nbg.fillStyle(0x238636, 1);
    nbg.fillRoundedRect(620, 562, 250, 36, 6);
    const nbt = this.add.text(745, 580, "NEXT STAGE →", {
      fontFamily: "monospace", fontSize: "15px", color: "#ffffff", fontStyle: "bold",
    }).setOrigin(0.5);
    const nbz = this.add.zone(745, 580, 250, 36).setInteractive({ useHandCursor: true });
    nbz.on("pointerdown", () => this._advance());
    this.nextBtnGroup.add([nbg, nbt, nbz]);
    this.nextBtnGroup.setVisible(false);
  }

  // ═══════════════════════ HOUSE CROSS-SECTION BACKGROUND ═══════════════════════

  _drawBackground() {
    const g = this.add.graphics();

    // ── Sky ──
    g.fillStyle(0x0b1628, 1);
    g.fillRect(0, 0, 900, 600);
    // Gradient sky bands
    g.fillStyle(0x0f1e38, 1);
    g.fillRect(0, 0, 900, 40);
    g.fillStyle(0x0d1a30, 1);
    g.fillRect(0, 40, 900, 50);

    // Stars
    g.fillStyle(0xffffff, 0.4);
    const starPositions = [[50,25],[150,45],[280,18],[420,35],[560,12],[680,42],[800,28],[370,55],[95,60],[750,55],[620,48],[200,10]];
    starPositions.forEach(([sx, sy]) => g.fillCircle(sx, sy, 1));
    g.fillStyle(0xffffff, 0.7);
    g.fillCircle(820, 20, 1.5);
    g.fillCircle(130, 30, 1.5);

    // Moon
    g.fillStyle(0xe8e0d0, 0.25);
    g.fillCircle(830, 55, 22);
    g.fillStyle(0xe8e0d0, 0.15);
    g.fillCircle(830, 55, 28);

    // ── Ground ──
    // Grass
    g.fillStyle(0x1a3a20, 1);
    g.fillRect(0, 478, 900, 14);
    g.fillStyle(0x163018, 1);
    g.fillRect(0, 492, 900, 108);
    // Grass tufts
    g.fillStyle(0x24502a, 1);
    for (let tx = 0; tx < 900; tx += 18) {
      const th = 3 + Math.sin(tx * 0.7) * 2;
      g.fillRect(tx, 478 - th, 3, th);
    }
    // Earth layer
    g.fillStyle(0x2a1a0e, 1);
    g.fillRect(0, 530, 900, 70);
    g.lineStyle(1, 0x3a2a1a, 0.3);
    g.lineBetween(0, 530, 900, 530);

    // ── Driveway / parking (left) ──
    g.fillStyle(0x3a3a3a, 1);
    g.fillRect(0, 478, 205, 122);
    // Concrete lines
    g.lineStyle(1, 0x484848, 0.5);
    g.lineBetween(0, 510, 205, 510);
    g.lineBetween(0, 545, 205, 545);
    g.lineBetween(100, 478, 100, 600);
    // Curb edge
    g.fillStyle(0x555555, 1);
    g.fillRect(200, 478, 8, 122);

    // ── House foundation ──
    g.fillStyle(0x555555, 1);
    g.fillRect(205, 468, 410, 16);
    g.fillStyle(0x666666, 1);
    g.fillRect(205, 468, 410, 4);

    // ── House exterior right wall (brick) ──
    g.fillStyle(0x6b3a2a, 1);
    g.fillRect(590, 155, 25, 313);
    // Brick pattern
    g.lineStyle(1, 0x5a2e20, 0.6);
    for (let by = 155; by < 468; by += 12) {
      g.lineBetween(590, by, 615, by);
      const off = (Math.floor((by - 155) / 12) % 2) * 10;
      g.lineBetween(598 + off, by, 598 + off, by + 12);
    }

    // ── House interior (cutaway view) ──
    // Back wall (interior paint)
    g.fillStyle(0x3d4a5c, 1);
    g.fillRect(208, 155, 382, 313);

    // Wainscoting / lower wall panel
    g.fillStyle(0x354358, 1);
    g.fillRect(208, 370, 382, 98);
    g.lineStyle(1, 0x4a5a70, 0.5);
    g.lineBetween(208, 370, 590, 370);

    // Baseboard
    g.fillStyle(0x2a3444, 1);
    g.fillRect(208, 458, 382, 10);

    // Interior floor (hardwood)
    g.fillStyle(0x5a3e28, 1);
    g.fillRect(208, 460, 382, 8);
    // Floorboard lines
    g.lineStyle(1, 0x4a3220, 0.6);
    for (let fx = 208; fx < 590; fx += 35) {
      g.lineBetween(fx, 460, fx, 468);
    }

    // ── Interior details ──

    // Window on back wall
    g.fillStyle(0x1a3050, 1);
    g.fillRect(420, 200, 80, 90);
    // Window panes
    g.fillStyle(0x1e4070, 0.7);
    g.fillRect(424, 204, 34, 40);
    g.fillRect(462, 204, 34, 40);
    g.fillRect(424, 248, 34, 38);
    g.fillRect(462, 248, 34, 38);
    // Window frame
    g.lineStyle(2, 0x8899aa, 1);
    g.strokeRect(420, 200, 80, 90);
    g.lineBetween(460, 200, 460, 290);
    g.lineBetween(420, 245, 500, 245);
    // Curtains
    g.fillStyle(0x6a4050, 0.5);
    g.fillRect(410, 195, 14, 100);
    g.fillRect(496, 195, 14, 100);
    // Curtain rod
    g.lineStyle(1, 0x999999, 0.7);
    g.lineBetween(408, 195, 512, 195);

    // Sofa/couch outline
    g.fillStyle(0x4a3848, 1);
    g.fillRoundedRect(380, 395, 130, 55, 6);
    g.fillStyle(0x5a4858, 1);
    g.fillRoundedRect(383, 380, 124, 20, 4);
    // Cushion lines
    g.lineStyle(1, 0x3a2838, 0.6);
    g.lineBetween(420, 400, 420, 445);
    g.lineBetween(465, 400, 465, 445);
    // Sofa arm
    g.fillStyle(0x4a3848, 1);
    g.fillRoundedRect(375, 388, 12, 62, 3);
    g.fillRoundedRect(507, 388, 12, 62, 3);

    // Small side table
    g.fillStyle(0x5a4430, 1);
    g.fillRect(530, 425, 30, 3);
    g.fillRect(535, 428, 4, 25);
    g.fillRect(551, 428, 4, 25);
    // Lamp on table
    g.fillStyle(0x888866, 1);
    g.fillRect(541, 417, 6, 8);
    g.fillStyle(0xffa726, 0.3);
    g.fillTriangle(533, 417, 555, 417, 544, 402);

    // Picture frame on wall
    g.lineStyle(2, 0x8a7a60, 1);
    g.strokeRect(260, 210, 50, 40);
    g.fillStyle(0x2a3a4a, 1);
    g.fillRect(263, 213, 44, 34);
    // Mountain in picture
    g.fillStyle(0x3a5a4a, 0.5);
    g.fillTriangle(265, 245, 285, 220, 305, 245);

    // Rug on floor
    g.fillStyle(0x6a3030, 0.3);
    g.fillRoundedRect(340, 450, 180, 10, 2);

    // ── Cross-section cut edge (left wall) ──
    // Exposed wall layers
    g.fillStyle(0x887766, 1);
    g.fillRect(205, 155, 6, 313);
    // Insulation layer
    g.fillStyle(0xccaa55, 0.3);
    g.fillRect(206, 155, 3, 313);
    // Brick exterior layer
    g.fillStyle(0x6b3a2a, 1);
    g.fillRect(205, 155, 3, 313);

    // ── Roof ──
    // Roof shingles (triangle)
    g.fillStyle(0x3a2520, 1);
    g.fillTriangle(185, 155, 615 + 15, 155, 405, 72);

    // Roof overhang shadow
    g.fillStyle(0x000000, 0.15);
    g.fillTriangle(185, 155, 630, 155, 630, 165);
    g.fillTriangle(185, 155, 185, 165, 630, 165);

    // Shingle lines
    g.lineStyle(1, 0x2a1a15, 0.5);
    for (let ry = 90; ry < 155; ry += 10) {
      const frac = (ry - 72) / (155 - 72);
      const lx = 405 - frac * (405 - 185);
      const rx = 405 + frac * (630 - 405);
      g.lineBetween(lx, ry, rx, ry);
    }

    // Roof ridge line
    g.lineStyle(2, 0x4a3530, 1);
    g.lineBetween(395, 74, 415, 74);

    // Eaves detail
    g.fillStyle(0x4a3a30, 1);
    g.fillRect(185, 153, 445, 5);

    // Chimney
    g.fillStyle(0x6b3a2a, 1);
    g.fillRect(530, 60, 30, 95);
    g.fillStyle(0x7a4a3a, 1);
    g.fillRect(527, 55, 36, 8);
    // Chimney brick lines
    g.lineStyle(1, 0x5a2e20, 0.4);
    for (let cy = 63; cy < 155; cy += 10) {
      g.lineBetween(530, cy, 560, cy);
    }

    // Exposed attic (cross-section of roof)
    // Roof cut edge
    g.fillStyle(0x5a3a28, 1);
    g.fillRect(205, 155, 3, -2);
    // Attic interior visible through cut
    g.fillStyle(0x2a2018, 0.6);
    g.fillTriangle(208, 155, 405, 78, 590, 155);

    // Rafters visible in attic
    g.lineStyle(1, 0x5a4a30, 0.5);
    for (let ri = 0; ri < 6; ri++) {
      const frac = (ri + 1) / 7;
      const rx = 208 + frac * (590 - 208);
      const peakFrac = Math.abs(rx - 405) / (590 - 208) * 2;
      const ry = 78 + peakFrac * (155 - 78);
      g.lineBetween(rx, 155, rx, ry + 5);
    }

    // ── Exterior ground details (right side) ──
    // Concrete pads for equipment
    g.fillStyle(0x4a4a4a, 1);
    g.fillRoundedRect(618, 470, 140, 8, 2);
    g.fillRoundedRect(740, 470, 150, 8, 2);

    // Pipes going into wall from equipment area
    g.lineStyle(2, 0x718096, 0.6);
    g.lineBetween(615, 360, 615, 380);
    g.lineBetween(615, 380, 595, 380);

    // Small bush near house (right)
    g.fillStyle(0x1e4a22, 1);
    g.fillCircle(640, 472, 10);
    g.fillCircle(650, 468, 12);
    g.fillCircle(660, 473, 9);

    // Small bush near house (left of door area)
    g.fillStyle(0x1e4a22, 1);
    g.fillCircle(215, 473, 8);
    g.fillCircle(225, 470, 10);

    // ── Door on exterior right wall ──
    g.fillStyle(0x4a2a18, 1);
    g.fillRect(594, 380, 18, 88);
    g.fillStyle(0x5a3a28, 1);
    g.fillRect(596, 383, 14, 40);
    g.fillRect(596, 428, 14, 36);
    // Doorknob
    g.fillStyle(0xccaa44, 1);
    g.fillCircle(607, 430, 2);

    // "CROSS-SECTION" label
    this.add.text(207, 142, "▼ CROSS-SECTION VIEW", {
      fontFamily: "monospace", fontSize: "8px", color: "#8b949e",
    }).setAlpha(0.6);
  }

  // ═══════════════════════ EQUIPMENT CREATION ═══════════════════════

  _createEquipment(cp) {
    const g = this.add.graphics().setDepth(5);
    cp._cardGfx = g;

    const drawFn = {
      "Car AC": () => this._drawCar(g, cp),
      "Industrial Chiller": () => this._drawChiller(g, cp),
      "Residential Split AC": () => this._drawSplitAC(g, cp),
      "CO₂ Heat Pump": () => this._drawHeatPump(g, cp),
    };
    (drawFn[cp.equipmentType] || (() => {}))();

    // Label
    const labelBg = this.add.graphics().setDepth(8);
    const labelX = cp.position.x + cp.hitW / 2;
    const labelY = cp.position.y + cp.hitH + 4;
    labelBg.fillStyle(0x0d1117, 0.75);
    labelBg.fillRoundedRect(labelX - 70, labelY - 2, 140, 34, 3);

    cp._nameText = this.add.text(labelX, labelY + 2, cp.equipmentType, {
      fontFamily: "monospace", fontSize: "10px", color: "#e6edf3", fontStyle: "bold",
    }).setOrigin(0.5, 0).setDepth(9);

    cp._infoText = this.add.text(labelX, labelY + 16, cp.refrigerant + " | " + cp.massKg + " kg", {
      fontFamily: "monospace", fontSize: "9px", color: "#8b949e",
    }).setOrigin(0.5, 0).setDepth(9);

    if (cp.eligible === false) {
      cp._ineligibleBadge = this.add.text(labelX, labelY + 30, "⊘ INELIGIBLE", {
        fontFamily: "monospace", fontSize: "9px", color: "#f85149", fontStyle: "bold",
      }).setOrigin(0.5, 0).setDepth(9);
    }

    cp._checkmark = this.add.text(cp.position.x + cp.hitW - 2, cp.position.y + 2, "✓", {
      fontFamily: "monospace", fontSize: "26px", color: "#3fb950", fontStyle: "bold",
    }).setOrigin(1, 0).setVisible(false).setDepth(12);

    // Hover highlight
    const eligible = cp.eligible !== false;
    cp._highlight = this.add.graphics().setDepth(11);
    cp._highlight.lineStyle(2, eligible ? 0x3fb950 : 0xf85149, 0.8);
    cp._highlight.strokeRoundedRect(cp.position.x - 5, cp.position.y - 5, cp.hitW + 10, cp.hitH + 10, 6);
    cp._highlight.fillStyle(eligible ? 0x3fb950 : 0xf85149, 0.06);
    cp._highlight.fillRoundedRect(cp.position.x - 5, cp.position.y - 5, cp.hitW + 10, cp.hitH + 10, 6);
    cp._highlight.setVisible(false);

    const zone = this.add.zone(cp.position.x + cp.hitW / 2, cp.position.y + cp.hitH / 2, cp.hitW, cp.hitH)
      .setInteractive({ useHandCursor: true }).setDepth(15);

    zone.on("pointerover", () => {
      if (!this.collected.has(cp.id)) cp._highlight.setVisible(true);
    });
    zone.on("pointerout", () => cp._highlight.setVisible(false));
    zone.on("pointerdown", () => {
      if (!this.collected.has(cp.id)) this._onEquipmentClick(cp);
    });
  }

  // ────────────── CAR on driveway ──────────────
  _drawCar(g, cp) {
    const x = cp.position.x, y = cp.position.y;
    cp.hitW = 180;
    cp.hitH = 95;

    // Shadow
    g.fillStyle(0x000000, 0.3);
    g.fillEllipse(x + 90, y + 93, 170, 12);

    // Body lower
    g.fillStyle(0x3a6080, 1);
    g.fillRoundedRect(x + 8, y + 45, 164, 40, 4);
    // Hood
    g.fillStyle(0x3a6080, 1);
    g.fillTriangle(x + 8, y + 45, x + 8, y + 85, x, y + 85);
    // Trunk
    g.fillTriangle(x + 172, y + 45, x + 172, y + 85, x + 180, y + 85);

    // Cabin
    g.fillStyle(0x2d4f6a, 1);
    g.fillRoundedRect(x + 42, y + 18, 96, 30, 6);

    // Windshield
    g.fillStyle(0x79c0ff, 0.55);
    g.fillTriangle(x + 42, y + 46, x + 48, y + 22, x + 70, y + 22);
    g.fillRect(x + 48, y + 22, 22, 24);
    // Rear window
    g.fillStyle(0x79c0ff, 0.45);
    g.fillTriangle(x + 138, y + 46, x + 132, y + 22, x + 114, y + 22);
    g.fillRect(x + 114, y + 22, 18, 24);
    // Side window
    g.fillStyle(0x79c0ff, 0.35);
    g.fillRect(x + 73, y + 24, 38, 20);

    // Door line
    g.lineStyle(1, 0x2a4560, 1);
    g.lineBetween(x + 90, y + 45, x + 90, y + 82);

    // Headlights
    g.fillStyle(0xfff176, 0.9);
    g.fillCircle(x + 12, y + 56, 4);
    g.fillCircle(x + 12, y + 68, 4);
    // Taillights
    g.fillStyle(0xf85149, 0.9);
    g.fillCircle(x + 168, y + 56, 3);
    g.fillCircle(x + 168, y + 68, 3);

    // Wheels
    g.fillStyle(0x111111, 1);
    g.fillCircle(x + 40, y + 87, 11);
    g.fillCircle(x + 140, y + 87, 11);
    g.fillStyle(0x333333, 1);
    g.fillCircle(x + 40, y + 87, 7);
    g.fillCircle(x + 140, y + 87, 7);
    g.fillStyle(0x555555, 1);
    g.fillCircle(x + 40, y + 87, 3);
    g.fillCircle(x + 140, y + 87, 3);

    // Bumper
    g.fillStyle(0x555555, 1);
    g.fillRect(x + 2, y + 80, 8, 6);
    g.fillRect(x + 170, y + 80, 8, 6);

    // License plate
    g.fillStyle(0xeeeeee, 1);
    g.fillRect(x + 72, y + 78, 36, 8);
    this.add.text(x + 90, y + 82, "AC-134", {
      fontFamily: "monospace", fontSize: "5px", color: "#222222", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(6);
  }

  // ────────────── CHILLER next to exterior wall ──────────────
  _drawChiller(g, cp) {
    const x = cp.position.x, y = cp.position.y;
    cp.hitW = 145;
    cp.hitH = 130;

    // Shadow
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(x + 72, y + 128, 140, 10);

    // Main body
    g.fillStyle(0x4a5568, 1);
    g.fillRoundedRect(x + 5, y + 15, 135, 105, 4);

    // Panel dividers
    g.lineStyle(1, 0x5a6578, 1);
    g.lineBetween(x + 50, y + 15, x + 50, y + 120);
    g.lineBetween(x + 95, y + 15, x + 95, y + 120);

    // Left panel vents
    g.lineStyle(1, 0x3a4558, 1);
    for (let i = 0; i < 5; i++) {
      g.lineBetween(x + 12, y + 30 + i * 14, x + 44, y + 30 + i * 14);
    }

    // Center control panel
    g.fillStyle(0x1a2332, 1);
    g.fillRoundedRect(x + 56, y + 28, 34, 42, 3);
    g.fillStyle(0x3fb950, 1);
    g.fillCircle(x + 66, y + 38, 3);
    g.fillStyle(0xffa726, 1);
    g.fillCircle(x + 80, y + 38, 3);
    // Display
    g.fillStyle(0x0d1117, 1);
    g.fillRect(x + 58, y + 48, 30, 14);
    this.add.text(x + 73, y + 55, "12°C", {
      fontFamily: "monospace", fontSize: "7px", color: "#3fb950",
    }).setOrigin(0.5).setDepth(6);

    // Right panel pipes
    g.lineStyle(3, 0x29B6F6, 1);
    g.lineBetween(x + 105, y + 35, x + 105, y + 65);
    g.lineBetween(x + 105, y + 35, x + 130, y + 35);
    g.lineStyle(3, 0xf85149, 1);
    g.lineBetween(x + 120, y + 35, x + 120, y + 65);
    g.lineBetween(x + 120, y + 35, x + 130, y + 50);
    g.fillStyle(0x718096, 1);
    g.fillCircle(x + 130, y + 35, 3);
    g.fillCircle(x + 130, y + 50, 3);

    // Compressor on top
    g.fillStyle(0x5a6578, 1);
    g.fillRoundedRect(x + 20, y + 4, 50, 14, 3);
    g.lineStyle(1, 0x6a7588, 1);
    g.strokeRoundedRect(x + 20, y + 4, 50, 14, 3);

    // Warning label
    g.fillStyle(0xffa726, 0.8);
    g.fillRect(x + 56, y + 82, 34, 14);
    this.add.text(x + 73, y + 89, "CFC-12", {
      fontFamily: "monospace", fontSize: "7px", color: "#111111", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(6);

    // Legs
    g.fillStyle(0x3a4558, 1);
    g.fillRect(x + 14, y + 118, 8, 8);
    g.fillRect(x + 123, y + 118, 8, 8);

    // Pipe connecting to house wall
    g.lineStyle(2, 0x718096, 0.7);
    g.lineBetween(x, y + 50, x - 15, y + 50);
    g.lineBetween(x, y + 65, x - 15, y + 65);
  }

  // ────────────── SPLIT AC inside house ──────────────
  _drawSplitAC(g, cp) {
    const x = cp.position.x, y = cp.position.y;
    cp.hitW = 160;
    cp.hitH = 85;

    // Wall bracket
    g.fillStyle(0x555555, 1);
    g.fillRect(x + 25, y + 10, 5, 10);
    g.fillRect(x + 130, y + 10, 5, 10);

    // Main indoor unit
    g.fillStyle(0xe8e8e8, 1);
    g.fillRoundedRect(x + 10, y + 18, 140, 42, 7);
    // Top highlight
    g.fillStyle(0xf5f5f5, 1);
    g.fillRoundedRect(x + 10, y + 18, 140, 7, { tl: 7, tr: 7, bl: 0, br: 0 });

    // Display
    g.fillStyle(0x1a1a1a, 1);
    g.fillRoundedRect(x + 115, y + 26, 26, 12, 2);
    this.add.text(x + 128, y + 32, "22°", {
      fontFamily: "monospace", fontSize: "6px", color: "#3fb950",
    }).setOrigin(0.5).setDepth(6);

    // LED
    g.fillStyle(0x3fb950, 1);
    g.fillCircle(x + 25, y + 34, 2);

    // Louvers
    g.fillStyle(0xd0d0d0, 1);
    g.fillRoundedRect(x + 15, y + 50, 130, 12, { tl: 0, tr: 0, bl: 5, br: 5 });
    g.lineStyle(1, 0xbbbbbb, 1);
    for (let i = 0; i < 6; i++) {
      g.lineBetween(x + 18, y + 51 + i * 2, x + 142, y + 51 + i * 2);
    }

    // Air flow
    g.lineStyle(1, 0x79c0ff, 0.25);
    for (let i = 0; i < 5; i++) {
      const sx = x + 28 + i * 24;
      g.lineBetween(sx, y + 64, sx - 6, y + 76);
      g.lineBetween(sx - 6, y + 76, sx, y + 85);
    }

    // Brand
    this.add.text(x + 80, y + 40, "COOL", {
      fontFamily: "monospace", fontSize: "7px", color: "#999999",
    }).setOrigin(0.5).setDepth(6);

    // Pipe going into wall (to outdoor unit)
    g.lineStyle(2, 0x718096, 0.5);
    g.lineBetween(x + 150, y + 35, x + 165, y + 35);
    g.lineBetween(x + 150, y + 48, x + 165, y + 48);
  }

  // ────────────── HEAT PUMP on exterior wall ──────────────
  _drawHeatPump(g, cp) {
    const x = cp.position.x, y = cp.position.y;
    cp.hitW = 120;
    cp.hitH = 120;

    // Shadow
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(x + 60, y + 118, 115, 10);

    // Main body
    g.fillStyle(0xb0b8c0, 1);
    g.fillRoundedRect(x + 8, y + 12, 104, 100, 4);

    // Fan area
    g.fillStyle(0x888888, 1);
    g.fillCircle(x + 60, y + 52, 30);
    g.fillStyle(0x1a2332, 1);
    g.fillCircle(x + 60, y + 52, 27);

    // Fan grille
    g.lineStyle(1, 0x555555, 0.5);
    for (let i = -25; i <= 25; i += 5) {
      const x1 = x + 60 + i;
      const halfLen = Math.sqrt(27 * 27 - i * i);
      if (halfLen > 0) g.lineBetween(x1, y + 52 - halfLen, x1, y + 52 + halfLen);
    }

    // Fan blades
    g.fillStyle(0x444444, 1);
    for (let a = 0; a < 4; a++) {
      const angle = (a * Math.PI) / 2 + 0.3;
      g.fillEllipse(x + 60 + Math.cos(angle) * 15, y + 52 + Math.sin(angle) * 15, 14, 5);
    }
    g.fillStyle(0x666666, 1);
    g.fillCircle(x + 60, y + 52, 4);

    // Side vents
    g.lineStyle(1, 0x999999, 0.7);
    for (let i = 0; i < 4; i++) {
      g.lineBetween(x + 12, y + 88 + i * 5, x + 44, y + 88 + i * 5);
      g.lineBetween(x + 76, y + 88 + i * 5, x + 108, y + 88 + i * 5);
    }

    // Pipes going into wall
    g.lineStyle(2, 0x718096, 0.8);
    g.lineBetween(x, y + 40, x - 12, y + 40);
    g.lineBetween(x - 12, y + 40, x - 12, y + 60);
    g.lineBetween(x, y + 55, x - 8, y + 55);
    g.lineBetween(x - 8, y + 55, x - 8, y + 60);
    g.fillStyle(0x888888, 1);
    g.fillCircle(x - 12, y + 60, 2);
    g.fillCircle(x - 8, y + 60, 2);

    // CO₂ label
    g.fillStyle(0xffa726, 0.8);
    g.fillRoundedRect(x + 28, y + 16, 30, 12, 2);
    this.add.text(x + 43, y + 22, "CO₂", {
      fontFamily: "monospace", fontSize: "7px", color: "#111111", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(6);

    // Legs
    g.fillStyle(0x888888, 1);
    g.fillRect(x + 14, y + 110, 7, 8);
    g.fillRect(x + 99, y + 110, 7, 8);
  }

  // ═══════════════════════ GAME LOGIC (unchanged) ═══════════════════════

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
          origin: cp, massKg: cp.massKg, refrigerant: cp.refrigerant,
          collectionLog: formData, provenanceOk: false,
        });
      } else {
        this.gs.containers.push({
          fieldContainerId: "FC-" + Date.now(),
          origin: cp, massKg: cp.massKg, refrigerant: cp.refrigerant,
          collectionLog: formData, provenanceOk: true,
        });
        this.collected.add(cp.id);
        this.gs.hud.showSuccess("✅ Container logged! Chain of custody established.");
      }

      this._markCollected(cp);
      this.progressText.setText("Collected: " + this.collected.size + " / 3");
      if (this.collected.size >= 3) this.nextBtnGroup.setVisible(true);
    });
  }

  _markCollected(cp) {
    cp._checkmark.setVisible(true);
    cp._highlight.setVisible(false);
    const overlay = this.add.graphics().setDepth(10);
    overlay.fillStyle(0x3fb950, 0.12);
    overlay.fillRoundedRect(cp.position.x - 5, cp.position.y - 5, cp.hitW + 10, cp.hitH + 10, 6);
    overlay.lineStyle(2, 0x3fb950, 0.6);
    overlay.strokeRoundedRect(cp.position.x - 5, cp.position.y - 5, cp.hitW + 10, cp.hitH + 10, 6);
  }

  _showCollectionLogForm(cp, callback) {
    const today = new Date().toISOString().split("T")[0];
    const serialField = cp.requiresSerialNumber
      ? `<label>Serial Number <span style="color:#f85149">(required >10 kg)</span>:<br>
           <input type="text" name="serialNumber" value="SN-${cp.id}" style="width:100%;box-sizing:border-box;${INPUT_CSS}">
         </label>` : "";

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
        massKg: 2.3, status: "end-of-life", position: { x: 270, y: 195 },
      },
      {
        id: "CP-002", equipmentType: "Industrial Chiller", refrigerant: "CFC-12",
        massKg: 45.0, status: "end-of-life", position: { x: 735, y: 330 },
        requiresSerialNumber: true,
      },
      {
        id: "CP-003", equipmentType: "Car AC", refrigerant: "HFC-134a",
        massKg: 0.7, status: "servicing", position: { x: 12, y: 370 },
      },
      {
        id: "CP-004", equipmentType: "CO₂ Heat Pump", refrigerant: "CO2-R744",
        massKg: 3.0, status: "end-of-life", position: { x: 625, y: 340 },
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
