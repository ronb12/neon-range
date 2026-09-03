export class RangeAudio {
  private ctx: AudioContext | null = null;

  private ensure() {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  tone(freq: number, duration: number, type: OscillatorType, gain = 0.08, slide = 0) {
    const ctx = this.ensure();
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), ctx.currentTime + duration);
    amp.gain.setValueAtTime(gain, ctx.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(amp);
    amp.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  fire() {
    this.tone(880, 0.05, "square", 0.035, -420);
    this.tone(190, 0.07, "sawtooth", 0.02);
  }

  hit(combo: number, bullseye: boolean) {
    this.tone(520 + combo * 36, 0.11, "triangle", 0.09);
    if (bullseye) this.tone(980, 0.14, "sine", 0.06);
    if (combo === 5 || combo === 8 || combo === 12) this.tone(660, 0.22, "square", 0.05);
  }

  gold() {
    this.tone(740, 0.16, "triangle", 0.08);
    this.tone(1100, 0.12, "sine", 0.05);
  }

  miss() {
    this.tone(128, 0.1, "sawtooth", 0.028, -40);
  }

  count(n: number) {
    this.tone(n === 0 ? 620 : 280 + n * 40, n === 0 ? 0.22 : 0.12, "sine", 0.07);
  }

  end() {
    this.tone(330, 0.18, "sine", 0.05);
    this.tone(220, 0.28, "triangle", 0.04, -80);
  }

  record() {
    this.tone(520, 0.12, "sine", 0.06);
    this.tone(780, 0.2, "triangle", 0.05);
  }
}
