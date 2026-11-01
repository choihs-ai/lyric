/* ============================================================
   80 · APP — metadata, analysis UI, direction picker, playback,
        tap-sync, recording, init
   ============================================================ */
function metaTitle(){return (($('inTitle')&&$('inTitle').value.trim())||(PRESET&&PRESET.title)||'UNTITLED').toUpperCase()}
function metaArtist(){return (($('inArtist')&&$('inArtist').value.trim())||(PRESET&&PRESET.artist)||'ARTIST').toUpperCase()}
function metaFeat(){return (($('inFeat')&&$('inFeat').value.trim())||(PRESET&&PRESET.feat)||'').toUpperCase()}
function secArtist(sec){return sec.artist?sec.artist.toUpperCase():metaArtist()}
function saveMeta(){lsSet('rz_meta',JSON.stringify({t:$('inTitle').value,a:$('inArtist').value,f:$('inFeat').value}));const tt=metaTitle();$('hTitle').textContent=tt==='UNTITLED'?'LYRIC MOTION':tt}

/* ---------- direction picker ---------- */
let DIR_LOCK=lsGet('rz_dir_lock','0')==='1';
function autoPick(){AUTO_PICK=autoDirection(SONG&&SONG.feats,usingDemo?'':lyricsText);if(PRESET&&PRESET.direction){AUTO_PICK.key=PRESET.direction;AUTO_PICK.why[PRESET.direction].unshift('이 곡 전용 프리셋')}
  if(!DIR_LOCK&&AUTO_PICK.key!==DIR_KEY){setDirection(AUTO_PICK.key);direct()}renderDirCards()}
function renderDirCards(){
  const box=$('dirCards');if(!box)return;
  box.innerHTML=DIR_KEYS.map(k=>{const d=DIRECTIONS[k];const pv=d.roles.verseA.pal({firstStart:0,lastEnd:1},0.5,{li:0}),pc=d.roles.chorus.pal({firstStart:0,lastEnd:1},0,{li:0}),pb=d.roles.verseB.pal({},0,{li:0});
    const sw=[pv.bg,pv.ac,pc.bg,pc.ac,pb.bg].map(c=>`<i style="background:${c}"></i>`).join('');
    return `<button class="dir${k===DIR_KEY?' on':''}" data-k="${k}"><span class="sw">${sw}</span><b>${d.name}</b>${AUTO_PICK&&AUTO_PICK.key===k?'<em>추천</em>':''}<small>${esc(d.desc)}</small></button>`}).join('');
  box.querySelectorAll('.dir').forEach(b=>b.onclick=()=>{setDirection(b.dataset.k);DIR_LOCK=true;lsSet('rz_dir',b.dataset.k);lsSet('rz_dir_lock','1');direct();renderDirCards();refreshInfo()});
  const w=AUTO_PICK?AUTO_PICK.why[AUTO_PICK.key]:[];
  $('dirWhy').innerHTML=AUTO_PICK?`추천 <b>${DIRECTIONS[AUTO_PICK.key].name}</b>${w.length?' · '+w.map(esc).join(' · '):''}${DIR_LOCK&&DIR_KEY!==AUTO_PICK.key?` · 지금은 직접 고른 <b>${DIR.name}</b> <a href="#" id="dirAuto">추천으로 되돌리기</a>`:''}`:'';
  const a=$('dirAuto');if(a)a.onclick=e=>{e.preventDefault();DIR_LOCK=false;lsSet('rz_dir_lock','0');autoPick();refreshInfo()};
  document.documentElement.style.setProperty('--red',DIR.roles.chorus.pal({},0,{li:0}).ac);
}

/* ---------- analysis UI ---------- */
function applyAnalysis(an){
  const pre=PRESETS.find(p=>Math.abs(p.dur-an.dur)<0.3&&Math.abs(p.bpm-an.bpm)<1.5);
  if(pre){setSong({...an,bpm:pre.bpm,t0:pre.t0,kicks:pre.kicks,snares:pre.snares,startBar:pre.startBar,endBar:pre.endBar,preset:pre});
    [['inTitle',pre.title],['inArtist',pre.artist],['inFeat',pre.feat]].forEach(([id,v])=>{if(!$(id).value.trim())$(id).value=v});saveMeta()}
  else setSong({...an,preset:null});
  AI_RESULT=null;build();autoPick();loadAI();refreshInfo();showAnalysis()}
