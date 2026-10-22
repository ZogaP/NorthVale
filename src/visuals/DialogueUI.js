/**
 * NorthVale: Sombras de 1989 — DialogueUI.js
 * Direção de Arte Técnica: Caixa de Diálogo Cinematográfica Neo-Noir (1989)
 *
 * Renderização pura via Canvas 2D:
 * 1. Ancoragem no rodapé da tela (90% largura, 25% altura) com cantos chanfrados industriais.
 * 2. Retrato analógico (96x96 px) com moldura metálica, nome, ocupação e sublinhado em roxo elétrico.
 * 3. Texto datilografado (typewriter) letra por letra com suporte robusto a quebra de linha (word-wrap).
 * 4. Menu vertical de alternativas de resposta ([1], [2], [3]) com realce em âmbar e roxo profundo.
 */

export class DialogueUI {
  /**
   * @param {Object} [options]
   * @param {number} [options.typewriterSpeed=45] Caracteres por segundo
   */
  constructor(options = {}) {
    this.typewriterSpeed = options.typewriterSpeed ?? 45;

    // Estado da conversa
    this.visible = false;
    this.speaker = '';
    this.role = '';
    this.portraitImage = null;
    this.fullText = '';
    this.revealedCount = 0;
    this.isTextComplete = false;
    this.choices = [];
    this.selectedChoiceIndex = 0;
    this.hoveredChoiceIndex = -1;
    this.onChoiceSelected = null;

    // Métricas do layout calculadas por frame
    this.layout = {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      portraitX: 0,
      portraitY: 0,
      portraitSize: 96,
      textX: 0,
      textY: 0,
      textWidth: 0,
      choicesY: 0,
      choiceBoxes: []
    };

    // Animações analógicas
    this.cursorBlinkTimer = 0;
    this.framePhase = 0;
    this.openTransition = 0; // 0.0 (fechado) a 1.0 (aberto)
  }

  /**
   * Abre a caixa de diálogo com o texto e opções especificadas.
   * @param {Object} data
   * @param {string} data.speaker Nome do personagem
   * @param {string} [data.role] Cargo ou ocupação
   * @param {HTMLImageElement|CanvasImageSource} [data.portrait] Imagem do retrato
   * @param {string} data.text Texto falado
   * @param {string[]} [data.choices=[]] Lista de respostas alternativas
   * @param {Function} [data.onChoice] Callback chamado com (index, choiceText)
   */
  startDialogue({ speaker, role = '', portrait = null, text, choices = [], onChoice = null }) {
    this.visible = true;
    this.speaker = speaker;
    this.role = role;
    this.portraitImage = portrait;
    this.fullText = text;
    this.revealedCount = 0;
    this.isTextComplete = false;
    this.choices = choices;
    this.selectedChoiceIndex = 0;
    this.hoveredChoiceIndex = -1;
    this.onChoiceSelected = onChoice;
    this.openTransition = 0.0;
  }

  /**
   * Fecha a caixa de diálogo.
   */
  close() {
    this.visible = false;
  }

  /**
   * Pula a animação datilográfica e exibe o texto inteiro imediatamente.
   */
  skipTypewriter() {
    if (!this.isTextComplete) {
      this.revealedCount = this.fullText.length;
      this.isTextComplete = true;
    }
  }

  /**
   * Atualiza a digitação letra por letra e os temporizadores de animação.
   * @param {number} dt Delta time em segundos
   */
  update(dt) {
    if (!this.visible && this.openTransition <= 0) return;

    this.framePhase += dt * 3;
    this.cursorBlinkTimer += dt * 3.5;

    // Transição de abertura suave
    if (this.visible && this.openTransition < 1.0) {
      this.openTransition = Math.min(1.0, this.openTransition + dt * 5.0);
    } else if (!this.visible && this.openTransition > 0.0) {
      this.openTransition = Math.max(0.0, this.openTransition - dt * 5.0);
    }

    // Avança o efeito de máquina de escrever
    if (this.visible && !this.isTextComplete) {
      this.revealedCount += this.typewriterSpeed * dt;
      if (this.revealedCount >= this.fullText.length) {
        this.revealedCount = this.fullText.length;
        this.isTextComplete = true;
      }
    }
  }

  /**
   * Processa movimento do cursor do mouse para detecção de hover nas opções.
   * @param {number} mouseX
   * @param {number} mouseY
   */
  onMouseMove(mouseX, mouseY) {
    if (!this.visible || !this.isTextComplete || this.choices.length === 0) return;

    this.hoveredChoiceIndex = -1;
    for (let i = 0; i < this.layout.choiceBoxes.length; i++) {
      const box = this.layout.choiceBoxes[i];
      if (
        mouseX >= box.x &&
        mouseX <= box.x + box.w &&
        mouseY >= box.y &&
        mouseY <= box.y + box.h
      ) {
        this.hoveredChoiceIndex = i;
        this.selectedChoiceIndex = i;
        break;
      }
    }
  }

