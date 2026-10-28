/**
 * Universo JBFS · adaptador de persistência de eventos FSRS.
 *
 * Não calcula agendamento; recebe APENAS eventos produzidos por um
 * scheduler FSRS validado. Coleção autoritativa: Craft ⌕ TUT.
 * Nunca insira dados de demonstração na coleção de produção.
 */
import {normalizeUniverseCraftUrl,UNIVERSE_COLLECTIONS,UNIVERSE_SPACE} from './universe-craft.ts';

export type FsrsRating = 1 | 2 | 3 | 4;
export type FsrsState = {state:string;due:string;stability:number;difficulty:number;[field:string]:unknown};
export type FsrsReviewEvent = {
  eventId:string;
  cardId:string;
  reviewedAt:string;
  rating:FsrsRating;
  source:'universo-jbfs';
  scheduler:{name:'FSRS';version:string;parametersId?:string};
  previous:FsrsState|null;
  next:FsrsState;
};
export type AppendResult={
  eventId:string;
  cardId:string;
  status:'persistido-e-verificado'|'ja-existia-e-verificado'|'verificado-apos-erro-de-rede';
  craftItemId:string;
};
export class CraftReviewError extends Error {
  readonly code:string;
  constructor(code:string,message:string){super(message);this.code=code;this.name='CraftReviewError'}
}
type Options={fetchImpl?:typeof fetch;timeoutMs?:number};
const inflight=new Map<string,{fingerprint:string;promise:Promise<AppendResult>}>();
const VALID_ID=/^[A-Za-z0-9_.:-]{1,160}$/;
const own=(x:object,k:string)=>Object.prototype.hasOwnProperty.call(x,k);
const isRecord=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
function normalizeProperty(raw:unknown):unknown {
  if(isRecord(raw)){
    if(own(raw,'value'))return normalizeProperty(raw.value);
    if(own(raw,'text'))return normalizeProperty(raw.text);
  }
  return raw;
}
function field(item:Record<string,unknown>,key:string):string {
  const props=isRecord(item.properties)?item.properties:{};
  const raw=normalizeProperty(own(props,key)?props[key]:item[key]);
  return typeof raw==='string'?raw:'';
}
function canonical(value:unknown):unknown {
  if(Array.isArray(value))return value.map(canonical);
  if(isRecord(value))return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));
  return value;
}
function eventJSON(event:FsrsReviewEvent):string {
  try{
    const json=JSON.stringify(canonical(event));
    if(!json||json.length>30000)throw new Error('payload too large');
    return json;
  }catch{throw new CraftReviewError('INVALID_EVENT','O evento de revisão não pode ser serializado com segurança.')}
}
function isoDate(value:string):boolean {
  if(typeof value!=='string'||!/^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value))return false;
  return Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===new Date(Date.parse(value)).toISOString();
}
function validState(value:unknown):value is FsrsState {
  return isRecord(value)&&typeof value.state==='string'&&value.state.length>0&&value.state.length<=40&&
    typeof value.due==='string'&&isoDate(value.due)&&
    typeof value.stability==='number'&&Number.isFinite(value.stability)&&value.stability>=0&&
    typeof value.difficulty==='number'&&Number.isFinite(value.difficulty)&&value.difficulty>=0;
}
export function validateReviewEvent(value:unknown):asserts value is FsrsReviewEvent {
  if(!isRecord(value)||!VALID_ID.test(String(value.eventId??''))||!VALID_ID.test(String(value.cardId??''))||
    typeof value.reviewedAt!=='string'||!isoDate(value.reviewedAt)||![1,2,3,4].includes(value.rating as number)||
    value.source!=='universo-jbfs'||!isRecord(value.scheduler)||value.scheduler.name!=='FSRS'||
    typeof value.scheduler.version!=='string'||value.scheduler.version.trim().length===0||
    value.scheduler.version.length>50||
    !(value.previous===null||validState(value.previous))||!validState(value.next)){
    throw new CraftReviewError('INVALID_EVENT','Evento FSRS inválido: é necessário o estado calculado pelo scheduler, o identificador estável e a avaliação.');
  }
  if(value.scheduler.parametersId!==undefined&&(typeof value.scheduler.parametersId!=='string'||value.scheduler.parametersId.length>160))
    throw new CraftReviewError('INVALID_EVENT','Identificador dos parâmetros FSRS inválido.');
  // Timestamps de eventos futuros são recusados; horário do cliente pode ter pequena diferença.
  if(Date.parse(value.reviewedAt as string)>Date.now()+5*60*1000)
    throw new CraftReviewError('INVALID_EVENT','Horário futuro de revisão fora da tolerância.');
  if(eventJSON(value as FsrsReviewEvent).length>30000)
    throw new CraftReviewError('INVALID_EVENT','Evento de revisão muito grande.');
}
function rowsOf(data:unknown):Record<string,unknown>[] {
  if(!isRecord(data))throw new CraftReviewError('INCOMPLETE_LEDGER','O Craft não retornou o formato esperado da Collection.');
  const nested=isRecord(data.data)?data.data:{};
  const rows=Array.isArray(data.items)?data.items:Array.isArray(nested.items)?nested.items:null;
  if(!rows||rows.some(x=>!isRecord(x)))throw new CraftReviewError('INCOMPLETE_LEDGER','Leitura incompleta da Collection; nenhuma escrita será realizada.');
  const pagination=isRecord(data.pagination)?data.pagination:isRecord(nested.pagination)?nested.pagination:{};
  if(pagination.nextCursor||pagination.next_cursor||pagination.hasMore===true||pagination.has_more===true)
    throw new CraftReviewError('INCOMPLETE_LEDGER','A Collection retornou uma página incompleta; operação de escrita bloqueada.');
  return rows as Record<string,unknown>[];
}
function idOf(row:Record<string,unknown>):string {
  const id=row.id??row.blockId??row.collectionItemId;
  return typeof id==='string'?id:'';
}
function findEvent(rows:Record<string,unknown>[],eventId:string):{itemId:string;cardId:string;payload:string}|null {
  const seen=new Set<string>();
  let existing:null|{itemId:string;cardId:string;payload:string}=null;
  for(const row of rows){
    const itemId=idOf(row),id=field(row,'eventoid'),cardId=field(row,'cartaoid'),payload=field(row,'eventojson');
    if(!itemId||!id||!cardId||!payload)throw new CraftReviewError('INCOMPLETE_LEDGER','Há um registro FSRS sem identificação ou JSON; escrita bloqueada.');
    if(seen.has(id))throw new CraftReviewError('DUPLICATE_EVENT','A Collection já contém EventoIDs repetidos; reconciliação manual necessária.');
    seen.add(id);
    if(id===eventId)existing={itemId,cardId,payload};
  }
  return existing;
}
async function request(base:string,path:string,method:'GET'|'POST',opts:Options,body?:unknown):Promise<unknown> {
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),opts.timeoutMs??15000);
  try{
    const response=await (opts.fetchImpl??fetch)(base+'/'+path,{method,cache:'no-store',credentials:'omit',
      headers:body?{Accept:'application/json','Content-Type':'application/json'}:{Accept:'application/json'},
      body:body?JSON.stringify(body):undefined,signal:controller.signal});
    if(!response.ok)throw new CraftReviewError('HTTP_'+response.status,'O Craft recusou a requisição (HTTP '+response.status+').');
    return response.json();
  }catch(e){
    if(e instanceof CraftReviewError)throw e;
    if(controller.signal.aborted)throw new CraftReviewError('TIMEOUT','A API Craft não respondeu dentro do prazo; o resultado da escrita pode ser incerto.');
    throw new CraftReviewError('NETWORK','Falha de conexão com Craft; o resultado da escrita pode ser incerto.');
  }finally{clearTimeout(timer)}
}
async function getLedger(base:string,opts:Options):Promise<Record<string,unknown>[]> {
  const raw=await request(base,'collections/'+encodeURIComponent(UNIVERSE_COLLECTIONS.reviews)+'/items?maxDepth=0','GET',opts);
  return rowsOf(raw);
}
function assertMatching(stored:{itemId:string;cardId:string;payload:string},event:FsrsReviewEvent,wanted:string):string {
  if(stored.cardId!==event.cardId)throw new CraftReviewError('EVENT_CONFLICT','EventoID existente pertence a outro cartão.');
  let parsed:unknown;
  try{parsed=JSON.parse(stored.payload)}catch{throw new CraftReviewError('EVENT_CONFLICT','EventoID existente contém JSON inválido.')}
  if(JSON.stringify(canonical(parsed))!==wanted)throw new CraftReviewError('EVENT_CONFLICT','EventoID já existe com conteúdo diferente; revisão não sobrescrita.');
  return stored.itemId;
}
async function doAppend(value:unknown,base:string,opts:Options):Promise<AppendResult> {
  validateReviewEvent(value);
  const event=value as FsrsReviewEvent, wanted=eventJSON(event);
  const identity=await request(base,'connection','GET',opts);
  if(!isRecord(identity)||!isRecord(identity.space)||identity.space.id!==UNIVERSE_SPACE)
    throw new CraftReviewError('WRONG_SPACE','A conexão Craft não pertence ao espaço ⌕ TUT. Nenhuma escrita foi realizada.');
  const collection=await getLedger(base,opts);
  const before=findEvent(collection,event.eventId);
  if(before)return {eventId:event.eventId,cardId:event.cardId,status:'ja-existia-e-verificado',
    craftItemId:assertMatching(before,event,wanted)};
  const payload={items:[{evento:'Revisão FSRS · '+event.cardId+' · '+event.eventId,
    properties:{eventoid:event.eventId,cartaoid:event.cardId,eventojson:wanted,atualizadoem:event.reviewedAt}}]};
  let postError:unknown=null;
  try{
    await request(base,'collections/'+encodeURIComponent(UNIVERSE_COLLECTIONS.reviews)+'/items','POST',opts,payload);
  }catch(e){postError=e}
  // Não repete POST automaticamente, inclusive após erro 500/timeout.
  // A releitura decide se a gravação ocorreu; não assume que HTTP 200 = persistido.
  let after:ReturnType<typeof findEvent>;
  try{after=findEvent(await getLedger(base,opts),event.eventId)}
  catch(e){
    if(e instanceof CraftReviewError&&e.code==='EVENT_CONFLICT')throw e;
    throw new CraftReviewError('UNCERTAIN_WRITE','Não foi possível confirmar no Craft se a revisão foi salva. Não repita automaticamente.');
  }
  if(!after)throw new CraftReviewError('UNCERTAIN_WRITE',
    'Não foi encontrada a revisão após a tentativa de gravação. Não repita automaticamente.');
  const itemId=assertMatching(after,event,wanted);
  return {eventId:event.eventId,cardId:event.cardId,
    status:postError?'verificado-apos-erro-de-rede':'persistido-e-verificado',craftItemId:itemId};
}

/**
 * Grava evento sem alterar a nota original. O mesmo EventoID, no mesmo
 * processo, é serializado; eventos em outros aparelhos não possuem lock global.
 */
export async function appendUniverseCraftReview(connectionUrl:string,event:FsrsReviewEvent,options:Options={}):Promise<AppendResult> {
  const base=normalizeUniverseCraftUrl(connectionUrl);
  validateReviewEvent(event);
  const key=base+'#'+event.eventId;
  const fingerprint=eventJSON(event);
  const pending=inflight.get(key);
  if(pending){
    if(pending.fingerprint!==fingerprint)throw new CraftReviewError('EVENT_CONFLICT','Outro registro com este EventoID está sendo enviado com conteúdo diferente.');
    return pending.promise;
  }
  const promise=doAppend(event,base,options).finally(()=>{inflight.delete(key)});
  inflight.set(key,{fingerprint,promise});
  return promise;
}
