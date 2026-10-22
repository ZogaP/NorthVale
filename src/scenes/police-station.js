import {SpriteActor, SpriteSheet} from '../graphics/spritesheet.js';
import {RainLayer} from '../graphics/rain-layer.js';
import {IsoCollisionMap, pointInPolygon} from './isometric-collision.js';

const WIDTH = 1536;
const HEIGHT = 1024;
const polygon = points => points.map(([x, y]) => ({x, y}));

export const POLICE_WALKABLE = polygon([
  [74, 642], [330, 478], [535, 326], [812, 268], [1180, 348], [1500, 595],
  [1160, 956], [905, 1020], [430, 1005], [122, 817],
]);

export const POLICE_OBSTACLES = [
  {id: 'wall-left', points: polygon([[50, 350], [355, 260], [405, 500], [125, 655]])},
  {id: 'lockers', points: polygon([[530, 252], [840, 205], [872, 359], [565, 425]])},
  {id: 'cell', points: polygon([[850, 196], [1055, 245], [1030, 414], [850, 364]])},
  {id: 'credenza', points: polygon([[1060, 325], [1470, 410], [1448, 620], [1035, 523]])},
  {id: 'desk-center', points: polygon([[397, 390], [688, 358], [765, 493], [466, 615]])},
  {id: 'desk-left', points: polygon([[116, 563], [377, 520], [448, 685], [165, 783]])},
  {id: 'desk-right', points: polygon([[1014, 528], [1278, 563], [1323, 745], [1000, 810]])},
  {id: 'desk-bottom', points: polygon([[630, 692], [873, 640], [985, 829], [798, 1000], [620, 912]])},
  {id: 'cart-left', points: polygon([[70, 728], [230, 707], [278, 887], [115, 893]])},
];

const OCCLUDERS = [
  {id: 'center-desk', x: 380, y: 345, w: 395, h: 290, sortY: 568},
  {id: 'left-desk', x: 92, y: 500, w: 375, h: 300, sortY: 715},
  {id: 'right-desk', x: 970, y: 485, w: 395, h: 350, sortY: 748},
  {id: 'bottom-desk', x: 590, y: 615, w: 430, h: 409, sortY: 893},
  {id: 'left-cart', x: 40, y: 670, w: 280, h: 245, sortY: 830},
];

export const POLICE_INTERACTIONS = [
  {id: 'ruth', type: 'npc', name: 'Xerife Ruth Mercer', x: 875, y: 485, radius: 92, approach: {x: 875, y: 485}},
  {id: 'report', type: 'evidence', name: 'Relatório sobre a mesa', x: 585, y: 530, radius: 132, approach: {x: 600, y: 640}},
  {id: 'board', type: 'evidence', name: 'Quadro de pistas', x: 330, y: 350, radius: 250, approach: {x: 428, y: 558}},
  {id: 'exit', type: 'exit', name: 'Sair da delegacia', x: 520, y: 945, radius: 105, approach: {x: 520, y: 945}},
];

