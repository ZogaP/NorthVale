import test from "node:test";
import assert from "node:assert/strict";
import {
  StealthAudioPropagation,
  SOUND_TYPES,
} from "../src/systems/StealthAudioPropagation.js";
import { IsometricPathfinding } from "../src/systems/IsometricPathfinding.js";
import { SpatialTriggerSystem } from "../src/systems/SpatialTriggerSystem.js";

function near(actual, expected, epsilon = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} != ${expected}`);
}

function pathCost(path) {
  let cost = 0;
  for (let i = 1; i < path.length; i++)
    cost += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
  return cost;
}

// Independent O(V^2) Dijkstra oracle for small deterministic generated maps.
function referenceCost(nav, start, goal) {
  const distances = Array.from({ length: nav.height }, () =>
    Array(nav.width).fill(Infinity),
  );
  const settled = new Set();
  distances[start.y][start.x] = 0;
  while (true) {
    let best = null,
      distance = Infinity;
    for (let y = 0; y < nav.height; y++)
      for (let x = 0; x < nav.width; x++)
        if (!settled.has(y * nav.width + x) && distances[y][x] < distance) {
          distance = distances[y][x];
          best = { x, y };
        }
    if (!best) return Infinity;
    if (best.x === goal.x && best.y === goal.y) return distance;
    settled.add(best.y * nav.width + best.x);
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        if ((!dx && !dy) || (!nav.allowDiagonal && dx && dy)) continue;
        const x = best.x + dx,
          y = best.y + dy;
        if (
          nav.isBlocked(x, y) ||
          (dx &&
            dy &&
            (nav.isBlocked(best.x + dx, best.y) ||
              nav.isBlocked(best.x, best.y + dy)))
        )
          continue;
        distances[y][x] = Math.min(
          distances[y][x],
          distance + Math.hypot(dx, dy),
        );
      }
  }
}

test("A* finds optimal deterministic raw paths, smooths empty space and converts grid/world coordinates", () => {
  const nav = new IsometricPathfinding({
    width: 10,
    height: 10,
    cellSize: 32,
    origin: { x: 100, y: -64, z: 2 },
  });
  const start = { x: 0, y: 0 },
    goal = { x: 7, y: 5 };
  const raw = nav.findPath(start, goal, { smooth: false });
  near(pathCost(raw), 5 * Math.SQRT2 + 2);
  assert.deepEqual(nav.findPath(start, goal, { smooth: false }), raw);
  assert.deepEqual(nav.findPath(start, goal), [start, goal]);
  assert.deepEqual(nav.worldToCell({ x: 116, y: -48 }), start);
  assert.deepEqual(nav.cellToWorld(goal), { x: 340, y: 112, z: 2 });
  assert.deepEqual(nav.findWorldPath({ x: 116, y: -48 }, { x: 340, y: 112 }), [
    { x: 116, y: -48, z: 2 },
    { x: 340, y: 112, z: 2 },
  ]);
  assert.deepEqual(nav.findPath(start, start), [start]);
  assert.deepEqual(nav.smoothPath([]), []);
  nav.generation = 0xffffffff;
  assert.deepEqual(nav.findPath(start, goal, { smooth: false }), raw);
  const cardinal = new IsometricPathfinding({
    width: 10,
    height: 10,
    allowDiagonal: false,
  });
  near(pathCost(cardinal.findPath(start, goal, { smooth: false })), 12);
  const smooth = cardinal.findPath(start, goal);
  assert.ok(
    smooth.every(
      (point, i) =>
        i === 0 || point.x === smooth[i - 1].x || point.y === smooth[i - 1].y,
    ),
  );
});

test("dynamic doors and parked cars share reference-counted cells; failed updates leave footprints intact", () => {
  const nav = new IsometricPathfinding({
    width: 5,
    height: 3,
    blocked: [
      { x: 2, y: 0 },
      { x: 2, y: 2 },
    ],
  });
  const start = { x: 0, y: 1 },
    end = { x: 4, y: 1 },
    door = [{ x: 2, y: 1 }];
  assert.ok(nav.findPath(start, end).length);
  nav.setDynamicObstacle("locked-door", door);
  assert.deepEqual(nav.findPath(start, end), []);
  nav.setDynamicObstacle("car", [...door, ...door]);
  nav.removeDynamicObstacle("locked-door");
  assert.equal(nav.isBlocked(2, 1), true);
  const revision = nav.revision;
  assert.equal(nav.setDynamicObstacle("car", door), false);
  assert.equal(nav.revision, revision);
  assert.throws(() => nav.setDynamicObstacle("car", [{ x: 5, y: 3 }]));
  assert.equal(nav.isBlocked(2, 1), true);
  assert.equal(nav.revision, revision);
  nav.setDynamicObstacle("car", [{ x: 4, y: 2 }]);
  assert.equal(nav.isBlocked(2, 1), false);
  assert.ok(nav.findPath(start, end).length);
  nav.setBlocked(4, 2);
  nav.removeDynamicObstacle("car");
  assert.equal(nav.isBlocked(4, 2), true);
  assert.deepEqual(nav.findPath({ x: -1, y: 1 }, end), []);
  assert.deepEqual(nav.findPath(start, end, { maxVisited: 1 }), []);
});

test("routes, smoothing and supercover rays cannot leak through diagonal corners or along blocked grid edges", () => {
  const nav = new IsometricPathfinding({
    width: 4,
    height: 4,
    blocked: [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
    ],
  });
  assert.deepEqual(nav.findPath({ x: 0, y: 0 }, { x: 1, y: 1 }), []);
  assert.equal(
    nav.hasLineOfSight({ x: 0.5, y: 0.5 }, { x: 1.5, y: 1.5 }),
    false,
  );
  assert.throws(() =>
    nav.smoothPath([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ]),
  );
  nav.setBlocked(0, 1, false);
  const path = nav.findPath({ x: 0, y: 0 }, { x: 3, y: 3 });
  assert.ok(path.length > 2);
  for (let i = 1; i < path.length; i++)
    assert.equal(
      nav.hasLineOfSight(
        nav.cellToWorld(path[i - 1]),
        nav.cellToWorld(path[i]),
      ),
      true,
    );
  const shallow = new IsometricPathfinding({
    width: 9,
    height: 5,
    blocked: [{ x: 2, y: 0 }],
  });
  const a = { x: 0.5, y: 0.5 },
    b = { x: 6.5, y: 2.5 };
  assert.equal(shallow.hasLineOfSight(a, b), false);
  assert.equal(shallow.hasLineOfSight(b, a), false);
  const boundary = new IsometricPathfinding({
    width: 5,
    height: 5,
    blocked: [{ x: 1, y: 1 }],
  });
  assert.equal(
    boundary.hasLineOfSight({ x: 2, y: 0.5 }, { x: 2, y: 3.5 }),
    false,
  );
  assert.equal(
    boundary.hasLineOfSight({ x: 2, y: 3.5 }, { x: 2, y: 0.5 }),
    false,
  );
  assert.equal(
    boundary.hasLineOfSight({ x: 2.5, y: 0.5 }, { x: 2.5, y: 3.5 }),
    true,
  );
});

test("ray hits provide the first intersection and vision cones combine facing, range, occlusion and height", () => {
  const nav = new IsometricPathfinding({ width: 12, height: 12 });
  const from = { x: 0.5, y: 0.5, z: 1 },
    to = { x: 8.5, y: 0.5, z: 1 };
  const door = {
    id: "sloane-door",
    bounds: { x: 3, y: 0, z: 0, width: 1, height: 1, depth: 2 },
  };
  const hit = nav.raycast(from, to, { occluders: [door] });
  assert.equal(hit.obstacleId, "sloane-door");
  near(hit.fraction, 2.5 / 8);
  assert.deepEqual(hit.point, { x: 3, y: 0.5, z: 1 });
  assert.equal(
    nav.raycast(from, to, { occluders: [{ ...door, isOpen: true }] }),
    null,
  );
  assert.equal(
    nav.raycast({ ...from, z: 3 }, { ...to, z: 3 }, { occluders: [door] }),
    null,
  );
  const guard = {
    position: { x: 4.5, y: 4.5, z: 1 },
    facingAngle: 2 * Math.PI,
  };
  const east = { x: 8.5, y: 4.5, z: 1 },
    west = { x: 0.5, y: 4.5, z: 1 };
  assert.equal(
    nav.isInVisionCone(guard, east, { fov: Math.PI / 2, range: 5 }),
    true,
  );
  assert.equal(
    nav.isInVisionCone(guard, west, { fov: Math.PI / 2, range: 5 }),
    false,
  );
  assert.equal(nav.isInVisionCone(guard, east, { range: 3 }), false);
  assert.equal(
    nav.isInVisionCone(guard, west, {
      facingAngle: -Math.PI + 0.01,
      fov: 0.1,
      range: 5,
    }),
    true,
  );
  assert.equal(nav.isInVisionCone(guard, east, { fov: 0, range: 5 }), true);
  nav.setDynamicObstacle("parked-car", [{ x: 6, y: 4 }]);
  assert.equal(nav.isInVisionCone(guard, east, { range: 5 }), false);
  assert.equal(nav.raycast(guard.position, east).cell.x, 6);
  nav.removeDynamicObstacle("parked-car");
  assert.equal(nav.isInVisionCone(guard, east, { range: 5 }), true);
});

test("A* matches independent Dijkstra costs on seeded maps with both movement policies", () => {
  let seed = 1989;
  const random = () =>
    (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  for (const allowDiagonal of [true, false])
    for (let sample = 0; sample < 24; sample++) {
      const nav = new IsometricPathfinding({
        width: 10,
        height: 10,
        allowDiagonal,
      });
      for (let y = 0; y < 10; y++)
        for (let x = 0; x < 10; x++)
          if ((x || y) && (x !== 9 || y !== 9) && random() < 0.24)
            nav.setBlocked(x, y);
      const start = { x: 0, y: 0 },
        goal = { x: 9, y: 9 },
        expected = referenceCost(nav, start, goal);
      const path = nav.findPath(start, goal, { smooth: false });
      if (expected === Infinity) assert.deepEqual(path, []);
      else {
        near(pathCost(path), expected);
        assert.deepEqual(nav.findPath(start, goal, { smooth: false }), path);
        const smooth = nav.smoothPath(path);
        assert.ok(smooth.length <= path.length);
        for (let i = 1; i < smooth.length; i++)
          assert.equal(
            nav.hasLineOfSight(
              nav.cellToWorld(smooth[i - 1]),
              nav.cellToWorld(smooth[i]),
            ),
            true,
          );
      }
    }
});

test("invalid grid and geometry inputs fail explicitly instead of contaminating search state", () => {
  assert.throws(() => new IsometricPathfinding({ width: 2.5, height: 2 }));
  assert.throws(() => new IsometricPathfinding({ width: 1000000, height: 2 }));
  const nav = new IsometricPathfinding({ width: 4, height: 4 });
  assert.throws(() => nav.findPath({ x: 0.5, y: 0 }, { x: 3, y: 3 }));
  assert.throws(() =>
    nav.findPath({ x: 0, y: 0 }, { x: 3, y: 3 }, { maxVisited: 0 }),
  );
  assert.throws(() => nav.raycast({ x: NaN, y: 0 }, { x: 3, y: 3 }));
  assert.throws(() =>
    nav.isInVisionCone({ x: 1, y: 1 }, { x: 2, y: 2 }, { fov: 7 }),
  );
  assert.deepEqual(nav.findPath({ x: 0, y: 0 }, { x: 3, y: 3 }), [
    { x: 0, y: 0 },
    { x: 3, y: 3 },
  ]);
});

test("dam modifiers feed footsteps and ambient masking; door state synchronizes path, sight and sound", () => {
  const nav = new IsometricPathfinding({
    width: 8,
    height: 3,
    cellSize: 1,
    blocked: [
      { x: 3, y: 0 },
      { x: 3, y: 2 },
    ],
  });
  const guard = {
    id: "guard",
    x: 5.5,
    y: 1.5,
    hearingThreshold: 10,
    detectionMarginDb: 0,
  };
  const sound = new StealthAudioPropagation({
    listeners: [guard],
    occluders: [
      { id: "door", kind: "door", bounds: { x: 3, y: 1, width: 1, height: 1 } },
    ],
  });
  const triggers = new SpatialTriggerSystem({
    zones: [
      {
        id: "dam-gallery",
        bounds: { x: 0, y: 0, width: 3, height: 3 },
        modifiers: { humidity: 0.95, footstepNoiseDb: 12 },
      },
    ],
  });
  const alex = { x: 1.5, y: 1.5 };
  triggers.update(alex, 0.1);
  const environment = triggers.getEnvironment();
  sound.setAmbientNoise(environment.ambientNoiseDb);
  nav.setDynamicObstacle("door", [{ x: 3, y: 1 }]);
  assert.deepEqual(nav.findWorldPath(alex, guard), []);
  assert.equal(nav.hasLineOfSight(alex, guard), false);
  assert.equal(
    sound.emitSound("PUDDLE_STEP", alex, {
      noiseModifierDb: environment.footstepNoiseDb,
    }).length,
    0,
  );
  sound.setDoorOpen("door", true);
  nav.removeDynamicObstacle("door");
  assert.ok(nav.findWorldPath(alex, guard).length);
  assert.equal(nav.hasLineOfSight(alex, guard), true);
  assert.equal(
    sound.emitSound("PUDDLE_STEP", alex, {
      noiseModifierDb: environment.footstepNoiseDb,
    }).length,
    1,
  );
  triggers.update({ x: 4, y: 1.5 }, 0.1);
  assert.equal(triggers.getEnvironment().footstepNoiseDb, 0);
});

test("sound levels, 3D grid distance, reference distance and modifiers follow the documented decibel formula", () => {
  assert.deepEqual(Object.values(SOUND_TYPES), [15, 35, 60, 95]);
  const sound = new StealthAudioPropagation();
  for (const level of Object.values(SOUND_TYPES))
    near(
      sound.calculateIntensity({ x: 0, y: 0 }, { x: 0, y: 0 }, level),
      level,
    );
  near(
    sound.calculateIntensity({ x: 0, y: 0 }, { x: 10, y: 0 }, "REVOLVER_38"),
    75,
  );
  near(
    sound.calculateIntensity({ x: 0, y: 0, z: 0 }, { x: 3, y: 4, z: 12 }, 95),
    95 - 20 * Math.log10(13),
  );
  const scaled = new StealthAudioPropagation({
    cellSize: 2,
    heightScale: 2,
    referenceDistance: 2,
  });
  near(
    scaled.calculateIntensity({ x: 0, y: 0 }, { x: 6, y: 8 }, 35),
    35 - 20 * Math.log10(2.5),
  );
  near(
    scaled.calculateIntensity({ x: 0, y: 0 }, { x: 0, y: 0, z: 10 }, 95),
    95 - 20 * Math.log10(5),
  );
  assert.equal(
    sound.calculateIntensity({ x: 0, y: 0 }, { x: 1, y: 0 }, 95, {
      noiseModifierDb: 20,
    }),
    100,
  );
  assert.equal(
    sound.calculateIntensity({ x: 0, y: 0 }, { x: 1000000, y: 0 }, 15),
    0,
  );
  assert.equal(
    sound.calculateIntensity({ x: 0, y: 0 }, { x: 1, y: 0 }, 15, {
      noiseModifierDb: -20,
    }),
    0,
  );
});

test("acoustic walls and closed doors accumulate loss once per volume, with height and tangent handling", () => {
  const origin = { x: 0, y: 0, z: 1 },
    listener = { x: 10, y: 0, z: 1 };
  const sound = new StealthAudioPropagation({
    occluders: [
      {
        id: "wall",
        kind: "wall",
        bounds: { x: 2, y: -1, width: 1, height: 2 },
      },
      {
        id: "door",
        kind: "door",
        bounds: { x: 5, y: -1, z: 0, width: 1, height: 2, depth: 2 },
      },
      { id: "off-ray", bounds: { x: 2, y: 5, width: 1, height: 2 } },
    ],
  });
  near(sound.calculateIntensity(origin, listener, 95), 45);
  sound.setDoorOpen("door", true);
  near(sound.calculateIntensity(origin, listener, 95), 57);
  sound.setDoorOpen("door", false);
  near(
    sound.calculateIntensity({ ...origin, z: 3 }, { ...listener, z: 3 }, 95),
    57,
  );
  sound.removeOccluder("wall");
  sound.setDoorOpen("door", true);
  near(sound.calculateIntensity(origin, listener, 95), 75);
  const tangent = new StealthAudioPropagation({
    occluders: [{ id: "wall", bounds: { x: 2, y: 0, width: 2, height: 2 } }],
  });
  near(tangent.calculateIntensity(origin, listener, 95), 75);
  near(tangent.calculateIntensity({ x: 3, y: 1 }, { x: 3, y: 1 }, 95), 95);
});

test("hearing masks ambient noise, ignores the source, scopes interiors and snapshots a detection batch before callbacks", () => {
  const first = { id: "guard", x: 1, y: 0, hearingThreshold: 50 };
  const second = {
    id: "bobby",
    position: { x: 1, y: 0 },
    hearingThreshold: 50,
  };
  const events = [];
  const sound = new StealthAudioPropagation({
    listeners: [first, second],
    onSoundDetected: (entity, origin, intensity) => {
      events.push([entity, origin, intensity]);
      if (entity.id === "guard") second.position.x = 1000000;
    },
  });
  assert.equal(sound.emitSound("REVOLVER_38", { x: 0, y: 0 }).length, 2);
  assert.equal(events[0][0], first);
  assert.equal(events[1][0], second);
  assert.equal(events[1][2], 95);
  assert.equal(sound.emitSound("REVOLVER_38", { x: 0, y: 0 }).length, 1);
  assert.equal(
    sound.emitSound("REVOLVER_38", { x: 0, y: 0 }, { sourceId: "guard" })
      .length,
    0,
  );
  sound.setAmbientNoise(70);
  assert.equal(sound.emitSound("FORCED_DOOR", { x: 1, y: 0 }).length, 0);
  first.spaceId = "motel";
  assert.equal(
    sound.emitSound("REVOLVER_38", { x: 1, y: 0, spaceId: "dam" }).length,
    0,
  );
  first.spaceId = "dam";
  assert.equal(
    sound.emitSound("REVOLVER_38", { x: 1, y: 0, spaceId: "dam" }).length,
    1,
  );
  first.enabled = false;
  assert.equal(sound.emitSound(100, { x: 1, y: 0 }).length, 0);
  sound.removeListener("guard");
  sound.removeListener("bobby");
  assert.deepEqual(sound.emitSound(100, { x: 1, y: 0 }), []);
});

test("silent and invalid sound inputs never generate phantom alerts", () => {
  let alerts = 0;
  const sound = new StealthAudioPropagation({
    listeners: [
      { id: "guard", x: 0, y: 0, hearingThreshold: 0, detectionMarginDb: 0 },
    ],
    onSoundDetected: () => alerts++,
  });
  assert.deepEqual(sound.emitSound(0, { x: 0, y: 0 }), []);
  assert.equal(alerts, 0);
  assert.throws(() => sound.emitSound("UNKNOWN", { x: 0, y: 0 }));
  assert.throws(() => sound.emitSound(101, { x: 0, y: 0 }));
  assert.throws(() => sound.emitSound(60, { x: NaN, y: 0 }));
  assert.throws(() =>
    sound.addListener({ id: "bad", x: 0, y: 0, hearingThreshold: 101 }),
  );
  assert.throws(() => sound.setDoorOpen("missing", true));
  assert.throws(() => new StealthAudioPropagation({ cellSize: 0 }));
});

test("triggers emit enter, stay with supplied dt, and exit exactly once, with independent Z bounds", () => {
  const events = [];
  const triggers = new SpatialTriggerSystem({
    zones: [
      {
        id: "gallery",
        bounds: { minX: 0, minY: 0, maxX: 10, maxY: 10, minZ: 0, maxZ: 3 },
      },
    ],
    onZoneEnter: (id) => events.push(["enter", id]),
    onZoneStay: (id, dt) => events.push(["stay", id, dt]),
    onZoneExit: (id) => events.push(["exit", id]),
  });
  triggers.update({ x: -1, y: 5, z: 1 }, 0.1);
  triggers.update({ x: 0, y: 5, z: 1 }, 0.1); // Boundary contact counts.
  triggers.update({ x: 5, y: 5, z: 1 }, 0.25);
  triggers.update({ x: 5, y: 5, z: 4 }, 0.1);
  triggers.update({ x: 5, y: 5, z: 4 }, 0.1);
  assert.deepEqual(events, [
    ["enter", "gallery"],
    ["stay", "gallery", 0.25],
    ["exit", "gallery"],
  ]);
  triggers.update(
    { bounds: { x: 9.5, y: 9.5, z: 2, width: 2, height: 2, depth: 2 } },
    0,
  );
  assert.deepEqual(triggers.getActiveZones(), ["gallery"]);
  triggers.setZoneEnabled("gallery", false);
  assert.deepEqual(triggers.update({ x: 5, y: 5 }, 0).exited, ["gallery"]);
  assert.throws(() => triggers.update({ x: 5, y: 5 }, -1));
  assert.throws(() => triggers.update({ x: Infinity, y: 5 }, 0.1));
});

test("overlapping zones compose deterministic modifiers without frame accumulation and restore the base on exit", () => {
  const bounds = { x: 0, y: 0, width: 10, height: 10 },
    changes = [];
  const zones = [
    {
      id: "gallery",
      bounds,
      priority: 1,
      modifiers: { humidity: 0.9, ambientNoiseDb: 55, footstepNoiseDb: 8 },
    },
    { id: "carpet", bounds, priority: 2, modifiers: { footstepNoiseDb: -3 } },
    { id: "leak-a", bounds, priority: 3, modifiers: { humidity: 0.95 } },
    { id: "leak-z", bounds, priority: 3, modifiers: { humidity: 1 } },
  ];
  const triggers = new SpatialTriggerSystem({
    zones,
    baseEnvironment: { humidity: 0.4, footstepNoiseDb: 1, ambientNoiseDb: 20 },
    onEnvironmentChange: (...args) => changes.push(args),
  });
  const first = triggers.update({ x: 5, y: 5 }, 0.1);
  assert.deepEqual(first.environment, {
    humidity: 1,
    footstepNoiseDb: 6,
    ambientNoiseDb: 55,
  });
  for (let i = 0; i < 100; i++) triggers.update({ x: 5, y: 5 }, 0.1);
  assert.equal(changes.length, 1);
  const reversed = new SpatialTriggerSystem({
    zones: zones.toReversed(),
    baseEnvironment: { humidity: 0.4, footstepNoiseDb: 1, ambientNoiseDb: 20 },
  });
  assert.deepEqual(
    reversed.update({ x: 5, y: 5 }, 0.1).environment,
    first.environment,
  );
  const exposed = triggers.getEnvironment();
  exposed.humidity = 0;
  assert.equal(triggers.getEnvironment().humidity, 1);
  triggers.update({ x: 20, y: 20 }, 0.1);
  assert.deepEqual(triggers.getEnvironment(), {
    humidity: 0.4,
    footstepNoiseDb: 1,
    ambientNoiseDb: 20,
  });
  assert.equal(changes.length, 2);
});

test("solid collision queries are separate from sensors and test entire actor AABBs", () => {
  const triggers = new SpatialTriggerSystem({
    zones: [{ id: "sensor", bounds: { x: 0, y: 0, width: 10, height: 10 } }],
    colliders: [
      {
        id: "desk",
        bounds: { x: 4, y: 4, z: 0, width: 2, height: 2, depth: 2 },
      },
      {
        id: "ceiling",
        bounds: { x: 4, y: 4, z: 4, width: 2, height: 2, depth: 1 },
      },
    ],
  });
  assert.deepEqual(triggers.queryCollisions({ x: 1, y: 1 }), []);
  assert.deepEqual(
    triggers.queryCollisions({
      bounds: { x: 3, y: 3, z: 0, width: 1, height: 1, depth: 1 },
    }),
    ["desk"],
  );
  assert.deepEqual(triggers.queryCollisions({ x: 5, y: 5, z: 3 }), []);
  assert.deepEqual(triggers.queryCollisions({ x: 5, y: 5, z: 4.5 }), [
    "ceiling",
  ]);
  triggers.removeCollider("desk");
  assert.deepEqual(triggers.queryCollisions({ x: 5, y: 5 }), []);
  assert.throws(() =>
    triggers.setZone({
      id: "invalid",
      bounds: { x: 0, y: 0, width: 0, height: 1 },
    }),
  );
  assert.throws(() =>
    triggers.setZone({
      id: "invalid",
      bounds: { x: 0, y: 0, width: 1, height: 1 },
      modifiers: { humidity: 2 },
    }),
  );
});

test("trigger callbacks observe committed state; registry edits take effect next tick and recursive updates are rejected", () => {
  const events = [],
    bounds = { x: 0, y: 0, width: 10, height: 10 };
  const triggers = new SpatialTriggerSystem({
    zones: [{ id: "a", bounds, modifiers: { humidity: 0.9 } }],
    onZoneEnter: (id) => {
      assert.equal(triggers.getEnvironment().humidity, 0.9);
      assert.deepEqual(triggers.getActiveZones(), ["a"]);
      assert.throws(() => triggers.update({ x: 5, y: 5 }, 0.1), /reentrant/);
      triggers.removeZone(id);
      events.push(["enter", id]);
    },
    onZoneExit: (id) => events.push(["exit", id]),
  });
  triggers.update({ x: 5, y: 5 }, 0.1);
  triggers.update({ x: 5, y: 5 }, 0.1);
  triggers.update({ x: 5, y: 5 }, 0.1);
  assert.deepEqual(events, [
    ["enter", "a"],
    ["exit", "a"],
  ]);
  assert.equal(triggers.getEnvironment().humidity, 0.5);
});
