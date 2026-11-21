import { business } from '../content/site.mjs';

export const escape = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
export const call = `<a class="button" href="tel:${business.telephone}">Call ${business.phone}</a>`;
export const contactLinks = `<div class="action-row">${call}<a class="text-link" href="mailto:${business.email}">Email Megabase</a></div>`;

export function image(name, alt, { eager = false, sizes = '(max-width: 760px) calc(100vw - 40px), 50vw' } = {}) {
  const widths = name === 'residence' ? [480,800,1200] : [480,800];
  return `<img src="/assets/${name}-800.jpg" srcset="${widths.map(w=>`/assets/${name}-${w}.jpg ${w}w`).join(', ')}" sizes="${sizes}" alt="${escape(alt)}" width="800" height="500" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'}>`;
}

export function layout(page, { stylesheet, script, siteUrl, indexable, contentApproved }) {
  const nav = [['/packages/','Packages'],['/services/','Services'],['/how-it-works/','How It Works'],['/projects/','Projects'],['/about/','About'],['/faqs/','FAQs'],['/contact/','Contact']];
  const canonical = siteUrl ? `${siteUrl}${page.route}` : '';
  const crumbs = page.route === '/' ? [] : [['/','Home'], ...(page.parents || []), [page.route,page.label]];
  const schema = [];
  if (siteUrl && contentApproved) {
    schema.push({ '@context':'https://schema.org','@type':'WebPage',name:page.title,url:canonical,description:page.description });
    if (crumbs.length) schema.push({ '@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:crumbs.map(([url,name],i)=>({ '@type':'ListItem',position:i+1,name,item:siteUrl+url })) });
    if (page.route === '/') schema.push({ '@context':'https://schema.org','@type':'Organization',name:business.name,legalName:business.legalName,url:siteUrl+'/',logo:siteUrl+'/assets/megabase-logo.jpg',telephone:business.phone,email:business.email,address:{'@type':'PostalAddress',streetAddress:'Unit No 811, Tower A, ATS Bouquet, Sector 132',addressLocality:'Noida',addressRegion:'Uttar Pradesh',postalCode:'201304',addressCountry:'IN'} });
  }
  return `<!doctype html>
<html lang="en-IN"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#182b3a"><title>${escape(page.title)}</title>
<meta name="description" content="${escape(page.description)}"><meta name="robots" content="${indexable ? 'index, follow, max-image-preview:large' : 'noindex, nofollow'}">
<meta property="og:type" content="${page.article ? 'article' : 'website'}"><meta property="og:locale" content="en_IN"><meta property="og:site_name" content="Megabase Infratech">
<meta property="og:title" content="${escape(page.title)}"><meta property="og:description" content="${escape(page.description)}"><meta name="twitter:card" content="summary_large_image">
${canonical ? `<link rel="canonical" href="${canonical}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${siteUrl}/assets/residence-1200.jpg"><meta property="og:image:alt" content="${escape(page.socialImageAlt||'Illustrative Megabase residential visual')}"><meta name="twitter:image" content="${siteUrl}/assets/residence-1200.jpg"><meta name="twitter:image:alt" content="${escape(page.socialImageAlt||'Illustrative Megabase residential visual')}">` : ''}
${schema.map(item=>`<script type="application/ld+json">${JSON.stringify(item).replaceAll('<','\\u003c')}</script>`).join('\n')}
<link rel="icon" type="image/jpeg" href="/assets/megabase-logo.jpg"><link rel="stylesheet" href="${stylesheet}">
${page.route==='/' ? '<link rel="preload" as="image" href="/construction/home-g1/0.webp">' : ''}
<script type="module" src="${script}"></script></head><body>
<a class="skip-link" href="${page.route==='/' ? '#home-information' : '#content'}">${page.route==='/' ? 'Skip quiz to home information' : 'Skip to content'}</a>
<header class="site-header"><div class="header-inner"><a class="brand" href="/" aria-label="Megabase Infratech — home"><img src="/assets/megabase-logo.jpg" alt="Megabase Infratech" width="116" height="64"></a>
<button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-nav" hidden>Menu</button>
<nav id="site-nav" aria-label="Main navigation">${nav.map(([route,label])=>`<a href="${route}" ${page.route.startsWith(route) ? 'aria-current="page"' : ''}>${label}</a>`).join('')}</nav></div></header>
<main id="content" tabindex="-1">${crumbs.length ? `<nav class="container breadcrumbs" aria-label="Breadcrumb"><ol>${crumbs.map(([route,label],i)=>`<li>${i===crumbs.length-1 ? `<span aria-current="page">${escape(label)}</span>` : `<a href="${route}">${escape(label)}</a>`}</li>`).join('')}</ol></nav>` : ''}${page.body}</main>
<footer class="site-footer"><div class="container footer-grid"><div><p class="footer-brand">Megabase Infratech</p><p>${escape(business.legalName)}<br>Construction and property enquiries</p></div><div><h2>Get in touch</h2><a href="tel:${business.telephone}">${business.phone}</a><a href="${business.whatsapp}">WhatsApp Megabase</a><a href="mailto:${business.email}">${business.email}</a></div><div><h2>Noida office</h2><address>${escape(business.address)}</address></div></div>
<nav class="container footer-links-grid" aria-label="More pages"><div><h2>Construction</h2><a href="/packages/">Packages &amp; Pricing</a><a href="/how-it-works/">How It Works</a><a href="/materials-and-quality/">Materials &amp; Quality</a></div><div><h2>Services</h2><a href="/services/residential/">Independent homes</a><a href="/services/pg-buildings/">PG buildings</a><a href="/services/commercial/">Commercial &amp; offices</a><a href="/services/interiors/">Interiors</a><a href="/services/rebuilding/">Rebuilding</a></div><div><h2>Company &amp; locations</h2><a href="/about/">About Megabase</a><a href="/projects/">Our Projects</a><a href="/locations/">Service Locations</a><a href="/locations/noida-ncr/">Noida &amp; NCR</a><a href="/locations/lucknow/">Lucknow</a></div><div><h2>Useful information</h2><a href="/faqs/">FAQs</a><a href="/blog/">Buyer Guides</a><a href="/contact/">Contact</a><a href="/privacy-policy/">Privacy Policy</a><a href="/terms-and-conditions/">Terms and Conditions</a></div></nav>
<div class="container footer-bottom"><p>© <span id="year">2026</span> Megabase Infratech</p><div><a href="/privacy-policy/">Privacy</a><a href="/terms-and-conditions/">Enquiry terms</a><a href="#content">Back to top</a></div></div></footer></body></html>`;
}
