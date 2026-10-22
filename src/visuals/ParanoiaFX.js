/**
 * NorthVale: Sombras de 1989 — ParanoiaFX.js
 * Direção de Arte Técnica: Feedback Sensorial e Colapso Mental Psicológico (1989)
 *
 * Módulo puro em Canvas 2D desacoplado (sem dependências externas):
 * - Controlado pela variável PARANOIA (0 a 100).
 * - Aberração cromática periférica (separação de canais vermelho e ciano por 2 a 5px quando > 60).
 * - Vinheta claustrofóbica pulsante sincronizada com taquicardia cardíaca (Math.sin(time * heartRate)).
 * - Sombras periféricas fugazes (alucinações de 2 a 4 frames que dissolvem ao olhar do jogador).
 * - Micro-tremor intermitente para diálogos e elementos diegéticos da HUD.
 */

export class ParanoiaFX {
  /**
   * @param {HTMLCanvasElement} [canvas] Referência opcional ao canvas principal
   */
  constructor(canvas = null) {
    this.canvas = canvas;
    this.time = 0;
    this.paranoiaLevel = 0; // 0 a 100
    this.targetLevel = 0;

    // Frequência cardíaca calculada (Hz)
    this.heartRate = 1.2;
    this.heartbeatPulse = 0.0;

    // Posição do cursor do jogador para detecção de olhar direto
    this.mouse = { x: 0, y: 0 };

    // Pool de sombras periféricas fugazes (alucinações)
    this.hallucinations = [];
    this.hallucinationSpawnTimer = 0;

    // Tremor de tela e texto
    this.textJitter = { x: 0, y: 0 };
    this.glitchTimer = 0;
    this.isGlitching = false;
  }

  /**
   * Define o nível da variável PARANOIA (0 a 100).
   * @param {number} level
   */
  setParanoiaLevel(level) {
    this.targetLevel = Math.max(0, Math.min(100, level));
  }

  /**
   * Retorna o offset de tremor para ser consumido opcionalmente pela HUD/Diálogos.
   * @returns {{x: number, y: number}}
   */
  getTextJitter() {
    return this.textJitter;
  }

  /**
   * Atualiza a posição do mouse para que alucinações fujam do olhar direto do jogador.
   * @param {number} x
   * @param {number} y
   */
  handleMouseMove(x, y) {
    this.mouse.x = x;
    this.mouse.y = y;

    // Se o cursor se aproximar de uma sombra fugaz, ela dissolve imediatamente
    for (let i = 0; i < this.hallucinations.length; i++) {
      const h = this.hallucinations[i];
      const dist = Math.hypot(x - h.x, y - h.y);
      if (dist < 190) {
        h.isFleeing = true;
        h.alpha = Math.max(0, h.alpha - 0.4); // Desaparece no susto
      }
    }
  }

  /**
   * Atualiza a taquicardia, aberrações e sombras a 60 FPS.
   * @param {number} dt Delta time em segundos
   */
  update(dt) {
    this.time += dt;

    // Interpolação suave do nível de paranoia
    this.paranoiaLevel += (this.targetLevel - this.paranoiaLevel) * Math.min(1, dt * 4.0);

    const norm = this.paranoiaLevel / 100.0;

    // 1. Ritmo Cardíaco Acelerado (Taquicardia de 60 até 175 BPM)
    // 1.0 Hz (60 BPM) -> 2.9 Hz (175 BPM em colapso mental)
    this.heartRate = 1.0 + norm * 1.9;

    // Batimento cardíaco com pico sistólico acentuado (thump-thump)
    const rawPulse = Math.sin(this.time * this.heartRate * Math.PI * 2);
    this.heartbeatPulse = Math.pow(Math.max(0, rawPulse), 3.5);

    // 2. Micro-tremor de texto (Jitter) quando paranoia > 45
    if (this.paranoiaLevel > 45) {
      const shakeMag = (norm - 0.45) * 3.8;
      if (Math.random() < norm * 0.4) {
        this.textJitter.x = (Math.random() - 0.5) * shakeMag;
        this.textJitter.y = (Math.random() - 0.5) * shakeMag;
      } else {
        this.textJitter.x = 0;
        this.textJitter.y = 0;
      }
    } else {
      this.textJitter.x = 0;
      this.textJitter.y = 0;
    }

    // 3. Glitch analógico intermitente quando paranoia > 75
    if (this.paranoiaLevel > 75) {
      this.glitchTimer -= dt;
      if (this.glitchTimer <= 0) {
        this.isGlitching = Math.random() < 0.28;
        this.glitchTimer = 0.08 + Math.random() * 0.35;
      }
    } else {
      this.isGlitching = false;
    }

    // 4. Ciclo de geração de Alucinações de Canto Cego (quando paranoia > 50)
    if (this.paranoiaLevel > 50) {
      this.hallucinationSpawnTimer += dt;
      const spawnInterval = 1.4 - norm * 0.9; // Spawna mais frequente com paranoia alta

      if (this.hallucinationSpawnTimer >= spawnInterval) {
        this.hallucinationSpawnTimer = 0;
        this._spawnPeripheralShadow();
      }
    }

    // Atualiza vida breve das alucinações (duram apenas 2 a 5 frames: 0.06s a 0.16s)
    for (let i = this.hallucinations.length - 1; i >= 0; i--) {
      const h = this.hallucinations[i];
      h.life += dt;
      if (h.isFleeing) {
        h.alpha = Math.max(0, h.alpha - dt * 6.0);
      }
      if (h.life >= h.maxLife || h.alpha <= 0.01) {
        this.hallucinations.splice(i, 1);
      }
    }
  }

