import {safeUrl} from './shared';
import { z } from 'zod';
export const kindSchema = z.enum(['note','task','prompt','resource','question','session']);
export const dataSchema = z.object({
 url:z.string().max(2048).optional(), source:z.string().max(2000).optional(),
 answer:z.string().max(50000).optional(), explanation:z.string().max(50000).optional(),
 options:z.array(z.string().max(5000)).max(8).optional(),
 favorite:z.boolean().optional(), reviewDue:z.string().datetime().optional(),
 reviewCount:z.number().int().min(0).max(100000).optional(), lastResult:z.enum(['again','good','easy']).optional(),
 durationSeconds:z.number().int().min(1).max(86400).optional(), due:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
 calendarId:z.enum(['t11','ambulatorio','grupo10','iesc','pessoal']).optional(),
 startTime:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
 endTime:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
 catalogId:z.string().regex(/^[a-z0-9-]{2,120}$/).optional(),
 eventType:z.enum(['class','exam','study','clinical','other']).optional(),
}).strict();
export const entryInput=z.object({
 id:z.string().uuid(),kind:kindSchema,title:z.string().trim().min(1,'Dê um título ao registro.').max(200),
 body:z.string().max(100000).default(''),tag:z.string().trim().min(1).max(80).default('Pessoal'),
 status:z.enum(['open','doing','done']).default('open'),data:dataSchema.default({}),
}).strict().superRefine((x,ctx)=>{
 if(x.kind==='resource'&&!safeUrl(x.data.url))ctx.addIssue({code:'custom',path:['data','url'],message:'Use um link HTTPS, HTTP ou um link nativo do Craft.'});
 if(x.kind==='question'&&!x.data.answer?.trim())ctx.addIssue({code:'custom',path:['data','answer'],message:'Inclua uma resposta para revisar depois.'});
 if(x.kind==='session'&&!x.data.durationSeconds)ctx.addIssue({code:'custom',path:['data','durationSeconds'],message:'Inclua a duração da sessão.'});
});
