/**
 * NorthVale: Sombras de 1989 — CassettePlayerView.js
 * Direção de Arte Técnica: Gravador de Microcassete Japonês de Bolso (1989)
 *
 * Módulo puro em Canvas 2D desacoplado (sem dependências externas):
 * - Gabinete realista de gravador portátil japonês de 1989 em metal escovado e plástico texturizado.
 * - Bobinas mecânicas giratórias com dentes de tração e fita magnética que se transfere em tempo real.
 * - Indicador de sinal VU analógico retroiluminado com agulha a saltar com as amplitudes do som.
 * - Contador de voltas mecânico analógico de 3 dígitos (ex: 042) com pino de reset.
 * - Botões físicos táteis tipo teclado de piano com reação ao clique: [REW], [FFWD], [PLAY], [STOP/EJECT].
 * - Exibição de transcrição datilografada sincronizada com o áudio gravado da fita.
 * - Integração opcional direta com RetroAudioSynthesizer para síntese de tape hiss, motor e clunks.
 */

import { RetroAudioSynthesizer } from './RetroAudioSynthesizer.js';

export class CassettePlayerView {
  /**
   * @param {HTMLCanvasElement} [canvas] Referência opcional ao canvas principal
   * @param {RetroAudioSynthesizer} [audioSynthesizer] Instância opcional do sintetizador
   */
  constructor(canvas = null, audioSynthesizer = null) {
    this.canvas = canvas;
    this.synth = audioSynthesizer || new RetroAudioSynthesizer();

    this.isOpen = false;
    this.time = 0;
    this.fadeAlpha = 0.0;
    this.targetAlpha = 0.0;

    // Estado da mecânica da fita
    this.state = 'stopped'; // 'stopped' | 'playing' | 'rewinding' | 'fast_forwarding'
    this.tapePosition = 42.0; // Posição em segundos
    this.tapeDuration = 180.0; // Duração total da fita (3 minutos)
    this.tapeAngle = 0.0; // Ângulo das bobinas em radianos
    this.counter = 42; // Contador mecânico de 3 dígitos

    // Dados da fita cassete ativa
    this.cassetteData = null;
    this.onClose = null;

    // Agulha do VU meter analógico
    this.vuLevel = 0.0;
    this.targetVuLevel = 0.0;

    // Transcrição datilografada da gravação
    this.currentTranscript = '';

    // Estado dos botões do gravador
    this.buttons = [
      { id: 'rew', label: 'REW', x: 0, y: 0, w: 60, h: 42, isPressed: false },
      { id: 'ffwd', label: 'FFWD', x: 0, y: 0, w: 60, h: 42, isPressed: false },
      { id: 'play', label: 'PLAY', x: 0, y: 0, w: 66, h: 42, isPressed: false, accent: '#2a9d8f' },
      { id: 'stop', label: 'STOP', x: 0, y: 0, w: 66, h: 42, isPressed: true, accent: '#e63946' }
    ];

    // Pino de reset do contador mecânico
    this.resetPinHitbox = { x: 0, y: 0, r: 8 };

    // Botão de retorno / fechar gravador
    this.ejectButtonHitbox = { x: 0, y: 0, w: 180, h: 32 };
  }

  /**
   * Abre o gravador com os dados da fita investigativa.
   * @param {Object} cassetteData
   * @param {string} [cassetteData.title] Título da fita (ex: "FITA K7 Nº 04 — DEPOIMENTO DE SARAH")
   * @param {string} [cassetteData.date] Data da gravação (ex: "14.X.1989 — 03:45 AM")
   * @param {Array<Object>} [cassetteData.transcription] Linhas com timestamp e texto
   * @param {Function} [onCloseCallback]
   */
  open(cassetteData = null, onCloseCallback = null) {
    this.cassetteData = cassetteData || this._getDefaultCassetteData();
    this.onClose = onCloseCallback;

    this.isOpen = true;
    this.targetAlpha = 1.0;
    this.state = 'stopped';
    this._updateButtonStates();
  }

  /**
   * Fecha o visualizador com fade-out suave.
   */
  close() {
    this.targetAlpha = 0.0;
    this.synth.stopAtmosphere();
    if (this.onClose) this.onClose();
  }

