import { MainMenuUI } from "../visuals/MainMenuUI.js";
import { IsometricWorldRenderer } from "../visuals/IsometricWorldRenderer.js";
import { WeatherEffects } from "../visuals/WeatherEffects.js";
import { WaterReflectionFX } from "../visuals/WaterReflectionFX.js";
import { HUDSystem } from "../visuals/HUDSystem.js";
import { DialogueUI } from "../visuals/DialogueUI.js";
import { IntroCutsceneView } from "../visuals/IntroCutsceneView.js";
import { CorkboardView } from "../visuals/CorkboardView.js";
import { TownMapView } from "../visuals/TownMapView.js";
import { DocumentViewer } from "../visuals/DocumentViewer.js";
import { SceneInspectView } from "../visuals/SceneInspectView.js";
import { CassettePlayerView } from "../visuals/CassettePlayerView.js";
import { LockpickView } from "../visuals/LockpickView.js";
import { EpilogueView } from "../visuals/EpilogueView.js";
import { CreditsView } from "../visuals/CreditsView.js";
import { ParanoiaFX } from "../visuals/ParanoiaFX.js";
import { RetroAudioSynthesizer } from "../visuals/RetroAudioSynthesizer.js";
import { PortraitRenderer } from "../visuals/PortraitRenderer.js";
import { InteriorLighting } from "../graphics/lighting.js";
import { DetectiveJournal } from "../ui/DetectiveJournal.js";
import { Renderer } from "../render.js";
import { WORLD, buildings } from "../world.js";
import { getFullCluesRegistry } from "../state.js";
import { ENDING_DESCRIPTIONS } from "../systems/EndingManager.js";
import {
  HUMAN_DIMENSIONS,
  HUMAN_HEIGHT_WORLD,
  pointToMeters,
} from "./WorldMetrics.js";
import { visibleWorldSector } from "./WorldEntities.js";

