/**
 * NorthVale: Sombras de 1989 — MainMenuUI.js
 * Direção de Arte Técnica: Menu Inicial Neo-Noir Interativo (1989)
 *
 * Módulo puro em Canvas 2D desacoplado (sem dependências externas):
 * 1. Fundo atmosférico: horizonte chuvoso com a silhueta da ponte e chaminés do frigorífico.
 * 2. Título "NORTHVALE: SOMBRAS DE 1989" com efeito de neon elétrico e flicker analógico.
 * 3. Menu de navegação reativo com marcador animado (Novo Caso, Continuar, Opções, Créditos).
 * 4. Seletor de idioma integrado [PT-BR], [EN], [ES], [DE] com persistência no localStorage.
 */

export class MainMenuUI {
  constructor() {
    this.time = 0;
    this.isActive = true;

    // Callbacks do motor
    this.onStartGame = null;
    this.onContinueGame = null;
    this.onOpenSettings = null;
    this.onOpenCredits = null;

    // Idioma atual (PT-BR, EN, ES, DE)
    this.currentLang = this._loadLanguage();

    // Dicionário localizado dos botões do menu
    this.i18n = {
      'PT-BR': {
        newGame: 'NOVO CASO',
        continue: 'CONTINUAR INVESTIGAÇÃO',
        settings: 'OPÇÕES DE SISTEMA',
        credits: 'CRÉDITOS',
        subtitle: 'SOMBRAS DE 1989',
        tagline: 'RPG INVESTIGATIVO ISOMÉTRICO 2.5D • VERSÃO 0.4.0',
        pressStart: 'PRESSIONE [ENTER] OU CLIQUE PARA INICIAR'
      },
      'EN': {
        newGame: 'NEW CASE',
        continue: 'CONTINUE INVESTIGATION',
        settings: 'SYSTEM SETTINGS',
        credits: 'CREDITS',
        subtitle: 'SHADOWS OF 1989',
        tagline: '2.5D ISOMETRIC DETECTIVE RPG • VERSION 0.4.0',
        pressStart: 'PRESS [ENTER] OR CLICK TO BEGIN'
      },
      'ES': {
        newGame: 'NUEVO CASO',
        continue: 'CONTINUAR INVESTIGACIÓN',
        settings: 'OPCIONES DE SISTEMA',
        credits: 'CRÉDITOS',
        subtitle: 'SOMBRAS DE 1989',
        tagline: 'RPG INVESTIGATIVO ISOMÉTRICO 2.5D • VERSIÓN 0.4.0',
        pressStart: 'PRESIONE [ENTER] O HAGA CLIC PARA INICIAR'
      },
      'DE': {
        newGame: 'NEUER FALL',
        continue: 'ERMITTLUNG FORTSETZEN',
        settings: 'SYSTEMEINSTELLUNGEN',
        credits: 'MITWIRKENDE',
        subtitle: 'SCHATTEN VON 1989',
        tagline: 'ISOMETRISCHES 2.5D-DETEKTIV-RPG • VERSION 0.4.0',
        pressStart: 'DRÜCKEN SIE [ENTER] ODER KLICKEN SIE ZUM STARTEN'
      }
    };

    // Navegação do menu
    this.menuOptions = [
      { id: 'new', key: 'newGame', action: () => this._trigger(this.onStartGame) },
      { id: 'continue', key: 'continue', action: () => this._trigger(this.onContinueGame) },
      { id: 'settings', key: 'settings', action: () => this._trigger(this.onOpenSettings) },
      { id: 'credits', key: 'credits', action: () => this._trigger(this.onOpenCredits) }
    ];

    this.selectedIndex = 0;
    this.hoveredIndex = -1;
    this.cursorSlideX = 0;

    // Seletor de idiomas
    this.langButtons = [
      { id: 'PT-BR', label: 'PT-BR' },
      { id: 'EN', label: 'EN' },
      { id: 'ES', label: 'ES' },
      { id: 'DE', label: 'DE' }
    ];
    this.hoveredLang = null;

    // Relâmpagos e flicker de neon
    this.lightningTimer = 4.0;
    this.lightningFlash = 0.0;
    this.neonFlicker = 1.0;

    // Chuva no menu (pool leve de gotas)
    this.rainDrops = [];
    for (let i = 0; i < 90; i++) {
      this.rainDrops.push({
        x: Math.random() * 1920,
        y: Math.random() * 1080,
        speed: 600 + Math.random() * 400,
        len: 16 + Math.random() * 18
      });
    }

    // Coordenadas calculadas para colisão de clique
    this.buttonHitboxes = [];
    this.langHitboxes = [];
  }

