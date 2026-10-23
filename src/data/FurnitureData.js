import { metersToWorld, worldToMeters } from "../engine/WorldMetrics.js";

/** Width × ground depth × vertical height, all in metres. */
export const FURNITURE_DATA = Object.freeze(
  Object.fromEntries(
    Object.entries({
      armchair: { width: 0.9, depth: 0.9, height: 0.8 },
      sofa: { width: 2.0, depth: 0.85, height: 0.8 },
      coffee_table: { width: 1.2, depth: 0.6, height: 0.45 },
      cabinet: { width: 1.0, depth: 0.5, height: 1.4 },
      desk: { width: 1.4, depth: 0.7, height: 0.75 },
      table: { width: 1.4, depth: 0.8, height: 0.75 },
      counter: { width: 1.8, depth: 0.65, height: 0.9 },
      shelf: { width: 1.0, depth: 0.4, height: 1.6 },
      chair: { width: 0.5, depth: 0.5, height: 0.9 },
      bed: { width: 2.0, depth: 0.9, height: 0.55 },
      bench: { width: 1.5, depth: 0.5, height: 0.8 },
      fridge: { width: 0.65, depth: 0.65, height: 1.65 },
      stove: { width: 0.6, depth: 0.6, height: 0.85 },
      sink: { width: 0.6, depth: 0.5, height: 0.85 },
    }).map(([id, dimensions]) => [id, Object.freeze(dimensions)]),
  ),
);

export function furnitureType(prop) {
  if (prop.furnitureType) {
    if (!Object.hasOwn(FURNITURE_DATA, prop.furnitureType))
      throw new TypeError("Unknown metric furniture type.");
    return prop.furnitureType;
  }
  if (
    prop.type === "table" &&
    /coffee|center|centre|centro/i.test(`${prop.id} ${prop.name ?? ""}`)
  )
    return "coffee_table";
  if (prop.type === "steel") return "desk";
  if (["files", "catalog", "wardrobe"].includes(prop.type)) return "cabinet";
  return Object.hasOwn(FURNITURE_DATA, prop.type) ? prop.type : null;
}

/** Normalize a cloned manifest once. Room geometry/IDs/door graphs remain authored. */
export function normalizeInteriorFurniture(manifest) {
  const data = structuredClone(manifest);
  if (data.metricVersion === 1) return data;
  for (const room of data.rooms) {
    const original = new Map(room.props.map((prop) => [prop.id, { ...prop }]));
    for (const prop of room.props) {
      const type = furnitureType(prop);
      if (!type) continue;
      const dimensions = FURNITURE_DATA[type],
        old = original.get(prop.id);
      const rotated =
        prop.rotation === 90 || (prop.rotation === undefined && old.h > old.w);
      prop.dimensionsMeters = { ...dimensions };
      prop.furnitureType = type;
      prop.rotation = rotated ? 90 : 0;
      prop.w = metersToWorld(rotated ? dimensions.depth : dimensions.width);
      prop.h = metersToWorld(rotated ? dimensions.width : dimensions.depth);
      prop.height = metersToWorld(dimensions.height);
      prop.x = Math.max(
        0,
        Math.min(room.bounds.w - prop.w, old.x + (old.w - prop.w) / 2),
      );
      prop.y = Math.max(
        0,
        Math.min(room.bounds.h - prop.h, old.y + (old.h - prop.h) / 2),
      );
    }
    const current = new Map(room.props.map((prop) => [prop.id, prop])),
      done = new Set(),
      visiting = new Set();
    const placeChild = (prop) => {
      if (done.has(prop.id)) return;
      if (visiting.has(prop.id))
        throw new TypeError("Cyclic furniture support.");
      visiting.add(prop.id);
      if (prop.parentId) {
        const parent = current.get(prop.parentId),
          oldParent = original.get(prop.parentId),
          old = original.get(prop.id);
        if (!parent) throw new TypeError("Missing furniture support.");
        placeChild(parent);
        prop.w = Math.min(prop.w, Math.max(0.5, parent.w - 2));
        prop.h = Math.min(prop.h, Math.max(0.5, parent.h - 2));
        const fx = (old.x + old.w / 2 - oldParent.x) / oldParent.w;
        const fy = (old.y + old.h / 2 - oldParent.y) / oldParent.h;
        prop.x =
          parent.x +
          Math.max(0, Math.min(parent.w - prop.w, fx * parent.w - prop.w / 2));
        prop.y =
          parent.y +
          Math.max(0, Math.min(parent.h - prop.h, fy * parent.h - prop.h / 2));
        if ((old.baseZ ?? 0) >= oldParent.height * 0.5)
          prop.baseZ =
            (parent.baseZ ?? 0) +
            parent.height +
            Math.max(
              0,
              (old.baseZ ?? 0) - (oldParent.baseZ ?? 0) - oldParent.height,
            );
      }
      visiting.delete(prop.id);
      done.add(prop.id);
    };
    room.props.forEach(placeChild);
    for (const prop of room.props.filter((p) => p.dimensionsMeters)) {
      prop.boundsMeters = {
        minX: worldToMeters(prop.x),
        minY: worldToMeters(prop.y),
        minZ: worldToMeters(prop.baseZ ?? 0),
        maxX: worldToMeters(prop.x + prop.w),
        maxY: worldToMeters(prop.y + prop.h),
        maxZ: worldToMeters((prop.baseZ ?? 0) + prop.height),
      };
    }
  }
  data.metricVersion = 1;
  return data;
}
