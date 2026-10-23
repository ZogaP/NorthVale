import {random,hash} from '../graphics/random.js';
// Only micro-detail is scattered. Furniture and traffic lanes are authored in JSON.
export function dressRoom(building,room){
 const rnd=random(`${building}:${room.id}:${room.dressing.seed}`),detail=[],types=room.dressing.types,counts={};
 const supports=room.props.filter(p=>['table','steel','counter','shelf','files','catalog'].includes(p.type));
 for(let i=0;i<room.dressing.density;i++){
  let type=types[i%types.length];const cap={calendar:1,directory:1,calculator:1,wire:3,damp:8,photos:4,mug:5,flyer:4};if((counts[type]||0)>=(cap[type]??Infinity))type=room.finish.condition==='clean'?'paper':['dust','mud','ash'][i%3];counts[type]=(counts[type]||0)+1;
  if(type==='calendar'){detail.push({id:`detail-${i}`,type,name:'Calendário de outubro de 1989',x:room.bounds.w*.56,y:10,w:31,h:6,height:36,baseZ:43,solid:false,interactive:false});continue;}
  const surface=['mug','pen','ashtray','calculator','directory','flyer','books','paper','photos'].includes(type),parent=surface&&supports.length?supports[Math.floor(rnd()*supports.length)]:null;
  const rawWidth=type==='mud'?9:type==='damp'?26:5+rnd()*10,rawDepth=type==='damp'?16:4+rnd()*8;
  const width=parent?Math.min(rawWidth,parent.w-4):rawWidth,height=parent?Math.min(rawDepth,parent.h-4):rawDepth;
  const x=parent?parent.x+2+rnd()*Math.max(0,parent.w-width-4):22+rnd()*(room.bounds.w-50);
  const y=parent?parent.y+2+rnd()*Math.max(0,parent.h-height-4):22+rnd()*(room.bounds.h-50);
  detail.push({id:`detail-${i}`,type,name:room.dressing.story,x,y,w:width,h:height,height:type==='mug'?3:type==='bottle'?8:1,baseZ:parent?(parent.baseZ??0)+parent.height+.2:.15,parentId:parent?.id,solid:false,interactive:false,color:['#b5aa83','#8b7855','#676b50','#727e73'][Math.floor(rnd()*4)],seed:hash(`${room.id}:${i}`)});
 }
 return detail;
}
