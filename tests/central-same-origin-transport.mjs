import test from 'node:test';
import assert from 'node:assert/strict';
import {createCentralSameOriginTransport} from '../integrations/central-same-origin-transport.mjs';
import {EntriesError} from '../lib/entries-client.ts';

const value={id:'10000000-0000-4000-8000-000000000001',title:'Aula',revision:1};
function mock({status=200,response={entries:[value],truncated:false}}={}){
 const calls=[];
 const fetchImpl=async(path,init)=>{
  calls.push({path,init});
  return {ok:status>=200&&status<300,status,json:async()=>response};
 };
 return {calls,fetchImpl};
}
test('GET exige resposta íntegra e caminho relativo da mesma origem',async()=>{
 const m=mock(),request=createCentralSameOriginTransport({fetchImpl:m.fetchImpl});
 const data=await request('GET');
 assert.equal(data.entries.length,1);
 assert.equal(m.calls[0].path,'/api/central/entries');
 assert.equal(m.calls[0].init.credentials,'same-origin');
 assert.equal(m.calls[0].init.cache,'no-store');
 assert.equal(m.calls[0].init.redirect,'error');
 assert.equal(m.calls[0].init.method,'GET');
});
test('RESTORE usa POST exclusivo na rota interna',async()=>{
 const m=mock({response:{entry:value}});
 const request=createCentralSameOriginTransport({fetchImpl:m.fetchImpl});
 const data=await request('RESTORE',{id:value.id,revision:2});
 assert.equal(data.entry.id,value.id);
 assert.equal(m.calls[0].path,'/api/central/entries/restore');
 assert.equal(m.calls[0].init.method,'POST');
 assert.deepEqual(JSON.parse(m.calls[0].init.body),{id:value.id,revision:2});
});
test('POST/PATCH/DELETE exigem confirmações explícitas',async()=>{
 const cases=[['POST',{entry:value}],['PATCH',{entry:value}],['DELETE',{deleted:true}]];
 for(const [method,response] of cases){
  const m=mock({response});
  const request=createCentralSameOriginTransport({fetchImpl:m.fetchImpl});
  await request(method,value);
  assert.equal(m.calls.length,1);
 }
 const m=mock({response:{}});
 await assert.rejects(createCentralSameOriginTransport({fetchImpl:m.fetchImpl})('DELETE',value),e=>e instanceof EntriesError);
});
test('403 e 401 preservam status e orientam reconexão',async()=>{
 const m=mock({status:401,response:{error:'Sessão expirada',signIn:'/signin-with-chatgpt?return_to=%2F'}});
 const request=createCentralSameOriginTransport({fetchImpl:m.fetchImpl});
 await assert.rejects(request('GET'),e=>e instanceof EntriesError&&e.status===401&&e.signIn.startsWith('/signin'));
});
test('nunca envia token privado em URL de request',async()=>{
 assert.throws(()=>createCentralSameOriginTransport({path:'https://connect.craft.do/link/token/api/v1'}),TypeError);
 assert.throws(()=>createCentralSameOriginTransport({path:'//host/endpoint'}),TypeError);
 const m=mock();
 await createCentralSameOriginTransport({path:'/api/central/entries',fetchImpl:m.fetchImpl})('GET');
 assert.equal(m.calls[0].path.includes('connect.craft.do'),false);
});
