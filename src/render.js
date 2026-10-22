// NorthVale — Sombras de 1989
// True 2.5D Isometric Rendering Engine (Canvas 2D)
// Mathematical Z-axis Projection, Dynamic Depth Y-Sorting (renderQueue),
// Volumetric Vertical Wall & Roof Cutaway, and Volumetric Shadow Casting.

import {WORLD, buildings, isOpen} from './world.js';
import {residents, residentPosition} from './simulation.js';
import {VisualAssets} from './graphics/visual-assets.js';
import {InteriorLighting} from './graphics/lighting.js';
import {pickProp} from './graphics/interaction.js';
import {SpriteCache} from './graphics/sprite-cache.js';
import {TownActors} from './graphics/town-actors.js';
import {drawTownFacade} from './graphics/town-facades.js';
import {PoliceStationScene} from './scenes/police-station.js';
import {InteriorWorld} from './interiors/interior-world.js';
import {InteriorRoomRenderer} from './interiors/interior-renderer.js';
import {RoofCutawaySystem} from './graphics/roof-cutaway.js';
import {EnvironmentManager} from './graphics/EnvironmentManager.js';
import {PlayerRenderer} from './graphics/Player.js';

/**
 * 2.5D Isometric projection with explicit vertical height (Z-axis).
 * X: screen-space X (scaled by cos(30°) = 0.866)
 * Y: screen-space Y (scaled by sin(30°) = 0.5, minus vertical height z)
 */
export function iso(x, y, z = 0, originX = 660, originY = 170) {
  const ORIGIN_X = originX;
  const ORIGIN_Y = originY;
  return {
    x: ORIGIN_X + (x - y) * 0.866,
    y: ORIGIN_Y + (x + y) * 0.5 - z
  };
}

/**
 * Helper to adjust hex or rgb color brightness for 2.5D face shading.
 */
