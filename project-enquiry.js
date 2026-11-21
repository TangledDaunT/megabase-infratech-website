const form=document.querySelector('#property-enquiry');
if(form) {
  const status=form.querySelector('#property-enquiry-status'),submit=form.querySelector('button[type="submit"]');
  const submissionId=crypto.randomUUID();let saved=false;
  fetch('/api/config').then(r=>r.ok?r.json():Promise.reject()).then(config=>{
    if(config.acceptingLeads)submit.disabled=false;
    else status.textContent='Online enquiries are temporarily unavailable. Please call or WhatsApp the team to arrange a visit.';
  }).catch(()=>{status.textContent='We could not check online enquiry availability. Please reload the page, or call or WhatsApp the team.';});
  document.querySelectorAll('[data-project-configuration]').forEach(link=>link.addEventListener('click',()=>{
    if(!saved)form.elements.configuration.value=link.dataset.projectConfiguration;
    document.querySelector('#enquiry').focus({preventScroll:true});
  }));
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(saved||submit.disabled||!form.reportValidity())return;
    status.textContent='Saving your enquiry…';submit.disabled=true;submit.textContent='Saving…';
    try {
      const response=await fetch('/api/property-enquiries',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({submissionId,project:form.dataset.project,configuration:form.elements.configuration.value,contact:{name:form.elements.name.value,value:'+91'+form.elements.phone.value,method:'whatsapp',consent:form.elements.consent.checked},termsVersion:form.dataset.termsVersion,website:form.elements.website.value})});
      const result=await response.json();
      if(!response.ok||result.ok!==true)throw new Error(result.message||'Your enquiry could not be saved. Please try again.');
      saved=true;form.reset();for(const control of form.elements)control.disabled=true;
      status.textContent=`Thank you. Your enquiry has been saved. Megabase will contact you about ${form.dataset.projectName} and arrange a suitable visit.`;submit.textContent='Enquiry saved';
    } catch(error) {status.textContent=error.message==='Failed to fetch'?'Your enquiry has not been confirmed. Check your connection and try again, or contact the team directly.':error.message;submit.disabled=false;submit.textContent='Request a site visit';}
  });
}
