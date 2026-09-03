export class RangeAudio {
  private ctx: AudioContext | null = null;

  private ensure() {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  tone(freq: number, duration: number, type: OscillatorType, gain = 0.08) {
    const ctx = this.ensure();
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    amp.gain.setValueAtTime(gain, ctx.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(amp);
    amp.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  fire() {
    this.tone(740, 0.07, "square", 0.04);
  }

  hit(combo: number) {
    this.tone(520 + combo * 40, 0.12, "triangle", 0.09);
  }

  miss() {
    this.tone(140, 0.08, "sawtooth", 0.03);
  }

  end() {
    this.tone(330, 0.2, "sine", 0.06);
  }
}
