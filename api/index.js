import {createApp} from '../server/app.js';
// Keep review deployments disconnected unless storage is deliberately enabled.
export default createApp(process.env.ENABLE_LEAD_STORAGE === '1' ? {} : {configured:()=>false});