function loadImage(src) {
  const image = new Image();
  const ready = new Promise((resolve, reject) => {
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Falha ao carregar arte: ${src}`));
  });
  image.src = src;
  return {image, ready};
}

export class PoliceStationScene {
  constructor() {
    const background = loadImage('/assets/scenes/delegacia/background_delegacia.png');
    const foreground = loadImage('/assets/scenes/delegacia/fore_mascara_delegacia.png');
    this.background = background.image;
    this.foreground = foreground.image;
    this.collision = new IsoCollisionMap({width: WIDTH, height: HEIGHT, tileSize: 32, walkable: POLICE_WALKABLE, obstacles: POLICE_OBSTACLES});
    this.alexSheet = new SpriteSheet({src: '/assets/characters/alex_hale_walk.png', columns: 8, rows: 6, frameWidth: 192, frameHeight: 192});
    this.ruthSheet = new SpriteSheet({src: '/assets/characters/npc_sargento_idle.png', columns: 8, rows: 4, frameWidth: 192, frameHeight: 192});
    this.alex = new SpriteActor({id: 'alex', sheet: this.alexSheet, x: 520, y: 900, scale: 0.72, fps: 9, direction: 4});
    this.ruth = new SpriteActor({id: 'ruth', sheet: this.ruthSheet, x: 875, y: 485, scale: 0.68, fps: 2.3, idle: true, direction: 1});
    this.rain = new RainLayer(360);
    this.ready = Promise.all([background.ready, foreground.ready, this.alexSheet.ready, this.ruthSheet.ready]);
    this.errors = [];
    this.ready.catch(error => this.errors.push(error.message));
    this.frame = {x: 0, y: 0, scale: 1};
    this.followPath = [];
  }

  enter(player) {
    if (!pointInPolygon(player, POLICE_WALKABLE) || this.collision.blocked(player.x, player.y)) {
      Object.assign(player, {x: 520, y: 900, vx: 0, vy: 0, angle: -Math.PI / 2});
    }
  }

  move(player, dx, dy) {
    this.collision.move(player, dx, dy, 15);
  }

  pathfind(start, goal) {
    return this.collision.findPath(start, goal);
  }

  interactionAt(player) {
    return POLICE_INTERACTIONS
      .map(item => ({...item, distance: Math.hypot(item.x - player.x, item.y - player.y)}))
      .filter(item => item.distance <= item.radius)
      .sort((a, b) => a.distance - b.distance)[0] || null;
  }

  screenToScene(point) {
    return {x: (point.x - this.frame.x) / this.frame.scale, y: (point.y - this.frame.y) / this.frame.scale};
  }

  update(dt, player) {
    this.alex.x = player.x;
    this.alex.y = player.y;
    this.alex.update(dt, player.vx, player.vy);
    this.ruth.update(dt, 0, 0);
    this.rain.update(dt);
  }

  draw(ctx, viewportWidth, viewportHeight, player, focus) {
    const usableHeight = Math.max(500, viewportHeight - 64);
    const scale = Math.min(viewportWidth / WIDTH, usableHeight / HEIGHT);
    const x = (viewportWidth - WIDTH * scale) / 2;
    const y = (usableHeight - HEIGHT * scale) / 2;
    this.frame = {x, y, scale};
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    if (this.background.complete && this.background.naturalWidth) ctx.drawImage(this.background, 0, 0, WIDTH, HEIGHT);
    else {
      ctx.fillStyle = '#1c211d';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = '#d6c89e';
      ctx.font = '24px Georgia';
      ctx.fillText('Carregando delegacia de NorthVale…', 520, 500);
    }

    const drawables = [
      ...OCCLUDERS.map(occluder => ({depth: occluder.sortY, draw: () => this.drawOccluder(ctx, occluder)})),
      {depth: this.ruth.y, draw: () => this.ruth.draw(ctx)},
      {depth: player.y, draw: () => this.alex.draw(ctx)},
    ].sort((a, b) => a.depth - b.depth);
    for (const drawable of drawables) drawable.draw();

    this.drawLighting(ctx);
    this.drawRainInWindows(ctx);
    if (focus) this.drawFocus(ctx, focus);
    if (this.foreground.complete && this.foreground.naturalWidth) ctx.drawImage(this.foreground, 0, 0, WIDTH, HEIGHT);
    ctx.restore();
  }

  drawOccluder(ctx, occluder) {
    if (!this.background.complete || !this.background.naturalWidth) return;
    ctx.drawImage(this.background, occluder.x, occluder.y, occluder.w, occluder.h, occluder.x, occluder.y, occluder.w, occluder.h);
  }

  drawLighting(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    const shade = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    shade.addColorStop(0, 'rgba(32,41,36,.08)');
    shade.addColorStop(.48, 'rgba(22,25,20,.16)');
    shade.addColorStop(1, 'rgba(6,12,16,.42)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalCompositeOperation = 'screen';
    for (const light of [
      {x: 350, y: 235, radius: 310, color: 'rgba(255,220,126,.20)'},
      {x: 1190, y: 260, radius: 330, color: 'rgba(255,218,135,.16)'},
      {x: 870, y: 580, radius: 270, color: 'rgba(198,213,179,.08)'},
    ]) {
      const gradient = ctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, light.radius);
      gradient.addColorStop(0, light.color);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(light.x - light.radius, light.y - light.radius, light.radius * 2, light.radius * 2);
    }
    ctx.restore();
  }

  drawRainInWindows(ctx) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(24, 140, 200, 310);
    ctx.rect(535, 25, 190, 275);
    ctx.rect(1110, 120, 350, 250);
    ctx.clip();
    this.rain.draw(ctx, WIDTH, HEIGHT, 1.35);
    ctx.restore();
  }

  drawFocus(ctx, focus) {
    const pulse = 1 + Math.sin(performance.now() * 0.006) * 0.08;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.strokeStyle = '#7b2cbf';
    ctx.shadowColor = '#7b2cbf';
    ctx.shadowBlur = 18;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(focus.x, focus.y - 10, focus.radius * 0.38 * pulse, focus.radius * 0.18 * pulse, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}
