# CryoDestroy: Refrigerant Rescue

An educational strategy game about refrigerant destruction and carbon credit generation. Guide refrigerant containers through a 4-stage chain of custody — from field collection to high-temperature destruction — and earn carbon credits based on your performance.

Built with vanilla JavaScript and the HTML5 Canvas API. No external dependencies.

## Getting Started

1. Open `src/index.html` in a modern web browser.

That's it — no install, no build step.

**Dev shortcut:** Jump to a specific stage with a URL parameter:

```
index.html?stage=AGGREGATION
index.html?stage=TRANSPORT
index.html?stage=DESTRUCTION
index.html?stage=SCORECARD
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
├── index.html              Entry point (900x600 canvas)
├── main.js                 Game loop, stage manager, transitions
├── stages/
│   ├── collection.js       Stage 1: field collection + form validation
│   ├── aggregation.js      Stage 2: sorting + GC lab analysis
│   ├── transport.js        Stage 3: truck driving mini-game
│   └── destruction.js      Stage 4: chamber temperature management
├── ui/
│   ├── hud.js              HUD, alerts, overlay manager
│   └── scorecard.js        Final GHG statement + grading
└── data/
    └── refrigerants.js     Refrigerant metadata (GWP, eligibility)
```
