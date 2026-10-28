import assert from 'node:assert/strict';
import {test} from 'node:test';
import {
  appendUniverseCraftReview,CraftReviewError,validateReviewEvent
} from '../lib/universe-fsrs.ts';
import {UNIVERSE_COLLECTIONS,UNIVERSE_SPACE} from '../lib/universe-craft.ts';

const link='https://connect.craft.do/link/TEST-ONLY-123/docs/v1';
const due=new Date(Date.now()+5*86400000).toISOString();
const yesterday=new Date(Date.now()-86400000).toISOString();
const oldDue=new Date(Date.now()-2*86400000).toISOString();
const valid=()=>({
 eventId:'jbfs-evt-test-20261028-001',cardId:'202608012300362',
 reviewedAt:yesterday,rating:3,source:'universo-jbfs',
 scheduler:{name:'FSRS',version:'6.0.0',parametersId:'params-v1'},
 previous:{state:'review',due:oldDue,stability:2.5,difficulty:5},
 next:{state:'review',due,stability:4.2,difficulty:4.6}
});
const reply=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}});
function mock({space=UNIVERSE_SPACE,existing=[],postFailure='none',partial=false,invalidLedger=false,readFailureAfterPost=false}={}){
 const items=[...existing],calls=[],url=encodeURIComponent(UNIVERSE_COLLECTIONS.reviews);
 let posts=0,reads=0;
 const fetchImpl=async(input,init={})=>{
   const path=new URL(String(input)).pathname;
   calls.push({method:init.method,path,body:init.body});
   assert.equal(init.credentials,'omit');
   assert.equal(init.cache,'no-store');
   if(path.endsWith('/connection'))return reply({space:{id:space,name:'⌕ TUT'}});
   if(path.endsWith('/collections/'+url+'/items') && init.method==='GET'){
     reads++;
     if(readFailureAfterPost&&posts>0)return reply({},503);
     if(invalidLedger)return reply({unexpected:[]});
     return reply(partial?{items,pagination:{nextCursor:'abc'}}:{items:structuredClone(items)});
   }
   if(path.endsWith('/collections/'+url+'/items')&&init.method==='POST'){
      posts++;
      const post=JSON.parse(init.body);
      assert.equal(post.items.length,1);
      const row={id:'craft-item-'+(items.length+1),...post.items[0]};
      if(postFailure!=='before')items.push(row);
      if(postFailure!=='none')return reply({error:'synthetic failure'},503);
      return reply({items:[row]});
   }
   return reply({error:'Unknown endpoint'},404);
 };
 return {fetchImpl,calls,items,get posts(){return posts},get reads(){return reads}};
}
const row=(event=valid(),id='original-id')=>({id,
  evento:'Revisão FSRS · synthetic',
  properties:{eventoid:event.eventId,cartaoid:event.cardId,eventojson:JSON.stringify(event),atualizadoem:event.reviewedAt}});

test('validates real FSRS computed state and rejects placeholders',()=>{
 assert.doesNotThrow(()=>validateReviewEvent(valid()));
 for(const mutate of [
   x=>delete x.eventId,
   x=>x.eventId=123,
   x=>x.cardId=123,
   x=>x.source='not-fsrs',
   x=>x.rating=0,
   x=>x.scheduler.version='',
   x=>delete x.next,
   x=>x.next.stability=-10,
   x=>x.reviewedAt='yesterday'
 ]){
   const ev=valid();mutate(ev);
   assert.throws(()=>validateReviewEvent(ev),e=>e?.code==='INVALID_EVENT');
 }
});

test('stores a complete event, verifies GET and never logs URL in response',async()=>{
 const m=mock();
 const result=await appendUniverseCraftReview(link,valid(),{fetchImpl:m.fetchImpl});
 assert.equal(result.status,'persistido-e-verificado');
 assert.equal(result.craftItemId,'craft-item-1');
 assert.equal(m.posts,1);
 assert.equal(m.reads,2);
 assert.equal(m.items.length,1);
 assert.equal(m.items[0].properties.cartaoid,valid().cardId);
 assert.equal(m.items[0].properties.eventoid,valid().eventId);
 assert.ok(!JSON.stringify(result).includes('TEST-ONLY'));
 assert.ok(m.calls.every(c=>c.method==='GET'||c.method==='POST'));
});

