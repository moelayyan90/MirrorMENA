const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const copy = {
  en:{tryNow:'Try now',eyebrow:'AI beauty & fashion for MENA',headline:'One mirror.<br><em>Two intelligent experiences.</em>',lead:'Understand your skin in detail, then explore a new look — powered by YouCam AI and designed for a seamless retail journey.',start:'Start your mirror',privacy:'Your API key never reaches the browser. Images are sent only through secure, temporary upload URLs.',experience:'THE MIRROR EXPERIENCE',choose:'Choose what you want to discover.',skinTab:'Skin Intelligence',styleTab:'Virtual Style',skinTitle:'See what your skin is saying.',skinText:'Upload a clear front-facing selfie. MirrorMENA analyzes wrinkles, pores, texture and acne using YouCam Skin Analysis v2.1.',skinTip1:'Face centered and looking straight ahead',skinTip2:'Bright, even lighting',skinTip3:'No filters or heavy occlusion',uploadSelfie:'Upload a selfie',jpgHint:'JPG or PNG · under 10 MB',analyze:'Analyze my skin',clothTitle:'Try the look before you wear it.',clothText:'Upload your photo and a garment reference. YouCam AI Clothes v3 generates a realistic virtual try-on while preserving your identity.',clothTip1:'Use a clear, front-facing person photo',clothTip2:'Use one garment or one outfit reference',clothTip3:'For best results, keep the body unobstructed',yourPhoto:'Your photo',personHint:'Front-facing',garment:'Garment',garmentHint:'Product or outfit',tryLook:'Create my try-on',proof1:'AI experiences in one retail journey',proof2:'Latest Skin Analysis endpoint',proof3:'AI Clothes virtual try-on engine',proof4:'API secrets exposed client-side',disclaimer:'Demo experience — not medical advice.'},
  ar:{tryNow:'جرّب الآن',eyebrow:'الجمال والأزياء بالذكاء الاصطناعي للمنطقة العربية',headline:'مرآة واحدة.<br><em>تجربتان ذكيتان.</em>',lead:'افهم بشرتك بتفاصيل أدق، ثم جرّب إطلالة جديدة — مدعوم بتقنيات YouCam AI ومصمم لتجربة تسوق سلسة.',start:'ابدأ تجربتك',privacy:'مفتاح API لا يصل إلى المتصفح. تُرسل الصور فقط عبر روابط رفع مؤقتة وآمنة.',experience:'تجربة المرآة',choose:'اختر ما تريد اكتشافه.',skinTab:'تحليل البشرة',styleTab:'تجربة الأزياء',skinTitle:'اكتشف ما تقوله بشرتك.',skinText:'ارفع صورة أمامية واضحة. يحلل MirrorMENA التجاعيد والمسام والملمس وحب الشباب عبر YouCam Skin Analysis v2.1.',skinTip1:'الوجه في المنتصف والنظر للأمام',skinTip2:'إضاءة واضحة ومتوازنة',skinTip3:'بدون فلاتر أو تغطية للوجه',uploadSelfie:'ارفع صورة للوجه',jpgHint:'JPG أو PNG · أقل من 10 MB',analyze:'حلّل بشرتي',clothTitle:'جرّب الإطلالة قبل ارتدائها.',clothText:'ارفع صورتك وصورة للقطعة. ينشئ YouCam AI Clothes v3 تجربة افتراضية واقعية للملابس.',clothTip1:'استخدم صورة واضحة ومواجهة للأمام',clothTip2:'استخدم قطعة واحدة أو إطلالة مرجعية واحدة',clothTip3:'لأفضل نتيجة اجعل الجسم واضحًا',yourPhoto:'صورتك',personHint:'مواجهة للأمام',garment:'القطعة',garmentHint:'منتج أو إطلالة',tryLook:'أنشئ تجربتي',proof1:'تجربتان بالذكاء الاصطناعي في رحلة واحدة',proof2:'أحدث إصدار لتحليل البشرة',proof3:'محرك تجربة الملابس الافتراضية',proof4:'أسرار API مكشوفة في المتصفح',disclaimer:'تجربة توضيحية — وليست نصيحة طبية.'}
};

