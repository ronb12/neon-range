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
      new THREE.PlaneGeometry(1.7, 0.85),
      new THREE.MeshBasicMaterial({ map: this.texture, transparent: true, side: THREE.DoubleSide }),
    );
    this.mesh.position.set(0, 1.35, -1.85);
    this.mesh.name = "world-menu";
    this.showIdle();
  }

  setVisible(visible: boolean) {
    this.mesh.visible = visible;
  }

  showIdle() {
    this.paint("SHOOT TO START", "Aim the laser. Squeeze trigger.");
  }

  showAgain(score: number) {
    this.paint("SHOOT TO GO AGAIN", `${score} on the board`);
  }

  private paint(title: string, sub: string) {
    const { ctx } = this;
    ctx.clearRect(0, 0, 1024, 512);
    ctx.fillStyle = "rgba(6, 14, 22, 0.88)";
    ctx.fillRect(24, 24, 976, 464);
    ctx.strokeStyle = "#39e7ff";
    ctx.lineWidth = 8;
    ctx.strokeRect(24, 24, 976, 464);
    ctx.fillStyle = "#8aa3b8";
    ctx.font = "32px sans-serif";
    ctx.fillText("HEADSET RANGE", 64, 120);
    ctx.fillStyle = "#e8f4ff";
    ctx.font = "bold 72px sans-serif";
    ctx.fillText(title, 64, 240);
    ctx.fillStyle = "#39e7ff";
    ctx.font = "36px sans-serif";
    ctx.fillText(sub, 64, 330);
    this.texture.needsUpdate = true;
  }
}