  /**
   * Carrega idioma salvo ou define padrão PT-BR.
   * @private
   */
  _loadLanguage() {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('northvale_lang');
        if (saved && ['PT-BR', 'EN', 'ES', 'DE'].includes(saved)) {
          return saved;
        }
      }
    } catch (_) {}
    return 'PT-BR';
  }

  /**
   * Salva o idioma selecionado.
   * @param {string} lang
   */
  setLanguage(lang) {
    if (this.i18n[lang]) {
      this.currentLang = lang;
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('northvale_lang', lang);
        }
      } catch (_) {}
    }
  }

  /**
   * Inicializa o menu com callbacks do jogo.
   * @param {HTMLCanvasElement} canvas
   * @param {Function} onStart
   * @param {Function} [onContinue]
   * @param {Function} [onSettings]
   * @param {Function} [onCredits]
   */
  init(canvas, onStart, onContinue, onSettings, onCredits) {
    this.onStartGame = onStart;
    this.onContinueGame = onContinue || onStart;
    this.onOpenSettings = onSettings;
    this.onOpenCredits = onCredits;
    this.isActive = true;
  }

  _trigger(cb) {
    if (cb) cb();
  }

  /**
   * Atualiza animações, chuva, relâmpagos e flicker a 60 FPS.
   * @param {number} dt Delta time em segundos
   */
  update(dt) {
    if (!this.isActive) return;
    this.time += dt;

    // Relâmpagos ocasionais
    this.lightningTimer -= dt;
    if (this.lightningTimer <= 0) {
      this.lightningFlash = 0.55;
      this.lightningTimer = 5 + Math.random() * 10;
    }
    if (this.lightningFlash > 0) {
      this.lightningFlash = Math.max(0, this.lightningFlash - dt * 3.2);
    }

    // Flicker de neon analógico
    if (Math.random() < 0.04) {
      this.neonFlicker = 0.35 + Math.random() * 0.65;
    } else {
      this.neonFlicker = Math.min(1.0, this.neonFlicker + dt * 4.0);
    }

    // Atualiza gotas de chuva de fundo
    for (const d of this.rainDrops) {
      d.x += 180 * dt;
      d.y += d.speed * dt;
      if (d.y > 1080) {
        d.y = -30;
        d.x = Math.random() * 1920;
      }
    }

    // Deslocamento suave do cursor de seleção
    const targetSlide = Math.sin(this.time * 6) * 3;
    this.cursorSlideX += (targetSlide - this.cursorSlideX) * Math.min(1, dt * 10);
  }

  /**
   * Renderiza a tela de menu neo-noir completa.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} width
   * @param {number} height
   */
  render(ctx, width, height) {
    if (!this.isActive) return;

    ctx.save();

    // 1. Fundo Escuro com Horizonte Industrial e Chuva
    this._renderSkylineBackground(ctx, width, height);

    // 2. Relâmpago atmosférico
    if (this.lightningFlash > 0.01) {
      ctx.fillStyle = `rgba(72, 149, 239, ${this.lightningFlash * 0.28})`;
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = `rgba(123, 44, 191, ${this.lightningFlash * 0.16})`;
      ctx.fillRect(0, 0, width, height);
    }

    // 3. Chuva de fundo
    ctx.strokeStyle = 'rgba(160, 185, 220, 0.25)';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    for (const d of this.rainDrops) {
      const rx = (d.x / 1920) * width;
      const ry = (d.y / 1080) * height;
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx + 6, ry + d.len);
    }
    ctx.stroke();

    // 4. Título Principal "NORTHVALE" com Brilho Neon e Sombra
    this._renderTitle(ctx, width, height);

    // 5. Botões do Menu Principal
    this._renderMenuButtons(ctx, width, height);

    // 6. Seletor de Idioma no Canto Inferior Direito
    this._renderLanguageSelector(ctx, width, height);

    // 7. Rodapé / Copyright 1989
    this._renderFooter(ctx, width, height);

    ctx.restore();
  }

  /**
   * Desenha a silhueta da ponte, rio e chaminés do Frigorífico Sloane no horizonte.
   * @private
   */
  _renderSkylineBackground(ctx, w, h) {
    // Céu Rich Black com gradiente de poluição industrial
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0.0, '#060608');
    skyGrad.addColorStop(0.5, '#0e0f16');
    skyGrad.addColorStop(0.85, '#16131c');
    skyGrad.addColorStop(1.0, '#08080c');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    const horizonY = h * 0.62;

    // Silhuetas de fábricas distantes e chaminés expelindo fumaça
    ctx.fillStyle = '#0a0a0f';
    const factoryX = w * 0.68;
    ctx.fillRect(factoryX, horizonY - 140, 28, 140); // Chaminé 1
    ctx.fillRect(factoryX + 38, horizonY - 180, 34, 180); // Chaminé 2
    ctx.fillRect(factoryX - 70, horizonY - 80, 220, 80); // Galpão Sloane

    // Pluma de fumaça subindo das chaminés
    ctx.save();
    ctx.fillStyle = 'rgba(25, 25, 35, 0.4)';
    for (let s = 0; s < 5; s++) {
      const smokeY = horizonY - 180 - s * 24;
      const smokeX = factoryX + 50 + Math.sin(this.time * 0.8 + s) * 22;
      ctx.beginPath();
      ctx.ellipse(smokeX, smokeY, 28 + s * 10, 14 + s * 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Silhueta dos cabos e pilares da ponte suspensa de NorthVale
    ctx.strokeStyle = '#0e0e16';
    ctx.lineWidth = 2.5;
    const bridgeX = w * 0.18;
    ctx.beginPath();
    ctx.moveTo(bridgeX, horizonY);
    ctx.lineTo(bridgeX + 25, horizonY - 130);
    ctx.lineTo(bridgeX + 50, horizonY);
    ctx.stroke();

    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(0, horizonY - 40);
    ctx.quadraticCurveTo(bridgeX + 25, horizonY - 110, w * 0.45, horizonY);
    ctx.stroke();

    // Superfície do rio escuro com reflexo de lâmpadas de rua
    const riverGrad = ctx.createLinearGradient(0, horizonY, 0, h);
    riverGrad.addColorStop(0.0, '#0a0a10');
    riverGrad.addColorStop(0.5, '#07070b');
    riverGrad.addColorStop(1.0, '#040406');
    ctx.fillStyle = riverGrad;
    ctx.fillRect(0, horizonY, w, h - horizonY);

    // Reflexos difusos das lâmpadas e néons no rio
    ctx.fillStyle = 'rgba(212, 139, 40, 0.08)'; // Âmbar
    ctx.fillRect(bridgeX - 40, horizonY + 10, 130, h - horizonY);

    ctx.fillStyle = 'rgba(123, 44, 191, 0.06)'; // Roxo
    ctx.fillRect(factoryX - 20, horizonY + 10, 160, h - horizonY);
  }

  /**
   * Renderiza o logo imponente "NORTHVALE" com neon e tipografia 1989.
   * @private
   */
  _renderTitle(ctx, w, h) {
    ctx.save();
    const titleX = w * 0.12;
    const titleY = h * 0.28;
    const texts = this.i18n[this.currentLang] || this.i18n['PT-BR'];

    // Glow roxo elétrico sob o título
    const effFlicker = this.neonFlicker;
    ctx.shadowColor = `rgba(157, 78, 221, ${0.55 * effFlicker})`;
    ctx.shadowBlur = 24;

    // Palavra NORTHVALE
    ctx.font = '900 58px "Courier New", Courier, monospace';
    ctx.fillStyle = `rgba(230, 228, 223, ${0.95 * effFlicker})`;
    ctx.textBaseline = 'middle';
    ctx.fillText('NORTHVALE', titleX, titleY);

    // Friso elétrico duplo
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#7b2cbf';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(titleX, titleY + 36);
    ctx.lineTo(titleX + 380, titleY + 36);
    ctx.stroke();

    ctx.strokeStyle = '#d48b28';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(titleX, titleY + 40);
    ctx.lineTo(titleX + 260, titleY + 40);
    ctx.stroke();

    // Subtítulo localizado
    ctx.font = '700 16px "Courier New", Courier, monospace';
    ctx.fillStyle = '#d48b28';
    ctx.fillText(texts.subtitle, titleX + 4, titleY + 58);

    // Tagline técnica
    ctx.font = '500 10px "Courier New", Courier, monospace';
    ctx.fillStyle = '#6e6a75';
    ctx.fillText(texts.tagline, titleX + 4, titleY + 78);

    ctx.restore();
  }

  /**
   * Renderiza os itens do menu de navegação.
   * @private
   */
  _renderMenuButtons(ctx, w, h) {
    this.buttonHitboxes = [];
    const texts = this.i18n[this.currentLang] || this.i18n['PT-BR'];

    const startX = w * 0.12;
    let startY = h * 0.48;
    const itemH = 36;
    const spacing = 12;

    ctx.save();
    ctx.textBaseline = 'middle';

    for (let i = 0; i < this.menuOptions.length; i++) {
      const opt = this.menuOptions[i];
      const isSelected = i === this.selectedIndex;
      const isHovered = i === this.hoveredIndex;
      const active = isSelected || isHovered;

      const label = texts[opt.key] || opt.key;
      const cy = startY + i * (itemH + spacing);

      ctx.font = '700 15px "Courier New", Courier, monospace';
      const labelW = ctx.measureText(label).width;
      const boxW = Math.max(340, labelW + 52);

      this.buttonHitboxes.push({
        index: i,
        x: startX,
        y: cy - itemH / 2,
        w: boxW,
        h: itemH,
        action: opt.action
      });

      // Fundo e destaque do botão
      if (active) {
        // Fundo em roxo profundo translúcido com borda neon
        ctx.fillStyle = 'rgba(123, 44, 191, 0.36)';
        ctx.strokeStyle = '#9d4edd';
        ctx.lineWidth = 1.2;
        ctx.fillRect(startX, cy - itemH / 2, boxW, itemH);
        ctx.strokeRect(startX, cy - itemH / 2, boxW, itemH);

        // Marcador cursor deslizante "▶"
        ctx.fillStyle = '#d48b28';
        const markerX = startX + 10 + this.cursorSlideX;
        ctx.fillText('▶', markerX, cy);

        // Texto destacado em Âmbar / Off-White
        ctx.fillStyle = '#ffffff';
        ctx.fillText(label, startX + 38, cy);
      } else {
        // Fundo sutil ocioso
        ctx.fillStyle = 'rgba(18, 18, 24, 0.65)';
        ctx.strokeStyle = 'rgba(45, 45, 56, 0.6)';
        ctx.lineWidth = 1.0;
        ctx.fillRect(startX, cy - itemH / 2, boxW, itemH);
        ctx.strokeRect(startX, cy - itemH / 2, boxW, itemH);

        ctx.fillStyle = '#6e6a75';
        ctx.fillText('•', startX + 16, cy);

        ctx.fillStyle = '#dcd8cf';
        ctx.fillText(label, startX + 38, cy);
      }
    }

    ctx.restore();
  }

  /**
   * Renderiza os botões de seleção de idioma no canto inferior direito.
   * @private
   */
  _renderLanguageSelector(ctx, w, h) {
    this.langHitboxes = [];
    ctx.save();

    const boxW = 58;
    const boxH = 26;
    const gap = 8;
    const totalW = this.langButtons.length * (boxW + gap) - gap;
    const startX = w - totalW - 32;
    const startY = h - 54;

    ctx.font = '700 10px "Courier New", Courier, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < this.langButtons.length; i++) {
      const btn = this.langButtons[i];
      const bx = startX + i * (boxW + gap);
      const by = startY;
      const isCurrent = this.currentLang === btn.id;
      const isHovered = this.hoveredLang === btn.id;

      this.langHitboxes.push({
        id: btn.id,
        x: bx,
        y: by,
        w: boxW,
        h: boxH
      });

      if (isCurrent) {
        ctx.fillStyle = 'rgba(123, 44, 191, 0.55)';
        ctx.strokeStyle = '#d48b28'; // Borda âmbar
        ctx.lineWidth = 1.4;
        ctx.fillRect(bx, by, boxW, boxH);
        ctx.strokeRect(bx, by, boxW, boxH);

        ctx.fillStyle = '#f0eee9';
        ctx.fillText(`[${btn.label}]`, bx + boxW / 2, by + boxH / 2);
      } else if (isHovered) {
        ctx.fillStyle = 'rgba(25, 25, 35, 0.85)';
        ctx.strokeStyle = '#9d4edd';
        ctx.lineWidth = 1.0;
        ctx.fillRect(bx, by, boxW, boxH);
        ctx.strokeRect(bx, by, boxW, boxH);

        ctx.fillStyle = '#d48b28';
        ctx.fillText(btn.label, bx + boxW / 2, by + boxH / 2);
      } else {
        ctx.fillStyle = 'rgba(12, 12, 16, 0.7)';
        ctx.strokeStyle = '#282834';
        ctx.lineWidth = 1.0;
        ctx.fillRect(bx, by, boxW, boxH);
        ctx.strokeRect(bx, by, boxW, boxH);

        ctx.fillStyle = '#6e6a75';
        ctx.fillText(btn.label, bx + boxW / 2, by + boxH / 2);
      }
    }

    ctx.restore();
  }

  /**
   * Rodapé analógico.
   * @private
   */
  _renderFooter(ctx, w, h) {
    ctx.save();
    ctx.font = '500 10px "Courier New", Courier, monospace';
    ctx.fillStyle = '#444452';
    ctx.textAlign = 'left';
    ctx.fillText('© 1989 NORTHVALE POLICE ARCHIVE • TODAS AS EVIDÊNCIAS PRESERVADAS', w * 0.12, h - 36);
    ctx.restore();
  }

  /**
   * Processa movimento do cursor do mouse.
   */
  handleMouseMove(x, y) {
    this.hoveredIndex = -1;
    for (const b of this.buttonHitboxes) {
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        this.hoveredIndex = b.index;
        this.selectedIndex = b.index;
        break;
      }
    }

    this.hoveredLang = null;
    for (const lb of this.langHitboxes) {
      if (x >= lb.x && x <= lb.x + lb.w && y >= lb.y && y <= lb.y + lb.h) {
        this.hoveredLang = lb.id;
        break;
      }
    }
  }

  /**
   * Processa clique do mouse.
   */
  handleClick(x, y) {
    // 1. Verifica clique em idioma
    for (const lb of this.langHitboxes) {
      if (x >= lb.x && x <= lb.x + lb.w && y >= lb.y && y <= lb.y + lb.h) {
        this.setLanguage(lb.id);
        return true;
      }
    }

    // 2. Verifica clique nos botões principais
    for (const b of this.buttonHitboxes) {
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        b.action();
        return true;
      }
    }

    return false;
  }

  /**
   * Processa teclado (Enter, Setas Cima/Baixo).
   */
  handleKeyDown(key) {
    const k = typeof key === 'string' ? key : key.key;
    if (k === 'ArrowUp' || k === 'w' || k === 'W') {
      this.selectedIndex = (this.selectedIndex - 1 + this.menuOptions.length) % this.menuOptions.length;
      return true;
    }
    if (k === 'ArrowDown' || k === 's' || k === 'S') {
      this.selectedIndex = (this.selectedIndex + 1) % this.menuOptions.length;
      return true;
    }
    if (k === 'Enter' || k === ' ') {
      const opt = this.menuOptions[this.selectedIndex];
      if (opt && opt.action) opt.action();
      return true;
    }
    return false;
  }
}
