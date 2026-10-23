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
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.setDefaultTimeout(12000);
    await page.goto(process.env.NORTHVALE_URL || "http://127.0.0.1:5173/legacy.html");
    await page.click("#begin");
    await page.keyboard.press("Space");
    await page.click("#save");
    const read = () =>
      page.evaluate(() => JSON.parse(localStorage.getItem("northvale-save")));
    assert.equal((await read()).case.culpritId, "bobby");
    await page.click("#controls-btn");
    await page
      .locator('[data-bind-action="MOVE_RIGHT"][data-slot="primary"]')
      .focus();
    await page.keyboard.press("r");
    assert.equal(
      await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("northvale_keymap")).MOVE_RIGHT
            .primary,
      ),
      "KeyR",
    );
    await page.click("#close");
    const before = (await read()).player.x;
    await page.keyboard.down("r");
    await page.waitForTimeout(400);
    await page.keyboard.up("r");
    await page.click("#save");
    assert.ok(
      (await read()).player.x > before,
      "rebound movement is active in actual game",
    );
    async function place(building, room, objectId, minute = 600) {
      const data = await page.evaluate(
        async ({ building, room, objectId, minute }) => {
          const s = JSON.parse(localStorage.getItem("northvale-save"));
          const { InteriorWorld } = await import(
              "/src/interiors/interior-world.js"
            ),
            world = new InteriorWorld();
          await world.ready;
          // The runtime loader owns metric scaling and surface-child placement.
          const r = world.loader.get(building).rooms.find(r => r.id === room),
            object = objectId ? r.props.find(o => o.id === objectId) : null;
          s.interior = building;
          s.interiorRoom = room;
          s.minute = minute;
          s.outdoor ??= { x: 720, y: 705 };
          const point = world.repairPosition(
            s,
            object
              ? { x: object.x + object.w / 2, y: object.y + object.h + 22 }
              : r.spawn,
          );
          s.player = { ...point, vx: 0, vy: 0, angle: 0 };
          localStorage.setItem("northvale-save", JSON.stringify(s));
          return { room: r, object };
        },
        { building, room, objectId, minute },
      );
      await page.click("#load");
      await page.waitForFunction(
        (id) => document.querySelector("#room-hud").dataset.room === id,
        room,
      );
      await page.waitForTimeout(120);
      return data;
    }
    async function collectObject(building, room, id, evidence) {
      const data = await place(building, room, id);
      let found = false;
      for (const [u, v] of [
        [0.5, 0.7],
        [0.15, 0.85],
        [0.85, 0.85],
        [0.2, 0.2],
        [0.8, 0.2],
      ]) {
        const point = await page.evaluate(
          ({ room: r, object: o, u, v }) => {
            const w = r.bounds.w,
              h = r.bounds.h,
              k = Math.sqrt(3) / 2,
              scale = Math.min(
                1.85,
                (innerWidth - 210) / ((w + h) * k + 180),
                (innerHeight - 210) / ((w + h) * 0.5 + 170),
              ),
              x = o.x + o.w * u,
              y = o.y + o.h * v,
              z = (o.baseZ || 0) + (o.height || 2) * 0.8;
            return {
              x: innerWidth * 0.5 + ((x - y) * k - ((w - h) * k) / 2) * scale,
              y:
                innerHeight * 0.56 +
                ((x + y) * 0.5 - z - (w + h) * 0.25) * scale,
            };
          },
          { ...data, u, v },
        );
        await page.mouse.move(point.x, point.y);
        await page.waitForTimeout(70);
        if (
          (await page.locator("#prompt").innerText()).includes(data.object.name)
        ) {
          found = true;
          break;
        }
      }
      assert.ok(found, "visible interaction area for " + id);
      await page.keyboard.press("e");
      await page.waitForTimeout(120);
      assert.ok(
        (await read()).evidence.includes(evidence),
        "actual prop collects " + evidence,
      );
      if (await page.locator("#dialogue").isVisible())
        await page.keyboard.press("Escape");
      if (await page.locator("#panel").isVisible()) await page.click("#close");
    }
    await collectObject("sarah", "bedroom", "letter", "letter");
    // The police reception is the authored procedural room from the current JSON.
    const report = await page.evaluate(async () => {
      const d = await (await fetch("/assets/interiors/police.json")).json();
      return d.rooms.find((r) => r.props.some((o) => o.evidence === "report"))
        .id;
    });
    await collectObject("police", report, "report", "report");
    const anchors = await page.evaluate(async () => {
      const { CANONICAL_CLUES } = await import(
        "/src/systems/CanonicalCampaign.js"
      );
      return Object.entries(CANONICAL_CLUES).filter(([, c]) => c.interiorId);
    });
    for (const [id, c] of anchors)
      await collectObject(c.interiorId, c.roomId, c.propId, id);
    for (const [npc, building, room, minute] of [
      ["sam", "scrapyard", "workshop", 600],
      ["owen", "depot", "warehouse", 600],
      ["clara", "registry", "public", 870],
      ["elias", "pharmacy", "retail", 600],
    ]) {
      await place(building, room, null, minute);
      await page.click("#accuse-btn");
      await page.locator(`[data-favor="${npc}"]`).click();
      await page.click("#close");
    }
    assert.ok((await read()).inventory.includes("Gazua de Aço"));
    assert.equal((await read()).quests.SIDE_CLARA_ARCHIVES.status, "COMPLETED");
    assert.equal((await read()).PROOF_WEIGHT, 10);
    await page.click("#corkboard-btn");
    for (const [a, b] of [
      ["viatura04", "owen_confession"],
      ["owen_confession", "bobby_trace"],
    ]) {
      await page.locator("#cork-card-" + a + " .cork-pin").click();
      await page.locator("#cork-card-" + b + " .cork-pin").click();
    }
    assert.ok(
      (await read()).PLAYER_DECISION_FLAGS.includes("CORRECT_DEDUCTION"),
    );
    await fs.mkdir("test-results", { recursive: true });
    await page.waitForFunction(()=>{const c=document.querySelector('#corkboard-canvas');if(!c||!c.width||!c.height)return false;const pixels=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let red=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]>150&&pixels[i+1]<70&&pixels[i+2]<70&&pixels[i+3]>0)red++;return red>50;});
    await page.screenshot({ path: "test-results/canonical-corkboard.png" });
    await page.click("#corkboard-close");
    await place("scrapyard", "workshop", null, 600);
    await page.click("#accuse-btn");
    await page.locator('[data-interrogate="bobby"]').click();
    await page.click("#btn-confront-evidence");
    await page
      .locator(".evidence-item-btn")
      .filter({ hasText: "Registro da viatura" })
      .click();
    await page.keyboard.press("Escape");
    await page.click("#save");
    assert.ok(
      (await read()).PLAYER_DECISION_FLAGS.includes("BOBBY_CONFRONTED"),
    );
    await place("dam", "turbines", null, 600);
    await page.click("#accuse-btn");
    await page.locator('[data-campaign-action="rescue"]').click();
    assert.equal((await read()).SARAH_STATUS, 1);
    assert.equal(
      (await read()).quests.MAIN_SARAH_DISAPPEARANCE.status,
      "COMPLETED",
    );
    await page.click("#close");
    await place("depot", "office", null, 600);
    await page.click("#accuse-btn");
    await page.locator('[data-campaign-action="train"]').click();
    assert.equal((await read()).ending.endingId, 1);
    assert.equal((await read()).worldControlsLocked, true);
    assert.match(
      await page.locator("#content").innerText(),
      /Redenção Analógica/,
    );
    await fs.mkdir("test-results", { recursive: true });
    await page.screenshot({ path: "test-results/canonical-ending.png" });
    await page.click("#close");
    const position = (await read()).player.x;
    await page.keyboard.down("r");
    await page.waitForTimeout(200);
    await page.keyboard.up("r");
    await page.click("#save");
    assert.equal((await read()).player.x, position);
    await page.click("#load");
    assert.match(
      await page.locator("#content").innerText(),
      /Redenção Analógica/,
    );
    assert.deepEqual(errors, []);
    console.log(
      "Canonical smoke passed: rebound movement, ten physical clue searches, four NPC favors, confrontation, live rescue, train ending, persistent world lock and no page errors.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
