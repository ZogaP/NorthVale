import { createState, serialize, deserialize } from "./state.js";
import { InputManager } from "./systems/InputManager.js";
import { EvidenceInventorySystem } from "./systems/EvidenceInventorySystem.js";
import { DeductionEngine } from "./systems/DeductionEngine.js";
import { NPCRoutineSystem } from "./systems/NPCRoutineSystem.js";
import { DialogueTreeRunner } from "./systems/DialogueTreeRunner.js";
import { SaveLoadManager } from "./systems/SaveLoadManager.js";
import { CanonicalCampaign } from "./systems/CanonicalCampaign.js";
import { StealthAudioPropagation } from "./systems/StealthAudioPropagation.js";
import { SpatialTriggerSystem } from "./systems/SpatialTriggerSystem.js";
import { CutsceneDirector } from "./systems/CutsceneDirector.js";
import { ruleNumber } from "./systems/RuleData.js";

export const GAME_STATES = Object.freeze(
  Object.fromEntries(
    [
      "MAIN_MENU",
      "INTRO_CUTSCENE",
      "EXPLORATION",
      "DIALOGUE",
      "INSPECTION",
      "CORKBOARD",
      "LOCKPICKING",
      "CASSETTE",
      "EPILOGUE",
      "CREDITS",
    ].map((id) => [id, id]),
  ),
);
const MODES = [
  "DIALOGUE",
  "INSPECTION",
  "CORKBOARD",
  "LOCKPICKING",
  "CASSETTE",
];
const ALLOWED = Object.freeze({
  MAIN_MENU: [
    "INTRO_CUTSCENE",
    "EXPLORATION",
    "DIALOGUE",
    "EPILOGUE",
    "CREDITS",
  ],
  INTRO_CUTSCENE: ["EXPLORATION", "MAIN_MENU"],
  EXPLORATION: [...MODES, "MAIN_MENU", "EPILOGUE"],
  DIALOGUE: ["EXPLORATION", "MAIN_MENU", "EPILOGUE"],
  INSPECTION: ["EXPLORATION", "MAIN_MENU"],
  CORKBOARD: ["EXPLORATION", "MAIN_MENU"],
  LOCKPICKING: ["EXPLORATION", "MAIN_MENU"],
  CASSETTE: ["EXPLORATION", "MAIN_MENU"],
  EPILOGUE: ["CREDITS", "MAIN_MENU"],
  CREDITS: ["MAIN_MENU"],
});

export function memoryGameStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

/** Headless coordinator. DOM, drawing, projection and world collision live in adapters. */
export class GameEngine {
  constructor({
    state = createState(),
    storage = memoryGameStorage(),
    world = {},
    presentation = {},
    input = null,
    trees = [],
    requestFrame = (callback) => globalThis.requestAnimationFrame(callback),
    cancelFrame = (id) => globalThis.cancelAnimationFrame(id),
    onError = () => {},
    onStateChange = () => {},
    gameMinutesPerSecond = 2,
    systemsFactory = null,
  } = {}) {
    this.state = state;
    this.storage = storage;
    this.world = world;
    this.presentation = presentation;
    this.input = input ?? new InputManager({ target: null, storage });
    this.ownsInput = !input;
    this.trees = trees;
    this.systemsFactory = systemsFactory;
    this.requestFrame = requestFrame;
    this.cancelFrame = cancelFrame;
    this.onError = onError;
    this.onStateChange = onStateChange;
    this.gameMinutesPerSecond = ruleNumber(gameMinutesPerSecond, 0);
    this.mode = "MAIN_MENU";
    this.overlay = null;
    this.paused = false;
    this.payload = null;
    this.running = false;
    this.destroyed = false;
    this.lastTime = null;
    this.frameId = null;
    this.camera = { x: state.player.x, y: state.player.y, target: null };
    this.viewport = { width: 1440, height: 900, pixelRatio: 1 };
    this.director = new CutsceneDirector();
    this.frame = this.frame.bind(this);
    this.buildSystems();
    this.syncControls();
  }