function showAnalysis(){const f=SONG.feats;$('anInfo').innerHTML=`<b>분석 완료</b> · ${+SONG.bpm.toFixed(1)} BPM · ${NB}마디 · 킥 ${KICKS.length} · 가사 시작 ${SONG.startBar+1}마디${PRESET?' · <b>이 곡 전용 정밀 타임라인</b>':''}`+
  (f?`<br><span class="dim">에너지 ${f.loud} dB · 다이내믹 ${f.dyn} dB · 리듬 밀도 ${f.density}/s · 밝기 ${f.bright} · 저음 ${f.lowW}</span>`:'')+`<br>화면 흔들림이 박자보다 두 배 빠르거나 느리면 아래 버튼으로 고쳐 주세요.`;$('bpmRow').classList.remove('hidden')}
function scaleBpm(f){if(!SONG||SONG.demo)return;const o={...SONG,preset:null,bpm:SONG.bpm*f};const nv=SONG.nov||[];
  if(f>1){o.startBar=SONG.startBar*2;o.endBar=SONG.endBar*2;o.nov=nv.flatMap(v=>[v,0])}else{o.startBar=Math.floor(SONG.startBar/2);o.endBar=Math.ceil(SONG.endBar/2);o.nov=nv.reduce((a,v,i)=>{a[i>>1]=Math.max(a[i>>1]||0,v);return a},[])}
  setSong(o);build();refreshInfo();showAnalysis()}
function loadAI(){try{const r=JSON.parse(lsGet(aiKey(),'null'));if(r){AI_RESULT=r;(r.sections||[]).forEach(s=>{const sec=SECS[+s.i];if(sec){sec.intensity=clamp(+s.intensity||0.6);sec.mood=String(s.mood||'').slice(0,24)}});direct();if($('aiStatus'))$('aiStatus').innerHTML=aiSummary(r)+' <span class="dim">(저장된 분석)</span>'}}catch(e){}}
function refreshInfo(){
  const em=LINES.reduce((a,L)=>a+L.words.filter(w=>w.emph).length,0),synced=Object.keys(overrides).length;
  $('parseInfo').innerHTML=usingDemo?'가사가 비어 있어서 <b>예시 문구</b>로 재생돼요.':`<b>${SECS.length}개 구간 · ${LINES.length}줄</b> 인식 · 강조 ${em}개 · ${SECS.map(s=>s.label+(s.artist?' ('+esc(s.artist.toUpperCase())+')':'')+' '+(Math.round((s.firstStart-T0)/BAR)+1)+'마디~').join(' / ')}`;
  $('bSyncReset').textContent=synced?`싱크 초기화 (${synced}줄 저장됨)`:'싱크 초기화';
  if($('cAIEmph'))$('cAIEmph').checked=AI_EMPH_ON;
  renderLines();
}

