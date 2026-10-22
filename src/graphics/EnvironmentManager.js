// NorthVale — Sombras de 1989
// EnvironmentManager: Environmental Storytelling, Atmospheric Particles,
// Micro-lighting, Smoke Wisps, Manhole Steam, Rain Splashes, and Clutter Injection.

export class EnvironmentManager {
  constructor() {
    this.time = 0;

    // Outdoor Particle Pools
    this.steamPuffs = [];     // Rising steam from manholes / storm drains
    this.rainSplashes = [];   // Raindrops hitting asphalt, roofs, and puddles
    this.fogBands = [];       // Rolling volumetric ground fog in layers
    this.moths = [];          // Insects fluttering around warm streetlights
    this.smokeTrails = [];    // Cigarette smoke wisps from ashtrays
    this.gutterDrips = [];    // Water dripping from roof gutters

    // Fixed World Clutter Locations (1989 Oregon town)
    this.manholes = [
      {x: 740, y: 790, radius: 18},
      {x: 1040, y: 840, radius: 18},
      {x: 480, y: 770, radius: 18},
      {x: 930, y: 450, radius: 16},
      {x: 930, y: 1150, radius: 16}
    ];

    this.trashPiles = [
      {x: 540, y: 715, type: 'bin_overturned', angle: 0.4},
      {x: 1060, y: 718, type: 'soggy_boxes', angle: -0.2},
      {x: 310, y: 940, type: 'trash_scatter', angle: 0.1},
      {x: 1320, y: 660, type: 'soggy_boxes', angle: 0.5},
      {x: 1560, y: 460, type: 'rusty_barrels', angle: 0}
    ];

    this.gutterLeaves = [];
    for (let i = 0; i < 45; i++) {
      this.gutterLeaves.push({
        x: (i * 47.3 + 120) % 1800,
        y: 730 + ((i * 17) % 25),
        color: ['#634127', '#7c542e', '#51331d', '#3d2616'][i % 4],
        size: 2 + (i % 3)
      });
    }

    // Initialize initial fog layers
    for (let k = 0; k < 6; k++) {
      this.fogBands.push({
        x: k * 350,
        y: 720 + (k % 3) * 60,
        w: 400 + (k % 4) * 80,
        h: 90,
        speed: 12 + (k % 3) * 6,
        baseAlpha: 0.08 + (k % 3) * 0.04
      });
    }

    // Initialize moths around streetlights
    for (let m = 0; m < 20; m++) {
      this.moths.push({
        lightIndex: m % 6,
        angle: (m * Math.PI) / 3,
        dist: 14 + (m % 4) * 8,
        speed: 3 + (m % 3) * 2,
        yOffset: -75 - (m % 5) * 5
      });
    }
  }

  update(dt, player, isInterior = false, roomProps = []) {
    this.time += dt;

    if (!isInterior) {
      // 1. Manhole Steam Generation
      for (const m of this.manholes) {
        if (Math.random() < 0.25 && this.steamPuffs.length < 50) {
          this.steamPuffs.push({
            x: m.x + (Math.random() - 0.5) * 14,
            y: m.y + (Math.random() - 0.5) * 10,
            z: 0,
            vz: 18 + Math.random() * 22,
            vx: -8 + Math.random() * 5, // Slight wind drift
            radius: 6 + Math.random() * 8,
            alpha: 0.45,
            maxRadius: 32 + Math.random() * 20
          });
        }
      }

      // Update steam puffs
      for (let i = this.steamPuffs.length - 1; i >= 0; i--) {
        const p = this.steamPuffs[i];
        p.z += p.vz * dt;
        p.x += p.vx * dt;
        p.radius += dt * 14;
        p.alpha -= dt * 0.22;
        if (p.alpha <= 0) this.steamPuffs.splice(i, 1);
      }

      // 2. Rain Splash Particles
      if (this.rainSplashes.length < 80 && Math.random() < 0.8) {
        for (let k = 0; k < 4; k++) {
          this.rainSplashes.push({
            x: player.x + (Math.random() - 0.5) * 600,
            y: player.y + (Math.random() - 0.5) * 450,
            z: 0,
            vx: (Math.random() - 0.5) * 35,
            vy: -15 - Math.random() * 30,
            life: 0.25
          });
        }
      }

      for (let i = this.rainSplashes.length - 1; i >= 0; i--) {
        const s = this.rainSplashes[i];
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.life -= dt;
        if (s.life <= 0) this.rainSplashes.splice(i, 1);
      }

      // 3. Ground Fog Bands Drift
      for (const fog of this.fogBands) {
        fog.x -= fog.speed * dt;
        if (fog.x < -fog.w) fog.x = 1900 + fog.w;
      }

      // 4. Moths Orbiting Streetlights
      for (const moth of this.moths) {
        moth.angle += moth.speed * dt;
      }
    } else {
      // INTERIOR: Cigarette smoke wisps from ashtrays
      const ashtrays = roomProps.filter(p => p.type === 'ashtray' || p.kind === 'ashtray');
      for (const ash of ashtrays) {
        if (Math.random() < 0.35 && this.smokeTrails.length < 30) {
          this.smokeTrails.push({
            x: ash.x + (ash.w || 15) / 2,
            y: ash.y + (ash.h || 15) / 2,
            z: (ash.baseZ || 0) + (ash.height || 4) + 1,
            vz: 14 + Math.random() * 10,
            amplitude: 4 + Math.random() * 4,
            freq: 5 + Math.random() * 4,
            life: 1.8,
            maxLife: 1.8
          });
        }
      }

      for (let i = this.smokeTrails.length - 1; i >= 0; i--) {
        const s = this.smokeTrails[i];
        s.z += s.vz * dt;
        s.life -= dt;
        if (s.life <= 0) this.smokeTrails.splice(i, 1);
      }
    }
  }

