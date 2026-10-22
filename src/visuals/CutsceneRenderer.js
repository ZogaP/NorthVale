/**
 * NorthVale: Sombras de 1989 — CutsceneRenderer.js
 * Direção de Arte Técnica: Composição Visual, Câmera & Canvas 2D Cinematográfico (1989)
 *
 * Módulo puro em Canvas 2D desacoplado (sem dependências externas):
 * - Consome o estado lógico fornecido pelo CutsceneDirector do Codex.
 * - Letterbox de cinema 12% no topo e rodapé com transição suave.
 * - Legendas analógicas datilografadas em Courier New (#e0a96d / #eae6df).
 * - Efeitos atmosféricos: Screen shake em impactos, flashes de relâmpagos e vinheta analógica.
 * - Renderização completa dos 4 planos visuais cinematográficos:
 *   1. CUTSCENE_INTRO: Prólogo no Carro (volante, limpador funcional, exterior chuvoso).
 *   2. CUTSCENE_CAR_DISCOVERY: Viatura 04 no Galpão (cone de lanterna, sangue coagulado, chassi raspado).
 *   3. CUTSCENE_DAM_CONFRONTATION: Confronto na Represa (muralha de concreto, água violenta, silhuetas de Ruth e Bobby).
 *   4. CUTSCENE_EPILOGUE: Epílogo e Desfecho (desaturação noir P&B, granulação e fechamento íris).
 */

export class CutsceneRenderer {
  /**
   * @param {HTMLCanvasElement} [canvas] Referência opcional ao canvas principal
   */
  constructor(canvas = null) {
    this.canvas = canvas;
    this.time = 0;

    // Estados internos de amortecimento visual
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;
    this.currentFlash = 0.0;

    // Limpador de para-brisa interno para a Cena 1
    this.wiperPhase = 0;

    // Partículas de poeira suspensas no cone de lanterna para a Cena 2
    this.dustParticles = [];
    for (let i = 0; i < 45; i++) {
      this.dustParticles.push({
        x: Math.random(),
        y: Math.random(),
        r: 0.8 + Math.random() * 1.6,
        alpha: 0.2 + Math.random() * 0.5,
        speed: 0.02 + Math.random() * 0.04
      });
    }

    // Gotas de água do spray da represa para a Cena 3
    this.sprayParticles = [];
    for (let i = 0; i < 80; i++) {
      this.sprayParticles.push({
        x: Math.random(),
        y: Math.random(),
        vx: -60 - Math.random() * 120,
        vy: 400 + Math.random() * 500,
        len: 12 + Math.random() * 20
      });
    }

    // Cache de ruído para o Film Grain do epílogo
    this.grainCanvas = null;
    this._initFilmGrain();
  }

