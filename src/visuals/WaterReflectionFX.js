/**
 * NorthVale: Sombras de 1989 — WaterReflectionFX.js
 * Direção de Arte Técnica: Poças de Água e Asfalto Espelhado (1989)
 *
 * Módulo puro em Canvas 2D desacoplado (sem dependências externas):
 * 1. Formas orgânicas de poças de água acumuladas no asfalto e sarjetas com bordas úmidas.
 * 2. Reflexos invertidos verticalmente (scale 1, -0.4) de postes, néons e faróis de viaturas.
 * 3. Ondulação senoidal rápida em alta frequência simulando o impacto das gotas de chuva.
 * 4. Anéis de choque circulares concêntricos (ripples) expandindo e desvanecendo na água.
 */

export class WaterReflectionFX {
  constructor(options = {}) {
    this.time = 0;

    // Poças de água no solo (espaço de mundo / tela)
    this.puddles = options.puddles || [
      { x: 380, y: 520, radiusX: 110, radiusY: 42, rot: -0.05 },
      { x: 740, y: 590, radiusX: 160, radiusY: 58, rot: 0.08 },
      { x: 1120, y: 540, radiusX: 130, radiusY: 48, rot: -0.04 },
      { x: 520, y: 680, radiusX: 190, radiusY: 66, rot: 0.02 }
    ];

    // Pool de ondas de impacto de chuva nas poças (ripples)
    this.maxRipples = 60;
    this.ripples = [];
    for (let i = 0; i < this.maxRipples; i++) {
      this.ripples.push({
        x: 0,
        y: 0,
        radius: 0,
        maxRadius: 8 + Math.random() * 12,
        life: 0,
        maxLife: 0.4 + Math.random() * 0.3,
        alpha: 0.5,
        active: false
      });
    }

    this.rippleSpawnTimer = 0;
  }

  /**
   * Adiciona uma poça de água na cena.
   * @param {number} x
   * @param {number} y
   * @param {number} radiusX
   * @param {number} radiusY
   * @param {number} [rot=0]
   */
  addPuddle(x, y, radiusX, radiusY, rot = 0) {
    this.puddles.push({ x, y, radiusX, radiusY, rot });
  }

  /**
   * Dispara uma onda de choque de gota na poça.
   * @private
   */
  _spawnRipple(x, y) {
    for (let i = 0; i < this.maxRipples; i++) {
      const r = this.ripples[i];
      if (!r.active) {
        r.x = x;
        r.y = y;
        r.radius = 1;
        r.life = 0;
        r.maxRadius = 8 + Math.random() * 14;
        r.maxLife = 0.35 + Math.random() * 0.25;
        r.active = true;
        r.alpha = 0.45;
        break;
      }
    }
  }

  /**
   * Atualiza as ondulações senoidais e os anéis de chuva.
   * @param {number} dt Delta time em segundos
   */
  update(dt) {
    this.time += dt;

    // Gera impactos esporádicos de gotas dentro das poças
    this.rippleSpawnTimer += dt;
    if (this.rippleSpawnTimer >= 0.04) {
      this.rippleSpawnTimer = 0;
      if (this.puddles.length > 0) {
        const p = this.puddles[Math.floor(Math.random() * this.puddles.length)];
        const ang = Math.random() * Math.PI * 2;
        const rad = Math.random() * 0.75;
        const rx = p.x + Math.cos(ang) * (p.radiusX * rad);
        const ry = p.y + Math.sin(ang) * (p.radiusY * rad);
        this._spawnRipple(rx, ry);
      }
    }

    // Atualiza vida dos anéis
    for (let i = 0; i < this.maxRipples; i++) {
      const r = this.ripples[i];
      if (!r.active) continue;
      r.life += dt;
      if (r.life >= r.maxLife) {
        r.active = false;
      } else {
        const progress = r.life / r.maxLife;
        r.radius = r.maxRadius * progress;
        r.alpha = (1.0 - progress) * 0.45;
      }
    }
  }

