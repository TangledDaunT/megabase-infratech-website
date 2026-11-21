import {constructionState} from './construction-state.js';

// Photographic construction plates are revealed bottom-up, from a locked camera.
// Images decode before display; stale loads cannot overwrite a newer answer.
export function createScene(container) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const cache = new Map();
  let version = 0, currentVariant = 'home-g1', currentProgress = 0, motions = [];
  container.innerHTML = '';
  function createGroup(variant) {
    const group = document.createElement('div'); group.className = 'construction-group';
    for (let i = 0; i < 4; i++) {
      const layer = document.createElement('div'); layer.className = 'construction-layer';
      const img = new Image(); img.alt = ''; img.className = 'architecture-frame is-visible';
      img.src = `/construction/${variant}/${i}.webp`; img.decoding = 'async';
      if (i === 0) img.fetchPriority = 'high';
      layer.append(img); layer.style.clipPath = i === 0 ? 'inset(0)' : 'inset(100% 0 0 0)';
      group.append(layer);
    }
    return group;
  }
  let group = createGroup(currentVariant); container.append(group);
  function load(variant) {
    if (!cache.has(variant)) {
      const pending = Promise.all([0,1,2,3].map(i => {
        const img = new Image(); img.src = `/construction/${variant}/${i}.webp`; return img.decode();
      })).catch(e => { cache.delete(variant); throw e; });
      cache.set(variant, pending);
    }
    return cache.get(variant);
  }
  const clip = (progress, layer) => `inset(${(1 - Math.max(0, Math.min(1, progress - layer + 1))) * 100}% 0 0 0)`;
  function settle() {
    motions.forEach(a => a.cancel()); motions = [];
    [...group.children].forEach((el,i) => { el.style.clipPath = i === 0 ? 'inset(0)' : clip(currentProgress,i); });
  }
  async function setAnswers(answers, step) {
    const target = constructionState(answers, step), token = ++version;
    try { await load(target.variant); } catch { return; }
    if (token !== version) return;
    const different = target.variant !== currentVariant;
    if (different) {
      const next = createGroup(target.variant);
      await Promise.all([...next.querySelectorAll('img')].map(img=>img.decode()));
      if (token !== version) return;
      settle(); const old = group; group = next;
      container.append(group); currentVariant = target.variant;
      const fade = group.animate([{opacity:0},{opacity:1}],{duration:reduced.matches ? 0 : 450,fill:'both'});
      fade.finished.then(()=>{old.remove();fade.cancel();}).catch(()=>old.remove());
      currentProgress = 0;
    }
    const starts = [...group.children].map(el=>getComputedStyle(el).clipPath);
    motions.forEach(a=>a.cancel()); motions=[];
    [...group.children].forEach((el,i)=>{
      const end = i === 0 ? 'inset(0)' : clip(target.progress,i);
      el.style.clipPath = end;
      if (i && !reduced.matches && starts[i] !== end) motions.push(el.animate([{clipPath:starts[i]},{clipPath:end}],{duration:target.duration,easing:'cubic-bezier(.22,.65,.3,1)'}));
    });
    currentProgress = target.progress;
    container.dataset.variant=currentVariant; container.dataset.progress=String(currentProgress);
    container.dataset.stage=String(target.stage);
  }
  reduced.addEventListener('change',()=>{ if (reduced.matches) settle(); });
  document.addEventListener('visibilitychange',()=>{for(const motion of motions) document.hidden ? motion.pause() : motion.play();});
  return { setAnswers };
}
