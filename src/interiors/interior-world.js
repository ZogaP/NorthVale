import {InteriorManifestLoader} from './manifest-loader.js';
import {SaveSystem,globalObjectId} from './save-system.js';
import {portalGeometry,doorPort,boundsPolygon,distanceToBox,circleHits} from './room-geometry.js';
import {IsoCollisionMap} from '../scenes/isometric-collision.js';
import {POLICE_OBSTACLES,POLICE_WALKABLE} from '../scenes/police-station.js';

export class InternalDoor{
 constructor(building,definition){this.definition=definition;this.id=globalObjectId(building,'doors',definition.id);}
 state(save){return save.read(this.id,{isOpen:this.definition.isOpen,isLocked:this.definition.isLocked});}
 open(save,inventory,from){const current=this.state(save);if(current.isLocked&&!inventory.includes(this.definition.requiresKey)&&this.definition.latchFrom!==from)return{ok:false,message:`Trancada. Requer: ${this.definition.requiresKey||'autorização'}.`};save.interact(this.id,{isOpen:true,isLocked:false});return{ok:true};}
 close(save,player,geometry){if(circleHits(player,geometry,14))return{ok:false,message:'Afaste-se da folha da porta para fechá-la.'};save.interact(this.id,{isOpen:false});return{ok:true,message:'Porta fechada.'};}
 lock(save,player,geometry,from,inventory){const current=this.state(save);if(current.isLocked){if(this.definition.requiresKey&&!inventory.includes(this.definition.requiresKey)&&this.definition.latchFrom!==from)return{ok:false,message:'Você não tem a chave desta porta.'};save.interact(this.id,{isLocked:false});return{ok:true,message:'Porta destrancada.'};}if(this.definition.requiresKey&&!inventory.includes(this.definition.requiresKey)&&this.definition.latchFrom!==from)return{ok:false,message:'Você não tem a chave desta porta.'};const closed=this.close(save,player,geometry);if(!closed.ok)return closed;save.patch(this.id,{isLocked:true});return{ok:true,message:'Porta trancada por dentro.'};}
}

