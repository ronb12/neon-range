const FILES = {
  laser0: "/assets/audio/laserSmall_000.ogg",
  laser1: "/assets/audio/laserSmall_001.ogg",
  laser2: "/assets/audio/laserSmall_002.ogg",
  laserGold: "/assets/audio/laserLarge_000.ogg",
  hit0: "/assets/audio/impactMetal_000.ogg",
  hit1: "/assets/audio/impactMetal_001.ogg",
  hit2: "/assets/audio/impactMetal_002.ogg",
  boom: "/assets/audio/explosionCrunch_000.ogg",
} as const;

type Cue = keyof typeof FILES;

export class RangeAudio {
  private ctx: AudioContext | null = null;
  private buffers = new Map<Cue, AudioBuffer>();
  private ready = false;

  private ensure() {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  async load() {
    this.ensure();
    await Promise.all(
      (Object.keys(FILES) as Cue[]).map(async (key) => {
        const res = await fetch(FILES[key]);
        const raw = await res.arrayBuffer();
        const buf = await this.ensure().decodeAudioData(raw.slice(0));
        this.buffers.set(key, buf);
      }),
    );
    this.ready = true;
  }

  private play(cue: Cue, volume = 0.45, rate = 1) {
    if (!this.ready) return;
    const ctx = this.ensure();
    const buffer = this.buffers.get(cue);
    if (!buffer) return;
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    src.buffer = buffer;
    src.playbackRate.value = rate;
    gain.gain.value = volume;
    src.connect(gain);
    gain.connect(ctx.destination);
    src.start();
  }

  fire() {
    const n = Math.floor(Math.random() * 3) as 0 | 1 | 2;
    this.play((["laser0", "laser1", "laser2"] as const)[n], 0.38, 0.96 + Math.random() * 0.1);
  }

  hit(combo: number, bullseye: boolean) {
    const n = Math.floor(Math.random() * 3) as 0 | 1 | 2;
    this.play((["hit0", "hit1", "hit2"] as const)[n], bullseye ? 0.55 : 0.42, 1 + combo * 0.02);
  }

  gold() {
    this.play("laserGold", 0.4, 1.08);
    this.play("hit0", 0.35, 1.2);
  }

  miss() {
    this.play("hit2", 0.18, 0.7);
  }

  count(n: number) {
    this.play(n === 0 ? "laserGold" : "laser0", 0.28, n === 0 ? 0.7 : 0.85 + n * 0.05);
  }

  end() {
    this.play("boom", 0.32, 0.85);
  }

  record() {
    this.play("laserGold", 0.4, 0.8);
    this.play("hit0", 0.3, 1.4);
  }

  decoy() {
    this.play("boom", 0.22, 1.3);
  }
}
