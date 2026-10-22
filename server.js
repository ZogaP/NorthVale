import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(fileURLToPath(new URL('.',import.meta.url)));
http.createServer(async(req,res)=>{try{
 const pathname=decodeURIComponent(new URL(req.url,'http://local').pathname);
 const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 const data=await readFile(file);
 res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.glsl':'text/plain'})[path.extname(file)]||'application/octet-stream'}).end(data);
}catch{res.writeHead(404).end('Não encontrado');}}).listen(Number(process.env.NORTHVALE_PORT)||5173,'0.0.0.0',()=>console.log('NorthVale: servidor iniciado na porta '+(process.env.NORTHVALE_PORT||5173)));
