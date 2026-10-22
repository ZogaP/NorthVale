import {random} from './random.js';

export class RainLayer {
  constructor(count = 320, seed = 'northvale-police-rain') {
    const rnd = random(seed);
    this.drops = Array.from({length: count}, () => ({
      x: rnd(),
      y: rnd(),
      speed: 0.45 + rnd() * 0.9,
      length: 9 + rnd() * 18,
      alpha: 0.07 + rnd() * 0.18,
    }));
  }

  update(dt) {
    for (const drop of this.drops) {
      drop.y += drop.speed * dt;
      drop.x -= drop.speed * dt * 0.16;
      if (drop.y > 1.05) { drop.y = -0.05; drop.x = Math.random(); }
      if (drop.x < -0.05) drop.x = 1.05;
    }
  }

  draw(ctx, width, height, intensity = 1) {
    ctx.save();
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const drop of this.drops) {
      ctx.strokeStyle = `rgba(160,195,210,${drop.alpha * intensity})`;
      ctx.moveTo(drop.x * width, drop.y * height);
      ctx.lineTo(drop.x * width - drop.length * 0.35, drop.y * height + drop.length);
    }
    ctx.stroke();
    ctx.restore();
  }
}
