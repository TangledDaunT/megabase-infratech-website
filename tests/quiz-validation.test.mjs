import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {validateLead,toRow,headers} from '../server/validation.js';
import {scoreLead} from '../server/scoring.js';
export const valid=()=>({submissionId:randomUUID(),termsVersion:'2026-11-10',answers:{type:'home',plot:'owned',location:'lucknow',size:'100to200',detail:'g1',budget:'20to50',timeline:'now',concerns:['quality','remote'],map:'help'},contact:{name:'Test Visitor',value:'+91 98765 43210',city:'Lucknow',method:'whatsapp',consent:true}});
test('stores all nine answers, contact details, numeric percentage and accepted terms',()=>{
  const lead=validateLead(valid()),row=toRow(lead,'2026-11-10T00:00:00Z');
  assert.equal(lead.contact.value,'+919876543210');assert.equal(row.length,headers.length);
  assert.deepEqual(row.slice(2,5),['Test Visitor','+919876543210','Lucknow']);
  assert.match(row[12],/quality/);assert.match(row[12],/Door se/);
  assert.equal(row[14],1);assert.equal(row[16],'I agree to the terms and conditions.');assert.equal(row[17],'2026-11-10');
});
test('rejects missing consent, stale terms, incomplete answers and forged branches',()=>{
  for(const mutate of [x=>x.contact.consent=false,x=>delete x.termsVersion,x=>x.termsVersion='old',x=>delete x.answers.map,x=>x.answers.type='pg',x=>x.answers.concerns=['anything'],x=>x.answers.concerns=['time','time']]){const body=valid();mutate(body);assert.throws(()=>validateLead(body));}
});
test('accepts all four project branches',()=>{for(const [type,detail]of [['home','g3'],['pg','suggest'],['commercial','clinic'],['interiors','flat']]){const b=valid();Object.assign(b.answers,{type,detail});assert.equal(validateLead(b).answers.detail,detail);}});
test('requires an Indian WhatsApp number and rejects email',()=>{
  for(const value of ['9876543210','+915876543210','+91987654321','test@example.com']){const b=valid();b.contact.value=value;assert.throws(()=>validateLead(b));}
  const b=valid();Object.assign(b.contact,{method:'email',value:'test@example.com'});assert.throws(()=>validateLead(b));
});
test('approved rules produce 100%, 90%, and 0%, including all budget/timeline combinations',()=>{
  for(const plot of ['owned','rebuild','buying','extension'])for(const [timeline,t]of [['now',40],['1to3',30],['3to6',0],['exploring',0]])for(const [budget,b]of [['under20',0],['20to50',20],['50to100',20],['over100',20],['undecided',0]]){
    const expected=(plot==='owned'?40:0)+t+b,s=scoreLead({plot,timeline,budget});assert.equal(s.percentage,expected);assert.equal(s.fraction,expected/100);
  }
  assert.equal(scoreLead({}).percentage,0);
});
test('client-supplied scores cannot override server scoring; names stay literal for RAW writes',()=>{
  const b=valid();Object.assign(b.answers,{plot:'buying',timeline:'exploring',budget:'undecided'});b.score=100;b.answers.score=100;b.contact.name='=IMPORTXML("x","y")';
  const lead=validateLead(b),row=toRow(lead);assert.equal(row[2],b.contact.name);assert.equal(row[14],0);assert.equal(lead.answers.score,undefined);
});

test('accepts contact details without city and keeps the storage column empty',()=>{
  const body=valid();delete body.contact.city;
  const lead=validateLead(body);
  assert.equal(lead.contact.city,'');assert.equal(toRow(lead)[4],'');
  for(const field of ['name','value']){const missing=structuredClone(body);delete missing.contact[field];assert.throws(()=>validateLead(missing));}
});
