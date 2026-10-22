import {createHmac,createHash,timingSafeEqual} from 'node:crypto';
import {cookies} from 'next/headers';
export const cookieName='jogglers-admin';
export function authConfigured(){return (process.env.ADMIN_PASSWORD?.length||0)>=12&&(process.env.SESSION_SECRET?.length||0)>=32}
function hash(s){return createHash('sha256').update(s).digest()}
export function passwordValid(s){return authConfigured()&&timingSafeEqual(hash(String(s)),hash(process.env.ADMIN_PASSWORD))}
export function session(){const payload=Buffer.from(JSON.stringify({exp:Date.now()+8*3600000})).toString('base64url');return payload+'.'+createHmac('sha256',process.env.SESSION_SECRET).update(payload).digest('base64url')}
export async function authorized(){if(!authConfigured())return false;const token=(await cookies()).get(cookieName)?.value;if(!token)return false;const [p,s]=token.split('.');if(!p||!s)return false;try{const actual=createHmac('sha256',process.env.SESSION_SECRET).update(p).digest('base64url');return timingSafeEqual(hash(s),hash(actual))&&JSON.parse(Buffer.from(p,'base64url').toString()).exp>Date.now()}catch{return false}}
export function sameOrigin(req){const origin=req.headers.get('origin');if(!origin)return false;try{const u=new URL(origin);return ['http:','https:'].includes(u.protocol)&&u.host===req.headers.get('host')}catch{return false}}
export function ipKey(req,prefix){return prefix+createHash('sha256').update(req.headers.get('x-forwarded-for')?.split(',')[0]||'local').digest('hex')}
