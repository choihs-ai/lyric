/* ============================================================
   35 · DIRECTOR — mood → direction, per-line motion assignment,
        emphasis (user marks › AI › heuristic), AI art director
   ============================================================ */
const MODE_E={giant:1,echo:0.9,shatter:0.9,slam:0.8,bounce:0.8,depth:0.8,cross:0.72,split:0.7,flip:0.6,ticker:0.62,stack:0.5,track:0.5,ring:0.5,
  wave:0.42,vertical:0.42,maskRise:0.4,scatter:0.32,typewriter:0.2,dissolve:0.1};
const ROLE_I={intro:0.75,verseA:0.6,verseB:0.62,chorus:0.95,bridge:0.45,outro:0.2};
const KW={
  brutal:['죽','피','총','칼','전쟁','무대','킬','killa','kill','심판','혈투','짐승','야생','미친','fuck','gun','beast','파괴','분노','투견','적들'],
  neon:['밤','네온','도시','드라이브','불빛','city','night','drive','neon','light','별빛','달빛','택시','고속도로','네온사인'],
  editorial:['책','편지','계절','봄','가을','바람','꽃','햇살','커피','창문','산책','일기','오후','노을'],
  pop:['파티','춤','신나','여름','party','dance','fun','짜릿','사탕','달콤','놀자','반짝','두근'],
  lofi:['눈물','혼자','외로','우울','아파','잠','새벽','담배','공허','그리워','상처','sad','alone','rain','tired','비가'],
  cinematic:['영원','운명','왕','전설','불멸','역사','하늘','천국','지옥','부활','legend','forever','destiny','king','empire'],
};
const KW_KO={brutal:'공격적·투쟁적',neon:'밤·도시',editorial:'일상·서정',pop:'신남·설렘',lofi:'우울·새벽',cinematic:'영원·운명'};
let AUTO_PICK=null,AI_RESULT=null,AI_EMPH_ON=true;

