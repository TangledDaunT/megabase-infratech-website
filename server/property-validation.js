import {projectBySlug,propertyTermsVersion,propertyConsent} from '../content/project-data.mjs';
export {propertyConsent};
export function validatePropertyLead(body) {
  if(!body||typeof body!=='object'||Array.isArray(body))throw new Error('Invalid enquiry.');
  const {submissionId,contact}=body;
  if(typeof submissionId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(submissionId))throw new Error('Invalid submission ID.');
  const project=projectBySlug(body.project);
  if(!project)throw new Error('Please choose a valid project.');
  if(![...project.configurations.map(c=>c.id),'undecided'].includes(body.configuration))throw new Error('Please choose a configuration.');
  if(!contact||typeof contact!=='object'||Array.isArray(contact))throw new Error('Please enter your name and WhatsApp number.');
  const name=typeof contact.name==='string'?contact.name.trim():'';
  if(!name||name.length>80||/[\u0000-\u001f]/.test(name))throw new Error('Please enter your name, up to 80 characters.');
  const value=typeof contact.value==='string'?contact.value.replace(/[\s()-]/g,''):'';
  if(contact.method!=='whatsapp'||!/^\+91[6-9]\d{9}$/.test(value))throw new Error('Please enter a valid 10-digit Indian WhatsApp number.');
  if(contact.consent!==true)throw new Error('Please agree to contact about this property enquiry.');
  if(body.termsVersion!==propertyTermsVersion)throw new Error('Please reload the page and accept the current contact consent.');
  return {submissionId,answers:{type:'property_enquiry',project:project.slug,configuration:body.configuration,request:'site_visit',location:project.locationKey},contact:{name,city:'',value,method:'whatsapp',consent:true},termsVersion:propertyTermsVersion};
}
