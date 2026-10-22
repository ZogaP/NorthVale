/** @typedef {{endingId:number,title:string,triggerKey:string}} EndingResult */
export const ENDING_TITLES = Object.freeze([
  "Redenção Analógica",
  "Justiça Sombria",
  "O Sacrifício do Forasteiro",
  "A Queda do Sistema",
  "A Última Confissão",
  "Pacto de Ferro",
  "O Chantagista",
  "O Crime Perfeito de Bobby",
  "Louco Sem Provas",
  "O Incêndio do Arquivo",
  "A Cúmplice Silenciosa",
  "A Vingança de Helen",
  "O Abandono Covarde",
  "Morte em Serviço",
]);
export const ENDING_DESCRIPTIONS = Object.freeze([
  "Sarah sobrevive. As provas intactas seguem por trem para fora da jurisdição de Ruth. O silêncio de NorthVale finalmente encontra uma testemunha que o poder local não consegue deter.",
  "Sarah morreu de hipotermia. Alex reúne provas suficientes, mas executa Bobby no vertedouro. A verdade permanece nos autos; a justiça que escolheu o acompanhará como outra culpa.",
  "Com Sarah a salvo e a vigilância no limite, Alex barricada a delegacia. É alvejado enquanto sustenta a proteção que prometeu à testemunha.",
  "Sarah está viva. A reputação construída por Alex sustenta a exposição pública no diner. A revolta popular rompe a proteção institucional de Ruth.",
  "Bobby chega ao colapso sob custódia na farmácia e tira a própria vida. Seu depoimento se encerra antes de o caso chegar ao tribunal.",
  "Sarah sobrevive, mas a verdade fica sob sigilo. Ruth assina o acordo, Bobby é transferido discretamente e Alex assume o cargo. A ordem retorna com o preço do silêncio.",
  "As provas viraram moeda de troca. Alex aceita o suborno e foge com uma mala de US$ 75.000. NorthVale permanece com as perguntas que ele decidiu vender.",
  "A vigilância permitiu preparar a emboscada na comporta. Bobby surpreende Alex e o joga na água. O crime permanece protegido pelo encobrimento.",
  "Alex compreendeu a responsabilidade de Bobby, mas não reuniu provas materiais suficientes. Um laudo psiquiátrico transforma a acusação em motivo para sua internação.",
  "O pânico de Bobby fica sem contenção. O incêndio alcança os arquivos do cartório e da delegacia, levando consigo parte da memória que sustentava a investigação.",
  "A culpa foi deslocada para Clara. Ela tira a própria vida no cofre do cartório, enquanto a responsabilidade de Bobby fica encoberta por outra tragédia.",
  "Alex arma Helen. Durante o café no diner, ela alveja Bobby. A mãe de Sarah passa a responder pelo ato que a investigação não impediu.",
  "Alex abandona NorthVale ou deixa a paranoia impedir sua ação no segundo dia. A estrada o leva para longe; a cidade continua com aquilo que ele não resolveu.",
  "No terceiro dia, Alex invade a represa sem a luz ou as ferramentas necessárias. Bobby o surpreende na passagem de manutenção e provoca seu afogamento.",
]);
/** Validate the canonical seven inputs without clamping malformed saves. @param {object} state @returns {Set<string>} */
export function validateEndingState(state) {
  if (!state || typeof state !== "object")
    throw new TypeError("Estado ausente.");
  for (const [key, min, max] of [
    ["PARANOIA", 0, 100],
    ["SCRUTINY", 0, 100],
    ["REPUTATION", -50, 50],
    ["BOBBY_STABILITY", 0, 100],
    ["PROOF_WEIGHT", 0, 10],
  ])
    if (
      typeof state[key] !== "number" ||
      !Number.isFinite(state[key]) ||
      state[key] < min ||
      state[key] > max
    )
      throw new RangeError("Variável de campanha inválida: " + key);
  if (![0, 1, 2].includes(state.SARAH_STATUS))
    throw new RangeError("SARAH_STATUS inválido.");
  const flags = state.PLAYER_DECISION_FLAGS;
  if (!(flags instanceof Set) && !Array.isArray(flags))
    throw new TypeError("Flags devem ser Array ou Set.");
  if (
    flags.size > 100 ||
    flags.length > 100 ||
    [...flags].some(
      (v) => typeof v !== "string" || !/^[A-Z][A-Z0-9_]{0,79}$/.test(v),
    )
  )
    throw new TypeError("Flag inválida.");
  return new Set(flags);
}
/** Deterministic event-first ending arbitration, independent of UI and RNG. */
export class EndingManager {
  /** @param {object} state @param {{onLock?:Function}} [options] */
  constructor(state, { onLock = () => {} } = {}) {
    this.state = state;
    this.onLock = onLock;
    validateEndingState(state);
    if (state.ending !== undefined && state.ending !== null) {
      if (
        !Number.isInteger(state.ending.endingId) ||
        !ENDING_TITLES[state.ending.endingId - 1] ||
        typeof state.ending.triggerKey !== "string" ||
        !/^[A-Z][A-Z0-9_]{0,79}$/.test(state.ending.triggerKey)
      )
        throw new TypeError("Final salvo inválido.");
      state.ending.title = ENDING_TITLES[state.ending.endingId - 1];
    }
  }
  /** Explicit fatal events precede negotiated outcomes, which precede proof-based outcomes. Null means keep playing. @param {object} gameState @returns {EndingResult|null} */
  evaluateEnding(gameState = this.state) {
    const f = validateEndingState(gameState),
      s = gameState,
      has = (flag) => f.has(flag);
    let id = 0,
      key = "";
    if (s.day >= 3 && has("DAM_INVADED_UNEQUIPPED"))
      [id, key] = [14, "DAM_INVADED_UNEQUIPPED"];
    else if (s.BOBBY_STABILITY === 0 && has("BOBBY_IN_PHARMACY_CUSTODY"))
      [id, key] = [5, "BOBBY_IN_PHARMACY_CUSTODY"];
    else if (has("BOBBY_PANIC_UNCONTAINED"))
      [id, key] = [10, "BOBBY_PANIC_UNCONTAINED"];
    else if (has("CLARA_BLAMED")) [id, key] = [11, "CLARA_BLAMED"];
    else if (has("HELEN_ARMED")) [id, key] = [12, "HELEN_ARMED"];
    else if (s.SCRUTINY >= 85 && has("AMBUSHED_AT_SLUICE"))
      [id, key] = [8, "AMBUSHED_AT_SLUICE"];
    else if (
      has("ABANDONED_CITY") ||
      (s.PARANOIA === 100 && s.day === 2 && has("DAY2_INACTION"))
    )
      [id, key] = [
        13,
        has("ABANDONED_CITY") ? "ABANDONED_CITY" : "DAY2_INACTION",
      ];
    else if (
      s.SARAH_STATUS === 1 &&
      s.SCRUTINY >= 90 &&
      has("BARRICADED_STATION")
    )
      [id, key] = [3, "BARRICADED_STATION"];
    else if (
      s.PROOF_WEIGHT >= 8 &&
      s.SARAH_STATUS === 0 &&
      has("EXECUTED_BOBBY_AT_SPILLWAY")
    )
      [id, key] = [2, "EXECUTED_BOBBY_AT_SPILLWAY"];
    else if (
      s.PROOF_WEIGHT >= 8 &&
      has("CORRUPT_BRIBE_ACCEPTED") &&
      has("FLED_WITH_75000")
    )
      [id, key] = [7, "FLED_WITH_75000"];
    else if (s.SARAH_STATUS === 1 && has("RUTH_DEAL_SIGNED"))
      [id, key] = [6, "RUTH_DEAL_SIGNED"];
    else if (
      s.SARAH_STATUS === 1 &&
      s.REPUTATION >= 30 &&
      has("PUBLIC_ACCUSATION")
    )
      [id, key] = [4, "PUBLIC_ACCUSATION"];
    else if (
      s.PROOF_WEIGHT >= 8 &&
      s.SARAH_STATUS === 1 &&
      !has("CORRUPT_BRIBE_ACCEPTED") &&
      has("PROOFS_DISPATCHED_TRAIN")
    )
      [id, key] = [1, "PROOFS_DISPATCHED_TRAIN"];
    else if (
      s.PROOF_WEIGHT <= 3 &&
      has("CORRECT_DEDUCTION") &&
      has("PSYCHIATRIC_REPORT_FILED")
    )
      [id, key] = [9, "PSYCHIATRIC_REPORT_FILED"];
    return id
      ? { endingId: id, title: ENDING_TITLES[id - 1], triggerKey: key }
      : null;
  }
  /** Lock once, persist an evaluation snapshot and notify the host to disable world controls. @param {number} endingId @returns {EndingResult} */
  lockEnding(endingId) {
    if (!Number.isInteger(endingId) || !ENDING_TITLES[endingId - 1])
      throw new RangeError("Final desconhecido.");
    if (this.state.ending) return this.state.ending;
    const result = this.evaluateEnding();
    if (!result || result.endingId !== endingId)
      throw new Error("As condições deste final ainda não foram satisfeitas.");
    this.state.ending = { ...result };
    this.state.worldControlsLocked = true;
    this.state.endingSnapshot = {
      PARANOIA: this.state.PARANOIA,
      SCRUTINY: this.state.SCRUTINY,
      REPUTATION: this.state.REPUTATION,
      SARAH_STATUS: this.state.SARAH_STATUS,
      BOBBY_STABILITY: this.state.BOBBY_STABILITY,
      PROOF_WEIGHT: this.state.PROOF_WEIGHT,
      PLAYER_DECISION_FLAGS: [...this.state.PLAYER_DECISION_FLAGS],
      day: this.state.day,
    };
    this.onLock(this.state.ending);
    return this.state.ending;
  }
}
