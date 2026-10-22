/**
 * NorthVale: Sombras de 1989 — TownMapView.js
 * Direção de Arte Técnica: Mapa Rodoviário & Topográfico Desdobrável Analógico (1989)
 *
 * Módulo puro em Canvas 2D desacoplado (sem dependências externas):
 * - Mapa de papel desdobrável estilo 1989 com vincos de dobra em cruz (4 quadrantes) e bordas manchadas.
 * - Malha cartográfica de NorthVale: Estrada Estadual 12, Represa Velha, Frigorífico Sloane, Centro Cívico,
 *   Delegacia, Diner, Capela Velha, Pátio Ferroviário e Bacia Florestal.
 * - Alfinetes 3D realistas com cabeças de plástico colorido e sombras projetadas.
 * - Anotações autênticas à caneta esferográfica azul e vermelha com círculos de investigação.
 * - Névoa cartográfica nas áreas bloqueadas com carimbos diegéticos "ACESSO INTERDITADO".
 * - Micro-card datilografado com efeito analógico ao passar o cursor sobre locais.
 * - Assinatura canônica: TownMapView.render(ctx, discoveredLocations, activeLocation)
 */

export class TownMapView {
  /**
   * @param {HTMLCanvasElement} [canvas] Referência opcional ao canvas principal
   */
  constructor(canvas = null) {
    this.canvas = canvas;
    this.isOpen = true;
    this.time = 0;
    this.fadeAlpha = 1.0;

    // Mouse e Hover
    this.mouse = { x: 0, y: 0 };
    this.hoveredLocation = null;
    this.activeLocationId = 'delegacia';
    this.onSelectLocation = null;
    this.onClose = null;

    // Definição dos 10 locais cartográficos principais de NorthVale 1989
    this.locations = [
      {
        id: 'represa',
        name: 'Represa Velha (Blackwood Dam)',
        category: 'ZONA NORTE — LOCAL DO CRIME',
        sector: 'Bacia do Rio Silencioso',
        desc: 'Vertedouro de concreto maciço e margens lamacentas. Onde Sarah Miller emergiu das águas geladas.',
        x: 0.32,
        y: 0.22,
        pinColor: '#d62828', // Vermelho (Crime / Mistério)
        status: 'investigando',
        requiredClue: null,
        clueSnippet: 'Rastros de pneus de viatura encontrados na lama do dique.'
      },
      {
        id: 'guarita_represa',
        name: 'Guarita de Vigia da Represa',
        category: 'POSTO AVANÇADO',
        sector: 'Estrada de Acesso Norte',
        desc: 'Cabana de madeira de Otis Clark. Registro de entrada de veículos no dia 14 de Outubro.',
        x: 0.22,
        y: 0.30,
        pinColor: '#d48b28', // Âmbar
        status: 'descoberto',
        clueSnippet: 'Horário das 22h às 02h arrancado do livro de ocorrências.'
      },
      {
        id: 'floresta_bacia',
        name: 'Trilha da Bacia Florestal',
        category: 'ÁREA SILVESTRE',
        sector: 'Reserva Estadual de NorthVale',
        desc: 'Pinhais densos sob chuva torrencial. Abrigo do Estranho da Trilha.',
        x: 0.16,
        y: 0.44,
        pinColor: '#588157', // Verde
        status: 'descoberto',
        clueSnippet: 'Fogueira recente e latas de conservas do frigorífico.'
      },
      {
        id: 'delegacia',
        name: 'Delegacia de Polícia de NorthVale',
        category: 'CENTRO CÍVICO & AUTORIDADE',
        sector: 'Rua das Acácias, nº 14',
        desc: 'Gabinete da Xerife Ruth Mercer e mesa do Subxerife Bobby Miller. Armário de arquivos e celas.',
        x: 0.48,
        y: 0.52,
        pinColor: '#3a86ff', // Azul (Polícia)
        status: 'ativo',
        clueSnippet: 'Dossiê do Caso Julian Vance trancado na gaveta confidencial.'
      },
      {
        id: 'cartorio',
        name: 'Tabelionato & Cartório Municipal',
        category: 'REPARTIÇÃO PÚBLICA',
        sector: 'Praça dos Pioneiros, nº 02',
        desc: 'Arquivo histórico de escrituras de Clara Higgins. Registros de posse de terras da represa de 1952.',
        x: 0.55,
        y: 0.47,
        pinColor: '#3a86ff',
        status: 'descoberto',
        clueSnippet: 'Clara afirma que o livro de 1989 foi requisitado pelo Prefeito.'
      },
      {
        id: 'diner',
        name: 'Double R Diner',
        category: 'ESTABELECIMENTO',
        sector: 'Esquina da Estrada 12 com Rua 4',
        desc: 'Café de beira de estrada de Helen Miller e Nora Finch. Tortas de cereja, fumaça e fofocas locais.',
        x: 0.42,
        y: 0.62,
        pinColor: '#588157',
        status: 'descoberto',
        clueSnippet: 'Helen não dorme há 3 dias. Bobby foi visto aqui discutindo com Sarah.'
      },
      {
        id: 'farmacia_ward',
        name: 'Farmácia Ward & Manipulações',
        category: 'COMÉRCIO LOCAL',
        sector: 'Avenida Central, nº 88',
        desc: 'Balcão de madeira escura de Elias Ward. Frascos de éter e sedativos controlados.',
        x: 0.52,
        y: 0.60,
        pinColor: '#588157',
        status: 'descoberto',
        clueSnippet: 'Receita assinada por Dr. Arthur com dosagens anômalas.'
      },
      {
        id: 'frigorifico_sloane',
        name: 'Complexo Industrial Frigorífico Sloane',
        category: 'ZONA INDUSTRIAL PRIVADA',
        sector: 'Docas do Rio Leste',
        desc: 'Monopólio econômico de Viktor Sloane. Vigias armados de Becker e câmaras frias.',
        x: 0.78,
        y: 0.66,
        pinColor: '#9d4edd', // Roxo (Conspiração)
        status: 'bloqueado',
        requiredClue: 'Chave Mestra de Latão ou Mandado Judicial',
        clueSnippet: 'Caminhões saem de madrugada sem notas de inspeção sanitária.'
      },
      {
        id: 'patio_ferrovia',
        name: 'Pátio Ferroviário & Armazém 04',
        category: 'CIDADE BAIXA & TRANSPORTE',
        sector: 'Linha Férrea Sul',
        desc: 'Vagões de carga abandonados e ponto de encontro de Frankie Dente de Prata e Lenny O Rato.',
        x: 0.68,
        y: 0.82,
        pinColor: '#9d4edd',
        status: 'descoberto',
        clueSnippet: 'Caixas com logotipo químico de laboratório escondidas no vagão 19.'
      },
      {
        id: 'capela_velha',
        name: 'Capela da Imaculada & Cemitério',
        category: 'ZONA HISTÓRICA / COLINA',
        sector: 'Colina dos Pinheiros Mortos',
        desc: 'Capela de pedra do Padre Thomas e Irmã Maria. Túmulo recente de Julian e Maeve.',
        x: 0.28,
        y: 0.76,
        pinColor: '#9d4edd',
        status: 'descoberto',
        clueSnippet: 'Padre Thomas recusou-se a celebrar a missa oficial de afogamento.'
      }
    ];

    // Anotações à caneta manuscritas na margem do mapa
    this.handwrittenNotes = [
      { text: 'VERIFICAR GUARITA APÓS AS 22h (OTIS)', x: 0.12, y: 0.16, color: '#b22222', rot: -0.05 },
      { text: 'PATRULHA DE BECKER ATIVA AQUI', x: 0.72, y: 0.56, color: '#b22222', rot: 0.04 },
      { text: 'Sarah encontrada aqui às 04:15 sob chuva', x: 0.36, y: 0.15, color: '#1d3557', rot: 0.02 },
      { text: 'Bobby mente sobre o álibi do dia 14', x: 0.40, y: 0.88, color: '#1d3557', rot: -0.03 }
    ];

    // Botão de retorno
    this.closeButtonHitbox = { x: 0, y: 0, w: 180, h: 32 };
  }

