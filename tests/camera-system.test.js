import test from "node:test";
import assert from "node:assert/strict";
import { CameraSystem } from "../src/engine/CameraSystem.js";
import { visibleWorldSector } from "../src/engine/WorldEntities.js";

const near = (a, b, tolerance = 1e-9) =>
  assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);

test("camera defaults are bounded and projection pivots exactly at the viewport centre", () => {
  const camera = new CameraSystem();
  assert.equal(camera.zoom, 1.9);
  assert.equal(camera.minZoom, 1.2);
  assert.equal(camera.maxZoom, 2.6);
  assert.equal(camera.trackingSpeed, 4.5);
  camera.snapTo({ x: 720, y: 705 });
  for (const zoom of [1.2, 1.9, 2.6]) {
    camera.setZoom(zoom, { immediate: true });
    assert.deepEqual(camera.worldToScreen(720, 705), { x: 720, y: 450 });
    const point = camera.worldToScreen(730, 705, 5);
    near(point.x, 720 + 10 * zoom);
    near(point.y, 450);
  }
});

test("world/screen transforms roundtrip at every zoom, Z plane, projection, resize and base scale", () => {
  for (const projectionX of [1, Math.sqrt(3) / 2])
    for (const baseScale of [1, 900 / 640]) {
      const camera = new CameraSystem({ projectionX, baseScale });
      camera.snapTo({ x: 340.5, y: -111.3 });
      for (const zoom of [1.2, 1.9, 2.6])
        for (const [width, height] of [
          [1440, 900],
          [600, 900],
          [2560, 1440],
        ]) {
          camera.resize(width, height);
          camera.setZoom(zoom, { immediate: true });
          for (const z of [0, 20, 56]) {
            const point = { x: 431.8, y: 625.5 };
            const screen = camera.worldToScreen(point.x, point.y, z),
              world = camera.screenToWorld(screen.x, screen.y, z);
            near(point.x, world.x);
            near(point.y, world.y);
            const matrix = camera.getTransform(2),
              iso = camera.project(point.x, point.y, z);
            near(iso.x * matrix[0] + matrix[4], screen.x * 2);
            near(iso.y * matrix[3] + matrix[5], screen.y * 2);
          }
        }
    }
});

test("exponential tracking converges equally at 30, 60 and 144 FPS without overshooting", () => {
  for (const fps of [30, 60, 144]) {
    const camera = new CameraSystem({ lookAheadDistance: 0 });
    for (let frame = 0; frame < fps; frame++)
      camera.update(1 / fps, { x: 200, y: 100 });
    near(camera.x, 100 * (1 - Math.exp(-4.5)));
    near(camera.y, 150 * (1 - Math.exp(-4.5)));
    assert.ok(camera.x > 0 && camera.x < 100);
    const before = camera.getTransform();
    camera.update(0, { x: -200, y: -100 });
    assert.deepEqual(camera.getTransform(), before);
  }
});

test("look-ahead is 40 world units in all walking directions and can follow an aiming vector", () => {
  for (const [vx, vy] of [
    [1, 0],
    [0, -100],
    [25, 25],
  ]) {
    const camera = new CameraSystem();
    camera.update(0.1, { x: 0, y: 0, vx, vy });
    near(Math.hypot(camera.offset.x, camera.offset.y), 40);
  }
  const camera = new CameraSystem();
  camera.update(0.1, { x: 0, y: 0, vx: 1 }, { aimDirection: { x: 0, y: -1 } });
  assert.deepEqual(camera.offset, { x: 0, y: -40 });
  camera.update(0.1, { x: 0, y: 0 }, { lookAhead: false });
  assert.deepEqual(camera.offset, { x: 0, y: 0 });
});

test("wheel normalizes pixel/line/page deltas and interpolates zoom within limits", () => {
  const pixel = new CameraSystem(),
    line = new CameraSystem(),
    page = new CameraSystem();
  pixel.handleWheel({ deltaY: -16 });
  line.handleWheel({ deltaY: -1, deltaMode: 1 });
  page.handleWheel({ deltaY: -16 / 900, deltaMode: 2 });
  near(pixel.targetZoom, line.targetZoom);
  near(line.targetZoom, page.targetZoom);
  assert.equal(
    pixel.zoom,
    1.9,
    "wheel changes the target without an abrupt jump",
  );
  pixel.update(0.1, { x: 0, y: 0 });
  assert.ok(pixel.zoom > 1.9 && pixel.zoom < pixel.targetZoom);
  for (const delta of [-1000, 1000]) {
    for (let i = 0; i < 50; i++) pixel.handleWheel({ deltaY: delta });
    assert.equal(pixel.targetZoom, delta < 0 ? 2.6 : 1.2);
    for (let i = 0; i < 20; i++) {
      pixel.update(0.1, { x: 0, y: 0 });
      assert.ok(pixel.zoom >= 1.2 && pixel.zoom <= 2.6);
    }
  }
  assert.equal(pixel.handleWheel({ deltaY: 0 }), false);
});

test("projection switches preserve the world centre; navigation culling shrinks with zoom", () => {
  const camera = new CameraSystem();
  camera.snapTo({ x: 350, y: 450 });
  camera.setProjection(Math.sqrt(3) / 2);
  near(camera.screenToWorld(720, 450).x, 350);
  near(camera.screenToWorld(720, 450).y, 450);
  camera.setZoom(1.2, { immediate: true });
  const broad = visibleWorldSector(camera, camera);
  camera.setZoom(2.6, { immediate: true });
  const narrow = visibleWorldSector(camera, camera);
  assert.ok(narrow.maxX - narrow.minX < broad.maxX - broad.minX);
  assert.ok(narrow.maxY - narrow.minY < broad.maxY - broad.minY);
});

test("camera rejects malformed inputs and clamps hidden-tab dt spikes", () => {
  assert.throws(() => new CameraSystem({ minZoom: 3, maxZoom: 2 }));
  assert.throws(() => new CameraSystem({ baseScale: 0 }));
  const spike = new CameraSystem(),
    normal = new CameraSystem();
  spike.update(600, { x: 100, y: 200 });
  normal.update(0.1, { x: 100, y: 200 });
  assert.deepEqual(spike.getTransform(), normal.getTransform());
  assert.throws(() => spike.update(-1, { x: 0, y: 0 }));
  assert.throws(() => spike.screenToWorld(Infinity, 0));
  assert.throws(() => spike.setZoom(NaN));
  assert.throws(() => spike.handleWheel({ deltaY: 1, deltaMode: 3 }));
});

test("reference framing keeps the current 56-unit Alex at 16.625% without changing physical size", () => {
  for (const height of [600, 900, 1440]) {
    const camera = new CameraSystem({ height, baseScale: height / 640 });
    const feet = camera.worldToScreen(0, 0),
      head = camera.worldToScreen(0, 0, 56);
    near((feet.y - head.y) / height, 0.16625);
  }
});
