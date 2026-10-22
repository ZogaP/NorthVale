export const WORLD={width:1900,height:1700,roads:[{x:0,y:740,w:1900,h:140},{x:880,y:0,w:140,h:1700}]};
export const buildings=[
 {id:'police',name:'DELEGACIA',x:580,y:450,w:220,h:200,color:'#626e6c',roof:'#354b50',kind:'civic',open:0,close:24},
 {id:'sarah',name:'CASA DOS MILLER',x:1080,y:470,w:170,h:180,color:'#898274',roof:'#3c4c4e',kind:'house',open:0,close:24},
 {id:'diner',name:'DOUBLE R DINER',x:340,y:970,w:230,h:160,color:'#8e7865',roof:'#5a3b35',kind:'shop',open:6,close:23},
 {id:'pharmacy',name:'FARMÁCIA VALE',x:1090,y:960,w:190,h:160,color:'#748578',roof:'#384e47',kind:'shop',open:8,close:18},
 {id:'library',name:'BIBLIOTECA',x:1350,y:440,w:220,h:210,color:'#857361',roof:'#454b4f',kind:'civic',open:9,close:21},
 {id:'motel',name:'NORTHVALE MOTEL',x:1400,y:990,w:290,h:160,color:'#9c896a',roof:'#674f42',kind:'shop',open:0,close:24},
 {id:'home',name:'CASA DE ELIAS',x:580,y:180,w:180,h:140,color:'#79857a',roof:'#424d43',kind:'house',open:0,close:24},
 {id:'depot',name:'DEPÓSITO NORTE',x:300,y:280,w:180,h:210,color:'#767773',roof:'#444c50',kind:'industrial',open:7,close:18},
 {id:'dam',name:'ESTAÇÃO DA REPRESA',x:1090,y:130,w:220,h:150,color:'#707d7a',roof:'#3a494c',kind:'industrial',open:7,close:19},
 {id:'ruins',name:'CAPELA EM RUÍNAS',x:360,y:1300,w:180,h:180,color:'#706d60',roof:'#3a4340',kind:'ruin',open:0,close:24},
 {id:'registry',name:'CARTÓRIO MUNICIPAL',x:1320,y:1280,w:200,h:180,color:'#818477',roof:'#535d55',kind:'civic',open:8,close:18},
 {id:'meatpacking',name:'FRIGORÍFICO SLOANE',x:1580,y:250,w:240,h:190,color:'#65756c',roof:'#465f55',kind:'industrial',open:6,close:22},
 {id:'scrapyard',name:'OFICINA DE SAM',x:70,y:1010,w:210,h:230,color:'#7d7359',roof:'#5a5845',kind:'industrial',open:7,close:20},
 {id:'ruth',name:'CASA DE RUTH',x:1120,y:1400,w:170,h:160,color:'#727e6c',roof:'#4c5945',kind:'house',open:0,close:24},
 {id:'gasstation',name:'POSTO PINE RIDGE',x:1600,y:1320,w:220,h:180,color:'#6b8068',roof:'#52634e',kind:'shop',open:0,close:24}
];
export function door(b){return {x:b.x+b.w/2,y:b.y+b.h+18};}
export function isOpen(b,minute){const h=(minute/60)%24;return h>=b.open&&h<b.close;}
export function collides(x,y,r=10){return x<r||y<r||x>WORLD.width-r||y>WORLD.height-r||buildings.some(b=>x>b.x-r&&x<b.x+b.w+r&&y>b.y-r&&y<b.y+b.h+r);}
export function move(body,dx,dy,r=10){if(!collides(body.x+dx,body.y,r))body.x+=dx;if(!collides(body.x,body.y+dy,r))body.y+=dy;}
