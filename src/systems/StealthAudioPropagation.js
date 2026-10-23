import { ruleId, ruleNumber } from "./RuleData.js";
import {
  spatialPoint,
  spatialAABB,
  segmentAABBInterval,
  pointOnSegment,
} from "./SpatialGeometry.js";

export const SOUND_TYPES = Object.freeze({
  PUDDLE_STEP: 15,
  GRAVEL_RUN: 35,
  FORCED_DOOR: 60,
  REVOLVER_38: 95,
});
export const ACOUSTIC_ATTENUATION = Object.freeze({ wall: 18, door: 12 });

function soundPoint(value) {
  const point = spatialPoint(value);
  if (value.spaceId !== undefined) point.spaceId = ruleId(value.spaceId);
  return point;
}

function levelOf(type) {
  return ruleNumber(
    typeof type === "string" ? SOUND_TYPES[type] : type,
    0,
    100,
  );
}

/** Gameplay decibels: direct-ray attenuation/masking, not an audio playback engine. */
export class StealthAudioPropagation {
  constructor({
    cellSize = 1,
    heightScale = 1,
    referenceDistance = 1,
    distanceRolloff = 20,
    ambientNoiseDb = 0,
    listeners = [],
    occluders = [],
    onSoundDetected = () => {},
  } = {}) {
    this.cellSize = ruleNumber(cellSize, Number.MIN_VALUE);
    this.heightScale = ruleNumber(heightScale, Number.MIN_VALUE);
    this.referenceDistance = ruleNumber(referenceDistance, Number.MIN_VALUE);
    this.distanceRolloff = ruleNumber(distanceRolloff, 0);
    this.ambientNoiseDb = ruleNumber(ambientNoiseDb, 0, 100);
    this.onSoundDetected = onSoundDetected;
    this.listeners = new Map();
    this.occluders = new Map();
    for (const listener of listeners) this.addListener(listener);
    for (const obstacle of occluders) this.setOccluder(obstacle);
  }

  validateListener(entity) {
    ruleId(entity.id);
    soundPoint(entity.position ?? entity);
    ruleNumber(entity.hearingThreshold ?? 10, 0, 100);
    ruleNumber(entity.ambientNoiseDb ?? this.ambientNoiseDb, 0, 100);
    ruleNumber(entity.detectionMarginDb ?? 3, 0, 100);
    if (entity.enabled !== undefined && typeof entity.enabled !== "boolean")
      throw new TypeError("Invalid listener enabled flag.");
    if (entity.spaceId !== undefined) ruleId(entity.spaceId);
  }

  /** Keeps the entity reference so movement is observed on the next emission. */
  addListener(entity) {
    this.validateListener(entity);
    this.listeners.set(entity.id, entity);
  }

  removeListener(id) {
    return this.listeners.delete(ruleId(id));
  }
  setAmbientNoise(db) {
    this.ambientNoiseDb = ruleNumber(db, 0, 100);
  }

  setOccluder(obstacle) {
    const id = ruleId(obstacle.id),
      kind = obstacle.kind ?? "wall";
    if (!Object.hasOwn(ACOUSTIC_ATTENUATION, kind))
      throw new TypeError("Expected wall or door occluder.");
    if (obstacle.isOpen !== undefined && typeof obstacle.isOpen !== "boolean")
      throw new TypeError("Invalid door state.");
    if (obstacle.enabled !== undefined && typeof obstacle.enabled !== "boolean")
      throw new TypeError("Invalid occluder flag.");
    const record = {
      id,
      kind,
      bounds: spatialAABB(obstacle.bounds ?? obstacle),
      isOpen: obstacle.isOpen ?? false,
      enabled: obstacle.enabled ?? true,
      attenuationDb: ruleNumber(
        obstacle.attenuationDb ?? ACOUSTIC_ATTENUATION[kind],
        0,
        100,
      ),
      spaceId: obstacle.spaceId === undefined ? null : ruleId(obstacle.spaceId),
    };
    this.occluders.set(id, record);
  }

  removeOccluder(id) {
    return this.occluders.delete(ruleId(id));
  }