/* ---------- playback ---------- */
const au=$('au');let hasAudio=false,playing=false,clock0=0,clockT=0,actx=null,msDest=null;
let syncMode=false,syncIdx=0,recorder=null,recChunks=[],recording=false,hudTimer=0,RATE=1,AUDIO_FILE=null;
function now(){if(hasAudio)return au.currentTime||0;return playing?clockT+(performance.now()/1000-clock0)*RATE:clockT}
function setRate(r){if(r===RATE)return;if(!hasAudio){clockT=now();clock0=performance.now()/1000}RATE=r;if(hasAudio){try{au.playbackRate=r}catch(e){}}}
function seekTo(s){s=clamp(s,0,SONG_END);if(hasAudio){try{au.currentTime=s}catch(e){}}else{clockT=s;clock0=performance.now()/1000}}
function startPlay(){if(hasAudio){if(actx&&actx.state!=='running')actx.resume();return au.play().then(()=>{playing=true}).catch(()=>{playing=false})}clock0=performance.now()/1000;playing=true;return Promise.resolve()}
function pausePlay(){if(hasAudio)au.pause();else clockT=now();playing=false}
function ensureGraph(){if(actx)return;try{const AC=window.AudioContext||window.webkitAudioContext;actx=new AC();const src=actx.createMediaElementSource(au);src.connect(actx.destination);if(actx.createMediaStreamDestination){msDest=actx.createMediaStreamDestination();src.connect(msDest)}}catch(e){actx=null;msDest=null}}
function onEnded(){playing=false;if(recording)stopRec();if(syncMode)endSync();showSetup()}
au.addEventListener('ended',onEnded);au.addEventListener('pause',()=>{if(!au.ended)playing=false});au.addEventListener('play',()=>{playing=true});
function showSetup(){$('setup').classList.remove('hidden');$('hud').classList.add('hidden')}
function hideSetup(){$('setup').classList.add('hidden')}
function pokeHud(){if(syncMode)return;const h=$('hud');h.classList.remove('hidden');h.classList.remove('fade');clearTimeout(hudTimer);hudTimer=setTimeout(()=>h.classList.add('fade'),2600)}
function updateHud(t){$('seek').value=t;const m=Math.floor(t/60),s=(t%60).toFixed(1).padStart(4,'0');$('tc').textContent=`${m}:${s}`;$('hPlay').textContent=playing?'❚❚':'▶';$('hMenu').textContent=recording?'녹화 중지':'설정'}
function loop(){if(!EXPORTING){const t=now();if(!hasAudio&&playing&&t>=SONG_END){clockT=SONG_END;onEnded()}frame(t);updateHud(t)}requestAnimationFrame(loop)}   // the offline exporter owns the canvas while it runs

/* ---------- inputs ---------- */
let deb=0;
const lyricsChanged=()=>{lsSet('rz_lyrics',lyricsText);AI_RESULT=null;build();autoPick();loadAI();refreshInfo()};
$('lyrics').addEventListener('input',()=>{clearTimeout(deb);deb=setTimeout(()=>{lyricsText=$('lyrics').value;lyricsChanged()},300)});
$('bDemo').onclick=()=>{$('lyrics').value=DEMO;lyricsText=DEMO;lyricsChanged()};
$('bClear').onclick=()=>{$('lyrics').value='';lyricsText='';lyricsChanged()};
$('fLyr').onchange=e=>{const f=e.target.files[0];if(!f)return;f.text().then(s=>{$('lyrics').value=s;lyricsText=s;lyricsChanged()})};
$('fAudio').onchange=async e=>{const f=e.target.files[0];if(!f)return;au.src=URL.createObjectURL(f);au.load();hasAudio=true;playing=false;AUDIO_FILE=f;RATE=1;
  $('audioName').innerHTML=`<b>${esc(f.name)}</b> · 준비됨`;
  const key='rz_an4_'+f.name+'_'+f.size;let an=null;try{an=JSON.parse(lsGet(key,'null'))}catch(x){}
  if(!an){$('anInfo').innerHTML='<b>곡 분석 중…</b> 박자 · 킥 · 스네어 · 구간 · 분위기 (몇 초 걸려요)';$('bpmRow').classList.add('hidden');
    try{an=await analyzeFile(f);lsSet(key,JSON.stringify(an))}catch(err){$('anInfo').innerHTML='<b>이 파일은 분석하지 못했어요.</b> 기본 박자로 재생되니 탭 싱크로 맞춰 주세요.';return}}
  applyAnalysis(an)};
