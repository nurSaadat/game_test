// Based on HFC & ODS Destruction Protocol v1.0, Section 4 (Applicability)
// and IPCC AR6 GWP-100 values

export const REFRIGERANTS = [
  // HFCs (Montreal Protocol Annex F, Group I)
  { id: "HFC-134a",  type: "HFC",  GWP: 1530,  eligible: true,  colour: "#4FC3F7" },
  { id: "HFC-410A",  type: "HFC",  GWP: 2088,  eligible: true,  colour: "#29B6F6" },
  { id: "HFC-404A",  type: "HFC",  GWP: 3922,  eligible: true,  colour: "#0288D1" },
  { id: "HFC-23",    type: "HFC",  GWP: 14600, eligible: true,  colour: "#01579B" },
  // CFCs (Annex A Group I, Annex B Group I)
  { id: "CFC-12",    type: "CFC",  GWP: 10200, eligible: true,  colour: "#A5D6A7" },
  { id: "CFC-11",    type: "CFC",  GWP: 4750,  eligible: true,  colour: "#66BB6A" },
  // HCFCs (Annex C Group I)
  { id: "HCFC-22",   type: "HCFC", GWP: 1960,  eligible: true,  colour: "#FFA726" },
  // INELIGIBLE (red herring items in collection stage)
  { id: "CO2-R744",  type: "OTHER", GWP: 1,    eligible: false, colour: "#EF9A9A" },
  { id: "Ammonia",   type: "OTHER", GWP: 0,    eligible: false, colour: "#CE93D8" },
];

// Default substitute refrigerant for leakage calc (Protocol Section 7.3.4)
export const DEFAULT_SUBSTITUTE = { id: "HFC-134a", GWP: 1530 };
export const DEFAULT_ANNUAL_LEAK_RATE = 0.137; // 13.7% per Protocol
export const CREDITING_PERIOD_YEARS  = 10;
