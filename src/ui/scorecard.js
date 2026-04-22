import { REFRIGERANTS } from "../data/refrigerants.js";

export class ScorecardScene extends Phaser.Scene {
  constructor() {
    super({ key: "ScorecardScene" });
  }

  create() {
    this.gs = this.registry.get("gameState");
    const { destroyedBatches, score, flags } = this.gs;

    const baselineCO2e = score.grossCO2eAvoided;
    const projectCO2e = score.projectEmissions;
    const netReduction = Math.max(0, baselineCO2e - projectCO2e);
    const creditsIssued = Math.floor(netReduction);

    const d = {
      baselineCO2e: baselineCO2e.toFixed(2),
      projectCO2e: projectCO2e.toFixed(2),
      netReduction: netReduction.toFixed(2),
      creditsIssued,
      grade: this._getGrade(creditsIssued, flags, destroyedBatches),
      batches: destroyedBatches,
      flags,
      reportingPeriod: "2026",
    };

    const g = this.add.graphics();

    // Background
    g.fillStyle(0x0d1117, 1);
    g.fillRect(0, 0, 900, 600);

    // Header
    g.fillStyle(0x161b22, 1);
    g.fillRect(0, 0, 900, 78);
    g.lineStyle(1, 0x30363d, 1);
    g.lineBetween(0, 78, 900, 78);

    this.add.text(450, 24, "GHG STATEMENT — CryoDestroy", {
      fontFamily: "monospace", fontSize: "20px", color: "#79c0ff", fontStyle: "bold",
    }).setOrigin(0.5);
    this.add.text(450, 50, "Reporting Period: " + d.reportingPeriod + "  |  Containers Destroyed: " + d.batches.length, {
      fontFamily: "monospace", fontSize: "13px", color: "#8b949e",
    }).setOrigin(0.5);

    // Grade badge
    const gradeColours = { "A+": 0x3fb950, "B": 0xd29922, "C": 0xf85149 };
    const gradeColourStrs = { "A+": "#3fb950", "B": "#d29922", "C": "#f85149" };
    const gc = gradeColours[d.grade.grade] || 0x555555;
    g.fillStyle(gc, 1);
    g.fillCircle(852, 39, 30);
    this.add.text(852, 39, d.grade.grade, {
      fontFamily: "monospace", fontSize: d.grade.grade === "A+" ? "18px" : "22px",
      color: "#ffffff", fontStyle: "bold",
    }).setOrigin(0.5);

    // Summary table (left)
    const tableRows = [
      ["Baseline CO₂e (if vented):", d.baselineCO2e + " t"],
      ["Project Emissions (destruction):", d.projectCO2e + " t"],
      ["Net CO₂e Reduction:", d.netReduction + " t"],
      ["Credits Issued:", d.creditsIssued + " tCO₂e"],
    ];
    tableRows.forEach(([label, val], i) => {
      const ry = 92 + i * 52;
      g.fillStyle(i % 2 === 0 ? 0x0d1117 : 0x111820, 1);
      g.fillRect(18, ry, 480, 50);
      g.lineStyle(1, 0x21262d, 1);
      g.strokeRect(18, ry, 480, 50);
      this.add.text(28, ry + 10, label, {
        fontFamily: "monospace", fontSize: "12px", color: "#8b949e",
      });
      this.add.text(28, ry + 28, val, {
        fontFamily: "monospace", fontSize: "14px", color: "#e6edf3", fontStyle: "bold",
      });
    });

    // DRE breakdown (right)
    const rightX = 520;
    const cardH = Math.min(d.batches.length, 5) * 72 + 32;
    g.fillStyle(0x161b22, 1);
    g.fillRect(rightX, 90, 362, cardH);
    g.lineStyle(1, 0x30363d, 1);
    g.strokeRect(rightX, 90, 362, cardH);

    this.add.text(rightX + 14, 102, "DESTRUCTION RECORDS", {
      fontFamily: "monospace", fontSize: "13px", color: "#79c0ff", fontStyle: "bold",
    });

    d.batches.slice(0, 5).forEach((b, i) => {
      const by = 120 + i * 72;
      g.fillStyle(0x1a2030, 1);
      g.fillRect(rightX + 10, by, 340, 60);
      g.lineStyle(1, 0x30363d, 1);
      g.strokeRect(rightX + 10, by, 340, 60);

      const r = REFRIGERANTS.find(rf => rf.id === b.refrigerant);
      const colour = r ? parseInt(r.colour.slice(1), 16) : 0x79c0ff;
      g.fillStyle(colour, 1);
      g.fillRect(rightX + 10, by, 5, 60);

      this.add.text(rightX + 22, by + 10, b.refrigerant + "  —  " + b.massDestroyed.toFixed(2) + " kg", {
        fontFamily: "monospace", fontSize: "12px", color: "#e6edf3",
      });
      this.add.text(rightX + 22, by + 28, "DRE: " + b.DRE.toFixed(4) + "%", {
        fontFamily: "monospace", fontSize: "12px", color: b.DRE >= 99.99 ? "#3fb950" : "#f85149",
      });
      this.add.text(rightX + 22, by + 44, "CO₂: " + b.directCO2Emitted.toFixed(4) + " t  |  " + b.containerId, {
        fontFamily: "monospace", fontSize: "11px", color: "#8b949e",
      });
    });

    // Penalty flags
    let flagY = 310;
    const hasDREIssue = d.batches.some(b => b.DRE < 99.99);
    if (d.flags.sortingPenalty) {
      g.fillStyle(0x2d1e08, 1);
      g.fillRect(18, flagY, 480, 38);
      g.lineStyle(1, 0xffa726, 1);
      g.strokeRect(18, flagY, 480, 38);
      this.add.text(28, flagY + 14, "⚠ Sorting errors — wrong tank drops increased project emissions", {
        fontFamily: "monospace", fontSize: "11px", color: "#ffa726",
      });
      flagY += 44;
    }
    if (d.flags.labAccuracyPenalty) {
      g.fillStyle(0x2d1e08, 1);
      g.fillRect(18, flagY, 480, 38);
      g.lineStyle(1, 0xffa726, 1);
      g.strokeRect(18, flagY, 480, 38);
      this.add.text(28, flagY + 14, "⚠ Lab inaccuracy — 15% mass penalty on affected tanks", {
        fontFamily: "monospace", fontSize: "11px", color: "#ffa726",
      });
      flagY += 44;
    }
    if (d.flags.provenanceGapPenalty) {
      g.fillStyle(0x2d1010, 1);
      g.fillRect(18, flagY, 480, 38);
      g.lineStyle(1, 0xf85149, 1);
      g.strokeRect(18, flagY, 480, 38);
      this.add.text(28, flagY + 14, "⚠ Provenance Gap — some containers excluded from eligible mass", {
        fontFamily: "monospace", fontSize: "11px", color: "#f85149",
      });
      flagY += 44;
    }
    if (d.flags.leakagePenalty) {
      g.fillStyle(0x2d1e08, 1);
      g.fillRect(18, flagY, 480, 38);
      g.lineStyle(1, 0xffa726, 1);
      g.strokeRect(18, flagY, 480, 38);
      this.add.text(28, flagY + 14, "⚠ Transport Leakage >10% — eligible mass reduced", {
        fontFamily: "monospace", fontSize: "11px", color: "#ffa726",
      });
      flagY += 44;
    }
    if (d.flags.coAlarmPenalty) {
      g.fillStyle(0x2d1010, 1);
      g.fillRect(18, flagY, 480, 38);
      g.lineStyle(1, 0xf85149, 1);
      g.strokeRect(18, flagY, 480, 38);
      this.add.text(28, flagY + 14, "⚠ CO alarm triggered — additional emissions penalty applied", {
        fontFamily: "monospace", fontSize: "11px", color: "#f85149",
      });
      flagY += 44;
    }
    if (hasDREIssue) {
      g.fillStyle(0x2d1010, 1);
      g.fillRect(18, flagY, 480, 38);
      g.lineStyle(1, 0xf85149, 1);
      g.strokeRect(18, flagY, 480, 38);
      this.add.text(28, flagY + 14, "⚠ DRE below 99.99% on some batches — creditable mass reduced", {
        fontFamily: "monospace", fontSize: "11px", color: "#f85149",
      });
      flagY += 44;
    }

    // Large credits display
    this.add.text(255, 475, String(d.creditsIssued), {
      fontFamily: "monospace", fontSize: "56px", color: "#3fb950", fontStyle: "bold",
    }).setOrigin(0.5);
    this.add.text(255, 513, "tCO₂e avoided", {
      fontFamily: "monospace", fontSize: "15px", color: "#8b949e",
    }).setOrigin(0.5);

    const gcStr = gradeColourStrs[d.grade.grade] || "#555555";
    this.add.text(255, 542, d.grade.label, {
      fontFamily: "monospace", fontSize: "14px", color: gcStr, fontStyle: "bold",
    }).setOrigin(0.5);

    // PLAY AGAIN button
    g.fillStyle(0x21262d, 1);
    g.fillRoundedRect(600, 540, 260, 44, 6);
    g.lineStyle(1, 0x30363d, 1);
    g.strokeRoundedRect(600, 540, 260, 44, 6);

    this.add.text(730, 562, "↺  PLAY AGAIN", {
      fontFamily: "monospace", fontSize: "15px", color: "#79c0ff", fontStyle: "bold",
    }).setOrigin(0.5);

    const replayZone = this.add.zone(730, 562, 260, 44).setInteractive({ useHandCursor: true });
    replayZone.on("pointerdown", () => {
      window.location.reload();
    });
  }

  _getGrade(credits, flags, batches) {
    const hasDREIssue = batches.some(b => b.DRE < 99.99);
    const hasAnyPenalty = flags.provenanceGapPenalty || flags.labAccuracyPenalty || flags.sortingPenalty || flags.leakagePenalty || flags.coAlarmPenalty || hasDREIssue;
    if (credits > 500 && !hasAnyPenalty)
      return { grade: "A+", label: "🏆 Verified! Credits Issued." };
    if (credits > 200)
      return { grade: "B", label: "✅ Accepted with minor issues." };
    return { grade: "C", label: "⚠️ Needs improvement." };
  }
}
