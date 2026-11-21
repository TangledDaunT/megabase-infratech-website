// Local browser QA only. This file is not in the public build. No database or network storage.
import {createSiteServer} from '../scripts/serve.mjs';
const saved=new Map();
createSiteServer({configured:()=>true,saveLead:async lead=>{
 if(lead.contact.name==='Browser failure')throw new Error('Deliberate memory-fixture failure');
 const signature=JSON.stringify(lead),previous=saved.get(lead.submissionId);
 if(previous&&previous!==signature){const error=new Error('Fixture conflict');error.code='LEAD_CONFLICT';throw error;}
 saved.set(lead.submissionId,signature);
}}).listen(4181,'127.0.0.1',()=>console.log('Memory-only browser fixture: http://127.0.0.1:4181. No real leads are sent.'));
