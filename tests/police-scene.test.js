import test from 'node:test';
import assert from 'node:assert/strict';
import {IsoCollisionMap, pointInPolygon} from '../src/scenes/isometric-collision.js';
import {POLICE_OBSTACLES, POLICE_WALKABLE, POLICE_INTERACTIONS} from '../src/scenes/police-station.js';
import {directionFromVelocity} from '../src/graphics/spritesheet.js';

const collision = new IsoCollisionMap({width: 1536, height: 1024, tileSize: 32, walkable: POLICE_WALKABLE, obstacles: POLICE_OBSTACLES});

test('delegacia usa piso ilustrado e bloqueia mesas, arquivos, cela e paredes', () => {
  assert.equal(collision.blocked(520, 900), false);
  for (const obstacle of POLICE_OBSTACLES) {
    const center = obstacle.points.reduce((sum, point) => ({x: sum.x + point.x / obstacle.points.length, y: sum.y + point.y / obstacle.points.length}), {x: 0, y: 0});
    assert.equal(pointInPolygon(center, obstacle.points), true, obstacle.id);
    assert.equal(collision.blocked(center.x, center.y, 0), true, obstacle.id);
  }
  assert.equal(collision.blocked(10, 10), true);
});

test('A* encontra caminho livre até Ruth sem cortar cantos dos obstáculos', () => {
  const path = collision.findPath({x: 520, y: 900}, {x: 875, y: 485});
  assert.ok(path.length > 2);
  for (const point of path.slice(1, -1)) assert.equal(collision.blocked(point.x, point.y, 8), false);
  for (let i = 1; i < path.length; i++) {
    const samples = Math.ceil(Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y) / 8);
    for (let sample = 0; sample <= samples; sample++) {
      const t = sample / samples;
      assert.equal(collision.blocked(path[i - 1].x + (path[i].x - path[i - 1].x) * t, path[i - 1].y + (path[i].y - path[i - 1].y) * t, 4), false);
    }
  }
});

test('todos os pontos de interação da delegacia ficam em piso alcançável', () => {
  for (const item of POLICE_INTERACTIONS) {
    assert.equal(collision.blocked(item.approach.x, item.approach.y, 8), false, item.id);
    assert.ok(collision.findPath({x: 520, y: 900}, item.approach).length, item.id);
  }
});

test('mapeamento do spritesheet cobre oito direções cardeais e diagonais', () => {
  assert.deepEqual([
    directionFromVelocity(0, 1), directionFromVelocity(-1, 1), directionFromVelocity(-1, 0), directionFromVelocity(-1, -1),
    directionFromVelocity(0, -1), directionFromVelocity(1, -1), directionFromVelocity(1, 0), directionFromVelocity(1, 1),
  ], [0, 1, 2, 3, 4, 5, 6, 7]);
});
