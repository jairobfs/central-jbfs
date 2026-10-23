import {safeUrl} from './shared';
import { z } from 'zod';
export const kindSchema = z.enum(['note','task','prompt','resource','question','session']);
export const dataSchema = z.object({
 url:z.string().max(2048).optional(), source:z.string().max(2000).optional(),
 answer:z.string().max(50000).optional(), explanation:z.string().max(50000).optional(),
 options:z.array(z.string().max(5000)).max(8).optional(),
 correctOption:z.number().int().min(0).max(7).optional(),
 quizAttempts:z.array(z.object({id:z.string().uuid(),at:z.string().datetime(),selectedIndex:z.number().int().min(0).max(7),expectedIndex:z.number().int().min(0).max(7),correct:z.boolean(),questionKey:z.string().regex(/^[a-f0-9]{8}$/)}).strict()).max(50).optional(),
 quizTotal:z.number().int().min(0).max(1000000000).optional(),quizCorrect:z.number().int().min(0).max(1000000000).optional(),
 favorite:z.boolean().optional(), reviewDue:z.string().datetime().optional(),
 reviewCount:z.number().int().min(0).max(100000).optional(), lastResult:z.enum(['again','good','easy']).optional(),
 durationSeconds:z.number().int().min(1).max(86400).optional(), due:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
 calendarId:z.enum(['t11','ambulatorio','grupo10','iesc','pessoal']).optional(),
 startTime:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
 endTime:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
 catalogId:z.string().regex(/^[a-z0-9-]{2,120}$/).optional(),
 eventType:z.enum(['class','exam','study','clinical','other']).optional(),
 habitHistory:z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(3660).optional(),
 habitWeeklyTarget:z.number().int().min(1).max(7).optional(),
}).strict();
export const entryInput=z.object({
 id:z.string().uuid(),kind:kindSchema,title:z.string().trim().min(1,'Dê um título ao registro.').max(200),
 body:z.string().max(100000).default(''),tag:z.string().trim().min(1).max(80).default('Pessoal'),
 status:z.enum(['open','doing','done']).default('open'),data:dataSchema.default({}),
}).strict().superRefine((x,ctx)=>{
 if(x.kind==='resource'&&!safeUrl(x.data.url))ctx.addIssue({code:'custom',path:['data','url'],message:'Use um link HTTPS, HTTP ou um link nativo do Craft.'});
 if(x.kind==='question'&&!x.data.answer?.trim())ctx.addIssue({code:'custom',path:['data','answer'],message:'Inclua uma resposta para revisar depois.'});
 if(x.data.correctOption!==undefined&&(x.kind!=='question'||!x.data.options?.[x.data.correctOption]?.trim()||(x.data.options||[]).filter(o=>o.trim()).length<2))ctx.addIssue({code:'custom',path:['data','correctOption'],message:'Escolha um gabarito existente e inclua pelo menos duas alternativas.'});
 if((x.data.quizCorrect??0)>(x.data.quizTotal??0))ctx.addIssue({code:'custom',path:['data','quizCorrect'],message:'O total de acertos não pode superar o de tentativas.'});
 if(x.data.quizAttempts?.some(a=>a.correct!==(a.selectedIndex===a.expectedIndex)))ctx.addIssue({code:'custom',path:['data','quizAttempts'],message:'Uma tentativa apresenta resultado inconsistente.'});
 if(x.kind==='session'&&!x.data.durationSeconds)ctx.addIssue({code:'custom',path:['data','durationSeconds'],message:'Inclua a duração da sessão.'});
});
