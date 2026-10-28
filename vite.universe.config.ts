import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
export default defineConfig({
  root:'preview',
  plugins:[react()],
  resolve:{alias:{'@':fileURLToPath(new URL('./',import.meta.url))}},
  base:'/',
  build:{outDir:'../dist-preview',emptyOutDir:true,cssCodeSplit:true},
  server:{host:'127.0.0.1',port:4175,strictPort:true},
  preview:{host:'127.0.0.1',port:4176,strictPort:true}
});