  /**
   * Spawna uma sombra nos cantos cegos do Canvas.
   * @private
   */
  _spawnPeripheralShadow() {
    const w = this.canvas ? this.canvas.width : (typeof window !== 'undefined' ? window.innerWidth : 1280);
    const h = this.canvas ? this.canvas.height : (typeof window !== 'undefined' ? window.innerHeight : 720);

    // Escolhe um dos 4 cantos ou bordas periféricas
    const edge = Math.floor(Math.random() * 4);
    let x = 0;
    let y = 0;

    if (edge === 0) { x = Math.random() * w * 0.15; y = Math.random() * h; } // Borda esquerda
    else if (edge === 1) { x = w - Math.random() * w * 0.15; y = Math.random() * h; } // Borda direita
    else if (edge === 2) { x = Math.random() * w; y = Math.random() * h * 0.15; } // Borda superior
    else { x = Math.random() * w; y = h - Math.random() * h * 0.15; } // Borda inferior

    this.hallucinations.push({
      x,
      y,
      size: 55 + Math.random() * 75,
      alpha: 0.45 + Math.random() * 0.35,
      life: 0,
      maxLife: 0.08 + Math.random() * 0.12, // Duração relâmpago de 2 a 5 frames
      isFleeing: false,
      angle: (Math.random() - 0.5) * 0.4
    });
  }

  /**
   * Renderiza todos os efeitos sensoriais de pós-processamento sobre o Canvas.
   * @param {CanvasRenderingContext2D} ctx Contexto Canvas 2D
   * @param {number} [width]
   * @param {number} [height]
   */
  render(ctx, width, height) {
    if (this.paranoiaLevel <= 2) return;

    const w = width || ctx.canvas.width;
    const h = height || ctx.canvas.height;
    const norm = this.paranoiaLevel / 100.0;

    ctx.save();

    // 1. Aberração Cromática Periférica (quando Paranoia > 60)
    if (this.paranoiaLevel > 60) {
      this._renderChromaticAberration(ctx, w, h, norm);
    }

    // 2. Vinheta Claustrofóbica Pulsante no Ritmo da Taquicardia
    this._renderHeartbeatVignette(ctx, w, h, norm);

    // 3. Alucinações de Linhas e Sombras Fugazes nos Cantos Cegos
    if (this.paranoiaLevel > 50) {
      this._renderHallucinations(ctx);
    }

    // 4. Glitch de Interrupção Mental (quando Paranoia Crítica > 80)
    if (this.isGlitching) {
      this._renderPsychologicalGlitch(ctx, w, h);
    }

    ctx.restore();
  }

  /**
   * Separação de canais RGB (vermelho e ciano) por 2 a 5px nas bordas da tela.
   * @private
   */
  _renderChromaticAberration(ctx, w, h, norm) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // Deslocamento de 2 a 5 pixels proporcional ao nível crítico
    const shift = 2.0 + (norm - 0.6) * 7.5;
    const fringeAlpha = Math.min(0.42, (norm - 0.6) * 1.1);

