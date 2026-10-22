// NorthVale — Sombras de 1989
// Neo-Noir Bottom-Anchored Dialogue Interface (22%-25% Viewport Height)
// 96x96 Vintage Analog Frame, Typewriter Effect, Electric Purple Highlights, Numbered Choices.

const PORTRAITS = {
  alex: '/assets/portraits/alex_portrait.png',
  ruth: '/assets/portraits/ruth_portrait.png',
  helen: '/assets/portraits/suspeito_portrait.png',
  elias: '/assets/portraits/suspeito_portrait.png',
  viktor: '/assets/portraits/suspeito_portrait.png',
  bobby: '/assets/portraits/suspeito_portrait.png',
  clara: '/assets/portraits/suspeito_portrait.png',
  sam: '/assets/portraits/suspeito_portrait.png',
  suspect: '/assets/portraits/suspeito_portrait.png'
};

const OCCUPATIONS = {
  alex: 'DETETIVE CONSULTOR · DELEGACIA DE NORTHVALE',
  ruth: 'XERIFE DO CONDADO · CHEFE DE INVESTIGAÇÃO',
  helen: 'MÃE DE SARAH · COSTUREIRA MUNICIPAL',
  elias: 'FARMACÊUTICO · PROPRIETÁRIO DA FARMÁCIA VALE',
  viktor: 'EMPRESÁRIO INDUSTRIAL · FRIGORÍFICO SLOANE',
  bobby: 'ENVOLVIDO NO CASO DA VIATURA 04',
  clara: 'OFICIAL DE REGISTRO · CARTÓRIO DE IMÓVEIS',
  sam: 'MECÂNICO E SERRALHEIRO DO FERRO-VELHO',
  suspect: 'TESTEMUNHA SOB VIGILÂNCIA'
};

export class DialogueUI {
  constructor(root = document.querySelector('#dialogue')) {
    this.root = root;
    this.portrait = root?.querySelector('.dialogue-portrait');
    this.speakerName = root?.querySelector('.dialogue-speaker');
    this.speakerRole = root?.querySelector('.dialogue-occupation');
    this.textField = root?.querySelector('.dialogue-text');
    this.choicesContainer = root?.querySelector('.dialogue-choices');
    this.skipButton = root?.querySelector('.dialogue-skip');

    this.active = false;
    this.lines = [];
    this.index = -1;
    this.onClose = null;

    // Typewriter state
    this.typewriterTimer = null;
    this.fullText = '';
    this.displayedLength = 0;
    this.isTyping = false;
    this.typingSpeed = 22; // ms per char

    if (this.skipButton) {
      this.skipButton.onclick = () => this.handleAdvance();
    }

    // Keyboard Hotkey Listener for Choices (1, 2, 3...) and Advance (Space/Enter)
    this.keydownHandler = (e) => {
      if (!this.active) return;
      const key = e.key;
      if (key === 'Escape') {
        this.close();
        return;
      }
      if (this.isTyping && (key === ' ' || key === 'Enter')) {
        e.preventDefault();
        this.finishTypewriterImmediately();
        return;
      }
      if (!this.isTyping) {
        const choiceIdx = parseInt(key, 10) - 1;
        const currentChoices = this.lines[this.index]?.choices || [];
        if (!isNaN(choiceIdx) && choiceIdx >= 0 && choiceIdx < currentChoices.length) {
          e.preventDefault();
          this.advance(choiceIdx);
        } else if (key === ' ' || key === 'Enter') {
          if (!currentChoices.length) {
            e.preventDefault();
            this.handleAdvance();
          }
        }
      }
    };
    // Keyboard input is routed by the host InputManager.
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

    const previous = this.lines[this.index];
    if (previous?.choices?.length && choiceIndex === null) {
      // Waiting for player choice selection
      return;
    }

    if (previous?.choices?.[choiceIndex]?.next != null) {
      this.index = previous.choices[choiceIndex].next;
    } else {
      this.index += 1;
    }

    if (this.index >= this.lines.length) {
      return this.close();
    }

    const line = this.lines[this.index];
    const speakerKey = (line.speaker || 'alex').toLowerCase();

    // Speaker meta
    if (this.speakerName) this.speakerName.textContent = line.name || line.speaker?.toUpperCase() || 'ALEX HALE';
    if (this.speakerRole) this.speakerRole.textContent = line.occupation || OCCUPATIONS[speakerKey] || '';

    // Portrait
    if (this.portrait) {
      this.portrait.src = PORTRAITS[speakerKey] || PORTRAITS.alex;
      this.portrait.alt = `Retrato de ${line.name || line.speaker}`;
    }

    // Typewriter text start
    this.fullText = line.text || '';
    this.startTypewriter(line.choices || []);
  }

  startTypewriter(choices) {
    if (this.typewriterTimer) clearInterval(this.typewriterTimer);
    this.displayedLength = 0;
    this.isTyping = true;
    if (this.textField) this.textField.textContent = '';
    if (this.choicesContainer) this.choicesContainer.replaceChildren();
    if (this.skipButton) this.skipButton.textContent = '▶ [Espaço para pular]';

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

    // Render choice buttons with numbered prefixes (1, 2, 3...)
    if (this.choicesContainer) {
      this.choicesContainer.replaceChildren();
      for (const [index, choice] of choices.entries()) {
        const btn = document.createElement('button');
        btn.className = 'neo-choice-btn';
        btn.innerHTML = `<span class="choice-num">${index + 1}</span> ${choice.label}`;
        btn.onclick = () => this.advance(index);
        this.choicesContainer.append(btn);
      }
    }

    if (this.skipButton) {
      this.skipButton.textContent = choices.length ? '[Selecione 1, 2 ou clique]' : '[Espaço / Enter para continuar]';
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

  destroy() {
    window.removeEventListener('keydown', this.keydownHandler);
    this.close();
  }
}
