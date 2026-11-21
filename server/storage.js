import {appendLead as appendSheetLead,isConfigured as sheetConfigured} from './sheets.js';
import {saveDatabaseLead} from './database.js';
import {isPropertyEnquiry} from '../content/project-data.mjs';
export const isConfigured=()=>Boolean(process.env.DATABASE_URL)||sheetConfigured();
export async function appendLead(lead){
  if(process.env.DATABASE_URL) return saveDatabaseLead(lead);
    if(isPropertyEnquiry(lead))throw new Error('Property enquiries require the lead database');
  return appendSheetLead(lead);
}
