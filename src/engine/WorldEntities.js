import {
  HUMAN_DIMENSIONS,
  HUMAN_HEIGHT_WORLD,
  worldToMeters,
} from "./WorldMetrics.js";
import { ruleId, ruleNumber } from "../systems/RuleData.js";

/** Canonical entity bounds are metric and use bottom-centre feet anchors. */
export function entityBounds(position, dimensions = HUMAN_DIMENSIONS) {
  const x = ruleNumber(position.x),
    y = ruleNumber(position.y),
    z = ruleNumber(position.z ?? 0);
  const width = ruleNumber(dimensions.width, Number.MIN_VALUE),
    depth = ruleNumber(dimensions.depth, Number.MIN_VALUE),
    height = ruleNumber(dimensions.height, Number.MIN_VALUE);
  return {
    minX: x - width / 2,
    maxX: x + width / 2,
    minY: y - depth / 2,
    maxY: y + depth / 2,
    minZ: z,
    maxZ: z + height,
  };
}
export function collectVisibleNPCs(entities, sector = null) {
  if (sector) {
    for (const key of ["minX", "minY", "maxX", "maxY"]) ruleNumber(sector[key]);
    if (sector.minX > sector.maxX || sector.minY > sector.maxY)
      throw new RangeError("Invalid metric sector.");
  }
  const ids = new Set(),
    characters = new Set(),
    visible = [];
  for (const entity of entities) {
    ruleId(entity.id);
    ruleId(entity.characterId);
    if (
      ids.has(entity.id) ||
      characters.has(entity.characterId) ||
      entity.active === false ||
      entity.inside ||
      entity.visible === false
    )
      continue;
    const bounds = entityBounds(entity.position, entity.dimensionsMeters);
    if (
      sector &&
      (bounds.maxX < sector.minX ||
        bounds.minX > sector.maxX ||
        bounds.maxY < sector.minY ||
        bounds.minY > sector.maxY)
    )
      continue;
    ids.add(entity.id);
    characters.add(entity.characterId);
    visible.push(entity);
  }
  return visible;
}

/** Conservative metric sector obtained by inverting the 64×32 screen projection. */
export function visibleWorldSector(
  camera,
  viewport,
  margin = HUMAN_HEIGHT_WORLD,
) {
  ruleNumber(camera.x);
  ruleNumber(camera.y);
  ruleNumber(viewport.width, Number.MIN_VALUE);
  ruleNumber(viewport.height, Number.MIN_VALUE);
  ruleNumber(margin, 0);
  const corners = [];
  for (const sx of [-margin, viewport.width + margin])
    for (const sy of [-margin, viewport.height + margin]) {
      const x = sx + camera.x,
        y = sy + camera.y;
      corners.push({
        x: worldToMeters(x / 2 + y),
        y: worldToMeters(y - x / 2),
      });
    }
  return {
    minX: Math.min(...corners.map((p) => p.x)),
    maxX: Math.max(...corners.map((p) => p.x)),
    minY: Math.min(...corners.map((p) => p.y)),
    maxY: Math.max(...corners.map((p) => p.y)),
  };
}
