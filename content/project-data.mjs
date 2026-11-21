export const projects=[{
  slug:'bhumi-residency',name:'Bhumi Residency',location:'Sector 110, Noida',state:'Uttar Pradesh',
  type:'Premium builder floor',builder:'Megabase Infratech',badge:'Ready Soon',floors:6,flats:18,perFloor:3,
  status:'Construction nearly complete',possession:'January 2027',image:'residence',
  maps:'https://maps.app.goo.gl/ELxwjgXmq7UaeXUm7',
  locationKey:'noida',whatsappMessage:"Hi, I'm interested in Bhumi Residency, Sector 110.",
  configurationNote:'Own balcony, lift access and shared rooftop terrace. Ask for the plan and specifications for the available flat.',
  subheading:'Premium 1, 2 & 3 BHK builder floors. Only 18 homes. Possession starting January 2027.',
  about:'Bhumi Residency is a boutique builder floor in Sector 110, Noida, built and managed by Megabase Infratech. With just 18 homes across 6 floors and only 3 families per floor, it offers the privacy of an independent home with the security of a gated building. Every flat has its own balcony, residents share a landscaped rooftop terrace, and construction is nearly complete, so you see the real home before you buy.',
  configurations:[{id:'1bhk',label:'1 BHK'},{id:'2bhk',label:'2 BHK'},{id:'3bhk',label:'3 BHK'}],
  highlights:[['floors','6 Floors'],['homes','18 Flats'],['floorplan','3 Flats per Floor'],['layout','1, 2 & 3 BHK'],['parking','Stilt Parking'],['terrace','Rooftop Terrace']],
}];
export const projectBySlug=slug=>projects.find(p=>p.slug===slug);
export const propertyTermsVersion='2026-11-12-property';
export const propertyConsent='I agree to Megabase Infratech contacting me by phone or WhatsApp about this property enquiry and site-visit request. I have read the Privacy Policy.';
export const isPropertyEnquiry=record=>record?.answers?.type==='property_enquiry';
