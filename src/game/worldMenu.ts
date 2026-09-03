import * as THREE from "three";

export class WorldMenu {
  readonly mesh: THREE.Mesh;
  readonly texture: THREE.CanvasTexture;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = 1024;
    this.canvas.height = 512;
    this.ctx = this.canvas.getContext("2d")!;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.8, 0.9),
      new THREE.MeshBasicMaterial({ map: this.texture, transparent: true, side: THREE.DoubleSide }),
    );
    this.mesh.position.set(0, 1.35, -1.85);
    this.mesh.name = "world-menu";
    this.showIdle(0);
  }

  setVisible(visible: boolean) {
    this.mesh.visible = visible;
  }

  showIdle(best: number) {
    this.paint("SHOOT TO START", best > 0 ? `House best ${best}` : "Cyan hits. Gold pays. Center pays more.");
  }

  showCountdown(n: number) {
    this.paint(n > 0 ? String(n) : "LIVE", n > 0 ? "Hold still. Then clear the plates." : "Trigger is live.");
  }

  showAgain(score: number, best: number, record: boolean) {
    this.paint(
      "SHOOT TO GO AGAIN",
      record ? `New house best ${best}` : `${score} this run · best ${best}`,
    );
  }

  private paint(title: string, sub: string) {
    const { ctx } = this;
    ctx.clearRect(0, 0, 1024, 512);
    ctx.fillStyle = "rgba(6, 14, 22, 0.9)";
    ctx.fillRect(24, 24, 976, 464);
    ctx.strokeStyle = "#39e7ff";
    ctx.lineWidth = 8;
    ctx.strokeRect(24, 24, 976, 464);
    ctx.fillStyle = "#8aa3b8";
    ctx.font = "32px sans-serif";
    ctx.fillText("NEON RANGE", 64, 110);
    ctx.fillStyle = "#e8f4ff";
    ctx.font = title.length < 4 ? "bold 160px sans-serif" : "bold 64px sans-serif";
    ctx.fillText(title, 64, 270);
    ctx.fillStyle = "#39e7ff";
    ctx.font = "34px sans-serif";
    ctx.fillText(sub, 64, 360);
    this.texture.needsUpdate = true;
  }
}
