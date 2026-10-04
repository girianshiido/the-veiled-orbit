import type { DialogueView } from "./DialogueSystem";

export class DialogueRenderer {
  private readonly ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D is unavailable.");
    this.ctx = context;
    this.ctx.imageSmoothingEnabled = false;
  }

  public render(view: DialogueView): void {
    const choiceHeight = view.choices.length > 0 ? view.choices.length * 12 + 7 : 0;
    const boxHeight = 59 + choiceHeight;
    const top = 236 - boxHeight;

    this.ctx.fillStyle = "rgba(4, 7, 17, .96)";
    this.ctx.fillRect(6, top, 308, boxHeight);
    this.ctx.strokeStyle = "#dce7f2";
    this.ctx.strokeRect(6.5, top + 0.5, 307, boxHeight - 1);
    this.ctx.strokeStyle = "#536985";
    this.ctx.strokeRect(9.5, top + 3.5, 301, boxHeight - 7);

    this.ctx.fillStyle = "#78e0c2";
    this.ctx.font = "bold 8px monospace";
    this.ctx.fillText(view.speaker, 17, top + 15);

    this.ctx.fillStyle = "#edf2f7";
    this.ctx.font = "9px monospace";
    const finalTextY = this.wrapText(view.text, 17, top + 29, 286, 11, 3);

    if (view.choices.length > 0) {
      view.choices.forEach((choice, index) => {
        const y = finalTextY + 17 + index * 12;
        this.ctx.fillStyle = index === view.selectedChoice ? "#e9cf6a" : "#aab6c8";
        this.ctx.fillText(index === view.selectedChoice ? "▶" : "·", 18, y);
        this.ctx.fillText(choice.label, 31, y);
      });
    } else if (view.complete) {
      this.ctx.fillStyle = "#78e0c2";
      this.ctx.fillText("▼", 297, top + boxHeight - 10);
    }
  }

  private wrapText(
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
    maxLines: number,
  ): number {
    const words = text.split(" ");
    let line = "";
    let lineY = y;
    let lines = 1;
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (this.ctx.measureText(candidate).width > maxWidth && line) {
        this.ctx.fillText(line, x, lineY);
        if (lines >= maxLines) return lineY;
        line = word;
        lineY += lineHeight;
        lines += 1;
      } else {
        line = candidate;
      }
    }
    if (line) this.ctx.fillText(line, x, lineY);
    return lineY;
  }
}