function shadeColor(col, percent) {
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
  let g = ((num >> 8) & 0x00FF) + Math.round(255 * percent);
  let b = (num & 0x0000FF) + Math.round(255 * percent);
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.camera = {x: 700, y: 720};
    this.zoom = 1;
    this.time = 0;
    this.rain = true;

    this.originX = 660;
    this.originY = 170;
    this.renderQueue = [];

    this.roofCutaway = new RoofCutawaySystem();
    this.assets = new VisualAssets();
    this.assets.loadOverrides();
    this.lighting = new InteriorLighting();
    this.outlines = new Map();
    this.propSprites = new SpriteCache();
    this.patterns = new WeakMap();
    this.focus = null;
    this.policeFocus = null;

    this.police = new PoliceStationScene();
    this.townActors = new TownActors(this.police);
    this.interiors = new InteriorWorld();
    this.interiorView = new InteriorRoomRenderer(this.interiors, this.police);
    this.envManager = new EnvironmentManager();
    this.playerRenderer = new PlayerRenderer({id: 'alex', sheet: this.police.alexSheet, targetHeight: 50});
    this.lastDt = 0.016;

    this.surface = null;
    this.room = null;
    this.pointer = null;
    this.inspectingIds = [];
    this.quality = 'high';
    this.density = 1;

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.w = innerWidth;
    this.h = innerHeight;
    this.pixelRatio = Math.min(devicePixelRatio, this.quality === 'low' ? 1 : 2);
    this.canvas.width = this.w * this.pixelRatio;
    this.canvas.height = this.h * this.pixelRatio;
  }

  /**
   * Primary 2.5D Isometric projection instance method.
   */
  iso(x, y, z = 0) {
    return {
      x: this.originX + (x - y) * 0.866,
      y: this.originY + (x + y) * 0.5 - z
    };
  }

  /**
   * Backwards compatible project alias.
   */
  project(x, y, z = 0) {
    return this.iso(x, y, z);
  }

  /**
   * Inverse projection: converts screen coordinate to 2.5D world coordinate at elevation z.
   */
  screenToWorld(point, z = 0) {
    const cam = this.iso(this.camera.x, this.camera.y, 0);
    const sx = point.x - (this.w / 2 - cam.x) - this.originX;
    const sy = point.y - (this.h * 0.55 - cam.y) - this.originY;
    const inv0866 = sx / 0.866;
    const inv050 = (sy + z) / 0.5;
    return {
      x: (inv0866 + inv050) * 0.5,
      y: (inv050 - inv0866) * 0.5
    };
  }

  poly(points, fill, stroke) {
    const c = this.ctx;
    c.beginPath();
    points.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y));
    c.closePath();
    if (fill) {
      c.fillStyle = fill;
      c.fill();
    }
    if (stroke) {
      c.strokeStyle = stroke;
      c.lineWidth = 1;
      c.stroke();
    }
  }

  ground(x, y, w, h, color, z = 0) {
    this.poly([
      this.iso(x, y, z),
      this.iso(x + w, y, z),
      this.iso(x + w, y + h, z),
      this.iso(x, y + h, z)
    ], color);
  }

  /**
   * True Volumetric 2.5D Box:
   * Renders base, front wall, left-front side wall, and top roof face with vertical height z.
   * Supports alpha fade for building roof cutaway.
   */
  isoBox(x, y, w, d, h, options = {}) {
    const c = this.ctx;
    const baseZ = options.baseZ || options.base || 0;
    const stroke = options.stroke ?? '#172528';
    const color = options.color || '#5a6662';
    const sideColor = options.sideColor || shadeColor(color, -0.22);
    const roofColor = options.roofColor || options.roof || shadeColor(color, 0.16);
    const roofAlpha = options.roofAlpha ?? 1.0;
    const wallAlpha = options.wallAlpha ?? 1.0;

    const p = (a, b, z) => this.iso(a, b, z);

    // 1. Base face at z = baseZ (if specified or opaque)
    if (options.drawBase) {
      this.poly([
        p(x, y, baseZ),
        p(x + w, y, baseZ),
        p(x + w, y + d, baseZ),
        p(x, y + d, baseZ)
      ], options.baseColor || '#1c2826', stroke);
    }

    // 2. Front-Left Face (along y + d, from x to x + w)
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
      if (this.surface) {
        this.textureQuad(frontPts, w, h, this.surface, 0.67);
      }
      c.restore();
    }

    // 3. Front-Right Face (along x + w, from y to y + d)
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
      if (this.surface) {
        this.textureQuad(sidePts, d, h, this.surface, 0.42);
      }
      c.restore();
    }

    // 4. Roof / Top Face at z = baseZ + h (Controlled by Cutaway System)
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
      if (this.surface) {
        this.textureQuad(roofPts, w, d, this.surface, 0.85);
      }
      c.restore();
    }

    // Interior contact ambient lighting attenuation
    if (this.room) {
      const light = this.lighting.brightness(x + w / 2, y + d / 2, h + baseZ);
      if (light < 1) {
        this.poly([
          p(x, y + d, baseZ),
          p(x + w, y + d, baseZ),
          p(x + w, y + d, baseZ + h),
          p(x, y + d, baseZ + h)
        ], `rgba(4, 14, 18, ${1 - light})`);
      }
    }
  }

  /**
   * Backwards-compatible volumetric box wrapper.
   */
  box(x, y, w, d, h, color, roof, base = 0, options = {}) {
    this.isoBox(x, y, w, d, h, {
      color,
      roofColor: roof,
      baseZ: base,
      sideColor: options.sideColor || '#34474a',
      roofAlpha: options.roofAlpha ?? 1.0,
      wallAlpha: options.wallAlpha ?? 1.0,
      ...options
    });
  }

  person(x, y, color, phase = 0, angle = 0, id = 'alex', vx = 0, vy = 0, z = 0) {
    if (id === 'alex') {
      const pt = this.iso(x, y, z);
      if (this.police?.alexSheet) this.playerRenderer.setSheet(this.police.alexSheet);
      this.playerRenderer.update(this.lastDt || 0.016, vx, vy, angle);
      this.playerRenderer.draw(this.ctx, pt.x, pt.y, { scale: 50 / (this.playerRenderer.sheet?.frameHeight || 128) });
      return true;
    }
    return this.townActors.draw(this, {id, x, y, z, vx, vy, time: this.time, angle});
  }

  building(b, minute) {
    drawTownFacade(this, b, minute);
  }

  tree(x, y, i) {
    const p = this.iso(x, y, 0);
    const c = this.ctx;
    // Ground shadow
    this.ground(x, y, 35, 35, '#07191b55');
    // Volumetric trunk
    c.fillStyle = '#3e4840';
    c.fillRect(p.x - 3, p.y - 32, 6, 34);
    // 3D layered canopy foliage with vertical height
    for (let k = 0; k < 3; k++) {
      const elevation = 20 + k * 18;
      const pt = this.iso(x, y, elevation);
      const r = 28 - k * 5;
      this.poly([
        {x: pt.x - r, y: pt.y},
        {x: pt.x, y: pt.y - 48},
        {x: pt.x + r, y: pt.y}
      ], ['#203d37', '#29473b', '#335144'][(i + k) % 3], '#142521');
    }
  }

  car(car) {
    const {x, y, angle: a} = car;
    const c = this.ctx;
    const local = (dx, dy, z = 0) => this.iso(
      x + Math.cos(a) * dx - Math.sin(a) * dy,
      y + Math.sin(a) * dx + Math.cos(a) * dy,
      z
    );
    const q = (x1, y1, x2, y2, z, color) => this.poly([
      local(x1, y1, z),
      local(x2, y1, z),
      local(x2, y2, z),
      local(x1, y2, z)
    ], color, '#172329');

    // Wheels
    for (const side of [-1, 1]) {
      for (const end of [-1, 1]) {
        const p = local(end * 22, side * 13, 4);
        c.fillStyle = '#10191c';
        c.beginPath();
        c.ellipse(p.x, p.y, 6, 9, 0, 0, Math.PI * 2);
        c.fill();
      }
    }

    // Volumetric Car Body with 2.5D height
    q(-35, -15, 35, 15, 11, '#9aaba5');
    q(-15, -13, 12, 13, 25, '#c3cbc0');
    q(13, -12, 24, 12, 15, '#2a4855');
    q(-26, -12, -16, 12, 16, '#29404b');
    q(-5, -12, 0, 12, 29, '#526a79');

    // Headlights and directional light projection
    for (const side of [-1, 1]) {
      const p = local(34, side * 11, 12);
      c.fillStyle = '#eee3ae';
      c.fillRect(p.x - 2, p.y - 2, 4, 4);
      const end = local(155, side * 45, 0);
      this.poly([p, {x: end.x - 24, y: end.y - 8}, {x: end.x + 24, y: end.y + 8}], '#d8d49a0d');
    }
  }

  draw(state, dt, cinematic = false) {
    this.time += dt;
    this.lastDt = dt;

    // Update atmospheric environment simulation
    this.envManager.update(dt, state.player, Boolean(state.interior));

    // Update roof cutaway logic (300ms transition)
    this.roofCutaway.update(dt, state.player, buildings, Boolean(state.interior), state.interior);

    const visible = residents.filter(n => !state.interior && !residentPosition(n, state.minute).inside).map(n => n.id);
    this.assets.updateCharacters([...new Set(['alex', ...visible, ...this.inspectingIds])]);

    const c = this.ctx;
    c.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    c.fillStyle = '#172c32';
    c.fillRect(0, 0, this.w, this.h);

    if (state.interior) {
      if (this.interiors.loaded) {
        this.interiorView.draw(this, state, dt);
        const fade = this.interiors.fade();
        if (fade) {
          c.fillStyle = `rgba(3, 10, 12, ${fade * 0.9})`;
          c.fillRect(0, 0, this.w, this.h);
        }
      } else {
        c.fillStyle = '#d6d0b5';
        c.font = '18px Georgia';
        c.fillText(this.interiors.error?.message || 'Carregando interiores de NorthVale…', 50, this.h / 2);
      }
      this.drawVignette(c);
      return;
    }

    // Camera following in true 2.5D coordinates
    const target = state.interior ? {x: 250, y: 250} : state.driving ? state.car : state.player;
    this.camera.x += (target.x - this.camera.x) * Math.min(1, dt * 4);
    this.camera.y += (target.y - this.camera.y) * Math.min(1, dt * 4);

    const cam = this.iso(this.camera.x, this.camera.y, 0);
    c.save();
    c.translate(this.w / 2 - cam.x, this.h * 0.55 - cam.y);

    this.drawTown(state, cinematic);

    c.restore();
    this.drawVignette(c);

    // Torrential rain particle streaks
    if (!state.interior && this.rain) {
      c.save();
      c.strokeStyle = '#adc4ca45';
      c.lineWidth = 0.9;
      c.beginPath();
      for (let i = 0; i < 240; i++) {
        const x = (i * 137.37 - this.time * 260) % this.w;
        const y = (i * 71.79 + this.time * 540) % this.h;
        c.moveTo(x, y);
        c.lineTo(x - 11, y + 24);
      }
      c.stroke();
      c.restore();
    }

    if (cinematic) {
      c.fillStyle = '#050e15';
      c.fillRect(0, 0, this.w, 22);
      c.fillRect(0, this.h - 62, this.w, 62);
    }
  }

  drawVignette(c) {
    const vignette = c.createRadialGradient(this.w / 2, this.h / 2, this.h * 0.15, this.w / 2, this.h / 2, this.w * 0.65);
    vignette.addColorStop(0, '#04131a00');
    vignette.addColorStop(1, '#02070dcc');
    c.fillStyle = vignette;
    c.fillRect(0, 0, this.w, this.h);
  }

  /**
   * True 2.5D World Rendering with Global Priority Depth-Sorting (renderQueue).
   */
  drawTown(s, cinematic) {
    const c = this.ctx;

    // 1. Base Ground Surface & Roads (Ground Plane z = 0)
    this.ground(0, 0, WORLD.width, WORLD.height, '#30493e');
    for (const r of WORLD.roads) {
      this.ground(r.x - 21, r.y - 21, r.w + 42, r.h + 42, '#65736d');
      this.ground(r.x, r.y, r.w, r.h, '#2c3d43');
    }

    // Cracked sidewalks along main road curbs
    this.roofCutaway.drawCrackedSidewalk(this, c, 520, 715, 60, 45);
    this.roofCutaway.drawCrackedSidewalk(this, c, 1040, 715, 60, 45);

    // Wet asphalt reflections & rain ripples
    this.roofCutaway.drawPuddleReflections(this, c);

    // Road markings & moisture sheen
    for (let i = 0; i < 950; i++) {
      const x = (i * 97.31) % 1900, y = (i * 239.71) % 1700;
      const road = (y > 740 && y < 880) || (x > 880 && x < 1020);
      this.ground(x, y, road ? 5 : 3, road ? 2 : 4, road ? '#9aaba211' : '#77917822');
    }
    for (let x = 0; x < 1900; x += 65) this.ground(x, 807, 30, 3, '#b3ad7855');
    for (let y = 0; y < 1700; y += 65) this.ground(947, y, 3, 30, '#b3ad7855');
    for (let i = 0; i < 22; i++) {
      const x = (i * 127 + 100) % 1800;
      this.ground(x, 770 + (i % 3) * 31, 60, 9, '#97c2c71c');
    }

    // 2. Global Render Queue initialization for dynamic Y-Sorting
    const renderQueue = [];

    // Streetlight sources for volumetric shadow projections
    const lightSources = [];
    for (let x = 160; x < 1900; x += 300) {
      lightSources.push({x: x + 14, y: 905, z: 95});
    }

    // Outdoor atmospheric storytelling: manhole steam, puddles, soggy boxes, fog, gutter leaves
    this.envManager.drawOutdoorEnvironment(this, c, lightSources);

    // A. Volumetric Buildings with Cutaway Occlusion
    for (const b of buildings) {
      renderQueue.push({
        id: `building-${b.id}`,
        worldX: b.x + b.w,
        worldY: b.y + b.h,
        z: 0,
        draw: () => {
          // Volumetric building ground shadow
          this.roofCutaway.drawVolumetricShadow(this, c, b.x, b.y, 0, b.w, b.h, 75, lightSources);
          this.building(b, s.minute);
        }
      });
    }

    // B. Trees with Volumetric Layered Foliage
    for (let i = 0; i < 85; i++) {
      const x = (i * 313 + 50) % 1900, y = (i * 197 + 35) % 1700;
      if ((y < 700 || y > 925) && (x < 845 || x > 1060) &&
          !buildings.some(b => x > b.x - 45 && x < b.x + b.w + 45 && y > b.y - 45 && y < b.y + b.h + 45)) {
        renderQueue.push({
          id: `tree-${i}`,
          worldX: x + 18,
          worldY: y + 18,
          z: 0,
          draw: () => this.tree(x, y, i)
        });
      }
    }

    // C. Citizens / NPCs with Projected Directional Shadows
    for (const npc of residents) {
      let p = residentPosition(npc, s.minute);
      if (cinematic && npc.id === 'ruth') p = {x: 740, y: 695, inside: false};
      if (!p.inside) {
        const next = residentPosition(npc, s.minute + 0.01);
        const moving = p.activity === 'Em deslocamento';
        renderQueue.push({
          id: `npc-${npc.id}`,
          worldX: p.x,
          worldY: p.y,
          z: 0,
          draw: () => {
            // Shadow projection from streetlights
            for (const l of lightSources) {
              this.roofCutaway.drawProjectedShadow(this, c, p.x, p.y, l.x, l.y, 18, 10);
            }
            this.person(
              p.x, p.y, npc.color, 0, 0, npc.id,
              moving ? (next.x - p.x) / 0.01 : 0,
              moving ? (next.y - p.y) / 0.01 : 0
            );
          }
        });
      }
    }

    // D. Police Cruiser (Vehicle)
    renderQueue.push({
      id: 'car',
      worldX: s.car.x,
      worldY: s.car.y,
      z: 0,
      draw: () => {
        // Vehicle volumetric shadow
        for (const l of lightSources) {
          this.roofCutaway.drawProjectedShadow(this, c, s.car.x, s.car.y, l.x, l.y, 35, 14);
        }
        this.car(s.car);
      }
    });

    // E. Detective Alex Hale
    if (!s.driving) {
      renderQueue.push({
        id: 'alex',
        worldX: s.player.x,
        worldY: s.player.y,
        z: 0,
        draw: () => {
          // Volumetric shadow projection from lamps & headlights
          for (const l of lightSources) {
            this.roofCutaway.drawProjectedShadow(this, c, s.player.x, s.player.y, l.x, l.y, 22, 12);
          }
          this.person(
            s.player.x, s.player.y, '#a3906c',
            Math.hypot(s.player.vx, s.player.vy) > 5 ? this.time * 9 : 0,
            s.player.angle, 'alex',
            s.player.vx, s.player.vy
          );
        }
      });
    }

    // 3. Dynamic Y-Sorting Execution:
    // Sort every frame based on the world coordinate sum (x + y).
    renderQueue.sort((a, b) => (a.worldY + a.worldX) - (b.worldY + b.worldX));

    // 4. Frustum Culling & Drawing Pass (60 FPS optimization)
    const camCenter = this.iso(this.camera.x, this.camera.y, 0);
    for (const item of renderQueue) {
      const approx = this.iso(item.worldX, item.worldY, item.z || 0);
      if (Math.abs(approx.y - camCenter.y) < this.h + 350 &&
          Math.abs(approx.x - camCenter.x) < this.w + 400) {
        item.draw(c);
      }
    }

    // 5. Overhead Streetlamps Lighting & Volumetric Glow Cones
    for (const l of lightSources) {
      const p = this.iso(l.x - 14, l.y, 0);
      c.strokeStyle = '#253d3e';
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(p.x, p.y);
      c.lineTo(p.x, p.y - 100);
      c.lineTo(p.x + 14, p.y - 102);
      c.stroke();

      // Atmospheric radial light pool
      const g = c.createRadialGradient(p.x + 14, p.y - 95, 2, p.x + 14, p.y - 75, 85);
      g.addColorStop(0, '#eccf7940');
      g.addColorStop(1, '#eacb7300');
      c.fillStyle = g;
      c.fillRect(p.x - 75, p.y - 160, 180, 180);

      c.fillStyle = '#e8d093';
      c.fillRect(p.x + 10, p.y - 105, 10, 5);
    }

    this.renderQueue = renderQueue;
  }

  textureQuad(points, w, h, surface, opacity = 1) {
    const image = this.assets.surface(surface);
    if (!image || w <= 0 || h <= 0) return;
    const c = this.ctx;
    let pattern = this.patterns.get(image);
    if (!pattern) {
      pattern = c.createPattern(image, 'repeat');
      this.patterns.set(image, pattern);
    }
    c.save();
    c.globalAlpha = opacity;
    c.beginPath();
    points.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y));
    c.closePath();
    c.clip();
    c.transform(
      (points[1].x - points[0].x) / w,
      (points[1].y - points[0].y) / w,
      (points[3].x - points[0].x) / h,
      (points[3].y - points[0].y) / h,
      points[0].x,
      points[0].y
    );
    c.fillStyle = pattern;
    c.fillRect(0, 0, w, h);
    c.restore();
  }

  pick(objects) {
    if (!this.pointer) return null;
    const cam = this.iso(this.camera.x, this.camera.y, 0);
    return pickProp(
      objects,
      {x: this.pointer.x - this.w / 2 + cam.x, y: this.pointer.y - this.h * 0.55 + cam.y},
      (x, y, z) => this.iso(x, y, z)
    );
  }
}
