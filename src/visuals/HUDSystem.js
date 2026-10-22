/**
 * NorthVale: Sombras de 1989 — HUDSystem.js
 * Direção de Arte Técnica: Interface Diegética e Minimalista (Zero-Clutter)
 *
 * Renderização pura via Canvas 2D:
 * 1. Relógio de pulso analógico/digital no canto superior direito com opacidade ociosa (30% -> 100%).
 * 2. Gotículas de condensação procedurais sobre o vidro do relógio em caso de chuva.
 * 3. Micro ponto de mira âmbar pulsante (4px) com rótulo no mundo isométrico ([E] Inspecionar / Falar).
 * 4. Tira de notificação estilo fita rotuladora manual Dymo (1989) com animação suave de entrada/saída.
 */

export class HUDSystem {
  /**
   * @param {Object} [options]
   * @param {string} [options.dateText='OUT 14 — 18:42'] Data e horário do relógio
   * @param {string} [options.shiftText='PLANTÃO NOTURNO'] Identificador de turno policial
   */
  constructor(options = {}) {
    // Estado do Relógio de Pulso
    this.dateText = options.dateText ?? 'OUT 14 — 18:42';
    this.shiftText = options.shiftText ?? 'PLANTÃO NOTURNO';
    this.watchAlpha = 0.30;
    this.targetWatchAlpha = 0.30;
    this.watchActiveTimer = 0.0;
    this.lastMinuteRecorded = '';

    // Gotas d'água no vidro do mostrador do relógio
    this.watchDroplets = [
      { x: 18, y: 12, r: 2.2, alpha: 0.65 },
      { x: 84, y: 28, r: 3.1, alpha: 0.75 },
      { x: 142, y: 10, r: 1.8, alpha: 0.50 },
      { x: 165, y: 24, r: 2.5, alpha: 0.60 }
    ];

    // Prompt Contextual no Mundo (Zero-Clutter)
    this.activePrompt = null; // { x, y, label: 'Inspecionar', key: 'E', isWorldCoord: true }
    this.pulsePhase = 0;

    // Sistema de Notificações Fita Dymo
    this.notifications = [];
    this.maxNotifications = 3;

    // Tempo global interno
    this.time = 0;
  }

  /**
   * Consulta ativamente o relógio (ativa iluminação máxima por 3 segundos).
   */
  checkWatch() {
    this.watchActiveTimer = 3.0;
    this.targetWatchAlpha = 1.0;
  }

  /**
   * Atualiza o horário e a data do jogo.
   * @param {string} dateString Ex: 'OUT 14 — 18:42'
   * @param {string} [shiftString] Ex: 'PLANTÃO NOTURNO'
   */
  setTime(dateString, shiftString) {
    if (this.lastMinuteRecorded && this.lastMinuteRecorded !== dateString) {
      // Quando o minuto vira, ilumina brevemente o mostrador
      this.checkWatch();
    }
    this.lastMinuteRecorded = dateString;
    this.dateText = dateString;
    if (shiftString) this.shiftText = shiftString;
  }

  /**
   * Define ou remove o prompt contextual do mundo.
   * @param {Object|null} prompt Dados do prompt { x, y, label, key, isWorldCoord }
   */
  setContextPrompt(prompt) {
    this.activePrompt = prompt;
  }

  /**
   * Envia uma notificação em fita Dymo prensada.
   * @param {string} title Título da pista ou ação
   * @param {string} [subtitle] Detalhe adicional
   */
  addNotification(title, subtitle = '') {
    this.notifications.unshift({
      id: Math.random(),
      title: title.toUpperCase(),
      subtitle: subtitle,
      timer: 0.0,
      duration: 3.5, // 3.5 segundos visível
      slide: 0.0,    // 0.0 (fora da tela) a 1.0 (encaixado)
      alpha: 0.0
    });

    if (this.notifications.length > this.maxNotifications) {
      this.notifications.pop();
    }
  }

  /**
   * Atualiza animações, timers e transições suaves do HUD.
   * @param {number} dt Delta time em segundos
   */
  update(dt) {
    this.time += dt;
    this.pulsePhase += dt * 4.5;

    // Transição suave de opacidade do relógio
    if (this.watchActiveTimer > 0) {
      this.watchActiveTimer -= dt;
      if (this.watchActiveTimer <= 0) {
        this.targetWatchAlpha = 0.30;
      }
    }
    this.watchAlpha += (this.targetWatchAlpha - this.watchAlpha) * Math.min(1, dt * 6);

    // Atualiza fila de notificações Dymo
    for (let i = this.notifications.length - 1; i >= 0; i--) {
      const notif = this.notifications[i];
      notif.timer += dt;

      // Animação de entrada (slide-in) nos primeiros 0.35s
      if (notif.timer < 0.35) {
        const t = notif.timer / 0.35;
        // Cubic ease-out
        notif.slide = 1 - Math.pow(1 - t, 3);
        notif.alpha = t;
      }
      // Período estável visível
      else if (notif.timer < notif.duration - 0.45) {
        notif.slide = 1.0;
        notif.alpha = 1.0;
      }
      // Animação de saída (slide-out para a esquerda)
      else if (notif.timer < notif.duration) {
        const t = (notif.timer - (notif.duration - 0.45)) / 0.45;
        notif.slide = 1.0 - (t * t);
        notif.alpha = 1.0 - t;
      }
      // Expira
      else {
        this.notifications.splice(i, 1);
      }
    }
  }

