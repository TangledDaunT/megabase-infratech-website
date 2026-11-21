import http from 'node:http';
import {pathToFileURL} from 'node:url';
import {createApp} from '../server/app.js';
export function createSiteServer(options={}) { return http.createServer(createApp(options)); }
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  const port=Number(process.env.PORT||4180);
  const options=process.env.ENABLE_LEAD_STORAGE==='1'?{}:{configured:()=>false};
  createSiteServer(options).listen(port,'127.0.0.1',()=>console.log(`Megabase website: http://127.0.0.1:${port} (local preview; no storage unless explicitly enabled)`));
}
