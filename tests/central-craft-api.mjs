import test from 'node:test';
import assert from 'node:assert/strict';
import {createCentralCraftHttpHandler} from '../integrations/central-craft-api.mjs';
import {CraftCentralGateway} from '../lib/craft-central-gateway.mjs';

const id='12345678-1234-4234-8234-123456789012';
const owner='verified-owner';
const base='https://universo-jbfs-craft.jairobfs7.chatgpt.site';
const draft={id,kind:'task',title:'Aula integrada',body:'Plano de estudo',tag:'T11',status:'open',data:{due:'2026-11-01'}};
function environment(){
 const rows=[],calls=[],locks=[];
 let actor=owner;
 const fetchImpl=async (url,options)=>{
  if(!url.startsWith('https://connect.craft.do/'))throw Error('Wrong backend');
  calls.push(options.method);
  const {method,body}=options;
  if(method==='GET')return {ok:true,json:async()=>({items:structuredClone(rows)})};
  if(method==='POST')for(const x of JSON.parse(body).items)rows.push({...x,id:'craft-'+(rows.length+1)});
  else if(method==='PUT')for(const x of JSON.parse(body).itemsToUpdate){
   const index=rows.findIndex(z=>z.id===x.id);
   assert.ok(index>=0);rows[index]={...rows[index],...x};
  }
  return {ok:true,json:async()=>({items:structuredClone(rows)})};
 };
 const gateway=new CraftCentralGateway({baseUrl:'https://connect.craft.do/link/hidden/api/v1',fetchImpl});
 const getUser=async()=>actor;
 const handler=createCentralCraftHttpHandler({
  resolveUserId:getUser,
  ownerId:owner,
  cutoverVerified:true,
  gatewayFactory:async()=>gateway,
  validateDraft:raw=>{
   if(typeof raw.id!=='string'||!['task','note','question'].includes(raw.kind)||typeof raw.title!=='string'||typeof raw.body!=='string'||typeof raw.data!=='object'||raw.revision!==undefined)throw Object.assign(new Error('Invalid data'),{name:'ZodError'});
   return {id:raw.id,kind:raw.kind,title:raw.title,body:raw.body,tag:raw.tag,status:raw.status,data:raw.data};
  },
  withKeyLock:async (key,fn)=>{locks.push(key);return fn()}
 });
 function request(method='GET',body,{origin=base,path='/api/central/entries'}={}){
  return handler(new Request(base+path,{
   method,headers:{...(method==='GET'?{}:{origin,'Content-Type':'application/json'})},
   ...(method==='GET'?{}:{body:JSON.stringify(body)})
  })).then(async r=>({status:r.status,data:await r.json()}));
 }
 return {rows,calls,locks,request,setActor:x=>actor=x,handler,gateway};
}
test('cutover and distributed locking required before exposing endpoint',()=>{
 const defs={resolveUserId:async()=>owner,ownerId:owner,gatewayFactory:async()=>({}),validateDraft:x=>x,withKeyLock:async(_key,fn)=>fn()};
 assert.throws(()=>createCentralCraftHttpHandler({...defs,cutoverVerified:false}),/não homologada/);
 assert.throws(()=>createCentralCraftHttpHandler({...defs,cutoverVerified:true,withKeyLock:null}),/withKeyLock/);
});
test('anonymous and other user cannot read or write',async()=>{
 const f=environment();
 f.setActor(null);
 assert.equal((await f.request('GET')).status,401);
 assert.equal((await f.request('POST',draft)).status,401);
 f.setActor('visitor');
 assert.equal((await f.request('GET')).status,403);
 assert.equal((await f.request('POST',draft)).status,403);
 assert.equal(f.calls.length,0);
});
test('server refuses cross-origin writes without leaking Craft',async()=>{
 const f=environment();
 assert.equal((await f.request('POST',draft,{origin:'https://evil.example'})).status,403);
 assert.equal(f.calls.length,0);
});
test('full CRUD round trip without exposing connection URL',async()=>{
 const f=environment();
 const initial=await f.request('GET');
 assert.equal(initial.status,200);assert.equal(initial.data.entries.length,0);
 const created=await f.request('POST',draft);
 assert.equal(created.status,201);assert.equal(created.data.entry.revision,1);
 assert.ok(!JSON.stringify(created).includes('connect.craft.do'));
 const updated=await f.request('PATCH',{...created.data.entry,title:'Aula revista'});
 assert.equal(updated.status,200);assert.equal(updated.data.entry.revision,2);
 const all=await f.request('GET');
 assert.equal(all.data.entries.length,1);assert.equal(all.data.entries[0].title,'Aula revista');
 assert.equal(f.locks.length,2);
 const deleted=await f.request('DELETE',{id,revision:2});
 assert.equal(deleted.data.deleted,true);
 assert.equal((await f.request('GET')).data.entries.length,0);
 const restored=await f.request('POST',{id,revision:3},{path:'/api/central/entries/restore'});
 assert.equal(restored.status,200);assert.equal(restored.data.entry.revision,4);
 assert.equal((await f.request('GET')).data.entries.length,1);
 assert.equal(f.rows.length,1);
 assert.ok(f.locks.every(k=>k==='central-jbfs:d1:entries:'+id));
});
test('bad payload and stale version fail closed',async()=>{
 const f=environment();
 assert.equal((await f.request('POST',{...draft,id:'invalid'})).status,400);
 assert.equal((await f.request('POST',{...draft,kind:'unspecified'})).status,400);
 const created=await f.request('POST',draft);
 assert.equal(created.status,201);
 assert.equal((await f.request('PATCH',{...created.data.entry,revision:9})).status,409);
 assert.equal((await f.request('DELETE',{id,revision:9})).status,409);
 assert.equal((await f.request('GET')).data.entries[0].title,draft.title);
});
