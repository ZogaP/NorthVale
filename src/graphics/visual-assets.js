import {TextureManager} from './texture-manager.js';
import {MaterialRenderer} from './material-renderer.js';
import {loadMaterial} from './procedural.js';
import {materialManifest} from './materials.js';
import {hash} from './random.js';
export class VisualAssets{
 constructor(){this.gpu=new MaterialRenderer();this.faces=new Map();this.surfaces=new Map();this.leases=new Map();this.errors=[];this.manifest=materialManifest;this.gpuEnabled=true;this.revision=0;
  this.manager=new TextureManager({loader:async(d,signal)=>{await new Promise(resolve=>requestAnimationFrame(resolve));return loadMaterial(d,signal);},dispose:material=>{this.gpu.release(material);for(const image of Object.values(material.maps))image.close?.();}});
  this.gpu.onRestore=()=>{this.faces.clear();this.surfaces.clear();this.revision++;};
  this.ensureSurfaces();
 }
 async loadOverrides(){if(globalThis.NORTHVALE_OFFLINE||!/^https?:$/.test(location.protocol))return;try{const response=await fetch('/assets/materials/manifest.json');if(response.status===404)return;if(!response.ok)throw Error('HTTP '+response.status);const custom=await response.json();if(custom.version!==1)throw Error('Unsupported manifest version');this.manifest={...materialManifest,faces:{...materialManifest.faces,...custom.faces},surfaces:{...materialManifest.surfaces,...custom.surfaces}};for(const key of [...this.leases.keys()]){const e=this.leases.get(key);this.leases.delete(key);e.lease?e.lease.release():e.request?.cancel();}this.faces.clear();this.surfaces.clear();this.ensureSurfaces();}catch(e){this.errors.push('Manifest: '+e.message);}}
 ensureSurfaces(){for(const [name,descriptor] of Object.entries(this.manifest.surfaces))this.acquire('surface:'+name,descriptor,-1);}
 acquire(key,descriptor,priority=0){if(this.leases.has(key))return;descriptor={...descriptor,size:Math.min(descriptor.size,key.startsWith('face:')?512:256)};const marker={};this.leases.set(key,marker);marker.request=this.manager.acquire(key+':'+hash(JSON.stringify(descriptor)),descriptor,priority);marker.request.then(lease=>{if(this.leases.get(key)!==marker){lease.release();return;}marker.lease=lease;this.revision++;}).catch(error=>{if(this.leases.get(key)!==marker)return;this.leases.delete(key);this.errors.push(key+': '+error.message);if(descriptor.maps&&descriptor.profile){const fallback={...descriptor,maps:null};this.acquire(key,fallback,priority);}});}
 updateCharacters(ids){const needed=new Set(ids.map(id=>'face:'+id));for(const key of this.leases.keys())if(key.startsWith('face:')&&!needed.has(key)){const e=this.leases.get(key);this.leases.delete(key);e.lease?e.lease.release():e.request?.cancel();this.faces.delete(key.slice(5));}
  for(const id of ids){const descriptor=this.manifest.faces[id];if(descriptor)this.acquire('face:'+id,descriptor,10);}}
 snapshot(image){const c=document.createElement('canvas');c.width=image.width;c.height=image.height;c.getContext('2d').drawImage(image,0,0);return c;}
 portrait(id){if(this.faces.has(id))return this.faces.get(id);const material=this.leases.get('face:'+id)?.lease?.value;if(!material)return null;const output=this.snapshot(this.gpuEnabled?this.gpu.render(material):material.maps.base);this.faces.set(id,output);return output;}
 surface(name){if(this.surfaces.has(name))return this.surfaces.get(name);const material=this.leases.get('surface:'+name)?.lease?.value;if(!material)return null;const output=this.snapshot(this.gpuEnabled?this.gpu.render(material,{ambient:[.7,.72,.75],roughness:.8}):material.maps.base);this.surfaces.set(name,output);return output;}
 setGPU(enabled){this.gpuEnabled=enabled;this.faces.clear();this.surfaces.clear();this.revision++;}
 stats(){return {...this.manager.stats(),webgl:this.gpu.available,shaderErrors:this.gpu.errors,errors:this.errors.slice(-5),gpuMaterials:this.gpu.handles.size,drawCalls:this.gpu.drawCalls};}
 destroy(){for(const e of this.leases.values())e.lease?.release();this.leases.clear();this.manager.destroy();this.gpu.destroy();}
}
