import assert from 'node:assert/strict';
import {daysUntil,eventKind,isImplementedApp,shiftWeek,visibleRuntimeEntries,weekDaysFor} from '../lib/app-runtime.ts';

const build=(title,date,calendarId,eventType,status='open')=>({id:title,kind:'task',title,body:'',tag:calendarId==='ambulatorio'?'Ambulatório':'T11',status,data:{calendarId,due:date,eventType}});
const entries=[
 build('Aula prática','2026-10-26','t11','class'),
 build('CAB Locomoção','2026-10-27','t11','exam'),
 build('Revisão de farmacologia','2026-10-28','t11','study','doing'),
 build('Ambulatório supervisionado','2026-10-29','ambulatorio','clinical'),
 {kind:'task',title:'Prova de semiologia',tag:'T11',status:'open',data:{calendarId:'t11',due:'2026-10-30'}},
 {kind:'task',title:'Tarefa sem data',tag:'T11',status:'open',data:{calendarId:'t11',eventType:'study'}},
 {kind:'note',title:'Nota clínica',tag:'Ambulatório',status:'open',data:{}},
];
assert.equal(isImplementedApp('class-schedule'),true);
assert.equal(isImplementedApp('flashcard-deck'),false);
assert.equal(eventKind(entries[4]),'exam');
assert.equal(visibleRuntimeEntries('class-schedule',entries).length,5);
assert.equal(visibleRuntimeEntries('class-schedule',entries,'t11').length,4);
assert.equal(visibleRuntimeEntries('exam-calendar',entries).length,2);
assert.equal(visibleRuntimeEntries('study-planner',entries).length,2);
assert.equal(visibleRuntimeEntries('medical-appointments',entries).length,1);
assert.deepEqual(weekDaysFor('2026-10-23'),['2026-10-19','2026-10-20','2026-10-21','2026-10-22','2026-10-23','2026-10-24','2026-10-25']);
assert.equal(shiftWeek('2026-12-30',1),'2027-01-06');
assert.equal(daysUntil('2026-11-01','2026-10-23'),9);
assert.equal(daysUntil('2026-10-20','2026-10-23'),-3);
console.log('PASS 12 app-runtime tests: filtering, categorization, dates and weeks');
