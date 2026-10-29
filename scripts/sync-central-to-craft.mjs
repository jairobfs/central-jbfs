#!/usr/bin/env node
/**
 * Migração controlada, executada pelo operador do Universo, sem credenciais em arquivo.
 * Padrão: SOMENTE PLANEJAMENTO. --apply exige snapshot completo e não conflitante.
 * Saída de console contém apenas contagens e códigos, nunca o conteúdo do usuário.
 */
import {readFile} from 'node:fs/promises';
import {CraftCentralGateway} from '../lib/craft-central-gateway.mjs';

const args=process.argv.slice(2);
const apply=args.includes('--apply');
const filename=args.find(x=>!x.startsWith('--'));
if(!filename){
 console.error('Uso: CRAFT_CONNECTION_URL=<URL_PRIVADA> node scripts/sync-central-to-craft.mjs exportacao-privada.json [--apply]');
 process.exitCode=2;
}else{
 try{
  const raw=JSON.parse(await readFile(filename,'utf8'));
  if(raw.format!=='central-jbfs-d1-export-v1'||raw.source!=='central-jbfs:d1:entries'||!Array.isArray(raw.entries)||raw.truncated!==false||raw.count!==raw.entries.length)
   throw new Error('O arquivo não é uma exportação completa e validada da Central.');
  const gateway=new CraftCentralGateway({baseUrl:process.env.CRAFT_CONNECTION_URL});
  const plan=await gateway.plan(raw.entries,{truncated:raw.truncated});
  const overview={status:'planejamento',source:plan.sourceCount,craft:plan.craftCount,
   create:plan.operations.filter(x=>x.action==='create').length,
   update:plan.operations.filter(x=>x.action==='update').length,
   unchanged:plan.unchanged.length,conflicts:plan.conflicts.length,deleted:plan.deleted};
  console.log(JSON.stringify(overview));
  if(plan.conflicts.length)throw new Error('Existem conflitos: migração bloqueada. Revise no Craft antes de repetir.');
  if(apply){
   const confirmed=await gateway.apply(raw.entries,{confirm:true,truncated:false});
   console.log(JSON.stringify({status:'gravacao-verificada',...confirmed,verified:confirmed.verified.length}));
  }else{
   console.log('Nenhuma escrita realizada. --apply requer autorização explícita para a execução.');
  }
 }catch(error){
  console.error('Migração interrompida:',error instanceof Error?error.message:'erro desconhecido');
  process.exitCode=1;
 }
}