test('idempotent retry is read-only when same eventId already exists',async()=>{
 const m=mock({existing:[row()]});
 const result=await appendUniverseCraftReview(link,valid(),{fetchImpl:m.fetchImpl});
 assert.equal(result.status,'ja-existia-e-verificado');
 assert.equal(m.posts,0);
});

test('rejects content conflict for a reused eventId',async()=>{
 const wrong={...valid(),rating:2};
 const m=mock({existing:[row(wrong)]});
 await assert.rejects(appendUniverseCraftReview(link,valid(),{fetchImpl:m.fetchImpl}),e=>e?.code==='EVENT_CONFLICT');
 assert.equal(m.posts,0);
});

test('blocks writing to a connection from another Craft space',async()=>{
 const m=mock({space:'different-space'});
 await assert.rejects(appendUniverseCraftReview(link,valid(),{fetchImpl:m.fetchImpl}),e=>e?.code==='WRONG_SPACE');
 assert.equal(m.posts,0);
 assert.equal(m.reads,0);
});

test('blocks writes if the Collection result is paginated',async()=>{
 const m=mock({partial:true});
 await assert.rejects(appendUniverseCraftReview(link,valid(),{fetchImpl:m.fetchImpl}),e=>e?.code==='INCOMPLETE_LEDGER');
 assert.equal(m.posts,0);
});

test('does not treat an unexpected JSON response as an empty ledger',async()=>{
 const m=mock({invalidLedger:true});
 await assert.rejects(appendUniverseCraftReview(link,valid(),{fetchImpl:m.fetchImpl}),e=>e?.code==='INCOMPLETE_LEDGER');
 assert.equal(m.posts,0);
});

test('duplicate EventoIDs in Craft block all new writes',async()=>{
 const m=mock({existing:[row(valid(),'a'),row(valid(),'b')]});
 await assert.rejects(appendUniverseCraftReview(link,{...valid(),eventId:'new-event'},{fetchImpl:m.fetchImpl}),e=>e?.code==='DUPLICATE_EVENT');
 assert.equal(m.posts,0);
});

test('server 503 after a committed POST is resolved by GET without repeating POST',async()=>{
 const m=mock({postFailure:'after'});
 const result=await appendUniverseCraftReview(link,valid(),{fetchImpl:m.fetchImpl});
 assert.equal(result.status,'verificado-apos-erro-de-rede');
 assert.equal(m.posts,1);
});

test('server 503 before commit leaves an uncertain result but never retries POST',async()=>{
 const m=mock({postFailure:'before'});
 await assert.rejects(appendUniverseCraftReview(link,valid(),{fetchImpl:m.fetchImpl}),e=>e?.code==='UNCERTAIN_WRITE');
 assert.equal(m.posts,1);
 assert.equal(m.items.length,0);
});

test('unable to re-read after POST does not claim success',async()=>{
 const m=mock({readFailureAfterPost:true});
 await assert.rejects(appendUniverseCraftReview(link,valid(),{fetchImpl:m.fetchImpl}),e=>e?.code==='UNCERTAIN_WRITE');
 assert.equal(m.posts,1);
});

test('two concurrent sends of the same event use only one POST',async()=>{
 const m=mock();
 const [a,b]=await Promise.all([
   appendUniverseCraftReview(link,valid(),{fetchImpl:m.fetchImpl}),
   appendUniverseCraftReview(link,valid(),{fetchImpl:m.fetchImpl})
 ]);
 assert.equal(a.craftItemId,b.craftItemId);
 assert.equal(m.posts,1);
});

test('concurrent differing events with the same EventoID are refused',async()=>{
 const m=mock();
 const promise=appendUniverseCraftReview(link,valid(),{fetchImpl:m.fetchImpl});
 await assert.rejects(
   appendUniverseCraftReview(link,{...valid(),rating:1},{fetchImpl:m.fetchImpl}),
   e=>e?.code==='EVENT_CONFLICT'
 );
 await promise;assert.equal(m.posts,1);
});

test('invalid input and invalid Craft URL never make an HTTP request',async()=>{
 let count=0;const fetchImpl=async()=>{count++;throw new Error('must not reach fetch')};
 await assert.rejects(appendUniverseCraftReview('https://evil.example/link/secret/docs/v1',valid(),{fetchImpl}));
 await assert.rejects(appendUniverseCraftReview(link,{...valid(),next:null},{fetchImpl}),e=>e?.code==='INVALID_EVENT');
 assert.equal(count,0);
});
