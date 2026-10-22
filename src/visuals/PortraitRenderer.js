/**
 * NorthVale: Sombras de 1989 — PortraitRenderer.js
 * Direção de Arte Técnica: Renderizador Vetorial & Procedural de Retratos Neo-Noir (1989)
 *
 * Módulo puro em Canvas 2D desacoplado (sem dependências externas):
 * - Desenho vetorial dos 32 personagens oficiais do jogo de forma 100% procedural.
 * - Iluminação dramática neo-noir (chiaroscuro, luz lateral dura, fluorescente fria superior).
 * - Estados emocionais dinâmicos: 'calm' (calmo), 'tense' (tenso), 'guilty' (culpado), 'furious' (furioso).
 * - Efeitos atmosféricos dinâmicos: fumaça de cigarro, gotas de suor, cicatrizes, óculos com reflexos.
 * - Assinatura canônica: PortraitRenderer.draw(ctx, characterId, emotionState, x, y, size)
 */

export class PortraitRenderer {
  /**
   * Tabela canônica dos 32 personagens organizados por seus 6 núcleos narrativos.
   */
  static CHARACTERS = {
    // ------------------------------------------------------------------------
    // NÚCLEO 1: LEI, POLÍTICA & PODER
    // ------------------------------------------------------------------------
    alex: {
      id: 'alex',
      fullName: 'Alex Hale',
      age: 38,
      title: 'O Detetive Forasteiro',
      skin: '#c8a282',
      hair: '#241c18',
      hairType: 'slick_back_wet',
      jaw: 'square',
      eyes: 'tired_deep',
      clothes: 'trench_olive',
      features: ['stubble_3days', 'eyebrow_scar', 'eyebags', 'cigar_smoke'],
      lighting: 'chiaroscuro_side'
    },
    bobby: {
      id: 'bobby',
      fullName: 'Bobby Miller',
      age: 28,
      title: 'O Subxerife / O Culpado',
      skin: '#e8cdb5',
      hair: '#8d6d45',
      hairType: 'parted_side_cap',
      jaw: 'round',
      eyes: 'shifty_wide',
      clothes: 'police_beige',
      features: ['pencil_mustache', 'sweat_drops', 'badge_brass'],
      lighting: 'harsh_interrogation'
    },
    ruth: {
      id: 'ruth',
      fullName: 'Ruth Mercer',
      age: 54,
      title: 'A Xerife',
      skin: '#caa588',
      hair: '#7a7675',
      hairType: 'short_bob_straight',
      jaw: 'angular_harsh',
      eyes: 'cold_contempt',
      clothes: 'leather_sheriff_fur',
      features: ['cheekbones', 'brow_furrow', 'cigar_smoke_heavy'],
      lighting: 'cold_overhead_fluorescent'
    },
    arthur: {
      id: 'arthur',
      fullName: 'Dr. Arthur Aris',
      age: 61,
      title: 'O Médico-Legista Municipal',
      skin: '#d29e80',
      hair: '#9e9e9e',
      hairType: 'balding_fringe',
      jaw: 'hooked_cynic',
      eyes: 'wire_glasses_cyan',
      clothes: 'morgue_coat_turtleneck',
      features: ['red_alcohol_cheeks', 'scalpel_shaking', 'glasses_round'],
      lighting: 'morgue_cyan_top'
    },
    clara: {
      id: 'clara',
      fullName: 'Clara Higgins',
      age: 67,
      title: 'A Tabeliã do Cartório',
      skin: '#e2cfbd',
      hair: '#eae6e0',
      hairType: 'tight_bun_white',
      jaw: 'parchment_aged',
      eyes: 'gold_chain_glasses',
      clothes: 'shawl_knit_black',
      features: ['wrinkles_deep', 'bun_pins', 'glasses_chain'],
      lighting: 'archive_amber'
    },
    donald: {
      id: 'donald',
      fullName: 'Prefeito Donald Vance',
      age: 63,
      title: 'O Administrador Ausente',
      skin: '#dab094',
      hair: '#5c544d',
      hairType: 'slick_comb_thin',
      jaw: 'flabby_double_chin',
      eyes: 'plastic_smile_shifty',
      clothes: 'pinstripe_navy_redtie',
      features: ['heavy_jowls', 'yellow_teeth', 'gold_cufflinks'],
      lighting: 'office_dim_heavy'
    },

    // ------------------------------------------------------------------------
    // NÚCLEO 2: VÍTIMAS & FAMÍLIA
    // ------------------------------------------------------------------------
    sarah: {
      id: 'sarah',
      fullName: 'Sarah Miller',
      age: 17,
      title: 'A Vítima Central / Sobrevivente',
      skin: '#d5aa90',
      hair: '#5a3d2e',
      hairType: 'ponytail_wet_bangs',
      jaw: 'delicate_resilient',
      eyes: 'haunted_fever',
      clothes: 'mustard_jacket_mud',
      features: ['thorn_scratches', 'chapped_lips', 'mud_smudges'],
      lighting: 'dam_darkness_rim'
    },
    julian: {
      id: 'julian',
      fullName: 'Julian Vance',
      age: 18,
      title: 'O Ativista / Balconista (Falecido)',
      skin: '#d8b292',
      hair: '#4a3324',
      hairType: 'curly_80s_voluminous',
      jaw: 'cleft_chin_clean',
      eyes: 'idealist_bold',
      clothes: 'denim_jacket_flannel',
      features: ['cleft_chin', 'collar_open'],
      lighting: 'flashback_sepia'
    },
    maeve: {
      id: 'maeve',
      fullName: 'Maeve Higgins',
      age: 17,
      title: 'A Arquivista (Falecida)',
      skin: '#e8c4a8',
      hair: '#8d3b24',
      hairType: 'auburn_shoulder_wavy',
      jaw: 'gentle_oval',
      eyes: 'tortoiseshell_glasses',
      clothes: 'cardigan_beige_scarf',
      features: ['freckles_nose', 'tortoise_glasses', 'blue_scarf'],
      lighting: 'flashback_sepia'
    },
    helen: {
      id: 'helen',
      fullName: 'Helen Miller',
      age: 46,
      title: 'A Mãe de Sarah',
      skin: '#cba386',
      hair: '#8a7d6e',
      hairType: 'blonde_grey_messy_band',
      jaw: 'drawn_hollow',
      eyes: 'weeping_red_insomnia',
      clothes: 'diner_apron_brown',
      features: ['dark_circles', 'chapped_wind_skin', 'apron_stains'],
      lighting: 'cold_kitchen_bleak'
    },

    // ------------------------------------------------------------------------
    // NÚCLEO 3: O COMPLEXO INDUSTRIAL SLOANE
    // ------------------------------------------------------------------------
    viktor: {
      id: 'viktor',
      fullName: 'Viktor Sloane',
      age: 59,
      title: 'O Magnata do Frigorífico',
      skin: '#cfab8d',
      hair: '#454342',
      hairType: 'parted_steel_grey',
      jaw: 'predatory_hawk',
      eyes: 'grey_hawk_cold',
      clothes: 'cashmere_overcoat_black',
      features: ['trimmed_mustache', 'signet_ring_gold', 'sharp_shadows'],
      lighting: 'executive_noir_low'
    },
    kurt: {
      id: 'kurt',
      fullName: 'Kurt Becker',
      age: 42,
      title: 'O Chefe de Segurança Privada',
      skin: '#bc9074',
      hair: '#1d1916',
      hairType: 'military_buzz_cut',
      jaw: 'thick_bull_neck',
      eyes: 'squint_brutal',
      clothes: 'bomber_black_heavy',
      features: ['crooked_boxer_nose', 'chin_scar', 'thick_neck'],
      lighting: 'security_red_rim'
    },
    bruno: {
      id: 'bruno',
      fullName: 'Bruno Varga',
      age: 35,
      title: 'O Operário Agressivo',
      skin: '#be8f73',
      hair: '#1f1a18',
      hairType: 'beanie_black_wool',
      jaw: 'heavy_acne_scars',
      eyes: 'intimidating_glare',
      clothes: 'butcher_rubber_apron',
      features: ['unibrow_thick', 'acne_scars', 'blood_smear'],
      lighting: 'abattoir_harsh'
    },
    yelena: {
      id: 'yelena',
      fullName: 'Yelena Ramos',
      age: 29,
      title: 'A Engenheira Química Desiludida',
      skin: '#c99f84',
      hair: '#2d2420',
      hairType: 'messy_bun_pencil',
      jaw: 'sharp_exhausted',
      eyes: 'safety_goggles_forehead',
      clothes: 'lab_coat_acid_stains',
      features: ['goggles_on_head', 'pencil_in_hair', 'chemical_yellow_spots'],
      lighting: 'lab_mercury_vapor'
    },
    otis: {
      id: 'otis',
      fullName: 'Otis Clark',
      age: 51,
      title: 'O Vigia da Guarita da Represa',
      skin: '#caa183',
      hair: '#4d463e',
      hairType: 'scruffy_under_hood',
      jaw: 'round_sleepy',
      eyes: 'droopy_eyelids',
      clothes: 'yellow_raincoat_hood',
      features: ['stubble_patchy', 'yellow_hood', 'flashlight_chest'],
      lighting: 'rain_beam_torch'
    },

    // ------------------------------------------------------------------------
    // NÚCLEO 4: COMÉRCIO, SERVIÇOS & SUBSISTÊNCIA
    // ------------------------------------------------------------------------
    elias: {
      id: 'elias',
      fullName: 'Elias Ward',
      age: 58,
      title: 'O Farmacêutico',
      skin: '#e0caa9',
      hair: '#70675c',
      hairType: 'thin_balding_frown',
      jaw: 'slouched_hunched',
      eyes: 'frightened_darting',
      clothes: 'beige_shirt_suspenders',
      features: ['iodine_stained_fingers', 'elastic_suspenders', 'nervous_sweat'],
      lighting: 'apothecary_amber'
    },
    sam: {
      id: 'sam',
      fullName: 'Sam "Big Wrench" Kowalski',
      age: 52,
      title: 'O Dono da Oficina',
      skin: '#b5886d',
      hair: '#55524e',
      hairType: 'receding_grease_cap',
      jaw: 'massive_square',
      eyes: 'stoic_iron',
      clothes: 'black_tank_grease_overalls',
      features: ['walrus_mustache', 'faded_anchor_tattoos', 'motor_grease'],
      lighting: 'garage_warm_halogen'
    },
    owen: {
      id: 'owen',
      fullName: 'Owen Briggs',
      age: 58,
      title: 'O Sucateiro da Represa',
      skin: '#9e6f52',
      hair: '#665d53',
      hairType: 'wild_greasy_strands',
      jaw: 'weathered_sunken',
      eyes: 'paranoid_wide_terrified',
      clothes: 'm65_jacket_duct_tape',
      features: ['missing_teeth', 'duct_tape_patches', 'wild_paranoia'],
      lighting: 'bonfire_flicker'
    },
    nora: {
      id: 'nora',
      fullName: 'Nora Finch',
      age: 39,
      title: 'A Garçonete do Double R Diner',
      skin: '#dbb499',
      hair: '#7b4832',
      hairType: 'curled_80s_bouffant',
      jaw: 'friendly_laugh_lines',
      eyes: 'warm_sympathy',
      clothes: 'baby_blue_diner_dress',
      features: ['dark_red_lipstick', 'bubblegum_bubble', 'order_pad_pocket'],
      lighting: 'neon_pink_cyan_rim'
    },
    harvey: {
      id: 'harvey',
      fullName: 'Harvey Dent',
      age: 64,
      title: 'O Barbeiro Local',
      skin: '#dfc0a5',
      hair: '#f0ede6',
      hairType: 'pomade_slick_white',
      jaw: 'refined_chiseled',
      eyes: 'observant_quiet',
      clothes: 'barber_smock_stripes',
      features: ['silver_straight_razor', 'pomade_sheen', 'delicate_hands'],
      lighting: 'barber_mirror_bright'
    },

    // ------------------------------------------------------------------------
    // NÚCLEO 5: CIDADE BAIXA, FERROVIA & MARGINALIDADE
    // ------------------------------------------------------------------------
    frankie: {
      id: 'frankie',
      fullName: 'Frankie "Dente de Prata"',
      age: 33,
      title: 'O Receptador de Cargas',
      skin: '#caa284',
      hair: '#2b231d',
      hairType: 'dark_felt_beret',
      jaw: 'sly_smirk',
      eyes: 'predatory_glance',
      clothes: 'leather_jacket_studs',
      features: ['silver_canine_tooth', 'brass_chain', 'beret_tilt'],
      lighting: 'dock_sodium_orange'
    },
    maria: {
      id: 'maria',
      fullName: 'Irmã Maria Francisca',
      age: 70,
      title: 'A Freira da Capela Velha',
      skin: '#d5b99f',
      hair: '#a09990',
      hairType: 'nun_veil_black_white',
      jaw: 'serene_wrinkled',
      eyes: 'compassionate_deep',
      clothes: 'nun_habit_traditional',
      features: ['deep_wrinkles', 'wooden_rosary', 'wimple_white'],
      lighting: 'candlelight_chapel'
    },
    thomas: {
      id: 'thomas',
      fullName: 'Padre Thomas',
      age: 45,
      title: 'O Pároco Assombrado',
      skin: '#cfab92',
      hair: '#362d26',
      hairType: 'short_neat_dark',
      jaw: 'hollow_confessor',
      eyes: 'haunted_burdened',
      clothes: 'black_cassock_white_collar',
      features: ['sunken_sockets', 'clerical_collar', 'trembling_lips'],
      lighting: 'stained_glass_purple'
    },
    silas: {
      id: 'silas',
      fullName: 'Silas Vance',
      age: 72,
      title: 'O Patriarca Decadente',
      skin: '#b89073',
      hair: '#b3aca2',
      hairType: 'disheveled_grey_mane',
      jaw: 'scowling_patriarch',
      eyes: 'blind_left_eye_opaque',
      clothes: 'corduroy_coat_frayed_scarf',
      features: ['blind_milky_eye', 'rosewood_cane', 'frayed_wool_scarf'],
      lighting: 'decay_hearth_amber'
    },
    lenny: {
      id: 'lenny',
      fullName: 'Lenny "O Rato"',
      age: 24,
      title: 'O Informante da Estação',
      skin: '#d8b598',
      hair: '#3d3229',
      hairType: 'pulled_down_beanie',
      jaw: 'rodent_pointed_chin',
      eyes: 'twitchy_darting',
      clothes: 'puffy_sports_vest_torn',
      features: ['pointed_nose', 'beanie_over_ears', 'twitching_glance'],
      lighting: 'rail_yard_blue_slit'
    },

    // ------------------------------------------------------------------------
    // NÚCLEO 6: IMPRENSA, REPARTIÇÕES & DIVERSOS
    // ------------------------------------------------------------------------
    warren: {
      id: 'warren',
      fullName: 'Warren Graves',
      age: 48,
      title: 'O Jornalista Alcoólatra da Gazeta',
      skin: '#cfa286',
      hair: '#6a5e55',
      hairType: 'messy_windblown_grey',
      jaw: 'slack_jowled',
      eyes: 'bloodshot_cynical',
      clothes: 'trench_faded_beige',
      features: ['bulbous_red_nose', 'ink_stained_tie', 'wire_press_pad'],
      lighting: 'press_room_desk_lamp'
    },
    edna: {
      id: 'edna',
      fullName: 'Edna Morse',
      age: 55,
      title: 'A Telefonista da Central',
      skin: '#d9bda2',
      hair: '#5c4e43',
      hairType: 'tight_pin_curls',
      jaw: 'rigid_stern',
      eyes: 'narrowed_all_hearing',
      clothes: 'moss_green_cardigan',
      features: ['bakelite_headset_operator', 'hanging_reading_glasses', 'pursed_lips'],
      lighting: 'switchboard_green_phosphor'
    },
    garrett: {
      id: 'garrett',
      fullName: 'Garrett Hall',
      age: 31,
      title: 'O Guarda-Florestal da Bacia',
      skin: '#b8896a',
      hair: '#382a20',
      hairType: 'ranger_hat_wide_brim',
      jaw: 'rugged_full_beard',
      eyes: 'calm_observant_nature',
      clothes: 'ranger_olive_uniform_patch',
      features: ['trimmed_beard', 'wide_brim_hat', 'conservation_patch'],
      lighting: 'pine_forest_dappled'
    },
    molly: {
      id: 'molly',
      fullName: 'Molly Peters',
      age: 19,
      title: 'A Telefonista Subalterna',
      skin: '#e2be9f',
      hair: '#703e28',
      hairType: 'teased_80s_side_clip',
      jaw: 'soft_youthful_scared',
      eyes: 'anxious_guilty_hide',
      clothes: 'faded_pink_turtleneck',
      features: ['neon_hair_clip', 'teased_hair', 'nervous_lip_bite'],
      lighting: 'neon_pink_side'
    },
    higgins_bombeiro: {
      id: 'higgins_bombeiro',
      fullName: 'Chefe Higgins',
      age: 50,
      title: 'O Chefe dos Bombeiros (Tio de Maeve)',
      skin: '#c29479',
      hair: '#645d56',
      hairType: 'receding_fire_crew',
      jaw: 'heavy_grief_stricken',
      eyes: 'desolate_sorrow',
      clothes: 'firefighter_bunker_yellow_black',
      features: ['soot_smudges', 'reflective_bands_worn', 'heavy_square_chin'],
      lighting: 'ember_glow_grief'
    },
    beverly: {
      id: 'beverly',
      fullName: 'Dra. Beverly Vance',
      age: 36,
      title: 'A Farmacologista da Capital',
      skin: '#dec1a8',
      hair: '#1f1a18',
      hairType: 'sharp_angled_bob_black',
      jaw: 'high_chiseled_class',
      eyes: 'analytical_cold_elegant',
      clothes: 'structured_black_wool_coat',
      features: ['cold_couture_makeup', 'gold_swiss_watch', 'pearl_earring'],
      lighting: 'capital_chic_spotlight'
    },
    estranho: {
      id: 'estranho',
      fullName: 'O Estranho da Trilha',
      age: 65,
      title: 'O Ermitão da Represa',
      skin: '#8d6348',
      hair: '#7e7b77',
      hairType: 'wild_tangled_long_grey',
      jaw: 'concealed_by_huge_beard',
      eyes: 'manic_wide_gleaming',
      clothes: 'tarp_poncho_baling_twine',
      features: ['huge_tangled_beard', 'baling_twine_tie', 'water_dripping'],
      lighting: 'storm_lightning_flash'
    }
  };

