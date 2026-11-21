export const branches = {
  home: { title: 'Kitne floors banwane hain?', options: [['ground','Sirf ground floor'], ['g1','G+1'], ['g2','G+2'], ['g3','G+3 / builder floors']] },
  pg: { title: 'Aap kitne rooms chahte hain?', options: [['under10','10 rooms tak'], ['10to20','10–20 rooms'], ['20to40','20–40 rooms'], ['suggest','Aap suggest kijiye']] },
  commercial: { title: 'Building kis kaam ke liye hai?', options: [['shops','Shops / showroom'], ['office','Office'], ['clinic','Clinic / hospital'], ['school','School / coaching'], ['warehouse','Warehouse / godown']] },
  interiors: { title: 'Property kaunsi hai?', options: [['flat','Flat (society)'], ['house','Independent house'], ['office','Office / shop']] },
};
export const questions = [
  { id:'type', title:'Aap kya banwana chahte hain?', hint:'Apne project se shuru karein.', options:[['home','Apna ghar','Residential'], ['pg','PG building',''], ['commercial','Commercial building','Shop, office, showroom'], ['interiors','Sirf interiors','']] },
  { id:'plot', title:'Aapke plot ka status kya hai?', options:[['owned','Plot mera hai, khaali hai'], ['rebuild','Plot hai, purana ghar bana hai','Todkar naya banwana hai'], ['buying','Plot lene wala hoon'], ['extension','Existing building par floor add karna hai']] },
  { id:'location', title:'Aapka plot kahan hai?', options:[['noida','Noida'], ['greater_noida','Greater Noida'], ['ghaziabad','Ghaziabad'], ['lucknow','Lucknow'], ['ncr','NCR mein kahin aur']] },
  { id:'size', title:'Plot ka size kitna hai?', options:[['under50','50 gaz (450 sq. ft.) tak'], ['50to100','50–100 gaz'], ['100to200','100–200 gaz'], ['over200','200 gaz se zyada'], ['unknown','Pata nahi']] },
  { id:'detail', title:'Aapka project', options:[] },
  { id:'budget', title:'Aapka approximate budget kya hai?', options:[['under20','₹20 lakh tak'], ['20to50','₹20–50 lakh'], ['50to100','₹50 lakh – ₹1 crore'], ['over100','₹1 crore se zyada'], ['undecided','Abhi decide nahi kiya']] },
  { id:'timeline', title:'Aap kaam kab shuru karna chahte hain?', options:[['now','Turant','1 mahine ke andar'], ['1to3','1–3 mahine mein'], ['3to6','3–6 mahine mein'], ['exploring','Abhi sirf jaankari le raha hoon']] },
  { id:'concerns', title:'Aapki sabse badi chinta kya hai?', multi:true, singleChoice:true, options:[['budget','Budget beech mein badh na jaaye'], ['quality','Material ki quality'], ['time','Kaam time par poora ho'], ['remote','Door se supervision kaise hoga'], ['agreement','Likhit agreement aur transparency']] },
  { id:'map', title:'Kya aapka building map pass hai?', options:[['approved','Haan, map pass hai'], ['help','Nahi, help chahiye'], ['unknown','Pata nahi']] },
];
export function getQuestion(index, answers) {
  const q = questions[index];
  return q.id === 'detail' ? {...q, ...branches[answers.type]} : q;
}
export function answerLabels(answers) {
  return Object.fromEntries(questions.map((q, i) => {
    const current = getQuestion(i, answers);
    const values = Array.isArray(answers[q.id]) ? answers[q.id] : [answers[q.id]];
    return [q.id, values.map(v => current.options.find(o => o[0] === v)?.[1] || '').join('; ')];
  }));
}
