/** @typedef {{x:number,y:number}} ScreenPoint */
/** @typedef {{x?:number,y?:number,width:number,height:number}} Viewport */
export const ISO_COS_30 = Math.sqrt(3) / 2;
export const ISO_SIN_30 = 0.5;
/** Reject invalid coordinates instead of propagating NaN into Canvas. @param {...number} values */
export function requireFinite(...values) {
  if (values.some((v) => typeof v !== "number" || !Number.isFinite(v)))
    throw new TypeError("Coordenada deve ser um número finito.");
}

/** Pure 30-degree projection. Origins and Z use screen pixels; X/Y use world units. */
export class IsoProjection {
  /** @param {number} worldX @param {number} worldY @param {number} [worldZ] @param {number} [originX] @param {number} [originY] @returns {ScreenPoint} */
  worldToScreen(worldX, worldY, worldZ = 0, originX = 0, originY = 0) {
    requireFinite(worldX, worldY, worldZ, originX, originY);
    return {
      x: (worldX - worldY) * ISO_COS_30 + originX,
      y: (worldX + worldY) * ISO_SIN_30 - worldZ + originY,
    };
  }
  /** Invert the projection on a known horizontal plane. @param {number} screenX @param {number} screenY @param {number} [groundZ] @param {number} [originX] @param {number} [originY] @returns {ScreenPoint} */
  screenToWorld(screenX, screenY, groundZ = 0, originX = 0, originY = 0) {
    requireFinite(screenX, screenY, groundZ, originX, originY);
    const a = (screenX - originX) / ISO_COS_30,
      b = (screenY - originY + groundZ) / ISO_SIN_30;
    return { x: (a + b) / 2, y: (b - a) / 2 };
  }
  /** @param {number} worldX @param {number} worldY @param {number} [worldZ] @param {number} [priorityOffset] @returns {number} */
  getDepthKey(worldX, worldY, worldZ = 0, priorityOffset = 0) {
    requireFinite(worldX, worldY, worldZ, priorityOffset);
    return worldX + worldY + worldZ * 0.001 + priorityOffset;
  }
  /** Point culling in the SAME screen space as viewport. @param {number} screenX @param {number} screenY @param {number} margin @param {Viewport} viewport @returns {boolean} */
  isWithinFrustum(screenX, screenY, margin, viewport) {
    requireFinite(
      screenX,
      screenY,
      margin,
      viewport?.width,
      viewport?.height,
      viewport?.x ?? 0,
      viewport?.y ?? 0,
    );
    if (margin < 0 || viewport.width < 0 || viewport.height < 0)
      throw new RangeError("Frustum inválido.");
    const x = viewport.x ?? 0,
      y = viewport.y ?? 0;
    return (
      screenX >= x - margin &&
      screenX <= x + viewport.width + margin &&
      screenY >= y - margin &&
      screenY <= y + viewport.height + margin
    );
  }
}
