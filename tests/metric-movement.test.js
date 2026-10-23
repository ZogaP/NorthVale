import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { MovementSystem } from "../src/systems/MovementSystem.js";
import {
  NPCRoutineSystem,
  DEFAULT_NPC_ROUTINES,
} from "../src/systems/NPCRoutineSystem.js";
import { NorthValeWorld } from "../src/engine/NorthValeWorld.js";
import { GameEngine } from "../src/GameEngine.js";
import {
  FURNITURE_DATA,
  normalizeInteriorFurniture,
} from "../src/data/FurnitureData.js";
import { characterAppearance } from "../src/data/CharacterProfiles.js";
import {
  METERS_PER_TILE,
  WORLD_UNITS_PER_METER,
  HUMAN_DIMENSIONS,
  HUMAN_HEIGHT_WORLD,
  metersToWorld,
  pointToMeters,
} from "../src/engine/WorldMetrics.js";
import {
  collectVisibleNPCs,
  entityBounds,
  visibleWorldSector,
} from "../src/engine/WorldEntities.js";
import {
  InteriorManifestLoader,
  INTERIOR_IDS,
} from "../src/interiors/manifest-loader.js";
import { InteriorWorld } from "../src/interiors/interior-world.js";
import { dressRoom } from "../src/interiors/room-dressing.js";
import { createState } from "../src/state.js";
import { collides } from "../src/world.js";

const embedded = Object.fromEntries(
  await Promise.all(
    INTERIOR_IDS.map(async (id) => [
      id,
      JSON.parse(
        await readFile(
          new URL(`../assets/interiors/${id}.json`, import.meta.url),
          "utf8",
        ),
      ),
    ]),
  ),
);
const distance = (a, b) =>
  Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0));
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);

function moving(state = {}, speedMps = 1.4) {
  const system = new MovementSystem(state);
  system.ensureEntity({
    id: "bobby",
    characterId: "bobby_miller",
    position: { x: 0, y: 0 },
    speedMps,
  });
  return system;
}
async function town(minute = 419) {
  const interiors = new InteriorWorld(new InteriorManifestLoader({ embedded }));
  await interiors.ready;
  const world = new NorthValeWorld({ interiors }),
    state = createState();
  state.minute = minute;
  const engine = new GameEngine({ world, state });
  world.reset(state, engine);
  return { world, engine, state };
}

test("one tile is one metre; human bounds and visual Z share the same conversion", () => {
  assert.equal(METERS_PER_TILE, 1);
  assert.equal(WORLD_UNITS_PER_METER, 32);
  assert.equal(HUMAN_HEIGHT_WORLD, 56);
  assert.deepEqual(HUMAN_DIMENSIONS, { width: 0.6, depth: 0.6, height: 1.75 });
  const bounds = entityBounds(pointToMeters({ x: 320, y: 640 }));
  near(bounds.maxX - bounds.minX, 0.6);
  near(bounds.maxY - bounds.minY, 0.6);
  near(bounds.maxZ - bounds.minZ, 1.75);
  assert.throws(() => metersToWorld(NaN));
});

test("all loaded furniture uses metric bounds; required four models retain exact dimensions", async () => {
  assert.deepEqual(FURNITURE_DATA.armchair, {
    width: 0.9,
    depth: 0.9,
    height: 0.8,
  });
  assert.deepEqual(FURNITURE_DATA.sofa, { width: 2, depth: 0.85, height: 0.8 });
  assert.deepEqual(FURNITURE_DATA.coffee_table, {
    width: 1.2,
    depth: 0.6,
    height: 0.45,
  });
  assert.deepEqual(FURNITURE_DATA.cabinet, {
    width: 1,
    depth: 0.5,
    height: 1.4,
  });
  const loader = new InteriorManifestLoader({ embedded });
  await loader.load();
  const seen = new Set();
  for (const id of INTERIOR_IDS) {
    const manifest = loader.get(id);
    assert.deepEqual(
      normalizeInteriorFurniture(manifest),
      manifest,
      "normalizing twice cannot shrink furniture again",
    );
    assert.equal(
      embedded[id].metricVersion,
      undefined,
      "authored source and embedded cache remain untouched",
    );
    for (const room of manifest.rooms)
      for (const prop of room.props.filter((p) => p.dimensionsMeters)) {
        seen.add(prop.furnitureType);
        const spec = FURNITURE_DATA[prop.furnitureType];
        near(
          prop.w,
          metersToWorld(prop.rotation === 90 ? spec.depth : spec.width),
        );
        near(
          prop.h,
          metersToWorld(prop.rotation === 90 ? spec.width : spec.depth),
        );
        near(prop.height, metersToWorld(spec.height));
        near(prop.boundsMeters.maxX - prop.boundsMeters.minX, prop.w / 32);
        near(prop.boundsMeters.maxZ - prop.boundsMeters.minZ, spec.height);
        assert.ok(prop.height < HUMAN_HEIGHT_WORLD);
        assert.ok(
          prop.x >= 0 &&
            prop.y >= 0 &&
            prop.x + prop.w <= room.bounds.w &&
            prop.y + prop.h <= room.bounds.h,
        );
      }
  }
  for (const id of ["armchair", "sofa", "coffee_table", "cabinet"])
    assert.ok(seen.has(id));
});

