import type {Entry} from './types';
export type EntriesResult={error?:string;signIn?:string;entries?:Entry[];entry?:Entry;truncated?:boolean;deleted?:boolean};
export type EntriesTransport=(method:string,payload?:unknown)=>Promise<EntriesResult>;
let craftTransport:EntriesTransport|null=null;
/**
 * Deve ser configurado antes de montar os componentes da Central no Universo.
 * A troca D1 → Craft só é permitida após conferência integral de migração.
 */
export function configureEntriesTransport(transport:EntriesTransport,{cutoverVerified=false}:{cutoverVerified?:boolean}={}){
 if(cutoverVerified!==true)throw new Error('Migração D1 → Craft não homologada. Transporte não ativado.');
 if(typeof transport!=='function')throw new TypeError('Transporte inválido.');
 craftTransport=transport;
}
export class EntriesError extends Error {
 status:number;signIn:string;
 constructor(message:string,status=0,signIn=''){super(message);this.name='EntriesError';this.status=status;this.signIn=signIn}
}
export async function requestEntries(method='GET',payload?:unknown,fetcher:typeof fetch=fetch,timeoutMs=15000):Promise<EntriesResult>{
 if(craftTransport)return craftTransport(method,payload);
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const response=await fetcher('/api/entries',{method,cache:'no-store',signal:controller.signal,...(payload===undefined?{}:{headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})});
  let data:EntriesResult;
  try{data=await response.json()}catch{throw new EntriesError(response.status===401?'Sua sessão expirou. Entre novamente para salvar.':'O servidor não respondeu no formato esperado. Tente reconectar.',response.status,response.status===401?'/signin-with-chatgpt?return_to=%2F':'')}
  if(!response.ok)throw new EntriesError(data.error||'A operação não foi confirmada.',response.status,typeof data.signIn==='string'&&(data.signIn.startsWith('/signin-with-chatgpt?')||data.signIn==='/entrar')?data.signIn:'');
  if(!data||typeof data!=='object')throw new EntriesError('A resposta do servidor está incompleta.');
  if(method==='GET'&&!Array.isArray(data.entries)||['POST','PATCH'].includes(method)&&!data.entry||method==='DELETE'&&data.deleted!==true)throw new EntriesError('O servidor não confirmou esta operação. Reconecte antes de tentar novamente.');
  return data;
 }catch(error){if(error instanceof EntriesError)throw error;throw new EntriesError(controller.signal.aborted?'A conexão demorou demais. Seu conteúdo continua no editor; tente reconectar.':'Sem conexão com o servidor. Seu conteúdo continua no editor.')}finally{clearTimeout(timer)}
}
