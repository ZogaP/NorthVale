import test from "node:test";
import assert from "node:assert/strict";
import { DeductionEngine } from "../src/systems/DeductionEngine.js";
import { EvidenceInventorySystem } from "../src/systems/EvidenceInventorySystem.js";
import {
  NPCRoutineSystem,
  DEFAULT_NPC_ROUTINES,
} from "../src/systems/NPCRoutineSystem.js";
import { DialogueTreeRunner } from "../src/systems/DialogueTreeRunner.js";
import { SaveLoadManager } from "../src/systems/SaveLoadManager.js";
import { createState, serialize, deserialize } from "../src/state.js";
import { CanonicalCampaign } from "../src/systems/CanonicalCampaign.js";

function memoryStorage() {
  const data = new Map();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  };
}

const graphOptions = {
  nodes: ["a", "b", "c", "noise"],
  theses: [
    {
      id: "culprit",
      title: "Responsabilidade",
      requiredClueIds: ["a", "b", "c"],
    },
  ],
};

test("deductions require a connected validated graph, award once, penalize false links once across reloads", () => {
  const state = { evidence: ["a", "b", "c", "noise"], PARANOIA: 20 };
  const engine = new DeductionEngine(state, graphOptions);
  const ab = engine.connectNodes("a", "b");
  assert.equal(engine.connectNodes("b", "a"), ab);
  assert.deepEqual(engine.getProvenTheses(), []);
  assert.equal(engine.validateConnection(ab), true);
  assert.equal(engine.validateConnection(ab), true);
  assert.equal(state.PROOF_WEIGHT, 1);
  const wrong = engine.connectNodes("noise", "a");
  assert.equal(engine.validateConnection(wrong), false);
  assert.equal(state.PARANOIA, 25);
  const reloaded = new DeductionEngine(
    JSON.parse(JSON.stringify(state)),
    graphOptions,
  );
  reloaded.validateConnection(wrong);
  reloaded.validateConnection(ab);
  assert.equal(reloaded.state.PARANOIA, 25);
  assert.equal(reloaded.state.PROOF_WEIGHT, 1);
  reloaded.validateConnection(reloaded.connectNodes("b", "c"));
  assert.deepEqual(
    reloaded.getProvenTheses().map((t) => t.id),
    ["culprit"],
  );
  assert.equal(reloaded.getProofWeight(), 2);
  reloaded.state.evidenceIntegrity.c = false;
  assert.deepEqual(reloaded.getProvenTheses(), []);
  assert.equal(reloaded.getProofWeight(), 1);
});

test("deductions reject unknown, unowned, self and damaged clues; scores respect canonical caps", () => {
  const state = {
    evidence: ["a", "b", "noise"],
    PROOF_WEIGHT: 9.5,
    PARANOIA: 98,
  };
  const engine = new DeductionEngine(state, graphOptions);
  for (const pair of [
    ["a", "a"],
    ["a", "unknown"],
    ["a", "c"],
  ])
    assert.throws(() => engine.connectNodes(...pair));
  const edge = engine.connectNodes("a", "b");
  state.evidenceIntegrity.b = false;
  assert.throws(() => engine.validateConnection(edge));
  assert.equal(state.PROOF_WEIGHT, 9.5);
  state.evidenceIntegrity.b = true;
  engine.validateConnection(edge);
  engine.validateConnection(engine.connectNodes("a", "noise"));
  assert.equal(state.PROOF_WEIGHT, 10);
  assert.equal(state.PARANOIA, 100);
  const corrupt = structuredClone(state);
  corrupt.deductionGraph.edges[0].status = "invalid";
  assert.throws(() => new DeductionEngine(corrupt, graphOptions));
});

