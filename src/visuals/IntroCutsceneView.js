/**
 * NorthVale: Sombras de 1989 — IntroCutsceneView.js
 * Direção de Arte Técnica: Prólogo Cinematográfico Diegético no Canvas 2D (1989)
 *
 * Módulo puro em Canvas 2D desacoplado (sem dependências externas):
 * 1. Visão em primeira pessoa do interior do Chevrolet de Alex Hale sob tempestade torrencial.
 * 2. Painel analógico retrô: velocímetro iluminado em âmbar, rádio policial verde e retrovisor.
 * 3. Vidro molhado com palheta de limpador de para-brisa funcional balançando ritmicamente.
 * 4. Fases narrativas em fading tipográfico datilografado e transição suave para o jogo.
 */

export class IntroCutsceneView {
  constructor() {
    this.isActive = false;
    this.time = 0;
    this.duration = 16.0; // Duração total em segundos
    this.onCompleteCallback = null;

    // Transição de fade (fade-in inicial e fade-out final)
    this.fadeAlpha = 1.0; // Começa preto e clareia

    // Limpador de para-brisa mecânico
    this.wiperAngle = 0;
    this.wiperSpeed = 2.4; // Frequência do ciclo de varredura
    this.wiperMaxAngle = 0.68; // Radianos

    // Gotas d'água no vidro do para-brisa
    this.glassDroplets = [];
    for (let i = 0; i < 70; i++) {
      this.glassDroplets.push({
        x: Math.random(),
        y: Math.random(),
        r: 1.5 + Math.random() * 3.0,
        streak: 2 + Math.random() * 12,
        alpha: 0.4 + Math.random() * 0.4
      });
    }

    // Sequências narrativas de texto datilografado
    this.narrativeLines = [
      { start: 0.6, end: 4.2, text: 'CONDADO DE NORTHVALE — 14 DE OUTUBRO DE 1989' },
      { start: 4.4, end: 8.0, text: 'A CHUVA NÃO DÁ TRÉGUA NESTA PARTE DO VALE.' },
      { start: 8.2, end: 12.0, text: 'UMA LIGAÇÃO ANÔNIMA ÀS 18:31. O DESAPARECIMENTO DE SARAH MILLER.' },
      { start: 12.2, end: 15.6, text: 'DESTINO: DELEGACIA DE POLÍCIA DO DISTRITO CENTRAL.' }
    ];

    // Faróis de carros e postes passando
    this.roadLightPhase = 0;
  }

  /**
   * Inicia o prólogo cinematográfico.
   * @param {Function} [onComplete] Callback chamado ao término da cutscene
   */
  start(onComplete = null) {
    this.isActive = true;
    this.time = 0;
    this.fadeAlpha = 1.0;
    this.onCompleteCallback = onComplete;
  }

  /**
   * Pula a cutscene imediatamente.
   */
  skip() {
    if (!this.isActive) return;
    this.isActive = false;
    if (this.onCompleteCallback) {
      this.onCompleteCallback();
    }
  }

  /**
   * Atualiza a física do limpador, rádio, gotas e timers narrativos.
   * @param {number} dt Delta time em segundos
   */
  update(dt) {
    if (!this.isActive) return;
    this.time += dt;

    // Fade-in inicial nos primeiros 1.5s
    if (this.time < 1.5) {
      this.fadeAlpha = 1.0 - (this.time / 1.5);
    }
    // Fade-out final nos últimos 1.5s
    else if (this.time > this.duration - 1.5) {
      this.fadeAlpha = (this.time - (this.duration - 1.5)) / 1.5;
    } else {
      this.fadeAlpha = 0.0;
    }

    // Movimento do limpador de para-brisa (onda senoidal contínua)
    this.wiperAngle = Math.sin(this.time * this.wiperSpeed) * this.wiperMaxAngle;

    // Gotas escorrendo no vidro
    for (const d of this.glassDroplets) {
      d.y += dt * 0.12 * (d.r / 2);
      if (d.y > 1.0) {
        d.y = -0.05;
        d.x = Math.random();
      }
    }

    // Postes e luzes passando pela estrada
    this.roadLightPhase += dt * 1.8;

    // Encerra ao atingir duração
    if (this.time >= this.duration) {
      this.skip();
    }
  }

