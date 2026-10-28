/* Universo JBFS · primeira leitura unificada do acervo Craft.
 * Sem escrita, sem armazenamento da URL de conexão e sem dados demonstrativos.
 * O link de conexão é fornecido pelo usuário em tempo de execução.
 */
export const UNIVERSE_SPACE = '8b335448-6499-3d04-91c1-5f99c399aca8';
export const UNIVERSE_COLLECTIONS = Object.freeze({
  models: '42653903-2709-a0bf-112e-2552ec065395',
  decks: 'b879a34e-35fb-a165-9027-5db1a9866ce5',
  notes: 'b4997e83-7cfb-33e2-b080-6b628bf4d9ef',
  reviews: '48a2b9f4-6de2-88b3-9b87-22e554293ed5'
});
export const UNIVERSE_BASELINE = Object.freeze({models:9,decks:29,notes:216,cards:362});
export type UniverseSection = keyof typeof UNIVERSE_COLLECTIONS;
export type UniverseCounts = Record<UniverseSection,number|null> & {cards:number|null};
export type UniverseNote = {craftId:string;title:string;modelId:string;cardCount:number};
export type UniverseSnapshot = {
  spaceName:string;
  checkedAt:string;
  counts:UniverseCounts;
  notes:UniverseNote[];
  issues:string[];
  sources:Record<UniverseSection,'ok'|'erro'|'não consultada'>;
  integrity:'verificada'|'incompleta'|'outro espaço';
};

export class UniverseCraftError extends Error {
  readonly code:string;
  constructor(message:string,code:string){super(message);this.name='UniverseCraftError';this.code=code;}
}

/** Aceita ambas as variantes da API Connections: /link/ e /links/. */
export function normalizeUniverseCraftUrl(value:string):string {
  if(typeof value!=='string'||value.trim().length>500)throw new UniverseCraftError('Informe um endereço de conexão válido.','INVALID_URL');
  let url:URL;
  try {url=new URL(value.trim())}catch{throw new UniverseCraftError('Endereço de conexão inválido.','INVALID_URL')}
  if(url.protocol!=='https:'||url.hostname!=='connect.craft.do'||url.username||url.password||url.search||url.hash ||
     !/^\/links?\/[A-Za-z0-9_-]+\/(?:docs|api)\/v1\/?$/.test(url.pathname))
    throw new UniverseCraftError('Use o endereço oficial da conexão Craft (docs/v1 ou api/v1).','INVALID_URL');
  return url.origin+url.pathname.replace(/\/docs\/v1\/?$/,'/api/v1').replace(/\/$/,'');
}

const idOf=(value:unknown):string => {
  if(value===null||value===undefined)return '';
  return String(value);
};
const unwrap=(x:unknown):unknown=>{
  if(!x||typeof x!=='object'||Array.isArray(x))return x;
  const row=x as Record<string,unknown>;
  if('value'in row)return unwrap(row.value);
  if('text'in row)return unwrap(row.text);
  return x;
};
const property=(item:Record<string,unknown>,key:string):unknown=>{
  const props=item.properties as Record<string,unknown>|undefined;
  if(props && Object.prototype.hasOwnProperty.call(props,key))return unwrap(props[key]);
  return unwrap(item[key]);
};
function readItems(response:unknown):Record<string,unknown>[]{
  if(!response||typeof response!=='object')throw new UniverseCraftError('Resposta inesperada de Collection.','INVALID_RESPONSE');
  const obj=response as Record<string,unknown>;
  const nested=obj.data as Record<string,unknown>|undefined;
  const items=Array.isArray(obj.items)?obj.items:Array.isArray(nested?.items)?nested.items:null;
  if(!items)throw new UniverseCraftError('Collection sem lista de itens; não foi tratada como vazia.','INVALID_RESPONSE');
  const page=(obj.pagination??nested?.pagination) as Record<string,unknown>|undefined;
  if(page?.nextCursor||page?.next_cursor)throw new UniverseCraftError('Collection paginada: leitura parcial bloqueada.','PARTIAL_PAGE');
  if(items.some(x=>!x||typeof x!=='object'||Array.isArray(x)))throw new UniverseCraftError('Collection contém itens inválidos.','INVALID_RESPONSE');
  return items as Record<string,unknown>[];
}
function collectionNote(item:Record<string,unknown>):{note:UniverseNote;cardIds:string[]} {
  const craftId=idOf(item.id??item.blockId??item.collectionItemId);
  if(!craftId)throw new UniverseCraftError('Nota sem identificador do Craft.','INVALID_NOTE');
  const raw=property(item,'camposjson')??property(item,'CamposJSON');
  if(typeof raw!=='string')throw new UniverseCraftError('Nota com CamposJSON ausente ou não textual.','INVALID_NOTE');
  let decoded:Record<string,unknown>;
  try{decoded=JSON.parse(raw)}catch{throw new UniverseCraftError('Nota contém CamposJSON inválido.','INVALID_NOTE')}
  if(!decoded||typeof decoded!=='object'||Array.isArray(decoded)||!decoded.fields||typeof decoded.fields!=='object')
    throw new UniverseCraftError('Nota sem campos estruturados.','INVALID_NOTE');
  if(!Array.isArray(decoded.cards))throw new UniverseCraftError('Nota sem a lista de cartões.','INVALID_NOTE');
  const ids=decoded.cards.map(c=>idOf((c as Record<string,unknown>)?.id));
  if(ids.some(id=>!id))throw new UniverseCraftError('Cartão Anki sem identificador.','INVALID_CARD');
  return {note:{
    craftId,
    title:idOf(property(item,'nota')??item.title??'Nota sem título'),
    modelId:idOf(decoded.model),
    cardCount:ids.length
  },cardIds:ids};
}