test("canonical sync preserves deduction contributions, unlocks the culprit thesis and drops damaged proof", () => {
  const state = createState();
  state.evidence.push("viatura04", "owen_confession", "bobby_trace");
  const graph = new DeductionEngine(state),
    campaign = new CanonicalCampaign(state);
  campaign.sync();
  assert.equal(state.PROOF_WEIGHT, 3);
  graph.validateConnection(graph.connectNodes("viatura04", "owen_confession"));
  graph.validateConnection(
    graph.connectNodes("owen_confession", "bobby_trace"),
  );
  campaign.sync();
  assert.equal(state.PROOF_WEIGHT, 5);
  assert.ok(state.PLAYER_DECISION_FLAGS.includes("CORRECT_DEDUCTION"));
  campaign.sync();
  assert.equal(state.PROOF_WEIGHT, 5);
  state.evidenceIntegrity.owen_confession = false;
  campaign.sync();
  assert.equal(state.PROOF_WEIGHT, 2);
  assert.ok(state.PLAYER_DECISION_FLAGS.includes("CORRECT_DEDUCTION"));
});

test("inventory keeps provenance isolated, supports legacy IDs and tracks evidence damage", () => {
  const state = { inventory: ["Lanterna"], evidence: ["letter"] };
  const inventory = new EvidenceInventorySystem(state);
  assert.equal(inventory.hasItem("Lanterna"), true);
  assert.deepEqual(inventory.getItemMetadata("letter"), {});
  const item = {
    id: "viatura04",
    type: "evidence",
    metadata: { source: "depot", chain: [{ actor: "Alex", day: 1 }] },
  };
  assert.equal(inventory.addItem(item), true);
  item.metadata.chain[0].actor = "changed";
  const metadata = inventory.getItemMetadata("viatura04");
  metadata.chain[0].actor = "also changed";
  assert.equal(inventory.getItemMetadata("viatura04").chain[0].actor, "Alex");
  assert.equal(inventory.addItem({ ...item, metadata: {} }), false);
  inventory.setEvidenceIntegrity("viatura04", false);
  assert.equal(inventory.getItem("viatura04").integrity, false);
  assert.equal(
    new EvidenceInventorySystem(structuredClone(state)).getItem("viatura04")
      .integrity,
    false,
  );
  assert.equal(inventory.removeItem("viatura04"), true);
  assert.equal(inventory.removeItem("viatura04"), false);
  assert.equal(inventory.getItemMetadata("viatura04"), null);
  assert.equal(state.evidenceIntegrity.viatura04, undefined);
});

test("lockpick wear persists, clamps at zero and cannot be reset by collecting a duplicate", () => {
  const inventory = new EvidenceInventorySystem({});
  inventory.addItem({
    id: "lockpick",
    type: "tool",
    durability: 3,
    maxDurability: 3,
  });
  assert.deepEqual(inventory.useTool("lockpick", 2), {
    durability: 1,
    broken: false,
  });
  assert.equal(
    inventory.addItem({
      id: "lockpick",
      type: "tool",
      durability: 3,
      maxDurability: 3,
    }),
    false,
  );
  assert.deepEqual(inventory.useTool("lockpick", 2), {
    durability: 0,
    broken: true,
  });
  assert.equal(inventory.useTool("lockpick"), false);
  assert.equal(
    new EvidenceInventorySystem(structuredClone(inventory.state)).getItem(
      "lockpick",
    ).durability,
    0,
  );
  assert.throws(() => inventory.useTool("lockpick", -1));
  assert.throws(() =>
    inventory.addItem({
      id: "bad",
      type: "tool",
      durability: 4,
      maxDurability: 3,
    }),
  );
  assert.throws(() =>
    inventory.addItem({ id: "nan", metadata: { weight: NaN } }),
  );
});