  /**
   * Renderiza as poças de água e os reflexos invertidos distorcidos.
   * @param {CanvasRenderingContext2D} ctx Contexto Canvas 2D
   * @param {Array<Object>} sceneLights Lista de luzes [{ x, y, color, intensity, radius, type }]
   * @param {Object} [camera={x:0, y:0}]
   * @param {number} [width]
   * @param {number} [height]
   */
  renderPuddles(ctx, sceneLights = [], camera = { x: 0, y: 0 }, width, height) {
    const w = width || ctx.canvas.width;
    const h = height || ctx.canvas.height;

    ctx.save();

    for (const p of this.puddles) {
      const sx = p.x - camera.x;
      const sy = p.y - camera.y;

      // Se a poça estiver fora da tela, pula
      if (sx + p.radiusX < -40 || sx - p.radiusX > w + 40 || sy + p.radiusY < -40 || sy - p.radiusY > h + 40) {
        continue;
      }

      ctx.save();

      // 1. Caminho Elíptico Orgânico da Poça
      ctx.beginPath();
      ctx.ellipse(sx, sy, p.radiusX, p.radiusY, p.rot || 0, 0, Math.PI * 2);

      // 2. Borda Escura de Asfalto Molhado Encharcado
      ctx.fillStyle = 'rgba(8, 8, 12, 0.75)';
      ctx.fill();

      // Friso de água superficial
      ctx.strokeStyle = 'rgba(25, 30, 42, 0.4)';
      ctx.lineWidth = 2.0;
      ctx.stroke();

      // 3. Aplica recorte (clip) para os reflexos não vazarem da poça
      ctx.clip();

      // Fundo límpido da água refletindo o céu gélido noturno
      const waterGrad = ctx.createLinearGradient(sx, sy - p.radiusY, sx, sy + p.radiusY);
      waterGrad.addColorStop(0.0, 'rgba(15, 20, 32, 0.65)');
      waterGrad.addColorStop(0.5, 'rgba(10, 14, 22, 0.85)');
      waterGrad.addColorStop(1.0, 'rgba(5, 7, 12, 0.95)');
      ctx.fillStyle = waterGrad;
      ctx.fillRect(sx - p.radiusX, sy - p.radiusY, p.radiusX * 2, p.radiusY * 2);

      // 4. Reflexos Invertidos Distorcidos das Luzes de Néon e Postes
      this._renderInvertedReflections(ctx, sx, sy, p, sceneLights, camera);

      // 5. Ondulações Concéntricas das Gotas de Chuva (Ripples)
      this._renderPuddleRipples(ctx, sx, sy, p);

      ctx.restore();
    }

    ctx.restore();
  }

  /**
   * Renderiza os feixes de luz invertidos com perturbação senoidal contínua.
   * @private
   */
  _renderInvertedReflections(ctx, px, py, puddle, sceneLights, camera) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen'; // Blend luminoso analógico

    for (const light of sceneLights) {
      const lx = light.x - camera.x;
      const ly = light.y - camera.y;

      // Distância em relação à poça
      const distY = py - ly;
      if (distY <= 0) continue; // Luz abaixo da poça não reflete

      // Reflexo planar invertido com compressão vertical isométrica (scale 1, -0.4)
      const refY = py + distY * 0.38;
      const lightColor = light.color || '#d48b28';
      const intensity = light.intensity ?? 1.0;

      // Ondulação senoidal rápida simulando chuva perturbando o espelho d'água
      const rippleShift = Math.sin(this.time * 8.5 + (py - ly) * 0.12) * (3.5 * intensity);

      const colX = lx + rippleShift;
      const colW = Math.max(16, (light.radius || 40) * 0.8);
      const colH = Math.min(puddle.radiusY * 1.8, distY * 0.7);

      // Gradiente vertical da coluna de luz refletida
      const refGrad = ctx.createLinearGradient(colX, py - colH / 2, colX, py + colH / 2);
      refGrad.addColorStop(0.0, 'rgba(0,0,0,0)');
      refGrad.addColorStop(0.3, this._hexToRgba(lightColor, 0.45 * intensity));
      refGrad.addColorStop(0.7, this._hexToRgba(lightColor, 0.25 * intensity));
      refGrad.addColorStop(1.0, 'rgba(0,0,0,0)');

      ctx.fillStyle = refGrad;
      ctx.beginPath();
      // Elipse vertical alongada distorcida
      ctx.ellipse(colX, py, colW, colH * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Renderiza anéis circulares/elípticos concêntricos de gotas caindo na poça.
   * @private
   */
  _renderPuddleRipples(ctx, px, py, puddle) {
    ctx.save();
    ctx.lineWidth = 1.0;

    for (let i = 0; i < this.maxRipples; i++) {
      const r = this.ripples[i];
      if (!r.active) continue;

      // Verifica se o anel está dentro desta poça
      const dx = r.x - px;
      const dy = r.y - py;
      const normDist = (dx * dx) / (puddle.radiusX * puddle.radiusX) + (dy * dy) / (puddle.radiusY * puddle.radiusY);
      if (normDist > 1.0) continue;

      ctx.strokeStyle = `rgba(180, 215, 250, ${r.alpha})`;
      ctx.beginPath();
      // Proporção achatada isométrica (2:1)
      ctx.ellipse(r.x, r.y, r.radius * 1.5, r.radius * 0.65, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Converte cores hex para RGBA com opacidade controlada.
   * @private
   */
  _hexToRgba(hex, alpha) {
    if (hex.startsWith('rgba')) return hex;
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}
