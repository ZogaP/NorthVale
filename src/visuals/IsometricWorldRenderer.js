/**
 * NorthVale: Sombras de 1989 — IsometricWorldRenderer.js
 * Direção de Arte Técnica: Motor de Desenho Isométrico 2.5D Volumétrico (HTML5 Canvas 2D)
 *
 * Módulo puramente em Canvas 2D nativo (sem bibliotecas externas) a 60 FPS:
 * 1. Projeção Isométrica 2:1 calibrada com eixo Z vertical real.
 * 2. Construção Real das Fachadas dos Edifícios:
 *    - Volumes prismáticos sólidos com altura vertical Z (2.5m a 3.5m / ~80-115px).
 *    - Face Sudoeste (SW): Sombreada a 40% de luminosidade.
 *    - Face Sudeste (SE): Iluminada pela luz ambiente a 80-90% de luminosidade.
 *    - Texturas de época: Tijolo aparente queimado por fuligem, tábuas de madeira desgastada
 *      (chalé americano), concreto armado sujo de repartição policial e fábrica.
 *    - Aberturas reais nas paredes: Portas no nível da calçada e janelas iluminadas por dentro
 *      com tom âmbar suave de lâmpada incandescente e reflexo no solo.
 *    - Telhados em duas águas (gabled roofs) com textura de telhas de asfalto/zinco.
 *    - Letreiros comerciais discretos fixados acima da porta ou na fachada.
 * 3. Diferenciação Visual de NPCs (renderEntity):
 *    - Variação procedural de silhueta e paleta baseada em characterId:
 *      * Fardados (Bobby, Ruth, Polícia): Bege/marrom policial, quepe militar e distintivo.
 *      * Trabalhadores (Frigorífico, Oficina, Sam): Macacão cinza/azul, galochas e gorros.
 *      * Civis/Moradores: Casacos longos verde-oliva, jaquetas jeans, capas amarelas e guarda-chuvas pretos abertos sob a tempestade.
 *    - Ciclo de caminhada procedural interpolado pelo tempo (oscilação dos pés e tronco).
 * 4. Ajuste Fino de Escala de Móveis Interiores (renderInteriorProp):
 *    - Sofás, poltronas, mesas e cadeiras rigorosamente proporcionais à escala de 50px do Alex.
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
    this.curbHeight = 6; // Meio-fio de calçada

    // Altura humana padrão do Alex (referência métrica de 50px)
    this.humanHeight = 50;

    // Estado de transição de corte de telhados (buildingId -> { current, target })
    this.roofAlphas = new Map();
    this.cutawayFadeRate = 3.8; // Transição suave (~280ms)

    // Timer acumulador de animação e efeitos climáticos
    this.time = 0;

    // Paleta de luz ambiente e materiais de 1989
    this.palette = {
      ambientLight: 'rgba(180, 195, 215, 0.12)',
      ambientDark: '#080a0f',
      windowGlow: '#fca311',
      windowGlowWarm: '#e0a96d',
      brickDarkSW: '#221917',
      brickLightSE: '#3d2c27',
      woodDarkSW: '#282f2a',
      woodLightSE: '#4a574d',
      concreteDarkSW: '#1e2427',
      concreteLightSE: '#3c4749',
      roofAsphalt: '#1e2326',
      roofZinc: '#2c3739',
      curbBase: '#121217',
      curbTop: '#24242e'
    };
  }

  /**
   * Inicializa ou reconfigura as dimensões do grid isométrico.
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
    for (const [, state] of this.roofAlphas.entries()) {
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
   * Converte coordenadas da grade (gx, gy, gz) em coordenadas de tela (pixels).
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
   * Desenha os ladrilhos isométricos de asfalto, calçadas, poças e interiores.
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} mapData Estrutura do mapa ({ tiles: [...] })
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

      // Frustum culling para 60 FPS estáveis
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

  _drawAsphaltTile(ctx, cx, cy, tile) {
    const hw = this.halfW;
    const hh = this.halfH;

    const hash = Math.sin((tile.gx || 0) * 12.9898 + (tile.gy || 0) * 78.233) * 43758.5453;
    const variation = Math.floor((hash - Math.floor(hash)) * 8);
    const baseShade = 20 + variation;
    ctx.fillStyle = `rgb(${baseShade}, ${baseShade}, ${baseShade + 5})`;

    ctx.beginPath();
    ctx.moveTo(cx, cy - hh);
    ctx.lineTo(cx + hw, cy);
    ctx.lineTo(cx, cy + hh);
    ctx.lineTo(cx - hw, cy);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#0e0e13';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    if (tile.hasCrack || ((hash * 10) % 5 > 3.8)) {
      ctx.strokeStyle = 'rgba(10, 10, 14, 0.65)';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(cx - hw * 0.4, cy - hh * 0.1);
      ctx.lineTo(cx - hw * 0.1, cy + hh * 0.2);
      ctx.lineTo(cx + hw * 0.3, cy + hh * 0.1);
      ctx.stroke();
    }

    if (tile.roadStripe) {
      ctx.strokeStyle = 'rgba(212, 139, 40, 0.48)';
      ctx.lineWidth = 2.4;
      if (tile.roadStripe === 'dashed') ctx.setLineDash([8, 6]);

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

    // Película de chuva reluzente
    const puddleSheen = Math.sin(this.time * 2 + (tile.gx || 0)) * 0.04 + 0.07;
    ctx.fillStyle = `rgba(72, 149, 239, ${puddleSheen})`;
    ctx.fill();
  }

  _drawSidewalkTile(ctx, cx, cy, tile) {
    const hw = this.halfW;
    const hh = this.halfH;
    const curb = this.curbHeight;

    // Meio-fio frontal rebaixado
    ctx.fillStyle = '#14141a';
    ctx.beginPath();
    ctx.moveTo(cx - hw, cy);
    ctx.lineTo(cx, cy + hh);
    ctx.lineTo(cx, cy + hh + curb);
    ctx.lineTo(cx - hw, cy + curb);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#101015';
    ctx.beginPath();
    ctx.moveTo(cx, cy + hh);
    ctx.lineTo(cx + hw, cy);
    ctx.lineTo(cx + hw, cy + curb);
    ctx.lineTo(cx, cy + hh + curb);
    ctx.closePath();
    ctx.fill();

    // Topo da calçada elevado
    ctx.fillStyle = '#262632';
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

    if (tile.hasManhole) {
      const mx = cx;
      const my = cy - curb;
      ctx.fillStyle = '#101014';
      ctx.beginPath();
      ctx.ellipse(mx, my, hw * 0.42, hh * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#3d3d4a';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.strokeStyle = '#22222a';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(mx - 8, my); ctx.lineTo(mx + 8, my);
      ctx.moveTo(mx, my - 4); ctx.lineTo(mx, my + 4);
      ctx.stroke();
    }
  }

  _drawMudGravelTile(ctx, cx, cy, tile) {
    const hw = this.halfW;
    const hh = this.halfH;

    ctx.fillStyle = '#1a1815';
    ctx.beginPath();
    ctx.moveTo(cx, cy - hh);
    ctx.lineTo(cx + hw, cy);
    ctx.lineTo(cx, cy + hh);
    ctx.lineTo(cx - hw, cy);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#11100d';
    ctx.beginPath();
    ctx.ellipse(cx - hw * 0.2, cy, hw * 0.35, hh * 0.35, 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#3a352d';
    ctx.fillRect(cx - 6, cy - 2, 2.5, 2);
    ctx.fillRect(cx + 8, cy + 1, 3, 2);
  }

  _drawDinerCheckerTile(ctx, cx, cy, tile) {
    const hw = this.halfW;
    const hh = this.halfH;
    const isWhite = ((tile.gx || 0) + (tile.gy || 0)) % 2 === 0;
    ctx.fillStyle = isWhite ? '#d8d4cb' : '#15151a';

    ctx.beginPath();
    ctx.moveTo(cx, cy - hh);
    ctx.lineTo(cx + hw, cy);
    ctx.lineTo(cx, cy + hh);
    ctx.lineTo(cx - hw, cy);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#2e2e3a';
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }

  _drawWoodFloorTile(ctx, cx, cy, tile) {
    const hw = this.halfW;
    const hh = this.halfH;

    ctx.fillStyle = '#38261b';
    ctx.beginPath();
    ctx.moveTo(cx, cy - hh);
    ctx.lineTo(cx + hw, cy);
    ctx.lineTo(cx, cy + hh);
    ctx.lineTo(cx - hw, cy);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#1e140d';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(cx - hw * 0.5, cy - hh * 0.5);
    ctx.lineTo(cx + hw * 0.5, cy + hh * 0.5);
    ctx.stroke();
  }

  // ==========================================================================
  // 2. CONSTRUÇÃO REAL DAS FACHADAS DOS EDIFÍCIOS (VOLUMES PRISMÁTICOS SÓLIDOS)
  // ==========================================================================

  /**
   * Renderiza um edifício volumétrico completo com paredes verticais sólidas,
   * textura de época (tijolo queimado, madeira chalé, concreto armado sujo),
   * portas na calçada, janelas iluminadas com luz âmbar e telhados em duas águas.
   *
   * @param {CanvasRenderingContext2D} ctx Contexto Canvas 2D
   * @param {Object} b Dados do edifício ({ id, gx, gy, gw, gh, height, style, signText, ... })
   * @param {Object} camera Posição da câmera { x, y }
   * @param {boolean} [isPlayerInside=false] Se o jogador está dentro (aciona cutaway)
   */
  renderBuilding(ctx, b, camera, isPlayerInside = false) {
    if (!b) return;

    const gx = b.gx !== undefined ? b.gx : (b.x || 0);
    const gy = b.gy !== undefined ? b.gy : (b.y || 0);
    const gw = b.gw || 4;
    const gh = b.gh || b.gd || 4;
    const wallHeight = b.height || 88; // Altura Z real de 2.5 a 3.5 metros (~80-115px)
    const roofRise = b.roofRise || Math.round(wallHeight * 0.42); // Inclinação do telhado
    const buildingId = b.id || b.buildingId || 'building';

    // Gerenciamento de transparência por Roof Cutaway
    if (!this.roofAlphas.has(buildingId)) {
      this.roofAlphas.set(buildingId, {
        current: isPlayerInside ? 0.15 : 1.0,
        target: isPlayerInside ? 0.15 : 1.0
      });
    }
    const alphaState = this.roofAlphas.get(buildingId);
    alphaState.target = isPlayerInside ? 0.15 : 1.0;
    const alpha = alphaState.current;

    ctx.save();

    // 1. Coordenadas de tela dos 4 cantos da base no solo (Z = 0)
    const pBack = this.gridToScreen(gx, gy, 0, camera);             // Norte (fundo)
    const pEast = this.gridToScreen(gx + gw, gy, 0, camera);        // Leste (direita)
    const pFront = this.gridToScreen(gx + gw, gy + gh, 0, camera);  // Sul (frente centro)
    const pWest = this.gridToScreen(gx, gy + gh, 0, camera);        // Oeste (esquerda)

    // 2. Coordenadas dos cantos no topo das paredes verticais (Z = wallHeight)
    const tBack = this.gridToScreen(gx, gy, wallHeight, camera);
    const tEast = this.gridToScreen(gx + gw, gy, wallHeight, camera);
    const tFront = this.gridToScreen(gx + gw, gy + gh, wallHeight, camera);
    const tWest = this.gridToScreen(gx, gy + gh, wallHeight, camera);

    // 3. Ponto mais alto da cumeeira do telhado em duas águas (Z = wallHeight + roofRise)
    // Ridge corre pelo meio do edifício (de Oeste-Leste ou Norte-Sul conforme arquitetura)
    const ridgeBack = this.gridToScreen(gx + gw * 0.5, gy, wallHeight + roofRise, camera);
    const ridgeFront = this.gridToScreen(gx + gw * 0.5, gy + gh, wallHeight + roofRise, camera);

    // Identificação do estilo arquitetônico de 1989
    const style = b.style || this._inferBuildingStyle(b.id);

    // Paletas de cor por estilo: Sudoeste (40% luz) e Sudeste (80% luz)
    const colors = this._getBuildingPalette(style);

    // Sombra de contato no solo
    this._drawBuildingGroundShadow(ctx, pBack, pEast, pFront, pWest);

    // ========================================================================
    // PAREDES VERTICAIS VISÍVEIS (SE e SW)
    // ========================================================================

    // Se estiver em cutaway interior profundo, aplica transparência suave
    if (alpha < 0.99) {
      ctx.globalAlpha = Math.max(0.15, alpha);
    }

    // A. FACE SUDOESTE (SW) — Parede da Esquerda (Mais escura, ~40% luminosidade)
    this._drawSolidWallFace(ctx, pWest, pFront, tFront, tWest, colors.sw, colors.stroke, style, 'sw', b);

    // B. FACE SUDESTE (SE) — Parede da Direita (Iluminada pela luz ambiente, ~80% luminosidade)
    this._drawSolidWallFace(ctx, pFront, pEast, tEast, tFront, colors.se, colors.stroke, style, 'se', b);

    // ========================================================================
    // PORTAS E JANELAS NO NÍVEL DA CALÇADA
    // ========================================================================
    this._drawBuildingOpenings(ctx, b, gx, gy, gw, gh, wallHeight, camera, colors, style);

    // ========================================================================
    // LETREIROS COMERCIAIS DISCRETOS NA FACHADA (Acima da porta)
    // ========================================================================
    this._drawBuildingStorefrontSign(ctx, b, gx, gy, gw, gh, wallHeight, camera);

    // ========================================================================
    // TELHADO EM DUAS ÁGUAS (GABLED ROOF) COM TEXTURA DE ÉPOCA
    // ========================================================================
    if (alpha > 0.05) {
      ctx.globalAlpha = alpha;
      this._drawGabledRoof(
        ctx,
        tBack, tEast, tFront, tWest,
        ridgeBack, ridgeFront,
        wallHeight, roofRise,
        colors, style, b
      );
    }

    ctx.restore();
  }

  /**
   * Determina estilo arquitetônico padrão por identificador de edifício.
   * @private
   */
  _inferBuildingStyle(id) {
    if (!id) return 'concrete';
    const s = id.toLowerCase();
    if (s.includes('meat') || s.includes('depot') || s.includes('scrapyard') || s.includes('frigorifico')) {
      return 'brick';
    }
    if (s.includes('sarah') || s.includes('ruth') || s.includes('home') || s.includes('miller') || s.includes('house')) {
      return 'wood';
    }
    if (s.includes('diner')) {
      return 'diner';
    }
    return 'concrete'; // Delegacia, Represa, Cartório, Biblioteca
  }

  /**
   * Paletas de iluminação 40% (SW) e 80% (SE) por material de época.
   * @private
   */
  _getBuildingPalette(style) {
    switch (style) {
      case 'brick':
        return {
          sw: '#241a18', // 40% fuligem queimada
          se: '#48342f', // 80% tijolo iluminado
          top: '#59413b',
          roofSW: '#1b2022',
          roofSE: '#2e383a',
          stroke: '#100c0a',
          trim: '#61463e'
        };
      case 'wood':
        return {
          sw: '#2d2e29', // 40% tábua desgastada escura
          se: '#52544a', // 80% tábua chalé norte-americano
          top: '#63665a',
          roofSW: '#222627',
          roofSE: '#373f42',
          stroke: '#141412',
          trim: '#757868'
        };
      case 'diner':
        return {
          sw: '#3a2e26', // 40% base marrom diner
          se: '#735b4b', // 80% esmalte clássico
          top: '#876b58',
          roofSW: '#1f272a',
          roofSE: '#334044',
          stroke: '#181412',
          trim: '#b84a39'
        };
      case 'concrete':
      default:
        return {
          sw: '#1c2224', // 40% concreto armado sombreado
          se: '#3d484b', // 80% concreto repartição policial
          top: '#4e5c5f',
          roofSW: '#161c1e',
          roofSE: '#283235',
          stroke: '#0e1213',
          trim: '#586668'
        };
    }
  }

  _drawBuildingGroundShadow(ctx, pBack, pEast, pFront, pWest) {
    ctx.save();
    ctx.fillStyle = 'rgba(5, 8, 12, 0.65)';
    ctx.beginPath();
    ctx.moveTo(pWest.x - 12, pWest.y + 4);
    ctx.lineTo(pFront.x + 8, pFront.y + 14);
    ctx.lineTo(pEast.x + 18, pEast.y + 8);
    ctx.lineTo(pEast.x, pEast.y);
    ctx.lineTo(pFront.x, pFront.y);
    ctx.lineTo(pWest.x, pWest.y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /**
   * Desenha uma face vertical sólida de parede prismática com texturas de época.
   * @private
   */
  _drawSolidWallFace(ctx, p1, p2, t2, t1, fillColor, strokeColor, style, orientation, b) {
    ctx.save();

    // 1. Preenchimento base da face prismática sólida
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(t2.x, t2.y);
    ctx.lineTo(t1.x, t1.y);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.0;
    ctx.stroke();

    // 2. Textura de época procedural
    if (style === 'brick') {
      // Tijolo aparente cinza/marrom-escuro queimado por fuligem
      this._renderBrickTextureOnFace(ctx, p1, p2, t2, t1, orientation);
    } else if (style === 'wood') {
      // Tábuas de madeira desgastada estilo chalé norte-americano
      this._renderClapboardTextureOnFace(ctx, p1, p2, t2, t1, orientation);
    } else if (style === 'concrete') {
      // Concreto armado sujo com juntas e escorrimento de chuva
      this._renderConcreteTextureOnFace(ctx, p1, p2, t2, t1, orientation);
    } else if (style === 'diner') {
      // Painéis horizontais de esmalte e frisos retro
      this._renderDinerTextureOnFace(ctx, p1, p2, t2, t1, orientation);
    }

    // 3. Rodapé/embasamento de concreto úmido no solo
    ctx.fillStyle = 'rgba(8, 10, 14, 0.45)';
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p2.x, p2.y - 7);
    ctx.lineTo(p1.x, p1.y - 7);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  _renderBrickTextureOnFace(ctx, p1, p2, t2, t1, orientation) {
    const isSW = orientation === 'sw';
    ctx.strokeStyle = isSW ? 'rgba(10, 8, 7, 0.45)' : 'rgba(18, 14, 12, 0.35)';
    ctx.lineWidth = 0.8;

    const steps = 14;
    for (let i = 1; i < steps; i++) {
      const f = i / steps;
      const lx1 = p1.x + (t1.x - p1.x) * f;
      const ly1 = p1.y + (t1.y - p1.y) * f;
      const lx2 = p2.x + (t2.x - p2.x) * f;
      const ly2 = p2.y + (t2.y - p2.y) * f;

      ctx.beginPath();
      ctx.moveTo(lx1, ly1);
      ctx.lineTo(lx2, ly2);
      ctx.stroke();

      // Juntas verticais alternadas
      const vCols = 6;
      for (let j = 0; j < vCols; j++) {
        const offset = (i % 2 === 0 ? 0.08 : 0.0);
        const fj = (j / vCols) + offset;
        if (fj > 0.05 && fj < 0.95) {
          const vx1 = lx1 + (lx2 - lx1) * fj;
          const vy1 = ly1 + (ly2 - ly1) * fj;
          const prevL1x = p1.x + (t1.x - p1.x) * ((i - 1) / steps);
          const prevL1y = p1.y + (t1.y - p1.y) * ((i - 1) / steps);
          const prevL2x = p2.x + (t2.x - p2.x) * ((i - 1) / steps);
          const prevL2y = p2.y + (t2.y - p2.y) * ((i - 1) / steps);
          const vx2 = prevL1x + (prevL2x - prevL1x) * fj;
          const vy2 = prevL1y + (prevL2y - prevL1y) * fj;

          ctx.beginPath();
          ctx.moveTo(vx1, vy1);
          ctx.lineTo(vx2, vy2);
          ctx.stroke();
        }
      }
    }

    // Manchas de fuligem escorrendo do topo
    ctx.fillStyle = 'rgba(8, 6, 6, 0.4)';
    ctx.beginPath();
    ctx.moveTo(t1.x, t1.y);
    ctx.lineTo(t2.x, t2.y);
    ctx.lineTo(t2.x, t2.y + 12);
    ctx.lineTo(t1.x, t1.y + 8);
    ctx.closePath();
    ctx.fill();
  }

  _renderClapboardTextureOnFace(ctx, p1, p2, t2, t1, orientation) {
    const isSW = orientation === 'sw';
    ctx.strokeStyle = isSW ? 'rgba(15, 18, 15, 0.55)' : 'rgba(25, 30, 25, 0.4)';
    ctx.lineWidth = 1.0;

    const steps = 18;
    for (let i = 1; i < steps; i++) {
      const f = i / steps;
      const lx1 = p1.x + (t1.x - p1.x) * f;
      const ly1 = p1.y + (t1.y - p1.y) * f;
      const lx2 = p2.x + (t2.x - p2.x) * f;
      const ly2 = p2.y + (t2.y - p2.y) * f;

      ctx.beginPath();
      ctx.moveTo(lx1, ly1);
      ctx.lineTo(lx2, ly2);
      ctx.stroke();

      // Sombra sutil da sobreposição das tábuas
      ctx.fillStyle = isSW ? 'rgba(10, 12, 10, 0.22)' : 'rgba(20, 24, 20, 0.15)';
      ctx.fillRect(Math.min(lx1, lx2), Math.min(ly1, ly2), Math.abs(lx2 - lx1), 1.2);
    }

    // Tábuas verticais de quina (corner boards)
    ctx.fillStyle = isSW ? '#202420' : '#3c4238';
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p1.x + (p2.x - p1.x) * 0.05, p1.y + (p2.y - p1.y) * 0.05);
    ctx.lineTo(t1.x + (t2.x - t1.x) * 0.05, t1.y + (t2.y - t1.y) * 0.05);
    ctx.lineTo(t1.x, t1.y);
    ctx.closePath();
    ctx.fill();
  }

  _renderConcreteTextureOnFace(ctx, p1, p2, t2, t1, orientation) {
    const isSW = orientation === 'sw';
    // Juntas de dilatação verticais do concreto pré-moldado
    ctx.strokeStyle = isSW ? 'rgba(8, 12, 14, 0.6)' : 'rgba(18, 24, 28, 0.45)';
    ctx.lineWidth = 1.2;

    const panels = 4;
    for (let i = 1; i < panels; i++) {
      const f = i / panels;
      const bx = p1.x + (p2.x - p1.x) * f;
      const by = p1.y + (p2.y - p1.y) * f;
      const tx = t1.x + (t2.x - t1.x) * f;
      const ty = t1.y + (t2.y - t1.y) * f;

      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(tx, ty);
      ctx.stroke();

      // Manchas escuras de chuva e fuligem escorrendo pelas juntas
      ctx.fillStyle = 'rgba(6, 10, 12, 0.35)';
      ctx.fillRect(tx - 2, ty, 4, (by - ty) * 0.6);
    }

    // Friso horizontal no topo da cornija
    ctx.strokeStyle = isSW ? '#14181a' : '#2a3436';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(t1.x, t1.y + 4);
    ctx.lineTo(t2.x, t2.y + 4);
    ctx.stroke();
  }

  _renderDinerTextureOnFace(ctx, p1, p2, t2, t1, orientation) {
    const isSW = orientation === 'sw';
    // Faixa esmaltada vermelha clássica no terço superior
    const yTop1 = t1.y + (p1.y - t1.y) * 0.35;
    const xTop1 = t1.x + (p1.x - t1.x) * 0.35;
    const yTop2 = t2.y + (p2.y - t2.y) * 0.35;
    const xTop2 = t2.x + (p2.x - t2.x) * 0.35;

    ctx.fillStyle = isSW ? '#52221b' : '#8e3529';
    ctx.beginPath();
    ctx.moveTo(t1.x, t1.y);
    ctx.lineTo(t2.x, t2.y);
    ctx.lineTo(xTop2, yTop2);
    ctx.lineTo(xTop1, yTop1);
    ctx.closePath();
    ctx.fill();

    // Friso de alumínio reluzente
    ctx.strokeStyle = '#c5c2ba';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(xTop1, yTop1);
    ctx.lineTo(xTop2, yTop2);
    ctx.stroke();
  }

  /**
   * Desenha portas reais no nível da calçada e janelas iluminadas com luz âmbar.
   * @private
   */
  _drawBuildingOpenings(ctx, b, gx, gy, gw, gh, wallH, camera, colors, style) {
    // A. PORTA PRINCIPAL NO NÍVEL DA CALÇADA (Z = 0)
    // Localizada centralizada na face frontal sudoeste (gx a gx + gw ao longo de gy + gh)
    const doorGX = gx + gw * 0.5;
    const doorGY = gy + gh;
    const pDoorBase = this.gridToScreen(doorGX, doorGY, 0, camera);
    const doorW = 22;
    const doorH = 44;

    ctx.save();

    // Vão da porta (reentrância escura na alvenaria)
    ctx.fillStyle = '#0a0b0e';
    ctx.fillRect(pDoorBase.x - doorW / 2 - 2, pDoorBase.y - doorH - 2, doorW + 4, doorH + 4);

    if (style === 'brick' || b.id === 'meatpacking') {
      // Porta industrial pesada de ferro corrugado com reforço em X
      ctx.fillStyle = '#222629';
      ctx.fillRect(pDoorBase.x - doorW / 2, pDoorBase.y - doorH, doorW, doorH);

      ctx.strokeStyle = '#101416';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(pDoorBase.x - doorW / 2, pDoorBase.y - doorH, doorW, doorH);

      // Frisos de aço corrugado
      for (let y = pDoorBase.y - doorH + 4; y < pDoorBase.y; y += 5) {
        ctx.beginPath();
        ctx.moveTo(pDoorBase.x - doorW / 2 + 2, y);
        ctx.lineTo(pDoorBase.x + doorW / 2 - 2, y);
        ctx.stroke();
      }
      // Rebites de ferro
      ctx.fillStyle = '#4f585c';
      ctx.fillRect(pDoorBase.x - doorW / 2 + 2, pDoorBase.y - doorH + 3, 2, 2);
      ctx.fillRect(pDoorBase.x + doorW / 2 - 4, pDoorBase.y - doorH + 3, 2, 2);
    } else if (style === 'wood') {
      // Porta residencial de madeira maciça envernizada com almofadas e maçaneta de latão
      ctx.fillStyle = '#3a2b1c';
      ctx.fillRect(pDoorBase.x - doorW / 2, pDoorBase.y - doorH, doorW, doorH);

      ctx.strokeStyle = '#1e140b';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(pDoorBase.x - doorW / 2, pDoorBase.y - doorH, doorW, doorH);

      // Almofadas da porta
      ctx.strokeRect(pDoorBase.x - doorW / 2 + 3, pDoorBase.y - doorH + 5, doorW - 6, 14);
      ctx.strokeRect(pDoorBase.x - doorW / 2 + 3, pDoorBase.y - doorH + 23, doorW - 6, 16);

      // Maçaneta dourada de latão
      ctx.fillStyle = '#d4af37';
      ctx.fillRect(pDoorBase.x + doorW / 2 - 5, pDoorBase.y - doorH * 0.45, 3, 4);
    } else {
      // Porta de repartição policial ou comércio (vidro temperado com frisos e puxador)
      ctx.fillStyle = 'rgba(18, 25, 32, 0.95)';
      ctx.fillRect(pDoorBase.x - doorW / 2, pDoorBase.y - doorH, doorW, doorH);

      ctx.strokeStyle = '#3d4b52';
      ctx.lineWidth = 1.4;
      ctx.strokeRect(pDoorBase.x - doorW / 2, pDoorBase.y - doorH, doorW, doorH);

      // Vidro com reflexo suave
      ctx.fillStyle = 'rgba(120, 180, 220, 0.15)';
      ctx.fillRect(pDoorBase.x - doorW / 2 + 3, pDoorBase.y - doorH + 4, doorW - 6, doorH - 8);

      // Barra de empurrar de latão
      ctx.fillStyle = '#d4af37';
      ctx.fillRect(pDoorBase.x - doorW / 2 + 2, pDoorBase.y - doorH * 0.48, doorW - 4, 3);
    }

    ctx.restore();

    // B. JANELAS ILUMINADAS COM LUZ ÂMBAR SUAVE
    // Posicionadas nas duas fachadas
    const winOffsets = [
      { gx: gx + gw * 0.22, gy: gy + gh, z: 28 }, // Janela SW esquerda
      { gx: gx + gw * 0.78, gy: gy + gh, z: 28 }, // Janela SW direita
      { gx: gx + gw, gy: gy + gh * 0.4, z: 32 }   // Janela SE lateral
    ];

    for (let i = 0; i < winOffsets.length; i++) {
      const wo = winOffsets[i];
      const pWin = this.gridToScreen(wo.gx, wo.gy, wo.z, camera);
      this._drawAmberLitWindow(ctx, pWin.x, pWin.y, 18, 26, b.id === 'police');
    }
  }

  /**
   * Janela com caixilho recortado, vazamento de luz âmbar incandescente no asfalto e divisórias.
   * @private
   */
  _drawAmberLitWindow(ctx, wx, wy, w, h, isBarred = false) {
    ctx.save();

    // 1. Projeção de luz âmbar no piso molhado
    const groundGlow = ctx.createRadialGradient(wx, wy + 26, 2, wx, wy + 32, 55);
    groundGlow.addColorStop(0.0, 'rgba(240, 165, 45, 0.42)');
    groundGlow.addColorStop(0.55, 'rgba(212, 139, 40, 0.15)');
    groundGlow.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = groundGlow;
    ctx.beginPath();
    ctx.ellipse(wx, wy + 32, 38, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Vão rebaixado na alvenaria
    ctx.fillStyle = '#090a0d';
    ctx.fillRect(wx - w / 2 - 2, wy - h / 2 - 2, w + 4, h + 4);

    // 3. Vidro iluminado internamente por lâmpada incandescente de época (#e09f3e a #ffbe0b)
    const winGrad = ctx.createLinearGradient(wx, wy - h / 2, wx, wy + h / 2);
    winGrad.addColorStop(0.0, '#ffe89e');
    winGrad.addColorStop(0.4, '#fca311');
    winGrad.addColorStop(1.0, '#b86609');
    ctx.fillStyle = winGrad;
    ctx.fillRect(wx - w / 2, wy - h / 2, w, h);

    // 4. Caixilho de madeira/ferro e divisórias em cruz
    ctx.strokeStyle = '#1a1815';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(wx - w / 2, wy - h / 2, w, h);

    ctx.lineWidth = 1.0;
    ctx.beginPath();
    // Montante vertical
    ctx.moveTo(wx, wy - h / 2); ctx.lineTo(wx, wy + h / 2);
    // Travessa horizontal
    ctx.moveTo(wx - w / 2, wy); ctx.lineTo(wx + w / 2, wy);
    ctx.stroke();

    // Grades de ferro da cela na delegacia
    if (isBarred) {
      ctx.strokeStyle = '#121618';
      ctx.lineWidth = 1.4;
      for (let bx = wx - w / 2 + 4; bx < wx + w / 2; bx += 5) {
        ctx.beginPath();
        ctx.moveTo(bx, wy - h / 2);
        ctx.lineTo(bx, wy + h / 2);
        ctx.stroke();
      }
    }

    // Peitoril da janela
    ctx.fillStyle = '#2c3336';
    ctx.fillRect(wx - w / 2 - 3, wy + h / 2, w + 6, 3);

    ctx.restore();
  }

  /**
   * Letreiros comerciais discretos fixados acima da porta ou na fachada.
   * @private
   */
  _drawBuildingStorefrontSign(ctx, b, gx, gy, gw, gh, wallH, camera) {
    const title = b.signText || this._getDefaultSignText(b.id);
    if (!title) return;

    // Fixado logo acima da porta principal
    const signGX = gx + gw * 0.5;
    const signGY = gy + gh;
    const signZ = 54; // Logo acima do vão da porta (44px)
    const pSign = this.gridToScreen(signGX, signGY, signZ, camera);

    const signW = Math.min(130, Math.max(68, title.length * 6.5 + 16));
    const signH = 15;

    ctx.save();

    // 1. Sombra do letreiro fixado na parede
    ctx.fillStyle = 'rgba(5, 7, 10, 0.65)';
    ctx.fillRect(pSign.x - signW / 2 + 1, pSign.y - signH / 2 + 2, signW, signH);

    // 2. Placa de madeira ou metal esmaltado
    const isPolice = b.id === 'police';
    ctx.fillStyle = isPolice ? '#1c2e30' : '#2b2318';
    ctx.fillRect(pSign.x - signW / 2, pSign.y - signH / 2, signW, signH);

    // Moldura chanfrada de metal/latão
    ctx.strokeStyle = isPolice ? '#4e7175' : '#7d6141';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(pSign.x - signW / 2, pSign.y - signH / 2, signW, signH);

    // Parafusos de fixação nas quinas
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(pSign.x - signW / 2 + 2, pSign.y - signH / 2 + 2, 2, 2);
    ctx.fillRect(pSign.x + signW / 2 - 4, pSign.y - signH / 2 + 2, 2, 2);
    ctx.fillRect(pSign.x - signW / 2 + 2, pSign.y + signH / 2 - 4, 2, 2);
    ctx.fillRect(pSign.x + signW / 2 - 4, pSign.y + signH / 2 - 4, 2, 2);

    // 3. Tipografia analógica datilografada mecânica (1989)
    ctx.font = '700 8.5px "Courier New", monospace';
    ctx.fillStyle = isPolice ? '#e8dcc4' : '#f0cf97'; // Dourado âmbar envelhecido
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title.toUpperCase(), pSign.x, pSign.y + 0.5);

    ctx.restore();
  }

  _getDefaultSignText(id) {
    if (!id) return '';
    const map = {
      police: 'DELEGACIA DE POLÍCIA',
      sarah: 'CASA DOS MILLER',
      home: 'RESIDÊNCIA WARD',
      ruth: 'CASA DE RUTH MERCER',
      diner: 'DOUBLE R DINER',
      pharmacy: 'FARMÁCIA VALE • 1937',
      meatpacking: 'SLOANE • CÂMARAS FRIAS',
      scrapyard: 'SAM • OFICINA & SUCATA',
      registry: 'CARTÓRIO MUNICIPAL',
      dam: 'CONTROLE DA REPRESA',
      library: 'BIBLIOTECA PÚBLICA',
      depot: 'DEPÓSITO NORTE'
    };
    return map[id] || id.toUpperCase();
  }

  /**
   * Telhado em duas águas sólido com cumeeira real e textura de telhas de asfalto/zinco.
   * @private
   */
  _drawGabledRoof(ctx, tBack, tEast, tFront, tWest, rBack, rFront, wallH, rise, colors, style, b) {
    ctx.save();

    // 1. ÁGUA ESQUERDA DO TELHADO (Face Sudoeste Inclinada)
    // Conecta cumeeira (rBack -> rFront) à beirada esquerda (tBack -> tWest)
    ctx.fillStyle = colors.roofSW;
    ctx.beginPath();
    ctx.moveTo(rBack.x, rBack.y);
    ctx.lineTo(rFront.x, rFront.y);
    ctx.lineTo(tFront.x + (tWest.x - tFront.x) * 0.95, tFront.y + (tWest.y - tFront.y) * 0.95);
    ctx.lineTo(tWest.x, tWest.y);
    ctx.lineTo(tBack.x, tBack.y);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#0f1416';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Textura de telhas de asfalto/zinco na água esquerda
    this._renderRoofTexture(ctx, rBack, rFront, tWest, tBack, style, 'sw');

    // 2. ÁGUA DIREITA DO TELHADO (Face Sudeste Inclinada - Iluminada)
    // Conecta cumeeira (rBack -> rFront) à beirada direita (tBack -> tEast)
    ctx.fillStyle = colors.roofSE;
    ctx.beginPath();
    ctx.moveTo(rBack.x, rBack.y);
    ctx.lineTo(rFront.x, rFront.y);
    ctx.lineTo(tFront.x, tFront.y);
    ctx.lineTo(tEast.x, tEast.y);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#12181b';
    ctx.stroke();

    this._renderRoofTexture(ctx, rBack, rFront, tEast, tFront, style, 'se');

    // 3. FRONTÃO TRIANGULAR FRONTAL (Oitão da Fachada Frontal)
    // Preenche o triângulo entre tWest, rFront e tFront
    ctx.fillStyle = colors.se;
    ctx.beginPath();
    ctx.moveTo(tWest.x, tWest.y);
    ctx.lineTo(rFront.x, rFront.y);
    ctx.lineTo(tFront.x, tFront.y);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = colors.stroke;
    ctx.stroke();

    // Beiral frontal com sombra profunda projetada sobre a parede
    ctx.fillStyle = 'rgba(6, 8, 10, 0.55)';
    ctx.beginPath();
    ctx.moveTo(tWest.x - 4, tWest.y + 2);
    ctx.lineTo(rFront.x, rFront.y + 4);
    ctx.lineTo(tFront.x + 4, tFront.y + 2);
    ctx.lineTo(tFront.x, tFront.y + 6);
    ctx.lineTo(tWest.x, tWest.y + 6);
    ctx.closePath();
    ctx.fill();

    // Chaminé industrial ou residencial
    if (b.hasChimney || style === 'brick' || style === 'wood') {
      const chX = (rBack.x + rFront.x) * 0.5 - 10;
      const chY = (rBack.y + rFront.y) * 0.5 - 16;
      ctx.fillStyle = '#2c1c18';
      ctx.fillRect(chX, chY, 12, 20);
      ctx.fillStyle = '#422822';
      ctx.fillRect(chX - 2, chY - 3, 16, 4);

      // Fumaça sutil dissipando na chuva
      ctx.strokeStyle = 'rgba(200, 205, 215, 0.22)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const st = this.time * 2.5;
      ctx.moveTo(chX + 6, chY - 3);
      ctx.bezierCurveTo(
        chX + 8 + Math.sin(st) * 4, chY - 14,
        chX + 4 + Math.cos(st) * 6, chY - 26,
        chX + 10 + Math.sin(st * 1.5) * 8, chY - 40
      );
      ctx.stroke();
    }

    ctx.restore();
  }

  _renderRoofTexture(ctx, r1, r2, e2, e1, style, orientation) {
    const isSW = orientation === 'sw';
    ctx.strokeStyle = isSW ? 'rgba(8, 10, 12, 0.5)' : 'rgba(20, 26, 30, 0.35)';
    ctx.lineWidth = 1.0;

    const layers = 8;
    for (let i = 1; i < layers; i++) {
      const f = i / layers;
      const xA = r1.x + (e1.x - r1.x) * f;
      const yA = r1.y + (e1.y - r1.y) * f;
      const xB = r2.x + (e2.x - r2.x) * f;
      const yB = r2.y + (e2.y - r2.y) * f;

      ctx.beginPath();
      ctx.moveTo(xA, yA);
      ctx.lineTo(xB, yB);
      ctx.stroke();
    }
  }

  // ==========================================================================
  // 3. DIFERENCIAÇÃO VISUAL DOS NPCS (renderEntity COM WALK CYCLE PROCEDURAL)
  // ==========================================================================

  /**
   * Renderiza qualquer personagem ou pedestre no mundo com silhueta e paleta
   * procedurais baseadas em characterId, além de animação de ciclo de caminhada.
   *
   * @param {CanvasRenderingContext2D} ctx Contexto Canvas 2D
   * @param {Object} entity Entidade ({ characterId, id, gx, gy, gz, vx, vy, ... })
   * @param {Object} camera Posição da câmera { x, y }
   */
  renderEntity(ctx, entity, camera) {
    if (!entity) return;

    const cid = (entity.characterId || entity.id || 'civilian').toLowerCase();
    const gx = entity.gx !== undefined ? entity.gx : (entity.x || 0);
    const gy = entity.gy !== undefined ? entity.gy : (entity.y || 0);
    const gz = entity.gz !== undefined ? entity.gz : (entity.z || 0);

    const pos = this.gridToScreen(gx, gy, gz, camera);

    const vx = entity.vx || 0;
    const vy = entity.vy || 0;
    const isMoving = Math.hypot(vx, vy) > 0.05 || entity.isMoving;

    // Ciclo de caminhada (walk cycle) com oscilação dos pés e tronco
    const walkSpeed = 9.0;
    const walkPhase = isMoving ? (this.time * walkSpeed) % (Math.PI * 2) : 0;

    // Oscilação dos membros
    const legSwingL = isMoving ? Math.sin(walkPhase) * 5.5 : 0;
    const legSwingR = isMoving ? -Math.sin(walkPhase) * 5.5 : 0;
    const torsoBob = isMoving ? Math.abs(Math.sin(walkPhase * 2)) * 1.6 : 0;
    const armSwing = isMoving ? Math.sin(walkPhase) * 4.0 : 0;

    ctx.save();

    // 1. Sombra projetada no asfalto molhado
    ctx.fillStyle = 'rgba(6, 10, 14, 0.65)';
    ctx.beginPath();
    ctx.ellipse(pos.x, pos.y + 1, 11, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Classificação de arquétipo procedural
    const archetype = this._getCharacterArchetype(cid);

    const px = pos.x;
    const py = pos.y - torsoBob;

    switch (archetype) {
      case 'police':
        this._drawPoliceNPC(ctx, px, py, legSwingL, legSwingR, armSwing, cid);
        break;
      case 'worker':
        this._drawWorkerNPC(ctx, px, py, legSwingL, legSwingR, armSwing, cid);
        break;
      case 'alex':
        this._drawAlexHale(ctx, px, py, legSwingL, legSwingR, armSwing);
        break;
      case 'civilian_umbrella':
        this._drawUmbrellaCivilianNPC(ctx, px, py, legSwingL, legSwingR, armSwing, cid);
        break;
      case 'civilian_slicker':
        this._drawSlickerCivilianNPC(ctx, px, py, legSwingL, legSwingR, armSwing, cid);
        break;
      case 'civilian':
      default:
        this._drawTrenchcoatCivilianNPC(ctx, px, py, legSwingL, legSwingR, armSwing, cid);
        break;
    }

    ctx.restore();
  }

  _getCharacterArchetype(cid) {
    if (cid === 'alex') return 'alex';
    if (cid.includes('bobby') || cid.includes('ruth') || cid.includes('police') || cid.includes('deputy')) {
      return 'police';
    }
    if (cid.includes('sam') || cid.includes('worker') || cid.includes('meat') || cid.includes('mechanic')) {
      return 'worker';
    }
    if (cid.includes('slicker') || cid.includes('fisherman') || cid.includes('yellow')) {
      return 'civilian_slicker';
    }
    if (cid.includes('umbrella') || cid.includes('rain') || cid.includes('sarah') || cid.includes('helen')) {
      return 'civilian_umbrella';
    }
    return 'civilian';
  }

  /**
   * Policial fardado (Bobby / Ruth): Bege/marrom policial, quepe com distintivo dourado.
   * @private
   */
  _drawPoliceNPC(ctx, x, y, legL, legR, arm, cid) {
    const isRuth = cid.includes('ruth');

    // 1. Pernas e Botas Policiais Negras
    ctx.strokeStyle = '#2b221a'; // Calça marrom escura da polícia
    ctx.lineWidth = 3.5;
    // Perna esquerda
    ctx.beginPath();
    ctx.moveTo(x - 3, y - 18);
    ctx.lineTo(x - 3 + legL * 0.7, y - 5);
    ctx.lineTo(x - 3 + legL, y);
    ctx.stroke();

    // Perna direita
    ctx.beginPath();
    ctx.moveTo(x + 3, y - 18);
    ctx.lineTo(x + 3 + legR * 0.7, y - 5);
    ctx.lineTo(x + 3 + legR, y);
    ctx.stroke();

    // Galochas/botas pretas
    ctx.fillStyle = '#101014';
    ctx.fillRect(x - 5 + legL, y - 2, 5, 3);
    ctx.fillRect(x + 1 + legR, y - 2, 5, 3);

    // 2. Jaqueta/Camisa Fardada Bege-Cáqui Policial (#6b5843)
    ctx.fillStyle = isRuth ? '#5c4b37' : '#6b5843';
    ctx.beginPath();
    ctx.moveTo(x - 7, y - 35);
    ctx.lineTo(x + 7, y - 35);
    ctx.lineTo(x + 6, y - 18);
    ctx.lineTo(x - 6, y - 18);
    ctx.closePath();
    ctx.fill();

    // Cinto de utilidades de couro preto com coldre
    ctx.fillStyle = '#141416';
    ctx.fillRect(x - 7, y - 19, 14, 3.5);
    ctx.fillStyle = '#d4af37'; // Fivela de latão
    ctx.fillRect(x - 2, y - 19, 4, 3.5);

    // Distintivo policial dourado no peito esquerdo
    ctx.fillStyle = '#d4af37';
    ctx.beginPath();
    ctx.arc(x - 3, y - 28, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // 3. Braços com oscilação
    ctx.strokeStyle = '#5c4b37';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(x - 6, y - 33);
    ctx.lineTo(x - 8 - arm * 0.6, y - 22);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + 6, y - 33);
    ctx.lineTo(x + 8 + arm * 0.6, y - 22);
    ctx.stroke();

    // 4. Cabeça e Quepe Policial
    ctx.fillStyle = '#d6b290'; // Tom de pele
    ctx.beginPath();
    ctx.arc(x, y - 39, 4.2, 0, Math.PI * 2);
    ctx.fill();

    // Quepe Policial Militar/Xerife (copa bege e aba preta com fita dourada)
    ctx.fillStyle = '#4a3b2b'; // Copa do quepe
    ctx.fillRect(x - 5.5, y - 46, 11, 4.5);
    ctx.fillStyle = '#141418'; // Aba preta
    ctx.fillRect(x - 6.5, y - 42.5, 13, 2);
    ctx.fillStyle = '#d4af37'; // Distintivo/fita
    ctx.fillRect(x - 2, y - 44, 4, 2);
  }

  /**
   * Trabalhador (Frigorífico / Oficina / Sam): Macacão cinza/azul e galochas pretas.
   * @private
   */
  _drawWorkerNPC(ctx, x, y, legL, legR, arm, cid) {
    const isSam = cid.includes('sam');

    // 1. Pernas de macacão azul-petróleo industrial
    ctx.strokeStyle = isSam ? '#323c40' : '#283642';
    ctx.lineWidth = 4.0;
    ctx.beginPath();
    ctx.moveTo(x - 3, y - 17);
    ctx.lineTo(x - 3 + legL, y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + 3, y - 17);
    ctx.lineTo(x + 3 + legR, y);
    ctx.stroke();

    // Galochas industriais pretas de borracha
    ctx.fillStyle = '#0d1012';
    ctx.fillRect(x - 6 + legL, y - 4, 6, 5);
    ctx.fillRect(x + 1 + legR, y - 4, 6, 5);

    // 2. Tronco do Macacão/Avental Pesado
    ctx.fillStyle = isSam ? '#3a4448' : '#2f3f4d';
    ctx.beginPath();
    ctx.moveTo(x - 8, y - 34);
    ctx.lineTo(x + 8, y - 34);
    ctx.lineTo(x + 6, y - 17);
    ctx.lineTo(x - 6, y - 17);
    ctx.closePath();
    ctx.fill();

    // Alças do macacão de operário
    ctx.strokeStyle = '#1d2730';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - 5, y - 34); ctx.lineTo(x - 4, y - 24);
    ctx.moveTo(x + 5, y - 34); ctx.lineTo(x + 4, y - 24);
    ctx.stroke();

    // 3. Braços fortes com luvas de trabalho
    ctx.strokeStyle = isSam ? '#3a4448' : '#2f3f4d';
    ctx.lineWidth = 3.0;
    ctx.beginPath();
    ctx.moveTo(x - 7, y - 32);
    ctx.lineTo(x - 9 - arm * 0.5, y - 20);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + 7, y - 32);
    ctx.lineTo(x + 9 + arm * 0.5, y - 20);
    ctx.stroke();

    // Ferramenta na mão (chave inglesa ou gancho de frigorífico)
    ctx.strokeStyle = '#8a9499';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x + 9 + arm * 0.5, y - 20);
    ctx.lineTo(x + 12 + arm * 0.5, y - 13);
    ctx.stroke();

    // 4. Cabeça e Gorro de Lã (Watch Cap)
    ctx.fillStyle = '#cca082';
    ctx.beginPath();
    ctx.arc(x, y - 38, 4.2, 0, Math.PI * 2);
    ctx.fill();

    // Gorro de lã vermelho-escuro ou cinza
    ctx.fillStyle = isSam ? '#752824' : '#25292c';
    ctx.beginPath();
    ctx.arc(x, y - 41, 4.6, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(x - 5, y - 42, 10, 3);
  }

  /**
   * Civil com guarda-chuva preto aberto sob a tempestade de NorthVale.
   * @private
   */
  _drawUmbrellaCivilianNPC(ctx, x, y, legL, legR, arm, cid) {
    // 1. Pernas e sapatos
    ctx.strokeStyle = '#181a1f';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(x - 3, y - 16); ctx.lineTo(x - 3 + legL, y); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 3, y - 16); ctx.lineTo(x + 3 + legR, y); ctx.stroke();

    // 2. Sobretudo longo verde-oliva (#3d4538)
    ctx.fillStyle = '#3a4437';
    ctx.beginPath();
    ctx.moveTo(x - 7, y - 34);
    ctx.lineTo(x + 7, y - 34);
    ctx.lineTo(x + 8, y - 14);
    ctx.lineTo(x - 8, y - 14);
    ctx.closePath();
    ctx.fill();

    // Cachecol vermelho escuro
    ctx.strokeStyle = '#732622';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x - 4, y - 34); ctx.lineTo(x + 4, y - 34); ctx.lineTo(x + 2, y - 26);
    ctx.stroke();

    // 3. Cabeça
    ctx.fillStyle = '#d4aa8a';
    ctx.beginPath();
    ctx.arc(x, y - 38, 4.0, 0, Math.PI * 2);
    ctx.fill();

    // 4. Haste e cúpula de guarda-chuva preto aberto
    ctx.strokeStyle = '#484d54';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(x + 4, y - 24);
    ctx.lineTo(x + 2, y - 45);
    ctx.stroke();

    // Cúpula abaulada do guarda-chuva de nylon preto (#141619)
    ctx.fillStyle = '#141619';
    ctx.beginPath();
    ctx.arc(x + 2, y - 46, 17, Math.PI * 0.95, Math.PI * 2.05);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#282b30';
    ctx.lineWidth = 1.0;
    ctx.stroke();

    // Brilho da chuva no topo do guarda-chuva
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.arc(x + 2, y - 46, 14, Math.PI * 1.15, Math.PI * 1.45);
    ctx.stroke();
  }

  /**
   * Civil com capa amarela de chuva (Rain Slicker anos 80).
   * @private
   */
  _drawSlickerCivilianNPC(ctx, x, y, legL, legR, arm, cid) {
    // Galochas pretas
    ctx.strokeStyle = '#121416';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(x - 3, y - 15); ctx.lineTo(x - 3 + legL, y); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 3, y - 15); ctx.lineTo(x + 3 + legR, y); ctx.stroke();

    // Capa de chuva amarela viva (#e9c46a)
    ctx.fillStyle = '#d49b28';
    ctx.beginPath();
    ctx.moveTo(x - 7, y - 35);
    ctx.lineTo(x + 7, y - 35);
    ctx.lineTo(x + 8, y - 14);
    ctx.lineTo(x - 8, y - 14);
    ctx.closePath();
    ctx.fill();

    // Capuz amarelo cobrindo a cabeça
    ctx.fillStyle = '#e5a82e';
    ctx.beginPath();
    ctx.arc(x, y - 39, 5.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#b87d16';
    ctx.beginPath();
    ctx.arc(x, y - 39, 3.5, 0, Math.PI);
    ctx.fill();
  }

  /**
   * Civil em sobretudo cinza/verde ou jaqueta jeans.
   * @private
   */
  _drawTrenchcoatCivilianNPC(ctx, x, y, legL, legR, arm, cid) {
    ctx.strokeStyle = '#202428';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(x - 3, y - 16); ctx.lineTo(x - 3 + legL, y); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 3, y - 16); ctx.lineTo(x + 3 + legR, y); ctx.stroke();

    // Jaqueta jeans retrô ou sobretudo cinza
    ctx.fillStyle = '#3a4b5c';
    ctx.beginPath();
    ctx.moveTo(x - 7, y - 35);
    ctx.lineTo(x + 7, y - 35);
    ctx.lineTo(x + 6, y - 17);
    ctx.lineTo(x - 6, y - 17);
    ctx.closePath();
    ctx.fill();

    // Gola de lã sherpa clara
    ctx.fillStyle = '#d8cfbe';
    ctx.fillRect(x - 4, y - 35, 8, 3.5);

    ctx.fillStyle = '#cca587';
    ctx.beginPath();
    ctx.arc(x, y - 39, 4.0, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Alex Hale (Detetive Investigador de NorthVale).
   * @private
   */
  _drawAlexHale(ctx, x, y, legL, legR, arm) {
    // Calças escuras
    ctx.strokeStyle = '#191b20';
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.moveTo(x - 3, y - 17); ctx.lineTo(x - 3 + legL, y); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 3, y - 17); ctx.lineTo(x + 3 + legR, y); ctx.stroke();

    // Sobretudo longo carvão aberto
    ctx.fillStyle = '#262930';
    ctx.beginPath();
    ctx.moveTo(x - 8, y - 36);
    ctx.lineTo(x + 8, y - 36);
    ctx.lineTo(x + 8, y - 14);
    ctx.lineTo(x - 8, y - 14);
    ctx.closePath();
    ctx.fill();

    // Gravata vinho solta
    ctx.strokeStyle = '#780000';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(x, y - 34); ctx.lineTo(x + 1, y - 24); ctx.stroke();

    // Cabeça e chapéu fedora
    ctx.fillStyle = '#d8b292';
    ctx.beginPath();
    ctx.arc(x, y - 40, 4.2, 0, Math.PI * 2);
    ctx.fill();

    // Chapéu fedora escuro
    ctx.fillStyle = '#1c1e24';
    ctx.fillRect(x - 6.5, y - 43, 13, 2);
    ctx.fillRect(x - 4.5, y - 48, 9, 5);
  }

  // ==========================================================================
  // 4. AJUSTE FINO DE ESCALA DE MÓVEIS INTERIORES (renderInteriorProp)
  // ==========================================================================

  /**
   * Renderiza móveis internos estritamente calibrados em relação à altura do Alex (50px):
   * - Mesas/Balcões: Altura de 20 a 24px (altura da cintura).
   * - Cadeiras: Assento a 14-16px, encosto até 28-32px.
   * - Sofás/Poltronas: Assento a 14-15px, encosto a 28-30px, braços a 20px.
   * - Adereços menores (xícaras, cinzeiros, telefones): 3 a 8px sobre as mesas.
   *
   * @param {CanvasRenderingContext2D} ctx Contexto Canvas 2D
   * @param {Object} prop Dados do móvel ({ type, kind, gx, gy, gz, w, h, height, color })
   * @param {Object} camera Posição da câmera { x, y }
   */
  renderInteriorProp(ctx, prop, camera) {
    if (!prop) return;

    const kind = prop.kind || prop.type || 'table';
    const gx = prop.gx !== undefined ? prop.gx : (prop.x || 0);
    const gy = prop.gy !== undefined ? prop.gy : (prop.y || 0);
    const gz = prop.gz !== undefined ? prop.gz : (prop.z || 0);

    const pos = this.gridToScreen(gx, gy, gz, camera);

    ctx.save();

    switch (kind) {
      case 'table':
      case 'desk':
        this._drawCalibratedTable(ctx, pos.x, pos.y, prop);
        break;
      case 'sofa':
        this._drawCalibratedSofa(ctx, pos.x, pos.y, prop);
        break;
      case 'armchair':
        this._drawCalibratedArmchair(ctx, pos.x, pos.y, prop);
        break;
      case 'chair':
        this._drawCalibratedChair(ctx, pos.x, pos.y, prop);
        break;
      case 'shelf':
      case 'cabinet':
        this._drawCalibratedCabinet(ctx, pos.x, pos.y, prop);
        break;
      case 'lamp':
        this._drawCalibratedLamp(ctx, pos.x, pos.y, prop);
        break;
      case 'ashtray':
        this._drawCalibratedAshtray(ctx, pos.x, pos.y, prop);
        break;
      default:
        this._drawCalibratedTable(ctx, pos.x, pos.y, prop);
        break;
    }

    ctx.restore();
  }

  /**
   * Mesa calibrada (altura de 20-24px, cintura do Alex de 50px).
   * @private
   */
  _drawCalibratedTable(ctx, cx, cy, prop) {
    const tableH = Math.min(24, Math.max(18, prop.height || 22));
    const legH = tableH - 3.5;
    const w = prop.w || 34;
    const d = prop.d || prop.h || 20;

    // Sombra no chão
    ctx.fillStyle = 'rgba(5, 8, 10, 0.45)';
    ctx.fillRect(cx - w / 2, cy - 2, w, d * 0.4);

    // 4 Pés da mesa
    ctx.fillStyle = '#2c2217';
    ctx.fillRect(cx - w / 2 + 2, cy - legH, 3, legH);
    ctx.fillRect(cx + w / 2 - 5, cy - legH, 3, legH);
    ctx.fillRect(cx - w / 2 + 5, cy - legH - 3, 2.5, legH);
    ctx.fillRect(cx + w / 2 - 8, cy - legH - 3, 2.5, legH);

    // Tampo chanfrado de madeira escura envernizada
    ctx.fillStyle = prop.color || '#5c432d';
    ctx.beginPath();
    ctx.moveTo(cx, cy - tableH - d * 0.25);
    ctx.lineTo(cx + w / 2, cy - tableH);
    ctx.lineTo(cx, cy - tableH + d * 0.25);
    ctx.lineTo(cx - w / 2, cy - tableH);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#382617';
    ctx.lineWidth = 1.0;
    ctx.stroke();

    // Espessura frontal do tampo
    ctx.fillStyle = '#422f1e';
    ctx.beginPath();
    ctx.moveTo(cx - w / 2, cy - tableH);
    ctx.lineTo(cx, cy - tableH + d * 0.25);
    ctx.lineTo(cx, cy - tableH + d * 0.25 + 3);
    ctx.lineTo(cx - w / 2, cy - tableH + 3);
    ctx.closePath();
    ctx.fill();
  }

  /**
   * Sofá calibrado de 2-3 lugares (assento a 14px, encosto a 28px).
   * @private
   */
  _drawCalibratedSofa(ctx, cx, cy, prop) {
    const sofaW = prop.w || 54;
    const seatH = 14;
    const backH = 14; // Altura total de 28px

    // Sombra
    ctx.fillStyle = 'rgba(5, 8, 10, 0.5)';
    ctx.fillRect(cx - sofaW / 2 + 2, cy - 3, sofaW - 4, 8);

    // Base do assento acolchoado
    ctx.fillStyle = prop.color || '#434d3d'; // Verde-oliva vintage
    ctx.fillRect(cx - sofaW / 2, cy - seatH, sofaW, seatH);
    ctx.strokeStyle = '#272d24';
    ctx.lineWidth = 1.0;
    ctx.strokeRect(cx - sofaW / 2, cy - seatH, sofaW, seatH);

    // Almofadas do assento
    ctx.fillStyle = '#525e4c';
    ctx.fillRect(cx - sofaW / 2 + 2, cy - seatH - 2, (sofaW - 6) / 2, 4);
    ctx.fillRect(cx + 1, cy - seatH - 2, (sofaW - 6) / 2, 4);

    // Encosto alto
    ctx.fillStyle = '#3a4435';
    ctx.fillRect(cx - sofaW / 2, cy - seatH - backH, sofaW, backH);
    ctx.strokeRect(cx - sofaW / 2, cy - seatH - backH, sofaW, backH);

    // Braços laterais do sofá
    ctx.fillStyle = '#4f5b49';
    ctx.fillRect(cx - sofaW / 2 - 3, cy - seatH - 6, 6, seatH + 6);
    ctx.fillRect(cx + sofaW / 2 - 3, cy - seatH - 6, 6, seatH + 6);
  }

  /**
   * Poltrona individual (assento a 14px, encosto a 28px).
   * @private
   */
  _drawCalibratedArmchair(ctx, cx, cy, prop) {
    const chairW = prop.w || 26;
    const seatH = 14;
    const backH = 14;

    ctx.fillStyle = 'rgba(5, 8, 10, 0.45)';
    ctx.fillRect(cx - chairW / 2, cy - 2, chairW, 6);

    ctx.fillStyle = prop.color || '#5a4231';
    ctx.fillRect(cx - chairW / 2, cy - seatH, chairW, seatH);

    // Encosto
    ctx.fillStyle = '#483425';
    ctx.fillRect(cx - chairW / 2, cy - seatH - backH, chairW, backH);

    // Braços
    ctx.fillStyle = '#6e513d';
    ctx.fillRect(cx - chairW / 2 - 2, cy - seatH - 5, 4, seatH + 5);
    ctx.fillRect(cx + chairW / 2 - 2, cy - seatH - 5, 4, seatH + 5);
  }

  /**
   * Cadeira com espaldar e travessas (assento a 15px, espaldar a 30px).
   * @private
   */
  _drawCalibratedChair(ctx, cx, cy, prop) {
    const seatH = 15;
    const backH = 15;
    const w = 15;

    // 4 Pés finos
    ctx.fillStyle = '#221910';
    ctx.fillRect(cx - w / 2, cy - seatH, 2, seatH);
    ctx.fillRect(cx + w / 2 - 2, cy - seatH, 2, seatH);

    // Assento
    ctx.fillStyle = prop.color || '#664d36';
    ctx.fillRect(cx - w / 2 - 1, cy - seatH - 2, w + 2, 3);

    // Encosto com travessas verticais
    ctx.fillStyle = '#423020';
    ctx.fillRect(cx - w / 2, cy - seatH - backH, 2, backH);
    ctx.fillRect(cx + w / 2 - 2, cy - seatH - backH, 2, backH);
    ctx.fillRect(cx - w / 2, cy - seatH - backH, w, 3.5);
  }

  /**
   * Armário de arquivos ou estante (46px de altura, linha do ombro).
   * @private
   */
  _drawCalibratedCabinet(ctx, cx, cy, prop) {
    const cabH = prop.height || 48;
    const cabW = prop.w || 26;

    ctx.fillStyle = prop.color || '#3b4347'; // Arquivo de aço cinza da delegacia
    ctx.fillRect(cx - cabW / 2, cy - cabH, cabW, cabH);
    ctx.strokeStyle = '#1d2224';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(cx - cabW / 2, cy - cabH, cabW, cabH);

    // Gavetas de arquivos
    const drawers = 4;
    for (let i = 0; i < drawers; i++) {
      const dy = cy - cabH + (i * cabH) / drawers;
      const dh = cabH / drawers;
      ctx.strokeRect(cx - cabW / 2 + 2, dy + 2, cabW - 4, dh - 3);

      // Puxador de metal e porta-etiqueta
      ctx.fillStyle = '#d4af37';
      ctx.fillRect(cx - 3, dy + dh * 0.45, 6, 2);
    }
  }

  /**
   * Luminária de mesa clássica estilo banqueiro com cúpula de vidro verde.
   * @private
   */
  _drawCalibratedLamp(ctx, cx, cy, prop) {
    const lampH = 14;
    // Haste de latão
    ctx.strokeStyle = '#c5a059';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx, cy - lampH);
    ctx.stroke();

    // Cúpula de vidro verde-esmeralda dos anos 80
    ctx.fillStyle = '#2d6a4f';
    ctx.beginPath();
    ctx.ellipse(cx, cy - lampH, 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cone de luz suave sobre a mesa
    const coneGrad = ctx.createRadialGradient(cx, cy - 2, 2, cx, cy, 18);
    coneGrad.addColorStop(0, 'rgba(255, 230, 150, 0.45)');
    coneGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = coneGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 2, 16, 7, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Cinzeiro com espirais de fumaça de cigarro (ambiental diegético).
   * @private
   */
  _drawCalibratedAshtray(ctx, cx, cy, prop) {
    ctx.fillStyle = '#788274';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 4.5, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2c332b';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 3, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Fumaça sutil subindo
    ctx.strokeStyle = 'rgba(220, 230, 235, 0.32)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    const t = this.time * 2.2;
    ctx.moveTo(cx + 1, cy);
    ctx.bezierCurveTo(
      cx + 3 + Math.sin(t) * 2, cy - 6,
      cx - 2 + Math.cos(t) * 3, cy - 12,
      cx + 2 + Math.sin(t * 1.4) * 4, cy - 18
    );
    ctx.stroke();
  }

  // ==========================================================================
  // 5. CAMADA DE ADEREÇOS URBANOS E DISPATCHER DE Y-SORTING
  // ==========================================================================

  /**
   * Renderiza qualquer objeto ou estrutura do mundo respeitando a profundidade (Y-sorting).
   *
   * @param {CanvasRenderingContext2D} ctx Contexto Canvas 2D
   * @param {Object} objectData Dados do objeto
   * @param {Object} camera Posição da câmera { x, y }
   * @param {boolean} [isPlayerInsideBuilding=false] Se o jogador está dentro do edifício
   */
  renderWorldObject(ctx, objectData, camera, isPlayerInsideBuilding = false) {
    if (!objectData) return;

    const type = objectData.type || 'building';

    ctx.save();

    // Se o objeto pertencer a uma parede frontal de edifício em cutaway
    if (objectData.isCutawayWall && objectData.buildingId) {
      const alphaState = this.roofAlphas.get(objectData.buildingId);
      const alpha = alphaState ? alphaState.current : (isPlayerInsideBuilding ? 0.15 : 1.0);
      ctx.globalAlpha = Math.max(0.12, Math.min(1.0, alpha));
    }

    switch (type) {
      case 'building':
        this.renderBuilding(ctx, objectData, camera, isPlayerInsideBuilding);
        break;

      case 'entity':
      case 'person':
      case 'npc':
        this.renderEntity(ctx, objectData, camera);
        break;

      case 'prop':
      case 'furniture':
      case 'interior_prop':
        this.renderInteriorProp(ctx, objectData, camera);
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

      default:
        this._drawIsometricWall(ctx, objectData, camera);
        break;
    }

    ctx.restore();
  }

  _drawIsometricWall(ctx, obj, camera) {
    const gx = obj.gx !== undefined ? obj.gx : obj.x;
    const gy = obj.gy !== undefined ? obj.gy : obj.y;
    const wallH = obj.height || 64;

    const p = this.gridToScreen(gx, gy, 0, camera);
    const hw = this.halfW;
    const hh = this.halfH;

    const isBrick = obj.style === 'brick' || obj.buildingId === 'meatpacking';
    const leftColor = isBrick ? '#241a18' : '#1c1c26'; // 40-60%
    const rightColor = isBrick ? '#44322d' : '#3c4749'; // 80%

    // Face Sudoeste
    ctx.fillStyle = leftColor;
    ctx.beginPath();
    ctx.moveTo(p.x - hw, p.y);
    ctx.lineTo(p.x, p.y + hh);
    ctx.lineTo(p.x, p.y + hh - wallH);
    ctx.lineTo(p.x - hw, p.y - wallH);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#0e0e14';
    ctx.stroke();

    // Face Sudeste (iluminada)
    ctx.fillStyle = rightColor;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y + hh);
    ctx.lineTo(p.x + hw, p.y);
    ctx.lineTo(p.x + hw, p.y - wallH);
    ctx.lineTo(p.x, p.y + hh - wallH);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#12121a';
    ctx.stroke();

    // Topo
    ctx.fillStyle = isBrick ? '#56403a' : '#4e5c5f';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - hh - wallH);
    ctx.lineTo(p.x + hw, p.y - wallH);
    ctx.lineTo(p.x, p.y + hh - wallH);
    ctx.lineTo(p.x - hw, p.y - wallH);
    ctx.closePath();
    ctx.fill();
  }

  _drawIsometricDoor(ctx, obj, camera) {
    const p = this.gridToScreen(obj.gx || obj.x, obj.gy || obj.y, 0, camera);
    const doorH = 46;
    const doorW = this.halfW * 0.75;

    ctx.save();
    ctx.fillStyle = 'rgba(20, 28, 36, 0.9)';
    ctx.fillRect(p.x - doorW / 2, p.y - doorH, doorW, doorH);
    ctx.strokeStyle = '#3a3a4c';
    ctx.lineWidth = 1.6;
    ctx.strokeRect(p.x - doorW / 2, p.y - doorH, doorW, doorH);

    if (obj.decal) {
      ctx.font = '700 8.5px "Courier New", monospace';
      ctx.fillStyle = '#e0a96d';
      ctx.textAlign = 'center';
      ctx.fillText(obj.decal.toUpperCase(), p.x, p.y - doorH + 18);
    }
    ctx.restore();
  }

  _drawIsometricWindow(ctx, obj, camera) {
    const p = this.gridToScreen(obj.gx || obj.x, obj.gy || obj.y, obj.z || 16, camera);
    this._drawAmberLitWindow(ctx, p.x, p.y, 18, 24, obj.isBarred);
  }

  _drawLamppost(ctx, obj, camera) {
    const p = this.gridToScreen(obj.gx || obj.x, obj.gy || obj.y, 0, camera);
    const postH = 75;

    ctx.save();
    const lightGrad = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, 65);
    lightGrad.addColorStop(0.0, 'rgba(224, 169, 109, 0.38)');
    lightGrad.addColorStop(0.65, 'rgba(180, 110, 40, 0.12)');
    lightGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = lightGrad;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, 55, 26, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#16181d';
    ctx.fillRect(p.x - 2, p.y - postH, 4, postH);
    ctx.fillRect(p.x - 5, p.y - 6, 10, 6);

    ctx.strokeStyle = '#16181d';
    ctx.lineWidth = 3.0;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - postH);
    ctx.quadraticCurveTo(p.x + 8, p.y - postH - 12, p.x + 14, p.y - postH + 4);
    ctx.stroke();

    ctx.fillStyle = '#ffbe0b';
    ctx.beginPath();
    ctx.arc(p.x + 14, p.y - postH + 6, 3.0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  _drawPayphone(ctx, obj, camera) {
    const p = this.gridToScreen(obj.gx || obj.x, obj.gy || obj.y, 0, camera);
    const phoneH = 50;

    ctx.save();
    ctx.strokeStyle = '#484c54';
    ctx.lineWidth = 3.0;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x, p.y - phoneH * 0.65);
    ctx.stroke();

    ctx.fillStyle = '#2a2e36';
    ctx.fillRect(p.x - 4, p.y - phoneH * 0.85, 8, 14);
    ctx.fillStyle = '#fca311';
    ctx.fillRect(p.x - 2, p.y - phoneH * 0.80, 4, 6);

    ctx.beginPath();
    ctx.arc(p.x, p.y - phoneH, 14, Math.PI * 0.85, Math.PI * 2.15);
    ctx.fill();
    ctx.strokeStyle = '#b87405';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.restore();
  }

  _drawDumpster(ctx, obj, camera) {
    const p = this.gridToScreen(obj.gx || obj.x, obj.gy || obj.y, 0, camera);
    const dW = 28;
    const dH = 18;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(p.x - dW / 2 + 2, p.y - 2, dW, 8);

    ctx.fillStyle = '#20322b';
    ctx.fillRect(p.x - dW / 2, p.y - dH, dW, dH);
    ctx.strokeStyle = '#121e1a';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(p.x - dW / 2, p.y - dH, dW, dH);

    ctx.fillStyle = '#101413';
    ctx.beginPath();
    ctx.moveTo(p.x - dW / 2 - 2, p.y - dH);
    ctx.lineTo(p.x + dW / 2 + 2, p.y - dH - 4);
    ctx.lineTo(p.x + dW / 2 + 2, p.y - dH);
    ctx.lineTo(p.x - dW / 2 - 2, p.y - dH + 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#8b3a1a';
    ctx.fillRect(p.x - dW / 2, p.y - 4, 7, 4);
    ctx.restore();
  }

  _drawHydrant(ctx, obj, camera) {
    const p = this.gridToScreen(obj.gx || obj.x, obj.gy || obj.y, 0, camera);
    const hH = 22;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 1, 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#9e1c1c';
    ctx.fillRect(p.x - 3.5, p.y - hH, 7, hH);
    ctx.fillStyle = '#b82424';
    ctx.beginPath();
    ctx.arc(p.x, p.y - hH, 4, Math.PI, 0);
    ctx.fill();

    ctx.fillStyle = '#b8923b';
    ctx.fillRect(p.x - 6, p.y - hH * 0.65, 3, 4);
    ctx.fillRect(p.x + 3, p.y - hH * 0.65, 3, 4);
    ctx.restore();
  }

  // ==========================================================================
  // 6. CAMADA DE TELHADO E CUTAWAY (ROOF CUTAWAY & OCCLUSION)
  // ==========================================================================

  /**
   * Renderiza a cobertura de telhado com fade-out suave ao entrar no edifício.
   *
   * @param {CanvasRenderingContext2D} ctx Contexto Canvas 2D
   * @param {string} buildingId Identificador do edifício
   * @param {boolean} playerInside Se o jogador está dentro do edifício
   * @param {Object} camera Posição da câmera { x, y }
   * @param {Object} [buildingData] Dimensões e posição do edifício
   */
  renderRoofLayer(ctx, buildingId, playerInside, camera, buildingData = null) {
    if (!buildingId) return;

    if (!this.roofAlphas.has(buildingId)) {
      this.roofAlphas.set(buildingId, {
        current: playerInside ? 0.15 : 1.0,
        target: playerInside ? 0.15 : 1.0
      });
    }

    const state = this.roofAlphas.get(buildingId);
    state.target = playerInside ? 0.15 : 1.0;

    if (state.current <= 0.02) return;

    ctx.save();
    ctx.globalAlpha = Math.max(0.0, Math.min(1.0, state.current));

    if (buildingData) {
      const gx = buildingData.gx !== undefined ? buildingData.gx : (buildingData.x || 0);
      const gy = buildingData.gy !== undefined ? buildingData.gy : (buildingData.y || 0);
      const gw = buildingData.gw || 4;
      const gh = buildingData.gh || buildingData.gd || 4;
      const wallH = buildingData.height || 88;
      const rise = buildingData.roofRise || Math.round(wallH * 0.42);

      const tBack = this.gridToScreen(gx, gy, wallH, camera);
      const tEast = this.gridToScreen(gx + gw, gy, wallH, camera);
      const tFront = this.gridToScreen(gx + gw, gy + gh, wallH, camera);
      const tWest = this.gridToScreen(gx, gy + gh, wallH, camera);

      const rBack = this.gridToScreen(gx + gw * 0.5, gy, wallH + rise, camera);
      const rFront = this.gridToScreen(gx + gw * 0.5, gy + gh, wallH + rise, camera);

      const style = buildingData.style || this._inferBuildingStyle(buildingId);
      const colors = this._getBuildingPalette(style);

      this._drawGabledRoof(ctx, tBack, tEast, tFront, tWest, rBack, rFront, wallH, rise, colors, style, buildingData);
    }

    ctx.restore();
  }
}
