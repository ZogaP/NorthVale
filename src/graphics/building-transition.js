export class BuildingTransition {
 constructor(){this.active=null;}
 start(renderer,building){
  const backdrop=document.createElement('canvas');backdrop.width=renderer.canvas.width;backdrop.height=renderer.canvas.height;backdrop.getContext('2d').drawImage(renderer.canvas,0,0);
  const facade=document.createElement('canvas');facade.width=backdrop.width;facade.height=backdrop.height;const ctx=facade.getContext('2d'),previous=renderer.ctx,cam=renderer.project(renderer.camera.x,renderer.camera.y);
  ctx.setTransform(renderer.pixelRatio,0,0,renderer.pixelRatio,0,0);ctx.translate(renderer.w/2-cam.x,renderer.h*.55-cam.y);renderer.ctx=ctx;
  try{renderer.building(building,renderer.lastMinute||0);}finally{renderer.ctx=previous;}
  this.active={backdrop,facade,elapsed:0,duration:.25};
 }
 draw(renderer,dt){const t=this.active;if(!t)return;t.elapsed+=dt;const progress=Math.min(1,t.elapsed/t.duration),smooth=progress*progress*(3-2*progress),c=renderer.ctx;
  c.save();c.globalAlpha=Math.max(0,1-smooth*1.45);c.drawImage(t.backdrop,0,0,renderer.w,renderer.h);c.globalAlpha=1-smooth;c.drawImage(t.facade,0,0,renderer.w,renderer.h);c.restore();if(progress===1)this.active=null;
 }
 cancel(){this.active=null;}
}
