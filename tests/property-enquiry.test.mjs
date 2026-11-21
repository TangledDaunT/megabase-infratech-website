import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {validatePropertyLead} from '../server/property-validation.js';
import {saveDatabaseLead,leadFingerprint} from '../server/database.js';
import {storedLeadData} from '../server/lead-data.js';
import {propertyTermsVersion,propertyConsent,projects} from '../content/project-data.mjs';
import {createSiteServer} from '../scripts/serve.mjs';
import {detailPage,listPage} from '../server/admin-views.js';
import {csvHeader,csvLead} from '../server/admin-csv.js';
import {projectPage,projectWhatsApp} from '../content/project-pages.mjs';
const payload=()=>({submissionId:randomUUID(),project:'bhumi-residency',configuration:'2bhk',contact:{name:'TEST ONLY - Local Bhumi enquiry',value:'+919876543210',method:'whatsapp',consent:true},termsVersion:propertyTermsVersion,website:''});

test('buyer validation requires the actual project, configuration, phone and current consent without construction answers',()=>{
  for(const configuration of ['1bhk','2bhk','3bhk','undecided']) {
    const p=payload();p.configuration=configuration;p.contact.value='+91 98765 43210';p.answers={score:100};
    const lead=validatePropertyLead(p);assert.equal(lead.contact.value,'+919876543210');assert.deepEqual(lead.answers,{type:'property_enquiry',project:'bhumi-residency',configuration,request:'site_visit',location:'noida'});assert.equal(lead.contact.city,'');
  }
  for(const mutate of [p=>p.project='unknown',p=>p.configuration='penthouse',p=>p.contact.name='',p=>p.contact.value='+911234',p=>p.contact.consent=false,p=>p.termsVersion='2026-11-10',p=>p.submissionId='not-an-id']) {const p=payload();mutate(p);assert.throws(()=>validatePropertyLead(p));}
});

test('buyer submissions save once, reject changed retries, handle failure and never bypass unavailable storage',async()=>{
  const saved=[];let fail=false;
  const server=createSiteServer({configured:()=>true,saveLead:async lead=>{if(fail){fail=false;throw new Error('Mock storage failure');}saved.push(lead);}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`;
  const post=(body,requestOrigin=origin)=>fetch(origin+'/api/property-enquiries',{method:'POST',headers:{Origin:requestOrigin,'Content-Type':'application/json'},body:JSON.stringify(body)});
  try {
    const p=payload();assert.deepEqual((await Promise.all([post(p),post(p)])).map(r=>r.status),[200,200]);assert.equal(saved.length,1);
    assert.equal((await post({...p,configuration:'3bhk'})).status,409);
    const missing=payload();missing.contact.consent=false;assert.equal((await post(missing)).status,400);
    assert.equal((await post({...payload(),website:'spam'})).status,400);
    assert.equal((await post(payload(),'https://untrusted.invalid')).status,403);
    fail=true;const retry=payload();assert.equal((await post(retry)).status,502);assert.equal((await post(retry)).status,200);assert.equal(saved.length,2);
    const redirect=await fetch(origin+'/projects/sector-110-noida/',{redirect:'manual'});assert.equal(redirect.status,301);assert.equal(redirect.headers.get('location'),'/projects/bhumi-residency/');
  } finally {await new Promise(resolve=>server.close(resolve));}
  const closed=createSiteServer({configured:()=>false,saveLead:async()=>assert.fail('must not write')});await new Promise(resolve=>closed.listen(0,'127.0.0.1',resolve));
  try {assert.equal((await fetch(`http://127.0.0.1:${closed.address().port}/api/property-enquiries`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload())})).status,503);}finally{await new Promise(resolve=>closed.close(resolve));}
});

test('the existing lead table stores complete buyer details with distinct consent and no construction readiness score',async()=>{
  const lead=validatePropertyLead(payload()),calls=[];
  await saveDatabaseLead(lead,{query:async(sql,values)=>{calls.push({sql,values});return {rows:[{fingerprint:leadFingerprint(lead)}]};}});
  const values=calls[0].values;assert.equal(values[1],lead.contact.name);assert.equal(values[2],lead.contact.value);assert.equal(values[3],'Not collected');assert.deepEqual(JSON.parse(values[4]),lead.answers);
  assert.deepEqual(JSON.parse(values[5]),{type:'Flat-buyer enquiry',project:'Bhumi Residency',configuration:'2 BHK',request:'Site visit',location:'Sector 110, Noida'});
  assert.equal(values[6],0);assert.match(values[7],/Not scored: property enquiry/);assert.equal(values[8],propertyConsent);assert.equal(values[9],propertyTermsVersion);
  const data=storedLeadData(lead);const row={submission_id:lead.submissionId,received_at:new Date().toISOString(),name:lead.contact.name,whatsapp:lead.contact.value,city:'Not collected',answers:lead.answers,answer_labels:data.labels,match_score:0,score_breakdown:data.score.breakdown,consent_text:data.consent,terms_version:lead.termsVersion};
  const detail=detailPage(row,'fixture');assert.match(detail,/Property enquiry/);assert.match(detail,/Bhumi Residency/);assert.match(detail,/2 BHK/);assert.match(detail,/Site visit/);assert.doesNotMatch(detail,/Quiz answers|0%|Plot status/);
  const listing=listPage({rows:[row],total:1,page:1,pageSize:50,q:'',csrf:'fixture'});assert.match(listing,/Property enquiry/);assert.match(listing,/Bhumi Residency/);assert.doesNotMatch(listing,/>0%/);
  assert.match(csvHeader(),/Enquiry type/);const csv=csvLead(row);for(const value of ['Bhumi Residency','2 BHK','Site visit',propertyConsent,propertyTermsVersion])assert.ok(csv.includes(value));assert.ok(csv.includes("'+919876543210"));
});

test('the reusable project page uses approved project facts and captures buyer enquiries without invented unit specifications',()=>{
  const page=projectPage(projects[0]);assert.equal(page.route,'/projects/bhumi-residency/');
  for(const text of ['A Megabase Infratech Project','6 Floors','18 Flats','3 Flats per Floor','Stilt Parking','Rooftop Terrace','January 2027','property-enquiry','2026-11-12-property'])assert.ok(page.body.includes(text),text);
  assert.doesNotMatch(page.body,/₹|seven.floor|carpet area:|RERA\s*[#:]/i);
  assert.equal(new URL(projectWhatsApp(projects[0])).searchParams.get('text'),"Hi, I'm interested in Bhumi Residency, Sector 110.");
});
