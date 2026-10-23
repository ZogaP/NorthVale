import { cloneRuleData, ruleId, ruleNumber, ruleRecord } from "./RuleData.js";

/** Items remain IDs in state.inventory/state.evidence for compatibility with quests. */
export class EvidenceInventorySystem {
  constructor(state) {
    this.state = ruleRecord(state);
    state.inventory ??= [];
    state.evidence ??= [];
    state.itemRecords ??= {};
    state.evidenceIntegrity ??= {};
    for (const list of [state.inventory, state.evidence]) {
      if (!Array.isArray(list) || new Set(list).size !== list.length)
        throw new TypeError("Invalid item list.");
      list.forEach(ruleId);
    }
    ruleRecord(state.itemRecords);
    ruleRecord(state.evidenceIntegrity);
    if (
      Object.values(state.evidenceIntegrity).some(
        (value) => typeof value !== "boolean",
      )
    )
      throw new TypeError("Invalid evidence integrity.");
    for (const [id, item] of Object.entries(state.itemRecords)) {
      if (id !== item.id || !this.hasItem(id))
        throw new TypeError("Orphaned item record.");
      this.validateItem(item);
    }
  }

  validateItem(item) {
    ruleRecord(item);
    ruleId(item.id);
    if (!["item", "evidence", "tool"].includes(item.type))
      throw new TypeError("Invalid item type.");
    if (item.metadata !== undefined) ruleRecord(item.metadata);
    if (item.integrity !== undefined && typeof item.integrity !== "boolean")
      throw new TypeError("Invalid evidence integrity.");
    if (item.durability !== undefined) {
      ruleNumber(item.maxDurability, Number.MIN_VALUE);
      ruleNumber(item.durability, 0, item.maxDurability);
      if (item.type !== "tool")
        throw new TypeError("Only tools have durability.");
    } else if (item.maxDurability !== undefined)
      throw new TypeError("Missing durability.");
    return cloneRuleData(item);
  }

  /** Unique IDs: collecting an existing item never repairs it or overwrites provenance. */
  addItem(itemData) {
    const item = this.validateItem({
      ...itemData,
      type: itemData?.type ?? "item",
      metadata: itemData?.metadata ?? {},
    });
    if (this.hasItem(item.id)) return false;
    const list =
      item.type === "evidence" ? this.state.evidence : this.state.inventory;
    list.push(item.id);
    this.state.itemRecords[item.id] = item;
    if (item.type === "evidence")
      this.state.evidenceIntegrity[item.id] = item.integrity !== false;
    return true;
  }

  removeItem(itemId) {
    ruleId(itemId);
    if (!this.hasItem(itemId)) return false;
    for (const list of [this.state.inventory, this.state.evidence]) {
      const index = list.indexOf(itemId);
      if (index !== -1) list.splice(index, 1);
    }
    delete this.state.itemRecords[itemId];
    delete this.state.evidenceIntegrity[itemId];
    return true;
  }

  hasItem(itemId) {
    ruleId(itemId);
    return (
      this.state.inventory.includes(itemId) ||
      this.state.evidence.includes(itemId)
    );
  }

  /** Returns a defensive metadata copy, null when absent; legacy items have {}. */
  getItemMetadata(itemId) {
    if (!this.hasItem(itemId)) return null;
    return cloneRuleData(this.state.itemRecords[itemId]?.metadata ?? {});
  }

  getItem(itemId) {
    if (!this.hasItem(itemId)) return null;
    const record = this.state.itemRecords[itemId] ?? {
      id: itemId,
      type: this.state.evidence.includes(itemId) ? "evidence" : "item",
      metadata: {},
    };
    const result = cloneRuleData(record);
    if (result.type === "evidence")
      result.integrity = this.state.evidenceIntegrity[itemId] !== false;
    return result;
  }

  /** A broken lockpick remains in inventory with durability 0. */
  useTool(itemId, wear = 1) {
    ruleNumber(wear, Number.MIN_VALUE);
    const item = this.state.itemRecords[ruleId(itemId)];
    if (!item || item.type !== "tool" || item.durability === undefined)
      throw new TypeError("Tool has no durability record.");
    if (item.durability === 0) return false;
    item.durability = Math.max(0, item.durability - wear);
    return { durability: item.durability, broken: item.durability === 0 };
  }

  setEvidenceIntegrity(itemId, intact) {
    if (!this.state.evidence.includes(ruleId(itemId)))
      throw new TypeError("Evidence not owned.");
    if (typeof intact !== "boolean")
      throw new TypeError("Expected boolean integrity.");
    this.state.evidenceIntegrity[itemId] = intact;
  }
}