    // Borda Direita: Franja Vermelho Carmim (#ff1e38)
    const redGrad = ctx.createLinearGradient(w - 180, 0, w, 0);
    redGrad.addColorStop(0.0, 'rgba(0, 0, 0, 0)');
    redGrad.addColorStop(1.0, `rgba(255, 30, 60, ${fringeAlpha})`);
    ctx.fillStyle = redGrad;
    ctx.fillRect(w - 180 + shift, 0, 180, h);

    // Borda Esquerda: Franja Ciano / Azul Gélido (#1edcff)
    const cyanGrad = ctx.createLinearGradient(0, 0, 180, 0);
    cyanGrad.addColorStop(0.0, `rgba(30, 220, 255, ${fringeAlpha})`);
    cyanGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = cyanGrad;
    ctx.fillRect(-shift, 0, 180, h);

    // Franja Superior / Inferior em Roxo Elétrico
    const purpleGrad = ctx.createLinearGradient(0, 0, 0, 90);
    purpleGrad.addColorStop(0.0, `rgba(123, 44, 191, ${fringeAlpha * 0.7})`);
    purpleGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = purpleGrad;
    ctx.fillRect(0, 0, w, 90);

    ctx.restore();
  }

  /**
   * Vinheta escura claustrofóbica que fecha o campo de visão e pulsa com o coração.
   * @private
   */
  _renderHeartbeatVignette(ctx, w, h, norm) {
    ctx.save();
    const cx = w / 2;
    const cy = h / 2;

    // O raio da visão periférica diminui conforme a paranoia aumenta
    const baseRadius = Math.max(w, h) * (0.75 - norm * 0.38);

    // O pulso cardíaco comprime o raio no impacto do batimento
    const pulseOffset = this.heartbeatPulse * (28 + norm * 35);
    const innerR = Math.max(80, baseRadius * 0.35 - pulseOffset);
    const outerR = Math.max(innerR + 80, baseRadius + pulseOffset);

    const vigGrad = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
    vigGrad.addColorStop(0.0, 'rgba(0, 0, 0, 0.0)');
    vigGrad.addColorStop(0.55, `rgba(10, 8, 14, ${norm * 0.45})`);
    // Borda escura sufocante com leve tom carmim nos batimentos
    const edgeRed = Math.floor(norm * this.heartbeatPulse * 28);
    vigGrad.addColorStop(1.0, `rgba(${8 + edgeRed}, 6, 10, ${Math.min(0.96, 0.35 + norm * 0.62)})`);

    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, w, h);

    ctx.restore();
  }

  /**
   * Alucinações de silhuetas e sombras escuras fugazes nos cantos periféricos.
   * @private
   */
  _renderHallucinations(ctx) {
    ctx.save();

    for (const h of this.hallucinations) {
      ctx.save();
      ctx.translate(h.x, h.y);
      ctx.rotate(h.angle);
      ctx.globalAlpha = Math.max(0, h.alpha);

      // Silhueta de vulto negro esguio espreitando na borda
      ctx.fillStyle = '#060609';
      ctx.beginPath();
      // Corpo distorcido em sombra
      ctx.ellipse(0, 0, h.size * 0.35, h.size * 0.65, 0.15, 0, Math.PI * 2);
      ctx.fill();

      // Cabeça do vulto
      ctx.beginPath();
      ctx.arc(-8, -h.size * 0.45, h.size * 0.22, 0, Math.PI * 2);
      ctx.fill();

      // Olhos fosforescentes vazios quase imperceptíveis
      ctx.fillStyle = 'rgba(212, 139, 40, 0.45)'; // Âmbar difuso
      ctx.fillRect(-12, -h.size * 0.46, 3, 2);
      ctx.fillRect(-5, -h.size * 0.46, 3, 2);

      ctx.restore();
    }

    ctx.restore();
  }

  /**
   * Linha de corte e glitch analógico que rasga a imagem temporariamente.
   * @private
   */
  _renderPsychologicalGlitch(ctx, w, h) {
    ctx.save();
    const gy = Math.random() * h;
    const gh = 6 + Math.random() * 18;

    // Faixa descolada com estática
    ctx.fillStyle = 'rgba(72, 149, 239, 0.18)';
    ctx.fillRect(0, gy, w, gh);

    ctx.fillStyle = 'rgba(255, 30, 60, 0.15)';
    ctx.fillRect(0, gy + 3, w, gh * 0.5);

    // Linha fina de ruído preto analógico
    ctx.fillStyle = '#040406';
    ctx.fillRect(0, gy + gh * 0.8, w, 2);

    ctx.restore();
  }
}
