/**
 * NorthVale: Sombras de 1989 — DocumentViewer.js
 * Direção de Arte Técnica: Inspeção Tátil em Close-Up de Pistas e Documentos (1989)
 *
 * Módulo puro em Canvas 2D desacoplado (sem dependências externas):
 * 1. Renderização de folhas pardo/amareladas, bordas imperfeitas, dobras e clipe metálico.
 * 2. Mancha procedural de xícara de café, marcas de umidade e textura de papel de arquivo policial.
 * 3. Tipografia mecânica com desalinhamento de linha de base e carimbos rotacionados ("CONFIDENCIAL", "ARQUIVADO").
 * 4. Interatividade tátil: virar folha (frente/verso com animação 3D pseudo-isométrica), zoom suave e pan.
 */

export class DocumentViewer {
  constructor(options = {}) {
    this.isOpen = false;
    this.openAlpha = 0.0;
    this.targetAlpha = 0.0;

    // Dados do documento ativo
    this.docData = null;
    this.currentSide = 'front'; // 'front' ou 'back'

    // Animação de virar página (Flip)
    this.isFlipping = false;
    this.flipProgress = 0.0; // 0.0 a 1.0
    this.targetSide = 'front';

    // Sistema de Zoom e Pan
    this.zoom = 1.0;
    this.targetZoom = 1.0;
    this.pan = { x: 0, y: 0 };
    this.isDragging = false;
    this.lastMouse = { x: 0, y: 0 };

    // Dimensões base do documento na tela
    this.baseDocWidth = 540;
    this.baseDocHeight = 700;

    // Callbacks
    this.onCloseCallback = null;
  }

  /**
   * Abre o modal com os dados do documento.
   * @param {Object} data
   * @param {string} data.title Título da pista
   * @param {string} [data.type='police_report'] 'police_report' | 'letter' | 'photo' | 'cassette'
   * @param {Object} data.front Conteúdo da frente { text, header, stamps, notes, date, classification }
   * @param {Object} [data.back] Conteúdo do verso { text, notes, stamp }
   * @param {HTMLImageElement|CanvasImageSource} [data.image] Foto/anexo visual
   * @param {Function} [onClose] Callback disparado ao fechar
   */
  open(data, onClose = null) {
    this.docData = data;
    this.currentSide = 'front';
    this.targetSide = 'front';
    this.isFlipping = false;
    this.flipProgress = 0.0;
    this.zoom = 1.0;
    this.targetZoom = 1.0;
    this.pan = { x: 0, y: 0 };
    this.isOpen = true;
    this.targetAlpha = 1.0;
    this.onCloseCallback = onClose;
  }

  /**
   * Fecha o visualizador com fade out suave.
   */
  close() {
    this.targetAlpha = 0.0;
    if (this.onCloseCallback) {
      this.onCloseCallback();
    }
  }

  /**
   * Alterna entre a frente e o verso da folha/item.
   */
  flipPage() {
    if (this.isFlipping) return;
    this.targetSide = this.currentSide === 'front' ? 'back' : 'front';
    this.isFlipping = true;
    this.flipProgress = 0.0;
  }

  /**
   * Atualiza as transições de abertura, zoom, pan e giro de página.
   * @param {number} dt Delta time em segundos
   */
  update(dt) {
    if (!this.isOpen && this.openAlpha <= 0) return;

    // Fade de abertura/fechamento
    this.openAlpha += (this.targetAlpha - this.openAlpha) * Math.min(1, dt * 8);
    if (this.targetAlpha === 0 && this.openAlpha <= 0.01) {
      this.isOpen = false;
      this.openAlpha = 0;
    }

    // Zoom suave
    this.zoom += (this.targetZoom - this.zoom) * Math.min(1, dt * 10);
    if (this.zoom <= 1.02) {
      // Retorna pan ao centro se não houver zoom
      this.pan.x += (0 - this.pan.x) * Math.min(1, dt * 8);
      this.pan.y += (0 - this.pan.y) * Math.min(1, dt * 8);
    }

    // Animação de giro de folha (Page Flip com perspectiva pseudo-3D)
    if (this.isFlipping) {
      this.flipProgress += dt * 3.2; // ~0.3s para virar
      if (this.flipProgress >= 0.5 && this.currentSide !== this.targetSide) {
        this.currentSide = this.targetSide;
      }
      if (this.flipProgress >= 1.0) {
        this.flipProgress = 0.0;
        this.isFlipping = false;
      }
    }
  }