  buildSystems() {
    const state = this.state;
    const inventory = new EvidenceInventorySystem(state);
    const campaign = new CanonicalCampaign(state);
    this.systems = {
      inventory,
      campaign,
      endings: campaign.endings,
      deductions: new DeductionEngine(state),
      routines: new NPCRoutineSystem(state, this.world.routineOptions ?? {}),
      dialogue: new DialogueTreeRunner(state, {
        trees: this.trees,
        onItemReceived: (id) => this.notify(`Prova recebida: ${id}`),
      }),
      acoustics: new StealthAudioPropagation({
        cellSize: 32,
        onSoundDetected: (entity, origin, intensity) =>
          this.world.onSoundDetected?.(entity, origin, intensity, this),
      }),
      triggers: new SpatialTriggerSystem({ zones: this.world.zones ?? [] }),
      pathfinding: this.world.pathfinding ?? null,
    };
    if (this.systemsFactory)
      Object.assign(this.systems, this.systemsFactory(state, this));
    this.systems.saves = new SaveLoadManager(state, {
      storage: this.storage,
      serialize,
      deserialize,
      validateState: (candidate) => {
        new EvidenceInventorySystem(candidate);
        new DeductionEngine(candidate);
        new NPCRoutineSystem(candidate, this.world.routineOptions ?? {});
        new DialogueTreeRunner(candidate, { trees: this.trees });
        return true;
      },
      onLoad: () => this.restoreLoadedState(),
    });
  }

  async initialize() {
    await this.world.ready;
    await this.presentation.initialize?.(this);
    await this.presentation.ready;
    this.presentation.enterState?.(this.mode, null, this);
    return this;
  }

  syncControls() {
    const enabled =
      this.mode === "EXPLORATION" &&
      !this.overlay &&
      !this.paused &&
      !this.state.ending;
    this.input.setWorldEnabled(enabled);
    if (!enabled) {
      this.state.player.vx = 0;
      this.state.player.vy = 0;
    }
  }

  transition(next, payload = null) {
    if (this.destroyed) throw new Error("Engine has been destroyed.");
    if (!Object.hasOwn(GAME_STATES, next))
      throw new RangeError("Unknown game state.");
    if (next === this.mode) return false;
    if (!ALLOWED[this.mode].includes(next))
      throw new Error(`Illegal game transition: ${this.mode} -> ${next}`);
    if (this.state.ending && next === "EXPLORATION")
      throw new Error("The ending locks world controls.");
    const previous = this.mode;
    this.closeOverlay();
    this.presentation.exitState?.(previous, this);
    if (previous === "INTRO_CUTSCENE") this.director.cancel();
    this.mode = next;
    this.payload = payload;
    this.paused = false;
    this.state.engineMode = next;
    this.input.releaseAll();
    this.syncControls();
    this.camera.target = next === "DIALOGUE" ? (payload?.npcId ?? null) : null;
    if (next === "INTRO_CUTSCENE") {
      const token = this.director.play("CUTSCENE_INTRO", {
        duration: this.presentation.introDuration ?? 26,
        onComplete: () => {
          if (this.mode !== "INTRO_CUTSCENE") return;
          this.state.introDone = true;
          this.transition("EXPLORATION");
        },
      });
      this.payload = { ...payload, token };
    }
    this.presentation.enterState?.(next, this.payload, this);
    this.onStateChange(next, previous);
    return true;
  }

  newGame() {
    if (!["MAIN_MENU", "CREDITS"].includes(this.mode))
      throw new Error("Return to the main menu before starting a new game.");
    if (this.mode !== "MAIN_MENU") this.transition("MAIN_MENU");
    this.director.cancel();
    for (const key of Object.keys(this.state)) delete this.state[key];
    Object.assign(this.state, createState());
    this.buildSystems();
    this.world.reset?.(this.state, this);
    this.camera.x = this.state.player.x;
    this.camera.y = this.state.player.y;
    this.transition("INTRO_CUTSCENE");
  }

