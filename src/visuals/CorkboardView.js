/**
 * NorthVale: Sombras de 1989 — CorkboardView.js
 * Direção de Arte Técnica: O Quadro de Cortiça das Deduções Investigativas (1989)
 *
 * Módulo puro em Canvas 2D desacoplado (sem dependências externas):
 * 1. Superfície de cortiça marrom-escura procedural em cache e moldura de madeira rústica entalhada.
 * 2. Cartões de pistas estilo Polaroid com fotos forenses, recortes de papel pardo e alfinetes 3D.
 * 3. Fios de lã vermelha conectando as evidências com curvatura catenária física (gravidade e tensão).
 * 4. Feedback tátil de conexões: vibração mecânica de fio esticado e carimbo analógico "COMPROVADO".
 */

export class CorkboardView {
  constructor(options = {}) {
    this.time = 0;
    this.isOpen = true;

    // Cache procedural da textura de cortiça para manter 60 FPS
    this.corkSize = 256;
    this.corkPattern = null;
    this._initCorkTexture();

    // Estados de interação
    this.hoveredNode = null;
    this.selectedNode = null;
    this.dragStartNode = null;
    this.mousePos = { x: 0, y: 0 };
    this.isConnecting = false;

    // Callbacks do motor de jogo
    this.onNodeClick = null;       // (node) => inspeciona
    this.onConnectClues = null;    // (fromNode, toNode) => valida conexão lógica

    // Pulso e vibração das conexões comprovadas
    this.pulsePhase = 0;
  }

