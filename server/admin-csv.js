import {questions} from '../quiz/questions.js';
import {isPropertyEnquiry} from '../content/project-data.mjs';
export const answerNames={type:'Project type',plot:'Plot status',location:'Plot location',size:'Plot size',detail:'Project details',budget:'Budget',timeline:'Start timeline',concerns:'Main concerns',map:'Building map'};
export function csvCell(value) {
  let text=String(value??'');
  // Treat phone numbers and formula-like user input as literal spreadsheet text.
  if(/^[\s\u0000-\u001f]*[=+@-]|^[\t\r\n\u0000]/.test(text))text="'"+text;
  return '"'+text.replaceAll('"','""')+'"';
}
const line=values=>values.map(csvCell).join(',')+'\r\n';
export const csvHeader=()=> '\ufeff'+line(['Submission ID','Received at (UTC)','Name','WhatsApp','City of residence',...questions.map(q=>answerNames[q.id]),'Match score (%)','Score breakdown','Consent text','Terms version','Raw answers (JSON)','Enquiry type','Project','Configuration','Request']);
export function csvLead(row) {
  const property=isPropertyEnquiry(row);
  return line([row.submission_id,new Date(row.received_at).toISOString(),row.name,row.whatsapp,row.city,...questions.map(q=>row.answer_labels?.[q.id]??''),property?'':Math.round(Number(row.match_score)*100),row.score_breakdown,row.consent_text,row.terms_version,JSON.stringify(row.answers),property?'Property enquiry':'Construction quiz',row.answer_labels?.project??'',row.answer_labels?.configuration??'',row.answer_labels?.request??'']);
}
