/**
 * NorthVale: Sombras de 1989 — WeatherEffects.js
 * Direção de Arte Técnica: Efeitos Atmosféricos Neo-Noir Analógicos (1989)
 *
 * Sistema puro de Canvas 2D desacoplado (sem dependências externas):
 * 1. Chuva torrencial contínua com camadas de profundidade e vento angular.
 * 2. Respingos elípticos de impacto no solo (splashes).
 * 3. Névoa volumétrica rasteira com gradientes orgânicos e turbulência.
 * 4. Granulação analógica (Film Grain) procedural via offscreen canvas com pré-cache a 60 FPS.
 */

export class WeatherEffects {
  /**
   * @param {Object} [options]
   * @param {number} [options.maxRainDrops=550] Contagem máxima de gotas no loop
   * @param {number} [options.intensity=1.0] Intensidade do clima (0.0 = limpo, 1.0 = tempestade)
   * @param {number} [options.grainOpacity=0.12] Opacidade da granulação analógica (0.0 a 0.25)
   * @param {number} [options.windAngle=0.38] Inclinação diagonal do vento forte
   */
  constructor(options = {}) {
    this.maxRainDrops = options.maxRainDrops ?? 550;
    this.intensity = Math.max(0, Math.min(1, options.intensity ?? 1.0));
    this.grainOpacity = Math.max(0, Math.min(0.25, options.grainOpacity ?? 0.12));
    this.windAngle = options.windAngle ?? 0.38; // tangente da inclinação do vento

    // Pool fixo de gotas (Zero Garbage Collection durante a execução)
    this.drops = new Array(this.maxRainDrops);
    this._initDrops();

    // Pool de respingos no solo (splashes)
    this.maxSplashes = 120;
    this.splashes = new Array(this.maxSplashes);
    this._initSplashes();

    // Camadas de névoa volumétrica rasteira
    this.fogLayers = [
      { x: 0, y: 0.72, speed: 18, radiusX: 320, radiusY: 75, alpha: 0.08, phase: 0.0 },
      { x: 0.3, y: 0.82, speed: 26, radiusX: 420, radiusY: 95, alpha: 0.11, phase: 1.8 },
      { x: 0.65, y: 0.76, speed: 14, radiusX: 360, radiusY: 80, alpha: 0.07, phase: 3.4 },
      { x: 0.15, y: 0.88, speed: 32, radiusX: 480, radiusY: 110, alpha: 0.09, phase: 4.9 },
      { x: 0.85, y: 0.85, speed: 22, radiusX: 390, radiusY: 85, alpha: 0.08, phase: 2.3 }
    ];

    // Cache procedural do Film Grain (Evita ImageData lento por frame)
    this.grainCanvasSize = 256;
    this.grainPatterns = [];
    this.grainFrameIndex = 0;
    this.grainTimer = 0;
    this.grainSwapInterval = 0.05; // 20 atualizações de grão por segundo (estilo película 24fps)
    this._initFilmGrainPatterns();

    // Relâmpagos ocasionais sutis (atmosfera neo-noir)
    this.lightningTimer = 8 + Math.random() * 12;
    this.lightningFlash = 0.0;
  }

  /**
   * Inicializa o pool contínuo de gotas de chuva com camadas de profundidade.
   * @private
   */
  _initDrops() {
    for (let i = 0; i < this.maxRainDrops; i++) {
      this.drops[i] = {
        x: Math.random() * 2000 - 400,
        y: Math.random() * 1200 - 200,
        speed: 800 + Math.random() * 700, // pixels por segundo
        length: 18 + Math.random() * 22,
        layer: Math.random() < 0.35 ? 0 : (Math.random() < 0.7 ? 1 : 2), // 0: fundo, 1: médio, 2: frontal
        thickness: 0.8 + Math.random() * 0.9,
        active: true
      };
    }
  }

  /**
   * Inicializa o pool de respingos circulares/elípticos no solo.
   * @private
   */
  _initSplashes() {
    for (let i = 0; i < this.maxSplashes; i++) {
      this.splashes[i] = {
        x: 0,
        y: 0,
        radius: 0,
        maxRadius: 6 + Math.random() * 8,
        life: 0,
        maxLife: 0.16 + Math.random() * 0.12,
        active: false,
        alpha: 0.4
      };
    }
  }

  /**
   * Pré-renderiza 4 telas de ruído estático monocromático (Film Grain 1989).
   * Alternar entre texturas pré-computadas garante 60 FPS lisos sem sobrecarregar a CPU.
   * @private
   */
  _initFilmGrainPatterns() {
    const size = this.grainCanvasSize;
    for (let p = 0; p < 4; p++) {
      const offCanvas = typeof document !== 'undefined'
        ? document.createElement('canvas')
        : (typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(size, size) : null);

      if (!offCanvas) continue;
      offCanvas.width = size;
      offCanvas.height = size;
      const offCtx = offCanvas.getContext('2d');
      const imgData = offCtx.createImageData(size, size);
      const data = imgData.data;

      for (let i = 0; i < data.length; i += 4) {
        // Ruído gaussiano analógico com leve aberração em tom frio/chumbo
        const noise = (Math.random() * 255) | 0;
        data[i] = noise;     // R
        data[i + 1] = noise; // G
        data[i + 2] = noise; // B
        data[i + 3] = (Math.random() * 55) | 0; // Alpha granular variado
      }

      offCtx.putImageData(imgData, 0, 0);
      this.grainPatterns.push(offCanvas);
    }
  }

