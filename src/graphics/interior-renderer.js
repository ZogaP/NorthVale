// NorthVale — Sombras de 1989
// Calibrated Interior Prop Renderer (Proportional Human Metric Calibration)
// Shared world units: 32/metre. Props use authored metric heights; humans are 56 units.

export function drawProp(r, o) {
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
    r.textureQuad([
      r.project(o.x, o.y, z),
      r.project(o.x + o.w, o.y, z),
      r.project(o.x + o.w, o.y + o.h, z),
      r.project(o.x, o.y + o.h, z)
    ], o.w, o.h, 'cloth', 0.5);
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
      c.beginPath();
      c.ellipse(p.x, p.y, 5, 10, i * 0.9, 0, Math.PI * 2);
      c.fill();
    }
    return;
  }

  if (['mug', 'bottle'].includes(o.kind)) {
    const propH = Math.min(6, Math.max(3, h || 4));
    const p = r.project(o.x + o.w / 2, o.y + o.h / 2, z);
    c.fillStyle = o.color || '#9ea595';
    c.fillRect(p.x - 2.5, p.y - propH, 5, propH);
    c.fillStyle = '#d6cfaa';
    c.beginPath();
    c.ellipse(p.x, p.y - propH, 2.5, 1.5, 0, 0, Math.PI * 2);
    c.fill();
    if (o.kind === 'mug') {
      c.strokeStyle = o.color || '#9ea595';
      c.lineWidth = 1.5;
      c.beginPath();
      c.arc(p.x + 4, p.y - propH * 0.55, 2, 0, Math.PI * 2);
      c.stroke();
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

  // Draw to the metric height used by selection and collision data.
  if (o.kind === 'desk' || o.kind === 'table' || o.kind === 'kitchen') {
    const tableH = h || 24;
    const legH = tableH - 4;
    for (const dx of [2, Math.max(2, o.w - 7)]) {
      for (const dy of [2, Math.max(2, o.h - 7)]) {
        r.box(o.x + dx, o.y + dy, 5, 5, legH, '#3f3a2c', '#544a37', z);
      }
    }
    r.box(o.x, o.y, o.w, o.h, 4, o.color || '#725e43', '#8a7251', z + legH);
    if (o.kind === 'kitchen') {
      r.box(o.x + o.w - 35, o.y + 6, 26, 22, 2, '#696f66', '#989b8c', z + tableH);
      r.ground(o.x + o.w - 30, o.y + 9, 16, 15, '#354641', z + tableH + 2.1);
    }
    return;
  }

  // Calibrated Sofas, Armchairs, and Beds
  if (['sofa', 'armchair', 'bed'].includes(o.kind)) {
    const seatH = h * 0.55;
    const backH = h - seatH;
    r.box(o.x, o.y, o.w, o.h, seatH, o.color, o.kind === 'bed' ? '#c1b599' : '#8a9576', z);
    r.box(o.x, o.y, o.w, 7, backH, o.color, '#7d886e', z + seatH);
    if (o.kind === 'bed') {
      r.box(o.x + 6, o.y + 10, o.w * 0.28, o.h - 14, 4, '#d1c6aa', '#e1d5b7', z + seatH);
      r.ground(o.x + o.w * 0.38, o.y + 8, o.w * 0.58, o.h - 10, '#7d806655', z + seatH + 0.2);
    } else {
      for (const side of [0, Math.max(0, o.w - 7)]) {
        r.box(o.x + side, o.y, Math.min(7,o.w*.2), o.h, backH, o.color, '#859277', z + seatH);
      }
    }
    return;
  }

  // Chair parts sum to the declared metric height.
  if (o.kind === 'chair') {
    const legH = h * 0.48;
    const seatThickness = h * 0.1;
    const backH = h - legH - seatThickness;
    for (const dx of [0, Math.max(0, o.w - 4)]) {
      for (const dy of [0, Math.max(0, o.h - 4)]) {
        r.box(o.x + dx, o.y + dy, 4, 4, legH, '#4a3d2a', '#6f5f42', z);
      }
    }
    r.box(o.x, o.y, o.w, o.h, seatThickness, o.color || '#7e6844', '#8b754f', z + legH);
    r.box(o.x, o.y, o.w, 4, backH, o.color || '#7e6844', '#8b754f', z + legH + seatThickness);
    return;
  }

  // Calibrated Bookcases and Shelves
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
  for (let i = 12; i < h; i += 18) {
    const p = r.project(o.x + o.w * 0.5, o.y + o.h + 0.2, z + i);
    c.fillStyle = '#c3ae77';
    c.fillRect(p.x - 4, p.y, 8, 2);
  }
}
