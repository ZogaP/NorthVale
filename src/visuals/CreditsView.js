/**
 * NorthVale: Sombras de 1989 — CreditsView.js
 * Direção de Arte Técnica: Tela de Encerramento e Agradecimentos Especiais (1989)
 *
 * Módulo puro em Canvas 2D desacoplado (sem dependências externas):
 * - Estética cinematográfica sóbria de filme policial de época (1989).
 * - Rolagem vertical contínua a velocidade suave (~30 px/s) com suporte a aceleração [ESPAÇO].
 * - Tipografia mecânica Courier New com hierarquia editorial: títulos em roxo (#7b2cbf),
 *   nomes em off-white (#e6e4df) e dedicatórias em cinza-âmbar (#9e998d).
 * - Poeira estática flutuante, granulação analógica e logo final pulsante "1989 — 2026".
 * - Pressionar [ESC] permite pular apenas após 5 segundos de exibição.
 */

export class CreditsView {
  /**
   * @param {HTMLCanvasElement} [canvas] Referência opcional ao canvas principal
   */
  constructor(canvas = null) {
    this.canvas = canvas;
    this.isActive = false;
    this.time = 0;
    this.scrollY = 0;
    this.scrollSpeed = 32; // Pixels por segundo (velocidade confortável de leitura)
    this.fastForwardMultiplier = 1.0;
    this.onCompleteCallback = null;

    // Temporizador de segurança para permitir pular com ESC
    this.escAllowedTimer = 0.0;
    this.canSkip = false;

    // Transição de fade in e fade out
    this.fadeAlpha = 1.0;
    this.isExiting = false;

    // Poeira estática flutuando no ar da sala de projeção
    this.dustParticles = [];
    for (let i = 0; i < 40; i++) {
      this.dustParticles.push({
        x: Math.random(),
        y: Math.random(),
        r: 0.6 + Math.random() * 1.4,
        alpha: 0.15 + Math.random() * 0.35,
        speedX: (Math.random() - 0.5) * 0.015,
        speedY: -0.01 - Math.random() * 0.02,
        phase: Math.random() * Math.PI * 2
      });
    }

    // Cache da granulação analógica
    this.grainCanvas = null;
    this._initFilmGrain();

    // Estrutura editorial dos créditos
    this.creditsData = this._getEditorialCredits();

    // Métricas de layout
    this.totalHeight = 0;
    this.isFinishedScrolling = false;
    this.finalePauseTimer = 0;
  }

  /**
   * Pré-renderiza textura de ruído analógico.
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
      d[i + 3] = (Math.random() * 45) | 0;
    }
    ctx.putImageData(imgData, 0, 0);
    this.grainCanvas = off;
  }

  /**
   * Retorna os blocos de texto dos créditos oficiais formatados.
   * @private
   */
  _getEditorialCredits() {
    return [
      { type: 'spacer', height: 120 },

      // TÍTULO DO PROJETO
      { type: 'title', text: 'NORTHVALE: SOMBRAS DE 1989' },
      { type: 'subtitle', text: 'Uma Produção Independente' },
      { type: 'divider' },

      // DESENVOLVIMENTO & DIREÇÃO
      { type: 'header', text: 'DESENVOLVIMENTO & DIREÇÃO' },
      { type: 'name', text: 'Miguel dos Santos Rodrigues' },
      { type: 'divider' },

      // COLABORAÇÃO TÉCNICA
      { type: 'header', text: 'COLABORAÇÃO DE PROJETO & PROGRAMAÇÃO' },
      { type: 'name', text: 'Felipe Giron' },
      { type: 'quote', text: '"Pela parceria técnica, suporte na lógica e contribuição fundamental nas ideias."' },
      { type: 'spacer', height: 40 },

      // ROTEIRO E NARRATIVA
      { type: 'header', text: 'ROTEIRO, NARRATIVA & MUNDO' },
      { type: 'name', text: 'Thiago Müller' },
      { type: 'quote', text: '"Pela construção do universo, revisão dos diálogos e força criativa na história."' },
      { type: 'divider' },

      // AGRADECIMENTOS ESPECIAIS & FAMÍLIA
      { type: 'header_main', text: 'AGRADECIMENTOS ESPECIAIS & FAMÍLIA' },
      { type: 'spacer', height: 20 },

      { type: 'dedication_label', text: 'Aos meus pais,' },
      { type: 'name', text: 'Marcel Rodrigues & Erica Oliveira' },
      { type: 'quote', text: 'Pelo amor incondicional, pelo incentivo diário e por acreditarem no meu caminho antes de qualquer outro.' },
      { type: 'spacer', height: 36 },

      { type: 'dedication_label', text: 'Às minhas irmãs,' },
      { type: 'name', text: 'Julia Rodrigues & Giovana Rodrigues' },
      { type: 'quote', text: 'Por estarem sempre ao meu lado, pela paciência e pela companhia em cada etapa.' },
      { type: 'spacer', height: 36 },

      { type: 'dedication_label', text: 'Aos meus avós,' },
      { type: 'name', text: 'Mario, Gracinha & Conceição' },
      { type: 'quote', text: 'Pelas raízes, pelo carinho e pelas bênçãos que me trouxeram até aqui.' },
      { type: 'spacer', height: 36 },

      { type: 'dedication_label', text: 'Com todo o meu amor, à minha namorada,' },
      { type: 'name_highlight', text: 'Isabela Miranda' },
      { type: 'quote', text: 'Pelo apoio incansável, pela cumplicidade, pelo refúgio nos dias difíceis e por caminhar comigo.' },
      { type: 'divider' },

      // MENSAGEM FINAL AOS JOGADORES
      { type: 'body', text: 'A todos os amigos e àqueles que, de alguma forma, acreditaram neste projeto:' },
      { type: 'body_bold', text: 'Este jogo não existiria sem vocês.' },
      { type: 'spacer', height: 48 },

      { type: 'thanks', text: 'Obrigado por jogar NorthVale.' },
      { type: 'years', text: '1989 — 2026' },
      { type: 'spacer', height: 180 }
    ];
  }

