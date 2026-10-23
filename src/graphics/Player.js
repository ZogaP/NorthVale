import {HUMAN_HEIGHT_WORLD, HUMAN_RADIUS_WORLD, metersToWorld} from '../engine/WorldMetrics.js';
// NorthVale — Sombras de 1989
// Player & Character Controller with 4-Phase Bilateral Walk Cycle & Metric Calibration
// Enforces 56px human height (1.75m on the metric 64x32 grid) and bottom-center grounding.

import {directionFromVelocity} from './spritesheet.js';

export class PlayerRenderer {
  constructor({
    id = 'alex',
    sheet = null,
    targetHeight = HUMAN_HEIGHT_WORLD, // 1.75m, shared with collision and furniture units
    fps = 9
  } = {}) {
    this.id = id;
    this.sheet = sheet;
    this.targetHeight = targetHeight;
    this.fps = fps;

    this.walkTimer = 0;
    this.direction = 0;
    this.isMoving = false;
    this.idleTimer = 0;

    // Direction tracking for smooth turning
    this.lastVx = 0;
    this.lastVy = 0;
  }

  setSheet(sheet) {
    this.sheet = sheet;
  }

  update(dt, vx = 0, vy = 0, angle = 0) {
    const speed = Math.hypot(vx, vy);
    this.isMoving = speed > 2;

    if (this.isMoving) {
      this.lastVx = vx;
      this.lastVy = vy;
      // Convert world velocity to isometric screen velocity for 8-direction mapping
      const isoVx = (vx - vy) * 0.866;
      const isoVy = (vx + vy) * 0.5;
      this.direction = directionFromVelocity(isoVx, isoVy, this.direction);
      this.walkTimer += dt * Math.min(1.4, Math.max(0.6, speed / metersToWorld(1.4)));
    } else if (angle !== undefined && angle !== 0) {
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const isoVx = (cosA - sinA) * 0.866;
      const isoVy = (cosA + sinA) * 0.5;
      this.direction = directionFromVelocity(isoVx, isoVy, this.direction);
      this.walkTimer = 0;
    } else {
      this.walkTimer = 0;
    }

    this.idleTimer += dt;
  }