  _getDefaultCassetteData() {
    return {
      title: 'FITA K7 Nº 04 — DEPOIMENTO GRAVADO DE SARAH',
      date: '14.X.1989 — 04:15 AM (GRAVAÇÃO POLICIAL)',
      tapeColor: '#1e1e24',
      labelColor: '#e5dec9',
      transcription: [
        { time: 0, text: '[RUÍDO DE MOTOR DC E ESTÁTICA MAGNÉTICA DA FITA]' },
        { time: 5, text: 'SARAH: "...a água da represa estava congelando... não dava para enxergar nada..."' },
        { time: 14, text: 'SARAH: "...Bobby não estava patrulhando a estrada. Eu vi a viatura dele nos fundos do armazém."' },
        { time: 24, text: 'SARAH: "...eles estavam carregando os tambores químicos de Sloane antes da meia-noite."' },
        { time: 35, text: 'VOZ MASCULINA: "...quem mandou você olhar aquilo, garota? Quem mais sabe disso?!"' },
        { time: 48, text: 'SARAH: "...ninguém! Por favor, o Julian não teve culpa de nada..."' },
        { time: 60, text: '[CORTE BRUSCO — TRANSMISSÃO DE RÁDIO POLICIAL INTERROMPIDA]' }
      ]
    };
  }

  /**
   * Atualiza timers, rotação de bobinas, agulha do VU e contador a 60 FPS.
   * @param {number} dt Delta time em segundos
   */
  update(dt) {
    if (!this.isOpen && this.fadeAlpha <= 0) return;
    this.time += dt;

    // Transição suave de abertura
    this.fadeAlpha += (this.targetAlpha - this.fadeAlpha) * Math.min(1, dt * 8.0);
    if (this.targetAlpha === 0 && this.fadeAlpha <= 0.01) {
      this.isOpen = false;
      this.fadeAlpha = 0;
      return;
    }

    // 1. Mecânica de Movimento da Fita
    if (this.state === 'playing') {
      this.tapePosition = Math.min(this.tapeDuration, this.tapePosition + dt);
      this.tapeAngle += dt * 4.2; // ~40 RPM
      this.counter = Math.floor(this.tapePosition);

      // Agulha do VU meter saltando conforme a síntese sonora
      const audioAmp = this.synth.getAudioAmplitude();
      // Modulação de fala na fita
      const speechJitter = Math.sin(this.time * 16) * Math.cos(this.time * 7) * 0.45;
      const targetAmp = Math.max(0.15, Math.min(0.95, audioAmp * 1.5 + Math.abs(speechJitter)));
      this.vuLevel += (targetAmp - this.vuLevel) * Math.min(1, dt * 18.0);

      if (this.tapePosition >= this.tapeDuration) {
        this.setPlaybackState('stopped');
      }
    } else if (this.state === 'fast_forwarding') {
      this.tapePosition = Math.min(this.tapeDuration, this.tapePosition + dt * 5.0);
      this.tapeAngle += dt * 22.0;
      this.counter = Math.floor(this.tapePosition);
      this.vuLevel += (0.05 - this.vuLevel) * dt * 10;
      if (this.tapePosition >= this.tapeDuration) this.setPlaybackState('stopped');
    } else if (this.state === 'rewinding') {
      this.tapePosition = Math.max(0, this.tapePosition - dt * 5.0);
      this.tapeAngle -= dt * 22.0;
      this.counter = Math.floor(this.tapePosition);
      this.vuLevel += (0.05 - this.vuLevel) * dt * 10;
      if (this.tapePosition <= 0) this.setPlaybackState('stopped');
    } else {
      // Parado
      this.vuLevel += (0.0 - this.vuLevel) * dt * 8;
    }

    // 2. Atualização da Transcrição Ativa
    this._updateTranscription();
  }

