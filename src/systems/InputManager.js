/** Actions shared by keyboard, mouse, UI and a desktop host. */
export const DEFAULT_BINDINGS = Object.freeze({
  MOVE_UP: { primary: "KeyW", secondary: "ArrowUp" },
  MOVE_DOWN: { primary: "KeyS", secondary: "ArrowDown" },
  MOVE_LEFT: { primary: "KeyA", secondary: "ArrowLeft" },
  MOVE_RIGHT: { primary: "KeyD", secondary: "ArrowRight" },
  INTERACT: { primary: "KeyE", secondary: "Mouse0" },
  INSPECT_NOTEBOOK: { primary: "KeyJ", secondary: null },
  CORKBOARD: { primary: "KeyC", secondary: null },
  LIGHTER: { primary: "KeyL", secondary: null },
  CHECK_WATCH: { primary: "KeyT", secondary: null },
  DIALOGUE_ADVANCE: { primary: "Space", secondary: "Enter" },
  CHOICE_1: { primary: "Digit1", secondary: null },
  CHOICE_2: { primary: "Digit2", secondary: null },
  CHOICE_3: { primary: "Digit3", secondary: null },
  PAUSE_MENU: { primary: "Escape", secondary: null },
});
for (const binding of Object.values(DEFAULT_BINDINGS)) Object.freeze(binding);
const CODE =
  /^(Key[A-Z]|Digit[0-9]|Arrow(Up|Down|Left|Right)|F([1-9]|1[0-9]|2[0-4])|Numpad[A-Za-z0-9]+|(?:Shift|Control|Alt|Meta)(Left|Right)|Space|Enter|Escape|Tab|Backspace|Delete|Insert|Home|End|PageUp|PageDown|CapsLock|Backquote|Minus|Equal|BracketLeft|BracketRight|Backslash|Semicolon|Quote|Comma|Period|Slash|IntlBackslash|Mouse[0-2])$/;
