import type {Draft,Entry,QuizAttempt} from './types';
import {matchesSearch} from './search.ts';
export const quizAppId='quiz-maker' as const;
export function isQuizApp(id:string):id is typeof quizAppId{return id===quizAppId}
export function answerOptions(entry:Entry){return (entry.data.options||[]).map((text,index)=>({text,index})).filter(x=>x.text.trim().length>0)}
export function isGradable(entry:Entry){const index=entry.data.correctOption;return entry.kind==='question'&&!entry.data.catalogId&&Number.isInteger(index)&&answerOptions(entry).length>=2&&answerOptions(entry).some(x=>x.index===index)}
export function quizPool(entries:Entry[],tag='',query=''){return entries.filter(e=>e.kind==='question'&&!e.data.catalogId&&(!tag||e.tag===tag)&&matchesSearch(e,query)).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))}
/** A change detector for review history, not a cryptographic proof or credential. */
export function questionKey(entry:Entry){const text=JSON.stringify([entry.title,entry.body,entry.data.options,entry.data.correctOption,entry.data.answer,entry.data.explanation,entry.data.source]);let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(16).padStart(8,'0')}
export function gradeChoice(entry:Entry,selected:number,id:string,at:string):QuizAttempt{
 if(!isGradable(entry))throw Error('Defina a alternativa correta antes de iniciar o simulado.');
 if(!answerOptions(entry).some(x=>x.index===selected))throw Error('Selecione uma alternativa válida.');
 return {id,at,selectedIndex:selected,expectedIndex:entry.data.correctOption!,correct:selected===entry.data.correctOption,questionKey:questionKey(entry)};
}
export function withQuizAttempt(entry:Entry,attempt:QuizAttempt):Draft{
 const history=entry.data.quizAttempts||[];
 if(history.some(x=>x.id===attempt.id))return asDraft(entry);
 if(questionKey(entry)!==attempt.questionKey)throw Error('Esta questão mudou durante a tentativa. Reabra a questão antes de responder novamente.');
 const total=entry.data.quizTotal??history.length,correct=entry.data.quizCorrect??history.filter(x=>x.correct).length;
 return {...asDraft(entry),data:{...entry.data,quizAttempts:[...history,attempt].slice(-50),quizTotal:total+1,quizCorrect:correct+Number(attempt.correct)}};
}
export function quizStats(entries:Entry[]){return entries.reduce((s,e)=>{const h=e.data.quizAttempts||[];return {total:s.total+(e.data.quizTotal??h.length),correct:s.correct+(e.data.quizCorrect??h.filter(a=>a.correct).length)}},{total:0,correct:0})}
export function quizQueue(entries:Entry[],count:number,shuffle:boolean,random= Math.random){const list=entries.filter(isGradable).map(e=>e.id);if(shuffle)for(let i=list.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[list[i],list[j]]=[list[j],list[i]]}return list.slice(0,Math.min(50,Math.max(1,count)))}
function asDraft(e:Entry):Draft{return {id:e.id,kind:e.kind,title:e.title,body:e.body,tag:e.tag,status:e.status,data:{...e.data}}}