/** Translation layer for the actual Gemini signatures; GameEngine never draws. */
export class GeminiPresentation {
  constructor(canvas, world, { language = "PT-BR", onPause = () => {} } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.world = world;
    if (!this.ctx) throw new Error("Canvas 2D não está disponível.");
    this.menu = new MainMenuUI();
    this.menu.setLanguage(language);
    this.worldView = new IsometricWorldRenderer(canvas);
    this.worldView.init();
    this.weather = new WeatherEffects({ maxRainDrops: 300 });
    this.water = new WaterReflectionFX();
    this.hud = new HUDSystem();
    this.dialogue = new DialogueUI();
    this.intro = new IntroCutsceneView();
    this.board = new CorkboardView();
    this.map = new TownMapView(canvas);
    this.document = new DocumentViewer();
    this.scene = new SceneInspectView(canvas);
    this.lockpick = new LockpickView();
    this.journal = new DetectiveJournal();
    this.synth = new RetroAudioSynthesizer();
    this.cassette = new CassettePlayerView(canvas, this.synth);
    this.portraits = new Map();
    this.streetLighting = new InteriorLighting();
    this.streetLighting.lights = buildings.map((b) => ({
      x: b.x + b.w + 20,
      y: b.y + b.h + 20,
      color: b.kind === "industrial" ? "#9bb9ae" : "#e5ba68",
      radius: 220,
    }));
    this.epilogue = new EpilogueView();
    this.credits = new CreditsView(canvas);
    this.paranoia = new ParanoiaFX(canvas);
    this.interiorRenderer = new Renderer(canvas, {
      manageResize: false,
      interiors: world.interiors,
    });
    this.ready = Promise.all([
      world.ready,
      this.interiorRenderer.townActors.ready,
    ]);
    this.introDuration = this.intro.duration;
    this.onPause = onPause;
    this.closing = false;
    this.camera = { x: 0, y: 0 };
    this.time = 0;
    this.boardNodes = [];
    this.transitionTime = 0;
    this.lastInterior = null;
    this.snapshot = document.createElement("canvas");
    this.captureScene = false;
    this.tiles = [];
    for (let gy = 0; gy < Math.ceil(WORLD.height / 32); gy++)
      for (let gx = 0; gx < Math.ceil(WORLD.width / 32); gx++) {
        const x = gx * 32,
          y = gy * 32,
          road = (x > 880 && x < 1020) || (y > 740 && y < 880);
        this.tiles.push({
          gx,
          gy,
          type: road ? "asphalt" : "sidewalk",
          roadStripe: road && (gx === 29 || gy === 25) ? "dashed" : null,
        });
      }
    // A reusable queue interleaves Gemini walls/props and painted actors by foot depth.
    this.entities = [];
  }
  initialize(engine) {
    this.engine = engine;
    this.menu.init(
      this.canvas,
      () => engine.newGame(),
      () => {
        const slots = engine.systems.saves
          .getSavedSlotsInfo()
          .filter((slot) => slot.status === "saved")
          .sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt));
        engine.loadGame(slots[0]?.slotId ?? 1);
      },
      () => engine.notify("Idioma: use o seletor no canto da tela."),
      () => engine.transition("CREDITS"),
    );
    this.map.onClose = () => engine.closeOverlay();
    this.board.onConnectClues = (a, b) => {
      try {
        engine.notify(
          engine.connectClues(a.id, b.id)
            ? "Ligação comprovada."
            : "A hipótese aumentou a paranoia.",
        );
      } catch (error) {
        engine.reportError(error);
      }
    };
    this.world.reset(engine.state, engine);
  }
  setLanguage(language) {
    this.menu.setLanguage(language);
  }
  notify(text) {
    this.hud.addNotification("NORTHVALE", text);
  }
  checkWatch() {
    this.hud.checkWatch();
  }
  setPaused(paused) {
    this.onPause(paused);
    if (paused) this.synth.stopAtmosphere();
  }
  documentData(title, text) {
    return {
      front: { title, body: text, text },
      back: {
        notes:
          "Compare pistas no quadro de cortiça. Investigue os locais e confronte os depoimentos.",
      },
    };
  }
  enterState(mode, payload, engine) {
    if (mode === "MAIN_MENU") {
      this.menu.isActive = true;
      this.onPause(false);
    }
    if (mode === "INTRO_CUTSCENE")
      this.intro.start(() => engine.director.complete(payload.token));
    if (mode === "DIALOGUE") engine.refreshDialogue();
    if (mode === "INSPECTION") {
      if (payload.type === "scene")
        this.scene.open(
          payload.data,
          (hotspot) => {
            const item = hotspot.itemData ?? {
              id: hotspot.itemId ?? hotspot.id,
              type: "evidence",
              metadata: {
                source: engine.state.interior ?? "town",
                label: hotspot.label ?? hotspot.id,
              },
            };
            if (engine.systems.inventory.addItem(item)) {
              engine.systems.campaign.sync();
              engine.safeAutosave();
              this.notify(`Item recolhido: ${hotspot.label ?? item.id}`);
            }
          },
          () => {
            if (!this.closing) engine.closeMode();
          },
        );
      else
        this.document.open(
          payload.front
            ? payload
            : this.documentData(
                payload.title ?? "Documento",
                payload.text ?? "",
              ),
          () => {
            if (!this.closing) engine.closeMode();
          },
        );
    }
    if (mode === "CORKBOARD") this.refreshBoard(engine);
    if (mode === "CASSETTE") {
      this.cassette.open(
        {
          title: payload.title ?? "Fita recolhida",
          transcription: payload.transcription ?? [
            {
              time: 0,
              text:
                getFullCluesRegistry(engine.state)[payload.itemId]?.text ??
                "Ruído de fita magnética.",
            },
          ],
        },
        () => {
          if (!this.closing) engine.closeMode();
        },
      );
      this.cassette.tapePosition = 0;
      this.cassette.counter = 0;
    }
    if (mode === "LOCKPICKING") {
      this.lockpick.isUnlocked = false;
      this.lockpick.isBroken = false;
      this.lockpick.maxHealth = payload.maxHealth;
      this.setLockpickState(payload);
    }
    if (mode === "EPILOGUE")
      this.epilogue.show(
        {
          endingId: `FINAL ${String(payload.endingId).padStart(2, "0")}: ${payload.title}`,
          headline: payload.title,
          verdictText: ENDING_DESCRIPTIONS[payload.endingId - 1],
        },
        () => {
          if (!this.closing) engine.transition("CREDITS");
        },
      );
    if (mode === "CREDITS")
      this.credits.start(() => {
        if (!this.closing && engine.mode === "CREDITS")
          engine.transition("MAIN_MENU");
      });
  }
  exitState(mode) {
    this.closing = true;
    try {
      this.menu.isActive = false;
      if (mode === "DIALOGUE") this.dialogue.close();
      if (mode === "INSPECTION") {
        this.document.close();
        this.scene.close();
      }
      if (mode === "CASSETTE") this.cassette.close();
      if (mode === "INTRO_CUTSCENE") this.intro.isActive = false;
      if (mode === "EPILOGUE") this.epilogue.isActive = false;
      if (mode === "CREDITS") this.credits.isActive = false;
      if (mode === "CORKBOARD") {
        this.board.isConnecting = false;
        this.board.dragStartNode = null;
      }
      this.onPause(false);
    } finally {
      this.closing = false;
    }
  }
  openOverlay(name, engine) {
    if (name === "journal") {
      this.journal.open(engine.state, {
        npcs: [...this.world.roster.values()],
        onClose: () => {
          if (!this.closing) engine.closeOverlay();
        },
      });
    }
  }
  closeOverlay(name) {
    if (name === "journal") {
      this.closing = true;
      try {
        this.journal.close();
      } finally {
        this.closing = false;
      }
    }
  }
  showDialogue(node, engine) {
    const npc = this.world.roster.get(node.speakerId);
    let portrait = this.portraits.get(node.speakerId);
    if (!portrait) {
      portrait = document.createElement("canvas");
      portrait.width = 256;
      portrait.height = 256;
      PortraitRenderer.draw(
        portrait.getContext("2d"),
        node.speakerId ?? "alex",
        "calm",
        0,
        0,
        256,
      );
      portrait.complete = true;
      this.portraits.set(node.speakerId, portrait);
    }
    this.dialogue.startDialogue({
      speaker: npc?.name ?? "Alex Hale",
      portrait,
      text: node.text,
      choices: node.choices.map((choice) => choice.text),
      onChoice: (index) => engine.chooseDialogue(node.choices[index].id),
    });
  }
  setLockpickState(state) {
    this.lockpick.setState(state);
  }
  refreshBoard(engine) {
    const registry = getFullCluesRegistry(engine.state);
    this.boardNodes = engine.state.evidence.map((id, i) => ({
      id,
      type: "index",
      title: registry[id]?.title ?? id,
      text: registry[id]?.text ?? "",
      x: 140 + (i % 6) * 210,
      y: 180 + Math.floor(i / 6) * 180,
    }));
  }
  update(dt, engine) {
    this.time += dt;
    const { width, height } = engine.viewport,
      state = engine.state;
    if (state.interior !== this.lastInterior) {
      this.lastInterior = state.interior;
      this.captureScene = true;
      this.transitionTime = 0.25;
    }
    this.transitionTime = Math.max(0, this.transitionTime - dt);
    const focus =
      engine.camera.target &&
      this.world
        .visibleNPCs(state)
        .find((npc) => npc.id === engine.camera.target);
    const target = focus ?? state.player,
      blend = 1 - Math.exp(-dt * 7);
    engine.camera.x += (target.x - engine.camera.x) * blend;
    engine.camera.y += (target.y - engine.camera.y) * blend;
    this.camera.x = engine.camera.x - engine.camera.y - width / 2;
    this.camera.y = (engine.camera.x + engine.camera.y) / 2 - height * 0.56;
    this.worldView.update(dt);
    this.weather.update(dt, width, height, this.camera);
    this.water.update(dt);
    this.hud.update(dt);
    this.paranoia.setParanoiaLevel(state.PARANOIA);
    this.paranoia.update(dt);
    this.hud.setTime(
      `DIA ${state.day} — 17.X.1989`,
      `${String(Math.floor(state.minute / 60)).padStart(2, "0")}:${String(Math.floor(state.minute % 60)).padStart(2, "0")}`,
    );
    const npc = this.world.nearbyNPC(state),
      nearby = state.interior ? this.world.interiors.nearby(state) : null;
    this.hud.setContextPrompt(
      npc || nearby
        ? {
            label: npc?.name ?? nearby?.name,
            key: "E",
            x: width / 2,
            y: height - 110,
            isWorldCoord: false,
          }
        : null,
    );
    this.interiorRenderer.time = this.time;
    if (state.interior)
      this.interiorRenderer.interiorView.playerRenderer.update(
        dt,
        state.player.vx,
        state.player.vy,
        state.player.angle,
      );
    if (engine.mode === "MAIN_MENU") this.menu.update(dt);
    else if (engine.mode === "INTRO_CUTSCENE") this.intro.update(dt);
    else if (engine.mode === "DIALOGUE") this.dialogue.update(dt);
    else if (engine.mode === "CORKBOARD") this.board.update(dt);
    else if (engine.mode === "LOCKPICKING") this.lockpick.update(dt);
    else if (engine.mode === "CASSETTE") this.cassette.update(dt);
    else if (engine.mode === "EPILOGUE") this.epilogue.update(dt);
    else if (engine.mode === "CREDITS") this.credits.update(dt);
    if (engine.overlay === "map") this.map.update(dt);
    if (engine.overlay === "journal") this.journal.update(dt);
    if (engine.mode === "INSPECTION") {
      this.document.update(dt);
      this.scene.update(dt);
    }
  }
  resize({ width, height, pixelRatio }) {
    this.canvas.width = Math.round(width * pixelRatio);
    this.canvas.height = Math.round(height * pixelRatio);
    Object.assign(this.interiorRenderer, { w: width, h: height, pixelRatio });
  }
  beginFrame({ viewport }) {
    const c = this.ctx;
    if (this.captureScene) {
      this.snapshot.width = this.canvas.width;
      this.snapshot.height = this.canvas.height;
      this.snapshot.getContext("2d").drawImage(this.canvas, 0, 0);
      this.captureScene = false;
    }
    c.setTransform(viewport.pixelRatio, 0, 0, viewport.pixelRatio, 0, 0);
    c.globalAlpha = 1;
    c.globalCompositeOperation = "source-over";
    c.fillStyle = "#080b10";
    c.fillRect(0, 0, viewport.width, viewport.height);
  }
  renderGround({ state, viewport }) {
    if (state.interior) return;
    this.worldView.renderGroundLayer(
      this.ctx,
      { tiles: this.tiles },
      this.camera,
    );
    this.water.renderPuddles(
      this.ctx,
      [],
      this.camera,
      viewport.width,
      viewport.height,
    );
  }
  renderEntities({ state, viewport }) {
    if (state.interior) {
      this.interiorRenderer.dynamicActors = this.world.visibleNPCs(state);
      this.interiorRenderer.interiorView.draw(this.interiorRenderer, state, 0);
      return;
    }
    const queue = this.entities;
    queue.length = 0;
    // Tile-sized facade details retain each building's authored footprint.
    for (const b of buildings) {
      for (let x = b.x; x < b.x + b.w; x += 32)
        for (let y = b.y; y < b.y + b.h; y += 32) {
          if (x > b.x && y > b.y) continue;
          queue.push({
            depth: x + y,
            kind: "wall",
            data: {
              gx: x / 32,
              gy: y / 32,
              height: b.kind === "industrial" ? 96 : 70,
              buildingId: b.id,
              style: b.kind === "civic" ? "brick" : "concrete",
              isCutawayWall: true,
            },
          });
        }
    }
    for (const actor of [
      ...this.world
        .visibleNPCs(state, visibleWorldSector(this.camera, viewport))
        .filter((actor) => {
          const p = this.worldView.gridToScreen(
            actor.position.x,
            actor.position.y,
            0,
            this.camera,
          );
          return (
            p.x >= -HUMAN_HEIGHT_WORLD &&
            p.x <= viewport.width + HUMAN_HEIGHT_WORLD &&
            p.y >= 0 &&
            p.y <= viewport.height + HUMAN_HEIGHT_WORLD
          );
        }),
      {
        ...state.player,
        id: "alex",
        characterId: "alex_hale",
        position: pointToMeters(state.player),
        dimensionsMeters: HUMAN_DIMENSIONS,
      },
    ])
      queue.push({ depth: actor.x + actor.y + 10, kind: "actor", data: actor });
    for (const light of this.streetLighting.lights)
      queue.push({
        depth: light.x + light.y,
        kind: "lamp",
        data: { type: "prop_lamppost", gx: light.x / 32, gy: light.y / 32 },
      });
    queue.sort((a, b) => a.depth - b.depth);
    const actorRenderer = {
      ctx: this.ctx,
      project: (x, y) =>
        this.worldView.gridToScreen(x / 32, y / 32, 0, this.camera),
    };
    for (const entry of queue) {
      if (entry.kind === "wall" || entry.kind === "lamp")
        this.worldView.renderWorldObject(
          this.ctx,
          entry.data,
          this.camera,
          false,
        );
      else
        this.interiorRenderer.townActors.draw(actorRenderer, {
          ...entry.data,
          time: this.time,
        });
    }
    for (const b of buildings) {
      const p = this.worldView.gridToScreen(
        (b.x + b.w / 2) / 32,
        (b.y + b.h) / 32,
        0,
        this.camera,
      );
      this.ctx.fillStyle = "#d9cbab";
      this.ctx.font = "11px monospace";
      this.ctx.textAlign = "center";
      this.ctx.fillText(b.name, p.x, p.y + 18);
    }
    this.ctx.textAlign = "left";
  }
  renderRoofs({ state, viewport }) {
    if (!state.interior)
      for (const b of buildings)
        this.worldView.renderRoofLayer(
          this.ctx,
          b.id,
          state.interior === b.id,
          this.camera,
          {
            gx: (b.x + b.w / 2) / 32,
            gy: (b.y + b.h / 2) / 32,
            gw: b.w / 32,
            gh: b.h / 32,
            height: 72,
            roofColor: b.roof,
          },
        );
    if (this.transitionTime > 0 && this.snapshot.width) {
      this.ctx.save();
      this.ctx.globalAlpha = this.transitionTime / 0.25;
      this.ctx.drawImage(this.snapshot, 0, 0, viewport.width, viewport.height);
      this.ctx.restore();
    }
  }
  renderWeatherLighting({ state, viewport }) {
    if (!state.interior) {
      this.streetLighting.drawLightPools({
        ctx: this.ctx,
        project: (x, y) =>
          this.worldView.gridToScreen(x / 32, y / 32, 0, this.camera),
      });
      this.weather.render(
        this.ctx,
        viewport.width,
        viewport.height,
        this.camera,
      );
    }
    // Authored room lighting remains inside InteriorRoomRenderer's sorted packet.
  }
  renderUI({ mode, viewport, camera }) {
    const c = this.ctx,
      { width, height } = viewport;
    if (mode === "MAIN_MENU") this.menu.render(c, width, height);
    else if (mode === "INTRO_CUTSCENE") this.intro.render(c, width, height);
    else if (mode === "EPILOGUE") this.epilogue.render(c, width, height);
    else if (mode === "CREDITS") this.credits.render(c, width, height);
    else {
      this.hud.render(c, width, height, camera);
      this.paranoia.render(c, width, height);
    }
  }
  renderModal({ engine, mode, overlay, viewport }) {
    const c = this.ctx,
      { width, height } = viewport;
    if (mode === "DIALOGUE") this.dialogue.render(c, width, height);
    else if (mode === "CORKBOARD") {
      const connections = engine.state.deductionGraph.edges.map((edge) => ({
        fromId: edge.nodeA,
        toId: edge.nodeB,
        verified: edge.status === "valid",
      }));
      this.board.render(c, this.boardNodes, connections, null, width, height);
    } else if (mode === "INSPECTION") {
      this.document.render(c, width, height);
      this.scene.render(c, width, height);
    } else if (mode === "LOCKPICKING") this.lockpick.render(c, width, height);
    else if (mode === "CASSETTE") this.cassette.render(c, width, height);
    if (overlay === "map")
      this.map.render(c, null, engine.state.interior, width, height);
    if (overlay === "journal") this.journal.render(c, width, height);
  }
  handleKey(event, engine) {
    if (engine.overlay === "map") return this.map.handleKeyDown(event.key);
    if (engine.overlay === "journal") return this.journal.handleKey(event.key);
    if (engine.mode === "MAIN_MENU") {
      this.menu.handleKeyDown(event.key);
      return true;
    }
    if (engine.mode === "DIALOGUE") {
      if (
        this.dialogue.isTextComplete &&
        !this.dialogue.choices.length &&
        [" ", "Enter", "e"].includes(event.key)
      )
        return engine.advanceDialogue();
      return this.dialogue.onKeyDown(event.key);
    }
    if (engine.mode === "INSPECTION")
      return this.scene.isOpen
        ? this.scene.handleKeyDown(event.key)
        : this.document.handleKeyDown(event.key);
    if (engine.mode === "CASSETTE") return this.cassette.handleInput(event);
    if (engine.mode === "EPILOGUE")
      return this.epilogue.handleKeyDown(event.key);
    if (engine.mode === "CREDITS") return this.credits.handleInput(event);
    if (engine.mode === "EXPLORATION")
      return this.world.handleKey(event, engine);
    return false;
  }
  pointer(type, x, y, engine) {
    if (engine.paused) return;
    const { width, height } = engine.viewport;
    if (engine.overlay === "journal") {
      if (type === "click") this.journal.handleClick(x, y, width, height);
      return;
    }
    if (engine.overlay === "map") {
      this.map.handleMouseMove(x, y, width, height);
      if (type === "click") this.map.handleClick(x, y);
      return;
    }
    if (engine.mode === "MAIN_MENU") {
      this.menu.handleMouseMove(x, y);
      if (type === "click") this.menu.handleClick(x, y);
      return;
    }
    if (engine.mode === "DIALOGUE") {
      this.dialogue.onMouseMove(x, y);
      if (type === "click") {
        if (this.dialogue.isTextComplete && !this.dialogue.choices.length)
          engine.advanceDialogue();
        else this.dialogue.onClick(x, y);
      }
      return;
    }
    if (engine.mode === "CORKBOARD") {
      if (type === "move") this.board.handleMouseMove(x, y, this.boardNodes);
      if (type === "down") this.board.handleMouseDown(x, y, this.boardNodes);
      if (type === "up") this.board.handleMouseUp(x, y, this.boardNodes);
      return;
    }
    if (engine.overlay === "journal" || engine.mode === "INSPECTION") {
      if (this.scene.isOpen && !engine.overlay) {
        this.scene.handleMouseMove(x, y);
        if (type === "click") this.scene.handleClick(x, y);
      } else if (type === "click")
        this.document.handleClick({ clientX: x, clientY: y }, width, height);
      return;
    }
    if (engine.mode === "CASSETTE" && type === "click") {
      this.cassette.handleInput({ type, clientX: x, clientY: y });
      return;
    }
    if (engine.mode === "EXPLORATION" && type === "click") {
      if (engine.state.interior) {
        const target = this.interiorRenderer.interiorView.pick(engine.state, {
          x,
          y,
        });
        if (target) {
          const result = this.world.interiors.navigate(engine.state, target);
          if (result.arrived) this.world.useTarget(result.arrived, engine);
        }
      }
    }
  }
  destroy() {
    this.synth.stopAtmosphere();
    if (this.synth.ctx?.close) this.synth.ctx.close().catch(() => {});
  }
}