  /**
   * Processa cliques do mouse (pula texto ou seleciona opção).
   * @param {number} mouseX
   * @param {number} mouseY
   * @returns {boolean} Se o clique foi consumido pela UI de diálogo
   */
  onClick(mouseX, mouseY) {
    if (!this.visible) return false;

    // Se o texto ainda está sendo impresso, pula para o final
    if (!this.isTextComplete) {
      this.skipTypewriter();
      return true;
    }

    // Se há opções e o clique foi sobre uma delas
    if (this.choices.length > 0) {
      for (let i = 0; i < this.layout.choiceBoxes.length; i++) {
        const box = this.layout.choiceBoxes[i];
        if (
          mouseX >= box.x &&
          mouseX <= box.x + box.w &&
          mouseY >= box.y &&
          mouseY <= box.y + box.h
        ) {
          this._selectChoice(i);
          return true;
        }
      }
    } else {
      // Se não há escolhas, clicar avança/fecha o diálogo
      this.close();
      return true;
    }

    return false;
  }

  /**
   * Processa comandos de teclado (1, 2, 3, Setas, Enter, Espaço).
   * @param {KeyboardEvent|string} key Tecla pressionada
   * @returns {boolean} Se a tecla foi consumida
   */
  onKeyDown(key) {
    if (!this.visible) return false;
    const keyName = typeof key === 'string' ? key : key.key;

    if (!this.isTextComplete) {
      if (keyName === ' ' || keyName === 'Enter' || keyName === 'e' || keyName === 'E') {
        this.skipTypewriter();
        return true;
      }
      return false;
    }

    if (this.choices.length > 0) {
      // Teclas numéricas diretas [1], [2], [3]
      const num = parseInt(keyName, 10);
      if (!isNaN(num) && num >= 1 && num <= this.choices.length) {
        this._selectChoice(num - 1);
        return true;
      }

      // Navegação por setas
      if (keyName === 'ArrowUp' || keyName === 'w' || keyName === 'W') {
        this.selectedChoiceIndex = (this.selectedChoiceIndex - 1 + this.choices.length) % this.choices.length;
        return true;
      }
      if (keyName === 'ArrowDown' || keyName === 's' || keyName === 'S') {
        this.selectedChoiceIndex = (this.selectedChoiceIndex + 1) % this.choices.length;
        return true;
      }

      // Confirmação
      if (keyName === 'Enter' || keyName === ' ') {
        this._selectChoice(this.selectedChoiceIndex);
        return true;
      }
    } else {
      if (keyName === 'Enter' || keyName === ' ' || keyName === 'e' || keyName === 'E') {
        this.close();
        return true;
      }
    }

    return false;
  }

  /**
   * Confirma a seleção de uma alternativa.
   * @private
   */
  _selectChoice(index) {
    if (index >= 0 && index < this.choices.length) {
      const choice = this.choices[index];
      if (this.onChoiceSelected) {
        this.onChoiceSelected(index, choice);
      }
    }
  }

  /**
   * Renderiza a caixa de diálogo completa no rodapé.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} screenWidth Largura da tela
   * @param {number} screenHeight Altura da tela
   */
  render(ctx, screenWidth, screenHeight) {
    if (!this.visible && this.openTransition <= 0) return;

    // Cálculo das dimensões proporcionais
    const dialogW = Math.floor(screenWidth * 0.90);
    const dialogH = Math.max(160, Math.min(230, Math.floor(screenHeight * 0.25)));
    const dialogX = Math.floor((screenWidth - dialogW) / 2);
    const baseDialogY = screenHeight - dialogH - 18;

    // Transição vertical suave de slide-in
    const dialogY = baseDialogY + (1.0 - this.openTransition) * 35;

    this.layout.x = dialogX;
    this.layout.y = dialogY;
    this.layout.width = dialogW;
    this.layout.height = dialogH;

    ctx.save();
    ctx.globalAlpha = this.openTransition;

    // 1. Moldura Principal Industrial com Cantos Chanfrados
    this._renderChassis(ctx, dialogX, dialogY, dialogW, dialogH);

    // 2. Retrato do Personagem (Lado Esquerdo, 96x96)
    const portraitMargin = 16;
    const portraitSize = Math.min(96, dialogH - portraitMargin * 2 - 20);
    const portraitX = dialogX + portraitMargin;
    const portraitY = dialogY + portraitMargin;
    this._renderPortrait(ctx, portraitX, portraitY, portraitSize);

    // 3. Área de Texto Datilografado e Opções (Lado Direito)
    const textX = portraitX + portraitSize + 24;
    const textY = dialogY + portraitMargin + 6;
    const textW = dialogW - (textX - dialogX) - portraitMargin;
    this._renderContent(ctx, textX, textY, textW, dialogH);

    ctx.restore();
  }

