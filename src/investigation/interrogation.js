// Interrogation with Evidence Confrontation System for NorthVale — Sombras de 1989
// Dynamic questioning, nervousness (0-100%) and hostility (0-100%) meters, and evidence confrontation.

export class InterrogationSystem {
  constructor(state, cluesRegistry, onContradictionProven, achievementSystem) {
    this.state = state;
    this.cluesRegistry = cluesRegistry;
    this.onContradictionProven = onContradictionProven;
    this.achievementSystem = achievementSystem;

    this.activeSuspect = null;
    this.dialogueHistory = [];
    this.modal = null;

    // Track states per suspect
    this.state.suspectMoods ??= {};
  }

  getSuspectMood(npcId) {
    if (!this.state.suspectMoods[npcId]) {
      this.state.suspectMoods[npcId] = {
        nervousness: 15,
        hostility: 10,
        broken: false,
        clammed: false
      };
    }
    return this.state.suspectMoods[npcId];
  }

  start(npc, seedCase) {
    this.activeSuspect = npc;
    this.seedCase = seedCase;
    this.initDOM();
    this.modal.showModal();
    this.render();
  }

  close() {
    if (this.modal && this.modal.open) {
      this.modal.close();
    }
  }

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
          <div class="interrogation-suspect-profile">
            <div id="interrogation-portrait-wrap"></div>
            <div>
              <div class="interrogation-eyebrow">SALA DE INTERROGATÓRIO · CONFRONTO DE PROVAS</div>
              <h2 id="interrogation-name">NOME DO SUSPEITO</h2>
              <div id="interrogation-title" class="interrogation-title">CARGO / VÍNCULO</div>
            </div>
          </div>
          <button id="interrogation-close" class="corkboard-btn corkboard-close-btn">Encerrar [ESC] ×</button>
        </header>

        <div class="interrogation-gauges">
          <div class="gauge-container">
            <div class="gauge-label">
              <span>NERVOSISMO</span>
              <strong id="nervousness-val">15%</strong>
            </div>
            <div class="gauge-bar"><div id="nervousness-fill" class="gauge-fill nervousness-fill"></div></div>
            <small id="nervousness-desc">Calmo e evasivo</small>
          </div>

          <div class="gauge-container">
            <div class="gauge-label">
              <span>HOSTILIDADE</span>
              <strong id="hostility-val">10%</strong>
            </div>
            <div class="gauge-bar"><div id="hostility-fill" class="gauge-fill hostility-fill"></div></div>
            <small id="hostility-desc">Cooperativo com cautela</small>
          </div>
        </div>

        <div class="interrogation-transcript" id="interrogation-transcript"></div>

