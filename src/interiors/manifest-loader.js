export const INTERIOR_IDS=['sarah','police','ruth','pharmacy','library','motel','registry','meatpacking','home','diner','scrapyard','gasstation','depot','dam','ruins'];
const identifier=value=>typeof value==='string'&&/^[a-z][a-z0-9-]{0,70}$/.test(value);
const finite=(value,min,max)=>Number.isFinite(value)&&value>=min&&value<=max;
export function validateManifest(data){
 if(!data||data.version!==1||!identifier(data.id)||!Array.isArray(data.rooms)||!data.rooms.length||data.rooms.length>30||!Array.isArray(data.doors))throw Error('Manifesto de interior inválido.');
 const rooms=new Map();
 for(const room of data.rooms){
  if(!identifier(room.id)||room.id==='doors'||rooms.has(room.id)||!finite(room.bounds?.w,240,1800)||!finite(room.bounds?.h,240,1200)||!finite(room.spawn?.x,12,room.bounds.w-12)||!finite(room.spawn?.y,12,room.bounds.h-12)||!Array.isArray(room.props)||!Array.isArray(room.lights)||!finite(room.ambient,.1,1))throw Error(`Cômodo inválido: ${data.id}/${room.id}`);
  rooms.set(room.id,room);const ids=new Set();
  for(const object of room.props){if(!identifier(object.id)||object.id==='visit'||/^(light-|detail-)/.test(object.id)||ids.has(object.id)||typeof object.type!=='string'||![object.x,object.y,object.w,object.h,object.height,object.baseZ||0].every(Number.isFinite)||object.x<0||object.y<0||object.w<=0||object.h<=0||object.x+object.w>room.bounds.w||object.y+object.h>room.bounds.h||object.height<0||object.height>180)throw Error(`Prop inválido: ${data.id}/${room.id}/${object.id}`);ids.add(object.id);}
  for(const object of room.props)if(object.parentId&&!ids.has(object.parentId))throw Error(`Suporte ausente: ${object.id}`);
  const lightIds=new Set();for(const light of room.lights){if(!identifier(light.id)||lightIds.has(light.id)||!['tungsten','fluorescent','moon'].includes(light.kind)||![light.x,light.y,light.z,light.radius,light.intensity].every(Number.isFinite)||light.radius<=0||!/^#[a-f0-9]{6}$/i.test(light.color))throw Error(`Luz inválida em ${data.id}/${room.id}`);lightIds.add(light.id);}
  if(!finite(room.dressing?.density,0,200)||!Array.isArray(room.dressing.types))throw Error(`Densidade inválida em ${room.id}`);
 }
 const doors=new Set();
 for(const door of data.doors){
  if(!identifier(door.id)||doors.has(door.id)||door.a.room===door.b.room||typeof door.isOpen!=='boolean'||typeof door.isLocked!=='boolean'||door.isOpen&&door.isLocked||door.requiresKey!=null&&typeof door.requiresKey!=='string')throw Error(`Porta inválida: ${door.id}`);doors.add(door.id);
  for(const p of [door.a,door.b]){const room=rooms.get(p.room);if(!room||!['north','south','east','west','marker'].includes(p.side)||!finite(p.width,32,110))throw Error(`Ligação inválida: ${door.id}`);if(p.side==='marker'){if(![p.x,p.y,p.approach?.x,p.approach?.y].every(Number.isFinite))throw Error(`Marcador inválido: ${door.id}`);}else{const limit=['north','south'].includes(p.side)?room.bounds.w:room.bounds.h;if(!finite(p.offset,p.width/2+14,limit-p.width/2-14))throw Error(`Porta fora da parede: ${door.id}`);}}
 }
 if(!rooms.has(data.entranceRoom)||!rooms.has(data.exit?.room))throw Error(`Entrada ou saída inválida: ${data.id}`);
 const seen=new Set([data.entranceRoom]);let changed=true;while(changed){changed=false;for(const d of data.doors)if(seen.has(d.a.room)||seen.has(d.b.room)){for(const p of [d.a,d.b])if(!seen.has(p.room)){seen.add(p.room);changed=true;}}}
 if(seen.size!==rooms.size)throw Error(`Cômodos desconectados: ${data.id}`);
 return data;
}
export class InteriorManifestLoader{
 constructor({fetcher=globalThis.fetch,embedded=globalThis.NORTHVALE_INTERIORS}={}){this.fetcher=fetcher?.bind(globalThis);this.embedded=embedded;this.manifests=new Map();this.pending=null;}
 load(){if(this.pending)return this.pending;this.pending=Promise.all(INTERIOR_IDS.map(async id=>{let data=this.embedded?.[id];if(!data){const response=await this.fetcher(`/assets/interiors/${id}.json`);if(!response.ok)throw Error(`Não foi possível carregar o interior ${id} (${response.status}).`);data=await response.json();}validateManifest(data);if(data.id!==id)throw Error(`ID de manifesto divergente: ${id}`);return[id,data];})).then(entries=>{this.manifests=new Map(entries);return this.manifests;}).catch(error=>{this.pending=null;throw error;});return this.pending;}
 get(id){const data=this.manifests.get(id);if(!data)throw Error(`Interior não carregado: ${id}`);return data;}
}