function autoDirection(feats,text){
  const sc={},why={};DIR_KEYS.forEach(k=>{sc[k]=0;why[k]=[]});
  if(feats){
    const tp=clamp((feats.bpm-80)/80),dens=clamp(feats.density/7),br=clamp((feats.bright-0.12)/0.33),low=clamp((feats.lowW-0.25)/0.5),
      dyn=clamp(feats.dyn/12),loud=clamp((feats.loud+30)/22);
    const ar=0.38*dens+0.22*tp+0.25*loud+0.15*low;
    sc.brutal+=ar*1.25+low*0.6-br*0.35;sc.pop+=ar*0.85+br*0.8-low*0.55;sc.neon+=(1-Math.abs(ar-0.55)*2)*0.75+low*0.25+(1-br)*0.15;
    sc.editorial+=(1-ar)*1.0+br*0.3-low*0.35;sc.lofi+=(1-ar)*0.8+(1-br)*0.35+(1-dyn)*0.2;sc.cinematic+=dyn*0.95+(1-ar)*0.35;
    const tag=(c,s)=>c&&why[s.k].push(s.t);
    [['brutal',ar>0.6,'빠르고 밀도 높은 리듬'],['brutal',low>0.55,'저음 비중 큼'],['pop',br>0.55,'밝은 음색'],['pop',ar>0.55,'에너지 높음'],
     ['neon',ar>0.35&&ar<0.75,'중간 템포의 그루브'],['editorial',ar<0.4,'잔잔한 에너지'],['lofi',br<0.4&&ar<0.5,'어둡고 차분한 음색'],
     ['cinematic',dyn>0.55,'다이내믹 변화 큼']].forEach(([k,c,t])=>tag(c,{k,t}));
  }
  if(text){const low=text.toLowerCase();DIR_KEYS.forEach(k=>{let h=0;KW[k].forEach(w=>{const m=low.split(w).length-1;h+=m});if(h){sc[k]+=Math.min(0.6,h*0.08);why[k].push(`가사 성향: ${KW_KO[k]}`)}})}
  const order=[...DIR_KEYS].sort((a,b)=>sc[b]-sc[a]);
  return {key:order[0],order,scores:sc,why};
}
function allowed(m,nch,nw){
  return (m!=='vertical'||(nch<=10&&nw<=4))&&(m!=='stack'||(nw>=2&&nw<=8))&&(m!=='shatter'||nch<=18)&&(m!=='track'||nch<=16)&&(m!=='split'||nch<=16)
    &&(m!=='cross'||nch<=20)&&(m!=='ring'||(nch>=4&&nch<=22))&&(m!=='flip'||nch<=22)&&(m!=='scatter'||(nw>=2&&nw<=7))&&(m!=='depth'||nw<=7)&&(m!=='giant'||nw<=9);
}
function lineIntensity(L){const s=L.sec;return clamp((s.intensity!=null?s.intensity:ROLE_I[s.role]??0.6)*INTENSITY,0,1.3)}
function direct(){
  let prev='';
  LINES.forEach((L,i)=>{
    const role=roleOf(L.sec),pool=role.pool,r=rnd(hash(L.text)+i*7919+hash(DIR_KEY));
    const nch=Array.from(L.text.replace(/\s/g,'')).length,nw=L.words.length;
    L.rep=LINES.slice(0,i).filter(x=>x.text===L.text&&x.sec===L.sec).length;
    let m;
    if(pool.includes('echo')&&(L.rep>0||pool.length===2))m=L.li%2?'echo':'slam';
    else if(pool.length===1)m=pool[0];
    else{const I=lineIntensity(L);const ok=pool.filter(x=>x!==prev&&allowed(x,nch,nw));
      const uniq=[...new Set(ok)];m=uniq.length?pickWeighted(uniq,uniq.map(x=>ok.filter(y=>y===x).length*Math.exp(-((MODE_E[x]-I)**2)/0.22)),r()):'slam'}
    L.mode=m;prev=m;L.seed=(hash(L.text)+i*131)>>>0;
    const al=DIR.motion.align;L.align=pickWeighted(['center','left','right'],[al.center,al.left,al.right],r());
  });
  applyEmphasis();rebuildImpacts();
}
function applyEmphasis(){
  const aiMap={};if(AI_RESULT&&AI_EMPH_ON&&Array.isArray(AI_RESULT.emph))AI_RESULT.emph.forEach(e=>{if(e&&Array.isArray(e.w))aiMap[+e.l]={w:e.w.map(Number),lv:e.lv===2?2:1}});
  const useHeur=!userMarked&&!(AI_RESULT&&AI_EMPH_ON);
  LINES.forEach((L,i)=>{
    L.words.forEach(w=>w.emph=w.u);
    const hasUser=L.words.some(w=>w.u);
    if(!hasUser&&aiMap[i])aiMap[i].w.forEach(k=>{if(L.words[k])L.words[k].emph=aiMap[i].lv});
    else if(!hasUser&&useHeur&&L.words.length>1){
      const freq={};L.sec&&LINES.filter(x=>x.sec===L.sec).forEach(x=>x.words.forEach(w=>freq[w.text]=(freq[w.text]||0)+1));
      let best=-1,bk=-1;L.words.forEach((w,k)=>{const s=syl(w.text)+(/[A-Za-z]/.test(w.text)?1.2:0)+(freq[w.text]>1?0.8:0)+(k===L.words.length-1?0.6:0);if(s>best){best=s;bk=k}});
      const rr=rnd(L.seed)();if(best>=3.2&&rr<(L.sec.role==='chorus'?0.85:0.55))L.words[bk].emph=(L.sec.role==='chorus'&&L.li===0)?2:1}
  });
}

