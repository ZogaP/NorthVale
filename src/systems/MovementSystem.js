import { cloneRuleData, ruleId, ruleNumber, ruleRecord } from "./RuleData.js";
import { PEDESTRIAN_SPEED } from "../engine/WorldMetrics.js";

function point(p) {
  return { x: ruleNumber(p.x), y: ruleNumber(p.y), z: ruleNumber(p.z ?? 0) };
}

/** Saved metric locomotion. Scheduling supplies goals; only dt integration moves bodies. */
export class MovementSystem {
  constructor(state) {
    ruleRecord(state);
    state.npcMovement ??= {};
    ruleRecord(state.npcMovement);
    this.entities = state.npcMovement;
    for (const [id, entity] of Object.entries(this.entities)) {
      ruleId(id);
      ruleId(entity.characterId);
      point(entity.position);
      point(entity.velocity);
      ruleNumber(entity.speedMps, PEDESTRIAN_SPEED.min, PEDESTRIAN_SPEED.max);
      if (
        !Array.isArray(entity.path) ||
        !Number.isInteger(entity.waypointIndex) ||
        entity.waypointIndex < 0 ||
        entity.waypointIndex > entity.path.length ||
        typeof entity.inside !== "boolean" ||
        typeof entity.scheduleKey !== "string"
      )
        throw new TypeError("Invalid saved locomotion.");
      entity.path.forEach(point);
      if (entity.locationId !== null) ruleId(entity.locationId);
      if (entity.arrivalLocationId !== undefined)
        ruleId(entity.arrivalLocationId);
      if (
        entity.arrivalInside !== undefined &&
        typeof entity.arrivalInside !== "boolean"
      )
        throw new TypeError("Invalid arrival space.");
      if (entity.routeRevision !== undefined)
        ruleNumber(entity.routeRevision, 0);
      if (
        entity.suspended !== undefined &&
        typeof entity.suspended !== "boolean"
      )
        throw new TypeError("Invalid suspended movement.");
    }
  }
  ensureEntity({
    id,
    characterId,
    position,
    speedMps = PEDESTRIAN_SPEED.default,
    inside = true,
    locationId = null,
    scheduleKey = "",
  }) {
    ruleId(id);
    ruleId(characterId);
    ruleNumber(speedMps, PEDESTRIAN_SPEED.min, PEDESTRIAN_SPEED.max);
    if (Object.hasOwn(this.entities, id)) {
      if (this.entities[id].characterId !== characterId)
        throw new TypeError("NPC identity changed across save.");
      return this.entities[id];
    }
    if (typeof inside !== "boolean" || typeof scheduleKey !== "string")
      throw new TypeError("Invalid initial locomotion.");
    if (locationId !== null) ruleId(locationId);
    return (this.entities[id] = {
      characterId,
      position: point(position),
      velocity: { x: 0, y: 0, z: 0 },
      speedMps,
      path: [],
      waypointIndex: 0,
      inside,
      locationId,
      scheduleKey,
    });
  }
  get(id) {
    return this.entities[ruleId(id)] ?? null;
  }
  setPath(id, waypoints) {
    const entity = this.get(id);
    if (!entity || !Array.isArray(waypoints))
      throw new TypeError("Unknown entity or invalid path.");
    const path = waypoints.map(point);
    entity.path = path;
    entity.waypointIndex = 0;
    entity.velocity = { x: 0, y: 0, z: 0 };
  }
  stop(id) {
    this.setPath(id, []);
  }
  updateEntity(id, dt) {
    ruleNumber(dt, 0);
    const entity = this.get(id);
    if (!entity) throw new RangeError("Unknown moving entity.");
    if (dt === 0)
      return {
        arrived: entity.waypointIndex >= entity.path.length,
        travelled: 0,
        position: { ...entity.position },
        velocity: { ...entity.velocity },
      };
    const before = { ...entity.position };
    let remaining = dt,
      travelled = 0;
    while (remaining > 0 && entity.waypointIndex < entity.path.length) {
      const target = entity.path[entity.waypointIndex],
        p = entity.position;
      const dx = target.x - p.x,
        dy = target.y - p.y,
        dz = target.z - p.z,
        distance = Math.hypot(dx, dy, dz);
      ruleNumber(distance, 0);
      if (distance < 1e-10) {
        entity.waypointIndex++;
        continue;
      }
      const usedDt = Math.min(remaining, distance / entity.speedMps);
      const velocity = {
        x: (dx / distance) * entity.speedMps,
        y: (dy / distance) * entity.speedMps,
        z: (dz / distance) * entity.speedMps,
      };
      // Metres/second multiplied by real elapsed seconds, independent of game clock.
      p.x += velocity.x * usedDt;
      p.y += velocity.y * usedDt;
      p.z += velocity.z * usedDt;
      travelled += entity.speedMps * usedDt;
      remaining = Math.max(0, remaining - usedDt);
      if (Math.hypot(target.x - p.x, target.y - p.y, target.z - p.z) < 1e-9) {
        Object.assign(p, target);
        entity.waypointIndex++;
      }
    }
    const arrived = entity.waypointIndex >= entity.path.length;
    entity.velocity =
      dt > 0 && !arrived
        ? {
            x: (entity.position.x - before.x) / dt,
            y: (entity.position.y - before.y) / dt,
            z: (entity.position.z - before.z) / dt,
          }
        : { x: 0, y: 0, z: 0 };
    return {
      arrived,
      travelled,
      position: { ...entity.position },
      velocity: { ...entity.velocity },
    };
  }
  snapshot(id) {
    const entity = this.get(id);
    return entity ? cloneRuleData(entity) : null;
  }
}