const WORLD = new Set([
  "MOVE_UP",
  "MOVE_DOWN",
  "MOVE_LEFT",
  "MOVE_RIGHT",
  "INTERACT",
  "LIGHTER",
]);
/** No renderer dependency. The host owns resetFrameStates() at the end of its frame. */
export class InputManager {
  /** @param {{target?:EventTarget|null,storage?:Storage|null,onAction?:Function,filterEvent?:Function}} [options] */
  constructor({
    target = globalThis.window ?? null,
    storage,
    onAction = () => {},
    filterEvent = () => true,
  } = {}) {
    this.target = target;
    this.onAction = onAction;
    this.filterEvent = filterEvent;
    this.held = new Set();
    this.pressed = new Set();
    this.worldEnabled = true;
    this.listeners = [];
    this.storageError = null;
    if (storage === undefined) {
      try {
        storage = globalThis.localStorage;
      } catch {
        storage = null;
      }
    }
    this.storage = storage;
    this.bindings = structuredClone(DEFAULT_BINDINGS);
    this.load();
    this.listen("keydown", (e) => this.down(e.code, e));
    this.listen("keyup", (e) => this.held.delete(e.code));
    this.listen("pointerdown", (e) => {
      if (e.button >= 0 && e.button <= 2) this.down("Mouse" + e.button, e);
    });
    this.listen("pointerup", (e) => this.held.delete("Mouse" + e.button));
    this.listen("pointercancel", () => this.releaseAll());
    this.listen("blur", () => this.releaseAll());
    this.listen("contextmenu", (e) => {
      if (
        this.filterEvent(e) &&
        Object.values(this.bindings).some(
          (b) => b.primary === "Mouse2" || b.secondary === "Mouse2",
        )
      )
        e.preventDefault();
    });
  }
  /** @param {string} type @param {EventListener} handler @returns {void} */
  listen(type, handler) {
    this.target?.addEventListener(type, handler);
    this.listeners.push([type, handler]);
  }
  /** @param {string} action @returns {{primary:string,secondary:string|null}} */
  binding(action) {
    if (!Object.hasOwn(this.bindings, action))
      throw new RangeError("Ação desconhecida: " + action);
    return this.bindings[action];
  }
  /** Handle a physical press once, ignoring autorepeat and editable controls. @param {string} code @param {Event} event @returns {void} */
  down(code, event) {
    if (
      !CODE.test(code || "") ||
      !this.filterEvent(event) ||
      (event.target?.closest?.(
        "input,select,textarea,[contenteditable=true]",
      ) &&
        code !== "Escape")
    )
      return;
    if (this.held.has(code)) return;
    this.held.add(code);
    for (const [action, binding] of Object.entries(this.bindings))
      if (binding.primary === code || binding.secondary === code) {
        if (!this.worldEnabled && WORLD.has(action)) continue;
        this.pressed.add(action);
        event.preventDefault?.();
        this.onAction(action, event);
      }
  }
  /** Clear duplicate bindings atomically; Escape is permanently reserved. Empty primary means unbound. @param {string} actionName @param {'primary'|'secondary'} slot @param {string|null} newCode @returns {object} */
  rebind(actionName, slot, newCode) {
    this.binding(actionName);
    if (!["primary", "secondary"].includes(slot))
      throw new RangeError("Slot inválido.");
    if (
      newCode !== null &&
      newCode !== "" &&
      (typeof newCode !== "string" || !CODE.test(newCode))
    )
      throw new TypeError("Código de entrada inválido.");
    if (actionName === "PAUSE_MENU" || newCode === "Escape")
      throw new Error("Escape é reservado para PAUSE_MENU.");
    for (const [action, binding] of Object.entries(this.bindings))
      for (const key of ["primary", "secondary"])
        if (newCode && binding[key] === newCode)
          binding[key] = key === "primary" ? "" : null;
    this.bindings[actionName][slot] =
      newCode || (slot === "primary" ? "" : null);
    this.pressed.clear();
    this.persist();
    return this.bindings[actionName];
  }
  /** @param {string} action @returns {boolean} */
  isActionDown(action) {
    const b = this.binding(action);
    return (
      (this.worldEnabled || !WORLD.has(action)) &&
      ((!!b.primary && this.held.has(b.primary)) ||
        (!!b.secondary && this.held.has(b.secondary)))
    );
  }
  /** @param {string} action @returns {boolean} */
  isActionJustPressed(action) {
    this.binding(action);
    return (
      (this.worldEnabled || !WORLD.has(action)) && this.pressed.has(action)
    );
  }
  /** @returns {void} */
  resetFrameStates() {
    this.pressed.clear();
  }
  /** @returns {void} */
  releaseAll() {
    this.held.clear();
    this.pressed.clear();
  }
  /** World locks still permit menu, notebook and dialogue input. @param {boolean} enabled @returns {void} */
  setWorldEnabled(enabled) {
    this.worldEnabled = Boolean(enabled);
    this.releaseAll();
  }
  /** @returns {void} */
  persist() {
    try {
      this.storage?.setItem("northvale_keymap", JSON.stringify(this.bindings));
      this.storageError = null;
    } catch (error) {
      this.storageError = error;
    }
  }
  /** Invalid/truncated maps fall back to defaults. Escape is never restored from disk. @returns {void} */
  load() {
    try {
      const data = JSON.parse(
        this.storage?.getItem("northvale_keymap") || "null",
      );
      if (!data || typeof data !== "object") return;
      const next = structuredClone(DEFAULT_BINDINGS),
        used = new Set(["Escape"]);
      for (const action of Object.keys(next)) {
        if (action === "PAUSE_MENU") continue;
        const entry = data[action] ?? next[action];
        if (!entry || typeof entry !== "object")
          throw new Error("Mapa inválido.");
        for (const slot of ["primary", "secondary"]) {
          const code = entry[slot];
          if (
            code !== null &&
            code !== "" &&
            (typeof code !== "string" || !CODE.test(code) || code === "Escape")
          )
            throw new Error("Mapa inválido.");
          next[action][slot] =
            code && !used.has(code) ? code : slot === "primary" ? "" : null;
          if (next[action][slot]) used.add(code);
        }
      }
      this.bindings = next;
    } catch {
      /* Keep complete defaults on damaged storage. */
    }
  }

  /** Remove all listeners when changing scenes or destroying the application. @returns {void} */
  destroy() {
    for (const [type, handler] of this.listeners)
      this.target?.removeEventListener(type, handler);
    this.listeners.length = 0;
    this.releaseAll();
  }
}
