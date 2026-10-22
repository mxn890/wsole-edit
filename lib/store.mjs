import {mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const seed=require('../data/seed.json');
let connection,ready;
export function configured(){return Boolean(process.env.DATABASE_URL)||process.env.NODE_ENV!=='production'||process.env.JOGGLERS_LOCAL_DB==='1'}
async function connect(){
 if(!configured())throw new Error('Store database is not connected. Please contact Jogglers.');
 if(!connection){if(process.env.DATABASE_URL){const {Pool}=await import('pg');connection=new Pool({connectionString:process.env.DATABASE_URL,max:3});}
 else {const dir=process.env.JOGGLERS_DATA_DIR||'.data/jogglers';await mkdir(dir,{recursive:true});const {PGlite}=await import('@electric-sql/pglite');connection=new PGlite(dir);}}
 return connection;
}
export async function db(){const c=await connect();if(!ready){ready=(async()=>{await c.query(`CREATE TABLE IF NOT EXISTS jogglers_state (id integer PRIMARY KEY, value jsonb NOT NULL, version integer NOT NULL DEFAULT 1)`);await c.query(`INSERT INTO jogglers_state(id,value) VALUES(1,$1::jsonb) ON CONFLICT(id) DO NOTHING`,[JSON.stringify(seed)]);await c.query(`CREATE TABLE IF NOT EXISTS jogglers_images (id text PRIMARY KEY, type text NOT NULL, bytes bytea NOT NULL)`);await c.query(`CREATE TABLE IF NOT EXISTS jogglers_attempts (key text PRIMARY KEY, count integer NOT NULL, expires bigint NOT NULL)`);})();}await ready;return c;}
export async function state(){const c=await db();return (await c.query('SELECT value,version FROM jogglers_state WHERE id=1')).rows[0]}
export async function change(fn){const c=await db();if(process.env.DATABASE_URL){const client=await c.connect();try{await client.query('BEGIN');const result=await locked(client,fn);await client.query('COMMIT');return result}catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}}
 return c.transaction(tx=>locked(tx,fn));}
async function locked(c,fn){const row=(await c.query('SELECT value,version FROM jogglers_state WHERE id=1 FOR UPDATE')).rows[0];const result=await fn(row.value,row.version);await c.query('UPDATE jogglers_state SET value=$1::jsonb,version=version+1 WHERE id=1',[JSON.stringify(row.value)]);return result;}
export async function attempt(key,limit=10,seconds=900){const c=await db(),now=Date.now();const row=(await c.query(`INSERT INTO jogglers_attempts(key,count,expires) VALUES($1,1,$2) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN jogglers_attempts.expires < $3 THEN 1 ELSE jogglers_attempts.count+1 END,expires=CASE WHEN jogglers_attempts.expires < $3 THEN $2 ELSE jogglers_attempts.expires END RETURNING count`,[key,now+seconds*1000,now])).rows[0];return row.count<=limit;}
export function initialCatalog(){return {products:seed.products,categories:seed.categories}}