  /**
   * Desenha o gabinete chanfrado com parafusos industriais.
   * @private
   */
  _renderChassis(ctx, x, y, w, h) {
    const chamfer = 12;

    // Fundo Rich Black profundo semi-translúcido
    ctx.fillStyle = 'rgba(10, 10, 12, 0.94)';
    ctx.strokeStyle = '#202028'; // Dark Slate
    ctx.lineWidth = 1.4;

    ctx.beginPath();
    ctx.moveTo(x + chamfer, y);
    ctx.lineTo(x + w - chamfer, y);
    ctx.lineTo(x + w, y + chamfer);
    ctx.lineTo(x + w, y + h - chamfer);
    ctx.lineTo(x + w - chamfer, y + h);
    ctx.lineTo(x + chamfer, y + h);
    ctx.lineTo(x, y + h - chamfer);
    ctx.lineTo(x, y + chamfer);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Friso decorativo fino em Electric Purple no topo
    ctx.strokeStyle = '#7b2cbf';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(x + chamfer + 8, y + 2);
    ctx.lineTo(x + w - chamfer - 8, y + 2);
    ctx.stroke();

    // Parafusos industriais nos cantos chanfrados
    this._drawScrew(ctx, x + 6, y + 6);
    this._drawScrew(ctx, x + w - 6, y + 6);
    this._drawScrew(ctx, x + 6, y + h - 6);
    this._drawScrew(ctx, x + w - 6, y + h - 6);
  }

