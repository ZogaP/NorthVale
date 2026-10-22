import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {InteriorManifestLoader,INTERIOR_IDS,validateManifest} from '../src/interiors/manifest-loader.js';
import {InteriorWorld} from '../src/interiors/interior-world.js';
import {SaveSystem,globalObjectId} from '../src/interiors/save-system.js';
import {dressRoom} from '../src/interiors/room-dressing.js';
import {createState,serialize,deserialize} from '../src/state.js';
import {buildings} from '../src/world.js';

const embedded={};
for(const id of INTERIOR_IDS)embedded[id]=JSON.parse(await readFile(new URL(`../assets/interiors/${id}.json`,import.meta.url),'utf8'));
async function fixture(building='sarah',room=null){const world=new InteriorWorld(new InteriorManifestLoader({embedded}));await world.ready;const state=createState();state.interior=building;world.enter(state,{fromStreet:true});if(room){state.interiorRoom=room;Object.assign(state.player,world.repairPosition(state,world.room(state).spawn));}return{world,state};}
function finishTransition(world,state){for(let i=0;i<10;i++)world.update(.05,state);assert.equal(world.transition,null);}
function atTarget(world,state,id,kind='prop'){const target=world.targets(state).find(t=>t.id===id&&t.kind===kind);assert.ok(target,id);Object.assign(state.player,world.repairPosition(state,target.approach||{x:target.x+target.w+18,y:target.y+target.h+10}));return target;}

test('15 exclusive JSON manifests define 42 connected rooms and distinct furniture arrangements',()=>{
 assert.deepEqual(new Set(buildings.map(b=>b.id)),new Set(INTERIOR_IDS),'every playable building has an authored manifest');
 const ids=new Set(),layouts=new Set();let rooms=0,details=0;
 for(const manifest of Object.values(embedded)){assert.equal(validateManifest(manifest),manifest);for(const room of manifest.rooms){rooms++;const layout=JSON.stringify(room.props.filter(p=>p.solid).map(p=>[p.type,p.x,p.y,p.w,p.h]));assert.ok(!layouts.has(layout),`${manifest.id}/${room.id} repeats a layout`);layouts.add(layout);const dressing=dressRoom(manifest.id,room);assert.deepEqual(dressing,dressRoom(manifest.id,room));assert.ok(dressing.filter(d=>d.type==='calendar').length<=1);details+=dressing.length;for(const p of [...room.props,...dressing]){const id=globalObjectId(manifest.id,room.id,p.id);assert.ok(!ids.has(id));ids.add(id);}}}
 assert.equal(rooms,42);assert.ok(details>2000);assert.notEqual(embedded.sarah.profile,embedded.ruth.profile);
});

test('loader validates room graph and does not substitute a generic interior on missing or corrupt JSON',async()=>{
 const broken=structuredClone(embedded.sarah);broken.doors.pop();assert.throws(()=>validateManifest(broken),/desconectados/);
 const duplicate=structuredClone(embedded.sarah);duplicate.rooms[0].props.push(duplicate.rooms[0].props[0]);assert.throws(()=>validateManifest(duplicate),/Prop inválido/);
 const loader=new InteriorManifestLoader({fetcher:async()=>({ok:false,status:404}),embedded:{}});await assert.rejects(loader.load(),/carregar/);assert.equal(loader.manifests.size,0);
 const keyed=structuredClone(embedded.sarah);keyed.doors[0].a.offset=0;assert.throws(()=>validateManifest(keyed),/fora da parede/);
});

test('all interactive targets in every authored room have walkable approaches without crossing furniture',async()=>{
 const{world,state}=await fixture();let reached=0;
 for(const manifest of Object.values(embedded))for(const room of manifest.rooms){state.interior=manifest.id;state.interiorRoom=room.id;for(const target of world.targets(state)){
  Object.assign(state.player,world.repairPosition(state,room.spawn),{vx:0,vy:0});world.navigation=null;
  const result=world.navigate(state,target);assert.equal(result.ok,true,`${manifest.id}/${room.id}/${target.id}`);let arrived=result.arrived;
  for(let step=0;world.navigation&&step<1800;step++){arrived=world.update(.04,state)||arrived;assert.equal(world.blocked(state,state.player.x,state.player.y,8),false,`${manifest.id}/${room.id}: crossed furniture`);}
  assert.ok(arrived,`${manifest.id}/${room.id}/${target.id}: navigation stalled`);reached++;
 }}assert.ok(reached>250);
});

