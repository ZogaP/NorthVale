/**
 * NorthVale: Sombras de 1989 — SceneInspectView.js
 * Direção de Arte Técnica: Investigação Tátil em Close-Up de Cenas de Crime (1989)
 *
 * Módulo puro em Canvas 2D desacoplado (sem dependências externas):
 * - Visão zenital/frontal detalhada de compartimentos (porta-luvas, gavetas, cinzeiros, mesa de necrotério).
 * - Oclusão de contato, poeira de arquivo e iluminação de lanterna/abajur.
 * - Hotspots interativos com contorno tracejado animado em âmbar/roxo e micro-rótulo datilografado.
 * - Cursor diegético personalizado: lente de aumento analógica (loupe) com reflexo e retículo.
 * - Transição suave de fade para retornar à câmera isométrica com [ESC] ou botão.
 */

export class SceneInspectView {
  /**
   * @param {HTMLCanvasElement} [canvas] Referência opcional ao canvas principal
   */
  constructor(canvas = null) {
    this.canvas = canvas;
    this.isOpen = false;
    this.time = 0;
    this.fadeAlpha = 0.0;
    this.targetAlpha = 0.0;

    // Dados da cena em close-up
    this.sceneData = null;
    this.onFoundItem = null;
    this.onClose = null;

    // Estado do cursor do jogador
    this.mouse = { x: 0, y: 0 };
    this.hoveredHotspot = null;

    // Hotspots interativos da cena ativa
    this.hotspots = [];

    // Partículas de poeira suspensas sob a luz da cena
    this.dustMotes = [];
    for (let i = 0; i < 30; i++) {
      this.dustMotes.push({
        x: Math.random(),
        y: Math.random(),
        r: 0.7 + Math.random() * 1.5,
        alpha: 0.2 + Math.random() * 0.4,
        speedX: (Math.random() - 0.5) * 0.02,
        speedY: -0.01 - Math.random() * 0.02
      });
    }

    // Botão de retorno
    this.returnButtonHitbox = { x: 0, y: 0, w: 180, h: 32 };
  }

  /**
   * Abre o visualizador de close-up com os dados da cena.
   * @param {Object} sceneData
   * @param {string} sceneData.title Ex: "PORTA-LUVAS — CHEVROLET 1989" ou "GAVETA DE BOBBY — DELEGACIA"
   * @param {string} [sceneData.type='glovebox'] 'glovebox' | 'drawer' | 'desk' | 'morgue'
   * @param {Array<Object>} sceneData.hotspots Lista de itens investigáveis
   * @param {Function} [onFoundItemCallback] Disparado ao clicar em um hotspot
   * @param {Function} [onCloseCallback] Disparado ao fechar
   */
  open(sceneData, onFoundItemCallback = null, onCloseCallback = null) {
    this.sceneData = sceneData;
    this.hotspots = sceneData.hotspots || [];
    this.onFoundItem = onFoundItemCallback;
    this.onClose = onCloseCallback;

    this.isOpen = true;
    this.targetAlpha = 1.0;
    this.time = 0;
    this.hoveredHotspot = null;
  }

  /**
   * Fecha o visualizador com fade-out suave.
   */
  close() {
    this.targetAlpha = 0.0;
    if (this.onClose) {
      this.onClose();
    }
  }

  /**
   * Atualiza timers, poeira e transições a 60 FPS.
   * @param {number} dt Delta time em segundos
   */
  update(dt) {
    if (!this.isOpen && this.fadeAlpha <= 0) return;
    this.time += dt;

    // Transição suave de opacidade
    this.fadeAlpha += (this.targetAlpha - this.fadeAlpha) * Math.min(1, dt * 8.0);
    if (this.targetAlpha === 0 && this.fadeAlpha <= 0.01) {
      this.isOpen = false;
      this.fadeAlpha = 0;
    }

    // Movimento sutil das poeiras suspensas
    for (const d of this.dustMotes) {
      d.x += d.speedX * dt;
      d.y += d.speedY * dt;
      if (d.y < 0) d.y = 1.0;
      if (d.x < 0) d.x = 1.0;
      if (d.x > 1.0) d.x = 0;
    }
  }

