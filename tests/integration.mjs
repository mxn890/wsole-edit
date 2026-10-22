import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {rm} from 'node:fs/promises';
import assert from 'node:assert/strict';
const password=randomBytes(24).toString('hex'),dir='.data/test-'+randomBytes(6).toString('hex'),base='http://127.0.0.1:4321';
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p','4321','-H','127.0.0.1'],{env:{...process.env,NODE_ENV:'production',JOGGLERS_LOCAL_DB:'1',JOGGLERS_DATA_DIR:dir,DATABASE_URL:'',ADMIN_PASSWORD:password,SESSION_SECRET:randomBytes(32).toString('hex')},stdio:['ignore','pipe','pipe']});
let cookie='';
async function request(path,method='GET',body,auth=true){const r=await fetch(base+'/api/'+path,{method,headers:{...(body instanceof FormData?{}:{'Content-Type':'application/json'}),Origin:base,...(auth&&cookie?{Cookie:cookie}:{})},body:body?(body instanceof FormData?body:JSON.stringify(body)):undefined});return {r,data:await r.json()};}
try{
 await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Server startup timed out')),30000);const onData=d=>{process.stdout.write(d);if(d.toString().includes('Ready')){clearTimeout(timeout);resolve()}};child.stdout.on('data',onData);child.stderr.on('data',onData);child.on('exit',()=>reject(Error('Server exited')))});
 assert.ok((await (await fetch(base)).text()).includes('Jogglers'));assert.equal((await fetch(base+'/admin')).status,200);
 let x=await request('admin/catalog');assert.equal(x.r.status,401);
 x=await request('admin/login','POST',{password});assert.equal(x.r.status,200);cookie=x.r.headers.get('set-cookie').split(';')[0];
 x=await request('admin/catalog');assert.equal(x.r.status,200);const initial=x.data;
 const fd=new FormData();fd.set('file',new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1WQAAAAASUVORK5CYII=','base64')],{type:'image/png'}),'test.png');x=await request('admin/upload','POST',fd);assert.equal(x.r.status,201);const image=x.data.url;assert.equal((await fetch(base+image)).status,200);
 x=await request('admin/categories','POST',{name:'Test collection',image,version:initial.version});assert.equal(x.r.status,200);
 let catalog=(await request('admin/catalog')).data;
 x=await request('admin/products','POST',{version:catalog.version,product:{name:'Integration pair',brand:'Jogglers',category:'Test collection',type:'Test collection',price:1500,old:2000,stock:2,sizes:[38],images:[image],condition:'Excellent',color:'White',description:'Test product',active:true}});assert.equal(x.r.status,200);const id=x.data.id;
 let shop=(await request('catalog')).data;assert.ok(shop.products.some(p=>p.id===id));
 catalog=(await request('admin/catalog')).data;
 x=await request('admin/products','PUT',{version:catalog.version,product:{...catalog.products.find(p=>p.id===id),name:'Updated pair'}});assert.equal(x.r.status,200);
 const buyer={name:'Integration Customer',email:'integration@example.com',phone:'03001234567',address:'Test road',city:'Karachi',province:'Sindh',postal:'74000',key:randomBytes(16).toString('hex'),items:[{id,size:38,qty:1}],total:1};
 x=await request('orders','POST',buyer,false);assert.equal(x.r.status,201);assert.equal(x.data.total,1750);const ref=x.data.ref;
 x=await request('orders','POST',buyer,false);assert.equal(x.data.ref,ref);catalog=(await request('admin/catalog')).data;assert.equal(catalog.products.find(p=>p.id===id).stock,1);
 x=await request('orders/track','POST',{ref,email:'wrong@example.com'},false);assert.equal(x.r.status,404);
 x=await request('orders/track','POST',{ref,email:buyer.email},false);assert.equal(x.data.status,'Received');assert.equal(x.data.customer,undefined);
 x=await request('admin/orders','PATCH',{ref,status:'Cancelled'});assert.equal(x.r.status,200);catalog=(await request('admin/catalog')).data;assert.equal(catalog.products.find(p=>p.id===id).stock,2);
 x=await request('admin/categories','DELETE',{name:'Test collection',version:catalog.version});assert.equal(x.r.status,400);
 x=await request('admin/products','DELETE',{id,version:catalog.version});assert.equal(x.r.status,200);catalog=(await request('admin/catalog')).data;
 x=await request('admin/categories','DELETE',{name:'Test collection',version:catalog.version});assert.equal(x.r.status,200);
 const csrf=await fetch(base+'/api/admin/products',{method:'POST',headers:{Cookie:cookie,'Content-Type':'application/json'},body:'{}'});assert.equal(csrf.status,403);
 x=await request('admin/logout','POST',{});assert.equal(x.r.status,200);
 console.log('PASS: login protection, photo upload, product/category CRUD, shared catalog, server-priced checkout, duplicate prevention, stock, cancellation, private tracking and CSRF.');
}finally{child.kill('SIGTERM');await new Promise(resolve=>{if(child.exitCode!==null)resolve();else child.once('exit',resolve)});await rm(dir,{recursive:true,force:true});}
