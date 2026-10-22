import {build} from 'esbuild';
await build({entryPoints:['lib/cloud-store.mjs'],outfile:'public/cloud-store.mjs',bundle:true,format:'esm',platform:'browser',target:['es2020'],minify:true,legalComments:'none'});
