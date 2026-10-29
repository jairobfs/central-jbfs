import {getChatGPTUser,chatGPTSignInPath} from '../../../chatgpt-auth';
import {getDb} from '@/db';
import {entries} from '@/db/schema';
import {and,asc,eq,gt,lte,or} from 'drizzle-orm';

export const dynamic='force-dynamic';
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
const uuid=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const iso=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
type Cursor={asOf:string,updatedAt:string,id:string};
function encodeCursor(v:Cursor){return btoa([v.asOf,v.updatedAt,v.id].join('|')).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function parseCursor(raw:string):Cursor{
 if(!/^[A-Za-z0-9_-]{1,256}$/.test(raw))throw Error('Cursor inválido');
 let text:string;
 try{text=atob(raw.replace(/-/g,'+').replace(/_/g,'/'))}catch{throw Error('Cursor inválido')}
 const parts=text.split('|');
 if(parts.length!==3||!iso.test(parts[0])||!iso.test(parts[1])||!uuid.test(parts[2])||!Number.isFinite(Date.parse(parts[0]))||!Number.isFinite(Date.parse(parts[1]))||parts[1]>parts[0])throw Error('Cursor inválido');
 return {asOf:parts[0],updatedAt:parts[1],id:parts[2]};
}
/**
 * Leitura paginada e autenticada para migração. Retém todos os campos e
 * não altera a tabela entries. O snapshot é um limite superior temporal;
 * edições concorrentes exigem uma nova passagem incremental ao final.
 */
export async function GET(req:Request){
 try{
  const user=await getChatGPTUser();
  if(!user)return json({error:'Autenticação necessária.',signIn:chatGPTSignInPath('/')},401);
  const url=new URL(req.url),limitRaw=url.searchParams.get('limit');
  const limit=limitRaw===null?100:Number(limitRaw);
  if(!Number.isInteger(limit)||limit<1||limit>250)return json({error:'Limite de página inválido (1–250).'},400);
  const rawCursor=url.searchParams.get('cursor');
  let cursor:Cursor|null=null;
  try{if(rawCursor!==null)cursor=parseCursor(rawCursor)}catch{return json({error:'Cursor inválido.'},400)}
  const asOf=cursor?.asOf??new Date().toISOString();
  const db=getDb();
  const filter=cursor?or(gt(entries.updatedAt,cursor.updatedAt),and(eq(entries.updatedAt,cursor.updatedAt),gt(entries.id,cursor.id))):undefined;
  const rows=await db.select().from(entries)
    .where(and(eq(entries.ownerId,user.userId),lte(entries.updatedAt,asOf),filter))
    .orderBy(asc(entries.updatedAt),asc(entries.id)).limit(limit+1);
  const page=rows.slice(0,limit),hasMore=rows.length>limit;
  const last=page.at(-1);
  const nextCursor=hasMore&&last?encodeCursor({asOf,updatedAt:last.updatedAt,id:last.id}):null;
  return json({entries:page,asOf,nextCursor,hasMore,limit,complete:!hasMore,source:'central-jbfs:d1:entries'});
 }catch(e){
  console.error('entries-export-failed',e instanceof Error?e.message:'unknown');
  return json({error:'Não foi possível exportar a página. Nenhuma alteração foi realizada.'},503);
 }
}
