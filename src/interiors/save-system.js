import {serialize} from '../state.js';
import {readSave,SAVE_KEY} from '../storage.js';
export function globalObjectId(building,room,object){return `northvale:${building}:${room}:${object}`;}
export class SaveSystem{
 constructor(state){this.state=state;state.interiorStates??={};}
 read(id,defaults={}){return{...defaults,...this.state.interiorStates[id]};}
 patch(id,changes){const next={...this.state.interiorStates[id],...changes};this.state.interiorStates[id]=next;return next;}
 interact(id,changes={}){return this.patch(id,{...changes,interactions:(this.read(id).interactions||0)+1});}
 save(storage){storage.setItem(SAVE_KEY,serialize(this.state));}
 static load(storage){return readSave(storage);}
}
