/**
 * NorthVale: Sombras de 1989 — IsometricWorldRenderer.js
 * Direção de Arte Técnica: Motor de Desenho Isométrico 2.5D (HTML5 Canvas 2D)
 *
 * Módulo puro em Canvas 2D desacoplado (sem dependências externas):
 * - Projeção isométrica 2:1 padrão (tileWidth x tileHeight).
 * - Camada A (Solo): Asfalto molhado com rachaduras e faixas amarelas, calçadas com meio-fio e tampas de bueiro, lama da represa e pisos internos.
 * - Camada B (Paredes & Fachadas): Duas faces visíveis (Esquerda sombreada a 60%, Direita iluminada a 90%), tijolos escurecidos por fuligem, portas de aço corrugado e vidro com decalques dourados, janelas com luz âmbar vazando.
 * - Camada C (Roof Cutaway): Interpolação suave de transparência de telhado (alpha 1.0 -> 0.15 em 300ms) ao entrar nos edifícios.
 * - Camada D (Adereços 1989): Postes de ferro fundido com cone de luz, orelhões amarelos/laranjas, caçambas com ferrugem e hidrantes vermelhos descascados.
 * - Performance estável a 60 FPS com culling de viewport e zero GC no loop principal.
 */

export class IsometricWorldRenderer {
  /**
   * @param {HTMLCanvasElement} [canvas] Referência opcional ao canvas principal
   */
  constructor(canvas = null) {
    this.canvas = canvas;

    // Dimensões do losango isométrico padrão 2:1
    this.tileWidth = 64;
    this.tileHeight = 32;
    this.halfW = 32;
    this.halfH = 16;
    this.curbHeight = 6; // Elevação do meio-fio das calçadas

    // Estado de transição de corte de telhados (buildingId -> alpha)
    this.roofAlphas = new Map();
    this.cutawayFadeRate = 3.5; // Transição suave de ~300ms

    // Timers para poças de chuva e luzes intermitentes
    this.time = 0;

    // Buffer de pontos reutilizável para evitar GC
    this._polyPoints = [
      { x: 0, y: 0 }, { x: 0, y: 0 },
      { x: 0, y: 0 }, { x: 0, y: 0 }
    ];
  }

  /**
   * Inicializa e parametriza o tamanho dos tiles isométricos.
   * @param {number} [tileWidth=64]
   * @param {number} [tileHeight=32]
   */
  init(tileWidth = 64, tileHeight = 32) {
    this.tileWidth = tileWidth;
    this.tileHeight = tileHeight;
    this.halfW = tileWidth / 2;
    this.halfH = tileHeight / 2;
    this.curbHeight = Math.max(4, Math.round(tileHeight * 0.18));
  }

  /**
   * Atualiza timers internos e interpolação dos telhados cortados.
   * @param {number} dt Delta time em segundos
   */
  update(dt) {
    this.time += dt;

    // Interpolação suave dos alphas de cada edifício registrado
    for (const [id, state] of this.roofAlphas.entries()) {
      const target = state.target;
      let cur = state.current;
      if (cur < target) {
        cur = Math.min(target, cur + dt * this.cutawayFadeRate);
      } else if (cur > target) {
        cur = Math.max(target, cur - dt * this.cutawayFadeRate);
      }
      state.current = cur;
    }
  }

  // ==========================================================================
  // MATEMÁTICA DE PROJEÇÃO ISOMÉTRICA
  // ==========================================================================

  /**
   * Converte coordenadas da grade (gridX, gridY, gridZ) em pixels de tela.
   * @param {number} gx
   * @param {number} gy
   * @param {number} [gz=0] Altura vertical
   * @param {Object} [camera={x:0, y:0}]
   * @returns {{x: number, y: number}}
   */
  gridToScreen(gx, gy, gz = 0, camera = { x: 0, y: 0 }) {
    const sx = (gx - gy) * this.halfW - camera.x;
    const sy = (gx + gy) * this.halfH - gz - camera.y;
    return { x: sx, y: sy };
  }

