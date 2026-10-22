import {RenderQueue} from '../engine/RenderQueue.js';
// Roof Cutaway & Volumetric Lighting/Shadow Engine for NorthVale — Sombras de 1989
// 300ms Smooth Roof Cutaway Transition, Volumetric 2.5D Shadows (shadowBlur & vectors),
// Wet Asphalt Specular Reflections and Cracked Sidewalk Slabs.

export class RoofCutawaySystem {
  constructor() {
    this.queue = new RenderQueue();
    this.alphas = this.queue.cutaways; // buildingId -> alpha (1.0 to 0.0)
    this.ripples = [];
    this.splashes = [];
    this.transitionDuration = 0.25; // 300ms smooth cutaway
  }

  update(dt, player, buildings, isInterior = false, currentInteriorId = null) {
    const building=isInterior?buildings.find(b=>b.id===currentInteriorId):null;
    const x=building?building.x+building.w/2:player.x,y=building?building.y+building.h/2:player.y;
    this.queue.updateCutaways(x,y,buildings,dt);

    // Update rain puddles ripples on wet asphalt
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.radius += dt * 32;
      r.alpha -= dt * 0.9;
      if (r.alpha <= 0) {
        this.ripples.splice(i, 1);
      }
    }

    // Spawn new ripples on wet asphalt
    if (this.ripples.length < 35 && Math.random() < 0.6) {
      this.ripples.push({
        x: Math.random() * 1900,
        y: Math.random() * 1700,
        radius: 2 + Math.random() * 4,
        alpha: 0.6 + Math.random() * 0.3
      });
    }

    // Update droplet splash particles
    for (let i = this.splashes.length - 1; i >= 0; i--) {
      const s = this.splashes[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt * 4.5;
      if (s.life <= 0) {
        this.splashes.splice(i, 1);
      }
    }

    if (this.splashes.length < 50 && Math.random() < 0.7) {
      const px = player.x + (Math.random() - 0.5) * 400;
      const py = player.y + (Math.random() - 0.5) * 300;
      for (let k = 0; k < 2; k++) {
        this.splashes.push({
          x: px,
          y: py,
          vx: (Math.random() - 0.5) * 45,
          vy: -20 - Math.random() * 40,
          life: 1.0
        });
      }
    }
  }

  getAlpha(buildingId) {
    return this.alphas.get(buildingId) ?? 1.0;
  }

  drawPuddleReflections(r, c) {
    // Realistic wet asphalt reflections with sheen and expanding ripples
    for (const rip of this.ripples) {
      const p = r.iso(rip.x, rip.y, 0);
      c.save();
      c.strokeStyle = `rgba(168, 205, 215, ${rip.alpha * 0.35})`;
      c.lineWidth = 1.2;
      c.beginPath();
      c.ellipse(p.x, p.y, rip.radius * 1.5, rip.radius * 0.75, 0, 0, Math.PI * 2);
      c.stroke();
      c.restore();
    }

    // Splashes on impact
    c.save();
    c.fillStyle = 'rgba(180, 220, 235, 0.45)';
    for (const s of this.splashes) {
      const p = r.iso(s.x, s.y, 0);
      c.fillRect(p.x, p.y, 1.8, 1.8);
    }
    c.restore();
  }

  drawCrackedSidewalk(r, c, x, y, w, h) {
    // Procedural cracked slabs on sidewalks
    const p1 = r.iso(x, y, 0);
    const p2 = r.iso(x + w, y, 0);
    const p3 = r.iso(x + w, y + h, 0);
    const p4 = r.iso(x, y + h, 0);

    // Slab base
    r.poly([p1, p2, p3, p4], '#455655', '#283838');

    // Jagged crack lines
    c.save();
    c.strokeStyle = '#1e2d2b';
    c.lineWidth = 1.3;
    c.beginPath();
    const mid = r.iso(x + w * 0.45, y + h * 0.5, 0);
    c.moveTo(p1.x + 10, p1.y + 5);
    c.lineTo(mid.x, mid.y);
    c.lineTo(p3.x - 8, p3.y - 6);
    c.stroke();

    // Crack highlight edge
    c.strokeStyle = '#62777355';
    c.lineWidth = 0.8;
    c.beginPath();
    c.moveTo(p1.x + 11, p1.y + 6);
    c.lineTo(mid.x + 1, mid.y + 1);
    c.lineTo(p3.x - 7, p3.y - 5);
    c.stroke();
    c.restore();
  }