  _updateTranscription() {
    if (!this.cassetteData || !this.cassetteData.transcription) return;
    const items = this.cassetteData.transcription;

    let found = '[FITA PARADA — PRESSIONE PLAY PARA OUVIR]';
    if (this.state === 'playing') {
      found = '[REPRODUZINDO GRAVAÇÃO...]';
      for (let i = items.length - 1; i >= 0; i--) {
        if (this.tapePosition >= items[i].time) {
          found = items[i].text;
          break;
        }
      }
    } else if (this.state === 'fast_forwarding') {
      found = '>> AVANÇO RÁPIDO (FFWD)...';
    } else if (this.state === 'rewinding') {
      found = '<< REBOBINANDO FITA (REW)...';
    }

    this.currentTranscript = found;
  }

  /**
   * Altera o estado do mecanismo com clique físico sonoro e ruído de fita.
   * @param {string} newState 'playing' | 'stopped' | 'rewinding' | 'fast_forwarding'
   */
  setPlaybackState(newState) {
    if (this.state === newState && newState !== 'stopped') return;

    this.state = newState;
    this.synth.playSFX('cassette_clunk');

    if (newState === 'playing') {
      this.synth.startAtmosphere('tape_hiss');
    } else {
      this.synth.stopAtmosphere();
    }

    this._updateButtonStates();
  }

  _updateButtonStates() {
    for (const btn of this.buttons) {
      if (btn.id === 'play') btn.isPressed = (this.state === 'playing');
      else if (btn.id === 'stop') btn.isPressed = (this.state === 'stopped');
      else if (btn.id === 'ffwd') btn.isPressed = (this.state === 'fast_forwarding');
      else if (btn.id === 'rew') btn.isPressed = (this.state === 'rewinding');
    }
  }

  /**
   * Renderiza o gravador em close-up no Canvas.
   * @param {CanvasRenderingContext2D} ctx Contexto Canvas 2D
   * @param {number} [width]
   * @param {number} [height]
   */
  render(ctx, width = null, height = null) {
    if (!this.isOpen && this.fadeAlpha <= 0) return;

    const w = width || ctx.canvas.width;
    const h = height || ctx.canvas.height;

    ctx.save();
    ctx.globalAlpha = Math.min(1, Math.max(0, this.fadeAlpha));

    // 1. Fundo do Gabinete e Mesa de Investigação
    ctx.fillStyle = '#08080c';
    ctx.fillRect(0, 0, w, h);

    // Dimensões do chassi do gravador japonês (proporção ~440x360)
    const chW = Math.min(480, w * 0.88);
    const chH = Math.min(400, h * 0.78);
    const chX = (w - chW) / 2;
    const chY = (h - chH) / 2 - 20;

    // 2. Chassi do Gravador de Microcassete (Metal Escovado & Grafite)
    this._renderChassis(ctx, chX, chY, chW, chH);

    // 3. Janela de Acrílico e Bobinas Mecânicas Giratórias
    this._renderCassetteBay(ctx, chX, chY, chW, chH);

    // 4. Indicador de Sinal VU Analógico (Agulha Dinâmica)
    this._renderVUMeter(ctx, chX + chW - 145, chY + 35, 120, 68);

    // 5. Contador Mecânico Analógico de 3 Dígitos
    this._renderCounter(ctx, chX + 35, chY + 38);

    // 6. Botões Físicos Tipo Teclado de Piano
    this._renderButtons(ctx, chX, chY + chH - 58, chW);

    // 7. Faixa de Transcrição Datilografada no Rodapé
    this._renderTranscriptionCard(ctx, w, chY + chH + 18);

    // 8. Botão Inferior de Fechar / Ejetar
    this._renderEjectButton(ctx, w, h);

    ctx.restore();
  }

  _renderChassis(ctx, x, y, w, h) {
    ctx.save();

    // Sombra pesada projetada na mesa
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(x + 10, y + 12, w, h);

    // Corpo metálico grafite com chanfros industriais
    const metalGrad = ctx.createLinearGradient(x, y, x + w, y + h);
    metalGrad.addColorStop(0.0, '#30303c');
    metalGrad.addColorStop(0.3, '#24242e');
    metalGrad.addColorStop(0.7, '#1d1d25');
    metalGrad.addColorStop(1.0, '#15151c');
    ctx.fillStyle = metalGrad;
    ctx.fillRect(x, y, w, h);

    // Moldura chanfrada de alumínio
    ctx.strokeStyle = '#454556';
    ctx.lineWidth = 2.0;
    ctx.strokeRect(x, y, w, h);

    // Friso decorativo roxo elétrico / âmbar clássico de 1989
    ctx.strokeStyle = '#7b2cbf';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x + 12, y + 26);
    ctx.lineTo(x + w - 12, y + 26);
    ctx.stroke();

