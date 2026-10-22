import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

// Bundle the project's own named ES modules without adding a build dependency.
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const modules=new Map();
async function bundle(file){
 if(modules.has(file))return modules.get(file).name;
 let source=await readFile(file,'utf8');
 const name=`module${modules.size}`;
 const record={name,code:''};modules.set(file,record);
 const imports=[...source.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"];?/g)];
 for(const match of imports){
  const dependency=await bundle(path.resolve(path.dirname(file),match[2]));
  source=source.replace(match[0],`const {${match[1]}}=${dependency};`);
 }
 const exports=[...source.matchAll(/export\s+(?:const|class|(?:async\s+)?function)\s+(\w+)/g)].map(m=>m[1]);
 source=source.replace(/export\s+(?=(?:const|class|(?:async\s+)?function)\s)/g,'');
 if(/\bimport\s|\bexport\s/.test(source))throw Error(`Unsupported module syntax in ${file}`);
 record.code=`const ${name}=(()=>{\n${source}\nreturn {${exports.join(',')}};\n})();`;
 return name;
}
await bundle(path.join(root,'src/main.js'));
// Records are inserted before dependencies; DFS emits dependencies first.
const ordered=[],seen=new Set();
function emit(record){if(seen.has(record.name))return;seen.add(record.name);for(const r of modules.values())if(record!==r&&record.code.includes(`=${r.name};`))emit(r);ordered.push(record.code);}
for(const record of modules.values())emit(record);
let html=await readFile(path.join(root,'index.html'),'utf8');
const css=await readFile(path.join(root,'style.css'),'utf8');
const interiorFiles=['sarah','police','ruth','pharmacy','library','motel','registry','meatpacking','home','diner','scrapyard','gasstation','depot','dam','ruins'];
const interiors=Object.fromEntries(await Promise.all(interiorFiles.map(async id=>[
 id,JSON.parse(await readFile(path.join(root,'assets/interiors',id+'.json'),'utf8'))
])));
html=html.replace('<link rel="stylesheet" href="/style.css">',()=>`<style>${css}</style>`);
html=html.replace('<script type="module" src="/src/main.js"></script>',()=>`<script>\n'use strict';\nglobalThis.NORTHVALE_OFFLINE=true;\nglobalThis.NORTHVALE_INTERIORS=${JSON.stringify(interiors).replace(/</g,'\\u003c')};\n${ordered.join('\n').replace(/<\/script/gi,'<\\/script')}\n</script>`);
const embeddedAssets = [
 'assets/scenes/delegacia/background_delegacia.png',
 'assets/scenes/delegacia/fore_mascara_delegacia.png',
 'assets/characters/alex_hale_walk.png',
 'assets/characters/npc_sargento_idle.png',
 'assets/characters/townspeople_walk.png',
 'assets/portraits/alex_portrait.png',
 'assets/portraits/suspeito_portrait.png',
 'assets/portraits/ruth_portrait.png',
];
for (const asset of embeddedAssets) {
 const bytes=await readFile(path.join(root,asset));
 const dataUrl=`data:image/png;base64,${bytes.toString('base64')}`;
 html=html.split(`/${asset}`).join(dataUrl);
}
const out=path.join(root,'dist');await mkdir(out,{recursive:true});
await writeFile(path.join(out,'NorthVale.html'),html);
console.log('Criado dist/NorthVale.html — abra diretamente em um navegador desktop.');
