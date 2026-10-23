import { ruleId, ruleNumber } from "./RuleData.js";

/** One deterministic cinematic clock. Views may complete it early via complete(). */
export class CutsceneDirector {
  constructor() {
    this.scene = null;
    this.sequence = 0;
  }
  play(id, { duration, onComplete = () => {} }) {
    ruleId(id);
    ruleNumber(duration, Number.MIN_VALUE);
    this.cancel();
    const token = ++this.sequence;
    this.scene = { id, duration, time: 0, token, onComplete };
    return token;
  }
  update(dt) {
    ruleNumber(dt, 0);
    if (!this.scene) return;
    this.scene.time = Math.min(this.scene.duration, this.scene.time + dt);
    if (this.scene.time >= this.scene.duration) this.complete(this.scene.token);
  }
  complete(token = this.scene?.token) {
    if (!this.scene || token !== this.scene.token) return false;
    const callback = this.scene.onComplete;
    this.scene = null;
    callback();
    return true;
  }
  skip() {
    return this.complete();
  }
  cancel() {
    this.scene = null;
  }
  getRenderState() {
    return this.scene
      ? {
          sceneId: this.scene.id,
          time: this.scene.time,
          progress: this.scene.time / this.scene.duration,
        }
      : null;
  }
}
