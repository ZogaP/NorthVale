import { EvidenceInventorySystem } from "./EvidenceInventorySystem.js";
import { cloneRuleData, ruleId, ruleNumber, ruleRecord } from "./RuleData.js";

const LIMITS = Object.freeze({
  REPUTATION: [-50, 50],
  SCRUTINY: [0, 100],
  BOBBY_STABILITY: [0, 100],
  PARANOIA: [0, 100],
  PROOF_WEIGHT: [0, 10],
});

/** Declarative dialogue interpreter; no eval, timers, DOM or renderer references. */
export class DialogueTreeRunner {
  constructor(
    state,
    {
      trees = [],
      onVariableChange = () => {},
      onItemReceived = () => {},
      onComplete = () => {},
    } = {},
  ) {
    this.state = ruleRecord(state);
    this.trees = new Map();
    this.onVariableChange = onVariableChange;
    this.onItemReceived = onItemReceived;
    this.onComplete = onComplete;
    for (const tree of trees) this.registerTree(tree);
    state.dialogueState ??= { active: null, appliedEffects: [] };
    const saved = ruleRecord(state.dialogueState);
    if (
      !Array.isArray(saved.appliedEffects) ||
      new Set(saved.appliedEffects).size !== saved.appliedEffects.length
    )
      throw new TypeError("Invalid dialogue effect ledger.");
    for (const key of saved.appliedEffects) {
      if (typeof key !== "string")
        throw new TypeError("Invalid dialogue effect key.");
      const parts = JSON.parse(key);
      if (!Array.isArray(parts) || parts.length !== 3)
        throw new TypeError("Invalid dialogue effect key.");
      ruleId(parts[0]);
      ruleId(parts[1]);
      if (parts[2] !== null) ruleId(parts[2]);
    }
    if (saved.active !== null) {
      ruleRecord(saved.active);
      ruleId(saved.active.treeId);
      ruleId(saved.active.nodeId);
      const tree = this.trees.get(saved.active.treeId);
      if (!tree || !Object.hasOwn(tree.nodes, saved.active.nodeId))
        throw new TypeError("Saved dialogue refers to an unknown node.");
    }
    new EvidenceInventorySystem(state);
  }

  registerTree(treeData) {
    const tree = cloneRuleData(treeData);
    ruleId(tree.id);
    ruleId(tree.start);
    ruleRecord(tree.nodes);
    if (this.trees.has(tree.id) || !Object.hasOwn(tree.nodes, tree.start))
      throw new TypeError("Invalid/duplicate dialogue tree.");
    for (const [id, node] of Object.entries(tree.nodes)) {
      ruleId(id);
      ruleRecord(node);
      if (typeof node.text !== "string")
        throw new TypeError("Dialogue text must be a string.");
      this.validateRequirements(node.requirements ?? {});
      this.validateEffects(node.effects ?? {});
      const choiceIds = new Set();
      if (node.choices !== undefined && !Array.isArray(node.choices))
        throw new TypeError("Invalid choices.");
      if (node.next !== undefined && node.choices?.length)
        throw new TypeError("Use choices or next, not both.");
      for (const choice of node.choices ?? []) {
        ruleId(choice.id);
        if (choiceIds.has(choice.id) || typeof choice.text !== "string")
          throw new TypeError("Invalid/duplicate choice.");
        choiceIds.add(choice.id);
        this.validateRequirements(choice.requirements ?? {});
        this.validateEffects(choice.effects ?? {});
        this.validateTarget(tree, choice.next);
      }
      if (node.next !== undefined) this.validateTarget(tree, node.next);
    }
    this.trees.set(tree.id, tree);
    return tree.id;
  }

  validateTarget(tree, target) {
    if (
      target !== null &&
      (typeof target !== "string" || !Object.hasOwn(tree.nodes, target))
    )
      throw new TypeError("Dialogue has a missing destination.");
  }

  validateRequirements(requirements) {
    ruleRecord(requirements);
    if (
      Object.keys(requirements).some(
        (key) => !["items", "variables"].includes(key),
      )
    )
      throw new TypeError("Unknown prerequisite.");
    if (!Array.isArray(requirements.items ?? []))
      throw new TypeError("Invalid required items.");
    (requirements.items ?? []).forEach(ruleId);
    ruleRecord(requirements.variables ?? {});
    for (const [name, checks] of Object.entries(requirements.variables ?? {})) {
      if (!Object.hasOwn(LIMITS, name))
        throw new TypeError("Unknown dialogue variable.");
      ruleRecord(checks);
      for (const [operator, value] of Object.entries(checks)) {
        if (!["eq", "gte", "lte"].includes(operator))
          throw new TypeError("Unknown prerequisite operator.");
        ruleNumber(value, ...LIMITS[name]);
      }
    }
  }

