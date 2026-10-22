export class SpriteSheet {
  constructor({src, columns = 8, rows = 1, frameWidth, frameHeight}) {
    this.src = src;
    this.columns = columns;
    this.rows = rows;
    this.frameWidth = frameWidth;
    this.frameHeight = frameHeight;
    this.image = new Image();
    this.ready = new Promise((resolve, reject) => {
      this.image.onload = () => {
        this.frameWidth ||= this.image.naturalWidth / this.columns;
        this.frameHeight ||= this.image.naturalHeight / this.rows;
        resolve(this);
      };
      this.image.onerror = () => reject(new Error(`Falha ao carregar spritesheet: ${src}`));
    });
    this.image.src = src;
  }

  draw(ctx, direction, frame, x, y, {scale = 1, alpha = 1} = {}) {
    if (!this.image.complete || !this.image.naturalWidth) return false;
    const column = ((direction % this.columns) + this.columns) % this.columns;
    const row = ((frame % this.rows) + this.rows) % this.rows;
    const width = this.frameWidth * scale;
    const height = this.frameHeight * scale;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(
      this.image,
      column * this.frameWidth,
      row * this.frameHeight,
      this.frameWidth,
      this.frameHeight,
      x - width / 2,
      y - height * 0.91,
      width,
      height,
    );
    ctx.restore();
    return true;
  }
}

const ANGLE_TO_COLUMN = [6, 7, 0, 1, 2, 3, 4, 5];

export function directionFromVelocity(vx, vy, fallback = 0) {
  if (Math.hypot(vx, vy) < 0.01) return fallback;
  const sector = ((Math.round(Math.atan2(vy, vx) / (Math.PI / 4)) % 8) + 8) % 8;
  return ANGLE_TO_COLUMN[sector];
}

export class SpriteActor {
  constructor({id, sheet, x, y, scale = 0.72, fps = 8, idle = false, direction = 0}) {
    Object.assign(this, {id, sheet, x, y, scale, fps, idle, direction});
    this.elapsed = 0;
    this.frame = 0;
    this.vx = 0;
    this.vy = 0;
  }

  update(dt, vx = this.vx, vy = this.vy) {
    this.vx = vx;
    this.vy = vy;
    const moving = Math.hypot(vx, vy) > 2;
    this.direction = directionFromVelocity(vx, vy, this.direction);
    this.elapsed += dt;
    const speed = this.idle ? this.fps : moving ? this.fps : 0;
    this.frame = speed ? Math.floor(this.elapsed * speed) % this.sheet.rows : 0;
  }

  draw(ctx) {
    return this.sheet.draw(ctx, this.direction, this.frame, this.x, this.y, {scale: this.scale});
  }
}
