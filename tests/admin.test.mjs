import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSiteServer} from '../scripts/serve.mjs';
import {hashPassword,issueSession,verifySession,sessionCookie} from '../server/admin-auth.js';
import {csvCell,csvHeader,csvLead} from '../server/admin-csv.js';
import {createAdminStore} from '../server/admin-database.js';

const password='Local-admin-fixture-password-2026';
const config={passwordHash:await hashPassword(password),sessionSecret:'a-local-test-session-secret-at-least-32-characters'};
const id='221a9975-cc26-46ed-b418-953eb5a894bb';
const row={submission_id:id,received_at:'2026-11-12T11:58:22.362Z',name:'<script>alert("fixture")</script>',whatsapp:'+919876543210',city:'Not collected',answers:{type:'home',plot:'owned',location:'noida',size:'100to200',detail:'g2',budget:'50to100',timeline:'1to3',concerns:['quality'],map:'help'},answer_labels:{type:'Apna ghar',plot:'Plot mera hai, khaali hai',location:'Noida',size:'100–200 gaz',detail:'G+2',budget:'₹50 lakh – ₹1 crore',timeline:'1–3 mahine mein',concerns:'Material ki quality',map:'Nahi, help chahiye'},match_score:'0.90',score_breakdown:'Plot: 40; timeline: 30; budget: 20',consent_text:'I agree to the terms and conditions.',terms_version:'2026-11-10'};
async function usingAdmin(run,overrides={}) {
  const calls=[];
  const store={configured:()=>true,list:async options=>{calls.push(['list',options]);return {rows:[row],total:1,page:1,pageSize:50};},get:async key=>{calls.push(['get',key]);return key===id?row:null;},async *export(options){calls.push(['export',options]);yield [row];}};
  const server=createSiteServer({configured:()=>false,admin:{store,config:()=>config,secure:false,...overrides}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const get=(path,cookie)=>fetch(origin+path,{redirect:'manual',headers:cookie?{Cookie:cookie}:{}});
  const post=(path,body,cookie,requestOrigin=origin)=>fetch(origin+path,{method:'POST',redirect:'manual',headers:{'Content-Type':'application/x-www-form-urlencoded',Origin:requestOrigin,...(cookie?{Cookie:cookie}:{})},body:new URLSearchParams(body)});
  try {await run({origin,get,post,calls});}finally{await new Promise(resolve=>server.close(resolve));}
}

test('private pages and CSV never disclose leads without a valid, unexpired session',async()=>{
  await usingAdmin(async({get,calls})=>{
    const login=await get('/admin/');assert.equal(login.status,200);const html=await login.text();assert.match(html,/Admin password/);assert.doesNotMatch(html,/9876543210|Apna ghar|alert\("fixture"\)/);
    assert.match(login.headers.get('cache-control'),/private, no-store/);assert.match(login.headers.get('x-robots-tag'),/noindex/);assert.match(login.headers.get('content-security-policy'),/frame-ancestors 'none'/);assert.equal(login.headers.get('referrer-policy'),'same-origin');
    for(const path of ['/admin/leads.csv','/admin/leads/'+id+'/']) {
      assert.equal((await get(path)).status,303);
      const token=issueSession(config,Date.now()-3600001);
      assert.equal((await get(path,'megabase_admin='+token)).status,303);
      assert.equal((await get(path,'megabase_admin=forged')).status,303);
    }
    assert.equal(calls.length,0);
  });
  assert.equal(verifySession(issueSession(config),{...config,passwordHash:await hashPassword('rotated-password')}),false);
  const secureCookie=sessionCookie('fixture',true);assert.match(secureCookie,/__Host-megabase_admin=/);assert.match(secureCookie,/HttpOnly; SameSite=Strict/);assert.match(secureCookie,/; Secure$/);
});

test('login, searchable list, safe detail rendering, full CSV export and logout work together',async()=>{
  await usingAdmin(async({get,post,calls})=>{
    assert.equal((await post('/admin/login',{password},null,'https://untrusted.invalid')).status,403);
    assert.equal((await post('/admin/login',{password:'wrong'})).status,401);
    const login=await post('/admin/login',{password});assert.equal(login.status,303);
    const cookie=login.headers.get('set-cookie').split(';')[0];assert.match(cookie,/megabase_admin=/);
    const response=await get('/admin/?q=Noida&page=2',cookie);assert.equal(response.status,200);
    const html=await response.text();assert.match(html,/Export matching leads/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script|ADMIN_PASSWORD|DATABASE_URL/);
    assert.deepEqual(calls[0],['list',{q:'Noida',page:2}]);
    const detail=await get('/admin/leads/'+id+'/',cookie);assert.equal(detail.status,200);const details=await detail.text();
    for(const answer of Object.values(row.answer_labels))assert.ok(details.includes(answer));
    for(const text of [row.whatsapp,row.city,row.consent_text,row.terms_version,'90%'])assert.ok(details.includes(text));
    assert.match(details,/&lt;script&gt;/);assert.doesNotMatch(details,/<script/);
    assert.equal((await get('/admin/leads/not-a-uuid/',cookie)).status,404);
    assert.equal((await get('/admin/leads/11111111-1111-1111-1111-111111111111/',cookie)).status,404);
    const csv=await get('/admin/leads.csv?q=Noida',cookie);assert.equal(csv.status,200);assert.match(csv.headers.get('content-disposition'),/attachment; filename="megabase-leads-/);assert.match(csv.headers.get('cache-control'),/no-store/);
    const body=await csv.text();assert.equal(body,csvHeader().replace(/^\ufeff/,'')+csvLead(row));assert.ok(body.includes("'+919876543210"));assert.ok(body.includes('Raw answers (JSON)'));assert.deepEqual(calls.at(-1),['export',{q:'Noida'}]);
    assert.equal((await post('/admin/logout',{},cookie)).status,403);
    const csrf=html.match(/name="csrf" value="([a-f0-9]+)"/)[1];
    assert.equal((await post('/admin/logout',{csrf},cookie,'https://untrusted.invalid')).status,403);
    const logout=await post('/admin/logout',{csrf},cookie);assert.equal(logout.status,303);assert.match(logout.headers.get('set-cookie'),/Max-Age=0/);
    assert.doesNotMatch(await (await get('/admin/')).text(),/9876543210/);
  });
});

test('admin fails closed without configuration, throttles wrong passwords and hides database errors',async()=>{
  await usingAdmin(async({get,calls})=>{assert.equal((await get('/admin/')).status,503);assert.equal((await get('/admin/leads.csv')).status,503);assert.equal(calls.length,0);},{config:()=>({})});
  await usingAdmin(async({post})=>{for(let i=0;i<2;i++)assert.equal((await post('/admin/login',{password:'wrong'})).status,401);assert.equal((await post('/admin/login',{password:'wrong'})).status,429);},{loginLimit:2});
  const fail=async()=>{throw new Error('private connection-string fixture');};
  await usingAdmin(async({get,post})=>{const login=await post('/admin/login',{password});const cookie=login.headers.get('set-cookie').split(';')[0];for(const path of ['/admin/','/admin/leads.csv']){const response=await get(path,cookie);assert.equal(response.status,503);assert.doesNotMatch(await response.text(),/private connection-string/);}},{store:{configured:()=>true,list:fail,async *export(){await fail();}}});
});

test('CSV neutralizes formula cells and escapes embedded commas, quotes and line breaks',()=>{
  for(const value of ['=1+1','+919876543210','-2+3','@SUM(A1)',' \t=1+1','\r=1+1','\ttext','\0text'])assert.ok(csvCell(value).startsWith('"\''));
  assert.equal(csvCell('Name, "quoted"\nsecond line'),'"Name, ""quoted""\nsecond line"');
});

test('read-only queries use parameters and CSV walks every stable keyset batch',async()=>{
  const calls=[];
  const batches=[Array.from({length:250},(_,i)=>({...row,submission_id:'batch-a-'+i})),[row]];
  const db={query:async(sql,values)=>{calls.push({sql,values});if(sql.includes('count(*)'))return {rows:[{total:51}]};if(sql.includes('OFFSET'))return {rows:[row]};if(sql.includes('WHERE submission_id='))return {rows:[row]};return {rows:batches.shift()||[]};}};
  const store=createAdminStore(db);
  assert.equal((await store.list({q:"O'Hara%_",page:999})).page,2);
  assert.equal(calls[0].values[0],"%O'Hara\\%\\_%");assert.ok(!calls[0].sql.includes("O'Hara"));
  assert.equal((await store.get(id)).submission_id,id);assert.deepEqual(calls.at(-1).values,[id]);
  let count=0;for await(const batch of store.export({q:'Noida'}))count+=batch.length;
  assert.equal(count,251);
  const exports=calls.filter(c=>c.sql.includes('LIMIT 250'));assert.equal(exports.length,2);assert.match(exports[1].sql,/\(received_at,submission_id\) </);assert.equal(exports[0].values[1],exports[1].values[1]);
  for(const call of calls)assert.match(call.sql,/^SELECT /);
});