  /**
   * Radial Point Light Projected Shadow (e.g. Streetlamp or vehicle light).
   */
  drawProjectedShadow(r, c, actorX, actorY, lightX, lightY, shadowRadius = 24, blur = 14) {
    const dx = actorX - lightX;
    const dy = actorY - lightY;
    const dist = Math.hypot(dx, dy);
    if (dist > 350) return;

    const length = Math.min(55, (350 - dist) * 0.16);
    const shadowX = actorX + (dx / dist) * length;
    const shadowY = actorY + (dy / dist) * length;

    const p = r.iso(shadowX, shadowY, 0);

    c.save();
    c.shadowColor = 'rgba(2, 8, 12, 0.75)';
    c.shadowBlur = blur;
    c.fillStyle = 'rgba(2, 8, 12, 0.45)';
    c.beginPath();
    c.ellipse(p.x, p.y, shadowRadius * 1.4, shadowRadius * 0.65, Math.atan2(dy, dx), 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  /**
   * True Volumetric Object Shadow Projection:
   * Takes a 3D volumetric bounding box (x, y, z, w, d, h) and projects a distorted
   * shadow polygon on the ground plane in the opposite direction of predominant lighting.
   */
  drawVolumetricShadow(r, c, x, y, z, w, d, h, lightSources = []) {
    // Find nearest or most intense light source
    const centerX = x + w / 2;
    const centerY = y + d / 2;
    let bestLight = null;
    let minDist = Infinity;

    for (const light of lightSources) {
      const dist = Math.hypot(centerX - light.x, centerY - light.y);
      if (dist < minDist && dist < 420) {
        minDist = dist;
        bestLight = light;
      }
    }

    let shadowDx = 0;
    let shadowDy = 0;
    let shadowStrength = 0.40;

    if (bestLight) {
      const dx = centerX - bestLight.x;
      const dy = centerY - bestLight.y;
      const dist = Math.hypot(dx, dy);
      const factor = Math.min(1.2, h / (bestLight.z || 95));
      shadowDx = (dx / dist) * Math.min(70, dist * 0.25 * factor);
      shadowDy = (dy / dist) * Math.min(70, dist * 0.25 * factor);
      shadowStrength = Math.max(0.2, 0.55 - dist / 500);
    } else {
      // Default ambient moonlight shadow direction (angled from North-West)
      shadowDx = h * 0.28;
      shadowDy = h * 0.42;
      shadowStrength = 0.32;
    }

    // Ground base points
    const pBase0 = r.iso(x, y + d, 0);
    const pBase1 = r.iso(x + w, y + d, 0);
    const pBase2 = r.iso(x + w, y, 0);

    // Projected top points on ground plane
    const pTop0 = r.iso(x + shadowDx, y + d + shadowDy, 0);
    const pTop1 = r.iso(x + w + shadowDx, y + d + shadowDy, 0);
    const pTop2 = r.iso(x + w + shadowDx, y + shadowDy, 0);

    c.save();
    c.shadowColor = 'rgba(2, 6, 10, 0.7)';
    c.shadowBlur = 10;
    c.fillStyle = `rgba(2, 6, 10, ${shadowStrength})`;
    c.beginPath();
    c.moveTo(pBase0.x, pBase0.y);
    c.lineTo(pBase1.x, pBase1.y);
    c.lineTo(pBase2.x, pBase2.y);
    c.lineTo(pTop2.x, pTop2.y);
    c.lineTo(pTop1.x, pTop1.y);
    c.lineTo(pTop0.x, pTop0.y);
    c.closePath();
    c.fill();
    c.restore();
  }
}