  /**
   * Altera a intensidade do clima dinamicamente.
   * @param {number} normalizedVal Valor normalizado de 0.0 (sem chuva) a 1.0 (tempestade)
   */
  setIntensity(normalizedVal) {
    this.intensity = Math.max(0, Math.min(1, normalizedVal));
  }

  /**
   * Altera a opacidade do filtro de película de 1989.
   * @param {number} opacity De 0.0 a 0.25
   */
  setGrainIntensity(opacity) {
    this.grainOpacity = Math.max(0, Math.min(0.25, opacity));
  }

  /**
   * Dispara um impacto de splash no solo.
   * @private
   */
  _spawnSplash(x, y) {
    for (let i = 0; i < this.maxSplashes; i++) {
      const s = this.splashes[i];
      if (!s.active) {
        s.x = x;
        s.y = y;
        s.radius = 1;
        s.life = 0;
        s.maxRadius = 5 + Math.random() * 7;
        s.maxLife = 0.14 + Math.random() * 0.1;
        s.active = true;
        s.alpha = 0.35 + Math.random() * 0.25;
        break;
      }
    }
  }

  /**
   * Atualiza a física das gotas, respingos, névoa e temporizadores analógicos.
   * @param {number} dt Delta time em segundos (ex: 0.016 para 60fps)
   * @param {number} width Largura da área de visão
   * @param {number} height Altura da área de visão
   * @param {Object} [camera] Coordenadas de câmera para efeito de paralaxe
   */
  update(dt, width, height, camera = { x: 0, y: 0 }) {
    if (dt <= 0) return;

    // Atualiza temporizador de granulação analógica
    this.grainTimer += dt;
    if (this.grainTimer >= this.grainSwapInterval) {
      this.grainTimer = 0;
      this.grainFrameIndex = (this.grainFrameIndex + 1) % (this.grainPatterns.length || 1);
    }

    // Temporizador de relâmpago distante neo-noir
    this.lightningTimer -= dt;
    if (this.lightningTimer <= 0) {
      this.lightningFlash = 0.35 * this.intensity;
      this.lightningTimer = 7 + Math.random() * 15;
    }
    if (this.lightningFlash > 0) {
      this.lightningFlash = Math.max(0, this.lightningFlash - dt * 2.8);
    }

    const activeDropsCount = Math.floor(this.maxRainDrops * this.intensity);
    const windSpeedX = this.windAngle * 900;

    // Atualização das gotas de chuva
    for (let i = 0; i < this.maxRainDrops; i++) {
      const d = this.drops[i];
      if (i >= activeDropsCount) {
        d.active = false;
        continue;
      }
      d.active = true;

      // Velocidade ponderada pela camada de profundidade
      const speedMult = d.layer === 0 ? 0.75 : (d.layer === 1 ? 1.0 : 1.25);
      d.x += windSpeedX * speedMult * dt;
      d.y += d.speed * speedMult * dt;

      // Se atingir o solo ou sair da tela, ressurge no topo e gera splash
      if (d.y > height + 20 || d.x > width + 200) {
        if (Math.random() < 0.65 * this.intensity && d.y <= height + 60) {
          this._spawnSplash(d.x, Math.min(height - 10, d.y - 15));
        }
        d.y = -40 - Math.random() * 80;
        d.x = Math.random() * (width + 400) - 200;
      }
    }

    // Atualização dos respingos (splashes)
    for (let i = 0; i < this.maxSplashes; i++) {
      const s = this.splashes[i];
      if (!s.active) continue;

      s.life += dt;
      const progress = s.life / s.maxLife;
      if (progress >= 1.0) {
        s.active = false;
      } else {
        s.radius = s.maxRadius * Math.sin(progress * Math.PI * 0.5);
        s.alpha = (1.0 - progress) * 0.45;
      }
    }

    // Atualização da névoa rasteira
    for (let i = 0; i < this.fogLayers.length; i++) {
      const fog = this.fogLayers[i];
      fog.phase += dt * 0.4;
      fog.x += (fog.speed / width) * dt;
      if (fog.x > 1.3) {
        fog.x = -0.3;
      }
    }
  }

