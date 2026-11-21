import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createSiteServer} from '../scripts/serve.mjs';

function lead(type='home',detail='g1') { return {submissionId:randomUUID(),answers:{type,detail,plot:'owned',location:'noida',size:'100to200',budget:'20to50',timeline:'now',concerns:['quality'],map:'help'},contact:{name:'Local test fixture',value:'+919876543210',method:'whatsapp',consent:true},termsVersion:'2026-11-10',website:''}; }
async function using(options,run) {
 const server=createSiteServer(options);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin=`http://127.0.0.1:${server.address().port}`;
 const submit=(body,headers={})=>fetch(origin+'/api/leads',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,...headers},body:JSON.stringify(body)});
 try {await run({origin,submit});}finally{await new Promise(resolve=>server.close(resolve));}
}
test('four branches use the unchanged payload and save once under concurrent retries',async()=>{
 const saved=[];
 await using({configured:()=>true,saveLead:async l=>{saved.push(l);await new Promise(r=>setTimeout(r,5));}},async({origin,submit})=>{
  assert.equal((await (await fetch(origin+'/api/config')).json()).acceptingLeads,true);
  for(const [type,detail]of [['home','g1'],['pg','under10'],['commercial','office'],['interiors','flat']])assert.equal((await submit(lead(type,detail))).status,200);
  const repeated=lead();const results=await Promise.all([submit(repeated),submit(repeated)]);
  assert.deepEqual(results.map(r=>r.status),[200,200]);assert.equal(saved.length,5);
  assert.equal(saved.at(-1).termsVersion,'2026-11-10');assert.equal(saved.at(-1).contact.city,'');
  assert.equal(Object.keys(saved.at(-1).answers).length,9);
  repeated.contact.name='Changed details';assert.equal((await submit(repeated)).status,409);
 });
});
test('validation, consent, origin protection and unavailable storage reject without writes',async()=>{
 let writes=0;
 await using({configured:()=>false,saveLead:async()=>{writes++;}},async({origin,submit})=>{
  assert.equal((await (await fetch(origin+'/api/config')).json()).acceptingLeads,false);
  assert.equal((await submit(lead())).status,503);
  const missing=lead();missing.contact.consent=false;assert.equal((await submit(missing)).status,400);
  assert.equal((await submit(lead(),{Origin:'https://wrong-origin.invalid'})).status,403);
  const spam=lead();spam.website='spam';assert.equal((await submit(spam)).status,400);
  assert.equal(writes,0);
 });
});
test('a failed save can be retried and persistent deduplication conflicts retain 409',async()=>{
 let attempts=0;
 await using({configured:()=>true,saveLead:async()=>{if(++attempts===1)throw new Error('Fixture failure');}},async({submit})=>{
  const body=lead();assert.equal((await submit(body)).status,502);assert.equal((await submit(body)).status,200);assert.equal(attempts,2);
 });
 await using({configured:()=>true,saveLead:async()=>{const e=new Error('Fixture conflict');e.code='LEAD_CONFLICT';throw e;}},async({submit})=>assert.equal((await submit(lead())).status,409));
});