test('Sarah route follows living -> kitchen -> hall -> locked bedroom and requires the actual room key',async()=>{
 const{world,state}=await fixture();let target=atTarget(world,state,'living-kitchen','door');assert.ok(world.useDoor(state,target).ok);assert.equal(state.interiorRoom,'living');finishTransition(world,state);assert.equal(state.interiorRoom,'kitchen');
 target=atTarget(world,state,'pantry');assert.ok(world.interact(state,target).ok);assert.ok(state.inventory.includes('Chave do quarto de Sarah'));
 target=atTarget(world,state,'kitchen-hall','door');world.useDoor(state,target);finishTransition(world,state);assert.equal(state.interiorRoom,'hall');
 target=atTarget(world,state,'hall-bedroom','door');state.inventory=state.inventory.filter(k=>k!=='Chave do quarto de Sarah');const oldPosition={...state.player};assert.equal(world.useDoor(state,target).ok,false);assert.deepEqual(state.player,oldPosition);assert.equal(world.transition,null);
 state.inventory.push('Chave do quarto de Sarah');assert.equal(world.useDoor(state,target).ok,true);finishTransition(world,state);assert.equal(state.interiorRoom,'bedroom');assert.equal(world.blocked(state,state.player.x,state.player.y),false);
 const recorder=atTarget(world,state,'recorder');assert.equal(world.interact(state,recorder).evidence,'tape');
});

test('door collision, close/lock and latch-from-inside share one persisted state across both sides',async()=>{
 const{world,state}=await fixture('sarah','hall');let target=atTarget(world,state,'hall-bedroom','door');assert.equal(world.blocked(state,target.anchor.x,target.anchor.y),true);state.inventory.push('Chave do quarto de Sarah');world.useDoor(state,target);finishTransition(world,state);
 target=world.doors(state).find(d=>d.id==='hall-bedroom');assert.equal(target.isOpen,true);assert.equal(world.doorAction(state,target,'lock').ok,true);assert.equal(world.doors(state).find(d=>d.id===target.id).isLocked,true);
 state.inventory=state.inventory.filter(k=>k!=='Chave do quarto de Sarah');assert.equal(world.useDoor(state,world.doors(state).find(d=>d.id===target.id)).ok,true,'inside latch can be released without a key');finishTransition(world,state);assert.equal(state.interiorRoom,'hall');
 target=world.doors(state).find(d=>d.id==='hall-bedroom');Object.assign(state.player,target.anchor);assert.equal(world.doorAction(state,target,'close').ok,false,'cannot shut a leaf on the player');
});

test('drawers, lights, door locks and room identity survive SaveSystem roundtrip without cross-building leakage',async()=>{
 const{world,state}=await fixture('sarah','kitchen');const pantry=atTarget(world,state,'pantry');world.interact(state,pantry);const opened=world.save(state).read(pantry.globalId);assert.equal(opened.isOpen,true);
 const lightSwitch=atTarget(world,state,'switch');world.interact(state,lightSwitch);assert.equal(world.lights(state).some(l=>l.kind!=='moon'),false);
 const storage=new Map(),adapter={setItem:(k,v)=>storage.set(k,v),getItem:k=>storage.get(k)};new SaveSystem(state).save(adapter);const loaded=SaveSystem.load(adapter);assert.deepEqual(loaded,state);world.enter(loaded);assert.equal(loaded.interiorRoom,'kitchen');assert.equal(world.save(loaded).read(pantry.globalId).isOpen,true);assert.equal(world.lights(loaded).filter(l=>l.kind!=='moon').length,0);
 loaded.interior='pharmacy';loaded.interiorRoom='office';assert.equal(world.save(loaded).read(globalObjectId('pharmacy','office','pantry')).isOpen,undefined);
 const old=createState();delete old.interiorStates;delete old.interiorRoom;assert.deepEqual(deserialize(serialize(old)).interiorStates,{});
 const damaged=createState();damaged.interiorStates[pantry.globalId]={isOpen:'yes'};assert.throws(()=>deserialize(serialize(damaged)),/Estado/);
});

test('all non-entrance rooms have no street exit; loading a blocked old position repairs it safely',async()=>{
 const{world,state}=await fixture('police','archive');assert.equal(world.targets(state).some(t=>t.kind==='exit'),false);state.player={x:40,y:50,vx:0,vy:0,angle:0};world.enter(state);assert.equal(world.blocked(state,state.player.x,state.player.y),false);assert.equal(state.player.vx,0);
});
