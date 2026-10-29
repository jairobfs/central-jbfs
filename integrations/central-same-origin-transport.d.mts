import type {EntriesTransport} from '../lib/entries-client';
export function createCentralSameOriginTransport(options?:{
 path?:string;
 fetchImpl?:typeof fetch;
 timeoutMs?:number;
}):EntriesTransport;
