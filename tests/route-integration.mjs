/** Actual API handlers + Drizzle + SQLite-backed D1 compatibility fixture. No HTTP or production data. */
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
const require=createRequire(import.meta.url),ts=require('typescript');
const root=path.resolve(import.meta.dirname,'..'),sqlite=new DatabaseSync(':memory:');
const migration=fs.readdirSync(path.join(root,'drizzle')).filter(f=>f.endsWith('.sql')).sort();
for(const f of migration)sqlite.exec(fs.readFileSync(path.join(root,'drizzle',f),'utf8'));
const dbAdapter={prepare(sql){let bindings=[];return {bind(...values){bindings=values;return this},async raw(){return sqlite.prepare(sql).all(...bindings).map(row=>Object.values(row))},async all(){return {results:sqlite.prepare(sql).all(...bindings),success:true,meta:{}}},async run(){const out=sqlite.prepare(sql).run(...bindings);return {success:true,results:[],meta:{changes:Number(out.changes),last_row_id:Number(out.lastInsertRowid)}}}}}};
let actor=null;const cache=new Map();
function load(file){if(cache.has(file))return cache.get(file).exports;const m={exports:{}};cache.set(file,m);const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const customRequire=name=>{if(name.endsWith('chatgpt-auth'))return {getChatGPTUser:async()=>actor,chatGPTSignInPath:()=>'/signin-with-chatgpt?return_to=%2F'};if(name==='cloudflare:workers')return {env:{DB:dbAdapter}};if(name.startsWith('@/')||name.startsWith('.')){let target=path.resolve(name.startsWith('@/')?root:path.dirname(file),name.startsWith('@/')?name.slice(2):name);if(fs.existsSync(target+'.ts'))target+='.ts';else if(fs.existsSync(target+'/index.ts'))target+='/index.ts';return load(target)}return require(name)};
vm.runInThisContext('(function(require,module,exports){'+js+'\n})',{filename:file})(customRequire,m,m.exports);return m.exports;}
const routes=load(path.join(root,'app/api/entries/route.ts'));
const backup=load(path.join(root,'app/api/backup/export/route.ts'));
const base='http://127.0.0.1:4173';
const owner='qa-central-'+randomUUID(),other='qa-other-'+randomUUID();
const checks=[];
async function request(method,body,identity=owner,origin=base){actor=identity?{userId:identity,email:'qa@example.test',displayName:'Synthetic QA',fullName:null}:null;const req=new Request(base+'/api/entries',{method,headers:{...(method!=='GET'?{'Content-Type':'application/json',Origin:origin}:{})},...(body?{body:JSON.stringify(body)}:{})});const r=await routes[method](req);return {status:r.status,body:await r.json()}}
async function test(name,run){await run();checks.push({name,passed:true});console.log('PASS',name)}
let q={id:randomUUID(),kind:'question',title:'Pergunta sintética de contrato',body:'Linha 1\nLinha 2',tag:'Teste local',status:'open',data:{answer:'Resposta\nem duas linhas',options:['A','B','C'],explanation:'Explicação\ncompleta',source:'Fixture sintética'}};
await test('Anonymous requests are rejected',async()=>assert.equal((await request('GET',null,null)).status,401));
await test('Question and all fields persist in D1',async()=>{const r=await request('POST',q);assert.equal(r.status,201,JSON.stringify(r.body));assert.deepEqual(r.body.entry.data,q.data);assert.equal(r.body.entry.body,q.body)});
await test('Retry with same operation id creates one record',async()=>{await request('POST',q);const r=await request('GET');assert.equal(r.body.entries.filter(x=>x.id===q.id).length,1)});
await test('A second identity cannot read first identity data',async()=>assert.equal((await request('GET',null,other)).body.entries.length,0));
await test('A second identity cannot overwrite the record',async()=>assert.equal((await request('PATCH',{...q,revision:1},other)).status,404));
await test('Cross-origin write is denied',async()=>assert.equal((await request('PATCH',{...q,revision:1},owner,'https://example.test')).status,403));
await test('Update preserves multiline answer, options and source',async()=>{q={...q,title:'Pergunta atualizada'};const r=await request('PATCH',{...q,revision:1});assert.equal(r.status,200);assert.equal(r.body.entry.revision,2);assert.deepEqual(r.body.entry.data,q.data)});
await test('Stale revision cannot overwrite the current version',async()=>{const r=await request('PATCH',{...q,body:'stale',revision:1});assert.equal(r.status,409);assert.equal(r.body.conflict,true)});
await test('Script URL is rejected',async()=>assert.equal((await request('POST',{...q,id:randomUUID(),kind:'resource',data:{url:'javascript:alert(1)'}})).status,400));
await test('Missing answer is rejected',async()=>assert.equal((await request('POST',{...q,id:randomUUID(),data:{}})).status,400));
const note={id:randomUUID(),kind:'prompt',title:'Prompt sintético integral',body:'Preservar íntegro.\n'+('Linha longa de teste.\n'.repeat(1000)),tag:'Teste local',status:'open',data:{favorite:false}};
await test('Full prompt survives create and a new read',async()=>{assert.equal((await request('POST',note)).status,201);const r=await request('GET');assert.equal(r.body.entries.find(e=>e.id===note.id).body,note.body);assert.equal(r.body.entries.find(e=>e.id===note.id).data.favorite,false)});
const calendarTask={id:randomUUID(),kind:'task',title:'Prova sintética T11',body:'Sem dados de pacientes',tag:'T11',status:'open',data:{due:'2026-11-06',calendarId:'t11',eventType:'exam',startTime:'08:30',endTime:'10:00'}};
await test('Calendar app type, academic front and time persist in D1',async()=>{const r=await request('POST',calendarTask);assert.equal(r.status,201);assert.deepEqual(r.body.entry.data,calendarTask.data);const fresh=await request('GET');assert.deepEqual(fresh.body.entries.find(x=>x.id===calendarTask.id).data,calendarTask.data)});
await test('Backup requires identity and same-origin POST',async()=>{
 actor=null;
 let r=await backup.POST(new Request(base+'/api/backup/export',{method:'POST',headers:{Origin:base}}));
 assert.equal(r.status,401);
 actor={userId:owner,email:'qa@example.test',displayName:'Synthetic QA',fullName:null};
 r=await backup.POST(new Request(base+'/api/backup/export',{method:'POST',headers:{Origin:'https://example.test'}}));
 assert.equal(r.status,403);
});
await test('Backup exports all owner records, including complete fields and revisions',async()=>{
 actor={userId:owner,email:'qa@example.test',displayName:'Synthetic QA',fullName:null};
 let r=await backup.POST(new Request(base+'/api/backup/export',{method:'POST',headers:{Origin:base}}));
 assert.equal(r.status,200);
 assert.match(r.headers.get('content-disposition'),/attachment/);
 assert.equal(r.headers.get('cache-control'),'private, no-store');
 const data=await r.json();
 assert.equal(data.format,'central-jbfs-backup');
 assert.equal(data.recordCount,3);
 assert.equal(data.entries.find(e=>e.id===q.id).revision,2);
 assert.deepEqual(data.entries.find(e=>e.id===q.id).data,q.data);
 actor={userId:other,email:'other@example.test',displayName:'Other',fullName:null};
 r=await backup.POST(new Request(base+'/api/backup/export',{method:'POST',headers:{Origin:base}}));
 assert.equal((await r.json()).recordCount,0);
});
await test('Only expected revision may delete a record',async()=>{assert.equal((await request('DELETE',{id:q.id,revision:1})).status,409);assert.equal((await request('DELETE',{id:q.id,revision:2})).status,200);assert.equal((await request('DELETE',{id:note.id,revision:1})).status,200);assert.equal((await request('DELETE',{id:calendarTask.id,revision:1})).status,200);assert.equal((await request('GET')).body.entries.length,0)});
fs.mkdirSync('outputs',{recursive:true});fs.writeFileSync('outputs/route-integration-results.json',JSON.stringify({environment:'Actual route handlers + Drizzle + in-memory SQLite D1 compatibility fixture; identity context mocked',passed:checks.length,checks},null,2));console.log(JSON.stringify({passed:checks.length,total:checks.length}));
