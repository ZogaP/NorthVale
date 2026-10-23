import { WORLD, buildings, door, move, collides, isOpen } from "../world.js";
import { updateVehicle } from "../simulation.js";
import { InteriorWorld } from "../interiors/interior-world.js";
import { IsometricPathfinding } from "../systems/IsometricPathfinding.js";
import { DEFAULT_NPC_ROUTINES } from "../systems/NPCRoutineSystem.js";
import { CANONICAL_CLUES } from "../systems/CanonicalCampaign.js";
import { getFullCluesRegistry } from "../state.js";
import {
  WORLD_UNITS_PER_METER,
  HUMAN_DIMENSIONS,
  HUMAN_RADIUS_WORLD,
  metersToWorld,
  pointToMeters,
  pointToWorld,
} from "./WorldMetrics.js";
import { collectVisibleNPCs, entityBounds } from "./WorldEntities.js";

export function createTownDialogues() {
  return DEFAULT_NPC_ROUTINES.map((npc) => ({
    id: `talk-${npc.id}`,
    start: "opening",
    nodes: {
      opening: {
        speakerId: npc.id,
        text:
          npc.id === "bobby"
            ? "Eu estava no diner. Não conduzi aquela viatura."
            : npc.id === "ruth"
              ? "Os registros estão no arquivo. Traga fatos, Hale."
              : `${npc.name} interrompe o que estava fazendo para ouvir Alex.`,
        choices: [
          {
            id: "ask",
            text: "O que sabe sobre o desaparecimento de Sarah?",
            next: "answer",
          },
          ...(["sam", "elias", "owen", "clara"].includes(npc.id)
            ? [
                {
                  id: "favor",
                  text: "Trouxe o documento que você pediu.",
                  next: "answer",
                },
              ]
            : []),
          ...(["ruth", "bobby"].includes(npc.id)
            ? [
                {
                  id: "confront",
                  text: "Esta prova contradiz seu depoimento.",
                  requirements: {
                    items: [npc.id === "bobby" ? "viatura04" : "ruth_order"],
                  },
                  next: "answer",
                },
              ]
            : []),
          { id: "leave", text: "Voltaremos a conversar.", next: null },
        ],
      },
      answer: {
        speakerId: npc.id,
        text:
          npc.id === "helen"
            ? "Sarah deixou uma carta no quarto. A chave fica no armário da cozinha."
            : npc.id === "sam"
              ? "Minha caixa de ferramentas está na cabine. Posso preparar suas gazuas."
              : npc.id === "owen"
                ? "O registro da viatura está no escritório do depósito. Não queria me envolver."
                : npc.id === "clara"
                  ? "A escritura de 1978 pode explicar o acesso à represa."
                  : npc.id === "elias"
                    ? "Encontre a prescrição no meu escritório. Os reagentes ajudarão a investigação."
                    : "O silêncio desta cidade não é uma resposta. Procure documentos e compare os relatos.",
        next: "opening",
      },
    },
  }));
}

/** Existing authored interiors and collision data, exposed without owning a frame loop. */
export class NorthValeWorld {
  constructor({ interiors = new InteriorWorld() } = {}) {
    this.interiors = interiors;
    this.ready = interiors.ready;
    this.pathfinding = new IsometricPathfinding({
      width: Math.ceil(WORLD.width / WORLD_UNITS_PER_METER),
      height: Math.ceil(WORLD.height / WORLD_UNITS_PER_METER),
      cellSize: WORLD_UNITS_PER_METER,
    });
    for (let y = 0; y < this.pathfinding.height; y++)
      for (let x = 0; x < this.pathfinding.width; x++) {
        const p = this.pathfinding.cellToWorld({ x, y });
        // Mark the whole cell footprint, not just its centre: smoothed paths must
        // keep a 0.3m human radius clear of building corners between waypoints.
        if (collides(p.x, p.y, HUMAN_RADIUS_WORLD + WORLD_UNITS_PER_METER / 2))
          this.pathfinding.setBlocked(x, y);
      }
    this.npcs = [];
    this.routes = new Map();
    this.roster = new Map(DEFAULT_NPC_ROUTINES.map((npc) => [npc.id, npc]));
    this.footstepTimer = 0;
    this.currentState = null;
    this.zones = [
      {
        id: "dam-gallery",
        bounds: { x: 0, y: 0, width: 2000, height: 2000 },
        enabled: false,
        modifiers: { humidity: 0.95, footstepNoiseDb: 8, ambientNoiseDb: 30 },
      },
    ];
    this.routineOptions = {};
  }