  /**
   * Draws street level environmental clutter:
   * Puddles with oil sheen, manhole steam, overturned bins, soggy leaves.
   */
  drawStreetClutter(r, ctx) {
    // 1. Fallen leaves in curbs
    for (const leaf of this.gutterLeaves) {
      const p = r.iso(leaf.x, leaf.y, 0);
      ctx.fillStyle = leaf.color;
      ctx.fillRect(p.x, p.y, leaf.size, leaf.size * 0.7);
    }

    // 2. Overturned Trash Bins & Soggy Cardboard
    for (const pile of this.trashPiles) {
      const p = r.iso(pile.x, pile.y, 0);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(pile.angle);

      if (pile.type === 'bin_overturned') {
        // Metallic rusty bin on its side
        ctx.fillStyle = '#1e282a';
        ctx.fillRect(-12, -6, 24, 12);
        ctx.fillStyle = '#415254';
        ctx.fillRect(-10, -5, 20, 10);
        ctx.fillStyle = '#654321';
        ctx.fillRect(8, -3, 8, 8); // spilled rubbish
        // Spilled glass bottles
        ctx.fillStyle = '#4d7c6f';
        ctx.fillRect(14, 2, 6, 3);
      } else if (pile.type === 'soggy_boxes') {
        // Wet deflated cardboard boxes
        ctx.fillStyle = '#5c4832';
        ctx.fillRect(-16, -8, 30, 14);
        ctx.fillStyle = '#3f301e';
        ctx.fillRect(-12, -4, 22, 10);
        ctx.fillStyle = '#2d2215';
        ctx.fillRect(-8, 0, 16, 8);
      } else if (pile.type === 'rusty_barrels') {
        ctx.fillStyle = '#6b3d26';
        ctx.beginPath();
        ctx.ellipse(0, 0, 14, 8, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 3. Steam Rising from Manholes
    for (const p of this.steamPuffs) {
      const pt = r.iso(p.x, p.y, p.z);
      ctx.save();
      const grad = ctx.createRadialGradient(pt.x, pt.y, 1, pt.x, pt.y, p.radius);
      grad.addColorStop(0, `rgba(210, 230, 235, ${p.alpha * 0.5})`);
      grad.addColorStop(0.5, `rgba(180, 205, 215, ${p.alpha * 0.25})`);
      grad.addColorStop(1, 'rgba(150, 180, 190, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 4. Dynamic Rain Impacts on Ground
    ctx.save();
    ctx.fillStyle = 'rgba(195, 225, 240, 0.5)';
    for (const s of this.rainSplashes) {
      const pt = r.iso(s.x, s.y, 0);
      ctx.fillRect(pt.x, pt.y, 1.8, 1.8);
    }
    ctx.restore();
  }

  /**
   * Draws atmospheric low-altitude fog layers drifting above the wet streets.
   */
  drawVolumetricFog(r, ctx) {
    ctx.save();
    for (const fog of this.fogBands) {
      const p = r.iso(fog.x, fog.y, 6);
      const grad = ctx.createLinearGradient(p.x, p.y - 20, p.x, p.y + 20);
      grad.addColorStop(0, 'rgba(180, 200, 205, 0)');
      grad.addColorStop(0.5, `rgba(180, 200, 205, ${fog.baseAlpha})`);
      grad.addColorStop(1, 'rgba(180, 200, 205, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(p.x - fog.w / 2, p.y - fog.h / 2, fog.w, fog.h);
    }
    ctx.restore();
  }

  /**
   * Draws fluttering insects around street lamps.
   */
  drawStreetMoths(r, ctx, lightSources = []) {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 248, 200, 0.75)';
    for (const moth of this.moths) {
      const light = lightSources[moth.lightIndex % (lightSources.length || 1)];
      if (!light) continue;
      const lx = light.x + Math.cos(moth.angle) * moth.dist;
      const ly = light.y + Math.sin(moth.angle) * (moth.dist * 0.5);
      const p = r.iso(lx, ly, light.z + moth.yOffset);
      ctx.fillRect(p.x, p.y, 1.5, 1.5);
    }
    ctx.restore();
  }

  /**
   * Draws interior micro-lighting effects:
   * Cigarette smoke trails, warm lamp aura cones, flickering fluorescent hum.
   */
  drawInteriorAtmosphere(r, ctx, roomLights = []) {
    // 1. Rising cigarette smoke wisps
    ctx.save();
    for (const s of this.smokeTrails) {
      const progress = 1 - s.life / s.maxLife;
      const sway = Math.sin(this.time * s.freq + progress * 5) * s.amplitude * progress;
      const pt = r.project(s.x + sway, s.y, s.z);
      const alpha = (s.life / s.maxLife) * 0.35;
      ctx.fillStyle = `rgba(225, 235, 230, ${alpha})`;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 1.5 + progress * 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 2. Fluorescent tube flicker & warm lamp cones
    for (const light of roomLights) {
      if (light.kind === 'fluorescent') {
        const flicker = 1 + (Math.sin(this.time * 45 + light.x) > 0.94 ? (Math.random() - 0.5) * 0.35 : 0);
        const pt = r.project(light.x, light.y, light.z);
        ctx.save();
        ctx.fillStyle = `rgba(215, 235, 220, ${0.08 * flicker})`;
        ctx.beginPath();
        ctx.ellipse(pt.x, pt.y + 45, 75 * flicker, 35 * flicker, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (light.kind === 'tungsten') {
        const pt = r.project(light.x, light.y, light.z);
        ctx.save();
        const grad = ctx.createRadialGradient(pt.x, pt.y + 20, 2, pt.x, pt.y + 20, 90);
        grad.addColorStop(0, 'rgba(255, 205, 110, 0.22)');
        grad.addColorStop(0.6, 'rgba(255, 180, 80, 0.08)');
        grad.addColorStop(1, 'rgba(255, 180, 80, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(pt.x, pt.y + 20, 90, 45, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  /**
   * Draws facade micro-details:
   * Torn awnings fluttering in the wind, flickering neon signage.
   */
  drawFacadeDetails(r, ctx, building) {
    const {x, y, w, h} = building;
    const frontY = y + h;

    // Torn awning fluttering
    if (building.id === 'diner' || building.id === 'motel' || building.id === 'pharmacy') {
      const flutter = Math.sin(this.time * 6 + x) * 3;
      const p1 = r.iso(x + 15, frontY + 2, 42);
      const p2 = r.iso(x + w - 15, frontY + 2, 42);
      const p3 = r.iso(x + w - 15, frontY + 18, 32 + flutter);
      const p4 = r.iso(x + 15, frontY + 18, 32 + flutter);

      ctx.save();
      ctx.fillStyle = building.id === 'diner' ? '#8a3326' : '#3d6350';
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.lineTo(p4.x, p4.y);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Broken neon electrical flicker
    if (building.id === 'diner' || building.id === 'motel') {
      const isBuzzing = Math.sin(this.time * 28 + y) > -0.6;
      if (isBuzzing) {
        const signPos = r.iso(x + w / 2, frontY + 4, 75);
        ctx.save();
        ctx.shadowColor = building.id === 'motel' ? '#ff007f' : '#00f5d4';
        ctx.shadowBlur = 12;
        ctx.fillStyle = building.id === 'motel' ? 'rgba(255, 0, 127, 0.25)' : 'rgba(0, 245, 212, 0.25)';
        ctx.beginPath();
        ctx.arc(signPos.x, signPos.y, 25, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }
}