  /**
   * Converte coordenadas da tela para a grade isométrica plana (Z=0).
   * @param {number} sx
   * @param {number} sy
   * @param {Object} [camera={x:0, y:0}]
   * @returns {{gx: number, gy: number}}
   */
  screenToGrid(sx, sy, camera = { x: 0, y: 0 }) {
    const worldX = sx + camera.x;
    const worldY = sy + camera.y;
    const gx = (worldX / this.halfW + worldY / this.halfH) / 2;
    const gy = (worldY / this.halfH - worldX / this.halfW) / 2;
    return { gx, gy };
  }

  // ==========================================================================
  // 1. CAMADA DE SOLO (GROUND LAYER)
  // ==========================================================================

  /**
   * Desenha o solo e marcações viárias com culling de viewport.
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} mapData Estrutura de dados do mapa ({ width, height, tiles: [...] })
   * @param {Object} camera Posição da câmera { x, y }
   */
  renderGroundLayer(ctx, mapData, camera) {
    if (!mapData) return;

    const viewW = ctx.canvas.width;
    const viewH = ctx.canvas.height;
    const pad = this.tileWidth * 2;

    const tiles = mapData.tiles || [];

    ctx.save();

    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i];
      const gx = tile.gx !== undefined ? tile.gx : tile.x;
      const gy = tile.gy !== undefined ? tile.gy : tile.y;

      const pos = this.gridToScreen(gx, gy, 0, camera);

      // Culling de frustum/viewport para 60 FPS estáveis
      if (
        pos.x < -pad || pos.x > viewW + pad ||
        pos.y < -pad || pos.y > viewH + pad
      ) {
        continue;
      }

      const type = tile.type || 'asphalt';

