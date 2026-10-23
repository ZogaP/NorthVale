import { residents } from "../simulation.js";
import { buildings, door } from "../world.js";
import { cloneRuleData, ruleId, ruleNumber, ruleRecord } from "./RuleData.js";
import { MovementSystem } from "./MovementSystem.js";
import {
  characterIdFor,
  characterAppearance,
} from "../data/CharacterProfiles.js";
import { PEDESTRIAN_SPEED } from "../engine/WorldMetrics.js";

export const NPC_STATES = Object.freeze({
  IDLE: "IDLE",
  PATROLLING: "PATROLLING",
  CONFRONTED: "CONFRONTED",
  HOSTILE: "HOSTILE",
  FLEEING: "FLEEING",
});

// The existing eight story characters are preserved. These 24 supporting residents
// are editable population data, with no new culprit, quest or story commitments.
const supporting = [
  ["agnes", "Agnes Bell", "motel", "motel", 6, 15, "Recepcionista"],
  ["arthur", "Arthur Cole", "home", "registry", 8, 17, "Escrivão"],
  ["beatrice", "Beatrice Shaw", "sarah", "library", 9, 18, "Restauradora"],
  [
    "caleb",
    "Caleb Price",
    "motel",
    "meatpacking",
    6,
    14,
    "Operador de câmara fria",
  ],
  ["doris", "Doris Webb", "home", "diner", 6, 14, "Cozinheira"],
  ["edgar", "Edgar Moss", "motel", "dam", 7, 15, "Operador de comportas"],
  ["flora", "Flora Reed", "home", "pharmacy", 9, 17, "Auxiliar de farmácia"],
  ["george", "George Finch", "motel", "depot", 7, 16, "Conferente"],
  ["harriet", "Harriet Lane", "home", "library", 10, 19, "Catalogadora"],
  ["isaac", "Isaac Ford", "motel", "gasstation", 14, 22, "Frentista"],
  ["june", "June Ellis", "home", "diner", 14, 22, "Garçonete"],
  ["kenneth", "Kenneth Doyle", "motel", "police", 8, 16, "Telefonista"],
  ["lena", "Lena Hart", "home", "registry", 9, 18, "Auxiliar de registro"],
  ["martin", "Martin Wells", "motel", "scrapyard", 8, 17, "Funileiro"],
  ["nora", "Nora Pike", "home", "motel", 7, 16, "Camareira"],
  ["oscar", "Oscar Hayes", "motel", "meatpacking", 14, 22, "Vigia de fábrica"],
  ["pearl", "Pearl Dunn", "home", "library", 12, 20, "Atendente de leitura"],
  ["quentin", "Quentin Ross", "motel", "depot", 8, 17, "Carregador"],
  ["rosa", "Rosa Crane", "home", "diner", 7, 15, "Balconista"],
  ["silas", "Silas Grant", "motel", "dam", 15, 23, "Eletricista"],
  ["tessa", "Tessa Blake", "home", "pharmacy", 8, 16, "Entregadora"],
  ["ulysses", "Ulysses Stone", "motel", "gasstation", 6, 14, "Mecânico"],
  ["vera", "Vera Frost", "home", "police", 9, 17, "Auxiliar de arquivo"],
  ["walter", "Walter Nash", "motel", "meatpacking", 22, 6, "Vigia noturno"],
];

function freezeNPC(npc) {
  npc.characterId = characterIdFor(npc);
  npc.appearance = Object.freeze(characterAppearance(npc));
  for (const slot of npc.schedule) Object.freeze(slot);
  Object.freeze(npc.schedule);
  return Object.freeze(npc);
}

