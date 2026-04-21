# CryoDestroy: Refrigerant Rescue

An educational strategy game about refrigerant destruction and carbon credit generation. Guide refrigerant containers through a 4-stage chain of custody — from field collection to high-temperature destruction — and earn carbon credits based on your performance.

Built with [Phaser 3](https://phaser.io/) (loaded via CDN) and vanilla JavaScript. No install required.

## Getting Started

The game uses ES modules, so it must be served over HTTP (opening the HTML file directly won't work). No dependencies to install — just start a local server:

```bash
# with Python (built into macOS/Linux)
cd src
python3 -m http.server 8000

# or with Node.js
npx serve src
```

Then open **http://localhost:8000** in your browser.

**Dev shortcut:** Jump to a specific stage with a URL parameter:

```
http://localhost:8000?stage=AGGREGATION
http://localhost:8000?stage=TRANSPORT
http://localhost:8000?stage=DESTRUCTION
http://localhost:8000?stage=SCORECARD
```

## How to Play

The game has four stages, each with different mechanics. Your goal is to collect, sort, transport, and destroy refrigerant containers while minimizing emissions and maximizing carbon credits.

### Stage 1 — Field Collection (Point and Click)

Click equipment containers to collect their refrigerant. Fill out the collection log form for each container (facility address, date, container ID, quantity, etc.). Collect all 3 eligible containers to advance.

- Avoid **CO2-R744** containers — they are ineligible and cost you points.
- Missing form fields trigger a **Provenance Gap** penalty that follows you through later stages.

### Stage 2 — Aggregation & Sorting (Drag and Drop)

**Sorting phase:** Drag containers into the correct bins by refrigerant class:

| Bin    | Refrigerants              |
|--------|---------------------------|
| HFC    | HFC-134a, HFC-410A, etc.  |
| CFC    | CFC-12, CFC-11            |
| HCFC   | HCFC-22                   |
| MIXED  | Mixed / uncertain          |

Wrong bin placement increases project emissions.

**Lab analysis phase:** A gas chromatography mini-game follows. Drag the red slider to match the peak on the GC graph. Accurate readings yield better moisture and contaminant results.

### Stage 3 — Transport (Arrow Keys)

Drive a truck 2000 m while dodging hazards across 3 lanes.

| Control | Action    |
|---------|-----------|
| Arrow Up   | Move up one lane   |
| Arrow Down | Move down one lane |

- **Potholes** cause a 1.5% leak.
- **Debris** causes a 3% leak.
- **Border inspections** check your documentation — provenance gaps from Stage 1 will fail the check.
- Cumulative leak above 10% triggers a **Leakage Penalty**.

### Stage 4 — Destruction (Arrow Keys)

Manage a high-temperature destruction chamber for each container.

| Control | Action              |
|---------|---------------------|
| Arrow Up   | Increase feed rate |
| Arrow Down | Decrease feed rate |

Keep the chamber temperature in the **green zone (850–1200 °C)** for at least 60 seconds. The feed rate (1–10) controls the target temperature.

- Temperature below 850 °C causes incomplete combustion — CO rises.
- Temperature above 1200 °C causes overheating — CO rises slightly.
- If CO stays above 100 mg/Nm³ for 15 seconds, a **diagnostic puzzle** triggers: click the faulty component (Burner Nozzle, Air Blower, Fuel Valve, or O₂ Sensor) to resume.
- A batch completes when dwell time reaches 60 s and DRE is at least 99.99%.

### Scorecard

After all containers are destroyed, you receive a GHG Statement showing:

- Baseline CO₂e (if the refrigerants had been vented)
- Project emissions (CO₂ from the destruction process)
- Net CO₂e reduction and carbon credits issued
- A grade: **A+** (>500 credits, no penalties), **B** (>200 credits), or **C** (<200 credits)

## Project Structure

```
src/
├── index.html              Entry point (loads Phaser 3 via CDN)
├── main.js                 Phaser config, game state, scene registry
├── stages/
│   ├── collection.js       Stage 1: field collection (Phaser Scene)
│   ├── aggregation.js      Stage 2: sorting + GC lab (Phaser Scene)
│   ├── transport.js        Stage 3: truck driving (Phaser Scene)
│   ├── destruction.js      Stage 4: chamber management (Phaser Scene)
│   └── transition.js       Inter-stage transition overlay (Phaser Scene)
├── ui/
│   ├── hud.js              HUD: DOM overlay for alerts/panels
│   └── scorecard.js        Final GHG statement (Phaser Scene)
└── data/
    └── refrigerants.js     Refrigerant metadata (GWP, eligibility)
```