  /**
   * Converte ID flexível em chave canônica.
   * Ex: 'bobby_miller' -> 'bobby', 'alex_hale' -> 'alex'
   */
  static normalizeId(id) {
    if (!id) return 'alex';
    const clean = String(id).toLowerCase().trim();
    if (this.CHARACTERS[clean]) return clean;

    for (const key of Object.keys(this.CHARACTERS)) {
      if (clean.includes(key)) return key;
    }
    return 'alex';
  }

  /**
   * Retorna os metadados do personagem.
   */
  static getCharacterInfo(characterId) {
    const key = this.normalizeId(characterId);
    return this.CHARACTERS[key] || this.CHARACTERS.alex;
  }

  /**
   * Retorna lista de todos os 32 IDs canônicos.
   */
  static listCharacterKeys() {
    return Object.keys(this.CHARACTERS);
  }

  /**
   * MÉTODO PRINCIPAL DE DESENHO VETORIAL
   * Renderiza o retrato procedural do personagem dentro de um quadro de x, y, size.
   *
   * @param {CanvasRenderingContext2D} ctx Contexto Canvas 2D
   * @param {string} characterId Identificador do personagem (ex: 'alex', 'bobby', 'ruth')
   * @param {string} [emotionState='calm'] 'calm' | 'tense' | 'guilty' | 'furious'
   * @param {number} x Coordenada X no canvas
   * @param {number} y Coordenada Y no canvas
   * @param {number} [size=128] Largura e altura da moldura (ex: 96, 128, 192)
   */
  static draw(ctx, characterId, emotionState = 'calm', x = 0, y = 0, size = 128) {
    const key = this.normalizeId(characterId);
    const char = this.CHARACTERS[key] || this.CHARACTERS.alex;
    const emotion = (emotionState || 'calm').toLowerCase();

    ctx.save();
    ctx.translate(x, y);

    // Sistema de escala relativa normalizada para 128x128
    const scale = size / 128;
    ctx.scale(scale, scale);

    // 1. Fundo do Gabinete Noir da Foto Policial
    this._renderChassisBackdrop(ctx, char);

    // 2. Base da Roupa e Ombros
    this._renderClothing(ctx, char, emotion);

    // 3. Pescoço e Mandíbula
    this._renderFaceStructure(ctx, char, emotion);

    // 4. Detalhes Faciais (Olhos, Sobrancelhas, Nariz, Boca)
    this._renderFacialFeatures(ctx, char, emotion);

    // 5. Cabelos e Chapéus/Acessórios de Cabeça
    this._renderHairAndHeadgear(ctx, char, emotion);

    // 6. Elementos Particulares (Cicatrizes, Óculos, Fumaça, Bigodes, Gotas de Suor)
    this._renderSpecialDetails(ctx, char, emotion);

    // 7. Iluminação Direcional Dramática e Filtro Emocional
    this._renderDramaticLighting(ctx, char, emotion);

    // 8. Moldura Analógica e Linhas CRT de Ficha de Arquivo
    this._renderFrameOverlay(ctx, char);

    ctx.restore();
  }

