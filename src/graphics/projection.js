// NorthVale — Sombras de 1989
// Pure 2.5D isometric projection (no DOM), shared by the engine, tests and tools.

export const ISO_COS = 0.866; // cos(30°)
export const ISO_SIN = 0.5;   // sin(30°)
export const ORIGIN = Object.freeze({x: 660, y: 170});

/**
 * 2.5D isometric projection with explicit vertical height (Z-axis).
 * Z is 1:1 with screen pixels, so a ground axis unit and a vertical unit
 * have the same on-screen length (true isometric foreshortening).
 */
export function iso(x, y, z = 0, originX = ORIGIN.x, originY = ORIGIN.y) {
  return {
    x: originX + (x - y) * ISO_COS,
    y: originY + (x + y) * ISO_SIN - z
  };
}

/** Linear part of the projection (velocity / direction vectors). */
export function isoVector(vx, vy) {
  return {x: (vx - vy) * ISO_COS, y: (vx + vy) * ISO_SIN};
}

/**
 * A world-space circle of radius r projects to an axis-aligned screen ellipse.
 * x amplitude = r·0.866·√2, y amplitude = r·0.5·√2.
 */
export function isoCircleRadii(r) {
  return {rx: r * ISO_COS * Math.SQRT2, ry: r * ISO_SIN * Math.SQRT2};
}
