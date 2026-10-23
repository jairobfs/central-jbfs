import { existsSync, renameSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const root=resolve(import.meta.dirname,'..');
const api=resolve(root,'app/api');
const hidden=resolve(root,'.render-static-preview-api');
if (!existsSync(api)) throw Error('API directory not found; aborting preview build.');
if (existsSync(hidden)) throw Error('Temporary API directory already exists; refusing to overwrite it.');
renameSync(api,hidden);
try {
  // Static export deliberately excludes the server API: zero authentication or data are made public.
  execFileSync(process.execPath,[resolve(root,'node_modules/next/dist/bin/next'),'build'],{
    cwd:root,stdio:'inherit',
    env:{...process.env,RENDER_STATIC_PREVIEW:'1',NEXT_PUBLIC_RENDER_CANARY:'1'}
  });
  if(!existsSync(resolve(root,'out/index.html')))throw Error('Next.js did not produce out/index.html');
  console.log('RENDER READONLY CANARY: static export ready, no APIs or personal records included.');
} finally {
  renameSync(hidden,api);
}
