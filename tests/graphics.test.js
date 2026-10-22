import test from 'node:test';
import assert from 'node:assert/strict';
import {TextureManager} from '../src/graphics/texture-manager.js';
import {pickProp,selectInteraction} from '../src/graphics/interaction.js';
import {pointContribution,contactOcclusion} from '../src/graphics/lighting.js';
import {validateDescriptor,materialManifest} from '../src/graphics/materials.js';
import {SpriteCache} from '../src/graphics/sprite-cache.js';
import {readSave} from '../src/storage.js';
import {createState,serialize} from '../src/state.js';

test('sprite cache maintains a hard byte budget and evicts least recently used props',()=>{const c=new SpriteCache(10);c.put('a',{bytes:4});c.put('b',{bytes:4});c.get('a');c.put('c',{bytes:4});assert.equal(c.get('b'),undefined);assert.ok(c.get('a'));assert.equal(c.bytes,8);c.put('large',{bytes:20});assert.ok(c.bytes<=10);});
test('title migration preserves and validates existing saves',()=>{const entries=new Map([['mercy-pines-save',serialize(createState())]]);const storage={getItem:key=>entries.get(key),setItem:(k,v)=>entries.set(k,v)};assert.deepEqual(readSave(storage),createState());assert.ok(entries.has('northvale-save'));assert.ok(entries.has('mercy-pines-save'));entries.set('northvale-save','bad');assert.throws(()=>readSave(storage));});

test('material leases deduplicate, protect pinned entries and evict LRU',async()=>{let loads=0;const disposed=[];const m=new TextureManager({budget:10,loader:async d=>{loads++;return {bytes:8,id:d.id};},dispose:v=>disposed.push(v.id)});const [a,b]=await Promise.all([m.acquire('a',{id:'a'}),m.acquire('a',{id:'a'})]);assert.equal(loads,1);a.release();a.release();const c=await m.acquire('c',{id:'c'});assert.equal(m.stats().pinned,2);assert.equal(m.stats().overBudget,true);b.release();assert.deepEqual(disposed,['a']);assert.equal(m.stats().bytes,8);c.release();m.destroy();assert.deepEqual(disposed,['a','c']);});
test('streaming limits concurrency and prioritizes visible assets',async()=>{let finish;const order=[];const m=new TextureManager({concurrency:1,loader:d=>{order.push(d);return d==='first'?new Promise(resolve=>finish=()=>resolve({bytes:1})):Promise.resolve({bytes:1});}});const a=m.acquire('a','first');const b=m.acquire('b','background',-1);const c=m.acquire('c','visible',10);await Promise.resolve();assert.deepEqual(order,['first']);finish();const leases=await Promise.all([a,b,c]);assert.deepEqual(order,['first','visible','background']);leases.forEach(l=>l.release());m.destroy();});
test('cancelled queued assets never load and failed loads can retry',async()=>{let finish;const order=[];let fail=true;const m=new TextureManager({concurrency:1,loader:async d=>{order.push(d);if(d==='first')return new Promise(resolve=>finish=resolve);if(d==='bad'&&fail)throw Error('network');return {bytes:1};}});const a=m.acquire('a','first'),b=m.acquire('b','unused');const rejected=assert.rejects(b,/cancelled/);b.cancel();await rejected;await Promise.resolve();finish({bytes:1});(await a).release();assert.deepEqual(order,['first']);await assert.rejects(m.acquire('bad','bad'),/network/);fail=false;(await m.acquire('bad','bad')).release();m.destroy();});
test('visual picking selects front object and interaction range is enforced',()=>{const a={id:'a',x:0,y:0,w:30,h:30,height:20,interactive:true},b={...a,id:'b',x:5,y:5};const project=(x,y,z=0)=>({x:(x-y)*.866,y:(x+y)*.5-z});assert.equal(pickProp([a,b],project(20,20,10),project).id,'b');assert.equal(selectInteraction([a,b],{x:500,y:500},a),null);assert.equal(selectInteraction([a,b],{x:50,y:40},a).id,'a');});
import {iso} from '../src/render.js';
import {RoofCutawaySystem} from '../src/graphics/roof-cutaway.js';

