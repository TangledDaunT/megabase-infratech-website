import {build} from './build.mjs';
import {createSiteServer} from './serve.mjs';
await build();
const port=Number(process.env.PORT||4180);
createSiteServer({configured:()=>false}).listen(port,'127.0.0.1',()=>console.log(`Megabase website: http://127.0.0.1:${port}. Run npm run build and reload after edits. Local lead storage is disabled.`));
