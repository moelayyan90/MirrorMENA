const demoPool = [
  {name:'Google AI / startup competition scan', lane:'Prize', payout:50000, probability:0.08, effortHours:18, capital:0, daysToCash:45, risk:'LOW', reason:'Large upside, zero entry capital, but judging probability is uncertain.'},
  {name:'Regulatory-change B2B pilot', lane:'B2B', payout:1500, probability:0.22, effortHours:8, capital:0, daysToCash:14, risk:'LOW', reason:'Urgent compliance deadlines create a measurable buyer pain and fixed-scope pilot.'},
  {name:'Open-source bounty', lane:'Quick cash', payout:100, probability:0.35, effortHours:4, capital:0, daysToCash:10, risk:'LOW', reason:'Clear acceptance criteria and credible payout platform; competition must be checked first.'},
  {name:'Zero-capital auction sourcing fee', lane:'Intermediation', payout:750, probability:0.12, effortHours:5, capital:0, daysToCash:21, risk:'MEDIUM', reason:'Only viable where agency/assignment is expressly permitted and buyer is secured before any binding bid.'}
];

function scoreOpportunity(o) {
  const ev = o.payout * o.probability;
  const speed = 1 / Math.max(1, o.daysToCash);
  const effort = 1 / Math.max(1, o.effortHours);
  const capitalPenalty = o.capital > 0 ? 0.35 : 1;
  return Math.round((ev * speed * effort * capitalPenalty) * 100) / 100;
}

function deterministic(goal='', capital=0) {
  return demoPool
    .filter(o => o.capital <= Number(capital || 0))
    .map(o => ({...o, expectedValue: Math.round(o.payout*o.probability*100)/100, rankScore: scoreOpportunity(o)}))
    .sort((a,b)=>b.rankScore-a.rankScore)
    .slice(0,3)
    .map((o,i)=>({...o, rank:i+1, fitNote: goal ? `Matched against goal: ${goal}` : 'General opportunity fit'}));
}

async function askGemini(input, fallback) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return {mode:'deterministic-demo', opportunities:fallback, note:'Gemini is not configured; transparent deterministic demo is shown.'};
  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
  const prompt = `You are OpportunityOS, a conservative opportunity-ranking agent. Never invent eligibility, payout, deadlines or buyer facts. Return JSON only with keys summary and opportunities. Each opportunity must include name, why, risk, nextAction. Use the supplied candidate data as evidence and reject unsafe/deceptive/illegal activity.\n\nUser input: ${JSON.stringify(input)}\nCandidate data: ${JSON.stringify(fallback)}`;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, {
    method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({contents:[{parts:[{text:prompt}]}], generationConfig:{responseMimeType:'application/json'}})
  });
  if (!response.ok) throw new Error(`Gemini API ${response.status}`);
  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('') || '';
  const parsed = JSON.parse(text);
  return {mode:'gemini-live', model, ...parsed};
}

async function logRun(payload) {
  if (!process.env.GOOGLE_CLOUD_PROJECT && !process.env.FIREBASE_PROJECT_ID) return false;
  try {
    const { Firestore } = await import('@google-cloud/firestore');
    const db = new Firestore({projectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID});
    await db.collection('opportunityos_runs').add({...payload, createdAt:new Date().toISOString()});
    return true;
  } catch { return false; }
}

export default async function handler(req,res) {
  if (req.method !== 'POST') return res.status(405).json({error:'POST only'});
  const {goal='', location='Global', capital=0, hoursPerWeek=10, constraints=''} = req.body || {};
  if (typeof goal !== 'string' || goal.length > 600) return res.status(400).json({error:'Invalid goal'});
  const input = {goal, location, capital:Number(capital||0), hoursPerWeek:Number(hoursPerWeek||10), constraints};
  const fallback = deterministic(goal, capital);
  let output;
  try { output = await askGemini(input, fallback); }
  catch (error) { output = {mode:'gemini-error-fallback', opportunities:fallback, note:error.message}; }
  const logged = await logRun({input, mode:output.mode, opportunityCount:(output.opportunities||[]).length});
  return res.status(200).json({...output, loggedToFirestore:logged, generatedAt:new Date().toISOString()});
}

export { deterministic, scoreOpportunity };
