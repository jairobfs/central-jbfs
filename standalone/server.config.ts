import {defineConfig} from 'vite';
export default defineConfig({build:{ssr:true,outDir:'dist-independent-server',emptyOutDir:true,rollupOptions:{input:{server:'standalone/server.ts','import-d1':'standalone/import-d1.ts'},output:{entryFileNames:'[name].mjs'}}}});
