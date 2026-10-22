// NorthVale — Sombras de 1989: Bundle Principal, Motor Isométrico 2.5D e Loop do Jogo
'use strict';

(function(global) {
  // Projeção Isométrica 2.5D com Eixo Z (Altura)
  function iso(x, y, z = 0, originX = 660, originY = 170) {
    return {
      x: originX + (x - y) * 0.866,
      y: originY + (x + y) * 0.5 - z
    };
  }

  function shadeColor(col, percent) {
    if (!col || typeof col !== 'string') return col;
    if (col.startsWith('rgba') || col.startsWith('rgb')) return col;
    let num = parseInt(col.replace('#', ''), 16);
    if (isNaN(num)) return col;
    let r = (num >> 16) + Math.round(255 * percent);
    let g = ((num >> 8) & 0x00FF) + Math.round(255 * percent);
    let b = (num & 0x0000FF) + Math.round(255 * percent);
    r = Math.min(255, Math.max(0, r));
    g = Math.min(255, Math.max(0, g));
    b = Math.min(255, Math.max(0, b));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  class Renderer {
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

      this.roofCutaway = new (global.RoofCutawaySystem || RoofCutawaySystem)();
      this.assets = new (global.VisualAssets || VisualAssets)();
      this.assets.loadOverrides();
      this.lighting = new (global.InteriorLighting || InteriorLighting)();
      this.propSprites = new (global.SpriteCache || SpriteCache)();
      this.patterns = new WeakMap();
      this.focus = null;

      this.police = new (global.PoliceStationScene || PoliceStationScene)();
      this.townActors = new (global.TownActors || TownActors)(this.police);
      this.interiors = new (global.InteriorWorld || InteriorWorld)();
      this.interiorView = new (global.InteriorRoomRenderer || InteriorRoomRenderer)(this.interiors, this.police);
      this.envManager = new (global.EnvironmentManager || EnvironmentManager)();
      this.playerRenderer = new (global.PlayerRenderer || PlayerRenderer)({id: 'alex', sheet: this.police.alexSheet, targetHeight: 50});
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
      this.pixelRatio = Math.min(devicePixelRatio || 1, this.quality === 'low' ? 1 : 2);
      this.canvas.width = this.w * this.pixelRatio;
      this.canvas.height = this.h * this.pixelRatio;
    }

    iso(x, y, z = 0) {
      return {
        x: this.originX + (x - y) * 0.866,
        y: this.originY + (x + y) * 0.5 - z
      };
    }

    project(x, y, z = 0) {
      return this.iso(x, y, z);
    }

    poly(points, fill, stroke) {
      const c = this.ctx;
      c.beginPath();
      points.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y));
      c.closePath();
      if (fill) { c.fillStyle = fill; c.fill(); }
      if (stroke) { c.strokeStyle = stroke; c.lineWidth = 1; c.stroke(); }
    }

    ground(x, y, w, h, color, z = 0) {
      this.poly([
        this.iso(x, y, z),
        this.iso(x + w, y, z),
        this.iso(x + w, y + h, z),
        this.iso(x, y + h, z)
      ], color);
    }

    isoBox(x, y, w, d, h, options = {}) {
      const c = this.ctx, baseZ = options.baseZ || 0, stroke = options.stroke ?? '#172528';
      const color = options.color || '#5a6662', sideColor = options.sideColor || shadeColor(color, -0.22);
      const roofColor = options.roofColor || options.roof || shadeColor(color, 0.16);
      const roofAlpha = options.roofAlpha ?? 1.0, wallAlpha = options.wallAlpha ?? 1.0;
      const p = (a, b, z) => this.iso(a, b, z);

      if (wallAlpha > 0.01) {
        c.save(); if (wallAlpha < 1.0) c.globalAlpha = wallAlpha;
        this.poly([p(x, y + d, baseZ), p(x + w, y + d, baseZ), p(x + w, y + d, baseZ + h), p(x, y + d, baseZ + h)], color, stroke);
        this.poly([p(x + w, y, baseZ), p(x + w, y + d, baseZ), p(x + w, y + d, baseZ + h), p(x + w, y, baseZ + h)], sideColor, stroke);
        c.restore();
      }
      if (roofAlpha > 0.01) {
        c.save(); if (roofAlpha < 1.0) c.globalAlpha = roofAlpha;
        this.poly([p(x, y, baseZ + h), p(x + w, y, baseZ + h), p(x + w, y + d, baseZ + h), p(x, y + d, baseZ + h)], roofColor, stroke);
        c.restore();
      }
    }

    box(x, y, w, d, h, color, roof, base = 0, options = {}) {
      this.isoBox(x, y, w, d, h, {color, roofColor: roof, baseZ: base, ...options});
    }

    person(x, y, color, phase = 0, angle = 0, id = 'alex', vx = 0, vy = 0, z = 0) {
      if (id === 'alex') {
        const pt = this.iso(x, y, z);
        if (this.police?.alexSheet) this.playerRenderer.setSheet(this.police.alexSheet);
        this.playerRenderer.update(this.lastDt || 0.016, vx, vy, angle);
        this.playerRenderer.draw(this.ctx, pt.x, pt.y);
        return true;
      }
      return this.townActors.draw(this, {id, x, y, z, vx, vy, time: this.time, angle});
    }

    building(b, minute) {
      (global.drawTownFacade || drawTownFacade)(this, b, minute);
    }

    tree(x, y, i) {
      const p = this.iso(x, y, 0), c = this.ctx;
      this.ground(x, y, 35, 35, '#07191b55');
      c.fillStyle = '#3e4840'; c.fillRect(p.x - 3, p.y - 32, 6, 34);
      for (let k = 0; k < 3; k++) {
        const pt = this.iso(x, y, 20 + k * 18), r = 28 - k * 5;
        this.poly([{x: pt.x - r, y: pt.y}, {x: pt.x, y: pt.y - 48}, {x: pt.x + r, y: pt.y}], ['#203d37', '#29473b', '#335144'][(i + k) % 3], '#142521');
      }
    }

    car(car) {
      const {x, y, angle: a} = car, c = this.ctx;
      const local = (dx, dy, z = 0) => this.iso(x + Math.cos(a) * dx - Math.sin(a) * dy, y + Math.sin(a) * dx + Math.cos(a) * dy, z);
      const q = (x1, y1, x2, y2, z, color) => this.poly([local(x1, y1, z), local(x2, y1, z), local(x2, y2, z), local(x1, y2, z)], color, '#172329');
      q(-35, -15, 35, 15, 11, '#9aaba5');
      q(-15, -13, 12, 13, 25, '#c3cbc0');
    }

    draw(state, dt, cinematic = false) {
      this.time += dt; this.lastDt = dt;
      this.envManager.update(dt, state.player, Boolean(state.interior));
      this.roofCutaway.update(dt, state.player, global.buildings || buildings, Boolean(state.interior), state.interior);

      const c = this.ctx;
      c.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
      c.fillStyle = '#172c32';
      c.fillRect(0, 0, this.w, this.h);

      if (state.interior) {
        if (this.interiors.loaded) {
          this.interiorView.draw(this, state);
        } else {
          c.fillStyle = '#d6d0b5'; c.font = '18px Georgia';
          c.fillText('Carregando interior de NorthVale…', 50, this.h / 2);
        }
        this.drawVignette(c);
        return;
      }

      const target = state.driving ? state.car : state.player;
      this.camera.x += (target.x - this.camera.x) * Math.min(1, dt * 4);
      this.camera.y += (target.y - this.camera.y) * Math.min(1, dt * 4);

      const cam = this.iso(this.camera.x, this.camera.y, 0);
      c.save();
      c.translate(this.w / 2 - cam.x, this.h * 0.55 - cam.y);
      this.drawTown(state, cinematic);
      c.restore();

      this.drawVignette(c);

      if (this.rain) {
        c.save(); c.strokeStyle = '#adc4ca45'; c.lineWidth = 0.9; c.beginPath();
        for (let i = 0; i < 240; i++) {
          const x = (i * 137.37 - this.time * 260) % this.w;
          const y = (i * 71.79 + this.time * 540) % this.h;
          c.moveTo(x, y); c.lineTo(x - 11, y + 24);
        }
        c.stroke(); c.restore();
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

    drawTown(s, cinematic) {
      const c = this.ctx;
      const bList = global.buildings || buildings, wDef = global.WORLD || WORLD;
      this.ground(0, 0, wDef.width, wDef.height, '#30493e');
      for (const r of wDef.roads) {
        this.ground(r.x, r.y, r.w, r.h, '#2c3d43');
      }
      this.roofCutaway.drawPuddleReflections(this, c);

      const renderQueue = [];
      for (const b of bList) {
        renderQueue.push({
          worldX: b.x + b.w, worldY: b.y + b.h,
          draw: () => {
            this.roofCutaway.drawVolumetricShadow(this, c, b.x, b.y, 0, b.w, b.h, 75);
            this.building(b, s.minute);
          }
        });
      }

      const resList = global.residents || residents;
      for (const npc of resList) {
        let p = (global.residentPosition || residentPosition)(npc, s.minute);
        if (cinematic && npc.id === 'ruth') p = {x: 740, y: 695, inside: false};
        if (!p.inside) {
          renderQueue.push({
            worldX: p.x, worldY: p.y,
            draw: () => this.person(p.x, p.y, npc.color, 0, 0, npc.id)
          });
        }
      }

      renderQueue.push({
        worldX: s.car.x, worldY: s.car.y,
        draw: () => this.car(s.car)
      });

      if (!s.driving) {
        renderQueue.push({
          worldX: s.player.x, worldY: s.player.y,
          draw: () => this.person(s.player.x, s.player.y, '#a3906c', 0, s.player.angle, 'alex', s.player.vx, s.player.vy)
        });
      }

      renderQueue.sort((a, b) => (a.worldY + a.worldX) - (b.worldY + b.worldX));
      for (const item of renderQueue) item.draw();
    }
  }

  // 2. Inicialização do Jogo
  const $ = s => document.querySelector(s);
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const time = m => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(Math.floor(m % 60)).padStart(2, '0')}`;

  let state = (global.createState || createState)();
  const renderer = new Renderer(document.querySelector('canvas'));
  const audio = new (global.AudioSystem || AudioSystem)();
  const keys = new Set();
  const panel = document.querySelector('#panel');
  const content = document.querySelector('#content');
  const dialogue = new (global.DialogueSystem || DialogueSystem)();

  let started = false;
  let cinematic = false;
  let sceneTime = 0;
  let last = performance.now();
  let toastTimer = 0;
  let near = null;

  function toast(text) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = text;
    el.style.display = 'block';
    toastTimer = 5;
  }

  function show(html) {
    if (!content) return;
    content.innerHTML = html;
    keys.clear();
    if (!panel.open) panel.showModal();
  }

  function close() {
    if (panel.open) panel.close();
    keys.clear();
  }

  $('#close')?.addEventListener('click', close);

  const achievements = new (global.AchievementSystem || AchievementSystem)(state, toast);
  const endings = new (global.EndingsEvaluator || EndingsEvaluator)(state);
  const corkboard = new (global.CorkboardSystem || CorkboardSystem)(state, (global.getFullCluesRegistry || getFullCluesRegistry)(state), null, achievements);
  const interrogation = new (global.InterrogationSystem || InterrogationSystem)(state, (global.getFullCluesRegistry || getFullCluesRegistry)(state), null, achievements);
  const tailing = new (global.TailingSystem || TailingSystem)(state, achievements, null);

  $('#begin')?.addEventListener('click', () => {
    $('#intro').hidden = true;
    started = true;
    cinematic = true;
    sceneTime = 0;
  });

  $('#corkboard-btn')?.addEventListener('click', () => corkboard.open());
  $('#sound')?.addEventListener('click', () => {
    $('#sound').textContent = 'Som: ' + (audio.toggle() ? 'ligado' : 'desligado');
  });

  function findNearby() {
    if (state.interior) {
      if (!renderer.interiors.loaded) return null;
      const t = renderer.interiors.targets(state)[0];
      return t ? {type: 'interior', target: t, label: 'E · Interagir com ' + t.name} : null;
    }
    const npc = (global.residents || residents).find(p => {
      const pos = (global.residentPosition || residentPosition)(p, state.minute);
      return !pos.inside && distance(state.player, pos) < 55;
    });
    if (npc) return {type: 'npc', npc, label: `E · Falar com ${npc.name}  |  I · Interrogar`};
    const b = (global.buildings || buildings).find(b => distance(state.player, (global.door || door)(b)) < 65);
    if (b) return {type: 'door', building: b, label: 'E · Entrar em ' + b.name};
    return null;
  }

  async function interact() {
    if (!near) return;
    audio.tone(300);
    if (near.type === 'door') {
      const b = near.building;
      state.outdoor = {...state.player};
      state.interior = b.id;
      state.interiorRoom = null;
      renderer.interiors.enter(state, {fromStreet: true});
      near = null;
    } else if (near.type === 'interior') {
      const res = renderer.interiors.interact(state, near.target);
      if (res.exit) {
        state.player = {...(state.outdoor || {x: 720, y: 705}), vx: 0, vy: 0};
        state.interior = null;
      } else if (res.message) {
        toast(res.message);
      }
    } else if (near.type === 'npc') {
      dialogue.play([
        {speaker: near.npc.id, name: near.npc.name, text: 'A tempestade piora a cada hora em NorthVale...'}
      ]);
    }
  }

  window.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (e.key === ' ' && cinematic) {
      cinematic = false;
      toast('Helen entregou a chave da casa. [C] Cortiça | [M] Mapa | [E] Interagir');
      return;
    }
    if (k === 'e') interact();
    if (k === 'c') corkboard.open();
    if (k === 'i' && near?.npc) interrogation.start(near.npc, state.case);
    keys.add(k);
  });

  window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));

  function update(dt) {
    if (!started) return;
    if (cinematic) {
      sceneTime += dt;
      if (sceneTime > 12) cinematic = false;
      return;
    }
    state.minute += dt * 1.5;
    const forward = keys.has('w') || keys.has('arrowup');
    const back = keys.has('s') || keys.has('arrowdown');
    const left = keys.has('a') || keys.has('arrowleft');
    const right = keys.has('d') || keys.has('arrowright');
    let sx = (right ? 1 : 0) - (left ? 1 : 0), sy = (back ? 1 : 0) - (forward ? 1 : 0);
    const mag = Math.hypot(sx, sy);
    if (mag) { sx /= mag; sy /= mag; }
    const speed = keys.has('shift') ? 160 : 95;
    const tx = (sx + sy) * 0.7071 * speed, ty = (sy - sx) * 0.7071 * speed;
    state.player.vx += (tx - state.player.vx) * (1 - Math.exp(-10 * dt));
    state.player.vy += (ty - state.player.vy) * (1 - Math.exp(-10 * dt));
    if (mag) state.player.angle = Math.atan2(ty, tx);

    if (state.interior) {
      renderer.interiors.move(state, state.player.vx * dt, state.player.vy * dt);
    } else {
      (global.move || move)(state.player, state.player.vx * dt, state.player.vy * dt);
    }
    near = findNearby();
  }

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    update(dt);
    renderer.draw(state, dt, cinematic);
    if (toastTimer > 0) {
      toastTimer -= dt;
      if (toastTimer <= 0) $('#toast').style.display = 'none';
    }
    const statusEl = $('#status');
    if (statusEl) statusEl.textContent = `TER 17 OUT 1989  /  ${time(state.minute)}  /  ALEX HALE`;
    const locEl = $('#location');
    if (locEl) locEl.textContent = state.interior ? (global.buildings || buildings).find(b => b.id === state.interior)?.name || 'INTERIOR' : 'CENTRO · NORTHVALE';
    const promptEl = $('#prompt');
    if (promptEl) {
      promptEl.style.display = near && !cinematic && !panel.open && !dialogue.active ? 'block' : 'none';
      promptEl.textContent = near?.label || '';
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  global.NorthVale = global.NorthVale || {};
  Object.assign(global.NorthVale, {Renderer, state, renderer, audio});
})(typeof window !== 'undefined' ? window : globalThis);
