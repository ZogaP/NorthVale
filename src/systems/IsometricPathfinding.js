import { ruleId, ruleNumber } from "./RuleData.js";
import {
  spatialPoint,
  spatialAABB,
  segmentAABBInterval,
  pointOnSegment,
} from "./SpatialGeometry.js";

const SQRT2 = Math.SQRT2;
const DIRECTIONS = Object.freeze([
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
  [1, 1],
  [-1, 1],
  [-1, -1],
  [1, -1],
]);

function integer(value) {
  if (!Number.isSafeInteger(value))
    throw new TypeError("Expected an integer grid coordinate.");
  return value;
}

/** Binary min-heap. Stable ties use H, then row-major cell index. */
class MinHeap {
  constructor() {
    this.items = [];
  }
  before(a, b) {
    return (
      a.g + a.h < b.g + b.h ||
      (a.g + a.h === b.g + b.h &&
        (a.h < b.h || (a.h === b.h && a.index < b.index)))
    );
  }
  push(value) {
    const items = this.items;
    let i = items.length;
    items.push(value);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.before(value, items[p])) break;
      items[i] = items[p];
      i = p;
    }
    items[i] = value;
  }
  pop() {
    const items = this.items,
      first = items[0],
      tail = items.pop();
    if (items.length) {
      let i = 0;
      while (i * 2 + 1 < items.length) {
        let child = i * 2 + 1;
        if (
          child + 1 < items.length &&
          this.before(items[child + 1], items[child])
        )
          child++;
        if (!this.before(items[child], tail)) break;
        items[i] = items[child];
        i = child;
      }
      items[i] = tail;
    }
    return first;
  }
}

/** A* operates on unprojected XY grid cells on one navigation floor. */
export class IsometricPathfinding {
  constructor({
    width,
    height,
    cellSize = 1,
    origin = { x: 0, y: 0 },
    allowDiagonal = true,
    blocked = [],
  } = {}) {
    integer(width);
    integer(height);
    if (width < 1 || height < 1 || width * height > 1_000_000)
      throw new RangeError("Grid must contain 1 to 1,000,000 cells.");
    ruleNumber(cellSize, Number.MIN_VALUE);
    if (typeof allowDiagonal !== "boolean")
      throw new TypeError("Invalid diagonal policy.");
    this.width = width;
    this.height = height;
    this.cellSize = cellSize;
    this.origin = spatialPoint(origin);
    ruleNumber(this.origin.x + width * cellSize);
    ruleNumber(this.origin.y + height * cellSize);
    this.allowDiagonal = allowDiagonal;
    this.staticBlocked = new Uint8Array(width * height);
    this.dynamicCounts = new Uint32Array(width * height);
    this.dynamicObstacles = new Map();
    this.scores = new Float64Array(width * height);
    this.parents = new Int32Array(width * height);
    this.seen = new Uint32Array(width * height);
    this.closed = new Uint32Array(width * height);
    this.generation = 0;
    this.revision = 0;
    for (const cell of blocked) this.setBlocked(cell.x, cell.y, true);
  }

  inBounds(x, y) {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }
  blockedAt(x, y) {
    return (
      !this.inBounds(x, y) ||
      this.staticBlocked[y * this.width + x] !== 0 ||
      this.dynamicCounts[y * this.width + x] !== 0
    );
  }
  isBlocked(x, y) {
    integer(x);
    integer(y);
    return this.blockedAt(x, y);
  }

  cellIndex(x, y) {
    integer(x);
    integer(y);
    if (!this.inBounds(x, y))
      throw new RangeError("Cell outside the navigation grid.");
    return y * this.width + x;
  }

  setBlocked(x, y, blocked = true) {
    const index = this.cellIndex(x, y);
    if (typeof blocked !== "boolean")
      throw new TypeError("Expected a boolean blocked flag.");
    if (Boolean(this.staticBlocked[index]) === blocked) return false;
    this.staticBlocked[index] = Number(blocked);
    this.revision++;
    return true;
  }

  /** Multiple dynamic footprints can cover the same cell without unblocking each other. */
  setDynamicObstacle(id, cells) {
    ruleId(id);
    if (!Array.isArray(cells))
      throw new TypeError("Expected obstacle footprint cells.");
    const next = [
      ...new Set(cells.map((cell) => this.cellIndex(cell.x, cell.y))),
    ].sort((a, b) => a - b);
    const old = this.dynamicObstacles.get(id) ?? [];
    if (
      next.length === old.length &&
      next.every((index, i) => index === old[i])
    )
      return false;
    for (const index of old) this.dynamicCounts[index]--;
    for (const index of next) this.dynamicCounts[index]++;
    this.dynamicObstacles.set(id, next);
    this.revision++;
    return true;
  }

