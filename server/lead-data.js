import {isPropertyEnquiry,projectBySlug,propertyConsent} from '../content/project-data.mjs';
import {scoreLead} from './scoring.js';
import {answerLabels} from '../quiz/questions.js';
export function storedLeadData(lead) {
  if(!isPropertyEnquiry(lead))return {labels:answerLabels(lead.answers),score:scoreLead(lead.answers),consent:'I agree to the terms and conditions.'};
  const project=projectBySlug(lead.answers.project);
  if(!project)throw new Error('Unknown property project');
  const configuration=project.configurations.find(c=>c.id===lead.answers.configuration)?.label||'Help me choose';
  return {labels:{type:'Flat-buyer enquiry',project:project.name,configuration,request:'Site visit',location:project.location},score:{fraction:0,percentage:null,breakdown:'Not scored: property enquiry. Construction readiness scoring does not apply.'},consent:propertyConsent};
}
