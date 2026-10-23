import { GameEngine, memoryGameStorage } from "./GameEngine.js";
import {
  NorthValeWorld,
  createTownDialogues,
} from "./engine/NorthValeWorld.js";
import { GeminiPresentation } from "./engine/GeminiPresentation.js";
import { InputManager } from "./systems/InputManager.js";

export const LANGUAGE_CODES = Object.freeze({
  "PT-BR": "pt-BR",
  EN: "en",
  ES: "es",
  DE: "de",
});

/** Fixed logical viewport, letterboxed CSS and a backing store adapted to size/DPR. */
export function fitGameViewport(width, height, dpr = 1) {
  if (
    ![width, height, dpr].every((value) => Number.isFinite(value) && value > 0)
  )
    throw new RangeError("Invalid viewport.");
  const scale = Math.min(width / 1440, height / 900);
  return {
    width: 1440,
    height: 900,
    cssWidth: 1440 * scale,
    cssHeight: 900 * scale,
    pixelRatio: Math.min(2, scale * dpr),
  };
}

/** Owns browser resources; destroy removes every listener and stops the single RAF. */
export async function bootstrapNorthVale({
  document: doc = globalThis.document,
  window: win = globalThis.window,
  storage: providedStorage,
} = {}) {
  const canvas = doc.querySelector("#gameCanvas");
  if (!canvas) throw new Error("Canvas #gameCanvas não encontrado.");
  if (
    win.northvale?.presentation.canvas === canvas &&
    !win.northvale.engine.destroyed
  )
    return win.northvale;
  let bootReady = false;
  const controls = [
    ...doc.querySelectorAll(
      "#engine-toolbar button, #engine-toolbar select, #engine-decisions button, #engine-decisions select",
    ),
  ];
  controls.forEach((control) => {
    control.disabled = true;
  });
  const errorBox = doc.querySelector("#engine-error"),
    modeLabel = doc.querySelector("#engine-state");
  let storage = providedStorage,
    ephemeral = false;
  if (!storage) {
    try {
      storage = win.localStorage;
    } catch {
      storage = memoryGameStorage();
      ephemeral = true;
    }
  }
  let language = "PT-BR";
  try {
    const saved = storage.getItem("northvale_lang");
    if (Object.hasOwn(LANGUAGE_CODES, saved)) language = saved;
  } catch {
    storage = memoryGameStorage();
    ephemeral = true;
  }
  const world = new NorthValeWorld();
  const presentation = new GeminiPresentation(canvas, world, {
    language,
    onPause: (value) => {
      const panel = doc.querySelector("#pause-menu");
      if (panel) panel.hidden = !value;
    },
  });
  const input = new InputManager({ target: null, storage });
  const listeners = [];
  const listen = (target, type, handler, options) => {
    target?.addEventListener(type, handler, options);
    listeners.push(() => target?.removeEventListener(type, handler, options));
  };
  const showError = (error) => {
    if (errorBox) {
      errorBox.textContent = error.message;
      errorBox.hidden = false;
    }
  };
  let engine;
  const syncUI = () => {
    if (!engine) return;
    if (modeLabel)
      modeLabel.textContent = engine.paused ? "PAUSADO" : engine.mode;
    if (Object.hasOwn(LANGUAGE_CODES, presentation.menu.currentLang))
      doc.documentElement.lang = LANGUAGE_CODES[presentation.menu.currentLang];
    if (doc.querySelector("#begin"))
      doc.querySelector("#begin").hidden = engine.mode !== "MAIN_MENU";
    const select = doc.querySelector("#language");
    if (select) select.value = presentation.menu.currentLang;
  };
  engine = new GameEngine({
    storage,
    world,
    presentation,
    input,
    trees: createTownDialogues(),
    requestFrame: (callback) => win.requestAnimationFrame(callback),
    cancelFrame: (id) => win.cancelAnimationFrame(id),
    onError: showError,
    onStateChange: syncUI,
  });
  const guarded =
    (fn) =>
    (...args) => {
      if (!bootReady) return;
      try {
        return fn(...args);
      } catch (error) {
        engine.reportError(error);
      }
    };
  const setLanguage = (value) => {
    if (!Object.hasOwn(LANGUAGE_CODES, value)) return;
    presentation.setLanguage(value);
    doc.documentElement.lang = LANGUAGE_CODES[value];
    try {
      storage.setItem("northvale_lang", value);
    } catch (error) {
      showError(error);
    }
    syncUI();
  };
  const resize = () => {
    const viewport = fitGameViewport(
      win.innerWidth,
      win.innerHeight,
      win.devicePixelRatio || 1,
    );
    canvas.style.width = `${viewport.cssWidth}px`;
    canvas.style.height = `${viewport.cssHeight}px`;
    engine.resize(viewport.width, viewport.height, viewport.pixelRatio);
  };
  const pointer = (event) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) * engine.viewport.width) / rect.width,
      y: ((event.clientY - rect.top) * engine.viewport.height) / rect.height,
    };
  };
  listen(
    win,
    "keydown",
    guarded((event) => {
      if (
        event.target?.closest?.(
          "input,select,textarea,button,[contenteditable=true]",
        ) &&
        event.code !== "Escape"
      )
        return;
      input.down(event.code, event);
      if (engine.handleKey(event)) event.preventDefault();
      syncUI();
    }),
  );
  listen(win, "keyup", (event) => input.held.delete(event.code));
  listen(win, "blur", () => engine.suspend());
  listen(doc, "visibilitychange", () => {
    if (doc.hidden) engine.suspend();
    else engine.lastTime = null;
  });
  listen(win, "resize", resize);
  for (const [domType, type] of [
    ["pointermove", "move"],
    ["pointerdown", "down"],
    ["pointerup", "up"],
    ["click", "click"],
  ])
    listen(
      canvas,
      domType,
      guarded((event) => {
        if (
          event.button !== undefined &&
          event.button !== 0 &&
          domType !== "pointermove"
        )
          return;
        const p = pointer(event);
        if (type === "down") {
          canvas.focus();
          canvas.setPointerCapture?.(event.pointerId);
        }
        presentation.pointer(type, p.x, p.y, engine);
        syncUI();
      }),
    );
  listen(
    canvas,
    "wheel",
    guarded((event) => {
      if (presentation.handleWheel(event, engine)) event.preventDefault();
    }),
    { passive: false },
  );
  listen(canvas, "pointercancel", () => {
    presentation.board.isConnecting = false;
    presentation.board.dragStartNode = null;
    input.releaseAll();
  });
  listen(doc.querySelector("#language"), "change", (event) =>
    setLanguage(event.target.value),
  );
  listen(win, "storage", (event) => {
    if (
      event.key === "northvale_lang" &&
      Object.hasOwn(LANGUAGE_CODES, event.newValue)
    ) {
      presentation.setLanguage(event.newValue);
      doc.documentElement.lang = LANGUAGE_CODES[event.newValue];
      syncUI();
    }
  });
  const click = (selector, fn) =>
    listen(
      doc.querySelector(selector),
      "click",
      guarded(() => {
        fn();
        canvas.focus();
        syncUI();
      }),
    );
  const selectedSlot = () =>
    Number(doc.querySelector("#save-slot")?.value ?? 1);
  click("#begin", () => {
    engine.newGame();
    canvas.focus();
  });
  click("#save", () => {
    engine.saveGame(selectedSlot());
    engine.notify("Partida salva.");
  });
  click("#load", () => {
    engine.loadGame(selectedSlot());
    canvas.focus();
  });
  click("#journal-button", () => engine.openOverlay("journal"));
  click("#map-button", () => engine.openOverlay("map"));
  click("#board-button", () => {
    if (engine.mode === "CORKBOARD") engine.closeMode();
    else if (engine.mode === "EXPLORATION") engine.transition("CORKBOARD");
  });
  click("#pause-button", () => engine.setPaused(!engine.paused));
  click("#resume-button", () => {
    engine.setPaused(false);
    canvas.focus();
  });
  click("#menu-button", () => engine.transition("MAIN_MENU"));
  click("#cassette-button", () => {
    if (!engine.playCassette("tape"))
      engine.notify("Recolha a fita K7 antes de reproduzi-la.");
  });
  click("#decision-button", () => {
    if (engine.mode !== "EXPLORATION" || engine.paused || engine.overlay)
      return;
    const action = doc.querySelector("#campaign-action").value;
    const result = engine.act(action);
    engine.notify(result.message ?? "Decisão registrada.");
  });
  try {
    resize();
    await engine.initialize();
    if (
      win.northvale?.presentation.canvas === canvas &&
      !win.northvale.engine.destroyed
    ) {
      engine.destroy();
      input.destroy();
      listeners.forEach((remove) => remove());
      return win.northvale;
    }
    bootReady = true;
    controls.forEach((control) => {
      control.disabled = false;
    });
    setLanguage(language);
    syncUI();
    if (globalThis.NORTHVALE_OFFLINE)
      doc.querySelectorAll("[data-online-only]").forEach((element) => {
        element.hidden = true;
      });
    if (ephemeral)
      engine.notify(
        "Armazenamento indisponível: esta sessão usa memória temporária.",
      );
    engine.start();
  } catch (error) {
    engine.destroy();
    input.destroy();
    listeners.forEach((remove) => remove());
    throw error;
  }
  const app = {
    engine,
    world,
    presentation,
    setLanguage,
    destroy() {
      engine.destroy();
      input.destroy();
      listeners.splice(0).forEach((remove) => remove());
      if (win.northvale === app) delete win.northvale;
    },
  };
  listen(win, "pagehide", (event) => {
    if (event.persisted) engine.suspend();
    else app.destroy();
  });
  listen(win, "pageshow", (event) => {
    if (event.persisted) {
      engine.lastTime = null;
      syncUI();
    }
  });
  win.northvale = app;
  return app;
}

if (typeof document !== "undefined" && document.querySelector("#gameCanvas"))
  bootstrapNorthVale().catch((error) => {
    const target = document.querySelector("#engine-error");
    if (target) {
      target.hidden = false;
      target.textContent = `Não foi possível iniciar NorthVale: ${error.message}`;
    }
  });
