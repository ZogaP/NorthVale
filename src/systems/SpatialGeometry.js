import { ruleNumber, ruleRecord } from "./RuleData.js";

/** Ground-plane coordinates and altitude, never projected screen coordinates. */
export function spatialPoint(value) {
  ruleRecord(value);
  return {
    x: ruleNumber(value.x),
    y: ruleNumber(value.y),
    z: ruleNumber(value.z ?? 0),
  };
}

/** XY footprints are positive; omitted Z bounds mean an unbounded column. */
export function spatialAABB(value) {
  ruleRecord(value);
  const minX = ruleNumber(value.minX ?? value.x);
  const minY = ruleNumber(value.minY ?? value.y);
  const maxX = ruleNumber(
    value.maxX ?? minX + ruleNumber(value.width ?? value.w, Number.MIN_VALUE),
  );
  const maxY = ruleNumber(
    value.maxY ?? minY + ruleNumber(value.height ?? value.h, Number.MIN_VALUE),
  );
  let minZ = -Infinity,
    maxZ = Infinity;
  if (value.minZ !== undefined || value.maxZ !== undefined) {
    minZ = ruleNumber(value.minZ);
    maxZ = ruleNumber(value.maxZ);
  } else if (value.z !== undefined || value.depth !== undefined) {
    minZ = ruleNumber(value.z ?? 0);
    maxZ = ruleNumber(minZ + ruleNumber(value.depth, Number.MIN_VALUE));
  }
  if (minX >= maxX || minY >= maxY || minZ >= maxZ)
    throw new RangeError("AABB must have positive extents.");
  return { minX, minY, maxX, maxY, minZ, maxZ };
}

/** AABB overlap includes boundary contact, including point subjects. */
export function spatialOverlap(a, b) {
  return (
    a.minX <= b.maxX &&
    a.maxX >= b.minX &&
    a.minY <= b.maxY &&
    a.maxY >= b.minY &&
    a.minZ <= b.maxZ &&
    a.maxZ >= b.minZ
  );
}

export function spatialSubject(value) {
  ruleRecord(value);
  if (value.bounds) return spatialAABB(value.bounds);
  if (
    value.minX !== undefined ||
    value.width !== undefined ||
    value.w !== undefined
  )
    return spatialAABB(value);
  const p = spatialPoint(value.position ?? value);
  return { minX: p.x, maxX: p.x, minY: p.y, maxY: p.y, minZ: p.z, maxZ: p.z };
}

/** Slab intersection on the finite segment [0, 1], including tangent contact. */
export function segmentAABBInterval(from, to, bounds) {
  let enter = 0,
    exit = 1;
  for (const axis of ["X", "Y", "Z"]) {
    const key = axis.toLowerCase(),
      start = from[key],
      delta = to[key] - start;
    ruleNumber(delta);
    const min = bounds["min" + axis],
      max = bounds["max" + axis];
    if (delta === 0) {
      if (start < min || start > max) return null;
      continue;
    }
    const a = (min - start) / delta,
      b = (max - start) / delta;
    enter = Math.max(enter, Math.min(a, b));
    exit = Math.min(exit, Math.max(a, b));
    if (enter > exit) return null;
  }
  return { enter, exit };
}

export function pointOnSegment(from, to, fraction) {
  return {
    x: from.x + (to.x - from.x) * fraction,
    y: from.y + (to.y - from.y) * fraction,
    z: from.z + (to.z - from.z) * fraction,
  };
}
