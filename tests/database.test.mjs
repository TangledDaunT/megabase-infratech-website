import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {saveDatabaseLead,leadFingerprint} from '../server/database.js';
import {validateLead} from '../server/validation.js';
import {answerLabels} from '../quiz/questions.js';
import {scoreLead} from '../server/scoring.js';

test('current contact payload fits the existing required city column and retains all lead data',async()=>{
  const body={submissionId:randomUUID(),answers:{type:'home',plot:'owned',location:'noida',size:'100to200',detail:'g1',budget:'20to50',timeline:'now',concerns:['quality'],map:'help'},contact:{name:'Database test fixture',value:'+919876543210',method:'whatsapp',consent:true},termsVersion:'2026-11-10'};
  for(const city of [undefined,'Lucknow']) {
    const lead=validateLead({...body,contact:{...body.contact,city}});
    const calls=[];
    const db={query:async(sql,values)=>{calls.push({sql,values});return {rows:[{fingerprint:leadFingerprint(lead)}]};}};
    await saveDatabaseLead(lead,db);
    const values=calls[0].values;
    assert.equal(values[0],lead.submissionId);
    assert.equal(values[1],body.contact.name);
    assert.equal(values[2],body.contact.value);
    assert.equal(values[3],city || 'Not collected');
    assert.deepEqual(JSON.parse(values[4]),body.answers);
    assert.deepEqual(JSON.parse(values[5]),answerLabels(body.answers));
    assert.equal(values[6],scoreLead(body.answers).fraction);
    assert.equal(values[7],scoreLead(body.answers).breakdown);
    assert.equal(values[8],'I agree to the terms and conditions.');
    assert.equal(values[9],body.termsVersion);
    assert.equal(values[10],leadFingerprint(lead));
    assert.deepEqual(calls[1].values,[lead.submissionId]);
  }
});
