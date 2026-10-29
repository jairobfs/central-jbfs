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
const quiz={...q,id:randomUUID(),title:'Questão de simulado sintética',data:{...q.data,correctOption:2}};
let quizRevision=1;
await test('Explicit quiz key survives create and a fresh read',async()=>{const r=await request('POST',quiz);assert.equal(r.status,201);assert.equal(r.body.entry.data.correctOption,2);const fresh=await request('GET');assert.deepEqual(fresh.body.entries.find(e=>e.id===quiz.id).data,quiz.data)});
await test('Quiz attempt, counters and source survive handler update',async()=>{const {gradeChoice,withQuizAttempt}=load(path.join(root,'lib/quiz.ts'));const attempt=gradeChoice({...quiz,revision:1},0,randomUUID(),'2026-10-23T12:00:00Z');const draft=withQuizAttempt({...quiz,revision:1},attempt);const r=await request('PATCH',{...draft,revision:1});assert.equal(r.status,200,JSON.stringify(r.body));quizRevision=2;assert.equal(r.body.entry.data.quizTotal,1);assert.equal(r.body.entry.data.quizCorrect,0);assert.equal(r.body.entry.data.quizAttempts[0].correct,false);assert.equal(r.body.entry.data.source,q.data.source);assert.equal(r.body.entry.data.answer,q.data.answer);const fresh=await request('GET');assert.deepEqual(fresh.body.entries.find(e=>e.id===quiz.id).data,r.body.entry.data)});
await test('A key outside the option list is rejected',async()=>assert.equal((await request('POST',{...quiz,id:randomUUID(),data:{...quiz.data,correctOption:7}})).status,400));
await test('A contradictory attempt result is rejected',async()=>assert.equal((await request('POST',{...quiz,id:randomUUID(),data:{...quiz.data,quizAttempts:[{id:randomUUID(),at:'2026-10-23T12:00:00Z',selectedIndex:0,expectedIndex:2,correct:true,questionKey:'12345678'}]}})).status,400));
await test('Quiz totals cannot contain more correct answers than attempts',async()=>assert.equal((await request('POST',{...quiz,id:randomUUID(),data:{...quiz.data,quizTotal:1,quizCorrect:2}})).status,400));
const exportRoute=load(path.join(root,'app/api/entries/export/route.ts'));
async function readExport(query='',identity=owner){
 actor=identity?{userId:identity,email:'qa@example.test',displayName:'Synthetic QA',fullName:null}:null;
 const result=await exportRoute.GET(new Request(base+'/api/entries/export'+query));
 return {status:result.status,body:await result.json()};
}
await test('Export endpoint rejects anonymous access',async()=>assert.equal((await readExport('',null)).status,401));
await test('Export endpoint rejects invalid limits and cursors',async()=>{
 assert.equal((await readExport('?limit=9999')).status,400);
 assert.equal((await readExport('?cursor=not-valid')).status,400);
});
await test('Export is complete with stable cursor pagination and user isolation',async()=>{
 const rows=[];let cursor=null,firstAsOf=null;let pages=0;
 while(true){
  const query='?limit=2'+(cursor?'&cursor='+encodeURIComponent(cursor):'');
  const response=await readExport(query);
  assert.equal(response.status,200,JSON.stringify(response.body));
  assert.ok(response.body.entries.length<=2);
  assert.equal(response.body.source,'central-jbfs:d1:entries');
  if(firstAsOf)assert.equal(response.body.asOf,firstAsOf);else firstAsOf=response.body.asOf;
  rows.push(...response.body.entries);
  pages++;
  if(response.body.complete){assert.equal(response.body.nextCursor,null);break}
  assert.equal(response.body.hasMore,true);
  cursor=response.body.nextCursor;
  assert.ok(cursor&&pages<20);
 }
 const normal=await request('GET');
 assert.deepEqual(rows.map(r=>r.id).sort(),normal.body.entries.map(r=>r.id).sort());
 assert.equal(new Set(rows.map(r=>r.id)).size,rows.length);
 assert.ok(pages>1);
 const otherView=await readExport('?limit=2',other);
 assert.equal(otherView.status,200);
 assert.deepEqual(otherView.body.entries,[]);
});
await test('Export confirms the same total count on every page',async()=>{
 const r=await readExport('?limit=2');
 assert.equal(r.status,200);
 assert.ok(Number.isInteger(r.body.totalExpected));
 assert.ok(r.body.totalExpected>=r.body.entries.length);
 if(r.body.nextCursor){
  const next=await readExport('?limit=2&cursor='+encodeURIComponent(r.body.nextCursor));
  assert.equal(next.status,200);
  assert.equal(next.body.totalExpected,r.body.totalExpected);
 }
});
await test('Concurrent edit that removes a row from snapshot fails closed',async()=>{
 const first=await readExport('?limit=1');
 assert.equal(first.status,200);
 assert.ok(first.body.hasMore);
 const lastId=sqlite.prepare('SELECT id FROM entries ORDER BY updated_at DESC, id DESC LIMIT 1').get().id;
 const old=sqlite.prepare('SELECT updated_at FROM entries WHERE id=?').get(lastId).updated_at;
 try{
  sqlite.prepare('UPDATE entries SET updated_at=? WHERE id=?').run('2099-01-01T00:00:00.000Z',lastId);
  const second=await readExport('?limit=1&cursor='+encodeURIComponent(first.body.nextCursor));
  assert.equal(second.status,409);
  assert.equal(second.body.code,'SNAPSHOT_CHANGED');
 }finally{
  sqlite.prepare('UPDATE entries SET updated_at=? WHERE id=?').run(old,lastId);
 }
});
await test('Only expected revision may delete a record',async()=>{assert.equal((await request('DELETE',{id:q.id,revision:1})).status,409);assert.equal((await request('DELETE',{id:q.id,revision:2})).status,200);assert.equal((await request('DELETE',{id:note.id,revision:1})).status,200);assert.equal((await request('DELETE',{id:calendarTask.id,revision:1})).status,200);assert.equal((await request('DELETE',{id:quiz.id,revision:quizRevision})).status,200);assert.equal((await request('GET')).body.entries.length,0)});
fs.mkdirSync('outputs',{recursive:true});fs.writeFileSync('outputs/route-integration-results.json',JSON.stringify({environment:'Actual route handlers + Drizzle + in-memory SQLite D1 compatibility fixture; identity context mocked',passed:checks.length,checks},null,2));console.log(JSON.stringify({passed:checks.length,total:checks.length}));
