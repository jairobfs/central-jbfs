import {getChatGPTUser,chatGPTSignInPath} from '../../chatgpt-auth';
import {getDb} from '@/db';
import {entries} from '@/db/schema';
import {and,eq,desc} from 'drizzle-orm';
import {entryInput} from '@/lib/domain';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
async function identity(){return getChatGPTUser();}
async function authorized(req:Request){
 const user=await identity();if(!user)return {error:json({error:'Entre na sua conta para acessar seus registros.',signIn:chatGPTSignInPath('/')},401)};
 if(req.method!=='GET'&&req.headers.get('origin')!==new URL(req.url).origin)return {error:json({error:'Origem da solicitação não autorizada.'},403)};
 return {user};
}
export async function GET(req:Request){try{
 const auth=await authorized(req);if(auth.error)return auth.error;
 const rows=await getDb().select().from(entries).where(eq(entries.ownerId,auth.user!.userId)).orderBy(desc(entries.updatedAt)).limit(1001);
 return json({entries:rows.slice(0,1000),truncated:rows.length>1000,savedOnline:true});
}catch(e){console.error('entries-read-failed',e instanceof Error?e.message:'unknown');return json({error:'Não foi possível consultar seus registros. Tente atualizar novamente.'},503)}}
export async function POST(req:Request){try{
 const auth=await authorized(req);if(auth.error)return auth.error;
 if(Number(req.headers.get('content-length')||0)>250000)return json({error:'Conteúdo muito grande.'},413);
 const parsed=entryInput.safeParse(await req.json());if(!parsed.success)return json({error:parsed.error.issues[0]?.message||'Revise os campos.'},400);
 const x=parsed.data,now=new Date().toISOString(),db=getDb();
 await db.insert(entries).values({...x,ownerId:auth.user!.userId,createdAt:now,updatedAt:now}).onConflictDoNothing();
 const [row]=await db.select().from(entries).where(and(eq(entries.id,x.id),eq(entries.ownerId,auth.user!.userId))).limit(1);
 if(!row)return json({error:'Não foi possível criar este registro.'},409);
 return json({entry:row},201);
}catch(e){console.error('entries-create-failed',e instanceof Error?e.message:'unknown');return json({error:'O salvamento não foi confirmado. Seu rascunho foi mantido; tente novamente.'},503)}}
export async function PATCH(req:Request){try{
 const auth=await authorized(req);if(auth.error)return auth.error;
 const received=await req.json();if(!received||typeof received!=='object'||Array.isArray(received))return json({error:'Conteúdo inválido.'},400);const raw=received as Record<string,unknown>;const revision=raw.revision;delete raw.revision;
 if(typeof revision!=='number'||!Number.isInteger(revision)||revision<1)return json({error:'Versão do registro inválida.'},400);
 const parsed=entryInput.safeParse(raw);if(!parsed.success)return json({error:parsed.error.issues[0]?.message||'Revise os campos.'},400);
 const x=parsed.data,db=getDb();const changed=await db.update(entries).set({...x,revision:revision+1,updatedAt:new Date().toISOString()}).where(and(eq(entries.id,x.id),eq(entries.ownerId,auth.user!.userId),eq(entries.revision,revision))).returning();
 if(!changed.length){const [current]=await db.select().from(entries).where(and(eq(entries.id,x.id),eq(entries.ownerId,auth.user!.userId))).limit(1);return json({error:current?'Este registro mudou em outra janela. Seu rascunho continua aqui. Atualize a lista antes de editar novamente.':'Registro não encontrado.',conflict:!!current},current?409:404)}
 return json({entry:changed[0]});
}catch(e){console.error('entries-update-failed',e instanceof Error?e.message:'unknown');return json({error:'A alteração não foi confirmada. Tente novamente.'},503)}}
export async function DELETE(req:Request){try{
 const auth=await authorized(req);if(auth.error)return auth.error;const received=await req.json();if(!received||typeof received!=='object'||Array.isArray(received))return json({error:'Conteúdo inválido.'},400);const raw=received as Record<string,unknown>;
 if(typeof raw.id!=='string'||typeof raw.revision!=='number'||!Number.isInteger(raw.revision))return json({error:'Registro inválido.'},400);
 const changed=await getDb().delete(entries).where(and(eq(entries.id,raw.id),eq(entries.ownerId,auth.user!.userId),eq(entries.revision,raw.revision))).returning({id:entries.id});
 if(!changed.length)return json({error:'O registro mudou ou já foi excluído. Atualize a lista.'},409);
 return json({deleted:true});
}catch{return json({error:'A exclusão não foi confirmada.'},503)}}
