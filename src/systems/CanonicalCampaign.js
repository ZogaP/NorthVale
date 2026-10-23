import { QuestManager } from "./QuestManager.js";
import { EndingManager, validateEndingState } from "./EndingManager.js";
import { DeductionEngine } from "./DeductionEngine.js";

/** Canonical, authored evidence. Every physical anchor exists in the room JSON. */
export const CANONICAL_CLUES = Object.freeze({
  deed1978: {
    title: "Escritura de 1978",
    interiorId: "registry",
    roomId: "notary",
    propId: "private-files",
    text: "A passagem da represa foi transferida com assinatura adulterada. Clara pode decifrar a escritura.",
    weight: 1,
  },
  viatura04: {
    title: "Registro da viatura nº 04",
    interiorId: "depot",
    roomId: "office",
    propId: "ledger",
    text: "A viatura nº 04 foi entregue a Bobby Miller na noite do desaparecimento. Owen reconheceu o veículo.",
    weight: 1,
  },
  prescription: {
    title: "Prescrição de reagentes",
    interiorId: "pharmacy",
    roomId: "office",
    propId: "private-files",
    text: "Uma receita de fenol e luminol anotada por Elias. Apresente-a ao farmacêutico.",
    weight: 0,
  },
  toolbox: {
    title: "Caixa de ferramentas de Sam",
    interiorId: "scrapyard",
    roomId: "cabin",
    propId: "parts-box",
    text: "Ferramentas marcadas com as iniciais de Sam. Devolva a caixa para obter as gazuas.",
    weight: 0,
  },
  ruth_order: {
    title: "Ordem de arquivamento de Ruth",
    interiorId: "police",
    roomId: "archive",
    propId: "current-files",
    text: "Ruth ordenou ocultar a ocorrência da viatura 04 antes de ouvir Helen.",
    weight: 1,
  },
  bobby_trace: {
    title: "Vestígio na roupa de Bobby",
    interiorId: "motel",
    roomId: "room17",
    propId: "drawer",
    text: "Fibras e marcas da passagem de manutenção ligam Bobby a Sarah e à represa.",
    weight: 1,
  },
  rescue_location: {
    title: "Planta da câmara de manutenção",
    interiorId: "dam",
    roomId: "control",
    propId: "shift-log",
    text: "A câmara abaixo das turbinas tem uma saída de serviço. Sarah pode estar presa ali.",
    weight: 1,
  },
  water_record: {
    title: "Registro das comportas",
    interiorId: "dam",
    roomId: "turbines",
    propId: "maintenance",
    text: "Bobby abriu a passagem de manutenção; o horário foi apagado por ordem de Ruth.",
    weight: 1,
  },
  owen_confession: {
    title: "Relato ocular de Owen",
    text: "Owen viu Bobby conduzindo a viatura nº 04 rumo à represa com Sarah.",
    weight: 1,
  },
  decoded_deed: {
    title: "Escritura decifrada por Clara",
    text: "A passagem ocultada em 1978 explica o acesso de Bobby e a proteção institucional de Ruth.",
    weight: 1,
  },
});
/** Fixed culprit; seed is retained solely as an old-save identifier. @param {number|string|null} [seed] @returns {object} */
export function createCanonicalCase(seed = 1989) {
  const clues = Object.fromEntries(
    Object.entries(CANONICAL_CLUES).map(([id, c]) => [
      id,
      { id, ...c, category: "document", discovered: false, presented: false },
    ]),
  );
  return {
    seed: seed ?? 1989,
    archetypeKey: "canonical",
    culpritId: "bobby",
    culpritName: "Bobby Miller",
    name: "O silêncio de Sarah",
    motive:
      "Bobby Miller sequestrou Sarah. Ruth Mercer suprimiu os registros e protegeu o acobertamento.",
    solutionSummary:
      "A viatura 04 e a passagem de manutenção ligam Bobby a Sarah; as ordens de Ruth documentam o encobrimento.",
    falseAlibi: {
      claim: "Não saí do diner. Nunca conduzi a viatura 04.",
      contradictionClue: "viatura04",
    },
    lyingWitness: { npcId: "ruth", npcName: "Ruth Mercer" },
    clues,
    requiredClues: [
      "viatura04",
      "owen_confession",
      "bobby_trace",
      "ruth_order",
    ],
    deductions: [
      {
        id: "canonical-route",
        title: "A viatura nº 04",
        requiredClueIds: ["viatura04", "owen_confession"],
        unlockedHypothesis: "Bobby mentiu sobre o trajeto da viatura.",
        unlockedLeadLocation: "dam",
      },
      {
        id: "canonical-coverup",
        title: "O acobertamento",
        requiredClueIds: ["deed1978", "ruth_order", "decoded_deed"],
        unlockedHypothesis: "Ruth escondeu a passagem e suprimiu a ocorrência.",
        unlockedLeadLocation: "registry",
      },
      {
        id: "canonical-culprit",
        title: "Responsabilidade de Bobby Miller",
        requiredClueIds: ["viatura04", "owen_confession", "bobby_trace"],
        isCulpritIndictment: true,
        culpritId: "bobby",
        unlockedHypothesis:
          "Bobby é responsável pelo desaparecimento; Sarah pode estar na câmara de manutenção.",
      },
    ],
  };
}
/** Preserve a legacy archive, migrate collected facts, reset incompatible random deductions. @param {object} state @returns {object} */
export function migrateCanonicalState(state) {
  if (state.canonVersion !== 1) {
    if (state.case && state.case.archetypeKey !== "canonical")
      state.legacyCase = JSON.parse(JSON.stringify(state.case));
    const old = state.case;
    state.case = createCanonicalCase(old?.seed);
    state.corkboardLinks = [];
    state.corkboardDeductions = [];
    state.canonVersion = 1;
  }
  if (
    !state.case ||
    state.case.culpritId !== "bobby" ||
    state.case.lyingWitness?.npcId !== "ruth"
  )
    throw new TypeError("Cânone salvo incompatível.");
  state.PARANOIA ??= Math.max(0, Math.min(100, state.obsession ?? 20));
  state.SCRUTINY ??= 0;
  state.REPUTATION ??= 0;
  state.SARAH_STATUS ??= 2;
  state.SARAH_OUTCOME_KNOWN ??= false;
  state.BOBBY_STABILITY ??= 70;
  state.PROOF_WEIGHT ??= 0;
  state.PLAYER_DECISION_FLAGS ??= [];
  state.evidenceIntegrity ??= {};
  if (
    typeof state.SARAH_OUTCOME_KNOWN !== "boolean" ||
    !state.evidenceIntegrity ||
    typeof state.evidenceIntegrity !== "object" ||
    Array.isArray(state.evidenceIntegrity) ||
    Object.values(state.evidenceIntegrity).some((v) => typeof v !== "boolean")
  )
    throw new TypeError("Integridade de campanha inválida.");
  state.ending ??= null;
  state.worldControlsLocked = Boolean(state.ending);
  new QuestManager(state);
  validateEndingState(state);
  new EndingManager(state);
  return state;
}
/** Host adapter for progression, NPC favors and world decisions; no visual dependencies. */
export class CanonicalCampaign {
  /** @param {object} state @param {{onChange?:Function,onLock?:Function}} [options] */
  constructor(state, { onChange = () => {}, onLock = () => {} } = {}) {
    this.state = migrateCanonicalState(state);
    this.onChange = onChange;
    this.quests = new QuestManager(state, {
      onChange: (event) => {
        if (event.type === "completed")
          state.REPUTATION = Math.min(50, state.REPUTATION + 8);
        onChange(event);
      },
    });
    this.endings = new EndingManager(state, { onLock });
  }
  /** @param {string} flag @returns {boolean} */
  flag(flag) {
    if (this.state.ending) return false;
    if (!/^[A-Z][A-Z0-9_]{0,79}$/.test(flag))
      throw new TypeError("Flag inválida.");
    if (this.state.PLAYER_DECISION_FLAGS.includes(flag)) return false;
    this.state.PLAYER_DECISION_FLAGS.push(flag);
    return true;
  }
  /** Refresh stage gates from collected facts. @returns {void} */
  sync() {
    const s = this.state;
    if (s.ending) return;
    const deductions = s.deductionGraph ? new DeductionEngine(s) : null;
    s.PROOF_WEIGHT = Math.min(
      10,
      s.evidence.filter(
        (id) =>
          s.evidenceIntegrity[id] !== false &&
          (["letter", "report"].includes(id) ||
            CANONICAL_CLUES[id]?.weight === 1),
      ).length + (deductions?.getProofWeight() ?? 0),
    );
    if (s.introDone) this.quests.advanceStage("MAIN_SARAH_DISAPPEARANCE", 1);
    for (const stage of [2, 3])
      this.quests.advanceStage("MAIN_SARAH_DISAPPEARANCE", stage);
    if (s.PLAYER_DECISION_FLAGS.includes("BOBBY_CONFRONTED"))
      this.quests.advanceStage("MAIN_SARAH_DISAPPEARANCE", 4);
    if (s.SARAH_OUTCOME_KNOWN) {
      if (s.SARAH_STATUS === 1)
        this.quests.advanceStage("MAIN_SARAH_DISAPPEARANCE", 5);
      else
        this.quests.failQuest(
          "MAIN_SARAH_DISAPPEARANCE",
          "Sarah não sobreviveu ao resgate.",
        );
    }
    for (const [id, evidence] of [
      ["SIDE_ELIAS_PRESCRIPTIONS", "prescription"],
      ["SIDE_SAM_LOCKPICK", "toolbox"],
      ["SIDE_OWEN_ALIBI", "viatura04"],
      ["SIDE_CLARA_ARCHIVES", "deed1978"],
    ])
      if (s.evidence.includes(evidence)) this.quests.advanceStage(id, 1);
    if (
      s.corkboardDeductions.includes("canonical-culprit") ||
      deductions
        ?.getProvenTheses()
        .some((thesis) => thesis.id === "canonical-culprit")
    )
      this.flag("CORRECT_DEDUCTION");
    s.obsession = s.PARANOIA;
  }
  /** NPC rewards are available only after their evidence stage and cannot repeat. @param {string} npcId @returns {boolean} */
  favor(npcId) {
    this.sync();
    const rewards = {
        elias: ["SIDE_ELIAS_PRESCRIPTIONS", ["phenol", "luminol"]],
        sam: ["SIDE_SAM_LOCKPICK", ["lockpick_receipt", "Gazua de Aço"]],
        owen: ["SIDE_OWEN_ALIBI", ["owen_confession"]],
        clara: ["SIDE_CLARA_ARCHIVES", ["decoded_deed"]],
      },
      reward = rewards[npcId];
    if (!reward || this.state.ending) return false;
    const [id, items] = reward,
      q = this.quests.get(id);
    if (q.currentStage !== 1 || q.status !== "ACTIVE") return false;
    for (const item of items)
      if (CANONICAL_CLUES[item]) {
        if (!this.state.evidence.includes(item)) this.state.evidence.push(item);
      } else if (!this.state.inventory.includes(item))
        this.state.inventory.push(item);
    this.quests.advanceStage(id, 2);
    this.sync();
    return true;
  }
  /** Record a proved contradiction exactly once. @param {string} npcId @returns {void} */
  confront(npcId) {
    if (this.flag(npcId === "bobby" ? "BOBBY_CONFRONTED" : "RUTH_CONFRONTED")) {
      this.state.SCRUTINY = Math.min(100, this.state.SCRUTINY + 15);
      if (npcId === "bobby")
        this.state.BOBBY_STABILITY = Math.max(
          0,
          this.state.BOBBY_STABILITY - 35,
        );
    }
    this.sync();
  }
  /** World-event actions are gated by location, stage and equipment. No UI can directly set a final. @param {string} action @returns {{ok:boolean,message:string,ending?:object}} */
  act(action) {
    const s = this.state;
    if (s.ending) return { ok: false, message: "O caso já está encerrado." };
    this.sync();
    const where = s.interior,
      flags = {
        train: ["depot", "PROOFS_DISPATCHED_TRAIN"],
        execute: ["dam", "EXECUTED_BOBBY_AT_SPILLWAY"],
        barricade: ["police", "BARRICADED_STATION"],
        publish: ["diner", "PUBLIC_ACCUSATION"],
        custody: ["pharmacy", "BOBBY_IN_PHARMACY_CUSTODY"],
        deal: ["police", "RUTH_DEAL_SIGNED"],
        flee_money: ["gasstation", "FLED_WITH_75000"],
        ambush: ["dam", "AMBUSHED_AT_SLUICE"],
        psychiatric: ["motel", "PSYCHIATRIC_REPORT_FILED"],
        panic: ["registry", "BOBBY_PANIC_UNCONTAINED"],
        blame_clara: ["registry", "CLARA_BLAMED"],
        arm_helen: ["diner", "HELEN_ARMED"],
        abandon: ["motel", "ABANDONED_CITY"],
        unsafe: ["dam", "DAM_INVADED_UNEQUIPPED"],
      };
    if (action === "rescue") {
      if (
        where !== "dam" ||
        s.interiorRoom !== "turbines" ||
        this.quests.get("MAIN_SARAH_DISAPPEARANCE").currentStage < 4 ||
        !s.evidence.includes("rescue_location") ||
        !s.inventory.includes("Lanterna") ||
        !s.inventory.some((i) => ["Gazua de Aço", "toolbox"].includes(i)) ||
        s.SARAH_OUTCOME_KNOWN
      )
        return {
          ok: false,
          message:
            "O resgate exige chegar às turbinas, demonstrar o trajeto de Bobby, levar lanterna e ferramentas.",
        };
      s.SARAH_OUTCOME_KNOWN = true;
      s.SARAH_STATUS = s.day <= 3 ? 1 : 0;
      this.sync();
      return {
        ok: true,
        message:
          s.SARAH_STATUS === 1
            ? "Sarah foi resgatada viva. Escolha como proteger as pessoas e encaminhar as provas."
            : "Você chegou tarde. Sarah morreu de hipotermia.",
      };
    }
    if (action === "bribe") {
      if (
        where !== "police" ||
        this.quests.get("MAIN_SARAH_DISAPPEARANCE").currentStage < 3
      )
        return {
          ok: false,
          message: "O acordo só é oferecido depois da descoberta dos arquivos.",
        };
      if (!this.flag("CORRUPT_BRIBE_ACCEPTED"))
        return {
          ok: false,
          message: "Sua resposta à oferta já foi registrada.",
        };
      s.REPUTATION = Math.max(-50, s.REPUTATION - 25);
      return {
        ok: true,
        message:
          "O suborno foi aceito. Essa decisão é irreversível nesta partida.",
      };
    }
    if (action === "press") {
      if (
        where !== "police" ||
        this.quests.get("MAIN_SARAH_DISAPPEARANCE").currentStage < 3 ||
        !this.flag("PUBLIC_NOTICE_DAY_" + s.day)
      )
        return {
          ok: false,
          message:
            "O aviso à imprensa exige os arquivos e só pode ser feito uma vez por dia.",
        };
      s.SCRUTINY = Math.min(100, s.SCRUTINY + 35);
      s.PARANOIA = Math.min(100, s.PARANOIA + 10);
      return {
        ok: true,
        message:
          "O aviso público aumentou a vigilância sobre Alex em 35 pontos.",
      };
    }
    if (action === "destabilize") {
      if (
        where !== "pharmacy" ||
        !s.PLAYER_DECISION_FLAGS.includes("BOBBY_CONFRONTED")
      )
        return {
          ok: false,
          message: "Bobby ainda não foi confrontado com o registro da viatura.",
        };
      if (!this.flag("BOBBY_PRESSURED_IN_CUSTODY"))
        return { ok: false, message: "A pressão já foi exercida." };
      s.BOBBY_STABILITY = 0;
      return {
        ok: true,
        message:
          "Bobby entrou em colapso sob pressão. A custódia agora representa um risco extremo.",
      };
    }
    if (action === "unprotected_crossing") {
      if (
        where !== "dam" ||
        !s.PLAYER_DECISION_FLAGS.includes("CORRECT_DEDUCTION") ||
        !this.flag("DOCUMENTS_RAIN_DAMAGED")
      )
        return {
          ok: false,
          message:
            "A travessia exige um dossiê já demonstrado e só pode ser registrada uma vez.",
        };
      for (const id of s.evidence)
        if (
          id !== "bobby_trace" &&
          (["letter", "report"].includes(id) || CANONICAL_CLUES[id]?.weight)
        )
          s.evidenceIntegrity[id] = false;
      s.PARANOIA = Math.min(100, s.PARANOIA + 20);
      this.sync();
      return {
        ok: true,
        message:
          "A chuva inutilizou os documentos expostos. A dedução continua correta, mas o peso das provas materiais caiu.",
      };
    }
    const gate = flags[action];
    if (!gate || where !== gate[0])
      return {
        ok: false,
        message: "Essa decisão não está disponível neste local.",
      };
    if (
      ["custody", "panic", "ambush", "psychiatric"].includes(action) &&
      !s.PLAYER_DECISION_FLAGS.includes("BOBBY_CONFRONTED")
    )
      return {
        ok: false,
        message: "Primeiro confronte Bobby com a prova da viatura nº 04.",
      };
    if (action === "panic" && s.BOBBY_STABILITY > 20)
      return { ok: false, message: "Bobby não está em pânico." };
    if (
      action === "unsafe" &&
      (s.day < 3 ||
        (s.inventory.includes("Lanterna") &&
          s.inventory.some((i) => ["Gazua de Aço", "toolbox"].includes(i))))
    )
      return {
        ok: false,
        message:
          "A invasão desprotegida só se aplica a partir do terceiro dia, sem iluminação ou ferramentas.",
      };
    const ready = {
      train:
        s.PROOF_WEIGHT >= 8 &&
        s.SARAH_OUTCOME_KNOWN &&
        s.SARAH_STATUS === 1 &&
        !s.PLAYER_DECISION_FLAGS.includes("CORRUPT_BRIBE_ACCEPTED"),
      execute:
        s.PROOF_WEIGHT >= 8 && s.SARAH_OUTCOME_KNOWN && s.SARAH_STATUS === 0,
      barricade: s.SARAH_STATUS === 1 && s.SCRUTINY >= 90,
      publish: s.SARAH_STATUS === 1 && s.REPUTATION >= 30,
      deal: s.SARAH_STATUS === 1,
      flee_money:
        s.PROOF_WEIGHT >= 8 &&
        s.PLAYER_DECISION_FLAGS.includes("CORRUPT_BRIBE_ACCEPTED"),
      ambush: s.SCRUTINY >= 85,
      psychiatric:
        s.PROOF_WEIGHT <= 3 &&
        s.PLAYER_DECISION_FLAGS.includes("CORRECT_DEDUCTION"),
      blame_clara:
        this.quests.get("MAIN_SARAH_DISAPPEARANCE").currentStage >= 2,
      arm_helen: this.quests.get("MAIN_SARAH_DISAPPEARANCE").currentStage >= 2,
    };
    if (Object.hasOwn(ready, action) && !ready[action])
      return {
        ok: false,
        message:
          "Faltam as condições de prova, resgate ou repercussão para executar essa decisão.",
      };
    this.flag(gate[1]);
    const result = this.endings.evaluateEnding();
    if (result) {
      const ending = this.endings.lockEnding(result.endingId);
      return { ok: true, message: ending.title, ending };
    }
    return {
      ok: true,
      message:
        "Decisão registrada. As condições de desfecho ainda não estão completas.",
    };
  }
}
