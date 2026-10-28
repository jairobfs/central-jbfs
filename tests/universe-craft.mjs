import assert from 'node:assert/strict';
import {test} from 'node:test';
import {
  UNIVERSE_SPACE,UNIVERSE_COLLECTIONS,normalizeUniverseCraftUrl,readUniverseCraft,
  UniverseCraftError
} from '../lib/universe-craft.ts';

const link='https://connect.craft.do/link/exemplo123/docs/v1';
function response(json,status=200){return new Response(JSON.stringify(json),{status,headers:{'Content-Type':'application/json'}})}
function fixture({space=UNIVERSE_SPACE,breakCollection='',badNote=false,duplicate=false,partial=false}={}){
 const calls=[];
 const models=Array.from({length:9},(_,i)=>({id:'m'+i}));
 const decks=Array.from({length:29},(_,i)=>({id:'d'+i}));
 const notes=Array.from({length:216},(_,i)=>{
  const cards=Array.from({length:i<146?2:1},(_,k)=>({id:'c'+i+'-'+k}));
  return {id:'n'+i,properties:{
   nota:{text:{value:'Nota '+i}},
   camposjson:{value:i===0&&badNote?'{broken':JSON.stringify({id:i,model:'m0',fields:{Front:'Pergunta '+i},cards})}
  }};
 });
 if(duplicate)models[8].id=models[7].id;
 const rows={
  [UNIVERSE_COLLECTIONS.models]:models,
  [UNIVERSE_COLLECTIONS.decks]:decks,
  [UNIVERSE_COLLECTIONS.notes]:notes,
  [UNIVERSE_COLLECTIONS.reviews]:[]
 };
 const fetchImpl=async (input,opts)=>{
  const u=new URL(String(input));calls.push({path:u.pathname+u.search,method:opts?.method});
  assert.equal(u.hostname,'connect.craft.do');
  assert.equal(opts.method,'GET');
  assert.equal(opts.credentials,'omit');
  assert.equal(opts.cache,'no-store');
  if(u.pathname.endsWith('/connection'))return response({space:{id:space,name:'⌕ TUT'}});
  const match=u.pathname.match(/\/collections\/([^/]+)\/items$/);
  if(!match)return response({errors:[{message:'unknown'}]},404);
  const id=match[1];
  if(id===breakCollection)return response({error:'falha simulada'},503);
  if(partial&&id===UNIVERSE_COLLECTIONS.models)return response({items:rows[id],pagination:{nextCursor:'next'}});
  return response({items:rows[id]??[]});
 };
 return {fetchImpl,calls};
}

test('aceita somente links de conexão HTTPS do Craft',()=>{
 assert.equal(normalizeUniverseCraftUrl(link),'https://connect.craft.do/link/exemplo123/api/v1');
 assert.equal(normalizeUniverseCraftUrl('https://connect.craft.do/links/ABC-01/api/v1/'),
  'https://connect.craft.do/links/ABC-01/api/v1');
 for(const wrong of ['http://connect.craft.do/link/ABC/api/v1',
  'https://evil.example/link/ABC/docs/v1','https://connect.craft.do/link/ABC/docs/v1?token=private',
  'https://connect.craft.do/link/ABC/api/v1#x','https://connect.craft.do/other/ABC/api/v1']){
   assert.throws(()=>normalizeUniverseCraftUrl(wrong),UniverseCraftError);
 }
});

test('acervo completo: 9 modelos, 29 baralhos, 216 notas, 362 cartões, zero revisões',async()=>{
 const mock=fixture();
 const data=await readUniverseCraft(link,{fetchImpl:mock.fetchImpl});
 assert.equal(data.integrity,'verificada');
 assert.deepEqual(data.counts,{models:9,decks:29,notes:216,reviews:0,cards:362});
 assert.equal(data.notes.length,216);
 assert.equal(data.notes[0].title,'Nota 0');
 assert.equal(data.issues.length,0);
 assert.equal(mock.calls.length,5);
 assert.ok(mock.calls.every(c=>c.method==='GET'));
 assert.ok(!JSON.stringify(data).includes('exemplo123'));
});

test('espaço diferente: bloqueia todas as Collections sem falsear resultados',async()=>{
 const mock=fixture({space:'id-de-outro-espaco'});
 const data=await readUniverseCraft(link,{fetchImpl:mock.fetchImpl});
 assert.equal(data.integrity,'outro espaço');
 assert.equal(data.counts.notes,null);
 assert.equal(mock.calls.length,1);
});

test('falha no Craft de Notas: mantém contagem desconhecida, não zero',async()=>{
 const mock=fixture({breakCollection:UNIVERSE_COLLECTIONS.notes});
 const data=await readUniverseCraft(link,{fetchImpl:mock.fetchImpl});
 assert.equal(data.integrity,'incompleta');
 assert.equal(data.counts.notes,null);
 assert.equal(data.counts.cards,null);
 assert.equal(data.sources.notes,'erro');
 assert.equal(data.notes.length,0);
});

test('estrutura de nota inválida: recusa atestar total de cartões',async()=>{
 const mock=fixture({badNote:true});
 const data=await readUniverseCraft(link,{fetchImpl:mock.fetchImpl});
 assert.equal(data.integrity,'incompleta');
 assert.equal(data.counts.cards,null);
 assert.equal(data.sources.notes,'erro');
 assert.equal(data.notes.length,215);
});

test('IDs de Collections duplicados são rejeitados',async()=>{
 const mock=fixture({duplicate:true});
 const data=await readUniverseCraft(link,{fetchImpl:mock.fetchImpl});
 assert.equal(data.integrity,'incompleta');
 assert.equal(data.counts.models,null);
 assert.equal(data.sources.models,'erro');
});

test('pagination não suportada é marcada como leitura parcial',async()=>{
 const mock=fixture({partial:true});
 const data=await readUniverseCraft(link,{fetchImpl:mock.fetchImpl});
 assert.equal(data.integrity,'incompleta');
 assert.equal(data.counts.models,null);
 assert.ok(data.issues.some(issue=>issue.includes('paginada')));
});

test('o frontend não dispara requisições com URL inválida',async()=>{
 let called=0;
 const fetchImpl=async()=>{called++;return response({})};
 await assert.rejects(readUniverseCraft('https://example.com/secret',{fetchImpl}),UniverseCraftError);
 assert.equal(called,0);
});

test('falha na identificação do espaço é erro explícito',async()=>{
 const fetchImpl=async()=>response({space:{}});
 await assert.rejects(readUniverseCraft(link,{fetchImpl}),e=>e?.code==='NO_SPACE');
});

test('código HTTP de erro não devolve conteúdo privado da resposta',async()=>{
 const fetchImpl=async()=>response({secret:'não revelar'},403);
 await assert.rejects(readUniverseCraft(link,{fetchImpl}),e=>
  e instanceof UniverseCraftError&&e.code==='HTTP_403'&&!e.message.includes('não revelar'));
});
