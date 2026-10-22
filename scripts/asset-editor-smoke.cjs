const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');

(async()=>{
 const browser=await chromium.launch({executablePath:process.env.NORTHVALE_CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  const context=await browser.newContext({viewport:{width:1720,height:1100},acceptDownloads:true});await context.setOffline(true);
  const page=await context.newPage(),errors=[],requests=[];
  page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>requests.push(request.url()));
  const html=await fs.readFile('NorthVale_AssetStudio.html','utf8');await page.setContent(html);
  const data=()=>page.evaluate(()=>NorthValeAssetStudio.metadata());
  const snapshot=()=>page.evaluate(()=>NorthValeAssetStudio.snapshot());
  const change=async(id,value)=>{await page.locator(id).fill(String(value));await page.locator(id).dispatchEvent('change');};
  const canvasPoint=async(x,y,z=0)=>page.locator('#art').evaluate((c,p)=>{const r=c.getBoundingClientRect();return{x:r.x+(800+(p.x-p.y)*43)*r.width/1600,y:r.y+(205+(p.x+p.y)*22-p.z*42)*r.height/900};},{x,y,z});
  await page.locator('#rain').uncheck();
  await page.selectOption('#prop-category','all');assert.equal(await page.locator('#palette button').count(),77);
  await page.locator('#prop-search').fill('mesa');await page.locator('[data-type="desk"]').click();
  let p=await canvasPoint(5.5,9.5);await page.mouse.click(p.x,p.y);
  let current=await data();assert.equal(current.objects.length,23);const added=current.objects.find(o=>o.id.includes('added-desk'));assert.ok(added);assert.equal(added.x,5.5);assert.equal(added.y,9.5);
  assert.equal(await page.locator('#edit-name').inputValue(),'Mesa');
  // Use real pointer movement rather than calling editor internals.
  const from=await canvasPoint(added.x+.8,added.y+.4,added.h),to=await canvasPoint(added.x+1.8,added.y+.9,added.h);
  await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(to.x,to.y,{steps:7});await page.mouse.up();
  current=await data();let moved=current.objects.find(o=>o.id===added.id);assert.equal(moved.x,6.5);assert.equal(moved.y,10);
  await page.locator('#undo').click();assert.equal((await data()).objects.find(o=>o.id===added.id).x,5.5);
  await page.locator('#redo').click();assert.equal((await data()).objects.find(o=>o.id===added.id).x,6.5);
  await page.selectOption('#object',added.id);
  const beforeRotate=await snapshot();await page.locator('#rotate-object').click();moved=(await data()).objects.find(o=>o.id===added.id);assert.equal(moved.rotation,90);assert.notEqual(await snapshot(),beforeRotate);
  assert.ok(Math.abs(moved.collision[1].x-moved.x)<1e-8,'rotated collision follows rotation');assert.ok(moved.collision[1].y>moved.y);
  await change('#edit-w',3);await change('#edit-d',1.5);await change('#edit-h',1.4);await change('#edit-z',.5);await change('#edit-name','Mesa do arquivo');await change('#edit-color','#8d483d');await page.selectOption('#edit-material','wood');await page.locator('#edit-solid').uncheck();
  moved=(await data()).objects.find(o=>o.id===added.id);assert.equal(moved.w,3);assert.equal(moved.z,.5);assert.equal(moved.name,'Mesa do arquivo');assert.equal(moved.color,'#8d483d');assert.equal(moved.collision,null);
  await page.locator('#duplicate-object').click();assert.equal((await data()).objects.length,24);
  await page.locator('#delete-object').click();assert.equal((await data()).objects.length,23);await page.locator('#undo').click();assert.equal((await data()).objects.length,24);await page.locator('#redo').click();assert.equal((await data()).objects.length,23);
  // Moving furniture carries the explicit props that rest on it, and undo restores both.
  current=await data();const supported=current.objects.find(o=>o.supportId);assert.ok(supported);const parent=current.objects.find(o=>o.id===supported.supportId);
  await page.selectOption('#object',parent.id);await change('#edit-x',parent.x+.5);assert.ok(Math.abs((await data()).objects.find(o=>o.id===supported.id).x-supported.x-.5)<1e-6);await page.locator('#undo').click();
  // Per-scene edits survive switching and can be changed independently.
  const edited=JSON.stringify((await data()).objects);
  await page.selectOption('#scene','pharmacy-interior');assert.equal((await data()).objects.length,22);await page.selectOption('#scene','police-interior');assert.equal(JSON.stringify((await data()).objects),edited);
  await page.locator('summary').first().click();await change('#wall-color','#705b72');await change('#floor-color','#4c5c61');await change('#roof-color','#675c49');await change('#sign-text','ARQUIVO DE NORTHVALE');
  assert.equal((await data()).settings.sign,'ARQUIVO DE NORTHVALE');
  await page.selectOption('#object',added.id);await page.screenshot({path:'test-results/asset-editor.png'});
  await page.locator('#lights').uncheck();
  // Save an editable multi-scene project, open it in a new offline page and compare pixels/data.
  await page.locator('summary').nth(1).click();const event=page.waitForEvent('download');await page.locator('#save-project').click();const download=await event;
  await fs.mkdir('test-results',{recursive:true});const filename=path.resolve('test-results/NorthVale-Projeto.json');await download.saveAs(filename);const project=JSON.parse(await fs.readFile(filename,'utf8'));assert.equal(project.format,'northvale-studio-project-v2');
  const expected=await snapshot(),other=await context.newPage();other.on('pageerror',error=>errors.push(error.message));await other.setContent(html);await other.locator('#import-file').setInputFiles(filename);
  await other.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Projeto aberto'));
  assert.equal(await other.evaluate(()=>NorthValeAssetStudio.snapshot()),expected,'project roundtrip preserves exact export pixels');
  assert.equal(await other.evaluate(()=>NorthValeAssetStudio.metadata().objects.length),23);
  assert.equal(await other.locator('#rain').isChecked(),false);assert.equal(await other.locator('#lights').isChecked(),false);
  // Invalid files are rejected before any document is changed.
  const corrupt=JSON.parse(JSON.stringify(project));corrupt.documents[0].objects[0].x=null;
  await other.locator('#import-file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(corrupt))});
  assert.match(await other.locator('#project-status').textContent(),/Não foi possível abrir/);assert.equal(await other.evaluate(()=>NorthValeAssetStudio.snapshot()),expected);
  const stored=await context.newPage();stored.on('pageerror',error=>errors.push(error.message));await stored.route('https://northvale.test/editor',route=>route.fulfill({contentType:'text/html',body:html}));await stored.goto('https://northvale.test/editor');await stored.locator('#import-file').setInputFiles(filename);await stored.selectOption('#object',added.id);await stored.locator('#edit-name').fill('Mesa persistida');await stored.locator('#edit-name').dispatchEvent('change');await stored.reload();assert.equal(await stored.evaluate(id=>NorthValeAssetStudio.metadata().objects.find(o=>o.id===id)?.name,added.id),'Mesa persistida','auto-save survives reload');
  await page.locator('#clear-objects').click();assert.equal((await data()).objects.length,0);await page.locator('#undo').click();assert.equal((await data()).objects.length,23);
  await page.locator('#regenerate').click();assert.equal((await data()).objects.length,22);await page.locator('#undo').click();assert.equal((await data()).objects.length,23);
  // Compare architecture without clutter or wording: the silhouettes and structures differ.
  const profiles=new Set(),facades=[],facadeCards=[];
  for(const id of ['police','pharmacy','library','registry','diner','motel','meatpacking','scrapyard','sarah']){
   await page.selectOption('#scene',id+'-exterior');await page.locator('#show-props').uncheck();await change('#sign-text','NORTHVALE');const metadata=await data();profiles.add(metadata.architectureProfile);
   facadeCards.push({name:metadata.name,src:await snapshot()});
   facades.push(await page.evaluate(async()=>{const image=new Image();image.src=NorthValeAssetStudio.snapshot();await image.decode();const c=document.createElement('canvas');c.width=160;c.height=90;const g=c.getContext('2d');g.drawImage(image,0,0,160,90);return [...g.getImageData(0,0,160,90).data];}));
  }
  assert.equal(profiles.size,9);for(let i=0;i<facades.length;i++)for(let j=i+1;j<facades.length;j++){let changed=0;for(let k=0;k<facades[i].length;k+=4){if(Math.abs(facades[i][k]-facades[j][k])+Math.abs(facades[i][k+1]-facades[j][k+1])+Math.abs(facades[i][k+2]-facades[j][k+2])>30)changed++;}assert.ok(changed>350,`facades ${i},${j} differ structurally (${changed})`);}
  await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'editor fits phone width');
  const gallery=await context.newPage({viewport:{width:1500,height:1100}});await gallery.setContent('<html lang="pt-BR"><style>body{margin:0;background:#101819;color:#e8dfc8;font:17px Georgia;padding:25px}h1{font-weight:normal;letter-spacing:4px;font-size:24px}main{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}figure{margin:0;border:1px solid #455248;background:#17211f}img{display:block;width:100%}figcaption{padding:12px}</style><h1>NORTHVALE · ARQUITETURAS DOS LOCAIS</h1><main></main></html>');await gallery.evaluate(cards=>{for(const card of cards){const figure=document.createElement('figure'),image=document.createElement('img'),label=document.createElement('figcaption');image.src=card.src;label.textContent=card.name;figure.append(image,label);document.querySelector('main').append(figure);}},facadeCards);await gallery.screenshot({path:'test-results/facades-comparison.png',fullPage:true});
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
  console.log('Asset Editor passed offline: 77-item palette, placement, real drag, undo/redo, rotated collision, dimensions/materials, attachments, duplication/deletion, per-scene edits, project roundtrip, invalid-file rejection, empty/reset recovery, 9 distinct facades and mobile layout.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