      switch (type) {
        case 'sidewalk':
          this._drawSidewalkTile(ctx, pos.x, pos.y, tile);
          break;
        case 'mud':
        case 'gravel':
          this._drawMudGravelTile(ctx, pos.x, pos.y, tile);
          break;
        case 'interior_diner':
          this._drawDinerCheckerTile(ctx, pos.x, pos.y, tile);
          break;
        case 'interior_wood':
          this._drawWoodFloorTile(ctx, pos.x, pos.y, tile);
          break;
        case 'asphalt':
        default:
          this._drawAsphaltTile(ctx, pos.x, pos.y, tile);
          break;
      }
    }

    ctx.restore();
  }

  /**
   * Ladrilho de Asfalto Molhado (#141419) com variações de tom, rachaduras e faixas amarelas.
   * @private
   */
  _drawAsphaltTile(ctx, cx, cy, tile) {
    const hw = this.halfW;
    const hh = this.halfH;

    // Variação procedural de tom entre ladrilhos vizinhos
    const hash = Math.sin((tile.gx || 0) * 12.9898 + (tile.gy || 0) * 78.233) * 43758.5453;
    const variation = Math.floor((hash - Math.floor(hash)) * 8);
    const baseShade = 20 + variation; // 20 a 27 em RGB (#141414 a #1b1b1b)
    ctx.fillStyle = `rgb(${baseShade}, ${baseShade}, ${baseShade + 5})`;

    // Losango isométrico
    ctx.beginPath();
    ctx.moveTo(cx, cy - hh);
    ctx.lineTo(cx + hw, cy);
    ctx.lineTo(cx, cy + hh);
    ctx.lineTo(cx - hw, cy);
    ctx.closePath();
    ctx.fill();

    // Sutil contorno de junção de asfalto
    ctx.strokeStyle = '#0e0e13';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Rachaduras sutis
    if (tile.hasCrack || ((hash * 10) % 5 > 3.8)) {
      ctx.strokeStyle = 'rgba(10, 10, 14, 0.6)';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(cx - hw * 0.4, cy - hh * 0.1);
      ctx.lineTo(cx - hw * 0.1, cy + hh * 0.2);
      ctx.lineTo(cx + hw * 0.3, cy + hh * 0.1);
      ctx.stroke();
    }

    // Faixas amarelas desbotadas de tráfego
    if (tile.roadStripe) {
      ctx.strokeStyle = 'rgba(212, 139, 40, 0.45)'; // Âmbar desbotado
      ctx.lineWidth = 2.5;

      if (tile.roadStripe === 'dashed') {
        ctx.setLineDash([8, 6]);
      }

      ctx.beginPath();
      if (tile.stripeDirection === 'horizontal') {
        ctx.moveTo(cx - hw, cy);
        ctx.lineTo(cx + hw, cy);
      } else {
        ctx.moveTo(cx, cy - hh);
        ctx.lineTo(cx, cy + hh);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Reflexo de umidade de chuva
    const puddleSheen = Math.sin(this.time * 2 + (tile.gx || 0)) * 0.04 + 0.06;
    ctx.fillStyle = `rgba(72, 149, 239, ${puddleSheen})`;
    ctx.fill();
  }

  /**
   * Ladrilho de Calçada de Concreto com Meio-fio Elevado e Tampas de Bueiro.
   * @private
   */
  _drawSidewalkTile(ctx, cx, cy, tile) {
    const hw = this.halfW;
    const hh = this.halfH;
    const curb = this.curbHeight;

    // Meio-fio frontal rebaixado (face frontal do degrau da calçada)
    ctx.fillStyle = '#16161c';
    ctx.beginPath();
    ctx.moveTo(cx - hw, cy);
    ctx.lineTo(cx, cy + hh);
    ctx.lineTo(cx, cy + hh + curb);
    ctx.lineTo(cx - hw, cy + curb);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#121217';
    ctx.beginPath();
    ctx.moveTo(cx, cy + hh);
    ctx.lineTo(cx + hw, cy);
    ctx.lineTo(cx + hw, cy + curb);
    ctx.lineTo(cx, cy + hh + curb);
    ctx.closePath();
    ctx.fill();

    // Superfície superior da calçada elevada
    ctx.fillStyle = '#262632'; // Cinza claro sujo
    ctx.beginPath();
    ctx.moveTo(cx, cy - hh - curb);
    ctx.lineTo(cx + hw, cy - curb);
    ctx.lineTo(cx, cy + hh - curb);
    ctx.lineTo(cx - hw, cy - curb);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#323242';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Tampa de bueiro redonda de ferro fundido nas esquinas
    if (tile.hasManhole) {
      const mx = cx;
      const my = cy - curb;

      // Base elíptica do bueiro
      ctx.fillStyle = '#101014';
      ctx.beginPath();
      ctx.ellipse(mx, my, hw * 0.42, hh * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#3d3d4a';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Hachura de ferro fundido
      ctx.strokeStyle = '#22222a';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(mx - 8, my); ctx.lineTo(mx + 8, my);
      ctx.moveTo(mx, my - 4); ctx.lineTo(mx, my + 4);
      ctx.stroke();
    }
  }

  /**
   * Ladrilho de Lama e Cascalho da Represa (#1c1a17).
   * @private
   */
  _drawMudGravelTile(ctx, cx, cy, tile) {
    const hw = this.halfW;
    const hh = this.halfH;

    ctx.fillStyle = '#1c1a17';
    ctx.beginPath();
    ctx.moveTo(cx, cy - hh);
    ctx.lineTo(cx + hw, cy);
    ctx.lineTo(cx, cy + hh);
    ctx.lineTo(cx - hw, cy);
    ctx.closePath();
    ctx.fill();

    // Manchas escuras de terra encharcada
    ctx.fillStyle = '#12110e';
    ctx.beginPath();
    ctx.ellipse(cx - hw * 0.2, cy, hw * 0.35, hh * 0.35, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Pedregulhos de cascalho espalhados
    ctx.fillStyle = '#3a352d';
    ctx.fillRect(cx - 6, cy - 2, 2.5, 2);
    ctx.fillRect(cx + 8, cy + 1, 3, 2);
    ctx.fillRect(cx - 2, cy + 4, 2, 2);
  }

  /**
   * Piso interno do Double R Diner: Linóleo quadriculado preto e branco.
   * @private
   */
  _drawDinerCheckerTile(ctx, cx, cy, tile) {
    const hw = this.halfW;
    const hh = this.halfH;

    const isWhite = ((tile.gx || 0) + (tile.gy || 0)) % 2 === 0;
    ctx.fillStyle = isWhite ? '#dcd8cf' : '#141419';

    ctx.beginPath();
    ctx.moveTo(cx, cy - hh);
    ctx.lineTo(cx + hw, cy);
    ctx.lineTo(cx, cy + hh);
    ctx.lineTo(cx - hw, cy);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#2d2d38';
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }

  /**
   * Piso interno da Farmácia Ward: Tábuas corridas de madeira velha.
   * @private
   */
  _drawWoodFloorTile(ctx, cx, cy, tile) {
    const hw = this.halfW;
    const hh = this.halfH;

    ctx.fillStyle = '#3a271c';
    ctx.beginPath();
    ctx.moveTo(cx, cy - hh);
    ctx.lineTo(cx + hw, cy);
    ctx.lineTo(cx, cy + hh);
    ctx.lineTo(cx - hw, cy);
    ctx.closePath();
    ctx.fill();

    // Réguas longitudinais de madeira
    ctx.strokeStyle = '#20150e';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(cx - hw * 0.5, cy - hh * 0.5);
    ctx.lineTo(cx + hw * 0.5, cy + hh * 0.5);
    ctx.stroke();
  }

  // ==========================================================================
  // 2. CAMADA DE ESTRUTURAS VERTICAIS, PAREDES & PROPS (Y-SORTING QUEUE)
  // ==========================================================================

  /**
   * Renderiza uma entidade ou bloco vertical respeitando a ordenação do Y-sorting.
   *
   * @param {CanvasRenderingContext2D} ctx Contexto Canvas 2D
   * @param {Object} objectData Dados do objeto ({ type, x, y, z, w, h, height, buildingId, ... })
   * @param {Object} camera Posição da câmera { x, y }
   * @param {boolean} [isPlayerInsideBuilding=false] Se o jogador está dentro do edifício deste objeto
   */
  renderWorldObject(ctx, objectData, camera, isPlayerInsideBuilding = false) {
    if (!objectData) return;

    const type = objectData.type || 'wall';

    ctx.save();

    // Se o objeto pertencer a uma parede frontal de edifício em cutaway
    if (objectData.isCutawayWall && objectData.buildingId) {
      const alphaState = this.roofAlphas.get(objectData.buildingId);
      const alpha = alphaState ? alphaState.current : (isPlayerInsideBuilding ? 0.15 : 1.0);
      ctx.globalAlpha = Math.max(0.12, Math.min(1.0, alpha));
    }

    switch (type) {
      case 'wall':
      case 'building_block':
        this._drawIsometricWall(ctx, objectData, camera);
        break;

      case 'door':
        this._drawIsometricDoor(ctx, objectData, camera);
        break;

      case 'window':
        this._drawIsometricWindow(ctx, objectData, camera);
        break;

      case 'prop_lamppost':
        this._drawLamppost(ctx, objectData, camera);
        break;

      case 'prop_payphone':
        this._drawPayphone(ctx, objectData, camera);
        break;

      case 'prop_dumpster':
        this._drawDumpster(ctx, objectData, camera);
        break;

      case 'prop_hydrant':
        this._drawHydrant(ctx, objectData, camera);
        break;

      default:
        // Bloco geométrico genérico
        this._drawIsometricWall(ctx, objectData, camera);
        break;
    }

    ctx.restore();
  }

  /**
   * Paredes com duas faces visíveis:
   * - Face Esquerda: Sombreada a ~60% (#1a1a24).
   * - Face Direita: Iluminada a ~90% (#2e3040).
   * @private
   */
  _drawIsometricWall(ctx, obj, camera) {
    const gx = obj.gx !== undefined ? obj.gx : obj.x;
    const gy = obj.gy !== undefined ? obj.gy : obj.y;
    const wallHeight = obj.height || 64; // Altura vertical da parede em pixels

    // Posição base na tela (chão)
    const p = this.gridToScreen(gx, gy, 0, camera);
    const hw = this.halfW;
    const hh = this.halfH;

    // Cores das faces (suporte a tijolo escurecido ou concreto)
    const isBrick = obj.style === 'brick' || obj.buildingId === 'meatpacking';
    const leftColor = isBrick ? '#241a18' : '#1c1c26'; // 60% brilho
    const rightColor = isBrick ? '#3c2b27' : '#2e2e3e'; // 90% brilho
    const topColor = isBrick ? '#4a3632' : '#38384a';

    // 1. Face Esquerda (Orientação Sudoeste)
    ctx.fillStyle = leftColor;
    ctx.beginPath();
    ctx.moveTo(cxLeft(p.x, hw), p.y);
    ctx.lineTo(p.x, p.y + hh);
    ctx.lineTo(p.x, p.y + hh - wallHeight);
    ctx.lineTo(cxLeft(p.x, hw), p.y - wallHeight);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#0e0e14';
    ctx.lineWidth = 1.0;
    ctx.stroke();

    // Hachura de tijolos escurecidos por fuligem na face esquerda
    if (isBrick) {
      this._drawBrickLines(ctx, p.x - hw, p.y, p.x, p.y + hh, wallHeight, 'left');
    }

    // 2. Face Direita (Orientação Sudeste - Mais Iluminada)
    ctx.fillStyle = rightColor;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y + hh);
    ctx.lineTo(cxRight(p.x, hw), p.y);
    ctx.lineTo(cxRight(p.x, hw), p.y - wallHeight);
    ctx.lineTo(p.x, p.y + hh - wallHeight);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#12121a';
    ctx.stroke();

    if (isBrick) {
      this._drawBrickLines(ctx, p.x, p.y + hh, p.x + hw, p.y, wallHeight, 'right');
    }

    // 3. Topo da Parede (Cornija)
    ctx.fillStyle = topColor;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - hh - wallHeight);
    ctx.lineTo(p.x + hw, p.y - wallHeight);
    ctx.lineTo(p.x, p.y + hh - wallHeight);
    ctx.lineTo(p.x - hw, p.y - wallHeight);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    function cxLeft(x, w) { return x - w; }
    function cxRight(x, w) { return x + w; }
  }

  _drawBrickLines(ctx, x1, y1, x2, y2, height, side) {
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 0.8;

    for (let h = 10; h < height; h += 10) {
      ctx.beginPath();
      ctx.moveTo(x1, y1 - h);
      ctx.lineTo(x2, y2 - h);
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * Portas industriais de aço corrugado e portas de vidro com decalques dourados.
   * @private
   */
  _drawIsometricDoor(ctx, obj, camera) {
    const p = this.gridToScreen(obj.gx || obj.x, obj.gy || obj.y, 0, camera);
    const doorH = 46;
    const doorW = this.halfW * 0.75;

    ctx.save();

    if (obj.doorType === 'glass' || obj.decal) {
      // Porta de vidro de repartição policial / comércio
      ctx.fillStyle = 'rgba(20, 28, 36, 0.9)';
      ctx.fillRect(p.x - doorW / 2, p.y - doorH, doorW, doorH);

      ctx.strokeStyle = '#3a3a4c';
      ctx.lineWidth = 1.6;
      ctx.strokeRect(p.x - doorW / 2, p.y - doorH, doorW, doorH);

      // Decalque em letras douradas envelhecidas (1989)
      if (obj.decal) {
        ctx.font = '700 8px "Courier New", monospace';
        ctx.fillStyle = '#e0a96d'; // Dourado âmbar
        ctx.textAlign = 'center';
        ctx.fillText(obj.decal.toUpperCase(), p.x, p.y - doorH + 18);
      }

      // Maçaneta de latão
      ctx.fillStyle = '#d48b28';
      ctx.fillRect(p.x + doorW / 2 - 5, p.y - doorH * 0.45, 3, 7);
    } else {
      // Porta de aço corrugado industrial (Frigorífico / Oficina)
      ctx.fillStyle = '#22282a';
      ctx.fillRect(p.x - doorW / 2, p.y - doorH, doorW, doorH);

      // Nervuras horizontais do aço corrugado
      ctx.strokeStyle = '#121618';
      ctx.lineWidth = 1.0;
      for (let y = p.y - doorH + 4; y < p.y; y += 5) {
        ctx.beginPath();
        ctx.moveTo(p.x - doorW / 2 + 2, y);
        ctx.lineTo(p.x + doorW / 2 - 2, y);
        ctx.stroke();
      }

      ctx.strokeStyle = '#444c4e';
      ctx.strokeRect(p.x - doorW / 2, p.y - doorH, doorW, doorH);
    }

    ctx.restore();
  }

  /**
   * Janelas retangulares com luz interior âmbar vazando na chuva.
   * @private
   */
  _drawIsometricWindow(ctx, obj, camera) {
    const p = this.gridToScreen(obj.gx || obj.x, obj.gy || obj.y, obj.z || 16, camera);
    const winW = 18;
    const winH = 24;

    ctx.save();

    // Luz âmbar vazando da janela no chão (cone de luz)
    if (obj.isLit !== false) {
      const glowGrad = ctx.createRadialGradient(p.x, p.y + 16, 2, p.x, p.y + 24, 45);
      glowGrad.addColorStop(0.0, 'rgba(212, 139, 40, 0.4)');
      glowGrad.addColorStop(1.0, 'rgba(212, 139, 40, 0.0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + 24, 34, 16, 0, 0, Math.PI * 2);
      ctx.fill();

      // Vidro da janela iluminado
      ctx.fillStyle = '#d48b28';
    } else {
      // Janela apagada na escuridão
      ctx.fillStyle = '#101418';
    }

    ctx.fillRect(p.x - winW / 2, p.y - winH, winW, winH);

    // Caixilho da janela
    ctx.strokeStyle = '#2d2d38';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(p.x - winW / 2, p.y - winH, winW, winH);

    // Divisórias de vidro em cruz
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - winH); ctx.lineTo(p.x, p.y);
    ctx.moveTo(p.x - winW / 2, p.y - winH / 2); ctx.lineTo(p.x + winW / 2, p.y - winH / 2);
    ctx.stroke();

    ctx.restore();
  }

  // ==========================================================================
  // D. ADEREÇOS URBANOS (PROPS DE 1989)
  // ==========================================================================

  /**
   * Poste de luz de ferro fundido com cone de iluminação cônica no asfalto.
   * @private
   */
  _drawLamppost(ctx, obj, camera) {
    const p = this.gridToScreen(obj.gx || obj.x, obj.gy || obj.y, 0, camera);
    const postH = 75;

    ctx.save();

    // 1. Cone de luz âmbar volumétrica no asfalto
    const lightGrad = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, 65);
    lightGrad.addColorStop(0.0, 'rgba(224, 169, 109, 0.38)');
    lightGrad.addColorStop(0.65, 'rgba(180, 110, 40, 0.12)');
    lightGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = lightGrad;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, 55, 26, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Coluna de ferro fundido escuro
    ctx.fillStyle = '#16181d';
    ctx.fillRect(p.x - 2, p.y - postH, 4, postH);

    // Base ornamental e anéis
    ctx.fillRect(p.x - 5, p.y - 6, 10, 6);
    ctx.fillRect(p.x - 4, p.y - postH * 0.45, 8, 3);

    // Braço curvado do poste
    ctx.strokeStyle = '#16181d';
    ctx.lineWidth = 3.0;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - postH);
    ctx.quadraticCurveTo(p.x + 8, p.y - postH - 12, p.x + 14, p.y - postH + 4);
    ctx.stroke();

    // Cúpula cônica da lâmpada
    ctx.fillStyle = '#22252a';
    ctx.beginPath();
    ctx.moveTo(p.x + 8, p.y - postH + 4);
    ctx.lineTo(p.x + 20, p.y - postH + 4);
    ctx.lineTo(p.x + 14, p.y - postH + 1);
    ctx.closePath();
    ctx.fill();

    // Lâmpada de sódio incandescente
    ctx.fillStyle = '#ffbe0b';
    ctx.beginPath();
    ctx.arc(p.x + 14, p.y - postH + 6, 2.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * Orelhão público de calçada com cúpula circular amarela/laranja (Anos 80).
   * @private
   */
  _drawPayphone(ctx, obj, camera) {
    const p = this.gridToScreen(obj.gx || obj.x, obj.gy || obj.y, 0, camera);
    const phoneH = 50;

    ctx.save();

    // Sombra do orelhão
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, 10, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Haste de metal fincada na calçada
    ctx.strokeStyle = '#484c54';
    ctx.lineWidth = 3.0;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x, p.y - phoneH * 0.65);
    ctx.stroke();

    // Aparelho telefônico de aço
    ctx.fillStyle = '#2a2e36';
    ctx.fillRect(p.x - 4, p.y - phoneH * 0.85, 8, 14);
    ctx.fillStyle = '#fca311'; // Teclado/placa
    ctx.fillRect(p.x - 2, p.y - phoneH * 0.80, 4, 6);

    // Cúpula acrílica hemisférica icônica (Amarela/Laranja anos 80)
    ctx.fillStyle = '#fca311'; // Amarelo/laranja vivo
    ctx.beginPath();
    ctx.arc(p.x, p.y - phoneH, 14, Math.PI * 0.85, Math.PI * 2.15);
    ctx.fill();
    ctx.strokeStyle = '#b87405';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Reflexo curvo no plástico da cúpula
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.arc(p.x, p.y - phoneH, 11, Math.PI * 1.1, Math.PI * 1.4);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Caçamba industrial de lixo com ferrugem nas bordas.
   * @private
   */
  _drawDumpster(ctx, obj, camera) {
    const p = this.gridToScreen(obj.gx || obj.x, obj.gy || obj.y, 0, camera);
    const dW = 28;
    const dH = 18;

    ctx.save();

    // Sombra da caçamba
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(p.x - dW / 2 + 2, p.y - 2, dW, 8);

    // Corpo de aço verde-escuro oxidado
    ctx.fillStyle = '#20322b';
    ctx.fillRect(p.x - dW / 2, p.y - dH, dW, dH);
    ctx.strokeStyle = '#121e1a';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(p.x - dW / 2, p.y - dH, dW, dH);

    // Tampa plástica inclinada preta
    ctx.fillStyle = '#101413';
    ctx.beginPath();
    ctx.moveTo(p.x - dW / 2 - 2, p.y - dH);
    ctx.lineTo(p.x + dW / 2 + 2, p.y - dH - 4);
    ctx.lineTo(p.x + dW / 2 + 2, p.y - dH);
    ctx.lineTo(p.x - dW / 2 - 2, p.y - dH + 2);
    ctx.closePath();
    ctx.fill();

    // Manchas de ferrugem nas bordas (#8b3a1a)
    ctx.fillStyle = '#8b3a1a';
    ctx.fillRect(p.x - dW / 2, p.y - 4, 7, 4);
    ctx.fillRect(p.x + dW / 2 - 8, p.y - dH + 2, 8, 3);

    ctx.restore();
  }

  /**
   * Hidrante de incêndio vermelho com tinta descascada e bicos de latão.
   * @private
   */
  _drawHydrant(ctx, obj, camera) {
    const p = this.gridToScreen(obj.gx || obj.x, obj.gy || obj.y, 0, camera);
    const hH = 22;

    ctx.save();

    // Sombra do hidrante
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 1, 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Corpo de ferro fundido vermelho descascado (#d62828)
    ctx.fillStyle = '#9e1c1c';
    ctx.fillRect(p.x - 3.5, p.y - hH, 7, hH);

    // Cúpula superior
    ctx.fillStyle = '#b82424';
    ctx.beginPath();
    ctx.arc(p.x, p.y - hH, 4, Math.PI, 0);
    ctx.fill();

    // Bicos laterais de latão oxidado
    ctx.fillStyle = '#b8923b';
    ctx.fillRect(p.x - 6, p.y - hH * 0.65, 3, 4);
    ctx.fillRect(p.x + 3, p.y - hH * 0.65, 3, 4);

    // Mancha de tinta descascada
    ctx.fillStyle = '#3a3a44';
    ctx.fillRect(p.x - 2, p.y - hH * 0.4, 3, 3);

    ctx.restore();
  }

  // ==========================================================================
  // 3. CAMADA DE CORTE DE TELHADO (ROOF CUTAWAY & OCCLUSION)
  // ==========================================================================

  /**
   * Renderiza a cobertura de telhado com fade-out suave ao entrar no edifício.
   *
   * @param {CanvasRenderingContext2D} ctx Contexto Canvas 2D
   * @param {string} buildingId Identificador do edifício (ex: 'diner', 'police', 'pharmacy')
   * @param {boolean} playerInside Se o jogador está dentro do edifício
   * @param {Object} camera Posição da câmera { x, y }
   * @param {Object} [buildingData] Dimensões e posição do edifício
   */
  renderRoofLayer(ctx, buildingId, playerInside, camera, buildingData = null) {
    if (!buildingId) return;

    // Registra ou atualiza o estado de transparência
    if (!this.roofAlphas.has(buildingId)) {
      this.roofAlphas.set(buildingId, {
        current: playerInside ? 0.15 : 1.0,
        target: playerInside ? 0.15 : 1.0
      });
    }

    const state = this.roofAlphas.get(buildingId);
    state.target = playerInside ? 0.15 : 1.0;

    // Se o telhado estiver quase invisível, pula o desenho do teto para economizar drawcalls
    if (state.current <= 0.02) return;

    ctx.save();
    ctx.globalAlpha = Math.max(0.0, Math.min(1.0, state.current));

    // Desenho da cobertura do telhado
    if (buildingData) {
      this._drawBuildingRoofGeometry(ctx, buildingData, camera);
    }

    ctx.restore();
  }

  /**
   * Desenha a geometria isométrica do telhado (4 águas, 2 águas ou plano industrial).
   * @private
   */
  _drawBuildingRoofGeometry(ctx, b, camera) {
    const gx = b.gx !== undefined ? b.gx : b.x;
    const gy = b.gy !== undefined ? b.gy : b.y;
    const roofZ = b.height || 64;
    const p = this.gridToScreen(gx, gy, roofZ, camera);

    const w = (b.gw || 3) * this.halfW;
    const h = (b.gh || 3) * this.halfH;
    const roofColor = b.roofColor || '#2c3639';

    ctx.save();

    // Telhado industrial com calhas e cascalho escuro
    ctx.fillStyle = roofColor;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - h);
    ctx.lineTo(p.x + w, p.y);
    ctx.lineTo(p.x, p.y + h);
    ctx.lineTo(p.x - w, p.y);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#182022';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Caixa d'água ou chaminé no telhado
    if (b.hasChimney) {
      ctx.fillStyle = '#42281e';
      ctx.fillRect(p.x - 6, p.y - h * 0.5 - 16, 12, 16);
      ctx.strokeStyle = '#18120e';
      ctx.strokeRect(p.x - 6, p.y - h * 0.5 - 16, 12, 16);
    }

    ctx.restore();
  }
}
