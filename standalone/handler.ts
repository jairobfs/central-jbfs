import {entryInput} from '../lib/domain';
import {repository} from './repository';
import type {QueryDb} from './repository';
import {sessionToken,validSession,verifyPassword} from './security';
export type Runtime={db?:QueryDb;secret?:string;passwordHash?:string;origin:string;secure?:boolean};
const json=(x:unknown,status=200)=>Response.json(x,{status,headers:{'Cache-Control':'private, no-store'}});
const page=(message='',available=false)=>`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Central JBFS · Acesso</title><style>body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#f0f5f2;color:#15343f;font:17px/1.6 system-ui}main{max-width:440px;margin:20px;padding:28px;background:white;border-radius:22px}label{display:grid;gap:8px}input,button,a{font:inherit}input{padding:14px;border:1px solid #b7c9c3;border-radius:10px;min-width:0}button,a{display:block;margin-top:16px;padding:12px;border-radius:10px}button{width:100%;border:0;background:#00636c;color:white}a{color:#00636c}small{color:#51666b}</style><main><small>CENTRAL JBFS · RENDER</small><h1>Seu espaço pessoal.</h1><p>${message||'Entre com o acesso da Central. Sua sessão permanece neste navegador.'}</p>${available?'<form method="post" action="/api/session"><label>Código ou senha da Central<input name="password" type="password" autocomplete="current-password" required minlength="6" maxlength="128" inputmode="numeric" autofocus></label><button>Entrar</button></form>':'<p>Esta publicação está em preparação. O banco persistente e o acesso próprio precisam ser ativados antes de salvar. Seus registros atuais continuam na publicação original.</p>'}<a href="/">Voltar à Central</a></main></html>`;
export function createHandler(config:Runtime){
 const repo=config.db?repository(config.db):null;const ready=!!repo&&!!config.secret&&config.secret.length>=32&&!!config.passwordHash;
 const attempts=new Map<string,{count:number;until:number}>();
 const html=(text:string,status=200)=>new Response(text,{status,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'"}});
 return async function handle(req:Request,ip='unknown'):Promise<Response|null>{
  const path=new URL(req.url).pathname;
  if(path==='/health')return json({status:'ok',storage:ready?'configured':'pending',provider:'render'});
  if(path==='/api/runtime')return json({provider:'render',ready,source:'independent'});
  if(path==='/entrar')return html(page('',ready));
  if(path!=='/api/entries'&&path!=='/api/session')return null;
  if(!ready)return json({error:'Publicação Render em preparação: o banco persistente e o acesso próprio ainda não foram ativados. Seus registros continuam na publicação original.'},503);
  if(req.method!=='GET'&&req.headers.get('origin')!==config.origin)return json({error:'Origem da solicitação não autorizada.'},403);
  if(path==='/api/session'){
   if(req.method==='DELETE')return new Response(null,{status:204,headers:{'Set-Cookie':`central_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${config.secure===false?'':'; Secure'}`}});
   if(req.method!=='POST')return json({error:'Método inválido.'},405);
   const now=Date.now(),recent=attempts.get(ip);if(recent&&recent.until>now&&recent.count>=5)return html(page('Muitas tentativas. Aguarde 15 minutos antes de tentar novamente.',true),429);
   const data=await req.formData();const password=String(data.get('password')||'');
   if(!verifyPassword(password,config.passwordHash!)){if(attempts.size>2000)for(const [key,v] of attempts)if(v.until<now)attempts.delete(key);attempts.set(ip,{count:recent&&recent.until>now?recent.count+1:1,until:recent&&recent.until>now?recent.until:now+900000});return html(page('Código ou senha incorretos.',true),401)}
   attempts.delete(ip);return new Response(null,{status:303,headers:{Location:'/', 'Cache-Control':'no-store','Set-Cookie':`central_session=${sessionToken(config.secret!)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800${config.secure===false?'':'; Secure'}`}});
  }
  const cookie=(req.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('central_session='))?.slice('central_session='.length)||'';
  if(!validSession(cookie,config.secret!))return json({error:'Entre no acesso próprio da Central para consultar e salvar.',signIn:'/entrar'},401);
  try{
   if(req.method==='GET')return json(await repo!.list());
   if(!['POST','PATCH','DELETE'].includes(req.method))return json({error:'Método inválido.'},405);
   let received;try{received=await req.json()}catch{return json({error:'Conteúdo inválido.'},400)}
   if(!received||typeof received!=='object'||Array.isArray(received))return json({error:'Conteúdo inválido.'},400);
   const raw=received as Record<string,any>;
   if(req.method==='DELETE'){if(typeof raw.id!=='string'||!Number.isInteger(raw.revision)||raw.revision<1)return json({error:'Registro inválido.'},400);return await repo!.remove(raw.id,raw.revision)?json({deleted:true}):json({error:'O registro mudou ou já foi excluído. Atualize a lista.'},409)}
   const revision=raw.revision;if(req.method==='PATCH')delete raw.revision;
   const parsed=entryInput.safeParse(raw);if(!parsed.success)return json({error:parsed.error.issues[0]?.message||'Revise os campos.'},400);
   if(req.method==='POST')return json({entry:await repo!.create(parsed.data)},201);
   if(!Number.isInteger(revision)||revision<1)return json({error:'Versão inválida.'},400);
   const entry=await repo!.update(parsed.data,revision);return entry?json({entry}):json({error:'Este registro mudou. Seu rascunho foi mantido; atualize a lista.'},409);
  }catch{return json({error:'Não foi possível confirmar a operação no banco. Seu rascunho foi mantido.'},503)}
 }
}