  /**
   * Renderiza o modal de inspeção tátil.
   * @param {CanvasRenderingContext2D} ctx Contexto Canvas 2D
   * @param {number} width Largura do viewport
   * @param {number} height Altura do viewport
   */
  render(ctx, width, height) {
    if (!this.isOpen && this.openAlpha <= 0) return;
    if (!this.docData) return;

    ctx.save();
    ctx.globalAlpha = this.openAlpha;

    // 1. Fundo Preto Asfalto Translúcido com Vinheta Suave
    this._renderBackdrop(ctx, width, height);

    // 2. Transformação de Zoom, Pan e Virada de Página (ScaleX senoidal)
    const centerX = width / 2 + this.pan.x;
    const centerY = height / 2 + this.pan.y;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.scale(this.zoom, this.zoom);

    // Efeito de contração horizontal durante a virada
    let flipScaleX = 1.0;
    if (this.isFlipping) {
      flipScaleX = Math.abs(Math.cos(this.flipProgress * Math.PI));
    }
    ctx.scale(flipScaleX, 1.0);

    const docW = this.baseDocWidth;
    const docH = this.baseDocHeight;
    const docX = -docW / 2;
    const docY = -docH / 2;

    // 3. Sombra de Contato e Projeção do Papel
    this._renderDocumentShadow(ctx, docX, docY, docW, docH);

    // 4. Corpo do Documento (Papel Pardo / Ficha Amarelada)
    this._renderPaperBody(ctx, docX, docY, docW, docH);

    // 5. Mancha Procedural de Café / Umidade
    this._renderCoffeeStain(ctx, docX + docW * 0.76, docY + docH * 0.82, 48);

    // 6. Conteúdo de Texto, Ficha ou Foto (Frente ou Verso)
    if (this.currentSide === 'front') {
      this._renderFrontContent(ctx, docX, docY, docW, docH);
    } else {
      this._renderBackContent(ctx, docX, docY, docW, docH);
    }

    // 7. Clipes de Papel Metálico no Topo
    this._renderPaperclip(ctx, docX + 48, docY - 12);

    // 8. Sombra de virada de página se estiver no meio do flip
    if (this.isFlipping) {
      const shadowAlpha = (1.0 - flipScaleX) * 0.45;
      ctx.fillStyle = `rgba(10, 10, 14, ${shadowAlpha})`;
      ctx.fillRect(docX, docY, docW, docH);
    }

    ctx.restore();

    // 9. Instruções e Dicas no Rodapé do Modal
    this._renderFooterHelp(ctx, width, height);

    ctx.restore();
  }

  /**
   * Renderiza a vinheta escura de fundo focando o documento.
   * @private
   */
  _renderBackdrop(ctx, width, height) {
    ctx.fillStyle = 'rgba(9, 9, 12, 0.92)';
    ctx.fillRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2;
    const grad = ctx.createRadialGradient(cx, cy, 120, cx, cy, width * 0.7);
    grad.addColorStop(0.0, 'rgba(18, 18, 24, 0.0)');
    grad.addColorStop(0.65, 'rgba(8, 8, 11, 0.6)');
    grad.addColorStop(1.0, 'rgba(3, 3, 5, 0.96)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  /**
   * Sombra suave de contato da folha projetada no vazio da mesa.
   * @private
   */
  _renderDocumentShadow(ctx, x, y, w, h) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.62)';
    ctx.filter = 'blur(12px)';
    ctx.fillRect(x + 10, y + 16, w + 6, h + 8);
    ctx.restore();
  }

