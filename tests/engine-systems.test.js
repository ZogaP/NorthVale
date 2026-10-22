import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { IsoProjection } from "../src/engine/IsoProjection.js";
import { RenderQueue } from "../src/engine/RenderQueue.js";
import { InputManager, DEFAULT_BINDINGS } from "../src/systems/InputManager.js";
import { QuestManager } from "../src/systems/QuestManager.js";
import { EndingManager } from "../src/systems/EndingManager.js";
import {
  CanonicalCampaign,
  CANONICAL_CLUES,
} from "../src/systems/CanonicalCampaign.js";
import { createState, collect, serialize, deserialize } from "../src/state.js";
import { InteriorWorld } from "../src/interiors/interior-world.js";
import {
  InteriorManifestLoader,
  INTERIOR_IDS,
} from "../src/interiors/manifest-loader.js";
test("projection roundtrips signed fractional coordinates on elevated planes and culls viewport boundaries", () => {
  const p = new IsoProjection();
  for (const x of [-999.125, 0, 73.8, 100000])
    for (const y of [-420.2, 0, 81])
      for (const z of [0, 17.25, 98]) {
        const screen = p.worldToScreen(x, y, z, 651.5, -120),
          world = p.screenToWorld(screen.x, screen.y, z, 651.5, -120);
        assert.ok(Math.abs(world.x - x) < 1e-9);
        assert.ok(Math.abs(world.y - y) < 1e-9);
      }
  assert.equal(p.getDepthKey(2, 3, 100, 0.5), 5.6);
  assert.ok(p.isWithinFrustum(-10, 25, 10, { width: 100, height: 50 }));
  assert.equal(
    p.isWithinFrustum(-11, 25, 10, { width: 100, height: 50 }),
    false,
  );
  assert.throws(() => p.worldToScreen(NaN, 0));
  assert.throws(() => p.isWithinFrustum(0, 0, -1, { width: 100, height: 50 }));
});
test("queue reuses its array, interleaves actors/structures stably, draws layers and culls hidden entities", () => {
  const q = new RenderQueue(),
    array = q.renderQueue,
    log = [],
    ctx = { globalAlpha: 1, save() {}, restore() {} };
  for (const [id, x, layer] of [
    ["roof", 3, "ROOF"],
    ["actor", 10, "ACTOR"],
    ["column", 10, "STRUCTURE"],
    ["ground", 100, "GROUND"],
    ["far", 10000, "ACTOR"],
    ["overlay", 0, "OVERLAY"],
  ])
    q.enqueue({
      id,
      worldX: x,
      worldY: 0,
      worldZ: 0,
      width: 10,
      height: 20,
      layer,
      draw: () => log.push(id),
    });
  q.draw(ctx, { x: -200, y: -100, width: 500, height: 500 });
  assert.deepEqual(log, ["ground", "actor", "column", "roof", "overlay"]);
  q.clear();
  assert.equal(q.renderQueue, array);
  for (let i = 0; i < 32; i++)
    q.enqueue({
      id: "npc-" + i,
      worldX: 32 - i,
      worldY: 0,
      worldZ: 0,
      width: 20,
      height: 50,
      layer: "ACTOR",
      draw() {},
    });
  assert.equal(q.sort()[0].id, "npc-31");
});
test("cutaway supports concave polygons and restores opacity in exactly 250ms", () => {
  const q = new RenderQueue(),
    b = {
      id: "b",
      polygon: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 30 },
        { x: 30, y: 30 },
        { x: 30, y: 100 },
        { x: 0, y: 100 },
      ],
    },
    roof = q.enqueue({
      id: "roof",
      buildingId: "b",
      worldX: 0,
      worldY: 0,
      worldZ: 0,
      width: 100,
      height: 100,
      layer: "ROOF",
      isCutawayRoof: true,
      draw() {},
    });
  q.updateCutaways(10, 80, [b], 0.125);
  assert.equal(roof.cutawayAlpha, 0.5);
  q.updateCutaways(10, 80, [b], 0.125);
  assert.equal(roof.cutawayAlpha, 0);
  q.updateCutaways(80, 80, [b], 0.25);
  assert.equal(roof.cutawayAlpha, 1);
  assert.throws(() => q.updateCutaways(0, 0, [b], -1));
});
test("input supports keyboard/mouse edges, duplicate cleanup, persistence, blur and permanent Escape reservation", () => {
  const data = new Map(),
    storage = {
      getItem: (k) => data.get(k),
      setItem: (k, v) => data.set(k, v),
    },
    target = new EventTarget(),
    manager = new InputManager({ target, storage }),
    press = (code) => manager.down(code, { target: {}, preventDefault() {} });
  press("KeyW");
  assert.ok(manager.isActionDown("MOVE_UP"));
  assert.ok(manager.isActionJustPressed("MOVE_UP"));
  manager.resetFrameStates();
  press("KeyW");
  assert.equal(manager.isActionJustPressed("MOVE_UP"), false);
  target.dispatchEvent(new Event("blur"));
  assert.equal(manager.isActionDown("MOVE_UP"), false);
  manager.rebind("INTERACT", "primary", "KeyW");
  assert.equal(manager.bindings.MOVE_UP.primary, "");
  manager.rebind("CORKBOARD", "secondary", "Mouse2");
  press("Mouse2");
  assert.ok(manager.isActionDown("CORKBOARD"));
  assert.throws(() => manager.rebind("INTERACT", "primary", "Escape"));
  assert.throws(() => manager.rebind("PAUSE_MENU", "secondary", "KeyP"));
  const loaded = new InputManager({ target: null, storage });
  assert.equal(loaded.bindings.INTERACT.primary, "KeyW");
  loaded.setWorldEnabled(false);
  loaded.down("KeyW", { target: {} });
  assert.equal(loaded.isActionDown("INTERACT"), false);
  loaded.down("Escape", { target: {} });
  assert.ok(loaded.isActionDown("PAUSE_MENU"));
  manager.destroy();
  assert.equal(manager.listeners.length, 0);
  const bad = new InputManager({
    target: null,
    storage: {
      getItem() {
        return "{bad";
      },
    },
  });
  assert.deepEqual(bad.bindings, DEFAULT_BINDINGS);
});
test("quests reject skips and fabricated payload evidence, reward real favors only once and survive saves", () => {
  const state = createState(),
    campaign = new CanonicalCampaign(state),
    q = campaign.quests;
  assert.equal(q.advanceStage("MAIN_SARAH_DISAPPEARANCE", 3), false);
  assert.equal(q.isPrerequisiteMet("SIDE_SAM_LOCKPICK"), false);
  state.introDone = true;
  campaign.sync();
  assert.equal(q.isPrerequisiteMet("SIDE_SAM_LOCKPICK"), true);
  assert.equal(
    q.advanceStage("MAIN_SARAH_DISAPPEARANCE", 2, { evidence: ["letter"] }),
    false,
  );
  collect(state, "letter");
  campaign.sync();
  collect(state, "toolbox");
  campaign.sync();
  assert.ok(campaign.favor("sam"));
  assert.equal(campaign.favor("sam"), false);
  assert.ok(state.inventory.includes("Gazua de Aço"));
  assert.equal(q.get("SIDE_SAM_LOCKPICK").status, "COMPLETED");
  assert.equal(
    new QuestManager(deserialize(serialize(state))).get("SIDE_SAM_LOCKPICK")
      .status,
    "COMPLETED",
  );
  assert.throws(() => q.advanceStage("NO_QUEST", 1));
  assert.throws(() =>
    q.advanceStage("MAIN_SARAH_DISAPPEARANCE", 3, { n: NaN }),
  );
  assert.ok(q.failQuest("SIDE_ELIAS_PRESCRIPTIONS", "Receita perdida"));
  assert.equal(q.advanceStage("SIDE_ELIAS_PRESCRIPTIONS", 1), false);
});
const endingFixtures = [
  [1, { PROOF_WEIGHT: 8, SARAH_STATUS: 1 }, ["PROOFS_DISPATCHED_TRAIN"]],
  [2, { PROOF_WEIGHT: 8, SARAH_STATUS: 0 }, ["EXECUTED_BOBBY_AT_SPILLWAY"]],
  [3, { SARAH_STATUS: 1, SCRUTINY: 90 }, ["BARRICADED_STATION"]],
  [4, { SARAH_STATUS: 1, REPUTATION: 30 }, ["PUBLIC_ACCUSATION"]],
  [5, { BOBBY_STABILITY: 0 }, ["BOBBY_IN_PHARMACY_CUSTODY"]],
  [6, { SARAH_STATUS: 1 }, ["RUTH_DEAL_SIGNED"]],
  [7, { PROOF_WEIGHT: 8 }, ["CORRUPT_BRIBE_ACCEPTED", "FLED_WITH_75000"]],
  [8, { SCRUTINY: 85 }, ["AMBUSHED_AT_SLUICE"]],
  [9, { PROOF_WEIGHT: 3 }, ["CORRECT_DEDUCTION", "PSYCHIATRIC_REPORT_FILED"]],
  [10, {}, ["BOBBY_PANIC_UNCONTAINED"]],
  [11, {}, ["CLARA_BLAMED"]],
  [12, {}, ["HELEN_ARMED"]],
  [13, {}, ["ABANDONED_CITY"]],
  [14, { day: 3 }, ["DAM_INVADED_UNEQUIPPED"]],
];
test("all fourteen exact endings are reachable; thresholds, explicit events, priority and lock snapshots are enforced", () => {
  for (const [id, values, flags] of endingFixtures) {
    const s = { ...createState(), ...values, PLAYER_DECISION_FLAGS: flags },
      manager = new EndingManager(s);
    assert.equal(manager.evaluateEnding().endingId, id);
    let callbacks = 0;
    manager.onLock = () => callbacks++;
    const locked = manager.lockEnding(id);
    assert.equal(locked.endingId, id);
    assert.equal(s.worldControlsLocked, true);
    assert.equal(callbacks, 1);
    assert.equal(manager.lockEnding(id), locked);
    assert.equal(callbacks, 1);
    assert.deepEqual(s.endingSnapshot.PLAYER_DECISION_FLAGS, flags);
    assert.equal(deserialize(serialize(s)).ending.endingId, id);
  }
  const s = createState(),
    m = new EndingManager(s);
  assert.equal(m.evaluateEnding(), null);
  assert.throws(() => m.lockEnding(1));
  s.PROOF_WEIGHT = 7.99;
  s.SARAH_STATUS = 1;
  s.PLAYER_DECISION_FLAGS = ["PROOFS_DISPATCHED_TRAIN"];
  assert.equal(m.evaluateEnding(), null);
  s.PROOF_WEIGHT = 8;
  assert.equal(m.evaluateEnding().endingId, 1);
  s.PLAYER_DECISION_FLAGS.push("HELEN_ARMED");
  assert.equal(m.evaluateEnding().endingId, 12);
  s.PARANOIA = 100;
  s.day = 2;
  s.PLAYER_DECISION_FLAGS = ["DAY2_INACTION"];
  assert.equal(m.evaluateEnding().endingId, 13);
  assert.throws(() => m.evaluateEnding({ ...s, REPUTATION: 51 }));
});
test("fixed canon and authored evidence anchors replace random scenarios without losing the legacy archive", async () => {
  for (const seed of [1, 9, 1989, "northvale"])
    assert.equal(createState(seed).case.culpritId, "bobby");
  for (const clue of Object.values(CANONICAL_CLUES)) {
    if (!clue.interiorId) continue;
    const manifest = JSON.parse(
      await readFile(
        new URL(`../assets/interiors/${clue.interiorId}.json`, import.meta.url),
      ),
    );
    assert.ok(
      manifest.rooms
        .find((r) => r.id === clue.roomId)
        ?.props.some((p) => p.id === clue.propId),
    );
  }
  const old = createState();
  delete old.canonVersion;
  delete old.quests;
  old.case = {
    seed: 12,
    archetypeKey: "industrial",
    culpritId: "viktor",
    clues: { old: { title: "Arquivo antigo" } },
  };
  old.evidence.push("old");
  const migrated = deserialize(JSON.stringify(old));
  assert.equal(migrated.case.culpritId, "bobby");
  assert.equal(migrated.legacyCase.culpritId, "viktor");
  assert.ok(migrated.evidence.includes("old"));
  assert.deepEqual(deserialize(serialize(migrated)), migrated);
});
test("old police coordinates are repaired into reachable floor, preserving navigation after layout changes", async () => {
  const embedded = Object.fromEntries(
    await Promise.all(
      INTERIOR_IDS.map(async (id) => [
        id,
        JSON.parse(
          await readFile(
            new URL(`../assets/interiors/${id}.json`, import.meta.url),
          ),
        ),
      ]),
    ),
  );
  const world = new InteriorWorld(new InteriorManifestLoader({ embedded }));
  await world.ready;
  const s = createState();
  s.interior = "police";
  s.interiorRoom = "reception";
  s.player = { x: 800, y: 465, vx: 0, vy: 0 };
  world.enter(s);
  assert.ok(
    world.collision(s).findPath(world.room(s).spawn, s.player).length > 0,
  );
  assert.ok(
    world.navigate(
      s,
      world.doors(s).find((d) => d.id === "reception-office"),
    ).ok,
  );
});
test("rain can destroy material proof without deleting the correct deduction, enabling ending 09 through game actions", () => {
  const s = createState(),
    campaign = new CanonicalCampaign(s);
  s.introDone = true;
  for (const id of ["letter", "report", ...Object.keys(CANONICAL_CLUES)])
    collect(s, id);
  campaign.sync();
  campaign.flag("CORRECT_DEDUCTION");
  campaign.confront("bobby");
  s.interior = "dam";
  assert.ok(campaign.act("unprotected_crossing").ok);
  assert.ok(s.PROOF_WEIGHT <= 3);
  assert.ok(s.PLAYER_DECISION_FLAGS.includes("CORRECT_DEDUCTION"));
  assert.equal(campaign.act("unprotected_crossing").ok, false);
  s.interior = "motel";
  assert.equal(campaign.act("psychiatric").ending.endingId, 9);
});
