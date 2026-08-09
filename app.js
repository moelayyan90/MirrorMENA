const $ = (s)=>document.querySelector(s);
const form = $('#scan-form');
const results = $('#results');
const status = $('#status');
const sample = [
 {rank:1,name:'Regulatory-change B2B pilot',lane:'B2B',expectedValue:330,payout:1500,probability:.22,daysToCash:14,risk:'LOW',reason:'Deadline-driven buyer pain; fixed acceptance criteria.'},
 {rank:2,name:'Open-source bounty',lane:'Quick cash',expectedValue:35,payout:100,probability:.35,daysToCash:10,risk:'LOW',reason:'Small but fast, with a credible payer and clear spec.'},
 {rank:3,name:'Zero-capital auction sourcing fee',lane:'Intermediation',expectedValue:90,payout:750,probability:.12,daysToCash:21,risk:'MEDIUM',reason:'Only after buyer and platform permissions are verified.'}
];
function money(n){return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n||0)}
function render(items, mode='sample'){
 results.innerHTML=items.map(o=>`<article class="card"><div class="rank">#${o.rank||''}</div><div><div class="chips"><span>${o.lane||'Opportunity'}</span><span class="${(o.risk||'LOW').toLowerCase()}">${o.risk||'LOW'} risk</span></div><h3>${o.name}</h3><p>${o.reason||o.why||o.fitNote||''}</p><div class="metrics"><b>${money(o.payout)}</b><small>payout</small><b>${Math.round((o.probability||0)*100)}%</b><small>payout probability</small><b>${money(o.expectedValue)}</b><small>expected value</small><b>${o.daysToCash||'—'}d</b><small>cash cycle</small></div></div></article>`).join('');
 status.textContent = mode==='gemini-live' ? 'LIVE GEMINI ANALYSIS' : mode==='loading' ? 'ANALYZING…' : 'TRANSPARENT DEMO';
 status.className = mode==='gemini-live' ? 'live' : '';
}
render(sample);
form.addEventListener('submit',async(e)=>{
 e.preventDefault(); status.textContent='ANALYZING…'; results.classList.add('loading');
 const payload=Object.fromEntries(new FormData(form).entries());
 try{
   const r=await fetch('/api/analyze',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
   if(!r.ok) throw new Error('API unavailable');
   const data=await r.json();
   const items=(data.opportunities||[]).map((o,i)=>({...o,rank:o.rank||i+1}));
   render(items.length?items:sample,data.mode);
 }catch{ render(sample,'sample'); }
 finally{results.classList.remove('loading');}
});
