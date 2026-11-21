import { business, faqs, articles } from './site.mjs';
import { escape, image, contactLinks } from '../templates/site.mjs';
import { readFile } from 'node:fs/promises';
import {getExpandedPages} from './expanded-pages.mjs';
import {corePage} from './core-pages.mjs';
import {projectCard,projectsPage,projectPage} from './project-pages.mjs';
import {projects} from './project-data.mjs';

const heading = (eyebrow,title,intro='') => `<header class="page-heading container"><p class="eyebrow">${eyebrow}</p><h1>${title}</h1>${intro ? `<p class="lede">${intro}</p>` : ''}</header>`;
const blogCards = () => `<div class="blog-grid">${articles.map((a,i)=>`<article><p class="eyebrow">Buyer guide</p><h2><a href="/blog/${a.slug}/">${a.title}</a></h2><p>${a.summary}</p><a class="text-link" href="/blog/${a.slug}/">Read the guide<span class="sr-only">: ${a.title}</span></a></article>`).join('')}</div>`;
const quiz = `<section id="quiz" class="construction-quiz" aria-label="Construction planning quiz" lang="hi-Latn"><div class="quiz-visual" aria-hidden="true"><div id="scene"><img class="architecture-frame is-visible" src="/construction/home-g1/0.webp" alt="" fetchpriority="high" width="1536" height="1024"></div></div><div class="quiz-experience"><section class="quiz-shell" aria-label="Project planning quiz"><div class="progress-meta"><span id="step-text">Sawaal 01 / 09</span><span id="percent">0%</span></div><div class="progress" role="progressbar" aria-label="Quiz progress" aria-valuemin="0" aria-valuemax="9" aria-valuenow="0"><div id="progress-fill"></div></div><div id="quiz-content"></div><noscript><p>Quiz chalane ke liye JavaScript enable karein, ya <a href="tel:${business.telephone}">Megabase ko call karein</a>.</p></noscript></section></div><p class="concept-note">Concept imagery · Actual design will differ.</p></section>`;

export async function getPages() {
  const terms = await readFile(new URL('./enquiry-terms-source.html',import.meta.url),'utf8');
  // Retain the original enquiry terms, including their version and wording.
  const termsBody = terms.match(/<main>([\s\S]*?)<\/main>/)[1].replace(/^<a[^>]*>[\s\S]*?<\/a>/,'').replace(/<footer>[\s\S]*?<\/footer>$/,'');
  const pages = [
    corePage('/',{quiz,projectCard:projectCard(),blogCards:blogCards()}),
    projectsPage(),
    ...projects.map(projectPage),
    corePage('/services/'),
    corePage('/about/'),
    { route:'/faqs/',label:'FAQs',title:'Frequently Asked Questions | Megabase Infratech',description:'Answers about Megabase’s project types, delivery scope, Noida apartment offering, construction quiz and arranging a site visit.',body:`${heading('FAQs','Questions before you get started.','Find the right next step for an apartment enquiry or a construction project.')}<section class="section section-after-heading"><div class="container faq-page"><div class="faq-list">${faqs.map(([q,a])=>`<details><summary>${escape(q)}</summary><p>${escape(a)}</p></details>`).join('')}</div><div class="contact-strip"><h2>Have another question?</h2>${contactLinks}</div></div></section>` },
    corePage('/contact/'),
    { route:'/terms-and-conditions/',label:'Terms and Conditions',title:'Terms and Conditions | Megabase Infratech',description:'Existing Megabase quiz enquiry terms, version 10 November 2026: project information, contact consent, data use and enquiry responsibilities.',body:`<section class="section section-after-heading"><div class="container prose legal-copy"><p><a class="text-link" href="/#quiz" data-return-to-quiz>Return to the construction quiz</a></p>${termsBody}</div></section>` },
    { route:'/blog/',label:'Blog',title:'Home Buyer Guides | Megabase Infratech Blog',description:'Practical guides to comparing apartment floor plans, preparing for a site visit and requesting the information needed to shortlist a home.',body:`${heading('Blog','Practical guides for home buyers.','Questions and checklists to help you compare information and prepare for a conversation.')}<section class="section section-after-heading"><div class="container">${blogCards()}</div></section>` },
  ];
  for (const article of articles) pages.push({route:`/blog/${article.slug}/`,parents:[['/blog/','Blog']],label:article.title,title:`${article.title} | Megabase Buyer Guides`,description:article.summary,article:true,body:`${heading('Buyer guide',article.title,article.summary)}<article class="section section-after-heading"><div class="container prose article-copy">${article.sections.map(([title,body])=>`<section><h2>${title}</h2><p>${body}</p></section>`).join('')}<aside class="article-source"><h2>Further information</h2><p><a href="${article.source.url}">${article.source.title}</a></p><p>This is a general information guide, not a claim about the status or specification of a Megabase property.</p></aside><div class="article-next"><a class="text-link" href="/blog/">All buyer guides</a><a class="text-link" href="/projects/">Explore the residential offering</a></div></div></article>`});
  return [...pages,...getExpandedPages()];
}
