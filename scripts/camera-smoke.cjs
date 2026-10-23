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
      deviceScaleFactor: 2,
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(process.env.NORTHVALE_URL || "http://127.0.0.1:5173");
    await page.waitForFunction(() => window.northvale?.engine.running);
    await page.click("#begin");
    await page.keyboard.press("Space");
    await page.waitForFunction(() => northvale.engine.mode === "EXPLORATION");
    const framing = await page.evaluate(() => {
      const { engine, presentation } = northvale;
      engine.stop();
      presentation.update(0, engine);
      const camera = presentation.cameraSystem,
        sheet = presentation.interiorRenderer.townActors.alex;
      const original = sheet.draw;
      let measured;
      sheet.draw = function (ctx, direction, frame, x, y, options) {
        const m = ctx.getTransform(),
          dpr = engine.viewport.pixelRatio;
        measured = {
          height:
            (this.frameHeight * options.scale * Math.hypot(m.c, m.d)) / dpr,
          x: (m.a * x + m.c * y + m.e) / dpr,
          y: (m.b * x + m.d * y + m.f) / dpr,
        };
        return original.call(this, ctx, direction, frame, x, y, options);
      };
      engine.render();
      sheet.draw = original;
      const expected = camera.worldToScreen(
        engine.state.player.x,
        engine.state.player.y,
      );
      const matrix = presentation.ctx.getTransform();
      return {
        zoom: camera.zoom,
        ratio: measured.height / engine.viewport.height,
        error: Math.hypot(measured.x - expected.x, measured.y - expected.y),
        matrix: [matrix.a, matrix.d, matrix.e, matrix.f],
        dpr: engine.viewport.pixelRatio,
      };
    });
    assert.equal(framing.zoom, 1.9);
    assert.ok(framing.ratio >= 0.15 && framing.ratio <= 0.18);
    assert.ok(
      framing.error < 1e-8,
      "the rendered avatar must match the camera transform",
    );
    assert.deepEqual(
      framing.matrix,
      [framing.dpr, framing.dpr, 0, 0],
      "world scale cannot leak into the HUD",
    );
    await fs.mkdir("test-results", { recursive: true });
    await page.screenshot({ path: "test-results/camera-exterior.png" });
    await page.mouse.move(720, 500);
    await page.mouse.wheel(0, -1000);
    await page.waitForFunction(
      () => northvale.presentation.cameraSystem.targetZoom > 1.9,
    );
    const wheel = await page.evaluate(() => {
      const { engine, presentation } = northvale,
        camera = presentation.cameraSystem;
      const before = camera.zoom,
        target = camera.targetZoom;
      for (let i = 0; i < 60; i++) engine.update(1 / 60);
      engine.render();
      return { before, target, after: camera.zoom };
    });
    assert.equal(wheel.before, 1.9);
    assert.equal(wheel.target, 2.6);
    assert.ok(wheel.after > 2.59 && wheel.after <= 2.6);
    await page.evaluate(() => northvale.engine.openOverlay("journal"));
    const blocked = await page.evaluate(() => {
      const camera = northvale.presentation.cameraSystem,
        before = camera.targetZoom;
      const event = new WheelEvent("wheel", {
        deltaY: 200,
        bubbles: true,
        cancelable: true,
      });
      document.querySelector("#gameCanvas").dispatchEvent(event);
      northvale.engine.closeOverlay();
      northvale.engine.setPaused(true);
      document.querySelector("#gameCanvas").dispatchEvent(event);
      northvale.engine.setPaused(false);
      return before === camera.targetZoom;
    });
    assert.equal(blocked, true);
    await page.keyboard.down("d");
    const lead = await page.evaluate(() => {
      for (let i = 0; i < 30; i++) northvale.engine.update(1 / 60);
      const p = northvale.presentation.cameraSystem.offset;
      return Math.hypot(p.x, p.y);
    });
    await page.keyboard.up("d");
    assert.ok(Math.abs(lead - 40) < 1e-8);
    // Actual DOM clicks select an authored object at all zoom limits and after CSS resizing.
    for (const zoom of [1.2, 1.9, 2.6]) {
      if (zoom === 2.6) {
        await page.setViewportSize({ width: 600, height: 900 });
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      }
      const click = await page.evaluate((zoom) => {
        const { engine, world, presentation } = northvale,
          state = engine.state;
        state.interior = "sarah";
        world.interiors.enter(state, { fromStreet: true });
        const chair = world.interiors
          .room(state)
          .props.find((p) => p.id === "armchair");
        Object.assign(
          state.player,
          world.interiors.repairPosition(state, {
            x: chair.x + chair.w + 28,
            y: chair.y + chair.h + 20,
          }),
          { vx: 0, vy: 0 },
        );
        presentation.cameraNeedsReset = true;
        presentation.cameraSystem.setZoom(zoom, { immediate: true });
        presentation.update(0.3, engine);
        engine.render();
        const point = presentation.cameraSystem.worldToScreen(
          chair.x + chair.w * 0.5,
          chair.y + chair.h * 0.8,
          chair.height * 0.8,
        );
        const selected = presentation.interiorRenderer.interiorView.pick(
          point,
          state,
        );
        const r = document.querySelector("#gameCanvas").getBoundingClientRect();
        return {
          id: selected?.id,
          x: r.left + (point.x * r.width) / engine.viewport.width,
          y: r.top + (point.y * r.height) / engine.viewport.height,
        };
      }, zoom);
      assert.equal(
        click.id,
        "armchair",
        "visible polygon picking follows the zoom transform",
      );
      await page.mouse.click(click.x, click.y);
      assert.equal(
        await page.evaluate(() => northvale.engine.mode),
        "INSPECTION",
      );
      assert.equal(
        await page.evaluate(() => northvale.engine.payload.title),
        "Poltrona da mãe",
      );
      const modalBlocked = await page.evaluate(() => {
        const camera = northvale.presentation.cameraSystem,
          before = camera.targetZoom;
        document
          .querySelector("#gameCanvas")
          .dispatchEvent(
            new WheelEvent("wheel", {
              deltaY: -500,
              bubbles: true,
              cancelable: true,
            }),
          );
        return before === camera.targetZoom;
      });
      assert.equal(modalBlocked, true);
      await page.keyboard.press("Escape");
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.evaluate(() => {
      const { engine, presentation } = northvale;
      presentation.cameraSystem.setZoom(1.9, { immediate: true });
      presentation.update(0, engine);
      engine.render();
    });
    await page.screenshot({ path: "test-results/camera-interior.png" });
    const cleaned = await page.evaluate(() => {
      const camera = northvale.presentation.cameraSystem,
        before = camera.targetZoom;
      northvale.destroy();
      document
        .querySelector("#gameCanvas")
        .dispatchEvent(
          new WheelEvent("wheel", {
            deltaY: 200,
            bubbles: true,
            cancelable: true,
          }),
        );
      return before === camera.targetZoom;
    });
    assert.equal(cleaned, true);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ framing, wheel, lookAhead: lead }));
    console.log(
      "Camera smoke passed: framing, actual wheel, world/HUD transform separation, look-ahead, three zoom levels, resized object clicks and listener cleanup.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