const skinNames = {
  hd_wrinkle:{en:'Wrinkles',ar:'التجاعيد'},
  wrinkle:{en:'Wrinkles',ar:'التجاعيد'},
  hd_pore:{en:'Pores',ar:'المسام'},
  pore:{en:'Pores',ar:'المسام'},
  hd_texture:{en:'Texture',ar:'ملمس البشرة'},
  texture:{en:'Texture',ar:'ملمس البشرة'},
  hd_acne:{en:'Acne appearance',ar:'مظهر حب الشباب'},
  acne:{en:'Acne appearance',ar:'مظهر حب الشباب'},
  hd_redness:{en:'Redness',ar:'الاحمرار'},
  redness:{en:'Redness',ar:'الاحمرار'},
  hd_oiliness:{en:'Oiliness',ar:'الدهنية'},
  oiliness:{en:'Oiliness',ar:'الدهنية'},
  hd_radiance:{en:'Radiance',ar:'الإشراقة'},
  radiance:{en:'Radiance',ar:'الإشراقة'},
  hd_dark_circle:{en:'Dark circles',ar:'الهالات الداكنة'},
  dark_circle_v2:{en:'Dark circles',ar:'الهالات الداكنة'},
  hd_age_spot:{en:'Age spots',ar:'البقع والتصبغات'},
  age_spot:{en:'Age spots',ar:'البقع والتصبغات'},
  hd_moisture:{en:'Moisture',ar:'الترطيب'},
  moisture:{en:'Moisture',ar:'الترطيب'},
  hd_eye_bag:{en:'Eye bags',ar:'انتفاخ تحت العين'},
  eye_bag:{en:'Eye bags',ar:'انتفاخ تحت العين'},
  hd_firmness:{en:'Firmness',ar:'تماسك البشرة'},
  firmness:{en:'Firmness',ar:'تماسك البشرة'}
};

let lang='en';
$('#langBtn').addEventListener('click',()=>{
  lang=lang==='en'?'ar':'en';
  document.documentElement.lang=lang;
  document.documentElement.dir=lang==='ar'?'rtl':'ltr';
  $('#langBtn').textContent=lang==='en'?'العربية':'English';
  $$('[data-i18n]').forEach(el=>{const v=copy[lang][el.dataset.i18n];if(v)el.innerHTML=v;});
});

$$('.tab').forEach(btn=>btn.addEventListener('click',()=>{
  $$('.tab').forEach(x=>x.classList.toggle('active',x===btn));
  $$('.panel').forEach(x=>x.classList.remove('active'));
  $(`#panel-${btn.dataset.tab}`).classList.add('active');
}));

function showPreview(input,img){
  const file=input.files?.[0];
  if(!file)return;
  if(file.size>=10*1024*1024){alert('Image must be under 10 MB.');input.value='';return;}
  img.src=URL.createObjectURL(file);img.hidden=false;updateButtons();
}
['skin','person','garment'].forEach(name=>{
  const input=$(`#${name}File`),preview=$(`#${name}Preview`);
  input.addEventListener('change',()=>showPreview(input,preview));
});
function updateButtons(){
  $('#skinRun').disabled=!$('#skinFile').files?.[0];
  $('#clothRun').disabled=!($('#personFile').files?.[0]&&$('#garmentFile').files?.[0]);
}

function setStatus(id,text,type=''){
  const el=$(id);el.hidden=false;el.className=`status ${type}`;el.textContent=text;
}
function clearResult(id){const el=$(id);el.hidden=true;el.innerHTML='';}
function getApiData(raw){return raw?.data?.data ?? raw?.data ?? raw;}
function extractTaskId(raw){const d=getApiData(raw);return d?.task_id ?? d?.data?.task_id;}
function extractTaskPayload(raw){return getApiData(raw);}