  /**
   * Atualiza timers internos a 60 FPS.
   * @param {number} dt Delta time em segundos
   */
  update(dt) {
    this.time += dt;
  }

  /**
   * Renderiza o mapa desdobrável completo no Canvas.
   *
   * @param {CanvasRenderingContext2D} ctx Contexto Canvas 2D
   * @param {Array<string>} [discoveredLocations] IDs dos locais descobertos
   * @param {string} [activeLocation] ID do local atualmente ativo
   * @param {number} [width] Largura da tela
   * @param {number} [height] Altura da tela
   */
  render(ctx, discoveredLocations = null, activeLocation = null, width = null, height = null) {
    const w = width || ctx.canvas.width;
    const h = height || ctx.canvas.height;

    if (activeLocation) this.activeLocationId = activeLocation;

    ctx.save();

    // 1. Fundo do Gabinete de Madeira / Asfalto
    ctx.fillStyle = '#0a0a0d';
    ctx.fillRect(0, 0, w, h);

    // Margens da folha do mapa na tela
    const mapPadX = Math.max(24, Math.floor(w * 0.05));
    const mapPadY = Math.max(48, Math.floor(h * 0.07));
    const mapW = w - mapPadX * 2;
    const mapH = h - mapPadY * 2;

    // 2. Papel de Mapa Envelhecido com Textura e Manchas
    this._renderMapPaper(ctx, mapPadX, mapPadY, mapW, mapH);

    // 3. Topografia, Florestas e Rios de NorthVale
    this._renderGeography(ctx, mapPadX, mapPadY, mapW, mapH);

    // 4. Malha Viária: Estrada Estadual 12 e Ruas da Cidade
    this._renderRoads(ctx, mapPadX, mapPadY, mapW, mapH);

    // 5. Linhas de Ferrovia e Docas
    this._renderRailways(ctx, mapPadX, mapPadY, mapW, mapH);

    // 6. Névoa e Setores Bloqueados com Carimbos
    this._renderFogAndRestrictedZones(ctx, mapPadX, mapPadY, mapW, mapH, discoveredLocations);

    // 7. Anotações à Caneta Esferográfica Manuscritas
    this._renderHandwrittenNotes(ctx, mapPadX, mapPadY, mapW, mapH);

    // 8. Rosa dos Ventos e Legenda Cartográfica 1989
    this._renderCompassAndLegend(ctx, mapPadX, mapPadY, mapW, mapH);

    // 9. Vincos Realistas de Dobra em Cruz (4 Quadrantes)
    this._renderPaperCreases(ctx, mapPadX, mapPadY, mapW, mapH);

    // 10. Alfinetes 3D de Plástico nos Locais
    this._renderPushpins(ctx, mapPadX, mapPadY, mapW, mapH);

    // 11. Micro-Card Datilografado do Local sob o Cursor (Hover)
    this._renderHoverCard(ctx, w, h);

    // 12. Cabeçalho Oficial e Botão de Retorno
    this._renderHeaderAndControls(ctx, w, h);

    ctx.restore();
  }

