/**
 * NorthVale: Sombras de 1989 — EpilogueView.js
 * Direção de Arte Técnica: Tela de Apresentação dos 14 Finais (1989)
 *
 * Módulo puro em Canvas 2D desacoplado (sem dependências externas):
 * 1. Mesa de detetive vista de cima com foco de luz circular e pasta de papel pardo aberta.
 * 2. Recorte de jornal autêntico de 1989 (The NorthVale Chronicle) com foto em meio-tom e manchete dinâmica.
 * 3. Carimbo animado que desce com impacto e tremor: "CASO FECHADO", "ARQUIVADO SEM RESOLUÇÃO" ou "FUGITIVO DA LEI".
 * 4. Ficha datilografada do veredito para qualquer um dos 14 finais e créditos finais noir.
 */

export class EpilogueView {
  constructor() {
    this.isActive = false;
    this.time = 0;
    this.onReturnCallback = null;

    // Dados do final recebidos do motor
    this.endingData = null;

    // Animação de descida com impacto do carimbo (Slamming Stamp)
    this.stampTimer = 0.0;
    this.stampScale = 3.0;
    this.stampAlpha = 0.0;
    this.stampLanded = false;
    this.screenShake = 0.0;

    // Pulso do prompt de saída
    this.promptPulse = 0;
  }

  /**
   * Exibe a tela de epílogo com os dados do final obtido.
   * @param {Object} endingData
   * @param {string} endingData.endingId Ex: "FINAL 01: REDENÇÃO ANALÓGICA"
   * @param {string} endingData.headline Manchete do jornal
   * @param {string} endingData.verdictText Resumo pericial do desfecho
   * @param {string} [endingData.stamp="CASO FECHADO"] "CASO FECHADO" | "ARQUIVADO SEM RESOLUÇÃO" | "FUGITIVO DA LEI"
   * @param {string} [endingData.characterFate] Destino de Bobby, Ruth ou Sarah
   * @param {Function} [onReturn] Callback ao pressionar Espaço para voltar ao menu
   */
  show(endingData, onReturn = null) {
    this.isActive = true;
    this.time = 0;
    this.endingData = endingData;
    this.onReturnCallback = onReturn;

    this.stampTimer = 0.0;
    this.stampScale = 3.2;
    this.stampAlpha = 0.0;
    this.stampLanded = false;
    this.screenShake = 0.0;
  }

  /**
   * Fecha o epílogo e retorna ao menu.
   */
  close() {
    if (!this.isActive) return;
    this.isActive = false;
    if (this.onReturnCallback) {
      this.onReturnCallback();
    }
  }

