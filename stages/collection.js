export class CollectionScene extends Phaser.Scene {
  constructor() {
    super({ key: "CollectionScene" });
  }

  create() {
    this.gs = this.registry.get("gameState");
    this.collected = new Set();
    this.totalEligible = 8; // 3 at location 1, 2 at location 2, 3 at location 3
    this.canistersFilled = 0;
    this.canisterSlots = [];
    this.location = 1;

    this._generateLocations();
    this._showLocation(1);
  }

  _showLocation(loc) {
    this.location = loc;
    // Clear everything from previous location except persistent state
    this.children.removeAll(true);
    this.input.removeAllListeners();

    const points = loc === 1 ? this.loc1Points : loc === 2 ? this.loc2Points : this.loc3Points;
    this.activePoints = points;

    if (loc === 1) this._drawBackground1();
    else if (loc === 2) this._drawBackground2();
    else this._drawBackground3();

    points.forEach(cp => this._createEquipment(cp));

    // HUD bar
    const hud = this.add.graphics().setDepth(20);
    hud.fillStyle(0x0d1117, 0.92);
    hud.fillRect(0, 555, 900, 45);
    hud.lineStyle(1, 0x30363d, 1);
    hud.lineBetween(0, 555, 900, 555);

    const locLabel = loc === 1 ? "Location 1/3 — Residential Property" : loc === 2 ? "Location 2/3 — Suburban Home" : "Location 3/3 — Restaurant";
    this.add.text(20, 18, "STAGE 1 — FIELD COLLECTION", {
      fontFamily: "monospace", fontSize: "18px", color: "#79c0ff", fontStyle: "bold",
    }).setDepth(20).setAlpha(0.95);
    this.add.text(20, 40, locLabel, {
      fontFamily: "monospace", fontSize: "12px", color: "#c8d1da",
    }).setDepth(20).setAlpha(0.9);

    this._buildCanisterSlots();

    // Next button (location or stage)
    this.nextBtnGroup = this.add.container(0, 0).setDepth(22);
    const nbg = this.add.graphics();
    nbg.fillStyle(0x238636, 1);
    nbg.fillRoundedRect(620, 562, 250, 36, 6);
    const btnLabel = loc < 3 ? "NEXT LOCATION →" : "NEXT STAGE →";
    const nbt = this.add.text(745, 580, btnLabel, {
      fontFamily: "monospace", fontSize: "15px", color: "#ffffff", fontStyle: "bold",
    }).setOrigin(0.5);
    const nbz = this.add.zone(745, 580, 250, 36).setInteractive({ useHandCursor: true });
    nbz.on("pointerdown", () => {
      if (loc < 3) {
        this._showLocation(loc + 1);
      } else {
        this._advance();
      }
    });
    this.nextBtnGroup.add([nbg, nbt, nbz]);
    this.nextBtnGroup.setVisible(false);
  }

  _checkLocationComplete() {
    const eligibleHere = this.activePoints.filter(cp => cp.eligible !== false);
    const collectedHere = eligibleHere.filter(cp => this.collected.has(cp.id));
    if (collectedHere.length >= eligibleHere.length) {
      this.nextBtnGroup.setVisible(true);
    }
  }

  // ═══════════════════════ LOCATION 1 BACKGROUND — same house ═══════════════════════

  _drawBackground1() {
    const g = this.add.graphics();

    // Sky
    g.fillStyle(0x0b1628, 1);
    g.fillRect(0, 0, 900, 600);
    g.fillStyle(0x0f1e38, 1);
    g.fillRect(0, 0, 900, 40);
    g.fillStyle(0x0d1a30, 1);
    g.fillRect(0, 40, 900, 50);

    // Stars
    g.fillStyle(0xffffff, 0.4);
    [[50,25],[150,45],[280,18],[420,35],[560,12],[680,42],[800,28],[370,55],[95,60],[750,55],[620,48],[200,10]]
      .forEach(([sx, sy]) => g.fillCircle(sx, sy, 1));
    g.fillStyle(0xffffff, 0.7);
    g.fillCircle(820, 20, 1.5);
    g.fillCircle(130, 30, 1.5);
    // Moon
    g.fillStyle(0xe8e0d0, 0.25);
    g.fillCircle(830, 55, 22);
    g.fillStyle(0xe8e0d0, 0.15);
    g.fillCircle(830, 55, 28);

    // Ground
    g.fillStyle(0x1a3a20, 1);
    g.fillRect(0, 478, 900, 14);
    g.fillStyle(0x163018, 1);
    g.fillRect(0, 492, 900, 108);
    g.fillStyle(0x24502a, 1);
    for (let tx = 0; tx < 900; tx += 18) {
      const th = 3 + Math.sin(tx * 0.7) * 2;
      g.fillRect(tx, 478 - th, 3, th);
    }
    g.fillStyle(0x2a1a0e, 1);
    g.fillRect(0, 530, 900, 70);
    g.lineStyle(1, 0x3a2a1a, 0.3);
    g.lineBetween(0, 530, 900, 530);

    // Driveway
    g.fillStyle(0x3a3a3a, 1);
    g.fillRect(0, 478, 205, 122);
    g.lineStyle(1, 0x484848, 0.5);
    g.lineBetween(0, 510, 205, 510);
    g.lineBetween(0, 545, 205, 545);
    g.lineBetween(100, 478, 100, 600);
    g.fillStyle(0x555555, 1);
    g.fillRect(200, 478, 8, 122);

    // Foundation
    g.fillStyle(0x555555, 1);
    g.fillRect(205, 468, 410, 16);
    g.fillStyle(0x666666, 1);
    g.fillRect(205, 468, 410, 4);

    // Exterior right wall (brick)
    g.fillStyle(0x6b3a2a, 1);
    g.fillRect(590, 155, 25, 313);
    g.lineStyle(1, 0x5a2e20, 0.6);
    for (let by = 155; by < 468; by += 12) {
      g.lineBetween(590, by, 615, by);
      const off = (Math.floor((by - 155) / 12) % 2) * 10;
      g.lineBetween(598 + off, by, 598 + off, by + 12);
    }

    // Interior
    g.fillStyle(0x3d4a5c, 1);
    g.fillRect(208, 155, 382, 313);
    g.fillStyle(0x354358, 1);
    g.fillRect(208, 370, 382, 98);
    g.lineStyle(1, 0x4a5a70, 0.5);
    g.lineBetween(208, 370, 590, 370);
    g.fillStyle(0x2a3444, 1);
    g.fillRect(208, 458, 382, 10);
    g.fillStyle(0x5a3e28, 1);
    g.fillRect(208, 460, 382, 8);
    g.lineStyle(1, 0x4a3220, 0.6);
    for (let fx = 208; fx < 590; fx += 35) g.lineBetween(fx, 460, fx, 468);

    // Window
    g.fillStyle(0x1a3050, 1);
    g.fillRect(420, 200, 80, 90);
    g.fillStyle(0x1e4070, 0.7);
    g.fillRect(424, 204, 34, 40);
    g.fillRect(462, 204, 34, 40);
    g.fillRect(424, 248, 34, 38);
    g.fillRect(462, 248, 34, 38);
    g.lineStyle(2, 0x8899aa, 1);
    g.strokeRect(420, 200, 80, 90);
    g.lineBetween(460, 200, 460, 290);
    g.lineBetween(420, 245, 500, 245);
    g.fillStyle(0x6a4050, 0.5);
    g.fillRect(410, 195, 14, 100);
    g.fillRect(496, 195, 14, 100);
    g.lineStyle(1, 0x999999, 0.7);
    g.lineBetween(408, 195, 512, 195);

    // Sofa
    g.fillStyle(0x4a3848, 1);
    g.fillRoundedRect(380, 395, 130, 55, 6);
    g.fillStyle(0x5a4858, 1);
    g.fillRoundedRect(383, 380, 124, 20, 4);
    g.lineStyle(1, 0x3a2838, 0.6);
    g.lineBetween(420, 400, 420, 445);
    g.lineBetween(465, 400, 465, 445);
    g.fillStyle(0x4a3848, 1);
    g.fillRoundedRect(375, 388, 12, 62, 3);
    g.fillRoundedRect(507, 388, 12, 62, 3);

    // Side table + lamp
    g.fillStyle(0x5a4430, 1);
    g.fillRect(530, 425, 30, 3);
    g.fillRect(535, 428, 4, 25);
    g.fillRect(551, 428, 4, 25);
    g.fillStyle(0x888866, 1);
    g.fillRect(541, 417, 6, 8);
    g.fillStyle(0xffa726, 0.3);
    g.fillTriangle(533, 417, 555, 417, 544, 402);

    // Picture
    g.lineStyle(2, 0x8a7a60, 1);
    g.strokeRect(260, 210, 50, 40);
    g.fillStyle(0x2a3a4a, 1);
    g.fillRect(263, 213, 44, 34);
    g.fillStyle(0x3a5a4a, 0.5);
    g.fillTriangle(265, 245, 285, 220, 305, 245);

    // Rug
    g.fillStyle(0x6a3030, 0.3);
    g.fillRoundedRect(340, 450, 180, 10, 2);

    // Cross-section edge
    g.fillStyle(0x887766, 1);
    g.fillRect(205, 155, 6, 313);
    g.fillStyle(0xccaa55, 0.3);
    g.fillRect(206, 155, 3, 313);
    g.fillStyle(0x6b3a2a, 1);
    g.fillRect(205, 155, 3, 313);

    // Roof
    g.fillStyle(0x3a2520, 1);
    g.fillTriangle(185, 155, 630, 155, 405, 72);
    g.fillStyle(0x000000, 0.15);
    g.fillTriangle(185, 155, 630, 155, 630, 165);
    g.fillTriangle(185, 155, 185, 165, 630, 165);
    g.lineStyle(1, 0x2a1a15, 0.5);
    for (let ry = 90; ry < 155; ry += 10) {
      const frac = (ry - 72) / (155 - 72);
      g.lineBetween(405 - frac * (405 - 185), ry, 405 + frac * (630 - 405), ry);
    }
    g.lineStyle(2, 0x4a3530, 1);
    g.lineBetween(395, 74, 415, 74);
    g.fillStyle(0x4a3a30, 1);
    g.fillRect(185, 153, 445, 5);

    // Chimney
    g.fillStyle(0x6b3a2a, 1);
    g.fillRect(530, 60, 30, 95);
    g.fillStyle(0x7a4a3a, 1);
    g.fillRect(527, 55, 36, 8);
    g.lineStyle(1, 0x5a2e20, 0.4);
    for (let cy = 63; cy < 155; cy += 10) g.lineBetween(530, cy, 560, cy);

    // Attic
    g.fillStyle(0x2a2018, 0.6);
    g.fillTriangle(208, 155, 405, 78, 590, 155);
    g.lineStyle(1, 0x5a4a30, 0.5);
    for (let ri = 0; ri < 6; ri++) {
      const frac = (ri + 1) / 7;
      const rx = 208 + frac * (590 - 208);
      const peakFrac = Math.abs(rx - 405) / (590 - 208) * 2;
      g.lineBetween(rx, 155, rx, 78 + peakFrac * (155 - 78) + 5);
    }

    // Concrete pads
    g.fillStyle(0x4a4a4a, 1);
    g.fillRoundedRect(618, 470, 140, 8, 2);
    g.fillRoundedRect(740, 470, 150, 8, 2);
    g.lineStyle(2, 0x718096, 0.6);
    g.lineBetween(615, 360, 615, 380);
    g.lineBetween(615, 380, 595, 380);

    // Bushes
    g.fillStyle(0x1e4a22, 1);
    g.fillCircle(640, 472, 10);
    g.fillCircle(650, 468, 12);
    g.fillCircle(660, 473, 9);
    g.fillCircle(215, 473, 8);
    g.fillCircle(225, 470, 10);

    // Door
    g.fillStyle(0x4a2a18, 1);
    g.fillRect(594, 380, 18, 88);
    g.fillStyle(0x5a3a28, 1);
    g.fillRect(596, 383, 14, 40);
    g.fillRect(596, 428, 14, 36);
    g.fillStyle(0xccaa44, 1);
    g.fillCircle(607, 430, 2);

    this.add.text(207, 142, "▼ CROSS-SECTION VIEW", {
      fontFamily: "monospace", fontSize: "8px", color: "#8b949e",
    }).setAlpha(0.6);
  }

  // ═══════════════════════ LOCATION 2 BACKGROUND — suburban home ═══════════════════════

  _drawBackground2() {
    const g = this.add.graphics();

    // Sky — slightly lighter dusk
    g.fillStyle(0x0e1a30, 1);
    g.fillRect(0, 0, 900, 600);
    g.fillStyle(0x122240, 1);
    g.fillRect(0, 0, 900, 50);
    g.fillStyle(0x0f1e38, 1);
    g.fillRect(0, 50, 900, 40);

    // Stars
    g.fillStyle(0xffffff, 0.35);
    [[70,20],[200,38],[350,15],[500,30],[640,18],[780,35],[120,50],[440,48],[870,25],[300,58]]
      .forEach(([sx, sy]) => g.fillCircle(sx, sy, 1));
    g.fillStyle(0xffffff, 0.6);
    g.fillCircle(60, 40, 1.5);

    // Ground
    g.fillStyle(0x1a3a20, 1);
    g.fillRect(0, 478, 900, 14);
    g.fillStyle(0x163018, 1);
    g.fillRect(0, 492, 900, 108);
    g.fillStyle(0x24502a, 1);
    for (let tx = 0; tx < 900; tx += 15) {
      const th = 2 + Math.sin(tx * 0.8) * 2;
      g.fillRect(tx, 478 - th, 2, th);
    }
    g.fillStyle(0x2a1a0e, 1);
    g.fillRect(0, 530, 900, 70);

    // Pathway (left side)
    g.fillStyle(0x444444, 1);
    g.fillRect(0, 478, 120, 122);
    g.lineStyle(1, 0x505050, 0.4);
    for (let py = 478; py < 600; py += 25) g.lineBetween(0, py, 120, py);
    g.fillStyle(0x555555, 1);
    g.fillRect(116, 478, 6, 122);

    // Foundation
    g.fillStyle(0x555555, 1);
    g.fillRect(120, 468, 520, 16);
    g.fillStyle(0x666666, 1);
    g.fillRect(120, 468, 520, 4);

    // Exterior right wall
    g.fillStyle(0x5a6a4a, 1); // green siding
    g.fillRect(615, 155, 25, 313);
    g.lineStyle(1, 0x4a5a3a, 0.5);
    for (let by = 155; by < 468; by += 8) g.lineBetween(615, by, 640, by);

    // Interior back wall
    g.fillStyle(0x4a4050, 1); // slightly warmer purple-grey
    g.fillRect(123, 155, 492, 313);

    // Wainscoting
    g.fillStyle(0x3a3848, 1);
    g.fillRect(123, 370, 492, 98);
    g.lineStyle(1, 0x4a4858, 0.5);
    g.lineBetween(123, 370, 615, 370);

    // Baseboard
    g.fillStyle(0x2a2838, 1);
    g.fillRect(123, 458, 492, 10);

    // Floor — tile pattern
    g.fillStyle(0x5a5048, 1);
    g.fillRect(123, 460, 492, 8);
    g.lineStyle(1, 0x4a4038, 0.6);
    for (let fx = 123; fx < 615; fx += 28) g.lineBetween(fx, 460, fx, 468);

    // ── Kitchen area (left half of interior) ──

    // Kitchen counter
    g.fillStyle(0x5a5550, 1);
    g.fillRect(130, 410, 200, 8);
    g.fillStyle(0x4a4540, 1);
    g.fillRect(130, 418, 200, 40);
    // Cabinet doors
    g.lineStyle(1, 0x5a5550, 0.7);
    g.strokeRect(135, 422, 42, 32);
    g.strokeRect(182, 422, 42, 32);
    g.strokeRect(229, 422, 42, 32);
    g.strokeRect(276, 422, 42, 32);
    // Cabinet knobs
    g.fillStyle(0x888888, 1);
    [156, 203, 250, 297].forEach(kx => g.fillCircle(kx, 438, 2));

    // Upper cabinets
    g.fillStyle(0x4a4540, 1);
    g.fillRect(130, 200, 200, 60);
    g.lineStyle(1, 0x5a5550, 0.7);
    g.strokeRect(135, 204, 60, 52);
    g.strokeRect(200, 204, 60, 52);
    g.strokeRect(265, 204, 60, 52);

    // Kitchen sink area (on counter)
    g.fillStyle(0x3a3a3a, 1);
    g.fillRect(200, 404, 50, 8);
    g.fillStyle(0x888888, 1);
    g.fillRect(220, 396, 4, 10);

    // Kitchen window above counter
    g.fillStyle(0x1a3050, 1);
    g.fillRect(160, 270, 70, 55);
    g.fillStyle(0x1e4070, 0.6);
    g.fillRect(163, 273, 31, 49);
    g.fillRect(196, 273, 31, 49);
    g.lineStyle(2, 0x8899aa, 1);
    g.strokeRect(160, 270, 70, 55);
    g.lineBetween(195, 270, 195, 325);

    // ── Living area (right half) ──

    // Bookshelf
    g.fillStyle(0x4a3828, 1);
    g.fillRect(450, 200, 70, 160);
    g.lineStyle(1, 0x5a4838, 0.6);
    for (let sy = 230; sy < 360; sy += 30) g.lineBetween(454, sy, 516, sy);
    // Books
    const bookColors = [0x6a3030, 0x304a6a, 0x3a6a3a, 0x6a6a30, 0x5a3060];
    for (let row = 0; row < 4; row++) {
      for (let b = 0; b < 5; b++) {
        g.fillStyle(bookColors[(row + b) % 5], 0.7);
        g.fillRect(456 + b * 12, 205 + row * 30, 8, 24);
      }
    }

    // Armchair
    g.fillStyle(0x4a5838, 1);
    g.fillRoundedRect(530, 395, 70, 55, 6);
    g.fillStyle(0x5a6848, 1);
    g.fillRoundedRect(533, 383, 64, 16, 4);
    g.fillStyle(0x4a5838, 1);
    g.fillRoundedRect(525, 390, 12, 58, 3);
    g.fillRoundedRect(597, 390, 12, 58, 3);

    // Floor lamp
    g.fillStyle(0x555555, 1);
    g.fillRect(397, 350, 4, 105);
    g.fillStyle(0xffa726, 0.25);
    g.fillTriangle(385, 350, 415, 350, 399, 328);

    // Rug
    g.fillStyle(0x304a3a, 0.25);
    g.fillRoundedRect(380, 450, 160, 10, 2);

    // Cross-section edge
    g.fillStyle(0x887766, 1);
    g.fillRect(120, 155, 6, 313);
    g.fillStyle(0x5a6a4a, 1);
    g.fillRect(120, 155, 3, 313);

    // Roof — slightly different style (hip roof)
    g.fillStyle(0x2a3530, 1);
    g.fillTriangle(100, 155, 660, 155, 380, 72);
    g.fillStyle(0x000000, 0.12);
    g.fillRect(100, 153, 560, 6);
    g.lineStyle(1, 0x1a2520, 0.5);
    for (let ry = 88; ry < 155; ry += 10) {
      const frac = (ry - 72) / (155 - 72);
      g.lineBetween(380 - frac * (380 - 100), ry, 380 + frac * (660 - 380), ry);
    }
    g.fillStyle(0x3a4a3a, 1);
    g.fillRect(100, 153, 560, 4);

    // Attic
    g.fillStyle(0x1a2018, 0.5);
    g.fillTriangle(126, 155, 380, 80, 615, 155);

    // Concrete pad for heat pump (right of house)
    g.fillStyle(0x4a4a4a, 1);
    g.fillRoundedRect(648, 470, 130, 8, 2);

    // Bushes
    g.fillStyle(0x1e4a22, 1);
    g.fillCircle(130, 473, 9);
    g.fillCircle(142, 469, 11);
    g.fillCircle(665, 472, 8);
    g.fillCircle(678, 468, 10);
    g.fillCircle(690, 473, 7);

    // Door on exterior wall
    g.fillStyle(0x3a4a30, 1);
    g.fillRect(618, 385, 18, 83);
    g.fillStyle(0x4a5a40, 1);
    g.fillRect(620, 388, 14, 36);
    g.fillRect(620, 429, 14, 36);
    g.fillStyle(0xccaa44, 1);
    g.fillCircle(631, 430, 2);

    // Pipes going into wall from outside
    g.lineStyle(2, 0x718096, 0.5);
    g.lineBetween(640, 370, 640, 385);
    g.lineBetween(640, 385, 618, 385);

    this.add.text(125, 142, "▼ CROSS-SECTION VIEW", {
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
      "Kitchen Fridge": () => this._drawFridge(g, cp),
      "Propane Heat Pump": () => this._drawPropaneHeatPump(g, cp),
      "Walk-in Cooler": () => this._drawWalkInCooler(g, cp),
      "Beverage Display Cooler": () => this._drawBeverageCooler(g, cp),
      "Commercial Rooftop AC": () => this._drawRooftopAC(g, cp),
      "Ammonia Ice Machine": () => this._drawIceMachine(g, cp),
    };
    (drawFn[cp.equipmentType] || (() => {}))();

    const labelBg = this.add.graphics().setDepth(8);
    const labelX = cp.position.x + cp.hitW / 2;
    const labelY = cp.position.y + cp.hitH + 4;
    labelBg.fillStyle(0x0d1117, 0.75);
    labelBg.fillRoundedRect(labelX - 70, labelY - 2, 140, 34, 3);

    this.add.text(labelX, labelY + 2, cp.equipmentType, {
      fontFamily: "monospace", fontSize: "10px", color: "#e6edf3", fontStyle: "bold",
    }).setOrigin(0.5, 0).setDepth(9);
    this.add.text(labelX, labelY + 16, cp.refrigerant + " | " + cp.massKg + " kg", {
      fontFamily: "monospace", fontSize: "9px", color: "#8b949e",
    }).setOrigin(0.5, 0).setDepth(9);

    if (cp.eligible === false) {
      this.add.text(labelX, labelY + 30, "⊘ INELIGIBLE", {
        fontFamily: "monospace", fontSize: "9px", color: "#f85149", fontStyle: "bold",
      }).setOrigin(0.5, 0).setDepth(9);
    }

    cp._checkmark = this.add.text(cp.position.x + cp.hitW - 2, cp.position.y + 2, "✓", {
      fontFamily: "monospace", fontSize: "26px", color: "#3fb950", fontStyle: "bold",
    }).setOrigin(1, 0).setDepth(12);
    cp._checkmark.setVisible(this.collected.has(cp.id));

    const eligible = cp.eligible !== false;
    cp._highlight = this.add.graphics().setDepth(11);
    cp._highlight.lineStyle(2, eligible ? 0x3fb950 : 0xf85149, 0.8);
    cp._highlight.strokeRoundedRect(cp.position.x - 5, cp.position.y - 5, cp.hitW + 10, cp.hitH + 10, 6);
    cp._highlight.fillStyle(eligible ? 0x3fb950 : 0xf85149, 0.06);
    cp._highlight.fillRoundedRect(cp.position.x - 5, cp.position.y - 5, cp.hitW + 10, cp.hitH + 10, 6);
    cp._highlight.setVisible(false);

    if (this.collected.has(cp.id)) {
      const overlay = this.add.graphics().setDepth(10);
      overlay.fillStyle(0x3fb950, 0.12);
      overlay.fillRoundedRect(cp.position.x - 5, cp.position.y - 5, cp.hitW + 10, cp.hitH + 10, 6);
      overlay.lineStyle(2, 0x3fb950, 0.6);
      overlay.strokeRoundedRect(cp.position.x - 5, cp.position.y - 5, cp.hitW + 10, cp.hitH + 10, 6);
    }

    const zone = this.add.zone(cp.position.x + cp.hitW / 2, cp.position.y + cp.hitH / 2, cp.hitW, cp.hitH)
      .setInteractive({ useHandCursor: true }).setDepth(15);
    zone.on("pointerover", () => { if (!this.collected.has(cp.id)) cp._highlight.setVisible(true); });
    zone.on("pointerout", () => cp._highlight.setVisible(false));
    zone.on("pointerdown", () => { if (!this.collected.has(cp.id)) this._onEquipmentClick(cp); });
  }

  // ────────────── CAR ──────────────
  _drawCar(g, cp) {
    const x = cp.position.x, y = cp.position.y;
    cp.hitW = 180; cp.hitH = 95;
    g.fillStyle(0x000000, 0.3); g.fillEllipse(x + 90, y + 93, 170, 12);
    g.fillStyle(0x3a6080, 1); g.fillRoundedRect(x + 8, y + 45, 164, 40, 4);
    g.fillStyle(0x3a6080, 1);
    g.fillTriangle(x + 8, y + 45, x + 8, y + 85, x, y + 85);
    g.fillTriangle(x + 172, y + 45, x + 172, y + 85, x + 180, y + 85);
    g.fillStyle(0x2d4f6a, 1); g.fillRoundedRect(x + 42, y + 18, 96, 30, 6);
    g.fillStyle(0x79c0ff, 0.55);
    g.fillTriangle(x + 42, y + 46, x + 48, y + 22, x + 70, y + 22);
    g.fillRect(x + 48, y + 22, 22, 24);
    g.fillStyle(0x79c0ff, 0.45);
    g.fillTriangle(x + 138, y + 46, x + 132, y + 22, x + 114, y + 22);
    g.fillRect(x + 114, y + 22, 18, 24);
    g.fillStyle(0x79c0ff, 0.35); g.fillRect(x + 73, y + 24, 38, 20);
    g.lineStyle(1, 0x2a4560, 1); g.lineBetween(x + 90, y + 45, x + 90, y + 82);
    g.fillStyle(0xfff176, 0.9); g.fillCircle(x + 12, y + 56, 4); g.fillCircle(x + 12, y + 68, 4);
    g.fillStyle(0xf85149, 0.9); g.fillCircle(x + 168, y + 56, 3); g.fillCircle(x + 168, y + 68, 3);
    g.fillStyle(0x111111, 1); g.fillCircle(x + 40, y + 87, 11); g.fillCircle(x + 140, y + 87, 11);
    g.fillStyle(0x333333, 1); g.fillCircle(x + 40, y + 87, 7); g.fillCircle(x + 140, y + 87, 7);
    g.fillStyle(0x555555, 1); g.fillCircle(x + 40, y + 87, 3); g.fillCircle(x + 140, y + 87, 3);
    g.fillStyle(0x555555, 1); g.fillRect(x + 2, y + 80, 8, 6); g.fillRect(x + 170, y + 80, 8, 6);
    g.fillStyle(0xeeeeee, 1); g.fillRect(x + 72, y + 78, 36, 8);
    this.add.text(x + 90, y + 82, "AC-134", { fontFamily: "monospace", fontSize: "5px", color: "#222222", fontStyle: "bold" }).setOrigin(0.5).setDepth(6);
  }

  // ────────────── CHILLER ──────────────
  _drawChiller(g, cp) {
    const x = cp.position.x, y = cp.position.y;
    cp.hitW = 145; cp.hitH = 130;
    g.fillStyle(0x000000, 0.25); g.fillEllipse(x + 72, y + 128, 140, 10);
    g.fillStyle(0x4a5568, 1); g.fillRoundedRect(x + 5, y + 15, 135, 105, 4);
    g.lineStyle(1, 0x5a6578, 1);
    g.lineBetween(x + 50, y + 15, x + 50, y + 120);
    g.lineBetween(x + 95, y + 15, x + 95, y + 120);
    g.lineStyle(1, 0x3a4558, 1);
    for (let i = 0; i < 5; i++) g.lineBetween(x + 12, y + 30 + i * 14, x + 44, y + 30 + i * 14);
    g.fillStyle(0x1a2332, 1); g.fillRoundedRect(x + 56, y + 28, 34, 42, 3);
    g.fillStyle(0x3fb950, 1); g.fillCircle(x + 66, y + 38, 3);
    g.fillStyle(0xffa726, 1); g.fillCircle(x + 80, y + 38, 3);
    g.fillStyle(0x0d1117, 1); g.fillRect(x + 58, y + 48, 30, 14);
    this.add.text(x + 73, y + 55, "12°C", { fontFamily: "monospace", fontSize: "7px", color: "#3fb950" }).setOrigin(0.5).setDepth(6);
    g.lineStyle(3, 0x29B6F6, 1); g.lineBetween(x + 105, y + 35, x + 105, y + 65); g.lineBetween(x + 105, y + 35, x + 130, y + 35);
    g.lineStyle(3, 0xf85149, 1); g.lineBetween(x + 120, y + 35, x + 120, y + 65); g.lineBetween(x + 120, y + 35, x + 130, y + 50);
    g.fillStyle(0x718096, 1); g.fillCircle(x + 130, y + 35, 3); g.fillCircle(x + 130, y + 50, 3);
    g.fillStyle(0x5a6578, 1); g.fillRoundedRect(x + 20, y + 4, 50, 14, 3);
    g.lineStyle(1, 0x6a7588, 1); g.strokeRoundedRect(x + 20, y + 4, 50, 14, 3);
    g.fillStyle(0xffa726, 0.8); g.fillRect(x + 56, y + 82, 34, 14);
    this.add.text(x + 73, y + 89, "CFC-12", { fontFamily: "monospace", fontSize: "7px", color: "#111111", fontStyle: "bold" }).setOrigin(0.5).setDepth(6);
    g.fillStyle(0x3a4558, 1); g.fillRect(x + 14, y + 118, 8, 8); g.fillRect(x + 123, y + 118, 8, 8);
    g.lineStyle(2, 0x718096, 0.7); g.lineBetween(x, y + 50, x - 15, y + 50); g.lineBetween(x, y + 65, x - 15, y + 65);
  }

  // ────────────── SPLIT AC ──────────────
  _drawSplitAC(g, cp) {
    const x = cp.position.x, y = cp.position.y;
    cp.hitW = 160; cp.hitH = 85;
    g.fillStyle(0x555555, 1); g.fillRect(x + 25, y + 10, 5, 10); g.fillRect(x + 130, y + 10, 5, 10);
    g.fillStyle(0xe8e8e8, 1); g.fillRoundedRect(x + 10, y + 18, 140, 42, 7);
    g.fillStyle(0xf5f5f5, 1); g.fillRoundedRect(x + 10, y + 18, 140, 7, { tl: 7, tr: 7, bl: 0, br: 0 });
    g.fillStyle(0x1a1a1a, 1); g.fillRoundedRect(x + 115, y + 26, 26, 12, 2);
    this.add.text(x + 128, y + 32, "22°", { fontFamily: "monospace", fontSize: "6px", color: "#3fb950" }).setOrigin(0.5).setDepth(6);
    g.fillStyle(0x3fb950, 1); g.fillCircle(x + 25, y + 34, 2);
    g.fillStyle(0xd0d0d0, 1); g.fillRoundedRect(x + 15, y + 50, 130, 12, { tl: 0, tr: 0, bl: 5, br: 5 });
    g.lineStyle(1, 0xbbbbbb, 1);
    for (let i = 0; i < 6; i++) g.lineBetween(x + 18, y + 51 + i * 2, x + 142, y + 51 + i * 2);
    g.lineStyle(1, 0x79c0ff, 0.25);
    for (let i = 0; i < 5; i++) {
      const sx = x + 28 + i * 24;
      g.lineBetween(sx, y + 64, sx - 6, y + 76); g.lineBetween(sx - 6, y + 76, sx, y + 85);
    }
    this.add.text(x + 80, y + 40, "COOL", { fontFamily: "monospace", fontSize: "7px", color: "#999999" }).setOrigin(0.5).setDepth(6);
    g.lineStyle(2, 0x718096, 0.5); g.lineBetween(x + 150, y + 35, x + 165, y + 35); g.lineBetween(x + 150, y + 48, x + 165, y + 48);
  }

  // ────────────── CO₂ HEAT PUMP ──────────────
  _drawHeatPump(g, cp) {
    const x = cp.position.x, y = cp.position.y;
    cp.hitW = 120; cp.hitH = 120;
    g.fillStyle(0x000000, 0.25); g.fillEllipse(x + 60, y + 118, 115, 10);
    g.fillStyle(0xb0b8c0, 1); g.fillRoundedRect(x + 8, y + 12, 104, 100, 4);
    g.fillStyle(0x888888, 1); g.fillCircle(x + 60, y + 52, 30);
    g.fillStyle(0x1a2332, 1); g.fillCircle(x + 60, y + 52, 27);
    g.lineStyle(1, 0x555555, 0.5);
    for (let i = -25; i <= 25; i += 5) {
      const x1 = x + 60 + i; const hl = Math.sqrt(27*27 - i*i);
      if (hl > 0) g.lineBetween(x1, y + 52 - hl, x1, y + 52 + hl);
    }
    g.fillStyle(0x444444, 1);
    for (let a = 0; a < 4; a++) {
      const angle = (a * Math.PI) / 2 + 0.3;
      g.fillEllipse(x + 60 + Math.cos(angle) * 15, y + 52 + Math.sin(angle) * 15, 14, 5);
    }
    g.fillStyle(0x666666, 1); g.fillCircle(x + 60, y + 52, 4);
    g.lineStyle(1, 0x999999, 0.7);
    for (let i = 0; i < 4; i++) {
      g.lineBetween(x + 12, y + 88 + i * 5, x + 44, y + 88 + i * 5);
      g.lineBetween(x + 76, y + 88 + i * 5, x + 108, y + 88 + i * 5);
    }
    g.lineStyle(2, 0x718096, 0.8);
    g.lineBetween(x, y + 40, x - 12, y + 40); g.lineBetween(x - 12, y + 40, x - 12, y + 60);
    g.lineBetween(x, y + 55, x - 8, y + 55); g.lineBetween(x - 8, y + 55, x - 8, y + 60);
    g.fillStyle(0x888888, 1); g.fillCircle(x - 12, y + 60, 2); g.fillCircle(x - 8, y + 60, 2);
    g.fillStyle(0xffa726, 0.8); g.fillRoundedRect(x + 28, y + 16, 30, 12, 2);
    this.add.text(x + 43, y + 22, "CO₂", { fontFamily: "monospace", fontSize: "7px", color: "#111111", fontStyle: "bold" }).setOrigin(0.5).setDepth(6);
    g.fillStyle(0x888888, 1); g.fillRect(x + 14, y + 110, 7, 8); g.fillRect(x + 99, y + 110, 7, 8);
  }

  // ────────────── KITCHEN FRIDGE ──────────────
  _drawFridge(g, cp) {
    const x = cp.position.x, y = cp.position.y;
    cp.hitW = 80; cp.hitH = 160;

    // Shadow
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(x + 40, y + 158, 75, 8);

    // Main body
    g.fillStyle(0xc8c8c8, 1);
    g.fillRoundedRect(x + 5, y + 5, 70, 148, 3);

    // Freezer compartment (top)
    g.fillStyle(0xd4d4d4, 1);
    g.fillRoundedRect(x + 8, y + 8, 64, 42, { tl: 3, tr: 3, bl: 0, br: 0 });
    // Freezer door line
    g.lineStyle(1, 0xaaaaaa, 1);
    g.lineBetween(x + 8, y + 50, x + 72, y + 50);

    // Fridge compartment (bottom)
    g.fillStyle(0xdadada, 1);
    g.fillRoundedRect(x + 8, y + 53, 64, 96, { tl: 0, tr: 0, bl: 3, br: 3 });

    // Freezer handle
    g.fillStyle(0x999999, 1);
    g.fillRoundedRect(x + 62, y + 18, 5, 22, 2);

    // Fridge handle
    g.fillStyle(0x999999, 1);
    g.fillRoundedRect(x + 62, y + 68, 5, 36, 2);

    // Freezer vent slits
    g.lineStyle(1, 0xbbbbbb, 0.6);
    for (let i = 0; i < 3; i++) g.lineBetween(x + 18, y + 18 + i * 10, x + 50, y + 18 + i * 10);

    // Fridge interior detail — shelves visible through subtle lines
    g.lineStyle(1, 0xc0c0c0, 0.4);
    g.lineBetween(x + 14, y + 80, x + 56, y + 80);
    g.lineBetween(x + 14, y + 105, x + 56, y + 105);
    g.lineBetween(x + 14, y + 128, x + 56, y + 128);

    // Temperature display
    g.fillStyle(0x1a1a1a, 1);
    g.fillRoundedRect(x + 14, y + 56, 26, 12, 2);
    this.add.text(x + 27, y + 62, "4°C", {
      fontFamily: "monospace", fontSize: "6px", color: "#3fb950",
    }).setOrigin(0.5).setDepth(6);

    // Brand label
    this.add.text(x + 40, y + 140, "FROSTEC", {
      fontFamily: "monospace", fontSize: "6px", color: "#888888",
    }).setOrigin(0.5).setDepth(6);

    // Ice maker indicator
    g.fillStyle(0x79c0ff, 0.6);
    g.fillCircle(x + 50, y + 26, 3);

    // Feet
    g.fillStyle(0x666666, 1);
    g.fillRect(x + 10, y + 150, 6, 6);
    g.fillRect(x + 64, y + 150, 6, 6);
  }

  // ────────────── PROPANE HEAT PUMP (outdoor, ineligible) ──────────────
  _drawPropaneHeatPump(g, cp) {
    const x = cp.position.x, y = cp.position.y;
    cp.hitW = 120; cp.hitH = 120;

    // Shadow
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(x + 60, y + 118, 115, 10);

    // Main body — slightly different color from CO₂ pump
    g.fillStyle(0xa0a8b0, 1);
    g.fillRoundedRect(x + 8, y + 12, 104, 100, 4);

    // Fan area
    g.fillStyle(0x777777, 1);
    g.fillCircle(x + 60, y + 52, 30);
    g.fillStyle(0x1a2332, 1);
    g.fillCircle(x + 60, y + 52, 27);

    // Fan grille
    g.lineStyle(1, 0x555555, 0.5);
    for (let i = -25; i <= 25; i += 5) {
      const x1 = x + 60 + i;
      const hl = Math.sqrt(27 * 27 - i * i);
      if (hl > 0) g.lineBetween(x1, y + 52 - hl, x1, y + 52 + hl);
    }

    // Fan blades
    g.fillStyle(0x444444, 1);
    for (let a = 0; a < 4; a++) {
      const angle = (a * Math.PI) / 2 + 0.6;
      g.fillEllipse(x + 60 + Math.cos(angle) * 15, y + 52 + Math.sin(angle) * 15, 14, 5);
    }
    g.fillStyle(0x666666, 1);
    g.fillCircle(x + 60, y + 52, 4);

    // Side vents
    g.lineStyle(1, 0x888888, 0.7);
    for (let i = 0; i < 4; i++) {
      g.lineBetween(x + 12, y + 88 + i * 5, x + 44, y + 88 + i * 5);
      g.lineBetween(x + 76, y + 88 + i * 5, x + 108, y + 88 + i * 5);
    }

    // Pipes into wall
    g.lineStyle(2, 0x718096, 0.8);
    g.lineBetween(x, y + 40, x - 12, y + 40);
    g.lineBetween(x - 12, y + 40, x - 12, y + 60);
    g.lineBetween(x, y + 55, x - 8, y + 55);
    g.lineBetween(x - 8, y + 55, x - 8, y + 60);
    g.fillStyle(0x888888, 1);
    g.fillCircle(x - 12, y + 60, 2);
    g.fillCircle(x - 8, y + 60, 2);

    // "R-290" propane warning label — red/orange
    g.fillStyle(0xf85149, 0.8);
    g.fillRoundedRect(x + 22, y + 16, 38, 12, 2);
    this.add.text(x + 41, y + 22, "R-290", {
      fontFamily: "monospace", fontSize: "7px", color: "#ffffff", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(6);

    // Flammable warning triangle
    g.fillStyle(0xffa726, 0.9);
    g.fillTriangle(x + 70, y + 16, x + 80, y + 16, x + 75, y + 8);
    this.add.text(x + 75, y + 17, "!", {
      fontFamily: "monospace", fontSize: "6px", color: "#111111", fontStyle: "bold",
    }).setOrigin(0.5, 0).setDepth(6);

    // Legs
    g.fillStyle(0x888888, 1);
    g.fillRect(x + 14, y + 110, 7, 8);
    g.fillRect(x + 99, y + 110, 7, 8);
  }

  // ────────────── WALK-IN COOLER ──────────────
  _drawWalkInCooler(g, cp) {
    const x = cp.position.x, y = cp.position.y;
    cp.hitW = 160; cp.hitH = 180;

    // Shadow
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(x + 80, y + 178, 155, 10);

    // Main body — steel panels
    g.fillStyle(0x8a9aaa, 1);
    g.fillRoundedRect(x + 5, y + 8, 150, 166, 3);

    // Panel seams
    g.lineStyle(1, 0x7a8a9a, 0.7);
    g.lineBetween(x + 80, y + 8, x + 80, y + 174);
    g.lineBetween(x + 5, y + 60, x + 155, y + 60);
    g.lineBetween(x + 5, y + 120, x + 155, y + 120);

    // Door (left panel)
    g.fillStyle(0x95a5b5, 1);
    g.fillRoundedRect(x + 10, y + 14, 65, 155, 2);
    g.lineStyle(2, 0xa5b5c5, 1);
    g.strokeRoundedRect(x + 10, y + 14, 65, 155, 2);

    // Door handle
    g.fillStyle(0x555555, 1);
    g.fillRoundedRect(x + 65, y + 75, 7, 35, 3);
    g.fillStyle(0x444444, 1);
    g.fillRect(x + 63, y + 80, 3, 6);

    // Door gasket (rubber seal line)
    g.lineStyle(1, 0x333333, 0.5);
    g.strokeRoundedRect(x + 12, y + 16, 61, 151, 2);

    // Temperature readout panel
    g.fillStyle(0x1a2332, 1);
    g.fillRoundedRect(x + 90, y + 20, 55, 30, 3);
    g.fillStyle(0x0d1117, 1);
    g.fillRect(x + 94, y + 28, 38, 16);
    this.add.text(x + 113, y + 36, "-18°C", {
      fontFamily: "monospace", fontSize: "8px", color: "#79c0ff",
    }).setOrigin(0.5).setDepth(6);
    // Status LED
    g.fillStyle(0x3fb950, 1);
    g.fillCircle(x + 138, y + 30, 3);

    // Compressor unit on top
    g.fillStyle(0x5a6a7a, 1);
    g.fillRoundedRect(x + 25, y - 2, 110, 14, 2);
    g.lineStyle(1, 0x4a5a6a, 1);
    g.strokeRoundedRect(x + 25, y - 2, 110, 14, 2);
    // Fan grille on compressor
    g.fillStyle(0x333333, 1);
    g.fillCircle(x + 80, y + 5, 5);
    g.lineStyle(1, 0x555555, 0.6);
    g.strokeCircle(x + 80, y + 5, 5);
    g.lineBetween(x + 75, y + 5, x + 85, y + 5);
    g.lineBetween(x + 80, y, x + 80, y + 10);

    // Refrigerant label
    g.fillStyle(0x0288D1, 0.85);
    g.fillRoundedRect(x + 90, y + 58, 55, 14, 2);
    this.add.text(x + 117, y + 65, "HFC-404A", {
      fontFamily: "monospace", fontSize: "7px", color: "#ffffff", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(6);

    // Frost effect patches
    g.fillStyle(0xd0e8ff, 0.15);
    g.fillCircle(x + 30, y + 40, 8);
    g.fillCircle(x + 55, y + 100, 6);
    g.fillCircle(x + 40, y + 145, 7);

    // Floor rail
    g.fillStyle(0x666666, 1);
    g.fillRect(x + 5, y + 170, 150, 6);

    // Pipes (side)
    g.lineStyle(2, 0x718096, 0.7);
    g.lineBetween(x + 155, y + 40, x + 170, y + 40);
    g.lineBetween(x + 155, y + 55, x + 170, y + 55);
    g.fillStyle(0x718096, 1);
    g.fillCircle(x + 170, y + 40, 2);
    g.fillCircle(x + 170, y + 55, 2);
  }

  // ────────────── BEVERAGE DISPLAY COOLER ──────────────
  _drawBeverageCooler(g, cp) {
    const x = cp.position.x, y = cp.position.y;
    cp.hitW = 100; cp.hitH = 160;

    // Shadow
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(x + 50, y + 158, 95, 8);

    // Main body — dark frame
    g.fillStyle(0x222222, 1);
    g.fillRoundedRect(x + 5, y + 5, 90, 148, 4);

    // Glass door — translucent blue
    g.fillStyle(0x1a3a5a, 0.7);
    g.fillRoundedRect(x + 9, y + 9, 82, 136, 3);

    // Glass reflection
    g.fillStyle(0xffffff, 0.06);
    g.fillRect(x + 15, y + 15, 8, 120);

    // Shelves (glass)
    g.lineStyle(1, 0x4a6a8a, 0.6);
    const shelfYs = [y + 42, y + 75, y + 108];
    shelfYs.forEach(sy => g.lineBetween(x + 11, sy, x + 89, sy));

    // Bottles/cans on shelves — row 1 (top)
    const bottleColors = [0xf85149, 0xf85149, 0x3fb950, 0xffa726, 0x3fb950, 0xf85149];
    bottleColors.forEach((col, i) => {
      g.fillStyle(col, 0.7);
      g.fillRoundedRect(x + 16 + i * 12, y + 18, 8, 22, 2);
      g.fillStyle(0xffffff, 0.15);
      g.fillRect(x + 17 + i * 12, y + 20, 2, 10);
    });

    // Row 2 (cans)
    [0x29B6F6, 0xffa726, 0x29B6F6, 0xCE93D8, 0xffa726, 0x29B6F6].forEach((col, i) => {
      g.fillStyle(col, 0.65);
      g.fillRoundedRect(x + 16 + i * 12, y + 48, 8, 16, 1);
    });

    // Row 3 (bottles)
    [0x3fb950, 0x3fb950, 0xf85149, 0xffa726, 0x3fb950, 0xf85149].forEach((col, i) => {
      g.fillStyle(col, 0.6);
      g.fillRoundedRect(x + 16 + i * 12, y + 80, 8, 26, 2);
    });

    // Row 4 (water bottles)
    for (let i = 0; i < 6; i++) {
      g.fillStyle(0x4FC3F7, 0.4);
      g.fillRoundedRect(x + 16 + i * 12, y + 113, 8, 26, 2);
      g.fillStyle(0xffffff, 0.12);
      g.fillRect(x + 17 + i * 12, y + 115, 2, 14);
    }

    // Frame border
    g.lineStyle(2, 0x444444, 1);
    g.strokeRoundedRect(x + 5, y + 5, 90, 148, 4);

    // Handle
    g.fillStyle(0x888888, 1);
    g.fillRoundedRect(x + 86, y + 55, 6, 40, 3);

    // Brand / logo area at top
    g.fillStyle(0x111111, 1);
    g.fillRect(x + 9, y + 9, 82, 8);
    this.add.text(x + 50, y + 13, "COOL DRINKS", {
      fontFamily: "monospace", fontSize: "5px", color: "#79c0ff",
    }).setOrigin(0.5).setDepth(6);

    // Temperature display
    g.fillStyle(0x0d1117, 1);
    g.fillRoundedRect(x + 30, y + 143, 40, 10, 2);
    this.add.text(x + 50, y + 148, "3°C", {
      fontFamily: "monospace", fontSize: "6px", color: "#3fb950",
    }).setOrigin(0.5).setDepth(6);

    // Feet
    g.fillStyle(0x333333, 1);
    g.fillRect(x + 10, y + 150, 6, 6);
    g.fillRect(x + 84, y + 150, 6, 6);
  }

  // ────────────── COMMERCIAL ROOFTOP AC ──────────────
  _drawRooftopAC(g, cp) {
    const x = cp.position.x, y = cp.position.y;
    cp.hitW = 180; cp.hitH = 70;

    // Shadow under unit
    g.fillStyle(0x000000, 0.15);
    g.fillEllipse(x + 90, y + 68, 175, 8);

    // Main body — large flat unit
    g.fillStyle(0x7a8a9a, 1);
    g.fillRoundedRect(x + 5, y + 10, 170, 52, 4);

    // Metal panel lines
    g.lineStyle(1, 0x6a7a8a, 0.6);
    g.lineBetween(x + 62, y + 10, x + 62, y + 62);
    g.lineBetween(x + 118, y + 10, x + 118, y + 62);

    // Left fan grille
    g.fillStyle(0x333333, 1);
    g.fillCircle(x + 33, y + 36, 18);
    g.fillStyle(0x1a2332, 1);
    g.fillCircle(x + 33, y + 36, 16);
    g.lineStyle(1, 0x444444, 0.5);
    for (let i = -14; i <= 14; i += 4) {
      const hl = Math.sqrt(16 * 16 - i * i);
      if (hl > 0) g.lineBetween(x + 33 + i, y + 36 - hl, x + 33 + i, y + 36 + hl);
    }
    // Fan hub
    g.fillStyle(0x555555, 1);
    g.fillCircle(x + 33, y + 36, 3);

    // Right fan grille
    g.fillStyle(0x333333, 1);
    g.fillCircle(x + 147, y + 36, 18);
    g.fillStyle(0x1a2332, 1);
    g.fillCircle(x + 147, y + 36, 16);
    g.lineStyle(1, 0x444444, 0.5);
    for (let i = -14; i <= 14; i += 4) {
      const hl = Math.sqrt(16 * 16 - i * i);
      if (hl > 0) g.lineBetween(x + 147 + i, y + 36 - hl, x + 147 + i, y + 36 + hl);
    }
    g.fillStyle(0x555555, 1);
    g.fillCircle(x + 147, y + 36, 3);

    // Control panel (center)
    g.fillStyle(0x1a2332, 1);
    g.fillRoundedRect(x + 72, y + 18, 38, 22, 3);
    g.fillStyle(0x0d1117, 1);
    g.fillRect(x + 76, y + 22, 22, 12);
    this.add.text(x + 87, y + 28, "AUTO", {
      fontFamily: "monospace", fontSize: "6px", color: "#3fb950",
    }).setOrigin(0.5).setDepth(6);
    // Status LEDs
    g.fillStyle(0x3fb950, 1);
    g.fillCircle(x + 102, y + 24, 2);
    g.fillStyle(0xffa726, 1);
    g.fillCircle(x + 102, y + 32, 2);

    // Refrigerant label
    g.fillStyle(0x29B6F6, 0.85);
    g.fillRoundedRect(x + 72, y + 44, 38, 12, 2);
    this.add.text(x + 91, y + 50, "R-410A", {
      fontFamily: "monospace", fontSize: "6px", color: "#ffffff", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(6);

    // Mounting brackets / feet
    g.fillStyle(0x555555, 1);
    g.fillRect(x + 15, y + 60, 12, 8);
    g.fillRect(x + 55, y + 60, 12, 8);
    g.fillRect(x + 113, y + 60, 12, 8);
    g.fillRect(x + 153, y + 60, 12, 8);

    // Ductwork going down into building
    g.fillStyle(0x6a7a8a, 1);
    g.fillRect(x + 85, y + 62, 14, 18);
    g.lineStyle(1, 0x5a6a7a, 0.6);
    g.strokeRect(x + 85, y + 62, 14, 18);

    // Frame border
    g.lineStyle(1, 0x5a6a7a, 1);
    g.strokeRoundedRect(x + 5, y + 10, 170, 52, 4);

    // Top housing ridge
    g.fillStyle(0x8a9aaa, 1);
    g.fillRoundedRect(x + 5, y + 6, 170, 6, { tl: 4, tr: 4, bl: 0, br: 0 });
  }

  // ────────────── AMMONIA ICE MACHINE ──────────────
  _drawIceMachine(g, cp) {
    const x = cp.position.x, y = cp.position.y;
    cp.hitW = 110; cp.hitH = 130;

    // Shadow
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(x + 55, y + 128, 105, 8);

    // Main body — industrial steel
    g.fillStyle(0x6a7a8a, 1);
    g.fillRoundedRect(x + 5, y + 8, 100, 114, 3);

    // Upper compartment (ice making)
    g.fillStyle(0x7a8a9a, 1);
    g.fillRoundedRect(x + 10, y + 13, 90, 55, 2);
    g.lineStyle(1, 0x5a6a7a, 0.6);
    g.strokeRoundedRect(x + 10, y + 13, 90, 55, 2);

    // Ice cubes visible through panel
    g.fillStyle(0xc0e8ff, 0.35);
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 5; c++) {
        g.fillRect(x + 18 + c * 16, y + 22 + r * 14, 10, 9);
      }
    }
    // Frost overlay
    g.fillStyle(0xd0e8ff, 0.1);
    g.fillRect(x + 10, y + 13, 90, 55);

    // Lower compartment (storage bin)
    g.fillStyle(0x5a6a7a, 1);
    g.fillRoundedRect(x + 10, y + 72, 90, 44, 2);
    // Bin door
    g.lineStyle(1, 0x4a5a6a, 0.8);
    g.strokeRoundedRect(x + 14, y + 76, 82, 36, 2);
    // Bin handle
    g.fillStyle(0x444444, 1);
    g.fillRoundedRect(x + 45, y + 90, 20, 5, 2);

    // Control panel (top right)
    g.fillStyle(0x1a2332, 1);
    g.fillRoundedRect(x + 70, y + 15, 26, 18, 2);
    g.fillStyle(0x3fb950, 1);
    g.fillCircle(x + 78, y + 22, 2);
    g.fillStyle(0xf85149, 1);
    g.fillCircle(x + 78, y + 29, 2);
    this.add.text(x + 89, y + 24, "ON", {
      fontFamily: "monospace", fontSize: "5px", color: "#3fb950",
    }).setOrigin(0.5).setDepth(6);

    // Warning labels
    g.fillStyle(0xCE93D8, 0.85);
    g.fillRoundedRect(x + 15, y + 42, 45, 12, 2);
    this.add.text(x + 37, y + 48, "NH₃", {
      fontFamily: "monospace", fontSize: "7px", color: "#ffffff", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(6);

    // Hazard warning triangle
    g.fillStyle(0xffa726, 0.9);
    g.fillTriangle(x + 68, y + 42, x + 78, y + 42, x + 73, y + 34);
    this.add.text(x + 73, y + 42, "!", {
      fontFamily: "monospace", fontSize: "5px", color: "#111111", fontStyle: "bold",
    }).setOrigin(0.5, 0).setDepth(6);

    // Pipes (side — external condenser lines)
    g.lineStyle(2, 0x718096, 0.7);
    g.lineBetween(x + 105, y + 30, x + 118, y + 30);
    g.lineBetween(x + 118, y + 30, x + 118, y + 50);
    g.lineBetween(x + 105, y + 50, x + 118, y + 50);
    g.fillStyle(0x718096, 1);
    g.fillCircle(x + 118, y + 30, 2);
    g.fillCircle(x + 118, y + 50, 2);

    // Legs
    g.fillStyle(0x555555, 1);
    g.fillRect(x + 10, y + 118, 8, 8);
    g.fillRect(x + 92, y + 118, 8, 8);
  }

  // ═══════════════════════ LOCATION 3 BACKGROUND — restaurant ═══════════════════════

  _drawBackground3() {
    const g = this.add.graphics();

    // Sky — evening
    g.fillStyle(0x0a1422, 1);
    g.fillRect(0, 0, 900, 600);
    g.fillStyle(0x0e1a30, 1);
    g.fillRect(0, 0, 900, 55);

    // Stars
    g.fillStyle(0xffffff, 0.35);
    [[40,18],[180,32],[320,10],[480,25],[610,14],[760,30],[850,22],[260,42],[550,38],[700,46]]
      .forEach(([sx, sy]) => g.fillCircle(sx, sy, 1));
    g.fillStyle(0xffffff, 0.6);
    g.fillCircle(440, 15, 1.5);
    g.fillCircle(790, 8, 1.5);

    // Ground
    g.fillStyle(0x1a3a20, 1);
    g.fillRect(0, 478, 900, 14);
    g.fillStyle(0x163018, 1);
    g.fillRect(0, 492, 900, 108);
    g.fillStyle(0x24502a, 1);
    for (let tx = 0; tx < 900; tx += 16) {
      const th = 2 + Math.sin(tx * 0.6) * 2;
      g.fillRect(tx, 478 - th, 2, th);
    }
    g.fillStyle(0x2a1a0e, 1);
    g.fillRect(0, 530, 900, 70);

    // Parking area (left side)
    g.fillStyle(0x2a2a2a, 1);
    g.fillRect(0, 478, 80, 122);
    g.lineStyle(1, 0x444444, 0.4);
    g.lineBetween(40, 478, 40, 600);
    g.fillStyle(0x333333, 1);
    g.fillRect(76, 478, 6, 122);

    // Foundation — commercial building
    g.fillStyle(0x5a5a5a, 1);
    g.fillRect(80, 465, 620, 18);
    g.fillStyle(0x666666, 1);
    g.fillRect(80, 465, 620, 5);

    // ── Building exterior — brick facade ──
    g.fillStyle(0x7a4a3a, 1);
    g.fillRect(80, 135, 620, 330);
    // Brick texture
    g.lineStyle(1, 0x6a3a2a, 0.3);
    for (let by = 135; by < 465; by += 10) {
      g.lineBetween(80, by, 700, by);
      const off = (Math.floor((by - 135) / 10) % 2) * 15;
      for (let bx = 80 + off; bx < 700; bx += 30) {
        g.lineBetween(bx, by, bx, by + 10);
      }
    }

    // Cross-section cut line (left)
    g.fillStyle(0x887766, 1);
    g.fillRect(80, 135, 6, 330);
    g.fillStyle(0x7a4a3a, 1);
    g.fillRect(80, 135, 3, 330);

    // ── Interior: Kitchen (left half) ──
    g.fillStyle(0xd0c8b8, 1);
    g.fillRect(86, 145, 310, 320);

    // Kitchen tile wall
    g.lineStyle(1, 0xc0b8a8, 0.4);
    for (let ty = 145; ty < 465; ty += 18) g.lineBetween(86, ty, 396, ty);
    for (let tx = 86; tx < 396; tx += 18) g.lineBetween(tx, 145, tx, 465);

    // Kitchen floor (checkered tile)
    g.fillStyle(0x8a8070, 1);
    g.fillRect(86, 445, 310, 20);
    g.lineStyle(1, 0x7a7060, 0.5);
    for (let fx = 86; fx < 396; fx += 20) g.lineBetween(fx, 445, fx, 465);

    // Stainless steel counter (back wall)
    g.fillStyle(0x9a9a9a, 1);
    g.fillRect(86, 390, 180, 8);
    g.fillStyle(0x888888, 1);
    g.fillRect(86, 398, 180, 45);
    g.lineStyle(1, 0xa0a0a0, 0.5);
    g.lineBetween(86, 420, 266, 420);
    // Cabinet doors
    g.lineStyle(1, 0x999999, 0.7);
    g.strokeRect(90, 402, 40, 16);
    g.strokeRect(135, 402, 40, 16);
    g.strokeRect(180, 402, 40, 16);
    g.strokeRect(225, 402, 40, 16);

    // Hood/exhaust over stove
    g.fillStyle(0x888888, 1);
    g.fillRect(120, 220, 120, 10);
    g.fillStyle(0x777777, 1);
    g.fillRect(130, 230, 100, 4);
    // Stove
    g.fillStyle(0x444444, 1);
    g.fillRect(130, 380, 100, 14);
    g.fillStyle(0xf85149, 0.3);
    g.fillCircle(155, 387, 8);
    g.fillCircle(195, 387, 8);
    g.fillCircle(155, 387, 4);
    g.fillCircle(195, 387, 4);

    // Prep counter (middle)
    g.fillStyle(0x9a9a9a, 1);
    g.fillRect(280, 350, 110, 8);
    g.fillStyle(0x888888, 1);
    g.fillRect(280, 358, 110, 35);

    // Sink
    g.fillStyle(0x7a7a7a, 1);
    g.fillRect(300, 340, 40, 12);
    g.fillStyle(0x999999, 1);
    g.fillRect(314, 330, 4, 12);

    // Dividing wall kitchen / dining
    g.fillStyle(0x6a5a4a, 1);
    g.fillRect(396, 145, 10, 320);
    // Pass-through window
    g.fillStyle(0xd0c8b8, 1);
    g.fillRect(396, 280, 10, 60);
    g.lineStyle(1, 0x5a4a3a, 0.8);
    g.lineBetween(396, 280, 406, 280);
    g.lineBetween(396, 340, 406, 340);

    // ── Interior: Dining area (right half) ──
    g.fillStyle(0x3a3028, 1);
    g.fillRect(406, 145, 294, 320);

    // Wainscoting (lower)
    g.fillStyle(0x2a2420, 1);
    g.fillRect(406, 360, 294, 105);
    g.lineStyle(1, 0x3a3028, 0.5);
    g.lineBetween(406, 360, 700, 360);

    // Wood floor
    g.fillStyle(0x5a4a38, 1);
    g.fillRect(406, 445, 294, 20);
    g.lineStyle(1, 0x4a3a28, 0.5);
    for (let fx = 406; fx < 700; fx += 30) g.lineBetween(fx, 445, fx, 465);

    // Windows — dining area
    for (let wi = 0; wi < 2; wi++) {
      const wx = 430 + wi * 120;
      g.fillStyle(0x0a1422, 1);
      g.fillRect(wx, 175, 70, 80);
      g.fillStyle(0x102040, 0.6);
      g.fillRect(wx + 3, 178, 30, 74);
      g.fillRect(wx + 37, 178, 30, 74);
      g.lineStyle(2, 0x6a5a4a, 1);
      g.strokeRect(wx, 175, 70, 80);
      g.lineBetween(wx + 35, 175, wx + 35, 255);
      // Curtain rod
      g.lineStyle(1, 0x888888, 0.6);
      g.lineBetween(wx - 5, 173, wx + 75, 173);
    }

    // Dining tables
    for (let ti = 0; ti < 2; ti++) {
      const dtx = 435 + ti * 120;
      // Table
      g.fillStyle(0x5a4430, 1);
      g.fillRoundedRect(dtx, 390, 60, 4, 1);
      g.fillRect(dtx + 8, 394, 4, 18);
      g.fillRect(dtx + 48, 394, 4, 18);
      // Chairs
      g.fillStyle(0x4a3828, 1);
      g.fillRoundedRect(dtx - 8, 385, 12, 22, 2);
      g.fillRoundedRect(dtx + 56, 385, 12, 22, 2);
    }

    // Light fixtures (hanging)
    for (let li = 0; li < 2; li++) {
      const lx = 465 + li * 120;
      g.fillStyle(0x444444, 1);
      g.fillRect(lx, 145, 2, 25);
      g.fillStyle(0xffa726, 0.2);
      g.fillTriangle(lx - 12, 170, lx + 14, 170, lx + 1, 158);
      g.fillStyle(0xffa726, 0.15);
      g.fillCircle(lx + 1, 175, 18);
    }

    // ── Exterior (right side) ──
    g.fillStyle(0x7a4a3a, 1);
    g.fillRect(700, 135, 20, 330);
    g.lineStyle(1, 0x6a3a2a, 0.3);
    for (let by = 135; by < 465; by += 10) g.lineBetween(700, by, 720, by);

    // Restaurant sign
    g.fillStyle(0x1a2332, 1);
    g.fillRoundedRect(180, 105, 340, 30, 4);
    g.lineStyle(2, 0xffa726, 0.8);
    g.strokeRoundedRect(180, 105, 340, 30, 4);
    this.add.text(350, 120, "🍴  THE GOLDEN FORK  🍴", {
      fontFamily: "monospace", fontSize: "12px", color: "#ffa726", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(2);

    // Awning
    g.fillStyle(0x8a2020, 0.7);
    g.fillRect(80, 133, 620, 14);
    g.lineStyle(1, 0x6a1010, 0.5);
    for (let ax = 80; ax < 700; ax += 20) {
      g.fillStyle((Math.floor((ax - 80) / 20) % 2 === 0) ? 0x8a2020 : 0x6a1818, 0.7);
      g.fillTriangle(ax, 147, ax + 20, 147, ax + 10, 157);
    }

    // Roof — flat commercial roof
    g.fillStyle(0x3a3a3a, 1);
    g.fillRect(75, 92, 630, 15);
    g.fillStyle(0x444444, 1);
    g.fillRect(75, 88, 630, 6);
    // Roof edge
    g.lineStyle(1, 0x555555, 0.8);
    g.lineBetween(75, 88, 705, 88);
    // Roof surface
    g.fillStyle(0x2a2a2a, 1);
    g.fillRect(75, 55, 630, 35);
    g.lineStyle(1, 0x3a3a3a, 0.3);
    for (let ry = 60; ry < 90; ry += 8) g.lineBetween(75, ry, 705, ry);

    // AC ductwork penetrating roof
    g.fillStyle(0x5a6a7a, 1);
    g.fillRect(425, 80, 18, 15);

    // Concrete pad for ice machine (right of building)
    g.fillStyle(0x4a4a4a, 1);
    g.fillRoundedRect(720, 468, 130, 10, 2);

    // Dumpster area (far right)
    g.fillStyle(0x2a4a2a, 1);
    g.fillRoundedRect(850, 430, 45, 48, 3);
    g.lineStyle(1, 0x1a3a1a, 0.6);
    g.strokeRoundedRect(850, 430, 45, 48, 3);
    g.fillStyle(0x2a4a2a, 1);
    g.fillRect(854, 425, 37, 8);

    // Bushes
    g.fillStyle(0x1e4a22, 1);
    g.fillCircle(88, 473, 8);
    g.fillCircle(100, 470, 10);
    g.fillCircle(715, 472, 9);
    g.fillCircle(728, 468, 11);

    // Exterior door (on right wall)
    g.fillStyle(0x4a2a18, 1);
    g.fillRect(702, 380, 16, 85);
    g.fillStyle(0x5a3a28, 1);
    g.fillRect(704, 383, 12, 38);
    g.fillRect(704, 425, 12, 36);
    g.fillStyle(0xccaa44, 1);
    g.fillCircle(713, 425, 2);

    this.add.text(90, 142, "▼ CROSS-SECTION VIEW", {
      fontFamily: "monospace", fontSize: "8px", color: "#8b949e",
    }).setAlpha(0.6);
  }

  // ═══════════════════════ GAME LOGIC ═══════════════════════

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
      this._checkLocationComplete();
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
    this._fillCanisterSlot(cp.refrigerant);
  }

  // ═══════════════════════ CANISTER TRAY ═══════════════════════

  _buildCanisterSlots() {
    const startX = 18;
    const slotY = 556;
    const slotW = 44;
    const slotH = 32;
    const gap = 6;

    this.add.text(startX, slotY - 2, "COLLECTED", {
      fontFamily: "monospace", fontSize: "8px", color: "#555d6b",
    }).setDepth(21);

    for (let i = 0; i < this.totalEligible; i++) {
      const sx = startX + i * (slotW + gap);
      const sy = slotY + 10;

      if (i >= this.canisterSlots.length) {
        this.canisterSlots.push({ x: sx, y: sy, w: slotW, h: slotH, filled: false });
      }

      const placeholder = this.add.graphics().setDepth(21);
      this._drawCanisterShape(placeholder, sx, sy, slotW, slotH, true);

      this.add.text(sx + slotW / 2, sy + slotH / 2, String(i + 1), {
        fontFamily: "monospace", fontSize: "12px", color: "#2a3444", fontStyle: "bold",
      }).setOrigin(0.5).setDepth(21);

      // Re-draw already filled slots
      if (this.canisterSlots[i].filled) {
        const cont = this.add.container(sx + slotW / 2, sy + slotH / 2).setDepth(23);
        const gfx = this.add.graphics();
        this._drawCanisterShape(gfx, -slotW / 2, -slotH / 2, slotW, slotH, false);
        cont.add(gfx);
        cont.add(this.add.text(0, -2, this.canisterSlots[i].label, {
          fontFamily: "monospace", fontSize: "7px", color: "#e6edf3", fontStyle: "bold",
        }).setOrigin(0.5));
        cont.add(this.add.text(0, 12, (i + 1) + "/" + this.totalEligible, {
          fontFamily: "monospace", fontSize: "7px", color: "#8b949e",
        }).setOrigin(0.5));
      }
    }
  }

  _fillCanisterSlot(refrigerant) {
    const slot = this.canisterSlots[this.canistersFilled];
    if (!slot) return;
    const { x, y, w, h } = slot;
    slot.filled = true;
    slot.label = refrigerant;
    this.canistersFilled++;

    const container = this.add.container(x + w / 2, y + h / 2).setDepth(23);
    container.setScale(0);
    const gfx = this.add.graphics();
    this._drawCanisterShape(gfx, -w / 2, -h / 2, w, h, false);
    container.add(gfx);
    container.add(this.add.text(0, -2, refrigerant, {
      fontFamily: "monospace", fontSize: "7px", color: "#e6edf3", fontStyle: "bold",
    }).setOrigin(0.5));
    container.add(this.add.text(0, 12, this.canistersFilled + "/" + this.totalEligible, {
      fontFamily: "monospace", fontSize: "7px", color: "#8b949e",
    }).setOrigin(0.5));

    this.tweens.add({ targets: container, scale: 1, duration: 400, ease: "Back.easeOut" });
    const glow = this.add.graphics().setDepth(22);
    glow.fillStyle(0x3fb950, 0.25);
    glow.fillRoundedRect(x - 3, y - 3, w + 6, h + 6, 6);
    this.tweens.add({ targets: glow, alpha: 0, duration: 800, delay: 300, onComplete: () => glow.destroy() });
  }

  _drawCanisterShape(g, x, y, w, h, isPlaceholder) {
    const neckW = w * 0.3, neckH = h * 0.22;
    const neckX = x + (w - neckW) / 2;
    const bodyY = y + neckH, bodyH = h - neckH;
    if (isPlaceholder) {
      g.lineStyle(1, 0x2a3444, 0.8);
      g.strokeRoundedRect(neckX, y, neckW, neckH + 2, 2);
      g.strokeRoundedRect(x + 2, bodyY, w - 4, bodyH, 4);
      g.fillStyle(0x1a2230, 0.5);
      g.fillRoundedRect(neckX, y, neckW, neckH + 2, 2);
      g.fillRoundedRect(x + 2, bodyY, w - 4, bodyH, 4);
    } else {
      g.fillStyle(0x666666, 1); g.fillRoundedRect(neckX, y, neckW, neckH + 4, 2);
      g.fillStyle(0xf85149, 1); g.fillCircle(x + w / 2, y + 2, 3);
      g.fillStyle(0x4a7a5a, 1); g.fillRoundedRect(x + 2, bodyY, w - 4, bodyH, 4);
      g.fillStyle(0x5a9a6a, 0.5); g.fillRect(x + 6, bodyY + 3, 4, bodyH - 6);
      g.fillStyle(0x3a6a4a, 0.5); g.fillRect(x + w - 10, bodyY + 3, 4, bodyH - 6);
      g.fillStyle(0x1a2332, 1); g.fillCircle(x + w / 2, bodyY + bodyH * 0.65, 5);
      g.lineStyle(1, 0x3fb950, 1); g.strokeCircle(x + w / 2, bodyY + bodyH * 0.65, 5);
      g.lineStyle(1, 0x3fb950, 0.6); g.strokeRoundedRect(x + 2, bodyY, w - 4, bodyH, 4);
    }
  }

  // ═══════════════════════ FORM / VALIDATION ═══════════════════════

  _showCollectionLogForm(cp, callback) {
    const today = new Date().toISOString().split("T")[0];
    const serialField = cp.requiresSerialNumber
      ? `<label>Serial Number <span style="color:#f85149">(required >10 kg)</span>:<br>
           <input type="text" name="serialNumber" value="SN-${cp.id}" style="width:100%;box-sizing:border-box;${INPUT_CSS}">
         </label>` : "";
    const html = `
      <div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#161b22;border:2px solid #30363d;border-radius:8px;padding:24px;width:430px;color:#e6edf3;font-family:monospace;z-index:200;box-shadow:0 8px 32px rgba(0,0,0,0.7);">
        <h3 style="margin:0 0 6px;color:#79c0ff;font-size:15px;">Collection Log — ${cp.id}</h3>
        <p style="margin:0 0 14px;font-size:11px;color:#8b949e;">${cp.equipmentType} | ${cp.refrigerant} | ${cp.massKg} kg | ${cp.status}</p>
        <form id="collectionForm" style="display:flex;flex-direction:column;gap:8px;">
          <label>Facility Address:<br><input type="text" name="facilityAddress" value="123 Industrial Ave" style="width:100%;box-sizing:border-box;${INPUT_CSS}"></label>
          <label>Date:<br><input type="date" name="date" value="${today}" style="width:100%;box-sizing:border-box;${INPUT_CSS}"></label>
          <label>Container ID:<br><input type="text" name="fieldContainerId" value="CONT-${cp.id}-${Date.now().toString().slice(-4)}" style="width:100%;box-sizing:border-box;${INPUT_CSS}"></label>
          <label>Equipment Type:<br><input type="text" name="equipmentType" value="${cp.equipmentType}" style="width:100%;box-sizing:border-box;${INPUT_CSS}"></label>
          <label>Approx Quantity (kg):<br><input type="number" name="approxQty" value="${cp.massKg}" step="0.1" style="width:100%;box-sizing:border-box;${INPUT_CSS}"></label>
          <label>Equipment Status:<br><input type="text" name="equipmentStatus" value="${cp.status}" style="width:100%;box-sizing:border-box;${INPUT_CSS}"></label>
          <label>Attestation Signature:<br><input type="text" name="attestation" value="Tech-A" style="width:100%;box-sizing:border-box;${INPUT_CSS}"></label>
          ${serialField}
          <button type="submit" style="margin-top:6px;background:#238636;color:#fff;border:none;border-radius:4px;padding:10px;font-family:monospace;font-size:14px;cursor:pointer;">Submit Collection Log</button>
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

  // ═══════════════════════ SCENE DATA ═══════════════════════

  _generateLocations() {
    // Location 1: residential property with car, chiller, split AC, CO₂ heat pump
    this.loc1Points = [
      { id: "CP-001", equipmentType: "Residential Split AC", refrigerant: "HCFC-22",
        massKg: 2.3, status: "end-of-life", position: { x: 270, y: 195 } },
      { id: "CP-002", equipmentType: "Industrial Chiller", refrigerant: "CFC-12",
        massKg: 45.0, status: "end-of-life", position: { x: 735, y: 330 },
        requiresSerialNumber: true },
      { id: "CP-003", equipmentType: "Car AC", refrigerant: "HFC-134a",
        massKg: 0.7, status: "servicing", position: { x: 12, y: 370 } },
      { id: "CP-004", equipmentType: "CO₂ Heat Pump", refrigerant: "CO2-R744",
        massKg: 3.0, status: "end-of-life", position: { x: 625, y: 340 },
        eligible: false },
    ];

    // Location 2: suburban home with split AC, fridge, propane heat pump
    this.loc2Points = [
      { id: "CP-005", equipmentType: "Residential Split AC", refrigerant: "HCFC-22",
        massKg: 1.8, status: "end-of-life", position: { x: 350, y: 195 } },
      { id: "CP-006", equipmentType: "Kitchen Fridge", refrigerant: "HFC-134a",
        massKg: 0.15, status: "end-of-life", position: { x: 138, y: 280 } },
      { id: "CP-007", equipmentType: "Propane Heat Pump", refrigerant: "R-290",
        massKg: 2.5, status: "end-of-life", position: { x: 655, y: 340 },
        eligible: false },
    ];

    // Location 3: restaurant with walk-in cooler, beverage cooler, rooftop AC, ammonia ice machine
    this.loc3Points = [
      { id: "CP-008", equipmentType: "Walk-in Cooler", refrigerant: "HFC-404A",
        massKg: 60.0, status: "end-of-life", position: { x: 95, y: 260 },
        requiresSerialNumber: true },
      { id: "CP-009", equipmentType: "Beverage Display Cooler", refrigerant: "HFC-134a",
        massKg: 1.2, status: "end-of-life", position: { x: 530, y: 285 } },
      { id: "CP-010", equipmentType: "Commercial Rooftop AC", refrigerant: "HFC-410A",
        massKg: 4.5, status: "end-of-life", position: { x: 340, y: 55 } },
      { id: "CP-011", equipmentType: "Ammonia Ice Machine", refrigerant: "Ammonia",
        massKg: 8.0, status: "end-of-life", position: { x: 730, y: 340 },
        eligible: false },
    ];
  }
}

const INPUT_CSS = `
  background:#0d1117; color:#e6edf3; border:1px solid #30363d;
  border-radius:4px; padding:5px 8px; font-family:monospace; font-size:13px;
  margin-top:3px;
`.replace(/\n\s*/g, "");
