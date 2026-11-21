import './styles.css';
import { video } from './site.config.js';
const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('#site-nav');
menuButton.hidden = false;
function closeMenu(restoreFocus = false) {
  menuButton.setAttribute('aria-expanded', 'false');
  nav.classList.remove('is-open');
  if (restoreFocus) menuButton.focus();
}
menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(open));
  nav.classList.toggle('is-open', open);
});
nav.addEventListener('click', (event) => {
  const link = event.target.closest('a');
  if (!link) return;
  closeMenu();
  const destination = new URL(link.href);
  if (destination.pathname === location.pathname && destination.hash) {
    const target = document.getElementById(destination.hash.slice(1));
    if (target) { target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
  }
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') closeMenu(true);
});
document.addEventListener('click', (event) => { if (!event.target.closest('.site-header')) closeMenu(); });
window.matchMedia('(min-width: 1024px)').addEventListener('change', () => closeMenu());
if (document.querySelector('.construction-quiz')) {
  import('./quiz/main.js').catch(() => {
    const message = document.createElement('p');
    message.textContent = 'Quiz load nahi ho paaya. Page reload karein, ya +91 96437 20720 par call karein.';
    document.querySelector('#quiz-content').append(message);
  });
}
const player = document.querySelector('#project-video');
if(document.querySelector('#property-enquiry'))import('./project-enquiry.js').catch(()=>{
  document.querySelector('#property-enquiry-status').textContent='Online enquiries could not load. Please call or WhatsApp the team to arrange a visit.';
});
if (player && video.src) {
  try {
    const url = new URL(video.src, location.origin);
    if (url.protocol !== 'https:' && url.origin !== location.origin) throw new Error('Unsupported video URL');
    player.addEventListener('error', () => {
      player.hidden = true;
      document.querySelector('#video-space > img').hidden = false;
      const empty = document.querySelector('#video-empty');
      empty.querySelector('strong').textContent = 'Video unavailable right now';
      empty.hidden = false;
    }, true);
    const source = document.createElement('source');
    source.src = url.href; source.type = video.type; player.append(source);
    if (video.captionsSrc) {
      const track = document.createElement('track');
      Object.assign(track, { kind:'captions',src:video.captionsSrc,srclang:video.captionsLanguage,label:video.captionsLabel,default:true });
      player.append(track);
    }
    document.querySelector('#video-empty').hidden = true;
    document.querySelector('#video-space > img').hidden = true;
    player.hidden = false;
  } catch { /* Keep the placeholder if the configured URL is invalid. */ }
}
document.querySelector('#year').textContent = String(new Date().getFullYear());
