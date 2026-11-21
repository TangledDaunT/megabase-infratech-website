import {questions,getQuestion,answerLabels} from '../quiz/questions.js';
import {scoreLead} from './scoring.js';
export const headers=['Submission ID','Received at (UTC)','Name','WhatsApp number','City of residence','Project type','Plot status','Plot location','Plot size','Project details','Budget','Start timeline','Main concerns','Building map','Match score','Score breakdown','Terms accepted','Terms version'];
export function validateLead(body){
  if(!body||typeof body!=='object'||Array.isArray(body))throw new Error('Invalid submission.');
  const {answers,contact,submissionId}=body;
  if(typeof submissionId!=='string'||!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(submissionId))throw new Error('Invalid submission ID.');
  if(!answers||typeof answers!=='object'||!contact||typeof contact!=='object')throw new Error('Quiz poora karein.');
  const cleaned={};
  for(let i=0;i<questions.length;i++){
    const q=getQuestion(i,answers),value=answers[q.id];
    if(q.multi){if(!Array.isArray(value)||value.length<1||value.length>q.options.length||new Set(value).size!==value.length||value.some(v=>!q.options.some(o=>o[0]===v)))throw new Error('Apni chinta chunein.');cleaned[q.id]=value;}
    else {if(typeof value!=='string'||!q.options.some(o=>o[0]===value))throw new Error('Sabhi sawaalon ka jawaab dein.');cleaned[q.id]=value;}
  }
  const text=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.trim().length<=max&&!/[\u0000-\u001f]/.test(v)?v.trim():null;
  // Keep the existing storage column compatible with older clients; new forms omit city.
  const name=text(contact.name,80),city=contact.city == null || contact.city === '' ? '' : text(contact.city,100),raw=text(contact.value,160);
  if(!name||!raw||city===null)throw new Error('Naam aur WhatsApp number sahi bharein.');
  if(contact.consent!==true)throw new Error('Contact ke liye sahmati dein.');
  if(contact.method!=='whatsapp')throw new Error('WhatsApp number dein.');
  const value=raw.replace(/[\s()-]/g,'');
  if(!/^\+91[6-9]\d{9}$/.test(value))throw new Error('Sahi 10-digit WhatsApp number dein.');
  if(!['2026-11-09','2026-11-10'].includes(body.termsVersion))throw new Error('Naye terms and conditions accept karein.');
  return {submissionId,answers:cleaned,contact:{name,city,value,method:'whatsapp',consent:true},termsVersion:body.termsVersion};
}
export function toRow(lead,now=new Date().toISOString()){
  const labels=answerLabels(lead.answers),c=lead.contact;
  const score=scoreLead(lead.answers);
  return [lead.submissionId,now,c.name,c.value,c.city,...questions.map(q=>labels[q.id]),score.fraction,score.breakdown,'I agree to the terms and conditions.',lead.termsVersion];
}
