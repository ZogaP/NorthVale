import test from "node:test";
import assert from "node:assert/strict";
import {
  GameEngine,
  GAME_STATES,
  memoryGameStorage,
} from "../src/GameEngine.js";
import { CutsceneDirector } from "../src/systems/CutsceneDirector.js";
import { fitGameViewport } from "../src/main.js";
import { DetectiveJournal } from "../src/ui/DetectiveJournal.js";

const tree = {
  id: "test",
  start: "a",
  nodes: {
    a: {
      speakerId: "bobby",
      text: "a",
      choices: [
        {
          id: "proof",
          text: "proof",
          next: "b",
          effects: { variables: { REPUTATION: 2 } },
        },
      ],
    },
    b: { text: "b" },
  },
};
function exploration(options = {}) {
  const engine = new GameEngine({ trees: [tree], ...options });
  engine.newGame();
  engine.director.skip();
  return engine;
}
function key(engine, code, value = code) {
  const event = { code, key: value, preventDefault() {}, target: {} };
  engine.input.down(code, event);
  const result = engine.handleKey(event);
  engine.input.held.delete(code);
  return result;
}

test("one RAF loop clamps spikes, resets its first timestamp, uses bounded physics steps and cancels cleanly", () => {
  const pending = new Map(),
    moves = [],
    visuals = [],
    errors = [];
  let next = 1;
  const engine = exploration({
    requestFrame: (cb) => {
      const id = next++;
      pending.set(id, cb);
      return id;
    },
    cancelFrame: (id) => pending.delete(id),
    world: { movePlayer: (dt) => moves.push(dt) },
    presentation: { update: (dt) => visuals.push(dt) },
    onError: (error) => errors.push(error),
  });
  const tick = (time) => {
    assert.equal(pending.size, 1);
    const [id, fn] = pending.entries().next().value;
    pending.delete(id);
    fn(time);
  };
  engine.start();
  engine.start();
  tick(1000);
  tick(1016);
  tick(20000);
  tick(19000);
  assert.deepEqual(visuals, [0, 0.016, 0.1, 0]);
  assert.ok(moves.every((dt) => dt <= 1 / 120 + 1e-12));
  assert.ok(Math.abs(moves.reduce((a, b) => a + b, 0) - 0.116) < 1e-9);
  engine.stop();
  assert.equal(pending.size, 0);
  engine.start();
  tick(999999);
  assert.equal(visuals.at(-1), 0);
  engine.destroy();
  assert.equal(pending.size, 0);
  assert.throws(() => engine.start(), /destroyed/);
  assert.deepEqual(errors, []);
});

test("render delegates five layers in order and never mutates the logical clock", () => {
  const order = [],
    presentation = {};
  for (const name of [
    "beginFrame",
    "renderGround",
    "renderEntities",
    "renderRoofs",
    "renderWeatherLighting",
    "renderUI",
    "renderModal",
    "endFrame",
  ])
    presentation[name] = () => order.push(name);
  const engine = exploration({ presentation });
  const before = JSON.stringify(engine.state);
  engine.render();
  assert.deepEqual(order, [
    "beginFrame",
    "renderGround",
    "renderEntities",
    "renderRoofs",
    "renderWeatherLighting",
    "renderUI",
    "renderModal",
    "endFrame",
  ]);
  assert.equal(JSON.stringify(engine.state), before);
  order.length = 0;
  engine.transition("MAIN_MENU");
  engine.render();
  assert.deepEqual(order, [
    "beginFrame",
    "renderUI",
    "renderModal",
    "endFrame",
  ]);
});

test("all ten states have guarded transitions; intro completion is one-shot and stale callbacks cannot reenter exploration", () => {
  assert.equal(Object.keys(GAME_STATES).length, 10);
  const engine = new GameEngine();
  assert.throws(() => engine.transition("LOCKPICKING"), /Illegal/);
  assert.throws(() => engine.transition("UNKNOWN"), /Unknown/);
  engine.newGame();
  const oldToken = engine.payload.token;
  engine.director.complete(oldToken);
  assert.equal(engine.state.introDone, true);
  assert.equal(engine.mode, "EXPLORATION");
  assert.equal(engine.director.complete(oldToken), false);
  engine.transition("MAIN_MENU");
  engine.newGame();
  assert.equal(engine.director.complete(oldToken), false);
  assert.equal(engine.mode, "INTRO_CUTSCENE");
  engine.transition("MAIN_MENU");
  assert.equal(engine.director.scene, null);
  engine.transition("CREDITS");
  engine.transition("MAIN_MENU");
});