test("children and generated tabletop details follow resized supports without floating or overhanging", () => {
  let checked = 0;
  for (const source of Object.values(embedded)) {
    const manifest = normalizeInteriorFurniture(source);
    for (const room of manifest.rooms) {
      const byId = new Map(room.props.map((p) => [p.id, p]));
      for (const prop of [
        ...room.props,
        ...dressRoom(manifest.id, room),
      ].filter((p) => p.parentId)) {
        const parent = byId.get(prop.parentId);
        assert.ok(
          prop.x >= parent.x - 1e-9 && prop.y >= parent.y - 1e-9,
          prop.id,
        );
        assert.ok(
          prop.x + prop.w <= parent.x + parent.w + 1e-9 &&
            prop.y + prop.h <= parent.y + parent.h + 1e-9,
          prop.id,
        );
        assert.ok(prop.baseZ >= (parent.baseZ ?? 0) + parent.height, prop.id);
        checked++;
      }
    }
  }
  assert.ok(checked > 500);
});

test("pedestrians travel equal metric distances at 30, 60 and 144 FPS with no frame-based multiplier", () => {
  for (const fps of [30, 60, 144])
    for (const speed of [1.2, 1.4, 1.6]) {
      const system = moving({}, speed);
      system.setPath("bobby", [{ x: 100, y: 0 }]);
      for (let frame = 0; frame < fps; frame++) {
        const before = { ...system.get("bobby").position };
        const result = system.updateEntity("bobby", 1 / fps);
        assert.ok(distance(before, result.position) <= speed / fps + 1e-10);
      }
      near(system.get("bobby").position.x, speed);
    }
  assert.throws(() => moving({}, 3), /number/);
  assert.throws(() => moving({}, 0.5), /number/);
});

test("waypoint turns preserve the time budget, stop at arrival and do not advance at dt zero", () => {
  const system = moving();
  system.setPath("bobby", [
    { x: 0.7, y: 0 },
    { x: 0.7, y: 0.7 },
  ]);
  system.updateEntity("bobby", 0);
  near(system.get("bobby").position.x, 0);
  const result = system.updateEntity("bobby", 1.5);
  assert.equal(result.arrived, true);
  near(result.travelled, 1.4);
  assert.deepEqual(result.position, { x: 0.7, y: 0.7, z: 0 });
  assert.deepEqual(result.velocity, { x: 0, y: 0, z: 0 });
  assert.throws(() => system.updateEntity("bobby", -1));
});

test("routine clock changes schedule destinations; physical integration stays capped and collision-free", async () => {
  const { world, engine, state } = await town();
  const before = { ...engine.systems.routines.movement.get("ruth").position };
  state.minute = 420;
  world.updateNPCs(engine, 0.1);
  const ruth = world.npcs.find((n) => n.id === "ruth");
  assert.equal(ruth.characterId, "ruth_mercer");
  assert.equal(ruth.inside, false);
  near(distance(before, ruth.position), 0.14);
  near(Math.hypot(ruth.vx, ruth.vy) / 32, 1.4);
  for (let frame = 0; frame < 100; frame++) {
    const previous = new Map(world.npcs.map((n) => [n.id, n.position]));
    // Accelerated or abruptly changed narrative time cannot multiply physical speed.
    state.minute = frame < 50 ? 421 + frame : 780 + frame;
    world.updateNPCs(engine, 0.1);
    for (const npc of world.npcs) {
      assert.ok(
        distance(previous.get(npc.id), npc.position) <= 0.16 + 1e-9,
        npc.id,
      );
      if (!npc.inside) assert.equal(collides(npc.x, npc.y, 9.6), false, npc.id);
    }
  }
});

