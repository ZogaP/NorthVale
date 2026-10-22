/**
 * NorthVale: Sombras de 1989 — LockpickView.js
 * Direção de Arte Técnica: Minigame Analógico de Fechadura e Arrombamento (1989)
 *
 * Renderização pura via Canvas 2D:
 * 1. Placa de latão envelhecido, parafusos industriais oxidados e tambor rotativo concêntrico.
 * 2. Gazua (pick) e virador (tension wrench) em aço com fenda mecânica de chave.
 * 3. Tremor de metal em alta frequência e faíscas incandescentes de limalha de ferro sob estresse.
 * 4. HUD analógico com barra retroiluminada de integridade, contagem de gazuas sobressalentes e guia.
 */

export class LockpickView {
  /**
   * @param {Object} [options]
   * @param {number} [options.maxHealth=100] Integridade máxima da gazua
   */
  constructor(options = {}) {
    this.maxHealth = options.maxHealth ?? 100;
    this.pickHealth = this.maxHealth;
    this.picksRemaining = 3;

    // Estados físicos brutos recebidos da lógica
    this.plugAngle = 0;        // Rotação atual do tambor em graus (0° a 90°)
    this.pickAngle = 0;        // Ângulo da gazua em graus (-90° a +90°)
    this.tension = 0.0;        // Tensão aplicada no cilindro (0.0 a 1.0)
    this.isStressing = false;  // Se a gazua está forçada contra o ponto travado
    this.stressLevel = 0.0;    // Nível de estresse (0.0 a 1.0)
    this.isUnlocked = false;   // Fechadura aberta com sucesso
    this.isBroken = false;     // Gazua acabou de quebrar

    // Animações e tremor mecânico (Jitter)
    this.time = 0;
    this.jitterOffset = { x: 0, y: 0, rot: 0 };
    this.unlockGlow = 0;
    this.snapFlash = 0;

    // Pool de micro-partículas de limalha de ferro / faíscas
    this.maxSparks = 45;
    this.sparks = new Array(this.maxSparks);
    this._initSparks();
  }

  /**
   * Inicializa o pool de partículas incandescentes de limalha de ferro.
   * @private
   */
  _initSparks() {
    for (let i = 0; i < this.maxSparks; i++) {
      this.sparks[i] = {
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 0.3,
        size: 1.5,
        color: '#ffaa33',
        active: false
      };
    }
  }

  /**
   * Atualiza os estados brutos do minigame enviados pelo motor de jogo.
   * @param {Object} state
   */
  setState(state) {
    if (state.plugAngle !== undefined) this.plugAngle = state.plugAngle;
    if (state.pickAngle !== undefined) this.pickAngle = state.pickAngle;
    if (state.tension !== undefined) this.tension = state.tension;
    if (state.pickHealth !== undefined) this.pickHealth = state.pickHealth;
    if (state.picksRemaining !== undefined) this.picksRemaining = state.picksRemaining;
    if (state.isStressing !== undefined) this.isStressing = state.isStressing;
    if (state.stressLevel !== undefined) this.stressLevel = state.stressLevel;

    if (state.isUnlocked && !this.isUnlocked) {
      this.isUnlocked = true;
      this.unlockGlow = 1.0;
    }
    if (state.isBroken && !this.isBroken) {
      this.isBroken = true;
      this.snapFlash = 1.0;
      this._spawnBurstSparks();
    }
  }

  /**
   * Emite uma rajada de faíscas na quebra da gazua.
   * @private
   */
  _spawnBurstSparks() {
    for (let i = 0; i < 25; i++) {
      this._emitSpark(0, 0, (Math.random() - 0.5) * 220, -Math.random() * 260 - 50);
    }
  }

  /**
   * Emite uma micro-fagulha incandescente.
   * @private
   */
  _emitSpark(x, y, vx, vy) {
    for (let i = 0; i < this.maxSparks; i++) {
      const s = this.sparks[i];
      if (!s.active) {
        s.x = x;
        s.y = y;
        s.vx = vx;
        s.vy = vy;
        s.life = 0;
        s.maxLife = 0.2 + Math.random() * 0.25;
        s.size = 1.2 + Math.random() * 1.5;
        s.color = Math.random() < 0.6 ? '#ffaa33' : (Math.random() < 0.85 ? '#ffd460' : '#ff5533');
        s.active = true;
        break;
      }
    }
  }

