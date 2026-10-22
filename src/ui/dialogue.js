const PORTRAITS = {
  alex: '/assets/portraits/alex_portrait.png',
  ruth: '/assets/portraits/ruth_portrait.png',
  suspect: '/assets/portraits/suspeito_portrait.png',
};

export class DialogueSystem {
  constructor(root = document.querySelector('#dialogue')) {
    this.root = root;
    this.portrait = root.querySelector('.dialogue-portrait');
    this.name = root.querySelector('.dialogue-speaker');
    this.text = root.querySelector('.dialogue-text');
    this.choices = root.querySelector('.dialogue-choices');
    this.skip = root.querySelector('.dialogue-skip');
    this.active = false;
    this.skip.onclick = () => this.advance(null);
  }

  play(lines, onClose) {
    this.lines = lines;
    this.index = -1;
    this.onClose = onClose;
    this.active = true;
    this.root.hidden = false;
    this.advance();
  }

  advance(choiceIndex = null) {
    if (!this.active) return;
    const previous = this.lines[this.index];
    if (previous?.choices?.length && choiceIndex == null) return;
    if (previous?.choices?.[choiceIndex]?.next != null) this.index = previous.choices[choiceIndex].next;
    else this.index += 1;
    if (this.index >= this.lines.length) return this.close();
    const line = this.lines[this.index];
    this.name.textContent = line.name;
    this.text.textContent = line.text;
    this.portrait.src = PORTRAITS[line.speaker] || PORTRAITS.alex;
    this.portrait.alt = `Retrato ilustrado de ${line.name}`;
    this.choices.replaceChildren();
    for (const [index, choice] of (line.choices || []).entries()) {
      const button = document.createElement('button');
      button.textContent = choice.label;
      button.onclick = () => this.advance(index);
      this.choices.append(button);
    }
    this.skip.textContent = line.choices?.length ? '[Escolha uma resposta]' : '[Espaço para continuar]';
  }

  close() {
    this.active = false;
    this.root.hidden = true;
    this.onClose?.();
  }
}
