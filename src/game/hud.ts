export class Hud {
  readonly scoreEl = document.querySelector("#score")!;
  readonly comboEl = document.querySelector("#combo")!;
  readonly timeEl = document.querySelector("#time")!;
  readonly overlay = document.querySelector("#overlay")!;
  readonly end = document.querySelector("#end")!;
  readonly endTitle = document.querySelector("#end-title")!;
  readonly endCopy = document.querySelector("#end-copy")!;
  readonly xrHint = document.querySelector("#xr-hint")!;
  readonly xrStatus = document.querySelector("#xr-status") as HTMLElement;
  readonly headsetBtn = document.querySelector("#headset") as HTMLButtonElement;

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

  setHeadsetState(
    state: "checking" | "ready" | "presenting" | "unsupported" | "insecure" | "no-api",
    detail?: string,
  ) {
    const labels = {
      checking: "Looking for a headset…",
      ready: "Headset connected",
      presenting: "Inside the headset",
      unsupported: "No headset on this browser",
      insecure: "Needs localhost or HTTPS",
      "no-api": "This browser has no WebXR",
    };
    this.xrStatus.textContent = labels[state];
    this.xrStatus.dataset.state = state;
    this.headsetBtn.disabled = state === "presenting" || state === "checking";
    this.headsetBtn.textContent = state === "presenting" ? "In headset" : "Enter VR";

    if (detail) {
      this.xrHint.textContent = detail;
      return;
    }
    if (state === "ready") {
      this.xrHint.textContent =
        "Headset is on this computer. Click Enter VR — the range starts in the HMD.";
    } else if (state === "presenting") {
      this.xrHint.textContent = "Look forward. Trigger shoots. Score is on the far board.";
    } else if (state === "insecure") {
      this.xrHint.textContent = "Open this page as http://localhost or HTTPS, then click Enter VR.";
    } else if (state === "no-api") {
      this.xrHint.textContent = "Use Chrome or Edge with WebXR, not an embedded preview.";
    } else {
      this.xrHint.textContent =
        "Wake the headset in Meta Link, SteamVR, or OpenXR so Chrome can see it. Quest Browser also works over HTTPS.";
    }
  }
}