  /**
   * Atualiza vibração mecânica, faíscas e transições visuais a 60 FPS.
   * @param {number} dt Delta time em segundos
   */
  update(dt) {
    this.time += dt;

    // Decaimento dos efeitos de brilho/quebra
    if (this.unlockGlow > 0) this.unlockGlow = Math.max(0, this.unlockGlow - dt * 2.0);
    if (this.snapFlash > 0) this.snapFlash = Math.max(0, this.snapFlash - dt * 2.5);

    // Cálculo do tremor de metal em alta frequência quando travado
    if (this.isStressing || this.stressLevel > 0.1) {
      const intensity = Math.max(this.stressLevel, this.isStressing ? 0.7 : 0.0);
      const shakeMag = intensity * 4.5;
      this.jitterOffset.x = (Math.random() - 0.5) * shakeMag;
      this.jitterOffset.y = (Math.random() - 0.5) * shakeMag;
      this.jitterOffset.rot = (Math.random() - 0.5) * (intensity * 3.5);

      // Solta fagulhas e limalha de ferro sob atrito
      if (Math.random() < intensity * 0.75) {
        const angleRad = (this.pickAngle - 90) * (Math.PI / 180);
        const spawnX = Math.cos(angleRad) * 60;
        const spawnY = Math.sin(angleRad) * 60;
        this._emitSpark(
          spawnX, spawnY,
          (Math.random() - 0.5) * 140,
          Math.random() * 80 - 40
        );
      }
    } else {
      this.jitterOffset.x = 0;
      this.jitterOffset.y = 0;
      this.jitterOffset.rot = 0;
    }

    // Física das partículas de faísca
    for (let i = 0; i < this.maxSparks; i++) {
      const s = this.sparks[i];
      if (!s.active) continue;

      s.life += dt;
      if (s.life >= s.maxLife) {
        s.active = false;
      } else {
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vy += 420 * dt; // Gravidade
      }
    }
  }

  /**
   * Renderiza a visão completa em close-up do minigame de fechadura.
   * @param {CanvasRenderingContext2D} ctx Contexto do canvas principal
   * @param {number} width Largura da tela
   * @param {number} height Altura da tela
   */
  render(ctx, width, height) {
    ctx.save();

    // 1. Vinheta escura neo-noir de fundo (Foco na fechadura)
    this._renderBackdrop(ctx, width, height);

    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2) - 10;
    const lockRadius = Math.min(190, Math.floor(Math.min(width, height) * 0.32));

    // 2. Placa de latão industrial e parafusos oxidados
    this._renderBrassPlate(ctx, centerX, centerY, lockRadius);

    // 3. Cilindro e Tambor rotativo (com fenda de chave e virador)
    this._renderCylinder(ctx, centerX, centerY, lockRadius);

    // 4. Faíscas de limalha de ferro
    this._renderSparks(ctx, centerX, centerY);

    // 5. Gazua (Haste e gancho de aço com micro-vibração)
    this._renderPick(ctx, centerX, centerY, lockRadius);

    // 6. HUD do Minigame (Integridade analógica, contagem e controles)
    this._renderHUD(ctx, width, height);