  restoreLoadedState() {
    // Close old sessions before rebinding save-backed systems to the restored root.
    if (this.mode !== "MAIN_MENU") this.transition("MAIN_MENU");
    this.buildSystems();
    this.world.reset?.(this.state, this);
    this.camera.x = this.state.player.x;
    this.camera.y = this.state.player.y;
    if (this.state.ending) this.transition("EPILOGUE", this.state.ending);
    else if (this.state.dialogueState?.active)
      this.transition("DIALOGUE", {
        treeId: this.state.dialogueState.active.treeId,
        npcId: this.systems.dialogue.getCurrentNode()?.speakerId ?? null,
        resumed: true,
      });
    else
      this.transition(this.state.introDone ? "EXPLORATION" : "INTRO_CUTSCENE");
  }

  saveGame(slot = 1) {
    return this.systems.saves.saveGame(slot);
  }
  loadGame(slot = 1) {
    return this.systems.saves.loadGame(slot);
  }
  notify(message) {
    this.presentation.notify?.(message);
  }
  reportError(error) {
    this.notify(error.message);
    this.onError(error);
  }

  openOverlay(name) {
    if (!["journal", "map"].includes(name))
      throw new RangeError("Unknown overlay.");
    if (this.mode !== "EXPLORATION" || this.paused) return false;
    if (this.overlay === name) {
      this.closeOverlay();
      return true;
    }
    this.closeOverlay();
    this.overlay = name;
    this.input.releaseAll();
    this.syncControls();
    this.presentation.openOverlay?.(name, this);
    return true;
  }
  closeOverlay() {
    if (!this.overlay) return false;
    const name = this.overlay;
    this.overlay = null;
    this.presentation.closeOverlay?.(name, this);
    this.input.releaseAll();
    this.syncControls();
    return true;
  }
  setPaused(value) {
    if (this.mode === "MAIN_MENU" || this.mode === "CREDITS") return false;
    this.paused = Boolean(value);
    this.input.releaseAll();
    this.lastTime = null;
    this.syncControls();
    this.presentation.setPaused?.(this.paused, this);
    this.onStateChange(this.mode, this.mode);
    return true;
  }
  closeMode() {
    if (this.closeOverlay()) return true;
    if (MODES.includes(this.mode)) {
      if (this.mode === "DIALOGUE") this.state.dialogueState.active = null;
      this.transition("EXPLORATION");
      return true;
    }
    return false;
  }

  handleKey(event) {
    if (event.repeat) return false;
    const code = event.code,
      key = event.key;
    if (code === "Escape") {
      if (this.closeMode()) return true;
      if (this.mode === "CREDITS")
        return this.presentation.handleKey?.(event, this) ?? false;
      if (this.mode === "MAIN_MENU") return false;
      this.setPaused(!this.paused);
      return true;
    }
    if (this.paused) return true;
    if (code === "Tab" || this.input.isActionJustPressed("INSPECT_NOTEBOOK"))
      return this.openOverlay("journal");
    if (code === "KeyM") return this.openOverlay("map");
    if (this.input.isActionJustPressed("CORKBOARD")) {
      if (this.mode === "CORKBOARD") {
        this.closeMode();
        return true;
      }
      if (this.mode === "EXPLORATION") {
        this.transition("CORKBOARD");
        return true;
      }
    }
    if (this.mode === "INTRO_CUTSCENE" && ["Space", "Enter"].includes(code)) {
      this.director.skip();
      return true;
    }
    if (this.mode === "EXPLORATION" && code === "KeyT")
      this.presentation.checkWatch?.();
    return (
      this.presentation.handleKey?.(
        { ...event, key, code, type: "keydown" },
        this,
      ) ?? false
    );
  }

