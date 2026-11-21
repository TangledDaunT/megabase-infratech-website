import {GoogleAuth} from 'google-auth-library';
import {toRow,headers} from './validation.js';
export const DEFAULT_SHEET_ID='19u2ye90ntWJo9FPQ00I98G1l8_8pT_k19KjuWzrt67A';
export function isConfigured(){return Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON||process.env.GOOGLE_APPLICATION_CREDENTIALS||(process.env.SHEETS_WEBHOOK_URL&&process.env.SHEETS_WEBHOOK_SECRET));}
let setup;
export async function prepareSheet(client,sheet,tab){
  const base=`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheet)}`;
  const quoted=`'${tab.replaceAll("'","''")}'`;
  const {data:metadata}=await client.request({url:base,params:{fields:'sheets.properties'}});
  const target=metadata.sheets.find(s=>s.properties.title===tab);
  if(!target)throw new Error('Lead sheet tab is missing');
  const {data:current}=await client.request({url:`${base}/values/${encodeURIComponent(quoted+'!A1:R1')}`});
  const existing=current.values?.[0]||[];
  if(existing.some(v=>v!=='')&&!headers.every((h,i)=>existing[i]===h))throw new Error('Lead sheet headers do not match; existing data was not changed');
  const sheetId=target.properties.sheetId;
  const requests=[];
  if(!existing.some(v=>v!==''))requests.push({updateCells:{start:{sheetId,rowIndex:0,columnIndex:0},rows:[{values:headers.map(h=>({userEnteredValue:{stringValue:h}}))}],fields:'userEnteredValue'}},{updateSheetProperties:{properties:{sheetId,gridProperties:{frozenRowCount:1}},fields:'gridProperties.frozenRowCount'}});
  requests.push({repeatCell:{range:{sheetId,startRowIndex:1,startColumnIndex:14,endColumnIndex:15},cell:{userEnteredFormat:{numberFormat:{type:'PERCENT',pattern:'0%'}}},fields:'userEnteredFormat.numberFormat'}},{updateCells:{start:{sheetId,rowIndex:0,columnIndex:14},rows:[{values:[{note:'Readiness score from approved rules. 100% means all criteria met, not a guaranteed purchase.'}]}],fields:'note'}});
  await client.request({url:base+':batchUpdate',method:'POST',data:{requests}});
}
export async function appendLead(lead){
  if(process.env.SHEETS_WEBHOOK_URL&&process.env.SHEETS_WEBHOOK_SECRET){
    const response=await fetch(process.env.SHEETS_WEBHOOK_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({secret:process.env.SHEETS_WEBHOOK_SECRET,row:toRow(lead)}),signal:AbortSignal.timeout(25000)});
    const result=await response.json();if(!response.ok||result.ok!==true)throw new Error('Sheet write failed');return;
  }
  const credentials=process.env.GOOGLE_SERVICE_ACCOUNT_JSON ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON) : undefined;
  const auth=new GoogleAuth({credentials,scopes:['https://www.googleapis.com/auth/spreadsheets']});
  const client=await auth.getClient();
  const sheet=process.env.GOOGLE_SHEET_ID||DEFAULT_SHEET_ID,tab=process.env.GOOGLE_SHEET_TAB||'Sheet1';
  if(!setup)setup=prepareSheet(client,sheet,tab).catch(error=>{setup=undefined;throw error;});
  await setup;
  const range=`'${tab.replaceAll("'","''")}'!A:R`;
  await client.request({url:`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheet)}/values/${encodeURIComponent(range)}:append`,method:'POST',params:{valueInputOption:'RAW',insertDataOption:'INSERT_ROWS'},data:{values:[toRow(lead)]},timeout:25000,retry:false});
}
