import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {build} from '../scripts/build.mjs';
import {createSiteServer} from '../scripts/serve.mjs';

test('preview contains all expanded initial-HTML pages, valid internal targets and no duplicate enquiry',async()=>{
 const outDir=await mkdtemp(path.join(os.tmpdir(),'megabase-pages-'));
 try {
  const result=await build({outDir,origin:'',indexSite:false,contentApproved:false});
  assert.equal(result.pages,27);
  const routes=JSON.parse(await readFile(path.join(outDir,'routes.json'),'utf8'));
  const titles=new Set();
  for(const route of routes) {
   const html=await readFile(path.join(outDir,route,'index.html'),'utf8');
   assert.match(html,/name="robots" content="noindex, nofollow"/);
   assert.doesNotMatch(html,/<iframe|id="enquiry-form"|Ask about a home|megabase-infra\.vercel\.app/);
   assert.equal(html.includes('id="property-enquiry"'),route==='/projects/bhumi-residency/');
   assert.equal([...html.matchAll(/<h1[\s>]/g)].length,1,route);
   assert.doesNotMatch(html,/rel="canonical"|application\/ld\+json/);
   const title=html.match(/<title>(.*?)<\/title>/)[1];assert.ok(!titles.has(title));titles.add(title);
   for(const match of html.matchAll(/(?:href|src)="(\/[^"?]*)"/g)) {
    const [target,hash]=match[1].split('#');
    const filename=routes.includes(target)?path.join(outDir,target,'index.html'):path.join(outDir,target);
    const bytes=await readFile(filename).catch(()=>assert.fail(`${route}: missing ${match[1]}`));
    if(hash)assert.ok(bytes.toString().includes(`id="${hash}"`),`${route}: missing anchor ${match[1]}`);
   }
  }
  const home=await readFile(path.join(outDir,'index.html'),'utf8');
  const hero=home.match(/<section id="quiz"[\s\S]*?<\/section><\/div><p class="concept-note">[\s\S]*?<\/section>/)[0];
  assert.doesNotMatch(hero,/class="brand|<header|<svg/);
  const terms=await readFile(path.join(outDir,'terms-and-conditions/index.html'),'utf8');
  assert.match(terms,/Version 10 November 2026/);
  const sourceTerms=await readFile(new URL('../content/enquiry-terms-source.html',import.meta.url),'utf8');
  const original=sourceTerms.match(/<main>([\s\S]*?)<\/main>/)[1].replace(/^<a[^>]*>[\s\S]*?<\/a>/,'').replace(/<footer>[\s\S]*?<\/footer>$/,'');
  assert.ok(terms.includes(original),'original versioned terms remain intact');
  await assert.rejects(readFile(path.join(outDir,'assets/source/residence.png')));
  await assert.rejects(build({outDir,origin:'',indexSite:true,contentApproved:true}));
  await assert.rejects(build({outDir,origin:'https://example.invalid',indexSite:true,contentApproved:false}));
 } finally {await rm(outDir,{recursive:true,force:true});}
});

test('production metadata, structured identity and sitemap match each public route',async()=>{
 const outDir=await mkdtemp(path.join(os.tmpdir(),'megabase-seo-'));
 try {
  await build({outDir,origin:'https://example.invalid',indexSite:true,contentApproved:true});
  const routes=JSON.parse(await readFile(path.join(outDir,'routes.json'),'utf8'));
  const sitemap=await readFile(path.join(outDir,'sitemap.xml'),'utf8');
  assert.equal([...sitemap.matchAll(/<loc>/g)].length,27);
  for(const route of routes) {
   const html=await readFile(path.join(outDir,route,'index.html'),'utf8');
   assert.ok(html.includes(`rel="canonical" href="https://example.invalid${route}"`));
   assert.ok(sitemap.includes(`<loc>https://example.invalid${route}</loc>`));
   assert.match(html,/content="index, follow, max-image-preview:large"/);
   const schemas=[...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map(m=>JSON.parse(m[1]));
   assert.equal(schemas.find(s=>s['@type']==='WebPage').url,`https://example.invalid${route}`);
   if(route==='/')assert.equal(schemas.find(s=>s['@type']==='Organization').name,'Megabase Infratech');
   else assert.equal(schemas.find(s=>s['@type']==='BreadcrumbList').itemListElement.at(-1).item,`https://example.invalid${route}`);
  }
  assert.doesNotMatch(sitemap,/404|terms\.html/);
  assert.doesNotMatch(await readFile(path.join(outDir,'_headers'),'utf8'),/X-Robots-Tag/);
  await assert.rejects(build({outDir,origin:'https://example.invalid/path',indexSite:false}));
 } finally {await rm(outDir,{recursive:true,force:true});}
});

test('public routes survive direct requests; compatibility redirects and genuine 404s work',async()=>{
 const server=createSiteServer({configured:()=>false});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin=`http://127.0.0.1:${server.address().port}`;
 try {
  const routes=JSON.parse(await readFile(new URL('../dist/routes.json',import.meta.url),'utf8'));
  for(const route of routes) {
   const response=await fetch(origin+route);assert.equal(response.status,200,route);
   assert.match(response.headers.get('x-robots-tag'),/noindex/);
  }
  for(const file of ['/README.md','/server/database.js','/assets/source/residence.png','/routes.json','/missing','/%2e%2e%2fpackage.json'])assert.equal((await fetch(origin+file)).status,404,file);
  const terms=await fetch(origin+'/terms.html',{redirect:'manual'});assert.equal(terms.status,301);assert.equal(terms.headers.get('location'),'/terms-and-conditions/');
  assert.equal((await fetch(origin+'/projects',{redirect:'manual'})).status,301);
  assert.equal((await fetch(origin+'/',{method:'POST',body:'dummy=not-a-lead'})).status,405);
  assert.equal((await fetch(origin+'/construction/home-g1/0.webp')).status,200);
 } finally {await new Promise(resolve=>server.close(resolve));}
});
