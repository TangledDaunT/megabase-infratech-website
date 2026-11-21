import {randomBytes,createHmac,scrypt as derive,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
const scrypt=promisify(derive);
export const SESSION_SECONDS=3600;
export const cookieName=secure=>secure?'__Host-megabase_admin':'megabase_admin';

export async function hashPassword(password,salt=randomBytes(16).toString('hex')) {
  const hash=await scrypt(password,salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024});
  return `scrypt:${salt}:${hash.toString('hex')}`;
}
export function validConfiguration(config) {
  return /^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(config.passwordHash||'') && typeof config.sessionSecret==='string' && config.sessionSecret.length>=32;
}
export async function verifyPassword(password,encoded) {
  if(typeof password!=='string'||password.length>256||!/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(encoded||''))return false;
  const [,salt,expected]=encoded.split(':');
  const result=await scrypt(password,salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024});
  return timingSafeEqual(result,Buffer.from(expected,'hex'));
}
function sign(value,config) {
  // Bind sessions to the current password hash so a password change revokes them.
  return createHmac('sha256',config.sessionSecret).update(value+'.'+config.passwordHash).digest('base64url');
}
export function issueSession(config,now=Date.now()) {
  const value=Buffer.from(JSON.stringify({exp:Math.floor(now/1000)+SESSION_SECONDS,nonce:randomBytes(24).toString('base64url')})).toString('base64url');
  return `${value}.${sign(value,config)}`;
}
export function verifySession(token,config,now=Date.now()) {
  if(!validConfiguration(config)||typeof token!=='string'||token.length>512)return false;
  const parts=token.split('.');if(parts.length!==2)return false;
  const expected=Buffer.from(sign(parts[0],config));const actual=Buffer.from(parts[1]);
  if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return false;
  try {const data=JSON.parse(Buffer.from(parts[0],'base64url').toString());const seconds=Math.floor(now/1000);return Number.isInteger(data.exp)&&data.exp>seconds&&data.exp<=seconds+SESSION_SECONDS&&typeof data.nonce==='string'&&data.nonce.length===32;}catch{return false;}
}
export function readSession(req,secure) {
  const key=cookieName(secure)+'=';
  return (req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(key))?.slice(key.length);
}
export function sessionCookie(token,secure,remove=false) {
  return `${cookieName(secure)}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${remove?0:SESSION_SECONDS}${secure?'; Secure':''}`;
}
export function csrfToken(token,config) {
  return createHmac('sha256',config.sessionSecret).update('logout:'+token).digest('hex');
}
export function sameOrigin(req) {
  try {return new URL(req.get('origin')).origin===`${req.protocol}://${req.get('host')}`;}catch{return false;}
}
