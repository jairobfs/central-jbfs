import {build} from 'vite';
await build({configFile:'standalone/vite.config.ts'});
await build({configFile:'standalone/server.config.ts'});