  /**
   * Renderiza todos os efeitos atmosféricos na ordem de profundidade correta.
   * @param {CanvasRenderingContext2D} ctx Contexto 2D do Canvas principal
   * @param {number} width Largura do viewport
   * @param {number} height Altura do viewport
   * @param {Object} [camera] Offset de câmera opcional
   */
  render(ctx, width, height, camera = { x: 0, y: 0 }) {
    ctx.save();

    // 1. Relâmpago atmosférico distante (flash gélido / roxo elétrico)
    if (this.lightningFlash > 0.01) {
      ctx.fillStyle = `rgba(72, 149, 239, ${this.lightningFlash * 0.22})`;
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = `rgba(123, 44, 191, ${this.lightningFlash * 0.12})`;
      ctx.fillRect(0, 0, width, height);
    }

    // 2. Névoa volumétrica rasteira (nas sarjetas e esquinas)
    this._renderFog(ctx, width, height);

    // 3. Respingos no solo (desenhados sob a chuva direta)
    this._renderSplashes(ctx);

    // 4. Chuva torrencial rápida em camadas
    this._renderRain(ctx);

    // 5. Filtro de granulação de película fotográfica 1989 (Film Grain)
    this._renderFilmGrain(ctx, width, height);

    ctx.restore();
  }

  /**
   * Renderiza camadas de névoa rasteira com gradientes orgânicos.
   * @private
   */
  _renderFog(ctx, width, height) {
    if (this.intensity <= 0.05) return;

    ctx.save();
    for (let i = 0; i < this.fogLayers.length; i++) {
      const fog = this.fogLayers[i];
      const cx = (fog.x * width) + Math.sin(fog.phase) * 35;
      const cy = (fog.y * height) + Math.cos(fog.phase * 0.7) * 12;

      const grad = ctx.createRadialGradient(
        cx, cy, fog.radiusY * 0.1,
        cx, cy, fog.radiusX
      );

      const effectiveAlpha = fog.alpha * this.intensity;
      // Gradiente translúcido em cianose gélida e fumaça industrial
      grad.addColorStop(0.0, `rgba(180, 195, 220, ${effectiveAlpha})`);
      grad.addColorStop(0.4, `rgba(110, 130, 165, ${effectiveAlpha * 0.65})`);
      grad.addColorStop(0.8, `rgba(40, 48, 65, ${effectiveAlpha * 0.25})`);
      grad.addColorStop(1.0, 'rgba(15, 18, 25, 0.0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(cx, cy, fog.radiusX, fog.radiusY, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /**
   * Renderiza os impactos de gotas (splashes) no solo.
   * @private
   */
  _renderSplashes(ctx) {
    if (this.intensity <= 0.05) return;

    ctx.save();
    ctx.lineWidth = 1.0;

    for (let i = 0; i < this.maxSplashes; i++) {
      const s = this.splashes[i];
      if (!s.active) continue;

      ctx.strokeStyle = `rgba(190, 210, 235, ${s.alpha})`;
      ctx.beginPath();
      // Elipse achatada isométrica (proporção 2:1 típica de projeção 2.5D)
      ctx.ellipse(s.x, s.y, s.radius * 1.4, s.radius * 0.7, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * Renderiza as gotas de chuva desenhadas em camadas e velocidade angular.
   * @private
   */
  _renderRain(ctx) {
    if (this.intensity <= 0.02) return;

    ctx.save();
    ctx.lineCap = 'round';

    const dx = this.windAngle;
    const dy = 1.0;
    const mag = Math.sqrt(dx * dx + dy * dy);
    const ndx = dx / mag;
    const ndy = dy / mag;

    // Camadas com cores e opacidades distintas para profundidade visual
    const layerStyles = [
      { stroke: 'rgba(140, 160, 190, 0.22)', width: 0.8 }, // Camada distante
      { stroke: 'rgba(180, 195, 220, 0.38)', width: 1.1 }, // Camada média
      { stroke: 'rgba(215, 230, 250, 0.52)', width: 1.4 }  // Camada frontal próxima
    ];

    for (let layer = 0; layer < 3; layer++) {
      const style = layerStyles[layer];
      ctx.strokeStyle = style.stroke;
      ctx.lineWidth = style.width;
      ctx.beginPath();

      for (let i = 0; i < this.maxRainDrops; i++) {
        const d = this.drops[i];
        if (!d.active || d.layer !== layer) continue;

        const x1 = d.x;
        const y1 = d.y;
        const x2 = x1 + ndx * d.length;
        const y2 = y1 + ndy * d.length;

        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Renderiza o ruído granulado analógico (Film Grain) sobre todo o quadro.
   * @private
   */
  _renderFilmGrain(ctx, width, height) {
    if (this.grainOpacity <= 0.005 || this.grainPatterns.length === 0) return;

    const patternCanvas = this.grainPatterns[this.grainFrameIndex];
    if (!patternCanvas) return;

    ctx.save();
    ctx.globalAlpha = this.grainOpacity;
    ctx.globalCompositeOperation = 'screen'; // Blending analógico suave

    const pattern = ctx.createPattern(patternCanvas, 'repeat');
    if (pattern) {
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, width, height);
    }

    ctx.restore();
  }
}
