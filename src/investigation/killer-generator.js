// Generator for NorthVale - Sombras de 1989
// Procedural seed-based culprit generation engine with 4 archetypes, dynamic clue placement, alibis, and lying witnesses.

import {random} from '../graphics/random.js';

export const CULPRIT_ARCHETYPES = {
  corrupcao_industrial: {
    id: 'corrupcao_industrial',
    name: 'Corrupção Industrial dos Sloane',
    killerId: 'viktor',
    killerName: 'Viktor Sloane',
    title: 'Proprietário do Frigorífico Sloane',
    motive: 'Sarah Miller descobriu documentos fiscais clandestinos e amostras provando o descarte ilegal de resíduos tóxicos da fábrica na represa municipal, que contaminava o abastecimento de NorthVale. Ao tentar denunciar ao cartório, foi silenciada por Viktor antes que chegasse à imprensa federal.',
    solutionSummary: 'Viktor Sloane silenciou Sarah após ela furtar a fita de áudio e as notas de descarte químico da fábrica.',
    falseAlibi: {
      claim: 'Afirma que passou a noite de 15 de outubro no Double R Diner conferindo faturas com Clara Young até as 22h.',
      contradictionClue: 'diner_receipt',
      contradictionFact: 'O recibo do Diner prova que a conta foi fechada e paga às 18h40, e testemunhas viram o carro de Viktor perto da represa às 19h30.'
    },
    lyingWitness: {
      npcId: 'clara',
      npcName: 'Clara Young',
      reason: 'Endividada com o frigorífico, Clara recebeu perdão de dívidas para sustentar o álibi de Viktor.',
      pressurePoint: 'Confrontá-la com o extrato bancário ou o recibo do Diner com horário adulterado quebra seu silêncio.'
    },
    clues: [
      {
        id: 'meat_ledger',
        title: 'Livro-Caixa Clandestino do Frigorífico',
        category: 'document',
        interiorId: 'meatpacking',
        roomId: 'office',
        propId: 'steel-a',
        text: 'Registro duplo mantido em cofre de aço: pagamentos mensais para "Taxa de Segurança Especial" nominais a Ruth Mercer e valores de descarte noturno na Represa.',
        corkboardTags: ['viktor', 'ruth', 'propina', 'represa']
      },
      {
        id: 'toxic_sample',
        title: 'Frasco de Resíduo Químico da Represa',
        category: 'material',
        interiorId: 'dam',
        roomId: 'control',
        propId: 'console-a',
        text: 'Frasco de vidro escuro selado com o logotipo da Sloane Agro-Industrial. O lodo escuro tem o mesmo cheiro nauseante impregnado na capa de Sarah.',
        corkboardTags: ['quimico', 'represa', 'sarah', 'viktor']
      },
      {
        id: 'registry_contract',
        title: 'Contrato Adulterado no Cartório',
        category: 'document',
        interiorId: 'registry',
        roomId: 'archives',
        propId: 'files-a',
        text: 'Documento oficial de zoneamento ambiental com páginas rasgadas e nova assinatura datada de 14 de outubro de 1989.',
        corkboardTags: ['cartorio', 'viktor', 'clara']
      },
      {
        id: 'dam_tape',
        title: 'Fita K7 da Subestação',
        category: 'recording',
        interiorId: 'dam',
        roomId: 'turbine',
        propId: 'turbine-a',
        text: 'Áudio abafado pelo ruído da água: passos pesados de botas com esporas de aço, o ranger de um portão pesado e a voz de Viktor: “Você não deveria ter mexido nesses relatórios, Sarah.”',
        corkboardTags: ['fita', 'viktor', 'sarah', 'represa']
      },
      {
        id: 'diner_receipt',
        title: 'Comprovante do Double R Diner',
        category: 'document',
        interiorId: 'diner',
        roomId: 'dining',
        propId: 'counter',
        text: 'Recibo da mesa 4 emitido às 18h40 de 15/10. Anotação a lápis: “O senhor de sobretudo cinza saiu com pressa antes da tempestade.”',
        corkboardTags: ['alibi', 'viktor', 'diner']
      }
    ]
  },

  predador_solitario: {
    id: 'predador_solitario',
    name: 'O Predador Solitário de NorthVale',
    killerId: 'bobby',
    killerName: 'Bobby "The Drifter" Vance',
    title: 'Mecânico e andarilho no Ferro-Velho de Sam',
    motive: 'Bobby Vance, ex-condenado com histórico violento em outros condados do Noroeste, vivia escondido em trailers no ferro-velho e no NorthVale Motel. Fixou uma obsessão doentia por Sarah Miller, perseguindo-a pelas trilhas da represa e capturando-a durante a tempestade.',
    solutionSummary: 'Bobby emboscou Sarah na capela em ruínas, guardando seus pertences como fetiche e troféu.',
    falseAlibi: {
      claim: 'Diz que passou a tempestade inteira desmontando blocos de motores no ferro-velho com Sam.',
      contradictionClue: 'scrapyard_log',
      contradictionFact: 'O registro de entrada do ferro-velho mostra que Sam trancou os portões às 18h e as ferramentas usadas estavam intactas com ferrugem de dias.'
    },
    lyingWitness: {
      npcId: 'owen',
      npcName: 'Owen Briggs',
      reason: 'Owen foi ameaçado com uma lâmina de caça e teme que Bobby queime seu barracão.',
      pressurePoint: 'Mostrar a faca militar com iniciais ou a foto tirada perto do motel faz Owen admitir que viu Bobby saindo com botas enlameadas.'
    },
    clues: [
      {
        id: 'trophy_box',
        title: 'Caixa de Ferramentas Oculta',
        category: 'material',
        interiorId: 'scrapyard',
        roomId: 'workshop',
        propId: 'engine-a',
        text: 'Caixa de metal enterrada sob pneus velhos: contém o broche de prata de Sarah, um chaveiro com a foto de Helen Miller e mechas de cabelo presas em fita adesiva.',
        corkboardTags: ['bobby', 'sarah', 'ferro-velho', 'trofeu']
      },
      {
        id: 'motel_passkey',
        title: 'Chave Mestra do Quarto 7',
        category: 'item',
        interiorId: 'motel',
        roomId: 'room7',
        propId: 'bed-a',
        text: 'Chave raspada com fita adesiva preta. O quarto 7 cheira a querosene e lona molhada, com marcas de arranhões no batente interno.',
        corkboardTags: ['motel', 'bobby', 'chave']
      },
      {
        id: 'torn_raincoat_button',
        title: 'Botão Amarelo de Capa de Chuva',
        category: 'material',
        interiorId: 'ruins',
        roomId: 'sanctuary',
        propId: 'altar',
        text: 'Botão arrancado à força em meio a telhas caídas na capela de São Judas. Fragmentos de corda náutica e terra vermelha espalhada.',
        corkboardTags: ['capela', 'sarah', 'bobby']
      },
      {
        id: 'hunting_knife',
        title: 'Faca de Caça com Cabo de Chifre',
        category: 'weapon',
        interiorId: 'scrapyard',
        roomId: 'shed',
        propId: 'tools',
        text: 'Lâmina afiada manchada com resíduos secos. As iniciais "B.V." estão entalhadas na empunhadura.',
        corkboardTags: ['arma', 'bobby', 'ferro-velho']
      },
      {
        id: 'scrapyard_log',
        title: 'Prancheta de Turno do Ferro-Velho',
        category: 'document',
        interiorId: 'scrapyard',
        roomId: 'office',
        propId: 'desk-a',
        text: 'Horário de fechamento oficial: 18h00 do dia 15. Nenhuma ordem de serviço foi preenchida durante a noite.',
        corkboardTags: ['alibi', 'bobby', 'ferro-velho']
      }
    ]
  },

  conspiracao_coletiva: {
    id: 'conspiracao_coletiva',
    name: 'O Pacto de Silêncio Municipal',
    killerId: 'ruth',
    killerName: 'Xerife Ruth Mercer',
    title: 'Xerife de NorthVale',
    motive: 'Ruth Mercer, em conluio com os membros antigos da junta de NorthVale, vinha encobrindo desvios orçamentários, mortes acidentais no inverno de 88 e expropriações ilegais. Quando Sarah encontrou os laudos originais e ameaçou ir à polícia estadual em Portland, Ruth encenou um desaparecimento forçado.',
    solutionSummary: 'A própria autoridade policial adulterou a cena, forjou a fuga voluntária e sequestrou os relatórios de Helen.',
    falseAlibi: {
      claim: 'Ruth afirma que realizava ronda solitária na Rota 9 entre 17h e 22h, respondendo a um chamado de queda de barreira.',
      contradictionClue: 'patrol_log',
      contradictionFact: 'O rádio da delegacia registrou sinal estático transmitido a partir do porão do cartório às 19h15, e a viatura não consumiu o combustível declarado.'
    },
    lyingWitness: {
      npcId: 'elias',
      npcName: 'Elias Ward',
      reason: 'Elias fornece sedativos controlados sem prescrição sob autorização informal de Ruth e teme ter a farmácia lacrada.',
      pressurePoint: 'Confrontar Elias com os frascos de clorofórmio sem registro contábil o força a revelar que Ruth requisitou os anestésicos na véspera.',
      clueToUnlock: 'ward_confession'
    },
    clues: [
      {
        id: 'patrol_log',
        title: 'Registro de Quilometragem da Viatura 01',
        category: 'document',
        interiorId: 'police',
        roomId: 'office',
        propId: 'ruth-desk',
        text: 'O hodômetro marca 42 milhas a menos do que o itinerário declarado da Rota 9. No painel, resíduos de lama típica da capela em ruínas.',
        corkboardTags: ['ruth', 'viatura', 'alibi']
      },
      {
        id: 'confidential_dossier',
        title: 'Dossiê Lacrado da Gaveta de Ruth',
        category: 'document',
        interiorId: 'police',
        roomId: 'records',
        propId: 'safe',
        text: 'Envelope marcado "CONFIDENCIAL / CASO 001": fotografias de Sarah entrando na biblioteca, bilhetes de aviso manuscritos pela máquina de Ruth e passaporte falso emitido para incriminar a garota como foragida.',
        corkboardTags: ['ruth', 'sarah', 'dossie', 'delegacia']
      },
      {
        id: 'pharmacy_chloroform',
        title: 'Frasco de Éter e Sedativo da Farmácia',
        category: 'chemical',
        interiorId: 'pharmacy',
        roomId: 'backroom',
        propId: 'safe',
        text: 'Recipiente médico com etiqueta manuscrita: "Retirado em mãos por R.M. - Urgência Policial 14/10". Sem registro médico correspondente.',
        corkboardTags: ['elias', 'ruth', 'farmacia', 'quimico']
      },
      {
        id: 'tape_deleted',
        title: 'Fita de Segurança Rebobinada',
        category: 'recording',
        interiorId: 'library',
        roomId: 'reading',
        propId: 'reel-player',
        text: 'A gravação magnética do corredor da biblioteca foi intencionalmente desmagnetizada com um ímã de serviço policial. Um trecho inicial preservado mostra a farda de Ruth bloqueando a saída dos fundos.',
        corkboardTags: ['fita', 'ruth', 'biblioteca']
      },
      {
        id: 'blackmail_letter',
        title: 'Carta de Intimidação à Família Miller',
        category: 'document',
        interiorId: 'sarah',
        roomId: 'attic',
        propId: 'floorboard',
        text: 'Escondida sob o piso do sótão: “Helen, se seu marido não aprendeu a calar a boca, não repita o erro com a menina. A cidade precisa de paz.” Datilografada na máquina Remington da delegacia.',
        corkboardTags: ['ruth', 'sarah', 'helen', 'carta']
      }
    ]
  },

  acidente_encoberto: {
    id: 'acidente_encoberto',
    name: 'O Acidente na Subestação da Represa',
    killerId: 'owen',
    killerName: 'Owen Briggs',
    title: 'Operador de Manutenção da Represa e Depósito',
    motive: 'Durante uma operação não autorizada de pressurização da válvula de comporta da represa, Owen operou maquinaria defeituosa sem treinamento enquanto consumia medicamentos fornecidos por Elias. Sarah estava no local para fotografar as comportas; uma ruptura de tubo de alta pressão causou um impacto fatal. Desesperado, Owen escondeu o corpo com a cumplicidade de Elias para escapar de homicídio culposo.',
    solutionSummary: 'Um acidente industrial trágico e negligência criminosa encapados por medo de prisão perpétua.',
    falseAlibi: {
      claim: 'Owen jura que a comporta foi travada no fim do expediente às 17h e ele permaneceu no quarto do motel assistindo TV.',
      contradictionClue: 'dam_pressure_log',
      contradictionFact: 'O registrador de pressão barométrica registrou pico de ejeção e alarme de ruptura às 19h42 na comporta 3.'
    },
    lyingWitness: {
      npcId: 'elias',
      npcName: 'Elias Ward',
      reason: 'Elias prescreveu os opiáceos pesados que debilitaram os reflexos de Owen durante o turno da máquina.',
      pressurePoint: 'Apresentar a receita adulterada e o diário de manutenção faz Elias quebrar e confessar que ajudou Owen a ocultar os vestígios.',
      clueToUnlock: 'substation_key'
    },
    clues: [
      {
        id: 'dam_pressure_log',
        title: 'Gráfico Barométrico da Comporta 3',
        category: 'document',
        interiorId: 'dam',
        roomId: 'control',
        propId: 'gauge-a',
        text: 'Rolo de papel de agulha com oscilação violenta às 19h42 do dia 15. Marca de mão ensanguentada com luva de trabalho industrial impressa sobre o botão de parada emergencial.',
        corkboardTags: ['owen', 'represa', 'acidente']
      },
      {
        id: 'broken_camera',
        title: 'Câmera Fotográfica Esmagada de Sarah',
        category: 'material',
        interiorId: 'depot',
        roomId: 'storage',
        propId: 'crate-heavy',
        text: 'Câmera Canon vintage danificada por jato de alta pressão de água e graxa. O filme dentro foi arrancado, mas uma foto queimada na bobina mostra a fisionomia desesperada de Owen junto a uma válvula aberta.',
        corkboardTags: ['sarah', 'owen', 'deposito', 'foto']
      },
      {
        id: 'medical_narcotic',
        title: 'Frasco de Narcótico Sem Rótulo',
        category: 'chemical',
        interiorId: 'motel',
        roomId: 'room3',
        propId: 'nightstand',
        text: 'Medicamento tarja preta forte para dores crônicas com código de lote da Farmácia Vale. Uma advertência do fabricante avisa: "Proibido operar maquinário pesado sob efeito."',
        corkboardTags: ['elias', 'owen', 'farmacia', 'motel']
      },
      {
        id: 'stained_overalls',
        title: 'Macacão Industrial com Resíduos de Graxa e Tecido',
        category: 'material',
        interiorId: 'depot',
        roomId: 'locker',
        propId: 'locker-b',
        text: 'Macacão com o nome "OWEN" bordado. As fibras na manga batem com o tecido do vestido de algodão que Helen descreveu que Sarah usava.',
        corkboardTags: ['owen', 'sarah', 'deposito']
      },
      {
        id: 'substation_valve_key',
        title: 'Chave de Emergência da Válvula de Dreno',
        category: 'item',
        interiorId: 'home',
        roomId: 'shed',
        propId: 'tool-rack',
        text: 'Chave de ferro maciço ainda gotejando óleo de silicone da câmara pressurizada da represa.',
        corkboardTags: ['represa', 'owen', 'chave']
      }
    ]
  }
};

