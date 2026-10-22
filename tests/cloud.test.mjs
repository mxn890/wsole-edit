import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {imagePath,product} from '../lib/catalog-validation.mjs';
import seed from '../data/seed.json' with {type:'json'};
test('only local assets or Jogglers storage image URLs are accepted',()=>{
 assert.equal(imagePath('/assets/21.png'),'/assets/21.png');
 for(const bad of ['javascript:alert(1)','https://other.example/image.jpg','/assets/a.png" onerror="alert(1)'])assert.throws(()=>imagePath(bad));
 assert.throws(()=>product({...seed.products[0],price:-1},seed.categories));
});
test('database enforces public reads, owner writes, checkout pricing, stock and order privacy',async()=>{
 const db=new PGlite();
 try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id text,bucket_id text);alter table storage.objects enable row level security;`);
 await db.exec((await readFile(new URL('../supabase/setup.sql',import.meta.url),'utf8')).replaceAll('OWNER_EMAIL_HERE','owner@example.com'));
 const owner='11111111-1111-1111-1111-111111111111';
 await db.exec(`insert into auth.users values('${owner}','owner@example.com',now());set role anon;`);
 const catalog=await db.query('select public.jogglers_catalog() c');assert.equal(catalog.rows[0].c.products.length,12);
 await assert.rejects(()=>db.query('select * from public.jogglers_orders'),/permission denied/);
 await assert.rejects(()=>db.query("update public.jogglers_catalog_data set version=99"),/permission denied/);
 const payload={name:'Customer',email:'customer@example.com',phone:'03001234567',address:'Street 1',city:'Karachi',province:'Sindh',postal:'74000',key:crypto.randomUUID(),items:[{id:1,size:42,qty:1}],total:1};
 const place=async x=>(await db.query('select public.jogglers_place_order($1::jsonb) o',[JSON.stringify(x)])).rows[0].o;
 const o=await place(payload);assert.equal(o.total,4740);assert.equal(o.customer,undefined);assert.equal(o.key,undefined);
 assert.equal((await place(payload)).ref,o.ref);
 await assert.rejects(()=>place({...payload,key:crypto.randomUUID()}),/insufficient stock/);
 await assert.rejects(()=>db.query('select public.jogglers_track_order($1,$2)',[o.ref,'wrong@example.com']),/No matching/);
 const tracked=(await db.query('select public.jogglers_track_order($1,$2) o',[o.ref,payload.email])).rows[0].o;assert.equal(tracked.ref,o.ref);assert.equal(tracked.customer,undefined);
 await db.exec(`reset role;set role authenticated;select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',false);`);
 assert.equal((await db.query('select * from public.jogglers_orders')).rows.length,0);
 await assert.rejects(()=>db.query('select public.jogglers_update_order($1,$2)',[o.ref,'Cancelled']),/Owner sign-in/);
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);
 assert.equal((await db.query('select public.jogglers_is_admin() a')).rows[0].a,true);
 assert.equal((await db.query('select * from public.jogglers_orders')).rows.length,1);
 await db.query('select public.jogglers_update_order($1,$2)',[o.ref,'Cancelled']);
 await db.query('select public.jogglers_update_order($1,$2)',[o.ref,'Cancelled']);
 assert.equal((await db.query('select public.jogglers_catalog() c')).rows[0].c.products[0].stock,1);
 await assert.rejects(()=>db.query('select public.jogglers_update_order($1,$2)',[o.ref,'Received']),/cannot be reopened/);
 // Rerunning setup is safe and preserves edits/orders.
 await db.exec('reset role');await db.exec((await readFile(new URL('../supabase/setup.sql',import.meta.url),'utf8')).replaceAll('OWNER_EMAIL_HERE','owner@example.com'));
 assert.equal((await db.query('select count(*)::int n from public.jogglers_orders')).rows[0].n,1);
 }finally{await db.close()}
});
