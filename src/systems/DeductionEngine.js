import { cloneRuleData, ruleId, ruleNumber, ruleRecord } from "./RuleData.js";

function edgeKey(a, b) {
  return JSON.stringify([a, b].sort());
}

/** Undirected graph. Only explicit validation commits a one-time score/penalty. */
export class DeductionEngine {
  constructor(
    state,
    {
      nodes = [
        ...new Set([
          ...Object.keys(state.case?.clues ?? {}),
          ...(state.evidence ?? []),
          ...(state.deductionGraph?.nodes ?? []),
        ]),
      ],
      theses = state.case?.deductions ?? [],
      connections = null,
      onChange = () => {},
    } = {},
  ) {
    this.state = ruleRecord(state);
    this.nodes = new Set(
      nodes.map((node) => ruleId(typeof node === "string" ? node : node.id)),
    );
    this.theses = cloneRuleData(theses);
    this.rules = new Map();
    const ids = new Set();
    for (const thesis of this.theses) {
      ruleId(thesis.id);
      if (
        ids.has(thesis.id) ||
        !Array.isArray(thesis.requiredClueIds) ||
        thesis.requiredClueIds.length < 2 ||
        new Set(thesis.requiredClueIds).size !== thesis.requiredClueIds.length
      )
        throw new TypeError("Invalid thesis.");
      ids.add(thesis.id);
      for (const id of thesis.requiredClueIds)
        if (!this.nodes.has(id)) throw new TypeError("Unknown thesis node.");
      if (connections === null)
        for (const a of thesis.requiredClueIds)
          for (const b of thesis.requiredClueIds)
            if (a !== b) this.rules.set(edgeKey(a, b), 1);
    }
    if (connections !== null)
      for (const connection of connections) {
        const { nodeA, nodeB, weight = 1 } = connection;
        this.checkPair(nodeA, nodeB);
        ruleNumber(weight, Number.MIN_VALUE, 10);
        this.rules.set(edgeKey(nodeA, nodeB), weight);
      }
    state.evidence ??= [];
    state.evidenceIntegrity ??= {};
    if (!Array.isArray(state.evidence))
      throw new TypeError("Invalid evidence list.");
    state.evidence.forEach(ruleId);
    ruleRecord(state.evidenceIntegrity);
    state.PROOF_WEIGHT ??= 0;
    state.PARANOIA ??= 0;
    ruleNumber(state.PROOF_WEIGHT, 0, 10);
    ruleNumber(state.PARANOIA, 0, 100);
    state.deductionGraph ??= { nodes: [...this.nodes], edges: [] };
    ruleRecord(state.deductionGraph);
    if (
      !Array.isArray(state.deductionGraph.nodes) ||
      state.deductionGraph.nodes.some((id) => !this.nodes.has(id))
    )
      throw new TypeError("Invalid saved node registry.");
    if (!Array.isArray(state.deductionGraph.edges))
      throw new TypeError("Invalid graph.");
    const keys = new Set();
    for (const edge of state.deductionGraph.edges) {
      this.checkPair(edge.nodeA, edge.nodeB);
      if (
        edge.id !== edgeKey(edge.nodeA, edge.nodeB) ||
        keys.has(edge.id) ||
        !["pending", "valid", "invalid"].includes(edge.status)
      )
        throw new TypeError("Invalid saved edge.");
      if (
        edge.status !== "pending" &&
        (edge.status === "valid") !== this.rules.has(edge.id)
      )
        throw new TypeError("Saved edge conflicts with rules.");
      keys.add(edge.id);
    }
    state.deductionGraph.nodes = [...this.nodes];
    this.onChange = onChange;
  }

  checkPair(a, b) {
    ruleId(a);
    ruleId(b);
    if (a === b || !this.nodes.has(a) || !this.nodes.has(b))
      throw new TypeError("Expected two distinct registered nodes.");
  }

  owns(id) {
    return (
      this.state.evidence.includes(id) &&
      this.state.evidenceIntegrity[id] !== false
    );
  }

  /** Register clues discovered after engine initialization without replacing the ledger. */
  registerNode(node) {
    const id = ruleId(typeof node === "string" ? node : node.id);
    if (this.nodes.has(id)) return false;
    this.nodes.add(id);
    this.state.deductionGraph.nodes.push(id);
    return true;
  }

  connectNodes(nodeA, nodeB) {
    this.checkPair(nodeA, nodeB);
    if (!this.owns(nodeA) || !this.owns(nodeB))
      throw new Error("Both intact clues must be collected first.");
    const id = edgeKey(nodeA, nodeB);
    if (!this.state.deductionGraph.edges.some((edge) => edge.id === id))
      this.state.deductionGraph.edges.push({
        id,
        nodeA,
        nodeB,
        status: "pending",
      });
    return id;
  }

  validateConnection(edgeId) {
    const edge = this.state.deductionGraph.edges.find(
      (entry) => entry.id === edgeId,
    );
    if (!edge) throw new RangeError("Unknown edge.");
    if (edge.status !== "pending") return edge.status === "valid";
    if (!this.owns(edge.nodeA) || !this.owns(edge.nodeB))
      throw new Error("Clues unavailable or damaged.");
    const weight = this.rules.get(edge.id);
    edge.status = weight === undefined ? "invalid" : "valid";
    if (weight !== undefined)
      this.state.PROOF_WEIGHT = Math.min(10, this.state.PROOF_WEIGHT + weight);
    else this.state.PARANOIA = Math.min(100, this.state.PARANOIA + 5);
    this.onChange({
      type: "connectionValidated",
      edge: cloneRuleData(edge),
      proofWeight: this.state.PROOF_WEIGHT,
      paranoia: this.state.PARANOIA,
      provenTheses: this.getProvenTheses(),
    });
    return edge.status === "valid";
  }

  /** A thesis needs all its clues in one connected component, using valid edges only. */
  getProvenTheses() {
    return this.theses
      .filter((thesis) => {
        const required = new Set(thesis.requiredClueIds);
        if (![...required].every((id) => this.owns(id))) return false;
        const visited = new Set([thesis.requiredClueIds[0]]);
        let changed = true;
        while (changed) {
          changed = false;
          for (const edge of this.state.deductionGraph.edges) {
            if (
              edge.status !== "valid" ||
              !required.has(edge.nodeA) ||
              !required.has(edge.nodeB)
            )
              continue;
            if (visited.has(edge.nodeA) !== visited.has(edge.nodeB)) {
              visited.add(edge.nodeA);
              visited.add(edge.nodeB);
              changed = true;
            }
          }
        }
        return visited.size === required.size;
      })
      .map(cloneRuleData);
  }

  /** Recompute this graph's active contribution when the host recalculates total proof. */
  getProofWeight() {
    return Math.min(
      10,
      this.state.deductionGraph.edges.reduce(
        (total, edge) =>
          total +
          (edge.status === "valid" &&
          this.owns(edge.nodeA) &&
          this.owns(edge.nodeB)
            ? (this.rules.get(edge.id) ?? 0)
            : 0),
        0,
      ),
    );
  }
}
