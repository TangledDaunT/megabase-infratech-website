import { mkdir, writeFile, copyFile, readdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { build as bundle } from 'vite';
import { getPages } from '../content/pages.mjs';
import { layout } from '../templates/site.mjs';
export const root = fileURLToPath(new URL('../',import.meta.url));
export async function build({outDir=path.join(root,'dist'),origin=process.env.SITE_URL||(process.env.VERCEL_PROJECT_PRODUCTION_URL?`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`:''),indexSite=process.env.INDEX_SITE==='1',contentApproved=process.env.CONTENT_APPROVED==='1'}={}) {
  let siteUrl='';
  if(origin) {
    const url=new URL(origin);
    if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash) throw new Error('SITE_URL must be an HTTPS origin without credentials, a subpath, a query or a fragment.');
    siteUrl=url.origin;
  }
  if(indexSite&&(!siteUrl||!contentApproved)) throw new Error('Indexable output requires SITE_URL and CONTENT_APPROVED=1. Preview builds remain noindex.');
  const result=await bundle({root,configFile:false,publicDir:path.join(root,'public'),logLevel:'warn',build:{outDir,emptyOutDir:true,cssCodeSplit:false,rollupOptions:{input:path.join(root,'main.js'),output:{entryFileNames:'assets/site.js'}}}});
  const outputs=(Array.isArray(result)?result:[result]).flatMap(r=>r.output);
  const stylesheet='/'+outputs.find(o=>o.type==='asset'&&o.fileName.endsWith('.css')).fileName;
  const script='/assets/site.js';
  await mkdir(path.join(outDir,'assets'),{recursive:true});
  for(const item of await readdir(path.join(root,'assets'),{withFileTypes:true})) {
    if(item.isFile()&&/\.(jpg|jpeg|webp|avif|png|mp4|webm|vtt)$/i.test(item.name)) await copyFile(path.join(root,'assets',item.name),path.join(outDir,'assets',item.name));
  }
  const pages=await getPages();
  for(const page of pages) {
    const target=path.join(outDir,page.route,'index.html');
    await mkdir(path.dirname(target),{recursive:true});
    await writeFile(target,layout(page,{stylesheet,script,siteUrl,indexable:indexSite,contentApproved}));
  }
  const notFound={route:'/404/',label:'Page not found',title:'Page not found | Megabase Infratech',description:'The requested Megabase page could not be found.',body:'<section class="section container"><h1>Page not found</h1><p class="section-copy">The address may have changed.</p><a class="button" href="/">Return to the homepage</a></section>'};
  await writeFile(path.join(outDir,'404.html'),layout(notFound,{stylesheet,script,siteUrl:'',indexable:false,contentApproved:false}));
  await writeFile(path.join(outDir,'routes.json'),JSON.stringify(pages.map(p=>p.route)));
  await writeFile(path.join(outDir,'robots.txt'),`User-agent: *\nAllow: /\nDisallow: /admin/\n${indexSite?`Sitemap: ${siteUrl}/sitemap.xml\n`:''}`);
  await writeFile(path.join(outDir,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${indexSite?pages.map(p=>`<url><loc>${siteUrl}${p.route}</loc></url>`).join(''):''}</urlset>\n`);
  await writeFile(path.join(outDir,'_headers'),`/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n${indexSite?'':'  X-Robots-Tag: noindex, nofollow\n'}`);
  return {outDir,indexable:indexSite,canonical:siteUrl||null,pages:pages.length};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) console.log(JSON.stringify(await build(),null,2));