  setDoorOpen(id, isOpen) {
    const door = this.occluders.get(ruleId(id));
    if (!door || door.kind !== "door")
      throw new RangeError("Unknown acoustic door.");
    if (typeof isOpen !== "boolean")
      throw new TypeError("Expected boolean door state.");
    door.isOpen = isOpen;
  }

  sample(origin, listener, sourceDb, noiseModifierDb) {
    if (
      origin.spaceId !== undefined &&
      listener.spaceId !== undefined &&
      origin.spaceId !== listener.spaceId
    )
      return { intensity: 0, distance: null, occlusionLoss: 0 };
    const distance = Math.hypot(
      (listener.x - origin.x) / this.cellSize,
      (listener.y - origin.y) / this.cellSize,
      ((listener.z - origin.z) * this.heightScale) / this.cellSize,
    );
    ruleNumber(distance, 0);
    const distanceLoss =
      this.distanceRolloff === 0
        ? 0
        : this.distanceRolloff *
          Math.log10(Math.max(1, distance / this.referenceDistance));
    let occlusionLoss = 0;
    for (const obstacle of this.occluders.values()) {
      if (distance === 0) break;
      if (!obstacle.enabled || (obstacle.kind === "door" && obstacle.isOpen))
        continue;
      if (obstacle.spaceId !== null && origin.spaceId !== obstacle.spaceId)
        continue;
      const interval = segmentAABBInterval(origin, listener, obstacle.bounds);
      if (!interval || interval.exit <= interval.enter) continue;
      // A tangent along a face has no length inside the material.
      const midpoint = pointOnSegment(
          origin,
          listener,
          (interval.enter + interval.exit) / 2,
        ),
        b = obstacle.bounds;
      if (
        midpoint.x <= b.minX ||
        midpoint.x >= b.maxX ||
        midpoint.y <= b.minY ||
        midpoint.y >= b.maxY ||
        midpoint.z <= b.minZ ||
        midpoint.z >= b.maxZ
      )
        continue;
      occlusionLoss += obstacle.attenuationDb;
    }
    const adjustedSource = Math.max(
      0,
      Math.min(100, sourceDb + noiseModifierDb),
    );
    return {
      intensity: Math.max(
        0,
        Math.min(100, adjustedSource - distanceLoss - occlusionLoss),
      ),
      distance,
      occlusionLoss,
    };
  }

  calculateIntensity(
    soundOrigin,
    listenerPosition,
    soundType,
    { noiseModifierDb = 0 } = {},
  ) {
    const origin = soundPoint(soundOrigin),
      listener = soundPoint(listenerPosition);
    return this.sample(
      origin,
      listener,
      levelOf(soundType),
      ruleNumber(noiseModifierDb, -100, 100),
    ).intensity;
  }

  /** One detection per enabled listener per emission, evaluated before any callbacks. */
  emitSound(
    soundType,
    soundOrigin,
    { noiseModifierDb = 0, sourceId = null } = {},
  ) {
    const sourceDb = levelOf(soundType),
      origin = soundPoint(soundOrigin),
      detections = [];
    ruleNumber(noiseModifierDb, -100, 100);
    if (sourceId !== null) ruleId(sourceId);
    for (const [id, entity] of this.listeners) {
      if (entity.enabled === false || id === sourceId) continue;
      this.validateListener(entity);
      const listener = soundPoint(entity.position ?? entity);
      if (entity.spaceId !== undefined) listener.spaceId = entity.spaceId;
      const sample = this.sample(origin, listener, sourceDb, noiseModifierDb);
      const threshold = Math.max(
        entity.hearingThreshold ?? 10,
        (entity.ambientNoiseDb ?? this.ambientNoiseDb) +
          (entity.detectionMarginDb ?? 3),
      );
      if (sample.intensity > 0 && sample.intensity >= threshold)
        detections.push({
          listenerEntity: entity,
          soundOrigin: { ...origin },
          ...sample,
          threshold,
        });
    }
    for (const detection of detections)
      this.onSoundDetected(
        detection.listenerEntity,
        { ...detection.soundOrigin },
        detection.intensity,
      );
    return detections;
  }
}
