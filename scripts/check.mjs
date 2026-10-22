import {readdir,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {Script} from 'node:vm';
async function check(directory){for(const entry of await readdir(directory,{withFileTypes:true})){const file=`${directory}/${entry.name}`;if(entry.isDirectory())await check(file);else if(/\.(?:js|mjs|cjs)$/.test(file))execFileSync(process.execPath,['--check',file],{stdio:'inherit'});}}
for(const directory of ['src','scripts','tests'])await check(directory);
const studio=await readFile('NorthVale_AssetStudio.html','utf8');new Script(studio.match(/<script>([\s\S]*?)<\/script>/)[1]);
console.log('JavaScript syntax checked: runtime, scripts, tests and standalone editor.');
