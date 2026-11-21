import pg from 'pg';
import {attachDatabasePool} from '@vercel/functions';
import {createHash} from 'node:crypto';
import {storedLeadData} from './lead-data.js';
let pool;
export function getPool() {
  if (!pool) {
    pool = new pg.Pool({connectionString:process.env.DATABASE_URL,max:3,idleTimeoutMillis:5000,connectionTimeoutMillis:10000});
    pool.on('error',()=>console.error('Lead database connection interrupted'));
    if(process.env.VERCEL) attachDatabasePool(pool);
  }
  return pool;
}
export function leadFingerprint(lead) {
  return createHash('sha256').update(JSON.stringify(lead)).digest('hex');
}
export async function saveDatabaseLead(lead, db=getPool()) {
  const fingerprint=leadFingerprint(lead), {score,labels,consent}=storedLeadData(lead);
  await db.query(`INSERT INTO public.leads
    (submission_id,name,whatsapp,city,answers,answer_labels,match_score,score_breakdown,consent_text,terms_version,fingerprint)
    VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8,$9,$10,$11)
    ON CONFLICT (submission_id) DO NOTHING`,
    // The legacy schema requires nonempty city text; the current quiz omits it.
    [lead.submissionId,lead.contact.name,lead.contact.value,lead.contact.city || 'Not collected',JSON.stringify(lead.answers),JSON.stringify(labels),score.fraction,score.breakdown,consent,lead.termsVersion,fingerprint]);
  // A separate statement observes concurrent inserts after ON CONFLICT has waited.
  const {rows}=await db.query('SELECT fingerprint FROM public.leads WHERE submission_id=$1',[lead.submissionId]);
  if(rows[0]?.fingerprint!==fingerprint) {
    const error=new Error('Submission ID already used with different details');error.code='LEAD_CONFLICT';throw error;
  }
}
