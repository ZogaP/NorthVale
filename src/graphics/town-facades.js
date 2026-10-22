// Geometry stays inside each building's existing collision footprint. Door centers
// match world.door(); architecture is authored per address, never picked randomly.
export const FACADE_STYLES = Object.freeze({police:'tower-and-cells',sarah:'weathered-gable',home:'saltbox',ruth:'hipped-veranda',diner:'roadside-diner',pharmacy:'corner-apothecary',library:'arched-library',motel:'balcony-motel',registry:'municipal-portico',depot:'sawtooth-depot',dam:'concrete-control',meatpacking:'cold-store',scrapyard:'repair-shed',ruins:'broken-chapel',gasstation:'pump-canopy'});

export function drawTownFacade(r,b,minute) {
 const c=r.ctx,{x,y,w,h}=b,front=y+h,open=(minute/60)%24>=b.open&&(minute/60)%24<b.close;
 const alpha = r.roofCutaway?.getAlpha(b.id) ?? 1.0;
 if (alpha < 0.98) {
  r.ground(x, y, w, h, b.kind === 'house' ? '#5a4635' : b.kind === 'industrial' ? '#434f4b' : '#3d4d4a');
  r.box(x, y, w, 6, 24, '#38433d', '#4d5c55');
  r.box(x, y, 6, h, 24, '#2e3833', '#4d5c55');
 }
 c.save();
 if (alpha < 0.99) c.globalAlpha = alpha;
 const p=(a,d,z)=>r.project(a,d,z),quad=(a,d,z,width,height,color,stroke='#172729')=>r.poly([p(a,d,z),p(a+width,d,z),p(a+width,d,z+height),p(a,d,z+height)],color,stroke);
 const box=(a,d,width,depth,height,color=b.color,roof=b.roof,base=0)=>{
  const surface=r.surface;r.surface=width>60&&depth>50&&height>40?surface:null;
  r.box(a,d,width,depth,height,color,roof,base);r.surface=surface;
  // Wall material must never tile over roofing, columns, pumps or steel beams.
  r.ground(a,d,width,depth,roof,height+base+.1);
  if(width>60&&depth>50){
   if(b.kind==='industrial')for(let k=8;k<width;k+=14){const start=p(a+k,d,base+height+.2),end=p(a+k,d+depth,base+height+.2);c.strokeStyle='#99a39430';c.lineWidth=1;c.beginPath();c.moveTo(start.x,start.y);c.lineTo(end.x,end.y);c.stroke();}
   else for(let k=0;k<18;k++)r.ground(a+(k*37%width),d+(k*29%depth),Math.min(12,width),3,'#acb29913',base+height+.2);
  }
 };
 const window=(a,z,width=25,height=30,barred=false)=>{quad(a,front+.7,z,width,height,open?'#b3a570':'#293f47');quad(a+2,front+1,z+2,width-4,height-4,open?'#817d5966':'#5c788344');for(let j=barred?4:width/2;j<width;j+=barred?6:width)quad(a+j,front+1.5,z,1.5,height,'#263431');quad(a,front+1.8,z+height/2,width,1.4,'#273a37');};
 const sign=(text,z,width=w*.9,color='#d6c79f',back='#223b38',center=x+w/2)=>{quad(center-width/2,front+3,z,width,17,back);const q=p(center,front+3.2,z+4);c.save();c.translate(q.x,q.y);c.transform(.866,.5,0,1,0,0);c.fillStyle=color;c.textAlign='center';c.font='bold 10px Georgia';c.fillText(text,0,0,width-8);c.restore();};
 const gable=(a,d,width,depth,base,rise,color=b.roof)=>{r.poly([p(a,d,base),p(a+width/2,d,base+rise),p(a+width/2,d+depth,base+rise),p(a,d+depth,base)],color,'#23302c');r.poly([p(a+width/2,d,base+rise),p(a+width,d,base),p(a+width,d+depth,base),p(a+width/2,d+depth,base+rise)],'#394745','#23302c');r.poly([p(a,d+depth,base),p(a+width/2,d+depth,base+rise),p(a+width,d+depth,base)],b.color,'#25332e');};
 const columns=(z=0,top=100)=>{for(const a of [x+18,x+w-27])box(a,front-8,9,8,top,'#a0a18b','#b5ad8b',z);};
 r.ground(x+18,y+26,w+14,h+12,'#05121866');
 r.surface=b.kind==='house'?'wood':'brick';
 let height=82;
 switch(b.id){
 case 'police':
  height=106;box(x,y,w,h,height);box(x+7,y+7,43,45,157,'#54625e','#253b41');box(x+w-58,y+28,58,h-28,77,'#4c5e5c','#394a49');
  for(const a of [x+18,x+w-48])window(a,32,29,32,true);sign('DELEGACIA DE NORTHVALE',81,w-12);{
   const clock=p(x+28,y+52,134);c.save();c.translate(clock.x,clock.y);c.transform(.866,.5,0,1,0,0);c.fillStyle='#c5b991';c.beginPath();c.arc(0,0,11,0,Math.PI*2);c.fill();c.strokeStyle='#263b36';c.lineWidth=2;c.beginPath();c.moveTo(0,-7);c.lineTo(0,0);c.lineTo(6,2);c.stroke();c.restore();
  }break;
 case 'sarah':
  height=74;box(x,y,w,h,height);gable(x-3,y-3,w+6,h+6,height,43);window(x+12,25,31,30);window(x+w-45,30,30,25);
  for(let k=0;k<3;k++)quad(x+11,front+2,31+k*8,35,3,'#7e7054');box(x+49,front-27,72,27,4,'#665e48','#8d8265',57);columns(0,57);sign('MILLER',62,49,'#d7c28a','#5f5948');break;
 case 'home':
  height=63;box(x,y,w*.7,h,height);box(x+w*.7,y+32,w*.3,h-32,47,'#5f6e63','#374c44');gable(x,y,w*.7,h,height,36);window(x+13,21,27,26);window(x+w-39,17,25,22);box(x+20,y+10,16,20,35,'#775d4e','#574941',80);sign('WARD',53,43);break;
 case 'ruth':{
  height=91;box(x,y,w,h,height);const a=p(x+w*.5,y+h*.5,height+46);r.poly([p(x-5,y-5,height),p(x+w+5,y-5,height),a],b.roof);r.poly([p(x+w+5,y-5,height),p(x+w+5,front+5,height),a],'#334b40');r.poly([p(x-5,front+5,height),p(x+w+5,front+5,height),a],'#51604b','#283b35');
  window(x+13,30,32,39);window(x+w-45,30,32,39);box(x+46,front-25,w-92,25,4,'#68664f','#a29778',57);columns(0,57);sign('MERCER',75,58);break;}
 case 'diner':
  height=57;box(x,y,w,h,height,'#897964','#494e49');for(let a=x+8;a<x+w-25;a+=32)window(a,17,27,29);box(x,front-17,w,17,6,'#7e3e34','#a45846',height);quad(x,front+1,8,w,5,'#bdb9a1');sign('DOUBLE R  •  DINER',63,w*.8,'#edb38c','#563d38');break;
 case 'pharmacy':
  height=88;box(x,y,w,h,height);for(const a of [x+9,x+w-65])window(a,14,55,44);box(x,front-25,w,25,6,'#476b58','#6b8d74',63);sign('FARMÁCIA VALE  •  1937',72,w-10);quad(x+w-26,front+2,93,9,29,'#99b18b');quad(x+w-35,front+2,103,27,9,'#99b18b');break;
 case 'library':
  height=126;box(x,y,w,h,height,'#827a65','#424b43');for(const a of [x+18,x+w-53]){window(a,31,35,64);const q=p(a+17.5,front+1,95);c.save();c.translate(q.x,q.y);c.transform(.866,.5,0,1,0,0);c.beginPath();c.ellipse(0,0,17.5,14,0,Math.PI,0);c.fillStyle='#747e67';c.fill();c.restore();}columns(0,110);gable(x,front-15,w,15,height,32,'#5e6754');sign('BIBLIOTECA PÚBLICA',105,w-12);break;
 case 'motel':
  height=136;box(x,y,w,h,height);for(const z of [10,77])for(let a=x+10;a<x+w-30;a+=47){window(a,z+10,20,28);quad(a+25,front+1,z,13,43,'#58483a');}box(x,front-18,w,18,4,'#686459','#85806a',72);for(let a=x+6;a<x+w;a+=17)quad(a,front+3,76,2,15,'#a8a38a');quad(x,front+3,91,w,2,'#aea38a');sign('NORTHVALE  •  VACANCY',143,w-20,'#d49a7b','#443c38');break;
 case 'registry':
  height=100;box(x,y,w,h,height);box(x+35,y+8,w-70,h-8,18,'#8e927d','#626c5e',height);columns(0,95);window(x+39,28,29,43);window(x+w-68,28,29,43);box(x+10,front-16,w-20,16,6,'#848671','#a7a18a',95);sign('CARTÓRIO  •  1904',104,w-30);break;
 case 'depot':
  height=90;box(x,y,w,h,height);for(let k=0;k<3;k++){const a=x+k*w/3;r.poly([p(a,y,height),p(a+w/3,y,height+25),p(a+w/3,front,height+25),p(a,front,height)],'#526566','#243a3a');quad(a+w/3-7,front+.5,height,7,25,'#849785');}quad(x+8,front+1,0,48,62,'#455953');for(let z=8;z<62;z+=7)quad(x+8,front+2,z,48,1,'#263e3e');window(x+w-45,30,32,28,true);sign('DEPÓSITO NORTE',72,w-12);break;
 case 'dam':
  height=62;box(x,y,w,h,height,'#73817b','#52625e');box(x+w-62,y+18,62,h-18,49,'#677b72','#3b5350',height);for(let a=x+10;a<x+w-75;a+=27)window(a,24,17,16,true);for(let k=0;k<3;k++)box(x+10+k*27,y+20,13,80,16,'#3e5351','#70847b',height);sign('CONTROLE DA REPRESA',48,w-12);break;
 case 'meatpacking':
  height=119;box(x,y,w,h,height);box(x+15,y+14,24,25,69,'#605d51','#3f4740',height);quad(x+10,front+1,0,64,74,'#778579');for(let z=7;z<73;z+=6)quad(x+11,front+2,z,62,1,'#3d5450');for(let a=x+100;a<x+w-20;a+=35)window(a,65,23,22,true);sign('SLOANE  •  CÂMARAS FRIAS',95,w-10);box(x+w-34,y+18,28,h-36,28,'#6b8178','#87948a',height);break;
 case 'scrapyard':
  height=76;box(x,y,w,h,height,'#786e51','#594f3a');gable(x,y,w,h,height,23,'#6f7764');for(const a of [x+8,x+w-66]){quad(a,front+1,0,57,60,'#535f56');for(let k=6;k<57;k+=6)quad(a+k,front+2,0,1,60,'#88907c');}box(x+10,y+20,8,8,150,'#8d8055','#b0a071');box(x+10,y+20,w-25,8,7,'#9c895c','#b5a075',143);sign('SAM  •  REPAROS',64,w-10);break;
 case 'ruins':
  height=72;box(x,y,24,h,height,'#686c5b','#3e4d42');box(x+w-25,y,25,h,height+20,'#6c705f','#455048');box(x+24,y,w-49,24,43,'#6b705d','#465647');box(x+10,y+10,38,38,146,'#777b66','#414c40');quad(x+15,y+48,102,27,32,'#23332e');for(let k=0;k<6;k++)box(x+37+k*18,y+35+k*13,14,11,5,'#606553','#818773');sign('CAPELA DE SÃO JUDAS',54,w-20);break;
 case 'gasstation':
  height=58;box(x,y,w,h,height,'#6b7e69','#4a6053');window(x+8,17,60,28);window(x+w-65,19,51,26);box(x+3,front-68,w-6,68,8,'#9b9c7f','#576f58',87);for(const a of [x+12,x+w-20])box(a,front-11,5,5,87,'#929e7a','#aab08f');for(const a of [x+24,x+w-43]){box(a,front-32,17,16,29,'#a69670','#c4b995');quad(a+2,front-15,15,12,9,'#233d36');}sign('PINE RIDGE  •  GAS',91,w-10,'#e3d6a5','#4e6854');break;
 default: throw Error(`Fachada não configurada: ${b.id}`);
 }
 r.surface=null;
 // Individual mortar/siding and rain streaks are deterministic in world space.
 for(let k=0;k<32;k++){const a=x+((k*47+height*3)%w),z=6+(k*31)%(height-10);quad(a,front+2,z,1+(k%3),5+k%9,'#152c2725',null);}
 // A real entrance at the same position as the interaction/collision system.
 quad(x+w/2-13,front+4,0,26,48,'#263b35');quad(x+w/2-10,front+4.2,26,20,18,open?'#9c9772':'#425b55');quad(x+w/2+8,front+4.4,21,2,3,'#c3ae79');
 c.restore();
}
