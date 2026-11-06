/* ============================================================
   80 · APP — metadata, analysis UI, direction picker, playback,
        tap-sync, recording, init
   ============================================================ */
/* empty fields stay empty on screen: title falls back to the audio file name, artist is simply hidden */
let AUDIO_TITLE='';
const fileTitle=n=>n.replace(/\.[^.]+$/,'').replace(/^\s*\d{1,3}\s*[-._)]?\s+/,'').replace(/_+/g,' ').replace(/\s+/g,' ').trim().slice(0,40);
function metaTitle(){return (($('inTitle')&&$('inTitle').value.trim())||(PRESET&&PRESET.title)||AUDIO_TITLE||'').toUpperCase()}
function titleText(){return metaTitle()||'LYRIC MOTION'}
function metaArtist(){return (($('inArtist')&&$('inArtist').value.trim())||(PRESET&&PRESET.artist)||'').toUpperCase()}
function credit(sep){const a=metaArtist(),f=metaFeat();return [a,f?'FEAT. '+f:''].filter(Boolean).join(sep)}
function metaFeat(){return (($('inFeat')&&$('inFeat').value.trim())||(PRESET&&PRESET.feat)||'').toUpperCase()}
function secArtist(sec){return sec.artist?sec.artist.toUpperCase():metaArtist()}
function saveMeta(){lsSet('rz_meta',JSON.stringify({t:$('inTitle').value,a:$('inArtist').value,f:$('inFeat').value}));$('hTitle').textContent=titleText();projTouch()}

/* ---------- direction picker ---------- */
let DIR_LOCK=lsGet('rz_dir_lock','0')==='1';
function autoPick(){AUTO_PICK=autoDirection(SONG&&SONG.feats,usingDemo?'':lyricsText);if(PRESET&&PRESET.direction){AUTO_PICK.key=PRESET.direction;AUTO_PICK.why[PRESET.direction].unshift(T('이 곡 전용 프리셋','preset for this track'))}
  if(!DIR_LOCK&&AUTO_PICK.key!==DIR_KEY){setDirection(AUTO_PICK.key);direct()}renderDirCards()}
