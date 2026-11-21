export function constructionState(answers = {}, step = 0) {
  let variant = 'home-g1';
  if (answers.type === 'home' && ['ground','g1','g2','g3'].includes(answers.detail)) variant = `home-${answers.detail}`;
  if (['pg','commercial','interiors'].includes(answers.type)) variant = answers.type;
  // Floors and room layout are chosen before the frame is erected.
  // Each subsequent answer reveals another portion of construction, bottom to top.
  let progress = step < 4 ? Math.min(step * .12, .36) : 1;
  if (step === 4) progress = answers.detail ? 1.3 : 1;
  if (step === 5) progress = answers.budget ? 1.8 : 1.5;
  if (step === 6) progress = answers.timeline ? 2.2 : 2;
  if (step === 7) progress = answers.concerns?.length ? 2.65 : 2.4;
  if (step === 8) progress = answers.map ? 3 : 2.8;
  if (step >= 9) progress = 3;
  if (answers.type === 'interiors' && step < 4) progress = step * .2;
  return { variant, progress, stage: Math.min(3, Math.floor(progress)), duration: answers.timeline === 'now' ? 1000 : 1600 };
}
