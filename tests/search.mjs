import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';

const require=createRequire(import.meta.url);
const ts=require('typescript');
const source=readFileSync(resolve(import.meta.dirname,'../lib/search.ts'),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {matchesSearch}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
const entry={title:'Artrite reumatoide',body:'Enunciado de teste',tag:'Medicina',data:{answer:'Sinovite',explanation:'Pannus com erosões',source:'Revisão clínica',options:['RANKL','Pannus'],url:'https://example.test/medicina'}};

for(const query of ['artrite','REUMATOIDE','sinovite','erosoes','revisao clinica','RANKL','example.test','medicina']){
  assert.equal(matchesSearch(entry,query),true,`Busca falhou: ${query}`);
}
assert.equal(matchesSearch(entry,'osteoporose'),false);
console.log('PASS full-text and accent-insensitive search (9 cases)');