  /**
   * Inicia a reprodução dos créditos com callback de conclusão.
   * @param {Function} [onComplete] Callback chamado ao término dos créditos
   */
  start(onComplete = null) {
    this.isActive = true;
    this.time = 0;
    this.scrollY = 0;
    this.escAllowedTimer = 0.0;
    this.canSkip = false;
    this.fadeAlpha = 1.0;
    this.isExiting = false;
    this.isFinishedScrolling = false;
    this.finalePauseTimer = 0;
    this.onCompleteCallback = onComplete;
  }

  /**
   * Encerra a tela e aciona o callback.
   */
  exit() {
    if (this.isExiting) return;
    this.isExiting = true;
  }

  /**
   * Atualiza a rolagem vertical suave e os temporizadores a 60 FPS.
   * @param {number} dt Delta time em segundos
   */
  update(dt) {
    if (!this.isActive) return;
    this.time += dt;

    // Fade in inicial suave nos primeiros 1.2 segundos
    if (!this.isExiting && this.fadeAlpha > 0) {
      this.fadeAlpha = Math.max(0, this.fadeAlpha - dt * 1.5);
    }

    // Fade out de saída
    if (this.isExiting) {
      this.fadeAlpha = Math.min(1.0, this.fadeAlpha + dt * 2.5);
      if (this.fadeAlpha >= 1.0) {
        this.isActive = false;
        if (this.onCompleteCallback) {
          this.onCompleteCallback();
        }
        return;
      }
    }

    // Temporizador de 5 segundos para desbloquear a tecla ESC
    if (!this.canSkip) {
      this.escAllowedTimer += dt;
      if (this.escAllowedTimer >= 5.0) {
        this.canSkip = true;
      }
    }

    // Atualiza poeira estática suspensa
    for (const p of this.dustParticles) {
      p.phase += dt * 1.2;
      p.x += (p.speedX + Math.sin(p.phase) * 0.005) * dt;
      p.y += p.speedY * dt;
      if (p.y < 0) p.y = 1.0;
      if (p.x < 0) p.x = 1.0;
      if (p.x > 1.0) p.x = 0;
    }

    // Avanço da rolagem vertical
    if (!this.isFinishedScrolling) {
      const currentSpeed = this.scrollSpeed * this.fastForwardMultiplier;
      this.scrollY += currentSpeed * dt;

      // Se passou da altura total do conteúdo
      if (this.totalHeight > 0 && this.scrollY >= this.totalHeight) {
        this.scrollY = this.totalHeight;
        this.isFinishedScrolling = true;
      }
    } else {
      // Repousa no logo final "NORTHVALE" com pulso
      this.finalePauseTimer += dt;
    }
  }