test("all 32 NPCs have valid 24-hour schedules, including the overnight shift", () => {
  const routines = new NPCRoutineSystem({});
  assert.equal(DEFAULT_NPC_ROUTINES.length, 32);
  assert.equal(new Set(routines.getRoster().map((npc) => npc.id)).size, 32);
  for (const npc of routines.getRoster())
    for (let minute = 0; minute < 1440; minute++) {
      const position = routines.getNPCLocation(
        npc.id,
        Math.floor(minute / 60),
        minute % 60,
      );
      assert.ok(Number.isFinite(position.x) && Number.isFinite(position.y));
      assert.ok(["IDLE", "PATROLLING"].includes(position.state));
    }
  assert.equal(
    routines.getNPCLocation("walter", 5, 59).locationId,
    "meatpacking",
  );
  assert.equal(routines.getNPCLocation("walter", 6, 0).locationId, "motel");
  assert.equal(
    routines.getNPCLocation("walter", 22, 0).locationId,
    "meatpacking",
  );
  assert.equal(routines.getNPCLocation("ruth", 7, 0).locationId, "police");
  assert.throws(() => routines.getNPCLocation("ruth", 24, 0));
  assert.throws(() => routines.getNPCLocation("ruth", 7, 60));
  assert.throws(() => routines.getNPCLocation("ruth", 7.5, 0));
  assert.throws(() => routines.getNPCLocation("nobody", 7, 0));
});

test("NPC confrontation overrides routines, legal transitions persist, and travel is injectable", () => {
  const state = {},
    changes = [];
  const routines = new NPCRoutineSystem(state, {
    onStateChange: (...args) => changes.push(args),
  });
  routines.setNPCState("bobby", "CONFRONTED", {
    x: 725,
    y: 801,
    inside: false,
    locationId: "diner",
  });
  assert.equal(routines.getNPCLocation("bobby", 23, 0).locationId, "diner");
  routines.setNPCState("bobby", "HOSTILE");
  assert.throws(() => routines.setNPCState("bobby", "PATROLLING"));
  routines.setNPCState("bobby", "FLEEING");
  const loaded = new NPCRoutineSystem(structuredClone(state));
  assert.equal(loaded.getNPCLocation("bobby", 9, 0).state, "FLEEING");
  assert.equal(loaded.getNPCLocation("bobby", 9, 0).x, 725);
  loaded.resumeRoutine("bobby");
  assert.equal(loaded.getNPCLocation("bobby", 9, 0).locationId, "scrapyard");
  assert.equal(changes.length, 3);
  const traveling = new NPCRoutineSystem(
    {},
    {
      resolveTravel: ({ elapsedMinutes, to }) =>
        elapsedMinutes < 10
          ? { x: 720, y: 800, inside: false, locationId: to.locationId }
          : null,
    },
  );
  assert.equal(traveling.getNPCLocation("ruth", 7, 2).inside, false);
  assert.equal(traveling.getNPCLocation("ruth", 7, 10).inside, true);
});

const interview = {
  id: "bobby-interview",
  start: "opening",
  nodes: {
    opening: {
      speakerId: "bobby",
      text: "Eu nunca dirigi aquela viatura.",
      choices: [
        {
          id: "confront",
          text: "O registro diz o contrário.",
          requirements: {
            items: ["viatura04"],
            variables: {
              REPUTATION: { gte: 5 },
              SCRUTINY: { lte: 80 },
              BOBBY_STABILITY: { gte: 10 },
            },
          },
          effects: {
            variables: { BOBBY_STABILITY: -20, SCRUTINY: 5 },
            items: [
              {
                id: "testimony",
                type: "evidence",
                metadata: { witness: "bobby" },
              },
            ],
          },
          next: "answer",
        },
        { id: "leave", text: "Até mais.", next: null },
      ],
    },
    answer: { speakerId: "bobby", text: "Eu estava lá.", next: "opening" },
  },
};

test("dialogue filters and rechecks inventory/reputation/scrutiny/stability requirements", () => {
  const state = { REPUTATION: 0, SCRUTINY: 0, BOBBY_STABILITY: 70 };
  const runner = new DialogueTreeRunner(state, { trees: [interview] });
  assert.equal(runner.start(interview.id), true);
  assert.deepEqual(
    runner.getCurrentNode().choices.map((c) => c.id),
    ["leave"],
  );
  new EvidenceInventorySystem(state).addItem({
    id: "viatura04",
    type: "evidence",
  });
  state.REPUTATION = 5;
  assert.equal(runner.getCurrentNode().choices.length, 2);
  state.SCRUTINY = 81;
  assert.equal(runner.choose("confront"), false);
  assert.equal(state.BOBBY_STABILITY, 70);
  state.SCRUTINY = 0;
  state.BOBBY_STABILITY = 9;
  assert.equal(runner.choose("confront"), false);
  assert.equal(runner.choose("invented-choice"), false);
});

