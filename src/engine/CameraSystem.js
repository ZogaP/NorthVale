function finite(value, name) {
  if (!Number.isFinite(value)) throw new TypeError(`${name} must be finite.`);
  return value;
}
function positive(value, name) {
  if (finite(value, name) <= 0)
    throw new RangeError(`${name} must be positive.`);
  return value;
}
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/**
 * Isometric camera, independent of Canvas, DOM and the animation loop.
 * Targets use world X/Y/Z; camera x/y use projected, unscaled world pixels.
 * Width/height and screen coordinates use logical pixels, before devicePixelRatio.
 */
export class CameraSystem {
  constructor({
    width = 1440,
    height = 900,
    x = 0,
    y = 0,
    minZoom = 1.2,
    maxZoom = 2.6,
    defaultZoom = 1.9,
    zoom = defaultZoom,
    trackingSpeed = 4.5,
    zoomSpeed = 8,
    lookAheadDistance = 40,
    projectionX = 1,
    projectionY = 0.5,
    baseScale = 1,
  } = {}) {
    this.width = positive(width, "width");
    this.height = positive(height, "height");
    this.x = finite(x, "x");
    this.y = finite(y, "y");
    this.minZoom = positive(minZoom, "minZoom");
    this.maxZoom = positive(maxZoom, "maxZoom");
    if (minZoom > maxZoom) throw new RangeError("Invalid zoom limits.");
    this.defaultZoom = clamp(
      finite(defaultZoom, "defaultZoom"),
      minZoom,
      maxZoom,
    );
    this.zoom = this.targetZoom = clamp(finite(zoom, "zoom"), minZoom, maxZoom);
    this.trackingSpeed = positive(trackingSpeed, "trackingSpeed");
    this.zoomSpeed = positive(zoomSpeed, "zoomSpeed");
    this.lookAheadDistance = finite(lookAheadDistance, "lookAheadDistance");
    if (lookAheadDistance < 0)
      throw new RangeError("Invalid look-ahead distance.");
    this.projectionX = positive(projectionX, "projectionX");
    this.projectionY = positive(projectionY, "projectionY");
    this.baseScale = positive(baseScale, "baseScale");
    this.offset = { x: 0, y: 0 };
  }
  get scale() {
    return this.baseScale * this.zoom;
  }

  resize(width, height, baseScale = this.baseScale) {
    positive(width, "width");
    positive(height, "height");
    positive(baseScale, "baseScale");
    this.width = width;
    this.height = height;
    this.baseScale = baseScale;
  }
  project(x, y, z = 0) {
    finite(x, "x");
    finite(y, "y");
    finite(z, "z");
    return { x: (x - y) * this.projectionX, y: (x + y) * this.projectionY - z };
  }
  unproject(isoX, isoY, groundZ = 0) {
    finite(isoX, "isoX");
    finite(isoY, "isoY");
    finite(groundZ, "groundZ");
    const a = isoX / this.projectionX,
      b = (isoY + groundZ) / this.projectionY;
    return { x: (a + b) / 2, y: (b - a) / 2 };
  }
  setProjection(projectionX, projectionY = 0.5) {
    positive(projectionX, "projectionX");
    positive(projectionY, "projectionY");
    const center = this.unproject(this.x, this.y);
    this.projectionX = projectionX;
    this.projectionY = projectionY;
    Object.assign(this, this.project(center.x, center.y));
  }
  snapTo(target, { resetZoom = false } = {}) {
    Object.assign(this, this.project(target.x, target.y, target.z ?? 0));
    this.offset = { x: 0, y: 0 };
    if (resetZoom) this.setZoom(this.defaultZoom, { immediate: true });
  }
  setZoom(value, { immediate = false } = {}) {
    this.targetZoom = clamp(finite(value, "zoom"), this.minZoom, this.maxZoom);
    if (immediate) this.zoom = this.targetZoom;
    return this.targetZoom;
  }
  /** Host registers one non-passive wheel listener and removes it on destroy. */
  handleWheel({ deltaY, deltaMode = 0 }) {
    finite(deltaY, "deltaY");
    if (![0, 1, 2].includes(deltaMode))
      throw new RangeError("Invalid wheel deltaMode.");
    if (deltaY === 0) return false;
    const pixels = clamp(
      deltaY * (deltaMode === 1 ? 16 : deltaMode === 2 ? this.height : 1),
      -1000,
      1000,
    );
    this.setZoom(this.targetZoom * Math.exp(-pixels * 0.0015));
    return true;
  }
  /** Real seconds, never game minutes. Velocity/aim determine a bounded world offset. */
  update(dt, target, { aimDirection = null, lookAhead = true } = {}) {
    finite(dt, "dt");
    if (dt < 0) throw new RangeError("Negative camera dt.");
    const p = this.project(target.x, target.y, target.z ?? 0);
    let dx = 0,
      dy = 0;
    if (lookAhead) {
      dx = finite(aimDirection?.x ?? target.vx ?? 0, "direction x");
      dy = finite(aimDirection?.y ?? target.vy ?? 0, "direction y");
    }
    if (dt === 0) return;
    dt = Math.min(dt, 0.1);
    const length = Math.hypot(dx, dy);
    this.offset =
      length > 1e-8
        ? {
            x: (dx / length) * this.lookAheadDistance,
            y: (dy / length) * this.lookAheadDistance,
          }
        : { x: 0, y: 0 };
    const offset = this.project(this.offset.x, this.offset.y);
    const smoothFactor = 1 - Math.exp(-this.trackingSpeed * dt);
    this.x += (p.x + offset.x - this.x) * smoothFactor;
    this.y += (p.y + offset.y - this.y) * smoothFactor;
    this.zoom +=
      (this.targetZoom - this.zoom) * (1 - Math.exp(-this.zoomSpeed * dt));
    this.zoom = clamp(this.zoom, this.minZoom, this.maxZoom);
  }
  worldToScreen(x, y, z = 0) {
    const p = this.project(x, y, z);
    return {
      x: (p.x - this.x) * this.scale + this.width / 2,
      y: (p.y - this.y) * this.scale + this.height / 2,
    };
  }
  /** Inverse on a specified Z plane. Default picking intersects the floor (Z=0). */
  screenToWorld(screenX, screenY, groundZ = 0) {
    finite(screenX, "screenX");
    finite(screenY, "screenY");
    return this.unproject(
      (screenX - this.width / 2) / this.scale + this.x,
      (screenY - this.height / 2) / this.scale + this.y,
      groundZ,
    );
  }
  /** Affine transform from projected pixels to backing-store pixels. */
  getTransform(pixelRatio = 1) {
    positive(pixelRatio, "pixelRatio");
    const scale = this.scale * pixelRatio;
    return [
      scale,
      0,
      0,
      scale,
      (this.width / 2 - this.x * this.scale) * pixelRatio,
      (this.height / 2 - this.y * this.scale) * pixelRatio,
    ];
  }
  getVisibleWorldBounds(margin = 0) {
    finite(margin, "margin");
    if (margin < 0) throw new RangeError("Negative viewport margin.");
    const points = [];
    for (const x of [-margin, this.width + margin])
      for (const y of [-margin, this.height + margin])
        points.push(this.screenToWorld(x, y));
    return {
      minX: Math.min(...points.map((p) => p.x)),
      maxX: Math.max(...points.map((p) => p.x)),
      minY: Math.min(...points.map((p) => p.y)),
      maxY: Math.max(...points.map((p) => p.y)),
    };
  }
}
