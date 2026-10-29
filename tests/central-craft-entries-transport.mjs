import test from 'node:test';
import assert from 'node:assert/strict';
import {CraftCentralGateway} from '../lib/craft-central-gateway.mjs';
import {createCraftEntriesTransport} from '../lib/central-craft-entries-transport.mjs';

const id='12345678-1234-4234-8234-123456789012';
const draft={id,kind:'task',title:'Prazo de estudo',body:'Exercícios',tag:'T11',status:'open',data:{due:'2026-11-01',calendarId:'t11'}};
function fixture(){
 const rows=[],methods=[];
 const fetchImpl=async(_url,options)=>{
  const {method,body}=options;methods.push(method);
  if(method==='GET')return {ok:true,json:async()=>({items:structuredClone(rows)})};
  const data=JSON.parse(body);
  if(method==='POST')data.items.forEach((x,i)=>rows.push({...x,id:'craft-'+(rows.length+i+1)}));
  else if(method==='PUT')data.itemsToUpdate.forEach(x=>{const idx=rows.findIndex(r=>r.id===x.id);assert.ok(idx>=0);rows[idx]={...rows[idx],...x}});
  else throw Error('Method');
  return {ok:true,json:async()=>({items:structuredClone(rows)})};
 };
 return {rows,methods,gateway:new CraftCentralGateway({baseUrl:'https://connect.craft.do/link/test/api/v1',fetchImpl})};
}
test('cutover must be explicitly verified',()=>{
 const f=fixture();
 assert.throws(()=>createCraftEntriesTransport({gateway:f.gateway}),/não homologado/);
 assert.deepEqual(f.methods,[]);
});
test('Central CRUD route contract through Craft, without D1',async()=>{
 const f=fixture(),request=createCraftEntriesTransport({gateway:f.gateway,cutoverVerified:true});
 let list=await request('GET');
 assert.deepEqual(list.entries,[]);
 assert.equal(list.truncated,false);
 const created=await request('POST',draft);
 assert.equal(created.entry.id,id);
 assert.equal(created.entry.revision,1);
 list=await request('GET');
 assert.equal(list.entries.length,1);
 const changed=await request('PATCH',{...created.entry,title:'Estudo atualizado'});
 assert.equal(changed.entry.revision,2);
 assert.equal(changed.entry.title,'Estudo atualizado');
 const deleted=await request('DELETE',{id,revision:2});
 assert.equal(deleted.deleted,true);
 assert.equal((await request('GET')).entries.length,0);
 assert.equal(f.rows.length,1);
 const recovered=await request('RESTORE',{id,revision:3});
 assert.equal(recovered.entry.revision,4);
 assert.equal((await request('GET')).entries.length,1);
 assert.ok(f.methods.every(x=>['GET','POST','PUT'].includes(x)));
});
test('stale revisions do not overwrite Craft',async()=>{
 const f=fixture(),request=createCraftEntriesTransport({gateway:f.gateway,cutoverVerified:true});
 await request('POST',draft);
 await assert.rejects(request('PATCH',{...draft,revision:99}),e=>e.code==='CONFLICT');
 assert.equal((await request('GET')).entries[0].title,draft.title);
});