test("dialogue effects are atomic and once-only across cycles, restarts and save/load; events carry actual deltas", () => {
  const state = {
      inventory: [],
      evidence: ["viatura04"],
      REPUTATION: 5,
      BOBBY_STABILITY: 15,
      SCRUTINY: 0,
    },
    events = [];
  const options = {
    trees: [interview],
    onVariableChange: (name, delta) => events.push([name, delta]),
    onItemReceived: (id) => events.push(["item", id]),
  };
  const runner = new DialogueTreeRunner(state, options);
  runner.start(interview.id);
  assert.equal(runner.choose("confront"), true);
  assert.equal(state.BOBBY_STABILITY, 0);
  assert.deepEqual(events, [
    ["BOBBY_STABILITY", -15],
    ["SCRUTINY", 5],
    ["item", "testimony"],
  ]);
  const restored = new DialogueTreeRunner(structuredClone(state), options);
  assert.equal(restored.getCurrentNode().nodeId, "answer");
  restored.advance();
  restored.state.BOBBY_STABILITY = 50;
  restored.choose("confront");
  assert.equal(restored.state.BOBBY_STABILITY, 50);
  assert.equal(events.length, 3);
  restored.advance();
  restored.choose("leave");
  restored.start(interview.id);
  restored.choose("confront");
  assert.equal(events.length, 3);
});

test("failed destination prerequisites roll back effects and malformed authored trees fail before execution", () => {
  const state = { REPUTATION: 0 };
  const tree = {
    id: "gate",
    start: "a",
    nodes: {
      a: {
        text: "a",
        choices: [
          {
            id: "try",
            text: "try",
            next: "b",
            effects: {
              variables: { REPUTATION: 2 },
              items: [{ id: "reward" }],
            },
          },
        ],
      },
      b: {
        text: "b",
        requirements: { variables: { REPUTATION: { gte: 10 } } },
      },
    },
  };
  const runner = new DialogueTreeRunner(state, { trees: [tree] });
  runner.start("gate");
  const before = structuredClone(state);
  assert.equal(runner.choose("try"), false);
  assert.deepEqual(state, before);
  const malformed = structuredClone(tree);
  malformed.nodes.a.choices[0].next = "missing";
  assert.throws(() => new DialogueTreeRunner({}, { trees: [malformed] }));
  const unknown = structuredClone(tree);
  unknown.nodes.b.requirements.variables.UNKNOWN = { gte: 1 };
  assert.throws(() => new DialogueTreeRunner({}, { trees: [unknown] }));
});