  /**
   * Renderiza todos os elementos diegéticos do HUD na tela.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} width Largura do viewport
   * @param {number} height Altura do viewport
   * @param {Object} [camera={x:0, y:0}] Câmera para converter coordenadas de mundo do prompt
   * @param {boolean} [isRaining=true] Indica se há chuva para condensação no vidro
   */
  render(ctx, width, height, camera = { x: 0, y: 0 }, isRaining = true) {
    ctx.save();

    // 1. Prompt de Interação Minimalista no Mundo (Zero-Clutter)
    if (this.activePrompt) {
      this._renderContextPrompt(ctx, camera);
    }

    // 2. Notificações Fita Dymo no Canto Superior Esquerdo
    this._renderNotifications(ctx);

    // 3. Relógio de Pulso Analógico / Indicador de Turno (Canto Superior Direito)
    this._renderWatch(ctx, width, isRaining);

    ctx.restore();
  }

  /**
   * Desenha o relógio de pulso / indicador de turno no canto superior direito.
   * @private
   */
  _renderWatch(ctx, width, isRaining) {
    ctx.save();
    ctx.globalAlpha = this.watchAlpha;

    const w = 195;
    const h = 48;
    const x = width - w - 24;
    const y = 20;

    // Fundo do gabinete do relógio (Rich Black metálico)
    ctx.fillStyle = 'rgba(10, 10, 12, 0.88)';
    ctx.strokeStyle = '#22222a';
    ctx.lineWidth = 1.2;

    // Cantos ligeiramente aparados (chanfradura industrial de 4px)
    ctx.beginPath();
    ctx.moveTo(x + 5, y);
    ctx.lineTo(x + w - 5, y);
    ctx.lineTo(x + w, y + 5);
    ctx.lineTo(x + w, y + h - 5);
    ctx.lineTo(x + w - 5, y + h);
    ctx.lineTo(x + 5, y + h);
    ctx.lineTo(x, y + h - 5);
    ctx.lineTo(x, y + 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Friso sutil elétrico no topo
    ctx.strokeStyle = '#7b2cbf';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(x + 8, y + 1);
    ctx.lineTo(x + w - 8, y + 1);
    ctx.stroke();

    // Pequenos parafusos decorativos nas quinas
    ctx.fillStyle = '#444450';
    ctx.fillRect(x + 3, y + 3, 2, 2);
    ctx.fillRect(x + w - 5, y + 3, 2, 2);
    ctx.fillRect(x + 3, y + h - 5, 2, 2);
    ctx.fillRect(x + w - 5, y + h - 5, 2, 2);

    // Texto: Data e Horário (Tipografia Monospace de Máquina)
    ctx.font = '600 13px "Courier New", Courier, monospace';
    ctx.fillStyle = '#e6e4df';
    ctx.textBaseline = 'top';
    ctx.fillText(this.dateText, x + 14, y + 10);

    // Subtítulo: Turno / Status Policial
    ctx.font = '500 9px "Courier New", Courier, monospace';
    ctx.fillStyle = '#9d4edd';
    ctx.fillText(this.shiftText, x + 14, y + 28);

    // Led indicador analógico verde/âmbar
    ctx.fillStyle = '#d48b28';
    ctx.beginPath();
    ctx.arc(x + w - 16, y + 17, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Gotas de condensação no vidro quando chovendo
    if (isRaining) {
      for (const drop of this.watchDroplets) {
        const dx = x + drop.x;
        const dy = y + drop.y;

        // Sombra da gota
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.arc(dx + 0.5, dy + 0.5, drop.r, 0, Math.PI * 2);
        ctx.fill();

        // Corpo da gota com refração
        const grad = ctx.createRadialGradient(dx - drop.r * 0.3, dy - drop.r * 0.3, 0.5, dx, dy, drop.r);
        grad.addColorStop(0, `rgba(220, 235, 255, ${drop.alpha})`);
        grad.addColorStop(0.7, `rgba(160, 185, 215, ${drop.alpha * 0.7})`);
        grad.addColorStop(1, 'rgba(80, 100, 130, 0.2)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(dx, dy, drop.r, 0, Math.PI * 2);
        ctx.fill();

        // Ponto de brilho especular
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.beginPath();
        ctx.arc(dx - drop.r * 0.35, dy - drop.r * 0.35, 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  /**
   * Renderiza o ponto de mira âmbar de 4px e rótulo minimalista sobre o alvo.
   * @private
   */
  _renderContextPrompt(ctx, camera) {
    const p = this.activePrompt;
    if (!p) return;

    // Converte para espaço de tela se for coordenada de mundo
    const screenX = p.isWorldCoord ? (p.x - camera.x) : p.x;
    const screenY = p.isWorldCoord ? (p.y - camera.y) : p.y;

    ctx.save();

    // 1. Ponto central âmbar de 4px
    ctx.fillStyle = '#d48b28';
    ctx.beginPath();
    ctx.arc(screenX, screenY, 4, 0, Math.PI * 2);
    ctx.fill();

    // 2. Halo pulsante suave ao redor do ponto
    const pulseRadius = 5 + Math.sin(this.pulsePhase) * 3;
    const pulseAlpha = 0.35 + Math.cos(this.pulsePhase) * 0.25;
    ctx.strokeStyle = `rgba(212, 139, 40, ${pulseAlpha})`;
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.arc(screenX, screenY, pulseRadius, 0, Math.PI * 2);
    ctx.stroke();

    // 3. Rótulo minimalista limpo ao lado do ponto
    const key = p.key ?? 'E';
    const label = p.label ?? 'Inspecionar';
    const fullText = `[${key}] ${label}`;

    ctx.font = '600 11px "Courier New", Courier, monospace';
    ctx.textBaseline = 'middle';

    const textMetrics = ctx.measureText(fullText);
    const boxW = textMetrics.width + 12;
    const boxH = 18;
    const boxX = screenX + 12;
    const boxY = screenY - boxH / 2;

    // Fundo semitransparente escuro para leitura perfeita
    ctx.fillStyle = 'rgba(10, 10, 12, 0.82)';
    ctx.strokeStyle = 'rgba(123, 44, 191, 0.4)';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.rect(boxX, boxY, boxW, boxH);
    ctx.fill();
    ctx.stroke();

    // Tecla destacada em âmbar e ação em off-white
    ctx.fillStyle = '#d48b28';
    ctx.fillText(`[${key}]`, boxX + 4, screenY);
    ctx.fillStyle = '#e6e4df';
    ctx.fillText(` ${label}`, boxX + 4 + ctx.measureText(`[${key}]`).width, screenY);

    ctx.restore();
  }

  /**
   * Renderiza as notificações em estilo fita etiquetadora Dymo / carimbo policial.
   * @private
   */
  _renderNotifications(ctx) {
    if (this.notifications.length === 0) return;

    ctx.save();
    const startX = 24;
    let currentY = 24;

    for (const notif of this.notifications) {
      ctx.globalAlpha = notif.alpha;

      const fullWidth = 310;
      const height = notif.subtitle ? 42 : 30;

      // Deslocamento de entrada/saída no eixo X
      const x = startX - (1.0 - notif.slide) * (fullWidth + 40);
      const y = currentY;

      // Fundo preto translúcido da fita Dymo prensada
      ctx.fillStyle = 'rgba(12, 12, 14, 0.88)';
      ctx.strokeStyle = '#7b2cbf'; // Borda fina roxo elétrico
      ctx.lineWidth = 1.2;

      // Tira chanfrada analógica
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + fullWidth - 8, y);
      ctx.lineTo(x + fullWidth, y + 8);
      ctx.lineTo(x + fullWidth, y + height);
      ctx.lineTo(x, y + height);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Friso superior em relevo plástico fosco
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(x + 1, y + 1, fullWidth - 9, 2);

      // Marca lateral âmbar (carimbo de arquivo / evidência)
      ctx.fillStyle = '#d48b28';
      ctx.fillRect(x + 2, y + 2, 4, height - 4);

      // Título da notificação (letras em relevo branco prensado)
      ctx.font = '700 11px "Courier New", Courier, monospace';
      ctx.fillStyle = '#f0eee9';
      ctx.textBaseline = 'top';
      ctx.fillText(notif.title, x + 16, y + 8);

      // Subtítulo descritivo
      if (notif.subtitle) {
        ctx.font = '500 10px "Courier New", Courier, monospace';
        ctx.fillStyle = '#6e6a75';
        ctx.fillText(notif.subtitle, x + 16, y + 23);
      }

      currentY += height + 8;
    }

    ctx.restore();
  }
}
