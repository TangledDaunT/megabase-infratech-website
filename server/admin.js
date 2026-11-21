import express from 'express';
import {rateLimit} from 'express-rate-limit';
import {createAdminStore} from './admin-database.js';
import {validConfiguration,verifyPassword,issueSession,verifySession,readSession,sessionCookie,csrfToken,sameOrigin} from './admin-auth.js';
import {loginPage,listPage,detailPage,messagePage} from './admin-views.js';
import {csvHeader,csvLead} from './admin-csv.js';

export function createAdminRouter({store=createAdminStore(),config=()=>({passwordHash:process.env.ADMIN_PASSWORD_HASH,sessionSecret:process.env.ADMIN_SESSION_SECRET}),secure=Boolean(process.env.VERCEL)||process.env.NODE_ENV==='production',loginLimit=5}={}) {
  const router=express.Router();
  router.use((req,res,next)=>{
    res.set({'Cache-Control':'private, no-store, max-age=0','X-Robots-Tag':'noindex, nofollow, noarchive','Referrer-Policy':'same-origin','X-Frame-Options':'DENY','Vary':'Cookie','Content-Security-Policy':"default-src 'none'; style-src 'self'; img-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"});
    if(!validConfiguration(config())||!store.configured())return res.status(503).type('html').send(loginPage({unavailable:true,message:'Admin access is not configured yet. Please contact the website administrator.'}));
    next();
  });
  router.use(express.urlencoded({extended:false,limit:'2kb'}));
  const limited=rateLimit({windowMs:15*60*1000,limit:loginLimit,standardHeaders:'draft-8',legacyHeaders:false,skipSuccessfulRequests:true,handler:(req,res)=>res.status(429).type('html').send(loginPage({message:'Too many sign-in attempts. Please wait 15 minutes before trying again.'}))});
  router.post('/login',limited,async(req,res)=>{
    if(!sameOrigin(req))return res.status(403).type('html').send(loginPage({message:'Please sign in from the admin page.'}));
    if(!await verifyPassword(req.body?.password,config().passwordHash))return res.status(401).type('html').send(loginPage({message:'Incorrect password. Please try again.'}));
    res.set('Set-Cookie',sessionCookie(issueSession(config()),secure));return res.redirect(303,'/admin/');
  });
  router.use((req,res,next)=>{
    req.adminToken=readSession(req,secure);
    req.adminAuthenticated=verifySession(req.adminToken,config());
    req.adminCsrf=req.adminAuthenticated?csrfToken(req.adminToken,config()):'';
    next();
  });
  router.get('/',async(req,res)=>{
    if(!req.adminAuthenticated)return res.type('html').send(loginPage());
    const q=typeof req.query.q==='string'?req.query.q.trim().slice(0,100):'';
    const page=typeof req.query.page==='string'&&/^\d{1,6}$/.test(req.query.page)?Math.max(1,Number(req.query.page)):1;
    const result=await store.list({q,page});return res.type('html').send(listPage({...result,q,csrf:req.adminCsrf}));
  });
  router.use((req,res,next)=>{
    if(!req.adminAuthenticated){res.set('Set-Cookie',sessionCookie('',secure,true));return res.redirect(303,'/admin/');}next();
  });
  router.post('/logout',(req,res)=>{
    if(!sameOrigin(req)||req.body?.csrf!==req.adminCsrf)return res.status(403).type('html').send(messagePage('Request blocked','Please sign out using the button on the admin page.',req.adminCsrf));
    res.set('Set-Cookie',sessionCookie('',secure,true));return res.redirect(303,'/admin/');
  });
  router.get('/leads.csv',async(req,res)=>{
    const q=typeof req.query.q==='string'?req.query.q.trim().slice(0,100):'';
    const iterator=store.export({q})[Symbol.asyncIterator]();
    // Fetch the first batch before sending download headers so failures stay clear.
    const first=await iterator.next();
    res.set({'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="megabase-leads-${new Date().toISOString().slice(0,10)}.csv"`});
    res.write(csvHeader());
    try {
      let batch=first;
      while(!batch.done) {
        if(res.destroyed)break;
        for(const row of batch.value) {
          if(!res.write(csvLead(row)))await new Promise(resolve=>{const done=()=>{res.off('drain',done);res.off('close',done);resolve();};res.once('drain',done);res.once('close',done);});
          if(res.destroyed)break;
        }
        if(res.destroyed)break;batch=await iterator.next();
      }
      res.end();
    } finally {await iterator.return?.();}
  });
  router.get('/leads/:id/',async(req,res)=>{
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.params.id))return res.status(404).type('html').send(messagePage('Enquiry not found','This enquiry could not be found.',req.adminCsrf));
    const row=await store.get(req.params.id);
    return row?res.type('html').send(detailPage(row,req.adminCsrf)):res.status(404).type('html').send(messagePage('Enquiry not found','This enquiry could not be found.',req.adminCsrf));
  });
  router.use((req,res)=>res.status(404).type('html').send(messagePage('Page not found','This admin page could not be found.',req.adminCsrf)));
  router.use((err,req,res,next)=>{
    console.error('Admin request failed');
    if(res.headersSent)return res.destroy();
    const status=err.status===413?413:503;
    res.status(status).type('html').send(messagePage(status===413?'Request too large':'Unable to load leads',status===413?'Please submit a smaller request.':'Please try again shortly. Your enquiries have not been changed.',req.adminCsrf));
  });
  return router;
}
