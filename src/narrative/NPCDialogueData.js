/**
 * NorthVale: Sombras de 1989
 * NPCDialogueData.js - Banco de Dados de Diálogos e Nós Narrativos dos 32 Personagens
 */

export const NPCDialogueData = {
  // 1. Alex Hale (Reflexão Interna no Espelho)
  alex_hale: {
    id: "alex_hale",
    name: "Alex Hale",
    role: "Detetive Investigador",
    initialNode: "mirror_reflection",
    nodes: {
      mirror_reflection: {
        text: "O reflexo me devolve a cara de um sujeito que perdeu o bonde faz dez anos.",
        options: [
          {
            text: "[Autoridade] Foco no trabalho. NorthVale esconde podridão sob essa neblina, e eu vou cavar até o osso.",
            nextNode: "resolve_authority",
            reputationImpact: { authority: 1, empathy: -1 }
          },
          {
            text: "[Melancolia] Sarah Miller pode já estar morta no fundo da represa, e você é apenas o urubu que chegou atrasado.",
            nextNode: "resolve_melancholy",
            reputationImpact: { paranoia: 1, composure: -1 }
          },
          {
            text: "[Ceticismo] Beba um gole de café velho, acenda outro cigarro e confira se a trava do revólver está lubrificada.",
            nextNode: "resolve_cynicism",
            reputationImpact: { composure: 1 }
          }
        ]
      },
      resolve_authority: {
        text: "O queixo se ergue. A chuva bate na vidraça do hotel como chumbo derretido, mas você ainda tem distintivo e munição.",
        options: [{ text: "[Afastar-se da pia]", exit: true }]
      },
      resolve_melancholy: {
        text: "A ponta cinzenta do cigarro treme nos dedos. O caso mal começou e o peso das cinzas já parece insuportável.",
        options: [{ text: "[Afastar-se da pia]", exit: true }]
      },
      resolve_cynicism: {
        text: "O café frio e amargo queima o esófago. Nada de heroísmo barato hoje; apenas passos na lama e portas batidas.",
        options: [{ text: "[Afastar-se da pia]", exit: true }]
      }
    }
  },

  // 2. Bobby Miller (Subxerife)
  bobby_miller: {
    id: "bobby_miller",
    name: "Bobby Miller",
    role: "Subxerife",
    initialNode: "greeting",
    nodes: {
      greeting: {
        text: "Hale... você não deveria estar revirando os arquivos antigos da represa. Ruth disse que qualquer intromissão federal vai virar desacato.",
        options: [
          {
            text: "[Empatia] Sua prima sumiu na lama, Bobby. Você vai ficar sentado atrás dessa farda até acharem o corpo dela?",
            nextNode: "family_pressure",
            reputationImpact: { empathy: 1 }
          },
          {
            text: "[Pressão Policial] Se você ocultar o relatório de chamada daquela noite, seu distintivo vai direto para a corregedoria da capital.",
            nextNode: "police_threat",
            reputationImpact: { authority: 1 }
          },
          {
            text: "[Suborno Emocional] Me mostre onde a bicicleta dela foi encontrada e eu garanto que seu nome não aparece nos autos.",
            nextNode: "bicycle_clue",
            requiresClue: "missing_bike_report"
          }
        ]
      },
      family_pressure: {
        text: "O garoto engole em seco e olha para os lados na delegacia, enxugando o suor da testa. 'Ruth vai me matar... A bicicleta estava presa nas grades do vertedouro sul, detetive.'",
        giveClue: "clue_south_spillway_bike",
        options: [{ text: "[Anotar no caderno] 'Obrigado, rapaz.'", exit: true }]
      },
      police_threat: {
        text: "'Você não tem jurisdição para me ameaçar aqui, Hale!' A mão dele aperta o coldre, trêmula e pálida. Ele recua para a sala de rádio.",
        reputationImpact: { composure: -1 },
        options: [{ text: "[Encerrar conversa]", exit: true }]
      },
      bicycle_clue: {
        text: "Ele abaixa o tom de voz quase a um sussurro: 'A corrente estava rompida com maçarico. Não foi queda acidental.'",
        giveClue: "clue_bike_torched_chain",
        options: [{ text: "[Guardar pista no caderno]", exit: true }]
      }
    }
  },

  // 3. Ruth Mercer (Xerife)
  ruth_mercer: {
    id: "ruth_mercer",
    name: "Ruth Mercer",
    role: "Xerife",
    initialNode: "greeting",
    nodes: {
      greeting: {
        text: "Guarde suas teorias de filme noir para os bares da cidade grande, detetive. Em NorthVale, as pessoas tropeçam na mata e se afogam. Acidentes acontecem.",
        options: [
          {
            text: "[Confronto Direto] Acidentes não costumam trancar portões de drenagem com cadeados de aço industrial, Xerife.",
            nextNode: "confront_locks",
            requiresClue: "industrial_padlock_evidence"
          },
          {
            text: "[Blefe Investigativo] O promotor regional já recebeu uma cópia dos registros de tonelagem do frigorífico. Quanto tempo você ainda tem?",
            nextNode: "bluff_tonnage"
          },
          {
            text: "[Pragmatismo Cínico] Quem manda nesta cidade: você, o prefeito ou o talão de cheques do Viktor Sloane?",
            nextNode: "cynic_money"
          }
        ]
      },
      confront_locks: {
        text: "Ruth bate as palmas das mãos na mesa de carvalho. 'Aquele setor é área de segurança privada da Sloane Logistics. Se você cortar mais um cadeado sem mandado, coloco-o no camburão.'",
        reputationImpact: { authority: -1 },
        options: [{ text: "[Sair da sala]", exit: true }]
      },
      bluff_tonnage: {
        text: "O olho dela treme impercetivelmente. O cigarro entre os lábios finos fica suspenso por três segundos antes de ela tragar fundo.",
        giveClue: "clue_mercer_nervous_reaction",
        options: [{ text: "[Guardar o olhar de apreensão]", exit: true }]
      },
      cynic_money: {
        text: "'Eu mantenho esta cidade inteira em pé enquanto os ricaços pagam os impostos e a ralé trabalha. Não venha me dar sermão moral.'",
        options: [{ text: "[Virar as costas]", exit: true }]
      }
    }
  },

  // 4. Dr. Arthur Aris (Médico-Legista)
  dr_arthur_aris: {
    id: "dr_arthur_aris",
    name: "Dr. Arthur Aris",
    role: "Médico-Legista",
    initialNode: "morgue_lab",
    nodes: {
      morgue_lab: {
        text: "Os tecidos das vítimas da represa não mostram simples asfixia por água... há cristais alcalinos corroendo os brônquios. Mas se eu assinar esse laudo, o próximo na bandeja de zinco sou eu.",
        options: [
          {
            text: "[Conhecimento Forense] Permita-me colher uma contraprova desse líquido pulmonar para envio a um laboratório independente.",
            nextNode: "forensic_sample",
            requiresItem: "glass_vial"
          },
          {
            text: "[Sensibilidade Humana] Doutor, você fez um juramento antes de aceitar a aposentadoria da prefeitura. Faça valer agora.",
            nextNode: "oath_appeal"
          },
          {
            text: "[Ameaça de Cumplicidade] Assinar afogamento num homicídio doloso faz de você cúmplice de homicídio qualificado.",
            nextNode: "legal_threat"
          }
        ]
      },
      forensic_sample: {
        text: "Ele enche o tubo de ensaio com a amostra turva e empurra-o pela mesa de inox. 'Guarde isso longe da luz. Se descobrirem que saiu daqui, nós dois estamos mortos.'",
        giveItem: "pulmonary_chemical_sample",
        giveClue: "clue_alkaline_crystals",
        options: [{ text: "[Guardar frasco no bolso interno]", exit: true }]
      },
      oath_appeal: {
        text: "O legista ajusta os óculos redondos com as mãos trêmulas e manchadas de reagente. 'O juramento... eu já o enterrei há vinte anos neste porão.'",
        options: [{ text: "[Recuar]", exit: true }]
      },
      legal_threat: {
        text: "'Você fala em leis, mas a lei de NorthVale tem o calibre de um rifle Winchester.' Ele fecha o livro de registos e recusa-se a falar mais.",
        options: [{ text: "[Deixar o necrotério]", exit: true }]
      }
    }
  },

  // 5. Clara Higgins (Tabeliã)
  clara_higgins: {
    id: "clara_higgins",
    name: "Clara Higgins",
    role: "Tabeliã do Cartório",
    initialNode: "archive_desk",
    nodes: {
      archive_desk: {
        text: "Cada pedaço de terra nesta cidade tem três escrituras: a de Deus, a do cartório e a que o senhor Sloane compra à bala no escuro.",
        options: [
          {
            text: "[Respeito e Tradição] Dona Clara, a história de NorthVale foi escrita pela sua família. Me ajude a achar a escritura do Setor 4 da represa.",
            nextNode: "dam_deed"
          },
          {
            text: "[Pesquisa Documental] O que está registrado nas transferências de posse de 1982 no nome de Silas Vance?",
            nextNode: "vance_1982"
          },
          {
            text: "[Chantagem Fria] Sei que sua filha Maeve anda mexendo nas caixas arquivadas sem autorização formal. Quer mantê-la segura?",
            nextNode: "protect_maeve"
          }
        ]
      },
      dam_deed: {
        text: "Ela pega uma chave de latão antiga e aponta para a gaveta inferior de ferro. 'Gaveta 19-B. O registro de desapropriação foi rasgado ao meio, mas o carimbo do cartório de comarca ainda está legível.'",
        giveClue: "clue_sector4_dam_deed",
        options: [{ text: "[Examinar papéis amarelados]", exit: true }]
      },
      vance_1982: {
        text: "'Em 1982 o velho Silas comprou as nascentes por dez por cento do valor venal. Ninguém reclamou porque quem assinou o protesto apareceu boiando.'",
        giveClue: "clue_vance_land_grab",
        options: [{ text: "[Registrar depoimento]", exit: true }]
      },
      protect_maeve: {
        text: "Os olhos da velha senhora faíscam de cólera por trás das lentes presas por corrente de ouro. 'Não se atreva a colocar a minha neta no meio das suas jogadas sujas.'",
        reputationImpact: { empathy: -2 },
        options: [{ text: "[Recuar educadamente]", exit: true }]
      }
    }
  },

  // 6. Donald Vance (Prefeito)
  donald_vance: {
    id: "donald_vance",
    name: "Donald Vance",
    role: "Prefeito",
    initialNode: "mayors_office",
    nodes: {
      mayors_office: {
        text: "Hale, você precisa entender a macroeconomia deste município! Fechar o frigorífico por histeria sobre uma garota fujona significa desempregar oitocentos chefes de família!",
        options: [
          {
            text: "[Ironia Ácida] Não sabia que oitocentos empregos dependiam de descarregar produtos químicos no manancial da cidade.",
            nextNode: "dumping_irony"
          },
          {
            text: "[Dedução Política] Quantas doações anônimas da Sloane Logistics financiaram sua última reeleição, senhor prefeito?",
            nextNode: "campaign_funding",
            requiresClue: "clue_sector4_dam_deed"
          },
          {
            text: "[Aliança Estratégica] Eu só quero o responsável pelo sumiço de Sarah. Entregue o mandante e eu mantenho seu nome fora da imprensa estadual.",
            nextNode: "political_deal"
          }
        ]
      },
      dumping_irony: {
        text: "Ele empalidece e bate a caneta Montblanc na mesa almofadada de couro. 'Isto é difamação descarada! Saia do meu gabinete antes que eu chame a guarda municipal.'",
        options: [{ text: "[Sair da prefeitura]", exit: true }]
      },
      campaign_funding: {
        text: "O prefeito afrouxa o nó da gravata de seda, respirando com dificuldade. 'O Viktor... ele não pede favores, detetive. Ele cobra dívidas antigas da família.'",
        giveClue: "clue_sloane_blackmails_mayor",
        options: [{ text: "[Pressionar mais tarde]", exit: true }]
      },
      political_deal: {
        text: "'Se tocar no nome do meu pai Silas, o acordo acaba. Mas olhe o furgão preto do Becker... ele não dorme na guarita à toa.'",
        giveClue: "clue_becker_van_patrol",
        options: [{ text: "[Anotar a pista]", exit: true }]
      }
    }
  },

  // 7. Sarah Miller (A Sobrevivente Oculta)
  sarah_miller: {
    id: "sarah_miller",
    name: "Sarah Miller",
    role: "A Sobrevivente",
    initialNode: "duct_hideout",
    nodes: {
      duct_hideout: {
        text: "Não se mexa! Se você veio a mando do Sloane ou do meu primo... eu puxo este cabo de ignição e voamos todos nós pelos ares!",
        options: [
          {
            text: "[Acolhimento Protetor] Abaixe o detonador, Sarah. Eu sou Alex Hale. Ouvi a fita K7 número 3. Sei da contaminação do gado.",
            nextNode: "calm_sarah",
            requiresItem: "cassette_tape_3"
          },
          {
            text: "[Prova Material] Seu primo Bobby está em pânico por você, e sua mãe Helen não dorme há cinco dias.",
            nextNode: "family_mention"
          },
          {
            text: "[Objetividade Extrema] Passe o caderno com os lotes de entrega. Se sairmos daqui vivos agora, levo você direto ao Ministério Público.",
            nextNode: "ledger_handover"
          }
        ]
      },
      calm_sarah: {
        text: "As mãos ensanguentadas e trêmulas soltam o cabo de bateria. Ela desaba no piso úmido do cano de exaustão, soluçando. 'Eles mataram o químico... eu vi colocarem o tambor na comporta 4.'",
        giveClue: "clue_eyewitness_barrel_spillway4",
        options: [{ text: "[Ajudá-la a se levantar]", exit: true }]
      },
      family_mention: {
        text: "'Mamãe... ela não pode saber que estou aqui. O Becker colocou escuta na linha da casa dela!'",
        giveClue: "clue_helen_phone_tapped",
        options: [{ text: "[Confortar Sarah]", exit: true }]
      },
      ledger_handover: {
        text: "Ela hesita, mas retira um bloco de notas encapado com plástico do bolso do casaco amarelo rasgado. 'Tudo está aqui: datas, placas e assinaturas.'",
        giveItem: "chemical_manifest_ledger",
        options: [{ text: "[Guardar o manifesto]", exit: true }]
      }
    }
  },

  // 8. Julian Vance (Ativista Universitário)
  julian_vance: {
    id: "julian_vance",
    name: "Julian Vance",
    role: "Ativista",
    initialNode: "secret_cellar",
    nodes: {
      secret_cellar: {
        text: "Meu pai e meu avô Silas envenenaram esta terra inteira. Sarah tinha provas definitivas... e eu a deixei ir sozinha até o reservatório na terça-feira. A culpa está me sufocando.",
        options: [
          {
            text: "[Compreensão Tática] A culpa não salva ninguém, Julian. Diga-me qual rota ela usou para entrar sem cruzar a guarita dos cães.",
            nextNode: "entry_route"
          },
          {
            text: "[Cobrança Ética] Você se diz revolucionário, mas tremeu as pernas quando seu avô cortou sua mesada.",
            nextNode: "ethical_shame"
          },
          {
            text: "[Linha de Investigação] Ela deixou alguma cópia das chaves do arquivo central com você?",
            nextNode: "archive_key",
            requiresClue: "clue_eyewitness_barrel_spillway4"
          }
        ]
      },
      entry_route: {
        text: "'Pelo bueiro de transbordo do moinho velho. A grade está serrada na base há seis meses.'",
        giveClue: "clue_mill_overflow_path",
        options: [{ text: "[Marcar no mapa de NorthVale]", exit: true }]
      },
      ethical_shame: {
        text: "Julian esconde o rosto nas mãos manchadas de tinta mimeográfica. 'Você tem razão... eu fui um covarde. Mas eu quero consertar isso.'",
        options: [{ text: "[Dar um voto de confiança]", exit: true }]
      },
      archive_key: {
        text: "Ele puxa uma chave pequena de armário presa numa fita azul. 'Sarah me deu isto no domingo. É do fichário pessoal da Beverly Vance.'",
        giveItem: "beverly_file_key",
        options: [{ text: "[Pegar a chave]", exit: true }]
      }
    }
  },

  // 9. Maeve Higgins (Arquivista e Pesquisadora)
  maeve_higgins: {
    id: "maeve_higgins",
    name: "Maeve Higgins",
    role: "Arquivista",
    initialNode: "library_archive",
    nodes: {
      library_archive: {
        text: "Se você cruzar os óbitos de 1984 com os lotes de descarte da Vance Chemicals, vai notar que as datas coincidem milimetricamente com a baixa no nível das comportas.",
        options: [
          {
            text: "[Raciocínio Dedutivo] Você encontrou o padrão hidrológico. Consegue autenticar esses mapas antes que destruam os originais?",
            nextNode: "authenticate_maps"
          },
          {
            text: "[Cautela] Sua avó sabe que você guarda essa papelada debaixo do assoalho do seu quarto?",
            nextNode: "grandmother_warning"
          },
          {
            text: "[Proteção Imediata] Pegue seus cadernos e venha para o hotel. O Becker já colocou homens vigiando a entrada da biblioteca.",
            nextNode: "hotel_evacuate"
          }
        ]
      },
      authenticate_maps: {
        text: "Maeve carimba as cópias com o selo público de microfilme. 'Aqui está. Um tribunal estadual não pode recusar este selo.'",
        giveItem: "certified_hydrological_maps",
        options: [{ text: "[Guardar mapas]", exit: true }]
      },
      grandmother_warning: {
        text: "'Vovó finge que não vê, mas foi ela quem me deu a cópia da chave mestra do porão dos arquivos.'",
        giveClue: "clue_clara_protects_maeve",
        options: [{ text: "[Sorrir levemente]", exit: true }]
      },
      hotel_evacuate: {
        text: "Ela olha pela janela e vê as luzes do carro de Becker. Empacota tudo rapidamente em sua bolsa de lona. 'Encontro você lá pelos fundos.'",
        triggerEvent: "maeve_moves_to_hotel",
        options: [{ text: "[Cobrir a saída dela]", exit: true }]
      }
    }
  },

  // 10. Helen Miller (Mãe de Sarah)
  helen_miller: {
    id: "helen_miller",
    name: "Helen Miller",
    role: "Mãe de Sarah",
    initialNode: "millers_kitchen",
    nodes: {
      millers_kitchen: {
        text: "O Bobby veio aqui ontem de farda me pedir para parar de ligar para a rádio da capital. Disse que era 'pelo bem da família'. O que estão fazendo com a minha menina, detetive?",
        options: [
          {
            text: "[Compaixão Sincera] Eu prometo trazer a verdade, dona Helen. Me mostre a última coisa que Sarah guardou naquele guarda-roupa.",
            nextNode: "wardrobe_search"
          },
          {
            text: "[Interrogatório Suave] Ela comentou com a senhora sobre algum barulho ou carro parando na porteira durante a madrugada?",
            nextNode: "gate_noises"
          },
          {
            text: "[Firmeza Protetora] Tranque as portas dos fundos. Não abra para nenhum policial sem que eu esteja junto.",
            nextNode: "lock_warning"
          }
        ]
      },
      wardrobe_search: {
        text: "Ela abre o guarda-roupa com as mãos trêmulas. No fundo falso, sob um lenço bordado, repousa uma fita K7 etiquetada: 'Conversas da Guarita - Julho 89'.",
        giveItem: "cassette_tape_3",
        options: [{ text: "[Pegar a fita de áudio]", exit: true }]
      },
      gate_noises: {
        text: "'Um motor pesado a diesel... roncava baixo por volta das duas da manhã, parando sempre perto da ponte velha.'",
        giveClue: "clue_diesel_engine_at_bridge",
        options: [{ text: "[Anotar no bloco]", exit: true }]
      },
      lock_warning: {
        text: "Ela assente em silêncio e passa a tranca de ferro da porta da cozinha. 'Que Deus proteja os seus passos, senhor Hale.'",
        options: [{ text: "[Sair para a rua chuvosa]", exit: true }]
      }
    }
  },

  // 11. Viktor Sloane (Magnata Industrial)
  viktor_sloane: {
    id: "viktor_sloane",
    name: "Viktor Sloane",
    role: "Magnata",
    initialNode: "penthouse_office",
    nodes: {
      penthouse_office: {
        text: "Inspetor Hale... homens da sua laia vivem de farejar cadáveres e restos podres. Homens da minha laia mantêm as luzes deste estado acesas e a carne na mesa dos operários. Cuidado para não tropeçar na própria arrogância.",
        options: [
          {
            text: "[Desdém Nobre] Carne congelada e água envenenada. Seu império vira ferrugem assim que o juiz assinar a ordem de lacre.",
            nextNode: "court_order"
          },
          {
            text: "[Sondagem Psicológica] Por que tanta pressa em esvaziar os túneis da câmara fria número 4 antes da vistoria sanitária?",
            nextNode: "cold_storage_4",
            requiresClue: "clue_eyewitness_barrel_spillway4"
          },
          {
            text: "[Ameaça Fria] Você pode ter comprado a Xerife Mercer, mas eu não recebo salário em moeda de NorthVale.",
            nextNode: "cold_threat"
          }
        ]
      },
      court_order: {
        text: "Sloane dá uma tragada calma no seu charuto importado. 'Juízes da capital são caros, inspetor. Mas eu sempre compro os melhores.'",
        options: [{ text: "[Conter a fúria]", exit: true }]
      },
      cold_storage_4: {
        text: "Pela primeira vez a postura imponente oscila. A cinza do charuto cai sobre o tapete persa. 'Você fala demais para quem tem apenas um revólver enferrujado.'",
        giveClue: "clue_sloane_reaction_coldroom",
        options: [{ text: "[Sair vitorioso no embate]", exit: true }]
      },
      cold_threat: {
        text: "'Todo homem tem um preço, Hale. Alguns custam maços de dólares; outros custam apenas o silêncio de uma bala na nuca.'",
        reputationImpact: { paranoia: 1 },
        options: [{ text: "[Retirar-se]", exit: true }]
      }
    }
  },

  // 12. Kurt Becker (Chefe de Segurança Corporativa)
  kurt_becker: {
    id: "kurt_becker",
    name: "Kurt Becker",
    role: "Chefe de Segurança",
    initialNode: "plant_gate",
    nodes: {
      plant_gate: {
        text: "Seu distintivo amassado não para chumbo grosso, detetive. Se eu flagrar você de novo a menos de cem metros do duto da fábrica, seu relatório vai terminar no picador de ossos.",
        options: [
          {
            text: "[Intimidação Físico-Psicológica] Já interroguei açougueiros muito piores que você na capital, Becker. Dê o primeiro passo e descubra.",
            nextNode: "standoff_intimidation",
            reputationImpact: { authority: 1, composure: 1 }
          },
          {
            text: "[Inspeção de Vestígios] O que são essas marcas de arranhão na lateral da sua caminhonete? Parecem unhas de uma mulher de cinquenta quilos.",
            nextNode: "van_scratches",
            requiresClue: "clue_becker_van_patrol"
          },
          {
            text: "[Desengajamento Tático] Estou apenas caminhando em via pública. Acalme seu gatilho antes que a confusão chame a atenção da imprensa.",
            nextNode: "tactical_backoff"
          }
        ]
      },
      standoff_intimidation: {
        text: "Becker cospe no chão, mantendo a mão pesada sobre o revólver Magnum .44. Os dois encaram-se sob a chuva torrencial. Nenhum dos dois pisca.",
        options: [{ text: "[Manter postura firme e se afastar]", exit: true }]
      },
      van_scratches: {
        text: "Ele cerra a mandíbula, a cicatriz no queixo avermelhada de tensão. 'Cachorro do mato. Não enfie o focinho onde não foi chamado.'",
        giveClue: "clue_van_blood_scratches_confirmed",
        options: [{ text: "[Memorizar o detalhe da pintura]", exit: true }]
      },
      tactical_backoff: {
        text: "'Dê o fora daqui enquanto ainda tem pernas para andar.' Ele bate a porta de ferro da cerca com estrondo.",
        options: [{ text: "[Recuar para as sombras]", exit: true }]
      }
    }
  },

  // 13. Bruno Varga (Operário do Turno Noturno)
  bruno_varga: {
    id: "bruno_varga",
    name: "Bruno Varga",
    role: "Operário",
    initialNode: "rail_tavern",
    nodes: {
      rail_tavern: {
        text: "Eu só bato o cartão e puxo alavanca, seu guarda. Não me meta nessa desgraceira do sumiço da menina. Tenho boca pra alimentar.",
        options: [
          {
            text: "[Solidariedade Proletária] Bruno, se a água do poço estiver podre, seus filhos vão beber dela amanhã. O que tinha naquele caminhão-tanque?",
            nextNode: "worker_sympathy"
          },
          {
            text: "[Coerção Leve] Sua luva de borracha estava suja de ácido sulfúrico. Quer explicar isso na delegacia sob custódia?",
            nextNode: "acid_gloves"
          },
          {
            text: "[Oferta de Saída] Se me contar quem assinou a guia de transporte das 03:00, tiro sua família de NorthVale antes de o circo pegar fogo.",
            nextNode: "manifest_signature"
          }
        ]
      },
      worker_sympathy: {
        text: "Bruno bebe o resto da cerveja com pressa. 'Eram três tambores pretos sem etiqueta. O senhor Becker mandou despejar direto na válvula de emergência do Setor 4.'",
        giveClue: "clue_dumping_order_becker",
        options: [{ text: "[Apertar o ombro dele em silêncio]", exit: true }]
      },
      acid_gloves: {
        text: "Ele esconde as mãos sob a mesa de madeira do botequim. 'Eu lavo as carcaças... aquele ácido é pra tirar sangue do chão!'",
        options: [{ text: "[Duvidar abertamente]", exit: true }]
      },
      manifest_signature: {
        text: "'Foi a senhora Beverly Vance... ela veio de capa preta e assinou com caneta dourada na prancheta do vigia.'",
        giveClue: "clue_beverly_signed_dumping",
        options: [{ text: "[Anotar o nome no diário]", exit: true }]
      }
    }
  },

  // 14. Yelena Ramos (Engenheira Hidráulica)
  yelena_ramos: {
    id: "yelena_ramos",
    name: "Yelena Ramos",
    role: "Engenheira",
    initialNode: "spillway_station",
    nodes: {
      spillway_station: {
        text: "A barragem não vai ceder por pressão de água... o concreto da base está sendo dissolvido por dejetos químicos corrosivos injetados nos poços de dreno!",
        options: [
          {
            text: "[Análise Técnica] Mostre-me os gráficos de acidez das últimas 72 horas. Quanto tempo o paredão aguenta?",
            nextNode: "ph_charts"
          },
          {
            text: "[Apoio Institucional] Você tem coragem de subir ao palanque e desmentir o laudo de segurança do prefeito?",
            nextNode: "public_report"
          },
          {
            text: "[Investigação Criminal] Quem desativou os sensores de vazamento na madrugada em que Sarah esteve aqui?",
            nextNode: "sensor_override"
          }
        ]
      },
      ph_charts: {
        text: "Ela desenrola o papel milimetrado sobre a mesa de aço. 'O pH caiu para 2.4. A parede de sustentação tem no máximo quarenta e oito horas antes de ruir sob esta tempestade.'",
        giveClue: "clue_48_hours_dam_collapse",
        options: [{ text: "[Anotar prazo crítico]", exit: true }]
      },
      public_report: {
        text: "'Se eu fizer isso sem escolta federal, serei atropelada na descida da serra igual ao antigo fiscal de saneamento.'",
        options: [{ text: "[Compreender o medo]", exit: true }]
      },
      sensor_override: {
        text: "'O corte veio do terminal da administração central às 02:40 da manhã usando a senha do próprio prefeito Vance.'",
        giveClue: "clue_mayor_sensor_override",
        options: [{ text: "[Registrar evidência digital]", exit: true }]
      }
    }
  },

  // 15. Otis Clark (Vigia da Represa)
  otis_clark: {
    id: "otis_clark",
    name: "Otis Clark",
    role: "Vigia",
    initialNode: "dam_gatehouse",
    nodes: {
      dam_gatehouse: {
        text: "Chuva que não para, vento que uiva nos dutos... naquela noite vi as luzes de um furgão subindo o morro sem farol. Achei que fossem amantes. Depois ouvi um grito seco abafado pelo trovão.",
        options: [
          {
            text: "[Persistência Paciente] Otis, tome um gole do meu cantil e tente lembrar: o furgão tinha placa comercial ou municipal?",
            nextNode: "van_license"
          },
          {
            text: "[Aperto Firme] Você era o único homem com a chave do cadeado do vertedouro naquela hora. Como ele abriu?",
            nextNode: "gate_keys"
          },
          {
            text: "[Exploração Psicológica] As almas das pessoas que você deixou para trás na cheia de 64 não deixam você dormir, não é?",
            nextNode: "flood_guilt"
          }
        ]
      },
      van_license: {
        text: "Ele sorve o líquido avidamente e tosse com força. 'Tinha o símbolo do boi estilizado na porta... Sloane Transportes. Placa final 89.'",
        giveClue: "clue_sloane_truck_plate89",
        options: [{ text: "[Guardar número da placa]", exit: true }]
      },
      gate_keys: {
        text: "'O Becker pegou o chaveiro mestra da guarita na marra! Ele apontou o cano da pistola na minha garganta, detetive!'",
        giveClue: "clue_becker_took_masterkey",
        options: [{ text: "[Acalmar o velho vigia]", exit: true }]
      },
      flood_guilt: {
        text: "O velho Otis cobre os olhos lacrimejantes com as mangas encharcadas do casaco impermeável amarelo. 'Não fale de 64... por favor...'",
        reputationImpact: { empathy: -1 },
        options: [{ text: "[Recuar]", exit: true }]
      }
    }
  },

  // 16. Elias Ward (Farmacêutico)
  elias_ward: {
    id: "elias_ward",
    name: "Elias Ward",
    role: "Farmacêutico",
    initialNode: "pharmacy_counter",
    nodes: {
      pharmacy_counter: {
        text: "Eu sou farmacêutico, detetive! Não sou juiz nem carrasco! Se eu me recusar a entregar as caixas de barbitúricos que o Becker pede, eles botam fogo na minha farmácia com minha mãe dentro!",
        options: [
          {
            text: "[Pressão Legal] Mostre-me o livro de saída de substâncias controladas do último mês. Agora.",
            nextNode: "substance_book"
          },
          {
            text: "[Compaixão Firme] Se me entregar as receitas assinadas pelo Dr. Aris, coloco uma viatura estadual de guarda na sua porta.",
            nextNode: "aris_prescriptions"
          },
          {
            text: "[Dedução Médica] Que remédio a Sarah comprou aqui na terça-feira à tarde antes de subir a serra?",
            nextNode: "sarah_purchase"
          }
        ]
      },
      substance_book: {
        text: "Elias entrega o caderno de folhas espessas com as páginas finais arrancadas. 'Levaram as últimas quatro semanas, mas esqueceram o papel-carbono intercalado.'",
        giveItem: "carbon_paper_prescriptions",
        options: [{ text: "[Recolher o carbono contra a luz]", exit: true }]
      },
      aris_prescriptions: {
        text: "'O doutor Aris assinou pedidos falsificados de sedativos pesados. Centenas de ampolas de clorpromazina.'",
        giveClue: "clue_aris_falsified_sedatives",
        options: [{ text: "[Anotar nomes das drogas]", exit: true }]
      },
      sarah_purchase: {
        text: "'Ela comprou gaze estéril, iodo e analgésicos fortes... e perguntou se eu tinha kits para teste de água.'",
        giveClue: "clue_sarah_water_test_kit",
        options: [{ text: "[Confirmar o objetivo de Sarah]", exit: true }]
      }
    }
  },

  // 17. Sam Kowalski (Dono da Oficina Mecânica)
  sam_kowalski: {
    id: "sam_kowalski",
    name: "Sam Kowalski",
    role: "Mecânico",
    initialNode: "garage_bay",
    nodes: {
      garage_bay: {
        text: "Olha aqui, Hale: gente da capital de terno engomado só traz desgraça pra NorthVale. Se veio incomodar a Helen Miller, eu quebro seus dentes na morsa.",
        options: [
          {
            text: "[Postura de Respeito] Vim buscar quem machucou a filha dela, Sam. E preciso saber que carro teve a suspensão lavada com soda cáustica aqui ontem.",
            nextNode: "caustic_wash"
          },
          {
            text: "[Desafio Direto] Abaixe a chave de fenda. Nós dois sabemos que você não quer voltar para a penitenciária estadual.",
            nextNode: "prison_threat"
          },
          {
            text: "[Troca de Favores] Eu conserto seu problema com o fiscais da prefeitura se você me der acesso ao porta-malas do carro do Becker.",
            nextNode: "becker_trunk"
          }
        ]
      },
      caustic_wash: {
        text: "Sam solta a chave pesada com um estrondo no concreto. 'A caminhonete preta do Becker. O assoalho veio manchado de lama vermelha da represa e sangue coagulado. Eu guardei a estopa suja num tambor.'",
        giveItem: "bloody_engine_rag",
        options: [{ text: "[Pegar a estopa ensanguentada]", exit: true }]
      },
      prison_threat: {
        text: "O mecânico cerra os punhos e dá um passo à frente, os músculos dos braços tensos sob o macacão de brim. 'Tenta a sorte, detetive.'",
        options: [{ text: "[Desarmar a tensão]", exit: true }]
      },
      becker_trunk: {
        text: "'O carro dele está estacionado no galpão 2. Tome este gazua de aço... abre qualquer porta de Ford antigo.'",
        giveItem: "custom_lockpick",
        options: [{ text: "[Agradecer a ferramenta]", exit: true }]
      }
    }
  },

  // 18. Owen Briggs (Sucateiro da Linha Férrea)
  owen_briggs: {
    id: "owen_briggs",
    name: "Owen Briggs",
    role: "Sucateiro",
    initialNode: "scrap_wagon",
    nodes: {
      scrap_wagon: {
        text: "O ferro fala, detetive. O barro esconde, mas o ferro guarda a ferrugem do sangue. Achei uma corrente grossa com trava de segredo jogada na lama do duto de esgoto.",
        options: [
          {
            text: "[Compra de Informação] Dez dólares por essa corrente e pelo local exato onde você a desenterrou.",
            nextNode: "buy_chain"
          },
          {
            text: "[Paciência de Ouvinte] Que mais o ferro te contou sobre a noite de terça-feira, Owen?",
            nextNode: "iron_tales"
          },
          {
            text: "[Ameaça Sanitária] Posso mandar a vigilância sanitária apreender todo o seu depósito se você enrolar.",
            nextNode: "sanitary_threat"
          }
        ]
      },
      buy_chain: {
        text: "Ele morde a nota de dez dólares para testar o papel e cospe na terra. 'Duto sul número 3. O cadeado foi rebentado com disparos de revólver .38.'",
        giveItem: "broken_chain_lock",
        giveClue: "clue_chain_shot_with_38",
        options: [{ text: "[Recolher o ferro retorcido]", exit: true }]
      },
      iron_tales: {
        text: "'Os trilhos vibraram às quatro da manhã. Não era trem de passageiros... era a locomotiva de carga particular manobrando vagões-tanque no escuro.'",
        giveClue: "clue_ghost_freight_train",
        options: [{ text: "[Anotar a movimentação ferroviária]", exit: true }]
      },
      sanitary_threat: {
        text: "O velho vira as costas e assobia para três vira-latas de dentes à mostra. 'Cai fora do meu terreno, tira.'",
        options: [{ text: "[Sair do ferro-velho]", exit: true }]
      }
    }
  },

  // 19. Nora Finch (Garçonete do Double R Diner)
  nora_finch: {
    id: "nora_finch",
    name: "Nora Finch",
    role: "Garçonete",
    initialNode: "diner_booth",
    nodes: {
      diner_booth: {
        text: "Mais café preto, detetive? Aqui entre nós... na terça-feira à noite, o subxerife Bobby sentou naquela mesa do canto pálido como um lençol. Nem tocou na torta. Só olhava pro relógio a cada trinta segundos.",
        options: [
          {
            text: "[Charme Investigativo] Nora, você tem o melhor ouvido da cidade. Com quem Bobby estava falando ao telefone público?",
            nextNode: "bobby_phonecall"
          },
          {
            text: "[Observação do Cenário] Alguém mais com uniforme do frigorífico entrou aqui depois das 23:00?",
            nextNode: "slone_men_diner"
          },
          {
            text: "[Anotação Rápida] Guarde este número de quarto do hotel. Se o Becker aparecer procurando por mim, você me liga.",
            nextNode: "hotel_contact"
          }
        ]
      },
      bobby_phonecall: {
        text: "'Ele berrou no fone: 'Eu não vou colocar as mãos nela, Ruth! Isso é sequestro!' Depois desligou e saiu correndo na chuva.'",
        giveClue: "clue_bobby_refused_kidnapping",
        options: [{ text: "[Anotar a frase exata de Bobby]", exit: true }]
      },
      slone_men_diner: {
        text: "'Dois capangas do Becker com manchas de graxa e cheiro forte de amoníaco vieram buscar três garrafas térmicas de café puro.'",
        giveClue: "clue_ammonia_smell_workers",
        options: [{ text: "[Raciocinar sobre a presença de amoníaco]", exit: true }]
      },
      hotel_contact: {
        text: "Ela guarda o papel no bolso do avental azul com uma piscadela cúmplice. 'Pode deixar, senhor Hale. Meus olhos estão bem abertos.'",
        reputationImpact: { empathy: 1 },
        options: [{ text: "[Deixar uma boa gorjeta]", exit: true }]
      }
    }
  },

  // 20. Harvey Dent (Barbeiro Tradicional)
  harvey_dent: {
    id: "harvey_dent",
    name: "Harvey Dent",
    role: "Barbeiro",
    initialNode: "barber_chair",
    nodes: {
      barber_chair: {
        text: "Uma toalha quente no rosto faz qualquer homem desabafar, detetive. Até o senhor Sloane fechou os olhos outro dia e falou que 'certos problemas da represa precisavam ser soterrados antes do outono'.",
        options: [
          {
            text: "[Incentivo ao Fuxico] E o que mais o senhor Sloane sussurrou enquanto a navalha estava no pescoço dele, Harvey?",
            nextNode: "sloane_confession"
          },
          {
            text: "[Psicologia Social] O prefeito Vance mencionou alguma coisa sobre o filho Julian durante o corte?",
            nextNode: "mayor_julian_rumor"
          },
          {
            text: "[Inspeção Rápida] Você atendeu alguém com arranhões recentes no rosto ou nas mãos esta semana?",
            nextNode: "scratched_faces"
          }
        ]
      },
      sloane_confession: {
        text: "'Ele disse que o promotor estava a caminho de trem, mas que a ponte de madeira podia sofrer uma 'combustão espontânea' a qualquer hora.'",
        giveClue: "clue_rail_sabotage_plot",
        options: [{ text: "[Compreender o perigo do trem]", exit: true }]
      },
      mayor_julian_rumor: {
        text: "'O prefeito chorou feito criança, disse que o rapaz ia arruinar a família se continuasse encontrando a garota dos Miller.'",
        giveClue: "clue_mayor_feared_romance",
        options: [{ text: "[Registrar a dinâmica de clãs]", exit: true }]
      },
      scratched_faces: {
        text: "'O segurança Kurt Becker... mandíbula cortada com três riscos fundos. Ele disse que foi espinho de amoreira, mas parecia unha de mulher assustada.'",
        giveClue: "clue_becker_scratched_face",
        options: [{ text: "[Confirmar o confronto físico]", exit: true }]
      }
    }
  },

  // 21. Frankie "Dente de Prata" (Receptador)
  frankie_silvertooth: {
    id: "frankie_silvertooth",
    name: "Frankie Dente de Prata",
    role: "Receptador",
    initialNode: "pool_hall",
    nodes: {
      pool_hall: {
        text: "Depende do que você quer comprar, chefe. Se for relógio suíço falso, custa vinte contos. Se for a gravação cassete que um vagabundo achou no mato perto da comporta... vai te custar uma nota preta.",
        options: [
          {
            text: "[Negociação Comercial] Cinquenta pratas na mesa pela fita. Sem perguntas, sem recibo.",
            nextNode: "buy_tape"
          },
          {
            text: "[Pressão Policial Pesada] Ou você me dá essa fita agora ou te enfio no camburão por receptação de carga roubada.",
            nextNode: "threaten_frankie"
          },
          {
            text: "[Aposta Arriscada] Uma partida de cartas pela fita. Se você ganhar, dobro o valor; se perder, larga a fita e some.",
            nextNode: "card_game"
          }
        ]
      },
      buy_tape: {
        text: "Ele faz o dinheiro sumir na manga da jaqueta de couro e atira a fita plástica preta sobre a mesa de feltro verde. 'Feito, parceiro.'",
        giveItem: "cassette_tape_2",
        options: [{ text: "[Recolher fita K7 nº 2]", exit: true }]
      },
      threaten_frankie: {
        text: "'Você não tem provas de nada, seu bosta!' Três marginais com tacos de bilhar aproximam-se pelas costas de Alex.",
        reputationImpact: { composure: -1 },
        options: [{ text: "[Puxar o revólver e recuar]", exit: true }]
      },
      card_game: {
        text: "Você vira um valete e uma dama contra o par de dez dele. Frankie cospe um dente no chão de madeira. 'Sorte de canalha. Leva essa porcaria.'",
        giveItem: "cassette_tape_2",
        options: [{ text: "[Pegar a fita com sorriso amargo]", exit: true }]
      }
    }
  },

  // 22. Irmã Maria (Freira da Paróquia de Santo Antônio)
  sister_maria: {
    id: "sister_maria",
    name: "Irmã Maria",
    role: "Freira",
    initialNode: "chapel_altar",
    nodes: {
      chapel_altar: {
        text: "O diabo não anda com chifres em NorthVale, senhor Hale. Ele veste terno risca-de-giz e assina cheques para a reforma do telhado da igreja enquanto condena nossos filhos ao veneno.",
        options: [
          {
            text: "[Respeito Espiritual] Irmã, a casa de Deus é o único refúgio seguro. Sarah esteve aqui antes de sumir?",
            nextNode: "sarah_in_church"
          },
          {
            text: "[Pedido de Acesso] Preciso verificar o sótão da sacristia. Há pegadas de terra fresca nos degraus da escada.",
            nextNode: "attic_access"
          },
          {
            text: "[Confronto de Consciência] Proteger criminosos confessos no confessionário não é caridade, é omissão de socorro.",
            nextNode: "moral_rebuke"
          }
        ]
      },
      sarah_in_church: {
        text: "'Ela rezou diante de Nossa Senhora às onze da noite e deixou esta medalha de São Cristóvão pedindo que eu entregasse à mãe dela.'",
        giveItem: "sarahs_saint_medallion",
        options: [{ text: "[Guardar a medalhinha]", exit: true }]
      },
      attic_access: {
        text: "'Apenas ratos sobem lá, detetive... mas a porta destrancou-se ontem à noite. Vá com cuidado.'",
        giveClue: "clue_sacristy_attic_open",
        options: [{ text: "[Subir os degraus de madeira]", exit: true }]
      },
      moral_rebuke: {
        text: "A freira ergue o rosário com firmeza serena. 'Nós respondemos a uma corte que não aceita subornos nem ameaças terrestres.'",
        options: [{ text: "[Baixar a cabeça]", exit: true }]
      }
    }
  },

  // 23. Padre Thomas (Pároco Assombrado)
  father_thomas: {
    id: "father_thomas",
    name: "Padre Thomas",
    role: "Pároco",
    initialNode: "confessional",
    nodes: {
      confessional: {
        text: "O segredo do confessionário é um voto diante do Altíssimo, detetive! Se eu quebrar esse selo, minha alma arderá por toda a eternidade!",
        options: [
          {
            text: "[Dilema Teológico] E a alma da Sarah Miller apodrecendo na lama? Que tipo de Deus exige o sacrifício de uma inocente para salvar seu juramento?",
            nextNode: "theological_argument"
          },
          {
            text: "[Compreensão Tácita] Não me diga o nome do penitente. Apenas balance a cabeça: o assassino dela foi o Kurt Becker?",
            nextNode: "silent_nod"
          },
          {
            text: "[Pressão Racional] Sua batina não o protege de ser chamado a depor sob juramento em um tribunal federal.",
            nextNode: "federal_oath"
          }
        ]
      },
      theological_argument: {
        text: "O sacerdote desaba a chorar do outro lado da treliça de madeira. 'Ele disse... ele disse que a jogou dentro da galeria do sifão antes de fechar a comporta secundária.'",
        giveClue: "clue_sarah_thrown_siphon_gallery",
        options: [{ text: "[Absolver o padre pelo segredo]", exit: true }]
      },
      silent_nod: {
        text: "Através da fresta escura da madeira entalhada, a silhueta da cabeça do padre move-se lentamente para baixo em sinal afirmativo, trêmula de pavor.",
        giveClue: "clue_becker_identified_as_attacker",
        options: [{ text: "[Guardar a confirmação silenciosa]", exit: true }]
      },
      federal_oath: {
        text: "'Prefiro as prisões dos homens à condenação do Todo-Poderoso.' Ele cerra a portinhola de correr do confessionário.",
        options: [{ text: "[Sair da nave da igreja]", exit: true }]
      }
    }
  },

  // 24. Silas Vance (Patriarca da Dinastia Vance)
  silas_vance: {
    id: "silas_vance",
    name: "Silas Vance",
    role: "Patriarca",
    initialNode: "mansion_fire",
    nodes: {
      mansion_fire: {
        text: "NorthVale era um pântano infestado de vermes antes de eu erguer a represa e trazer o progresso! Vocês, policiais de ocasião, são efêmeros. Minha família é o chão onde você pisa.",
        options: [
          {
            text: "[Confronto de Gigantes] Seu império apodreceu, Silas. Seu neto Julian cuspiu no seu legado e entregou os relatórios à imprensa.",
            nextNode: "julian_betrayal"
          },
          {
            text: "[Frieza Calculista] Quantos homens você comprou para encobrir as mortes de 1964? Já não sobrou ninguém para lhe defender no túmulo.",
            nextNode: "flood_1964_truth"
          },
          {
            text: "[Interrogatório Clínico] Olhe nos meus olhos e diga que não ordenou ao Becker a execução da garota dos Miller.",
            nextNode: "becker_order"
          }
        ]
      },
      julian_betrayal: {
        text: "A bengala com cabo de prata bate seca no soalho envernizado. 'Aquele garoto ingrato nunca entendeu que o sangue de um Vance é feito de ferro, não de fita de gravador!'",
        options: [{ text: "[Apreciar a raiva do velho]", exit: true }]
      },
      flood_1964_truth: {
        text: "'Aqueles camponeses recusaram a indenização! A água precisava subir para alimentar as turbinas da fábrica! Alguém precisava ter coragem de abrir a comporta!'",
        giveClue: "clue_silas_confesses_1964_flood",
        options: [{ text: "[Registrar a admissão de crime histórico]", exit: true }]
      },
      becker_order: {
        text: "'Eu não dou ordens para capangas de caminhão, Hale. Eu apenas expresso desejos à mesa do jantar. O que fazem com esses desejos não me compete.'",
        giveClue: "clue_silas_intellectual_author",
        options: [{ text: "[Retirar-se com nojo da mansão]", exit: true }]
      }
    }
  },

  // 25. Lenny "O Rato" (Informante)
  lenny_the_rat: {
    id: "lenny_the_rat",
    name: "Lenny O Rato",
    role: "Informante",
    initialNode: "steam_grate",
    nodes: {
      steam_grate: {
        text: "Doutor... tá frio demais... me arruma duas pratas pro conhaque do Elias e eu conto o que os caras de jaqueta jogaram no poço de visita da represa!",
        options: [
          {
            text: "[Suborno Rápido] Tome cinco pratas. Fale rápido antes que o Becker apareça na esquina.",
            nextNode: "five_bucks_clue"
          },
          {
            text: "[Tratamento Humano] Aqui está um maço de cigarros e um casaco seco. Venha comigo até a pensão e coma algo quente.",
            nextNode: "warm_coat_clue",
            reputationImpact: { empathy: 2 }
          },
          {
            text: "[Aperto no Beco] Não tenho moedas para vício. Se não desembuchar agora, te arrasto pra delegacia como suspeito de roubo.",
            nextNode: "threaten_lenny"
          }
        ]
      },
      five_bucks_clue: {
        text: "Ele enfia as notas no sapato furado com rapidez espantosa. 'Era uma maleta preta de médico... Dr. Aris entregou ela no banco de trás do carro preto às onze e meia.'",
        giveClue: "clue_aris_gave_black_bag",
        options: [{ text: "[Anotar a troca da maleta]", exit: true }]
      },
      warm_coat_clue: {
        text: "Lágrimas limpam a fuligem do rosto do rapaz. 'Seu Hale... o senhor é gente boa. A mochila da Sarah caiu no bueiro da Rua Três. Eu escondi atrás do cano de gás.'",
        giveItem: "sarahs_school_backpack",
        options: [{ text: "[Recolher a mochila de Sarah]", exit: true }]
      },
      threaten_lenny: {
        text: "Ele cospe na bota de Alex e escorrega ágil como uma enguia por uma grelha estreita de esgoto, sumindo na escuridão.",
        options: [{ text: "[Xingar e limpar a bota]", exit: true }]
      }
    }
  },

  // 26. Warren Graves (Jornalista Decadente)
  warren_graves: {
    id: "warren_graves",
    name: "Warren Graves",
    role: "Jornalista",
    initialNode: "gazette_office",
    nodes: {
      gazette_office: {
        text: "A verdade neste vale, Hale, é como papel de jornal molhado: rasga fácil e não serve para acender nem fogueira. O Sloane comprou minha rotativa dez anos atrás.",
        options: [
          {
            text: "[Despertar Profissional] Você já foi o melhor repórter deste estado, Warren. Vamos imprimir a história do século e quebrar a censura juntos.",
            nextNode: "press_revival"
          },
          {
            text: "[Troca de Pistas] Eu te dou a exclusiva da prisão do prefeito em troca dos seus arquivos fotográficos da represa de 1982.",
            nextNode: "photo_archive",
            requiresClue: "clue_mayor_sensor_override"
          },
          {
            text: "[Ceticismo Partilhado] Sirva dois copos de bourbon e me mostre o que eles te proibiram de publicar na quarta-feira.",
            nextNode: "censored_drafts"
          }
        ]
      },
      press_revival: {
        text: "Warren limpa a poeira da máquina de escrever Royal. 'Se você garantir que os federais chegam antes dos capangas armados, eu rodo essa manchete esta noite.'",
        triggerEvent: "newspaper_headline_ready",
        options: [{ text: "[Apertar a mão do jornalista]", exit: true }]
      },
      photo_archive: {
        text: "Ele retira um envelope pardo do fundo da câmara escura. 'Fotos do descarte noturno de 82. Os caminhões tinham o brasão antigo dos Vance.'",
        giveItem: "historic_pollution_photos",
        options: [{ text: "[Examinar os negativos ampliados]", exit: true }]
      },
      censored_drafts: {
        text: "Ele puxa uma folha manchada de café: 'MATADOURO INDUSTRIAL ENTERRA RESÍDUOS TÓXICOS NAS NASCENTES'. Cortado com tarja vermelha pela delegacia.",
        giveClue: "clue_censored_gazette_draft",
        options: [{ text: "[Guardar o rascunho censurado]", exit: true }]
      }
    }
  },

  // 27. Edna Morse (Telefonista Chefe)
  edna_morse: {
    id: "edna_morse",
    name: "Edna Morse",
    role: "Telefonista Chefe",
    initialNode: "switchboard_room",
    nodes: {
      switchboard_room: {
        text: "O protocolo diz que o sigilo das telecomunicações é inviolável... mas se alguém escuta uma ligação das três da manhã entre a delegacia e a guarita do frigorífico falando em 'pacote pesado na água', o que essa pessoa deveria fazer?",
        options: [
          {
            text: "[Persuasão Institucional] Dona Edna, uma vida depende desse registro. Quem ligou e de qual ramal?",
            nextNode: "ramal_record"
          },
          {
            text: "[Chantagem Elegante] A escuta clandestina de linhas privadas é crime federal, a menos que seja entregue como prova ao investigador do caso.",
            nextNode: "legal_handover"
          },
          {
            text: "[Apelo Maternal] Sarah Miller tinha idade para ser sua neta. Ajude a evitar outra tragédia neste vale.",
            nextNode: "maternal_touch"
          }
        ]
      },
      ramal_record: {
        text: "'Foi a Xerife Mercer ligando do ramal da sala de provas direto para o rádio da viatura do Becker.'",
        giveClue: "clue_mercer_becker_direct_call",
        options: [{ text: "[Anotar hora e conexões]", exit: true }]
      },
      legal_handover: {
        text: "Ela empurra o livro de fita perfurada das centrais. 'Leve isto. Mas se o meu nome sair na corte, digo que você roubou da gaveta.'",
        giveItem: "switchboard_log_tape",
        options: [{ text: "[Guardar a fita de papel perfurado]", exit: true }]
      },
      maternal_touch: {
        text: "A mulher enxuga uma lágrima sob os fones pesados de baquelite. 'Ela gritava ao telefone, detetive... dizia que estavam trancando os portões da cerca.'",
        giveClue: "clue_sarah_final_cry_call",
        options: [{ text: "[Agradecer solenemente]", exit: true }]
      }
    }
  },

  // 28. Garrett Hall (Guarda-Florestal)
  garrett_hall: {
    id: "garrett_hall",
    name: "Garrett Hall",
    role: "Guarda-Florestal",
    initialNode: "forest_cabin",
    nodes: {
      forest_cabin: {
        text: "A floresta não mente. Há três dias vi terra remexida perto do duto norte e restos de fita isolante cinza. Homens armados andaram por lá à meia-noite sem lanterna.",
        options: [
          {
            text: "[Rastreamento de Trilha] Garrett, me guie até esse duto sem que os cães do Becker farejem nossos passos.",
            nextNode: "forest_guide"
          },
          {
            text: "[Leitura Ambiental] Pelo nível da chuva recente, para onde a correnteza da galeria levaria um corpo ou um tambor lançado lá?",
            nextNode: "current_flow"
          },
          {
            text: "[Apoio Armado] Se as coisas ficarem feias lá em cima, posso contar com seu rifle para cobrir minha saída?",
            nextNode: "rifle_support"
          }
        ]
      },
      forest_guide: {
        text: "'Visto a jaqueta e pego a lanterna agora. Há uma trilha de caçadores que passa por trás da cerca de arame farpado.'",
        triggerEvent: "ranger_shortcut_unlocked",
        options: [{ text: "[Seguir o guarda pelos bosques]", exit: true }]
      },
      current_flow: {
        text: "'O sifão número 2 tem sucção reversa nesta época. Qualquer coisa pesada é sugada para a caverna sob o templo velho.'",
        giveClue: "clue_siphon_reversal_cave",
        options: [{ text: "[Marcar ponto exato de sucção]", exit: true }]
      },
      rifle_support: {
        text: "'Não dou tiro em policial nem em funcionário civil... mas se os mercenários do Sloane entrarem na reserva estadual, eles vão conhecer chumbo grosso.'",
        reputationImpact: { composure: 1 },
        options: [{ text: "[Acordar aliança tácita]", exit: true }]
      }
    }
  },

  // 29. Molly Peters (Telefonista Auxiliar)
  molly_peters: {
    id: "molly_peters",
    name: "Molly Peters",
    role: "Telefonista Auxiliar",
    initialNode: "switchboard_booth",
    nodes: {
      switchboard_booth: {
        text: "A Sarah me ligou do orelhão da represa! Ela estava chorando, disse que tinha encontrado as fitas do pai do Julian... e aí ouvi passos pesados na brita e o fone caiu no chão!",
        options: [
          {
            text: "[Acalmar o Medo] Respire fundo, Molly. Ninguém sabe que você ouviu isso. O que ela disse sobre a fita?",
            nextNode: "tape_content"
          },
          {
            text: "[Detalhes de Som] Você ouviu algum motor de carro? Havia barulho de rádio de polícia ao fundo?",
            nextNode: "background_audio"
          },
          {
            text: "[Instrução Protetora] Não repita isso nem para sua mãe. Vá para casa e não saia até eu falar com você novamente.",
            nextNode: "protect_molly"
          }
        ]
      },
      tape_content: {
        text: "'Ela disse que as fitas mostravam que o Donald Vance sabia de tudo desde 1980 e que ganharia um milhão de dólares para calar a imprensa!'",
        giveClue: "clue_tape_million_dollar_payoff",
        options: [{ text: "[Confirmar a extorsão]", exit: true }]
      },
      background_audio: {
        text: "'Sim! Ouvi o bip característico do rádio Motorola da delegacia e uma voz rouca gritando 'Pega a mochila dela!''",
        giveClue: "clue_police_radio_at_scene",
        options: [{ text: "[Associar com a rádio da viatura]", exit: true }]
      },
      protect_molly: {
        text: "A menina assente, limpando as lágrimas no suéter rosa. 'Tome a chave do armário do orelhão da represa... ela pode ter jogado algo lá dentro.'",
        giveItem: "payphone_coinbox_key",
        options: [{ text: "[Pegar a chave de latão]", exit: true }]
      }
    }
  },

  // 30. Higgins (Chefe dos Bombeiros Voluntários)
  higgins_firechief: {
    id: "higgins_firechief",
    name: "Chefe Higgins",
    role: "Chefe dos Bombeiros",
    initialNode: "fire_station",
    nodes: {
      fire_station: {
        text: "Se aquelas comportas de fundo continuarem travadas por ordem do prefeito, a represa estoura com o temporal de amanhã. E eu não tenho mergulhadores para descer naquele duto tóxico.",
        options: [
          {
            text: "[Mobilização de Resgate] Tenho equipamento de mergulho autônomo no porta-malas do meu carro. Você me ajuda a descer no duto?",
            nextNode: "dive_prep"
          },
          {
            text: "[Apelo Familiar] Sua sobrinha Maeve está arriscando o pescoço. Precisamos agir antes que a cidade inteira se afogue na lama.",
            nextNode: "niece_plea"
          },
          {
            text: "[Comando Técnico] Corte os cadeados do vertedouro sob prerrogativa de emergência de defesa civil e ignore o prefeito.",
            nextNode: "emergency_cut"
          }
        ]
      },
      dive_prep: {
        text: "'Traga os cilindros. Minha equipe aciona o gerador a diesel e ilumina o túnel para você.'",
        triggerEvent: "dam_dive_operation_ready",
        options: [{ text: "[Preparar o traje de mergulho]", exit: true }]
      },
      niece_plea: {
        text: "O bombeiro cerra os maxilares maciços. 'Se tocaram num fio de cabelo da Maeve, eu mesmo passo o caminhão-tanque por cima da guarita do Sloane.'",
        reputationImpact: { authority: 1 },
        options: [{ text: "[Contar com o apoio dele]", exit: true }]
      },
      emergency_cut: {
        text: "'Tome este alicate corta-correntes industrial de um metro. Se alguém chiar, diga que o Corpo de Bombeiros interveio.'",
        giveItem: "industrial_bolt_cutter",
        options: [{ text: "[Empunhar o corta-vergalhão]", exit: true }]
      }
    }
  },

  // 31. Beverly Vance (Farmacologista e Herdeira Vance)
  beverly_vance: {
    id: "beverly_vance",
    name: "Beverly Vance",
    role: "Farmacologista",
    initialNode: "chemical_salon",
    nodes: {
      chemical_salon: {
        text: "Detetive Hale... que charme provinciano esse seu sobretudo encharcado. Você realmente acredita que o futuro desta cidade pode ser interrompido por investigações sobre o sumiço de uma adolescente descuidada?",
        options: [
          {
            text: "[Intelecto contra Intelecto] Seus experimentos de conservação de tecidos com resíduos de fenol deixaram uma trilha biológica evidente no córrego, senhora Vance.",
            nextNode: "phenol_intellect"
          },
          {
            text: "[Ataque Psicológico] Seu marido é um fantoche assustado que vai entregar você na primeira oferta de delação premiada.",
            nextNode: "husband_puppet"
          },
          {
            text: "[Cinismo Frio] Belo casaco de pele. Combina perfeitamente com a falta de pulso moral dos Vance.",
            nextNode: "fur_coat_cynic"
          }
        ]
      },
      phenol_intellect: {
        text: "O sorriso irónico dela desvanece-se instantaneamente, restando apenas um olhar calculista e gélido. 'Você entende de química mais do que aparenta, detetive. Mas saber a fórmula não impede que ela queime seus pulmões.'",
        giveClue: "clue_beverly_phenol_admission",
        options: [{ text: "[Manter olhar impassível]", exit: true }]
      },
      husband_puppet: {
        text: "'Donald não tem coragem sequer de pedir o divórcio, quanto mais de assinar delação contra mim.'",
        options: [{ text: "[Registrar a frieza conjugal]", exit: true }]
      },
      fur_coat_cynic: {
        text: "'A moralidade é uma invenção para consolar os fracos que perderam a corrida do capital, inspetor.' Ela vira as costas e acende uma cigarrilha russa.",
        options: [{ text: "[Deixar o salão da mansão]", exit: true }]
      }
    }
  },

  // 32. O Estranho (Ermitão dos Bosques da Represa)
  the_stranger: {
    id: "the_stranger",
    name: "O Estranho",
    role: "Ermitão",
    initialNode: "cave_ruins",
    nodes: {
      cave_ruins: {
        text: "A montanha tem sede de sangue novo, policial da cidade de ferro! A água de 64 nunca baixou de verdade... ela só estava esperando o sangue da menina Miller para arrebentar as comportas do inferno!",
        options: [
          {
            text: "[Empatia com a Loucura] Eu também ouço os canos gemendo no escuro, velho amigo. Onde ela deixou a bolsa de couro antes de correr?",
            nextNode: "pipes_groan"
          },
          {
            text: "[Decifração da Charada] Você trabalhou nos projetos originais. Onde fica a passagem secreta de desvio do canal que não consta na planta da prefeitura?",
            nextNode: "secret_bypass"
          },
          {
            text: "[Firmeza Serena] Tome este pão. Olhe para mim: Sarah ainda está viva lá dentro dos dutos?",
            nextNode: "bread_offering"
          }
        ]
      },
      pipes_groan: {
        text: "'O ferro chora! O ferro rangeu quando ela rastejou para o duto de desvio três! Procure o ninho dos corvos sob a ponte de pedra!'",
        giveClue: "clue_bypass3_crows_nest",
        options: [{ text: "[Anotar a charada no diário]", exit: true }]
      },
      secret_bypass: {
        text: "O velho desenha com terra e saliva na parede de pedra úmida: 'Abaixo da terceira comporta há uma escotilha de inspeção de 1964. A chave é uma barra hexagonal.'",
        giveClue: "clue_hexagonal_valve_bypass",
        options: [{ text: "[Copiar o esquema desenhado na pedra]", exit: true }]
      },
      bread_offering: {
        text: "Ele devora o pão com as mãos sujas de musgo e fuligem, os olhos arregalados brilhando na penumbra da caverna. 'Ela respira o ar úmido... mas os cães de ferro estão farejando a porta dela!'",
        giveClue: "clue_sarah_still_breathing",
        options: [{ text: "[Apressar os passos para o resgate]", exit: true }]
      }
    }
  }
};