export const DEFAULT_NPC_ROUTINES = Object.freeze([
  ...residents.map((npc) =>
    freezeNPC({
      id: npc.id,
      name: npc.name,
      home: npc.home,
      work: npc.work,
      role: "story",
      schedule: npc.schedule.map(([hour, locationId, activity]) => ({
        start: hour * 60,
        locationId,
        activity,
        state: activity === "Caminhando" ? "PATROLLING" : "IDLE",
      })),
    }),
  ),
  ...supporting.map(([id, name, home, work, start, end, occupation]) => {
    const schedule =
      start < end
        ? [
            { start: 0, locationId: home, activity: "Descansando" },
            { start: start * 60, locationId: work, activity: occupation },
            { start: end * 60, locationId: home, activity: "Em casa" },
          ]
        : [
            { start: 0, locationId: work, activity: occupation },
            { start: end * 60, locationId: home, activity: "Descansando" },
            { start: start * 60, locationId: work, activity: occupation },
          ];
    return freezeNPC({
      id,
      name,
      home,
      work,
      role: "supporting",
      schedule: schedule.map((slot) => ({ ...slot, state: "IDLE" })),
    });
  }),
]);

export const DEFAULT_NPC_LOCATIONS = Object.freeze(
  Object.fromEntries(
    buildings.map((building) => [
      building.id,
      Object.freeze({ ...door(building), inside: true }),
    ]),
  ),
);

const TRANSITIONS = Object.freeze({
  IDLE: ["PATROLLING", "CONFRONTED", "HOSTILE", "FLEEING"],
  PATROLLING: ["IDLE", "CONFRONTED", "HOSTILE", "FLEEING"],
  CONFRONTED: ["IDLE", "PATROLLING", "HOSTILE", "FLEEING"],
  HOSTILE: ["IDLE", "CONFRONTED", "FLEEING"],
  FLEEING: ["IDLE", "HOSTILE"],
});

/** Pure schedule lookup. A host can inject a collision-aware travel resolver. */
export class NPCRoutineSystem {
  constructor(
    state,
    {
      npcs = DEFAULT_NPC_ROUTINES,
      locations = DEFAULT_NPC_LOCATIONS,
      resolveTravel = null,
      onStateChange = () => {},
    } = {},
  ) {
    this.state = ruleRecord(state);
    this.locations = cloneRuleData(locations);
    for (const location of Object.values(this.locations))
      this.validatePosition(location);
    this.npcs = new Map();
    const characterIds = new Set();
    for (const data of npcs) {
      const npc = cloneRuleData(data);
      ruleId(npc.id);
      npc.characterId = ruleId(characterIdFor(npc));
      if (characterIds.has(npc.characterId))
        throw new TypeError("Duplicate character identity.");
      characterIds.add(npc.characterId);
      npc.walkSpeedMps ??= PEDESTRIAN_SPEED.default;
      ruleNumber(npc.walkSpeedMps, PEDESTRIAN_SPEED.min, PEDESTRIAN_SPEED.max);
      npc.appearance ??= characterAppearance(npc);
      if (npc.enabled !== undefined && typeof npc.enabled !== "boolean")
        throw new TypeError("Invalid NPC active flag.");
      if (
        this.npcs.has(npc.id) ||
        !Array.isArray(npc.schedule) ||
        !npc.schedule.length ||
        npc.schedule[0].start !== 0
      )
        throw new TypeError("Invalid NPC schedule.");
      let previous = -1;
      for (const slot of npc.schedule) {
        ruleNumber(slot.start, 0, 1439);
        if (
          !Number.isInteger(slot.start) ||
          slot.start <= previous ||
          !Object.hasOwn(this.locations, slot.locationId) ||
          !["IDLE", "PATROLLING"].includes(slot.state ?? "IDLE")
        )
          throw new TypeError("Invalid schedule slot.");
        previous = slot.start;
        if (slot.enabled !== undefined && typeof slot.enabled !== "boolean")
          throw new TypeError("Invalid routine active flag.");
        if (slot.visible !== undefined && typeof slot.visible !== "boolean")
          throw new TypeError("Invalid routine visibility.");
      }
      this.npcs.set(npc.id, npc);
    }
    this.resolveTravel = resolveTravel;
    this.onStateChange = onStateChange;
    state.npcRoutineState ??= {};
    ruleRecord(state.npcRoutineState);
    for (const [id, record] of Object.entries(state.npcRoutineState)) {
      if (
        !this.npcs.has(id) ||
        !Object.hasOwn(NPC_STATES, record.state) ||
        typeof record.override !== "boolean"
      )
        throw new TypeError("Invalid saved NPC state.");
      if (record.position !== null) this.validatePosition(record.position);
    }
    this.movement = new MovementSystem(state);
    for (const [id, body] of Object.entries(state.npcMovement))
      if (
        !this.npcs.has(id) ||
        body.characterId !== this.npcs.get(id).characterId
      )
        throw new TypeError("Unknown NPC identity in saved locomotion.");
  }

