const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NORTHVALE_CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(process.env.NORTHVALE_URL || "http://127.0.0.1:5173");
    await page.waitForFunction(() => window.northvale?.engine.running);
    await page.click("#begin");
    await page.keyboard.press("Space");
    await page.waitForFunction(() => northvale.engine.mode === "EXPLORATION");
    const metrics = await page.evaluate(() => {
      const { engine, world, presentation } = northvale,
        state = engine.state;
      engine.stop(); // Advance exact test time rather than waiting on wall-clock scheduling.
      state.minute = 419;
      delete state.npcMovement;
      engine.buildSystems();
      world.reset(state, engine);
      engine.gameMinutesPerSecond = 200;
      const positions = new Map(world.npcs.map((n) => [n.id, n.position]));
      let largestStepMps = 0,
        distanceRuth = 0;
      for (let frame = 0; frame < 60; frame++) {
        engine.update(1 / 60);
        for (const npc of world.npcs) {
          const before = positions.get(npc.id);
          const length = Math.hypot(
            npc.position.x - before.x,
            npc.position.y - before.y,
          );
          largestStepMps = Math.max(largestStepMps, length * 60);
          if (npc.id === "ruth") distanceRuth += length;
          positions.set(npc.id, npc.position);
        }
      }
      const ruth = world.npcs.find((n) => n.id === "ruth");
      presentation.cameraSystem.snapTo(ruth);
      presentation.update(0, engine);
      // Even if a caller submits duplicate DTOs, rendering keeps one physical identity.
      world.npcs.push({ ...ruth }, { ...ruth, id: "duplicate-ruth" });
      const drawn = [],
        actors = presentation.interiorRenderer.townActors;
      const originalDraw = actors.draw;
      actors.draw = function (renderer, actor) {
        drawn.push(actor.characterId);
        return originalDraw.call(this, renderer, actor);
      };
      engine.render();
      actors.draw = originalDraw;
      const queue = presentation.entities
        .filter((e) => e.kind === "actor")
        .map((e) => e.data);
      const offscreen = queue.filter((actor) => {
        const p = presentation.cameraSystem.worldToScreen(actor.x, actor.y);
        const margin = 56 * presentation.cameraSystem.scale;
        return (
          actor.id !== "alex" &&
          (p.x < -margin ||
            p.x > 1440 + margin ||
            p.y < 0 ||
            p.y > 900 + margin)
        );
      }).length;
      world.updateNPCs(engine, 0);
      engine.saveGame(1);
      const savedPosition = JSON.stringify(state.npcMovement.ruth.position);
      world.updateNPCs(engine, 0.1);
      engine.loadGame(1);
      return {
        largestStepMps,
        distanceRuth,
        logicalCount: world.npcs.length,
        drawn,
        unique: new Set(queue.map((n) => n.characterId)).size === queue.length,
        offscreen,
        saveRestored:
          savedPosition === JSON.stringify(state.npcMovement.ruth.position),
        height:
          presentation.interiorRenderer.interiorView.playerRenderer
            .targetHeight,
      };
    });
    assert.ok(metrics.largestStepMps <= 1.6 + 1e-8);
    assert.ok(metrics.distanceRuth > 1.2 && metrics.distanceRuth <= 1.6 + 1e-8);
    assert.equal(metrics.logicalCount, 32);
    assert.equal(metrics.unique, true);
    assert.equal(metrics.offscreen, 0);
    assert.ok(metrics.drawn.includes("ruth_mercer"));
    assert.ok(metrics.drawn.every((id) => typeof id === "string" && id.length));
    assert.equal(metrics.height, 56);
    assert.equal(metrics.saveRestored, true);
    await fs.mkdir("test-results", { recursive: true });
    await page.evaluate(() => {
      const { engine, world, presentation } = northvale,
        state = engine.state;
      state.interior = "sarah";
      world.interiors.enter(state, { fromStreet: true });
      const room = world.interiors.room(state),
        chair = room.props.find((p) => p.type === "armchair");
      Object.assign(
        state.player,
        world.interiors.repairPosition(state, {
          x: chair.x + chair.w + 24,
          y: chair.y + chair.h + 20,
        }),
      );
      world.updateNPCs(engine, 0);
      presentation.update(0.3, engine);
      engine.render();
    });
    await page.screenshot({ path: "test-results/metric-interior.png" });
    assert.deepEqual(errors, []);
    console.log(JSON.stringify(metrics));
    console.log(
      "Metric browser smoke passed: real-dt movement, sector filtering, character IDs, save continuity and interior scale.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
