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
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    await context.setOffline(true);
    const page = await context.newPage(),
      errors = [],
      requests = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => requests.push(request.url()));
    await page.setContent(await fs.readFile("dist/NorthVale.html", "utf8"));
    await page.waitForFunction(() => window.northvale?.engine.running);
    await page.click("#begin");
    await page.keyboard.press("Space");
    await page.waitForFunction(() => northvale.engine.mode === "EXPLORATION");
    await page.keyboard.press("e");
    await page.waitForFunction(
      () => northvale.engine.state.interior === "police",
    );
    assert.equal(
      await page.evaluate(
        () => Object.keys(globalThis.NORTHVALE_INTERIORS).length,
      ),
      15,
    );
    assert.equal(await page.evaluate(() => northvale.world.npcs.length), 32);
    await page.keyboard.press("c");
    await page.waitForFunction(() => northvale.engine.mode === "CORKBOARD");
    await page.keyboard.press("Escape");
    await page.keyboard.press("Tab");
    assert.equal(
      await page.evaluate(() => northvale.engine.overlay),
      "journal",
    );
    await page.keyboard.press("Escape");
    assert.equal(await page.evaluate(() => northvale.engine.running), true);
    assert.equal(await page.locator("[data-online-only]").isVisible(), false);
    assert.deepEqual(requests, []);
    assert.deepEqual(errors, []);
    console.log(
      "Offline engine passed: 15 embedded manifests, 32 routines, Gemini UI, police entry, corkboard and journal, zero network requests.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