  reset(state, engine) {
    this.currentState = state;
    this.interiors.navigation = null;
    this.interiors.transition = null;
    if (state.interior) this.interiors.enter(state);
    this.updateNPCs(engine);
  }
  snap(point) {
    const cell = this.pathfinding.worldToCell(point),
      candidates = [];
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -2; dx <= 2; dx++) {
        const candidate = { x: cell.x + dx, y: cell.y + dy };
        if (this.pathfinding.isBlocked(candidate.x, candidate.y)) continue;
        const world = this.pathfinding.cellToWorld(candidate);
        const length = Math.hypot(world.x - point.x, world.y - point.y);
        let clear = true;
        for (let i = 0; i <= 10; i++)
          if (
            collides(
              point.x + ((world.x - point.x) * i) / 10,
              point.y + ((world.y - point.y) * i) / 10,
              HUMAN_RADIUS_WORLD,
            )
          )
            clear = false;
        if (clear) candidates.push({ ...world, length });
      }
    candidates.sort((a, b) => a.length - b.length);
    return candidates[0] ?? null;
  }
  pedestrianPath(positionMeters, target) {
    const from = pointToWorld(positionMeters),
      a = this.snap(from),
      b = this.snap(target);
    if (!a || !b) return null;
    const ca = this.pathfinding.worldToCell(a),
      cb = this.pathfinding.worldToCell(b);
    const key = `${ca.x},${ca.y}:${cb.x},${cb.y}:${this.pathfinding.revision}`;
    let middle = this.routes.get(key);
    if (!middle) {
      middle = this.pathfinding.findWorldPath(a, b);
      if (!middle.length) return null; // Hold position; never teleport on an unreachable route.
      if (this.routes.size > 512) this.routes.clear();
      this.routes.set(key, middle);
    }
    return [from, ...middle, target].map(pointToMeters);
  }
  updateNPCs(engine, dt = 0) {
    const { state, systems } = engine,
      minute = Math.floor(state.minute);
    const movement = systems.routines.movement;
    this.npcs = [...this.roster.values()].map((npc) => {
      const target = systems.routines.getRoutineTarget(
        npc.id,
        Math.floor(minute / 60),
        minute % 60,
      );
      const key = `${state.day}:${target.scheduleKey}`;
      // Initial/load placement happens once. A clock change never replaces this position.
      const body = movement.ensureEntity({
        id: npc.id,
        characterId: target.characterId,
        position: pointToMeters(target),
        speedMps: systems.routines.getNPC(npc.id).walkSpeedMps,
        inside: target.inside ?? true,
        locationId: target.locationId,
        scheduleKey: key,
      });
      const override = state.npcRoutineState[npc.id]?.override;
      if (!target.active || override) {
        movement.stop(npc.id);
        body.suspended = true;
      } else if (
        body.scheduleKey !== key ||
        body.routeRevision !== this.pathfinding.revision ||
        body.suspended
      ) {
        body.suspended = false;
        const sameLocation =
          body.inside && body.locationId === target.locationId;
        if (!sameLocation) {
          const path = this.pedestrianPath(body.position, target);
          if (path) {
            movement.setPath(npc.id, path);
            body.inside = false;
            body.arrivalLocationId = target.locationId;
            body.arrivalInside = target.inside ?? true;
          } else movement.stop(npc.id);
        }
        body.scheduleKey = key;
        body.routeRevision = this.pathfinding.revision;
      }
      if (target.active && !override && !body.inside && body.path.length) {
        const result = movement.updateEntity(npc.id, dt);
        if (result.arrived) {
          body.inside = body.arrivalInside ?? true;
          body.locationId = body.arrivalLocationId ?? target.locationId;
        }
      }
      const position = { ...body.position },
        worldPoint = pointToWorld(position);
      return {
        ...target,
        ...worldPoint,
        id: npc.id,
        name: npc.name,
        characterId: target.characterId,
        position,
        dimensionsMeters: { ...HUMAN_DIMENSIONS },
        boundsMeters: entityBounds(position),
        inside: body.inside,
        locationId: body.inside ? body.locationId : target.locationId,
        state: !body.inside && !override ? "PATROLLING" : target.state,
        visible: !body.inside || target.visibleAtDestination,
        velocity: { ...body.velocity },
        vx: metersToWorld(body.velocity.x),
        vy: metersToWorld(body.velocity.y),
      };
    });
    systems.acoustics.listeners.clear();
    const audible = this.visibleNPCs(state);
    const spaceId = state.interior
      ? `${state.interior}/${state.interiorRoom}`
      : "town";
    for (const npc of audible)
      systems.acoustics.addListener({
        ...npc,
        position: { x: npc.x, y: npc.y, z: npc.z ?? 0 },
        spaceId,
        hearingThreshold: 25,
      });
  }
  movePlayer(dt, engine) {
    const { state, input } = engine,
      p = state.player;
    if (state.interior && this.interiors.transition) return;
    if (state.driving && !state.interior) {
      const displacement = updateVehicle(
        state.car,
        {
          forward: input.isActionDown("MOVE_UP"),
          back: input.isActionDown("MOVE_DOWN"),
          left: input.isActionDown("MOVE_LEFT"),
          right: input.isActionDown("MOVE_RIGHT"),
          brake: input.held.has("Space"),
        },
        dt,
      );
      move(state.car, displacement.dx, displacement.dy, 18);
      Object.assign(p, { x: state.car.x, y: state.car.y });
      return;
    }
    const sx =
      Number(input.isActionDown("MOVE_RIGHT")) -
      Number(input.isActionDown("MOVE_LEFT"));
    const sy =
      Number(input.isActionDown("MOVE_DOWN")) -
      Number(input.isActionDown("MOVE_UP"));
    // Screen-relative directions inverted through the Gemini 2:1 projection.
    let dx = sx * 0.5 + sy,
      dy = -sx * 0.5 + sy;
    const length = Math.hypot(dx, dy),
      speed =
        input.held.has("ShiftLeft") || input.held.has("ShiftRight")
          ? metersToWorld(3.2)
          : metersToWorld(1.4);
    if (!length) {
      p.vx = 0;
      p.vy = 0;
      return;
    }
    this.interiors.navigation = null;
    dx = (dx / length) * speed;
    dy = (dy / length) * speed;
    p.vx = dx;
    p.vy = dy;
    p.angle = Math.atan2(dy, dx);
    if (state.interior) this.interiors.move(state, dx * dt, dy * dt);
    else move(p, dx * dt, dy * dt, HUMAN_RADIUS_WORLD);
  }
  update(dt, engine) {
    const state = engine.state;
    this.currentState = state;
    const roomBefore = state.interiorRoom;
    if (state.interior) {
      const arrived = this.interiors.update(dt, state);
      if (arrived) this.useTarget(arrived, engine);
      if (roomBefore !== state.interiorRoom)
        engine.areaChanged(`${state.interior}/${state.interiorRoom}`);
    }
    this.updateNPCs(engine, dt);
    engine.systems.triggers.setZoneEnabled(
      "dam-gallery",
      state.interior === "dam" && state.interiorRoom === "turbines",
    );
    if (Math.hypot(state.player.vx, state.player.vy) > 5) {
      this.footstepTimer += dt;
      if (this.footstepTimer >= 0.4) {
        this.footstepTimer %= 0.4;
        engine.systems.acoustics.emitSound(
          engine.input.held.has("ShiftLeft") ||
            engine.input.held.has("ShiftRight")
            ? "GRAVEL_RUN"
            : "PUDDLE_STEP",
          {
            ...state.player,
            spaceId: state.interior
              ? `${state.interior}/${state.interiorRoom}`
              : "town",
          },
          {
            sourceId: "alex",
            noiseModifierDb:
              engine.systems.triggers.getEnvironment().footstepNoiseDb,
          },
        );
      }
    } else this.footstepTimer = 0;
  }
  onSoundDetected(entity, origin, intensity, engine) {
    if (intensity >= 60 && entity.state !== "FLEEING")
      engine.systems.routines.setNPCState(entity.id, "CONFRONTED", {
        x: entity.x,
        y: entity.y,
        inside: entity.inside,
        locationId: entity.locationId,
      });
  }
  visibleNPCs(state, sector = null) {
    if (!state.interior) return collectVisibleNPCs(this.npcs, sector);
    const room = this.interiors.room(state),
      manifest = this.interiors.manifest(state),
      staticNPCs = room.props.filter((prop) => prop.type === "npc");
    return this.npcs
      .filter(
        (npc) =>
          npc.locationId === state.interior &&
          npc.active &&
          npc.visible &&
          npc.inside &&
          (manifest.rooms.find((candidate) =>
            candidate.props.some(
              (prop) => prop.type === "npc" && prop.id === npc.id,
            ),
          )?.id ?? manifest.entranceRoom) === room.id,
      )
      .map((npc, i) => {
        const authored = staticNPCs.find((prop) => prop.id === npc.id);
        const p =
          authored?.approach ??
          (authored
            ? { x: authored.x, y: authored.y }
            : { x: room.spawn.x + 35 + i * 15, y: room.spawn.y - 50 });
        const position = pointToMeters(p);
        return { ...npc, ...p, position, boundsMeters: entityBounds(position) };
      });
  }
  nearbyNPC(state) {
    return this.visibleNPCs(state)
      .map((npc) => ({
        ...npc,
        distance: Math.hypot(npc.x - state.player.x, npc.y - state.player.y),
      }))
      .filter((npc) => npc.distance < 68)
      .sort((a, b) => a.distance - b.distance)[0];
  }
  interact(engine) {
    const state = engine.state,
      npc = this.nearbyNPC(state);
    if (npc) {
      engine.startDialogue(`talk-${npc.id}`, npc.id);
      return;
    }
    if (state.interior) {
      const target = this.interiors.nearby(state);
      if (target) this.useTarget(target, engine);
      return;
    }
    const building = buildings
      .map((b) => ({ building: b, point: door(b) }))
      .find(
        ({ point }) =>
          Math.hypot(point.x - state.player.x, point.y - state.player.y) < 70,
      )?.building;
    if (!building) {
      engine.notify("Aproxime-se de uma porta ou pessoa.");
      return;
    }
    if (!isOpen(building, state.minute)) {
      engine.notify("O estabelecimento está fechado.");
      return;
    }
    state.outdoor = { x: state.player.x, y: state.player.y };
    state.interior = building.id;
    this.interiors.enter(state, { fromStreet: true });
    engine.areaChanged(`${state.interior}/${state.interiorRoom}`);
  }
  useTarget(target, engine) {
    const state = engine.state;
    const result = this.interiors.interact(state, target);
    if (!result.ok) {
      if (
        target.kind === "door" &&
        target.isLocked &&
        engine.startLockpicking(target)
      )
        return;
      engine.notify(result.message ?? "Sem passagem.");
      return;
    }
    if (result.exit) {
      state.interior = null;
      state.interiorRoom = null;
      Object.assign(state.player, state.outdoor ?? { x: 720, y: 705 }, {
        vx: 0,
        vy: 0,
      });
      engine.areaChanged("exterior");
      return;
    }
    if (target.kind === "door") return;
    const clues = Object.entries(CANONICAL_CLUES)
      .filter(
        ([, clue]) =>
          clue.interiorId === state.interior &&
          clue.roomId === state.interiorRoom &&
          clue.propId === target.id,
      )
      .map(([id]) => id);
    if (result.evidence) clues.push(result.evidence);
    for (const id of clues) {
      const definition = getFullCluesRegistry(state)[id];
      if (definition)
        engine.systems.inventory.addItem({
          id,
          type: "evidence",
          metadata: {
            source: this.interiors.objectId(state, target.object),
            day: state.day,
          },
        });
    }
    engine.systems.campaign.sync();
    if (target.object?.type === "npc") {
      engine.startDialogue(`talk-${target.id}`, target.id);
      return;
    }
    engine.inspect({
      type: "document",
      title: target.name,
      text: result.message ?? target.object?.text ?? "",
      evidenceIds: clues,
    });
    engine.safeAutosave();
  }
  unlockDoor(target, engine) {
    this.interiors
      .save(engine.state)
      .patch(target.globalId, { isLocked: false });
    engine.notify("Fechadura destrancada.");
    engine.safeAutosave();
  }
  onDialogueChoice(choiceId, npcId, engine) {
    if (choiceId === "favor")
      engine.notify(
        engine.systems.campaign.favor(npcId)
          ? "Favor concluído. Recompensa recebida."
          : "Ainda falta a prova solicitada.",
      );
    if (choiceId === "confront") {
      engine.systems.campaign.confront(npcId);
      engine.notify("Depoimento confrontado com prova material.");
    }
    engine.systems.campaign.sync();
    engine.safeAutosave();
  }
  handleKey(event, engine) {
    if (
      event.code === "KeyF" &&
      !engine.state.interior &&
      Math.hypot(
        engine.state.car.x - engine.state.player.x,
        engine.state.car.y - engine.state.player.y,
      ) < 80
    ) {
      engine.state.driving = !engine.state.driving;
      return true;
    }
    return false;
  }
}
