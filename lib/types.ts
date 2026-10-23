export type Kind='note'|'task'|'prompt'|'resource'|'question'|'session';
export type Entry={id:string;kind:Kind;title:string;body:string;tag:string;status:'open'|'doing'|'done';data:{url?:string;source?:string;answer?:string;explanation?:string;options?:string[];favorite?:boolean;reviewDue?:string;reviewCount?:number;lastResult?:'again'|'good'|'easy';durationSeconds?:number;due?:string};revision:number;createdAt:string;updatedAt:string};
export type Draft=Pick<Entry,'id'|'kind'|'title'|'body'|'tag'|'status'|'data'>;