$('bBpmDbl').onclick=()=>scaleBpm(2);$('bBpmHalf').onclick=()=>scaleBpm(0.5);
['inTitle','inArtist','inFeat'].forEach(id=>$(id).addEventListener('input',()=>{saveMeta();refreshInfo()}));
document.querySelectorAll('#segAspect button').forEach(b=>b.onclick=()=>{document.querySelectorAll('#segAspect button').forEach(x=>x.classList.toggle('on',x===b));setAspect(b.dataset.a);lsSet('rz_aspect',b.dataset.a);PLAN_P=null});
$('rOff').oninput=e=>{OFF=+e.target.value;$('offVal').textContent=(OFF>0?'+':OFF<0?'−':'±')+Math.abs(OFF).toFixed(2)+'초';lsSet('rz_off',OFF);renderLines()};
$('rInt').oninput=e=>{INTENSITY=+e.target.value;$('intVal').textContent=Math.round(INTENSITY*100)+'%';lsSet('rz_int',INTENSITY);direct()};
$('bAI').onclick=()=>runAI();$('bAIStop').onclick=()=>{if(aiCtl)aiCtl.abort()};
$('cAIEmph').onchange=e=>{AI_EMPH_ON=e.target.checked;lsSet('rz_aiemph',AI_EMPH_ON?'1':'0');direct();refreshInfo()};
$('bPlay').onclick=()=>{hideSetup();if(now()>=SONG_END-0.5||now()<0.01)seekTo(0);startPlay();pokeHud()};
$('hMenu').onclick=e=>{e.stopPropagation();if(recording){stopRec();pausePlay()}else pausePlay();showSetup()};
$('hFull').onclick=e=>{e.stopPropagation();$('hud').classList.add('fade')};
$('hPlay').onclick=e=>{e.stopPropagation();if(playing)pausePlay();else startPlay();pokeHud()};
$('seek').oninput=e=>{seekTo(+e.target.value);pokeHud()};
$('stage').addEventListener('pointerdown',e=>{if(syncMode){e.preventDefault();syncTap();return}if($('setup').classList.contains('hidden'))pokeHud()});
addEventListener('keydown',e=>{if(!$('setup').classList.contains('hidden'))return;
  if(syncMode&&(e.code==='Backspace'||e.code==='KeyZ')){e.preventDefault();syncUndo();return}
  if(e.code==='Space'||e.code==='Enter'){e.preventDefault();if(syncMode)syncTap();else{playing?pausePlay():startPlay()}}});

/* ---------- tap sync: start from any line, undo, 0.75× mode ----------
   Taps overwrite one line at a time, so stopping half-way keeps every earlier tap and every later line's old value. */
let SLOW=lsGet('rz_slow','0')==='1',syncHist=[],tapWall=0,LSEL=-1;
function syncShow(){const L=LINES[syncIdx];
  $('syncInfo').innerHTML=L?`<div class="k">TAP SYNC · ${syncIdx+1} / ${LINES.length} · ${esc(L.sec.label)}${RATE!==1?' · '+RATE+'×':''}</div>다음 줄이 시작될 때 탭: <b>${esc(L.text)}</b>`:'완료!';
  $('syncUndo').disabled=!syncHist.length}
function startSync(from){if(!LINES.length||EXPORTING)return;from=clamp(from|0,0,LINES.length-1);
  syncMode=true;syncIdx=from;syncHist=[];tapWall=0;hideSetup();$('hud').classList.add('hidden');$('syncBar').classList.remove('hidden');
  setRate(SLOW?0.75:1);syncShow();
  const L=LINES[from],lead=Math.min(L.start-3,from>0?LINES[from-1].start-0.3:Infinity);   // start a little before the previous line so there's context
  seekTo(Math.max(0,lead+OFF));startPlay()}
function syncTap(){if(syncIdx>=LINES.length)return;const w=performance.now();if(w-tapWall<120)return;tapWall=w;   // ignore accidental double taps
  syncHist.push({i:syncIdx,prev:overrides[syncIdx]});overrides[syncIdx]=now()-0.08*RATE-OFF;applyTimes();saveOverrides();syncIdx++;syncShow();
  if(syncIdx>=LINES.length)setTimeout(()=>{if(syncMode&&syncIdx>=LINES.length)endSync()},600)}
