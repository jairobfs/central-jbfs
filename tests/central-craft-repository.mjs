import test from 'node:test';
import assert from 'node:assert/strict';
import {CraftCentralGateway} from '../lib/craft-central-gateway.mjs';
import {CentralCraftRepository} from '../lib/central-craft-repository.mjs';

const now='2026-10-29T12:00:00.000Z';
const uid='12345678-1234-4234-8234-123456789012';
const draft={id:uid,kind:'question',title:'Questão sintética',body:'Caso clínico',tag:'Testes',status:'open',data:{answer:'A',options:['A','B'],correctOption:0,explanation:'Evidência',quizAttempts:[]}};
function fixture(){
 const rows=[],requests=[];
 const fetchImpl=async (url,{method,body})=>{
  assert.match(url,/collections\/[0-9a-f-]+\/items/);
  requests.push(method);
  if(method==='GET')return {ok:true,json:async()=>({items:structuredClone(rows)})};
  const x=JSON.parse(body);
  if(method==='POST')for(const a of x.items)rows.push({...a,id:'craft-'+(rows.length+1)});
  if(method==='PUT')for(const a of x.itemsToUpdate){const at=rows.findIndex(y=>y.id===a.id);assert.ok(at>=0);rows[at]={...rows[at],...a}};
  return {ok:true,json:async()=>({items:structuredClone(rows)})};
 };
 const gateway=new CraftCentralGateway({baseUrl:'https://connect.craft.do/link/test/api/v1',fetchImpl});
 const repo=new CentralCraftRepository({gateway,clock:()=>now});
 return {rows,requests,repo,gateway};
}
test('cria e recupera dados integrais sem D1',async()=>{
 const f=fixture();const fresh=await f.repo.create(draft);
 assert.equal(fresh.revision,1);assert.deepEqual(fresh.data,draft.data);
 assert.equal((await f.repo.list()).length,1);
 assert.equal((await f.repo.get(uid)).id,uid);
 assert.equal(f.rows.length,1);
});
test('editar preserva id e histórico; incrementa revisão',async()=>{
 const f=fixture();let row=await f.repo.create(draft);const craftId=f.rows[0].id;
 row=await f.repo.update({...row,body:'Atualização',data:{...row.data,quizAttempts:[{id:'rev-sintetica',correct:true}]}});
 assert.equal(row.revision,2);assert.equal(row.body,'Atualização');
 assert.equal(f.rows[0].id,craftId);
 assert.equal(row.data.quizAttempts[0].id,'rev-sintetica');
});
test('versão obsoleta bloqueada sem escrever',async()=>{
 const f=fixture();const old=await f.repo.create(draft);
 await f.repo.update({...old,title:'Versão 2'});
 const writes=f.requests.filter(x=>x!=='GET').length;
 await assert.rejects(f.repo.update({...old,title:'Versão antiga'}),e=>e.code==='CONFLICT');
 assert.equal(f.requests.filter(x=>x!=='GET').length,writes);
});
test('recriação idempotente e conflito de chave detectado',async()=>{
 const f=fixture();await f.repo.create(draft);
 const copy=await f.repo.create(draft);
 assert.equal(copy.id,uid);assert.equal(f.rows.length,1);
 await assert.rejects(f.repo.create({...draft,title:'Mudou'}),e=>e.code==='CONFLICT');
});
test('a Collection detecta duplicatas antes de mostrar dados',async()=>{
 const f=fixture();await f.repo.create(draft);
 f.rows.push({...structuredClone(f.rows[0]),id:'craft-2'});
 await assert.rejects(f.repo.list(),e=>e.code==='DUPLICATE_KEY');
});
test('registro inexistente não pode ser atualizado',async()=>{
 const f=fixture();
 await assert.rejects(f.repo.update({...draft,revision:1}),e=>e.code==='NOT_FOUND');
});
