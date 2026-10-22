import {mkdir,writeFile} from 'node:fs/promises';
import {materialVertex,materialFragment} from '../src/graphics/shaders.js';
await mkdir(new URL('../shaders/',import.meta.url),{recursive:true});
await writeFile(new URL('../shaders/material.vert.glsl',import.meta.url),materialVertex+'\n');
await writeFile(new URL('../shaders/material.frag.glsl',import.meta.url),materialFragment+'\n');
console.log('NorthVale GLSL exported from src/graphics/shaders.js');
