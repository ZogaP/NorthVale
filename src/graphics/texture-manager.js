// One cache entry owns one decoded material set; callers lease it with release().
export class TextureManager{
 constructor({budget=48*1024*1024,concurrency=2,loader,dispose}={}){
  this.budget=budget;this.concurrency=concurrency;this.loader=loader;this.dispose=dispose||((v)=>{for(const image of Object.values(v.maps||{}))image.close?.();});
  this.entries=new Map();this.queue=[];this.active=0;this.bytes=0;this.clock=0;this.closed=false;
 }
 acquire(key,descriptor,priority=0){
  if(this.closed)return Promise.reject(Error('Texture manager disposed'));
  let e=this.entries.get(key);
  if(!e){e={key,descriptor,refs:0,used:++this.clock,priority,controller:new AbortController(),status:'queued'};e.promise=new Promise((resolve,reject)=>{e.resolve=resolve;e.reject=reject;});this.entries.set(key,e);this.queue.push(e);}
  e.refs++;e.used=++this.clock;e.priority=Math.max(e.priority,priority);this.pump();
  let released=false,cancelled=false,rejectRequest;
  const request=new Promise((resolve,reject)=>{rejectRequest=reject;e.promise.then(value=>{if(!cancelled)resolve({value,release:()=>{if(!released){released=true;this.releaseEntry(e);}}});},reject);});
  request.cancel=()=>{if(released)return;cancelled=released=true;this.releaseEntry(e);if(e.refs===0&&e.status!=='ready'){e.controller.abort();if(e.status==='queued'){this.queue=this.queue.filter(x=>x!==e);this.entries.delete(e.key);e.reject(Error('Material load cancelled'));}}rejectRequest(Error('Material request cancelled'));};
  return request;
 }
 releaseEntry(e){e.refs=Math.max(0,e.refs-1);e.used=++this.clock;this.trim();}
 pump(){this.queue.sort((a,b)=>b.priority-a.priority);while(!this.closed&&this.active<this.concurrency&&this.queue.length){const e=this.queue.shift();e.status='loading';this.active++;Promise.resolve().then(()=>this.loader(e.descriptor,e.controller.signal)).then(value=>{
   if(e.controller.signal.aborted||this.closed){this.dispose(value);throw Error('Material load cancelled');}
   e.value=value;e.bytes=value.bytes||0;e.status='ready';this.bytes+=e.bytes;e.resolve(value);this.trim();
  }).catch(error=>{if(this.entries.get(e.key)===e)this.entries.delete(e.key);e.reject(error);}).finally(()=>{this.active--;this.pump();});}}
 trim(){for(const e of [...this.entries.values()].filter(e=>e.status==='ready'&&e.refs===0).sort((a,b)=>a.used-b.used)){if(this.bytes<=this.budget)break;this.entries.delete(e.key);this.bytes-=e.bytes;this.dispose(e.value);}}
 cancelUnused(){for(const e of [...this.entries.values()])if(!e.refs&&e.status!=='ready'){e.controller.abort();if(e.status==='queued'){this.queue=this.queue.filter(x=>x!==e);this.entries.delete(e.key);e.reject(Error('Material load cancelled'));}}}
 stats(){return {bytes:this.bytes,budget:this.budget,entries:this.entries.size,active:this.active,queued:this.queue.length,pinned:[...this.entries.values()].filter(e=>e.refs>0).length,overBudget:this.bytes>this.budget};}
 destroy(){this.closed=true;for(const e of this.entries.values()){e.controller.abort();if(e.status==='ready')this.dispose(e.value);else e.reject(Error('Texture manager disposed'));}this.entries.clear();this.queue=[];this.bytes=0;}
}
