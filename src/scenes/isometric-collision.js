export function pointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    const intersects = (a.y > point.y) !== (b.y > point.y)
      && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

export class IsoCollisionMap {
  constructor({width, height, tileSize = 32, walkable, obstacles = []}) {
    Object.assign(this, {width, height, tileSize, walkable, obstacles});
    this.columns = Math.ceil(width / tileSize);
    this.rows = Math.ceil(height / tileSize);
    this.matrix = Array.from({length: this.rows}, (_, row) =>
      Array.from({length: this.columns}, (_, column) =>
        this.blocked(column * tileSize + tileSize / 2, row * tileSize + tileSize / 2, 10) ? 1 : 0));
  }

  blocked(x, y, radius = 12) {
    const samples = [[0, 0], [radius, 0], [-radius, 0], [0, radius], [0, -radius]];
    return samples.some(([dx, dy]) => {
      const point = {x: x + dx, y: y + dy};
      return !pointInPolygon(point, this.walkable)
        || this.obstacles.some(obstacle => pointInPolygon(point, obstacle.points));
    });
  }

  move(body, dx, dy, radius = 12) {
    if (!this.blocked(body.x + dx, body.y, radius)) body.x += dx;
    if (!this.blocked(body.x, body.y + dy, radius)) body.y += dy;
  }

  findPath(start, goal) {
    const toCell = point => ({x: Math.max(0, Math.min(this.columns - 1, Math.floor(point.x / this.tileSize))), y: Math.max(0, Math.min(this.rows - 1, Math.floor(point.y / this.tileSize)))});
    const from = toCell(start), to = toCell(goal), key = p => `${p.x},${p.y}`;
    if (this.matrix[from.y][from.x] || this.matrix[to.y][to.x]) return [];
    const open = [from], parents = new Map(), costs = new Map([[key(from), 0]]), closed = new Set();
    const directions = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    while (open.length) {
      open.sort((a, b) => costs.get(key(a)) + Math.hypot(a.x - to.x, a.y - to.y) - costs.get(key(b)) - Math.hypot(b.x - to.x, b.y - to.y));
      const current = open.shift(), currentKey = key(current);
      if (closed.has(currentKey)) continue;
      if (current.x === to.x && current.y === to.y) {
        const path = [{x: goal.x, y: goal.y}];
        let node = current;
        while (parents.has(key(node))) {
          path.push({x: node.x * this.tileSize + this.tileSize / 2, y: node.y * this.tileSize + this.tileSize / 2});
          node = parents.get(key(node));
        }
        path.push({x: start.x, y: start.y});
        return path.reverse();
      }
      closed.add(currentKey);
      for (const [dx, dy] of directions) {
        const next = {x: current.x + dx, y: current.y + dy};
        if (next.x < 0 || next.y < 0 || next.x >= this.columns || next.y >= this.rows || this.matrix[next.y][next.x]) continue;
        if (dx && dy && (this.matrix[current.y][next.x] || this.matrix[next.y][current.x])) continue;
        const nextKey = key(next), cost = costs.get(currentKey) + Math.hypot(dx, dy);
        if (cost < (costs.get(nextKey) ?? Infinity)) {
          costs.set(nextKey, cost);
          parents.set(nextKey, current);
          open.push(next);
        }
      }
    }
    return [];
  }
}
