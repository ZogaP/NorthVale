import {buildings,door,collides} from './world.js';
export const residents=[
 {id:'helen',name:'Helen Miller',color:'#c09a72',home:'sarah',work:'diner',personality:'A mãe de Sarah. Exausta, mas determinada.',schedule:[[0,'sarah','Dormindo'],[6,'sarah','Em casa'],[8,'police','Esperando notícias'],[12,'diner','Trabalhando'],[18,'sarah','Em casa'],[23,'sarah','Dormindo']]},
 {id:'ruth',name:'Xerife Ruth',color:'#899e8e',home:'home',work:'police',personality:'Fala pouco. Observa tudo.',schedule:[[0,'home','Dormindo'],[7,'police','Em serviço'],[12,'diner','Almoçando'],[13,'police','Em serviço'],[21,'home','Em casa']]},
 {id:'elias',name:'Elias Ward',color:'#a1947a',home:'home',work:'pharmacy',personality:'Farmacêutico. Coleciona discos de jazz.',schedule:[[0,'home','Dormindo'],[7,'diner','Tomando café'],[8,'pharmacy','Trabalhando'],[12,'diner','Almoçando'],[13,'pharmacy','Trabalhando'],[18,'library','Lendo'],[20,'home','Em casa']]},
 {id:'owen',name:'Owen Briggs',color:'#a28575',home:'motel',work:'depot',personality:'Cuida do depósito e conserta bicicletas.',schedule:[[0,'motel','Dormindo'],[7,'depot','Trabalhando'],[12,'diner','Almoçando'],[13,'depot','Trabalhando'],[18,'dam','Caminhando'],[20,'motel','Descansando']]},
 {id:'viktor',name:'Viktor Sloane',color:'#6b7c85',home:'meatpacking',work:'meatpacking',personality:'Magnata industrial do frigorífico. Impaciente e calculista.',schedule:[[0,'meatpacking','No escritório'],[8,'meatpacking','Supervisionando fábrica'],[12,'diner','Almoçando'],[14,'registry','No cartório'],[18,'dam','Inspeção'],[20,'meatpacking','Trabalhando']]},
 {id:'clara',name:'Clara Young',color:'#ab9a8a',home:'home',work:'library',personality:'Arquivista e bibliotecária. Cuidadosa com as palavras.',schedule:[[0,'home','Dormindo'],[8,'library','Acervo'],[12,'diner','Almoçando'],[14,'registry','Consultando arquivos'],[18,'library','Trabalhando'],[21,'home','Em casa']]},
 {id:'bobby',name:'Bobby Vance',color:'#846c59',home:'motel',work:'scrapyard',personality:'Mecânico forasteiro. Olhar inquieto e temperamento hostil.',schedule:[[0,'motel','No quarto'],[8,'scrapyard','Desmanchando peças'],[12,'diner','Comendo sozinho'],[14,'scrapyard','Oficina'],[19,'ruins','Vagando'],[22,'motel','Descansando']]}
];
export function routine(person,minute){let current=person.schedule[0];for(const slot of person.schedule)if(slot[0]*60<=minute%1440)current=slot;return {place:current[1],activity:current[2]};}
// Travel follows sidewalk waypoints, never a straight line through a building.
const routeCache=new Map();
export function route(from,to){
 const key=`${from.x},${from.y}:${to.x},${to.y}`;if(routeCache.has(key))return routeCache.get(key);
 const clear=(a,b)=>{const n=Math.ceil(Math.hypot(a.x-b.x,a.y-b.y)/5);for(let i=0;i<=n;i++){const t=n?i/n:0;if(collides(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,7))return false;}return true;};
 const snap=p=>{const candidates=[];for(let dx=-40;dx<=40;dx+=20)for(let dy=-40;dy<=40;dy+=20){const q={x:Math.round(p.x/20)*20+dx,y:Math.round(p.y/20)*20+dy};if(clear(p,q))candidates.push(q);}return candidates.sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];};
 const start=snap(from),end=snap(to);if(!start||!end)throw Error('Ponto de rotina sem acesso');
 const id=p=>`${p.x},${p.y}`,open=[start],scores=new Map([[id(start),0]]),parent=new Map(),seen=new Set();
 while(open.length){open.sort((a,b)=>(scores.get(id(a))+Math.abs(a.x-end.x)+Math.abs(a.y-end.y))-(scores.get(id(b))+Math.abs(b.x-end.x)+Math.abs(b.y-end.y)));const p=open.shift(),pid=id(p);if(seen.has(pid))continue;seen.add(pid);if(pid===id(end)){const path=[to,p];let k=pid;while(parent.has(k)){const prev=parent.get(k);path.push(prev);k=id(prev);}path.push(from);path.reverse();routeCache.set(key,path);return path;}
 for(const [dx,dy] of [[20,0],[-20,0],[0,20],[0,-20]]){const q={x:p.x+dx,y:p.y+dy},qid=id(q),score=scores.get(pid)+20;if(!seen.has(qid)&&clear(p,q)&&score<(scores.get(qid)??Infinity)){scores.set(qid,score);parent.set(qid,p);open.push(q);}}
 }throw Error('Rota indisponível');
}
export function residentPosition(person,minute){let active=person.schedule[0],previous=person.schedule.at(-1);for(let i=0;i<person.schedule.length;i++)if(person.schedule[i][0]*60<=minute%1440){active=person.schedule[i];previous=person.schedule[(i+person.schedule.length-1)%person.schedule.length];}
 const a=door(buildings.find(b=>b.id===previous[1])),b=door(buildings.find(b=>b.id===active[1]));
 const elapsed=(minute%1440-active[0]*60+1440)%1440;
 const points=route(a,b),lengths=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.y-points[i].y));
 const total=lengths.reduce((x,y)=>x+y,0),duration=total/90;
 if(elapsed>=duration||total===0)return {...b,inside:!['Esperando notícias','Caminhando'].includes(active[2]),activity:active[2]};
 let distance=elapsed*90;
 for(let i=0;i<lengths.length;i++){if(distance<=lengths[i]&&lengths[i]>0){const t=distance/lengths[i];return {x:points[i].x+(points[i+1].x-points[i].x)*t,y:points[i].y+(points[i+1].y-points[i].y)*t,inside:false,activity:'Em deslocamento'};}distance-=lengths[i];}
 return {...b,inside:false,activity:active[2]};
}
export function updateVehicle(car,input,dt){const throttle=(input.forward?1:0)-(input.back?1:0);car.speed+=throttle*125*dt;car.speed*=Math.exp(-(throttle?0.35:1.4)*dt);if(input.brake)car.speed*=Math.exp(-5*dt);car.speed=Math.max(-75,Math.min(235,car.speed));car.angle+=((input.right?1:0)-(input.left?1:0))*car.speed/110*dt;return {dx:Math.cos(car.angle)*car.speed*dt,dy:Math.sin(car.angle)*car.speed*dt};}
