import {normalized,keyOf,payloadOf,remoteOf,stable} from './unification-migration.mjs';
import {CentralSyncError} from './craft-central-gateway.mjs';

function matchesKey(rows,key){
 const matched=rows.filter(row=>{
  const value=row?.properties?.chave;
  return (typeof value==='string'?value:value?.value??value?.text?.value)===key;
 });
 if(matched.length>1)throw new CentralSyncError('Duas notas Craft possuem a mesma chave; nenhuma alteração realizada.','DUPLICATE_KEY');
 return matched;
}
function compare(x,y){return JSON.stringify(stable(x))===JSON.stringify(stable(y))}
function sameContent(a,b){
 const pick=x=>({id:x.id,kind:x.kind,title:x.title,body:x.body,tag:x.tag,status:x.status,data:x.data});
 return compare(pick(a),pick(b));
}
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
  return [...map.values()].filter(row=>!row.deletedAt).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
 }
 async get(id){
  const rows=matchesKey(await this.gateway.read(),keyOf(id));
  if(!rows.length)return null;
  const entry=remoteOf(rows[0]).content;
  return entry.deletedAt?null:entry;
 }
 /** Cria uma entrada com revisão inicial 1, mantendo ID fornecido pelo editor. */
 async create(draft){
  const now=this.clock(),entry=normalized({...draft,revision:1,createdAt:now,updatedAt:now});
  const key=keyOf(entry.id),prior=matchesKey(await this.gateway.read(),key);
  if(prior.length){
   const old=remoteOf(prior[0]).content;
   if(old.deletedAt)throw new CentralSyncError('Registro arquivado; restaure-o antes de reutilizar o identificador.','ARCHIVED');
   if(sameContent(old,entry))return old;
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
  if(old.content.deletedAt)throw new CentralSyncError('Registro arquivado; não pode ser alterado sem restauração.','ARCHIVED');
  if(old.revision!==draft.revision){
   if(old.revision===draft.revision+1&&sameContent(old.content,draft))return old.content;
   throw new CentralSyncError('O registro mudou; releia antes de editar.','CONFLICT');
  }
  const updated=normalized({...draft,revision:old.revision+1,createdAt:old.content.createdAt,updatedAt:this.clock()});
  await this.gateway.request('PUT',{itemsToUpdate:[{id:old.craftId,...payloadOf(updated)}]});
  return this.verify(updated);
 }
 /** Arquivamento reversível no Craft; não remove o item nem seus dados. */
 async archive({id,revision}={}){
  if(!Number.isSafeInteger(revision)||revision<1)throw new CentralSyncError('Revisão local inválida.','INVALID_REVISION');
  const key=keyOf(id),prior=matchesKey(await this.gateway.read(),key);
  if(!prior.length)throw new CentralSyncError('Registro não encontrado.','NOT_FOUND');
  const old=remoteOf(prior[0]);
  if(old.content.deletedAt){
   if(old.revision===revision+1)return true;
   throw new CentralSyncError('O registro já foi arquivado em outra revisão.','CONFLICT');
  }
  if(old.revision!==revision)throw new CentralSyncError('O registro mudou antes de arquivar.','CONFLICT');
  const at=this.clock(),updated=normalized({...old.content,deletedAt:at,revision:revision+1,updatedAt:at});
  await this.gateway.request('PUT',{itemsToUpdate:[{id:old.craftId,...payloadOf(updated)}]});
  const checked=await this.verify(updated);
  if(!checked.deletedAt)throw new CentralSyncError('Arquivamento não confirmado.','VERIFY_FAILED');
  return true;
 }
 async restore({id,revision}={}){
  if(!Number.isSafeInteger(revision)||revision<1)throw new CentralSyncError('Revisão inválida.','INVALID_REVISION');
  const key=keyOf(id),prior=matchesKey(await this.gateway.read(),key);
  if(!prior.length)throw new CentralSyncError('Registro arquivado não encontrado.','NOT_FOUND');
  const old=remoteOf(prior[0]);
  if(!old.content.deletedAt)throw new CentralSyncError('Este registro não está arquivado.','NOT_ARCHIVED');
  if(old.revision!==revision)throw new CentralSyncError('O registro foi alterado.','CONFLICT');
  const restored=Object.fromEntries(Object.entries(old.content).filter(([k])=>k!=='deletedAt'));
  const updated=normalized({...restored,revision:revision+1,updatedAt:this.clock()});
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
