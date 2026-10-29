import {EntriesError} from '../lib/entries-client.ts';

/**
 * O navegador conversa exclusivamente com o backend do MESMO domínio Universo.
 * Nunca recebe URL/token privado da conexão Craft.
 */
export function createCentralSameOriginTransport({
 path='/api/central/entries',fetchImpl=fetch,timeoutMs=15000
}={}){
 if(typeof path!=='string'||!/^\/(?!\/)[a-zA-Z0-9/_-]+$/.test(path))
  throw new TypeError('O caminho do servidor deve ser relativo à origem.');
 if(typeof fetchImpl!=='function'||!Number.isFinite(timeoutMs)||timeoutMs<1000)
  throw new TypeError('Transporte HTTP inválido.');
 return async function request(method='GET',payload){
  if(!['GET','POST','PATCH','DELETE','RESTORE'].includes(method))throw new EntriesError('Operação não suportada.',400);
  const restore=method==='RESTORE',verb=restore?'POST':method;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
   const url=restore?path+'/restore':path;
   const response=await fetchImpl(url,{
    method:verb,credentials:'same-origin',cache:'no-store',redirect:'error',
    signal:controller.signal,
    ...(verb==='GET'?{}:{headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
   });
   let data;
   try{data=await response.json()}catch{
    throw new EntriesError('O servidor não confirmou a operação.',response.status);
   }
   if(!response.ok){
    const link=typeof data?.signIn==='string'&&data.signIn.startsWith('/signin-with-chatgpt?')?data.signIn:'';
    throw new EntriesError(data?.error||'Operação não confirmada.',response.status,link);
   }
   if(!data||typeof data!=='object'||verb==='GET'&&!Array.isArray(data.entries)||
    ['POST','PATCH'].includes(verb)&&!data.entry||verb==='DELETE'&&data.deleted!==true)
    throw new EntriesError('O servidor não confirmou os dados salvos.');
   return data;
  }catch(error){
   if(error instanceof EntriesError)throw error;
   throw new EntriesError(controller.signal.aborted?
    'O tempo de resposta esgotou. O rascunho continua disponível.':
    'Não foi possível contactar o servidor. O rascunho continua disponível.');
  }finally{clearTimeout(timer)}
 };
}