        <footer class="interrogation-footer">
          <div class="interrogation-actions">
            <button id="btn-ask-alibi" class="dialogue-choice-btn">Perguntar sobre o álibi de 15/10</button>
            <button id="btn-ask-sarah" class="dialogue-choice-btn">Perguntar sobre Sarah Miller</button>
            <button id="btn-confront-evidence" class="dialogue-choice-btn btn-confront">Confrontar com Evidência 📁</button>
          </div>
          <div id="interrogation-evidence-drawer" class="evidence-drawer" hidden>
            <div class="evidence-drawer-header">
              <span>Selecione uma prova material para apresentar:</span>
              <button id="btn-close-drawer">Fechar Gaveta ×</button>
            </div>
            <div id="evidence-drawer-list" class="evidence-drawer-list"></div>
          </div>
        </footer>
      </div>
    `;

    document.body.appendChild(this.modal);
    this.modal.querySelector('#interrogation-close').onclick = () => this.close();
    this.modal.querySelector('#btn-close-drawer').onclick = () => {
      this.modal.querySelector('#interrogation-evidence-drawer').hidden = true;
    };

    this.modal.querySelector('#btn-ask-alibi').onclick = () => this.askAlibi();
    this.modal.querySelector('#btn-ask-sarah').onclick = () => this.askSarah();
    this.modal.querySelector('#btn-confront-evidence').onclick = () => this.toggleEvidenceDrawer();
  }

  render() {
    if (!this.activeSuspect) return;
    const mood = this.getSuspectMood(this.activeSuspect.id);

    this.modal.querySelector('#interrogation-name').textContent = this.activeSuspect.name;
    this.modal.querySelector('#interrogation-title').textContent = this.activeSuspect.personality || 'Cidadão de NorthVale';

    const portraitWrap = this.modal.querySelector('#interrogation-portrait-wrap');
    portraitWrap.innerHTML = `<canvas class="portrait" data-face="${this.activeSuspect.id}" width="96" height="96"></canvas>`;

    // Update gauge fills
    const nFill = this.modal.querySelector('#nervousness-fill');
    const hFill = this.modal.querySelector('#hostility-fill');
    const nVal = this.modal.querySelector('#nervousness-val');
    const hVal = this.modal.querySelector('#hostility-val');

    nFill.style.width = `${mood.nervousness}%`;
    hFill.style.width = `${mood.hostility}%`;
    nVal.textContent = `${mood.nervousness}%`;
    hVal.textContent = `${mood.hostility}%`;

    const nDesc = this.modal.querySelector('#nervousness-desc');
    const hDesc = this.modal.querySelector('#hostility-desc');

    nDesc.textContent = mood.nervousness >= 80 ? 'DESESTABILIZADO / À BEIRA DA CONFISSÃO' :
                        mood.nervousness >= 50 ? 'Inquieto, sudorese visível e hesitação' : 'Calmo e no controle';

    hDesc.textContent = mood.hostility >= 85 ? 'EM FÚRIA / RECUSA A FALAR' :
                        mood.hostility >= 50 ? 'Defensivo e hostil à investigação' : 'Cooperativo com cautela';

    // Populate drawer with collected evidence
    const drawerList = this.modal.querySelector('#evidence-drawer-list');
    drawerList.replaceChildren();

    const collected = this.state.evidence || [];
    if (!collected.length) {
      drawerList.innerHTML = '<span class="muted">Nenhuma prova material no inventário.</span>';
    } else {
      collected.forEach(clueId => {
        const clue = this.cluesRegistry[clueId];
        if (!clue) return;
        const btn = document.createElement('button');
        btn.className = 'evidence-item-btn';
        btn.innerHTML = `<strong>${clue.title}</strong><small>${clue.category || 'PROVA'}</small>`;
        btn.onclick = () => this.confrontClue(clueId);
        drawerList.appendChild(btn);
      });
    }

    if (!this.dialogueHistory.length) {
      this.addLog('alex', 'Alex Hale', `Sente-se, ${this.activeSuspect.name}. Gostaria de repassar alguns fatos sobre o dia do desaparecimento.`);
      this.addLog('suspect', this.activeSuspect.name, 'Não tenho muito a dizer além do que já disse à Ruth. A cidade inteira já virou essa página, detetive.');
    }
  }

  addLog(speaker, name, text, isContradiction = false) {
    const transcript = this.modal.querySelector('#interrogation-transcript');
    const line = document.createElement('div');
    line.className = `transcript-line transcript-${speaker} ${isContradiction ? 'transcript-breakthrough' : ''}`;
    line.innerHTML = `
      <div class="transcript-meta">${name}</div>
      <div class="transcript-text">${text}</div>
    `;
    transcript.appendChild(line);
    transcript.scrollTop = transcript.scrollHeight;
  }

  askAlibi() {
    const mood = this.getSuspectMood(this.activeSuspect.id);
    if (mood.hostility >= 90) {
      this.addLog('suspect', this.activeSuspect.name, 'Já disse que não respondo mais nada sem um procurador presente. Guarde suas perguntas para quem se importa.');
      return;
    }

    this.addLog('alex', 'Alex Hale', 'Onde exatamente você estava entre as 18h e 22h no dia 15 de outubro durante o pico da tempestade?');

    // Case specific responses
    if (this.seedCase && this.activeSuspect.id === this.seedCase.culpritId) {
      this.addLog('suspect', this.activeSuspect.name, this.seedCase.falseAlibi.claim);
      mood.nervousness = Math.min(100, mood.nervousness + 5);
    } else if (this.seedCase?.lyingWitness?.npcId === this.activeSuspect.id) {
      this.addLog('suspect', this.activeSuspect.name, `Eu... confirmo o que ouvi. Sarah parecia perturbada e disse que ia embora. Estava chovendo demais para qualquer outra coisa.`);
      mood.nervousness = Math.min(100, mood.nervousness + 10);
    } else {
      this.addLog('suspect', this.activeSuspect.name, 'Estava cumprindo minha rotina habitual. Não tenho nada a esconder da polícia.');
    }

    this.render();
  }

  askSarah() {
    const mood = this.getSuspectMood(this.activeSuspect.id);
    if (mood.hostility >= 90) {
      this.addLog('suspect', this.activeSuspect.name, 'Cansei dessa obsessão. Sarah Miller foi embora porque quis. Pergunte à xerife.');
      return;
    }

    this.addLog('alex', 'Alex Hale', 'Qual era a sua relação real com Sarah Miller? Ela confiaria algo a você antes de desaparecer?');
    if (this.activeSuspect.id === 'helen') {
      this.addLog('suspect', 'Helen Miller', 'Sarah era tudo o que eu tinha, detetive. Ela não fugiria. Estava investigando algo terrível nesta cidade.');
    } else if (this.activeSuspect.id === 'ruth') {
      this.addLog('suspect', 'Xerife Ruth Mercer', 'Sarah era uma garota impulsiva, Hale. Cedo ou tarde NorthVale sufoca os mais jovens. Deixe isso de lado.');
    } else {
      this.addLog('suspect', this.activeSuspect.name, 'Eu a via pela cidade. NorthVale é pequena. Nada além disso.');
    }
    this.render();
  }

  toggleEvidenceDrawer() {
    const drawer = this.modal.querySelector('#interrogation-evidence-drawer');
    drawer.hidden = !drawer.hidden;
  }

  confrontClue(clueId) {
    this.modal.querySelector('#interrogation-evidence-drawer').hidden = true;
    const clue = this.cluesRegistry[clueId];
    const mood = this.getSuspectMood(this.activeSuspect.id);

    this.addLog('alex', 'Alex Hale', `[APRESENTA: ${clue.title.toUpperCase()}] Explique como isso se encaixa na sua versão dos fatos.`);

    let isContradiction = false;

    // Check if clue contradicts this suspect
    if (this.seedCase && this.activeSuspect.id === this.seedCase.culpritId) {
      const targetClue = this.seedCase.falseAlibi.contradictionClue;
      if (clueId === targetClue || clue.corkboardTags?.includes(this.activeSuspect.id)) {
        isContradiction = true;
      }
    } else if (this.seedCase?.lyingWitness?.npcId === this.activeSuspect.id) {
      if (clue.corkboardTags?.includes(this.activeSuspect.id) || clue.corkboardTags?.includes('quimico') || clue.corkboardTags?.includes('alibi')) {
        isContradiction = true;
      }
    }

    if (isContradiction) {
      mood.nervousness = Math.min(100, mood.nervousness + 35);
      mood.hostility = Math.max(0, mood.hostility - 10);

      this.addLog('suspect', this.activeSuspect.name, `O que... onde você conseguiu isso?! Essa evidência não deveria... quer dizer... isso não prova nada!`, true);

      if (mood.nervousness >= 80) {
        mood.broken = true;
        this.addLog('suspect', this.activeSuspect.name, `[QUEBRA DE POSTURA] Chega! Eu falo! Não vou carregar a culpa inteira por esse pesadelo. ${this.seedCase.solutionSummary}`, true);
        this.achievementSystem?.unlock('breakthrough');
        this.onContradictionProven?.(this.activeSuspect.id, clueId);
      }
    } else {
      mood.hostility = Math.min(100, mood.hostility + 25);
      mood.nervousness = Math.max(0, mood.nervousness - 10);
      this.addLog('suspect', this.activeSuspect.name, `Isso não tem qualquer relação comigo, Hale. Você está atirando no escuro e desperdiçando meu tempo.`);
    }

    this.render();
  }
}
