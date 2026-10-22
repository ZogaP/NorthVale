/** @typedef {'LOCKED'|'ACTIVE'|'COMPLETED'|'FAILED'} QuestStatus */
/** @typedef {{id:string,title:string,giverNpcId:string,currentStage:number,maxStages:number,status:QuestStatus,variables:Object,requiredEvidence:string[]}} Quest */
export const QUEST_DEFINITIONS = Object.freeze([
  {
    id: "MAIN_SARAH_DISAPPEARANCE",
    title: "O desaparecimento de Sarah",
    giverNpcId: "helen",
    maxStages: 5,
    requiredEvidence: ["letter", "deed1978", "viatura04"],
    stages: [
      [],
      [],
      ["letter"],
      ["deed1978"],
      ["viatura04"],
      ["rescue_location"],
    ],
  },
  {
    id: "SIDE_ELIAS_PRESCRIPTIONS",
    title: "Fenol e luminol",
    giverNpcId: "elias",
    maxStages: 2,
    requiredEvidence: ["prescription"],
    prerequisiteStage: 2,
    stages: [[], ["prescription"], ["phenol", "luminol"]],
  },
  {
    id: "SIDE_SAM_LOCKPICK",
    title: "As ferramentas de Sam",
    giverNpcId: "sam",
    maxStages: 2,
    requiredEvidence: ["toolbox"],
    prerequisiteStage: 1,
    stages: [[], ["toolbox"], ["lockpick_receipt"]],
  },
  {
    id: "SIDE_OWEN_ALIBI",
    title: "A viatura nº 04",
    giverNpcId: "owen",
    maxStages: 2,
    requiredEvidence: ["viatura04"],
    prerequisiteStage: 2,
    stages: [[], ["viatura04"], ["owen_confession"]],
  },
  {
    id: "SIDE_CLARA_ARCHIVES",
    title: "Escrituras de 1978",
    giverNpcId: "clara",
    maxStages: 2,
    requiredEvidence: ["deed1978"],
    prerequisiteStage: 2,
    stages: [[], ["deed1978"], ["decoded_deed"]],
  },
]);
/** Reject non-JSON payloads, circular values, prototype keys and oversized data. @param {object} value @returns {object} */
function safePayload(value) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new TypeError("Payload deve ser um objeto.");
  let count = 0;
  const visit = (v, depth) => {
    if (depth > 10 || ++count > 2000)
      throw new RangeError("Payload muito grande.");
    if (v === null || typeof v === "string" || typeof v === "boolean") return;
    if (typeof v === "number" && Number.isFinite(v)) return;
    if (typeof v !== "object") throw new TypeError("Valor não serializável.");
    for (const key of Object.keys(v)) {
      if (["__proto__", "constructor", "prototype"].includes(key))
        throw new TypeError("Chave inválida.");
      visit(v[key], depth + 1);
    }
  };
  visit(value, 0);
  return JSON.parse(JSON.stringify(value));
}
/** Canonical quest state machine; never consults a random culprit generator. */
export class QuestManager {
  /** @param {object} state Save-backed state with evidence/inventory/quests. @param {{onChange?:Function}} [options] */
  constructor(state, { onChange = () => {} } = {}) {
    if (!state || typeof state !== "object")
      throw new TypeError("Estado ausente.");
    this.state = state;
    this.onChange = onChange;
    state.quests ??= {};
    if (
      typeof onChange !== "function" ||
      !state.quests ||
      typeof state.quests !== "object" ||
      Array.isArray(state.quests) ||
      Object.keys(state.quests).some(
        (id) => !QUEST_DEFINITIONS.some((q) => q.id === id),
      )
    )
      throw new TypeError("Registro de missões inválido.");
    for (const definition of QUEST_DEFINITIONS) {
      state.quests[definition.id] ??= {
        id: definition.id,
        title: definition.title,
        giverNpcId: definition.giverNpcId,
        currentStage: 0,
        maxStages: definition.maxStages,
        status: definition.id.startsWith("MAIN_") ? "ACTIVE" : "LOCKED",
        variables: {},
        requiredEvidence: [...definition.requiredEvidence],
      };
      const q = state.quests[definition.id];
      if (
        q.id !== definition.id ||
        q.maxStages !== definition.maxStages ||
        !Array.isArray(q.requiredEvidence) ||
        q.requiredEvidence.join("|") !==
          definition.requiredEvidence.join("|") ||
        !Number.isInteger(q.currentStage) ||
        q.currentStage < 0 ||
        q.currentStage > definition.maxStages ||
        !["LOCKED", "ACTIVE", "COMPLETED", "FAILED"].includes(q.status) ||
        !q.variables ||
        typeof q.variables !== "object"
      )
        throw new TypeError("Missão salva inválida: " + definition.id);
      safePayload(q.variables);
      q.title = definition.title;
      q.giverNpcId = definition.giverNpcId;
    }
  }
  /** @param {string} id @returns {Quest} */
  get(id) {
    if (!QUEST_DEFINITIONS.some((q) => q.id === id))
      throw new RangeError("Missão desconhecida: " + id);
    return this.state.quests[id];
  }
  /** @param {string} questId @returns {boolean} */
  isPrerequisiteMet(questId) {
    this.get(questId);
    const def = QUEST_DEFINITIONS.find((q) => q.id === questId),
      main = this.get("MAIN_SARAH_DISAPPEARANCE");
    return !def.prerequisiteStage || main.currentStage >= def.prerequisiteStage;
  }
  /** Stages cannot skip prerequisites or be farmed after completion/failure. Evidence comes from the save, never from the payload. @param {string} questId @param {number} targetStage @param {object} [payload] @returns {boolean} */
  advanceStage(questId, targetStage, payload = {}) {
    const q = this.get(questId),
      def = QUEST_DEFINITIONS.find((d) => d.id === questId);
    if (
      !Number.isInteger(targetStage) ||
      targetStage < 0 ||
      targetStage > q.maxStages
    )
      throw new RangeError("Etapa inválida.");
    if (
      ["COMPLETED", "FAILED"].includes(q.status) ||
      targetStage !== q.currentStage + 1 ||
      !this.isPrerequisiteMet(questId)
    )
      return false;
    const data = safePayload(payload),
      owned = new Set([
        ...(this.state.evidence || []),
        ...(this.state.inventory || []),
      ]);
    if (!def.stages[targetStage].every((id) => owned.has(id))) return false;
    q.status = "ACTIVE";
    q.currentStage = targetStage;
    Object.assign(q.variables, data);
    if (targetStage === q.maxStages) return this.completeQuest(questId);
    this.onChange({ type: "stage", questId, stage: targetStage });
    return true;
  }
  /** @param {string} questId @returns {boolean} */
  completeQuest(questId) {
    const q = this.get(questId);
    if (
      q.status !== "ACTIVE" ||
      q.currentStage !== q.maxStages ||
      !q.requiredEvidence.every(
        (id) =>
          (this.state.evidence || []).includes(id) ||
          (this.state.inventory || []).includes(id),
      )
    )
      return false;
    q.status = "COMPLETED";
    this.onChange({ type: "completed", questId });
    return true;
  }
  /** Failure is terminal and preserves the last reached stage for the journal. @param {string} questId @param {string} reason @returns {boolean} */
  failQuest(questId, reason) {
    const q = this.get(questId);
    if (typeof reason !== "string" || !reason.trim() || reason.length > 1000)
      throw new TypeError("Motivo inválido.");
    if (["COMPLETED", "FAILED"].includes(q.status)) return false;
    q.status = "FAILED";
    q.variables.failureReason = reason;
    this.onChange({ type: "failed", questId, reason });
    return true;
  }
}
