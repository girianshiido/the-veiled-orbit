export interface CollisionRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export function playerCollisionRect(x: number, y: number): CollisionRect {
  return { left: x + 2, top: y + 5, right: x + 10, bottom: y + 12 };
}

export function playerTerrainCollisionRect(x: number, y: number): CollisionRect {
  // Tile scenery only stops Ash at his feet. His head and torso may overlap a
  // facade while depth sorting still decides whether he appears before or
  // behind it, as in classic top-down RPGs.  Use the centre of his boots so
  // their wider artwork cannot catch on a building corner while he walks
  // parallel to its wall.
  return { left: x + 5, top: y + 13, right: x + 7, bottom: y + 16 };
}

export function playerDungeonTerrainCollisionRect(x: number, y: number): CollisionRect {
  // Dungeon walls are tile-built rather than depth-sorted facades.  Give them
  // a taller and wider collision body so Ash's torso cannot visibly enter a
  // wall, while still leaving enough room for a one-tile corridor.
  return { left: x + 1, top: y + 3, right: x + 11, bottom: y + 16 };
}

export function playerSceneryCollisionRect(x: number, y: number): CollisionRect {
  // Buildings have precise pixel footprints, so the full width of Ash's
  // boots can be used without catching on coarse tile corners.
  return { left: x + 3, top: y + 13, right: x + 12, bottom: y + 16 };
}

export function entityCollisionRect(x: number, y: number, spriteId?: string): CollisionRect {
  if (spriteId === "cradle-shuttle") return { left: x - 22, top: y - 10, right: x + 38, bottom: y + 16 };
  return { left: x + 2, top: y + 4, right: x + 14, bottom: y + 16 };
}

export function rectanglesOverlap(left: CollisionRect, right: CollisionRect): boolean {
  return left.left < right.right
    && left.right > right.left
    && left.top < right.bottom
    && left.bottom > right.top;
}

export function rectangleOverlapArea(left: CollisionRect, right: CollisionRect): number {
  const width = Math.max(0, Math.min(left.right, right.right) - Math.max(left.left, right.left));
  const height = Math.max(0, Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top));
  return width * height;
}

export function movementBlockedByRect(
  current: CollisionRect,
  next: CollisionRect,
  obstacle: CollisionRect,
): boolean {
  const nextOverlap = rectangleOverlapArea(next, obstacle);
  if (nextOverlap === 0) return false;
  const currentOverlap = rectangleOverlapArea(current, obstacle);
  if (currentOverlap === 0) return true;
  // If two actors have somehow become interlocked, allow only movements that
  // strictly reduce their overlap. This resolves the collision over several
  // frames without ever permitting either actor to push farther through.
  return nextOverlap >= currentOverlap;
}