  /**
   * Renderiza a cena de close-up completa no Canvas.
   * @param {CanvasRenderingContext2D} ctx Contexto Canvas 2D
   * @param {number} [width]
   * @param {number} [height]
   */
  render(ctx, width, height) {
    if (!this.isOpen && this.fadeAlpha <= 0) return;

    const w = width || ctx.canvas.width;
    const h = height || ctx.canvas.height;

    ctx.save();
    ctx.globalAlpha = Math.min(1, Math.max(0, this.fadeAlpha));

    // 1. Fundo do Gabinete e Compartimento em Close-up
    this._renderCompartmentSurface(ctx, w, h);

    // 2. Poeira de Arquivo Suspensa na Luz
    this._renderDustMotes(ctx, w, h);

    // 3. Hotspots e Objetos Clicáveis na Superfície
    this._renderHotspots(ctx, w, h);

    // 4. Cabeçalho Analógico da Investigação
    this._renderHeader(ctx, w);

    // 5. Botão Inferior de Retorno à Sala
    this._renderReturnButton(ctx, w, h);

    // 6. Cursor Diegético Personalizado (Lente de Aumento Analógica)
    this._renderDiegeticCursor(ctx);

    ctx.restore();
  }

  /**
   * Desenha a superfície do compartimento (porta-luvas, gaveta de madeira ou inox).
   * @private
   */
  _renderCompartmentSurface(ctx, w, h) {
    const type = this.sceneData?.type || 'glovebox';

    // Fundo base escura
    ctx.fillStyle = '#08080c';
    ctx.fillRect(0, 0, w, h);

    const padX = w * 0.12;
    const padY = h * 0.14;
    const boxW = w - padX * 2;
    const boxH = h - padY * 2 - 25;

    // Sombra profunda da cavidade do compartimento (Oclusão de contato)
    ctx.fillStyle = '#050508';
    ctx.fillRect(padX - 8, padY - 8, boxW + 16, boxH + 16);

    ctx.save();
    if (type === 'drawer' || type === 'desk') {
      // Madeira escura entalhada e arranhada
      const woodGrad = ctx.createLinearGradient(padX, padY, padX + boxW, padY + boxH);
      woodGrad.addColorStop(0.0, '#2b1f14');
      woodGrad.addColorStop(0.5, '#3a2b1c');
      woodGrad.addColorStop(1.0, '#24180d');
      ctx.fillStyle = woodGrad;
      ctx.fillRect(padX, padY, boxW, boxH);

      // Riscos e ranhuras na madeira
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      for (let ly = padY + 20; ly < padY + boxH; ly += 24) {
        ctx.beginPath();
        ctx.moveTo(padX + 15, ly);
        ctx.lineTo(padX + boxW - 15, ly);
        ctx.stroke();
      }
    } else {
      // Chapa de vinil / plástico preto fosco do porta-luvas do Chevrolet 1989
      const vinylGrad = ctx.createLinearGradient(padX, padY, padX, padY + boxH);
      vinylGrad.addColorStop(0.0, '#15151e');
      vinylGrad.addColorStop(0.35, '#181822');
      vinylGrad.addColorStop(1.0, '#0c0c12');
      ctx.fillStyle = vinylGrad;
      ctx.fillRect(padX, padY, boxW, boxH);

      // Nervuras plásticas do fundo do compartimento
      ctx.strokeStyle = '#09090d';
      ctx.lineWidth = 2.0;
      for (let vx = padX + 35; vx < padX + boxW; vx += 45) {
        ctx.beginPath();
        ctx.moveTo(vx, padY + 10);
        ctx.lineTo(vx, padY + boxH - 10);
        ctx.stroke();
      }
    }

    // Moldura chanfrada de metal com parafusos industriais
    ctx.strokeStyle = '#22222c';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(padX, padY, boxW, boxH);

    // Oclusão de contato nas bordas internas do compartimento
    const aoGrad = ctx.createRadialGradient(w / 2, h / 2 - 10, boxW * 0.35, w / 2, h / 2 - 10, boxW * 0.65);
    aoGrad.addColorStop(0.0, 'rgba(0, 0, 0, 0.0)');
    aoGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0.45)');
    aoGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.88)');
    ctx.fillStyle = aoGrad;
    ctx.fillRect(padX, padY, boxW, boxH);

    ctx.restore();
  }

  /**
   * Partículas de poeira suspensa flutuando na cena.
   * @private
   */
  _renderDustMotes(ctx, w, h) {
    ctx.save();
    for (const d of this.dustMotes) {
      const px = d.x * w;
      const py = d.y * h;
      ctx.fillStyle = `rgba(212, 185, 140, ${d.alpha * 0.65})`;
      ctx.beginPath();
      ctx.arc(px, py, d.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /**
   * Renderiza os objetos físicos investigáveis e contornos nos hotspots.
   * @private
   */
  _renderHotspots(ctx, w, h) {
    ctx.save();

    for (const spot of this.hotspots) {
      const isHovered = this.hoveredHotspot && this.hoveredHotspot.id === spot.id;

      // Desenho do objeto com base no tipo
      this._drawItemGraphic(ctx, spot, isHovered);

      // Se o cursor estiver sobre o hotspot, desenha contorno tracejado animado
      if (isHovered) {
        ctx.save();
        ctx.strokeStyle = spot.accentColor || '#e0a96d'; // Âmbar ou Roxo
        ctx.lineWidth = 1.4;
        ctx.setLineDash([5, 4]);
        ctx.lineDashOffset = -this.time * 14;

        ctx.strokeRect(spot.x - 4, spot.y - 4, spot.width + 8, spot.height + 8);
        ctx.restore();

        // Micro-rótulo datilografado flutuante sobre o item
        this._drawFloatingLabel(ctx, spot);
      }
    }

    ctx.restore();
  }

  /**
   * Desenha o gráfico visual do item (maço de cigarros, chave, fita K7, documento).
   * @private
   */
  _drawItemGraphic(ctx, spot, isHovered) {
    const x = spot.x;
    const y = spot.y;
    const w = spot.width;
    const h = spot.height;

    ctx.save();

    // Sombra de contato do objeto na gaveta
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(x + 5, y + 6, w, h);

    switch (spot.type) {
      case 'cassette':
        // Fita Cassete Magnética K7 (1989)
        ctx.fillStyle = '#1c1c22';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#383844';
        ctx.strokeRect(x, y, w, h);

        // Etiqueta branca com escrita à mão
        ctx.fillStyle = '#ded8ca';
        ctx.fillRect(x + 8, y + 8, w - 16, h - 22);
        ctx.fillStyle = '#1d2d54';
        ctx.font = '700 9px "Courier New", monospace';
        ctx.fillText(spot.shortLabel || 'FITA K7 Nº 04', x + 12, y + 20);

        // Carretéis da fita
        ctx.fillStyle = '#0a0a0e';
        ctx.beginPath();
        ctx.arc(x + w * 0.35, y + h * 0.68, 7, 0, Math.PI * 2);
        ctx.arc(x + w * 0.65, y + h * 0.68, 7, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'key':
        // Chave mestra de latão
        ctx.fillStyle = '#b89438';
        ctx.strokeStyle = '#6b541c';
        ctx.lineWidth = 1.2;

        // Cabeça da chave
        ctx.beginPath();
        ctx.arc(x + w * 0.3, y + h / 2, h * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#15151e';
        ctx.beginPath();
        ctx.arc(x + w * 0.3, y + h / 2, 4, 0, Math.PI * 2);
        ctx.fill();

        // Haste e dentes
        ctx.fillStyle = '#b89438';
        ctx.fillRect(x + w * 0.45, y + h / 2 - 3, w * 0.5, 6);
        ctx.fillRect(x + w * 0.8, y + h / 2 + 3, 6, 6);
        ctx.fillRect(x + w * 0.9, y + h / 2 + 3, 5, 8);
        break;

      case 'cigarettes':
        // Maço de cigarros amassado
        ctx.fillStyle = '#8f2d2d'; // Vermelho clássico
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#ded8ca';
        ctx.fillRect(x, y + h * 0.4, w, h * 0.2);

        ctx.font = '700 8px "Courier New", monospace';
        ctx.fillStyle = '#16161a';
        ctx.textAlign = 'center';
        ctx.fillText('LUCKY', x + w / 2, y + h * 0.52);

        // Ponta de cigarro saindo
        ctx.fillStyle = '#f0eee9';
        ctx.fillRect(x + 6, y - 8, 4, 10);
        ctx.fillStyle = '#d48b28';
        ctx.fillRect(x + 6, y - 12, 4, 4);
        break;

      default:
        // Envelope ou documento pardo genérico
        ctx.fillStyle = spot.accentColor || '#c5b58e';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#8a7850';
        ctx.strokeRect(x, y, w, h);

        ctx.font = '700 9px "Courier New", monospace';
        ctx.fillStyle = '#22201d';
        ctx.fillText(spot.shortLabel || 'DOCUMENTO', x + 8, y + 16);
        break;
    }

    ctx.restore();
  }

  /**
   * Desenha micro-rótulo datilografado flutuante sobre o item sob o cursor.
   * @private
   */
  _drawFloatingLabel(ctx, spot) {
    ctx.save();
    const label = `[CLIQUE] ${spot.label.toUpperCase()}`;

    ctx.font = '700 10.5px "Courier New", Courier, monospace';
    const textW = ctx.measureText(label).width;
    const boxW = textW + 16;
    const boxH = 22;
    const boxX = spot.x + spot.width / 2 - boxW / 2;
    const boxY = spot.y - boxH - 8;

    // Fundo preto fosco translúcido
    ctx.fillStyle = 'rgba(10, 10, 14, 0.92)';
    ctx.strokeStyle = spot.accentColor || '#e0a96d';
    ctx.lineWidth = 1.0;
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    // Texto datilografado em tom âmbar
    ctx.fillStyle = '#e0a96d';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, boxX + boxW / 2, boxY + boxH / 2);

    ctx.restore();
  }

  /**
   * Cabeçalho de registro no topo da tela modal.
   * @private
   */
  _renderHeader(ctx, w) {
    ctx.save();
    const title = this.sceneData?.title || 'CENA DE CRIME — INVESTIGAÇÃO EM CLOSE-UP';

    // Faixa estilizada
    ctx.fillStyle = 'rgba(12, 12, 16, 0.9)';
    ctx.strokeStyle = '#7b2cbf';
    ctx.lineWidth = 1.2;

    const boxW = Math.min(520, w * 0.7);
    const boxX = w / 2 - boxW / 2;
    ctx.fillRect(boxX, 24, boxW, 30);
    ctx.strokeRect(boxX, 24, boxW, 30);

    ctx.font = '700 12px "Courier New", Courier, monospace';
    ctx.fillStyle = '#e6e4df';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title.toUpperCase(), w / 2, 39);

    // Marcação âmbar no canto
    ctx.fillStyle = '#d48b28';
    ctx.fillRect(boxX + 2, 26, 4, 26);

    ctx.restore();
  }

  /**
   * Botão inferior estilizado para retornar à visão isométrica da sala.
   * @private
   */
  _renderReturnButton(ctx, w, h) {
    ctx.save();
    const btnW = 210;
    const btnH = 32;
    const btnX = w / 2 - btnW / 2;
    const btnY = h - 56;

    this.returnButtonHitbox = { x: btnX, y: btnY, w: btnW, h: btnH };

    const isHover = (
      this.mouse.x >= btnX && this.mouse.x <= btnX + btnW &&
      this.mouse.y >= btnY && this.mouse.y <= btnY + btnH
    );

    if (isHover) {
      ctx.fillStyle = 'rgba(123, 44, 191, 0.4)';
      ctx.strokeStyle = '#9d4edd';
      ctx.lineWidth = 1.2;
    } else {
      ctx.fillStyle = 'rgba(18, 18, 24, 0.85)';
      ctx.strokeStyle = '#2d2d38';
      ctx.lineWidth = 1.0;
    }

    ctx.fillRect(btnX, btnY, btnW, btnH);
    ctx.strokeRect(btnX, btnY, btnW, btnH);

    ctx.font = '700 11px "Courier New", Courier, monospace';
    ctx.fillStyle = isHover ? '#d48b28' : '#e6e4df';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('[ESC] RETORNAR À SALA', w / 2, btnY + btnH / 2);

    ctx.restore();
  }

  /**
   * Renderiza o cursor diegético: Lente de aumento analógica (loupe).
   * @private
   */
  _renderDiegeticCursor(ctx) {
    const mx = this.mouse.x;
    const my = this.mouse.y;

    ctx.save();
    const loupeR = 22;

    // Aro metálico da lupa
    ctx.strokeStyle = '#9d4edd'; // Roxo neon
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(mx, my, loupeR, 0, Math.PI * 2);
    ctx.stroke();

    // Retículo em cruz central fino
    ctx.strokeStyle = 'rgba(212, 139, 40, 0.65)'; // Âmbar
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(mx - loupeR - 4, my); ctx.lineTo(mx - 4, my);
    ctx.moveTo(mx + 4, my); ctx.lineTo(mx + loupeR + 4, my);
    ctx.moveTo(mx, my - loupeR - 4); ctx.lineTo(mx, my - 4);
    ctx.moveTo(mx, my + 4); ctx.lineTo(mx, my + loupeR + 4);
    ctx.stroke();

    // Ponto central de mira
    ctx.fillStyle = '#e0a96d';
    ctx.beginPath();
    ctx.arc(mx, my, 2.0, 0, Math.PI * 2);
    ctx.fill();

    // Reflexo de luz na borda do vidro da lente
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(mx, my, loupeR - 2, -Math.PI * 0.7, -Math.PI * 0.25);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Processa movimento do cursor e detecta hover nos hotspots.
   * @param {number} x
   * @param {number} y
   */
  handleMouseMove(x, y) {
    if (!this.isOpen) return;
    this.mouse.x = x;
    this.mouse.y = y;

    this.hoveredHotspot = null;
    for (let i = this.hotspots.length - 1; i >= 0; i--) {
      const s = this.hotspots[i];
      if (
        x >= s.x && x <= s.x + s.width &&
        y >= s.y && y <= s.y + s.height
      ) {
        this.hoveredHotspot = s;
        break;
      }
    }
  }

  /**
   * Processa cliques do mouse na cena de close-up.
   * @param {number} x
   * @param {number} y
   * @returns {boolean} Se o clique foi consumido
   */
  handleClick(x, y) {
    if (!this.isOpen) return false;

    // 1. Clique no botão de retorno à sala
    const btn = this.returnButtonHitbox;
    if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
      this.close();
      return true;
    }

    // 2. Clique em um hotspot/objeto interativo
    if (this.hoveredHotspot) {
      if (this.onFoundItem) {
        this.onFoundItem(this.hoveredHotspot);
      }
      return true;
    }

    return false;
  }

  /**
   * Processa tecla ESC para fechar.
   * @param {KeyboardEvent|string} key
   */
  handleKeyDown(key) {
    if (!this.isOpen) return false;
    const k = typeof key === 'string' ? key : key.key;
    if (k === 'Escape') {
      this.close();
      return true;
    }
    return false;
  }
}
