import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const url=process.env.NORTHVALE_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch({...(process.env.NORTHVALE_CHROMIUM_PATH?{executablePath:process.env.NORTHVALE_CHROMIUM_PATH}:{}),headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage();await page.goto(url);
 const output=await page.evaluate(async()=>{
  const {materialManifest}=await import('/src/graphics/materials.js');const {loadMaterial}=await import('/src/graphics/procedural.js');
  const files=[],manifest=structuredClone(materialManifest);
  for(const group of ['faces','surfaces'])for(const [id,d]of Object.entries(manifest[group])){
   const material=await loadMaterial(d,new AbortController().signal);d.maps={};
   for(const [channel,image]of Object.entries(material.maps)){const name=`${group}/${id}-${channel}.png`;files.push({name,data:image.toDataURL('image/png').split(',')[1]});d.maps[channel]='/assets/materials/'+name;}
  }
  return {files,manifest};
 });
 const root=new URL('../assets/materials/',import.meta.url);await mkdir(root,{recursive:true});
 for(const file of output.files){await mkdir(new URL(file.name.split('/')[0]+'/',root),{recursive:true});await writeFile(new URL(file.name,root),Buffer.from(file.data,'base64'));}
 await writeFile(new URL('manifest.json',root),JSON.stringify(output.manifest,null,2)+'\n');
 console.log(`NorthVale: ${output.files.length} original procedural PNG maps baked with manifest.`);
}finally{await browser.close();}
