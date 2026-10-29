import {normalized,keyOf,payloadOf,remoteOf} from './unification-migration.mjs';
import {CentralSyncError} from './craft-central-gateway.mjs';

function matchesKey(rows,key){
 const matched=rows.filter(row=>{
  const value=row?.properties?.chave;
  return (typeof value==='string'?value:value?.value??value?.text?.value)===key;
 });
 if(matched.length>1)throw new CentralSyncError('Duas notas Craft possuem a mesma chave; nenhuma alteração realizada.','DUPLICATE_KEY');
 return matched;
}
function compare(x,y){return JSON.stringify(x)===JSON.stringify(y)}
/**
 * Repositório Craft para CRUD de registros da Central, independente do D1.
 * Alterações exigem revisão atual e releitura, e nunca escondem conflitos.
 */
export class CentralCraftRepository {
 constructor({gateway,clock=()=>new Date().toISOString()}={}){if(!gateway?.read||!gateway?.request)throw Error('Gateway Craft obrigatório');this.gateway=gateway;this.clock=clock}
 async list(){
  const rows=await this.gateway.read(),map=new Map();
  for(const row of rows){
   const item=remoteOf(row);
   if(map.has(item.key))throw new CentralSyncError('Chaves duplicadas no Craft.','DUPLICATE_KEY');
   map.set(item.key,item.content);
  }
  return [...map.values()].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
 }
 async get(id){
  const rows=matchesKey(await this.gateway.read(),keyOf(id));
  return rows.length?remoteOf(rows[0]).content:null;
 }
 /** Cria uma entrada com revisão inicial 1, mantendo ID fornecido pelo editor. */
 async create(draft){
  const now=this.clock(),entry=normalized({...draft,revision:1,createdAt:now,updatedAt:now});
  const key=keyOf(entry.id),prior=matchesKey(await this.gateway.read(),key);
  if(prior.length){
   const old=remoteOf(prior[0]).content;
   if(compare(old,entry))return old;
   throw new CentralSyncError('Esse ID já existe no Craft com outro conteúdo.','CONFLICT');
  }
  await this.gateway.request('POST',{items:[payloadOf(entry)]});
  return this.verify(entry);
 }
 async update(draft){
  if(!Number.isSafeInteger(draft?.revision)||draft.revision<1)throw new CentralSyncError('Revisão local inválida.','INVALID_REVISION');
  const key=keyOf(draft.id),prior=matchesKey(await this.gateway.read(),key);
  if(!prior.length)throw new CentralSyncError('Registro Craft não encontrado.','NOT_FOUND');
  const old=remoteOf(prior[0]);
  if(old.revision!==draft.revision)throw new CentralSyncError('O registro mudou; releia antes de editar.','CONFLICT');
  const updated=normalized({...draft,revision:old.revision+1,createdAt:old.content.createdAt,updatedAt:this.clock()});
  await this.gateway.request('PUT',{itemsToUpdate:[{id:old.craftId,...payloadOf(updated)}]});
  return this.verify(updated);
 }
 async verify(expected){
  const key=keyOf(expected.id),matches=matchesKey(await this.gateway.read(),key);
  if(matches.length!==1)throw new CentralSyncError('Gravação não confirmada pela releitura.','VERIFY_FAILED');
  const latest=remoteOf(matches[0]).content;
  if(!compare(latest,expected))throw new CentralSyncError('Dados relidos diferem do conteúdo enviado.','VERIFY_FAILED');
  return latest;
 }
}
