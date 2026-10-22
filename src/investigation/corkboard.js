// Interactive Corkboard System for NorthVale — Sombras de 1989
// Canvas & DOM drag-and-drop corkboard with red string (linha vermelha) connections, pin nodes, and logical deduction unlocking.

export class CorkboardSystem {
  constructor(state, cluesRegistry, onDeductionUnlocked, achievementSystem) {
    this.state = state;
    this.cluesRegistry = cluesRegistry;
    this.onDeductionUnlocked = onDeductionUnlocked;
    this.achievementSystem = achievementSystem;

    this.state.corkboardNodes ??= {}; // clueId -> {x, y}
    this.state.corkboardLinks ??= []; // [[idA, idB]]
    this.state.corkboardDeductions ??= []; // [deductionId]

    this.modal = null;
    this.canvas = null;
    this.ctx = null;
    this.activePin = null;
    this.draggingNode = null;
    this.dragOffset = {x: 0, y: 0};
    this.mousePos = {x: 0, y: 0};
  }

  open() {
    this.initDOM();
    this.modal.showModal();
    this.syncNodes();
    this.render();
  }

  close() {
    if (this.modal && this.modal.open) {
      this.modal.close();
    }
  }

  initDOM() {
    if (document.querySelector('#corkboard-dialog')) {
      this.modal = document.querySelector('#corkboard-dialog');
      this.canvas = this.modal.querySelector('#corkboard-canvas');
      this.ctx = this.canvas.getContext('2d');
      this.setupCanvasSize();
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
          <div class="corkboard-controls">
            <span class="corkboard-tip">Clique em um alfinete vermelho e depois em outro para traçar a linha. Arraste as fotos para organizar.</span>
            <button id="corkboard-clear-strings" class="corkboard-btn">Limpar Linhas</button>
            <button id="corkboard-close" class="corkboard-btn corkboard-close-btn">Fechar [ESC] ×</button>
          </div>
        </header>

        <div class="corkboard-surface" id="corkboard-surface">
          <canvas id="corkboard-canvas"></canvas>
          <div class="corkboard-cards-layer" id="corkboard-cards"></div>
        </div>

        <footer class="corkboard-footer">
          <div id="corkboard-deductions-list" class="corkboard-deductions-list">
            <strong>Deduções Confirmadas:</strong>
            <span id="deductions-count">Nenhuma hipótese consolidada ainda.</span>
          </div>
        </footer>
      </div>
    `;

    document.body.appendChild(this.modal);
    this.canvas = this.modal.querySelector('#corkboard-canvas');
    this.ctx = this.canvas.getContext('2d');

    this.modal.querySelector('#corkboard-close').onclick = () => this.close();
    this.modal.querySelector('#corkboard-clear-strings').onclick = () => {
      this.state.corkboardLinks = [];
      this.render();
    };

    window.addEventListener('resize', () => {
      if (this.modal.open) {
        this.setupCanvasSize();
        this.render();
      }
    });

    const surface = this.modal.querySelector('#corkboard-surface');
    surface.addEventListener('mousemove', e => {
      const rect = surface.getBoundingClientRect();
      this.mousePos = {x: e.clientX - rect.left, y: e.clientY - rect.top};
      if (this.activePin) {
        this.render();
      }
    });

    this.setupCanvasSize();
  }

  setupCanvasSize() {
    const surface = this.modal.querySelector('#corkboard-surface');
    if (!surface) return;
    const rect = surface.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
  }

  syncNodes() {
    const layer = this.modal.querySelector('#corkboard-cards');
    layer.replaceChildren();

    const evidenceList = this.state.evidence || [];
    const surface = this.modal.querySelector('#corkboard-surface');
    const bounds = surface.getBoundingClientRect();

    // Default positioning if not already placed
    evidenceList.forEach((id, index) => {
      if (!this.state.corkboardNodes[id]) {
        const col = index % 4;
        const row = Math.floor(index / 4);
        this.state.corkboardNodes[id] = {
          x: 40 + col * 220 + (index % 2) * 20,
          y: 40 + row * 190 + (index % 3) * 15,
          rotation: ((index * 37) % 11 - 5)
        };
      }
    });

    // Create cards for each collected evidence
    evidenceList.forEach(id => {
      const clue = this.cluesRegistry[id] || {title: id, text: 'Documento não identificado.'};
      const pos = this.state.corkboardNodes[id];

      const card = document.createElement('div');
      card.className = `corkboard-card corkboard-card-${clue.category || 'note'}`;
      card.id = `cork-card-${id}`;
      card.style.left = `${pos.x}px`;
      card.style.top = `${pos.y}px`;
      card.style.transform = `rotate(${pos.rotation || 0}deg)`;

      card.innerHTML = `
        <div class="cork-pin" data-id="${id}" title="Alfinete de conexão"></div>
        <div class="cork-card-header">${clue.category?.toUpperCase() || 'DOCUMENTO'}</div>
        <div class="cork-card-title">${clue.title}</div>
        <div class="cork-card-body">${clue.text}</div>
      `;

      // Draggable logic
      card.addEventListener('mousedown', e => {
        if (e.target.classList.contains('cork-pin')) return;
        this.draggingNode = id;
        this.dragOffset = {
          x: e.clientX - pos.x,
          y: e.clientY - pos.y
        };
        card.classList.add('is-dragging');
        e.preventDefault();
      });

      // Pin connection logic
      const pin = card.querySelector('.cork-pin');
      pin.addEventListener('click', e => {
        e.stopPropagation();
        this.handlePinClick(id);
      });

      layer.appendChild(card);
    });

    // Global drag handlers on surface
    const surfaceElem = this.modal.querySelector('#corkboard-surface');
    surfaceElem.onmousemove = e => {
      if (!this.draggingNode) return;
      const card = document.querySelector(`#cork-card-${this.draggingNode}`);
      const pos = this.state.corkboardNodes[this.draggingNode];
      pos.x = Math.max(10, Math.min(surfaceElem.clientWidth - 200, e.clientX - this.dragOffset.x));
      pos.y = Math.max(10, Math.min(surfaceElem.clientHeight - 160, e.clientY - this.dragOffset.y));
      if (card) {
        card.style.left = `${pos.x}px`;
        card.style.top = `${pos.y}px`;
      }
      this.render();
    };

    surfaceElem.onmouseup = () => {
      if (this.draggingNode) {
        const card = document.querySelector(`#cork-card-${this.draggingNode}`);
        card?.classList.remove('is-dragging');
        this.draggingNode = null;
      }
    };

    this.updateDeductionsUI();
  }

