import {planMigration,normalized,keyOf} from './unification-migration.mjs';

/**
 * Adaptador para a Collection Craft criada e homologada no espaço ⌕ TUT.
 * O endereço autorizado não é armazenado no código.
 * Chamadas sempre explícitas; nenhuma escrita no import ou no construtor.
 */
export const CENTRAL_COLLECTION_ID='c2d21455-7247-c96f-0800-167ae049c385';

export class CentralSyncError extends Error {
 constructor(message,code='CENTRAL_SYNC_ERROR',cause){super(message,{cause});this.name='CentralSyncError';this.code=code}
}
export class CraftCentralGateway {
 constructor({baseUrl,fetchImpl=fetch,collectionId=CENTRAL_COLLECTION_ID}={}){
  if(typeof baseUrl!=='string'||!baseUrl.trim())throw new CentralSyncError('Conexão Craft obrigatória.','MISSING_CONNECTION');
  const url=new URL(baseUrl);
  if(url.protocol!=='https:'&&!['127.0.0.1','localhost'].includes(url.hostname))throw new CentralSyncError('Conexão HTTPS obrigatória.','INVALID_CONNECTION');
  if(!/^[0-9a-f-]{36}$/i.test(collectionId))throw new CentralSyncError('Collection inválida.','INVALID_COLLECTION');
  this.baseUrl=url.href.replace(/\/$/,'');this.fetchImpl=fetchImpl;this.collectionId=collectionId;
 }
 get path(){return 'collections/'+this.collectionId+'/items'}
 async request(method,body){
  let response,data;
  try{response=await this.fetchImpl(this.baseUrl+'/'+this.path+(method==='GET'?'?maxDepth=0':''),{
   method,headers:{Accept:'application/json',...(body===undefined?{}:{'Content-Type':'application/json'})},
   ...(body===undefined?{}:{body:JSON.stringify(body)}),
   cache:'no-store'
  })}catch(cause){throw new CentralSyncError('Não foi possível contactar o Craft. Alteração não confirmada.','NETWORK',cause)}
  if(!response.ok)throw new CentralSyncError('Craft retornou HTTP '+response.status+'.','HTTP_'+response.status);
  try{data=await response.json()}catch(cause){throw new CentralSyncError('Resposta Craft não é JSON.','INVALID_RESPONSE',cause)}
  if(!data||!Array.isArray(data.items))throw new CentralSyncError('Resposta Craft não confirmou itens.','INVALID_RESPONSE');
  return data.items;
 }
 async read(){return this.request('GET')}
 async plan(sourceRows,{truncated=false}={}){
  return planMigration({sourceRows,craftRows:await this.read(),sourceTruncated:truncated});
 }
 /**
  * Confirma criação/atualização com leitura imediata.
  * NÃO é CAS atômico, pois o endpoint Craft não oferece If-Match de revisão.
  * Evita perda detectável mas outro escritor simultâneo ainda requer lock no backend final.
  */
 async apply(sourceRows,{truncated=false,confirm=false}={}){
  if(confirm!==true)throw new CentralSyncError('Envio não autorizado: execute modo de planejamento antes.','CONFIRM_REQUIRED');
  const initial=await this.plan(sourceRows,{truncated});
  if(initial.conflicts.length)throw new CentralSyncError('Conflitos pendentes: nenhuma escrita iniciada.','CONFLICT');
  const result={created:0,updated:0,unchanged:initial.unchanged.length,total:initial.sourceCount,verified:[]};
  for(const op of initial.operations){
   const before=planMigration({sourceRows:[normalized(JSON.parse(op.item.properties.conteudojson))],craftRows:(await this.read()).filter(row=>(typeof row?.properties?.chave==='string'?row.properties.chave:row?.properties?.chave?.value??row?.properties?.chave?.text?.value)===op.key)});
   if(before.conflicts.length)throw new CentralSyncError('Conflito detectado antes da escrita: '+op.key,'CONFLICT');
   const current=before.operations[0];
   if(!current){result.unchanged++;continue}
   if(current.action!==op.action || (op.action==='update'&&(current.craftId!==op.craftId||current.expectedRevision!==op.expectedRevision))){
    throw new CentralSyncError('A revisão de destino mudou durante a migração: '+op.key,'STALE_PLAN');
   }
   if(op.action==='create'){
    await this.request('POST',{items:[op.item]});
   }else{
    await this.request('PUT',{itemsToUpdate:[{id:op.craftId,registro:op.item.registro,properties:op.item.properties}]});
   }
   const matches=(await this.read()).filter(row=>(typeof row?.properties?.chave==='string'?row.properties.chave:row?.properties?.chave?.value??row?.properties?.chave?.text?.value)===op.key);
   if(matches.length!==1)throw new CentralSyncError('A escrita não foi confirmada por releitura única: '+op.key,'VERIFY_FAILED');
   const audit=planMigration({sourceRows:[JSON.parse(op.item.properties.conteudojson)],craftRows:matches});
   if(audit.unchanged.length!==1||audit.operations.length||audit.conflicts.length)throw new CentralSyncError('A releitura divergiu dos dados enviados: '+op.key,'VERIFY_FAILED');
   result[op.action==='create'?'created':'updated']++;
   result.verified.push(op.key);
  }
  return result;
 }
}
