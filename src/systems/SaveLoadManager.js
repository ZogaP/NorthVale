import { cloneRuleData, ruleId, ruleRecord } from "./RuleData.js";

export const SAVE_SLOTS = Object.freeze([1, 2, 3, "autosave"]);
const FORMAT = "northvale.rules.save";
const VERSION = 1;

/** JSON saves with injected storage/validation. No rendering or event-loop dependency. */
export class SaveLoadManager {
  constructor(
    state,
    {
      storage,
      keyPrefix = "northvale:slots:",
      serialize = JSON.stringify,
      deserialize = JSON.parse,
      validateState = () => true,
      now = () => new Date(),
      getState = () => state,
      setState = null,
      onLoad = () => {},
    } = {},
  ) {
    ruleRecord(state);
    // Read localStorage lazily, so importing this module is also safe in Node/workers.
    this.storage = storage ?? globalThis.localStorage;
    if (
      !this.storage ||
      typeof this.storage.getItem !== "function" ||
      typeof this.storage.setItem !== "function"
    )
      throw new TypeError("A Storage-compatible adapter is required.");
    ruleId(keyPrefix);
    this.keyPrefix = keyPrefix;
    this.serialize = serialize;
    this.deserialize = deserialize;
    this.validateState = validateState;
    this.now = now;
    this.getState = getState;
    this.setState =
      setState ??
      ((loaded) => {
        for (const key of Object.keys(state)) delete state[key];
        Object.assign(state, loaded);
      });
    this.onLoad = onLoad;
    this.lastArea = this.areaOf(getState());
  }

  normalizeSlot(slotId) {
    if (["1", "2", "3"].includes(slotId)) return Number(slotId);
    if (!SAVE_SLOTS.includes(slotId))
      throw new RangeError("Use manual slot 1, 2, 3 or autosave.");
    return slotId;
  }

  areaOf(state) {
    return state.interior ?? "exterior";
  }

  prepareState(value) {
    const state = cloneRuleData(ruleRecord(value));
    if (this.validateState(state) === false)
      throw new TypeError("Save state rejected by validator.");
    return cloneRuleData(state);
  }

  decode(raw, slotId) {
    const envelope = JSON.parse(raw);
    ruleRecord(envelope);
    if (
      envelope.format !== FORMAT ||
      envelope.version !== VERSION ||
      envelope.slotId !== slotId ||
      typeof envelope.savedAt !== "string" ||
      !Number.isFinite(Date.parse(envelope.savedAt))
    )
      throw new TypeError("Unsupported or corrupted save envelope.");
    // Feed only the state to a game-specific deserializer/migrator, never the envelope.
    const state = this.prepareState(
      this.deserialize(JSON.stringify(envelope.state)),
    );
    return { envelope, state };
  }

  info(slotId, envelope, state) {
    return {
      slotId,
      status: "saved",
      savedAt: envelope.savedAt,
      version: envelope.version,
      day: state.day ?? null,
      minute: state.minute ?? null,
      area: this.areaOf(state),
    };
  }

  write(slotId, source) {
    const validated = this.prepareState(source);
    const serialized = this.serialize(validated);
    if (typeof serialized !== "string")
      throw new TypeError("Serializer must return JSON text.");
    const state = this.prepareState(this.deserialize(serialized));
    const savedAt = this.now().toISOString();
    const envelope = {
      format: FORMAT,
      version: VERSION,
      slotId,
      savedAt,
      state,
    };
    const raw = JSON.stringify(envelope);
    // One atomic Storage write: quota/security failures leave the previous slot intact.
    this.storage.setItem(this.keyPrefix + slotId, raw);
    return this.info(slotId, envelope, state);
  }

  saveGame(slotId) {
    return this.write(this.normalizeSlot(slotId), this.getState());
  }

  loadGame(slotId) {
    slotId = this.normalizeSlot(slotId);
    let raw = this.storage.getItem(this.keyPrefix + slotId);
    if (raw === null || raw === undefined) {
      if (slotId !== 1 || !this.importLegacySave(1))
        throw new Error("Empty save slot.");
      raw = this.storage.getItem(this.keyPrefix + slotId);
    }
    const { state } = this.decode(raw, slotId);
    // All parsing, migration and validation complete before replacing live state.
    this.setState(state);
    this.lastArea = this.areaOf(state);
    this.onLoad(state, slotId);
    return state;
  }

  getSavedSlotsInfo() {
    return SAVE_SLOTS.map((slotId) => {
      const raw = this.storage.getItem(this.keyPrefix + slotId);
      if (raw === null || raw === undefined)
        return { slotId, status: "empty", savedAt: null };
      try {
        const { envelope, state } = this.decode(raw, slotId);
        return this.info(slotId, envelope, state);
      } catch (error) {
        return {
          slotId,
          status: "corrupt",
          savedAt: null,
          error: error.message,
        };
      }
    });
  }

  /** Call after the host commits an area transition, or subscribe via bindAreaTransitions. */
  onAreaTransition(nextAreaId) {
    ruleId(nextAreaId);
    if (nextAreaId === this.lastArea) return null;
    const info = this.saveGame("autosave");
    this.lastArea = nextAreaId;
    return info;
  }

  /** subscribe(handler) must return an unsubscribe function; works with any event bus. */
  bindAreaTransitions(subscribe) {
    const unsubscribe = subscribe((areaId) => this.onAreaTransition(areaId));
    if (typeof unsubscribe !== "function")
      throw new TypeError("Subscription must return an unsubscribe function.");
    return unsubscribe;
  }

  /** Import the old single save without deleting it or overwriting an occupied slot. */
  importLegacySave(slotId = 1) {
    slotId = this.normalizeSlot(slotId);
    if (this.storage.getItem(this.keyPrefix + slotId) != null) return false;
    const raw =
      this.storage.getItem("northvale-save") ??
      this.storage.getItem("mercy-pines-save");
    if (raw == null) return false;
    const state = this.prepareState(this.deserialize(raw));
    this.write(slotId, state);
    return true;
  }
}
