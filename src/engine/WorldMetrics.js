/** One logical isometric tile is one metre. Old manifests store 32 units/metre. */
export const METERS_PER_TILE = 1;
export const WORLD_UNITS_PER_METER = 32;
export const HUMAN_DIMENSIONS = Object.freeze({
  width: 0.6,
  depth: 0.6,
  height: 1.75,
});
export const HUMAN_HEIGHT_WORLD =
  HUMAN_DIMENSIONS.height * WORLD_UNITS_PER_METER;
export const HUMAN_RADIUS_WORLD =
  (HUMAN_DIMENSIONS.width * WORLD_UNITS_PER_METER) / 2;
export const PEDESTRIAN_SPEED = Object.freeze({
  min: 1.2,
  default: 1.4,
  max: 1.6,
});

export function metersToWorld(value) {
  if (!Number.isFinite(value)) throw new TypeError("Expected finite metres.");
  return value * WORLD_UNITS_PER_METER;
}
export function worldToMeters(value) {
  if (!Number.isFinite(value))
    throw new TypeError("Expected finite world units.");
  return value / WORLD_UNITS_PER_METER;
}
export function pointToMeters(point) {
  return {
    x: worldToMeters(point.x),
    y: worldToMeters(point.y),
    z: worldToMeters(point.z ?? 0),
  };
}
export function pointToWorld(point) {
  return {
    x: metersToWorld(point.x),
    y: metersToWorld(point.y),
    z: metersToWorld(point.z ?? 0),
  };
}