async function api(body){
  const r=await fetch('/api/youcam',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  let j;try{j=await r.json();}catch{throw new Error(`Server returned HTTP ${r.status}.`);}
  if(!r.ok||!j.ok){const detail=j?.upstream?.error_code?`${j.error} (${j.upstream.error_code})`:j.error;throw new Error(detail||'Request failed');}
  return j;
}
async function apiGet(action,taskId){
  const r=await fetch(`/api/youcam?action=${encodeURIComponent(action)}&task_id=${encodeURIComponent(taskId)}`,{cache:'no-store'});
  let j;try{j=await r.json();}catch{throw new Error(`Server returned HTTP ${r.status}.`);}
  if(!r.ok||!j.ok){const detail=j?.upstream?.error_code?`${j.error} (${j.upstream.error_code})`:j.error;throw new Error(detail||'Request failed');}
  return j;
}

function meta(file){
  let type=file.type;
  if(type==='image/jpeg')type='image/jpg';
  return{file_name:file.name,file_size:file.size,content_type:type};
}
async function uploadFiles(feature,files){
  const prep=await api({action:'prepare-upload',feature,files:files.map(meta)});
  const root=getApiData(prep);
  const records=root?.files ?? root?.data?.files;
  if(!Array.isArray(records)||records.length!==files.length)throw new Error('YouCam did not return upload information.');
  for(let i=0;i<records.length;i++){
    const req=records[i]?.requests?.[0];
    if(!req?.url)throw new Error('YouCam did not return a secure upload URL.');
    const headers={...(req.headers||{})};
    delete headers['Content-Length'];delete headers['content-length'];
    const put=await fetch(req.url,{method:req.method||'PUT',headers,body:files[i]});
    if(!put.ok)throw new Error(`Image upload failed (${put.status}).`);
  }
  return records.map(x=>x.file_id);
}

async function poll(action,taskId,onTick,limit=90){
  for(let i=0;i<limit;i++){
    const raw=await apiGet(action,taskId);
    const d=extractTaskPayload(raw);
    const status=d?.task_status ?? d?.data?.task_status;
    if(status==='success')return d;
    if(status==='error'){
      const err=d?.error?.message||d?.error||d?.error_code||'YouCam processing failed.';
      throw new Error(typeof err==='string'?err:JSON.stringify(err));
    }
    onTick?.(i+1,status||'running');
    await new Promise(r=>setTimeout(r,2500));
  }
  throw new Error('Processing took too long. Please try again.');
}

function findImages(obj,found=[]){
  if(obj==null||found.length>20)return found;
  if(typeof obj==='string'){
    if(/^https?:\/\//.test(obj)&&(obj.includes('amazonaws.com')||/\.(png|jpe?g|webp)(\?|$)/i.test(obj)))found.push(obj);
    return [...new Set(found)];
  }
  if(typeof obj!=='object')return found;
  for(const v of Object.values(obj))findImages(v,found);
  return [...new Set(found)];
}

function collectSkinOutputs(done){
  const candidates=[
    done?.results?.output,
    done?.data?.results?.output,
    done?.results?.outputs,
    done?.output
  ];
  for(const c of candidates)if(Array.isArray(c))return c;

  const found=[];
  const walk=(node)=>{
    if(node==null||typeof node!=='object')return;
    if(Array.isArray(node)){node.forEach(walk);return;}
    if((typeof node.ui_score==='number'||typeof node.raw_score==='number')&&(node.type||node.name))found.push(node);
    Object.values(node).forEach(walk);
  };
  walk(done);
  return found;
}

function normalizeSkinOutput(item){
  const type=String(item?.type||item?.name||'skin').toLowerCase();
  const ui=Number(item?.ui_score);
  const raw=Number(item?.raw_score);
  const masks=[];
  if(Array.isArray(item?.mask_urls))masks.push(...item.mask_urls);
  if(item?.mask_url)masks.push(item.mask_url);
  findImages(item,masks);
  return {type,ui:Number.isFinite(ui)?ui:null,raw:Number.isFinite(raw)?raw:null,masks:[...new Set(masks)]};
}

function skinLabel(type){return skinNames[type]?.[lang]||type.replace(/^hd_/,'').replaceAll('_',' ');}
function renderSkinAnalysis(done,result){
  const outputs=collectSkinOutputs(done).map(normalizeSkinOutput).filter(x=>x.ui!==null||x.raw!==null||x.masks.length);
  const scored=outputs.filter(x=>x.ui!==null);
  const average=scored.length?Math.round(scored.reduce((s,x)=>s+x.ui,0)/scored.length):null;
  const note=lang==='ar'
    ? 'هذه درجات تجميلية من YouCam وليست تشخيصًا طبيًا. وفق توثيق YouCam، الدرجة الأعلى تعني حالة تجميلية أفضل.'
    : 'These are YouCam cosmetic scores, not a medical diagnosis. In YouCam scoring, a higher score represents a better cosmetic skin condition.';

  if(!outputs.length){
    result.innerHTML=`<div class="analysis-empty"><strong>${lang==='ar'?'اكتمل الطلب لكن لم تصل درجات قابلة للعرض.':'The task completed but no displayable scores were returned.'}</strong><p>${lang==='ar'?'جرّب صورة أمامية واضحة بإضاءة متوازنة.':'Try a clear front-facing photo in even lighting.'}</p></div>`;
    result.hidden=false;
    return;
  }

  const cards=outputs.map(x=>{
    const score=x.ui!==null?Math.round(x.ui):'—';
    const raw=x.raw!==null?x.raw.toFixed(1):'—';
    const mask=x.masks[0]?`<img class="skin-mask" src="${escapeHtml(x.masks[0])}" alt="${escapeHtml(skinLabel(x.type))} mask">`:'';
    return `<article class="skin-card">
      <div class="skin-card-head"><div><b>${escapeHtml(skinLabel(x.type))}</b><small>${lang==='ar'?'درجة YouCam':'YouCam score'}</small></div><div class="score-ring">${score}</div></div>
      <div class="score-meta"><span>${lang==='ar'?'الدرجة الخام':'Raw score'}: ${raw}</span><span>${lang==='ar'?'من 100':'/ 100'}</span></div>
      ${mask}
    </article>`;
  }).join('');

  result.innerHTML=`
    <div class="analysis-summary">
      <div><span>${lang==='ar'?'ملخص تحليل البشرة':'Skin analysis summary'}</span><strong>${average!==null?average:'—'}<small>/100</small></strong></div>
      <p>${note}</p>
    </div>
    <div class="skin-results-grid">${cards}</div>`;
  result.hidden=false;
  result.scrollIntoView({behavior:'smooth',block:'nearest'});
}

$('#skinRun').addEventListener('click',async()=>{
  const btn=$('#skinRun'),file=$('#skinFile').files[0];
  btn.disabled=true;clearResult('#skinResult');
  try{
    setStatus('#skinStatus',lang==='ar'?'1/3 رفع الصورة بشكل آمن…':'1/3 Securely uploading image…');
    const [fileId]=await uploadFiles('skin',[file]);
    setStatus('#skinStatus',lang==='ar'?'2/3 بدء تحليل YouCam Skin Analysis v2.1…':'2/3 Starting YouCam Skin Analysis v2.1…');
    const started=await api({action:'start-skin',src_file_id:fileId});
    const taskId=extractTaskId(started);
    if(!taskId)throw new Error('YouCam did not return a task ID.');
    const done=await poll('skin-status',taskId,(n)=>setStatus('#skinStatus',lang==='ar'?`3/3 تحليل البشرة… ${n}`:`3/3 Analyzing skin… ${n}`));
    setStatus('#skinStatus',lang==='ar'?'اكتمل التحليل — النتائج أدناه.':'Analysis complete — results are below.','success');
    renderSkinAnalysis(done,$('#skinResult'));
  }catch(e){
    setStatus('#skinStatus',e.message,'error');
  }finally{btn.disabled=false;}
});

$('#clothRun').addEventListener('click',async()=>{
  const btn=$('#clothRun'),person=$('#personFile').files[0],garment=$('#garmentFile').files[0];
  btn.disabled=true;clearResult('#clothResult');
  try{
    setStatus('#clothStatus',lang==='ar'?'رفع الصور بشكل آمن…':'Preparing secure uploads…');
    const [srcId,refId]=await uploadFiles('cloth',[person,garment]);
    setStatus('#clothStatus',lang==='ar'?'بدء YouCam AI Clothes v3…':'Starting YouCam AI Clothes v3…');
    const started=await api({action:'start-cloth',src_file_id:srcId,ref_file_id:refId});
    const taskId=extractTaskId(started);
    if(!taskId)throw new Error('YouCam did not return a task ID.');
    const done=await poll('cloth-status',taskId,(n)=>setStatus('#clothStatus',lang==='ar'?`إنشاء تجربة الملابس… ${n}`:`Creating virtual try-on… ${n}`));
    setStatus('#clothStatus',lang==='ar'?'تجربة الملابس جاهزة.':'Your virtual try-on is ready.','success');
    const urls=findImages(done);
    const direct=done?.results?.url||done?.data?.results?.url;
    if(direct&&!urls.includes(direct))urls.unshift(direct);
    const result=$('#clothResult');
    result.innerHTML=urls.length
      ?urls.slice(0,3).map(u=>`<img src="${escapeHtml(u)}" alt="Virtual try-on result">`).join('')
      :`<div class="analysis-empty"><strong>${lang==='ar'?'اكتملت المهمة ولكن لم يصل رابط صورة النتيجة.':'The task completed but no result image URL was returned.'}</strong></div>`;
    result.hidden=false;
    result.scrollIntoView({behavior:'smooth',block:'nearest'});
  }catch(e){
    setStatus('#clothStatus',e.message,'error');
  }finally{btn.disabled=false;}
});

function escapeHtml(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