  /**
   * Renderiza os créditos cinematográficos na tela.
   * @param {CanvasRenderingContext2D} ctx Contexto Canvas 2D
   * @param {number} [width]
   * @param {number} [height]
   */
  render(ctx, width, height) {
    if (!this.isActive) return;

    const w = width || (this.canvas ? this.canvas.width : ctx.canvas.width);
    const h = height || (this.canvas ? this.canvas.height : ctx.canvas.height);

    ctx.save();

    // 1. Fundo Preto Profundo (#08080a) com Vinheta Radial Escura
    this._renderBackdrop(ctx, w, h);

    // 2. Poeira Estática Flutuante em Tons Cinza-Chumbo
    this._renderDust(ctx, w, h);

    // 3. Renderização dos Textos com Rolagem Suave
    this._renderScrollingContent(ctx, w, h);

    // 4. Granulação Analógica (Film Grain de Película 1989)
    this._renderFilmGrain(ctx, w, h);

    // 5. Indicador Superior de Pular [ESC] (apenas após 5s)
    if (this.canSkip && !this.isFinishedScrolling) {
      this._renderSkipPrompt(ctx, w);
    }

    // 6. Cortina de Fade In / Fade Out
    if (this.fadeAlpha > 0.01) {
      ctx.fillStyle = `rgba(8, 8, 10, ${this.fadeAlpha})`;
      ctx.fillRect(0, 0, w, h);
    }

    ctx.restore();
  }

