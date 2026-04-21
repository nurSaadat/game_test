// Heads-up display — manages DOM overlay elements
export class HUD {
  constructor() {
    this._stageName  = document.getElementById("stageName");
    this._co2score   = document.getElementById("co2score");
    this._overlay    = document.getElementById("overlay");
    this._alertTimer = null;
  }

  update(stageName, score) {
    this._stageName.textContent = stageName;
    this._co2score.textContent  = score.netCO2eReduction.toFixed(1);
  }

  showAlert(message, durationMs = 2500) {
    clearTimeout(this._alertTimer);
    this._overlay.innerHTML = `
      <div style="
        position:fixed; bottom:90px; left:50%; transform:translateX(-50%);
        background:#f85149; color:#fff; padding:10px 20px; border-radius:6px;
        font-family:monospace; font-size:13px; z-index:200; max-width:600px;
        text-align:center; box-shadow:0 4px 12px rgba(0,0,0,0.5);
      ">${message}</div>`;
    this._alertTimer = setTimeout(() => this.clearOverlay(), durationMs);
  }

  showSuccess(message, durationMs = 2000) {
    clearTimeout(this._alertTimer);
    this._overlay.innerHTML = `
      <div style="
        position:fixed; bottom:90px; left:50%; transform:translateX(-50%);
        background:#3fb950; color:#fff; padding:10px 20px; border-radius:6px;
        font-family:monospace; font-size:13px; z-index:200; max-width:600px;
        text-align:center; box-shadow:0 4px 12px rgba(0,0,0,0.5);
      ">${message}</div>`;
    this._alertTimer = setTimeout(() => this.clearOverlay(), durationMs);
  }

  // Show a persistent panel (form, modal) — caller must clear manually
  showPanel(htmlString) {
    clearTimeout(this._alertTimer);
    this._overlay.innerHTML = htmlString;
  }

  clearOverlay() {
    clearTimeout(this._alertTimer);
    this._overlay.innerHTML = "";
  }
}