function syncUndo(){const h=syncHist.pop();if(!h)return;if(h.prev==null)delete overrides[h.i];else overrides[h.i]=h.prev;applyTimes();saveOverrides();
  syncIdx=h.i;syncShow();seekTo(Math.max(0,now()-3));if(!playing)startPlay()}
function endSync(){syncMode=false;setRate(1);saveOverrides();$('syncBar').classList.add('hidden');refreshInfo()}
$('bSync').onclick=()=>startSync(0);
$('syncUndo').onclick=e=>{e.stopPropagation();syncUndo()};
$('syncStop').onclick=e=>{e.stopPropagation();endSync();pausePlay();showSetup()};
$('bSyncReset').onclick=()=>{overrides={};lsSet(syncKey(),'{}');applyTimes();refreshInfo()};
$('cSlow').checked=SLOW;$('cSlow').onchange=e=>{SLOW=e.target.checked;lsSet('rz_slow',SLOW?'1':'0')};

/* ---------- per-line timing editor ---------- */
const fmtT=t=>{t=Math.max(0,t);return Math.floor(t/60)+':'+(t%60).toFixed(2).padStart(5,'0')};
function renderLines(){const box=$('lineList');if(!box)return;if(LSEL>=LINES.length)LSEL=-1;
  let h='',ps=null;
  LINES.forEach((L,i)=>{if(L.sec!==ps){ps=L.sec;h+=`<li class="lsec">${esc(L.sec.label)}</li>`}
    const pin=overrides[i]!=null,on=i===LSEL;
    h+=`<li class="ln${on?' on':''}"><button class="lt" data-i="${i}" aria-expanded="${on}"><span class="tm">${fmtT(L.start+OFF)}</span><span class="tx">${esc(L.text)}</span>${pin?'<span class="pn">고정</span>':''}</button>`+
      (on?`<div class="lc"><button class="btn ghost" data-a="-">−0.05초</button><button class="btn ghost" data-a="+">+0.05초</button><button class="btn ghost" data-a="play">▶ 듣기</button><button class="btn ghost" data-a="tap">여기부터 탭</button>${pin?'<button class="btn ghost" data-a="auto">자동으로</button>':''}</div>`:'')+'</li>'});
  box.innerHTML=h;$('lineCnt').textContent=LINES.length?`· ${LINES.length}줄`:''}
$('lineList').addEventListener('click',e=>{const b=e.target.closest('button');if(!b||EXPORTING)return;
  if(b.classList.contains('lt')){const i=+b.dataset.i;LSEL=LSEL===i?-1:i;renderLines();return}
  const i=LSEL,L=LINES[i],a=b.dataset.a;if(!L)return;
  if(a==='-'||a==='+'){overrides[i]=Math.max(0,L.start+(a==='+'?0.05:-0.05));applyTimes();saveOverrides();refreshInfo()}   // nudging pins the line; neighbours re-interpolate
  else if(a==='auto'){delete overrides[i];applyTimes();saveOverrides();refreshInfo()}
  else if(a==='play'){hideSetup();seekTo(Math.max(0,L.start+OFF-1.5));startPlay();pokeHud()}
  else if(a==='tap')startSync(i)});

/* ---------- saving: fast offline MP4 (75_export) first, realtime recording as the fallback ---------- */
let DL=null;try{if(window.claude&&window.claude.use)window.claude.use('downloads').then(x=>{DL=x}).catch(()=>{})}catch(e){}
let PLAN_P=null,WAKE=null,SAVE_URL=null;
const getPlan=()=>PLAN_P||(PLAN_P=exportPlan().catch(()=>null));   // cached so the click handler stays inside the user gesture
async function wake(on){try{if(on&&!WAKE&&navigator.wakeLock){WAKE=await navigator.wakeLock.request('screen');WAKE.addEventListener('release',()=>{WAKE=null})}
  else if(!on&&WAKE){const w=WAKE;WAKE=null;await w.release()}}catch(e){WAKE=null}}
