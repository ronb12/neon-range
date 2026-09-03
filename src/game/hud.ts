export class Hud {
  readonly scoreEl = document.querySelector("#score")!;
  readonly comboEl = document.querySelector("#combo")!;
  readonly timeEl = document.querySelector("#time")!;
  readonly bestEl = document.querySelector("#best")!;
  readonly accEl = document.querySelector("#acc")!;
  readonly overlay = document.querySelector("#overlay")!;
  readonly end = document.querySelector("#end")!;
  readonly endTitle = document.querySelector("#end-title")!;
  readonly endCopy = document.querySelector("#end-copy")!;
  readonly xrHint = document.querySelector("#xr-hint")!;
  readonly xrStatus = document.querySelector("#xr-status") as HTMLElement;
  readonly headsetBtn = document.querySelector("#headset") as HTMLButtonElement;
  readonly toast = document.querySelector("#toast") as HTMLElement;

  setPlaying(playing: boolean) {
    this.overlay.classList.toggle("hidden", playing);
    if (playing) this.end.classList.add("hidden");
    document.body.classList.toggle("playing", playing);
  }

  setStats(score: number, combo: number, time: number, best: number, accuracy: number) {
    this.scoreEl.textContent = String(score);
    this.comboEl.textContent = `x${combo}`;
    this.timeEl.textContent = String(Math.max(0, Math.ceil(time)));
    this.bestEl.textContent = String(best);
    this.accEl.textContent = `${accuracy}%`;
    document.body.classList.toggle("urgent", time > 0 && time <= 10);
  }

  showEnd(score: number, hits: number, shots: number, bestCombo: number, best: number, record: boolean) {
    this.end.classList.remove("hidden");
    this.endTitle.textContent = record
      ? "House record."
      : score >= 2800
        ? "Range ace."
        : score >= 1400
          ? "Clean run."
          : "Warm-up logged.";
    const acc = shots === 0 ? 0 : Math.round((hits / shots) * 100);
    this.endCopy.textContent = `${score} points · ${hits}/${shots} shots (${acc}%) · best combo x${bestCombo} · house best ${best}.`;
  }

  flash(text: string) {
    this.toast.textContent = text;
    this.toast.classList.add("show");
    window.setTimeout(() => this.toast.classList.remove("show"), 900);
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
      this.xrHint.textContent = "Headset is on this computer. Enter VR and the countdown starts in the HMD.";
    } else if (state === "presenting") {
      this.xrHint.textContent = "Trigger shoots. Gold plates pay more. Center hits pay extra.";
    } else if (state === "insecure") {
      this.xrHint.textContent = "Open this page as http://localhost or HTTPS, then click Enter VR.";
    } else if (state === "no-api") {
      this.xrHint.textContent = "Use Chrome or Edge with WebXR, not an embedded preview.";
    } else {
      this.xrHint.textContent =
        "Wake the headset in Meta Link, SteamVR, or OpenXR so Chrome can see it.";
    }
  }
}
