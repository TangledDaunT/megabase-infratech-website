import pg from 'pg';
import {attachDatabasePool} from '@vercel/functions';
let pool;
const fields='submission_id, received_at, name, whatsapp, city, answers, answer_labels, match_score, score_breakdown, consent_text, terms_version';
function getAdminPool() {
  if(!pool) {
    if(!process.env.ADMIN_DATABASE_URL)throw new Error('Admin database not configured');
    pool=new pg.Pool({connectionString:process.env.ADMIN_DATABASE_URL,max:2,idleTimeoutMillis:5000,connectionTimeoutMillis:10000});
    pool.on('error',()=>console.error('Admin database connection interrupted'));
    if(process.env.VERCEL)attachDatabasePool(pool);
  }
  return pool;
}
function filter(q) {
  const needle=q.replace(/[\\%_]/g,'\\$&');
  return {sql:q?`WHERE (name ILIKE $1 OR whatsapp ILIKE $1 OR city ILIKE $1 OR answer_labels->>'location' ILIKE $1 OR answer_labels->>'type' ILIKE $1 OR answer_labels->>'project' ILIKE $1 OR answer_labels->>'configuration' ILIKE $1)`:'',values:q?[`%${needle}%`]:[]};
}
export function createAdminStore(db={query:(...args)=>getAdminPool().query(...args)}) {
  return {
    configured:()=>Boolean(process.env.ADMIN_DATABASE_URL),
    async list({q='',page=1,pageSize=50}={}) {
      const f=filter(q);
      const count=await db.query(`SELECT count(*)::int AS total FROM public.leads ${f.sql}`,f.values);
      const total=count.rows[0].total;
      page=Math.min(page,Math.max(1,Math.ceil(total/pageSize)));
      const {rows}=await db.query(`SELECT ${fields} FROM public.leads ${f.sql} ORDER BY received_at DESC, submission_id DESC LIMIT $${f.values.length+1} OFFSET $${f.values.length+2}`,[...f.values,pageSize,(page-1)*pageSize]);
      return {rows,total,page,pageSize};
    },
    async get(id) {const {rows}=await db.query(`SELECT ${fields} FROM public.leads WHERE submission_id=$1::uuid`,[id]);return rows[0]||null;},
    async *export({q=''}={}) {
      const f=filter(q),snapshot=new Date().toISOString();let cursor;
      // Fixed snapshot and a stable key avoid duplicates while enquiries arrive.
      while(true) {
        const values=[...f.values,snapshot];
        const clauses=[...(f.sql?[f.sql.slice(6)]:[]),`received_at <= $${values.length}::timestamptz`];
        if(cursor) {values.push(cursor.received_at,cursor.submission_id);clauses.push(`(received_at,submission_id) < ($${values.length-1}::timestamptz,$${values.length}::uuid)`);}
        const {rows}=await db.query(`SELECT ${fields} FROM public.leads WHERE ${clauses.join(' AND ')} ORDER BY received_at DESC, submission_id DESC LIMIT 250`,values);
        if(!rows.length)return;
        yield rows;cursor=rows.at(-1);if(rows.length<250)return;
      }
    }
  };
}
