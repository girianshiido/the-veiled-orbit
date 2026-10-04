export class GameLoop {
  private previousTime = 0;
  private frameRequest = 0;

  constructor(
    private readonly update: (deltaSeconds: number) => void,
    private readonly render: () => void,
  ) {}

  public start(): void {
    this.previousTime = performance.now();
    this.frameRequest = requestAnimationFrame(this.tick);
  }

  public stop(): void {
    cancelAnimationFrame(this.frameRequest);
  }

  private readonly tick = (time: number): void => {
    const deltaSeconds = Math.min((time - this.previousTime) / 1000, 1 / 20);
    this.previousTime = time;
    this.update(deltaSeconds);
    this.render();
    this.frameRequest = requestAnimationFrame(this.tick);
  };
}
