const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');

fs.mkdirSync('test-results',{recursive:true});

(async()=>{
 const browser=await chromium.launch({
  ...(process.env.NORTHVALE_CHROMIUM_PATH?{executablePath:process.env.NORTHVALE_CHROMIUM_PATH}:{}),
  headless:true,
  args:['--no-sandbox','--enable-unsafe-swiftshader'],
 });
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  page.setDefaultTimeout(15000);
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(process.env.NORTHVALE_URL||'http://127.0.0.1:5173');
  await page.click('#begin');
  await page.keyboard.press('Space');
  await page.click('#save');
  const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('northvale-save')));
  state.interior='police';
  state.outdoor={x:700,y:700,vx:0,vy:0,angle:0};
  state.player={x:520,y:900,vx:0,vy:0,angle:-Math.PI/2};
  await page.evaluate(value=>localStorage.setItem('northvale-save',JSON.stringify(value)),state);
  await page.click('#load');

  const assets=await page.evaluate(async()=>{
   const {PoliceStationScene}=await import('/src/scenes/police-station.js');
   const scene=new PoliceStationScene();
   await scene.ready;
   return {
    background:[scene.background.naturalWidth,scene.background.naturalHeight],
    foreground:[scene.foreground.naturalWidth,scene.foreground.naturalHeight],
    alex:[scene.alexSheet.image.naturalWidth,scene.alexSheet.image.naturalHeight],
    ruth:[scene.ruthSheet.image.naturalWidth,scene.ruthSheet.image.naturalHeight],
    path:scene.pathfind({x:520,y:900},{x:875,y:485}).length,
   };
  });
  assert.deepEqual(assets.background,[1536,1024]);
  assert.deepEqual(assets.foreground,[1536,1024]);
  assert.deepEqual(assets.alex,[1536,1152]);
  assert.deepEqual(assets.ruth,[1536,768]);
  assert.ok(assets.path>2);
  await page.waitForTimeout(500);
  assert.match(await page.locator('#prompt').innerText(),/Sair da delegacia/);
  await page.screenshot({path:'test-results/delegacia.png'});

  state.player={x:875,y:560,vx:0,vy:0,angle:0};
  await page.evaluate(value=>localStorage.setItem('northvale-save',JSON.stringify(value)),state);
  await page.click('#load');
  await page.waitForTimeout(150);
  await page.keyboard.press('e');
  const dialogue=page.locator('#dialogue');
  await dialogue.waitFor({state:'visible'});
  assert.match(await dialogue.innerText(),/SARGENTO RUTH MERCER/);
  assert.equal(await page.locator('.dialogue-portrait').evaluate(image=>image.naturalWidth),256);
  assert.equal(await page.locator('.dialogue-choices button').count(),2);
  await page.screenshot({path:'test-results/delegacia-dialogo.png'});
  await page.locator('.dialogue-choices button').first().click();
  assert.match(await dialogue.innerText(),/ALEX HALE/);
  assert.match(await page.locator('.dialogue-portrait').getAttribute('src'),/alex_portrait/);
  await page.keyboard.press('Escape');

  state.player={x:600,y:640,vx:0,vy:0,angle:0};
  await page.evaluate(value=>localStorage.setItem('northvale-save',JSON.stringify(value)),state);
  await page.click('#load');
  await page.waitForTimeout(150);
  await page.keyboard.press('e');
  await dialogue.waitFor({state:'visible'});
  assert.match(await dialogue.innerText(),/Três desaparecimentos/);
  await page.keyboard.press('Space');
  assert.match(await dialogue.innerText(),/VICTOR SLOANE/);
  assert.match(await page.locator('.dialogue-portrait').getAttribute('src'),/suspeito_portrait/);
  assert.deepEqual(errors,[]);
  console.log('Police scene smoke passed: painted layers, 8-direction sheets, A*, interactions, portrait dialogue and no page errors.');
 }finally{
  await browser.close();
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
