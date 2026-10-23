import { SpriteSheet, directionFromVelocity } from "./spritesheet.js";
import {
  HUMAN_HEIGHT_WORLD,
  HUMAN_RADIUS_WORLD,
} from "../engine/WorldMetrics.js";
import { characterAppearance } from "../data/CharacterProfiles.js";

/** Shared atlases; one visual profile per character identity, no per-frame spawning. */
export class TownActors {
  constructor(police) {
    this.alex = police.alexSheet;
    this.ruth = police.ruthSheet;
    this.citizens = new SpriteSheet({
      src: "/assets/characters/townspeople_walk.png",
      columns: 8,
      rows: 6,
    });
    this.officials = new SpriteSheet({
      src: "/assets/characters/town-officials_walk.png",
      columns: 8,
      rows: 8,
    });
    this.directions = new Map();
    this.profiles = new Map();
    this.ready = Promise.all([
      this.alex.ready,
      this.ruth.ready,
      this.citizens.ready,
      this.officials.ready,
    ]);
    this.error = null;
    this.ready.catch((error) => {
      this.error = error;
    });
  }
  draw(
    r,
    { id, characterId, appearance, x, y, vx = 0, vy = 0, time = 0, angle = 0 },
  ) {
    const key = characterId ?? id;
    let profile = this.profiles.get(key);
    if (!profile) {
      profile =
        appearance ??
        characterAppearance({ id, ...(characterId ? { characterId } : {}) });
      if (characterId && profile.characterId !== characterId)
        throw new TypeError("Sprite identity mismatch.");
      this.profiles.set(key, profile);
    }
    const sheet = this[profile.atlas];
    if (!sheet?.image.naturalWidth) return false;
    const p = r.project(x, y),
      c = r.ctx,
      moving = Math.hypot(vx, vy) > 2;
    const direction = directionFromVelocity(
      (vx - vy) * 0.866,
      (vx + vy) * 0.5,
      this.directions.get(key) ??
        directionFromVelocity(
          (Math.cos(angle) - Math.sin(angle)) * 0.866,
          (Math.cos(angle) + Math.sin(angle)) * 0.5,
        ),
    );
    this.directions.set(key, direction);
    const row =
      profile.atlas === "alex"
        ? moving
          ? Math.floor(time * 9) % 6
          : 0
        : profile.atlas === "ruth"
          ? Math.floor(time * 2) % 4
          : profile.baseRow +
            (moving ? Math.floor((time + profile.phaseOffset) * 7) % 2 : 0);
    c.save();
    c.fillStyle = "#06131b77";
    c.beginPath();
    c.ellipse(
      p.x,
      p.y + 1,
      HUMAN_RADIUS_WORLD,
      HUMAN_RADIUS_WORLD * 0.4,
      0,
      0,
      Math.PI * 2,
    );
    c.fill();
    if (profile.hue || profile.saturation !== 1)
      c.filter = `hue-rotate(${profile.hue}deg) saturate(${profile.saturation})`;
    const drawn = sheet.draw(c, direction, row, p.x, p.y, {
      scale: HUMAN_HEIGHT_WORLD / sheet.frameHeight,
      anchorY:
        profile.atlas === "citizens" || profile.atlas === "officials"
          ? 0.98
          : 0.93,
    });
    c.restore();
    return drawn;
  }
}