/* ---------- AI art director (sample capability) ---------- */
let SAMPLE=null;
try{if(window.claude&&window.claude.use)window.claude.use('sample').then(x=>{SAMPLE=x;refreshAIUI()}).catch(()=>{})}catch(e){}
function aiKey(){return 'rz_ai_'+hash((lyricsText.trim()||'demo')+'|'+Math.round(SONG.dur))}
function aiPrompt(){
  const f=SONG.feats||{};
  const dirs=DIR_KEYS.map(k=>`- ${k}: ${DIRECTIONS[k].desc}`).join('\n');
  const secs=SECS.map(s=>`S${s.idx} ${s.label}${s.artist?' ('+s.artist+')':''}`).join(', ');
  const lines=LINES.map((L,i)=>`L${i} [S${L.sec.idx}]: `+L.words.map((w,k)=>`${k}:${w.text}`).join(' ')).join('\n');
  return `You are the art director of a professional kinetic-typography lyric video. Decide the visual direction for this song and which words carry the most meaning.

AUDIO FEATURES: bpm ${f.bpm??SONG.bpm}, onset density ${f.density??'?'}/s, brightness ${f.bright??'?'} (0.1 dark–0.5 bright), low-end weight ${f.lowW??'?'}, dynamic range ${f.dyn??'?'} dB, loudness ${f.loud??'?'} dBFS.

DIRECTIONS (pick exactly one key):
${dirs}

SECTIONS: ${secs}

LYRICS (each line numbered, each word prefixed by its index):
${lines}

Reply with ONLY this JSON:
{"direction":"<key>","why":"<one Korean sentence on the song's mood and why this direction fits>","sections":[{"i":<section index>,"mood":"<Korean, 2-4 words>","intensity":<0.0-1.0>}],"emph":[{"l":<line index>,"w":[<word indices>],"lv":<1 or 2>}]}

Rules:
- sections: one entry per section; intensity reflects emotional/energetic peak (chorus/climax high, calm parts low).
- emph: for at most one phrase per line, pick the semantically strongest word(s): punchline, key noun/verb, rhyme landing. Skip lines with nothing worth stressing. Use lv 2 only for the few biggest punchlines (≤10% of lines).
- Never quote, repeat or paraphrase the lyric text anywhere in your reply. Refer to words only by index. "why" and "mood" must describe feelings, not lyrics.`;
}
let aiCtl=null;
async function runAI(){
  if(!SAMPLE)return;const st=$('aiStatus'),btn=$('bAI');
  const cached=(()=>{try{return JSON.parse(lsGet(aiKey(),'null'))}catch(e){return null}})();
  if(cached){applyAI(cached);st.innerHTML=aiSummary(cached)+' <span class="dim">(저장된 분석)</span>';return}
  aiCtl=new AbortController();btn.disabled=true;$('bAIStop').classList.remove('hidden');
  const t0=Date.now();const tick=setInterval(()=>{st.innerHTML=`<b>AI 디렉터가 곡을 분석하는 중…</b> ${Math.round((Date.now()-t0)/1000)}초 · 보통 20~60초 걸려요`},500);
  try{
    const res=await SAMPLE.json(aiPrompt(),{signal:aiCtl.signal,modelTier:'default',cache:{gcTime:86400000}});
    if(!res||typeof res!=='object')throw {code:'invalid_json'};
    lsSet(aiKey(),JSON.stringify(res));applyAI(res);st.innerHTML=aiSummary(res);
  }catch(e){const c=e&&e.code;
    st.innerHTML=c==='cancelled'?'분석을 멈췄어요.':c==='not_granted'||c==='sampling_disabled'?'이 화면에서는 AI 디렉터를 쓸 수 없어요. 자동 추천을 그대로 쓰면 돼요.':
      c==='rate_limited'?'잠시 후 다시 눌러 주세요 (사용량 제한).':c==='invalid_json'?'분석 결과를 읽지 못했어요. 한 번 더 눌러 주세요.':'분석에 실패했어요. 다시 눌러 주세요.';
    if(c==='not_granted'||c==='sampling_disabled'){SAMPLE=null;refreshAIUI()}}
  finally{clearInterval(tick);btn.disabled=false;$('bAIStop').classList.add('hidden')}
}
function applyAI(res){
  AI_RESULT=res;
  if(Array.isArray(res.sections))res.sections.forEach(s=>{const sec=SECS[+s.i];if(sec){sec.intensity=clamp(+s.intensity||0.6);sec.mood=String(s.mood||'').slice(0,24)}});
  if(DIRECTIONS[res.direction]){setDirection(res.direction);lsSet('rz_dir',res.direction);renderDirCards()}
  direct();refreshInfo();
}
function aiSummary(r){
  const moods=(r.sections||[]).map(s=>{const sec=SECS[+s.i];return sec?`${sec.label} <b>${esc(String(s.mood||'').slice(0,24))}</b> ${Math.round((+s.intensity||0)*100)}%`:''}).filter(Boolean).join(' · ');
  const ne=(r.emph||[]).length;
  return `<b>AI 디렉터 → ${esc(DIRECTIONS[r.direction]?DIRECTIONS[r.direction].name:'—')}</b><br>${esc(String(r.why||'').slice(0,160))}<br><span class="dim">${moods}${ne?` · 강조 단어 ${ne}곳 선정`:''}</span>`;
}
function refreshAIUI(){const box=$('aiBox');if(!box)return;box.classList.toggle('hidden',!SAMPLE)}
