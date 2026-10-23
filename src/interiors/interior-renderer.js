import {HUMAN_HEIGHT_WORLD} from '../engine/WorldMetrics.js';
import {IsoProjection} from '../engine/IsoProjection.js';
const roomProjection = new IsoProjection();
import {drawProp} from '../graphics/interior-renderer.js';
import {propPolygon,pointInPolygon} from '../graphics/interaction.js';
import {SpriteCache} from '../graphics/sprite-cache.js';
import {dressRoom} from './room-dressing.js';
import {globalObjectId} from './save-system.js';
import {random,hash} from '../graphics/random.js';
import {PlayerRenderer} from '../graphics/Player.js';

const alias={table:'table',counter:'desk',steel:'table',files:'cabinet',catalog:'cabinet',medicine:'shelf',books:'book',photos:'frame',directory:'book',flyer:'paper',drawer:'cabinet'};
const ellipse=(c,p,rx,ry,color)=>{c.fillStyle=color;c.beginPath();c.ellipse(p.x,p.y,rx,ry,0,0,Math.PI*2);c.fill();};
function stroke(c,a,b,color,width=1){c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();}

export class RoomPropPainter{
 constructor(){this.cache=new SpriteCache(24*1024*1024);}
 draw(renderer,object,variant,roomKey){
  const key=`${roomKey}:${object.id}:${variant.isOpen||false}:${renderer.assets.revision}`;let cached=this.cache.get(key);
  if(!cached){const pts=propPolygon(object,(x,y,z)=>renderer.project(x,y,z)),minX=Math.floor(Math.min(...pts.map(p=>p.x)))-38,minY=Math.floor(Math.min(...pts.map(p=>p.y)))-42,w=Math.ceil(Math.max(...pts.map(p=>p.x))-minX)+38,h=Math.ceil(Math.max(...pts.map(p=>p.y))-minY)+38;
   const image=document.createElement('canvas');image.width=w;image.height=h;const original=renderer.ctx;renderer.ctx=image.getContext('2d');renderer.ctx.translate(-minX,-minY);try{this.paint(renderer,object,variant);}finally{renderer.ctx=original;}cached=this.cache.put(key,{image,x:minX,y:minY,bytes:w*h*4});
  }renderer.ctx.drawImage(cached.image,cached.x,cached.y);
 }
 paint(r,o,variant={}){
  const c=r.ctx,z=o.baseZ||0,h=o.height||1,p=r.project(o.x+o.w/2,o.y+o.h/2,z),type=o.type,color=o.color||'#7e7253';
  if(['paper','book','frame','mug','bottle','rug','bed','sofa','armchair','chair','plant','cabinet','table'].includes(type)){drawProp(r,{...o,kind:type,color});if(type==='cabinet'&&variant.isOpen)r.box(o.x+5,o.y+o.h,o.w-10,18,7,'#544f36','#a3966e',z+h*.45);return;}
  if(type==='npc')return;
  if(type==='shelf'){
   r.box(o.x,o.y,o.w,o.h,h,color,'#a28c65',z);const east=o.h>o.w,length=east?o.h:o.w,rnd=random(o.id+':'+o.x);
   for(let level=5;level<h-14;level+=24){for(let i=8;i<length-8;i+=8){const a=east?o.x+o.w:o.x+i,b=east?o.y+i:o.y+o.h;r.box(a,b,east?3:5,east?5:3,11+rnd()*9,['#9b8860','#647c68','#8c6252','#a7a481','#526d67'][Math.floor(rnd()*5)],'#bcb28d',z+level);}const a=east?r.project(o.x+o.w,o.y,z+level-2):r.project(o.x,o.y+o.h,z+level-2),b=east?r.project(o.x+o.w,o.y+o.h,z+level-2):r.project(o.x+o.w,o.y+o.h,z+level-2);stroke(c,a,b,'#c1a779',2);}return;
  }
  if(['drawer','files','catalog','medicine','counter','steel','directory','books','photos','flyer'].includes(type)){
   drawProp(r,{...o,kind:alias[type]||'cabinet',color:type==='steel'?'#7d8980':color});
   if(['drawer','files','catalog'].includes(type)&&variant.isOpen){r.box(o.x,o.y+o.h*.5,o.w,o.h,Math.max(3,h*.4),'#433d2c','#a08d61',z);r.ground(o.x+3,o.y+o.h*.5+3,o.w-6,o.h-6,'#262f25',z+Math.max(3,h*.4)+.2);}
   if(type==='medicine'||type==='catalog'||type==='files'){const count=type==='medicine'?12:6;for(let i=0;i<count;i++){const x=o.x+6+(i%4)*Math.max(6,(o.w-20)/4),y=o.y+o.h+1,zz=z+10+Math.floor(i/4)*h*.28;if(type==='medicine')r.box(x,y,6,6,14,['#a6b1a0','#af9272','#677f6b'][i%3],'#c1c5ab',zz);else{const a=r.project(x,y,zz);c.fillStyle='#c0b283';c.fillRect(a.x-4,a.y,8,2);}}}
   return;
  }
  if(['tv','microfilm','reel','radio','cassette','typewriter','calculator','phone','console','gauge','jukebox'].includes(type)){
   r.surface=type==='tv'?'wood':'stone';r.box(o.x,o.y,o.w,o.h,h,type==='tv'?'#6e583f':'#536a60',type==='tv'?'#8b7853':'#899582',z);r.surface=null;
   if(['tv','microfilm','console','jukebox'].includes(type)){const a=r.project(o.x+o.w*.15,o.y+o.h+.5,z+h*.85),b=r.project(o.x+o.w*.8,o.y+o.h+.5,z+h*.85),cc=r.project(o.x+o.w*.8,o.y+o.h+.5,z+h*.25),d=r.project(o.x+o.w*.15,o.y+o.h+.5,z+h*.25);r.poly([a,b,cc,d],'#334f49','#9baf97');for(let i=0;i<5;i++)stroke(c,{x:a.x,y:a.y+3+i*3},{x:b.x,y:b.y+3+i*3},'#9ab79a20');}
   if(type==='cassette'||type==='reel'){for(const fraction of [.3,.72])ellipse(c,r.project(o.x+o.w*fraction,o.y+o.h*.45,z+h+.2),type==='reel'?9:4,type==='reel'?5:2,'#c2c2a3');}
   if(type==='typewriter'){r.box(o.x+5,o.y,Math.max(10,o.w-10),6,12,'#344f42','#8b9a80',z+h);r.ground(o.x+8,o.y-5,Math.max(8,o.w-16),15,'#d7cfad',z+h+12);for(let i=0;i<5;i++)for(let j=0;j<3;j++)ellipse(c,r.project(o.x+5+i*(o.w-10)/5,o.y+9+j*4,z+h+.3),1.3,.8,'#d6cba6');}
   if(type==='phone'){stroke(c,r.project(o.x+2,o.y+4,z+h+3),r.project(o.x+o.w-2,o.y+4,z+h+3),'#293e32',6);ellipse(c,r.project(o.x+o.w/2,o.y+o.h*.7,z+h+.4),6,3,'#b7bb9d');}
   if(type==='calculator'){for(let i=0;i<12;i++)r.ground(o.x+4+(i%3)*6,o.y+6+Math.floor(i/3)*4,4,2,'#d6cdb1',z+h+.2);}
   if(type==='console'||type==='gauge'){for(let i=0;i<6;i++){const q=r.project(o.x+8+i*(o.w-16)/6,o.y+o.h,z+h*.65);ellipse(c,q,5,7,'#a9b6a1');stroke(c,q,{x:q.x+2,y:q.y-4},'#304d3d');}}
   return;
  }
  if(['sink','stove','fridge','laundry','bath','coffee','engine','turbine','barrel','tires','box','safe'].includes(type)){
   r.box(o.x,o.y,o.w,o.h,h,type==='box'?'#8a7958':type==='tires'?'#293c33':'#718377',type==='box'?'#b09b6c':'#a0ad99',z);
   if(type==='sink'||type==='bath')ellipse(c,r.project(o.x+o.w/2,o.y+o.h/2,z+h+.2),o.w*.24,o.h*.19,'#3d5c52');
   if(type==='stove')for(let i=0;i<4;i++)ellipse(c,r.project(o.x+o.w*(.25+(i%2)*.5),o.y+o.h*(.25+Math.floor(i/2)*.5),z+h+.2),8,4,'#293f34');
   if(type==='safe'||type==='fridge'){const q=r.project(o.x+o.w*.65,o.y+o.h+.5,z+h*.55);ellipse(c,q,7,10,'#273f34');stroke(c,q,{x:q.x+8,y:q.y+5},'#afba9f',3);}
   if(type==='box')for(let i=1;i<4;i++)stroke(c,r.project(o.x+o.w*i/4,o.y,z+h+.3),r.project(o.x+o.w*i/4,o.y+o.h,z+h+.3),'#5b5d41',2);
   if(type==='turbine'||type==='engine'){for(let i=0;i<8;i++){const q=r.project(o.x+6+i*(o.w-12)/8,o.y+o.h,z+h*.85);stroke(c,q,{x:q.x,y:q.y+h*.6},'#304f44',3);}ellipse(c,r.project(o.x+o.w/2,o.y+o.h/2,z+h),o.w*.25,o.h*.2,'#556f62');}
   return;
  }
  if(type==='bars'||type==='glass'||type==='hooks'){
   if(type==='glass'){r.poly([r.project(o.x,o.y,z),r.project(o.x+o.w,o.y,z),r.project(o.x+o.w,o.y,z+h),r.project(o.x,o.y,z+h)],'#a0b9aa26','#7b9b88');return;}
   for(let i=0;i<10;i++){const x=o.x+o.w*i/9,a=r.project(x,o.y,z),b=r.project(x,o.y,z+h);stroke(c,a,b,'#3c5a4b',3);if(type==='hooks'){c.strokeStyle='#a7bba3';c.beginPath();c.arc(b.x+5,b.y+25,6,0,Math.PI);c.stroke();}}stroke(c,r.project(o.x,o.y,z+h),r.project(o.x+o.w,o.y,z+h),'#93a68c',4);return;
  }
  if(['poster','corkboard','calendar','mirror','map','keys'].includes(type)){
   const a=r.project(o.x,o.y,z+h),b=r.project(o.x+o.w,o.y,z+h),cc=r.project(o.x+o.w,o.y,z),d=r.project(o.x,o.y,z);r.poly([a,b,cc,d],type==='mirror'?'#5e7d70':type==='corkboard'?'#8c7650':'#c1b78f','#414c37');
   if(type==='calendar'){c.fillStyle='#384f3c';c.font='7px monospace';c.fillText('OUT 1989',a.x+2,a.y+10);}
   else for(let i=0;i<5;i++){const q=r.project(o.x+o.w*(.15+i*.15),o.y,z+h*.6);if(type==='keys'){ellipse(c,q,2,3,'#b9b17f');stroke(c,q,{x:q.x,y:q.y+9},'#b9b17f',2);}else stroke(c,q,{x:q.x+5,y:q.y+8},type==='corkboard'?'#aa5a42':'#69734f',2);}
   return;
  }
  if(type==='coat'||type==='broom'){const q=r.project(o.x+o.w/2,o.y+o.h/2,z+h);stroke(c,q,{x:q.x+2,y:q.y+h},'#8d8965',3);if(type==='coat')r.poly([{x:q.x-10,y:q.y+9},{x:q.x+13,y:q.y+13},{x:q.x+18,y:q.y+51},{x:q.x-14,y:q.y+45}],'#5d6c51','#344b34');else for(let i=0;i<6;i++)stroke(c,{x:q.x+2,y:q.y+h-15},{x:q.x-9+i*4,y:q.y+h},'#a39765',2);return;}
  if(type==='lamp'||type==='candle'){stroke(c,p,{x:p.x,y:p.y-h},'#7d865c',3);ellipse(c,p,7,3,'#4d6149');ellipse(c,{x:p.x,y:p.y-h},type==='lamp'?13:3,type==='lamp'?5:6,type==='lamp'?'#a6ae7e':'#e0bb70');return;}
  if(type==='ashtray'){
    ellipse(c,p,Math.max(4,o.w*.4),Math.max(2,o.h*.3),'#a0a88e');
    ellipse(c,p,Math.max(2,o.w*.29),Math.max(1,o.h*.2),'#4d5c45');
    stroke(c,p,{x:p.x+7,y:p.y+1},'#d2c99b',2);
    // Environmental storytelling: translucent curling smoke wisps
    c.save();
    c.strokeStyle='rgba(215, 226, 220, 0.35)';
    c.lineWidth=1.2;
    c.beginPath();
    const t=r.time||0;
    c.moveTo(p.x+2,p.y-1);
    c.bezierCurveTo(p.x+4+Math.sin(t*3)*3,p.y-8, p.x-2+Math.cos(t*2)*4,p.y-18, p.x+3+Math.sin(t*2.5)*6,p.y-28);
    c.stroke();
    c.restore();
    return;
  }
  if(type==='pen'||type==='tools'){for(let i=0;i<(type==='tools'?5:1);i++)stroke(c,{x:p.x+i*3,y:p.y},{x:p.x+9+i*3,y:p.y+5},'#b1b49b',type==='pen'?1.2:2.5);return;}
  if(['mud','ash','dust','damp','wire','drain','floorboard'].includes(type)){
   if(type==='wire'){const a=r.project(o.x,14,78),b=r.project(o.x+o.w+30,14,40);stroke(c,a,b,'#293e2e',1.5);return;}
   if(type==='floorboard'){r.ground(o.x,o.y,o.w,o.h,variant.isOpen?'#2d3a27':'#9c8864',z);r.ground(o.x+3,o.y+3,o.w-6,2,'#443b26',z+.1);return;}
   r.ground(o.x,o.y,o.w,o.h,type==='damp'?'#324e3645':type==='mud'?'#293e2b88':'#b6a47a55',z);return;
  }
  if(type==='switch'){r.ground(o.x,o.y,o.w,o.h,'#b1b296',2);const q=r.project(o.x+o.w/2,o.y+o.h/2,3);c.fillStyle='#354e3b';c.fillRect(q.x-1,q.y-3,3,6);return;}
  if(type==='clock'){ellipse(c,p,17,23,'#485b42');ellipse(c,{x:p.x,y:p.y-35},12,16,'#c0bc92');stroke(c,{x:p.x,y:p.y-35},{x:p.x+6,y:p.y-43},'#3a4f39',2);return;}
  drawProp(r,{...o,kind:alias[type]||type,color});
 }
}

