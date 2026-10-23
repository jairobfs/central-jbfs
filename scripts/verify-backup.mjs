import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const kinds = new Set(['note','task','prompt','resource','question','session']);
const statuses = new Set(['open','doing','done']);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isObject = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const validTime = x => typeof x === 'string' && !Number.isNaN(Date.parse(x));

export function verifyBackup(doc) {
  if (!isObject(doc) || doc.format !== 'central-jbfs-backup' || doc.schemaVersion !== 1) throw Error('Formato de backup não reconhecido.');
  if (!validTime(doc.exportedAt) || doc.source !== 'sites-d1') throw Error('Origem ou data de exportação inválida.');
  if (typeof doc.ownerId !== 'string' || doc.ownerId.length < 1 || !Array.isArray(doc.entries)) throw Error('Estrutura do proprietário ou lista inválida.');
  if (!Number.isSafeInteger(doc.recordCount) || doc.recordCount < 0 || doc.recordCount !== doc.entries.length) throw Error('Contagem declarada diverge dos registros.');
  const seen = new Set();
  for (const [i, e] of doc.entries.entries()) {
    if (!isObject(e) || !uuid.test(e.id) || seen.has(e.id)) throw Error('Identificador ausente, inválido ou duplicado no item '+i+'.');
    seen.add(e.id);
    if (e.ownerId !== doc.ownerId) throw Error('Proprietário divergente no item '+i+'.');
    if (!kinds.has(e.kind) || !statuses.has(e.status) || typeof e.title !== 'string' || typeof e.body !== 'string' || typeof e.tag !== 'string' || !isObject(e.data)) throw Error('Campos de registro inválidos no item '+i+'.');
    if (!Number.isSafeInteger(e.revision) || e.revision < 1 || !validTime(e.createdAt) || !validTime(e.updatedAt)) throw Error('Revisão ou carimbos temporais inválidos no item '+i+'.');
  }
  // The digest only checks exact JSON data received; it is not an auth signature.
  const ordered = [...doc.entries].sort((a,b)=>a.id.localeCompare(b.id));
  const sha256 = createHash('sha256').update(JSON.stringify(ordered)).digest('hex');
  return { valid: true, count: doc.recordCount, schemaVersion: 1, sha256 };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const path = process.argv[2];
  if (!path) {
    console.error('Uso: node scripts/verify-backup.mjs <caminho-privado-do-backup.json>');
    process.exitCode = 2;
  } else {
    try {
      const summary = verifyBackup(JSON.parse(readFileSync(path,'utf8')));
      console.log(JSON.stringify(summary,null,2));
    } catch(error) {
      console.error('Backup inválido:', error.message);
      process.exitCode = 1;
    }
  }
}
