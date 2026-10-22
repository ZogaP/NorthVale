// NorthVale — Sombras de 1989: Bundle Interiores, Cômodos Conectados e Portas
'use strict';

(function(global) {
  // 1. Geometria de Cômodos e Portais
  function doorPort(door, room) {
    return door.a.room === room.id ? door.a : door.b;
  }

  function portalGeometry(port, room) {
    const {w, h} = room.bounds, size = port.width;
    if (port.side === 'marker') {
      return {x: port.x - size / 2, y: port.y - 8, w: size, h: 16, approach: port.approach, anchor: {x: port.x, y: port.y}};
    }
    if (port.side === 'north' || port.side === 'south') {
      const y = port.side === 'north' ? 12 : h - 28;
      return {x: port.offset - size / 2, y, w: size, h: 16, approach: {x: port.offset, y: port.side === 'north' ? 72 : h - 72}, anchor: {x: port.offset, y: port.side === 'north' ? 14 : h - 14}};
    }
    const x = port.side === 'west' ? 12 : w - 28;
    return {x, y: port.offset - size / 2, w: 16, h: size, approach: {x: port.side === 'west' ? 72 : w - 72, y: port.offset}, anchor: {x: port.side === 'west' ? 14 : w - 14, y: port.offset}};
  }

  function boundsPolygon(o, pad = 0) {
    return [
      {x: o.x - pad, y: o.y - pad},
      {x: o.x + o.w + pad, y: o.y - pad},
      {x: o.x + o.w + pad, y: o.y + o.h + pad},
      {x: o.x - pad, y: o.y + o.h + pad}
    ];
  }

  function distanceToBox(p, o) {
    return Math.hypot(Math.max(o.x - p.x, 0, p.x - o.x - o.w), Math.max(o.y - p.y, 0, p.y - o.y - o.h));
  }

  function circleHits(p, o, r = 10) {
    return distanceToBox(p, o) < r;
  }

  // 2. Ambientação Procedural de Detalhes (Dressing)
  function dressRoom(building, room) {
    const rnd = (global.random || random)(`${building}:${room.id}:${room.dressing?.seed || 'seed'}`);
    const detail = [], types = room.dressing?.types || ['paper', 'mud'], counts = {};
    const density = room.dressing?.density || 30;
    const supports = room.props.filter(p => ['table', 'steel', 'counter', 'shelf', 'files', 'catalog'].includes(p.type));
    for (let i = 0; i < density; i++) {
      let type = types[i % types.length];
      const cap = {calendar: 1, directory: 1, calculator: 1, wire: 3, damp: 8, photos: 4, mug: 5, flyer: 4};
      if ((counts[type] || 0) >= (cap[type] ?? Infinity)) {
        type = room.finish?.condition === 'clean' ? 'paper' : ['dust', 'mud', 'ash'][i % 3];
      }
      counts[type] = (counts[type] || 0) + 1;
      if (type === 'calendar') {
        detail.push({id: `detail-${i}`, type, name: 'Calendário de outubro de 1989', x: room.bounds.w * .56, y: 10, w: 31, h: 6, height: 36, baseZ: 43, solid: false, interactive: false});
        continue;
      }
      const surface = ['mug', 'pen', 'ashtray', 'calculator', 'directory', 'flyer', 'books', 'paper', 'photos'].includes(type);
      const parent = surface && supports.length ? supports[Math.floor(rnd() * supports.length)] : null;
      const width = type === 'mud' ? 9 : type === 'damp' ? 26 : 5 + rnd() * 10;
      const height = type === 'damp' ? 16 : 4 + rnd() * 8;
      const x = parent ? parent.x + 3 + rnd() * Math.max(1, parent.w - width - 6) : 22 + rnd() * (room.bounds.w - 50);
      const y = parent ? parent.y + 3 + rnd() * Math.max(1, parent.h - height - 6) : 22 + rnd() * (room.bounds.h - 50);
      detail.push({
        id: `detail-${i}`, type, name: room.dressing?.story || 'Vestígios de 1989',
        x, y, w: width, h: height, height: type === 'mug' ? 8 : type === 'bottle' ? 12 : 1,
        baseZ: parent ? parent.height + 1 : .15, parentId: parent?.id, solid: false, interactive: false,
        color: ['#b5aa83', '#8b7855', '#676b50', '#727e73'][Math.floor(rnd() * 4)],
        seed: (global.hash || hash)(`${room.id}:${i}`)
      });
    }
    return detail;
  }

  // 3. Manifesto de Interiores e Validação
  const INTERIOR_IDS = ['sarah','police','ruth','pharmacy','library','motel','registry','meatpacking','home','diner','scrapyard','gasstation','depot','dam','ruins'];
  const identifier = v => typeof v === 'string' && /^[a-z][a-z0-9-]{0,70}$/.test(v);
  const finite = (v, min, max) => Number.isFinite(v) && v >= min && v <= max;

  function validateManifest(data) {
    if (!data || data.version !== 1 || !identifier(data.id) || !Array.isArray(data.rooms) || !data.rooms.length) {
      throw Error('Manifesto de interior inválido.');
    }
    return data;
  }

  class InteriorManifestLoader {
    constructor({embedded = globalThis.NORTHVALE_INTERIORS} = {}) {
      this.embedded = embedded;
      this.manifests = new Map();
      this.pending = null;
    }
    load() {
      if (this.pending) return this.pending;
      this.pending = Promise.resolve().then(() => {
        const entries = [];
        for (const id of INTERIOR_IDS) {
          const data = this.embedded?.[id];
          if (!data) throw Error(`Interior não encontrado no modo offline: ${id}`);
          validateManifest(data);
          entries.push([id, data]);
        }
        this.manifests = new Map(entries);
        return this.manifests;
      });
      return this.pending;
    }
    get(id) {
      const data = this.manifests.get(id);
      if (!data) throw Error(`Interior não carregado: ${id}`);
      return data;
    }
  }

  // 4. Sistema de Estado e Salvamento de Objetos
  function globalObjectId(building, room, object) {
    return `northvale:${building}:${room}:${object}`;
  }

  class SaveSystem {
    constructor(state) {
      this.state = state;
      state.interiorStates ??= {};
    }
    read(id, defaults = {}) {
      return {...defaults, ...this.state.interiorStates[id]};
    }
    patch(id, changes) {
      const next = {...this.state.interiorStates[id], ...changes};
      this.state.interiorStates[id] = next;
      return next;
    }
    interact(id, changes = {}) {
      return this.patch(id, {...changes, interactions: (this.read(id).interactions || 0) + 1});
    }
    save(storage) {
      storage.setItem('northvale-save', (global.serialize || serialize)(this.state));
    }
    static load(storage) {
      return (global.readSave || readSave)(storage);
    }
  }

  // 5. InternalDoor & InteriorWorld
  class InternalDoor {
    constructor(building, definition) {
      this.definition = definition;
      this.id = globalObjectId(building, 'doors', definition.id);
    }
    state(save) {
      return save.read(this.id, {isOpen: this.definition.isOpen, isLocked: this.definition.isLocked});
    }
    open(save, inventory, from) {
      const current = this.state(save);
      if (current.isLocked && !inventory.includes(this.definition.requiresKey) && this.definition.latchFrom !== from) {
        if (inventory.includes('Gazua de Aço')) {
          save.interact(this.id, {isOpen: true, isLocked: false});
          return {ok: true, message: 'Fechadura forçada com Gazua de Aço [Perícia Policial]!'};
        }
        return {ok: false, message: `Trancada. Requer: ${this.definition.requiresKey || 'chave específica'}.`};
      }
      save.interact(this.id, {isOpen: true, isLocked: false});
      return {ok: true};
    }
    close(save, player, geometry) {
      if (circleHits(player, geometry, 14)) return {ok: false, message: 'Afaste-se da folha da porta para fechá-la.'};
      save.interact(this.id, {isOpen: false});
      return {ok: true, message: 'Porta fechada.'};
    }
    lock(save, player, geometry, from, inventory) {
      const current = this.state(save);
      if (current.isLocked) {
        if (this.definition.requiresKey && !inventory.includes(this.definition.requiresKey) && this.definition.latchFrom !== from) {
          return {ok: false, message: 'Você não tem a chave desta porta.'};
        }
        save.interact(this.id, {isLocked: false});
        return {ok: true, message: 'Porta destrancada.'};
      }
      if (this.definition.requiresKey && !inventory.includes(this.definition.requiresKey) && this.definition.latchFrom !== from) {
        return {ok: false, message: 'Você não tem a chave desta porta.'};
      }
      const closed = this.close(save, player, geometry);
      if (!closed.ok) return closed;
      save.patch(this.id, {isLocked: true});
      return {ok: true, message: 'Porta trancada por dentro.'};
    }
  }

  class InteriorWorld {
    constructor(loader = new InteriorManifestLoader()) {
      this.loader = loader;
      this.loaded = false;
      this.error = null;
      this.transition = null;
      this.navigation = null;
      this.collisionCache = new Map();
      this.doorCache = new Map();
      this.ready = loader.load().then(() => { this.loaded = true; return this; }).catch(err => { this.error = err; throw err; });
    }
    manifest(state) { return this.loader.get(state.interior); }
    room(state) {
      const m = this.manifest(state);
      return m.rooms.find(r => r.id === state.interiorRoom) || m.rooms.find(r => r.id === m.entranceRoom);
    }
    save(state) { return new SaveSystem(state); }
    objectId(state, object) { return globalObjectId(state.interior, this.room(state).id, object.id); }
    door(state, definition) {
      const id = globalObjectId(state.interior, 'doors', definition.id);
      if (!this.doorCache.has(id)) this.doorCache.set(id, new InternalDoor(state.interior, definition));
      return this.doorCache.get(id);
    }
    collision(state) {
      const room = this.room(state), key = `${state.interior}:${room.id}`;
      if (!this.collisionCache.has(key)) {
        const walkable = [{x: 12, y: 12}, {x: room.bounds.w - 12, y: 12}, {x: room.bounds.w - 12, y: room.bounds.h - 12}, {x: 12, y: room.bounds.h - 12}];
        const obstacles = room.props.filter(o => o.solid).map(o => ({id: o.id, points: boundsPolygon(o)}));
        this.collisionCache.set(key, new (global.IsoCollisionMap || IsoCollisionMap)({width: room.bounds.w, height: room.bounds.h, tileSize: 16, walkable, obstacles}));
      }
      return this.collisionCache.get(key);
    }
    doors(state) {
      const room = this.room(state);
      return this.manifest(state).doors.filter(d => d.a.room === room.id || d.b.room === room.id).map(definition => {
        const door = this.door(state, definition), port = doorPort(definition, room), geometry = portalGeometry(port, room);
        const other = definition.a.room === room.id ? definition.b.room : definition.a.room;
        const name = this.manifest(state).rooms.find(r => r.id === other)?.name || 'Outro cômodo';
        return {kind: 'door', id: definition.id, globalId: door.id, name, definition, door, port, geometry, ...geometry, ...door.state(this.save(state)), range: 98};
      });
    }
    blocked(state, x, y, radius = 10) {
      return this.collision(state).blocked(x, y, radius) || this.doors(state).some(d => !d.isOpen && circleHits({x, y}, d.geometry, radius));
    }
    repairPosition(state, desired) {
      if (!this.blocked(state, desired.x, desired.y)) return desired;
      const room = this.room(state);
      let best = null, minDist = Infinity;
      for (let y = 32; y < room.bounds.h - 20; y += 16) for (let x = 32; x < room.bounds.w - 20; x += 16) {
        const d = Math.hypot(x - desired.x, y - desired.y);
        if (d < minDist && !this.blocked(state, x, y)) { best = {x, y}; minDist = d; }
      }
      return best || desired;
    }
    enter(state, {fromStreet = false} = {}) {
      this.transition = null; this.navigation = null;
      const m = this.manifest(state);
      if (fromStreet || !m.rooms.some(r => r.id === state.interiorRoom)) state.interiorRoom = m.entranceRoom;
      const room = this.room(state), point = this.repairPosition(state, fromStreet ? room.spawn : state.player);
      Object.assign(state.player, point, {vx: 0, vy: 0});
      this.save(state).patch(globalObjectId(state.interior, room.id, 'visit'), {visited: true});
      return room;
    }
    targets(state) {
      const room = this.room(state), m = this.manifest(state);
      const list = room.props.filter(o => o.interactive !== false).map(object => ({
        kind: 'prop', id: object.id, name: object.name, object, globalId: this.objectId(state, object),
        x: object.x, y: object.y, w: object.w, h: object.h, range: object.range || 78, approach: object.approach
      }));
      list.push(...this.doors(state));
      if (m.exit.room === room.id) {
        list.push({kind: 'exit', id: 'exit', name: 'Sair para a rua', ...m.exit, x: m.exit.x - m.exit.w / 2, y: m.exit.y - m.exit.h / 2, anchor: {x: m.exit.x, y: m.exit.y}, range: m.exit.range || 65});
      }
      return list;
    }
    distance(state, target) {
      return target.kind === 'door' ? Math.hypot(state.player.x - target.approach.x, state.player.y - target.approach.y) : distanceToBox(state.player, target);
    }
    nearby(state, hovered = null) {
      const targets = this.targets(state);
      if (hovered) {
        const cand = targets.find(t => t.kind === hovered.kind && t.id === hovered.id);
        if (cand && this.distance(state, cand) <= cand.range) return cand;
      }
      return targets.filter(t => this.distance(state, t) <= t.range).sort((a, b) => this.distance(state, a) - this.distance(state, b))[0] || null;
    }
    useDoor(state, target) {
      if (this.transition) return {ok: false};
      if (this.distance(state, target) > target.range) return {ok: false, message: 'Aproxime-se da porta.'};
      const result = target.door.open(this.save(state), state.inventory, this.room(state).id);
      if (!result.ok) return result;
      const def = target.definition, other = def.a.room === state.interiorRoom ? def.b : def.a;
      const room = this.manifest(state).rooms.find(r => r.id === other.room), geom = portalGeometry(other, room);
      this.navigation = null; state.player.vx = state.player.vy = 0;
      this.transition = {from: state.interiorRoom, to: room.id, spawn: geom.approach, elapsed: 0, duration: .36, switched: false};
      return {ok: true, message: `Entrando: ${room.name}`};
    }
    doorAction(state, target, action) {
      if (this.distance(state, target) > target.range) return {ok: false, message: 'Aproxime-se da porta.'};
      return action === 'lock' ? target.door.lock(this.save(state), state.player, target.geometry, state.interiorRoom, state.inventory) : target.door.close(this.save(state), state.player, target.geometry);
    }
    interact(state, target) {
      if (target.kind === 'door') return this.useDoor(state, target);
      if (target.kind === 'exit') return {ok: true, exit: true};
      if (this.distance(state, target) > target.range) return {ok: false, message: 'Aproxime-se do objeto.'};
      const object = target.object, save = this.save(state), previous = save.read(target.globalId);
      const changes = {searched: true};
      if (['drawer', 'stash'].includes(object.action)) changes.isOpen = !previous.isOpen;
      if (object.action === 'switch') {
        const lights = this.room(state).lights.filter(l => l.kind !== 'moon');
        const on = lights.some(l => save.read(globalObjectId(state.interior, state.interiorRoom, 'light-' + l.id), {isOn: l.isOn}).isOn);
        for (const l of lights) save.patch(globalObjectId(state.interior, state.interiorRoom, 'light-' + l.id), {isOn: !on});
        changes.isOn = !on;
      }
      save.interact(target.globalId, changes);
      state.interactions[target.globalId] = (state.interactions[target.globalId] || 0) + 1;
      let message = object.text;
      if (object.givesKey && !state.inventory.includes(object.givesKey)) {
        state.inventory.push(object.givesKey);
        message += ` Você encontrou: ${object.givesKey}.`;
      }
      if (object.action === 'switch') message = changes.isOn ? 'Luzes do cômodo ligadas.' : 'Luzes do cômodo apagadas.';
      return {ok: true, message, evidence: object.evidence, dialogue: object.action?.endsWith('dialogue') ? object.action : null, object};
    }
    move(state, dx, dy) {
      const p = state.player, steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 5));
      for (let i = 0; i < steps; i++) {
        if (!this.blocked(state, p.x + dx / steps, p.y)) p.x += dx / steps;
        if (!this.blocked(state, p.x, p.y + dy / steps)) p.y += dy / steps;
      }
    }
  }

  // 6. RoomPropPainter & InteriorRoomRenderer
  class RoomPropPainter {
    constructor() { this.cache = new (global.SpriteCache || SpriteCache)(24 * 1024 * 1024); }
    draw(renderer, object, variant, roomKey) {
      (global.drawProp || drawProp)(renderer, object);
    }
  }

  class InteriorRoomRenderer {
    constructor(world, police) {
      this.world = world;
      this.police = police;
      this.painter = new RoomPropPainter();
      this.playerRenderer = new (global.PlayerRenderer || PlayerRenderer)({id: 'alex', sheet: police.alexSheet, targetHeight: 50});
    }
    draw(r, state, focus = null) {
      const c = r.ctx, room = this.world.room(state);
      const manifest = this.world.manifest(state);
      c.save();
      // Render interior base, walls, floor tiles
      const originX = r.originX || 660, originY = r.originY || 170;
      r.ground(0, 0, room.bounds.w, room.bounds.h, room.finish?.floor || '#4d4f48');
      r.box(0, 0, room.bounds.w, 8, 70, '#3a3d36', '#4e544a');
      r.box(0, 0, 8, room.bounds.h, 70, '#2f332c', '#4e544a');

      // Props sorted by isometric depth
      const allProps = [...room.props, ...dressRoom(manifest.id, room)];
      const drawables = allProps.map(p => ({
        depth: p.x + p.y + (p.w || 0) + (p.h || 0),
        draw: () => (global.drawProp || drawProp)(r, p)
      }));

      // Player in room
      drawables.push({
        depth: state.player.x + state.player.y,
        draw: () => {
          const pt = r.project(state.player.x, state.player.y, 0);
          this.playerRenderer.draw(c, pt.x, pt.y);
        }
      });

      drawables.sort((a, b) => a.depth - b.depth);
      for (const d of drawables) d.draw();

      // Atmospheric interior lighting
      r.lighting?.drawLightPools(r);
      c.restore();
    }
  }

  // Exportar para escopo global
  global.NorthVale = global.NorthVale || {};
  Object.assign(global.NorthVale, {
    doorPort, portalGeometry, boundsPolygon, distanceToBox, circleHits,
    dressRoom, INTERIOR_IDS, validateManifest, InteriorManifestLoader,
    globalObjectId, SaveSystem, InternalDoor, InteriorWorld,
    RoomPropPainter, InteriorRoomRenderer
  });

  Object.assign(global, global.NorthVale);
})(typeof window !== 'undefined' ? window : globalThis);