export class InteriorRoomRenderer{
 constructor(world,police){
  this.world=world;
  this.police=police;
  this.painter=new RoomPropPainter();
  this.dressing=new Map();
  this.frame={x:0,y:0,scale:1};
  this.focus=null;this.origin={x:0,y:0};
  this.playerRenderer=new PlayerRenderer({id:'alex',sheet:police?.alexSheet,targetHeight:HUMAN_HEIGHT_WORLD});
 }
 screenToWorld(point){const x=(point.x-this.frame.x)/this.frame.scale-this.origin.x,y=(point.y-this.frame.y)/this.frame.scale-this.origin.y;return roomProjection.screenToWorld(x,y);}
 pick(point,state){
  if(!point)return null;
  const room=this.world.room(state),targets=this.world.targets(state);
  const p={x:(point.x-this.frame.x)/this.frame.scale-this.origin.x,y:(point.y-this.frame.y)/this.frame.scale-this.origin.y},project=(x,y,z=0)=>roomProjection.worldToScreen(x,y,z);
  const depth=t=>{const parent=t.object?.parentId&&room.props.find(o=>o.id===t.object.parentId);return parent?parent.x+parent.y+parent.w+parent.h+.1:t.x+t.y+t.w+t.h;};
  return [...targets].sort((a,b)=>depth(b)-depth(a)).find(t=>pointInPolygon(p,propPolygon(t.kind==='prop'?t.object:{...t,height:t.kind==='door'?85:2},project)))||null;
 }
 draw(renderer,state,dt){
  const room=this.world.room(state),r=renderer,c=r.ctx;this.origin={x:r.originX??0,y:r.originY??0};
  const lightState=this.world.lights(state),mask=lightState.map(l=>l.id).join(','),roomKey=`${state.interior}:${room.id}:${mask}:${r.lighting.enabled}`;
  r.room=roomKey;r.surface=null;r.lighting.ambient=room.ambient;r.lighting.lights=lightState.map(l=>({...l,intensity:l.intensity*(l.kind==='fluorescent'?1+Math.sin(r.time*31+hash(l.id))*.015:1)}));
  const scale=r.viewCamera?.scale??Math.min(1.85,(r.w-210)/((room.bounds.w+room.bounds.h)*(Math.sqrt(3)/2)+180),(r.h-210)/((room.bounds.w+room.bounds.h)*.5+170));
  const center=r.project(room.bounds.w/2,room.bounds.h/2);this.frame=r.viewCamera?{x:r.w/2-(r.viewCamera.x+this.origin.x)*scale,y:r.h/2-(r.viewCamera.y+this.origin.y)*scale,scale}:{x:r.w*.50-center.x*scale,y:r.h*.56-center.y*scale,scale};
  c.save();c.translate(this.frame.x,this.frame.y);c.scale(scale,scale);
  this.floor(r,room);this.walls(r,state,room);
  const detailKey=state.interior+':'+room.id;if(!this.dressing.has(detailKey))this.dressing.set(detailKey,dressRoom(state.interior,room));
  const details=this.dressing.get(detailKey).filter((o,i)=>i%Math.max(1,Math.round(1/r.density))===0),props=[...room.props,...details],save=this.world.save(state);
  for(const o of props.filter(o=>['rug','mud','ash','floorboard','drain'].includes(o.type)))this.painter.draw(r,o,save.read(globalObjectId(state.interior,room.id,o.id)),roomKey);
  const list=props.filter(o=>!['rug','mud','ash','floorboard','drain'].includes(o.type)).map(o=>{const parent=o.parentId&&room.props.find(p=>p.id===o.parentId);return{depth:parent?parent.x+parent.y+parent.w+parent.h+.1:o.x+o.y+o.w+o.h,draw:()=>{if(o.solid&&o.height>20)this.shadow(r,o,lightState);this.painter.draw(r,o,save.read(globalObjectId(state.interior,room.id,o.id)),roomKey);}};});
  for(const d of this.world.doors(state))list.push({depth:d.x+d.y+d.w+d.h,draw:()=>this.drawDoor(r,d)});
  list.push({depth:state.player.x+state.player.y+12,draw:()=>{
    const p=r.project(state.player.x,state.player.y);
    if(this.police?.alexSheet)this.playerRenderer.setSheet(this.police.alexSheet);
    this.playerRenderer.update(dt,state.player.vx,state.player.vy,state.player.angle);
    this.playerRenderer.draw(c,p.x,p.y,{scale:HUMAN_HEIGHT_WORLD/(this.playerRenderer.sheet?.frameHeight||128)});
  }});
  for(const npc of r.dynamicActors??room.props.filter(o=>o.type==='npc')){const point=npc.approach||npc;list.push({depth:point.x+point.y+12,draw:()=>r.townActors.draw(r,{...npc,x:point.x,y:point.y,time:r.time})});}
  list.sort((a,b)=>a.depth-b.depth).forEach(item=>item.draw());
  this.illumination(r,room);this.windows(r,room);
  if(this.focus){const target=this.focus,polygon=target.kind==='prop'?propPolygon(target.object,(x,y,z)=>r.project(x,y,z)): [r.project(target.x,target.y),r.project(target.x+target.w,target.y),r.project(target.x+target.w,target.y+target.h),r.project(target.x,target.y+target.h)];c.save();c.strokeStyle='#bc96e7';c.shadowColor='#8f5dbe';c.shadowBlur=12;c.lineWidth=2;c.beginPath();polygon.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.stroke();c.restore();}
  const exit=this.world.targets(state).find(t=>t.kind==='exit');if(exit){r.ground(exit.x,exit.y,exit.w,exit.h,'#a99b6a');const p=r.project(exit.anchor.x,exit.anchor.y);c.fillStyle='#ede1b9';c.font='10px monospace';c.fillText('SAÍDA',p.x-16,p.y+17);}
  c.restore();r.room=null;r.surface=null;
 }
 floor(r,room){const {w,h}=room.bounds;r.ground(0,0,w,h,room.finish.floor);r.textureQuad([r.project(0,0),r.project(w,0),r.project(w,h),r.project(0,h)],w,h,room.finish.material==='cloth'?'cloth':room.finish.material==='wood'?'wood':'stone',.4);const step=room.finish.material==='tile'?38:20;for(let x=0;x<w;x+=step)stroke(r.ctx,r.project(x,0),r.project(x,h),'#253c2c40',.7);if(room.finish.material!=='wood')for(let y=0;y<h;y+=step)stroke(r.ctx,r.project(0,y),r.project(w,y),'#253c2c40',.7);}
 walls(r,state,room){
  const doors=this.world.doors(state);for(const side of ['north','west','east','south']){
   const along=['north','south'].includes(side)?room.bounds.w:room.bounds.h,openings=doors.filter(d=>d.port.side===side).map(d=>[d.port.offset-d.port.width/2,d.port.offset+d.port.width/2]).sort((a,b)=>a[0]-b[0]);let start=0;
   const segment=(a,b)=>{if(b-a<1)return;const back=side==='north'||side==='west',internal=openings.length>0,high=back?(internal?64:112):15;const x=side==='west'?0:side==='east'?room.bounds.w-8:a,y=side==='north'?0:side==='south'?room.bounds.h-8:a,w=['north','south'].includes(side)?b-a:8,h=['north','south'].includes(side)?8:b-a;
    const near=back&&this.world.transition;r.ctx.save();if(near)r.ctx.globalAlpha=.28;r.surface='plaster';r.box(x,y,w,h,high,room.finish.wall,'#9b9f81');r.surface=null;
    if(room.finish.condition==='damp'||room.finish.condition==='worn'){const rnd=random(`${state.interior}:${room.id}:${side}`);for(let i=0;i<14;i++){const p=r.project(x+rnd()*w,y+rnd()*h,15+rnd()*high*.7);r.ctx.fillStyle='#304a3240';r.ctx.fillRect(p.x,p.y,2+rnd()*10,6+rnd()*25);}}
    if(back&&room.finish.material==='wood'){for(let v=a+8;v<b;v+=16){const p1=side==='north'?r.project(v,9,8):r.project(9,v,8),p2=side==='north'?r.project(v,9,high-8):r.project(9,v,high-8);stroke(r.ctx,p1,p2,'#b9b18b20',.8);}}r.ctx.restore();};
   for(const [a,b]of openings){segment(start,a);start=b;}segment(start,along);
  }
 }
 drawDoor(r,door){const c=r.ctx,geo=door.geometry;if(door.isOpen){if(['north','south'].includes(door.port.side))r.box(geo.x,geo.y,7,door.port.width,63,'#665a40','#928368');else r.box(geo.x,geo.y,door.port.width,7,63,'#665a40','#928368');}else r.box(geo.x,geo.y,geo.w,geo.h,78,door.isLocked?'#60543c':'#6c7358','#a19473');const p=r.project(geo.x+geo.w/2,geo.y+geo.h/2,door.isOpen?25:90);c.fillStyle=door.isLocked?'#d1ab85':'#d8c9a3';c.font='10px Georgia';c.textAlign='center';c.fillText((door.isLocked?'⌑ ':'')+door.name,p.x,p.y);c.textAlign='left';}
 shadow(r,o,lights){if(!r.lighting.ao)return;const strongest=lights.find(l=>l.kind!=='moon')||lights[0],dx=strongest?o.x-strongest.x:20,dy=strongest?o.y-strongest.y:30,d=Math.max(1,Math.hypot(dx,dy)),length=Math.min(35,o.height*.35),p=r.project(o.x+o.w/2+dx/d*length,o.y+o.h/2+dy/d*length);r.ctx.save();r.ctx.shadowColor='#05110ed0';r.ctx.shadowBlur=8+o.height*.08;r.ctx.shadowOffsetX=dx/d*6;r.ctx.shadowOffsetY=4;ellipse(r.ctx,p,Math.max(12,(o.w+o.h)*.27),Math.max(5,(o.w+o.h)*.12),'#07170e55');r.ctx.restore();}
 illumination(r,room){if(!r.lighting.enabled)return;const c=r.ctx;c.save();c.beginPath();[r.project(0,0),r.project(room.bounds.w,0),r.project(room.bounds.w,room.bounds.h),r.project(0,room.bounds.h)].forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.clip();c.globalCompositeOperation='multiply';c.fillStyle=r.lighting.lights.some(l=>l.kind!=='moon')?'#bdc2ae55':'#142c38a8';c.fill();r.lighting.drawLightPools(r);c.restore();for(const light of r.lighting.lights.filter(l=>l.kind!=='moon')){const p=r.project(light.x,light.y,light.z);c.save();c.shadowColor=light.color;c.shadowBlur=12;c.fillStyle=light.color;if(light.kind==='fluorescent'){c.translate(p.x,p.y);c.rotate(.46);c.fillRect(-25,-2,50,4);}else ellipse(c,p,8,4,light.color);c.restore();}}
 windows(r,room){const c=r.ctx;for(const x of [room.bounds.w*.24,room.bounds.w*.77]){const p=r.project(x,10,72);r.poly([{x:p.x,y:p.y},{x:p.x+32,y:p.y+16},{x:p.x+32,y:p.y+51},{x:p.x,y:p.y+35}],'#48666644','#81967b');c.save();c.beginPath();c.rect(p.x+3,p.y+10,27,29);c.clip();for(let i=0;i<12;i++){const yy=p.y+((i*9+r.time*120)%45),xx=p.x+3+(i*7)%28;stroke(c,{x:xx,y:yy},{x:xx-3,y:yy+9},'#aec5bf60',.7);}c.restore();}}
}