    ctx.restore();
  }

  /**
   * Vinheta escura e gradiente periférico (Gabinete Dark Slate).
   * @private
   */
  _renderBackdrop(ctx, width, height) {
    // Fundo Rich Black
    ctx.fillStyle = 'rgba(10, 10, 12, 0.95)';
    ctx.fillRect(0, 0, width, height);

    // Vinheta radial focada no miolo da fechadura
    const cx = width / 2;
    const cy = height / 2;
    const grad = ctx.createRadialGradient(cx, cy, 80, cx, cy, width * 0.65);
    grad.addColorStop(0, 'rgba(22, 22, 28, 0.0)');
    grad.addColorStop(0.7, 'rgba(12, 12, 15, 0.7)');
    grad.addColorStop(1, 'rgba(5, 5, 8, 0.98)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  /**
   * Desenha a chapa de latão envelhecido com parafusos industriais oxidados.
   * @private
   */
  _renderBrassPlate(ctx, cx, cy, r) {
    ctx.save();
    const plateW = r * 2.3;
    const plateH = r * 2.3;
    const px = cx - plateW / 2;
    const py = cy - plateH / 2;

    // Chapa quadrada de latão com cantos chanfrados
    const chamfer = 18;
    ctx.beginPath();
    ctx.moveTo(px + chamfer, py);
    ctx.lineTo(px + plateW - chamfer, py);
    ctx.lineTo(px + plateW, py + chamfer);
    ctx.lineTo(px + plateW, py + plateH - chamfer);
    ctx.lineTo(px + plateW - chamfer, py + plateH);
    ctx.lineTo(px + chamfer, py + plateH);
    ctx.lineTo(px, py + plateH - chamfer);
    ctx.lineTo(px, py + chamfer);
    ctx.closePath();

    // Gradiente de latão escovado e oxidado
    const brassGrad = ctx.createLinearGradient(px, py, px + plateW, py + plateH);
    brassGrad.addColorStop(0.0, '#544222');
    brassGrad.addColorStop(0.3, '#7d6333');
    brassGrad.addColorStop(0.7, '#483719');
    brassGrad.addColorStop(1.0, '#302410');
    ctx.fillStyle = brassGrad;
    ctx.fill();

    // Moldura chanfrada de ferro escuro
    ctx.strokeStyle = '#22190c';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Borda interna de realce de chanfro metálico
    ctx.strokeStyle = 'rgba(212, 139, 40, 0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 4 Parafusos industriais oxidados nas arestas da placa
    const screwOffset = 22;
    this._drawOxidizedScrew(ctx, px + screwOffset, py + screwOffset, 0.4);
    this._drawOxidizedScrew(ctx, px + plateW - screwOffset, py + screwOffset, 1.8);
    this._drawOxidizedScrew(ctx, px + screwOffset, py + plateH - screwOffset, 2.9);
    this._drawOxidizedScrew(ctx, px + plateW - screwOffset, py + plateH - screwOffset, 0.9);

    ctx.restore();
  }

  /**
   * Desenha parafuso oxidado de fenda simples em ângulo.
   * @private
   */
  _drawOxidizedScrew(ctx, x, y, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);

    // Cabeça do parafuso
    ctx.fillStyle = '#261f14';
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4a3b25';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Fenda entalhada
    ctx.fillStyle = '#0f0a04';
    ctx.fillRect(-5, -1.2, 10, 2.4);

    ctx.restore();
  }

  /**
   * Desenha o cilindro fixo de latão e o tambor giratório interno.
   * @private
   */
  _renderCylinder(ctx, cx, cy, lockR) {
    ctx.save();

    // Anel externo torneado (rebaixo concêntrico de latão escuro)
    const ringGrad = ctx.createRadialGradient(cx, cy, lockR * 0.6, cx, cy, lockR);
    ringGrad.addColorStop(0.0, '#423318');
    ringGrad.addColorStop(0.85, '#695128');
    ringGrad.addColorStop(1.0, '#2b210f');
    ctx.fillStyle = ringGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, lockR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1b1409';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Ranhuras circulares finas de usinagem tornada industrial
    ctx.strokeStyle = 'rgba(212, 139, 40, 0.15)';
    ctx.lineWidth = 1;
    for (let r = lockR * 0.7; r < lockR; r += 12) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // ================= TAMBOR INTERNO ROTATIVO (PLUG) =================
    const plugR = lockR * 0.62;
    ctx.save();
    ctx.translate(cx, cy);
    // Aplica a rotação do tambor
    ctx.rotate((this.plugAngle * Math.PI) / 180);

    // Disco do tambor interno
    const plugGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, plugR);
    plugGrad.addColorStop(0.0, '#785e2e');
    plugGrad.addColorStop(0.75, '#5c461f');
    plugGrad.addColorStop(1.0, '#36270e');
    ctx.fillStyle = plugGrad;
    ctx.beginPath();
    ctx.arc(0, 0, plugR, 0, Math.PI * 2);
    ctx.fill();

    // Borda chanfrada de corte do tambor
    ctx.strokeStyle = '#1d1509';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Entalhe da fenda da chave (Keyway)
    ctx.fillStyle = '#0a0a0c'; // Preto profundo
    ctx.beginPath();
    // Fenda vertical clássica de cilindro de pinos
    ctx.moveTo(-4, -plugR * 0.68);
    ctx.lineTo(4, -plugR * 0.68);
    ctx.lineTo(4, -plugR * 0.2);
    ctx.lineTo(6, -plugR * 0.15);
    ctx.lineTo(6, plugR * 0.35);
    ctx.lineTo(8, plugR * 0.45);
    ctx.lineTo(8, plugR * 0.72);
    ctx.lineTo(-8, plugR * 0.72);
    ctx.lineTo(-8, plugR * 0.45);
    ctx.lineTo(-6, plugR * 0.35);
    ctx.lineTo(-6, -plugR * 0.15);
    ctx.lineTo(-4, -plugR * 0.2);
    ctx.closePath();
    ctx.fill();

    // Chanfros metálicos de desgaste na boca da fenda
    ctx.strokeStyle = 'rgba(255, 230, 180, 0.22)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // ================= VIRADOR DE TENSÃO (TENSION WRENCH) =================
    this._renderTensionWrench(ctx, plugR);

    // Efeito de sucesso na rotação completa
    if (this.unlockGlow > 0.01) {
      ctx.fillStyle = `rgba(212, 139, 40, ${this.unlockGlow * 0.45})`;
      ctx.beginPath();
      ctx.arc(0, 0, plugR, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore(); // Fim da rotação do tambor
    ctx.restore();
  }

  /**
   * Renderiza a alavanca do virador inserida na fenda do tambor.
   * @private
   */
  _renderTensionWrench(ctx, plugR) {
    ctx.save();
    const wy = plugR * 0.55;

    // Haste de aço temperado inserida na base da fenda
    ctx.fillStyle = '#3c3f47';
    ctx.strokeStyle = '#1f2024';
    ctx.lineWidth = 1.2;

    ctx.beginPath();
    ctx.rect(-6, wy, 12, plugR * 0.6);
    ctx.fill();
    ctx.stroke();

    // Alavanca que projeta para baixo
    ctx.beginPath();
    ctx.moveTo(-6, wy + plugR * 0.6);
    ctx.lineTo(-14, wy + plugR * 1.5);
    ctx.lineTo(-6, wy + plugR * 1.5);
    ctx.lineTo(2, wy + plugR * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Brilho de chanfro de aço fosco
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.fillRect(-4, wy + 2, 2, plugR * 0.55);

    ctx.restore();
  }

  /**
   * Desenha a gazua (Lockpick) com gancho de precisão e micro-tremor de tensão.
   * @private
   */
  _renderPick(ctx, cx, cy, lockR) {
    if (this.isBroken) return; // Se quebrou, a haste não é desenhada inteira

    ctx.save();
    // Posição central acrescida do tremor de alta frequência (Jitter)
    const px = cx + this.jitterOffset.x;
    const py = cy + this.jitterOffset.y;
    ctx.translate(px, py);

    // Ângulo da gazua controlado pelo jogador
    const finalRot = this.pickAngle + this.jitterOffset.rot;
    ctx.rotate((finalRot * Math.PI) / 180);

    const pickLength = lockR * 1.5;

    // 1. Haste de aço carbono
    ctx.fillStyle = '#5c606a';
    ctx.strokeStyle = '#282a30';
    ctx.lineWidth = 1.0;

    ctx.beginPath();
    ctx.moveTo(-2.5, -pickLength);
    ctx.lineTo(2.5, -pickLength);
    ctx.lineTo(1.8, -15);
    ctx.lineTo(-1.8, -15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 2. Ponta em gancho de apalpamento curvo (Hook Pick)
    ctx.beginPath();
    ctx.moveTo(-1.8, -15);
    ctx.lineTo(1.8, -15);
    ctx.lineTo(1.5, 4);
    // Curvatura do gancho que entra no tambor
    ctx.quadraticCurveTo(8, 12, 10, 2);
    ctx.lineTo(8, -1);
    ctx.quadraticCurveTo(5, 5, 0, -2);
    ctx.lineTo(-1.8, -15);
    ctx.closePath();
    ctx.fillStyle = '#7a7f8c';
    ctx.fill();
    ctx.stroke();

    // 3. Cabo ergonômico texturizado no topo da haste
    const handleY = -pickLength - 55;
    ctx.fillStyle = '#1c1c22'; // Dark Slate fosco
    ctx.strokeStyle = '#7b2cbf'; // Friso roxo
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.rect(-6, handleY, 12, 55);
    ctx.fill();
    ctx.stroke();

    // Ranhuras antiderrapantes no cabo
    ctx.fillStyle = '#2d2d38';
    for (let hy = handleY + 6; hy < handleY + 50; hy += 6) {
      ctx.fillRect(-5, hy, 10, 2);
    }

    ctx.restore();
  }

  /**
   * Renderiza as faíscas de limalha de ferro incandescentes.
   * @private
   */
  _renderSparks(ctx, cx, cy) {
    ctx.save();
    ctx.translate(cx, cy);

    for (let i = 0; i < this.maxSparks; i++) {
      const s = this.sparks[i];
      if (!s.active) continue;

      const alpha = 1.0 - (s.life / s.maxLife);
      ctx.fillStyle = s.color;
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Renderiza a interface analógica do minigame (barra de integridade e dicas).
   * @private
   */
  _renderHUD(ctx, width, height) {
    ctx.save();

    // ================= 1. BARRA DE INTEGRIDADE DA GAZUA =================
    const barW = Math.min(320, width * 0.45);
    const barH = 14;
    const barX = Math.floor((width - barW) / 2);
    const barY = height - 90;

    const healthRatio = Math.max(0, Math.min(1, this.pickHealth / this.maxHealth));
    const isCritical = healthRatio < 0.25;

    // Rótulo da barra
    ctx.font = '700 11px "Courier New", Courier, monospace';
    ctx.textBaseline = 'bottom';
    if (isCritical) {
      // Alerta piscante em vermelho
      const flash = Math.sin(this.time * 12) > 0;
      ctx.fillStyle = flash ? '#e63946' : '#d48b28';
      ctx.fillText('[ALERTA: TENSÃO CRÍTICA NO METAL]', barX, barY - 4);
    } else {
      ctx.fillStyle = '#dcd8cf';
      ctx.fillText('INTEGRIDADE DA GAZUA:', barX, barY - 4);
    }

    // Porcentagem analógica à direita
    ctx.textAlign = 'right';
    ctx.fillStyle = isCritical ? '#e63946' : '#9d4edd';
    ctx.fillText(`${Math.round(healthRatio * 100)}%`, barX + barW, barY - 4);
    ctx.textAlign = 'left';

    // Fundo do trilho da barra (Dark Slate)
    ctx.fillStyle = '#121216';
    ctx.strokeStyle = isCritical ? '#e63946' : '#2d2d38';
    ctx.lineWidth = 1.2;
    ctx.fillRect(barX, barY, barW, barH);
    ctx.strokeRect(barX, barY, barW, barH);

    // Preenchimento com gradiente analógico
    if (healthRatio > 0) {
      const fillW = Math.floor(barW * healthRatio);
      const fillGrad = ctx.createLinearGradient(barX, barY, barX + fillW, barY);

      if (isCritical) {
        fillGrad.addColorStop(0.0, '#a81c28');
        fillGrad.addColorStop(1.0, '#e63946');
      } else {
        fillGrad.addColorStop(0.0, '#7b2cbf'); // Electric Purple
        fillGrad.addColorStop(0.7, '#9d4edd');
        fillGrad.addColorStop(1.0, '#d48b28'); // Âmbar
      }

      ctx.fillStyle = fillGrad;
      ctx.fillRect(barX + 2, barY + 2, Math.max(0, fillW - 4), barH - 4);

      // Divisões em segmentos analógicos (estilo display de led 1989)
      ctx.fillStyle = 'rgba(10, 10, 12, 0.45)';
      for (let sx = barX + 8; sx < barX + fillW; sx += 8) {
        ctx.fillRect(sx, barY + 2, 1.5, barH - 4);
      }
    }

    // ================= 2. CONTADOR DE GAZUAS SOBRESSALENTES =================
    const countY = barY + 24;
    ctx.font = '600 11px "Courier New", Courier, monospace';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#6e6a75';
    ctx.fillText('GAZUAS SOBRESSALENTES: ', barX, countY);

    // Marcadores estilizados em riscas romanas [ | | | ]
    let pIcons = '';
    for (let p = 0; p < this.picksRemaining; p++) {
      pIcons += '| ';
    }
    const iconOffset = ctx.measureText('GAZUAS SOBRESSALENTES: ').width;
    ctx.fillStyle = '#d48b28';
    ctx.fillText(`[ ${pIcons.trim()} ]`, barX + iconOffset, countY);

    // ================= 3. GUIA DE CONTROLES DIEGÉTICOS =================
    const guideY = height - 26;
    ctx.font = '500 11px "Courier New", Courier, monospace';
    ctx.fillStyle = '#6e6a75';
    ctx.textAlign = 'center';
    ctx.fillText(
      '[MOUSE] Posicionar Gazua   |   [ESPAÇO / A-D] Forçar Cilindro   |   [ESC] Abortar',
      width / 2, guideY
    );

    // Mensagem de Feedback de Quebra ou Sucesso
    if (this.isUnlocked) {
      ctx.font = '700 16px "Courier New", Courier, monospace';
      ctx.fillStyle = '#d48b28';
      ctx.fillText('* CLACK! TRAVA LIBERADA *', width / 2, height / 2 - 170);
    } else if (this.isBroken) {
      ctx.font = '700 16px "Courier New", Courier, monospace';
      ctx.fillStyle = '#e63946';
      ctx.fillText('* SNAP! GAZUA PARTIDA *', width / 2, height / 2 - 170);
    }

    ctx.restore();
  }
}