  removeDynamicObstacle(id) {
    ruleId(id);
    const old = this.dynamicObstacles.get(id);
    if (!old) return false;
    for (const index of old) this.dynamicCounts[index]--;
    this.dynamicObstacles.delete(id);
    this.revision++;
    return true;
  }

  worldToCell(point) {
    const p = spatialPoint(point);
    return {
      x: Math.floor((p.x - this.origin.x) / this.cellSize),
      y: Math.floor((p.y - this.origin.y) / this.cellSize),
    };
  }

  cellToWorld(cell, z = this.origin.z) {
    this.cellIndex(cell.x, cell.y);
    ruleNumber(z);
    return {
      x: this.origin.x + (cell.x + 0.5) * this.cellSize,
      y: this.origin.y + (cell.y + 0.5) * this.cellSize,
      z,
    };
  }

  heuristic(x, y, goal) {
    const dx = Math.abs(x - goal.x),
      dy = Math.abs(y - goal.y);
    return this.allowDiagonal
      ? Math.max(dx, dy) + (SQRT2 - 1) * Math.min(dx, dy)
      : dx + dy;
  }

  findPath(
    start,
    goal,
    { smooth = true, maxVisited = this.width * this.height } = {},
  ) {
    integer(start.x);
    integer(start.y);
    integer(goal.x);
    integer(goal.y);
    integer(maxVisited);
    if (maxVisited < 1 || typeof smooth !== "boolean")
      throw new RangeError("Invalid search options.");
    if (this.blockedAt(start.x, start.y) || this.blockedAt(goal.x, goal.y))
      return [];
    const first = start.y * this.width + start.x,
      target = goal.y * this.width + goal.x;
    this.generation = (this.generation + 1) >>> 0;
    if (this.generation === 0) {
      this.seen.fill(0);
      this.closed.fill(0);
      this.generation = 1;
    }
    const generation = this.generation,
      heap = new MinHeap();
    this.seen[first] = generation;
    this.scores[first] = 0;
    this.parents[first] = -1;
    heap.push({
      index: first,
      g: 0,
      h: this.heuristic(start.x, start.y, goal),
    });
    let visited = 0;
    while (heap.items.length && visited < maxVisited) {
      const current = heap.pop(),
        index = current.index;
      if (this.closed[index] === generation || current.g !== this.scores[index])
        continue;
      this.closed[index] = generation;
      visited++;
      if (index === target) {
        const path = [];
        for (let cursor = target; cursor !== -1; cursor = this.parents[cursor])
          path.push({
            x: cursor % this.width,
            y: Math.floor(cursor / this.width),
          });
        path.reverse();
        return smooth ? this.smoothPath(path) : path;
      }
      const x = index % this.width,
        y = Math.floor(index / this.width);
      for (let i = 0; i < (this.allowDiagonal ? 8 : 4); i++) {
        const [dx, dy] = DIRECTIONS[i],
          nx = x + dx,
          ny = y + dy;
        if (
          this.blockedAt(nx, ny) ||
          (i >= 4 && (this.blockedAt(x + dx, y) || this.blockedAt(x, y + dy)))
        )
          continue;
        const next = ny * this.width + nx,
          g = current.g + (i >= 4 ? SQRT2 : 1);
        if (
          this.closed[next] === generation ||
          (this.seen[next] === generation && g >= this.scores[next])
        )
          continue;
        this.seen[next] = generation;
        this.scores[next] = g;
        this.parents[next] = index;
        heap.push({ index: next, g, h: this.heuristic(nx, ny, goal) });
      }
    }
    return [];
  }

  /** Returns center-of-cell world waypoints. Z is supplied by the navigation floor. */
  findWorldPath(start, goal, options) {
    return this.findPath(
      this.worldToCell(start),
      this.worldToCell(goal),
      options,
    ).map((cell) => this.cellToWorld(cell));
  }

  smoothPath(path) {
    if (!Array.isArray(path)) throw new TypeError("Expected a path.");
    for (const cell of path) {
      this.cellIndex(cell.x, cell.y);
      if (this.blockedAt(cell.x, cell.y))
        throw new Error("Path contains a blocked cell.");
    }
    for (let i = 1; i < path.length; i++) {
      if (
        (!this.allowDiagonal &&
          path[i].x !== path[i - 1].x &&
          path[i].y !== path[i - 1].y) ||
        !this.hasLineOfSight(
          this.cellToWorld(path[i - 1]),
          this.cellToWorld(path[i]),
        )
      )
        throw new Error("Path crosses blocked cells or corners.");
    }
    if (path.length < 3) return path.map((cell) => ({ x: cell.x, y: cell.y }));
    const result = [{ x: path[0].x, y: path[0].y }];
    let anchor = 0;
    while (anchor < path.length - 1) {
      let next = path.length - 1;
      for (; next > anchor; next--) {
        if (
          !this.allowDiagonal &&
          path[next].x !== path[anchor].x &&
          path[next].y !== path[anchor].y
        )
          continue;
        if (
          this.hasLineOfSight(
            this.cellToWorld(path[anchor]),
            this.cellToWorld(path[next]),
          )
        )
          break;
      }
      if (next === anchor)
        throw new Error("Path crosses blocked cells or corners.");
      result.push({ x: path[next].x, y: path[next].y });
      anchor = next;
    }
    return result;
  }

