const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {execFileSync}=require('node:child_process');

(async()=>{
 const browser=await chromium.launch({executablePath:process.env.NORTHVALE_CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  const context=await browser.newContext({viewport:{width:1600,height:1200},acceptDownloads:true});
  const page=await context.newPage(),errors=[],requests=[];
  page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>requests.push(request.url()));
  // Exercise the exact standalone artifact with all network access disabled.
  await context.setOffline(true);
  await page.setContent(await fs.readFile('NorthVale_AssetStudio.html','utf8'));
  await page.locator('#rain').uncheck();
  const catalog=await page.evaluate(()=>NorthValeAssetStudio.catalog());
  assert.equal(catalog.length,31);assert.equal(new Set(catalog.map(s=>s.id)).size,31);
  const suffix='Isometric 2.5D video game environment, 1989 neo-noir realism, hand-painted oil texture style like Disco Elysium, gritty dark muted palette, moody lighting, sharp focus --ar 16:9 --v 6.0';
  let totalObjects=0;const snapshots=new Set();
  for(const scene of catalog){
   assert.ok(scene.prompt.endsWith(suffix),scene.id);
   await page.selectOption('#scene',scene.id);
   const result=await page.evaluate(()=>{
    const data=NorthValeAssetStudio.metadata(),c=document.querySelector('#art'),g=c.getContext('2d'),pixels=g.getImageData(0,0,c.width,c.height).data;
    let visible=0,transparent=0;for(let i=3;i<pixels.length;i+=4){if(pixels[i]>0)visible++;else transparent++;}
    const sprite=data.spritesheet;
    const cells=[];
    if(sprite)for(let row=0;row<sprite.rows;row++)for(let col=0;col<sprite.columns;col++){
     const p=g.getImageData(col*sprite.frameWidth,row*sprite.frameHeight,sprite.frameWidth,sprite.frameHeight).data;
     let count=0,edge=0;for(let y=0;y<sprite.frameHeight;y++)for(let x=0;x<sprite.frameWidth;x++){const a=p[(y*sprite.frameWidth+x)*4+3];if(a){count++;if(x===0||y===0||x===sprite.frameWidth-1||y===sprite.frameHeight-1)edge++;}}
     cells.push({count,edge});
    }
    return {data,visible,transparent,cells,snapshot:NorthValeAssetStudio.snapshot()};
   });
   assert.ok(result.visible>5000,scene.id+' rendered');
   snapshots.add(result.snapshot);
   if(result.data.objects){
    totalObjects+=result.data.objects.length;
    assert.equal(new Set(result.data.objects.map(o=>o.id)).size,result.data.objects.length);
    for(const o of result.data.objects){assert.ok(Number.isFinite(o.screenAnchor.x));assert.ok(o.w>0&&o.h>0);assert.equal(Boolean(o.collision),o.solid);}
   }else{
    assert.ok(result.transparent>10000,scene.id+' transparent background');
    assert.equal(result.cells.length,scene.kind==='vehicle'?8:56);
    for(const cell of result.cells){assert.ok(cell.count>500,'nonempty frame');assert.equal(cell.edge,0,'no sprite crosses its frame boundary');}
   }
  }
  assert.ok(totalObjects>200);assert.equal(snapshots.size,31,'each preset produces different art');
  await page.selectOption('#scene','police-interior');
  const original=await page.evaluate(()=>NorthValeAssetStudio.snapshot());
  await page.locator('#seed').fill('991');await page.locator('#regenerate').click();
  assert.notEqual(await page.evaluate(()=>NorthValeAssetStudio.snapshot()),original);
  await page.locator('#seed').fill('1989');await page.locator('#regenerate').click();
  assert.equal(await page.evaluate(()=>NorthValeAssetStudio.snapshot()),original,'fixed seed is reproducible');
  await page.selectOption('#object',{index:1});assert.match(await page.locator('#object-info').innerText(),/police-interior:desk/);
  assert.equal(await page.evaluate(()=>NorthValeAssetStudio.snapshot()),original,'selection is excluded from export');
  const pick=await page.evaluate(()=>{const o=NorthValeAssetStudio.metadata().objects.find(o=>o.type==='safe'),r=document.querySelector('#art').getBoundingClientRect();return{x:r.x+(o.screenAnchor.x+o.w*43)*r.width/1600,y:r.y+(o.screenAnchor.y+o.d*22-o.h*21)*r.height/900};});
  await page.mouse.click(pick.x,pick.y);assert.match(await page.locator('#object-info').innerText(),/police-interior:safe/,'canvas picking inspects visible object');
  await page.locator('#lights').uncheck();assert.notEqual(await page.evaluate(()=>NorthValeAssetStudio.snapshot()),original,'lighting changes pixels');await page.locator('#lights').check();
  await page.selectOption('#layer','foreground');
  assert.ok(await page.evaluate(async()=>{const image=new Image();image.src=NorthValeAssetStudio.snapshot();await image.decode();const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const g=c.getContext('2d');g.drawImage(image,0,0);return g.getImageData(0,0,1,1).data[3]===0;}),'front layer preserves alpha');
  await page.selectOption('#layer','composite');await page.selectOption('#resolution','1920');
  const pngEvent=page.waitForEvent('download');await page.locator('#export-png').click();const png=await pngEvent;
  const out=path.resolve('test-results');await fs.mkdir(out,{recursive:true});await png.saveAs(path.join(out,'asset-studio-export.png'));
  const bytes=await fs.readFile(path.join(out,'asset-studio-export.png'));assert.equal(bytes.readUInt32BE(16),1920);assert.equal(bytes.readUInt32BE(20),1080);
  const jsonEvent=page.waitForEvent('download');await page.locator('#export-data').click();const json=await jsonEvent;await json.saveAs(path.join(out,'asset-studio-data.json'));const data=JSON.parse(await fs.readFile(path.join(out,'asset-studio-data.json'),'utf8'));assert.equal(data.projection.exportScale,1.2);assert.equal(data.objects.length,22);
  await page.selectOption('#resolution','1600');
  await page.screenshot({path:path.join(out,'asset-studio.png')});
  await page.selectOption('#object','police-interior:desk-1');await page.locator('#edit-name').fill('Mesa personalizada no ZIP');await page.locator('#edit-name').dispatchEvent('change');
  const zipEvent=page.waitForEvent('download',{timeout:120000});await page.locator('#export-all').click();const archive=await zipEvent;await archive.saveAs(path.join(out,'NorthVale-Assets-1989.zip'));
  const names=execFileSync('unzip',['-Z1',path.join(out,'NorthVale-Assets-1989.zip')],{encoding:'utf8'}).trim().split('\n');
  assert.equal(names.filter(n=>n.startsWith('png/')).length,31);assert.equal(names.filter(n=>n.startsWith('layers/')).length,44);assert.equal(names.filter(n=>n.startsWith('data/')).length,31);
  execFileSync('unzip',['-t',path.join(out,'NorthVale-Assets-1989.zip')]);
  const exported=JSON.parse(execFileSync('unzip',['-p',path.join(out,'NorthVale-Assets-1989.zip'),'data/police-interior.json'],{encoding:'utf8'}));assert.equal(exported.objects[0].name,'Mesa personalizada no ZIP','bulk export keeps edits');
  await page.waitForFunction(()=>!document.querySelector('#export-all').disabled);
  assert.equal(await page.locator('#scene').inputValue(),'police-interior','batch restores selection');assert.match(await page.locator('#status').innerText(),/Catálogo exportado/);
  assert.equal(await page.evaluate(()=>NorthValeAssetStudio.metadata().objects[0].name),'Mesa personalizada no ZIP','bulk export restores custom scene');
  await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile layout fits');
  assert.deepEqual(requests,[],'standalone makes no requests');assert.deepEqual(errors,[]);
  console.log(`Asset Studio smoke passed offline: 31 distinct presets, ${totalObjects} objects, deterministic seeds, clean exports, light/alpha checks, all sprite frames, 109 ZIP entries and responsive controls.`);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
