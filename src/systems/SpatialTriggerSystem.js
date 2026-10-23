import { ruleId, ruleNumber, ruleRecord } from "./RuleData.js";
import {
  spatialAABB,
  spatialSubject,
  spatialOverlap,
} from "./SpatialGeometry.js";

const ENV_LIMITS = Object.freeze({
  humidity: [0, 1],
  footstepNoiseDb: [-100, 100],
  ambientNoiseDb: [0, 100],
});
const BASE_ENVIRONMENT = Object.freeze({
  humidity: 0.5,
  footstepNoiseDb: 0,
  ambientNoiseDb: 0,
});

function environmentValues(data) {
  ruleRecord(data);
  const result = {};
  for (const [key, value] of Object.entries(data)) {
    if (!Object.hasOwn(ENV_LIMITS, key))
      throw new TypeError("Unknown environment modifier.");
    result[key] = ruleNumber(value, ...ENV_LIMITS[key]);
  }
  return result;
}

/** One tracked player; sensors and solid collision volumes are separate registries. */
export class SpatialTriggerSystem {
  constructor({
    zones = [],
    colliders = [],
    baseEnvironment = {},
    onZoneEnter = () => {},
    onZoneStay = () => {},
    onZoneExit = () => {},
    onEnvironmentChange = () => {},
  } = {}) {
    this.zones = new Map();
    this.colliders = new Map();
    this.active = new Set();
    this.baseEnvironment = Object.freeze({
      ...BASE_ENVIRONMENT,
      ...environmentValues(baseEnvironment),
    });
    this.environment = Object.freeze({ ...this.baseEnvironment });
    this.onZoneEnter = onZoneEnter;
    this.onZoneStay = onZoneStay;
    this.onZoneExit = onZoneExit;
    this.onEnvironmentChange = onEnvironmentChange;
    this.updating = false;
    for (const zone of zones) this.setZone(zone);
    for (const collider of colliders) this.setCollider(collider);
  }

  setZone(zone) {
    const id = ruleId(zone.id);
    if (zone.enabled !== undefined && typeof zone.enabled !== "boolean")
      throw new TypeError("Invalid zone enabled flag.");
    const record = {
      id,
      bounds: spatialAABB(zone.bounds ?? zone),
      modifiers: environmentValues(zone.modifiers ?? {}),
      priority: ruleNumber(zone.priority ?? 0),
      enabled: zone.enabled ?? true,
    };
    this.zones.set(id, record);
  }

  removeZone(id) {
    return this.zones.delete(ruleId(id));
  }

  setZoneEnabled(id, enabled) {
    const zone = this.zones.get(ruleId(id));
    if (!zone) throw new RangeError("Unknown trigger zone.");
    if (typeof enabled !== "boolean")
      throw new TypeError("Expected boolean enabled flag.");
    zone.enabled = enabled;
  }

  setCollider(collider) {
    const id = ruleId(collider.id);
    if (collider.enabled !== undefined && typeof collider.enabled !== "boolean")
      throw new TypeError("Invalid collider enabled flag.");
    this.colliders.set(id, {
      id,
      bounds: spatialAABB(collider.bounds ?? collider),
      enabled: collider.enabled ?? true,
    });
  }

  removeCollider(id) {
    return this.colliders.delete(ruleId(id));
  }

  /** Returns stable IDs; movement/penetration resolution remains the host's responsibility. */
  queryCollisions(subject) {
    const bounds = spatialSubject(subject);
    return [...this.colliders.values()]
      .filter(
        (collider) =>
          collider.enabled && spatialOverlap(bounds, collider.bounds),
      )
      .map((collider) => collider.id)
      .sort();
  }

  getActiveZones() {
    return [...this.active].sort();
  }
  getEnvironment() {
    return { ...this.environment };
  }

  computeEnvironment(zoneRecords) {
    const environment = { ...this.baseEnvironment };
    const sorted = zoneRecords
      .slice()
      .sort(
        (a, b) =>
          a.priority - b.priority || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
      );
    for (const zone of sorted) {
      for (const [key, value] of Object.entries(zone.modifiers)) {
        if (key === "footstepNoiseDb") environment[key] += value;
        else environment[key] = value;
      }
    }
    environment.footstepNoiseDb = Math.max(
      -100,
      Math.min(100, environment.footstepNoiseDb),
    );
    return environment;
  }

  /** Closed AABBs include boundary contact. New entries receive Enter; subsequent ticks receive Stay. */
  update(player, dt) {
    if (this.updating) throw new Error("Trigger updates cannot be reentrant.");
    ruleNumber(dt, 0);
    const bounds = spatialSubject(player);
    const records = [...this.zones.values()].filter(
      (zone) => zone.enabled && spatialOverlap(bounds, zone.bounds),
    );
    const next = new Set(records.map((zone) => zone.id));
    const exits = [...this.active].filter((id) => !next.has(id)).sort();
    const enters = [...next].filter((id) => !this.active.has(id)).sort();
    const stays = [...next].filter((id) => this.active.has(id)).sort();
    const environment = this.computeEnvironment(records),
      previous = this.environment;
    const changed = Object.keys(environment).some(
      (key) => environment[key] !== previous[key],
    );
    // Commit before notification. Registry mutations in callbacks apply next tick.
    this.active = next;
    this.environment = Object.freeze(environment);
    this.updating = true;
    try {
      for (const id of exits) this.onZoneExit(id);
      for (const id of enters) this.onZoneEnter(id);
      for (const id of stays) this.onZoneStay(id, dt);
      if (changed)
        this.onEnvironmentChange({ ...environment }, { ...previous });
    } finally {
      this.updating = false;
    }
    return {
      entered: enters,
      stayed: stays,
      exited: exits,
      environment: { ...environment },
    };
  }
}
