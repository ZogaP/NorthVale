import {SpriteSheet,directionFromVelocity} from './spritesheet.js';

export class TownActors {
 constructor(police) {
  this.alex=police.alexSheet;
  this.ruth=police.ruthSheet;
  this.citizens=new SpriteSheet({src:'/assets/characters/townspeople_walk.png',columns:8,rows:6});
  this.officials=new SpriteSheet({src:'/assets/characters/town-officials_walk.png',columns:8,rows:8});
  this.directions=new Map();
  this.ready=Promise.all([this.alex.ready,this.ruth.ready,this.citizens.ready,this.officials.ready]);
  this.error=null;
  this.ready.catch(error=>{this.error=error;});
 }
 draw(r,{id,x,y,vx=0,vy=0,time=0,angle=0}) {
  const p=r.project(x,y),c=r.ctx,moving=Math.hypot(vx,vy)>2;
  const direction=directionFromVelocity((vx-vy)*.866,(vx+vy)*.5,this.directions.get(id)??directionFromVelocity((Math.cos(angle)-Math.sin(angle))*.866,(Math.cos(angle)+Math.sin(angle))*.5));
  this.directions.set(id,direction);
  const officialRows={viktor:0,clara:2,bobby:4,sam:6},sheet=id==='alex'?this.alex:id==='ruth'?this.ruth:Object.hasOwn(officialRows,id)?this.officials:this.citizens;
  if(!sheet.image.naturalWidth)return false;
  const row=id==='alex'?(moving?Math.floor(time*9)%6:0):id==='ruth'?Math.floor(time*2)%4:(officialRows[id]??({helen:0,elias:2,owen:4}[id]??0))+(moving?Math.floor(time*7)%2:0);
  c.save();c.fillStyle='#06131b77';c.beginPath();c.ellipse(p.x,p.y+1,11,4,0,0,Math.PI*2);c.fill();c.restore();
  return sheet.draw(c,direction,row,p.x,p.y,{scale:50/sheet.frameHeight,anchorY:sheet===this.citizens||sheet===this.officials ? .98 : .91});
 }
}