  /**
   * Fundo preto com vinheta radial profunda.
   * @private
   */
  _renderBackdrop(ctx, w, h) {
    ctx.fillStyle = '#08080a';
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const vignette = ctx.createRadialGradient(cx, cy, Math.min(w, h) * 0.35, cx, cy, Math.max(w, h) * 0.75);
    vignette.addColorStop(0.0, 'rgba(0, 0, 0, 0.0)');
    vignette.addColorStop(0.65, 'rgba(4, 4, 6, 0.55)');
    vignette.addColorStop(1.0, 'rgba(2, 2, 3, 0.95)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
  }

  /**
   * Partículas de poeira estática flutuando devagar em tons cinza-chumbo.
   * @private
   */
  _renderDust(ctx, w, h) {
    ctx.save();
    for (const p of this.dustParticles) {
      const px = p.x * w;
      const py = p.y * h;
      ctx.fillStyle = `rgba(160, 160, 175, ${p.alpha * 0.6})`;
      ctx.beginPath();
      ctx.arc(px, py, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /**
   * Renderiza todos os blocos de texto dos créditos com a rolagem vertical.
   * @private
   */
  _renderScrollingContent(ctx, w, h) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const centerX = w / 2;
    const startY = h - this.scrollY;

    let curY = startY;

    for (let i = 0; i < this.creditsData.length; i++) {
      const item = this.creditsData[i];

      // Otimização: não desenha blocos completamente fora da tela
      const isVisible = (curY >= -140 && curY <= h + 80);

      switch (item.type) {
        case 'spacer':
          curY += item.height;
          break;

        case 'title':
          if (isVisible) {
            ctx.font = '900 28px "Courier New", Courier, monospace';
            ctx.fillStyle = '#f0ede6';
            ctx.fillText(item.text, centerX, curY);

            // Friso fino decorativo
            ctx.strokeStyle = '#7b2cbf';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(centerX - 160, curY + 36);
            ctx.lineTo(centerX + 160, curY + 36);
            ctx.stroke();
          }
          curY += 56;
          break;

        case 'subtitle':
          if (isVisible) {
            ctx.font = '600 13px "Courier New", Courier, monospace';
            ctx.fillStyle = '#9e998d';
            ctx.fillText(item.text, centerX, curY);
          }
          curY += 36;
          break;

        case 'divider':
          if (isVisible) {
            ctx.strokeStyle = 'rgba(123, 44, 191, 0.35)'; // Roxo translúcido
            ctx.lineWidth = 1.0;
            ctx.beginPath();
            ctx.moveTo(centerX - 45, curY + 12);
            ctx.lineTo(centerX + 45, curY + 12);
            ctx.stroke();
          }
          curY += 46;
          break;

        case 'header_main':
          if (isVisible) {
            ctx.font = '700 15px "Courier New", Courier, monospace';
            ctx.fillStyle = '#d48b28'; // Âmbar quente
            ctx.fillText(item.text, centerX, curY);

            ctx.strokeStyle = '#7b2cbf';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(centerX - 140, curY + 22);
            ctx.lineTo(centerX + 140, curY + 22);
            ctx.stroke();
          }
          curY += 38;
          break;

        case 'header':
          if (isVisible) {
            ctx.font = '700 13px "Courier New", Courier, monospace';
            ctx.fillStyle = '#7b2cbf'; // Roxo elétrico
            ctx.fillText(item.text, centerX, curY);

            ctx.strokeStyle = 'rgba(157, 78, 221, 0.45)';
            ctx.lineWidth = 1.0;
            const textW = ctx.measureText(item.text).width;
            ctx.beginPath();
            ctx.moveTo(centerX - textW / 2 - 10, curY + 18);
            ctx.lineTo(centerX + textW / 2 + 10, curY + 18);
            ctx.stroke();
          }
          curY += 30;
          break;

        case 'dedication_label':
          if (isVisible) {
            ctx.font = '500 12px "Courier New", Courier, monospace';
            ctx.fillStyle = '#8f8a7e';
            ctx.fillText(item.text, centerX, curY);
          }
          curY += 22;
          break;

        case 'name':
          if (isVisible) {
            ctx.font = '700 17px "Courier New", Courier, monospace';
            ctx.fillStyle = '#e6e4df'; // Off-white
            ctx.fillText(item.text, centerX, curY);
          }
          curY += 28;
          break;

        case 'name_highlight':
          if (isVisible) {
            ctx.font = '700 18px "Courier New", Courier, monospace';
            ctx.fillStyle = '#f6f4ee';
            ctx.fillText(item.text, centerX, curY);

            // Brilho sutil ao redor do nome
            ctx.strokeStyle = 'rgba(212, 139, 40, 0.4)';
            ctx.lineWidth = 1.0;
            const nW = ctx.measureText(item.text).width;
            ctx.beginPath();
            ctx.moveTo(centerX - nW / 2 - 8, curY + 23);
            ctx.lineTo(centerX + nW / 2 + 8, curY + 23);
            ctx.stroke();
          }
          curY += 32;
          break;

        case 'quote':
          if (isVisible) {
            ctx.font = 'italic 500 12px "Courier New", Courier, monospace';
            ctx.fillStyle = '#9e998d'; // Cinza âmbar translúcido
            const maxW = Math.min(580, w * 0.85);
            const lines = this._wrapText(ctx, item.text, maxW);
            for (let l = 0; l < lines.length; l++) {
              ctx.fillText(lines[l], centerX, curY + l * 18);
            }
            curY += lines.length * 18;
          } else {
            curY += 36;
          }
          break;

        case 'body':
          if (isVisible) {
            ctx.font = '500 12px "Courier New", Courier, monospace';
            ctx.fillStyle = '#b8b2a5';
            const maxW = Math.min(620, w * 0.88);
            const lines = this._wrapText(ctx, item.text, maxW);
            for (let l = 0; l < lines.length; l++) {
              ctx.fillText(lines[l], centerX, curY + l * 18);
            }
            curY += lines.length * 18;
          } else {
            curY += 36;
          }
          break;

        case 'body_bold':
          if (isVisible) {
            ctx.font = '700 14px "Courier New", Courier, monospace';
            ctx.fillStyle = '#e6e4df';
            ctx.fillText(item.text, centerX, curY);
          }
          curY += 30;
          break;

        case 'thanks':
          if (isVisible) {
            ctx.font = '700 16px "Courier New", Courier, monospace';
            ctx.fillStyle = '#d48b28'; // Âmbar
            ctx.fillText(item.text, centerX, curY);
          }
          curY += 30;
          break;

        case 'years':
          if (isVisible) {
            ctx.font = '600 13px "Courier New", Courier, monospace';
            ctx.fillStyle = '#7b2cbf'; // Roxo elétrico
            ctx.fillText(item.text, centerX, curY);
          }
          curY += 36;
          break;
      }
    }

    // Calcula a altura total da rolagem
    if (this.totalHeight === 0) {
      this.totalHeight = curY - startY + h * 0.25;
    }

    // Repouso final no encerramento da rolagem
    if (this.isFinishedScrolling) {
      this._renderFinalePrompt(ctx, w, h);
    }

    ctx.restore();
  }

  /**
   * Renderiza a tela final pulsante quando a rolagem termina.
   * @private
   */
  _renderFinalePrompt(ctx, w, h) {
    ctx.save();
    const pulse = 0.65 + Math.sin(this.finalePauseTimer * 3.5) * 0.35;

    // Logo NORTHVALE repousando no centro
    ctx.textAlign = 'center';
    ctx.font = '900 42px "Courier New", Courier, monospace';
    ctx.fillStyle = `rgba(230, 228, 223, ${pulse})`;
    ctx.fillText('NORTHVALE', w / 2, h * 0.44);

    ctx.font = '700 14px "Courier New", Courier, monospace';
    ctx.fillStyle = '#7b2cbf';
    ctx.fillText('1989 — 2026', w / 2, h * 0.44 + 48);

    // Prompt discreto no rodapé
    ctx.font = '600 12px "Courier New", Courier, monospace';
    ctx.fillStyle = '#d48b28';
    ctx.fillText('[ESPAÇO] Retornar ao Menu Principal', w / 2, h - 45);

    ctx.restore();
  }

  /**
   * Indicador sutil de pular no canto superior direito (após 5s).
   * @private
   */
  _renderSkipPrompt(ctx, w) {
    ctx.save();
    ctx.font = '600 10.5px "Courier New", Courier, monospace';
    ctx.fillStyle = 'rgba(158, 153, 141, 0.55)';
    ctx.textAlign = 'right';
    ctx.fillText('[ESC] Pular Créditos   |   [ESPAÇO] Acelerar', w - 24, 28);
    ctx.restore();
  }

  /**
   * Granulação analógica sobreposta aos créditos.
   * @private
   */
  _renderFilmGrain(ctx, w, h) {
    if (!this.grainCanvas) return;
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.globalCompositeOperation = 'screen';
    const pat = ctx.createPattern(this.grainCanvas, 'repeat');
    if (pat) {
      ctx.fillStyle = pat;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();
  }

  /**
   * Quebra linhas de parágrafos respeitando palavras completas.
   * @private
   */
  _wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let curLine = '';
    for (let i = 0; i < words.length; i++) {
      const test = curLine ? `${curLine} ${words[i]}` : words[i];
      if (ctx.measureText(test).width > maxWidth) {
        lines.push(curLine);
        curLine = words[i];
      } else {
        curLine = test;
      }
    }
    if (curLine) lines.push(curLine);
    return lines;
  }

  /**
   * Processa entradas de teclado e mouse do jogador.
   * @param {KeyboardEvent|WheelEvent|MouseEvent|Object} e
   * @returns {boolean} Se a entrada foi consumida
   */
  handleInput(e) {
    if (!this.isActive) return false;

    // 1. Teclado: KeyDown
    if (e.type === 'keydown') {
      const k = e.key;

      // Pular créditos (apenas após 5s)
      if (k === 'Escape') {
        if (this.canSkip) {
          this.exit();
          return true;
        }
      }

      // Se terminou a rolagem, Espaço ou Enter retorna ao menu
      if (this.isFinishedScrolling) {
        if (k === ' ' || k === 'Enter') {
          this.exit();
          return true;
        }
      }

      // Acelerar rolagem segurando Espaço ou Seta Baixo
      if (k === ' ' || k === 'ArrowDown') {
        this.fastForwardMultiplier = 4.0;
        return true;
      }
    }

    // 2. Teclado: KeyUp (retorna à velocidade normal)
    if (e.type === 'keyup') {
      const k = e.key;
      if (k === ' ' || k === 'ArrowDown') {
        this.fastForwardMultiplier = 1.0;
        return true;
      }
    }

    // 3. Scroll do Mouse (Wheel)
    if (e.type === 'wheel') {
      const delta = e.deltaY;
      this.scrollY = Math.max(0, this.scrollY + delta * 0.7);
      if (this.totalHeight > 0 && this.scrollY >= this.totalHeight) {
        this.scrollY = this.totalHeight;
        this.isFinishedScrolling = true;
      }
      return true;
    }

    // 4. Clique do mouse
    if (e.type === 'click') {
      if (this.isFinishedScrolling) {
        this.exit();
        return true;
      }
    }

    return false;
  }
}
