import type { FrontEndView } from "./FrontEndSystem";

const WIDTH = 320;
const HEIGHT = 240;

export class FrontEndRenderer {
  private readonly ctx: CanvasRenderingContext2D;

  public constructor(canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D is unavailable.");
    this.ctx = context;
    this.ctx.imageSmoothingEnabled = false;
  }

  public render(view: FrontEndView): void {
    this.drawOrbitBackground();
    if (view.mode === "game-over") this.drawGameOver(view.message);
    else if (view.mode === "continue") this.drawContinue(view);
    else if (view.mode === "intro") this.drawIntro(view);
    else if (view.mode === "loading") this.drawLoading(view.message);
    else this.drawTitle(view);
    this.drawScanlines();
  }

  private drawOrbitBackground(): void {
    this.ctx.fillStyle = "#040716";
    this.ctx.fillRect(0, 0, WIDTH, HEIGHT);
    this.ctx.fillStyle = "#78e0c2";
    for (let index = 0; index < 38; index += 1) {
      const x = (index * 47 + 13) % WIDTH;
      const y = (index * 29 + 11) % 136;
      this.ctx.fillRect(x, y, index % 7 === 0 ? 2 : 1, 1);
    }
    this.ctx.strokeStyle = "#263273";
    for (let y = 146; y < HEIGHT; y += 13) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y + 0.5);
      this.ctx.lineTo(WIDTH, y + 0.5);
      this.ctx.stroke();
    }
    for (let x = -160; x <= 480; x += 32) {
      this.ctx.beginPath();
      this.ctx.moveTo(160, 138);
      this.ctx.lineTo(x, HEIGHT);
      this.ctx.stroke();
    }
    this.ctx.strokeStyle = "#78e0c2";
    this.ctx.beginPath();
    this.ctx.arc(160, 89, 50, 0.16, Math.PI * 1.6);
    this.ctx.stroke();
    this.ctx.strokeStyle = "#d5b5ff";
    this.ctx.beginPath();
    this.ctx.arc(160, 89, 36, Math.PI * 0.9, Math.PI * 2.25);
    this.ctx.stroke();
  }

  private drawTitle(view: FrontEndView): void {
    this.ctx.textAlign = "center";
    this.ctx.fillStyle = "#78e0c2";
    this.ctx.font = "bold 9px monospace";
    this.ctx.fillText("ENGINE PROTOTYPE · 35", 160, 24);
    this.ctx.fillStyle = "#f0f4ff";
    this.ctx.font = "bold 22px monospace";
    this.ctx.fillText("THE VEILED", 160, 60);
    this.ctx.fillText("ORBIT", 160, 84);
    this.ctx.fillStyle = "#8d9cb2";
    this.ctx.font = "7px monospace";
    this.ctx.fillText("A SCIENCE-FANTASY JOURNEY", 160, 105);
    this.ctx.textAlign = "left";
    view.titleChoices.forEach((choice, index) => {
      const y = 162 + index * 24;
      this.ctx.fillStyle = index === view.selectedChoice ? "#e9cf6a" : "#dbe4ef";
      this.ctx.font = "bold 10px monospace";
      this.ctx.fillText(index === view.selectedChoice ? "▶" : "·", 104, y);
      this.ctx.fillText(choice, 124, y);
    });
    this.drawMessage(view.message, "▲▼ SELECT · A CONFIRM");
  }

  private drawContinue(view: FrontEndView): void {
    this.drawPanelTitle("CONTINUE");
    view.slots.forEach((slot, index) => {
      const y = 78 + index * 32;
      this.ctx.fillStyle = index === view.selectedSlot ? "#e9cf6a" : slot.savedAt === null ? "#596579" : "#dbe4ef";
      this.ctx.font = "bold 9px monospace";
      this.ctx.fillText(index === view.selectedSlot ? "▶" : "·", 62, y);
      this.ctx.fillText(`SLOT ${slot.slot}`, 79, y);
      this.ctx.font = "7px monospace";
      this.ctx.fillText(slot.savedAt === null ? "EMPTY" : this.formatTimestamp(slot.savedAt), 144, y);
    });
    this.drawMessage(view.message, "▲▼ SLOT · A LOAD · B BACK");
  }

  private drawGameOver(message: string): void {
    this.ctx.fillStyle = "rgba(5, 3, 12, .72)";
    this.ctx.fillRect(0, 0, WIDTH, HEIGHT);
    this.ctx.textAlign = "center";
    this.ctx.fillStyle = "#e5a0b5";
    this.ctx.font = "bold 24px monospace";
    this.ctx.fillText("GAME OVER", 160, 105);
    this.ctx.fillStyle = "#aeb9c9";
    this.ctx.font = "7px monospace";
    this.ctx.fillText(message.toUpperCase(), 160, 128);
    this.ctx.fillStyle = "#e9cf6a";
    this.ctx.font = "bold 8px monospace";
    this.ctx.fillText("PRESS A", 160, 164);
    this.ctx.textAlign = "left";
  }

  private drawIntro(view: FrontEndView): void {
    this.ctx.fillStyle = "rgba(3, 6, 16, .84)";
    this.ctx.fillRect(18, 56, 284, 128);
    this.ctx.strokeStyle = "#8398b5";
    this.ctx.strokeRect(18.5, 56.5, 283, 127);
    this.ctx.strokeStyle = "#354660";
    this.ctx.strokeRect(22.5, 60.5, 275, 119);
    this.ctx.fillStyle = "#78e0c2";
    this.ctx.font = "bold 9px monospace";
    this.ctx.fillText("ASH", 34, 79);
    this.ctx.fillStyle = "#dbe4ef";
    this.ctx.font = "9px monospace";
    this.wrapText(view.introPages[view.introPage] ?? "", 34, 101, 250, 15);
    this.ctx.fillStyle = "#728198";
    this.ctx.font = "7px monospace";
    this.ctx.fillText(`${view.introPage + 1} / ${view.introPages.length}`, 264, 168);
    this.drawMessage("THE STORY BEGINS", "A · CONTINUE");
  }

  private drawLoading(message: string): void {
    this.drawPanelTitle("ACCESSING MEMORY");
    this.ctx.textAlign = "center";
    this.ctx.fillStyle = "#dbe4ef";
    this.ctx.font = "8px monospace";
    this.ctx.fillText(message.toUpperCase(), 160, 116);
    this.ctx.textAlign = "left";
  }

  private drawPanelTitle(title: string): void {
    this.ctx.fillStyle = "rgba(5, 9, 20, .94)";
    this.ctx.fillRect(43, 31, 234, 154);
    this.ctx.strokeStyle = "#8398b5";
    this.ctx.strokeRect(43.5, 31.5, 233, 153);
    this.ctx.strokeStyle = "#354660";
    this.ctx.strokeRect(47.5, 35.5, 225, 145);
    this.ctx.textAlign = "center";
    this.ctx.fillStyle = "#78e0c2";
    this.ctx.font = "bold 12px monospace";
    this.ctx.fillText(title, 160, 55);
    this.ctx.textAlign = "left";
  }

  private drawMessage(message: string, controls: string): void {
    this.ctx.fillStyle = "rgba(5, 9, 20, .92)";
    this.ctx.fillRect(16, 205, 288, 26);
    this.ctx.strokeStyle = "#526784";
    this.ctx.strokeRect(16.5, 205.5, 287, 25);
    this.ctx.textAlign = "center";
    this.ctx.fillStyle = "#dbe4ef";
    this.ctx.font = "7px monospace";
    this.ctx.fillText(message.toUpperCase(), 160, 216);
    this.ctx.fillStyle = "#73839a";
    this.ctx.fillText(controls, 160, 226);
    this.ctx.textAlign = "left";
  }

  private formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  private wrapText(text: string, x: number, y: number, maxWidth: number, lineHeight: number): void {
    const words = text.split(" ");
    let line = "";
    let lineY = y;
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && this.ctx.measureText(candidate).width > maxWidth) {
        this.ctx.fillText(line, x, lineY);
        line = word;
        lineY += lineHeight;
      } else line = candidate;
    }
    if (line) this.ctx.fillText(line, x, lineY);
  }

  private drawScanlines(): void {
    this.ctx.fillStyle = "rgba(3, 7, 16, .07)";
    for (let y = 0; y < HEIGHT; y += 2) this.ctx.fillRect(0, y, WIDTH, 1);
  }
}