export class KillerGenerator {
  constructor(seed = null) {
    this.seed = seed ?? Math.floor(Math.random() * 10000000);
    this.rng = random(`northvale-seed-${this.seed}`);
  }

  generate() {
    const archetypeKeys = Object.keys(CULPRIT_ARCHETYPES);
    const chosenIndex = Math.floor(this.rng() * archetypeKeys.length);
    const archetypeKey = archetypeKeys[chosenIndex];
    const template = CULPRIT_ARCHETYPES[archetypeKey];

    // Build the dynamic instance of the case
    const cluesMap = {};
    for (const clue of template.clues) {
      cluesMap[clue.id] = {
        ...clue,
        discovered: false,
        presented: false
      };
    }

    return {
      seed: this.seed,
      archetypeKey,
      culpritId: template.killerId,
      culpritName: template.killerName,
      title: template.title,
      name: template.name,
      motive: template.motive,
      solutionSummary: template.solutionSummary,
      falseAlibi: template.falseAlibi,
      lyingWitness: template.lyingWitness,
      clues: cluesMap,
      requiredClues: template.clues.map(c => c.id),
      deductions: this.generateDeductions(template)
    };
  }

  generateDeductions(template) {
    // Generates the logical deductions unlocked in the Corkboard
    return [
      {
        id: `deduction_${template.id}_1`,
        title: 'Falsidade do Álibi Oficial',
        requiredClueIds: [template.clues[0].id, template.falseAlibi.contradictionClue || template.clues[1].id],
        unlockedHypothesis: `O álibi fornecido por ${template.killerName} desmorona diante das evidências temporais e documentais.`,
        unlockedLeadLocation: template.clues[2].interiorId
      },
      {
        id: `deduction_${template.id}_2`,
        title: 'Ligação com o Desaparecimento',
        requiredClueIds: [template.clues[2].id, template.clues[3].id],
        unlockedHypothesis: `Os vestígios materiais ligam ${template.killerName} diretamente aos últimos passos de Sarah Miller na tempestade.`,
        unlockedLeadLocation: template.clues[1].interiorId
      },
      {
        id: `deduction_${template.id}_final`,
        title: 'Dossiê Conclusivo: O Culpado de 1989',
        requiredClueIds: template.clues.slice(0, 4).map(c => c.id),
        unlockedHypothesis: template.solutionSummary,
        isCulpritIndictment: true,
        culpritId: template.killerId
      }
    ];
  }
}
