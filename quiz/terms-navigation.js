// Preserve the live form only in this document's memory while reading its terms.
// Every route still has complete server-rendered HTML and works without this enhancement.
const metadataSelector = 'meta[name="description"],meta[name="robots"],meta[property^="og:"],meta[name^="twitter:"],link[rel="canonical"],script[type="application/ld+json"]';
const snapshotHead = (doc) => ({title:doc.title,nodes:[...doc.head.querySelectorAll(metadataSelector)].map(n=>n.cloneNode(true))});
function restoreHead(head) {
  document.title=head.title;
  document.head.querySelectorAll(metadataSelector).forEach(n=>n.remove());
  head.nodes.forEach(n=>document.head.append(n.cloneNode(true)));
}
let view=null;
let loading=false;
function show(which) {
  const item=view[which];
  document.querySelector('main').replaceWith(item.main);
  restoreHead(item.head);
  document.querySelectorAll('#site-nav a[aria-current]').forEach(a=>a.removeAttribute('aria-current'));
  window.scrollTo({top:item.scroll,behavior:'instant'});
  if(which==='quiz')view.returnLink.focus({preventScroll:true});
  else item.main.focus({preventScroll:true});
}
window.addEventListener('popstate',()=>{
  if(!view)return;
  if(location.pathname===view.quiz.path)show('quiz');
  else if(location.pathname===view.terms.path)show('terms');
});
document.addEventListener('click',async event=>{
  if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  const returnLink=event.target.closest('a[data-return-to-quiz],a[href="/#quiz"],a.brand[href="/"]');
  if(returnLink&&view&&location.pathname===view.terms.path){event.preventDefault();history.back();return;}
  const link=event.target.closest('#contact-form a[href="/terms-and-conditions/"]');
  if(!link)return;
  event.preventDefault();
  if(loading)return;
  loading=true;
  try {
    const response=await fetch(link.href,{headers:{Accept:'text/html'}});
    if(!response.ok)throw new Error('Terms unavailable');
    const doc=new DOMParser().parseFromString(await response.text(),'text/html');
    const termsMain=doc.querySelector('main');
    if(!termsMain)throw new Error('Terms unavailable');
    view={
      quiz:{main:document.querySelector('main'),head:snapshotHead(document),path:location.pathname,scroll:window.scrollY},
      terms:{main:document.importNode(termsMain,true),head:snapshotHead(doc),path:new URL(link.href).pathname,scroll:0},
      returnLink:link,
    };
    history.pushState({megabaseTerms:true},'',link.href);
    show('terms');
  } catch {
    const error=document.querySelector('#form-error');
    error.textContent='Terms abhi load nahi hui. Dobara koshish karein. Aapke jawaab yahin hain.';
  } finally {loading=false;}
});