test("notebook, map, corkboard and Escape close modals before pause; no modal advances the world clock", () => {
  const engine = exploration(),
    minute = engine.state.minute;
  key(engine, "Tab", "Tab");
  assert.equal(engine.overlay, "journal");
  engine.update(0.1);
  assert.equal(engine.state.minute, minute);
  key(engine, "Escape", "Escape");
  assert.equal(engine.overlay, null);
  assert.equal(engine.paused, false);
  key(engine, "KeyM", "m");
  assert.equal(engine.overlay, "map");
  key(engine, "KeyM", "m");
  assert.equal(engine.overlay, null);
  key(engine, "KeyC", "c");
  assert.equal(engine.mode, "CORKBOARD");
  engine.update(0.1);
  assert.equal(engine.state.minute, minute);
  key(engine, "Escape", "Escape");
  assert.equal(engine.mode, "EXPLORATION");
  assert.equal(engine.paused, false);
  key(engine, "Escape", "Escape");
  assert.equal(engine.paused, true);
  engine.update(0.1);
  assert.equal(engine.state.minute, minute);
  key(engine, "Escape", "Escape");
  assert.equal(engine.paused, false);
  engine.update(0.1);
  assert.ok(engine.state.minute > minute);
});

test("dialogue bridges guarded choices, pauses movement, focuses its speaker and restores from a manual slot", () => {
  const storage = memoryGameStorage(),
    shown = [],
    engine = exploration({
      storage,
      presentation: { showDialogue: (node) => shown.push(node) },
    });
  engine.startDialogue("test", "bobby");
  assert.equal(engine.input.worldEnabled, false);
  assert.equal(engine.camera.target, "bobby");
  const minute = engine.state.minute;
  engine.update(0.1);
  assert.equal(engine.state.minute, minute);
  assert.equal(engine.chooseDialogue("fake"), false);
  engine.chooseDialogue("proof");
  engine.saveGame(2);
  engine.advanceDialogue();
  assert.equal(engine.mode, "EXPLORATION");
  engine.loadGame(2);
  assert.equal(engine.mode, "DIALOGUE");
  assert.equal(engine.systems.dialogue.getCurrentNode().nodeId, "b");
  assert.equal(engine.state.REPUTATION, 2);
  engine.advanceDialogue();
  assert.equal(engine.input.worldEnabled, true);
  assert.equal(engine.camera.target, null);
});

test("inspection, owned cassettes, lockpick wear and deduction connections use their logical systems", () => {
  const unlocked = [],
    engine = exploration({
      world: { unlockDoor: (door) => unlocked.push(door.id) },
    });
  engine.inspect({ type: "document", title: "Registro", text: "Teste" });
  assert.equal(engine.mode, "INSPECTION");
  engine.closeMode();
  assert.equal(engine.playCassette("tape"), false);
  engine.systems.inventory.addItem({ id: "tape", type: "evidence" });
  assert.equal(engine.playCassette("tape"), true);
  assert.equal(engine.mode, "CASSETTE");
  engine.closeMode();
  engine.systems.inventory.addItem({
    id: "Gazua de Aço",
    type: "tool",
    durability: 100,
    maxDurability: 100,
  });
  assert.equal(engine.startLockpicking({ id: "door" }), true);
  const minute = engine.state.minute;
  engine.payload.pickAngle = engine.payload.targetAngle + 25;
  engine.input.held.add("Space");
  engine.update(0.1);
  assert.ok(engine.systems.inventory.getItem("Gazua de Aço").durability < 100);
  assert.equal(engine.state.minute, minute);
  engine.payload.pickAngle = engine.payload.targetAngle;
  for (let i = 0; i < 15; i++) engine.update(0.1);
  assert.deepEqual(unlocked, ["door"]);
  assert.equal(engine.mode, "EXPLORATION");
  for (const id of ["viatura04", "owen_confession"])
    engine.systems.inventory.addItem({ id, type: "evidence" });
  engine.transition("CORKBOARD");
  assert.equal(engine.connectClues("viatura04", "owen_confession"), true);
  const weight = engine.state.PROOF_WEIGHT;
  engine.connectClues("owen_confession", "viatura04");
  assert.equal(engine.state.PROOF_WEIGHT, weight);
  engine.systems.inventory.addItem({ id: "letter", type: "evidence" });
  const paranoia = engine.state.PARANOIA;
  assert.equal(engine.connectClues("letter", "viatura04"), false);
  assert.equal(engine.state.PARANOIA, paranoia + 5);
});