  /** Supercover DDA: corner ties inspect both adjacent cells, preventing corner leaks. */
  castGrid(from, to) {
    const sx = (from.x - this.origin.x) / this.cellSize,
      sy = (from.y - this.origin.y) / this.cellSize;
    const ex = (to.x - this.origin.x) / this.cellSize,
      ey = (to.y - this.origin.y) / this.cellSize;
    const dx = ruleNumber(ex - sx),
      dy = ruleNumber(ey - sy),
      stepX = Math.sign(dx),
      stepY = Math.sign(dy);
    let x = Math.floor(sx),
      y = Math.floor(sy);
    const deltaX = dx === 0 ? Infinity : 1 / Math.abs(dx),
      deltaY = dy === 0 ? Infinity : 1 / Math.abs(dy);
    let maxX = dx === 0 ? Infinity : (stepX > 0 ? x + 1 - sx : sx - x) * deltaX;
    let maxY = dy === 0 ? Infinity : (stepY > 0 ? y + 1 - sy : sy - y) * deltaY;
    const check = (cx, cy, fraction) => {
      const cells = [[cx, cy]];
      if (dx === 0 && Number.isInteger(sx)) cells.push([cx - 1, cy]);
      if (dy === 0 && Number.isInteger(sy)) cells.push([cx, cy - 1]);
      if (dx === 0 && dy === 0 && Number.isInteger(sx) && Number.isInteger(sy))
        cells.push([cx - 1, cy - 1]);
      for (const [px, py] of cells)
        if (this.blockedAt(px, py)) return { cell: { x: px, y: py }, fraction };
      return null;
    };
    let hit = check(x, y, 0);
    if (hit) return hit;
    while (Math.min(maxX, maxY) <= 1) {
      const fraction = Math.min(maxX, maxY);
      if (
        Number.isFinite(maxX) &&
        Number.isFinite(maxY) &&
        Math.abs(maxX - maxY) <= 1e-12
      ) {
        hit = check(x + stepX, y, fraction) ?? check(x, y + stepY, fraction);
        if (hit) return hit;
        x += stepX;
        y += stepY;
        maxX += deltaX;
        maxY += deltaY;
      } else if (maxX < maxY) {
        x += stepX;
        maxX += deltaX;
      } else {
        y += stepY;
        maxY += deltaY;
      }
      hit = check(x, y, fraction);
      if (hit) return hit;
    }
    return null;
  }

  /** World-space raycast. Grid columns block all Z; optional AABBs have finite height. */
  raycast(start, end, { occluders = [] } = {}) {
    const from = spatialPoint(start),
      to = spatialPoint(end);
    let hit = this.castGrid(from, to);
    if (hit) hit = { ...hit, obstacleId: null };
    for (const obstacle of occluders) {
      if (obstacle.enabled === false || obstacle.isOpen === true) continue;
      const interval = segmentAABBInterval(
        from,
        to,
        spatialAABB(obstacle.bounds ?? obstacle),
      );
      if (interval && (!hit || interval.enter < hit.fraction))
        hit = {
          cell: null,
          obstacleId: obstacle.id ?? null,
          fraction: interval.enter,
        };
    }
    return hit
      ? { ...hit, point: pointOnSegment(from, to, hit.fraction) }
      : null;
  }

  hasLineOfSight(start, end, options) {
    return this.raycast(start, end, options) === null;
  }

  /** Facing is in radians in world XY: 0 east, PI/2 toward positive Y. */
  isInVisionCone(
    observer,
    target,
    {
      facingAngle = observer.facingAngle ?? 0,
      fov = Math.PI / 3,
      range = 10,
      occluders = [],
    } = {},
  ) {
    const from = spatialPoint(observer.position ?? observer),
      to = spatialPoint(target.position ?? target);
    ruleNumber(facingAngle);
    ruleNumber(fov, 0, Math.PI * 2);
    ruleNumber(range, 0);
    const dx = to.x - from.x,
      dy = to.y - from.y,
      dz = to.z - from.z;
    if (Math.hypot(dx, dy, dz) > range) return false;
    if (dx !== 0 || dy !== 0) {
      const difference = Math.atan2(
        Math.sin(Math.atan2(dy, dx) - facingAngle),
        Math.cos(Math.atan2(dy, dx) - facingAngle),
      );
      if (Math.abs(difference) > fov / 2 + 1e-12) return false;
    }
    return this.hasLineOfSight(from, to, { occluders });
  }
}
