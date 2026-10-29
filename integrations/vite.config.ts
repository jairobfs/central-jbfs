import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';

/**
 * Emite biblioteca ESM incorporável no projeto Sites original.
 * Não publica domínio, não modifica .openai/hosting.json.
 */
export default defineConfig({
 plugins:[react()],
 resolve:{alias:{'@':fileURLToPath(new URL('../',import.meta.url))}},
 build:{
  outDir:'dist-universe-module',
  emptyOutDir:true,
  cssCodeSplit:true,
  lib:{
   entry:fileURLToPath(new URL('./central-embed.tsx',import.meta.url)),
   name:'UniversoCentral',
   fileName:'central-module',
   formats:['es']
  }
 }
});
