// Achievement System for NorthVale — Sombras de 1989
// Rich black, off-white and electric purple noir UI notifications, tracking normal, hard and secret achievements.

export const ACHIEVEMENTS = [
  {
    id: 'first_trace',
    title: 'Primeiro Rastro',
    desc: 'Colete sua primeira evidência documental ou física em NorthVale.',
    icon: '🔍',
    category: 'normal',
    secret: false
  },
  {
    id: 'night_wanderer',
    title: 'Madrugada em NorthVale',
    desc: 'Explore as ruas encharcadas entre as 02:00 e as 04:00 da manhã.',
    icon: '🌙',
    category: 'hard',
    secret: false
  },
  {
    id: 'silent_shadow',
    title: 'Fantasma na Chuva',
    desc: 'Conclua uma perseguição discreta a um suspeito sem elevar o alerta acima de 20%.',
    icon: '👣',
    category: 'hard',
    secret: false
  },
  {
    id: 'red_string_master',
    title: 'Fios do Destino',
    desc: 'Conecte sua primeira dedução lógica correta no quadro de cortiça.',
    icon: '🧶',
    category: 'normal',
    secret: false
  },
  {
    id: 'breakthrough',
    title: 'Contra a Parede',
    desc: 'Eleve o nervosismo de um suspeito a mais de 80% confrontando contradições reais.',
    icon: '⚡',
    category: 'hard',
    secret: false
  },
  {
    id: 'deep_waters',
    title: 'Segredos Submersos',
    desc: 'Investigue a Estação da Represa à noite e encontre pistas nas turbinas.',
    icon: '🌊',
    category: 'secret',
    secret: true
  },
  {
    id: 'fever_mind',
    title: 'Espiral de Paranoia',
    desc: 'Atinja mais de 75% no nível de Obsessão/Paranoia do detetive Alex Hale.',
    icon: '🧠',
    category: 'hard',
    secret: false
  },
  {
    id: 'master_deducer',
    title: 'Mente Sintética',
    desc: 'Desbloqueie todas as deduções e feche o dossiê conclusivo no quadro de cortiça.',
    icon: '📌',
    category: 'hard',
    secret: false
  },
  {
    id: 'iron_will',
    title: 'Mãos Limpas',
    desc: 'Recuse subornos e mantenha integridade moral inabalável diante dos conspiradores.',
    icon: '⚖️',
    category: 'secret',
    secret: true
  },
  {
    id: 'rain_veteran',
    title: 'O Som do Dilúvio',
    desc: 'Passe 24 horas in-game a pé sob a chuva torrencial sem entrar na viatura.',
    icon: '🌧️',
    category: 'normal',
    secret: false
  },
  {
    id: 'all_doors_open',
    title: 'Chaveiro da Cidade',
    desc: 'Destranque pelo menos 4 portas ou gavetas trancadas em diferentes interiores.',
    icon: '🗝️',
    category: 'normal',
    secret: false
  },
  {
    id: 'speed_of_light',
    title: 'Corrida Contra o Silêncio',
    desc: 'Reúna o dossiê final contra o assassino em menos de 48 horas in-game.',
    icon: '⏱️',
    category: 'secret',
    secret: true
  },
  {
    id: 'truth_of_sarah',
    title: 'Sombras de 1989',
    desc: 'Descubra o destino final de Sarah Miller e confronte o verdadeiro culpado da seed.',
    icon: '🕯️',
    category: 'hard',
    secret: false
  }
];

export class AchievementSystem {
  constructor(state, onToast = null) {
    this.state = state;
    this.state.achievements ??= [];
    this.onToast = onToast;
    this.notificationContainer = null;
    this.initDOM();
  }

  initDOM() {
    let container = document.querySelector('#achievement-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'achievement-toast-container';
      container.className = 'achievement-toast-container';
      document.body.appendChild(container);
    }
    this.notificationContainer = container;
  }

  has(id) {
    return this.state.achievements.includes(id);
  }

  unlock(id) {
    if (this.has(id)) return false;
    const def = ACHIEVEMENTS.find(a => a.id === id);
    if (!def) return false;

    this.state.achievements.push(id);
    this.showPopup(def);
    return true;
  }

  showPopup(def) {
    const toast = document.createElement('div');
    toast.className = 'achievement-popup';
    toast.innerHTML = `
      <div class="achievement-icon-box">${def.icon}</div>
      <div class="achievement-content">
        <div class="achievement-eyebrow">CONQUISTA DESBLOQUEADA</div>
        <div class="achievement-title">${def.title}</div>
        <div class="achievement-desc">${def.desc}</div>
      </div>
    `;

    this.notificationContainer.appendChild(toast);

    // Fade out and remove after 4.8 seconds
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 600);
    }, 4800);
  }

  checkTime(minute, day) {
    const hour = Math.floor(minute / 60) % 24;
    if (hour >= 2 && hour < 4) {
      this.unlock('night_wanderer');
    }
    if (day > 1 && !this.state.driving && this.state.footTime >= 1440) {
      this.unlock('rain_veteran');
    }
  }

  checkObsession(obsession) {
    if (obsession >= 75) {
      this.unlock('fever_mind');
    }
  }

  checkInterrogation(nervousness) {
    if (nervousness >= 80) {
      this.unlock('breakthrough');
    }
  }

  renderListHTML() {
    const unlockedCount = this.state.achievements.length;
    const totalCount = ACHIEVEMENTS.length;
    return `
      <div class="achievements-panel">
        <small>NORTHVALE 1989 · REGISTRO PESSOAL</small>
        <h2>Conquistas & Feitos (${unlockedCount}/${totalCount})</h2>
        <div class="achievements-progress-bar">
          <div class="achievements-progress-fill" style="width: ${(unlockedCount / totalCount) * 100}%"></div>
        </div>
        <div class="achievements-grid">
          ${ACHIEVEMENTS.map(ach => {
            const isUnlocked = this.has(ach.id);
            const isSecret = ach.secret && !isUnlocked;
            return `
              <div class="achievement-card ${isUnlocked ? 'unlocked' : 'locked'} ${ach.secret ? 'secret' : ''}">
                <div class="achievement-card-icon">${isUnlocked ? ach.icon : isSecret ? '❓' : '🔒'}</div>
                <div class="achievement-card-info">
                  <div class="achievement-card-title">${isSecret ? 'Conquista Oculta' : ach.title}</div>
                  <div class="achievement-card-desc">${isSecret ? 'Condição confidencial a ser descoberta em NorthVale.' : ach.desc}</div>
                  <div class="achievement-card-status">${isUnlocked ? '✓ Desbloqueada' : 'Pendente'}</div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }
}