export class InteriorWorld{
 constructor(loader=new InteriorManifestLoader()){
  this.loader=loader;this.loaded=false;this.error=null;this.transition=null;this.navigation=null;this.collisionCache=new Map();this.doorCache=new Map();
  this.ready=loader.load().then(()=>{this.loaded=true;return this;}).catch(error=>{this.error=error;throw error;});
 }
 manifest(state){return this.loader.get(state.interior);}
 room(state){const manifest=this.manifest(state);return manifest.rooms.find(r=>r.id===state.interiorRoom)||manifest.rooms.find(r=>r.id===manifest.entranceRoom);}
 save(state){return new SaveSystem(state);}
 objectId(state,object){return globalObjectId(state.interior,this.room(state).id,object.id);}
 door(state,definition){const id=globalObjectId(state.interior,'doors',definition.id);if(!this.doorCache.has(id))this.doorCache.set(id,new InternalDoor(state.interior,definition));return this.doorCache.get(id);}
 collision(state){const room=this.room(state),key=`${state.interior}:${room.id}`;if(!this.collisionCache.has(key)){
  const walkable=room.background==='painted-police'?POLICE_WALKABLE:[{x:12,y:12},{x:room.bounds.w-12,y:12},{x:room.bounds.w-12,y:room.bounds.h-12},{x:12,y:room.bounds.h-12}];
  const obstacles=room.background==='painted-police'?POLICE_OBSTACLES:room.props.filter(o=>o.solid).map(o=>({id:o.id,points:boundsPolygon(o)}));
  this.collisionCache.set(key,new IsoCollisionMap({width:room.bounds.w,height:room.bounds.h,tileSize:16,walkable,obstacles}));
 }return this.collisionCache.get(key);}
 doors(state){const room=this.room(state);return this.manifest(state).doors.filter(d=>d.a.room===room.id||d.b.room===room.id).map(definition=>{const door=this.door(state,definition),port=doorPort(definition,room),geometry=portalGeometry(port,room);const other=definition.a.room===room.id?definition.b.room:definition.a.room,name=this.manifest(state).rooms.find(r=>r.id===other).name;return{kind:'door',id:definition.id,globalId:door.id,name,definition,door,port,geometry,...geometry,...door.state(this.save(state)),range:98};});}
 blocked(state,x,y,radius=10){return this.collision(state).blocked(x,y,radius)||this.doors(state).some(d=>!d.isOpen&&circleHits({x,y},d.geometry,radius));}
 repairPosition(state,desired){if(!this.blocked(state,desired.x,desired.y))return desired;const room=this.room(state);let best=null,distance=Infinity;for(let y=32;y<room.bounds.h-20;y+=16)for(let x=32;x<room.bounds.w-20;x+=16){const d=Math.hypot(x-desired.x,y-desired.y);if(d<distance&&!this.blocked(state,x,y)){best={x,y};distance=d;}}if(!best)throw Error(`Nenhuma posição livre em ${state.interior}/${room.id}`);return best;}
 enter(state,{fromStreet=false}={}){
  this.transition=null;this.navigation=null;const manifest=this.manifest(state);
  if(fromStreet||!manifest.rooms.some(r=>r.id===state.interiorRoom))state.interiorRoom=manifest.entranceRoom;
  const room=this.room(state),point=this.repairPosition(state,fromStreet?room.spawn:state.player);Object.assign(state.player,point,{vx:0,vy:0});
  const key=globalObjectId(state.interior,room.id,'visit');this.save(state).patch(key,{visited:true});return room;
 }
 targets(state){const room=this.room(state),manifest=this.manifest(state),list=room.props.filter(o=>o.interactive!==false).map(object=>({kind:'prop',id:object.id,name:object.name,object,globalId:this.objectId(state,object),x:object.x,y:object.y,w:object.w,h:object.h,range:object.range||78,approach:object.approach}));list.push(...this.doors(state));if(manifest.exit.room===room.id)list.push({kind:'exit',id:'exit',name:state.interior==='police'?'Sair da delegacia':'Sair para a rua',...manifest.exit,x:manifest.exit.x-manifest.exit.w/2,y:manifest.exit.y-manifest.exit.h/2,anchor:{x:manifest.exit.x,y:manifest.exit.y},range:manifest.exit.range||65});return list;}
 distance(state,target){return target.kind==='door'?Math.hypot(state.player.x-target.approach.x,state.player.y-target.approach.y):distanceToBox(state.player,target);}
 nearby(state,hovered=null){const targets=this.targets(state);if(hovered){const candidate=targets.find(t=>t.kind===hovered.kind&&t.id===hovered.id);if(candidate&&this.distance(state,candidate)<=candidate.range)return candidate;}return targets.filter(t=>this.distance(state,t)<=t.range).sort((a,b)=>this.distance(state,a)-this.distance(state,b))[0]||null;}
 useDoor(state,target){
  if(this.transition)return{ok:false};if(this.distance(state,target)>target.range)return{ok:false,message:'Aproxime-se da porta.'};
  const result=target.door.open(this.save(state),state.inventory,this.room(state).id);if(!result.ok)return result;
  const definition=target.definition,other=definition.a.room===state.interiorRoom?definition.b:definition.a,room=this.manifest(state).rooms.find(r=>r.id===other.room),geometry=portalGeometry(other,room);
  this.navigation=null;state.player.vx=state.player.vy=0;this.transition={from:state.interiorRoom,to:room.id,spawn:geometry.approach,elapsed:0,duration:.36,switched:false};return{ok:true,message:`Entrando: ${room.name}`};
 }
 doorAction(state,target,action){if(this.distance(state,target)>target.range)return{ok:false,message:'Aproxime-se da porta.'};return action==='lock'?target.door.lock(this.save(state),state.player,target.geometry,state.interiorRoom,state.inventory):target.door.close(this.save(state),state.player,target.geometry);}
 interact(state,target){
  if(target.kind==='door')return this.useDoor(state,target);if(target.kind==='exit')return{ok:true,exit:true};
  if(this.distance(state,target)>target.range)return{ok:false,message:'Aproxime-se do objeto.'};const object=target.object,save=this.save(state),previous=save.read(target.globalId);
  const changes={searched:true};if(['drawer','stash'].includes(object.action))changes.isOpen=!previous.isOpen;
  if(object.action==='switch'){const lights=this.room(state).lights.filter(l=>l.kind!=='moon'),on=lights.some(l=>save.read(globalObjectId(state.interior,state.interiorRoom,'light-'+l.id),{isOn:l.isOn}).isOn);for(const light of lights)save.patch(globalObjectId(state.interior,state.interiorRoom,'light-'+light.id),{isOn:!on});changes.isOn=!on;}
  save.interact(target.globalId,changes);state.interactions[target.globalId]=(state.interactions[target.globalId]||0)+1;
  let message=object.text;if(object.givesKey&&!state.inventory.includes(object.givesKey)){state.inventory.push(object.givesKey);message+=` Você encontrou: ${object.givesKey}.`;}
  if(object.action==='switch')message=changes.isOn?'Luzes do cômodo ligadas.':'Luzes do cômodo apagadas.';
  return{ok:true,message,evidence:object.evidence,dialogue:object.action?.endsWith('dialogue')?object.action:null,object};
 }
 move(state,dx,dy){const p=state.player,steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/5));for(let i=0;i<steps;i++){if(!this.blocked(state,p.x+dx/steps,p.y))p.x+=dx/steps;if(!this.blocked(state,p.x,p.y+dy/steps))p.y+=dy/steps;}}
 navigate(state,target){
  if(this.transition)return{ok:false};if(this.distance(state,target)<=target.range)return{ok:true,arrived:target};
  const base=this.collision(state),obstacles=[...base.obstacles,...this.doors(state).filter(d=>!d.isOpen).map(d=>({id:d.id,points:boundsPolygon(d.geometry)}))];const map=new IsoCollisionMap({width:base.width,height:base.height,tileSize:16,walkable:base.walkable,obstacles});
  const candidates=[];if(target.approach)candidates.push(target.approach);
  for(let y=Math.max(24,target.y-80);y<=target.y+target.h+80;y+=16)for(let x=Math.max(24,target.x-80);x<=target.x+target.w+80;x+=16){const distance=target.kind==='door'?Math.hypot(x-target.approach.x,y-target.approach.y):distanceToBox({x,y},target);if(distance<target.range*.8&&!this.blocked(state,x,y))candidates.push({x,y});}
  candidates.sort((a,b)=>Math.hypot(a.x-state.player.x,a.y-state.player.y)-Math.hypot(b.x-state.player.x,b.y-state.player.y));
  for(const point of candidates){if(this.blocked(state,point.x,point.y))continue;const path=map.findPath(state.player,point);if(path.length){this.navigation={path,index:1,target:{kind:target.kind,id:target.id},room:state.interiorRoom,building:state.interior};return{ok:true,message:`Alex se aproxima de ${target.name.toLowerCase()}.`};}}
  return{ok:false,message:'Não há passagem livre até esse objeto.'};
 }
 update(dt,state){
  if(this.transition){const t=this.transition;t.elapsed+=dt;if(!t.switched&&t.elapsed>=t.duration/2){t.switched=true;state.interiorRoom=t.to;Object.assign(state.player,this.repairPosition(state,t.spawn),{vx:0,vy:0});this.save(state).patch(globalObjectId(state.interior,t.to,'visit'),{visited:true});}if(t.elapsed>=t.duration)this.transition=null;return null;}
  const nav=this.navigation;if(!nav)return null;if(nav.room!==state.interiorRoom||nav.building!==state.interior){this.navigation=null;return null;}const point=nav.path[nav.index];if(!point){this.navigation=null;state.player.vx=state.player.vy=0;return this.targets(state).find(t=>t.kind===nav.target.kind&&t.id===nav.target.id)||null;}
  const dx=point.x-state.player.x,dy=point.y-state.player.y,d=Math.hypot(dx,dy),step=Math.min(d,110*dt);if(d<3){if(!this.blocked(state,point.x,point.y))Object.assign(state.player,point);nav.index++;return null;}const before={...state.player};state.player.vx=dx/d*110;state.player.vy=dy/d*110;this.move(state,dx/d*step,dy/d*step);if(Math.hypot(state.player.x-before.x,state.player.y-before.y)<.001){this.navigation=null;state.player.vx=state.player.vy=0;}return null;
 }
 fade(){if(!this.transition)return 0;return Math.sin(Math.PI*Math.min(1,this.transition.elapsed/this.transition.duration));}
 lights(state){const room=this.room(state),save=this.save(state);return room.lights.filter(l=>save.read(globalObjectId(state.interior,room.id,'light-'+l.id),{isOn:l.isOn}).isOn);}
}