  /**
   * Renderiza a cena cinematográfica em primeira pessoa.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} width
   * @param {number} height
   */
  render(ctx, width, height) {
    if (!this.isActive) return;

    ctx.save();

    // 1. Estrada Noturna, Asfalto Molhado e Faróis Dianteiros
    this._renderRoadAndHeadlights(ctx, width, height);

    // 2. Vidro do Para-Brisa com Gotículas de Chuva
    this._renderWindshieldRain(ctx, width, height);

    // 3. Palheta Articulada do Limpador de Para-Brisa em Movimento
    this._renderWindshieldWiper(ctx, width, height);

    // 4. Painel do Chevrolet 1989 (Velocímetro, Rádio Verde e Volante)
    this._renderDashboard(ctx, width, height);

    // 5. Retrovisor Central com Silhueta de Alex Hale
    this._renderRearviewMirror(ctx, width);

    // 6. Textos Narrativos Cinematográficos em Fading
    this._renderNarrativeText(ctx, width, height);

    // 7. Cortina de Fade In / Fade Out
    if (this.fadeAlpha > 0.01) {
      ctx.fillStyle = `rgba(8, 8, 10, ${Math.min(1, this.fadeAlpha)})`;
      ctx.fillRect(0, 0, width, height);
    }

    // 8. Dica de Pular no Canto Inferior Direito
    ctx.font = '500 10px "Courier New", Courier, monospace';
    ctx.fillStyle = 'rgba(214, 210, 196, 0.45)';
    ctx.textAlign = 'right';
    ctx.fillText('[ESPAÇO / ENTER] Pular Prólogo', width - 24, height - 16);

    ctx.restore();
  }