  /**
   * Pré-renderiza textura de granulação analógica.
   * @private
   */
  _initFilmGrain() {
    const size = 128;
    const off = document.createElement('canvas');
    off.width = size;
    off.height = size;
    const ctx = off.getContext('2d');
    const imgData = ctx.createImageData(size, size);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = (Math.random() * 255) | 0;
      d[i] = v; d[i + 1] = v; d[i + 2] = v;
      d[i + 3] = (Math.random() * 50) | 0;
    }
    ctx.putImageData(imgData, 0, 0);
    this.grainCanvas = off;
  }

  /**
   * Renderiza a cena cinematográfica atual com base no renderState do CutsceneDirector.
   * @param {CanvasRenderingContext2D} ctx Contexto Canvas 2D
   * @param {Object} renderState Estado emitido pelo CutsceneDirector
   * @param {string} renderState.sceneId 'CUTSCENE_INTRO' | 'CUTSCENE_CAR_DISCOVERY' | 'CUTSCENE_DAM_CONFRONTATION' | 'CUTSCENE_EPILOGUE'
   * @param {number} [renderState.time=0] Tempo decorrido na cena
   * @param {number} [renderState.progress=0] Progresso normalizado de 0.0 a 1.0
   * @param {number} [renderState.letterboxProgress=1.0] Abertura das barras pretas (0 a 1)
   * @param {string} [renderState.speaker=''] Nome do personagem falando
   * @param {string} [renderState.subtitles=''] Texto da legenda
   * @param {number} [renderState.subtitleAlpha=1.0] Opacidade da legenda
   * @param {number} [renderState.flash=0] Intensidade do clarão de relâmpago/tiro
   * @param {number} [renderState.shake=0] Intensidade do tremor de câmera
   * @param {number} [renderState.irisProgress=1.0] Fechamento estilo íris (1.0 = aberto, 0.0 = fechado)
   */
  render(ctx, renderState = {}) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    const dt = 0.016;
    this.time += dt;

    const sceneId = (renderState.sceneId || 'CUTSCENE_INTRO').toUpperCase();
    const time = renderState.time !== undefined ? renderState.time : this.time;
    const shake = renderState.shake || 0;
    const flash = renderState.flash || 0;

    ctx.save();

    // 1. Aplica Efeito de Câmera Tremida (Screen Shake) em impactos/tiros
    if (shake > 0) {
      this.shakeOffsetX = (Math.random() - 0.5) * shake * 12;
      this.shakeOffsetY = (Math.random() - 0.5) * shake * 12;
      ctx.translate(this.shakeOffsetX, this.shakeOffsetY);
    }

    // 2. Renderização do Plano Visual da Cena Específica
    switch (sceneId) {
      case 'CUTSCENE_INTRO':
      case 'INTRO':
        this._renderIntroCarScene(ctx, w, h, time, renderState);
        break;

      case 'CUTSCENE_CAR_DISCOVERY':
      case 'CAR_DISCOVERY':
        this._renderCarDiscoveryScene(ctx, w, h, time, renderState);
        break;

      case 'CUTSCENE_DAM_CONFRONTATION':
      case 'DAM_CONFRONTATION':
        this._renderDamConfrontationScene(ctx, w, h, time, renderState);
        break;

      case 'CUTSCENE_EPILOGUE':
      case 'EPILOGUE':
        this._renderEpilogueScene(ctx, w, h, time, renderState);
        break;

      default:
        this._renderIntroCarScene(ctx, w, h, time, renderState);
        break;
    }

    // 3. Efeito de Clarão de Relâmpago ou Disparo (Flash)
    if (flash > 0.01) {
      ctx.fillStyle = `rgba(235, 245, 255, ${Math.min(1, flash * 0.85)})`;
      ctx.fillRect(0, 0, w, h);
    }

    // 4. Vinheta Escura nas Bordas da Tela (Estética 1989)
    this._renderVignette(ctx, w, h);

    // 5. Letterbox de Cinema (12% topo e 12% rodapé com descida suave)
    const lbProg = renderState.letterboxProgress !== undefined ? renderState.letterboxProgress : 1.0;
    this.renderLetterbox(ctx, lbProg);

    // 6. Legendas Analógicas Mecânicas na Barra Inferior
    if (renderState.subtitles) {
      const subAlpha = renderState.subtitleAlpha !== undefined ? renderState.subtitleAlpha : 1.0;
      this.renderSubtitles(ctx, renderState.speaker || '', renderState.subtitles, subAlpha);
    }

    // 7. Fechamento de Íris de Lente Fotográfica (Corte Circular para Preto no Epílogo)
    if (renderState.irisProgress !== undefined && renderState.irisProgress < 0.99) {
      this._renderIrisMask(ctx, w, h, Math.max(0, renderState.irisProgress));
    }

    ctx.restore();
  }

  /**
   * Renderiza as barras pretas de letterbox de cinema (#070709) com descida suave.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} progress Progresso de abertura (0.0 a 1.0)
   */
  renderLetterbox(ctx, progress = 1.0) {
    if (progress <= 0.001) return;

    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    const barH = h * 0.12 * Math.min(1, Math.max(0, progress));

    ctx.save();
    ctx.fillStyle = '#070709'; // Preto asfalto fosco

    // Barra superior
    ctx.fillRect(0, 0, w, barH);

    // Barra inferior
    ctx.fillRect(0, h - barH, w, barH);

    // Friso decorativo sutil na junção da barra
    ctx.strokeStyle = 'rgba(123, 44, 191, 0.4)'; // Electric Purple translúcido
    ctx.lineWidth = 1.0;

    ctx.beginPath();
    ctx.moveTo(0, barH);
    ctx.lineTo(w, barH);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, h - barH);
    ctx.lineTo(w, h - barH);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Renderiza a legenda datilografada centralizada na barra inferior do letterbox.
   * @param {CanvasRenderingContext2D} ctx
   * @param {string} speaker Nome do personagem
   * @param {string} text Conteúdo da legenda
   * @param {number} alpha Opacidade
   */
  renderSubtitles(ctx, speaker, text, alpha = 1.0) {
    if (!text || alpha <= 0.01) return;

    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    const barH = h * 0.12;
    const textY = h - barH / 2;

    ctx.save();
    ctx.globalAlpha = Math.min(1, Math.max(0, alpha));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = '600 13px "Courier New", Courier, monospace';

    if (speaker) {
      // Nome do falante em Âmbar Suave (#e0a96d)
      const speakerPrefix = `[${speaker.toUpperCase()}] `;
      const fullText = speakerPrefix + text;

      // Sombra suave para contraste
      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.fillText(fullText, w / 2 + 1, textY + 1);

      // Renderização com distinção de cor
      const totalWidth = ctx.measureText(fullText).width;
      const startX = w / 2 - totalWidth / 2;

      ctx.textAlign = 'left';
      ctx.fillStyle = '#e0a96d'; // Âmbar de rua
      ctx.fillText(speakerPrefix, startX, textY);

      const prefixWidth = ctx.measureText(speakerPrefix).width;
      ctx.fillStyle = '#eae6df'; // Off-white sujo
      ctx.fillText(text, startX + prefixWidth, textY);
    } else {
      // Texto direto em Off-White (#eae6df)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.fillText(text, w / 2 + 1, textY + 1);

      ctx.fillStyle = '#eae6df';
      ctx.fillText(text, w / 2, textY);
    }

    ctx.restore();
  }

  /**
   * CENA 1: Prólogo no Carro (CUTSCENE_INTRO)
   * - Painel escuro do Chevrolet, luz âmbar do rádio, vidro encharcado e limpador de para-brisa.
   * - Silhueta da delegacia de NorthVale visível através do vidro limpo com poste oscilante.
   * @private
   */
  _renderIntroCarScene(ctx, w, h, time, state) {
    // 1. Exterior Escuro e Asfalto Molhado
    ctx.fillStyle = '#060608';
    ctx.fillRect(0, 0, w, h);

    // Fachada da Delegacia ao Longe com Torre de Relógio
    const precinctX = w * 0.52;
    const horizonY = h * 0.55;

    ctx.fillStyle = '#0a0a10';
    ctx.fillRect(precinctX - 80, horizonY - 110, 160, 110); // Prédio principal
    ctx.fillRect(precinctX - 22, horizonY - 165, 44, 55);   // Torre do relógio
    ctx.beginPath();
    ctx.moveTo(precinctX - 25, horizonY - 165);
    ctx.lineTo(precinctX, horizonY - 195);
    ctx.lineTo(precinctX + 25, horizonY - 165);
    ctx.fill();

    // Mostrador do relógio na torre iluminado em cianose gélida
    ctx.fillStyle = 'rgba(72, 149, 239, 0.25)';
    ctx.beginPath();
    ctx.arc(precinctX, horizonY - 138, 11, 0, Math.PI * 2);
    ctx.fill();

    // Poste de iluminação pública oscilante do exterior
    const lampFlicker = 0.75 + Math.sin(time * 14) * 0.15 + (Math.random() < 0.05 ? -0.3 : 0);
    const lampX = w * 0.68;
    const lampY = horizonY - 75;

    const lampGrad = ctx.createRadialGradient(lampX, lampY, 5, lampX, lampY, 140);
    lampGrad.addColorStop(0.0, `rgba(212, 139, 40, ${0.45 * lampFlicker})`); // Âmbar
    lampGrad.addColorStop(0.5, `rgba(180, 110, 30, ${0.18 * lampFlicker})`);
    lampGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = lampGrad;
    ctx.beginPath();
    ctx.arc(lampX, lampY, 140, 0, Math.PI * 2);
    ctx.fill();

    // 2. Vidro Encharcado de Gotas Grossas
    ctx.fillStyle = 'rgba(16, 20, 28, 0.45)';
    ctx.fillRect(0, 0, w, h * 0.68);

    // Gotículas no vidro exterior
    ctx.strokeStyle = 'rgba(180, 205, 235, 0.35)';
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 40; i++) {
      const gx = ((Math.sin(i * 99) * 0.5 + 0.5) * w);
      const gy = ((Math.cos(i * 47) * 0.5 + 0.5) * (h * 0.65));
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx + 2, gy + 8 + (i % 6));
      ctx.stroke();
    }

    // 3. Faixa Limpa Pelo Limpador de Para-brisa (Wiper)
    this.wiperPhase = (state.wiperAngle !== undefined)
      ? state.wiperAngle
      : Math.sin(time * 2.6) * 0.68;

    const pivotX = w * 0.42;
    const pivotY = h * 0.66;
    const armLen = h * 0.48;

    // Área translúcida limpa pelo arco do limpador
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pivotX, pivotY);
    ctx.arc(pivotX, pivotY, armLen + 20, -Math.PI * 0.85, -Math.PI * 0.15);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.fill();

    // Braço mecânico e palheta de borracha
    ctx.translate(pivotX, pivotY);
    ctx.rotate(this.wiperPhase - 0.38);

    ctx.strokeStyle = '#181820'; // Aço preto
    ctx.lineWidth = 3.8;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -armLen);
    ctx.stroke();

    ctx.strokeStyle = '#0a0a0e';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(-18, -armLen);
    ctx.lineTo(18, -armLen);
    ctx.stroke();

    // Rastro úmido de borracha
    ctx.strokeStyle = 'rgba(215, 235, 255, 0.55)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-19, -armLen - 1);
    ctx.lineTo(19, -armLen - 1);
    ctx.stroke();
    ctx.restore();

    // 4. Painel em Primeiro Plano (Silhueta do Volante e Rádio Âmbar)
    const dashY = h * 0.65;
    const dashGrad = ctx.createLinearGradient(0, dashY, 0, h);
    dashGrad.addColorStop(0.0, '#16161e');
    dashGrad.addColorStop(0.2, '#0f0f14');
    dashGrad.addColorStop(1.0, '#060608');
    ctx.fillStyle = dashGrad;
    ctx.fillRect(0, dashY, w, h - dashY);

    // Silhueta do Volante no canto esquerdo
    ctx.strokeStyle = '#08080a';
    ctx.lineWidth = 26;
    ctx.beginPath();
    ctx.arc(w * 0.22, h + 24, h * 0.34, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();

    // Luz âmbar fraca saindo do mostrador do rádio e velocímetro
    const radioX = w * 0.48;
    const radioY = dashY + 16;
    ctx.fillStyle = '#100c06';
    ctx.fillRect(radioX - 60, radioY, 120, 24);

    const radioGlow = ctx.createRadialGradient(radioX, radioY + 12, 4, radioX, radioY + 12, 60);
    radioGlow.addColorStop(0.0, 'rgba(212, 139, 40, 0.35)');
    radioGlow.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = radioGlow;
    ctx.fillRect(radioX - 60, radioY - 10, 120, 44);

    ctx.font = '700 9px "Courier New", monospace';
    ctx.fillStyle = '#e0a96d';
    ctx.textAlign = 'center';
    ctx.fillText('89.1 FM — POLICE BAND', radioX, radioY + 15);
  }

  /**
   * CENA 2: A Viatura 04 no Galpão (CUTSCENE_CAR_DISCOVERY)
   * - Breu total iluminado por cone volumétrico de lanterna em movimento.
   * - Viatura nº 04: pintura azul raspada, sangue coagulado e pó de ferrugem.
   * @private
   */
  _renderCarDiscoveryScene(ctx, w, h, time, state) {
    // 1. Breu Total do Galpão Abandonado
    ctx.fillStyle = '#050507';
    ctx.fillRect(0, 0, w, h);

    // Estrutura industrial de vigas no escuro
    ctx.strokeStyle = '#0f0f14';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(w * 0.15, 0); ctx.lineTo(w * 0.15, h);
    ctx.moveTo(w * 0.85, 0); ctx.lineTo(w * 0.85, h);
    ctx.moveTo(0, h * 0.25); ctx.lineTo(w, h * 0.25);
    ctx.stroke();

    // 2. Movimento Dinâmico do Cone da Lanterna
    // O cone de luz varre o cenário até focar no para-choque da viatura
    const targetX = w * 0.52;
    const targetY = h * 0.54;
    const sweepProgress = Math.min(1.0, time / 3.0);
    const lightX = targetX + Math.sin(time * 2.2) * (1.0 - sweepProgress) * 180;
    const lightY = targetY + Math.cos(time * 1.8) * (1.0 - sweepProgress) * 90;

    // 3. Viatura 04 em Primeiro Plano (Chassi e Para-Choque Policial)
    const carX = w * 0.32;
    const carY = h * 0.42;
    const carW = w * 0.46;
    const carH = h * 0.32;

    // Chassi da viatura (Lataria de viatura policial)
    ctx.fillStyle = '#10141e'; // Azul marinho policial envelhecido
    ctx.fillRect(carX, carY, carW, carH * 0.7);

    // Para-choque cromado riscado com ferrugem
    const bumperY = carY + carH * 0.65;
    ctx.fillStyle = '#3a3a42';
    ctx.fillRect(carX - 12, bumperY, carW + 24, 28);

    // Textura de ferrugem oxidada no metal
    ctx.fillStyle = '#5c3218';
    ctx.fillRect(carX + 18, bumperY + 4, 65, 12);
    ctx.fillRect(carX + carW - 90, bumperY + 8, 48, 14);

    // Pintura azul raspada revelando aço fosco
    ctx.fillStyle = '#5a6275';
    ctx.fillRect(carX + 40, carY + 12, 110, 18);

    // Estêncil Policial: "VIATURA 04 — NORTHVALE"
    ctx.font = '700 14px "Courier New", Courier, monospace';
    ctx.fillStyle = '#dcd8cf';
    ctx.textAlign = 'center';
    ctx.fillText('NORTHVALE POLICE', carX + carW / 2, carY + 36);

    ctx.font = '900 22px "Courier New", Courier, monospace';
    ctx.fillStyle = '#eae6df';
    ctx.fillText('04', carX + carW / 2, carY + 65);

    // Manchas Escuras de Sangue Coagulado no Chassi e Para-Choque (#5c1418 e #3b0a0d)
    ctx.fillStyle = '#3b0a0d';
    ctx.beginPath();
    // Poça/espirro de sangue coagulado
    ctx.ellipse(carX + carW * 0.68, carY + carH * 0.52, 28, 14, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Gotas de sangue escorrendo pelo para-choque
    ctx.strokeStyle = '#5c1418';
    ctx.lineWidth = 3.0;
    ctx.beginPath();
    ctx.moveTo(carX + carW * 0.68 - 10, carY + carH * 0.52);
    ctx.lineTo(carX + carW * 0.68 - 10, bumperY + 22);
    ctx.moveTo(carX + carW * 0.68 + 8, carY + carH * 0.52);
    ctx.lineTo(carX + carW * 0.68 + 8, bumperY + 30);
    ctx.stroke();

    // 4. Renderização do Cone Volumétrico da Lanterna sobre a Cena
    ctx.save();
    const beamOriginX = w * 0.12;
    const beamOriginY = h * 0.88;

    // Luz pontiaguda amarelada com poeira
    const coneGrad = ctx.createRadialGradient(lightX, lightY, 15, lightX, lightY, 220);
    coneGrad.addColorStop(0.0, 'rgba(235, 215, 140, 0.55)');
    coneGrad.addColorStop(0.35, 'rgba(212, 185, 110, 0.28)');
    coneGrad.addColorStop(0.8, 'rgba(120, 95, 45, 0.08)');
    coneGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.94)');

    // Máscara escura que só revela onde a lanterna aponta
    ctx.fillStyle = coneGrad;
    ctx.beginPath();
    ctx.arc(lightX, lightY, 220, 0, Math.PI * 2);
    ctx.fill();

    // Feixe volumétrico do foco
    ctx.fillStyle = 'rgba(235, 215, 140, 0.06)';
    ctx.beginPath();
    ctx.moveTo(beamOriginX, beamOriginY);
    ctx.lineTo(lightX - 80, lightY - 40);
    ctx.lineTo(lightX + 80, lightY + 40);
    ctx.closePath();
    ctx.fill();

    // Partículas de poeira suspensas flutuando no ar do galpão
    ctx.fillStyle = 'rgba(235, 225, 180, 0.45)';
    for (const p of this.dustParticles) {
      const px = lightX + (p.x - 0.5) * 260;
      const py = lightY + (p.y - 0.5) * 260;
      ctx.beginPath();
      ctx.arc(px, py, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /**
   * CENA 3: O Confronto na Represa (CUTSCENE_DAM_CONFRONTATION)
   * - Muralha maciça de concreto da represa com água escorrendo violentamente.
   * - Clarões brancos súbitos desenhando as silhuetas dramáticas de Ruth (espingarda) e Bobby Miller.
   * @private
   */
  _renderDamConfrontationScene(ctx, w, h, time, state) {
    // 1. Paredão Brutalista de Concreto da Represa
    ctx.fillStyle = '#14161c'; // Concreto escuro
    ctx.fillRect(0, 0, w, h);

    // Linhas maciças verticais de blocos de concreto armado
    ctx.strokeStyle = '#0d0f14';
    ctx.lineWidth = 4;
    for (let x = w * 0.2; x < w; x += w * 0.25) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x - 40, h);
      ctx.stroke();
    }

    // 2. Torrente Violenta de Água Escorrendo Pela Parede
    ctx.save();
    ctx.strokeStyle = 'rgba(160, 190, 225, 0.22)';
    ctx.lineWidth = 2.0;
    for (const sp of this.sprayParticles) {
      sp.y += sp.vy * 0.016;
      sp.x += sp.vx * 0.016;
      if (sp.y > h) {
        sp.y = -20;
        sp.x = Math.random() * w;
      }
      ctx.beginPath();
      ctx.moveTo(sp.x, sp.y);
      ctx.lineTo(sp.x - 4, sp.y + sp.len);
      ctx.stroke();
    }

    // Espuma e névoa turbulenta subindo do abismo inferior
    const foamGrad = ctx.createLinearGradient(0, h * 0.75, 0, h);
    foamGrad.addColorStop(0.0, 'rgba(180, 205, 235, 0.0)');
    foamGrad.addColorStop(0.6, 'rgba(140, 175, 215, 0.22)');
    foamGrad.addColorStop(1.0, 'rgba(215, 235, 255, 0.45)');
    ctx.fillStyle = foamGrad;
    ctx.fillRect(0, h * 0.75, w, h * 0.25);
    ctx.restore();

    // 3. Passarela Metálica de Serviço no Alto da Represa
    const walkwayY = h * 0.58;
    ctx.fillStyle = '#0c0d12';
    ctx.fillRect(0, walkwayY, w, 14);

    // Grade de proteção
    ctx.strokeStyle = '#1a1b24';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, walkwayY - 24);
    ctx.lineTo(w, walkwayY - 24);
    for (let gx = 0; gx < w; gx += 28) {
      ctx.moveTo(gx, walkwayY - 24);
      ctx.lineTo(gx, walkwayY);
    }
    ctx.stroke();

    // 4. Relâmpago e Silhuetas Dramáticas
    // A cada ~2.5s, dispara um clarão de relâmpago de 2 frames
    const lightningCycle = (time % 2.6);
    const isLightningActive = lightningCycle < 0.12 || (state.flash && state.flash > 0.2);

    if (isLightningActive) {
      // Clarão branco no fundo destacando as silhuetas em contra-luz
      ctx.fillStyle = 'rgba(235, 245, 255, 0.88)';
      ctx.fillRect(0, 0, w, walkwayY);
    }

    // SILHUETA 1: Xerife Ruth Vance com Espingarda 12 (Lado Esquerdo)
    const ruthX = w * 0.35;
    ctx.fillStyle = '#050608'; // Silhueta negra recortada

    ctx.beginPath();
    // Corpo / Capote de chuva da xerife
    ctx.moveTo(ruthX - 16, walkwayY);
    ctx.lineTo(ruthX - 12, walkwayY - 60);
    ctx.lineTo(ruthX + 12, walkwayY - 60);
    ctx.lineTo(ruthX + 18, walkwayY);
    ctx.fill();

    // Cabeça / Chapéu de xerife
    ctx.beginPath();
    ctx.arc(ruthX, walkwayY - 68, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(ruthX - 15, walkwayY - 72, 30, 4);

    // Braços empunhando a espingarda apontada para Bobby
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#050608';
    ctx.beginPath();
    ctx.moveTo(ruthX + 6, walkwayY - 50);
    ctx.lineTo(ruthX + 38, walkwayY - 50); // Cano longo da espingarda
    ctx.lineTo(ruthX + 65, walkwayY - 52);
    ctx.stroke();

    // SILHUETA 2: Bobby Miller Encolhido na Beira do Abismo (Lado Direito)
    const bobbyX = w * 0.65;
    ctx.beginPath();
    // Corpo encolhido em postura defensiva
    ctx.ellipse(bobbyX, walkwayY - 24, 18, 24, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(bobbyX - 4, walkwayY - 48, 8, 0, Math.PI * 2);
    ctx.fill();

    // Braços erguidos em rendição / desespero
    ctx.beginPath();
    ctx.moveTo(bobbyX - 10, walkwayY - 34);
    ctx.lineTo(bobbyX - 22, walkwayY - 52);
    ctx.stroke();

    // Maleta de metal caída na beira da grade
    ctx.fillRect(bobbyX + 18, walkwayY - 14, 18, 14);
  }

  /**
   * CENA 4: Epílogo e Desfecho (CUTSCENE_EPILOGUE)
   * - Transição com redução progressiva de saturação (Preto e Branco).
   * - Aumento da granulação analógica de filme de 1989.
   * @private
   */
  _renderEpilogueScene(ctx, w, h, time, state) {
    const prog = renderStateProg(state.progress !== undefined ? state.progress : (time / 10.0));

    // 1. Fundo Melancólico Noir de NorthVale ao Amanhecer Frio
    ctx.fillStyle = '#08090e';
    ctx.fillRect(0, 0, w, h);

    // Silhueta das montanhas e pinheiros sob a névoa
    ctx.fillStyle = '#0c0d14';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.7);
    ctx.lineTo(w * 0.35, h * 0.52);
    ctx.lineTo(w * 0.7, h * 0.64);
    ctx.lineTo(w, h * 0.48);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    // 2. Camada de Desaturação Noir (Filtro Preto e Branco Progressivo)
    if (prog > 0.1) {
      const bwAlpha = Math.min(0.85, (prog - 0.1) * 1.4);
      ctx.fillStyle = `rgba(18, 18, 22, ${bwAlpha})`;
      ctx.fillRect(0, 0, w, h);
    }

    // 3. Granulação Analógica (Film Grain de Película 1989)
    if (this.grainCanvas) {
      ctx.save();
      ctx.globalAlpha = 0.18 + prog * 0.12; // Grão aumenta no desfecho
      ctx.globalCompositeOperation = 'screen';
      const pat = ctx.createPattern(this.grainCanvas, 'repeat');
      if (pat) {
        ctx.fillStyle = pat;
        ctx.fillRect(0, 0, w, h);
      }
      ctx.restore();
    }
  }

  /**
   * Vinheta escura analógica periférica.
   * @private
   */
  _renderVignette(ctx, w, h) {
    const cx = w / 2;
    const cy = h / 2;
    const vig = ctx.createRadialGradient(cx, cy, Math.min(w, h) * 0.35, cx, cy, Math.max(w, h) * 0.75);
    vig.addColorStop(0.0, 'rgba(0, 0, 0, 0.0)');
    vig.addColorStop(0.65, 'rgba(5, 5, 8, 0.45)');
    vig.addColorStop(1.0, 'rgba(2, 2, 4, 0.92)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
  }

  /**
   * Fechamento estilo íris de lente antiga (Corte circular para preto).
   * @private
   */
  _renderIrisMask(ctx, w, h, progress) {
    const cx = w / 2;
    const cy = h / 2;
    const maxR = Math.hypot(w, h) / 2;
    const curR = maxR * progress;

    ctx.save();
    ctx.fillStyle = '#040406';

    // Máscara inversa: desenha retângulo e corta o círculo interno
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.arc(cx, cy, curR, 0, Math.PI * 2, true);
    ctx.fill();

    // Borda fosca de aberração cromática na lente
    ctx.strokeStyle = 'rgba(72, 149, 239, 0.25)';
    ctx.lineWidth = 3.0;
    ctx.beginPath();
    ctx.arc(cx, cy, curR, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }
}

/**
 * Normaliza o progresso entre 0.0 e 1.0.
 * @private
 */
function renderStateProg(val) {
  return Math.min(1.0, Math.max(0.0, val || 0));
}
