// Discrete Tailing / Stalking System for NorthVale — Sombras de 1989
// Stealth tracking with vision cones, distance sweet-spots, dynamic alertness gauge, and clandestine rendezvous triggers.

export class TailingSystem {
  constructor(state, achievementSystem, onClandestineMeetingWitnessed) {
    this.state = state;
    this.achievementSystem = achievementSystem;
    this.onClandestineMeetingWitnessed = onClandestineMeetingWitnessed;

    this.activeTarget = null;
    this.alertLevel = 0; // 0 to 100%
    this.tailProgress = 0; // 0 to 100%
    this.hudElement = null;
    this.maxAlertRecorded = 0;

    this.initDOM();
  }

  initDOM() {
    let hud = document.querySelector('#tailing-hud');
    if (!hud) {
      hud = document.createElement('div');
      hud.id = 'tailing-hud';
      hud.className = 'tailing-hud';
      hud.hidden = true;
      hud.innerHTML = `
        <div class="tailing-header">
          <span class="tailing-badge">MODO VIGILÂNCIA DISCRETA</span>
          <strong id="tailing-target-name">ALVO</strong>
        </div>
        <div class="tailing-gauges">
          <div class="tailing-gauge-item">
            <small>SUSPEITA / ALERTA</small>
            <div class="tailing-bar"><div id="tailing-alert-fill" class="tailing-fill alert-fill"></div></div>
          </div>
          <div class="tailing-gauge-item">
            <small>PROGRESSO DA PERSEGUIÇÃO</small>
            <div class="tailing-bar"><div id="tailing-prog-fill" class="tailing-fill prog-fill"></div></div>
          </div>
        </div>
        <div id="tailing-status-tip" class="tailing-tip">Mantenha distância entre 50m e 130m. Fique fora do campo de visão.</div>
      `;
      document.body.appendChild(hud);
    }
    this.hudElement = hud;
  }

  startTailing(npc) {
    this.activeTarget = npc;
    this.alertLevel = 0;
    this.tailProgress = 0;
    this.maxAlertRecorded = 0;
    this.hudElement.hidden = false;
    this.hudElement.querySelector('#tailing-target-name').textContent = npc.name.toUpperCase();
  }

  stopTailing(reason = null) {
    if (!this.activeTarget) return;
    this.activeTarget = null;
    this.hudElement.hidden = true;
    this.alertLevel = 0;
    this.tailProgress = 0;
  }

  update(dt, player, targetPos, targetDirection = 0) {
    if (!this.activeTarget || !targetPos) return;

    const dx = targetPos.x - player.x;
    const dy = targetPos.y - player.y;
    const distance = Math.hypot(dx, dy);

    // Calculate angle from target to player to check if player is in NPC's front cone of vision
    const angleToPlayer = Math.atan2(player.y - targetPos.y, player.x - targetPos.x);
    let angleDiff = Math.abs(angleToPlayer - targetDirection);
    while (angleDiff > Math.PI) angleDiff = Math.abs(angleDiff - Math.PI * 2);

    const isInVisionCone = angleDiff < 1.1; // ~60 degrees forward cone

    const tip = this.hudElement.querySelector('#tailing-status-tip');

    if (distance > 210) {
      // Too far, losing target
      this.alertLevel = Math.max(0, this.alertLevel - 8 * dt);
      this.tailProgress = Math.max(0, this.tailProgress - 10 * dt);
      tip.textContent = 'Alvo se afastando depressa! Aproxime-se para não perder o rastro.';
      tip.style.color = '#d4a373';
      if (distance > 320) {
        this.stopTailing('lost');
        return;
      }
    } else if (distance < 45 || (isInVisionCone && distance < 110)) {
      // Too close or right in front of them
      this.alertLevel += 45 * dt;
      tip.textContent = isInVisionCone ? 'ATENÇÃO: Você entrou no campo visual do alvo!' : 'PERIGO: Muito próximo! Afaste-se para as sombras.';
      tip.style.color = '#ff6b6b';
    } else {
      // Sweet spot distance: 50 to 140
      this.alertLevel = Math.max(0, this.alertLevel - 15 * dt);
      this.tailProgress += 12 * dt;
      tip.textContent = 'Distância ideal. Permaneça na retaguarda.';
      tip.style.color = '#8ecae6';
    }

    this.maxAlertRecorded = Math.max(this.maxAlertRecorded, this.alertLevel);

    // Update HUD
    const alertFill = this.hudElement.querySelector('#tailing-alert-fill');
    const progFill = this.hudElement.querySelector('#tailing-prog-fill');
    alertFill.style.width = `${Math.min(100, this.alertLevel)}%`;
    progFill.style.width = `${Math.min(100, this.tailProgress)}%`;

    // Check blown cover
    if (this.alertLevel >= 100) {
      tip.textContent = 'DISFARCE DESFEITO: O suspeito percebeu sua perseguição!';
      setTimeout(() => this.stopTailing('blown'), 1200);
      return;
    }

    // Check successful rendezvous
    if (this.tailProgress >= 100) {
      if (this.maxAlertRecorded <= 20) {
        this.achievementSystem?.unlock('silent_shadow');
      }
      this.triggerClandestineMeeting(this.activeTarget);
      this.stopTailing('success');
    }
  }

  triggerClandestineMeeting(target) {
    this.onClandestineMeetingWitnessed?.(target);
  }
}