test("three manual slots and transition autosave preserve complete rule state and the root reference", () => {
  const storage = memoryStorage(),
    state = createState();
  const inventory = new EvidenceInventorySystem(state);
  inventory.addItem({ id: "viatura04", type: "evidence" });
  inventory.addItem({ id: "owen_confession", type: "evidence" });
  inventory.addItem({
    id: "lockpick",
    type: "tool",
    durability: 4,
    maxDurability: 5,
  });
  const deductions = new DeductionEngine(state);
  deductions.validateConnection(
    deductions.connectNodes("viatura04", "owen_confession"),
  );
  new NPCRoutineSystem(state).setNPCState("ruth", "HOSTILE");
  const dialogue = new DialogueTreeRunner(state, { trees: [interview] });
  dialogue.start(interview.id);
  const saves = new SaveLoadManager(state, {
    storage,
    serialize,
    deserialize,
    now: () => new Date("1989-10-21T23:59:00Z"),
  });
  for (const slot of [1, 2, 3]) {
    state.day = slot;
    saves.saveGame(slot);
  }
  state.interior = "police";
  saves.onAreaTransition("police");
  const auto = storage.getItem("northvale:slots:autosave");
  assert.equal(saves.onAreaTransition("police"), null);
  assert.equal(storage.getItem("northvale:slots:autosave"), auto);
  state.day = 7;
  state.temporary = true;
  saves.loadGame("1");
  assert.equal(state.day, 1);
  assert.equal(state.temporary, undefined);
  assert.equal(inventory.getItem("lockpick").durability, 4);
  assert.equal(
    new NPCRoutineSystem(state).getNPCLocation("ruth", 8, 0).state,
    "HOSTILE",
  );
  assert.equal(
    new DialogueTreeRunner(state, { trees: [interview] }).getCurrentNode()
      .nodeId,
    "opening",
  );
  const restoredGraph = new DeductionEngine(state);
  assert.deepEqual(
    restoredGraph.getProvenTheses().map((t) => t.id),
    ["canonical-route"],
  );
  restoredGraph.validateConnection(
    restoredGraph.connectNodes("viatura04", "owen_confession"),
  );
  assert.equal(state.PROOF_WEIGHT, 1);
  assert.deepEqual(
    saves.getSavedSlotsInfo().map((info) => info.slotId),
    [1, 2, 3, "autosave"],
  );
  assert.ok(saves.getSavedSlotsInfo().every((info) => info.status === "saved"));
  assert.throws(() => saves.saveGame(4));
  assert.throws(() => saves.loadGame(0));
});

test("corrupted/unsupported slots never replace live state; quota errors preserve prior saves", () => {
  const storage = memoryStorage(),
    state = { day: 1, inventory: [] };
  const saves = new SaveLoadManager(state, {
    storage,
    validateState: (value) => Number.isInteger(value.day) && value.day > 0,
  });
  saves.saveGame(1);
  const previous = storage.getItem("northvale:slots:1");
  storage.setItem("northvale:slots:2", "{invalid");
  const unsupported = JSON.parse(previous);
  unsupported.version = 2;
  unsupported.slotId = 3;
  storage.setItem("northvale:slots:3", JSON.stringify(unsupported));
  const before = structuredClone(state);
  assert.throws(() => saves.loadGame(2));
  assert.throws(() => saves.loadGame(3));
  assert.deepEqual(state, before);
  assert.deepEqual(
    saves.getSavedSlotsInfo().map((info) => info.status),
    ["saved", "corrupt", "corrupt", "empty"],
  );
  storage.setItem = () => {
    throw new Error("QuotaExceededError");
  };
  state.day = 2;
  assert.throws(() => saves.saveGame(1), /Quota/);
  assert.throws(() => saves.onAreaTransition("police"), /Quota/);
  assert.equal(saves.lastArea, "exterior");
  assert.equal(storage.getItem("northvale:slots:1"), previous);
  state.day = -1;
  assert.throws(() => saves.saveGame(1), /validator/);
  state.day = 1;
  state.nonSerializable = new Set(["bad"]);
  assert.throws(() => saves.saveGame(1), /plain JSON/);
});

test("legacy single save imports into an empty manual slot, keeps its source and binds a generic area event bus", () => {
  const storage = memoryStorage();
  storage.setItem(
    "northvale-save",
    JSON.stringify({ day: 2, interior: "motel", nested: { switchOn: true } }),
  );
  const state = { day: 1 },
    saves = new SaveLoadManager(state, { storage });
  assert.equal(saves.getSavedSlotsInfo()[0].status, "empty");
  saves.loadGame(1);
  assert.equal(state.day, 2);
  assert.equal(state.nested.switchOn, true);
  assert.ok(storage.getItem("northvale-save"));
  assert.equal(saves.importLegacySave(1), false);
  let handler;
  const unsubscribe = saves.bindAreaTransitions((callback) => {
    handler = callback;
    return () => {
      handler = null;
    };
  });
  state.interior = "police";
  handler("police");
  assert.equal(saves.getSavedSlotsInfo()[3].area, "police");
  unsubscribe();
  assert.equal(handler, null);
});
