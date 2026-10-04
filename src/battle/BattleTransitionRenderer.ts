export type BattleTransitionPhase = "enter" | "exit";

const WIDTH = 320;
const HEIGHT = 240;

export class BattleTransitionRenderer {
  private readonly ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D is unavailable.");
    this.ctx = context;
  }

  public render(phase: BattleTransitionPhase, progress: number): void {
    const clamped = Math.max(0, Math.min(1, progress));
    const coverage = phase === "enter" ? clamped : 1 - clamped;
    const eased = coverage * coverage * (3 - 2 * coverage);

    this.ctx.save();
    this.ctx.fillStyle = `rgba(3, 7, 18, ${eased * 0.42})`;
    this.ctx.fillRect(0, 0, WIDTH, HEIGHT);

    for (let row = 0; row < 30; row += 1) {
      const y = row * 8;
      const stagger = ((row * 17) % 23) / 23 * 0.13;
      const rowCoverage = Math.max(0, Math.min(1, eased * 1.13 - stagger));
      const width = Math.ceil(WIDTH * rowCoverage);
      const x = row % 2 === 0 ? 0 : WIDTH - width;
      this.ctx.fillStyle = row % 3 === 0 ? "#07111d" : "#050a16";
      this.ctx.fillRect(x, y, width, 8);
    }

    if (coverage > 0.03 && coverage < 0.98) {
      const scanY = phase === "enter"
        ? Math.round(clamped * HEIGHT)
        : Math.round((1 - clamped) * HEIGHT);
      this.ctx.fillStyle = "rgba(117, 224, 210, .82)";
      this.ctx.fillRect(0, scanY, WIDTH, 1);
      this.ctx.fillStyle = "rgba(117, 224, 210, .18)";
      this.ctx.fillRect(0, scanY - 3, WIDTH, 7);
    }

    this.ctx.restore();
  }
}