  startDialogue(treeId, npcId = null) {
    if (this.mode !== "EXPLORATION" || this.overlay || this.paused)
      return false;
    if (!this.systems.dialogue.start(treeId)) return false;
    this.transition("DIALOGUE", { treeId, npcId });
    return true;
  }
  chooseDialogue(choiceId) {
    if (this.mode !== "DIALOGUE" || this.paused) return false;
    if (!this.systems.dialogue.choose(choiceId)) return false;
    this.world.onDialogueChoice?.(choiceId, this.payload?.npcId, this);
    this.refreshDialogue();
    return true;
  }
  act(action) {
    if (this.mode !== "EXPLORATION" || this.overlay || this.paused)
      return { ok: false, message: "Feche os painéis antes de decidir." };
    const result = this.systems.campaign.act(action);
    if (result.ending) this.transition("EPILOGUE", result.ending);
    this.safeAutosave();
    return result;
  }
  advanceDialogue() {
    if (this.mode !== "DIALOGUE" || this.paused) return false;
    if (!this.systems.dialogue.advance()) return false;
    this.refreshDialogue();
    return true;
  }
  refreshDialogue() {
    const node = this.systems.dialogue.getCurrentNode();
    if (!node) this.transition("EXPLORATION");
    else this.presentation.showDialogue?.(node, this);
  }
  connectClues(a, b) {
    if (this.mode !== "CORKBOARD" || this.paused) return false;
    for (const id of [a, b])
      if (this.state.evidence.includes(id))
        this.systems.deductions.registerNode?.(id);
    const id = this.systems.deductions.connectNodes(a, b);
    const valid = this.systems.deductions.validateConnection(id);
    this.systems.campaign.sync();
    return valid;
  }
  inspect(data) {
    if (this.mode !== "EXPLORATION") return false;
    this.transition("INSPECTION", data);
    return true;
  }
  playCassette(itemId, data = {}) {
    if (this.mode !== "EXPLORATION" || !this.systems.inventory.hasItem(itemId))
      return false;
    this.transition("CASSETTE", { itemId, ...data });
    return true;
  }
  startLockpicking(door, toolId = "Gazua de Aço") {
    if (this.mode !== "EXPLORATION" || !this.systems.inventory.hasItem(toolId))
      return false;
    if (!this.state.itemRecords[toolId])
      this.state.itemRecords[toolId] = {
        id: toolId,
        type: "tool",
        durability: 100,
        maxDurability: 100,
        metadata: {},
      };
    const tool = this.systems.inventory.getItem(toolId);
    if (tool.type !== "tool" || !tool.durability) return false;
    const hash = [...door.id].reduce(
      (sum, char) => sum + char.charCodeAt(0),
      0,
    );
    this.transition("LOCKPICKING", {
      door,
      toolId,
      targetAngle: (hash % 121) - 60,
      pickAngle: 0,
      plugAngle: 0,
      pickHealth: tool.durability,
      maxHealth: tool.maxDurability,
    });
    return true;
  }
  updateLockpick(dt) {
    const p = this.payload,
      held = this.input.held;
    p.pickAngle = Math.max(
      -90,
      Math.min(
        90,
        p.pickAngle +
          ((held.has("KeyD") || held.has("ArrowRight") ? 1 : 0) -
            (held.has("KeyA") || held.has("ArrowLeft") ? 1 : 0)) *
            70 *
            dt,
      ),
    );
    p.tension = held.has("Space") ? 1 : 0;
    p.isStressing = Boolean(
      p.tension && Math.abs(p.pickAngle - p.targetAngle) > 12,
    );
    p.stressLevel = p.isStressing ? 1 : 0;
    if (p.isStressing && dt > 0)
      this.systems.inventory.useTool(p.toolId, 22 * dt);
    if (p.tension && !p.isStressing)
      p.plugAngle = Math.min(90, p.plugAngle + 65 * dt);
    else p.plugAngle = Math.max(0, p.plugAngle - 30 * dt);
    p.pickHealth = this.systems.inventory.getItem(p.toolId).durability;
    p.isBroken = p.pickHealth === 0;
    p.isUnlocked = p.plugAngle >= 90;
    this.presentation.setLockpickState?.(p);
    if (p.isUnlocked) {
      this.world.unlockDoor?.(p.door, this);
      this.closeMode();
    } else if (p.isBroken) {
      this.notify("A gazua quebrou.");
      this.closeMode();
    }
  }

