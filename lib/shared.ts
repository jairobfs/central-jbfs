export function safeUrl(value:unknown):string|null{
 if(typeof value!=='string')return null;
 try{const u=new URL(value);if(['https:','http:'].includes(u.protocol)&&!u.username&&!u.password)return u.href;
 if(u.protocol==='craftdocs:'&&u.hostname==='open'&&u.searchParams.get('spaceId')&&u.searchParams.get('blockId'))return value;
 }catch{}return null;
}
export function nextReview(result:'again'|'good'|'easy',now=Date.now()){
 return new Date(now+({'again':1,'good':3,'easy':7}[result])*86400000).toISOString();
}
export function newId():string{
 if(typeof crypto.randomUUID==='function')return crypto.randomUUID();
 const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
 const hex=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
 return hex.slice(0,8)+'-'+hex.slice(8,12)+'-'+hex.slice(12,16)+'-'+hex.slice(16,20)+'-'+hex.slice(20);
}
