/** Offline migration: JSON input on stdin, DATABASE_URL in the process environment. */
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {entryInput} from '../lib/domain';
import {initialize} from './repository';
const require=createRequire(import.meta.url);
if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL ausente.');
let text='';for await(const chunk of process.stdin){text+=chunk;if(text.length>20000000)throw new Error('Exportação muito grande.')}
const payload=JSON.parse(text);
if(payload.model_projection&&(payload.model_projection.truncated||payload.model_projection.truncated_values||payload.model_projection.next_offset!==null))throw new Error('Exportação incompleta. Não importar.');
const rows=payload.rows;if(!Array.isArray(rows))throw new Error('Formato inválido: rows deve ser uma lista.');
if(new Set(rows.map(r=>r.owner_id)).size>1)throw new Error('Exportação de mais de uma identidade. Revisão necessária.');
const expected=rows.map(r=>{const data=typeof r.data==='string'?JSON.parse(r.data):r.data;const checked=entryInput.parse({id:r.id,kind:r.kind,title:r.title,body:r.body,tag:r.tag,status:r.status,data});if(!Number.isInteger(r.revision)||r.revision<1||!Number.isFinite(Date.parse(r.created_at))||!Number.isFinite(Date.parse(r.updated_at)))throw new Error('Metadados de origem inválidos.');return {...checked,revision:r.revision,created_at:r.created_at,updated_at:r.updated_at}});
const {Pool}=require('pg'),pool=new Pool({connectionString:process.env.DATABASE_URL,max:1});await initialize(pool);const db=await pool.connect();
try{await db.query('BEGIN');for(const r of expected){await db.query('INSERT INTO central_entries (id,kind,title,body,tag,status,data,revision,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING',[r.id,r.kind,r.title,r.body,r.tag,r.status,JSON.stringify(r.data),r.revision,r.created_at,r.updated_at]);const {rows:[saved]}=await db.query('SELECT * FROM central_entries WHERE id=$1',[r.id]);const restored={id:saved.id,kind:saved.kind,title:saved.title,body:saved.body,tag:saved.tag,status:saved.status,data:JSON.parse(saved.data),revision:saved.revision,created_at:saved.created_at,updated_at:saved.updated_at};if(JSON.stringify(restored)!==JSON.stringify(r))throw new Error('Conteúdo divergente no destino; nenhuma alteração será confirmada.')}await db.query('COMMIT');console.log(JSON.stringify({imported:expected.length,sourceFingerprint:createHash('sha256').update(JSON.stringify(expected)).digest('hex'),verified:true}));}catch(error){await db.query('ROLLBACK');throw error}finally{db.release();await pool.end()}
