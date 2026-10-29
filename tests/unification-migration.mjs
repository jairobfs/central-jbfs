import test from "node:test";
import assert from "node:assert/strict";
import {planMigration,normalized,payloadOf} from "../lib/unification-migration.mjs";
const id="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const now="2026-10-23T10:00:00.000Z";
const entry={id,owner_id:"nao-publicar",kind:"question",title:"Questão de teste",body:"Texto",tag:"Estudo",status:"open",revision:2,created_at:now,updated_at:now,data:{answer:"Resposta",explanation:"Explicação",options:["A","B"],correctOption:1,quizAttempts:[{id:"tentativa-1",correct:true}]}};
test("exporta todos os campos funcionais, mas não o owner_id",()=>{
 const result=normalized(entry),payload=payloadOf(result);
 assert.equal(result.data.quizAttempts[0].id,"tentativa-1");
 assert.equal(result.data.correctOption,1);
 assert.equal(payload.properties.chave,"central-jbfs:d1:entries:"+id);
 assert.ok(!JSON.stringify(payload).includes("nao-publicar"));
});
test("planeja criação e não exclusão",()=>{
 const plan=planMigration({sourceRows:[entry]});
 assert.equal(plan.mode,"dry-run");assert.equal(plan.operations[0].action,"create");assert.equal(plan.deleted,0);
});
test("reimportação idempotente",()=>{
 const payload=payloadOf(normalized(entry));
 const plan=planMigration({sourceRows:[entry],craftRows:[{id:"craft-1",properties:payload.properties}]});
 assert.equal(plan.unchanged.length,1);assert.equal(plan.operations.length,0);
});
test("atualização condicional e conflito de revisão igual",()=>{
 const payload=payloadOf(normalized(entry));const remote=[{id:"craft-1",properties:payload.properties}];
 const update=planMigration({sourceRows:[{...entry,revision:3}],craftRows:remote});
 assert.equal(update.operations[0].action,"update");assert.equal(update.operations[0].expectedRevision,2);
 const conflict=planMigration({sourceRows:[{...entry,body:"Editado em outro lugar"}],craftRows:remote});
 assert.equal(conflict.conflicts.length,1);assert.equal(conflict.operations.length,0);
});
test("preserva registros presentes somente no Craft",()=>{
 const payload=payloadOf(normalized(entry));const result=planMigration({sourceRows:[],craftRows:[{id:"craft-1",properties:payload.properties}]});
 assert.equal(result.conflicts[0].reason,"Só no Craft; preservar");assert.equal(result.deleted,0);
});
test("bloqueia snapshot truncado, UUID inválido e duplicatas",()=>{
 assert.throws(()=>planMigration({sourceRows:[entry],sourceTruncated:true}),/truncada/);
 assert.throws(()=>planMigration({sourceRows:[{...entry,id:"errado"}]}),/UUID/);
 assert.throws(()=>planMigration({sourceRows:[entry,entry]}),/Duplicata/);
});