test("unreachable goals hold position instead of teleporting to the next routine destination", async () => {
  const { world, engine, state } = await town();
  const before = { ...engine.systems.routines.movement.get("ruth").position };
  world.pedestrianPath = () => null;
  state.minute = 420;
  world.updateNPCs(engine, 0.1);
  assert.deepEqual(
    engine.systems.routines.movement.get("ruth").position,
    before,
  );
  assert.equal(world.npcs.find((n) => n.id === "ruth").locationId, "ruth");
  assert.equal(world.visibleNPCs(state).length, 0);
});

test("32 persistent identities use distinct visual profiles; only active, unique street bodies enter the sector", async () => {
  const { world, state } = await town(515);
  assert.equal(world.npcs.length, 32);
  assert.equal(new Set(world.npcs.map((n) => n.characterId)).size, 32);
  assert.ok(world.npcs.some((n) => n.characterId === "bobby_miller"));
  assert.ok(world.npcs.some((n) => n.characterId === "elias_ward"));
  const profiles = DEFAULT_NPC_ROUTINES.map(characterAppearance);
  assert.equal(new Set(profiles.map((p) => JSON.stringify(p))).size, 32);
  assert.ok(new Set(profiles.map((p) => `${p.atlas}/${p.baseRow}`)).size > 4);
  assert.equal(
    world.visibleNPCs(state).length,
    0,
    "stationary indoor residents do not spawn on the street",
  );
  const entity = {
    id: "bobby",
    characterId: "bobby_miller",
    position: { x: 5, y: 5 },
    inside: false,
    active: true,
  };
  const visible = collectVisibleNPCs(
    [
      entity,
      entity,
      { ...entity, id: "duplicate" },
      { ...entity, id: "inactive", characterId: "inactive", active: false },
      { ...entity, id: "inside", characterId: "inside", inside: true },
      {
        ...entity,
        id: "far",
        characterId: "far",
        position: { x: 100, y: 100 },
      },
    ],
    { minX: 0, minY: 0, maxX: 10, maxY: 10 },
  );
  assert.deepEqual(visible, [entity]);
  const routines = new NPCRoutineSystem({});
  assert.equal(
    routines.getRoutineTarget("arthur", 22, 0).visibleAtDestination,
    false,
  );
  assert.equal(
    routines.getRoutineTarget("ruth", 2, 0).visibleAtDestination,
    false,
  );
});

test("save/load resumes mid-walk at the same metric position without respawning; damaged identity is rejected", async () => {
  const { world, engine, state } = await town();
  state.minute = 420;
  world.updateNPCs(engine, 0.1);
  engine.systems.saves.saveGame(1);
  const saved = structuredClone(state.npcMovement.ruth);
  world.updateNPCs(engine, 0.1);
  assert.notDeepEqual(state.npcMovement.ruth.position, saved.position);
  engine.systems.saves.loadGame(1);
  assert.deepEqual(state.npcMovement.ruth, saved);
  world.updateNPCs(engine, 0.1);
  near(distance(saved.position, state.npcMovement.ruth.position), 0.14);
  assert.equal(Object.keys(state.npcMovement).length, 32);
  const damaged = structuredClone(state);
  damaged.npcMovement.ruth.characterId = "bobby_miller";
  assert.throws(() => new NPCRoutineSystem(damaged), /identity/);
  damaged.npcMovement.ruth.characterId = "ruth_mercer";
  damaged.npcMovement.ruth.speedMps = 40;
  assert.throws(() => new NPCRoutineSystem(damaged), /number/);
});

test("visible sector inverts camera projection including feet of characters extending above the screen", () => {
  const camera = { x: 500, y: 200 },
    viewport = { width: 1440, height: 900 };
  const sector = visibleWorldSector(camera, viewport);
  for (const [sx, sy] of [
    [0, 0],
    [1440, 900],
    [720, 955],
  ]) {
    const x = (sx + camera.x) / 2 + sy + camera.y;
    const y = sy + camera.y - (sx + camera.x) / 2;
    assert.ok(x / 32 >= sector.minX && x / 32 <= sector.maxX);
    assert.ok(y / 32 >= sector.minY && y / 32 <= sector.maxY);
  }
});
