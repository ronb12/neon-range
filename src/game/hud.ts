export class Hud {
  readonly scoreEl = document.querySelector("#score")!;
  readonly comboEl = document.querySelector("#combo")!;
  readonly timeEl = document.querySelector("#time")!;
  readonly overlay = document.querySelector("#overlay")!;
  readonly end = document.querySelector("#end")!;
  readonly endTitle = document.querySelector("#end-title")!;
  readonly endCopy = document.querySelector("#end-copy")!;
  readonly xrHint = document.querySelector("#xr-hint")!;
  readonly vrSlot = document.querySelector("#vr-slot")!;

  setPlaying(playing: boolean) {
    this.overlay.classList.toggle("hidden", playing);
    if (playing) this.end.classList.add("hidden");
  }

  setStats(score: number, combo: number, time: number) {
    this.scoreEl.textContent = String(score);
    this.comboEl.textContent = `x${combo}`;
    this.timeEl.textContent = String(Math.max(0, Math.ceil(time)));
  }

  showEnd(score: number, hits: number, bestCombo: number) {
    this.end.classList.remove("hidden");
    this.endTitle.textContent =
      score >= 2400 ? "Range ace." : score >= 1200 ? "Clean run." : "Warm-up logged.";
    this.endCopy.textContent = `${score} points · ${hits} hits · best combo x${bestCombo}. Same loop, tighter aim.`;
  }

  setXrHint(supported: boolean) {
    this.xrHint.textContent = supported
      ? "WebXR is available. Enter VR for controller lasers."
      : "No headset on this device — desktop click-to-shoot is live.";
  }
}