  /**
   * Desenha um parafuso industrial de fenda chanfrada.
   * @private
   */
  _drawScrew(ctx, cx, cy) {
    ctx.save();
    ctx.fillStyle = '#383844';
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#16161a';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(cx - 2, cy - 1);
    ctx.lineTo(cx + 2, cy + 1);
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Renderiza a foto do personagem ou silhueta de ficha policial noir.
   * @private
   */
  _renderPortrait(ctx, x, y, size) {
    ctx.save();

    // Moldura metálica externa
    ctx.fillStyle = '#16161a';
    ctx.strokeStyle = '#2d2d38';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.rect(x - 2, y - 2, size + 4, size + 4);
    ctx.fill();
    ctx.stroke();

    // Se houver imagem do personagem fornecida
    if (this.portraitImage && this.portraitImage.complete) {
      ctx.drawImage(this.portraitImage, x, y, size, size);
    } else {
      // Renderização procedural estilizada: Ficha Policial 1989
      ctx.fillStyle = '#0f0f14';
      ctx.fillRect(x, y, size, size);

      // Linhas de escaneamento analógico CRT sutis
      ctx.fillStyle = 'rgba(72, 149, 239, 0.06)';
      for (let ly = y; ly < y + size; ly += 3) {
        ctx.fillRect(x, ly, size, 1);
      }

      // Silhueta de detetive / oficial com chapéu
      ctx.fillStyle = '#262632';
      const cx = x + size / 2;
      const cy = y + size / 2;

      // Ombros
      ctx.beginPath();
      ctx.ellipse(cx, y + size - 2, size * 0.42, size * 0.28, 0, Math.PI, 0);
      ctx.fill();

      // Cabeça / Rosto na penumbra
      ctx.beginPath();
      ctx.ellipse(cx, cy + 2, size * 0.22, size * 0.26, 0, 0, Math.PI * 2);
      ctx.fill();

      // Aba do chapéu fedora noir
      ctx.fillStyle = '#1a1a24';
      ctx.beginPath();
      ctx.ellipse(cx, cy - 8, size * 0.35, size * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.rect(cx - size * 0.2, cy - 24, size * 0.4, size * 0.18);
      ctx.fill();
    }

    // Filtro analógico sobre a foto (película escura)
    ctx.fillStyle = 'rgba(123, 44, 191, 0.08)';
    ctx.fillRect(x, y, size, size);

    // Borda fina metálica interna
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.strokeRect(x, y, size, size);

    // Nome e Cargo do Personagem abaixo do retrato
    const nameY = y + size + 10;
    ctx.font = '700 12px "Courier New", Courier, monospace';
    ctx.fillStyle = '#e6e4df';
    ctx.textBaseline = 'top';
    ctx.fillText(this.speaker.toUpperCase(), x, nameY);

    if (this.role) {
      ctx.font = '500 9px "Courier New", Courier, monospace';
      ctx.fillStyle = '#4895ef'; // Cianose gélida
      ctx.fillText(this.role.toUpperCase(), x, nameY + 14);
    }

    // Sublinhado característico em Electric Purple com pontilhado técnico
    const underlineY = nameY + (this.role ? 26 : 14);
    ctx.strokeStyle = '#9d4edd';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(x, underlineY);
    ctx.lineTo(x + size, underlineY);
    ctx.stroke();

    ctx.fillStyle = '#9d4edd';
    ctx.fillRect(x + size - 3, underlineY - 1, 3, 3);

    ctx.restore();
  }

  /**
   * Renderiza o texto datilografado e as alternativas de escolha.
   * @private
   */
  _renderContent(ctx, x, y, width, maxH) {
    ctx.save();

    // 1. Texto Datilografado com Word-Wrap inteligente
    const currentText = this.fullText.substring(0, Math.floor(this.revealedCount));
    const lines = this._wrapText(ctx, currentText, width, '13px "Courier New", monospace');

    ctx.font = '500 13px "Courier New", Courier, monospace';
    ctx.fillStyle = '#e6e4df';
    ctx.textBaseline = 'top';

    const lineHeight = 19;
    let textEndY = y;

    for (let i = 0; i < lines.length; i++) {
      const lineY = y + i * lineHeight;
      ctx.fillText(lines[i], x, lineY);
      textEndY = lineY + lineHeight;
    }

    // Cursor datilográfico piscante em tom âmbar
    if (!this.isTextComplete && Math.floor(this.cursorBlinkTimer) % 2 === 0) {
      const lastLine = lines.length > 0 ? lines[lines.length - 1] : '';
      const cursorX = x + ctx.measureText(lastLine).width + 3;
      const cursorY = y + (Math.max(0, lines.length - 1)) * lineHeight;
      ctx.fillStyle = '#d48b28';
      ctx.fillRect(cursorX, cursorY + 1, 7, 13);
    }

    // 2. Menu de Alternativas de Resposta (quando disponíveis e texto visível)
    if (this.isTextComplete && this.choices.length > 0) {
      this._renderChoices(ctx, x, textEndY + 10, width);
    }

    ctx.restore();
  }

  /**
   * Renderiza a lista vertical de alternativas de resposta ([1], [2], [3]).
   * @private
   */
  _renderChoices(ctx, x, startY, width) {
    this.layout.choiceBoxes = [];
    const choiceH = 24;
    const spacing = 4;

    for (let i = 0; i < this.choices.length; i++) {
      const cy = startY + i * (choiceH + spacing);
      const isSelected = i === this.selectedChoiceIndex;
      const isHovered = i === this.hoveredChoiceIndex;
      const isActive = isSelected || isHovered;

      const boxW = Math.min(width, 560);
      this.layout.choiceBoxes.push({ x, y: cy, w: boxW, h: choiceH });

      // Fundo da opção
      if (isActive) {
        // Roxo profundo com realce sutil
        ctx.fillStyle = 'rgba(123, 44, 191, 0.32)';
        ctx.strokeStyle = '#9d4edd';
        ctx.lineWidth = 1.0;
        ctx.fillRect(x, cy, boxW, choiceH);
        ctx.strokeRect(x, cy, boxW, choiceH);
      } else {
        ctx.fillStyle = 'rgba(22, 22, 26, 0.5)';
        ctx.fillRect(x, cy, boxW, choiceH);
      }

      // Marcador numérico analógico [1], [2], [3]
      ctx.font = '700 12px "Courier New", Courier, monospace';
      ctx.textBaseline = 'middle';
      const textMidY = cy + choiceH / 2;

      if (isActive) {
        // Indicador em Âmbar de Sódio
        ctx.fillStyle = '#d48b28';
        ctx.fillText(`▶ [${i + 1}]`, x + 8, textMidY);
        ctx.fillStyle = '#f6c368'; // Texto da opção iluminado em âmbar claro
        ctx.fillText(this.choices[i], x + 56, textMidY);
      } else {
        ctx.fillStyle = '#6e6a75'; // Cinza chumbo
        ctx.fillText(`  [${i + 1}]`, x + 8, textMidY);
        ctx.fillStyle = '#dcd8cf'; // Off-white padrão
        ctx.fillText(this.choices[i], x + 56, textMidY);
      }
    }
  }

  /**
   * Quebra o texto em linhas respeitando limites de largura e pontuação.
   * @private
   */
  _wrapText(ctx, text, maxWidth, font) {
    ctx.font = font;
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const testLine = currentLine.length > 0 ? `${currentLine} ${word}` : word;
      const testWidth = ctx.measureText(testLine).width;

      if (testWidth > maxWidth && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine.length > 0) {
      lines.push(currentLine);
    }
    return lines;
  }
}
