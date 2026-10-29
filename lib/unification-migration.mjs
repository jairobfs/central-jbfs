/** Planejador não destrutivo de migração Central D1 → Craft. Sem rede nem escrita. */
export const KINDS=["note","task","prompt","resource","question","session"];
export const TARGET_SCHEMA={id:"c2d21455-7247-c96f-0800-167ae049c385",title:"Registros · Central JBFS",titleKey:"registro",textColumns:["chave","tipo","conteudojson","revisao","atualizado","origem"]};
export function stable(x){if(Array.isArray(x))return x.map(stable);if(x&&typeof x==="object"){if(Object.getPrototypeOf(x)!==Object.prototype)throw Error("Objeto inválido");return Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,stable(v)]))}if(x===null||["string","number","boolean"].includes(typeof x))return x;throw Error("Valor inválido")}

export function unpack(x){if(x&&typeof x==="object"){if("value"in x)return unpack(x.value);if("text"in x)return unpack(x.text)}return x}

export function normalized(row){
 if(!row||typeof row!=="object"||Array.isArray(row))throw Error("Linha D1 inválida");
 const id=String(row.id||"");
 if(!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id))throw Error("UUID inválido");
 if(!KINDS.includes(row.kind))throw Error("Tipo D1 desconhecido: "+row.kind);
 if(typeof row.title!=="string"||!row.title.trim())throw Error("Título ausente");
 if(!Number.isSafeInteger(row.revision)||row.revision<1)throw Error("Revisão inválida");
 let data=row.data??{};if(typeof data==="string"){try{data=JSON.parse(data)}catch{throw Error("Campos JSON inválidos")}}
 if(!data||typeof data!=="object"||Array.isArray(data))throw Error("Dados inválidos");
 const createdAt=row.createdAt??row.created_at,updatedAt=row.updatedAt??row.updated_at;
 if(![createdAt,updatedAt].every(x=>typeof x==="string"&&Number.isFinite(Date.parse(x))))throw Error("Datas inválidas");
 const body=row.body??"",tag=row.tag??"Pessoal",status=row.status??"open";
 if(typeof body!=="string"||typeof tag!=="string"||!["open","doing","done"].includes(status))throw Error("Campos inválidos");
 return stable({id,kind:row.kind,title:row.title,body,tag,status,data,revision:row.revision,createdAt,updatedAt});
}

export function keyOf(id){return "central-jbfs:d1:entries:"+id.toLowerCase()}

export function payloadOf(x){return {registro:x.title,properties:{chave:keyOf(x.id),tipo:x.kind,conteudojson:JSON.stringify(stable(x)),revisao:String(x.revision),atualizado:x.updatedAt,origem:"Central JBFS · D1"}}}

export function remoteOf(row){
 const p=row?.properties??{},get=k=>unpack(p[k]??row[k]);
 const key=get("chave"),craftId=row?.id??row?.blockId,revision=Number(get("revisao"));
 if(typeof key!=="string"||!key.startsWith("central-jbfs:d1:entries:")||!craftId||!Number.isSafeInteger(revision)||revision<1)throw Error("Item Craft inválido");
 let content;try{content=normalized(JSON.parse(get("conteudojson")))}catch{throw Error("Conteúdo Craft inválido: "+key)}
 if(keyOf(content.id)!==key||content.revision!==revision)throw Error("Chave/revisão divergentes: "+key);
 return {key,craftId,revision,content};
}

export function planMigration({sourceRows,craftRows=[],sourceTruncated=false}={}){
 if(sourceTruncated)throw Error("Exportação truncada: migração bloqueada.");
 if(!Array.isArray(sourceRows)||!Array.isArray(craftRows))throw Error("Listas inválidas");
 const src=new Map(),dst=new Map();
 for(const row of sourceRows){const x=normalized(row),key=keyOf(x.id);if(src.has(key))throw Error("Duplicata D1: "+key);src.set(key,x)}
 for(const row of craftRows){const x=remoteOf(row);if(dst.has(x.key))throw Error("Duplicata Craft: "+x.key);dst.set(x.key,x)}
 const operations=[],conflicts=[],unchanged=[];
 for(const [key,x] of [...src].sort(([a],[b])=>a.localeCompare(b))){
  const y=dst.get(key);
  if(!y){operations.push({action:"create",key,expectedRevision:null,item:payloadOf(x)});continue}
  if(y.revision>x.revision){conflicts.push({key,reason:"Craft mais recente"});continue}
  if(y.revision===x.revision){
   if(JSON.stringify(stable(x))===JSON.stringify(stable(y.content)))unchanged.push(key);
   else conflicts.push({key,reason:"Revisão igual; conteúdo divergente"});
   continue;
  }
  operations.push({action:"update",key,craftId:y.craftId,expectedRevision:y.revision,item:payloadOf(x)});
 }
 for(const key of dst.keys())if(!src.has(key))conflicts.push({key,reason:"Só no Craft; preservar"});
 return {mode:"dry-run",schemaVersion:1,sourceCount:src.size,craftCount:dst.size,operations,conflicts,unchanged,deleted:0};
}