  /**
   * Pré-renderiza a textura de cortiça escura com grânulos procedurais.
   * @private
   */
  _initCorkTexture() {
    const size = this.corkSize;
    const offCanvas = document.createElement('canvas');
    offCanvas.width = size;
    offCanvas.height = size;
    const offCtx = offCanvas.getContext('2d');

    // Fundo base marrom escuro (#382a1f para #4a3728)
    const bgGrad = offCtx.createLinearGradient(0, 0, size, size);
    bgGrad.addColorStop(0.0, '#382a1f');
    bgGrad.addColorStop(0.5, '#4a3728');
    bgGrad.addColorStop(1.0, '#322419');
    offCtx.fillStyle = bgGrad;
    offCtx.fillRect(0, 0, size, size);

    // Grânulos procedurais de cortiça em várias camadas de tom
    const imgData = offCtx.getImageData(0, 0, size, size);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 35;
      data[i] = Math.max(0, Math.min(255, data[i] + noise + (Math.random() < 0.08 ? 20 : 0)));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise * 0.8));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise * 0.5));
    }
    offCtx.putImageData(imgData, 0, 0);

    // Salpicamento de cavidades e poros da cortiça
    offCtx.fillStyle = 'rgba(28, 18, 12, 0.45)';
    for (let p = 0; p < 180; p++) {
      const px = Math.random() * size;
      const py = Math.random() * size;
      const pr = 1 + Math.random() * 2.5;
      offCtx.beginPath();
      offCtx.ellipse(px, py, pr * 1.5, pr, Math.random() * Math.PI, 0, Math.PI * 2);
      offCtx.fill();
    }

    this.corkCanvas = offCanvas;
  }

  /**
   * Atualiza timers internos e oscilações dos fios a 60 FPS.
   * @param {number} dt Delta time em segundos
   */
  update(dt) {
    this.time += dt;
    this.pulsePhase += dt * 5.0;
  }

  /**
   * Renderiza todo o Quadro de Cortiça, incluindo moldura, conexões e Polaroids.
   * @param {CanvasRenderingContext2D} ctx Contexto Canvas 2D
   * @param {Array<Object>} nodes Lista de nós de pista
   * @param {Array<Object>} connections Conexões entre pistas { fromId, toId, verified }
   * @param {Object|null} [activePin=null] Alfinete atualmente selecionado/arrastado
   * @param {number} [width=window.innerWidth]
   * @param {number} [height=window.innerHeight]
   */
  render(ctx, nodes = [], connections = [], activePin = null, width, height) {
    const w = width || ctx.canvas.width;
    const h = height || ctx.canvas.height;

    ctx.save();

    // 1. Fundo Texturizado de Cortiça
    this._renderCorkSurface(ctx, w, h);

    // 2. Fios de Lã Vermelha Conectando as Pistas (com Catenária Gravitacional)
    this._renderConnections(ctx, nodes, connections, activePin);

    // 3. Fio Ativo Sendo Esticado pelo Jogador
    if (this.isConnecting && this.dragStartNode) {
      this._renderActiveDragLine(ctx, this.dragStartNode, this.mousePos);
    }

    // 4. Cartões de Pistas, Polaroids e Alfinetes Fixados
    this._renderNodes(ctx, nodes);

    // 5. Moldura de Madeira Rústica Entalhada ao Redor do Quadro
    this._renderWoodFrame(ctx, w, h);

    // 6. Título / Legenda Forense Superior
    this._renderBoardHeader(ctx, w);

    ctx.restore();
  }

  /**
   * Preenche o canvas com a textura de cortiça em padrão contínuo.
   * @private
   */
  _renderCorkSurface(ctx, w, h) {
    if (!this.corkPattern && this.corkCanvas) {
      this.corkPattern = ctx.createPattern(this.corkCanvas, 'repeat');
    }

    if (this.corkPattern) {
      ctx.fillStyle = this.corkPattern;
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.fillStyle = '#423122';
      ctx.fillRect(0, 0, w, h);
    }

    // Vinheta de iluminação ambiente da sala de investigação (luz de abajur central)
    const cx = w / 2;
    const cy = h / 2;
    const vignette = ctx.createRadialGradient(cx, cy, Math.min(w, h) * 0.35, cx, cy, Math.max(w, h) * 0.75);
    vignette.addColorStop(0.0, 'rgba(0, 0, 0, 0.0)');
    vignette.addColorStop(0.65, 'rgba(15, 10, 6, 0.38)');
    vignette.addColorStop(1.0, 'rgba(5, 3, 2, 0.82)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
  }

  /**
   * Renderiza os fios vermelhos com curvatura catenária física.
   * @private
   */
  _renderConnections(ctx, nodes, connections) {
    const nodeMap = new Map();
    for (const n of nodes) {
      nodeMap.set(n.id, n);
    }

    for (const conn of connections) {
      const nodeA = nodeMap.get(conn.fromId);
      const nodeB = nodeMap.get(conn.toId);
      if (!nodeA || !nodeB) continue;

      const pinA = this._getNodePinPos(nodeA);
      const pinB = this._getNodePinPos(nodeB);

      this._drawWoolThread(ctx, pinA.x, pinA.y, pinB.x, pinB.y, conn.verified);
    }
  }

  /**
   * Desenha um fio de lã vermelha suspenso com catenária (gravidade).
   * @private
   */
  _drawWoolThread(ctx, x1, y1, x2, y2, isVerified = false) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy);

    // Catenária: curvatura descendente suave proporcional à distância dos alfinetes
    const sagBase = Math.min(65, Math.max(16, dist * 0.12));

    // Se comprovada, o fio ganha vibração harmônica de tensão esticada
    let sagMod = 0;
    if (isVerified) {
      sagMod = Math.sin(this.time * 12 + dist * 0.02) * 2.2;
    }

    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2 + sagBase + sagMod;

    ctx.save();

    // 1. Sombra do fio projetada na cortiça (deslocada para baixo e direita)
    ctx.strokeStyle = 'rgba(10, 5, 2, 0.42)';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(x1 + 3, y1 + 6);
    ctx.quadraticCurveTo(midX + 3, midY + 8, x2 + 3, y2 + 6);
    ctx.stroke();

    // 2. Fio de lã vermelha externa (tom escuro de sangue seco: #9e2a2b)
    ctx.strokeStyle = isVerified ? '#ba181b' : '#9e2a2b';
    ctx.lineWidth = isVerified ? 2.6 : 2.2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(midX, midY, x2, y2);
    ctx.stroke();

    // 3. Mecha central iluminada da linha de barbante (#d90429 / brilho)
    ctx.strokeStyle = isVerified ? '#ff4d6d' : '#ba181b';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(midX, midY, x2, y2);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Renderiza a linha elástica sendo puxada pelo cursor do jogador.
   * @private
   */
  _renderActiveDragLine(ctx, startNode, mousePos) {
    const pin = this._getNodePinPos(startNode);
    ctx.save();
    ctx.setLineDash([4, 4]);
    this._drawWoolThread(ctx, pin.x, pin.y, mousePos.x, mousePos.y, false);
    ctx.restore();
  }

  /**
   * Retorna a coordenada exata do alfinete no topo de um nó de pista.
   * @private
   */
  _getNodePinPos(node) {
    const h = node.type === 'polaroid' ? 150 : 100;
    const rad = (node.angle || 0) * (Math.PI / 180);
    const pinOffsetY = -h / 2 + 10;
    // Posição rotacionada do alfinete
    const px = node.x - Math.sin(rad) * pinOffsetY;
    const py = node.y + Math.cos(rad) * pinOffsetY;
    return { x: px, y: py };
  }

  /**
   * Renderiza os cartões de pistas (Polaroids ou fichas) e seus alfinetes.
   * @private
   */
  _renderNodes(ctx, nodes) {
    for (const node of nodes) {
      ctx.save();
      ctx.translate(node.x, node.y);
      ctx.rotate(((node.angle || 0) * Math.PI) / 180);

      const isHovered = this.hoveredNode && this.hoveredNode.id === node.id;
      const isSelected = this.selectedNode && this.selectedNode.id === node.id;

      if (node.type === 'polaroid') {
        this._renderPolaroidCard(ctx, node, isHovered, isSelected);
      } else {
        this._renderIndexCard(ctx, node, isHovered, isSelected);
      }

      ctx.restore();

      // Alfinete desenhado na posição exata sobre o cartão
      const pin = this._getNodePinPos(node);
      this._renderPushpin(ctx, pin.x, pin.y, node.pinColor || '#ba181b', isHovered);
    }
  }

  /**
   * Desenha uma fotografia estilo Polaroid com borda branca envelhecida.
   * @private
   */
  _renderPolaroidCard(ctx, node, isHovered, isSelected) {
    const w = 120;
    const h = 150;
    const x = -w / 2;
    const y = -h / 2;

    // Sombra do papel da Polaroid sobre a cortiça
    ctx.save();
    ctx.fillStyle = isHovered ? 'rgba(0, 0, 0, 0.55)' : 'rgba(0, 0, 0, 0.38)';
    ctx.fillRect(x + 5, y + 8, w, h);
    ctx.restore();

    // Papel fotográfico esbranquiçado amarelado (#ede6d6 / #ded8c8)
    ctx.fillStyle = isSelected ? '#fffdf7' : (isHovered ? '#f4eedf' : '#ede6d6');
    ctx.fillRect(x, y, w, h);

    // Borda fina gasta
    ctx.strokeStyle = '#b8af9c';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(x, y, w, h);

    // Área quadrada da fotografia (preto fosco ou foto do suspeito)
    const photoMargin = 9;
    const photoSize = w - photoMargin * 2;
    const photoX = x + photoMargin;
    const photoY = y + photoMargin;

    if (node.image && node.image.complete) {
      ctx.drawImage(node.image, photoX, photoY, photoSize, photoSize);
    } else {
      // Fundo escuro de câmara escura / laboratório forense
      ctx.fillStyle = '#181820';
      ctx.fillRect(photoX, photoY, photoSize, photoSize);

      // Silhueta ou símbolo da evidência
      this._drawForensicPlaceholder(ctx, photoX, photoY, photoSize, node);
    }

    // Filtro analógico frio sobre a foto Polaroid
    ctx.fillStyle = 'rgba(72, 149, 239, 0.08)';
    ctx.fillRect(photoX, photoY, photoSize, photoSize);

    // Legenda manuscrita na margem inferior em tinta azul gasta (#1d2d54)
    ctx.font = '700 10px "Courier New", Courier, monospace';
    ctx.fillStyle = '#1d2d54';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(node.title.toUpperCase(), 0, y + h - 34);

    if (node.subtitle) {
      ctx.font = '500 8.5px "Courier New", Courier, monospace';
      ctx.fillStyle = '#5c5750';
      ctx.fillText(node.subtitle, 0, y + h - 18);
    }

    // Carimbo "COMPROVADO" em vermelho quando validada
    if (node.verified) {
      this._renderVerifiedStamp(ctx, 0, 0);
    }
  }

  /**
   * Desenha ficha parda de anotações ou recorte de depoimento.
   * @private
   */
  _renderIndexCard(ctx, node, isHovered, isSelected) {
    const w = 138;
    const h = 95;
    const x = -w / 2;
    const y = -h / 2;

    // Sombra do cartão
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(x + 4, y + 6, w, h);
    ctx.restore();

    // Papel pardo (#d8caa8)
    ctx.fillStyle = isSelected ? '#e4d8ba' : (isHovered ? '#dfd2b0' : '#d8caa8');
    ctx.fillRect(x, y, w, h);

    // Linhas pautadas de ficha policial clássica
    ctx.strokeStyle = 'rgba(120, 80, 50, 0.22)';
    ctx.lineWidth = 0.8;
    for (let ly = y + 26; ly < y + h - 10; ly += 14) {
      ctx.beginPath();
      ctx.moveTo(x + 8, ly);
      ctx.lineTo(x + w - 8, ly);
      ctx.stroke();
    }

    // Borda de fita adesiva amarelada no topo (Durex envelhecido)
    ctx.fillStyle = 'rgba(235, 215, 140, 0.35)';
    ctx.fillRect(x + w / 2 - 20, y - 6, 40, 14);

    // Texto datilografado
    ctx.font = '700 10px "Courier New", Courier, monospace';
    ctx.fillStyle = '#22201d';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(node.title.toUpperCase(), 0, y + 10);

    if (node.subtitle) {
      ctx.font = '500 9px "Courier New", Courier, monospace';
      ctx.fillStyle = '#1d2d54';
      ctx.fillText(node.subtitle, 0, y + 36);
    }

    if (node.verified) {
      this._renderVerifiedStamp(ctx, 0, 0);
    }
  }

  /**
   * Silhueta de evidência fotográfica forense (rosto, chave ou arma).
   * @private
   */
  _drawForensicPlaceholder(ctx, px, py, size, node) {
    ctx.save();
    const cx = px + size / 2;
    const cy = py + size / 2;

    if (node.isSuspect) {
      // Silhueta de rosto policial noir com marcação de identificação
      ctx.fillStyle = '#2c2d38';
      ctx.beginPath();
      ctx.arc(cx, cy - 8, size * 0.22, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(cx, cy + 22, size * 0.38, size * 0.25, 0, Math.PI, 0);
      ctx.fill();

      // Plaqueta de identificação de suspeito
      ctx.fillStyle = '#ede6d6';
      ctx.fillRect(cx - 24, cy + 18, 48, 12);
      ctx.font = '700 8px "Courier New", monospace';
      ctx.fillStyle = '#0a0a0c';
      ctx.textAlign = 'center';
      ctx.fillText(`SUSP #${node.id.toString().slice(-3)}`, cx, cy + 27);
    } else {
      // Ícone de evidência material (lupa / cápsula)
      ctx.strokeStyle = '#d48b28';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(cx - 4, cy - 4, 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + 6, cy + 6);
      ctx.lineTo(cx + 18, cy + 18);
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Renderiza o carimbo vermelho de "COMPROVADO" angulado na Polaroid.
   * @private
   */
  _renderVerifiedStamp(ctx, cx, cy) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.25);

    ctx.strokeStyle = '#ba181b';
    ctx.fillStyle = '#ba181b';
    ctx.lineWidth = 1.6;
    ctx.globalAlpha = 0.85;

    ctx.strokeRect(-48, -12, 96, 24);
    ctx.font = '700 12px "Courier New", Courier, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('COMPROVADO', 0, 0);

    ctx.restore();
  }

  /**
   * Desenha um alfinete de cabeça redonda metálica/plástica com sombra realista.
   * @private
   */
  _renderPushpin(ctx, x, y, color, isHovered) {
    ctx.save();

    // Sombra de contato do alfinete na cortiça
    ctx.fillStyle = 'rgba(0, 0, 0, 0.58)';
    ctx.beginPath();
    ctx.ellipse(x + 3, y + 4, 5.5, 3.5, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Haste de aço chanfrada
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + 3);
    ctx.stroke();

    // Cabeça do alfinete (Esfera 3D com luz especular)
    const pinRadius = isHovered ? 6.5 : 5.5;
    const pinGrad = ctx.createRadialGradient(
      x - pinRadius * 0.35, y - pinRadius * 0.35, 1,
      x, y, pinRadius
    );

    // Variações de cor do plástico fosco do alfinete
    pinGrad.addColorStop(0.0, '#ffffff'); // Brilho de ponto de luz
    pinGrad.addColorStop(0.3, color);
    pinGrad.addColorStop(0.85, this._darkenColor(color, 0.4));
    pinGrad.addColorStop(1.0, '#100a06');

    ctx.fillStyle = pinGrad;
    ctx.beginPath();
    ctx.arc(x, y, pinRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Escurece uma cor hexadecimal para gradiente 3D da esfera.
   * @private
   */
  _darkenColor(hex, factor) {
    if (hex === '#ba181b') return '#6a040f';
    if (hex === '#2b5c8f') return '#142c48';
    if (hex === '#d48b28') return '#78460a';
    return '#403020';
  }

  /**
   * Desenha a moldura de madeira rústica entalhada ao redor da tela.
   * @private
   */
  _renderWoodFrame(ctx, w, h) {
    ctx.save();
    const frameW = 22;

    // Madeira nobre escura (#2b1d12 e #1a110a)
    ctx.fillStyle = '#26190e';

    // Topo
    ctx.fillRect(0, 0, w, frameW);
    // Base
    ctx.fillRect(0, h - frameW, w, frameW);
    // Esquerda
    ctx.fillRect(0, 0, frameW, h);
    // Direita
    ctx.fillRect(w - frameW, 0, frameW, h);

    // Chanfro interno e sombra projetada na cortiça
    ctx.strokeStyle = '#140c06';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(frameW, frameW, w - frameW * 2, h - frameW * 2);

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.lineWidth = 5.0;
    ctx.strokeRect(frameW + 2, frameW + 2, w - frameW * 2 - 4, h - frameW * 2 - 4);

    // Junções chanfradas a 45 graus nos 4 cantos
    ctx.strokeStyle = '#100804';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(frameW, frameW);
    ctx.moveTo(w, 0); ctx.lineTo(w - frameW, frameW);
    ctx.moveTo(0, h); ctx.lineTo(frameW, h - frameW);
    ctx.moveTo(w, h); ctx.lineTo(w - frameW, h - frameW);
    ctx.stroke();

    // Ranhuras sutis da madeira
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    ctx.strokeRect(4, 4, w - 8, h - 8);

    ctx.restore();
  }

  /**
   * Cabeçalho de registro no topo do quadro.
   * @private
   */
  _renderBoardHeader(ctx, w) {
    ctx.save();
    const y = 38;

    // Fita Dymo / Plaqueta central
    ctx.fillStyle = 'rgba(10, 10, 12, 0.88)';
    ctx.strokeStyle = '#7b2cbf';
    ctx.lineWidth = 1.0;
    const boxW = 380;
    const boxX = w / 2 - boxW / 2;

    ctx.fillRect(boxX, y, boxW, 28);
    ctx.strokeRect(boxX, y, boxW, 28);

    ctx.font = '700 11px "Courier New", Courier, monospace';
    ctx.fillStyle = '#e6e4df';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('QUADRO DE DEDUÇÕES FORENSES — CASO NORTHVALE 1989', w / 2, y + 14);

    ctx.restore();
  }

  /**
   * Atualiza posição do mouse e detecta hover nos nós.
   * @param {number} x
   * @param {number} y
   * @param {Array<Object>} nodes
   */
  handleMouseMove(x, y, nodes = []) {
    this.mousePos.x = x;
    this.mousePos.y = y;

    this.hoveredNode = null;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      const w = node.type === 'polaroid' ? 120 : 138;
      const h = node.type === 'polaroid' ? 150 : 95;

      if (
        x >= node.x - w / 2 &&
        x <= node.x + w / 2 &&
        y >= node.y - h / 2 &&
        y <= node.y + h / 2
      ) {
        this.hoveredNode = node;
        break;
      }
    }
  }

  /**
   * Inicia arraste de conexão de alfinete ao pressionar o mouse.
   */
  handleMouseDown(x, y, nodes = []) {
    this.handleMouseMove(x, y, nodes);
    if (this.hoveredNode) {
      this.selectedNode = this.hoveredNode;
      this.dragStartNode = this.hoveredNode;
      this.isConnecting = true;
    }
  }

  /**
   * Conclui a ligação de linha entre dois cartões de pista.
   */
  handleMouseUp(x, y, nodes = []) {
    if (this.isConnecting && this.dragStartNode) {
      this.handleMouseMove(x, y, nodes);
      if (this.hoveredNode && this.hoveredNode.id !== this.dragStartNode.id) {
        if (this.onConnectClues) {
          this.onConnectClues(this.dragStartNode, this.hoveredNode);
        }
      }
    }
    this.isConnecting = false;
    this.dragStartNode = null;
  }

  /**
   * Processa clique em um cartão para inspeção.
   */
  handleClick(x, y, nodes = []) {
    this.handleMouseMove(x, y, nodes);
    if (this.hoveredNode) {
      if (this.onNodeClick) {
        this.onNodeClick(this.hoveredNode);
      }
      return true;
    }
    return false;
  }
}