  handlePinClick(id) {
    if (!this.activePin) {
      this.activePin = id;
      const card = document.querySelector(`#cork-card-${id}`);
      card?.querySelector('.cork-pin')?.classList.add('pin-active');
    } else {
      if (this.activePin !== id) {
        this.connectNodes(this.activePin, id);
      }
      const prevCard = document.querySelector(`#cork-card-${this.activePin}`);
      prevCard?.querySelector('.cork-pin')?.classList.remove('pin-active');
      this.activePin = null;
    }
    this.render();
  }

  connectNodes(a, b) {
    const exists = this.state.corkboardLinks.some(
      pair => (pair[0] === a && pair[1] === b) || (pair[0] === b && pair[1] === a)
    );
    if (!exists) {
      this.state.corkboardLinks.push([a, b]);
      this.achievementSystem?.unlock('red_string_master');
      this.evaluateDeductions();
    }
  }

  evaluateDeductions() {
    if (!this.state.case?.deductions) return;

    for (const deduction of this.state.case.deductions) {
      if (this.state.corkboardDeductions.includes(deduction.id)) continue;

      // Check if all pairs in the requiredClueIds are interconnected
      const req = deduction.requiredClueIds;
      const hasAllClues = req.every(id => (this.state.evidence || []).includes(id));
      if (!hasAllClues) continue;

      let isConnected = true;
      for (let i = 0; i < req.length - 1; i++) {
        const a = req[i];
        const b = req[i + 1];
        const pairConnected = this.state.corkboardLinks.some(
          pair => (pair[0] === a && pair[1] === b) || (pair[0] === b && pair[1] === a)
        );
        if (!pairConnected) {
          isConnected = false;
          break;
        }
      }

      if (isConnected) {
        this.state.corkboardDeductions.push(deduction.id);
        this.onDeductionUnlocked?.(deduction);
        this.achievementSystem?.unlock('master_deducer');
      }
    }

    this.updateDeductionsUI();
  }

  updateDeductionsUI() {
    const list = this.modal.querySelector('#corkboard-deductions-list');
    if (!list) return;

    if (!this.state.corkboardDeductions?.length) {
      list.innerHTML = `<strong>Deduções Confirmadas:</strong> <span class="muted">Nenhuma hipótese consolidada. Conecte pistas relacionadas com a linha vermelha.</span>`;
      return;
    }

    const deductionsHtml = this.state.corkboardDeductions.map(id => {
      const deduction = this.state.case?.deductions?.find(d => d.id === id);
      return deduction ? `
        <div class="corkboard-deduction-item">
          <span class="deduction-badge">HIPÓTESE RESOLVIDA</span>
          <strong>${deduction.title}:</strong> ${deduction.unlockedHypothesis}
        </div>
      ` : '';
    }).join('');

    list.innerHTML = `<strong>Deduções Consolidadas:</strong>${deductionsHtml}`;
  }

  render() {
    const c = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    c.clearRect(0, 0, w, h);

    // Draw all active red strings
    for (const [idA, idB] of this.state.corkboardLinks) {
      const posA = this.state.corkboardNodes[idA];
      const posB = this.state.corkboardNodes[idB];
      if (!posA || !posB) continue;

      const p1 = {x: posA.x + 90, y: posA.y + 12};
      const p2 = {x: posB.x + 90, y: posB.y + 12};
      this.drawRedString(c, p1, p2);
    }

    // Draw temporary string while dragging active pin
    if (this.activePin) {
      const posA = this.state.corkboardNodes[this.activePin];
      if (posA) {
        const p1 = {x: posA.x + 90, y: posA.y + 12};
        this.drawRedString(c, p1, this.mousePos, true);
      }
    }
  }

  drawRedString(c, p1, p2, isDraft = false) {
    const midX = (p1.x + p2.x) / 2;
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const sag = Math.min(45, dist * 0.08); // Catenary sag effect
    const midY = (p1.y + p2.y) / 2 + sag;

    // Drop shadow
    c.save();
    c.strokeStyle = 'rgba(0, 0, 0, 0.45)';
    c.lineWidth = 2.5;
    c.beginPath();
    c.moveTo(p1.x + 2, p1.y + 4);
    c.quadraticCurveTo(midX + 2, midY + 4, p2.x + 2, p2.y + 4);
    c.stroke();

    // Red cord
    c.strokeStyle = isDraft ? '#ff6b6b' : '#c91818';
    c.lineWidth = isDraft ? 2 : 2.8;
    c.beginPath();
    c.moveTo(p1.x, p1.y);
    c.quadraticCurveTo(midX, midY, p2.x, p2.y);
    c.stroke();
    c.restore();
  }
}
