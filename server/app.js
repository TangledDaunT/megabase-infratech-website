import express from 'express';
import {rateLimit} from 'express-rate-limit';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateLead} from './validation.js';
import {validatePropertyLead} from './property-validation.js';
import {appendLead,isConfigured} from './storage.js';
import {createAdminRouter} from './admin.js';
const defaultDirectory=fileURLToPath(new URL('../dist/',import.meta.url));
export function createApp({directory=defaultDirectory,saveLead=appendLead,configured=isConfigured,admin}={}) {
  const app=express(); app.disable('x-powered-by');
  if(process.env.VERCEL) app.set('trust proxy',1);
  app.use((req,res,next)=>{
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; media-src 'self' https:; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'self'");
    res.setHeader('Cache-Control',req.path.startsWith('/api/')?'no-store':'no-cache'); next();
  });
  app.use(express.json({limit:'12kb'}));
  app.use('/admin',createAdminRouter(admin));
  app.get('/api/config',(req,res)=>res.json({acceptingLeads:configured(),galleryUrl:/^https:\/\//.test(process.env.PROJECT_GALLERY_URL||'')?process.env.PROJECT_GALLERY_URL:null}));
  const requests=new Map();
  const limit=rateLimit({windowMs:15*60*1000,limit:12,standardHeaders:'draft-8',legacyHeaders:false,message:{message:'Thodi der baad dobara koshish karein.'}});
  app.post(['/api/leads','/api/property-enquiries'],limit,async(req,res)=>{
    const property=req.path==='/api/property-enquiries';
    const origin=req.get('origin');
    if(origin) { try { if(new URL(origin).host!==req.get('host')) return res.status(403).json({message:'Invalid origin.'}); } catch { return res.status(403).json({message:'Invalid origin.'}); } }
    if(req.body?.website) return res.status(400).json({message:'Invalid submission.'});
    let lead; try { lead=(property?validatePropertyLead:validateLead)(req.body); } catch(err) { return res.status(400).json({message:err.message}); }
    if(!configured()) return res.status(503).json({message:property?'Enquiries are temporarily unavailable. Your details have not been sent. Please call or WhatsApp the team.':'Form abhi live nahi hai. Aapki details bheji nahi gayi hain.'});
    for(const [id,item] of requests) if(Date.now()-item.created>86400000) requests.delete(id);
    const signature=JSON.stringify(lead); let entry=requests.get(lead.submissionId);
    if(entry&&entry.signature!==signature) return res.status(409).json({message:property?'This enquiry ID was already used with different details. Reload the page to start a new enquiry.':'Details badli hain. Page refresh karke dobara bharein.'});
    if(!entry) { const promise=Promise.resolve().then(()=>saveLead(lead)); entry={signature,promise,created:Date.now()}; requests.set(lead.submissionId,entry); }
    try { await entry.promise; res.json({ok:true}); }
    catch(err) { requests.delete(lead.submissionId); res.status(err.code==='LEAD_CONFLICT'?409:502).json({message:property?(err.code==='LEAD_CONFLICT'?'This enquiry ID was already used with different details. Reload the page to start a new enquiry.':'Your enquiry could not be saved. Please try again or contact the team directly.'):(err.code==='LEAD_CONFLICT'?'Details badli hain. Page refresh karke dobara bharein.':'Details save nahi ho paayi. Kripya dobara koshish karein.')}); }
  });
  app.use('/api',(req,res)=>res.status(404).json({message:'API route not found.'}));
  app.get('/terms.html',(req,res)=>res.redirect(301,'/terms-and-conditions/'));
  app.get(['/projects/sector-110-noida','/projects/sector-110-noida/'],(req,res)=>res.redirect(301,'/projects/bhumi-residency/'));
  let routesPromise;
  app.use(async(req,res)=>{
    if(!['GET','HEAD'].includes(req.method)) return res.status(405).set('Allow','GET, HEAD').send('Method not allowed.');
    const routes=await (routesPromise??=readFile(path.join(directory,'routes.json'),'utf8').then(JSON.parse));
    let file;
    try {
      const requested=decodeURIComponent(req.path);
      if(routes.includes(requested)) file=path.join(directory,requested,'index.html');
      else if(routes.includes(requested+'/')) return res.redirect(301,requested+'/');
      else if(/^\/assets\/[a-zA-Z0-9_.-]+\.(?:js|css|jpg|jpeg|png|webp|avif|mp4|webm|vtt)$/.test(requested)||/^\/construction\/(?:home-ground|home-g1|home-g2|home-g3|pg|commercial|interiors)\/[0-3]\.webp$/.test(requested)||['/robots.txt','/sitemap.xml'].includes(requested)) file=path.join(directory,requested);
      if(!file) throw new Error('Not found');
      if(file.endsWith('.html')) {
        const html=await readFile(file,'utf8');
        if(/name="robots" content="noindex/.test(html)) res.setHeader('X-Robots-Tag','noindex, nofollow');
        return res.type('html').send(html);
      }
      return res.sendFile(file,(err)=>{if(err&&!res.headersSent) res.status(404).type('text').send('Not found');});
    } catch {
      const html=await readFile(path.join(directory,'404.html'),'utf8');
      return res.status(404).set('X-Robots-Tag','noindex').type('html').send(html);
    }
  });
  app.use((err,req,res,next)=>res.status(err.status||500).json({message:err.status===413?'Submission bahut badi hai.':'Request process nahi ho paayi.'}));
  return app;
}
