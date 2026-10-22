export function distanceToProp(p,o){return Math.hypot(Math.max(o.x-p.x,0,p.x-o.x-o.w),Math.max(o.y-p.y,0,p.y-o.y-o.h));}
