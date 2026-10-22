export class SpriteCache{
 constructor(budget=8*1024*1024){this.budget=budget;this.bytes=0;this.items=new Map();}
 get(key){const value=this.items.get(key);if(value){this.items.delete(key);this.items.set(key,value);}return value;}
 put(key,value){const old=this.items.get(key);if(old){this.bytes-=old.bytes;this.items.delete(key);}this.items.set(key,value);this.bytes+=value.bytes;while(this.bytes>this.budget&&this.items.size){const oldest=this.items.keys().next().value;const entry=this.items.get(oldest);this.items.delete(oldest);this.bytes-=entry.bytes;}return value;}
 clear(){this.items.clear();this.bytes=0;}
}
