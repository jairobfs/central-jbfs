#!/usr/bin/env node
/** Uso local, somente leitura. Nenhum pedido de rede ou escrita no Craft. */
import {readFile,writeFile} from "node:fs/promises";
import {planMigration} from "../lib/unification-migration.mjs";
const [sourceFile,existingCraftFile,outputFile]=process.argv.slice(2);
if(!sourceFile){console.error("Uso: node scripts/plan-central-to-craft.mjs export-central.json [craft-items.json] [plano-privado.json]");process.exitCode=2}
else try{
 const parsed=JSON.parse(await readFile(sourceFile,"utf8"));
 const sourceRows=Array.isArray(parsed)?parsed:parsed.entries;
 const sourceTruncated=parsed?.truncated===true;
 const craft=existingCraftFile?JSON.parse(await readFile(existingCraftFile,"utf8")):[];
 const craftRows=Array.isArray(craft)?craft:craft.items;
 const plan=planMigration({sourceRows,craftRows,sourceTruncated});
 if(outputFile){await writeFile(outputFile,JSON.stringify(plan,null,2)+"\n",{flag:"wx",mode:0o600});}
 console.log(JSON.stringify({mode:plan.mode,source:plan.sourceCount,craft:plan.craftCount,creates:plan.operations.filter(x=>x.action==="create").length,updates:plan.operations.filter(x=>x.action==="update").length,unchanged:plan.unchanged.length,conflicts:plan.conflicts.length,deletions:plan.deleted,planSaved:!!outputFile},null,2));
 if(plan.conflicts.length)process.exitCode=3;
}catch(error){console.error("Migração bloqueada:",error instanceof Error?error.message:"erro");process.exitCode=1}
