import { IsoProjection, requireFinite } from "./IsoProjection.js";
/** @typedef {'GROUND'|'STRUCTURE'|'ACTOR'|'ROOF'|'OVERLAY'} RenderLayer */
/** @typedef {{id:string,worldX:number,worldY:number,worldZ:number,width:number,height:number,depthKey:number,layer:RenderLayer,isCutawayRoof?:boolean,cutawayAlpha?:number,buildingId?:string,priorityOffset?:number,draw:Function}} RenderEntity */
const LAYERS = new Set(["GROUND", "STRUCTURE", "ACTOR", "ROOF", "OVERLAY"]);
/** Stable, reusable render queue. Structures and actors share a depth pass. */
export class RenderQueue {
  /** @param {IsoProjection} [projection] */
  constructor(projection = new IsoProjection()) {
    this.projection = projection;
    /** @type {RenderEntity[]} */ this.renderQueue = [];
    this.cutaways = new Map();
  }
  /** Reuse the array identity; backing-store capacity is JavaScript-engine dependent. @returns {void} */
  clear() {
    this.renderQueue.length = 0;
  }
  /** References are retained only until clear(). Coordinates are refreshed every frame. @param {RenderEntity} entity @returns {RenderEntity} */
  enqueue(entity) {
    if (
      !entity ||
      typeof entity.id !== "string" ||
      !entity.id ||
      typeof entity.draw !== "function"
    )
      throw new TypeError("Entidade de renderização inválida.");
    entity.worldZ ??= entity.z ?? 0;
    entity.width ??= 1;
    entity.height ??= 1;
    entity.layer ??= "STRUCTURE";
    entity.priorityOffset ??= 0;
    requireFinite(
      entity.worldX,
      entity.worldY,
      entity.worldZ,
      entity.width,
      entity.height,
      entity.priorityOffset,
    );
    if (!LAYERS.has(entity.layer) || entity.width < 0 || entity.height < 0)
      throw new RangeError("Camada ou dimensões inválidas.");
    entity.depthKey = this.projection.getDepthKey(
      entity.worldX,
      entity.worldY,
      entity.worldZ,
      entity.priorityOffset,
    );
    if (entity.isCutawayRoof)
      entity.cutawayAlpha =
        this.cutaways.get(entity.buildingId ?? entity.id) ?? 1;
    this.renderQueue.push(entity);
    return entity;
  }
  /** Compatibility with existing queue producers. @param {RenderEntity} entity @returns {RenderEntity} */
  push(entity) {
    return this.enqueue(entity);
  }
  /** ECMAScript stable sort preserves submission order for equal depths. @returns {RenderEntity[]} */
  sort() {
    for (const entity of this.renderQueue)
      entity.depthKey = this.projection.getDepthKey(
        entity.worldX,
        entity.worldY,
        entity.worldZ,
        entity.priorityOffset,
      );
    return this.renderQueue.sort((a, b) => a.depthKey - b.depthKey);
  }
  /** Polygon containment, with rectangular bounds as fallback. @param {number} x @param {number} y @param {object} box @returns {boolean} */
  contains(x, y, box) {
    if (box.polygon) {
      if (!Array.isArray(box.polygon) || box.polygon.length < 3)
        throw new TypeError("Polígono inválido.");
      let inside = false;
      for (
        let i = 0, j = box.polygon.length - 1;
        i < box.polygon.length;
        j = i++
      ) {
        const a = box.polygon[i],
          b = box.polygon[j];
        requireFinite(a.x, a.y, b.x, b.y);
        const cross = (x - a.x) * (b.y - a.y) - (y - a.y) * (b.x - a.x);
        if (
          Math.abs(cross) < 1e-8 &&
          x >= Math.min(a.x, b.x) &&
          x <= Math.max(a.x, b.x) &&
          y >= Math.min(a.y, b.y) &&
          y <= Math.max(a.y, b.y)
        )
          return true;
        if (
          a.y > y !== b.y > y &&
          x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x
        )
          inside = !inside;
      }
      return inside;
    }
    const w = box.w ?? box.width,
      h = box.h ?? box.height;
    requireFinite(box.x, box.y, w, h);
    if (w < 0 || h < 0) throw new RangeError("Limites negativos.");
    return x >= box.x && x <= box.x + w && y >= box.y && y <= box.y + h;
  }
  /** Fade in/out in exactly .25s; deltaTime is seconds. @param {number} playerWorldX @param {number} playerWorldY @param {object[]} buildingBoundingBoxes @param {number} deltaTime @returns {void} */
  updateCutaways(playerWorldX, playerWorldY, buildingBoundingBoxes, deltaTime) {
    requireFinite(playerWorldX, playerWorldY, deltaTime);
    if (deltaTime < 0 || !Array.isArray(buildingBoundingBoxes))
      throw new TypeError("Atualização de telhados inválida.");
    for (const box of buildingBoundingBoxes) {
      if (typeof box.id !== "string") throw new TypeError("Edifício sem ID.");
      const target = this.contains(playerWorldX, playerWorldY, box) ? 0 : 1,
        current = this.cutaways.get(box.id) ?? 1,
        step = deltaTime / 0.25;
      this.cutaways.set(
        box.id,
        target ? Math.min(1, current + step) : Math.max(0, current - step),
      );
    }
    for (const entity of this.renderQueue)
      if (entity.isCutawayRoof)
        entity.cutawayAlpha =
          this.cutaways.get(entity.buildingId ?? entity.id) ?? 1;
  }
  /** Draw with caller-owned camera origin. Width/height include visual extent for culling. Alpha is owned here; callback receives it for inspection. @param {CanvasRenderingContext2D} ctx @param {{width:number,height:number,x?:number,y?:number}} viewport @param {number} [originX] @param {number} [originY] @returns {number} */
  draw(ctx, viewport, originX = 0, originY = 0) {
    if (!ctx || typeof ctx.save !== "function")
      throw new TypeError("Contexto Canvas ausente.");
    this.sort();
    let drawn = 0;
    for (let pass = 0; pass < 4; pass++)
      for (const entity of this.renderQueue) {
        const group =
          entity.layer === "GROUND"
            ? 0
            : entity.layer === "ROOF"
              ? 2
              : entity.layer === "OVERLAY"
                ? 3
                : 1;
        if (group !== pass) continue;
        const p = this.projection.worldToScreen(
            entity.worldX,
            entity.worldY,
            entity.worldZ,
            originX,
            originY,
          ),
          margin = Math.max(entity.width, entity.height);
        if (!this.projection.isWithinFrustum(p.x, p.y, margin, viewport))
          continue;
        const alpha = entity.isCutawayRoof ? (entity.cutawayAlpha ?? 1) : 1;
        if (alpha <= 0) continue;
        ctx.save();
        try {
          ctx.globalAlpha *= alpha;
          entity.draw(ctx, p.x, p.y, alpha);
          drawn++;
        } finally {
          ctx.restore();
        }
      }
    return drawn;
  }
  /** @returns {Iterator<RenderEntity>} */
  [Symbol.iterator]() {
    return this.renderQueue[Symbol.iterator]();
  }
}
