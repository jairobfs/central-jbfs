import assert from 'node:assert/strict';
import {isKnowledgeApp,knowledgeAppDetails,knowledgeEntries,normalized,reviewQueue,searchKnowledge} from '../lib/knowledge-runtime.ts';

const item=(id,kind,title,body,tag,data={},date='2026-10-22T12:00:00Z')=>({id,kind,title,body,tag,data,updatedAt:date});
const entries=[
 item('1','note','Fratura exposta','Tratamento inicial','Ortopedia',{favorite:true}),
 item('2','resource','Artigo de ortopedia','', 'Ortopedia',{url:'https://example.org'}),
 item('3','prompt','Discussão tutorial','Procure evidências clínicas','Estudo'),
 item('4','question','LCA','Teste de Lachman','Ortopedia',{answer:'Lachman',reviewDue:'2026-10-22T00:00:00Z'}),
 item('5','question','LES','Autoanticorpos','Reumatologia',{answer:'anti-Sm',reviewDue:'2026-11-22T00:00:00Z'}),
 item('6','task','Estudar medicina','Prova amanhã','T11'),
 item('7','session','Foco','Sessão','Estudo'),
 item('8','note','Template interno','Oficina','Craft Apps',{catalogId:'flashcard-deck'})
];
assert.equal(isKnowledgeApp('quick-notes'),true);
assert.equal(isKnowledgeApp('knowledge-base'),true);
assert.equal(isKnowledgeApp('flashcard-deck'),true);
assert.equal(isKnowledgeApp('notes-search'),true);
assert.equal(isKnowledgeApp('class-schedule'),false);
assert.equal(Object.keys(knowledgeAppDetails).length,4);
assert.deepEqual(knowledgeEntries(entries,'quick-notes').map(x=>x.id),['1']);
assert.deepEqual(knowledgeEntries(entries,'knowledge-base').map(x=>x.id),['1','2','3']);
assert.deepEqual(knowledgeEntries(entries,'flashcard-deck').map(x=>x.id),['4','5']);
assert.deepEqual(knowledgeEntries(entries,'notes-search').map(x=>x.id),['1','2','3','4','5','6']);
assert.equal(normalized('FÁRMACO'), 'farmaco');
assert.deepEqual(searchKnowledge(entries,'fratura', '',false).map(x=>x.id),['1']);
assert.deepEqual(searchKnowledge(entries,'ortopedia','Ortopedia',true).map(x=>x.id),['1']);
assert.deepEqual(searchKnowledge(entries,'evidencias','',false).map(x=>x.id),['3']);
assert.deepEqual(reviewQueue(entries,new Date('2026-10-23T00:00:00Z').getTime()).map(x=>x.id),['4']);
assert.deepEqual(reviewQueue(entries,new Date('2026-11-23T00:00:00Z').getTime()).map(x=>x.id),['4','5']);
console.log('PASS 16 knowledge-runtime tests: catalog guard, collection scopes, diacritics, filters and due queue');
