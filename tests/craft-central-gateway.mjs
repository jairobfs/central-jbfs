import test from 'node:test';
import assert from 'node:assert/strict';
import {CraftCentralGateway,CentralSyncError} from '../lib/craft-central-gateway.mjs';

const day='2026-10-23T11:00:00.000Z';
const id='12345678-1234-4234-8234-123456789012';
function entry({revision=1,title='Original',body='Original',kind='note'}={}){
 return {id,kind,title,body,tag:'Teste',status:'open',data:{favorite:false},revision,createdAt:day,updatedAt:day};
}
function mockCraft({items=[],rejectWrite=false,corruptWrite=false}={}){
 let seq=0,reads=0,writes=0;const rows=structuredClone(items);
 const fetchImpl=async (url,options)=>{
  const method=options.method;
  assert.match(url,/collections\/[a-f0-9-]{36}\/items/);
  if(method==='GET'){reads++;return {ok:true,json:async()=>({items:structuredClone(rows)})}}
  if(rejectWrite)return {ok:false,status:503};
  writes++;
  const body=JSON.parse(options.body);
  if(method==='POST'){
   assert.equal(body.items.length,1);
   rows.push({...body.items[0],id:'craft-'+(++seq)});
  }else if(method==='PUT'){
   assert.equal(body.itemsToUpdate.length,1);
   const payload=body.itemsToUpdate[0],index=rows.findIndex(x=>x.id===payload.id);
   assert.ok(index>=0);
   rows[index]={...rows[index],...payload};
  }else throw new Error('Unexpected request');
  if(corruptWrite)rows.at(-1).properties.conteudojson='{}';
  return {ok:true,json:async()=>({items:structuredClone(rows)})};
 };
 return {fetchImpl,rows,statistics:()=>({reads,writes})};
}
function gateway(mock){return new CraftCentralGateway({baseUrl:'https://connect.craft.do/link/synthetic/api/v1',fetchImpl:mock.fetchImpl})}
test('dry-run never mutates Craft',async()=>{
 const mock=mockCraft(),g=gateway(mock);
 const p=await g.plan([entry()]);
 assert.equal(p.operations.length,1);assert.equal(p.mode,'dry-run');
 assert.equal(mock.statistics().writes,0);
 await assert.rejects(g.apply([entry()]),e=>e.code==='CONFIRM_REQUIRED');
 assert.equal(mock.statistics().writes,0);
});
test('create with readback; rerun idempotent',async()=>{
 const mock=mockCraft(),g=gateway(mock);
 const v=await g.apply([entry()],{confirm:true});
 assert.equal(v.created,1);assert.equal(v.updated,0);assert.equal(v.verified.length,1);
 const x=await g.apply([entry()],{confirm:true});
 assert.equal(x.created,0);assert.equal(x.updated,0);assert.equal(x.unchanged,1);
 assert.equal(mock.rows.length,1);assert.equal(mock.statistics().writes,1);
});
test('update preserves Craft item id and verifies revision',async()=>{
 const mock=mockCraft(),g=gateway(mock);
 await g.apply([entry()],{confirm:true});
 const originalId=mock.rows[0].id;
 const changed=entry({revision:2,title:'Atualizado',body:'Novo'});
 const v=await g.apply([changed],{confirm:true});
 assert.equal(v.updated,1);assert.equal(mock.rows[0].id,originalId);
 assert.equal(mock.rows[0].properties.revisao,'2');
 assert.equal(JSON.parse(mock.rows[0].properties.conteudojson).body,'Novo');
});
test('same revision with different payload stops without writes',async()=>{
 const mock=mockCraft(),g=gateway(mock);
 await g.apply([entry()],{confirm:true});
 await assert.rejects(g.apply([entry({body:'Divergente'})],{confirm:true}),e=>e.code==='CONFLICT');
 assert.equal(mock.statistics().writes,1);
});
test('remote newer revision blocks migration',async()=>{
 const mock=mockCraft(),g=gateway(mock);
 await g.apply([entry({revision:3})],{confirm:true});
 await assert.rejects(g.apply([entry({revision:2})],{confirm:true}),e=>e.code==='CONFLICT');
 assert.equal(mock.statistics().writes,1);
});
test('write failure is not reported as success',async()=>{
 const mock=mockCraft({rejectWrite:true}),g=gateway(mock);
 await assert.rejects(g.apply([entry()],{confirm:true}),e=>e.code==='HTTP_503');
 assert.equal(mock.rows.length,0);
});
test('invalid readback rejects confirmed write',async()=>{
 const mock=mockCraft({corruptWrite:true}),g=gateway(mock);
 await assert.rejects(g.apply([entry()],{confirm:true}),e=>e.code==='VERIFY_FAILED'||e.message.includes('inválido'));
 assert.equal(mock.statistics().writes,1);
});
test('truncated source cannot be imported',async()=>{
 const mock=mockCraft(),g=gateway(mock);
 await assert.rejects(g.apply([entry()],{confirm:true,truncated:true}));
 assert.equal(mock.statistics().writes,0);
});
test('insecure connection rejected',()=>{
 assert.throws(()=>new CraftCentralGateway({baseUrl:'http://example.org',fetchImpl:async()=>{}}),e=>e.code==='INVALID_CONNECTION');
});
