import type { PlayerState } from "../types/game";

const FOLLOW_DISTANCE = 14;
const MAX_TRAIL_POINTS = 192;

function snapshot(player: PlayerState): PlayerState {
  return {
    x: player.x,
    y: player.y,
    direction: player.direction,
    frame: player.frame,
    animationTime: player.animationTime,
  };
}

export class EscortTrail {
  private points: PlayerState[] = [];

  public reset(player: PlayerState): void {
    const previous = snapshot(player);
    if (player.direction === "up") previous.y += FOLLOW_DISTANCE;
    else if (player.direction === "down") previous.y -= FOLLOW_DISTANCE;
    else if (player.direction === "left") previous.x += FOLLOW_DISTANCE;
    else previous.x -= FOLLOW_DISTANCE;
    this.points = [previous, snapshot(player)];
  }

  public record(player: PlayerState): void {
    const latest = this.points[this.points.length - 1];
    if (!latest) {
      this.reset(player);
      return;
    }
    if (Math.hypot(player.x - latest.x, player.y - latest.y) < 0.01) return;
    this.points.push(snapshot(player));
    if (this.points.length > MAX_TRAIL_POINTS) this.points.splice(0, this.points.length - MAX_TRAIL_POINTS);
  }

  public follower(active: boolean): PlayerState | null {
    if (!active || this.points.length === 0) return null;
    let travelled = 0;
    for (let index = this.points.length - 2; index >= 0; index -= 1) {
      const point = this.points[index];
      const next = this.points[index + 1];
      if (!point || !next) continue;
      travelled += Math.hypot(next.x - point.x, next.y - point.y);
      if (travelled >= FOLLOW_DISTANCE) return snapshot(point);
    }
    return snapshot(this.points[0]!);
  }
}