    // Inscrições serigrafadas no aparelho estilo japonês
    ctx.font = '700 8.5px "Courier New", monospace';
    ctx.fillStyle = '#a0a0b0';
    ctx.fillText('MICROCASSETTE DICTAPHONE MODEL M-1989', x + 16, y + 20);
    ctx.textAlign = 'right';
    ctx.fillText('TOKYO ACOUSTICS CORP. / JAPAN', x + w - 16, y + 20);
    ctx.textAlign = 'left';

    // Parafusos industriais nos 4 cantos
    this._drawScrew(ctx, x + 8, y + 8);
    this._drawScrew(ctx, x + w - 8, y + 8);
    this._drawScrew(ctx, x + 8, y + h - 8);
    this._drawScrew(ctx, x + w - 8, y + h - 8);

    ctx.restore();
  }

  _drawScrew(ctx, sx, sy) {
    ctx.save();
    ctx.fillStyle = '#4e4e5e';
    ctx.beginPath();
    ctx.arc(sx, sy, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#181820';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(sx - 2, sy);
    ctx.lineTo(sx + 2, sy);
    ctx.stroke();
    ctx.restore();
  }

  _renderCassetteBay(ctx, chX, chY, chW, chH) {
    ctx.save();

    // Compartimento da fita (janela acrílica central)
    const bayW = chW - 60;
    const bayH = chH - 180;
    const bayX = chX + 30;
    const bayY = chY + 115;

    // Fundo escuro da cavidade mecânica
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(bayX, bayY, bayW, bayH);
    ctx.strokeStyle = '#1b1b24';
    ctx.lineWidth = 2.0;
    ctx.strokeRect(bayX, bayY, bayW, bayH);

    // Carcaça de plástico preto fosco da microfita
    const tapeX = bayX + 15;
    const tapeY = bayY + 12;
    const tapeW = bayW - 30;
    const tapeH = bayH - 24;

    ctx.fillStyle = this.cassetteData?.tapeColor || '#181820';
    ctx.fillRect(tapeX, tapeY, tapeW, tapeH);
    ctx.strokeStyle = '#323242';
    ctx.strokeRect(tapeX, tapeY, tapeW, tapeH);

    // Etiqueta branca/parda colada na fita com inscrição manual
    ctx.fillStyle = this.cassetteData?.labelColor || '#ded8ca';
    ctx.fillRect(tapeX + 12, tapeY + 8, tapeW - 24, tapeH * 0.36);

    ctx.font = '700 9px "Courier New", monospace';
    ctx.fillStyle = '#1c2d54';
    ctx.fillText(this.cassetteData?.title || 'FITA CASSETE — GRAVAÇÃO', tapeX + 18, tapeY + 22);

    ctx.font = 'italic 8px "Courier New", monospace';
    ctx.fillStyle = '#8a2b2b';
    ctx.fillText(this.cassetteData?.date || 'NORTHVALE POLICE ARCHIVE', tapeX + 18, tapeY + 34);

    // Janela transparente central da fita (onde se vê os carretéis)
    const winW = tapeW * 0.72;
    const winH = tapeH * 0.44;
    const winX = tapeX + (tapeW - winW) / 2;
    const winY = tapeY + tapeH * 0.48;

    ctx.fillStyle = 'rgba(10, 10, 15, 0.9)';
    ctx.fillRect(winX, winY, winW, winH);
    ctx.strokeStyle = '#48485a';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(winX, winY, winW, winH);

    // Cálculo das quantidades de fita enrolada em cada carretel
    // Conforme a fita toca, o rolo da esquerda diminui e o da direita aumenta
    const progress = Math.max(0, Math.min(1, this.tapePosition / this.tapeDuration));
    const leftRadius = 26 - progress * 14;
    const rightRadius = 12 + progress * 14;

    const leftHubX = winX + winW * 0.28;
    const rightHubX = winX + winW * 0.72;
    const hubY = winY + winH * 0.50;

    // Rolo de fita magnética marrom-escura (Supply Roll - Esquerda)
    ctx.fillStyle = '#2d1b10';
    ctx.beginPath();
    ctx.arc(leftHubX, hubY, leftRadius, 0, Math.PI * 2);
    ctx.fill();

    // Rolo de fita magnética marrom-escura (Take-up Roll - Direita)
    ctx.fillStyle = '#2d1b10';
    ctx.beginPath();
    ctx.arc(rightHubX, hubY, rightRadius, 0, Math.PI * 2);
    ctx.fill();

    // Bobinas brancas dentadas que giram em tempo real
    this._drawSpoolHub(ctx, leftHubX, hubY, this.tapeAngle);
    this._drawSpoolHub(ctx, rightHubX, hubY, this.tapeAngle);

    // Fita esticada entre os carretéis e cabeçote magnético
    ctx.strokeStyle = '#3a2215';
    ctx.lineWidth = 3.0;
    ctx.beginPath();
    ctx.moveTo(leftHubX, hubY + leftRadius * 0.75);
    ctx.lineTo(winX + 10, winY + winH - 2);
    ctx.lineTo(winX + winW - 10, winY + winH - 2);
    ctx.lineTo(rightHubX, hubY + rightRadius * 0.75);
    ctx.stroke();

    // Reflexo especular no acrílico transparente da janela
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(winX + 4, winY + 4);
    ctx.lineTo(winX + winW * 0.45, winY + winH - 4);
    ctx.stroke();

    ctx.restore();
  }

  _drawSpoolHub(ctx, cx, cy, angle) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    // Carretel de plástico branco
    ctx.fillStyle = '#f0eee9';
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#b8b4a8';
    ctx.lineWidth = 1.0;
    ctx.stroke();

    // Eixo central preto
    ctx.fillStyle = '#101014';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();

    // 3 dentes mecânicos de tração
    ctx.fillStyle = '#282834';
    for (let i = 0; i < 3; i++) {
      ctx.rotate((Math.PI * 2) / 3);
      ctx.fillRect(-1.5, -9, 3, 4);
    }

    ctx.restore();
  }

  _renderVUMeter(ctx, vx, vy, vw, vh) {
    ctx.save();

    // Painel do VU Meter Analógico
    ctx.fillStyle = '#0a0a0e';
    ctx.fillRect(vx, vy, vw, vh);

    // Retroiluminação âmbar fosforescente suave
    const dialGrad = ctx.createRadialGradient(vx + vw / 2, vy + vh, 10, vx + vw / 2, vy + vh, vw * 0.85);
    dialGrad.addColorStop(0.0, 'rgba(224, 169, 109, 0.45)');
    dialGrad.addColorStop(0.7, 'rgba(180, 120, 60, 0.22)');
    dialGrad.addColorStop(1.0, 'rgba(15, 12, 10, 0.9)');
    ctx.fillStyle = dialGrad;
    ctx.fillRect(vx + 2, vy + 2, vw - 4, vh - 4);

    ctx.strokeStyle = '#484438';
    ctx.lineWidth = 1.4;
    ctx.strokeRect(vx, vy, vw, vh);

    // Escala curvada de dB
    const pivotX = vx + vw / 2;
    const pivotY = vy + vh + 10;
    const needleLen = vh * 0.92;

    ctx.strokeStyle = '#d48b28';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.arc(pivotX, pivotY, needleLen - 4, -Math.PI * 0.72, -Math.PI * 0.28);
    ctx.stroke();

    // Setor vermelho de pico / distorção (> 0 dB)
    ctx.strokeStyle = '#e63946';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.arc(pivotX, pivotY, needleLen - 4, -Math.PI * 0.38, -Math.PI * 0.28);
    ctx.stroke();

    // Textos da escala
    ctx.font = '700 7px "Courier New", monospace';
    ctx.fillStyle = '#c5b58e';
    ctx.textAlign = 'center';
    ctx.fillText('VU', pivotX, vy + 15);
    ctx.fillText('-20  -10  -5  0  +3', pivotX, vy + 25);

    // Agulha do Galvanômetro
    // Mapeia vuLevel (0 a 1) para o ângulo (-0.72PI a -0.28PI)
    const minAngle = -Math.PI * 0.72;
    const maxAngle = -Math.PI * 0.28;
    const needleAngle = minAngle + this.vuLevel * (maxAngle - minAngle);

    ctx.save();
    ctx.translate(pivotX, pivotY);
    ctx.rotate(needleAngle);

    ctx.strokeStyle = '#e63946'; // Agulha vermelha
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -needleLen);
    ctx.stroke();
    ctx.restore();

    // LED de pico que acende em vermelho se o som passar do limite
    const isPeaking = this.vuLevel > 0.82;
    ctx.fillStyle = isPeaking ? '#ff1e38' : '#3a1215';
    ctx.beginPath();
    ctx.arc(vx + vw - 12, vy + 12, 3.0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  _renderCounter(ctx, cx, cy) {
    ctx.save();

    // Moldura do contador mecânico de 3 dígitos
    const boxW = 58;
    const boxH = 24;
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(cx, cy, boxW, boxH);
    ctx.strokeStyle = '#32323e';
    ctx.lineWidth = 1.4;
    ctx.strokeRect(cx, cy, boxW, boxH);

    // 3 roletes pretos com numeração branca
    const countStr = String(Math.floor(this.counter) % 1000).padStart(3, '0');
    const digitW = boxW / 3;

    ctx.font = '700 12px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < 3; i++) {
      const dx = cx + i * digitW;
      ctx.fillStyle = '#14141c';
      ctx.fillRect(dx + 1, cy + 1, digitW - 2, boxH - 2);

      ctx.fillStyle = '#ffffff';
      ctx.fillText(countStr[i], dx + digitW / 2, cy + boxH / 2 + 1);

      // Linha de divisão do rolete
      ctx.strokeStyle = '#050508';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(dx + digitW, cy);
      ctx.lineTo(dx + digitW, cy + boxH);
      ctx.stroke();
    }

    // Pino pequeno de Reset do contador à direita
    const pinX = cx + boxW + 14;
    const pinY = cy + boxH / 2;
    this.resetPinHitbox = { x: pinX, y: pinY, r: 7 };

    ctx.fillStyle = '#3a3a48';
    ctx.beginPath();
    ctx.arc(pinX, pinY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#181820';
    ctx.stroke();

    ctx.font = '700 7px "Courier New", monospace';
    ctx.fillStyle = '#8e8e9e';
    ctx.fillText('RESET', pinX, pinY - 8);

    ctx.restore();
  }

  _renderButtons(ctx, chX, by, chW) {
    ctx.save();

    const startX = chX + 35;
    const totalW = chW - 70;
    const gap = 8;
    const btnW = (totalW - gap * 3) / 4;

    for (let i = 0; i < this.buttons.length; i++) {
      const btn = this.buttons[i];
      btn.x = startX + i * (btnW + gap);
      btn.y = by;
      btn.w = btnW;
      btn.h = 42;

      const isPressed = btn.isPressed;
      const offsetY = isPressed ? 4 : 0;

      // Sombra da tecla de piano
      ctx.fillStyle = '#060608';
      ctx.fillRect(btn.x, btn.y + 4, btn.w, btn.h);

      // Corpo da tecla
      const btnGrad = ctx.createLinearGradient(btn.x, btn.y + offsetY, btn.x, btn.y + btn.h);
      if (isPressed) {
        btnGrad.addColorStop(0.0, '#1c1c24');
        btnGrad.addColorStop(1.0, '#101015');
      } else {
        btnGrad.addColorStop(0.0, '#424252');
        btnGrad.addColorStop(0.5, '#2e2e3a');
        btnGrad.addColorStop(1.0, '#1a1a24');
      }
      ctx.fillStyle = btnGrad;
      ctx.fillRect(btn.x, btn.y + offsetY, btn.w, btn.h - offsetY);

      ctx.strokeStyle = isPressed ? '#7b2cbf' : '#525266';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(btn.x, btn.y + offsetY, btn.w, btn.h - offsetY);

      // LED indicador na tecla de PLAY / STOP
      if (btn.id === 'play' && this.state === 'playing') {
        ctx.fillStyle = '#2a9d8f';
        ctx.fillRect(btn.x + btn.w / 2 - 6, btn.y + offsetY + 6, 12, 3);
      } else if (btn.id === 'stop' && this.state === 'stopped') {
        ctx.fillStyle = '#e63946';
        ctx.fillRect(btn.x + btn.w / 2 - 6, btn.y + offsetY + 6, 12, 3);
      }

      // Rótulo da tecla
      ctx.font = '700 11px "Courier New", monospace';
      ctx.fillStyle = isPressed ? '#e0a96d' : '#e6e4df';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + offsetY + btn.h / 2 + 3);
    }

    ctx.restore();
  }

  _renderTranscriptionCard(ctx, w, ty) {
    ctx.save();

    const cardW = Math.min(680, w * 0.90);
    const cardH = 50;
    const cardX = (w - cardW) / 2;

    ctx.fillStyle = 'rgba(10, 10, 14, 0.94)';
    ctx.fillRect(cardX, ty, cardW, cardH);
    ctx.strokeStyle = '#7b2cbf';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(cardX, ty, cardW, cardH);

    ctx.font = 'italic 700 11px "Courier New", Courier, monospace';
    ctx.fillStyle = this.state === 'playing' ? '#e0a96d' : '#8a8a9a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.currentTranscript, w / 2, ty + cardH / 2);

    ctx.restore();
  }

  _renderEjectButton(ctx, w, h) {
    ctx.save();
    const btnW = 220;
    const btnH = 32;
    const btnX = w / 2 - btnW / 2;
    const btnY = h - 48;

    this.ejectButtonHitbox = { x: btnX, y: btnY, w: btnW, h: btnH };

    ctx.fillStyle = 'rgba(18, 18, 24, 0.9)';
    ctx.strokeStyle = '#2d2d38';
    ctx.lineWidth = 1.0;
    ctx.fillRect(btnX, btnY, btnW, btnH);
    ctx.strokeRect(btnX, btnY, btnW, btnH);

    ctx.font = '700 10.5px "Courier New", Courier, monospace';
    ctx.fillStyle = '#d48b28';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('[ESC] GUARDAR GRAVADOR', w / 2, btnY + btnH / 2);

    ctx.restore();
  }

  /**
   * Processa qualquer evento de input (teclado, mouse).
   * @param {Event} e Evento de clique ou tecla
   */
  handleInput(e) {
    if (!this.isOpen) return false;

    if (e.type === 'click') {
      const x = e.clientX;
      const y = e.clientY;

      // 1. Botão de guardar/fechar
      const ej = this.ejectButtonHitbox;
      if (x >= ej.x && x <= ej.x + ej.w && y >= ej.y && y <= ej.y + ej.h) {
        this.close();
        return true;
      }

      // 2. Pino de reset do contador
      const rp = this.resetPinHitbox;
      if (Math.hypot(x - rp.x, y - rp.y) <= rp.r + 4) {
        this.counter = 0;
        this.tapePosition = 0;
        this.synth.playSFX('lockpick_tick');
        return true;
      }

      // 3. Teclas de piano (REW, FFWD, PLAY, STOP)
      for (const btn of this.buttons) {
        if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
          if (btn.id === 'play') this.setPlaybackState('playing');
          else if (btn.id === 'stop') this.setPlaybackState('stopped');
          else if (btn.id === 'ffwd') this.setPlaybackState('fast_forwarding');
          else if (btn.id === 'rew') this.setPlaybackState('rewinding');
          return true;
        }
      }
    } else if (e.type === 'keydown') {
      if (e.key === 'Escape') {
        this.close();
        return true;
      }
      if (e.key === ' ') {
        // Barra de espaço alterna entre PLAY e STOP
        if (this.state === 'playing') this.setPlaybackState('stopped');
        else this.setPlaybackState('playing');
        return true;
      }
    }

    return false;
  }
}
