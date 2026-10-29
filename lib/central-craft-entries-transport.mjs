import {CentralCraftRepository} from './central-craft-repository.mjs';

/**
 * Ponte para conservar os módulos React originais da Central.
 * Implementa o contrato de requestEntries(method,payload) sem D1.
 * A chave do Craft fica apenas no gateway injetado — nunca neste módulo.
 */
export function createCraftEntriesTransport({gateway,cutoverVerified=false}={}){
 if(!cutoverVerified)throw Error('Corte D1 → Craft ainda não homologado. A Central original deve permanecer ativa.');
 const repo=new CentralCraftRepository({gateway});
 return async function craftEntries(method='GET',payload){
  if(method==='GET')return {entries:await repo.list(),truncated:false,savedOnline:true};
  if(!payload||typeof payload!=='object'||Array.isArray(payload))throw Error('Registro inválido.');
  switch(method){
   case 'POST':return {entry:await repo.create(payload)};
   case 'PATCH':return {entry:await repo.update(payload)};
   case 'DELETE':return {deleted:await repo.archive(payload)};
   case 'RESTORE':return {entry:await repo.restore(payload)};
   default:throw Error('Método de dados não suportado: '+method);
  }
 };
}