function renderDirCards(){
  const box=$('dirCards');if(!box)return;
  box.innerHTML=DIR_KEYS.map(k=>{const d=DIRECTIONS[k];const pv=d.roles.verseA.pal({firstStart:0,lastEnd:1},0.5,{li:0}),pc=d.roles.chorus.pal({firstStart:0,lastEnd:1},0,{li:0}),pb=d.roles.verseB.pal({},0,{li:0});
    const sw=[pv.bg,pv.ac,pc.bg,pc.ac,pb.bg].map(c=>`<i style="background:${c}"></i>`).join('');
    return `<button class="dir${k===DIR_KEY?' on':''}" data-k="${k}"><span class="sw">${sw}</span><b>${d.name}</b>${AUTO_PICK&&AUTO_PICK.key===k?T('<em>추천</em>','<em>PICK</em>'):''}<small>${esc(T(d.desc,d.descEn||d.desc))}</small></button>`}).join('');
  box.querySelectorAll('.dir').forEach(b=>b.onclick=()=>{setDirection(b.dataset.k);DIR_LOCK=true;lsSet('rz_dir',b.dataset.k);lsSet('rz_dir_lock','1');direct();renderDirCards();refreshInfo()});
  const w=AUTO_PICK?AUTO_PICK.why[AUTO_PICK.key]:[];
  $('dirWhy').innerHTML=AUTO_PICK?`${T('추천','Suggested:')} <b>${DIRECTIONS[AUTO_PICK.key].name}</b>${w.length?' · '+w.map(esc).join(' · '):''}${DIR_LOCK&&DIR_KEY!==AUTO_PICK.key?T(` · 지금은 직접 고른 <b>${DIR.name}</b> <a href="#" id="dirAuto">추천으로 되돌리기</a>`,` · now using your pick <b>${DIR.name}</b> <a href="#" id="dirAuto">back to suggestion</a>`):''}`:'';
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
function showAnalysis(){const f=SONG.feats;$('anInfo').innerHTML=T(`<b>분석 완료</b> · ${+SONG.bpm.toFixed(1)} BPM · ${NB}마디 · 킥 ${KICKS.length} · 가사 시작 ${SONG.startBar+1}마디`,`<b>Analysed</b> · ${+SONG.bpm.toFixed(1)} BPM · ${NB} bars · ${KICKS.length} kicks · vocals from bar ${SONG.startBar+1}`)+
  (f?T(`<br><span class="dim">에너지 ${f.loud} dB · 다이내믹 ${f.dyn} dB · 리듬 밀도 ${f.density}/s · 밝기 ${f.bright} · 저음 ${f.lowW}</span>`,`<br><span class="dim">level ${f.loud} dB · dynamics ${f.dyn} dB · density ${f.density}/s · brightness ${f.bright} · low end ${f.lowW}</span>`):'')+T(`<br>화면 흔들림이 박자보다 두 배 빠르거나 느리면 아래 버튼으로 고쳐 주세요.`,`<br>If the shake runs twice as fast or slow as the beat, fix it with the buttons below.`);$('bpmRow').classList.remove('hidden')}
function scaleBpm(f){if(!SONG||SONG.demo)return;const o={...SONG,preset:null,bpm:SONG.bpm*f};const nv=SONG.nov||[];
  if(f>1){o.startBar=SONG.startBar*2;o.endBar=SONG.endBar*2;o.nov=nv.flatMap(v=>[v,0])}else{o.startBar=Math.floor(SONG.startBar/2);o.endBar=Math.ceil(SONG.endBar/2);o.nov=nv.reduce((a,v,i)=>{a[i>>1]=Math.max(a[i>>1]||0,v);return a},[])}
  setSong(o);build();refreshInfo();showAnalysis()}
function loadAI(){try{const r=JSON.parse(lsGet(aiKey(),'null'));if(r){AI_RESULT=r;(r.sections||[]).forEach(s=>{const sec=SECS[+s.i];if(sec){sec.intensity=clamp(+s.intensity||0.6);sec.mood=String(s.mood||'').slice(0,24)}});direct();if($('aiStatus'))$('aiStatus').innerHTML=aiSummary(r)+T(' <span class="dim">(저장된 분석)</span>',' <span class="dim">(saved analysis)</span>')}}catch(e){}}
function refreshInfo(){
  const em=LINES.reduce((a,L)=>a+L.words.filter(w=>w.emph).length,0),synced=Object.keys(overrides).length;
  const secList=SECS.map(s=>s.label+(s.artist?' ('+esc(s.artist.toUpperCase())+')':'')+' '+T((Math.round((s.firstStart-T0)/BAR)+1)+'마디~','@'+(Math.round((s.firstStart-T0)/BAR)+1))).join(' / ');
  $('parseInfo').innerHTML=usingDemo?T('가사가 비어 있어서 <b>예시 문구</b>로 재생돼요.','No lyrics yet, so <b>sample text</b> plays.'):T(`<b>${SECS.length}개 구간 · ${LINES.length}줄</b> 인식 · 강조 ${em}개 · ${secList}`,`<b>${SECS.length} sections · ${LINES.length} lines</b> · ${em} emphasised · ${secList}`);
  $('bSyncReset').textContent=synced?T(`싱크 초기화 (${synced}줄 저장됨)`,`Reset sync (${synced} saved)`):T('싱크 초기화','Reset sync');
  if($('cAIEmph'))$('cAIEmph').checked=AI_EMPH_ON;
  renderLines();
}

/* ---------- playback ---------- */
const au=$('au');let hasAudio=false,playing=false,clock0=0,clockT=0,actx=null,msDest=null;
let syncMode=false,syncIdx=0,recorder=null,recChunks=[],recording=false,hudTimer=0,RATE=1,AUDIO_FILE=null;
function now(){if(YT_ON)return ytNow();if(hasAudio)return au.currentTime||0;return playing?clockT+(performance.now()/1000-clock0)*RATE:clockT}
function setRate(r){if(r===RATE)return;if(YT_ON){RATE=r;try{YTP.setPlaybackRate(r)}catch(e){}return}if(!hasAudio){clockT=now();clock0=performance.now()/1000}RATE=r;if(hasAudio){try{au.playbackRate=r}catch(e){}}}
function seekTo(s){s=clamp(s,0,SONG_END);if(YT_ON){try{YTP.seekTo(s,true)}catch(e){}ytLast={rep:-1,wall:0,out:null};return}if(hasAudio){try{au.currentTime=s}catch(e){}}else{clockT=s;clock0=performance.now()/1000}}
function startPlay(){hideEnd();if(YT_ON){try{YTP.playVideo()}catch(e){}return Promise.resolve()}if(hasAudio){if(actx&&actx.state!=='running')actx.resume();return au.play().then(()=>{playing=true}).catch(()=>{playing=false})}clock0=performance.now()/1000;playing=true;return Promise.resolve()}
function pausePlay(){if(YT_ON){try{YTP.pauseVideo()}catch(e){}playing=false;return}if(hasAudio)au.pause();else clockT=now();playing=false}
function ensureGraph(){if(actx)return;try{const AC=window.AudioContext||window.webkitAudioContext;actx=new AC();const src=actx.createMediaElementSource(au);src.connect(actx.destination);if(actx.createMediaStreamDestination){msDest=actx.createMediaStreamDestination();src.connect(msDest)}}catch(e){actx=null;msDest=null}}
function onEnded(){playing=false;if(recording){stopRec();showSetup();return}if(syncMode){endSync();showSetup();return}showEnd()}   // plain playback ends on replay/save/settings, not the long form
function showEnd(){$('hud').classList.add('hidden');$('endBar').classList.remove('hidden')}
function hideEnd(){$('endBar').classList.add('hidden')}
au.addEventListener('ended',onEnded);au.addEventListener('pause',()=>{if(!au.ended)playing=false});au.addEventListener('play',()=>{playing=true});
function showSetup(){hideEnd();$('setup').classList.remove('hidden');$('hud').classList.add('hidden')}
function hideSetup(){$('setup').classList.add('hidden')}
function pokeHud(){if(syncMode)return;const h=$('hud');h.classList.remove('hidden');h.classList.remove('fade');clearTimeout(hudTimer);hudTimer=setTimeout(()=>h.classList.add('fade'),2600)}
function updateHud(t){$('seek').value=t;const m=Math.floor(t/60),s=(t%60).toFixed(1).padStart(4,'0');$('tc').textContent=`${m}:${s}`;$('hPlay').textContent=playing?'❚❚':'▶';$('hMenu').textContent=recording?T('녹화 중지','Stop rec'):T('설정','Settings')}
function loop(){if(!EXPORTING){const t=now();if(!hasAudio&&!YT_ON&&playing&&t>=SONG_END){clockT=SONG_END;onEnded()}frame(t);updateHud(t)}requestAnimationFrame(loop)}   // the offline exporter owns the canvas while it runs

/* ---------- inputs ---------- */
let deb=0;
const lyricsChanged=()=>{lsSet('rz_lyrics',lyricsText);projTouch();AI_RESULT=null;build();autoPick();loadAI();refreshInfo()};
$('lyrics').addEventListener('input',()=>{clearTimeout(deb);deb=setTimeout(()=>{lyricsText=$('lyrics').value;lyricsChanged()},300)});
$('bDemo').onclick=()=>{$('lyrics').value=DEMO;lyricsText=DEMO;lyricsChanged()};
$('bClear').onclick=()=>{$('lyrics').value='';lyricsText='';lyricsChanged()};
$('fLyr').onchange=e=>{const f=e.target.files[0];if(!f)return;f.text().then(s=>{$('lyrics').value=s;lyricsText=s;lyricsChanged()})};
$('fAudio').onchange=e=>{const f=e.target.files[0];if(f)loadAudioFile(f,true)};
async function loadAudioFile(f,store){
  if(au.src)try{URL.revokeObjectURL(au.src)}catch(x){}
  au.src=URL.createObjectURL(f);au.load();hasAudio=true;playing=false;AUDIO_FILE=f;RATE=1;AUDIO_TITLE=fileTitle(f.name);
  if(YT_ON||YTP)ytClose();if(MANUAL){MANUAL=null;lsDel('rz_manual');$('manualMsg').textContent='';$('ytMsg').textContent=''}saveMeta();if(store)projStoreAudio(f);
  $('audioName').innerHTML=`<b>${esc(f.name)}</b> · ${T('준비됨','ready')}`;
  const key='rz_an6_'+f.name+'_'+f.size;let an=null;try{an=JSON.parse(lsGet(key,'null'))}catch(x){}
  if(!an){$('anInfo').innerHTML=T('<b>곡 분석 중…</b> 박자 · 킥 · 스네어 · 구간 · 분위기 · 보컬 (몇 초 걸려요)','<b>Analysing…</b> tempo · kicks · snares · sections · mood · vocals (a few seconds)');$('bpmRow').classList.add('hidden');
    try{an=await analyzeFile(f);lsSet(key,JSON.stringify(an))}catch(err){$('anInfo').innerHTML=T('<b>이 파일은 분석하지 못했어요.</b> 기본 박자로 재생되니 탭 싱크로 맞춰 주세요.','<b>Couldn\'t analyse this file.</b> It plays on a default beat — use tap sync.');return}}
  applyAnalysis(an)}
/* ---------- no audio file: length + tempo, silent export ---------- */
let MANUAL=null,tapT=[];
function useManual(m,quiet){MANUAL=m;lsSet('rz_manual',JSON.stringify(m));if(!m.yt&&(YT_ON||YTP))ytClose();
  if(hasAudio){au.pause();au.removeAttribute('src');au.load();hasAudio=false;AUDIO_FILE=null;AUDIO_TITLE='';$('audioName').textContent=T('음원 없음 · 소리 없는 영상으로 만들어요','No audio · making a silent video');projStoreAudio(null)}
  playing=false;clockT=0;setSong(manualSong(m.dur,m.bpm));build();autoPick();refreshInfo();saveMeta();$('bpmRow').classList.add('hidden');
  $('anInfo').innerHTML=`<b>${m.yt?T('유튜브로 만들기','From YouTube'):T('음원 없이 만들기','No audio file')}</b> · ${fmtT(m.dur).replace(/\.\d+$/,'')} · ${m.bpm} BPM`;
  if(m.yt)return;
  if(!quiet)$('manualMsg').innerHTML=T('준비됐어요. <b>05 싱크</b>에서 다른 앱으로 노래를 틀고 탭 싱크하세요. 저장한 영상은 소리가 없으니, 릴스·틱톡·쇼츠 편집 화면에서 같은 곡을 넣고 곡의 처음(0:00)부터 시작하게 맞추세요.','Ready. In <b>05 Sync</b>, play the song in another app and tap along. The saved video is silent — add the same song in the Reels/TikTok/Shorts editor, starting at 0:00.')}
$('bManual').onclick=()=>{const d=(+$('inMin').value||0)*60+(+$('inSec').value||0),bp=+$('inBpm').value||120;
  if(d<10||d>1200){$('manualMsg').innerHTML=T('<b>곡 길이</b>를 분·초로 넣어 주세요 (10초~20분).','Enter the <b>song length</b> in minutes and seconds (10 s – 20 min).');return}
  useManual({dur:d,bpm:Math.round(clamp(bp,60,200)*10)/10})};
/* YouTube link: the song plays in the embedded player, which drives the clock (79_youtube) */
const YT_READY=()=>T('준비됐어요. 노래는 오른쪽 유튜브 플레이어에서 나와요 (⇅로 위아래 옮길 수 있어요). <b>▶ 재생</b>으로 미리 보고, <b>05 싱크</b>에서 탭 싱크하세요. 빠르기(BPM)를 모르면 재생하면서 <b>박자에 맞춰 탭</b>을 눌러 주세요. 저장한 영상은 소리가 없으니 릴스·틱톡·쇼츠 편집 화면에서 같은 곡을 넣고 곡의 처음(0:00)부터 시작하게 맞추세요.',
  'Ready. The song plays in the YouTube player on the right (⇅ moves it up or down). Preview with <b>▶ Play</b> and tap along in <b>05 Sync</b>. Unsure of the BPM? Press <b>Tap the beat</b> while it plays. The saved video is silent — add the same song in the Reels/TikTok/Shorts editor, starting at 0:00.');
function openYt(id,quiet){$('ytMsg').innerHTML=quiet?'':T('유튜브 영상을 불러오는 중…','Loading the YouTube video…');
  return ytOpen(id).then(({dur})=>{const d=Math.round(dur*100)/100;$('inMin').value=Math.floor(d/60);$('inSec').value=Math.round(d%60);
    useManual({dur:d,bpm:MANUAL&&MANUAL.yt===id?MANUAL.bpm:Math.round(clamp(+$('inBpm').value||120,60,200)*10)/10,yt:id},quiet);$('ytMsg').innerHTML=YT_READY()})
  .catch(e=>{$('ytMsg').innerHTML='<b>'+esc(e.message)+'</b>'})}
$('bYt').onclick=()=>{const id=ytId($('inYt').value);if(!id){$('ytMsg').innerHTML=T('<b>유튜브 링크</b>를 붙여 넣어 주세요 (youtube.com/watch?v=…, youtu.be/…, 쇼츠 링크).','Paste a <b>YouTube link</b> (youtube.com/watch?v=…, youtu.be/…, or a Shorts link).');return}openYt(id)};
/* tempo typed or tapped while in no-audio mode applies right away (keeps the YouTube video) */
$('inBpm').addEventListener('change',()=>{if(MANUAL&&+$('inBpm').value)useManual({...MANUAL,bpm:Math.round(clamp(+$('inBpm').value,60,200)*10)/10},true)});
$('bTapBpm').onclick=()=>{const n=performance.now()/1000;if(tapT.length&&n-tapT[tapT.length-1]>2)tapT=[];tapT.push(n);tapT=tapT.slice(-9);
  if(tapT.length<4){$('bTapBpm').textContent=T(`박자에 맞춰 계속 탭 (${tapT.length})`,`Keep tapping (${tapT.length})`);return}
  const iv=tapT.slice(1).map((t,i)=>t-tapT[i]).sort((a,b)=>a-b),bp=Math.round(60/iv[iv.length>>1]);$('inBpm').value=bp;if(MANUAL)useManual({...MANUAL,bpm:bp},true);$('bTapBpm').textContent=T(`${bp} BPM · 계속 탭하면 더 정확해요`,`${bp} BPM · keep tapping to refine`)};
$('bBpmDbl').onclick=()=>scaleBpm(2);$('bBpmHalf').onclick=()=>scaleBpm(0.5);
['inTitle','inArtist','inFeat'].forEach(id=>$(id).addEventListener('input',()=>{saveMeta();refreshInfo()}));
document.querySelectorAll('#segAspect button').forEach(b=>b.onclick=()=>{document.querySelectorAll('#segAspect button').forEach(x=>x.classList.toggle('on',x===b));setAspect(b.dataset.a);lsSet('rz_aspect',b.dataset.a);PLAN_P=null});
$('rOff').oninput=e=>{OFF=+e.target.value;$('offVal').textContent=(OFF>0?'+':OFF<0?'−':'±')+Math.abs(OFF).toFixed(2)+T('초','s');lsSet('rz_off',OFF);renderLines()};
$('rInt').oninput=e=>{INTENSITY=+e.target.value;$('intVal').textContent=Math.round(INTENSITY*100)+'%';lsSet('rz_int',INTENSITY);direct()};
$('bAI').onclick=()=>runAI();$('bAIStop').onclick=()=>{if(aiCtl)aiCtl.abort()};
$('cAIEmph').onchange=e=>{AI_EMPH_ON=e.target.checked;lsSet('rz_aiemph',AI_EMPH_ON?'1':'0');direct();refreshInfo()};
$('bPlay').onclick=()=>{hideSetup();if(now()>=SONG_END-0.5||now()<0.01)seekTo(0);startPlay();pokeHud()};
$('hMenu').onclick=e=>{e.stopPropagation();if(recording){stopRec();pausePlay()}else pausePlay();showSetup()};
$('hFull').onclick=e=>{e.stopPropagation();$('hud').classList.add('fade')};
$('hPlay').onclick=e=>{e.stopPropagation();if(playing)pausePlay();else startPlay();pokeHud()};
$('seek').oninput=e=>{seekTo(+e.target.value);pokeHud()};
$('endReplay').onclick=e=>{e.stopPropagation();seekTo(0);startPlay();pokeHud()};
$('endSave').onclick=e=>{e.stopPropagation();showSetup();$('bRec').scrollIntoView({block:'center'});$('bRec').click()};
$('endSetup').onclick=e=>{e.stopPropagation();showSetup()};
$('stage').addEventListener('pointerdown',e=>{if(syncMode){e.preventDefault();syncTap();return}if($('setup').classList.contains('hidden'))pokeHud()});
addEventListener('keydown',e=>{if(!$('setup').classList.contains('hidden'))return;
  if(syncMode&&(e.code==='Backspace'||e.code==='KeyZ')){e.preventDefault();syncUndo();return}
  if(e.code==='Space'||e.code==='Enter'){e.preventDefault();if(syncMode)syncTap();else{playing?pausePlay():startPlay()}}});

/* ---------- tap sync: start from any line, undo, 0.75× mode ----------
   Taps overwrite one line at a time, so stopping half-way keeps every earlier tap and every later line's old value. */
let SLOW=lsGet('rz_slow','0')==='1',SNAP=lsGet('rz_snap','1')==='1',syncHist=[],tapWall=0,LSEL=-1;
function syncShow(){const L=LINES[syncIdx];
  $('syncInfo').innerHTML=L?`<div class="k">TAP SYNC · ${syncIdx+1} / ${LINES.length} · ${esc(L.sec.label)}${RATE!==1?' · '+RATE+'×':''}</div>${T('다음 줄이 시작될 때 탭','Tap when this line starts')}: <b>${esc(L.text)}</b>`:T('완료!','Done!');
  $('syncUndo').disabled=!syncHist.length}
function startSync(from){if(!LINES.length||EXPORTING)return;from=clamp(from|0,0,LINES.length-1);
  syncMode=true;syncIdx=from;syncHist=[];tapWall=0;hideSetup();$('hud').classList.add('hidden');$('syncBar').classList.remove('hidden');
  setRate(SLOW?0.75:1);syncShow();
  const L=LINES[from],lead=Math.min(L.start-3,from>0?LINES[from-1].start-0.3:Infinity);   // start a little before the previous line so there's context
  const at=hasAudio||from>0?Math.max(0,lead+OFF):0;seekTo(at);
  if(hasAudio||YT_ON){startPlay();return}
  /* no audio here: the song plays in another app, so count down and let the user press play there at the same moment */
  let n=3;const tick=()=>{if(!syncMode)return;if(n===0){$('syncInfo').innerHTML='<div class="k">TAP SYNC</div>'+T('지금 재생!','Play now!');startPlay();setTimeout(()=>{if(syncMode)syncShow()},700);return}
    const tt=fmtT(at).replace(/\.\d+$/,'');$('syncInfo').innerHTML=`<div class="k">TAP SYNC · ${n}</div>`+T(`다른 앱에서 노래를 <b>${tt}</b>에 맞춰 두고, 0이 되는 순간 재생하세요`,`Cue the song to <b>${tt}</b> in your music app and press play at 0`);n--;syncCD=setTimeout(tick,1000)};tick()}
let syncCD=0;
function syncTap(){if(syncIdx>=LINES.length||!playing)return;const w=performance.now();if(w-tapWall<120)return;tapWall=w;   // ignore accidental double taps
  let t=now()-0.08*RATE;if(SNAP&&hasAudio)t=snapToVocal(t);   // tap correction: nearest vocal onset within −0.2/+0.12 s
  syncHist.push({i:syncIdx,prev:overrides[syncIdx],auto:autoSet.has(syncIdx)});overrides[syncIdx]=t-OFF;autoSet.delete(syncIdx);applyTimes();saveOverrides();syncIdx++;syncShow();
  if(syncIdx>=LINES.length)setTimeout(()=>{if(syncMode&&syncIdx>=LINES.length)endSync()},600)}
function syncUndo(){const h=syncHist.pop();if(!h)return;if(h.prev==null)delete overrides[h.i];else overrides[h.i]=h.prev;if(h.auto)autoSet.add(h.i);applyTimes();saveOverrides();
  syncIdx=h.i;syncShow();seekTo(Math.max(0,now()-3));if(!playing)startPlay()}
function endSync(){clearTimeout(syncCD);syncMode=false;setRate(1);saveOverrides();$('syncBar').classList.add('hidden');refreshInfo()}
$('bSync').onclick=()=>startSync(0);
/* auto-sync (25_autosync): lines you tapped or nudged stay as anchors, the rest are fitted between them; one-step undo */
let AUTO_PREV=null;
$('bAuto').onclick=()=>{const out=$('autoMsg');
  if(!hasAudio||!SONG.vox){out.innerHTML=T('<b>음원 파일을 넣어야</b> 자동 싱크를 할 수 있어요.','Auto-sync needs an <b>audio file</b>.');return}
  const anchors={};Object.keys(overrides).forEach(k=>{const i=+k;if(i<LINES.length&&!autoSet.has(i))anchors[i]=overrides[i]+OFF});
  const r=autoSync(anchors);if(!r){out.innerHTML=T('<b>보컬을 충분히 찾지 못했어요.</b> 탭 싱크로 맞춰 주세요.','<b>Not enough vocals found.</b> Use tap sync instead.');return}
  const apply=()=>{AUTO_PREV={o:{...overrides},a:[...autoSet]};
    r.times.forEach((t,i)=>{if(!(i in anchors)){overrides[i]=t-OFF;autoSet.add(i)}});applyTimes();saveOverrides();refreshInfo();
    const n=LINES.length-r.anchored,keep=r.anchored?T(` (직접 맞춘 ${r.anchored}줄은 그대로)`,` (your ${r.anchored} set lines kept)`):'';
    out.innerHTML=T(`<b>${n}줄</b>을 보컬이 시작되는 곳에 맞췄어요${keep}${SONG.voxSt?'':' · 모노 음원이라 정확도가 낮아요'}. 재생해서 확인하고, 틀린 줄은 아래 <b>줄별 타이밍 다듬기</b>에서 고치거나 그 줄을 다시 탭한 뒤 <b>자동 싱크</b>를 한 번 더 누르세요 — 고친 줄을 기준으로 나머지를 다시 맞춰요. <a href="#" id="autoUndo">자동 싱크 전으로 되돌리기</a>`,
      `Matched <b>${n} lines</b> to where the vocals start${keep}${SONG.voxSt?'':' · mono audio, less accurate'}. Play it back; fix a wrong line in <b>Fine-tune line timing</b> or re-tap it, then press <b>Auto-sync</b> again — the rest is refitted around your fixes. <a href="#" id="autoUndo">Undo auto-sync</a>`);
    $('autoUndo').onclick=e=>{e.preventDefault();if(AUTO_PREV){overrides=AUTO_PREV.o;autoSet=new Set(AUTO_PREV.a)}applyTimes();saveOverrides();refreshInfo();out.textContent=T('자동 싱크 전으로 되돌렸어요.','Auto-sync undone.')}};
  if(r.confidence<0.33&&!r.anchored){   // a centred instrument plays throughout: the result is likely wrong, so ask first
    out.innerHTML=T('<b>이 곡은 자동 싱크가 틀릴 가능성이 커요.</b> 보컬 말고도 가운데에서 계속 나는 악기가 많아요. <b>탭 싱크</b>를 추천해요 — 탭 보정이 켜져 있으면 탭을 보컬 시작점에 맞춰 줘요. 몇 줄만 탭한 뒤 자동 싱크를 누르면 탭한 줄을 기준으로 맞춰요.',
      '<b>Auto-sync is likely to be wrong for this song</b> — a centred instrument plays alongside the vocals. <b>Tap sync</b> is recommended (tap correction snaps taps to vocal starts). Or tap a few lines, then auto-sync around them.')+
      `<div class="row"><button class="btn ghost" id="autoForce">${T('그래도 적용','Apply anyway')}</button></div>`;$('autoForce').onclick=apply;return}
  apply()};
$('syncUndo').onclick=e=>{e.stopPropagation();syncUndo()};
$('syncStop').onclick=e=>{e.stopPropagation();endSync();pausePlay();showSetup()};
$('bSyncReset').onclick=()=>{overrides={};autoSet.clear();saveOverrides();applyTimes();refreshInfo()};
$('cSlow').checked=SLOW;$('cSlow').onchange=e=>{SLOW=e.target.checked;lsSet('rz_slow',SLOW?'1':'0')};
$('cSnap').checked=SNAP;$('cSnap').onchange=e=>{SNAP=e.target.checked;lsSet('rz_snap',SNAP?'1':'0')};

/* ---------- per-line timing editor ---------- */
const fmtT=t=>{t=Math.max(0,t);return Math.floor(t/60)+':'+(t%60).toFixed(2).padStart(5,'0')};
function renderLines(){const box=$('lineList');if(!box)return;if(LSEL>=LINES.length)LSEL=-1;
  let h='',ps=null;
  LINES.forEach((L,i)=>{if(L.sec!==ps){ps=L.sec;h+=`<li class="lsec">${esc(L.sec.label)}</li>`}
    const pin=overrides[i]!=null,au=pin&&autoSet.has(i),on=i===LSEL;
    h+=`<li class="ln${on?' on':''}"><button class="lt" data-i="${i}" aria-expanded="${on}"><span class="tm">${fmtT(L.start+OFF)}</span><span class="tx">${esc(L.text)}</span>${au?T('<span class="pn pa">자동</span>','<span class="pn pa">AUTO</span>'):pin?T('<span class="pn">고정</span>','<span class="pn">SET</span>'):''}</button>`+
      (on?`<div class="lc"><button class="btn ghost" data-a="-">−0.05${T('초','s')}</button><button class="btn ghost" data-a="+">+0.05${T('초','s')}</button><button class="btn ghost" data-a="play">▶ ${T('듣기','Listen')}</button><button class="btn ghost" data-a="tap">${T('여기부터 탭','Tap from here')}</button>${pin?`<button class="btn ghost" data-a="auto">${T('자동으로','Auto')}</button>`:''}</div>`:'')+'</li>'});
  box.innerHTML=h;$('lineCnt').textContent=LINES.length?T(`· ${LINES.length}줄`,`· ${LINES.length} lines`):''}
$('lineList').addEventListener('click',e=>{const b=e.target.closest('button');if(!b||EXPORTING)return;
  if(b.classList.contains('lt')){const i=+b.dataset.i;LSEL=LSEL===i?-1:i;renderLines();return}
  const i=LSEL,L=LINES[i],a=b.dataset.a;if(!L)return;
  if(a==='-'||a==='+'){overrides[i]=Math.max(0,L.start+(a==='+'?0.05:-0.05));autoSet.delete(i);applyTimes();saveOverrides();refreshInfo()}   // nudging pins the line; neighbours re-interpolate
  else if(a==='auto'){delete overrides[i];autoSet.delete(i);applyTimes();saveOverrides();refreshInfo()}
  else if(a==='play'){hideSetup();seekTo(Math.max(0,L.start+OFF-1.5));startPlay();pokeHud()}
  else if(a==='tap')startSync(i)});

/* ---------- saving: fast offline MP4 (75_export) first, realtime recording as the fallback ---------- */
let DL=null;try{if(window.claude&&window.claude.use)window.claude.use('downloads').then(x=>{DL=x}).catch(()=>{})}catch(e){}
let PLAN_P=null,WAKE=null,SAVE_URL=null;
const getPlan=()=>PLAN_P||(PLAN_P=exportPlan().catch(()=>null));   // cached so the click handler stays inside the user gesture
async function wake(on){try{if(on&&!WAKE&&navigator.wakeLock){WAKE=await navigator.wakeLock.request('screen');WAKE.addEventListener('release',()=>{WAKE=null})}
  else if(!on&&WAKE){const w=WAKE;WAKE=null;await w.release()}}catch(e){WAKE=null}}
function outName(ext){const slug=(metaTitle()||'lyric_motion').toLowerCase().replace(/[^0-9a-z가-힣]+/g,'_').replace(/^_|_$/g,'')||'lyric_motion';
  return `${slug}_${DIR_KEY}_${aspect.replace(':','x')}.${ext}`}
function offerSave(blob){
  const out=$('recOut'),type=blob.type||'video/webm',ext=type.includes('mp4')?'mp4':'webm',name=outName(ext);
  const label=T(`영상 파일 저장 (${(blob.size/1048576).toFixed(1)}MB · ${ext.toUpperCase()})`,`Save video (${(blob.size/1048576).toFixed(1)} MB · ${ext.toUpperCase()})`);
  if(DL){out.innerHTML=`<div class="row"><button class="btn primary" id="bSave">${label}</button></div><div class="note" id="saveMsg"></div>`;
    $('bSave').onclick=()=>{DL.save({filename:name,data:blob}).then(()=>{$('saveMsg').innerHTML=T('<b>저장했어요.</b> 아이폰이면 공유 시트에서 "비디오 저장"을 누르면 사진 앱에 들어가요.','<b>Saved.</b> On iPhone, tap "Save Video" in the share sheet to put it in Photos.')}).catch(e=>{const c=e&&e.code;$('saveMsg').textContent=c==='declined'?T('저장을 취소했어요. 다시 누르면 저장할 수 있어요.','Cancelled. Tap again to save.'):c==='rate_limited'?T('잠시 후 다시 눌러 주세요.','Try again in a moment.'):T('이 화면에서는 저장할 수 없어요. 재생 중 화면 기록으로 저장해 주세요.','Saving isn\'t possible here. Use screen recording while it plays.')})};return}
  if(SAVE_URL)URL.revokeObjectURL(SAVE_URL);SAVE_URL=URL.createObjectURL(blob);
  out.innerHTML=`<div class="row"><a class="btn primary" href="${SAVE_URL}" download="${name}">${label}</a><button class="btn ghost" id="bShare">${T('공유 · 사진에 저장','Share · Save to Photos')}</button></div>`;
  if(!AUDIO_FILE)out.insertAdjacentHTML('beforeend','<div class="note">'+T('소리 없는 영상이에요. 릴스·틱톡·쇼츠 편집 화면에서 같은 곡을 넣고 곡의 처음(0:00)부터 시작하게 맞추세요.','This video is silent. Add the same song in the Reels/TikTok/Shorts editor, starting at 0:00.')+'</div>');
  const file=new File([blob],name,{type});$('bShare').onclick=()=>{if(navigator.canShare&&navigator.canShare({files:[file]}))navigator.share({files:[file]}).catch(()=>{});else $('bShare').textContent=T('이 브라우저는 공유를 지원하지 않아요','Sharing isn\'t supported in this browser')}}
$('bRec').onclick=async()=>{
  if(EXPORTING||recording)return;const out=$('recOut');
  if(!AUDIO_FILE&&!MANUAL){out.innerHTML=T('<b>01에서 음원 파일을 고르거나</b>, "음원 파일 없이 만들기"에서 곡 길이를 넣어 주세요.','<b>Choose an audio file in 01</b>, or enter the song length under "No audio file?".');return}
  const plan=await getPlan();if(plan&&(plan.a||!AUDIO_FILE))runExport(plan);else startRec()};
async function runExport(plan){
  const out=$('recOut'),setup=$('setup');pausePlay();setRate(1);
  out.innerHTML=`<div class="prog"><i id="expBar"></i></div><div class="row"><span class="grow" id="expMsg">${T('영상 만드는 중…','Making video…')}</span><button class="btn ghost" id="bExpStop">${T('멈추기','Stop')}</button></div>`+
    `<div class="note">${T('재생하지 않고 프레임을 하나씩 그려서 MP4로 만들어요. 이 화면을 켜 둔 채로 기다려 주세요 — 다른 앱으로 가면 멈춰요.','Drawing every frame into an MP4 without playing. Keep this screen on — switching apps pauses it.')}</div>`;
  $('bExpStop').onclick=()=>{EXP_CANCEL=true};setup.classList.add('busy');wake(true);out.scrollIntoView({block:'nearest'});
  try{const blob=await fastExport(plan,AUDIO_FILE,(p,eta)=>{const b=$('expBar'),m=$('expMsg');if(!b)return;b.style.width=(p*100).toFixed(1)+'%';
      m.textContent=T(`영상 만드는 중… ${Math.floor(p*100)}%`,`Making video… ${Math.floor(p*100)}%`)+(eta>1?T(` · 약 ${eta<60?Math.ceil(eta)+'초':Math.ceil(eta/60)+'분'} 남음`,` · about ${eta<60?Math.ceil(eta)+' s':Math.ceil(eta/60)+' min'} left`):'')});
    offerSave(blob)}
  catch(e){   // cancelled or failed: offer realtime recording (a fresh tap, so playback is allowed on iOS)
    out.innerHTML=(EXP_CANCEL?T('멈췄어요. 다시 누르면 처음부터 만들어요. 이 기기에서 너무 오래 걸리면 재생하면서 녹화할 수도 있어요.','Stopped. Tap again to start over. If it takes too long on this device, you can record while it plays instead.'):T('<b>빠른 저장에 실패했어요.</b> ','<b>Fast save failed.</b> ')+esc(String(e&&e.message||e)))+
      `<div class="row"><button class="btn ghost" id="bRecRT">${T('재생하면서 녹화하기','Record while playing')}</button></div>`;$('bRecRT').onclick=()=>startRec()}
  finally{setup.classList.remove('busy');wake(false)}}
function pickMime(){if(!window.MediaRecorder)return null;for(const m of ['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm']){try{if(MediaRecorder.isTypeSupported(m))return m}catch(e){}}return ''}
async function startRec(){
  const out=$('recOut');if(EXPORTING||recording)return;
  const mime=pickMime();if(mime===null||!cv.captureStream){out.innerHTML=T('<b>이 브라우저는 화면 녹화를 지원하지 않아요.</b> 재생 중 화면 기록(제어 센터)으로 저장해 주세요.','<b>This browser can\'t record the canvas.</b> Use screen recording (Control Centre) while it plays.');return}
  setRate(1);if(hasAudio){ensureGraph();if(actx)await actx.resume()}
  const vs=cv.captureStream(30);const tracks=[...vs.getVideoTracks()];if(msDest&&hasAudio)tracks.push(...msDest.stream.getAudioTracks());
  try{recorder=new MediaRecorder(new MediaStream(tracks),mime?{mimeType:mime,videoBitsPerSecond:14000000}:{videoBitsPerSecond:14000000})}catch(e){out.innerHTML=T('<b>녹화를 시작하지 못했어요.</b> ','<b>Couldn\'t start recording.</b> ')+esc(e.message);return}
  recChunks=[];recorder.ondataavailable=e=>{if(e.data&&e.data.size)recChunks.push(e.data)};
  recorder.onstop=()=>{offerSave(new Blob(recChunks,{type:recorder.mimeType||mime||'video/webm'}));recChunks=[]};
  hideSetup();seekTo(0);out.textContent='';wake(true);await new Promise(r=>setTimeout(r,150));
  recorder.start(1000);recording=true;$('recBadge').classList.remove('hidden');await startPlay();pokeHud();
}
function stopRec(){if(recorder&&recording){recording=false;try{recorder.stop()}catch(e){}}$('recBadge').classList.add('hidden');wake(false)}

/* ---------- init ---------- */
/* ---------- language: markup is Korean; English comes from data-en / data-en-ph / data-en-al. Switching reloads. ---------- */
function applyLang(){document.documentElement.lang=LANG;$('bLang').textContent=LANG==='en'?'한국어':'EN';
  $('bLang').onclick=()=>{projSaveCur();lsSet('rz_lang',LANG==='en'?'ko':'en');location.reload()};if(LANG!=='en')return;
  document.querySelectorAll('[data-en]').forEach(e=>{e.innerHTML=e.dataset.en});
  document.querySelectorAll('[data-en-ph]').forEach(e=>{e.placeholder=e.dataset.enPh});
  document.querySelectorAll('[data-en-al]').forEach(e=>e.setAttribute('aria-label',e.dataset.enAl))}
(function init(){
  applyLang();projInit();
  const a=lsGet('rz_aspect','16:9');setAspect(a);document.querySelectorAll('#segAspect button').forEach(x=>x.classList.toggle('on',x.dataset.a===a));
  initPost();
  OFF=+lsGet('rz_off',0)||0;$('rOff').value=OFF;$('rOff').oninput({target:$('rOff')});
  INTENSITY=+lsGet('rz_int',1)||1;$('rInt').value=INTENSITY;$('intVal').textContent=Math.round(INTENSITY*100)+'%';
  lyricsText=lsGet('rz_lyrics','');$('lyrics').value=lyricsText;
  try{const m=JSON.parse(lsGet('rz_manual','null'));if(m&&m.dur>=10){MANUAL=m;$('inMin').value=Math.floor(m.dur/60);$('inSec').value=Math.round(m.dur%60);$('inBpm').value=m.bpm}}catch(e){}
  setSong(MANUAL?manualSong(MANUAL.dur,MANUAL.bpm):demoSong());
  try{const m=JSON.parse(lsGet('rz_meta','{}'));$('inTitle').value=m.t||'';$('inArtist').value=m.a||'';$('inFeat').value=m.f||''}catch(e){}
  saveMeta();
  setDirection(DIR_LOCK?lsGet('rz_dir','brutal'):'brutal');
  build();AI_EMPH_ON=lsGet('rz_aiemph',userMarked?'0':'1')==='1';direct();autoPick();loadAI();refreshInfo();refreshAIUI();
  if(MANUAL){useManual(MANUAL,true);if(MANUAL.yt){$('inYt').value='https://youtu.be/'+MANUAL.yt;openYt(MANUAL.yt,true)}}else projRestoreAudio();
  getPlan().then(p=>{$('expNote').innerHTML=p&&p.a?T('<b>빠른 저장</b> · 재생하지 않고 곡 길이보다 빠르게 MP4로 만들어요.','<b>Fast save</b> · renders an MP4 faster than the song, without playing it.'):T('이 브라우저는 <b>재생하면서 녹화</b>해요. 곡이 끝날 때까지 화면을 켜 두세요.','This browser <b>records while playing</b>. Keep the screen on until the song ends.')});
  loop();
  Object.assign(window,{__frame:t=>frame(t),__setLyrics:s=>{lyricsText=s;build();autoPick();refreshInfo()},__aspect:setAspect,__lines:()=>LINES,
    __song:()=>({...SONG,kicks:KICKS.length,snares:SNARES.length,nov:undefined,preset:!!PRESET,NB}),__setSong:setSong,__build:()=>{build();refreshInfo()},
    __dir:k=>{setDirection(k);direct()},__post:()=>({ok:POST.ok,mip:POST.mip}),__auto:()=>AUTO_PICK,__applyAI:applyAI,__aiPrompt:aiPrompt});
})();
