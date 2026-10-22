export function doorPort(door,room){return door.a.room===room.id?door.a:door.b;}
export function portalGeometry(port,room){
 const {w,h}=room.bounds,size=port.width;
 if(port.side==='marker')return{x:port.x-size/2,y:port.y-8,w:size,h:16,approach:port.approach,anchor:{x:port.x,y:port.y}};
 if(port.side==='north'||port.side==='south'){const y=port.side==='north'?12:h-28;return{x:port.offset-size/2,y,w:size,h:16,approach:{x:port.offset,y:port.side==='north'?72:h-72},anchor:{x:port.offset,y:port.side==='north'?14:h-14}};}
 const x=port.side==='west'?12:w-28;return{x,y:port.offset-size/2,w:16,h:size,approach:{x:port.side==='west'?72:w-72,y:port.offset},anchor:{x:port.side==='west'?14:w-14,y:port.offset}};
}
export function boundsPolygon(o,pad=0){return[{x:o.x-pad,y:o.y-pad},{x:o.x+o.w+pad,y:o.y-pad},{x:o.x+o.w+pad,y:o.y+o.h+pad},{x:o.x-pad,y:o.y+o.h+pad}];}
export function distanceToBox(p,o){return Math.hypot(Math.max(o.x-p.x,0,p.x-o.x-o.w),Math.max(o.y-p.y,0,p.y-o.y-o.h));}
export function circleHits(p,o,r=10){return distanceToBox(p,o)<r;}