  /**
   * Desenha a textura do papel (Pardo / Ficha amarelada) com bordas imperfeitas.
   * @private
   */
  _renderPaperBody(ctx, x, y, w, h) {
    ctx.save();

    // Gradiente pardo envelhecido (#d8caa8 e #c5b58e)
    const paperGrad = ctx.createLinearGradient(x, y, x + w, y + h);
    paperGrad.addColorStop(0.0, '#ede6d6'); // Ficha policial amarelada no topo
    paperGrad.addColorStop(0.35, '#e0d5be');
    paperGrad.addColorStop(0.7, '#d8caa8'); // Pardo médio
    paperGrad.addColorStop(1.0, '#c5b58e'); // Mancha de gaveta e tempo na base

    ctx.fillStyle = paperGrad;

    // Folha com bordas levemente rústicas e chanfradas (imperfeições de corte manual)
    ctx.beginPath();
    ctx.moveTo(x + 4, y);
    ctx.lineTo(x + w - 12, y);
    ctx.lineTo(x + w, y + 12); // Canto superior direito cortado / orelha de pasta
    ctx.lineTo(x + w, y + h - 6);
    ctx.lineTo(x + w - 6, y + h);
    ctx.lineTo(x + 8, y + h);
    ctx.lineTo(x, y + h - 8);
    ctx.lineTo(x, y + 6);
    ctx.closePath();
    ctx.fill();

    // Borda gasta com tinta parda escura
    ctx.strokeStyle = '#a69772';
    ctx.lineWidth = 1.0;
    ctx.stroke();

    // Dobra sutil (crease) diagonal no canto superior direito
    ctx.fillStyle = '#b8a882';
    ctx.beginPath();
    ctx.moveTo(x + w - 12, y);
    ctx.lineTo(x + w - 12, y + 12);
    ctx.lineTo(x + w, y + 12);
    ctx.closePath();
    ctx.fill();

    // Sombra da dobra
    ctx.strokeStyle = 'rgba(60, 50, 30, 0.35)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x + w - 12, y + 12);
    ctx.lineTo(x + w - 18, y + 18);
    ctx.stroke();

    // Dobra horizontal suave no meio da folha (marcas de ter sido dobrada em envelope)
    const midY = y + h * 0.48;
    const foldGrad = ctx.createLinearGradient(x, midY - 6, x, midY + 6);
    foldGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.0)');
    foldGrad.addColorStop(0.4, 'rgba(255, 255, 255, 0.15)'); // Luz na crista da dobra
    foldGrad.addColorStop(0.6, 'rgba(40, 30, 15, 0.12)');  // Sombra no vale da dobra
    foldGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = foldGrad;
    ctx.fillRect(x, midY - 6, w, 12);

