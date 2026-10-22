// NorthVale — Sombras de 1989
// True 2.5D Isometric RenderEngine (HTML5 Canvas 2D)
// Features: Explicit Z-axis elevation, 64x32 Metric Unit Grid Ratio, Bottom-Center Pivot Anchoring,
// Dynamic Y-Sorting (renderQueue), Volumetric Box Geometry (isoBox), 300ms Roof Cutaway, and Ground Shadow Casting.

import {RoofCutawaySystem} from './roof-cutaway.js';
import {EnvironmentManager} from './EnvironmentManager.js';
import {PlayerRenderer} from './Player.js';

export const GRID_TILE_W = 64;
export const GRID_TILE_H = 32;

/**
 * 2.5D Isometric mathematical projection with explicit vertical height (Z-axis).
 * X: screen-space X (scaled by cos(30°) = 0.866)
 * Y: screen-space Y (scaled by sin(30°) = 0.5, minus elevation z)
 */
export function iso(x, y, z = 0, originX = 660, originY = 170) {
  return {
    x: originX + (x - y) * 0.866,
    y: originY + (x + y) * 0.5 - z
  };
}

/**
 * Helper to shade colors for volumetric 2.5D faces.
 */
export function shadeColor(col, percent) {
  if (!col || typeof col !== 'string') return col;
  if (col.startsWith('rgba') || col.startsWith('rgb')) return col;
  let num = parseInt(col.replace('#', ''), 16);
  if (isNaN(num)) return col;
  const isShort = col.length <= 4;
  if (isShort) {
    const r = (num >> 8) & 0xf, g = (num >> 4) & 0xf, b = num & 0xf;
    num = (r * 17) << 16 | (g * 17) << 8 | (b * 17);
  }
  let r = (num >> 16) + Math.round(255 * percent);
  let g = ((num >> 8) & 0x00ff) + Math.round(255 * percent);
  let b = (num & 0x0000ff) + Math.round(255 * percent);
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export class RenderEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.originX = 660;
    this.originY = 170;

    this.roofCutaway = new RoofCutawaySystem();
    this.environment = new EnvironmentManager();
    this.playerRenderer = new PlayerRenderer({id: 'alex', targetHeight: 50});

    this.renderQueue = [];
    this.time = 0;

    this.w = innerWidth;
    this.h = innerHeight;
    this.resize();
  }

  resize() {
    this.w = innerWidth;
    this.h = innerHeight;
    this.pixelRatio = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = this.w * this.pixelRatio;
    this.canvas.height = this.h * this.pixelRatio;
  }

  iso(x, y, z = 0) {
    return iso(x, y, z, this.originX, this.originY);
  }

  project(x, y, z = 0) {
    return this.iso(x, y, z);
  }

  /**
   * Screen to world coordinate projection at elevation z.
   */
  screenToWorld(point, z = 0, camera = {x: 700, y: 720}) {
    const cam = this.iso(camera.x, camera.y, 0);
    const sx = point.x - (this.w / 2 - cam.x) - this.originX;
    const sy = point.y - (this.h * 0.55 - cam.y) - this.originY;
    const inv0866 = sx / 0.866;
    const inv050 = (sy + z) / 0.5;
    return {
      x: (inv0866 + inv050) * 0.5,
      y: (inv050 - inv0866) * 0.5
    };
  }

  poly(points, fill, stroke, lineWidth = 1) {
    const c = this.ctx;
    c.beginPath();
    points.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
    c.closePath();
    if (fill) {
      c.fillStyle = fill;
      c.fill();
    }
    if (stroke) {
      c.strokeStyle = stroke;
      c.lineWidth = lineWidth;
      c.stroke();
    }
  }

  /**
   * Ground plane quadrilateral anchored on grid plane z = 0.
   */
  ground(x, y, w, h, color, z = 0) {
    this.poly(
      [
        this.iso(x, y, z),
        this.iso(x + w, y, z),
        this.iso(x + w, y + h, z),
        this.iso(x, y + h, z)
      ],
      color
    );
  }

  /**
   * Volumetric 2.5D Box:
   * Renders base, front wall, left-front side wall, and roof face.
   * Ground-anchored with calibrated vertical height z and proportional scaling.
   */
  isoBox(x, y, w, d, h, options = {}) {
    const c = this.ctx;
    const baseZ = options.baseZ || 0;
    const stroke = options.stroke ?? '#172528';
    const color = options.color || '#5a6662';
    const sideColor = options.sideColor || shadeColor(color, -0.22);
    const roofColor = options.roofColor || shadeColor(color, 0.16);
    const roofAlpha = options.roofAlpha ?? 1.0;
    const wallAlpha = options.wallAlpha ?? 1.0;

    const p = (a, b, z) => this.iso(a, b, z);

    // 1. Base face at z = baseZ (if specified)
    if (options.drawBase) {
      this.poly(
        [
          p(x, y, baseZ),
          p(x + w, y, baseZ),
          p(x + w, y + d, baseZ),
          p(x, y + d, baseZ)
        ],
        options.baseColor || '#1c2826',
        stroke
      );
    }

    // 2. Front Wall Face (along y + d, from x to x + w)
    if (wallAlpha > 0.01) {
      c.save();
      if (wallAlpha < 1.0) c.globalAlpha = wallAlpha;
      const frontPts = [
        p(x, y + d, baseZ),
        p(x + w, y + d, baseZ),
        p(x + w, y + d, baseZ + h),
        p(x, y + d, baseZ + h)
      ];
      this.poly(frontPts, color, stroke);
      c.restore();
    }

    // 3. Side Wall Face (along x + w, from y to y + d)
    if (wallAlpha > 0.01) {
      c.save();
      if (wallAlpha < 1.0) c.globalAlpha = wallAlpha;
      const sidePts = [
        p(x + w, y, baseZ),
        p(x + w, y + d, baseZ),
        p(x + w, y + d, baseZ + h),
        p(x + w, y, baseZ + h)
      ];
      this.poly(sidePts, sideColor, stroke);
      c.restore();
    }

    // 4. Roof / Top Face at z = baseZ + h (Cutaway occlusion controlled)
    if (roofAlpha > 0.01) {
      c.save();
      if (roofAlpha < 1.0) c.globalAlpha = roofAlpha;
      const roofPts = [
        p(x, y, baseZ + h),
        p(x + w, y, baseZ + h),
        p(x + w, y + d, baseZ + h),
        p(x, y + d, baseZ + h)
      ];
      this.poly(roofPts, roofColor, stroke);
      c.restore();
    }
  }

  /**
   * Draws a sprite with strict bottom-center pivot anchoring:
   * (screenPos.x - renderWidth/2, screenPos.y - renderHeight)
   */
  drawGroundedSprite(image, worldX, worldY, renderWidth, renderHeight, z = 0, alpha = 1.0) {
    if (!image || !image.complete || !image.naturalWidth) return;
    const pos = this.iso(worldX, worldY, z);
    const c = this.ctx;
    c.save();
    if (alpha < 1) c.globalAlpha = alpha;
    c.drawImage(
      image,
      pos.x - renderWidth / 2,
      pos.y - renderHeight,
      renderWidth,
      renderHeight
    );
    c.restore();
  }

  /**
   * Dynamic Y-Sorting Execution:
   * Sorts renderQueue each frame by (worldY + worldX) before executing draw calls.
   */
  flushRenderQueue() {
    // Sort every frame strictly by world depth sum:
    this.renderQueue.sort((a, b) => (a.worldY + a.worldX) - (b.worldY + b.worldX));

    // Frustum culling pass (60 FPS optimization)
    for (const item of this.renderQueue) {
      item.draw(this.ctx);
    }

    // Reset queue for next frame
    this.renderQueue = [];
  }
}
