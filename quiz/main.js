import './style.css';
import './terms-navigation.js';
import { getQuestion } from './questions.js';
import { createScene } from './photo-scene.js';

const root = document.querySelector('.construction-quiz');
const scene = createScene(root.querySelector('#scene'));
const quiz = root.querySelector('#quiz-content');
let index = 0, answers = {}, draft = {}, submitting = false;
let contact = { name: '', value: '', consent: false };
const submissionId = crypto.randomUUID();
let config = { acceptingLeads: false, galleryUrl: null };
fetch('/api/config').then(r => r.json()).then(c => { config = c; }).catch(() => {});
const arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6"/></svg>';
const safe = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function preview() {
  scene.setAnswers(draft, index);
}
function progress() {
  const n = Math.min(index, 9);
  root.querySelector('#step-text').textContent = index < 9 ? `Sawaal ${String(index + 1).padStart(2, '0')} / 09` : 'Aakhri kadam';
  root.querySelector('#percent').textContent = `${Math.round(n / 9 * 100)}%`;
  root.querySelector('#progress-fill').style.width = `${n / 9 * 100}%`;
  root.querySelector('.progress').setAttribute('aria-valuenow', n);
}
function render(focus = false) {
  if (focus && innerWidth <= 760) root.scrollIntoView({ block: 'start', behavior: 'instant' });
  draft = structuredClone(answers); progress(); preview();
  if (index >= 9) { renderContact(focus); return; }
  const q = getQuestion(index, answers), selected = Array.isArray(answers[q.id]) ? answers[q.id] : [answers[q.id]];
  const multiple = q.multi && !q.singleChoice;
  const optionContent = (label, sub) => `<span class="option-copy"><span>${label}</span>${sub ? `<small>${sub}</small>` : ''}</span><span class="choice-mark" aria-hidden="true"></span>`;
  quiz.innerHTML = `<form id="question-form" class="question-enter"><h2 id="question-title" tabindex="-1">${q.title}</h2>${multiple ? '<p class="question-hint">Ek se zyada chun sakte hain.</p>' : ''}<fieldset class="options"><legend class="sr-only">${q.title}</legend>${q.options.map(([value, label, sub]) => multiple
    ? `<label class="option"><input type="checkbox" name="answer" value="${value}" ${selected.includes(value) ? 'checked' : ''}/>${optionContent(label, sub)}</label>`
    : `<button type="button" class="option${selected.includes(value) ? ' is-selected' : ''}" name="answer" value="${value}" aria-pressed="${selected.includes(value)}">${optionContent(label, sub)}</button>`).join('')}</fieldset><div class="actions"><button type="button" class="back" id="back" ${index === 0 ? 'disabled' : ''} aria-label="Pichhla sawaal">←</button>${multiple ? `<button class="next" type="submit" ${selected.some(Boolean) ? '' : 'disabled'}>Ho gaya${arrow}</button>` : ''}</div></form>`;
  const form = quiz.querySelector('form');
  const advance = () => {
    answers = structuredClone(draft);
    index++;
    render(true);
  };
  form.addEventListener('click', e => {
    const option = e.target.closest('button[name="answer"]');
    if (!option || !form.isConnected) return;
    if (q.id === 'type' && draft.type !== option.value) delete draft.detail;
    // Keep array-shaped answers compatible with existing lead storage.
    draft[q.id] = q.multi ? [option.value] : option.value;
    advance();
  });
  form.addEventListener('change', () => {
    if (!multiple) return;
    const values = [...form.querySelectorAll('input:checked')].map(el => el.value);
    draft[q.id] = values; form.querySelector('.next').disabled = !values.length; preview();
  });
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!multiple || !draft[q.id]?.length) return;
    advance();
  });
  form.querySelector('#back').onclick = () => { if (index) { index--; render(true); } };
  if (focus) form.querySelector('h2').focus({ preventScroll: true });
}
function renderContact(focus = false) {
  quiz.innerHTML = `<form id="contact-form" class="question-enter"><h2 tabindex="-1">Aapse kahan<br>contact karein?</h2><div class="contact-fields"><label>Aapka naam<input name="name" autocomplete="name" maxlength="80" required value="${safe(contact.name)}" placeholder="Poora naam" /></label><label>WhatsApp number<span class="phone-field"><span class="country-code">+91</span><input name="value" type="tel" inputmode="numeric" autocomplete="tel-national" pattern="[6-9][0-9]{9}" minlength="10" maxlength="10" required value="${safe(contact.value)}" placeholder="98765 43210" aria-label="WhatsApp number, 10 digits, country code +91" /></span></label><div class="consent"><input type="checkbox" id="terms-consent" name="consent" required ${contact.consent ? 'checked' : ''}/><label for="terms-consent">I agree to the <a href="/terms-and-conditions/">terms and conditions</a>.</label></div><div class="honeypot" aria-hidden="true"><label>Website<input name="website" tabindex="-1" autocomplete="off" /></label></div></div><p id="form-error" class="form-error" role="alert"></p><div class="actions"><button type="button" class="back" id="back" aria-label="Pichhla sawaal">←</button><button class="next" type="submit">Submit karein ${arrow}</button></div></form>`;
  const form = quiz.querySelector('form');
  const remember = () => { for (const key of ['name', 'value']) contact[key] = form.elements[key].value; contact.consent = form.elements.consent.checked; };
  form.elements.value.addEventListener('input', () => { form.elements.value.value = form.elements.value.value.replace(/\D/g, '').slice(0, 10); });
  form.elements.value.addEventListener('paste', e => { const digits = e.clipboardData.getData('text').replace(/\D/g, ''); if (digits.length === 12 && digits.startsWith('91')) { e.preventDefault(); form.elements.value.value = digits.slice(2); remember(); } });
  form.addEventListener('input', remember);
  form.querySelector('#back').onclick = () => { remember(); index = 8; render(true); };
  form.addEventListener('submit', async e => {
    e.preventDefault(); if (submitting) return; remember(); const error = form.querySelector('#form-error'); error.textContent = '';
    if (!/^[6-9]\d{9}$/.test(contact.value)) { error.textContent = 'Sahi 10-digit WhatsApp number dein.'; form.elements.value.focus(); return; }
    submitting = true; const button = form.querySelector('.next'); button.disabled = true; button.textContent = 'Bhej rahe hain…';
    try {
      const response = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ submissionId, answers, contact: { ...contact, value: '+91' + contact.value, method: 'whatsapp' }, termsVersion: '2026-11-10', website: form.elements.website.value }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.message || 'Details save nahi hui. Dobara koshish karein.');
      quiz.innerHTML = `<div class="success question-enter"><span class="success-check">✓</span><h2 tabindex="-1">Dhanyavaad!</h2><p>Hamari team WhatsApp par aapse judegi.</p>${config.galleryUrl ? `<a class="next gallery" href="${safe(config.galleryUrl)}" target="_blank" rel="noopener noreferrer">Hamare projects dekhiye ${arrow}</a>` : ''}</div>`;
      quiz.querySelector('h2').focus({ preventScroll: true }); root.querySelector('#step-text').textContent = 'Details mil gayi hain';
    } catch (err) { error.textContent = err.message; }
    finally { submitting = false; if (button.isConnected) { button.disabled = false; button.innerHTML = `Submit karein ${arrow}`; } }
  });
  if (focus) form.querySelector('h2').focus({ preventScroll: true });
}
render();
