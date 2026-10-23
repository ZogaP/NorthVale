const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NORTHVALE_CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
  });
  try {
    const page = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
      }),
      errors = [],
      missing = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("response", (response) => {
      if (response.status() >= 400) missing.push(response.url());
    });
    await page.goto(process.env.NORTHVALE_URL || "http://127.0.0.1:5173");
    await page.waitForFunction(() => window.northvale?.engine.running);
    const mode = async (expected) =>
      page.waitForFunction(
        (value) => northvale.engine.mode === value,
        expected,
      );
    const focus = () => page.locator("#gameCanvas").focus();
    await page.click("#begin");
    await mode("INTRO_CUTSCENE");
    await page.keyboard.press("Space");
    await mode("EXPLORATION");
    assert.equal(await page.evaluate(() => northvale.world.npcs.length), 32);
    const before = await page.evaluate(() => northvale.engine.state.player.x);
    await page.keyboard.down("d");
    await page.waitForTimeout(200);
    await page.keyboard.up("d");
    assert.ok(
      await page.evaluate((x) => northvale.engine.state.player.x > x, before),
    );
    await page.keyboard.press("Tab");
    assert.equal(
      await page.evaluate(() => northvale.engine.overlay),
      "journal",
    );
    const clock = await page.evaluate(() => northvale.engine.state.minute);
    await page.waitForTimeout(150);
    assert.equal(
      await page.evaluate(() => northvale.engine.state.minute),
      clock,
    );
    await page.keyboard.press("Escape");
    assert.equal(await page.evaluate(() => northvale.engine.paused), false);
    await page.keyboard.press("Escape");
    assert.equal(await page.evaluate(() => northvale.engine.paused), true);
    await page.keyboard.press("Escape");
    await page.keyboard.press("m");
    assert.equal(await page.evaluate(() => northvale.engine.overlay), "map");
    await page.keyboard.press("m");
    assert.equal(await page.evaluate(() => northvale.engine.overlay), null);
    // Use collected-evidence APIs to exercise actual pin dragging, not forged graph records.
    await page.evaluate(() => {
      for (const id of ["viatura04", "owen_confession"])
        northvale.engine.systems.inventory.addItem({ id, type: "evidence" });
    });
    await page.keyboard.press("c");
    await mode("CORKBOARD");
    const pins = await page.evaluate(() => {
      const rect = document
        .querySelector("#gameCanvas")
        .getBoundingClientRect();
      return northvale.presentation.boardNodes.map((node) => ({
        x: rect.left + (node.x * rect.width) / 1440,
        y: rect.top + (node.y * rect.height) / 900,
      }));
    });
    await page.mouse.move(pins[0].x, pins[0].y);
    await page.mouse.down();
    await page.mouse.move(pins[1].x, pins[1].y, { steps: 10 });
    await page.mouse.up();
    assert.equal(
      await page.evaluate(
        () => northvale.engine.state.deductionGraph.edges[0]?.status,
      ),
      "valid",
    );
    await page.keyboard.press("Escape");
    await page.evaluate(() =>
      northvale.engine.startDialogue("talk-bobby", "bobby"),
    );
    await mode("DIALOGUE");
    await page.keyboard.press("Space");
    await page.keyboard.press("2");
    assert.ok(
      await page.evaluate(() =>
        northvale.engine.state.PLAYER_DECISION_FLAGS.includes(
          "BOBBY_CONFRONTED",
        ),
      ),
    );
    await page.click("#save");
    await focus();
    await page.keyboard.press("Escape");
    await mode("EXPLORATION");
    await page.click("#load");
    await mode("DIALOGUE");
    assert.equal(
      await page.evaluate(() => northvale.engine.camera.target),
      "bobby",
    );
    await page.keyboard.press("Escape");
    await mode("EXPLORATION");
    await page.evaluate(() =>
      northvale.engine.inspect({
        title: "Registro",
        text: "Um documento recolhido durante a investigação.",
      }),
    );
    await mode("INSPECTION");
    await page.keyboard.press("Escape");
    await page.evaluate(() =>
      northvale.engine.inspect({
        type: "scene",
        data: {
          title: "Gaveta",
          type: "drawer",
          hotspots: [
            {
              id: "scene-note",
              type: "document",
              label: "Bilhete",
              x: 620,
              y: 400,
              width: 160,
              height: 80,
            },
          ],
        },
      }),
    );
    await mode("INSPECTION");
    const notePoint = await page.locator("#gameCanvas").evaluate((canvas) => {
      const r = canvas.getBoundingClientRect();
      return {
        x: r.left + (650 * r.width) / 1440,
        y: r.top + (440 * r.height) / 900,
      };
    });
    await page.mouse.click(notePoint.x, notePoint.y);
    assert.equal(
      await page.evaluate(() =>
        northvale.engine.systems.inventory.hasItem("scene-note"),
      ),
      true,
    );
    await page.keyboard.press("Escape");
    await page.evaluate(() =>
      northvale.engine.systems.inventory.addItem({
        id: "tape",
        type: "evidence",
      }),
    );
    await page.click("#cassette-button");
    await mode("CASSETTE");
    await focus();
    await page.keyboard.press("Space");
    await page.waitForTimeout(100);
    await page.keyboard.press("Escape");
    await mode("EXPLORATION");
    await page.evaluate(() => {
      Object.assign(northvale.engine.state.player, { x: 720, y: 705 });
    });
    await focus();
    await page.keyboard.press("e");
    await page.waitForFunction(
      () => northvale.engine.state.interior === "police",
    );
    assert.equal(
      await page.evaluate(
        () => northvale.engine.systems.saves.getSavedSlotsInfo()[3].status,
      ),
      "saved",
    );
    await page.evaluate(() => {
      const { engine, world } = northvale;
      engine.systems.inventory.addItem({
        id: "Gazua de Aço",
        type: "tool",
        durability: 100,
        maxDurability: 100,
      });
      engine.startLockpicking(world.interiors.doors(engine.state)[0]);
      engine.payload.pickAngle = engine.payload.targetAngle;
    });
    await mode("LOCKPICKING");
    await page.keyboard.down("Space");
    await mode("EXPLORATION");
    await page.keyboard.up("Space");
    await page.selectOption("#language", "EN");
    assert.equal(
      await page.evaluate(() => localStorage.getItem("northvale_lang")),
      "EN",
    );
    await page.setViewportSize({ width: 600, height: 900 });
    const ratio = await page.locator("#gameCanvas").evaluate((canvas) => {
      const rect = canvas.getBoundingClientRect();
      return rect.width / rect.height;
    });
    assert.ok(Math.abs(ratio - 1.6) < 0.001);
    await page.evaluate(() => {
      northvale.engine.state.interior = "motel";
      northvale.world.interiors.enter(northvale.engine.state, {
        fromStreet: true,
      });
      northvale.engine.act("abandon");
    });
    await mode("EPILOGUE");
    assert.equal(
      await page.evaluate(() => northvale.engine.state.ending.endingId),
      13,
    );
    await focus();
    await page.keyboard.press("Space");
    await mode("CREDITS");
    await page.waitForFunction(() => northvale.presentation.credits.canSkip);
    await page.keyboard.press("Escape");
    await mode("MAIN_MENU");
    await page.evaluate(() => northvale.engine.loadGame("autosave"));
    await mode("EPILOGUE");
    await fs.mkdir("test-results", { recursive: true });
    await page.screenshot({ path: "test-results/engine-epilogue.png" });
    await page.reload();
    await page.waitForFunction(() => window.northvale?.engine.running);
    assert.equal(
      await page.evaluate(() => document.documentElement.lang),
      "en",
    );
    assert.equal(
      await page.evaluate(() => northvale.presentation.menu.currentLang),
      "EN",
    );
    assert.equal(await page.evaluate(() => northvale.engine.running), true);
    assert.deepEqual(errors, []);
    assert.deepEqual(missing, []);
    await page.evaluate(() => northvale.destroy());
    assert.equal(await page.evaluate(() => window.northvale), undefined);
    console.log(
      "Engine smoke passed: all ten states, movement, 32 routines, real pin connection, dialogue/save/resume, lockpick, cassette, autosave, responsive pointer space, language persistence and cleanup.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