test('point lights attenuate with distance, AO is bounded and descriptors validate',()=>{const l={x:0,y:0,z:10,radius:100,intensity:2};assert.ok(pointContribution(l,0,0)>pointContribution(l,70,0));assert.equal(pointContribution(l,150,0),0);assert.ok(contactOcclusion(0,0,[{x:0,y:0,w:30,h:30,solid:true}])>0);assert.ok(contactOcclusion(0,0,Array(100).fill({x:0,y:0,w:30,h:30,solid:true}))<=.65);for(const d of Object.values(materialManifest.faces))assert.equal(validateDescriptor(d),d);assert.throws(()=>validateDescriptor({kind:'face',size:8192}));assert.throws(()=>validateDescriptor({kind:'face',size:256,maps:{base:'only.png'}}));});

test('2.5D isometric projection handles vertical height elevation z with precision',()=>{
  const ground = iso(100, 50, 0);
  const elevated = iso(100, 50, 40);
  assert.equal(ground.x, 660 + (100 - 50) * (Math.sqrt(3)/2));
  assert.equal(elevated.x, ground.x, 'Vertical elevation z does not affect horizontal axis');
  assert.equal(elevated.y, ground.y - 40, 'Vertical elevation z raises point upwards on Y axis by exact z');
});

test('dynamic Y-sorting orders renderQueue by (worldY + worldX) every frame',()=>{
  const queue = [
    {id: 'alex-in-front', worldX: 100, worldY: 120},
    {id: 'counter-prop', worldX: 100, worldY: 100},
    {id: 'tree-behind', worldX: 80, worldY: 90},
    {id: 'npc-middle', worldX: 95, worldY: 100}
  ];
  queue.sort((a, b) => (a.worldY + a.worldX) - (b.worldY + b.worldX));
  assert.deepEqual(queue.map(q => q.id), [
    'tree-behind',   // 80 + 90 = 170
    'npc-middle',     // 95 + 100 = 195
    'counter-prop',  // 100 + 100 = 200
    'alex-in-front'  // 100 + 120 = 220
  ]);
});

test('roof cutaway transitions smoothly to 0.0 inside building collision footprint over 250ms',()=>{
  const cutaway = new RoofCutawaySystem();
  const buildings = [{id: 'diner', x: 200, y: 300, w: 100, h: 80}];
  const player = {x: 250, y: 340}; // inside diner footprint
  assert.equal(cutaway.getAlpha('diner'), 1.0);
  
  // 125ms elapsed: alpha should be halfway (~0.5)
  cutaway.update(0.125, player, buildings, false);
  assert.ok(cutaway.getAlpha('diner') < 0.6 && cutaway.getAlpha('diner') > 0.4);

  // Another 125ms (total 250ms): alpha reaches 0.0
  cutaway.update(0.125, player, buildings, false);
  assert.equal(cutaway.getAlpha('diner'), 0.0);
});

test('roof cutaway fades back to 1.0 when player exits building footprint over 250ms',()=>{
  const cutaway = new RoofCutawaySystem();
  const buildings = [{id: 'diner', x: 200, y: 300, w: 100, h: 80}];
  const insidePlayer = {x: 250, y: 340};
  cutaway.update(0.25, insidePlayer, buildings, false);
  assert.equal(cutaway.getAlpha('diner'), 0.0);

  // Player steps outside
  const outsidePlayer = {x: 50, y: 50};
  cutaway.update(0.125, outsidePlayer, buildings, false);
  assert.ok(cutaway.getAlpha('diner') > 0.4 && cutaway.getAlpha('diner') < 0.6);

  cutaway.update(0.125, outsidePlayer, buildings, false);
  assert.equal(cutaway.getAlpha('diner'), 1.0);
});

