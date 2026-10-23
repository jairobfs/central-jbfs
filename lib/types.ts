export type Kind='note'|'task'|'prompt'|'resource'|'question'|'session';
export type CalendarId='t11'|'ambulatorio'|'grupo10'|'iesc'|'pessoal';
export type Entry={id:string;kind:Kind;title:string;body:string;tag:string;status:'open'|'doing'|'done';data:{url?:string;source?:string;answer?:string;explanation?:string;options?:string[];favorite?:boolean;reviewDue?:string;reviewCount?:number;lastResult?:'again'|'good'|'easy';durationSeconds?:number;due?:string;calendarId?:CalendarId;startTime?:string;endTime?:string;catalogId?:string;eventType?:'class'|'exam'|'study'|'clinical'|'other';habitHistory?:string[];habitWeeklyTarget?:number};revision:number;createdAt:string;updatedAt:string};
export type Draft=Pick<Entry,'id'|'kind'|'title'|'body'|'tag'|'status'|'data'>;