  // ==========================================================================
  // ELEMENTOS PROCEDURAIS DO MAPA ANALÓGICO
  // ==========================================================================

  _renderMapPaper(ctx, x, y, w, h) {
    ctx.save();

    // Sombra pesada projetada pelo mapa desdobrado na mesa
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(x + 8, y + 10, w, h);

    // Base do papel de mapa rodoviário (amarelado e pardo)
    const paperGrad = ctx.createLinearGradient(x, y, x + w, y + h);
    paperGrad.addColorStop(0.0, '#e5d8b8');
    paperGrad.addColorStop(0.35, '#ded0af');
    paperGrad.addColorStop(0.7, '#d5c59f');
    paperGrad.addColorStop(1.0, '#cbbb94');
    ctx.fillStyle = paperGrad;
    ctx.fillRect(x, y, w, h);

    // Borda gasta com mancha de tempo
    ctx.strokeStyle = '#8a7852';
    ctx.lineWidth = 1.6;
    ctx.strokeRect(x, y, w, h);

    // Mancha circular de caneca de café no canto inferior esquerdo
    ctx.strokeStyle = 'rgba(110, 75, 42, 0.28)';
    ctx.lineWidth = 4.0;
    ctx.beginPath();
    ctx.arc(x + w * 0.18, y + h * 0.85, 34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(110, 75, 42, 0.12)';
    ctx.lineWidth = 8.0;
    ctx.stroke();

    // Mancha de água da chuva ressecada no topo
    ctx.fillStyle = 'rgba(80, 70, 50, 0.08)';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.45, y + 40, 75, 24, 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  _renderGeography(ctx, x, y, w, h) {
    ctx.save();

    // Bacia do Rio Silencioso e Represa Velha ao Norte (Água escura azul-ardósia)
    ctx.fillStyle = '#657e82';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.15, y);
    ctx.bezierCurveTo(x + w * 0.25, y + h * 0.12, x + w * 0.28, y + h * 0.22, x + w * 0.35, y + h * 0.24);
    ctx.bezierCurveTo(x + w * 0.45, y + h * 0.26, x + w * 0.48, y + h * 0.35, x + w * 0.52, y + h * 0.45);
    ctx.bezierCurveTo(x + w * 0.58, y + h * 0.58, x + w * 0.72, y + h * 0.65, x + w * 0.88, y + h * 0.72);
    ctx.lineTo(x + w, y + h * 0.75);
    ctx.lineTo(x + w, y + h * 0.80);
    ctx.lineTo(x + w * 0.82, y + h * 0.78);
    ctx.bezierCurveTo(x + w * 0.68, y + h * 0.72, x + w * 0.52, y + h * 0.62, x + w * 0.46, y + h * 0.48);
    ctx.bezierCurveTo(x + w * 0.42, y + h * 0.38, x + w * 0.38, y + h * 0.28, x + w * 0.28, y + h * 0.26);
    ctx.bezierCurveTo(x + w * 0.20, y + h * 0.24, x + w * 0.18, y + h * 0.14, x + w * 0.10, y);
    ctx.closePath();
    ctx.fill();

    // Lago do reservatório da represa
    ctx.fillStyle = '#546e72';
    ctx.beginPath();
    ctx.ellipse(x + w * 0.30, y + h * 0.18, w * 0.12, h * 0.08, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Muro de concreto da represa (paredão cinza chanfrado)
    ctx.strokeStyle = '#38383e';
    ctx.lineWidth = 5.0;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.28, y + h * 0.20);
    ctx.lineTo(x + w * 0.36, y + h * 0.25);
    ctx.stroke();

    // Curvas de nível topográficas da Colina dos Pinheiros Mortos (Oeste)
    ctx.strokeStyle = 'rgba(140, 120, 85, 0.4)';
    ctx.lineWidth = 1.0;
    for (let r = 25; r < 90; r += 16) {
      ctx.beginPath();
      ctx.ellipse(x + w * 0.26, y + h * 0.74, r * 1.3, r, 0.4, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Ícones vetoriais de pinheiros na bacia florestal
    ctx.fillStyle = '#5c6b54';
    const trees = [
      { rx: 0.14, ry: 0.38 }, { rx: 0.18, ry: 0.42 }, { rx: 0.12, ry: 0.46 },
      { rx: 0.20, ry: 0.48 }, { rx: 0.15, ry: 0.52 }, { rx: 0.22, ry: 0.36 }
    ];
    for (const t of trees) {
      const tx = x + w * t.rx;
      const ty = y + h * t.ry;
      ctx.beginPath();
      ctx.moveTo(tx, ty - 9);
      ctx.lineTo(tx + 6, ty + 4);
      ctx.lineTo(tx - 6, ty + 4);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  _renderRoads(ctx, x, y, w, h) {
    ctx.save();

    // ESTRADA ESTADUAL 12 (State Route 12) — Asfalto sinuoso Leste-Oeste
    // Borda escura do asfalto
    ctx.strokeStyle = '#2d2d34';
    ctx.lineWidth = 10.0;
    ctx.beginPath();
    ctx.moveTo(x, y + h * 0.58);
    ctx.bezierCurveTo(x + w * 0.25, y + h * 0.60, x + w * 0.35, y + h * 0.64, x + w * 0.44, y + h * 0.62);
    ctx.bezierCurveTo(x + w * 0.60, y + h * 0.60, x + w * 0.75, y + h * 0.50, x + w, y + h * 0.46);
    ctx.stroke();

    // Superfície cinza da pista
    ctx.strokeStyle = '#4a4a52';
    ctx.lineWidth = 7.0;
    ctx.stroke();

    // Linha amarela tracejada central
    ctx.strokeStyle = '#e0a96d';
    ctx.lineWidth = 1.0;
    ctx.setLineDash([6, 5]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Rótulo da rodovia
    ctx.font = '700 9px "Courier New", monospace';
    ctx.fillStyle = '#e6e4df';
    ctx.fillText('ESTRADA ESTADUAL 12', x + w * 0.08, y + h * 0.56);
    ctx.fillText('-> SAÍDA PARA A CAPITAL (BLOQUEADA)', x + w * 0.70, y + h * 0.44);

    // Malha viária urbana do Centro Cívico (Ruas secundárias em tom grafite)
    ctx.strokeStyle = '#68645c';
    ctx.lineWidth = 3.5;

    // Rua das Acácias (Norte-Sul conectando Delegacia e Cartório)
    ctx.beginPath();
    ctx.moveTo(x + w * 0.48, y + h * 0.38);
    ctx.lineTo(x + w * 0.48, y + h * 0.72);
    ctx.stroke();

    // Praça dos Pioneiros / Av Central
    ctx.beginPath();
    ctx.moveTo(x + w * 0.38, y + h * 0.50);
    ctx.lineTo(x + w * 0.62, y + h * 0.50);
    ctx.stroke();

    // Estrada de terra da represa
    ctx.strokeStyle = '#998668';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(x + w * 0.48, y + h * 0.38);
    ctx.bezierCurveTo(x + w * 0.40, y + h * 0.32, x + w * 0.34, y + h * 0.28, x + w * 0.32, y + h * 0.24);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();
  }

  _renderRailways(ctx, x, y, w, h) {
    ctx.save();

    // Trilhos da Ferrovia de Carga Sul
    const rx1 = x + w * 0.30;
    const ry1 = y + h * 0.88;
    const rx2 = x + w;
    const ry2 = y + h * 0.80;

    // Dormentes de madeira
    ctx.strokeStyle = '#443c32';
    ctx.lineWidth = 6.0;
    ctx.setLineDash([2, 5]);
    ctx.beginPath();
    ctx.moveTo(rx1, ry1);
    ctx.lineTo(rx2, ry2);
    ctx.stroke();

    // Trilhos metálicos duplos
    ctx.setLineDash([]);
    ctx.strokeStyle = '#222226';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(rx1, ry1 - 2); ctx.lineTo(rx2, ry2 - 2);
    ctx.moveTo(rx1, ry1 + 2); ctx.lineTo(rx2, ry2 + 2);
    ctx.stroke();

    // Ramal industrial para o Frigorífico Sloane
    ctx.beginPath();
    ctx.moveTo(x + w * 0.70, y + h * 0.84);
    ctx.bezierCurveTo(x + w * 0.73, y + h * 0.76, x + w * 0.76, y + h * 0.72, x + w * 0.78, y + h * 0.68);
    ctx.stroke();

    ctx.restore();
  }

  _renderFogAndRestrictedZones(ctx, x, y, w, h, discoveredLocations) {
    ctx.save();

    // Zona Industrial do Frigorífico Sloane com cerca e névoa
    const indX = x + w * 0.70;
    const indY = y + h * 0.58;
    const indW = w * 0.26;
    const indH = h * 0.26;

    // Hachura de área restrita
    ctx.strokeStyle = 'rgba(180, 40, 40, 0.25)';
    ctx.lineWidth = 1.2;
    for (let lx = indX; lx < indX + indW; lx += 14) {
      ctx.beginPath();
      ctx.moveTo(lx, indY);
      ctx.lineTo(lx + indH * 0.8, indY + indH);
      ctx.stroke();
    }

    // Carimbo vermelho envelhecido "ACESSO INTERDITADO"
    ctx.save();
    ctx.translate(indX + indW * 0.45, indY + indH * 0.45);
    ctx.rotate(-0.15);

    ctx.strokeStyle = 'rgba(180, 20, 30, 0.75)';
    ctx.lineWidth = 2.0;
    ctx.strokeRect(-80, -16, 160, 32);

    ctx.font = '700 10px "Courier New", monospace';
    ctx.fillStyle = 'rgba(180, 20, 30, 0.85)';
    ctx.textAlign = 'center';
    ctx.fillText('ACESSO INTERDITADO', 0, -2);
    ctx.font = '8px "Courier New", monospace';
    ctx.fillText('ORD. POLICIAL Nº 12-B', 0, 9);
    ctx.restore();

    ctx.restore();
  }

  _renderHandwrittenNotes(ctx, x, y, w, h) {
    ctx.save();

    for (const note of this.handwrittenNotes) {
      ctx.save();
      const nx = x + w * note.x;
      const ny = y + h * note.y;

      ctx.translate(nx, ny);
      ctx.rotate(note.rot || 0);

      // Traço de caneta esferográfica 1989
      ctx.font = 'italic 700 10.5px "Courier New", Courier, monospace';
      ctx.fillStyle = note.color;
      ctx.fillText(note.text, 0, 0);

      // Círculo ou seta à caneta desenhada à mão
      ctx.strokeStyle = note.color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(30, 12, 45, 12, 0.1, 0, Math.PI * 1.8);
      ctx.stroke();

      ctx.restore();
    }

    ctx.restore();
  }

  _renderCompassAndLegend(ctx, x, y, w, h) {
    ctx.save();

    // Rosa dos Ventos Analógica no canto inferior direito
    const cx = x + w - 85;
    const cy = y + h - 85;

    ctx.strokeStyle = '#4a4234';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 26, 0, Math.PI * 2);
    ctx.stroke();

    // Pontas da bússola
    ctx.fillStyle = '#222228';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 28); ctx.lineTo(cx + 6, cy); ctx.lineTo(cx, cy - 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#9e8d72';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 28); ctx.lineTo(cx - 6, cy); ctx.lineTo(cx, cy - 4); ctx.closePath(); ctx.fill();

    ctx.font = '700 10px "Courier New", monospace';
    ctx.fillStyle = '#222228';
    ctx.textAlign = 'center';
    ctx.fillText('N', cx, cy - 32);

    // Legenda de Escala Cartográfica 1989
    ctx.fillStyle = '#3a3428';
    ctx.font = '700 9px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('MAPA OFICIAL DO MUNICÍPIO — 1989', x + 16, y + h - 24);
    ctx.fillText('ESCALA: 1 cm = 500 m | DEPT. DE VIAÇÃO', x + 16, y + h - 12);

    ctx.restore();
  }

  _renderPaperCreases(ctx, x, y, w, h) {
    ctx.save();

    // 1. Vinco Vertical Central (Dobra em cruz)
    const midX = x + w / 2;
    // Sombra do vinco
    const vGrad = ctx.createLinearGradient(midX - 12, y, midX + 12, y);
    vGrad.addColorStop(0.0, 'rgba(0, 0, 0, 0.0)');
    vGrad.addColorStop(0.48, 'rgba(0, 0, 0, 0.28)');
    vGrad.addColorStop(0.52, 'rgba(255, 255, 255, 0.22)'); // Brilho no vinco oposto
    vGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = vGrad;
    ctx.fillRect(midX - 12, y, 24, h);

    // 2. Vinco Horizontal Central
    const midY = y + h / 2;
    const hGrad = ctx.createLinearGradient(x, midY - 12, x, midY + 12);
    hGrad.addColorStop(0.0, 'rgba(0, 0, 0, 0.0)');
    hGrad.addColorStop(0.48, 'rgba(0, 0, 0, 0.28)');
    hGrad.addColorStop(0.52, 'rgba(255, 255, 255, 0.22)');
    hGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = hGrad;
    ctx.fillRect(x, midY - 12, w, 24);

    ctx.restore();
  }

  _renderPushpins(ctx, mapX, mapY, mapW, mapH) {
    ctx.save();

    for (const loc of this.locations) {
      const px = mapX + mapW * loc.x;
      const py = mapY + mapH * loc.y;
      const isHovered = this.hoveredLocation && this.hoveredLocation.id === loc.id;
      const isActive = this.activeLocationId === loc.id;

      // Sombra projetada do alfinete em ângulo (luz superior esquerda)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(px + 7, py + 8, 8, 4, 0.35, 0, Math.PI * 2);
      ctx.fill();

      // Haste metálica pontiaguda do alfinete fincada no mapa
      ctx.strokeStyle = '#b0b0b8';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + 4, py + 6);
      ctx.stroke();

      // Se for o local ativo ou sob hover, desenha anel pulsante âmbar
      if (isActive || isHovered) {
        ctx.strokeStyle = isHovered ? '#e0a96d' : '#9d4edd';
        ctx.lineWidth = 1.6;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        const pulseR = 14 + Math.sin(this.time * 6) * 2.5;
        ctx.arc(px, py, pulseR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Cabeça esférica de plástico 3D do alfinete
      const pinR = isHovered ? 8.5 : 7.0;
      const pinColor = loc.pinColor || '#d62828';

      const sphereGrad = ctx.createRadialGradient(px - pinR * 0.3, py - pinR * 0.35, pinR * 0.15, px, py, pinR);
      sphereGrad.addColorStop(0.0, '#ffffff'); // Especular
      sphereGrad.addColorStop(0.4, pinColor);
      sphereGrad.addColorStop(1.0, '#101014'); // Sombra plástica profunda
      ctx.fillStyle = sphereGrad;
      ctx.beginPath();
      ctx.arc(px, py, pinR, 0, Math.PI * 2);
      ctx.fill();

      // Contorno fino da esfera
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    ctx.restore();
  }

  _renderHoverCard(ctx, w, h) {
    if (!this.hoveredLocation) return;
    const loc = this.hoveredLocation;

    ctx.save();
    const mx = this.mouse.x;
    const my = this.mouse.y;

    const cardW = 310;
    const cardH = 118;
    // Posiciona ao lado do cursor, evitando sair da tela
    let cx = mx + 18;
    let cy = my - cardH / 2;
    if (cx + cardW > w - 20) cx = mx - cardW - 18;
    if (cy < 60) cy = 60;
    if (cy + cardH > h - 40) cy = h - cardH - 40;

    // Sombra pesada do card de papel
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(cx + 5, cy + 6, cardW, cardH);

    // Fundo da ficha policial de arquivo
    ctx.fillStyle = '#0f0f14';
    ctx.fillRect(cx, cy, cardW, cardH);
    ctx.strokeStyle = loc.pinColor || '#e0a96d';
    ctx.lineWidth = 1.4;
    ctx.strokeRect(cx, cy, cardW, cardH);

    // Faixa do topo com categoria
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(cx, cy, cardW, 22);

    ctx.font = '700 9px "Courier New", monospace';
    ctx.fillStyle = loc.pinColor || '#e0a96d';
    ctx.fillText(loc.category, cx + 10, cy + 15);

    // Nome principal do local
    ctx.font = '700 12px "Courier New", monospace';
    ctx.fillStyle = '#f0eee9';
    ctx.fillText(loc.name.toUpperCase(), cx + 10, cy + 38);

    // Setor
    ctx.font = 'italic 9.5px "Courier New", monospace';
    ctx.fillStyle = '#d48b28';
    ctx.fillText(loc.sector, cx + 10, cy + 52);

    // Descrição resumida
    ctx.font = '10px "Courier New", monospace';
    ctx.fillStyle = '#c5b58e';
    const lines = this._wrapText(ctx, loc.desc, cardW - 20);
    for (let li = 0; li < Math.min(2, lines.length); li++) {
      ctx.fillText(lines[li], cx + 10, cy + 68 + li * 13);
    }

    // Status inferior
    ctx.font = '700 9.5px "Courier New", monospace';
    if (loc.status === 'bloqueado') {
      ctx.fillStyle = '#e63946';
      ctx.fillText(`[BLOQUEADO: ${loc.requiredClue}]`, cx + 10, cy + 106);
    } else {
      ctx.fillStyle = '#9d4edd';
      ctx.fillText('[CLIQUE PARA DESLOCAR INVESTIGAÇÃO]', cx + 10, cy + 106);
    }

    ctx.restore();
  }

  _renderHeaderAndControls(ctx, w, h) {
    ctx.save();

    // Faixa Superior
    ctx.fillStyle = 'rgba(8, 8, 12, 0.95)';
    ctx.strokeStyle = '#7b2cbf';
    ctx.lineWidth = 1.2;
    ctx.fillRect(20, 10, w - 40, 32);
    ctx.strokeRect(20, 10, w - 40, 32);

    ctx.font = '700 11.5px "Courier New", Courier, monospace';
    ctx.fillStyle = '#e6e4df';
    ctx.textAlign = 'left';
    ctx.fillText('MAPA RODOVIÁRIO & INVESTIGATIVO — NORTHVALE 1989', 34, 30);

    ctx.font = '10px "Courier New", monospace';
    ctx.fillStyle = '#d48b28';
    ctx.textAlign = 'right';
    ctx.fillText('[ESC] FECHAR MAPA | PASSE O CURSOR SOBRE OS ALFINETES', w - 34, 30);

    ctx.restore();
  }

  _wrapText(ctx, text, maxW) {
    const words = text.split(' ');
    const lines = [];
    let cur = '';
    for (const w of words) {
      const test = cur ? `${cur} ${w}` : w;
      if (ctx.measureText(test).width > maxW) {
        lines.push(cur);
        cur = w;
      } else cur = test;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  /**
   * Processa movimento do mouse para detectar hover sobre alfinetes.
   */
  handleMouseMove(mouseX, mouseY, width = null, height = null) {
    const w = width || (this.canvas ? this.canvas.width : window.innerWidth);
    const h = height || (this.canvas ? this.canvas.height : window.innerHeight);

    this.mouse.x = mouseX;
    this.mouse.y = mouseY;

    const mapPadX = Math.max(24, Math.floor(w * 0.05));
    const mapPadY = Math.max(48, Math.floor(h * 0.07));
    const mapW = w - mapPadX * 2;
    const mapH = h - mapPadY * 2;

    this.hoveredLocation = null;
    for (let i = this.locations.length - 1; i >= 0; i--) {
      const loc = this.locations[i];
      const px = mapPadX + mapW * loc.x;
      const py = mapPadY + mapH * loc.y;
      const dist = Math.hypot(mouseX - px, mouseY - py);
      if (dist <= 14) {
        this.hoveredLocation = loc;
        break;
      }
    }
  }

  /**
   * Processa clique sobre os alfinetes ou controles.
   * @returns {Object|null} Retorna o objeto do local se clicado
   */
  handleClick(mouseX, mouseY) {
    if (this.hoveredLocation) {
      this.activeLocationId = this.hoveredLocation.id;
      if (this.onSelectLocation) {
        this.onSelectLocation(this.hoveredLocation);
      }
      return this.hoveredLocation;
    }
    return null;
  }

  /**
   * Processa teclas.
   */
  handleKeyDown(key) {
    const k = typeof key === 'string' ? key : key.key;
    if (k === 'Escape' || k === 'm' || k === 'M') {
      if (this.onClose) this.onClose();
      return true;
    }
    return false;
  }
}
