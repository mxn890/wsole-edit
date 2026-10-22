import {spawn} from 'node:child_process';
const args=process.argv.slice(2),out=['node_modules/next/dist/bin/next','dev','--webpack'];
for(let i=0;i<args.length;i++){if(args[i]==='--host')out.push('--hostname',args[++i]);else if(args[i]!=='--strictPort')out.push(args[i]);}
const child=spawn(process.execPath,out,{stdio:'inherit',env:process.env});for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));child.on('exit',code=>process.exit(code||0));