  update(dt) {
    ruleNumber(dt, 0);
    dt = Math.min(dt, 0.1);
    try {
      if (!this.paused) {
        if (
          this.state.ending &&
          ["EXPLORATION", "DIALOGUE"].includes(this.mode)
        )
          this.transition("EPILOGUE", this.state.ending);
        if (this.mode === "INTRO_CUTSCENE") this.director.update(dt);
        else if (this.mode === "LOCKPICKING") this.updateLockpick(dt);
        else if (
          this.mode === "EXPLORATION" &&
          !this.overlay &&
          !this.state.ending
        ) {
          this.state.minute += dt * this.gameMinutesPerSecond;
          while (this.state.minute >= 1440) {
            this.state.minute -= 1440;
            this.state.day++;
          }
          // Substeps bound physical displacement even for the maximum allowed RAF delta.
          const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
          for (let i = 0; i < steps; i++)
            this.world.movePlayer?.(dt / steps, this);
          this.world.update?.(dt, this);
          if (
            this.mode === "EXPLORATION" &&
            this.input.isActionJustPressed("INTERACT")
          )
            this.world.interact?.(this);
          this.systems.triggers.update(this.state.player, dt);
          this.systems.campaign.sync();
          const ending = this.systems.endings.evaluateEnding();
          if (ending && ["EXPLORATION", "DIALOGUE"].includes(this.mode)) {
            const result = this.systems.endings.lockEnding(ending.endingId);
            this.transition("EPILOGUE", result);
            this.safeAutosave();
          }
        }
        this.presentation.update?.(dt, this);
      }
    } finally {
      this.input.resetFrameStates();
    }
  }

  safeAutosave() {
    try {
      this.saveGame("autosave");
    } catch (error) {
      this.reportError(error);
    }
  }
  areaChanged(areaId) {
    this.input.releaseAll();
    try {
      this.systems.saves.onAreaTransition(areaId);
    } catch (error) {
      this.reportError(error);
    }
  }
  render() {
    const frame = {
      engine: this,
      state: this.state,
      mode: this.mode,
      overlay: this.overlay,
      paused: this.paused,
      camera: this.camera,
      viewport: this.viewport,
    };
    this.presentation.beginFrame?.(frame);
    if (
      !["MAIN_MENU", "INTRO_CUTSCENE", "EPILOGUE", "CREDITS"].includes(
        this.mode,
      )
    ) {
      this.presentation.renderGround?.(frame);
      this.presentation.renderEntities?.(frame);
      this.presentation.renderRoofs?.(frame);
      this.presentation.renderWeatherLighting?.(frame);
    }
    this.presentation.renderUI?.(frame);
    this.presentation.renderModal?.(frame);
    this.presentation.endFrame?.(frame);
  }
  resize(width, height, pixelRatio = 1) {
    ruleNumber(width, 1);
    ruleNumber(height, 1);
    ruleNumber(pixelRatio, Number.MIN_VALUE);
    this.viewport = { width, height, pixelRatio };
    this.presentation.resize?.(this.viewport);
  }
  start() {
    if (this.destroyed) throw new Error("Engine has been destroyed.");
    if (this.running) return;
    this.running = true;
    this.lastTime = null;
    this.frameId = this.requestFrame(this.frame);
  }
  frame(timestamp) {
    if (!this.running) return;
    this.frameId = null;
    try {
      ruleNumber(timestamp, 0);
      const dt =
        this.lastTime === null
          ? 0
          : Math.min(Math.max(0, (timestamp - this.lastTime) / 1000), 0.1);
      this.lastTime = timestamp;
      this.update(dt);
      this.render();
    } catch (error) {
      this.stop();
      this.reportError(error);
      return;
    }
    if (this.running) this.frameId = this.requestFrame(this.frame);
  }
  stop() {
    this.running = false;
    if (this.frameId !== null) this.cancelFrame(this.frameId);
    this.frameId = null;
    this.lastTime = null;
    this.input.releaseAll();
  }
  suspend() {
    this.input.releaseAll();
    this.lastTime = null;
    if (this.mode !== "MAIN_MENU") this.setPaused(true);
  }
  destroy() {
    if (this.destroyed) return;
    this.stop();
    this.director.cancel();
    this.presentation.destroy?.();
    this.world.destroy?.();
    if (this.ownsInput) this.input.destroy();
    this.destroyed = true;
  }
}