  validateEffects(effects) {
    ruleRecord(effects);
    if (
      Object.keys(effects).some((key) => !["variables", "items"].includes(key))
    )
      throw new TypeError("Unknown dialogue effect.");
    ruleRecord(effects.variables ?? {});
    for (const [name, delta] of Object.entries(effects.variables ?? {})) {
      if (!Object.hasOwn(LIMITS, name))
        throw new TypeError("Unknown dialogue variable.");
      ruleNumber(delta);
    }
    if (!Array.isArray(effects.items ?? []))
      throw new TypeError("Invalid item rewards.");
    const inventory = new EvidenceInventorySystem({});
    for (const item of effects.items ?? [])
      inventory.validateItem({
        ...item,
        type: item.type ?? "item",
        metadata: item.metadata ?? {},
      });
  }

  meets(requirements = {}, state = this.state) {
    const inventory = new EvidenceInventorySystem(state);
    return (
      (requirements.items ?? []).every((id) => inventory.hasItem(id)) &&
      Object.entries(requirements.variables ?? {}).every(([name, checks]) => {
        const value = state[name] ?? (name === "BOBBY_STABILITY" ? 70 : 0);
        ruleNumber(value, ...LIMITS[name]);
        return Object.entries(checks).every(([op, threshold]) =>
          op === "eq"
            ? value === threshold
            : op === "gte"
              ? value >= threshold
              : value <= threshold,
        );
      })
    );
  }

  applyEffects(draft, key, effects = {}, events) {
    if (draft.dialogueState.appliedEffects.includes(key)) return;
    const inventory = new EvidenceInventorySystem(draft);
    for (const [name, delta] of Object.entries(effects.variables ?? {})) {
      const [min, max] = LIMITS[name],
        before = draft[name] ?? (name === "BOBBY_STABILITY" ? 70 : 0);
      ruleNumber(before, min, max);
      draft[name] = Math.max(min, Math.min(max, before + delta));
      if (draft[name] !== before)
        events.push(["variable", name, draft[name] - before]);
    }
    for (const item of effects.items ?? [])
      if (inventory.addItem(item)) events.push(["item", item.id]);
    draft.dialogueState.appliedEffects.push(key);
  }

  effectKey(treeId, nodeId, choiceId = null) {
    // JSON tuples avoid collisions between punctuation in authored IDs.
    return JSON.stringify([treeId, nodeId, choiceId]);
  }

  /** Stage every change before committing. Callbacks run after commit and are notifications. */
  transition(tree, nodeId, choice = null) {
    const draft = cloneRuleData(this.state),
      events = [];
    const active = draft.dialogueState.active;
    if (choice)
      this.applyEffects(
        draft,
        this.effectKey(tree.id, active.nodeId, choice.id),
        choice.effects,
        events,
      );
    if (nodeId !== null) {
      const node = tree.nodes[nodeId];
      if (!this.meets(node.requirements, draft)) return false;
      this.applyEffects(
        draft,
        this.effectKey(tree.id, nodeId),
        node.effects,
        events,
      );
    }
    draft.dialogueState.active =
      nodeId === null ? null : { treeId: tree.id, nodeId };
    // Keep the host's root state reference. Consumers should query current arrays/records.
    for (const key of [
      "inventory",
      "evidence",
      "itemRecords",
      "evidenceIntegrity",
      "dialogueState",
      ...Object.keys(LIMITS),
    ]) {
      if (Object.hasOwn(draft, key)) this.state[key] = draft[key];
    }
    for (const [type, name, delta] of events) {
      if (type === "variable") this.onVariableChange(name, delta);
      else this.onItemReceived(name);
    }
    if (nodeId === null) this.onComplete(tree.id);
    return true;
  }

  start(treeId) {
    const tree = this.trees.get(ruleId(treeId));
    if (!tree) throw new RangeError("Unknown dialogue.");
    if (this.state.dialogueState.active)
      throw new Error("A dialogue is already active.");
    return this.transition(tree, tree.start);
  }

  getCurrentNode() {
    const active = this.state.dialogueState.active;
    if (!active) return null;
    const tree = this.trees.get(active.treeId),
      node = tree.nodes[active.nodeId];
    // Only presentation data escapes; effects and private branches stay in the interpreter.
    return {
      treeId: tree.id,
      nodeId: active.nodeId,
      speakerId: node.speakerId ?? null,
      text: node.text,
      choices: (node.choices ?? [])
        .filter((choice) => this.meets(choice.requirements))
        .map((choice) => ({ id: choice.id, text: choice.text })),
    };
  }

  choose(choiceId) {
    const active = this.state.dialogueState.active;
    if (!active) throw new Error("No active dialogue.");
    const tree = this.trees.get(active.treeId),
      node = tree.nodes[active.nodeId];
    const choice = (node.choices ?? []).find((entry) => entry.id === choiceId);
    if (
      !choice ||
      !this.meets(node.requirements) ||
      !this.meets(choice.requirements)
    )
      return false;
    return this.transition(tree, choice.next, choice);
  }

  advance() {
    const active = this.state.dialogueState.active;
    if (!active) return false;
    const tree = this.trees.get(active.treeId),
      node = tree.nodes[active.nodeId];
    if (node.choices?.length || !this.meets(node.requirements)) return false;
    return this.transition(tree, node.next ?? null);
  }
}
