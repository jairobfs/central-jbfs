import type {CalendarId,Entry} from './types';
import {calendarForEntry,saoPauloDate} from './calendar.ts';

export const implementedApps=['class-schedule','exam-calendar','study-planner','medical-appointments'] as const;
export type ImplementedApp=typeof implementedApps[number];
export type EventType='class'|'exam'|'study'|'clinical'|'other';
export const eventNames:Record<EventType,string>={class:'Aula / atividade',exam:'Prova / avaliação',study:'Sessão de estudo',clinical:'Ambulatório / prática',other:'Compromisso'};

export function isImplementedApp(id:string):id is ImplementedApp{
 return (implementedApps as readonly string[]).includes(id);
}

export function eventKind(entry:Entry):EventType{
 if(entry.data.eventType)return entry.data.eventType;
 const title=entry.title.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 if(/\b(prova|avaliacao|osce|cab|exame)\b/.test(title))return 'exam';
 return 'other';
}

export function visibleRuntimeEntries(app:ImplementedApp,entries:Entry[],front:CalendarId|'all'='all'){
 const rows=entries.filter(e=>e.kind==='task').filter(e=>front==='all'||calendarForEntry(e)===front);
 if(app==='exam-calendar')return rows.filter(e=>!!e.data.due&&eventKind(e)==='exam');
 if(app==='study-planner')return rows.filter(e=>eventKind(e)==='study'||e.tag.toLowerCase()==='estudo');
 if(app==='medical-appointments')return rows.filter(e=>!!e.data.due&&(calendarForEntry(e)==='ambulatorio'||calendarForEntry(e)==='iesc'||eventKind(e)==='clinical'));
 return rows.filter(e=>!!e.data.due);
}

export function weekDaysFor(date:string){
 const midday=new Date(date+'T12:00:00Z');
 const dow=midday.getUTCDay();
 const monday=new Date(midday);
 monday.setUTCDate(midday.getUTCDate()-((dow+6)%7));
 return Array.from({length:7},(_,i)=>{
  const day=new Date(monday);day.setUTCDate(monday.getUTCDate()+i);
  return day.toISOString().slice(0,10);
 });
}

export function shiftWeek(date:string,offset:number){
 const base=new Date(date+'T12:00:00Z');
 base.setUTCDate(base.getUTCDate()+offset*7);
 return base.toISOString().slice(0,10);
}

export function daysUntil(date:string,today=saoPauloDate()){
 const parse=(s:string)=>Date.UTC(Number(s.slice(0,4)),Number(s.slice(5,7))-1,Number(s.slice(8,10)));
 return Math.round((parse(date)-parse(today))/86400000);
}
