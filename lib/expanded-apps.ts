import type {Entry} from './types';

export const expandedAppIds=['habit-tracker','project-hub','lecture-notes-viewer'] as const;
export type ExpandedApp=typeof expandedAppIds[number];
export const isExpandedApp=(id:string):id is ExpandedApp=>(expandedAppIds as readonly string[]).includes(id);
export const isHabit=(e:Entry)=>e.kind==='task'&&Array.isArray(e.data.habitHistory)&&typeof e.data.habitWeeklyTarget==='number';
export const habitEntries=(entries:Entry[])=>entries.filter(isHabit);
export const dayKey=(date:Date)=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
export const localDay=(key:string)=>new Date(`${key}T12:00:00-03:00`);
export const shiftDay=(key:string,days:number)=>dayKey(new Date(localDay(key).getTime()+days*86400000));
export const lastSeven=(today:string)=>Array.from({length:7},(_,i)=>shiftDay(today,i-6));
export function streak(history:string[],today:string){const recorded=new Set(history);let cursor=recorded.has(today)?today:shiftDay(today,-1),count=0;while(recorded.has(cursor)&&count<=history.length){count++;cursor=shiftDay(cursor,-1)}return count}
export const projectEntries=(entries:Entry[])=>entries.filter(e=>e.kind!=='session'&&!isHabit(e)&&e.tag!=='Craft Apps');
export const projectNames=(entries:Entry[])=>Array.from(new Set(projectEntries(entries).map(e=>e.tag))).sort((a,b)=>a.localeCompare(b,'pt-BR'));
export function outlineOf(body:string){return body.split('\n').map((text,i)=>({text,index:i,match:/^(#{1,4})\s+(.+)\s*$/.exec(text)})).filter(item=>item.match).map(({index,match})=>({index,depth:match![1].length,title:match![2].trim()}))}