test("a qualified ending locks exploration, persists the epilogue and permits only credits/menu continuation", () => {
  const engine = exploration();
  engine.state.PLAYER_DECISION_FLAGS.push("ABANDONED_CITY");
  engine.update(0.01);
  assert.equal(engine.mode, "EPILOGUE");
  assert.equal(engine.state.ending.endingId, 13);
  assert.equal(engine.input.worldEnabled, false);
  assert.throws(() => engine.transition("EXPLORATION"));
  engine.transition("CREDITS");
  engine.transition("MAIN_MENU");
  engine.loadGame("autosave");
  assert.equal(engine.mode, "EPILOGUE");
  const viaAction = exploration();
  viaAction.state.interior = "motel";
  assert.equal(viaAction.act("abandon").ending.endingId, 13);
  assert.equal(viaAction.mode, "EPILOGUE");
});

test("area autosave failures report errors without stopping the engine; suspension clears held movement", () => {
  const errors = [],
    storage = memoryGameStorage(),
    engine = exploration({
      storage,
      onError: (error) => errors.push(error.message),
    });
  engine.areaChanged("police/reception");
  assert.equal(engine.systems.saves.getSavedSlotsInfo()[3].status, "saved");
  storage.setItem = () => {
    throw Error("quota");
  };
  engine.areaChanged("police/office");
  assert.deepEqual(errors, ["quota"]);
  engine.input.held.add("KeyW");
  engine.suspend();
  assert.equal(engine.input.held.size, 0);
  assert.equal(engine.paused, true);
});

test("cutscene director supports cancellation, validated clocks and exactly one completion", () => {
  const director = new CutsceneDirector(),
    calls = [];
  director.play("intro", { duration: 1, onComplete: () => calls.push("done") });
  director.update(0.5);
  assert.equal(director.getRenderState().progress, 0.5);
  director.update(0.5);
  director.skip();
  assert.deepEqual(calls, ["done"]);
  director.play("intro", { duration: 1 });
  director.cancel();
  assert.equal(director.getRenderState(), null);
  assert.throws(() => director.play("intro", { duration: 0 }));
  assert.throws(() => director.update(NaN));
});

test("responsive viewport fits landscape/portrait/DPR without stretching the logical aspect ratio", () => {
  for (const [width, height, dpr] of [
    [800, 600, 2],
    [360, 800, 3],
    [2560, 1440, 2],
    [1440, 900, 1],
  ]) {
    const fit = fitGameViewport(width, height, dpr);
    assert.ok(fit.cssWidth <= width && fit.cssHeight <= height);
    assert.ok(Math.abs(fit.cssWidth / fit.cssHeight - 1.6) < 1e-9);
    assert.ok(fit.pixelRatio > 0 && fit.pixelRatio <= 2);
  }
  assert.throws(() => fitGameViewport(0, 100));
});

test("journal paginates all evidence, quests and 32 schedules through the provided Gemini view", () => {
  const engine = exploration(),
    shown = [];
  engine.systems.inventory.addItem({ id: "letter", type: "evidence" });
  let close;
  const view = {
    open: (data, onClose) => {
      shown.push(data);
      close = onClose;
    },
    close: () => close(),
    update() {},
    render() {},
    handleKeyDown: () => false,
  };
  const journal = new DetectiveJournal(view);
  let closed = 0;
  journal.open(engine.state, {
    npcs: engine.systems.routines.getRoster(),
    onClose: () => closed++,
  });
  const count = journal.pages.length;
  for (let i = 0; i < count; i++) journal.handleKey("ArrowRight");
  assert.equal(journal.page, 0);
  assert.ok(shown.some((data) => data.front.title.includes("Carta inacabada")));
  assert.equal(
    journal.pages.filter((page) => page.text.includes("00:00")).length,
    32,
  );
  journal.close();
  assert.equal(closed, 1);
});
