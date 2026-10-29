import {CentralCraftRepository} from '../lib/central-craft-repository.mjs';
import {CentralSyncError} from '../lib/craft-central-gateway.mjs';

const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const json=(data,status=200)=>Response.json(data,{status,headers:{
 'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Vary':'Cookie'
}});
function safeKey(value){
 if(typeof value!=='string'||!UUID.test(value))throw new CentralSyncError('Identificador inválido.','INVALID_INPUT');
 return 'central-jbfs:d1:entries:'+value.toLowerCase();
}
async function readBody(req){
 const length=Number(req.headers.get('content-length')||0);
 if(length>262144)throw new CentralSyncError('Registro excede o limite de tamanho.','INVALID_INPUT');
 const raw=await req.text();
 if(raw.length>262144)throw new CentralSyncError('Registro excede o limite de tamanho.','INVALID_INPUT');
 try{
  const x=JSON.parse(raw);
  if(!x||typeof x!=='object'||Array.isArray(x))throw Error('Invalid JSON');
  return x;
 }catch{throw new CentralSyncError('Envie um objeto JSON válido.','INVALID_INPUT')}
}
function validRevision(value){
 if(!Number.isSafeInteger(value)||value<1)throw new CentralSyncError('Revisão inválida.','INVALID_INPUT');
 return value;
}
/**
 * Servidor de entrada para a Central hospedada COMO ROTA INTERNA do Universo.
 * Deve ser importado exclusivamente pelo handler do servidor Sites do Universo.
 * O token/URL da conexão Craft é configurado somente no gatewayFactory privado.
 *
 * Travas obrigatórias:
 * - verificação real do cutover D1 → Craft antes de criar o handler;
 * - identidade assinada/atestada pelo host, jamais um cabeçalho arbitrário do cliente;
 * - proprietário único explícito;
 * - validação Zod original por validateDraft;
 * - serialização DISTRIBUÍDA por chave por withKeyLock (não Map em memória).
 */
export function createCentralCraftHttpHandler({
 resolveUserId,ownerId,gatewayFactory,validateDraft,withKeyLock,cutoverVerified=false
}={}){
 if(cutoverVerified!==true)throw new Error('Migração D1 → Craft não homologada; rota Craft bloqueada.');
 if(typeof ownerId!=='string'||!ownerId.trim())throw new Error('Proprietário do Universo não configurado.');
 for(const [name,fn] of Object.entries({resolveUserId,gatewayFactory,validateDraft,withKeyLock})){
  if(typeof fn!=='function')throw new Error('Dependência obrigatória do servidor: '+name);
 }
 return async function handle(req){
  const u=new URL(req.url),method=req.method;
  const restore=u.pathname.endsWith('/restore');
  if(restore&&method!=='POST')return json({error:'Método não permitido.'},405);
  if(!['GET','POST','PATCH','DELETE'].includes(method)||restore&&method==='GET')return json({error:'Método não permitido.'},405);
  let actor;
  try{actor=await resolveUserId(req)}catch{return json({error:'Não foi possível verificar a identidade.'},401)}
  if(!actor)return json({error:'Autenticação necessária.'},401);
  if(actor!==ownerId)return json({error:'Sem permissão para este acervo.'},403);
  if(method!=='GET'&&req.headers.get('origin')!==u.origin)return json({error:'Origem não autorizada.'},403);
  try{
   const gateway=await gatewayFactory(req);
   const repo=new CentralCraftRepository({gateway});
   if(method==='GET'){
    if(restore)return json({error:'Método não permitido.'},405);
    return json({entries:await repo.list(),truncated:false,savedOnline:true});
   }
   const body=await readBody(req);
   const id=safeKey(body.id);
   const work=async()=>{
    if(method==='DELETE'){
     const deleted=await repo.archive({id:body.id,revision:validRevision(body.revision)});
     return json({deleted});
    }
    if(restore){
     const restored=await repo.restore({id:body.id,revision:validRevision(body.revision)});
     return json({entry:restored});
    }
    if(method==='POST'){
     const input=validateDraft(body);
     if(!input||typeof input!=='object'||input.id!==body.id)throw new CentralSyncError('Dados inválidos.','INVALID_INPUT');
     return json({entry:await repo.create(input)},201);
    }
    const revision=validRevision(body.revision),draft={...body};
    delete draft.revision;
    const input=validateDraft(draft);
    if(!input||typeof input!=='object'||input.id!==body.id)throw new CentralSyncError('Dados inválidos.','INVALID_INPUT');
    return json({entry:await repo.update({...input,revision})});
   };
   return await withKeyLock(id,work);
  }catch(error){
   if(error instanceof CentralSyncError){
    const code=error.code;
    const status=['CONFLICT','DUPLICATE_KEY','ARCHIVED','NOT_ARCHIVED'].includes(code)?409:
     code==='NOT_FOUND'?404:code==='INVALID_INPUT'?400:503;
    return json({error:status===503?'A operação no Craft não foi confirmada. Seus dados permanecem no editor.':error.message,code},status);
   }
   if(error?.name==='ZodError')return json({error:'Revise os campos antes de salvar.',code:'INVALID_INPUT'},400);
   return json({error:'O Craft não confirmou a operação. Seu rascunho não foi descartado.'},503);
  }
 };
}