  validatePosition(position) {
    ruleRecord(position);
    ruleNumber(position.x);
    ruleNumber(position.y);
    if (position.locationId !== undefined) ruleId(position.locationId);
    if (position.inside !== undefined && typeof position.inside !== "boolean")
      throw new TypeError("Invalid inside flag.");
  }

  getNPC(npcId) {
    const npc = this.npcs.get(ruleId(npcId));
    if (!npc) throw new RangeError("Unknown NPC.");
    return npc;
  }

  getNPCLocation(npcId, gameTimeHour, gameTimeMinute) {
    const npc = this.getNPC(npcId);
    ruleNumber(gameTimeHour, 0, 23);
    ruleNumber(gameTimeMinute, 0, 59);
    if (!Number.isInteger(gameTimeHour) || !Number.isInteger(gameTimeMinute))
      throw new TypeError("Clock expects integer hours/minutes.");
    const minute = gameTimeHour * 60 + gameTimeMinute;
    let index = npc.schedule.length - 1;
    while (npc.schedule[index].start > minute) index--;
    const slot = npc.schedule[index],
      previous =
        npc.schedule[(index + npc.schedule.length - 1) % npc.schedule.length];
    const record = this.state.npcRoutineState[npcId];
    let position = {
      ...this.locations[slot.locationId],
      locationId: slot.locationId,
    };
    if (record?.override && record.position)
      position = { ...position, ...record.position };
    else if (!record?.override && this.resolveTravel) {
      const travel = this.resolveTravel({
        npc: cloneRuleData(npc),
        from: {
          ...this.locations[previous.locationId],
          locationId: previous.locationId,
        },
        to: cloneRuleData(position),
        elapsedMinutes: minute - slot.start,
        minute,
      });
      if (travel) {
        this.validatePosition(travel);
        position = { ...position, ...cloneRuleData(travel) };
      }
    }
    return {
      ...position,
      npcId,
      characterId: npc.characterId,
      appearance: cloneRuleData(npc.appearance),
      active: npc.enabled !== false && slot.enabled !== false,
      visibleAtDestination:
        slot.visible ??
        (!/Dormindo|Descansando/i.test(slot.activity ?? "") &&
          !(
            npc.role === "supporting" &&
            npc.home !== npc.work &&
            slot.locationId === npc.home
          )),
      scheduleKey: `${slot.start}:${slot.locationId}`,
      activity: slot.activity ?? "",
      state: record?.override ? record.state : (slot.state ?? "IDLE"),
    };
  }

  /** A schedule target is not a physical position; MovementSystem integrates travel. */
  getRoutineTarget(npcId, hour, minute) {
    return this.getNPCLocation(npcId, hour, minute);
  }

  /** Interaction states override the clock until resumeRoutine is called. */
  setNPCState(npcId, nextState, position = null) {
    this.getNPC(npcId);
    if (!Object.hasOwn(NPC_STATES, nextState))
      throw new TypeError("Unknown NPC state.");
    const old = this.state.npcRoutineState[npcId];
    const before = old?.state ?? "IDLE";
    if (before !== nextState && !TRANSITIONS[before].includes(nextState))
      throw new Error(`Illegal NPC transition: ${before} -> ${nextState}`);
    if (position !== null) this.validatePosition(position);
    const next = {
      state: nextState,
      override: true,
      position:
        position === null ? (old?.position ?? null) : cloneRuleData(position),
    };
    this.state.npcRoutineState[npcId] = next;
    if (before !== nextState) this.onStateChange(npcId, before, nextState);
    return cloneRuleData(next);
  }

  resumeRoutine(npcId) {
    this.getNPC(npcId);
    return delete this.state.npcRoutineState[npcId];
  }

  getRoster() {
    return [...this.npcs.values()].map(cloneRuleData);
  }
}
