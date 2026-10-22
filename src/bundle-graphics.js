// NorthVale — Sombras de 1989: Bundle Gráficos, Shaders e Projeção Isométrica 2.5D
'use strict';

(function(global) {
  // 1. Aleatoriedade Determinística e Hashing
  function hash(text) {
    let h = 2166136261;
    for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return h >>> 0;
  }

  function random(seed) {
    let s = typeof seed === 'string' ? hash(seed) : seed;
    return () => {
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ s >>> 15, 1 | s);
      t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // 2. Perfis Faciais Noir para Pintura Digital Procedural (Estilo Disco Elysium)
  const faceProfiles = {
    alex:   {skin:[177,138,109], hair:'#352f29', eyes:'#697c7e', age:38, seed:501, brow:5, jaw:.86, title:'Detetive Consultor'},
    helen:  {skin:[192,149,119], hair:'#69513d', eyes:'#618274', age:46, seed:900, brow:2, jaw:.73, title:'Mãe de Sarah'},
    ruth:   {skin:[158,113,86],  hair:'#34302b', eyes:'#7e6844', age:54, seed:307, brow:4, jaw:.82, title:'Sargento de Polícia'},
    elias:  {skin:[119,82,65],   hair:'#24282a', eyes:'#50462e', age:32, seed:702, brow:3, jaw:.78, title:'Farmacêutico'},
    owen:   {skin:[205,157,119], hair:'#8a7356', eyes:'#6a8595', age:58, seed:114, brow:6, jaw:.93, title:'Zelador do Depósito'},
    viktor: {skin:[185,142,115], hair:'#4a423a', eyes:'#5b686e', age:52, seed:342, brow:5, jaw:.95, title:'Magnata Industrial'},
    clara:  {skin:[208,168,142], hair:'#755038', eyes:'#607b66', age:29, seed:812, brow:2, jaw:.76, title:'Bibliotecária'},
    bobby:  {skin:[168,125,98],  hair:'#282420', eyes:'#4b3d32', age:36, seed:629, brow:6, jaw:.90, title:'Mecânico Forasteiro'}
  };

  const surfaceProfiles = {
    wood:    {seed:1, color:[103,77,49]},
    brick:   {seed:2, color:[113,78,63]},
    plaster: {seed:3, color:[139,145,126]},
    cloth:   {seed:4, color:[107,88,65]},
    stone:   {seed:5, color:[100,111,108]},
    asphalt: {seed:6, color:[47,62,65]}
  };

  function createOffscreenCanvas(size) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    return c;
  }

  // 3. Pintor Procedural de Retratos Analógicos (Sem Imagens Quebradas)
  function generateFace(profile, size = 128) {
    const base = createOffscreenCanvas(size), c = base.getContext('2d'),
      height = new Float32Array(size * size), rnd = random(profile.seed), image = c.createImageData(size, size);

    // Gradiente de fundo noir atmosférico
    const bgGrad = c.createRadialGradient(size/2, size/2, 10, size/2, size/2, size*0.75);
    bgGrad.addColorStop(0, '#222f33');
    bgGrad.addColorStop(1, '#0c1417');
    c.fillStyle = bgGrad;
    c.fillRect(0, 0, size, size);

    // Pintura da estrutura óssea e pele
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const nx = (x / size - .5) / (.29 * profile.jaw), ny = (y / size - .51) / .4, r = nx * nx + ny * ny, i = y * size + x;
      const noise = (rnd() - .5) * 12;
      const inside = r < 1;
      const contour = Math.sqrt(Math.max(0, 1 - r));
      const nose = Math.exp(-((nx / .19) ** 2 + ((ny - .03) / .4) ** 2));
      height[i] = inside ? contour * .65 + nose * .12 : 0;
      if (inside) {
        const shade = .72 + .28 * contour;
        const [rC, gC, bC] = profile.skin;
        image.data[i * 4] = Math.min(255, Math.max(0, rC * shade + noise));
        image.data[i * 4 + 1] = Math.min(255, Math.max(0, gC * shade + noise));
        image.data[i * 4 + 2] = Math.min(255, Math.max(0, bC * shade + noise));
        image.data[i * 4 + 3] = 255;
      }
    }
    c.putImageData(image, 0, 0);

    c.save();
    c.scale(size / 256, size / 256);

    // Olhos expressivos e profundos
    const space = 23 + (profile.seed % 7), ey = 117 + (profile.seed % 5);
    for (const sign of [-1, 1]) {
      const ex = 128 + space * sign;
      // Esclera e sombra da órbita
      c.fillStyle = '#2a1e1b'; c.beginPath(); c.ellipse(ex, ey, 14, 6, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#dfd6c0'; c.beginPath(); c.ellipse(ex, ey, 11, 4, 0, 0, Math.PI * 2); c.fill();
      // Íris
      c.fillStyle = profile.eyes; c.beginPath(); c.arc(ex + 1, ey, 3.5, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#101210'; c.beginPath(); c.arc(ex + 1, ey, 1.6, 0, Math.PI * 2); c.fill();
      // Ponto de luz no olhar
      c.fillStyle = '#ffffff'; c.beginPath(); c.arc(ex + 2, ey - 1, 0.8, 0, Math.PI * 2); c.fill();
      // Sobrancelha marcada
      c.strokeStyle = profile.hair; c.lineWidth = profile.brow + 1;
      c.beginPath(); c.moveTo(ex - 14, ey - 12); c.quadraticCurveTo(ex, ey - 18, ex + 13, ey - 11); c.stroke();
      // Rugas e olheiras
      if (profile.age > 35) {
        c.strokeStyle = 'rgba(75, 55, 45, 0.35)'; c.lineWidth = 1.2;
        c.beginPath(); c.moveTo(ex - 12, ey + 9); c.quadraticCurveTo(ex, ey + 13, ex + 12, ey + 9); c.stroke();
      }
    }

    // Nariz delineado
    c.strokeStyle = '#6e4738'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(130, 122); c.lineTo(123, 150); c.quadraticCurveTo(130, 156, 138, 149); c.stroke();

    // Lábios e expressão séria
    c.strokeStyle = '#5a342c'; c.lineWidth = 2.2;
    c.beginPath(); c.moveTo(112, 173); c.quadraticCurveTo(129, 178, 146, 172); c.stroke();

    // Cabelo estilizado com mechas
    c.fillStyle = profile.hair;
    c.beginPath();
    c.moveTo(58, 105);
    c.bezierCurveTo(46, -2, 210, -5, 200, 108);
    c.lineTo(182, 85);
    c.quadraticCurveTo(138, 48, 80, 86);
    c.closePath();
    c.fill();

    // Mechas de textura no cabelo
    c.strokeStyle = 'rgba(255, 255, 255, 0.12)'; c.lineWidth = 1.5;
    for (let k = 0; k < 6; k++) {
      c.beginPath();
      c.moveTo(85 + k * 18, 55);
      c.quadraticCurveTo(100 + k * 16, 75, 110 + k * 14, 105);
      c.stroke();
    }

    // Gola do casaco vintage / sobretudo noir
    c.fillStyle = '#1c2226';
    c.beginPath();
    c.moveTo(70, 256);
    c.lineTo(105, 195);
    c.lineTo(128, 225);
    c.lineTo(151, 195);
    c.lineTo(186, 256);
    c.closePath();
    c.fill();
    c.strokeStyle = '#323f46'; c.lineWidth = 2; c.stroke();

    c.restore();
    return {maps: {base}};
  }

  // Cache para que cada retrato seja pintado apenas uma vez e reutilizado
  const portraitCache = new Map();
  function getCharacterPortrait(speakerId, size = 128) {
    const key = (speakerId || 'alex').toLowerCase();
    if (portraitCache.has(key)) return portraitCache.get(key);

    const profile = faceProfiles[key] || faceProfiles.alex;
    const canvas = generateFace(profile, size).maps.base;
    portraitCache.set(key, canvas);
    return canvas;
  }

  // 4. Shaders GLSL para Materiais
  const materialVertex = `#version 300 es
precision highp float;
out vec2 vUv;
void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);vUv=p;gl_Position=vec4(p*2.0-1.0,0.0,1.0);}`;

  const materialFragment = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uBase;
uniform vec3 uAmbient;
void main(){
 vec4 base=texture(uBase,vUv);
 fragColor=vec4(base.rgb * uAmbient, base.a);
}`;

  const materialManifest = {
    version: 1,
    faces: Object.fromEntries(Object.entries(faceProfiles).map(([id,profile]) => [id, {id:`face:${id}`, kind:'face', profile, size:128, maps:null}])),
    surfaces: Object.fromEntries(Object.entries(surfaceProfiles).map(([id,profile]) => [id, {id:`surface:${id}`, kind:'surface', surface:id, profile, size:128, maps:null}]))
  };

  // 5. SpriteSheet & Actor
  class SpriteSheet {
    constructor({src, columns = 8, rows = 1, frameWidth, frameHeight}) {
      this.src = src.replace(/^\//, './');
      this.columns = columns; this.rows = rows;
      this.frameWidth = frameWidth; this.frameHeight = frameHeight;
      this.image = new Image();
      this.ready = new Promise(resolve => {
        this.image.onload = () => {
          this.frameWidth ||= this.image.naturalWidth / this.columns;
          this.frameHeight ||= this.image.naturalHeight / this.rows;
          resolve(this);
        };
        this.image.onerror = () => resolve(this);
      });
      this.image.src = this.src;
    }
    draw(ctx, direction, frame, x, y, {scale = 1, alpha = 1, anchorY = .91} = {}) {
      if (!this.image.complete || !this.image.naturalWidth) return false;
      const column = ((direction % this.columns) + this.columns) % this.columns;
      const row = ((frame % this.rows) + this.rows) % this.rows;
      const width = this.frameWidth * scale;
      const height = this.frameHeight * scale;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.drawImage(this.image, column * this.frameWidth, row * this.frameHeight, this.frameWidth, this.frameHeight, x - width / 2, y - height * anchorY, width, height);
      ctx.restore();
      return true;
    }
  }

  const ANGLE_TO_COLUMN = [6, 7, 0, 1, 2, 3, 4, 5];
  function directionFromVelocity(vx, vy, fallback = 0) {
    if (Math.hypot(vx, vy) < 0.01) return fallback;
    const sector = ((Math.round(Math.atan2(vy, vx) / (Math.PI / 4)) % 8) + 8) % 8;
    return ANGLE_TO_COLUMN[sector];
  }

  class SpriteActor {
    constructor({id, sheet, x, y, scale = 0.72, fps = 8, idle = false, direction = 0}) {
      Object.assign(this, {id, sheet, x, y, scale, fps, idle, direction});
      this.elapsed = 0; this.frame = 0; this.vx = 0; this.vy = 0;
    }
    update(dt, vx = 0, vy = 0) {
      this.vx = vx; this.vy = vy;
      const moving = Math.hypot(vx, vy) > 0.05;
      if (moving) this.direction = directionFromVelocity(vx, vy, this.direction);
      this.elapsed += dt;
      if (moving || !this.idle) {
        if (this.elapsed >= 1 / this.fps) { this.frame = (this.frame + 1) % (this.sheet?.rows || 1); this.elapsed = 0; }
      } else { this.frame = 0; }
    }
    draw(ctx) {
      if (!this.sheet) return false;
      return this.sheet.draw(ctx, this.direction, this.frame, this.x, this.y, {scale: this.scale});
    }
  }

  // 6. RainLayer
  class RainLayer {
    constructor(count = 320, seed = 'northvale-police-rain') {
      const rnd = random(seed);
      this.drops = Array.from({length: count}, () => ({
        x: rnd(), y: rnd(), speed: 0.45 + rnd() * 0.9, length: 12 + rnd() * 22, alpha: 0.12 + rnd() * 0.22
      }));
    }
    update(dt) {
      for (const drop of this.drops) {
        drop.y += drop.speed * dt; drop.x -= drop.speed * dt * 0.16;
        if (drop.y > 1.05) { drop.y = -0.05; drop.x = Math.random(); }
        if (drop.x < -0.05) drop.x = 1.05;
      }
    }
    draw(ctx, width, height, intensity = 1) {
      ctx.save(); ctx.lineWidth = 1; ctx.beginPath();
      for (const drop of this.drops) {
        ctx.strokeStyle = `rgba(165, 205, 220, ${drop.alpha * intensity})`;
        ctx.moveTo(drop.x * width, drop.y * height);
        ctx.lineTo(drop.x * width - drop.length * 0.35, drop.y * height + drop.length);
      }
      ctx.stroke(); ctx.restore();
    }
  }

  // 7. IsoCollisionMap
  function pointInPolygon(point, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], b = poly[j];
      const intersects = (a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x;
      if (intersects) inside = !inside;
    }
    return inside;
  }

  class IsoCollisionMap {
    constructor({width, height, tileSize = 32, walkable, obstacles = []}) {
      Object.assign(this, {width, height, tileSize, walkable, obstacles});
      this.columns = Math.ceil(width / tileSize);
      this.rows = Math.ceil(height / tileSize);
      this.matrix = Array.from({length: this.rows}, (_, row) =>
        Array.from({length: this.columns}, (_, col) =>
          this.blocked(col * tileSize + tileSize / 2, row * tileSize + tileSize / 2, 10) ? 1 : 0));
    }
    blocked(x, y, radius = 12) {
      const samples = [[0, 0], [radius, 0], [-radius, 0], [0, radius], [0, -radius]];
      return samples.some(([dx, dy]) => {
        const point = {x: x + dx, y: y + dy};
        return !pointInPolygon(point, this.walkable) || this.obstacles.some(obs => pointInPolygon(point, obs.points));
      });
    }
    move(body, dx, dy, radius = 12) {
      if (!this.blocked(body.x + dx, body.y, radius)) body.x += dx;
      if (!this.blocked(body.x, body.y + dy, radius)) body.y += dy;
    }
  }

  // 8. Delegacia Scene
  const POLICE_WALKABLE = [
    {x:74,y:642},{x:330,y:478},{x:535,y:326},{x:812,y:268},{x:1180,y:348},{x:1500,y:595},
    {x:1160,y:956},{x:905,y:1020},{x:430,y:1005},{x:122,y:817}
  ];
  const POLICE_OBSTACLES = [
    {id:'wall-left', points:[{x:50,y:350},{x:355,y:260},{x:405,y:500},{x:125,y:655}]},
    {id:'lockers', points:[{x:530,y:252},{x:840,y:205},{x:872,y:359},{x:565,y:425}]},
    {id:'desk-center', points:[{x:397,y:390},{x:688,y:358},{x:765,y:493},{x:466,y:615}]}
  ];

  class PoliceStationScene {
    constructor() {
      this.alexSheet = new SpriteSheet({src: './assets/characters/alex_hale_walk.png', columns: 8, rows: 6, frameWidth: 192, frameHeight: 192});
      this.ruthSheet = new SpriteSheet({src: './assets/characters/npc_sargento_idle.png', columns: 8, rows: 4, frameWidth: 192, frameHeight: 192});
      this.alex = new SpriteActor({id: 'alex', sheet: this.alexSheet, x: 520, y: 900, scale: 0.72, fps: 9, direction: 4});
      this.ruth = new SpriteActor({id: 'ruth', sheet: this.ruthSheet, x: 875, y: 485, scale: 0.72, fps: 2, idle: true, direction: 6});
      this.ready = Promise.all([this.alexSheet.ready, this.ruthSheet.ready]);
    }
  }

  class TownActors {
    constructor(police) {
      this.alex = police.alexSheet;
      this.ruth = police.ruthSheet;
      this.citizens = new SpriteSheet({src: './assets/characters/townspeople_walk.png', columns: 8, rows: 6});
      this.directions = new Map();
      this.ready = Promise.all([this.alex.ready, this.ruth.ready, this.citizens.ready]);
    }
    draw(r, {id, x, y, vx = 0, vy = 0, time = 0, angle = 0}) {
      const p = r.project(x, y), c = r.ctx, moving = Math.hypot(vx, vy) > 2;
      const dir = directionFromVelocity((vx - vy) * .866, (vx + vy) * .5, this.directions.get(id) ?? 0);
      this.directions.set(id, dir);
      const sheet = id === 'alex' ? this.alex : id === 'ruth' ? this.ruth : this.citizens;
      if (!sheet.image.naturalWidth) return false;
      const row = id === 'alex' ? (moving ? Math.floor(time * 9) % 6 : 0) : id === 'ruth' ? Math.floor(time * 2) % 4 : ({helen: 0, elias: 2, owen: 4}[id] ?? 0) + (moving ? Math.floor(time * 7) % 2 : 0);
      c.save(); c.fillStyle = '#06131b77'; c.beginPath(); c.ellipse(p.x, p.y + 1, 11, 4, 0, 0, Math.PI * 2); c.fill(); c.restore();
      return sheet.draw(c, dir, row, p.x, p.y, {scale: 50 / sheet.frameHeight, anchorY: sheet === this.citizens ? .98 : .91});
    }
  }

  // 9. RoofCutawaySystem
  class RoofCutawaySystem {
    constructor() {
      this.alphas = new Map();
      this.ripples = [];
      this.transitionDuration = 0.30;
    }
    update(dt, player, buildings, isInterior = false, currentInteriorId = null) {
      const fadeRate = dt / this.transitionDuration;
      for (const b of buildings) {
        const current = this.alphas.get(b.id) ?? 1.0;
        let target = 1.0;
        const insideCollision = player.x >= b.x && player.x <= b.x + b.w && player.y >= b.y && player.y <= b.y + b.h;
        const nearEntrance = Math.hypot(player.x - (b.x + b.w / 2), player.y - (b.y + b.h + 15)) < 75;
        if (isInterior) target = (currentInteriorId === b.id) ? 0.0 : 1.0;
        else if (insideCollision) target = 0.0;
        else if (nearEntrance) target = 0.22;
        else target = 1.0;

        let next = current;
        if (current < target) next = Math.min(target, current + fadeRate);
        else if (current > target) next = Math.max(target, current - fadeRate);
        this.alphas.set(b.id, next);
      }
      for (let i = this.ripples.length - 1; i >= 0; i--) {
        const r = this.ripples[i]; r.radius += dt * 32; r.alpha -= dt * 0.9;
        if (r.alpha <= 0) this.ripples.splice(i, 1);
      }
      if (this.ripples.length < 40 && Math.random() < 0.6) {
        this.ripples.push({x: Math.random() * 1900, y: Math.random() * 1700, radius: 2 + Math.random() * 4, alpha: 0.6 + Math.random() * 0.3});
      }
    }
    getAlpha(buildingId) { return this.alphas.get(buildingId) ?? 1.0; }
    drawPuddleReflections(r, c) {
      for (const rip of this.ripples) {
        const p = r.iso(rip.x, rip.y, 0);
        c.save(); c.strokeStyle = `rgba(168, 205, 215, ${rip.alpha * 0.35})`; c.lineWidth = 1.2;
        c.beginPath(); c.ellipse(p.x, p.y, rip.radius * 1.5, rip.radius * 0.75, 0, 0, Math.PI * 2); c.stroke(); c.restore();
      }
    }
    drawCrackedSidewalk(r, c, x, y, w, h) {
      const p1 = r.iso(x, y, 0), p2 = r.iso(x + w, y, 0), p3 = r.iso(x + w, y + h, 0), p4 = r.iso(x, y + h, 0);
      r.poly([p1, p2, p3, p4], '#455655', '#283838');
      c.save(); c.strokeStyle = '#1e2d2b'; c.lineWidth = 1.3; c.beginPath();
      const mid = r.iso(x + w * 0.45, y + h * 0.5, 0);
      c.moveTo(p1.x + 10, p1.y + 5); c.lineTo(mid.x, mid.y); c.lineTo(p3.x - 8, p3.y - 6); c.stroke(); c.restore();
    }
    drawProjectedShadow(r, c, actorX, actorY, lightX, lightY, shadowRadius = 24, blur = 14) {
      const dx = actorX - lightX, dy = actorY - lightY, dist = Math.hypot(dx, dy);
      if (dist > 350) return;
      const length = Math.min(55, (350 - dist) * 0.16);
      const shadowX = actorX + (dx / dist) * length, shadowY = actorY + (dy / dist) * length;
      const p = r.iso(shadowX, shadowY, 0);
      c.save(); c.shadowColor = 'rgba(2, 8, 12, 0.75)'; c.shadowBlur = blur; c.fillStyle = 'rgba(2, 8, 12, 0.45)';
      c.beginPath(); c.ellipse(p.x, p.y, shadowRadius * 1.4, shadowRadius * 0.65, Math.atan2(dy, dx), 0, Math.PI * 2); c.fill(); c.restore();
    }
    drawVolumetricShadow(r, c, x, y, z, w, d, h) {
      let shadowDx = h * 0.28, shadowDy = h * 0.42, shadowStrength = 0.32;
      const pBase0 = r.iso(x, y + d, 0), pBase1 = r.iso(x + w, y + d, 0), pBase2 = r.iso(x + w, y, 0);
      const pTop0 = r.iso(x + shadowDx, y + d + shadowDy, 0), pTop1 = r.iso(x + w + shadowDx, y + d + shadowDy, 0), pTop2 = r.iso(x + w + shadowDx, y + shadowDy, 0);
      c.save(); c.shadowColor = 'rgba(2, 6, 10, 0.7)'; c.shadowBlur = 10; c.fillStyle = `rgba(2, 6, 10, ${shadowStrength})`;
      c.beginPath(); c.moveTo(pBase0.x, pBase0.y); c.lineTo(pBase1.x, pBase1.y); c.lineTo(pBase2.x, pBase2.y);
      c.lineTo(pTop2.x, pTop2.y); c.lineTo(pTop1.x, pTop1.y); c.lineTo(pTop0.x, pTop0.y); c.closePath(); c.fill(); c.restore();
    }
  }

  // 10. EnvironmentManager (Vapor, Neblina, Folhas, Clutter)
  class EnvironmentManager {
    constructor() {
      this.time = 0;
      this.steamPuffs = []; this.fogBands = [];
      this.manholes = [{x: 740, y: 790, radius: 18}, {x: 1040, y: 840, radius: 18}, {x: 480, y: 770, radius: 18}, {x: 930, y: 450, radius: 16}];
      this.trashPiles = [{x: 540, y: 715, type: 'bin_overturned', angle: 0.4}, {x: 1060, y: 718, type: 'soggy_boxes', angle: -0.2}, {x: 310, y: 940, type: 'trash_scatter', angle: 0.1}];
      for (let k = 0; k < 6; k++) {
        this.fogBands.push({x: k * 350, y: 720 + (k % 3) * 60, w: 420 + (k % 4) * 80, h: 90, speed: 14 + (k % 3) * 6, baseAlpha: 0.09 + (k % 3) * 0.04});
      }
    }
    update(dt, player, isInterior = false) {
      this.time += dt;
      if (!isInterior) {
        for (const m of this.manholes) {
          if (Math.random() < 0.25 && this.steamPuffs.length < 45) {
            this.steamPuffs.push({x: m.x + (Math.random() - 0.5) * 8, y: m.y + (Math.random() - 0.5) * 8, z: 2, vz: 14 + Math.random() * 18, radius: 5, alpha: 0.45, life: 1.0});
          }
        }
        for (let i = this.steamPuffs.length - 1; i >= 0; i--) {
          const p = this.steamPuffs[i]; p.z += p.vz * dt; p.radius += dt * 8; p.life -= dt * 0.55; p.alpha = Math.max(0, p.life * 0.4);
          if (p.life <= 0) this.steamPuffs.splice(i, 1);
        }
        for (const f of this.fogBands) { f.x += f.speed * dt; if (f.x > 1950) f.x = -400; }
      }
    }
    drawOutdoorEnvironment(r, c, lightSources = []) {
      // Manholes steam
      for (const p of this.steamPuffs) {
        const pt = r.iso(p.x, p.y, p.z);
        c.save();
        const grad = c.createRadialGradient(pt.x, pt.y, 1, pt.x, pt.y, p.radius);
        grad.addColorStop(0, `rgba(215, 230, 235, ${p.alpha * 0.5})`);
        grad.addColorStop(1, 'rgba(150, 180, 190, 0)');
        c.fillStyle = grad;
        c.beginPath(); c.arc(pt.x, pt.y, p.radius, 0, Math.PI * 2); c.fill();
        c.restore();
      }
      // Low volumetric ground fog
      for (const f of this.fogBands) {
        const pt = r.iso(f.x, f.y, 4);
        c.save();
        const grad = c.createLinearGradient(pt.x, pt.y - 20, pt.x, pt.y + 20);
        grad.addColorStop(0, 'rgba(180, 205, 215, 0)');
        grad.addColorStop(0.5, `rgba(180, 205, 215, ${f.baseAlpha * 0.3})`);
        grad.addColorStop(1, 'rgba(180, 205, 215, 0)');
        c.fillStyle = grad;
        c.fillRect(pt.x - f.w / 2, pt.y - f.h / 2, f.w, f.h);
        c.restore();
      }
      // Trash piles and boxes
      for (const pile of this.trashPiles) {
        const pt = r.iso(pile.x, pile.y, 0);
        c.save();
        c.translate(pt.x, pt.y);
        c.rotate(pile.angle);
        c.fillStyle = '#415254'; c.fillRect(-10, -5, 20, 10);
        c.fillStyle = '#654321'; c.fillRect(8, -3, 8, 8);
        c.restore();
      }
    }
  }

  // 11. PlayerRenderer
  class PlayerRenderer {
    constructor({id = 'alex', sheet = null, targetHeight = 50, fps = 9} = {}) {
      this.id = id; this.sheet = sheet; this.targetHeight = targetHeight; this.fps = fps;
      this.walkTimer = 0; this.direction = 0; this.isMoving = false; this.idleTimer = 0;
    }
    setSheet(sheet) { this.sheet = sheet; }
    update(dt, vx = 0, vy = 0, angle = 0) {
      const speed = Math.hypot(vx, vy);
      this.isMoving = speed > 2;
      if (this.isMoving) {
        const isoVx = (vx - vy) * 0.866, isoVy = (vx + vy) * 0.5;
        this.direction = directionFromVelocity(isoVx, isoVy, this.direction);
        this.walkTimer += dt * Math.min(1.4, Math.max(0.6, speed / 80));
      } else {
        this.walkTimer = 0;
      }
      this.idleTimer += dt;
    }
    draw(ctx, screenX, screenY, options = {}) {
      const scale = options.scale || (this.sheet?.frameHeight ? this.targetHeight / this.sheet.frameHeight : 0.26);
      ctx.save();
      ctx.fillStyle = 'rgba(6, 18, 25, 0.55)';
      ctx.beginPath(); ctx.ellipse(screenX, screenY, 12, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();

      if (!this.sheet || !this.sheet.image || !this.sheet.image.complete || !this.sheet.image.naturalWidth) {
        this.drawProceduralFallback(ctx, screenX, screenY, this.isMoving);
        return;
      }
      const walkBob = this.isMoving ? Math.abs(Math.sin(this.walkTimer * 8)) * 2.5 : Math.sin(this.idleTimer * 2) * 0.8;
      const frameWidth = this.sheet.frameWidth, frameHeight = this.sheet.frameHeight;
      const renderWidth = frameWidth * scale, renderHeight = frameHeight * scale;
      const drawX = screenX, drawY = screenY - walkBob;
      ctx.save();
      const column = ((this.direction % this.sheet.columns) + this.sheet.columns) % this.sheet.columns;
      const row = this.isMoving ? (Math.floor(this.walkTimer * 8) % this.sheet.rows) : 0;
      ctx.drawImage(this.sheet.image, column * frameWidth, row * frameHeight, frameWidth, frameHeight, drawX - renderWidth / 2, drawY - renderHeight * 0.93, renderWidth, renderHeight);
      ctx.restore();
    }
    drawProceduralFallback(ctx, screenX, screenY, isMoving) {
      ctx.save();
      const bob = isMoving ? Math.sin(this.walkTimer * 8) * 2 : Math.sin(this.idleTimer * 2) * 0.8;
      const y = screenY + bob;
      ctx.fillStyle = '#2b2a26'; ctx.beginPath(); ctx.ellipse(screenX, y - 48, 5, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1c1b18'; ctx.fillRect(screenX - 7, y - 53, 14, 3); ctx.fillRect(screenX - 5, y - 58, 10, 6);
      ctx.fillStyle = '#423c33'; ctx.fillRect(screenX - 6, y - 41, 12, 22);
      ctx.fillStyle = '#2c2722'; ctx.fillRect(screenX - 5, y - 19, 4, 18); ctx.fillRect(screenX + 1, y - 19, 4, 18);
      ctx.restore();
    }
  }

  // 12. Fachadas Arquitetônicas Cuidadosamente Calibradas (Sem Chaminés Monolíticas)
  function drawTownFacade(r, b, minute) {
    const c = r.ctx, {x, y, w, h} = b, front = y + h, open = (minute / 60) % 24 >= b.open && (minute / 60) % 24 < b.close;
    const alpha = r.roofCutaway?.getAlpha(b.id) ?? 1.0;
    if (alpha < 0.98) {
      r.ground(x, y, w, h, b.kind === 'house' ? '#5a4635' : b.kind === 'industrial' ? '#434f4b' : '#3d4d4a');
      r.box(x, y, w, 6, 24, '#38433d', '#4d5c55');
      r.box(x, y, 6, h, 24, '#2e3833', '#4d5c55');
    }
    c.save();
    if (alpha < 0.99) c.globalAlpha = alpha;

    const p = (a, d, z) => r.project(a, d, z);
    const quad = (a, d, z, width, height, col, stroke = '#172729') => r.poly([p(a, d, z), p(a + width, d, z), p(a + width, d, z + height), p(a, d, z + height)], col, stroke);
    const box = (a, d, width, depth, height, col = b.color, roof = b.roof, base = 0) => {
      r.box(a, d, width, depth, height, col, roof, base);
      r.ground(a, d, width, depth, roof, height + base + .1);
    };
    const gable = (a, d, width, depth, base, rise, col = b.roof) => {
      r.poly([p(a, d, base), p(a + width / 2, d, base + rise), p(a + width / 2, d + depth, base + rise), p(a, d + depth, base)], col, '#23302c');
      r.poly([p(a + width / 2, d, base + rise), p(a + width, d, base), p(a + width, d + depth, base), p(a + width / 2, d + depth, base + rise)], '#394745', '#23302c');
      r.poly([p(a, d + depth, base), p(a + width / 2, d + depth, base + rise), p(a + width, d + depth, base)], b.color, '#25332e');
    };
    const windowRect = (a, z, width = 25, height = 30) => {
      quad(a, front + .7, z, width, height, open ? '#b3a570' : '#293f47');
      quad(a + 2, front + 1, z + 2, width - 4, height - 4, open ? '#817d5966' : '#5c788344');
    };
    const sign = (text, z, width = w * .9, color = '#d6c79f', back = '#223b38', center = x + w / 2) => {
      quad(center - width / 2, front + 3, z, width, 17, back);
      const q = p(center, front + 3.2, z + 4);
      c.save(); c.translate(q.x, q.y); c.transform(.866, .5, 0, 1, 0, 0);
      c.fillStyle = color; c.textAlign = 'center'; c.font = 'bold 10px Georgia';
      c.fillText(text, 0, 0, width - 8); c.restore();
    };

    r.ground(x + 18, y + 26, w + 14, h + 12, '#05121866');
    let height = 82;

    switch(b.id) {
      case 'police':
        // Arquitetura Cívica Clássica com Torre de Relógio Acabada e Telhado de Cobre
        height = 92;
        box(x, y, w, h, height, '#4d5c58', '#2e3d3b');
        box(x - 2, y - 2, w + 4, h + 4, 6, '#6b7b75', '#384846', height);
        
        // Torre central harmoniosa com telhado piramidal
        const twW = 56, twD = 52, twH = 46;
        const twX = x + w / 2 - twW / 2, twY = y + 18;
        box(twX, twY, twW, twD, twH, '#5a6b66', '#3b4c48', height + 6);
        gable(twX - 2, twY - 2, twW + 4, twD + 4, height + 6 + twH, 20, '#2e5446');

        // Mostrador do relógio analógico
        const clockPt = p(twX + twW / 2, twY + twD + 1, height + 6 + twH / 2);
        c.save();
        c.translate(clockPt.x, clockPt.y);
        c.fillStyle = '#f0e6c8';
        c.beginPath(); c.arc(0, 0, 10, 0, Math.PI * 2); c.fill();
        c.strokeStyle = '#1b2a26'; c.lineWidth = 1.5; c.stroke();
        c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -6); c.moveTo(0, 0); c.lineTo(4, 2); c.stroke();
        c.restore();

        // Antena de rádio policial com beacon vermelho
        const antPt = p(twX + twW / 2, twY + twD / 2, height + 6 + twH + 20);
        c.strokeStyle = '#859690'; c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(antPt.x, antPt.y); c.lineTo(antPt.x, antPt.y - 28); c.stroke();
        c.fillStyle = Math.sin(r.time * 6) > 0 ? '#ff2a2a' : '#550000';
        c.beginPath(); c.arc(antPt.x, antPt.y - 28, 2.5, 0, Math.PI * 2); c.fill();

        for (const wx of [x + 20, x + w - 50]) windowRect(wx, 28, 30, 36);
        sign('DELEGACIA DE NORTHVALE', 76, w - 20, '#dcd3b4', '#1f3330');
        break;

      case 'sarah':
        height = 74;
        box(x, y, w, h, height, '#7e6f5d', '#3f4b46');
        gable(x - 3, y - 3, w + 6, h + 6, height, 42, '#3f4b46');
        windowRect(x + 14, 24, 30, 28);
        windowRect(x + w - 44, 24, 30, 28);
        sign('CASA DOS MILLER', 62, 70, '#d7c28a', '#5f5948');
        break;

      case 'diner':
        height = 56;
        box(x, y, w, h, height, '#7a5a4c', '#4a3028');
        box(x - 2, front - 16, w + 4, 16, 5, '#8e382b', '#b54b3c', height);
        for (let a = x + 10; a < x + w - 25; a += 34) windowRect(a, 16, 26, 28);
        sign('DOUBLE R  •  DINER', 64, w * .82, '#ffb890', '#3b1c18');
        break;

      case 'pharmacy':
        height = 84;
        box(x, y, w, h, height, '#5f7366', '#35483e');
        windowRect(x + 12, 16, 52, 42);
        windowRect(x + w - 64, 16, 52, 42);
        sign('FARMÁCIA VALE  •  1937', 68, w - 16, '#cbe3c8', '#2d473a');
        break;

      case 'library':
        height = 118;
        box(x, y, w, h, height, '#7d7463', '#404944');
        gable(x - 2, y - 2, w + 4, h + 4, height, 32, '#48524d');
        for (const a of [x + 20, x + w - 54]) windowRect(a, 30, 34, 58);
        sign('BIBLIOTECA PÚBLICA', 98, w - 16, '#dfd8c2', '#2f3b37');
        break;

      case 'motel':
        height = 125;
        box(x, y, w, h, height, '#8c7d69', '#4d4138');
        for (const z of [12, 72]) {
          for (let a = x + 12; a < x + w - 30; a += 45) windowRect(a, z + 8, 22, 28);
        }
        sign('NORTHVALE  •  MOTEL', 132, w - 24, '#ff9e7d', '#3f2b23');
        break;

      default:
        box(x, y, w, h, height);
        sign(b.name, height - 12, w - 16);
    }

    // Porta real ancorada no solo
    quad(x + w / 2 - 13, front + 4, 0, 26, 46, '#263b35');
    c.restore();
  }

  // Exportar para escopo global
  global.NorthVale = global.NorthVale || {};
  Object.assign(global.NorthVale, {
    hash, random, faceProfiles, surfaceProfiles, materialManifest, generateFace, getCharacterPortrait,
    SpriteSheet, directionFromVelocity, SpriteActor, RainLayer, pointInPolygon, IsoCollisionMap,
    POLICE_WALKABLE, POLICE_OBSTACLES, PoliceStationScene, TownActors,
    RoofCutawaySystem, EnvironmentManager, PlayerRenderer, drawTownFacade
  });

  Object.assign(global, global.NorthVale);
})(typeof window !== 'undefined' ? window : globalThis);
