import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {createRequire} from 'node:module';
import {createHandler} from './handler';
import {initialize} from './repository';
import type {QueryDb} from './repository';
const require=createRequire(import.meta.url);
const origin=process.env.APP_ORIGIN||process.env.RENDER_EXTERNAL_URL||`http://localhost:${process.env.PORT||10000}`;
let db:(QueryDb & {end:()=>Promise<void>})|undefined;
if(process.env.DATABASE_URL){const {Pool}=require('pg');db=new Pool({connectionString:process.env.DATABASE_URL,max:3,connectionTimeoutMillis:8000,idleTimeoutMillis:30000});await initialize(db!)}
const handle=createHandler({db,secret:process.env.CENTRAL_SESSION_SECRET,passwordHash:process.env.CENTRAL_PASSWORD_HASH,origin,secure:process.env.NODE_ENV!=='test'});
const root=resolve('dist-independent');
const mime:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.ico':'image/x-icon'};
const server=createServer(async(req,res)=>{try{
 let size=0;const chunks:Buffer[]=[];for await(const chunk of req){size+=chunk.length;if(size>250000){res.writeHead(413);res.end('Conteúdo muito grande.');return}chunks.push(chunk)}
 const url=new URL(req.url||'/',origin);const request=new Request(url,{method:req.method,headers:req.headers as Record<string,string>,...(['GET','HEAD'].includes(req.method||'GET')?{}:{body:Buffer.concat(chunks)})});
 const response=await handle(request,req.socket.remoteAddress||'unknown');
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','DENY');
 if(response){res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return}
 if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return}
 const pathname=decodeURIComponent(url.pathname);const path=resolve(root,'.'+pathname);if(path!==root&&!path.startsWith(root+sep)){res.writeHead(404);res.end();return}
 const file=pathname==='/'?resolve(root,'index.html'):path;
 if(!(await stat(file)).isFile()){res.writeHead(404);res.end();return}
 const bytes=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':pathname.startsWith('/assets/')?'public, max-age=31536000, immutable':'no-cache'});res.end(req.method==='HEAD'?undefined:bytes);
 }catch{res.writeHead(404);res.end('Página não encontrada.')}});
server.listen(Number(process.env.PORT||10000),'0.0.0.0',()=>console.log('Central JBFS: servidor independente disponível.'));
process.on('SIGTERM',()=>server.close(()=>{db?.end().finally(()=>process.exit(0));if(!db)process.exit(0)}));
