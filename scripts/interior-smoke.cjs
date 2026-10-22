const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');

(async()=>{
 const browser=await chromium.launch({executablePath:process.env.NORTHVALE_CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
  await page.goto(process.env.NORTHVALE_URL||'http://127.0.0.1:5173');await page.click('#begin');await page.keyboard.press('Space');await page.click('#save');
  const initial=await page.evaluate(()=>JSON.parse(localStorage.getItem('northvale-save')));
  const load=async(building,room,player)=>{const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('northvale-save')));state.interior=building;state.interiorRoom=room;state.outdoor={...initial.player};state.player={...player,vx:0,vy:0,angle:0};await page.evaluate(s=>localStorage.setItem('northvale-save',JSON.stringify(s)),state);await page.click('#load');await page.waitForFunction(r=>document.querySelector('#room-hud').dataset.room===r,room);return state;};
  const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('northvale-save')));
  const waitRoom=room=>page.waitForFunction(r=>document.querySelector('#room-hud').dataset.room===r,room);
  const clickWorld=async(w,h,x,y,z)=>{const p=await page.evaluate(({w,h,x,y,z})=>{const scale=Math.min(1.85,(innerWidth-210)/((w+h)*.78+180),(innerHeight-210)/((w+h)*.39+170));return{x:innerWidth*.5+((x-y)*.78-(w-h)*.39)*scale,y:innerHeight*.56+((x+y)*.39-z-(w+h)*.195)*scale};},{w,h,x,y,z});await page.mouse.click(p.x,p.y);};
  await load('sarah','living',{x:270,y:395});
  await page.locator('[data-door="living-kitchen"]').click();await waitRoom('kitchen');
  assert.equal((await read()).interiorRoom,'kitchen','transition checkpoint is automatic');
  await load('sarah','kitchen',{x:130,y:125});await page.keyboard.press('e');await page.waitForFunction(()=>JSON.parse(localStorage.getItem('northvale-save')).inventory.includes('Chave do quarto de Sarah'));
  assert.ok((await read()).interiorStates['northvale:sarah:kitchen:pantry'].isOpen);
  // Click the actual door leaf on Canvas, then walk and transition through it.
  await clickWorld(620,400,170,380,45);await waitRoom('hall');
  await page.locator('[data-door="hall-bedroom"]').click();await waitRoom('bedroom');
  await page.click('#door-close');await page.click('#door-lock');assert.equal((await read()).interiorStates['northvale:sarah:doors:hall-bedroom'].isLocked,true);
  // The elevated recorder must win picking over its supporting desk.
  await clickWorld(560,440,200,156,51);await page.locator('#panel').waitFor({state:'visible'});assert.match(await page.locator('#content').innerText(),/Fita K7/);await page.click('#close');assert.ok((await read()).evidence.includes('tape'));
  await fs.mkdir('test-results',{recursive:true});await page.screenshot({path:'test-results/interior-sarah-bedroom.png'});
  const before=await page.locator('#world').evaluate(c=>{const data=c.getContext('2d').getImageData(350,200,700,600).data;let sum=0;for(let i=0;i<data.length;i+=4)sum+=data[i]+data[i+1]+data[i+2];return sum;});
  await clickWorld(560,440,508,355,3);await page.waitForFunction(()=>JSON.parse(localStorage.getItem('northvale-save')).interiorStates['northvale:sarah:bedroom:light-ceiling']?.isOn===false);
  await page.waitForTimeout(150);const after=await page.locator('#world').evaluate(c=>{const data=c.getContext('2d').getImageData(350,200,700,600).data;let sum=0;for(let i=0;i<data.length;i+=4)sum+=data[i]+data[i+1]+data[i+2];return sum;});assert.ok(before-after>100000,'switch changes room lighting pixels');
  await page.click('#load');await waitRoom('bedroom');assert.equal((await read()).interiorStates['northvale:sarah:bedroom:light-ceiling'].isOn,false);assert.equal((await read()).interiorStates['northvale:sarah:doors:hall-bedroom'].isLocked,true);
  await page.screenshot({path:'test-results/interior-sarah-dark.png'});
  await load('police','reception',{x:800,y:465});await page.locator('[data-door="reception-office"]').click();await waitRoom('office');await page.screenshot({path:'test-results/interior-police-office.png'});
  assert.equal((await read()).interiorStates['northvale:police:office:light-ceiling'],undefined,'Sarah switch never changes office light');
  await page.locator('[data-door="office-interrogation"]').click();await waitRoom('interrogation');await page.screenshot({path:'test-results/interior-interrogation.png'});
  await load('sarah','living',{x:130,y:170});await clickWorld(540,460,270,436,1);await page.waitForFunction(()=>JSON.parse(localStorage.getItem('northvale-save')).interior===null);await page.locator('#room-hud').waitFor({state:'hidden'});
  assert.deepEqual(errors,[]);
  console.log('Interior smoke passed: real room routes, Canvas door picking, key drawer, locked bedroom, elevated evidence picking, automatic checkpoints, independent light pixels, reload persistence and painted police reception transition.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
