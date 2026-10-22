// NorthVale — Sombras de 1989: Bundle Narrativa, Investigação, Diálogos e Cortiça
'use strict';

(function(global) {
  // 1. Gerador Procedural de Culpados
  const CULPRIT_ARCHETYPES = {
    corrupcao_industrial: {
      id: 'corrupcao_industrial',
      name: 'Corrupção Industrial dos Sloane',
      killerId: 'viktor',
      killerName: 'Viktor Sloane',
      title: 'Proprietário do Frigorífico Sloane',
      motive: 'Sarah Miller descobriu documentos fiscais clandestinos e amostras provando o descarte ilegal de resíduos tóxicos da fábrica na represa municipal.',
      solutionSummary: 'Viktor Sloane silenciou Sarah após ela furtar a fita de áudio e as notas de descarte químico da fábrica.',
      falseAlibi: {
        claim: 'Afirma que passou a noite de 15 de outubro no Double R Diner conferindo faturas com Clara Young até as 22h.',
        contradictionClue: 'diner_receipt',
        contradictionFact: 'O recibo do Diner prova que a conta foi fechada e paga às 18h40.'
      },
      lyingWitness: {
        npcId: 'clara',
        npcName: 'Clara Young',
        reason: 'Endividada com o frigorífico, Clara recebeu perdão de dívidas para sustentar o álibi de Viktor.'
      },
      clues: [
        {id:'meat_ledger', title:'Livro-Caixa Clandestino do Frigorífico', category:'document', interiorId:'meatpacking', roomId:'office', propId:'steel-a', text:'Registro de pagamentos para "Taxa de Segurança Especial" nominais a Ruth Mercer e valores de descarte noturno na Represa.'},
        {id:'toxic_sample', title:'Frasco de Resíduo Químico da Represa', category:'material', interiorId:'dam', roomId:'control', propId:'console-a', text:'Frasco de vidro escuro selado com o logotipo da Sloane Agro-Industrial.'},
        {id:'registry_contract', title:'Contrato Adulterado no Cartório', category:'document', interiorId:'registry', roomId:'archives', propId:'files-a', text:'Documento oficial de zoneamento ambiental com páginas rasgadas datado de 14 de outubro de 1989.'},
        {id:'dam_tape', title:'Fita K7 da Subestação', category:'recording', interiorId:'dam', roomId:'turbine', propId:'reel-a', text:'Gravação de Viktor discutindo com uma mulher perto dos canais da represa às 19h45.'}
      ]
    },
    conspiracao_policial: {
      id: 'conspiracao_policial',
      name: 'O Encobertamento da Delegacia',
      killerId: 'ruth',
      killerName: 'Ruth Mercer',
      title: 'Sargento e Chefe da Delegacia',
      motive: 'Sarah descobriu que os desaparecimentos anteriores foram classificados propositalmente como partidas voluntárias para proteger esquemas de contrabando.',
      solutionSummary: 'Ruth confiscou as provas de Sarah e adulterou os inquéritos da delegacia.',
      falseAlibi: {
        claim: 'Afirma que despachou ocorrências na recepção da delegacia até a meia-noite de 15 de outubro.',
        contradictionClue: 'police_log',
        contradictionFact: 'O livro de plantão possui uma rasura visível entre 19h e 21h30.'
      },
      lyingWitness: {
        npcId: 'helen',
        npcName: 'Helen Miller',
        reason: 'Ruth ameaçou retirar a pensão municipal da família se ela contestasse a tese de fuga voluntária.'
      },
      clues: [
        {id:'hidden_dossier', title:'Inquéritos Sigilosos de 1984', category:'document', interiorId:'police', roomId:'archive', propId:'current-files', text:'Dossiê trancado com o selo de Ruth mostrando fotos de três jovens desaparecidas no mesmo padrão de Sarah.'},
        {id:'ruth_diary', title:'Diário de Turnos Rasurado', category:'document', interiorId:'ruth', roomId:'study', propId:'drawer', text:'Anotações pessoais revelando que a viatura de Ruth rodou 68 milhas fora do perímetro na noite fatídica.'},
        {id:'revolver_bullet', title:'Projétil Calibre .38 Recolhido', category:'material', interiorId:'police', roomId:'interrogation', propId:'ashtray', text:'Munição padrão do departamento policial retirada clandestinamente de uma árvore perto da represa.'},
        {id:'depot_manifest', title:'Manifesto de Cargas Confiscado', category:'document', interiorId:'depot', roomId:'office', propId:'desk-a', text:'Carimbo de liberação alfandegária assinado exclusivamente por Ruth sem inspeção prévia.'}
      ]
    }
  };

  class KillerGenerator {
    constructor(seed = null) {
      this.seed = seed ?? Math.floor(Math.random() * 10000000);
      this.rng = (global.random || random)(`northvale-seed-${this.seed}`);
    }
    generate() {
      const keys = Object.keys(CULPRIT_ARCHETYPES);
      const chosen = keys[Math.floor(this.rng() * keys.length)];
      const t = CULPRIT_ARCHETYPES[chosen];
      const cluesMap = {};
      for (const c of t.clues) {
        cluesMap[c.id] = {...c, discovered: false, presented: false};
      }
      return {
        seed: this.seed,
        archetypeKey: chosen,
        culpritId: t.killerId,
        culpritName: t.killerName,
        title: t.title,
        name: t.name,
        motive: t.motive,
        solutionSummary: t.solutionSummary,
        falseAlibi: t.falseAlibi,
        lyingWitness: t.lyingWitness,
        clues: cluesMap,
        requiredClues: t.clues.map(c => c.id),
        deductions: [
          {
            id: `deduction_${t.id}_1`,
            title: 'Falsidade do Álibi Oficial',
            requiredClueIds: [t.clues[0].id, t.clues[1].id],
            unlockedHypothesis: `O álibi de ${t.killerName} desmorona diante das evidências documentais.`
          },
          {
            id: `deduction_${t.id}_2`,
            title: 'Conexão Direta com Sarah',
            requiredClueIds: [t.clues[2].id, t.clues[3].id],
            unlockedHypothesis: `Pistas materiais conectam ${t.killerName} à rota de Sarah na noite do crime.`
          },
          {
            id: `deduction_${t.id}_final`,
            title: 'Dossiê Conclusivo: O Culpado de NorthVale',
            requiredClueIds: t.clues.map(c => c.id),
            unlockedHypothesis: t.solutionSummary,
            isCulpritIndictment: true,
            culpritId: t.killerId
          }
        ]
      };
    }
  }

  // 2. Registro de Pistas e Estado
  const clues = {
    tape: {title: 'Fita K7', text: 'Passos na brita. Uma respiração curta. Sarah sussurra: “A represa. Depois das seis. Não confie no relatório.”', category: 'recording'},
    money: {title: 'Dinheiro sob o assoalho', text: 'US$ 420 em notas pequenas. Uma anotação: “Para sair daqui. Nós três.”', category: 'item'},
    photos: {title: 'Três Polaroids', text: 'Sarah, o balconista e a bibliotecária diante da capela em ruínas. No verso: 15/10/1989.', category: 'photo'},
    letter: {title: 'Carta inacabada', text: '“Mãe, se disserem que eu fugi, não acredite. Encontrei algo no arquivo.”', category: 'document'},
    report: {title: 'Relatório oficial', text: 'Três desaparecimentos classificados como partidas voluntárias. Todos assinados por Ruth.', category: 'document'},
    relato_helen: {title: 'Depoimento Inicial de Helen', text: '“Sarah estava investigando a represa e a fábrica dos Sloane. Ela jamais fugiria sem avisar.”', category: 'document'}
  };

  function getFullCluesRegistry(state) {
    const merged = {...clues};
    if (state?.case?.clues) Object.assign(merged, state.case.clues);
    return merged;
  }

  function createState(seed = null) {
    const gen = new KillerGenerator(seed);
    const proceduralCase = gen.generate();
    return {
      version: 1,
      minute: 8 * 60 + 35,
      day: 1,
      player: {x: 720, y: 705, vx: 0, vy: 0, angle: 1.5},
      car: {x: 760, y: 808, angle: 0, speed: 0},
      driving: false,
      interior: null,
      interiorRoom: null,
      interiorStates: {},
      evidence: [],
      interactions: {},
      links: [],
      inventory: ['Lanterna', 'Crachá', 'Gazua de Aço'],
      introDone: false,
      metHelen: false,
      case: proceduralCase,
      obsession: 20,
      integrity: 75,
      achievements: [],
      corkboardNodes: {},
      corkboardLinks: [],
      corkboardDeductions: [],
      suspectMoods: {},
      tailingEvents: [],
      footTime: 0
    };
  }

  function collect(state, id) {
    const reg = getFullCluesRegistry(state);
    if (!reg[id] || state.evidence.includes(id)) return false;
    state.evidence.push(id);
    if (state.case?.clues?.[id]) state.case.clues[id].discovered = true;
    state.obsession = Math.min(100, (state.obsession || 0) + 4);
    return true;
  }

  function serialize(state) {
    return JSON.stringify(state);
  }

  function deserialize(text) {
    const s = JSON.parse(text);
    if (!s || s.version !== 1) throw Error('Salvamento inválido.');
    return s;
  }

  const SAVE_KEY = 'northvale-save';
  function readSave(storage) {
    const data = storage.getItem(SAVE_KEY);
    if (!data) throw Error('Nenhum salvamento encontrado');
    return deserialize(data);
  }

  // 3. Sistema de Conquistas Noir
  const ACHIEVEMENTS = [
    {id: 'first_trace', title: 'Primeiro Rastro', desc: 'Colete sua primeira evidência documental ou física.', icon: '🔍'},
    {id: 'night_wanderer', title: 'Madrugada em NorthVale', desc: 'Explore as ruas entre 02:00 e 04:00 da manhã.', icon: '🌙'},
    {id: 'silent_shadow', title: 'Fantasma na Chuva', desc: 'Conclua uma perseguição discreta a um suspeito.', icon: '👣'},
    {id: 'red_string_master', title: 'Fios do Destino', desc: 'Conecte sua primeira dedução correta no quadro de cortiça.', icon: '🧶'},
    {id: 'breakthrough', title: 'Contra a Parede', desc: 'Confronte um suspeito com provas irrefutáveis.', icon: '⚡'},
    {id: 'master_deducer', title: 'Mente Analítica', desc: 'Monte o dossiê conclusivo do caso.', icon: '🧠'}
  ];

  class AchievementSystem {
    constructor(state, notifyFn) {
      this.state = state;
      this.notify = notifyFn;
      state.achievements ??= [];
    }
    unlock(id) {
      if (this.state.achievements.includes(id)) return;
      this.state.achievements.push(id);
      const ach = ACHIEVEMENTS.find(a => a.id === id);
      if (ach && this.notify) this.notify(`🏆 CONQUISTA DESBLOQUEADA: ${ach.title} — ${ach.desc}`);
    }
  }

  // 4. Sistema de Finais Narrativos
  const ENDINGS = {
    JUSTICA_INFLEXIVEL: {id: 'JUSTICA_INFLEXIVEL', title: 'A Justiça Inflexível', desc: 'Alex entregou o dossiê conclusivo diretamente à Promotoria Federal.'},
    PACTO_DO_SILENCIO: {id: 'PACTO_DO_SILENCIO', title: 'O Pacto do Silêncio', desc: 'Alex aceitou o suborno da delegacia e arquivou o caso.'},
    ESPIRAL_DA_LOUCURA: {id: 'ESPIRAL_DA_LOUCURA', title: 'A Espiral da Loucura', desc: 'O nível de obsessão e paranoia consumiu o detetive Hale.'},
    ARQUIVO_MORTO: {id: 'ARQUIVO_MORTO', title: 'O Arquivo Morto', desc: 'As provas foram insuficientes e o culpado escapou de NorthVale.'}
  };

  class EndingsEvaluator {
    constructor(state) { this.state = state; }
    evaluate() {
      const hasFinal = this.state.corkboardDeductions?.some(d => d.includes('final'));
      if (this.state.obsession >= 85) return ENDINGS.ESPIRAL_DA_LOUCURA;
      if (hasFinal && (this.state.integrity || 50) >= 60) return ENDINGS.JUSTICA_INFLEXIVEL;
      if ((this.state.integrity || 50) < 30) return ENDINGS.PACTO_DO_SILENCIO;
      return ENDINGS.ARQUIVO_MORTO;
    }
  }

  // 5. Quadro de Cortiça (Corkboard)
  class CorkboardSystem {
    constructor(state, cluesRegistry, onDeductionUnlocked, achievementSystem) {
      this.state = state; this.cluesRegistry = cluesRegistry;
      this.onDeductionUnlocked = onDeductionUnlocked; this.achievementSystem = achievementSystem;
      state.corkboardNodes ??= {}; state.corkboardLinks ??= []; state.corkboardDeductions ??= [];
      this.modal = null; this.canvas = null; this.ctx = null;
    }
    open() {
      this.initDOM();
      this.modal.showModal();
      this.render();
    }
    close() { if (this.modal?.open) this.modal.close(); }
    initDOM() {
      if (document.querySelector('#corkboard-dialog')) {
        this.modal = document.querySelector('#corkboard-dialog');
        this.canvas = this.modal.querySelector('#corkboard-canvas');
        this.ctx = this.canvas?.getContext('2d');
        return;
      }
      this.modal = document.createElement('dialog');
      this.modal.id = 'corkboard-dialog';
      this.modal.className = 'corkboard-dialog';
      this.modal.innerHTML = `
        <div class="corkboard-container">
          <header class="corkboard-header">
            <div>
              <div class="corkboard-eyebrow">ARQUIVO INVESTIGATIVO · DETETIVE ALEX HALE</div>
              <h2>Quadro de Dedução & Fios de Cortiça</h2>
            </div>
            <button id="corkboard-close" class="corkboard-btn">Fechar [ESC] ×</button>
          </header>
          <div class="corkboard-surface">
            <canvas id="corkboard-canvas"></canvas>
            <div id="corkboard-cards" class="corkboard-cards-layer" style="display:flex;gap:16px;flex-wrap:wrap;padding:20px;overflow-y:auto"></div>
          </div>
        </div>
      `;
      document.body.appendChild(this.modal);
      this.canvas = this.modal.querySelector('#corkboard-canvas');
      this.ctx = this.canvas?.getContext('2d');
      this.modal.querySelector('#corkboard-close').onclick = () => this.close();
    }
    render() {
      const cards = this.modal.querySelector('#corkboard-cards');
      if (!cards) return;
      cards.innerHTML = '';
      const list = this.state.evidence.map(id => this.cluesRegistry[id] || {title: id, text: ''});
      if (list.length === 0) {
        cards.innerHTML = '<div style="color:#dcd6be;font-size:15px;padding:20px">Nenhuma evidência recolhida ainda. Fale com Helen perto da delegacia ou inspecione os edifícios.</div>';
        return;
      }
      for (const c of list) {
        const div = document.createElement('div');
        div.className = 'corkboard-card';
        div.style.position = 'relative';
        div.innerHTML = `
          <div class="cork-pin"></div>
          <div class="cork-card-header">${(c.category || 'EVIDÊNCIA').toUpperCase()}</div>
          <div class="cork-card-title">${c.title}</div>
          <div class="cork-card-body">${c.text}</div>
        `;
        cards.appendChild(div);
      }
    }
  }

  // 6. Sistema de Interrogatório
  class InterrogationSystem {
    constructor(state, cluesRegistry, onContradictionProven, achievementSystem) {
      this.state = state; this.cluesRegistry = cluesRegistry;
      this.onContradictionProven = onContradictionProven; this.achievementSystem = achievementSystem;
      this.modal = null;
    }
    start(npc, seedCase) {
      this.npc = npc; this.seedCase = seedCase;
      this.initDOM();
      this.modal.showModal();
      this.render();
    }
    close() { if (this.modal?.open) this.modal.close(); }
    initDOM() {
      if (document.querySelector('#interrogation-dialog')) {
        this.modal = document.querySelector('#interrogation-dialog');
        return;
      }
      this.modal = document.createElement('dialog');
      this.modal.id = 'interrogation-dialog';
      this.modal.className = 'interrogation-dialog';
      this.modal.innerHTML = `
        <div class="interrogation-container">
          <header class="interrogation-header">
            <div>
              <div class="interrogation-eyebrow">SALA DE INTERROGATÓRIO · CONFRONTO DE PROVAS</div>
              <h2 id="interrogation-name">Depoimento</h2>
            </div>
            <button id="interrogation-close" class="corkboard-btn">Encerrar [ESC] ×</button>
          </header>
          <div id="interrogation-body" style="padding: 22px; color: #dcd6be; flex: 1; overflow-y: auto;"></div>
        </div>
      `;
      document.body.appendChild(this.modal);
      this.modal.querySelector('#interrogation-close').onclick = () => this.close();
    }
    render() {
      const body = this.modal.querySelector('#interrogation-body');
      const name = this.modal.querySelector('#interrogation-name');
      if (name) name.textContent = this.npc.name + ' (' + this.npc.personality + ')';
      if (!body) return;
      body.innerHTML = `
        <div style="background:#15222b;padding:14px;border-left:4px solid #48cae4;margin-bottom:18px">
          <strong>Alex Hale:</strong> “Sua versão sobre a noite do dia 15 não se sustenta. O que você realmente sabe sobre Sarah Miller?”
        </div>
        <div style="background:#241c1f;padding:14px;border-right:4px solid #ff758f;margin-bottom:18px">
          <strong>${this.npc.name}:</strong> “Eu já disse tudo o que tinha para dizer à sargento Mercer. Não tenho nada a esconder.”
        </div>
        <h3>Confrontar com Evidências:</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(240px, 1fr));gap:10px;margin-top:10px">
          ${this.state.evidence.map(id => {
            const clue = this.cluesRegistry[id];
            return `<button class="corkboard-btn" style="text-align:left;padding:10px" data-clue="${id}"><b>${clue?.title || id}</b><br><small style="color:#adb5bd">${clue?.category || ''}</small></button>`;
          }).join('') || '<p>Nenhuma evidência no inventário para confrontar.</p>'}
        </div>
      `;
      body.querySelectorAll('[data-clue]').forEach(btn => {
        btn.onclick = () => {
          alert(`Confrontou ${this.npc.name} com: ${btn.querySelector('b').textContent}`);
        };
      });
    }
  }

  // 7. Sistema de Vigilância Discreta
  class TailingSystem {
    constructor(state, achievementSystem, onClandestineMeeting) {
      this.state = state; this.achievementSystem = achievementSystem;
      this.onClandestineMeeting = onClandestineMeeting;
      this.activeTarget = null;
    }
    startTailing(npc) { this.activeTarget = npc; }
    stopTailing() { this.activeTarget = null; }
    update(dt, player, targetPos) {
      if (!this.activeTarget || !targetPos) return;
      const d = Math.hypot(targetPos.x - player.x, targetPos.y - player.y);
      if (d > 350) this.stopTailing();
    }
  }

  // 8. Interface de Diálogos Estilo Neo-Noir com Retratos Procedurais em Canvas
  class DialogueUI {
    constructor(root = document.querySelector('#dialogue')) {
      this.root = root;
      this.portraitWrapper = root?.querySelector('.dialogue-portrait-wrapper');
      this.portraitImg = root?.querySelector('.dialogue-portrait');
      this.speakerName = root?.querySelector('.dialogue-speaker');
      this.speakerRole = root?.querySelector('.dialogue-occupation');
      this.textField = root?.querySelector('.dialogue-text');
      this.choicesContainer = root?.querySelector('.dialogue-choices');
      this.skipButton = root?.querySelector('.dialogue-skip');

      this.active = false;
      this.lines = [];
      this.index = -1;
      this.onClose = null;

      // Typewriter
      this.typewriterTimer = null;
      this.fullText = '';
      this.displayedLength = 0;
      this.isTyping = false;
      this.typingSpeed = 18;

      if (this.skipButton) {
        this.skipButton.onclick = () => this.handleAdvance();
      }

      window.addEventListener('keydown', e => {
        if (!this.active) return;
        if (e.key === 'Escape') {
          this.close();
          return;
        }
        if (this.isTyping && (e.key === ' ' || e.key === 'Enter')) {
          e.preventDefault();
          this.finishTypewriterImmediately();
          return;
        }
        if (!this.isTyping) {
          const num = parseInt(e.key, 10) - 1;
          const currentChoices = this.lines[this.index]?.choices || [];
          if (!isNaN(num) && num >= 0 && num < currentChoices.length) {
            e.preventDefault();
            this.advance(num);
          } else if (e.key === ' ' || e.key === 'Enter') {
            if (!currentChoices.length) {
              e.preventDefault();
              this.advance();
            }
          }
        }
      });
    }

    play(lines, onClose) {
      this.lines = lines;
      this.index = -1;
      this.onClose = onClose;
      this.active = true;
      if (this.root) {
        this.root.hidden = false;
        this.root.classList.add('neo-noir-active');
      }
      this.advance();
    }

    handleAdvance() {
      if (this.isTyping) {
        this.finishTypewriterImmediately();
      } else {
        this.advance();
      }
    }

    advance(choiceIndex = null) {
      if (!this.active) return;
      const prev = this.lines[this.index];
      if (prev?.choices?.length && choiceIndex === null) return;

      if (prev?.choices?.[choiceIndex]?.next != null) {
        this.index = prev.choices[choiceIndex].next;
      } else {
        this.index += 1;
      }

      if (this.index >= this.lines.length) {
        return this.close();
      }

      const line = this.lines[this.index];
      const speakerKey = (line.speaker || 'alex').toLowerCase();

      // Atualiza Metadados do Personagem
      if (this.speakerName) this.speakerName.textContent = line.name || line.speaker?.toUpperCase() || 'ALEX HALE';
      if (this.speakerRole) this.speakerRole.textContent = line.occupation || (global.faceProfiles?.[speakerKey]?.title) || 'CIDADÃO DE NORTHVALE';

      // Atualiza Retrato Pintado Sem Nenhuma Imagem Quebrada
      this.updatePortrait(speakerKey);

      // Inicia Efeito Máquina de Escrever
      this.fullText = line.text || '';
      this.startTypewriter(line.choices || []);
    }

    updatePortrait(speakerKey) {
      if (!this.portraitWrapper) return;
      const getPortrait = global.getCharacterPortrait || global.NorthVale?.getCharacterPortrait;
      if (getPortrait) {
        const pCanvas = getPortrait(speakerKey, 128);
        if (pCanvas) {
          this.portraitWrapper.innerHTML = '';
          pCanvas.className = 'dialogue-portrait';
          pCanvas.style.width = '100%';
          pCanvas.style.height = '100%';
          pCanvas.style.objectFit = 'cover';
          pCanvas.style.display = 'block';
          this.portraitWrapper.appendChild(pCanvas);
          return;
        }
      }
    }

    startTypewriter(choices) {
      if (this.typewriterTimer) clearInterval(this.typewriterTimer);
      this.displayedLength = 0;
      this.isTyping = true;
      if (this.textField) this.textField.textContent = '';
      if (this.choicesContainer) this.choicesContainer.innerHTML = '';
      if (this.skipButton) this.skipButton.textContent = '▶ [Pular animação]';

      this.typewriterTimer = setInterval(() => {
        this.displayedLength++;
        if (this.textField) {
          this.textField.textContent = this.fullText.slice(0, this.displayedLength);
        }
        if (this.displayedLength >= this.fullText.length) {
          this.finishTypewriter(choices);
        }
      }, this.typingSpeed);
    }

    finishTypewriterImmediately() {
      if (this.typewriterTimer) clearInterval(this.typewriterTimer);
      this.displayedLength = this.fullText.length;
      if (this.textField) this.textField.textContent = this.fullText;
      const choices = this.lines[this.index]?.choices || [];
      this.finishTypewriter(choices);
    }

    finishTypewriter(choices) {
      if (this.typewriterTimer) clearInterval(this.typewriterTimer);
      this.isTyping = false;

      if (this.choicesContainer) {
        this.choicesContainer.innerHTML = '';
        for (const [idx, choice] of choices.entries()) {
          const btn = document.createElement('button');
          btn.style.cssText = 'background:#4c1d95;border:1px solid #c084fc;color:#f3e8ff;padding:8px 14px;cursor:pointer;font-weight:bold;margin:4px 0;text-align:left;display:block';
          btn.innerHTML = `<span style="background:#2e1065;padding:2px 6px;margin-right:8px;border-radius:2px">[${idx + 1}]</span> ${choice.label}`;
          btn.onclick = () => this.advance(idx);
          this.choicesContainer.appendChild(btn);
        }
      }

      if (this.skipButton) {
        this.skipButton.textContent = choices.length ? '[Pressione 1, 2... ou clique acima]' : '[Espaço / Enter para continuar]';
      }
    }

    close() {
      if (this.typewriterTimer) clearInterval(this.typewriterTimer);
      this.active = false;
      if (this.root) {
        this.root.hidden = true;
        this.root.classList.remove('neo-noir-active');
      }
      this.onClose?.();
    }
  }

  class DialogueSystem extends DialogueUI {}

  // Exportar para escopo global
  global.NorthVale = global.NorthVale || {};
  Object.assign(global.NorthVale, {
    CULPRIT_ARCHETYPES, KillerGenerator, clues, getFullCluesRegistry, createState,
    collect, serialize, deserialize, SAVE_KEY, readSave,
    ACHIEVEMENTS, AchievementSystem, ENDINGS, EndingsEvaluator,
    CorkboardSystem, InterrogationSystem, TailingSystem, DialogueUI, DialogueSystem
  });

  Object.assign(global, global.NorthVale);
})(typeof window !== 'undefined' ? window : globalThis);