function outName(ext){const slug=(metaTitle()==='UNTITLED'?'lyric_motion':metaTitle()).toLowerCase().replace(/[^0-9a-z가-힣]+/g,'_').replace(/^_|_$/g,'')||'lyric_motion';
  return `${slug}_${DIR_KEY}_${aspect.replace(':','x')}.${ext}`}
function offerSave(blob){
  const out=$('recOut'),type=blob.type||'video/webm',ext=type.includes('mp4')?'mp4':'webm',name=outName(ext);
  const label=`영상 파일 저장 (${(blob.size/1048576).toFixed(1)}MB · ${ext.toUpperCase()})`;
  if(DL){out.innerHTML=`<div class="row"><button class="btn primary" id="bSave">${label}</button></div><div class="note" id="saveMsg"></div>`;
    $('bSave').onclick=()=>{DL.save({filename:name,data:blob}).then(()=>{$('saveMsg').innerHTML='<b>저장했어요.</b> 아이폰이면 공유 시트에서 "비디오 저장"을 누르면 사진 앱에 들어가요.'}).catch(e=>{const c=e&&e.code;$('saveMsg').textContent=c==='declined'?'저장을 취소했어요. 다시 누르면 저장할 수 있어요.':c==='rate_limited'?'잠시 후 다시 눌러 주세요.':'이 화면에서는 저장할 수 없어요. 재생 중 화면 기록으로 저장해 주세요.'})};return}
  if(SAVE_URL)URL.revokeObjectURL(SAVE_URL);SAVE_URL=URL.createObjectURL(blob);
  out.innerHTML=`<div class="row"><a class="btn primary" href="${SAVE_URL}" download="${name}">${label}</a><button class="btn ghost" id="bShare">공유 · 사진에 저장</button></div>`;
  const file=new File([blob],name,{type});$('bShare').onclick=()=>{if(navigator.canShare&&navigator.canShare({files:[file]}))navigator.share({files:[file]}).catch(()=>{});else $('bShare').textContent='이 브라우저는 공유를 지원하지 않아요'}}
$('bRec').onclick=async()=>{
  if(EXPORTING||recording)return;const out=$('recOut');
  if(!hasAudio||!AUDIO_FILE){out.innerHTML='<b>영상을 만들려면 01에서 음원 파일을 먼저 선택해 주세요.</b>';return}
  const plan=await getPlan();if(plan)runExport(plan);else startRec()};
async function runExport(plan){
  const out=$('recOut'),setup=$('setup');pausePlay();setRate(1);
  out.innerHTML=`<div class="prog"><i id="expBar"></i></div><div class="row"><span class="grow" id="expMsg">영상 만드는 중…</span><button class="btn ghost" id="bExpStop">멈추기</button></div>`+
    `<div class="note">재생하지 않고 프레임을 하나씩 그려서 MP4로 만들어요. 이 화면을 켜 둔 채로 기다려 주세요 — 다른 앱으로 가면 멈춰요.</div>`;
  $('bExpStop').onclick=()=>{EXP_CANCEL=true};setup.classList.add('busy');wake(true);out.scrollIntoView({block:'nearest'});
  try{const blob=await fastExport(plan,AUDIO_FILE,(p,eta)=>{const b=$('expBar'),m=$('expMsg');if(!b)return;b.style.width=(p*100).toFixed(1)+'%';
      m.textContent=`영상 만드는 중… ${Math.floor(p*100)}%`+(eta>1?` · 약 ${eta<60?Math.ceil(eta)+'초':Math.ceil(eta/60)+'분'} 남음`:'')});
    offerSave(blob)}
  catch(e){   // cancelled or failed: offer realtime recording (a fresh tap, so playback is allowed on iOS)
    out.innerHTML=(EXP_CANCEL?'멈췄어요. 다시 누르면 처음부터 만들어요. 이 기기에서 너무 오래 걸리면 재생하면서 녹화할 수도 있어요.':`<b>빠른 저장에 실패했어요.</b> ${esc(String(e&&e.message||e))}`)+
      '<div class="row"><button class="btn ghost" id="bRecRT">재생하면서 녹화하기</button></div>';$('bRecRT').onclick=()=>startRec()}
  finally{setup.classList.remove('busy');wake(false)}}