    ctx.restore();
  }

  /**
   * Renderiza mancha circular de fundo de xícara de café frio (detalhe forense noir).
   * @private
   */
  _renderCoffeeStain(ctx, cx, cy, radius) {
    ctx.save();

    // Anel externo irregular da mancha
    ctx.strokeStyle = 'rgba(82, 53, 24, 0.28)';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Friso fino interno com gotejamento escuro
    ctx.strokeStyle = 'rgba(64, 40, 18, 0.42)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(cx + 1, cy + 1, radius - 2, 0.3, Math.PI * 1.8);
    ctx.stroke();

    // Preenchimento de café translúcido no centro
    const stainGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, radius);
    stainGrad.addColorStop(0.0, 'rgba(110, 75, 40, 0.0)');
    stainGrad.addColorStop(0.7, 'rgba(95, 60, 30, 0.05)');
    stainGrad.addColorStop(0.95, 'rgba(75, 48, 22, 0.18)');
    stainGrad.addColorStop(1.0, 'rgba(50, 30, 15, 0.0)');
    ctx.fillStyle = stainGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * Renderiza um clipe de papel metálico no topo da página.
   * @private
   */
  _renderPaperclip(ctx, x, y) {
    ctx.save();

    // Sombra projetada do clipe no papel
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x + 2, y + 4);
    ctx.lineTo(x + 2, y + 48);
    ctx.arcTo(x + 10, y + 54, x + 18, y + 48, 8);
    ctx.lineTo(x + 18, y + 16);
    ctx.stroke();

    // Arame de aço zincado
    ctx.strokeStyle = '#9ca4b0';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + 44);
    ctx.arcTo(x + 8, y + 50, x + 16, y + 44, 8);
    ctx.lineTo(x + 16, y + 12);
    ctx.arcTo(x + 22, y + 6, x + 28, y + 12, 6);
    ctx.lineTo(x + 28, y + 36);
    ctx.stroke();

    // Brilho especular metálico
    ctx.strokeStyle = '#eef2f7';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(x + 0.6, y + 2);
    ctx.lineTo(x + 0.6, y + 40);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Renderiza a frente do documento (Cabeçalho da Delegacia, texto mecânico e carimbos).
   * @private
   */
  _renderFrontContent(ctx, x, y, w, h) {
    ctx.save();
    const f = this.docData.front || {};

    // 1. Cabeçalho Oficial: DEPARTAMENTO DE POLÍCIA DE NORTHVALE
    ctx.fillStyle = '#2b2926';
    ctx.font = '700 13px "Courier New", Courier, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('DEPARTAMENTO DE POLÍCIA DE NORTHVALE — DIVISÃO FORENSE', x + w / 2, y + 42);

    ctx.font = '600 10px "Courier New", Courier, monospace';
    ctx.fillStyle = '#5c5750';
    ctx.fillText('DIVISÃO DE INVESTIGAÇÕES DE CRIMES GRAVES • ANO DE 1989', x + w / 2, y + 58);

    // Linha dupla separadora de arquivo oficial
    ctx.strokeStyle = '#38342c';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x + 36, y + 68);
    ctx.lineTo(x + w - 36, y + 68);
    ctx.stroke();

    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(x + 36, y + 72);
    ctx.lineTo(x + w - 36, y + 72);
    ctx.stroke();

    // 2. Metadados do Registro (Data, Caso, Oficial)
    ctx.textAlign = 'left';
    ctx.font = '600 11px "Courier New", Courier, monospace';
    ctx.fillStyle = '#262422';

    const dateStr = f.date || '14 DE OUTUBRO DE 1989';
    const caseStr = f.caseNumber || 'INQUÉRITO Nº 89-0414';
    const officerStr = f.officer || 'DET. ALEX HALE (DIST. 03)';

    ctx.fillText(`DATA: ${dateStr}`, x + 38, y + 92);
    ctx.fillText(`CASO: ${caseStr}`, x + 38, y + 108);
    ctx.fillText(`RESP.: ${officerStr}`, x + w - 210, y + 92);

    // Classificação Forense
    ctx.fillStyle = '#8f2d2d';
    ctx.fillText(`CLASSIFICAÇÃO: ${f.classification || 'URGENTE / EVIDÊNCIA FÍSICA'}`, x + 38, y + 128);

    // Linha fina tracejada
    ctx.strokeStyle = 'rgba(80, 70, 50, 0.4)';
    ctx.lineWidth = 0.8;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x + 36, y + 138);
    ctx.lineTo(x + w - 36, y + 138);
    ctx.stroke();
    ctx.setLineDash([]);

    // 3. Título / Assunto
    const title = this.docData.title || 'RELATÓRIO DE PERÍCIA PRELIMINAR';
    ctx.font = '700 12px "Courier New", Courier, monospace';
    ctx.fillStyle = '#1c1b18';
    ctx.fillText(`ASSUNTO: ${title.toUpperCase()}`, x + 38, y + 158);

    // 4. Texto do Corpo Datilografado com Desalinhamento Analógico
    const bodyText = f.text || 'O laudo pericial atesta que a fechadura metálica dos fundos foi submetida a torque mecânico não autorizado antes do temporal. Marcas estriadas na fenda indicam uso de gazua de aço carbono. Pistas adicionais colhidas no local apontam envolvimento de residentes locais sob suspeita.';
    this._renderTypewriterBlock(ctx, bodyText, x + 38, y + 185, w - 76);

    // 5. Anotação Manuscrita em Caneta Esferográfica Azul Gasta (#1d2d54)
    if (f.notes) {
      this._renderHandwrittenNote(ctx, f.notes, x + 44, y + h - 180, w - 88);
    }

    // 6. Carimbos Analógicos Rotacionados
    // Carimbo roxo desbotado (#5c3d75): CONFIDENCIAL
    this._renderRubberStamp(ctx, x + w - 160, y + 220, 'CONFIDENCIAL', '#5c3d75', -0.16);

    // Carimbo vermelho policial: ARQUIVADO / REGISTRADO
    if (f.stamps && f.stamps.includes('ARQUIVADO')) {
      this._renderRubberStamp(ctx, x + 80, y + h - 90, 'ARQUIVADO — DELEGACIA', '#ba181b', 0.12);
    }

    ctx.restore();
  }

  /**
   * Renderiza o verso do documento (Fundo manchado, carimbo de custódia e notas).
   * @private
   */
  _renderBackContent(ctx, x, y, w, h) {
    ctx.save();
    const b = this.docData.back || {};

    // Marca d'água de arquivo reverso
    ctx.font = '700 12px "Courier New", Courier, monospace';
    ctx.fillStyle = '#7a705a';
    ctx.textAlign = 'center';
    ctx.fillText('[ VERSO — REGISTRO DE CUSTÓDIA DE EVIDÊNCIAS ]', x + w / 2, y + 50);

    // Tabela ou anotações de cadeia de custódia
    ctx.textAlign = 'left';
    ctx.font = '500 11px "Courier New", Courier, monospace';
    ctx.fillStyle = '#302d28';

    const backText = b.text || 'HISTÓRICO DA EVIDÊNCIA:\n• 18:15 — Recolhido sob a sarjeta pelo Investigador Hale.\n• 18:38 — Acondicionado em envelope pardo lacrado.\n• 18:50 — Entrada protocolada no cofre de provas materiais nº 3.';
    const lines = backText.split('\n');
    let curY = y + 90;
    for (const line of lines) {
      ctx.fillText(line, x + 40, curY);
      curY += 22;
    }

    // Carimbo de Lacre Forense
    this._renderRubberStamp(ctx, x + w / 2 - 80, y + h / 2 - 20, 'LACRE FORENSE DE IDENTIFICAÇÃO', '#ba181b', 0.05);

    // Anotação a lápis de grafite (#3e3c38)
    const pencilNote = b.notes || 'Obs: Conferir compatibilidade com as amostras de metal colhidas na oficina de Elias.';
    ctx.font = 'italic 11px "Courier New", Courier, monospace';
    ctx.fillStyle = '#4a4842';
    ctx.fillText(`Nota: "${pencilNote}"`, x + 44, y + h - 120);

    ctx.restore();
  }

  /**
   * Renderiza texto datilografado caractere por caractere com micro-desalinhamentos.
   * @private
   */
  _renderTypewriterBlock(ctx, text, x, startY, maxWidth) {
    ctx.save();
    ctx.font = '500 12px "Courier New", Courier, monospace';
    ctx.fillStyle = '#22201d';
    ctx.textBaseline = 'top';

    const lineHeight = 18;
    const words = text.split(' ');
    let line = '';
    let curY = startY;

    for (let w = 0; w < words.length; w++) {
      const testLine = line.length > 0 ? `${line} ${words[w]}` : words[w];
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && line.length > 0) {
        this._renderTypewriterLine(ctx, line, x, curY);
        curY += lineHeight;
        line = words[w];
      } else {
        line = testLine;
      }
    }
    if (line.length > 0) {
      this._renderTypewriterLine(ctx, line, x, curY);
    }

    ctx.restore();
  }

  /**
   * Desenha uma única linha com micro-oscilações de linha de base e tinta de fita mecânica.
   * @private
   */
  _renderTypewriterLine(ctx, lineStr, x, y) {
    let curX = x;
    for (let i = 0; i < lineStr.length; i++) {
      const char = lineStr[i];
      // Micro-desalinhamento vertical determinístico (simulando tipo de chumbo frouxo)
      const jitterY = Math.sin((x + i) * 17) * 0.45;
      // Variação leve de pressão da fita entintada
      const alphaVar = 0.88 + Math.cos((y + i) * 7) * 0.12;
      ctx.fillStyle = `rgba(32, 30, 26, ${alphaVar})`;
      ctx.fillText(char, curX, y + jitterY);
      curX += ctx.measureText(char).width;
    }
  }

  /**
   * Renderiza anotação em caneta esferográfica azul gasta (#1d2d54).
   * @private
   */
  _renderHandwrittenNote(ctx, noteText, x, y, maxW) {
    ctx.save();
    ctx.font = 'italic 600 12px "Courier New", Courier, monospace';
    ctx.fillStyle = '#1d2d54'; // Azul caneta BIC gasta

    // Caixa de nota manuscrita com traço lateral
    ctx.strokeStyle = '#1d2d54';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x - 8, y - 4);
    ctx.lineTo(x - 8, y + 42);
    ctx.stroke();

    ctx.fillText(`ANOTAÇÃO DO DETETIVE:`, x, y);
    ctx.font = 'italic 500 11px "Courier New", Courier, monospace';
    ctx.fillText(`"${noteText}"`, x, y + 16);
    ctx.restore();
  }

  /**
   * Renderiza carimbo analógico desgastado com moldura dupla chanfrada e rotação.
   * @private
   */
  _renderRubberStamp(ctx, cx, cy, text, color, angle) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    ctx.font = '700 13px "Courier New", Courier, monospace';
    const textW = ctx.measureText(text).width;
    const padX = 14;
    const padY = 7;
    const boxW = textW + padX * 2;
    const boxH = 28;

    // Tinta de carimbo translúcida com textura de borracha gasta
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.76;

    // Moldura dupla do carimbo
    ctx.lineWidth = 1.8;
    ctx.strokeRect(-padX, -padY, boxW, boxH);

    ctx.lineWidth = 0.8;
    ctx.strokeRect(-padX + 2.5, -padY + 2.5, boxW - 5, boxH - 5);

    // Texto do carimbo
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, boxH / 2 - padY);

    ctx.restore();
  }

  /**
   * Dicas de controle diegético e botão de fechar no rodapé do modal.
   * @private
   */
  _renderFooterHelp(ctx, width, height) {
    ctx.save();
    const barY = height - 36;

    ctx.font = '600 11px "Courier New", Courier, monospace';
    ctx.fillStyle = '#9d4edd';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const sideText = this.currentSide === 'front' ? 'FRENTE (1/2)' : 'VERSO (2/2)';
    ctx.fillText(
      `[ESPAÇO] Virar Página (${sideText})   |   [BOTÃO DIR. MOUSE] Zoom 1.75x   |   [ESC] Fechar Documento`,
      width / 2, barY
    );

    // Botão de fechar sutil no canto superior direito
    const closeX = width - 48;
    const closeY = 32;
    ctx.strokeStyle = '#7b2cbf';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(closeX, closeY, 14, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#e6e4df';
    ctx.font = '700 12px "Courier New", Courier, monospace';
    ctx.fillText('X', closeX, closeY);

    ctx.restore();
  }

  /**
   * Processa clique do mouse para virar folha ou fechar.
   * @param {MouseEvent|{clientX:number, clientY:number}} e
   * @param {number} width
   * @param {number} height
   * @returns {boolean} Se o clique foi consumido
   */
  handleClick(e, width, height) {
    if (!this.isOpen) return false;

    const mx = e.clientX;
    const my = e.clientY;

    // Clique no botão [X] fechar
    const closeDist = Math.hypot(mx - (width - 48), my - 32);
    if (closeDist <= 16) {
      this.close();
      return true;
    }

    // Clique na folha alterna frente/verso
    this.flipPage();
    return true;
  }

  /**
   * Processa comando de teclado (Espaço = Virar, ESC = Fechar).
   * @param {KeyboardEvent|string} key
   * @returns {boolean} Se a tecla foi consumida
   */
  handleKeyDown(key) {
    if (!this.isOpen) return false;
    const keyName = typeof key === 'string' ? key : key.key;

    if (keyName === 'Escape') {
      this.close();
      return true;
    }
    if (keyName === ' ' || keyName === 'f' || keyName === 'F') {
      this.flipPage();
      return true;
    }
    if (keyName === 'z' || keyName === 'Z') {
      this.targetZoom = this.targetZoom === 1.0 ? 1.75 : 1.0;
      return true;
    }
    return false;
  }

  /**
   * Ativa zoom ao pressionar o botão direito do mouse.
   */
  handleMouseDown(e) {
    if (!this.isOpen) return;
    if (e.button === 2) {
      // Botão direito = Zoom
      this.targetZoom = 1.75;
      this.isDragging = true;
      this.lastMouse = { x: e.clientX, y: e.clientY };
    }
  }

  /**
   * Processa pan de arraste ao movimentar com zoom ativo.
   */
  handleMouseMove(e) {
    if (!this.isOpen) return;
    if (this.isDragging && this.zoom > 1.05) {
      const dx = e.clientX - this.lastMouse.x;
      const dy = e.clientY - this.lastMouse.y;
      this.pan.x += dx;
      this.pan.y += dy;
      this.lastMouse = { x: e.clientX, y: e.clientY };
    }
  }

  /**
   * Solta zoom ao liberar o botão direito.
   */
  handleMouseUp(e) {
    if (!this.isOpen) return;
    if (e.button === 2) {
      this.targetZoom = 1.0;
      this.isDragging = false;
    }
  }
}
