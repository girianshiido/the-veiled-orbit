import type { LoadedMap, PlayerState } from "../types/game";

const VIEW_WIDTH = 320;
const VIEW_HEIGHT = 240;
const HORIZONTAL_DEAD_ZONE = 92;
const VERTICAL_DEAD_ZONE = 68;

export interface CameraPosition {
  x: number;
  y: number;
}

export class WorldCamera {
  private x = 0;
  private y = 0;
  private mapId = "";

  public follow(map: LoadedMap, player: PlayerState): CameraPosition {
    const focusX = player.x + 6;
    const focusY = player.y + 10;
    if (this.mapId !== map.id) {
      this.mapId = map.id;
      this.x = focusX - VIEW_WIDTH / 2;
      this.y = focusY - VIEW_HEIGHT / 2;
    } else {
      const screenX = focusX - this.x;
      const screenY = focusY - this.y;
      if (screenX < HORIZONTAL_DEAD_ZONE) this.x = focusX - HORIZONTAL_DEAD_ZONE;
      if (screenX > VIEW_WIDTH - HORIZONTAL_DEAD_ZONE) this.x = focusX - (VIEW_WIDTH - HORIZONTAL_DEAD_ZONE);
      if (screenY < VERTICAL_DEAD_ZONE) this.y = focusY - VERTICAL_DEAD_ZONE;
      if (screenY > VIEW_HEIGHT - VERTICAL_DEAD_ZONE) this.y = focusY - (VIEW_HEIGHT - VERTICAL_DEAD_ZONE);
    }

    const maximumX = Math.max(0, map.width * map.tileWidth - VIEW_WIDTH);
    const maximumY = Math.max(0, map.height * map.tileHeight - VIEW_HEIGHT);
    this.x = Math.max(0, Math.min(this.x, maximumX));
    this.y = Math.max(0, Math.min(this.y, maximumY));
    return { x: Math.round(this.x), y: Math.round(this.y) };
  }
}