  /**
   * Atualiza a animação de impacto do carimbo e tremor da mesa.
   * @param {number} dt Delta time em segundos
   */
  update(dt) {
    if (!this.isActive) return;
    this.time += dt;
    this.promptPulse += dt * 3.5;

    // Animação de impacto do carimbo após 1.2 segundos de suspense
    if (this.time > 1.2 && !this.stampLanded) {
      this.stampTimer += dt * 4.5;
      this.stampScale = Math.max(1.0, 3.2 - this.stampTimer * 2.8);
      this.stampAlpha = Math.min(1.0, this.stampTimer * 2.0);

      if (this.stampScale <= 1.0) {
        this.stampScale = 1.0;
        this.stampAlpha = 1.0;
        this.stampLanded = true;
        this.screenShake = 7.0; // Impacto físico do carimbo na madeira
      }
    }

    // Amortecimento do tremor
    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 24);
    }
  }

  /**
   * Renderiza a cena de encerramento completa.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} width
   * @param {number} height
   */
  render(ctx, width, height) {
    if (!this.isActive || !this.endingData) return;

    ctx.save();

    // Aplica tremor de impacto do carimbo na tela inteira
    if (this.screenShake > 0.01) {
      const sx = (Math.random() - 0.5) * this.screenShake;
      const sy = (Math.random() - 0.5) * this.screenShake;
      ctx.translate(sx, sy);
    }

    // 1. Mesa de Madeira com Foco de Luz Circular (Spotlight)
    this._renderDeskWithSpotlight(ctx, width, height);

    const centerX = width / 2;
    const centerY = height / 2;

    // 2. Pasta de Arquivo Pardo Aberta (Lado Esquerdo / Centro)
    const folderW = Math.min(480, width * 0.44);
    const folderH = Math.min(580, height * 0.78);
    const folderX = centerX - folderW - 20;
    const folderY = centerY - folderH / 2 + 10;
    this._renderDossierFolder(ctx, folderX, folderY, folderW, folderH);

    // 3. Recorte de Jornal The NorthVale Chronicle (Lado Direito)
    const newsW = Math.min(380, width * 0.38);
    const newsH = Math.min(520, height * 0.72);
    const newsX = centerX + 20;
    const newsY = centerY - newsH / 2 + 25;
    this._renderNewspaper(ctx, newsX, newsY, newsW, newsH);

    // 4. Carimbo Final que Desce com Impacto
    if (this.stampAlpha > 0.01) {
      this._renderSlammingStamp(ctx, folderX + folderW * 0.58, folderY + folderH * 0.74);
    }

    // 5. Faixa de Créditos e Instrução de Saída no Rodapé
    this._renderFooter(ctx, width, height);

    ctx.restore();
  }

  /**
   * Desenha a mesa de madeira com o cone de luz do abajur do detetive.
   * @private
   */
  _renderDeskWithSpotlight(ctx, w, h) {
    // Madeira escura de escritório forense (#14100c)
    ctx.fillStyle = '#14100c';
    ctx.fillRect(0, 0, w, h);

    // Foco de luz quente circular do abajur
    const cx = w * 0.48;
    const cy = h * 0.48;
    const spotlight = ctx.createRadialGradient(cx, cy, 120, cx, cy, Math.max(w, h) * 0.68);
    spotlight.addColorStop(0.0, 'rgba(235, 215, 175, 0.28)'); // Âmbar difuso
    spotlight.addColorStop(0.45, 'rgba(180, 150, 100, 0.12)');
    spotlight.addColorStop(0.85, 'rgba(20, 16, 12, 0.75)');
    spotlight.addColorStop(1.0, 'rgba(6, 5, 4, 0.98)');

    ctx.fillStyle = spotlight;
    ctx.fillRect(0, 0, w, h);
  }

  /**
   * Renderiza a pasta de papel pardo com o veredito datilografado.
   * @private
   */
  _renderDossierFolder(ctx, x, y, w, h) {
    ctx.save();

    // Sombra da pasta sobre a mesa
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(x + 12, y + 16, w, h);

    // Pasta pardo escuro (#bfae88 / #9c8a66)
    ctx.fillStyle = '#bfae88';
    ctx.fillRect(x, y, w, h);

    // Aba superior da pasta (Tab)
    ctx.fillStyle = '#a8976f';
    ctx.beginPath();
    ctx.moveTo(x + 24, y);
    ctx.lineTo(x + 40, y - 16);
    ctx.lineTo(x + 180, y - 16);
    ctx.lineTo(x + 196, y);
    ctx.closePath();
    ctx.fill();

    ctx.font = '700 9px "Courier New", monospace';
    ctx.fillStyle = '#2b261c';
    ctx.fillText('CASO Nº 89-0414', x + 50, y - 5);

    // Folha branca amarelada interna onde está o veredito
    const pad = 16;
    ctx.fillStyle = '#ede6d6';
    ctx.fillRect(x + pad, y + pad, w - pad * 2, h - pad * 2);

    ctx.strokeStyle = '#c4bbaa';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + pad, y + pad, w - pad * 2, h - pad * 2);

    // Cabeçalho da folha de veredito
    ctx.fillStyle = '#201e1a';
    ctx.font = '700 13px "Courier New", Courier, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('VEREDITO FINAL DO INQUÉRITO', x + w / 2, y + 42);

    ctx.font = '600 10px "Courier New", Courier, monospace';
    ctx.fillStyle = '#5c5750';
    ctx.fillText('DELEGACIA DE NORTHVALE • REGISTRO DE FECHAMENTO', x + w / 2, y + 58);

    ctx.strokeStyle = '#38342c';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(x + 32, y + 68);
    ctx.lineTo(x + w - 32, y + 68);
    ctx.stroke();

    // Título do Final (Ex: FINAL 01: REDENÇÃO ANALÓGICA)
    const endTitle = this.endingData.endingId || 'FINAL DO INQUÉRITO POLICIAL';
    ctx.textAlign = 'left';
    ctx.font = '700 12px "Courier New", Courier, monospace';
    ctx.fillStyle = '#7b2cbf'; // Electric Purple
    ctx.fillText(endTitle.toUpperCase(), x + 32, y + 95);

    // Texto de resumo do desfecho
    const verdict = this.endingData.verdictText || 'As provas colhidas nas 15 construções de NorthVale encerraram a cadeia de mistérios que assolava o condado. Os segredos guardados desde o início do outono de 1989 foram selados nos arquivos definitivos.';
    ctx.font = '500 11px "Courier New", Courier, monospace';
    ctx.fillStyle = '#22201d';

    const words = verdict.split(' ');
    let line = '';
    let curY = y + 120;
    const maxW = w - 64;

    for (const wd of words) {
      const test = line ? `${line} ${wd}` : wd;
      if (ctx.measureText(test).width > maxW) {
        ctx.fillText(line, x + 32, curY);
        curY += 17;
        line = wd;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, x + 32, curY);

    // Destino dos envolvidos
    if (this.endingData.characterFate) {
      curY += 18;
      ctx.font = 'italic 600 10.5px "Courier New", monospace';
      ctx.fillStyle = '#1d2d54'; // Azul esferográfica
      ctx.fillText(`CUSTÓDIA: ${this.endingData.characterFate}`, x + 32, curY);
    }

    ctx.restore();
  }

  /**
   * Renderiza o jornal autêntico de época (The NorthVale Chronicle).
   * @private
   */
  _renderNewspaper(ctx, x, y, w, h) {
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(0.04); // Leve ângulo orgânico jogado na mesa
    ctx.translate(-w / 2, -h / 2);

    // Sombra do jornal
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(8, 12, w, h);

    // Papel jornal envelhecido (#e8e4d8)
    ctx.fillStyle = '#e8e4d8';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#aba492';
    ctx.lineWidth = 1.0;
    ctx.strokeRect(0, 0, w, h);

    // 1. Cabeçalho Gótico do Jornal
    ctx.font = '900 18px "Courier New", Courier, monospace';
    ctx.fillStyle = '#18181c';
    ctx.textAlign = 'center';
    ctx.fillText('THE NORTHVALE CHRONICLE', w / 2, 28);

    // Metadados do jornal
    ctx.font = '600 8.5px "Courier New", Courier, monospace';
    ctx.fillStyle = '#44444a';
    ctx.fillText('EDIÇÃO EXTRAORDINÁRIA • OUTUBRO DE 1989 • 25 CENTS', w / 2, 42);

    ctx.strokeStyle = '#222228';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(14, 48); ctx.lineTo(w - 14, 48);
    ctx.stroke();

    // 2. Manchete Dinâmica do Final
    const headline = this.endingData.headline || 'INVESTIGAÇÃO REVELA CONSPIRAÇÃO NO CONDADO DE NORTHVALE';
    ctx.font = '900 12.5px "Courier New", Courier, monospace';
    ctx.fillStyle = '#0f0f12';
    ctx.textAlign = 'center';

    const hWords = headline.toUpperCase().split(' ');
    let hLine = '';
    let hY = 66;
    for (const hw of hWords) {
      const test = hLine ? `${hLine} ${hw}` : hw;
      if (ctx.measureText(test).width > w - 28) {
        ctx.fillText(hLine, w / 2, hY);
        hY += 15;
        hLine = hw;
      } else {
        hLine = test;
      }
    }
    if (hLine) ctx.fillText(hLine, w / 2, hY);

    // 3. Foto de Meio-Tom Preto e Branco (Halftone Forense)
    const photoY = hY + 12;
    const photoW = w - 36;
    const photoH = 140;
    const photoX = 18;

    ctx.fillStyle = '#1c1c20';
    ctx.fillRect(photoX, photoY, photoW, photoH);

    // Efeito de meio-tom / linhas de jornal analógico
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    for (let ly = photoY; ly < photoY + photoH; ly += 3) {
      ctx.fillRect(photoX, ly, photoW, 1.2);
    }

    // Silhueta do prédio da delegacia / viatura na chuva
    ctx.fillStyle = '#3a3a44';
    ctx.fillRect(photoX + 24, photoY + 35, photoW - 48, 85);
    ctx.fillStyle = '#22222a';
    ctx.beginPath();
    ctx.moveTo(photoX + photoW / 2 - 20, photoY + 35);
    ctx.lineTo(photoX + photoW / 2, photoY + 15);
    ctx.lineTo(photoX + photoW / 2 + 20, photoY + 35);
    ctx.fill();

    ctx.font = 'italic 8px "Courier New", monospace';
    ctx.fillStyle = '#5c5750';
    ctx.textAlign = 'center';
    ctx.fillText('Foto do arquivo oficial: Cena isolada na delegacia.', w / 2, photoY + photoH + 12);

    // 4. Colunas de Artigo do Jornal
    ctx.strokeStyle = '#3a3a40';
    ctx.lineWidth = 0.6;
    const colY = photoY + photoH + 20;
    const colW = (w - 44) / 2;

    // Linhas simuladas de texto em 2 colunas
    ctx.fillStyle = '#303036';
    for (let c = 0; c < 2; c++) {
      const cx = 18 + c * (colW + 8);
      for (let ly = colY; ly < h - 24; ly += 7) {
        ctx.fillRect(cx, ly, colW - (Math.random() < 0.2 ? 18 : 0), 2.2);
      }
    }

    ctx.restore();
  }

  /**
   * Renderiza o carimbo "CASO FECHADO" que desce em escala e rotação com impacto.
   * @private
   */
  _renderSlammingStamp(ctx, cx, cy) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.28);
    ctx.scale(this.stampScale, this.stampScale);

    const stampText = this.endingData.stamp || 'CASO FECHADO';
    ctx.font = '900 18px "Courier New", Courier, monospace';
    const textW = ctx.measureText(stampText).width;
    const boxW = textW + 28;
    const boxH = 38;

    // Tinta de borracha vermelha (#ba181b)
    ctx.strokeStyle = '#ba181b';
    ctx.fillStyle = '#ba181b';
    ctx.globalAlpha = this.stampAlpha * 0.88;

    // Moldura dupla de carimbo
    ctx.lineWidth = 3.0;
    ctx.strokeRect(-boxW / 2, -boxH / 2, boxW, boxH);

    ctx.lineWidth = 1.0;
    ctx.strokeRect(-boxW / 2 + 3, -boxH / 2 + 3, boxW - 6, boxH - 6);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(stampText, 0, 0);

    ctx.restore();
  }

  /**
   * Rodapé e créditos.
   * @private
   */
  _renderFooter(ctx, w, h) {
    ctx.save();
    const promptAlpha = 0.5 + Math.sin(this.promptPulse) * 0.5;
    ctx.font = '700 12px "Courier New", Courier, monospace';
    ctx.fillStyle = `rgba(212, 139, 40, ${promptAlpha})`; // Âmbar piscante
    ctx.textAlign = 'center';
    ctx.fillText('[ESPAÇO] RETORNAR AO MENU PRINCIPAL', w / 2, h - 28);
    ctx.restore();
  }

  /**
   * Processa comando de teclado.
   */
  handleKeyDown(key) {
    if (!this.isActive) return false;
    const k = typeof key === 'string' ? key : key.key;
    if (k === ' ' || k === 'Enter' || k === 'Escape') {
      this.close();
      return true;
    }
    return false;
  }
}