function pickMime(){if(!window.MediaRecorder)return null;for(const m of ['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm']){try{if(MediaRecorder.isTypeSupported(m))return m}catch(e){}}return ''}
async function startRec(){
  const out=$('recOut');if(EXPORTING||recording)return;
  const mime=pickMime();if(mime===null||!cv.captureStream){out.innerHTML='<b>이 브라우저는 화면 녹화를 지원하지 않아요.</b> 재생 중 화면 기록(제어 센터)으로 저장해 주세요.';return}
  setRate(1);ensureGraph();if(actx)await actx.resume();
  const vs=cv.captureStream(30);const tracks=[...vs.getVideoTracks()];if(msDest)tracks.push(...msDest.stream.getAudioTracks());
  try{recorder=new MediaRecorder(new MediaStream(tracks),mime?{mimeType:mime,videoBitsPerSecond:14000000}:{videoBitsPerSecond:14000000})}catch(e){out.innerHTML='<b>녹화를 시작하지 못했어요.</b> '+esc(e.message);return}
  recChunks=[];recorder.ondataavailable=e=>{if(e.data&&e.data.size)recChunks.push(e.data)};
  recorder.onstop=()=>{offerSave(new Blob(recChunks,{type:recorder.mimeType||mime||'video/webm'}));recChunks=[]};
  hideSetup();seekTo(0);out.textContent='';wake(true);await new Promise(r=>setTimeout(r,150));
  recorder.start(1000);recording=true;$('recBadge').classList.remove('hidden');await startPlay();pokeHud();
}
function stopRec(){if(recorder&&recording){recording=false;try{recorder.stop()}catch(e){}}$('recBadge').classList.add('hidden');wake(false)}

/* ---------- init ---------- */
(function init(){
  const a=lsGet('rz_aspect','16:9');setAspect(a);document.querySelectorAll('#segAspect button').forEach(x=>x.classList.toggle('on',x.dataset.a===a));
  initPost();
  OFF=+lsGet('rz_off',0)||0;$('rOff').value=OFF;$('rOff').oninput({target:$('rOff')});
  INTENSITY=+lsGet('rz_int',1)||1;$('rInt').value=INTENSITY;$('intVal').textContent=Math.round(INTENSITY*100)+'%';
  lyricsText=lsGet('rz_lyrics','');$('lyrics').value=lyricsText;
  setSong(demoSong());
  try{const m=JSON.parse(lsGet('rz_meta','{}'));$('inTitle').value=m.t||'';$('inArtist').value=m.a||'';$('inFeat').value=m.f||''}catch(e){}
  saveMeta();
  setDirection(DIR_LOCK?lsGet('rz_dir','brutal'):'brutal');
  build();AI_EMPH_ON=lsGet('rz_aiemph',userMarked?'0':'1')==='1';direct();autoPick();loadAI();refreshInfo();refreshAIUI();
  getPlan().then(p=>{$('expNote').innerHTML=p?'<b>빠른 저장</b> · 재생하지 않고 곡 길이보다 빠르게 MP4로 만들어요.':'이 브라우저는 <b>재생하면서 녹화</b>해요. 곡이 끝날 때까지 화면을 켜 두세요.'});
  loop();
  Object.assign(window,{__frame:t=>frame(t),__setLyrics:s=>{lyricsText=s;build();autoPick();refreshInfo()},__aspect:setAspect,__lines:()=>LINES,
    __song:()=>({...SONG,kicks:KICKS.length,snares:SNARES.length,nov:undefined,preset:!!PRESET,NB}),__setSong:setSong,__build:()=>{build();refreshInfo()},
    __dir:k=>{setDirection(k);direct()},__post:()=>({ok:POST.ok,mip:POST.mip}),__auto:()=>AUTO_PICK,__applyAI:applyAI,__aiPrompt:aiPrompt});
})();
