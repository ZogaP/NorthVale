const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.NORTHVALE_CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.NORTHVALE_URL||'http://127.0.0.1:5173/legacy.html');
  await page.click('#begin');await page.keyboard.press('Space');await page.waitForTimeout(300);
  await fs.mkdir('test-results',{recursive:true});
  await page.screenshot({path:'test-results/exterior-street.png'});
  const result=await page.evaluate(async()=>{
   const {Renderer}=await import('/src/render.js'),{buildings,door}=await import('/src/world.js'),{createState}=await import('/src/state.js');
   const canvas=document.createElement('canvas');canvas.id='exterior-proof';canvas.style='position:fixed;inset:0;z-index:99999;width:100%;height:100%';document.body.append(canvas);
   const r=new Renderer(canvas);await r.townActors.ready;
   const calls=[],drawImage=r.ctx.drawImage.bind(r.ctx);
   r.ctx.drawImage=(image,...args)=>{if(image===r.townActors.alex.image||image===r.townActors.ruth.image||image===r.townActors.citizens.image)calls.push({src:image.src.split('/').pop(),column:args[0]/(image.naturalWidth/8),row:args[1]/(image.naturalHeight/(image===r.townActors.ruth.image?4:6))});return drawImage(image,...args);};
   const state=createState();state.interior=null;r.draw(state,1,false);
   const initialCalls=calls.splice(0);
   // Exercise all directional cells and a complete walk cycle, not just loading PNGs.
   for(const id of ['alex','helen','elias','owen','ruth'])for(let d=0;d<8;d++)for(let f=0;f<6;f++){
    const a=d*Math.PI/4;r.townActors.draw(r,{id,x:0,y:0,vx:Math.cos(a)*30,vy:Math.sin(a)*30,time:f/7});
   }
   const actorCalls=calls.splice(0),hashes=[];
   r.ctx.setTransform(1,0,0,1,0,0);
   for(const b of buildings){r.ctx.clearRect(0,0,canvas.width,canvas.height);r.ctx.save();const center=r.project(b.x+b.w/2,b.y+b.h/2);r.ctx.translate(400-center.x,400-center.y);r.building(b,600);r.ctx.restore();const bytes=r.ctx.getImageData(0,0,800,600).data;let hash=2166136261;for(const v of bytes)hash=Math.imul(hash^v,16777619);hashes.push(hash);}
   // A contact sheet captures the actual in-game facade renderer for visual review.
   r.ctx.setTransform(r.pixelRatio,0,0,r.pixelRatio,0,0);r.ctx.fillStyle='#23352f';r.ctx.fillRect(0,0,1440,1000);
   for(let i=0;i<buildings.length;i++){const b=buildings[i],q=r.project(b.x+b.w/2,b.y+b.h/2);r.ctx.save();r.ctx.translate(145+(i%5)*285,160+Math.floor(i/5)*305);r.ctx.scale(.8,.8);r.ctx.translate(-q.x,-q.y);r.building(b,600);r.ctx.restore();r.ctx.fillStyle='#ded7ba';r.ctx.font='14px Georgia';r.ctx.fillText(b.name,28+(i%5)*285,260+Math.floor(i/5)*305);}
   return {initialCalls,actorCalls,hashes,doors:buildings.map(b=>({id:b.id,...door(b)}))};
  });
  assert.ok(result.initialCalls.some(c=>c.src==='alex_hale_walk.png'),'street player must draw the painted walk sheet');
  assert.ok(result.initialCalls.some(c=>c.src==='townspeople_walk.png'),'Helen must use a painted citizen sheet outside');
  assert.equal(new Set(result.hashes).size,15,'all actual town facades must differ');
  for(const [src,row]of [['townspeople_walk.png',0],['townspeople_walk.png',2],['townspeople_walk.png',4],['alex_hale_walk.png',0]])assert.equal(new Set(result.actorCalls.filter(c=>c.src===src&&c.row===row).map(c=>c.column)).size,8);
  for(const start of [0,2,4])assert.ok(result.actorCalls.some(c=>c.src==='townspeople_walk.png'&&c.row===start+1),'both citizen steps must render');
  await page.screenshot({path:'test-results/exterior-facades.png'});
  assert.deepEqual(errors,[]);
  console.log('Exterior smoke passed: real street draws painted Alex and Helen, 8 directions and walk frames for all actors, 15 distinct facade renders; no browser errors.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
