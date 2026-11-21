export const SCORE_VERSION = '2026-11-07-approved';
// User-approved readiness criteria. This is not a statistical purchase probability.
export function scoreLead(answers) {
  const plot = answers.plot === 'owned' ? 40 : 0;
  const timeline = answers.timeline === 'now' ? 40 : answers.timeline === '1to3' ? 30 : 0;
  const budget = ['20to50', '50to100', 'over100'].includes(answers.budget) ? 20 : 0;
  return { percentage: plot + timeline + budget, fraction: (plot + timeline + budget) / 100,
    breakdown: `Plot ready: ${plot}/40; Start timeline: ${timeline}/40; Budget: ${budget}/20. ${SCORE_VERSION}` };
}