  /**
   * Renderiza a estrada noturna e o cone de farol cortando a chuva.
   * @private
   */
  _renderRoadAndHeadlights(ctx, w, h) {
    // Fundo escuro exterior
    ctx.fillStyle = '#060608';
    ctx.fillRect(0, 0, w, h);

    const vpX = w / 2;
    const vpY = h * 0.45;

    // Feixe luminoso dos faróis do carro iluminando o asfalto à frente
    const beamGrad = ctx.createRadialGradient(vpX, h * 0.65, 40, vpX, h * 0.65, w * 0.55);
    beamGrad.addColorStop(0.0, 'rgba(235, 205, 140, 0.45)'); // Âmbar quente
    beamGrad.addColorStop(0.4, 'rgba(180, 160, 110, 0.22)');
    beamGrad.addColorStop(1.0, 'rgba(10, 10, 14, 0.0)');
    ctx.fillStyle = beamGrad;
    ctx.fillRect(0, 0, w, h);

    // Linhas de asfalto molhado correndo para baixo (perspectiva)
    ctx.strokeStyle = 'rgba(212, 139, 40, 0.28)';
    ctx.lineWidth = 3;
    const dashOffset = (this.time * 800) % 180;
    for (let dy = vpY; dy < h * 0.72; dy += 60) {
      const curY = dy + dashOffset * ((dy - vpY) / (h * 0.3));
      if (curY > vpY && curY < h * 0.72) {
        ctx.beginPath();
        ctx.moveTo(vpX - 2, curY);
        ctx.lineTo(vpX + 2, curY + 22);
        ctx.stroke();
      }
    }

    // Poste de iluminação passando pela direita
    const polePhase = (this.roadLightPhase % 1.0);
    const poleX = w * (0.65 + polePhase * 0.4);
    const poleY = h * (0.35 + polePhase * 0.25);
    const poleAlpha = Math.sin(polePhase * Math.PI) * 0.6;

    if (poleAlpha > 0.05) {
      const lampGrad = ctx.createRadialGradient(poleX, poleY, 2, poleX, poleY, 95);
      lampGrad.addColorStop(0.0, `rgba(235, 170, 60, ${poleAlpha})`);
      lampGrad.addColorStop(0.5, `rgba(180, 90, 20, ${poleAlpha * 0.4})`);
      lampGrad.addColorStop(1.0, 'rgba(0,0,0,0)');
      ctx.fillStyle = lampGrad;
      ctx.beginPath();
      ctx.arc(poleX, poleY, 95, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * Gotas de chuva no para-brisa.
   * @private
   */
  _renderWindshieldRain(ctx, w, h) {
    ctx.save();
    for (const d of this.glassDroplets) {
      const dx = d.x * w;
      const dy = d.y * (h * 0.7);

      // Corpo da gota
      ctx.fillStyle = `rgba(215, 230, 255, ${d.alpha})`;
      ctx.beginPath();
      ctx.ellipse(dx, dy, d.r, d.r * 1.5, 0.1, 0, Math.PI * 2);
      ctx.fill();

      // Rastro d'água escorrendo
      ctx.strokeStyle = `rgba(180, 200, 235, ${d.alpha * 0.35})`;
      ctx.lineWidth = d.r * 0.6;
      ctx.beginPath();
      ctx.moveTo(dx, dy - d.streak);
      ctx.lineTo(dx, dy);
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * Limpador de para-brisa animado e zona limpa da água.
   * @private
   */
  _renderWindshieldWiper(ctx, w, h) {
    ctx.save();
    const pivotX = w * 0.38;
    const pivotY = h * 0.68;
    const armLen = h * 0.46;

    ctx.translate(pivotX, pivotY);
    ctx.rotate(this.wiperAngle - 0.35);

    // Braço metálico do limpador
    ctx.strokeStyle = '#1b1b22';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -armLen);
    ctx.stroke();

    // Haste de fixação central
    ctx.strokeStyle = '#2d2d38';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(0, -armLen * 0.3);
    ctx.lineTo(0, -armLen);
    ctx.stroke();

    // Palheta de borracha (perpendicular na ponta)
    ctx.strokeStyle = '#0f0f14';
    ctx.lineWidth = 4.0;
    ctx.beginPath();
    ctx.moveTo(-16, -armLen);
    ctx.lineTo(16, -armLen);
    ctx.stroke();

    // Friso de água acumulada na borda da palheta
    ctx.strokeStyle = 'rgba(220, 240, 255, 0.55)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-18, -armLen - 1);
    ctx.lineTo(18, -armLen - 1);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Renderiza o painel do Chevrolet (Velocímetro analógico e rádio policial).
   * @private
   */
  _renderDashboard(ctx, w, h) {
    ctx.save();
    const dashY = h * 0.65;

    // 1. Textura de couro/vinil escuro do painel (#121217)
    const dashGrad = ctx.createLinearGradient(0, dashY, 0, h);
    dashGrad.addColorStop(0.0, '#1c1c24');
    dashGrad.addColorStop(0.12, '#121217');
    dashGrad.addColorStop(1.0, '#09090c');
    ctx.fillStyle = dashGrad;
    ctx.fillRect(0, dashY, w, h - dashY);

    // Friso cromado do para-brisa
    ctx.strokeStyle = '#2f303a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, dashY);
    ctx.lineTo(w, dashY);
    ctx.stroke();

    // 2. Velocímetro Analógico Iluminado em Âmbar (Lado Esquerdo)
    const gaugeX = w * 0.28;
    const gaugeY = dashY + (h - dashY) * 0.45;
    const gaugeR = 48;

    // Fundo do mostrador
    ctx.fillStyle = '#0c0c10';
    ctx.beginPath();
    ctx.arc(gaugeX, gaugeY, gaugeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#444455';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Escala de marcações em MPH (Âmbar suave)
    ctx.strokeStyle = '#d48b28';
    ctx.lineWidth = 1.2;
    for (let a = Math.PI * 0.75; a <= Math.PI * 2.25; a += 0.28) {
      const x1 = gaugeX + Math.cos(a) * (gaugeR - 8);
      const y1 = gaugeY + Math.sin(a) * (gaugeR - 8);
      const x2 = gaugeX + Math.cos(a) * (gaugeR - 2);
      const y2 = gaugeY + Math.sin(a) * (gaugeR - 2);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Texto MPH
    ctx.font = '700 8px "Courier New", monospace';
    ctx.fillStyle = '#d48b28';
    ctx.textAlign = 'center';
    ctx.fillText('MPH', gaugeX, gaugeY + 22);

    // Ponteiro oscilando em torno de 45 MPH
    const needleAngle = Math.PI * 1.35 + Math.sin(this.time * 6) * 0.06;
    ctx.strokeStyle = '#e63946'; // Vermelho
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(gaugeX, gaugeY);
    ctx.lineTo(gaugeX + Math.cos(needleAngle) * (gaugeR - 10), gaugeY + Math.sin(needleAngle) * (gaugeR - 10));
    ctx.stroke();

    // Tampa central do ponteiro
    ctx.fillStyle = '#16161a';
    ctx.beginPath();
    ctx.arc(gaugeX, gaugeY, 5, 0, Math.PI * 2);
    ctx.fill();

    // 3. Rádio AM/FM Policial (Display Verde Fluorescente no Centro)
    const radioX = w * 0.48;
    const radioY = dashY + 18;
    const radioW = 190;
    const radioH = 46;

    ctx.fillStyle = '#181820';
    ctx.strokeStyle = '#2b2b38';
    ctx.lineWidth = 1.4;
    ctx.fillRect(radioX - radioW / 2, radioY, radioW, radioH);
    ctx.strokeRect(radioX - radioW / 2, radioY, radioW, radioH);

    // Visor verde fluorescente (#2ec4b6 / #52b788)
    const dispW = radioW - 28;
    const dispH = 24;
    ctx.fillStyle = '#081c16';
    ctx.fillRect(radioX - dispW / 2, radioY + 6, dispW, dispH);

    ctx.font = '700 10px "Courier New", Courier, monospace';
    ctx.fillStyle = '#38b000'; // Verde fósforo
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('89.1 FM — POLÍCIA NV', radioX, radioY + 18);

    // Barras de equalizador piscando
    ctx.fillStyle = '#38b000';
    for (let b = 0; b < 6; b++) {
      const barH = 3 + Math.abs(Math.sin(this.time * 8 + b)) * 9;
      ctx.fillRect(radioX - dispW / 2 + 6 + b * 4, radioY + 22 - barH, 2.5, barH);
    }

    // 4. Volante no Canto Inferior Esquerdo
    const wheelX = w * 0.22;
    const wheelY = h + 20;
    const wheelR = h * 0.32;
    ctx.strokeStyle = '#0c0c10';
    ctx.lineWidth = 26;
    ctx.beginPath();
    ctx.arc(wheelX, wheelY, wheelR, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();

    ctx.strokeStyle = '#202028';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(wheelX, wheelY, wheelR - 12, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Retrovisor central refletindo a silhueta do detetive.
   * @private
   */
  _renderRearviewMirror(ctx, w) {
    ctx.save();
    const rw = 160;
    const rh = 42;
    const rx = w / 2 - rw / 2;
    const ry = 22;

    // Haste metálica do teto
    ctx.strokeStyle = '#181820';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, ry);
    ctx.stroke();

    // Moldura do espelho
    ctx.fillStyle = '#101016';
    ctx.strokeStyle = '#2c2d38';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(rx, ry, rw, rh, 6);
    ctx.fill();
    ctx.stroke();

    // Espelho retrovisor escurecido (visão noturna)
    ctx.fillStyle = '#141720';
    ctx.beginPath();
    ctx.roundRect(rx + 3, ry + 3, rw - 6, rh - 6, 4);
    ctx.fill();

    // Olhar e chapéu de Alex Hale na penumbra
    ctx.fillStyle = '#1f202c';
    ctx.beginPath();
    ctx.arc(w / 2, ry + 22, 14, 0, Math.PI * 2);
    ctx.fill();

    // Aba do chapéu
    ctx.fillStyle = '#0d0d12';
    ctx.fillRect(w / 2 - 28, ry + 12, 56, 5);

    // Brilho frio nos olhos
    ctx.fillStyle = 'rgba(72, 149, 239, 0.4)';
    ctx.fillRect(w / 2 - 8, ry + 20, 3, 2);
    ctx.fillRect(w / 2 + 5, ry + 20, 3, 2);

    ctx.restore();
  }

  /**
   * Renderiza os textos narrativos em fading tipográfico centralizado.
   * @private
   */
  _renderNarrativeText(ctx, w, h) {
    ctx.save();
    const curTime = this.time;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const item of this.narrativeLines) {
      if (curTime >= item.start && curTime <= item.end) {
        const elapsed = curTime - item.start;
        const dur = item.end - item.start;

        // Fade in (0.6s), estável, fade out (0.6s)
        let alpha = 1.0;
        if (elapsed < 0.6) alpha = elapsed / 0.6;
        else if (elapsed > dur - 0.6) alpha = (dur - elapsed) / 0.6;

        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

        // Barra de fundo translúcida cinematográfica
        ctx.fillStyle = 'rgba(8, 8, 12, 0.75)';
        ctx.fillRect(w * 0.1, h * 0.38 - 18, w * 0.8, 36);

        ctx.font = '700 14px "Courier New", Courier, monospace';
        ctx.fillStyle = '#ede6d6'; // Off-white de máquina
        ctx.fillText(item.text, w / 2, h * 0.38);

        break;
      }
    }
    ctx.restore();
  }
}