async function readJSON(base:string,path:string,fetchImpl:typeof fetch,timeoutMs:number):Promise<unknown>{
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try {
    const response=await fetchImpl(base+'/'+path,{method:'GET',headers:{Accept:'application/json'},cache:'no-store',credentials:'omit',signal:controller.signal});
    if(!response.ok)throw new UniverseCraftError('Craft respondeu HTTP '+response.status+'.','HTTP_'+response.status);
    const data:unknown=await response.json();
    return data;
  } catch(error){
    if(error instanceof UniverseCraftError)throw error;
    if(controller.signal.aborted)throw new UniverseCraftError('A API não respondeu dentro do prazo.','TIMEOUT');
    throw new UniverseCraftError('A leitura falhou. Verifique conexão, permissões e CORS.','NETWORK');
  } finally {clearTimeout(timer)}
}

/** Operação estritamente read-only: apenas /connection e GET de Collections. */
export async function readUniverseCraft(
  value:string,{fetchImpl=fetch,timeoutMs=15000}:{fetchImpl?:typeof fetch;timeoutMs?:number}={}
):Promise<UniverseSnapshot>{
  const base=normalizeUniverseCraftUrl(value);
  const identity=await readJSON(base,'connection',fetchImpl,timeoutMs) as {space?:{id?:string;name?:string}};
  if(!identity?.space?.id)throw new UniverseCraftError('O Craft não identificou o espaço desta conexão.','NO_SPACE');
  const sourceKeys=Object.keys(UNIVERSE_COLLECTIONS) as UniverseSection[];
  const counts:UniverseCounts={models:null,decks:null,notes:null,reviews:null,cards:null};
  const sources=Object.fromEntries(sourceKeys.map(key=>[key,'não consultada'])) as UniverseSnapshot['sources'];
  const snapshot:UniverseSnapshot={spaceName:String(identity.space.name||'Craft'),checkedAt:new Date().toISOString(),
    counts,sources,notes:[],issues:[],integrity:'incompleta'};
  if(identity.space.id!==UNIVERSE_SPACE){
    snapshot.integrity='outro espaço';
    snapshot.issues.push('A conexão pertence a outro espaço Craft. Nenhuma Collection do acervo TUT foi consultada.');
    return snapshot;
  }
  const answers=await Promise.allSettled(sourceKeys.map(key=>
    readJSON(base,'collections/'+encodeURIComponent(UNIVERSE_COLLECTIONS[key])+'/items?maxDepth=0',fetchImpl,timeoutMs).then(readItems)));
  for(let i=0;i<sourceKeys.length;i++){
    const key=sourceKeys[i],answer=answers[i];
    if(answer.status==='rejected'){
      sources[key]='erro';
      snapshot.issues.push('A Collection '+key+' não pôde ser lida: '+(answer.reason instanceof UniverseCraftError?answer.reason.message:'falha desconhecida'));
      continue;
    }
    const rows=answer.value;
    const uniqueIds=new Set<string>();
    let invalidId=false;
    for(const row of rows){
      const id=idOf(row.id??row.blockId??row.collectionItemId);
      if(!id||uniqueIds.has(id))invalidId=true;
      uniqueIds.add(id);
    }
    if(invalidId){sources[key]='erro';snapshot.issues.push('A Collection '+key+' contém IDs ausentes ou duplicados.');continue}
    counts[key]=rows.length;
    sources[key]='ok';
    if(key==='notes'){
      const seenCards=new Set<string>();
      let cardCount=0,invalidNotes=0,duplicateCards=0;
      for(const row of rows){
        try{
          const {note,cardIds}=collectionNote(row);
          snapshot.notes.push(note);
          cardCount+=cardIds.length;
          for(const id of cardIds){if(seenCards.has(id))duplicateCards++;seenCards.add(id)}
        }catch{invalidNotes++}
      }
      if(invalidNotes||duplicateCards){
        sources.notes='erro';
        snapshot.issues.push(invalidNotes+' notas com estrutura inválida; '+duplicateCards+' cartões com ID duplicado.');
      }else counts.cards=cardCount;
    }
  }
  for(const key of ['models','decks','notes'] as const){
    if(counts[key]!==null&&(counts[key] as number)<UNIVERSE_BASELINE[key])
      snapshot.issues.push('A Collection '+key+' tem menos itens do que o inventário de referência.');
  }
  if(counts.cards!==null&&counts.cards<UNIVERSE_BASELINE.cards)
    snapshot.issues.push('O número de cartões é inferior à referência anterior.');
  const mandatory=(['models','decks','notes'] as const).every(key=>sources[key]==='ok');
  snapshot.integrity=mandatory&&counts.cards!==null&&!snapshot.issues.length?'verificada':'incompleta';
  return snapshot;
}
