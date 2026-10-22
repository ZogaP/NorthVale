// NorthVale — Sombras de 1989: Bundle Mundo, Simulação 24h, Áudio e Adereços
'use strict';

(function(global) {
  // 1. Definição do Mundo e Edifícios
  const WORLD = {
    width: 1900,
    height: 1700,
    roads: [
      {x: 0, y: 740, w: 1900, h: 140},
      {x: 880, y: 0, w: 140, h: 1700}
    ]
  };

  const buildings = [
    {id:'police', name:'DELEGACIA', x:580, y:450, w:220, h:200, color:'#626e6c', roof:'#354b50', kind:'civic', open:0, close:24},
    {id:'sarah', name:'CASA DOS MILLER', x:1080, y:470, w:170, h:180, color:'#898274', roof:'#3c4c4e', kind:'house', open:0, close:24},
    {id:'diner', name:'DOUBLE R DINER', x:340, y:970, w:230, h:160, color:'#8e7865', roof:'#5a3b35', kind:'shop', open:6, close:23},
    {id:'pharmacy', name:'FARMÁCIA VALE', x:1090, y:960, w:190, h:160, color:'#748578', roof:'#384e47', kind:'shop', open:8, close:18},
    {id:'library', name:'BIBLIOTECA', x:1350, y:440, w:220, h:210, color:'#857361', roof:'#454b4f', kind:'civic', open:9, close:21},
    {id:'motel', name:'NORTHVALE MOTEL', x:1400, y:990, w:290, h:160, color:'#9c896a', roof:'#674f42', kind:'shop', open:0, close:24},
    {id:'home', name:'CASA DE ELIAS', x:580, y:180, w:180, h:140, color:'#79857a', roof:'#424d43', kind:'house', open:0, close:24},
    {id:'depot', name:'DEPÓSITO NORTE', x:300, y:280, w:180, h:210, color:'#767773', roof:'#444c50', kind:'industrial', open:7, close:18},
    {id:'dam', name:'ESTAÇÃO DA REPRESA', x:1090, y:130, w:220, h:150, color:'#707d7a', roof:'#3a494c', kind:'industrial', open:7, close:19},
    {id:'ruins', name:'CAPELA EM RUÍNAS', x:360, y:1300, w:180, h:180, color:'#706d60', roof:'#3a4340', kind:'ruin', open:0, close:24},
    {id:'registry', name:'CARTÓRIO MUNICIPAL', x:1320, y:1280, w:200, h:180, color:'#818477', roof:'#535d55', kind:'civic', open:8, close:18},
    {id:'meatpacking', name:'FRIGORÍFICO SLOANE', x:1580, y:250, w:240, h:190, color:'#65756c', roof:'#465f55', kind:'industrial', open:6, close:22},
    {id:'scrapyard', name:'OFICINA DE SAM', x:70, y:1010, w:210, h:230, color:'#7d7359', roof:'#5a5845', kind:'industrial', open:7, close:20},
    {id:'ruth', name:'CASA DE RUTH', x:1120, y:1400, w:170, h:160, color:'#727e6c', roof:'#4c5945', kind:'house', open:0, close:24},
    {id:'gasstation', name:'POSTO PINE RIDGE', x:1600, y:1320, w:220, h:180, color:'#6b8068', roof:'#52634e', kind:'shop', open:0, close:24}
  ];

  function door(b) {
    return {x: b.x + b.w / 2, y: b.y + b.h + 18};
  }

  function isOpen(b, minute) {
    const h = (minute / 60) % 24;
    return h >= b.open && h < b.close;
  }

  function collides(x, y, r = 10) {
    return x < r || y < r || x > WORLD.width - r || y > WORLD.height - r ||
      buildings.some(b => x > b.x - r && x < b.x + b.w + r && y > b.y - r && y < b.y + b.h + r);
  }

  function move(body, dx, dy, r = 10) {
    if (!collides(body.x + dx, body.y, r)) body.x += dx;
    if (!collides(body.x, body.y + dy, r)) body.y += dy;
  }

  // 2. Simulação Social de Habitantes em 24h
  const residents = [
    {id:'helen', name:'Helen Miller', color:'#c09a72', home:'sarah', work:'diner', personality:'A mãe de Sarah. Exausta, mas determinada.', schedule:[[0,'sarah','Dormindo'],[6,'sarah','Em casa'],[8,'police','Esperando notícias'],[12,'diner','Trabalhando'],[18,'sarah','Em casa'],[23,'sarah','Dormindo']]},
    {id:'ruth', name:'Xerife Ruth', color:'#899e8e', home:'home', work:'police', personality:'Fala pouco. Observa tudo.', schedule:[[0,'home','Dormindo'],[7,'police','Em serviço'],[12,'diner','Almoçando'],[13,'police','Em serviço'],[21,'home','Em casa']]},
    {id:'elias', name:'Elias Ward', color:'#a1947a', home:'home', work:'pharmacy', personality:'Farmacêutico. Coleciona discos de jazz.', schedule:[[0,'home','Dormindo'],[7,'diner','Tomando café'],[8,'pharmacy','Trabalhando'],[12,'diner','Almoçando'],[13,'pharmacy','Trabalhando'],[18,'library','Lendo'],[20,'home','Em casa']]},
    {id:'owen', name:'Owen Briggs', color:'#a28575', home:'motel', work:'depot', personality:'Cuida do depósito e conserta bicicletas.', schedule:[[0,'motel','Dormindo'],[7,'depot','Trabalhando'],[12,'diner','Almoçando'],[13,'depot','Trabalhando'],[18,'dam','Caminhando'],[20,'motel','Descansando']]},
    {id:'viktor', name:'Viktor Sloane', color:'#6b7c85', home:'meatpacking', work:'meatpacking', personality:'Magnata industrial do frigorífico. Impaciente e calculista.', schedule:[[0,'meatpacking','No escritório'],[8,'meatpacking','Supervisionando fábrica'],[12,'diner','Almoçando'],[14,'registry','No cartório'],[18,'dam','Inspeção'],[20,'meatpacking','Trabalhando']]},
    {id:'clara', name:'Clara Young', color:'#ab9a8a', home:'home', work:'library', personality:'Arquivista e bibliotecária. Cuidadosa com as palavras.', schedule:[[0,'home','Dormindo'],[8,'library','Acervo'],[12,'diner','Almoçando'],[14,'registry','Consultando arquivos'],[18,'library','Trabalhando'],[21,'home','Em casa']]},
    {id:'bobby', name:'Bobby Vance', color:'#846c59', home:'motel', work:'scrapyard', personality:'Mecânico forasteiro. Olhar inquieto e temperamento hostil.', schedule:[[0,'motel','No quarto'],[8,'scrapyard','Desmanchando peças'],[12,'diner','Comendo sozinho'],[14,'scrapyard','Oficina'],[19,'ruins','Vagando'],[22,'motel','Descansando']]}
  ];

  function routine(person, minute) {
    let current = person.schedule[0];
    for (const slot of person.schedule) {
      if (slot[0] * 60 <= minute % 1440) current = slot;
    }
    return {place: current[1], activity: current[2]};
  }

  const routeCache = new Map();
  function route(from, to) {
    const key = `${from.x},${from.y}:${to.x},${to.y}`;
    if (routeCache.has(key)) return routeCache.get(key);
    const clear = (a, b) => {
      const n = Math.ceil(Math.hypot(a.x - b.x, a.y - b.y) / 5);
      for (let i = 0; i <= n; i++) {
        const t = n ? i / n : 0;
        if (collides(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, 7)) return false;
      }
      return true;
    };
    const snap = p => {
      const candidates = [];
      for (let dx = -40; dx <= 40; dx += 20) {
        for (let dy = -40; dy <= 40; dy += 20) {
          const q = {x: Math.round(p.x / 20) * 20 + dx, y: Math.round(p.y / 20) * 20 + dy};
          if (clear(p, q)) candidates.push(q);
        }
      }
      return candidates.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
    };
    const start = snap(from), end = snap(to);
    if (!start || !end) return [from, to];
    const id = p => `${p.x},${p.y}`, open = [start], scores = new Map([[id(start), 0]]), parent = new Map(), seen = new Set();
    while (open.length) {
      open.sort((a, b) => (scores.get(id(a)) + Math.abs(a.x - end.x) + Math.abs(a.y - end.y)) - (scores.get(id(b)) + Math.abs(b.x - end.x) + Math.abs(b.y - end.y)));
      const p = open.shift(), pid = id(p);
      if (seen.has(pid)) continue;
      seen.add(pid);
      if (pid === id(end)) {
        const path = [to, p];
        let k = pid;
        while (parent.has(k)) {
          const prev = parent.get(k);
          path.push(prev);
          k = id(prev);
        }
        path.push(from);
        path.reverse();
        routeCache.set(key, path);
        return path;
      }
      for (const [dx, dy] of [[20,0],[-20,0],[0,20],[0,-20]]) {
        const q = {x: p.x + dx, y: p.y + dy}, qid = id(q), score = scores.get(pid) + 20;
        if (!seen.has(qid) && clear(p, q) && score < (scores.get(qid) ?? Infinity)) {
          scores.set(qid, score); parent.set(qid, p); open.push(q);
        }
      }
    }
    return [from, to];
  }

  function residentPosition(person, minute) {
    let active = person.schedule[0], previous = person.schedule.at(-1);
    for (let i = 0; i < person.schedule.length; i++) {
      if (person.schedule[i][0] * 60 <= minute % 1440) {
        active = person.schedule[i];
        previous = person.schedule[(i + person.schedule.length - 1) % person.schedule.length];
      }
    }
    const a = door(buildings.find(b => b.id === previous[1]) || buildings[0]);
    const b = door(buildings.find(b => b.id === active[1]) || buildings[0]);
    const elapsed = (minute % 1440 - active[0] * 60 + 1440) % 1440;
    const points = route(a, b), lengths = points.slice(1).map((p, i) => Math.hypot(p.x - points[i].x, p.y - points[i].y));
    const total = lengths.reduce((x, y) => x + y, 0), duration = total / 90;
    if (elapsed >= duration || total === 0) return {...b, inside: !['Esperando notícias', 'Caminhando'].includes(active[2]), activity: active[2]};
    let dist = elapsed * 90;
    for (let i = 0; i < lengths.length; i++) {
      if (dist <= lengths[i] && lengths[i] > 0) {
        const t = dist / lengths[i];
        return {x: points[i].x + (points[i+1].x - points[i].x) * t, y: points[i].y + (points[i+1].y - points[i].y) * t, inside: false, activity: 'Em deslocamento'};
      }
      dist -= lengths[i];
    }
    return {...b, inside: false, activity: active[2]};
  }

  function updateVehicle(car, input, dt) {
    const throttle = (input.forward ? 1 : 0) - (input.back ? 1 : 0);
    car.speed += throttle * 125 * dt;
    car.speed *= Math.exp(-(throttle ? 0.35 : 1.4) * dt);
    if (input.brake) car.speed *= Math.exp(-5 * dt);
    car.speed = Math.max(-75, Math.min(235, car.speed));
    car.angle += ((input.right ? 1 : 0) - (input.left ? 1 : 0)) * car.speed / 110 * dt;
    return {dx: Math.cos(car.angle) * car.speed * dt, dy: Math.sin(car.angle) * car.speed * dt};
  }

  // 3. Sistema de Áudio Noir
  class AudioSystem {
    constructor() { this.enabled = false; }
    toggle() {
      if (!this.context) {
        const C = window.AudioContext || window.webkitAudioContext;
        this.context = new C();
        const buffer = this.context.createBuffer(1, this.context.sampleRate * 3, this.context.sampleRate), data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * .14;
        const source = this.context.createBufferSource();
        source.buffer = buffer; source.loop = true;
        const filter = this.context.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 1100;
        this.gain = this.context.createGain();
        source.connect(filter).connect(this.gain).connect(this.context.destination);
        source.start();
      }
      this.context.resume();
      this.enabled = !this.enabled;
      this.gain.gain.value = this.enabled ? .2 : 0;
      return this.enabled;
    }
    tone(freq = 200, duration = .15) {
      if (!this.enabled || !this.context) return;
      const o = this.context.createOscillator(), g = this.context.createGain();
      o.frequency.value = freq; o.type = 'sine';
      o.connect(g).connect(this.context.destination);
      g.gain.setValueAtTime(.08, this.context.currentTime);
      g.gain.exponentialRampToValueAtTime(.001, this.context.currentTime + duration);
      o.start(); o.stop(this.context.currentTime + duration);
    }
    update(interior, lights = []) {
      if (this.gain) this.gain.gain.value = this.enabled ? (interior ? .035 : .2) : 0;
      if (this.context && !this.humGain) {
        const hum = this.context.createOscillator(); hum.type = 'sine'; hum.frequency.value = 100;
        this.humGain = this.context.createGain(); this.humGain.gain.value = 0;
        hum.connect(this.humGain).connect(this.context.destination);
        hum.start();
      }
      if (this.humGain) {
        this.humGain.gain.setTargetAtTime(this.enabled && interior && lights.some(l => l.kind === 'fluorescent') ? .006 : 0, this.context.currentTime, .12);
      }
    }
  }

  // 4. Interação e Detecção Espacial
  function distanceToProp(p, o) {
    return Math.hypot(Math.max(o.x - p.x, 0, p.x - o.x - o.w), Math.max(o.y - p.y, 0, p.y - o.y - o.h));
  }

  function propPolygon(o, project) {
    const z = o.baseZ || 0, h = o.height || 25;
    return [
      project(o.x, o.y, z + h),
      project(o.x + o.w, o.y, z + h),
      project(o.x + o.w, o.y, z),
      project(o.x + o.w, o.y + o.h, z),
      project(o.x, o.y + o.h, z),
      project(o.x, o.y + o.h, z + h)
    ];
  }

  function pickProp(objects, point, project) {
    return [...objects].sort((a, b) => (b.x + b.y + b.w + b.h) - (a.x + a.y + a.w + a.h))
      .find(o => o.interactive && (global.pointInPolygon || pointInPolygon)(point, propPolygon(o, project))) || null;
  }

  function selectInteraction(objects, player, hovered = null, range = 85) {
    if (hovered && distanceToProp(player, hovered) <= range) return hovered;
    return objects.filter(o => o.interactive && distanceToProp(player, o) <= range)
      .sort((a, b) => distanceToProp(player, a) - distanceToProp(player, b))[0] || null;
  }

  // 5. Iluminação de Interiores e Oclusão
  function pointContribution(light, x, y, z = 0) {
    const distance = Math.hypot(x - light.x, y - light.y, z - light.z);
    return Math.max(0, 1 - distance / light.radius) ** 2 * light.intensity;
  }

  function contactOcclusion(x, y, objects) {
    let occlusion = 0;
    for (const o of objects) {
      if (!o.solid) continue;
      const dx = Math.max(o.x - x, 0, x - o.x - o.w), dy = Math.max(o.y - y, 0, y - o.y - o.h);
      occlusion += Math.max(0, 1 - Math.hypot(dx, dy) / 24) * .16;
    }
    return Math.min(.65, occlusion);
  }

  class InteriorLighting {
    constructor() { this.ambient = .56; this.lights = []; this.enabled = true; this.ao = true; }
    setRoom(id) {
      const warm = id === 'sarah' || id === 'home' || id === 'motel';
      this.lights = [
        {x: 130, y: 150, z: 110, radius: 360, intensity: 1.5, color: warm ? '#ffd390' : '#d8ead0'},
        {x: 420, y: 270, z: 85, radius: 290, intensity: 1.2, color: warm ? '#e1ae65' : '#9ec9df'},
        {x: 270, y: 35, z: 100, radius: 200, intensity: .8, color: '#829ec4'}
      ];
    }
    brightness(x, y, z = 0) {
      return !this.enabled ? 1 : Math.min(1.35, this.ambient + this.lights.reduce((sum, l) => sum + pointContribution(l, x, y, z) * .38, 0));
    }
    drawContact(renderer, objects) {
      if (!this.ao) return;
      const c = renderer.ctx;
      for (const o of objects) {
        if (!o.solid) continue;
        const p = renderer.project(o.x + o.w / 2, o.y + o.h / 2);
        c.save(); c.translate(p.x, p.y + 4); c.scale(1, .46);
        const radius = Math.max(o.w, o.h) * .78, g = c.createRadialGradient(0, 0, 2, 0, 0, radius);
        g.addColorStop(0, '#08171699'); g.addColorStop(.6, '#08171650'); g.addColorStop(1, '#08171600');
        c.fillStyle = g; c.fillRect(-radius, -radius, radius * 2, radius * 2); c.restore();
      }
    }
    drawLightPools(renderer) {
      if (!this.enabled) return;
      const c = renderer.ctx;
      c.save(); c.globalCompositeOperation = 'screen';
      for (const l of this.lights) {
        const p = renderer.project(l.x, l.y);
        c.save(); c.translate(p.x, p.y); c.scale(1, .5);
        const r = l.radius * .6, g = c.createRadialGradient(0, 0, 0, 0, 0, r);
        g.addColorStop(0, l.color + '2a'); g.addColorStop(.5, l.color + '0d'); g.addColorStop(1, l.color + '00');
        c.fillStyle = g; c.fillRect(-r, -r, r * 2, r * 2); c.restore();
      }
      c.restore();
    }
  }

  // 6. Calibrated Interior Prop Renderer
  function drawProp(r, o) {
    const c = r.ctx;
    const z = o.baseZ || 0;
    const h = o.height || 0;
    const texture = ['sofa', 'bed', 'armchair', 'rug'].includes(o.kind) ? 'cloth' : o.kind === 'bottle' ? 'stone' : 'wood';
    r.surface = texture;

    if (o.kind === 'wear') {
      r.ground(o.x, o.y, o.w, o.h, o.color, z);
      return;
    }
    if (o.kind === 'rug') {
      r.ground(o.x, o.y, o.w, o.h, o.color, z);
      for (let k = 0; k < 6; k++) {
        r.ground(o.x + 6 + k * 24, o.y + 5, 8, o.h - 10, '#c6b78328', z + 0.1);
      }
      return;
    }
    if (o.kind === 'plant') {
      const potH = 14;
      r.box(o.x, o.y, o.w, o.h, potH, '#6a513d', '#8a6746', z);
      for (let i = 0; i < 9; i++) {
        const p = r.project(o.x + o.w / 2 + Math.sin(i * 2.2) * 12, o.y + o.h / 2 + Math.cos(i * 2.2) * 10, z + potH + 2 + i * 2);
        c.fillStyle = ['#465d3d', '#5d7348', '#778457'][i % 3];
        c.beginPath(); c.ellipse(p.x, p.y, 5, 10, i * 0.9, 0, Math.PI * 2); c.fill();
      }
      return;
    }
    if (['mug', 'bottle'].includes(o.kind)) {
      const propH = Math.min(6, Math.max(3, h || 4));
      const p = r.project(o.x + o.w / 2, o.y + o.h / 2, z);
      c.fillStyle = o.color || '#9ea595';
      c.fillRect(p.x - 2.5, p.y - propH, 5, propH);
      c.fillStyle = '#d6cfaa';
      c.beginPath(); c.ellipse(p.x, p.y - propH, 2.5, 1.5, 0, 0, Math.PI * 2); c.fill();
      if (o.kind === 'mug') {
        c.strokeStyle = o.color || '#9ea595'; c.lineWidth = 1.5;
        c.beginPath(); c.arc(p.x + 4, p.y - propH * 0.55, 2, 0, Math.PI * 2); c.stroke();
      }
      return;
    }
    if (o.kind === 'paper' || o.kind === 'frame') {
      r.ground(o.x, o.y, o.w, o.h, '#d9cfad', z + 0.5);
      for (let y = 3; y < o.h - 2; y += 3) {
        r.ground(o.x + 2, o.y + y, o.w - 4, 0.5, '#605f4c88', z + 0.6);
      }
      return;
    }
    if (o.kind === 'book') {
      const bookH = Math.min(5, Math.max(2, h || 3));
      r.box(o.x, o.y, o.w, o.h, bookH, o.color || '#7e3e3b', '#bcaf8d', z);
      r.ground(o.x, o.y, 2, o.h, o.color || '#7e3e3b', z + bookH + 0.1);
      return;
    }
    if (o.kind === 'desk' || o.kind === 'table' || o.kind === 'kitchen') {
      const tableH = Math.min(24, Math.max(18, h || 22));
      const legH = tableH - 4;
      for (const dx of [2, Math.max(2, o.w - 7)]) {
        for (const dy of [2, Math.max(2, o.h - 7)]) {
          r.box(o.x + dx, o.y + dy, 5, 5, legH, '#3f3a2c', '#544a37', z);
        }
      }
      r.box(o.x, o.y, o.w, o.h, 4, o.color || '#725e43', '#8a7251', z + legH);
      return;
    }
    if (['sofa', 'armchair', 'bed'].includes(o.kind)) {
      const seatH = 15;
      const backH = 14;
      r.box(o.x, o.y, o.w, o.h, seatH, o.color, o.kind === 'bed' ? '#c1b599' : '#8a9576', z);
      r.box(o.x, o.y, o.w, 7, backH, o.color, '#7d886e', z + seatH);
      return;
    }
    if (o.kind === 'chair') {
      const legH = 14;
      const seatThickness = 3;
      const backH = 15;
      for (const dx of [0, Math.max(0, o.w - 4)]) {
        for (const dy of [0, Math.max(0, o.h - 4)]) {
          r.box(o.x + dx, o.y + dy, 4, 4, legH, '#4a3d2a', '#6f5f42', z);
        }
      }
      r.box(o.x, o.y, o.w, o.h, seatThickness, o.color || '#7e6844', '#8b754f', z + legH);
      r.box(o.x, o.y, o.w, 4, backH, o.color || '#7e6844', '#8b754f', z + legH + seatThickness);
      return;
    }
    if (o.kind === 'shelf') {
      const shelfH = Math.min(56, h || 48);
      r.box(o.x, o.y, 4, o.h, shelfH, o.color || '#6e5a3c', '#8c7954', z);
      r.box(o.x + Math.max(4, o.w - 4), o.y, 4, o.h, shelfH, o.color || '#6e5a3c', '#8c7954', z);
      for (let curY = 0; curY <= shelfH; curY += 16) {
        r.box(o.x, o.y, o.w, o.h, 2.5, '#4f4433', '#7e6c49', z + curY);
      }
      return;
    }

    r.box(o.x, o.y, o.w, o.h, h, o.color || '#8b7353', '#9a825e', z);
  }

  // Exportar para escopo global
  global.NorthVale = global.NorthVale || {};
  Object.assign(global.NorthVale, {
    WORLD, buildings, door, isOpen, collides, move,
    residents, routine, route, residentPosition, updateVehicle,
    AudioSystem, distanceToProp, propPolygon, pickProp, selectInteraction,
    pointContribution, contactOcclusion, InteriorLighting, drawProp
  });

  Object.assign(global, global.NorthVale);
})(typeof window !== 'undefined' ? window : globalThis);