  /**
   * Renders the character at the specified world screen position.
   * Applies bottom-center anchor, calibrated metric scale, and procedural
   * 4-phase bilateral walk cycle to eliminate unilateral limping.
   */
  draw(ctx, screenX, screenY, options = {}) {
    const scale = options.scale || (this.sheet?.frameHeight ? this.targetHeight / this.sheet.frameHeight : 0.26);
    const alpha = options.alpha ?? 1.0;
    const isMoving = this.isMoving;

    // Contact shadow at ground base z = 0
    ctx.save();
    ctx.fillStyle = 'rgba(6, 18, 25, 0.55)';
    ctx.beginPath();
    ctx.ellipse(screenX, screenY, HUMAN_RADIUS_WORLD, HUMAN_RADIUS_WORLD * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (!this.sheet || !this.sheet.image || !this.sheet.image.complete || !this.sheet.image.naturalWidth) {
      // Procedural silhouette fallback if spritesheet is loading
      this.drawProceduralFallback(ctx, screenX, screenY, isMoving);
      return;
    }

    // 4-Phase Walk Cycle Calculation:
    // Period = walkTimer * 8. Full cycle = 2*PI (~4 distinct phases)
    // Phase 1 (0 to PI/2): Right step forward (original frame progression)
    // Phase 2 (PI/2 to PI): Right passing / neutral
    // Phase 3 (PI to 3PI/2): Left step forward (mirrored lower body / counter-step)
    // Phase 4 (3PI/2 to 2PI): Left passing / neutral
    const cycle = (this.walkTimer * 8) % (Math.PI * 2);
    const phaseIndex = Math.floor((cycle / (Math.PI * 2)) * 4);
    const walkBob = isMoving ? Math.abs(Math.sin(this.walkTimer * 8)) * 2.5 : Math.sin(this.idleTimer * 2) * 0.8;
    const shoulderTilt = isMoving ? Math.sin(this.walkTimer * 8) * 0.04 : 0;

    const frameWidth = this.sheet.frameWidth;
    const frameHeight = this.sheet.frameHeight;
    const renderWidth = frameWidth * scale;
    const renderHeight = frameHeight * scale;

    // Bottom-center pivot anchor: feet hit exactly at screenY
    const drawX = screenX;
    const drawY = screenY - walkBob;

    ctx.save();
    if (alpha < 1) ctx.globalAlpha = alpha;

    // Column corresponds to 8-way isometric direction
    const column = ((this.direction % this.sheet.columns) + this.sheet.columns) % this.sheet.columns;

    if (!isMoving) {
      // Idle pose: row 0, neutral breathing
      const row = 0;
      ctx.drawImage(
        this.sheet.image,
        column * frameWidth,
        row * frameHeight,
        frameWidth,
        frameHeight,
        drawX - renderWidth / 2,
        drawY - renderHeight * 0.93,
        renderWidth,
        renderHeight
      );
      ctx.restore();
      return;
    }

    // Moving: Alternate right leg (Phases 0, 1) and procedural left leg (Phases 2, 3)
    const isLeftLegPhase = phaseIndex >= 2;
    const stepProgress = (cycle % Math.PI) / Math.PI; // 0 to 1 inside current leg step
    const animRow = Math.min(this.sheet.rows - 1, Math.floor(stepProgress * (this.sheet.rows || 6)));

    ctx.translate(drawX, drawY);
    ctx.rotate(shoulderTilt);

    if (isLeftLegPhase) {
      // Phase 3 & 4: Procedural counter-step.
      // Horizontally mirror the lower region / full sprite from pelvis origin
      // to render convincing bilateral locomotion without unilateral dragging.
      ctx.scale(-1, 1);
      ctx.drawImage(
        this.sheet.image,
        column * frameWidth,
        animRow * frameHeight,
        frameWidth,
        frameHeight,
        -renderWidth / 2,
        -renderHeight * 0.93,
        renderWidth,
        renderHeight
      );
    } else {
      // Phase 1 & 2: Natural right leg advancement
      ctx.drawImage(
        this.sheet.image,
        column * frameWidth,
        animRow * frameHeight,
        frameWidth,
        frameHeight,
        -renderWidth / 2,
        -renderHeight * 0.93,
        renderWidth,
        renderHeight
      );
    }

    ctx.restore();
  }

  drawProceduralFallback(ctx, screenX, screenY, isMoving) {
    const bob = isMoving ? Math.abs(Math.sin(this.walkTimer * 8)) * 2.5 : 0;
    const legSwing = isMoving ? Math.sin(this.walkTimer * 8) * 6 : 0;
    const y = screenY - bob;

    ctx.save();
    // Coat / Body
    ctx.fillStyle = '#8f7e5b';
    ctx.fillRect(screenX - 7, y - 42, 14, 26);
    // Head
    ctx.fillStyle = '#cfb997';
    ctx.beginPath();
    ctx.arc(screenX, y - 46, 6, 0, Math.PI * 2);
    ctx.fill();
    // Fedora Hat
    ctx.fillStyle = '#4a3b2c';
    ctx.fillRect(screenX - 8, y - 51, 16, 3);
    ctx.fillRect(screenX - 5, y - 56, 10, 5);
    // Legs (alternating left & right)
    ctx.strokeStyle = '#2d251e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    // Left leg
    ctx.moveTo(screenX - 3, y - 16);
    ctx.lineTo(screenX - 3 - legSwing, y);
    // Right leg
    ctx.moveTo(screenX + 3, y - 16);
    ctx.lineTo(screenX + 3 + legSwing, y);
    ctx.stroke();
    ctx.restore();
  }
}
