import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const data=JSON.parse(readFileSync(new URL('../public/craft-488.json',import.meta.url),'utf8'));
assert.equal(data.apps.length,488,'Censo incompleto');
assert.equal(new Set(data.apps.map(a=>a.id)).size,488,'Slugs duplicados');
assert.equal(new Set(data.apps.map(a=>a.l)).size,29,'Layouts divergentes da auditoria');
assert.equal(new Set(data.apps.map(a=>a.s)).size,7,'Adaptadores divergentes da auditoria');
assert.equal(Object.keys(data.categories).length,9,'Categorias divergentes');
for(const app of data.apps){
 assert.match(app.id,/^[a-z0-9-]{2,120}$/);
 assert.ok(app.name.length>0);
 assert.ok(app.c.every(c=>data.categories[c]),'Categoria sem rótulo: '+app.id);
 assert.ok(Array.isArray(app.f)&&Array.isArray(app.m),'Estrutura inválida: '+app.id);
 assert.ok(Number.isInteger(app.e)&&app.e>0,'Checagem original não registrada: '+app.id);
}
for(const id of ['note-taking-app','quick-notes','knowledge-base','project-notes','study-planner','exam-calendar','class-schedule','medical-appointments','flashcard-deck','project-hub','habit-tracker','study-timer']){
 assert.ok(data.apps.some(a=>a.id===id),'Prioridade ausente: '+id);
}
console.log('PASS 488 templates, slugs, 29 layouts, 7 fontes, 9 categorias e 12 prioridades');