  // ==========================================================================
  // MÉTODOS PRIVADOS DE COMPOSIÇÃO PROCEDURAL VETORIAL
  // ==========================================================================

  static _renderChassisBackdrop(ctx, char) {
    // Fundo escuro com gradiente neo-noir sutil
    const bgGrad = ctx.createLinearGradient(0, 0, 128, 128);
    bgGrad.addColorStop(0.0, '#0a0a0e');
    bgGrad.addColorStop(0.5, '#121218');
    bgGrad.addColorStop(1.0, '#08080b');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 128, 128);

    // Grade de fundo da ficha policial analógica
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.lineWidth = 1;
    for (let gy = 20; gy < 128; gy += 16) {
      ctx.beginPath();
      ctx.moveTo(8, gy);
      ctx.lineTo(120, gy);
      ctx.stroke();
    }
  }

  static _renderClothing(ctx, char, emotion) {
    ctx.save();
    const type = char.clothes;

    // Ombros base
    ctx.fillStyle = '#181820';
    ctx.beginPath();
    ctx.ellipse(64, 128, 54, 38, 0, Math.PI, 0);
    ctx.fill();

    switch (type) {
      case 'trench_olive': // Alex Hale
        ctx.fillStyle = '#2d3328';
        ctx.beginPath();
        ctx.ellipse(64, 128, 56, 38, 0, Math.PI, 0);
        ctx.fill();

        // Gola levantada de sobretudo noir
        ctx.fillStyle = '#242b20';
        ctx.beginPath();
        ctx.moveTo(32, 128); ctx.lineTo(44, 90); ctx.lineTo(60, 106); ctx.lineTo(54, 128);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(96, 128); ctx.lineTo(84, 90); ctx.lineTo(68, 106); ctx.lineTo(74, 128);
        ctx.fill();

        // Camisa branca amassada e gravata frouxa
        ctx.fillStyle = '#d8d4cd';
        ctx.beginPath();
        ctx.moveTo(56, 102); ctx.lineTo(64, 114); ctx.lineTo(72, 102); ctx.lineTo(64, 94);
        ctx.fill();
        ctx.fillStyle = '#1c1b22';
        ctx.fillRect(62, 104, 4, 24);
        break;

      case 'police_beige': // Bobby Miller
        ctx.fillStyle = '#7a684d';
        ctx.beginPath();
        ctx.ellipse(64, 128, 52, 36, 0, Math.PI, 0);
        ctx.fill();

        // Colarinho de farda engomada torto
        ctx.fillStyle = '#8f7a5c';
        ctx.beginPath();
        ctx.moveTo(42, 102); ctx.lineTo(58, 100); ctx.lineTo(54, 120);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(86, 102); ctx.lineTo(70, 98); ctx.lineTo(74, 120);
        ctx.fill();

        // Distintivo de latão oxidado
        ctx.fillStyle = '#b8923b';
        ctx.beginPath();
        ctx.arc(88, 112, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#6b4f17';
        ctx.fillRect(86.5, 110, 3, 4);
        break;

      case 'leather_sheriff_fur': // Ruth Mercer
        ctx.fillStyle = '#3a271c';
        ctx.beginPath();
        ctx.ellipse(64, 128, 54, 38, 0, Math.PI, 0);
        ctx.fill();

        // Forro de pele sintética de carneiro na gola
        ctx.fillStyle = '#cfbe9f';
        ctx.beginPath();
        ctx.ellipse(64, 102, 28, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'mustard_jacket_mud': // Sarah Miller
        ctx.fillStyle = '#bfa136'; // Amarelo mostarda esportivo
        ctx.beginPath();
        ctx.ellipse(64, 128, 48, 36, 0, Math.PI, 0);
        ctx.fill();

        // Manchas escuras de lama e encharcamento
        ctx.fillStyle = 'rgba(30, 24, 18, 0.55)';
        ctx.beginPath();
        ctx.ellipse(50, 118, 14, 8, 0.3, 0, Math.PI * 2);
        ctx.ellipse(78, 122, 12, 7, -0.2, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'cashmere_overcoat_black': // Viktor Sloane
        ctx.fillStyle = '#111116';
        ctx.beginPath();
        ctx.ellipse(64, 128, 58, 40, 0, Math.PI, 0);
        ctx.fill();

        // Lapela chique de lã
        ctx.fillStyle = '#1b1b22';
        ctx.beginPath();
        ctx.moveTo(40, 128); ctx.lineTo(52, 94); ctx.lineTo(64, 108); ctx.lineTo(76, 94); ctx.lineTo(88, 128);
        ctx.fill();

        // Cachecol de seda gélida
        ctx.fillStyle = '#2c2e38';
        ctx.fillRect(60, 98, 8, 30);
        break;

      case 'pinstripe_navy_redtie': // Donald Vance
        ctx.fillStyle = '#161d2d';
        ctx.beginPath();
        ctx.ellipse(64, 128, 56, 38, 0, Math.PI, 0);
        ctx.fill();

        // Camisa branca e gravata vermelha desbotada
        ctx.fillStyle = '#dedad2';
        ctx.fillRect(60, 96, 8, 32);
        ctx.fillStyle = '#8f2929';
        ctx.beginPath();
        ctx.moveTo(62, 100); ctx.lineTo(66, 100); ctx.lineTo(67, 128); ctx.lineTo(61, 128);
        ctx.fill();
        break;

      case 'nun_habit_traditional': // Irmã Maria
        ctx.fillStyle = '#141418';
        ctx.beginPath();
        ctx.ellipse(64, 128, 56, 40, 0, Math.PI, 0);
        ctx.fill();

        // Peitoral branco (wimple)
        ctx.fillStyle = '#e8e4dc';
        ctx.beginPath();
        ctx.ellipse(64, 114, 20, 16, 0, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'black_cassock_white_collar': // Padre Thomas
        ctx.fillStyle = '#111114';
        ctx.beginPath();
        ctx.ellipse(64, 128, 52, 36, 0, Math.PI, 0);
        ctx.fill();

        // Colarinho clerical branco
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(60, 96, 8, 6);
        break;

      default:
        // Roupa escura estilizada genérica
        ctx.fillStyle = '#22222a';
        ctx.beginPath();
        ctx.ellipse(64, 128, 52, 36, 0, Math.PI, 0);
        ctx.fill();
        break;
    }

    ctx.restore();
  }

  static _renderFaceStructure(ctx, char, emotion) {
    ctx.save();

    // Pescoço
    ctx.fillStyle = char.skin;
    ctx.fillRect(54, 76, 20, 24);

    // Sombra do queixo sobre o pescoço
    ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
    ctx.beginPath();
    ctx.ellipse(64, 82, 18, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Formato da Cabeça / Mandíbula
    ctx.fillStyle = char.skin;
    ctx.beginPath();

    if (char.jaw === 'square' || char.jaw === 'massive_square') {
      // Mandíbula quadrada forte (Alex, Sam)
      ctx.moveTo(40, 48);
      ctx.bezierCurveTo(40, 26, 88, 26, 88, 48);
      ctx.lineTo(86, 70);
      ctx.lineTo(76, 84);
      ctx.lineTo(52, 84);
      ctx.lineTo(42, 70);
      ctx.closePath();
    } else if (char.jaw === 'angular_harsh' || char.jaw === 'predatory_hawk') {
      // Rosto angular e afunilado (Ruth, Viktor)
      ctx.moveTo(42, 48);
      ctx.bezierCurveTo(42, 28, 86, 28, 86, 48);
      ctx.lineTo(84, 68);
      ctx.lineTo(68, 86);
      ctx.lineTo(60, 86);
      ctx.lineTo(44, 68);
      ctx.closePath();
    } else if (char.jaw === 'round' || char.jaw === 'round_sleepy') {
      // Rosto arredondado (Bobby, Otis)
      ctx.arc(64, 58, 25, 0, Math.PI * 2);
    } else if (char.jaw === 'delicate_resilient' || char.jaw === 'gentle_oval') {
      // Rosto delicado feminino (Sarah, Maeve)
      ctx.moveTo(44, 48);
      ctx.bezierCurveTo(44, 28, 84, 28, 84, 48);
      ctx.lineTo(80, 68);
      ctx.lineTo(64, 82);
      ctx.lineTo(48, 68);
      ctx.closePath();
    } else {
      // Padrão oval noir
      ctx.ellipse(64, 58, 23, 27, 0, 0, Math.PI * 2);
    }
    ctx.fill();

    // Papada pronunciada do prefeito Vance
    if (char.features.includes('heavy_jowls')) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.beginPath();
      ctx.ellipse(64, 82, 14, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  static _renderFacialFeatures(ctx, char, emotion) {
    ctx.save();

    // 1. Olheiras profundas ou sombras orbitais
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.beginPath();
    ctx.arc(54, 55, 6, 0, Math.PI * 2);
    ctx.arc(74, 55, 6, 0, Math.PI * 2);
    ctx.fill();

    // 2. Olhos
    let eyeOffsetY = 0;
    let eyeOffsetX = 0;
    let pupilR = 2.2;

    if (emotion === 'tense') {
      pupilR = 3.2; // Pupila dilatada de choque/adrenalina
      eyeOffsetY = -0.5;
    } else if (emotion === 'guilty') {
      eyeOffsetY = 1.2; // Olhar desviado para o chão
      eyeOffsetX = -1.0;
    } else if (emotion === 'furious') {
      pupilR = 1.6; // Olhar cerrado estrito
    }

    // Globo ocular (esclera)
    ctx.fillStyle = '#dfdbd4';
    ctx.beginPath();
    ctx.ellipse(54, 54, 4.8, 2.8, 0, 0, Math.PI * 2);
    ctx.ellipse(74, 54, 4.8, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Olho cego de Silas Vance (esquerdo opaco)
    if (char.features.includes('blind_milky_eye')) {
      ctx.fillStyle = '#dcd4c8';
      ctx.beginPath();
      ctx.arc(54, 54, 2.8, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Íris e Pupila Esquerda
      ctx.fillStyle = char.eyes === 'grey_hawk_cold' ? '#525a66' : '#1a191f';
      ctx.beginPath();
      ctx.arc(54 + eyeOffsetX, 54 + eyeOffsetY, pupilR, 0, Math.PI * 2);
      ctx.fill();
    }

    // Íris e Pupila Direita
    ctx.fillStyle = char.eyes === 'grey_hawk_cold' ? '#525a66' : '#1a191f';
    ctx.beginPath();
    ctx.arc(74 + eyeOffsetX, 54 + eyeOffsetY, pupilR, 0, Math.PI * 2);
    ctx.fill();

    // Ponto de brilho especular nos olhos
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(55 + eyeOffsetX, 53 + eyeOffsetY, 1, 1);
    ctx.fillRect(75 + eyeOffsetX, 53 + eyeOffsetY, 1, 1);

    // 3. Sobrancelhas dinâmicas
    ctx.strokeStyle = char.hair;
    ctx.lineWidth = char.features.includes('unibrow_thick') ? 3.0 : 1.8;

    let browTilt = 0;
    if (emotion === 'furious') browTilt = 3.2; // Anguladas para baixo
    if (emotion === 'tense') browTilt = -1.5;   // Arqueadas de medo

    ctx.beginPath();
    // Sobrancelha Esquerda
    ctx.moveTo(48, 49 + browTilt);
    ctx.lineTo(60, 48 - browTilt);
    // Sobrancelha Direita
    ctx.moveTo(68, 48 - browTilt);
    ctx.lineTo(80, 49 + browTilt);
    ctx.stroke();

    // Unibrow de Bruno Varga
    if (char.features.includes('unibrow_thick')) {
      ctx.beginPath();
      ctx.moveTo(59, 48);
      ctx.lineTo(69, 48);
      ctx.stroke();
    }

    // Cicatriz que corta a sobrancelha direita de Alex Hale
    if (char.features.includes('eyebrow_scar')) {
      ctx.strokeStyle = '#e0a96d';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(76, 45); ctx.lineTo(74, 52);
      ctx.stroke();
    }

    // 4. Nariz
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    if (char.features.includes('crooked_boxer_nose')) {
      // Nariz quebrado em zig-zag de Becker
      ctx.moveTo(64, 52); ctx.lineTo(61, 60); ctx.lineTo(66, 65); ctx.lineTo(62, 68);
    } else {
      ctx.moveTo(64, 50); ctx.lineTo(64, 65); ctx.lineTo(60, 67);
    }
    ctx.stroke();

    // Nariz vermelho de etilista (Arthur Aris, Warren Graves)
    if (char.features.includes('red_alcohol_cheeks') || char.features.includes('bulbous_red_nose')) {
      ctx.fillStyle = 'rgba(190, 50, 40, 0.35)';
      ctx.beginPath();
      ctx.arc(63, 65, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. Boca e Lábios
    ctx.strokeStyle = '#221b18';
    ctx.lineWidth = 1.2;
    ctx.beginPath();

    if (emotion === 'furious') {
      // Boca crispada mostrando dentes
      ctx.fillStyle = '#dedad2';
      ctx.fillRect(58, 73, 12, 4);
      ctx.strokeRect(58, 73, 12, 4);
    } else if (emotion === 'tense' || emotion === 'guilty') {
      // Lábio tenso torto
      ctx.moveTo(56, 75); ctx.lineTo(64, 76); ctx.lineTo(71, 74);
      ctx.stroke();
    } else {
      // Neutro
      ctx.moveTo(56, 75); ctx.lineTo(72, 75);
      ctx.stroke();
    }

    // Dente de prata brilhante de Frankie
    if (char.features.includes('silver_canine_tooth')) {
      ctx.fillStyle = '#e8eaed';
      ctx.fillRect(66, 74, 2.5, 3.5);
    }

    // Chiclete rosa de Nora Finch
    if (char.features.includes('bubblegum_bubble')) {
      ctx.fillStyle = '#e06085';
      ctx.beginPath();
      ctx.arc(71, 75, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  static _renderHairAndHeadgear(ctx, char, emotion) {
    ctx.save();
    ctx.fillStyle = char.hair;

    const style = char.hairType;

    switch (style) {
      case 'slick_back_wet': // Alex Hale
        ctx.beginPath();
        ctx.arc(64, 46, 26, Math.PI, 0);
        ctx.fill();
        // Mechas molhadas caindo na testa
        ctx.strokeStyle = char.hair;
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(52, 38); ctx.lineTo(54, 47);
        ctx.moveTo(62, 36); ctx.lineTo(60, 48);
        ctx.moveTo(70, 37); ctx.lineTo(72, 46);
        ctx.stroke();
        break;

      case 'parted_side_cap': // Bobby Miller com quepe policial
        ctx.beginPath();
        ctx.arc(64, 48, 25, Math.PI, 0);
        ctx.fill();

        // Quepe policial bege e aba de vinil preto
        ctx.fillStyle = '#8f7a5c';
        ctx.fillRect(40, 26, 48, 14);
        ctx.fillStyle = '#14141a';
        ctx.beginPath();
        ctx.ellipse(64, 40, 28, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'short_bob_straight': // Ruth Mercer
        ctx.beginPath();
        ctx.moveTo(38, 58); ctx.lineTo(38, 38);
        ctx.bezierCurveTo(38, 22, 90, 22, 90, 38);
        ctx.lineTo(90, 58); ctx.lineTo(82, 46);
        ctx.lineTo(46, 46); ctx.closePath();
        ctx.fill();
        break;

      case 'tight_bun_white': // Clara Higgins
        ctx.beginPath();
        ctx.arc(64, 44, 25, Math.PI, 0);
        ctx.fill();
        // Coque rígido no topo
        ctx.beginPath();
        ctx.arc(64, 22, 11, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'curly_80s_voluminous': // Julian Vance
        for (let bx = 38; bx <= 90; bx += 8) {
          ctx.beginPath();
          ctx.arc(bx, 34 + Math.sin(bx) * 3, 9, 0, Math.PI * 2);
          ctx.fill();
        }
        break;

      case 'ponytail_wet_bangs': // Sarah Miller
        ctx.beginPath();
        ctx.arc(64, 48, 23, Math.PI, 0);
        ctx.fill();
        // Franja desfeita e rabo de cavalo lateral
        ctx.beginPath();
        ctx.moveTo(84, 48); ctx.lineTo(98, 70); ctx.lineTo(90, 72); ctx.closePath();
        ctx.fill();
        break;

      case 'military_buzz_cut': // Kurt Becker
        ctx.fillStyle = 'rgba(20, 20, 24, 0.45)';
        ctx.beginPath();
        ctx.arc(64, 50, 24, Math.PI, 0);
        ctx.fill();
        break;

      case 'beanie_black_wool': // Bruno Varga
      case 'pulled_down_beanie': // Lenny O Rato
        ctx.fillStyle = '#181820';
        ctx.beginPath();
        ctx.arc(64, 46, 26, Math.PI, 0);
        ctx.lineTo(90, 48); ctx.lineTo(38, 48);
        ctx.fill();
        ctx.fillRect(36, 44, 56, 7);
        break;

      case 'yellow_raincoat_hood': // Otis Clark
        ctx.fillStyle = '#cfb032';
        ctx.beginPath();
        ctx.arc(64, 46, 28, Math.PI, 0);
        ctx.lineTo(94, 60); ctx.lineTo(34, 60);
        ctx.fill();
        break;

      case 'ranger_hat_wide_brim': // Garrett Hall
        ctx.fillStyle = '#3c4030';
        ctx.fillRect(48, 22, 32, 18);
        // Aba larga do chapéu florestal
        ctx.beginPath();
        ctx.ellipse(64, 40, 38, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'nun_veil_black_white': // Irmã Maria
        ctx.fillStyle = '#0f0f14';
        ctx.beginPath();
        ctx.moveTo(32, 80); ctx.lineTo(36, 26);
        ctx.bezierCurveTo(46, 16, 82, 16, 92, 26);
        ctx.lineTo(96, 80); ctx.closePath();
        ctx.fill();
        break;

      default:
        // Cabelo clássico masculino repartido
        ctx.beginPath();
        ctx.arc(64, 48, 24, Math.PI, 0);
        ctx.fill();
        break;
    }

    ctx.restore();
  }

  static _renderSpecialDetails(ctx, char, emotion) {
    ctx.save();

    // 1. Barba por fazer (Alex, Otis, Sam, etc.)
    if (char.features.includes('stubble_3days') || char.features.includes('stubble_patchy')) {
      ctx.fillStyle = 'rgba(25, 20, 18, 0.38)';
      ctx.beginPath();
      ctx.arc(64, 72, 16, 0, Math.PI);
      ctx.fill();
    }

    // 2. Bigode clássico (Bobby, Viktor, Sam)
    if (char.features.includes('pencil_mustache')) {
      ctx.strokeStyle = char.hair;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(56, 71); ctx.lineTo(72, 71);
      ctx.stroke();
    } else if (char.features.includes('trimmed_mustache')) {
      ctx.fillStyle = char.hair;
      ctx.fillRect(57, 70, 14, 2.5);
    } else if (char.features.includes('walrus_mustache')) {
      ctx.fillStyle = char.hair;
      ctx.beginPath();
      ctx.ellipse(64, 72, 12, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Barba densa do Ermitão
    if (char.features.includes('huge_tangled_beard')) {
      ctx.fillStyle = '#6b6661';
      ctx.beginPath();
      ctx.moveTo(42, 65);
      ctx.lineTo(38, 120);
      ctx.lineTo(90, 120);
      ctx.lineTo(86, 65);
      ctx.closePath();
      ctx.fill();
    }

    // 4. Arranhões de espinho em Sarah
    if (char.features.includes('thorn_scratches')) {
      ctx.strokeStyle = '#9d2222';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(48, 62); ctx.lineTo(52, 66);
      ctx.moveTo(47, 65); ctx.lineTo(53, 69);
      ctx.stroke();
    }

    // 5. Óculos metálicos com reflexo (Dr. Arthur, Clara, Maeve)
    if (char.features.includes('glasses_round') || char.features.includes('tortoise_glasses')) {
      ctx.strokeStyle = char.features.includes('tortoise_glasses') ? '#6b4528' : '#888898';
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.arc(54, 54, 7, 0, Math.PI * 2);
      ctx.arc(74, 54, 7, 0, Math.PI * 2);
      ctx.stroke();

      // Ponte entre lentes
      ctx.beginPath();
      ctx.moveTo(61, 54); ctx.lineTo(67, 54);
      ctx.stroke();

      // Reflexo ciano de neon nas lentes
      ctx.strokeStyle = 'rgba(72, 149, 239, 0.45)';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(50, 52); ctx.lineTo(54, 56);
      ctx.moveTo(70, 52); ctx.lineTo(74, 56);
      ctx.stroke();
    }

    // 6. Gotas de suor escorrendo sob tensão (Bobby, Elias)
    if (emotion === 'tense' || char.features.includes('sweat_drops')) {
      ctx.fillStyle = 'rgba(235, 245, 255, 0.65)';
      ctx.beginPath();
      ctx.ellipse(45, 58, 1.2, 2.5, 0.1, 0, Math.PI * 2);
      ctx.ellipse(78, 62, 1.2, 2.8, -0.1, 0, Math.PI * 2);
      ctx.fill();
    }

    // 7. Cigarro aceso com ponto âmbar e fumaça translúcida (Alex, Ruth)
    if (char.features.includes('cigar_smoke') || char.features.includes('cigar_smoke_heavy')) {
      // Corpo do cigarro
      ctx.fillStyle = '#f2efe9';
      ctx.fillRect(70, 75, 14, 2);

      // Brasa âmbar incandescente
      ctx.fillStyle = '#e0a96d';
      ctx.fillRect(84, 74.5, 3, 3);
      ctx.fillStyle = '#d48b28';
      ctx.fillRect(85, 75, 2, 2);

      // Fumaça subindo em espiral translúcida
      ctx.strokeStyle = 'rgba(220, 220, 235, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(86, 74);
      ctx.bezierCurveTo(90, 60, 82, 45, 88, 30);
      ctx.stroke();
    }

    ctx.restore();
  }

  static _renderDramaticLighting(ctx, char, emotion) {
    ctx.save();

    // Camada de iluminação direcional dramática chiaroscuro
    const light = char.lighting;

    let lightGrad = ctx.createLinearGradient(0, 0, 128, 0);
    if (light === 'chiaroscuro_side') {
      // Metade do rosto banhada em luz, outra metade na penumbra total
      lightGrad = ctx.createLinearGradient(16, 64, 112, 64);
      lightGrad.addColorStop(0.0, 'rgba(0, 0, 0, 0.65)');
      lightGrad.addColorStop(0.48, 'rgba(0, 0, 0, 0.05)');
      lightGrad.addColorStop(1.0, 'rgba(224, 169, 109, 0.18)'); // Sódio suave
    } else if (light === 'cold_overhead_fluorescent') {
      // Luz fria de cima para baixo
      lightGrad = ctx.createLinearGradient(64, 0, 64, 128);
      lightGrad.addColorStop(0.0, 'rgba(72, 149, 239, 0.22)');
      lightGrad.addColorStop(0.4, 'rgba(0, 0, 0, 0.0)');
      lightGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.7)');
    } else {
      // Vinheta de sombra padrão noir
      lightGrad = ctx.createRadialGradient(64, 60, 20, 64, 60, 64);
      lightGrad.addColorStop(0.0, 'rgba(0, 0, 0, 0.0)');
      lightGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.58)');
    }

    ctx.fillStyle = lightGrad;
    ctx.fillRect(0, 0, 128, 128);

    // Ajuste cromático com base na emoção do diálogo
    if (emotion === 'furious') {
      // Luz carmim e vermelha de ódio
      const rageGrad = ctx.createRadialGradient(64, 64, 10, 64, 64, 64);
      rageGrad.addColorStop(0.0, 'rgba(255, 30, 45, 0.12)');
      rageGrad.addColorStop(1.0, 'rgba(160, 10, 20, 0.35)');
      ctx.fillStyle = rageGrad;
      ctx.fillRect(0, 0, 128, 128);
    } else if (emotion === 'tense') {
      // Luz âmbar contrastada de apreensão
      const tenseGrad = ctx.createLinearGradient(0, 0, 128, 128);
      tenseGrad.addColorStop(0.0, 'rgba(212, 139, 40, 0.18)');
      tenseGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.25)');
      ctx.fillStyle = tenseGrad;
      ctx.fillRect(0, 0, 128, 128);
    } else if (emotion === 'guilty') {
      // Luz roxa fria e depressiva
      const guiltGrad = ctx.createRadialGradient(64, 75, 10, 64, 75, 60);
      guiltGrad.addColorStop(0.0, 'rgba(123, 44, 191, 0.18)');
      guiltGrad.addColorStop(1.0, 'rgba(10, 8, 18, 0.35)');
      ctx.fillStyle = guiltGrad;
      ctx.fillRect(0, 0, 128, 128);
    }

    ctx.restore();
  }

  static _renderFrameOverlay(ctx, char) {
    ctx.save();

    // Linhas CRT de varredura analógica sutis (efeito microfilme de arquivo)
    ctx.fillStyle = 'rgba(72, 149, 239, 0.04)';
    for (let y = 0; y < 128; y += 3) {
      ctx.fillRect(0, y, 128, 1);
    }

    // Moldura chanfrada de arquivo policial
    ctx.strokeStyle = '#2d2d38';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(1, 1, 126, 126);

    // Cantoneiras industriais de fichário
    ctx.strokeStyle = '#7b2cbf'; // Roxo neon
    ctx.lineWidth = 1.8;
    // Topo esquerdo
    ctx.beginPath(); ctx.moveTo(2, 10); ctx.lineTo(2, 2); ctx.lineTo(10, 2); ctx.stroke();
    // Topo direito
    ctx.beginPath(); ctx.moveTo(118, 2); ctx.lineTo(126, 2); ctx.lineTo(126, 10); ctx.stroke();
    // Rodapé esquerdo
    ctx.beginPath(); ctx.moveTo(2, 118); ctx.lineTo(2, 126); ctx.lineTo(10, 126); ctx.stroke();
    // Rodapé direito
    ctx.beginPath(); ctx.moveTo(118, 126); ctx.lineTo(126, 126); ctx.lineTo(126, 118); ctx.stroke();

    ctx.restore();
  }
}
