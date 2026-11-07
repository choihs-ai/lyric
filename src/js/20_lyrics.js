/* ============================================================
   20 · LYRICS — parsing, section slots, line & word timing
   ============================================================ */
const DEMO_KO=`Intro
여기는 인트로, 구호가 들어갈 자리
반복되는 줄은 *겹쳐서* 쌓여요
여기는 인트로, 구호가 들어갈 자리
반복되는 줄은 *겹쳐서* 쌓여요

Verse 1
붙여 넣은 가사가 한 줄씩 등장해요
줄마다 다른 움직임으로 (Yeah)
글자가 *흩어졌다가* 다시 모여요
비트에 맞춰 화면이 *터지고*
**최대 강조**는 화면을 뒤집어요
차가운 색에서 시작해서
점점 *불씨*처럼 달아올라요
세로로 쌓이는 짧은 줄
화면을 가로지르는 긴 문장도 문제없어요
구간이 끝날 때까지 이어져요

Chorus
*후렴*은 한 단어씩 크게
화면을 꽉 채우는 *타이포*
색이 번갈아 바뀌고
*리듬*에 맞춰 흔들려요

Verse 2 - FEATURING
두 번째 벌스는 질감이 바뀌어요
*강조*와 흐르는 띠
글자 간격이 *좁혀지며* 등장하고
위아래로 갈라졌다 합쳐져요
**여기서 한 번 더 크게**
구간 제목 옆 이름이 화면에 표시돼요

Outro
마지막 줄은 천천히
흩어지며 사라져요`;
/* original placeholder sentences (never song lyrics) */
const DEMO_EN=`Intro
This is the intro, where a hook would go
Lines that *repeat* stack up in layers
This is the intro, where a hook would go
Lines that *repeat* stack up in layers

Verse 1
Your pasted words arrive one line at a time
Each line moves a different way (Yeah)
Letters *scatter* and come back together
The screen *bursts* on the beat
**Maximum emphasis** flips the frame
It starts in colder colours
Then slowly glows like an *ember*
Short lines stack up tall
Long sentences crossing the screen are fine too
It carries on until the section ends

Chorus
The *chorus* goes big, one word at a time
*Type* that fills the whole frame
Colours trade places
Shaking with the *rhythm*

Verse 2 - FEATURING
The second verse changes texture
*Emphasis* and a flowing band
Letters *tighten* as they enter
Splitting up and down, then joining
**One more time, even bigger**
The name next to the section title shows on screen

Outro
The last line takes its time
Drifting apart as it fades`;
const DEMO=LANG==='en'?DEMO_EN:DEMO_KO;

/* section headers: "Verse 1", "[Chorus]", "Chorus:", "Verse 2 - name", "후렴", "Pre-Chorus", "Hook" …
   pre-chorus is its own type (builds into the chorus, verse-level energy); hook is chorus-level but keeps its own label */
function parseHeader(s){
  const m=s.replace(/^\[|\]$/g,'').trim().replace(/\s*[:：]$/,'')
    .match(/^(pre[-\s]?chorus|프리\s?코러스|intro|outro|verse|chorus|hook|bridge|인트로|아웃트로|벌스|후렴|코러스|훅|브릿지|브리지)\s*(\d*)\s*(?:[-–—:：|]\s*(.+?)|\((.+?)\))?\s*$/i);
  if(!m)return null;const k=m[1].toLowerCase();
  const type=/^pre|프리/.test(k)?'pre':/intro|인트로/.test(k)?'intro':/outro|아웃트로/.test(k)?'outro':/chorus|hook|후렴|코러스|훅/.test(k)?'chorus':/bridge|브릿지|브리지/.test(k)?'bridge':'verse';
  return {type,name:/hook|훅/.test(k)?'HOOK':'',num:m[2]||'',artist:(m[3]||m[4]||'').trim()};
}
function parseLine(raw){
  const adlibs=[];const s=raw.replace(/\(([^)]*)\)/g,(m,a)=>{if(a.trim())adlibs.push(a.trim());return ' '});
  const out=[];let lvl=0;
  for(let i=0;i<s.length;i++){const c=s[i];
    if(c==='*'){if(s[i+1]==='*'){lvl=lvl===2?0:2;i++}else{if(lvl===1)lvl=0;else if(lvl===0)lvl=1}continue}
    out.push([c,lvl])}
  const words=[];let w=null;
  for(const [c,l] of out){if(/\s/.test(c)){if(w){words.push(w);w=null}continue}if(!w)w={text:'',u:0};w.text+=c;if(l>w.u)w.u=l}
  if(w)words.push(w);
  if(!words.length&&adlibs.length)adlibs.splice(0).forEach(a=>a.split(/\s+/).forEach(x=>words.push({text:x,u:0})));
  words.forEach(x=>x.emph=x.u);
  return {text:words.map(x=>x.text).join(' '),words,adlibs};
}
function parseLyrics(src){
  const secs=[];let cur=null;
  for(const raw of src.replace(/\r/g,'').split('\n')){const s=raw.trim();if(!s)continue;
    const h=s.length<40?parseHeader(s):null;
    if(h){cur={...h,lines:[]};secs.push(cur);continue}
    if(!cur){cur={type:'verse',num:'',artist:'',lines:[]};secs.push(cur)}
    const L=parseLine(s);if(L.words.length)cur.lines.push(L)}
  return secs.filter(x=>x.lines.length);
}
function syl(text){let h=0,l=0;for(const c of text){if(/[가-힣]/.test(c))h++;else if(/[A-Za-z0-9]/.test(c))l++}return h+l/2.6}
function computeSlots(secs){
  const K2=secs.length,sb=Math.min(SONG.startBar||0,Math.max(0,NB-K2)),eb=Math.max(sb+K2,Math.min(NB,SONG.endBar||NB)),avail=eb-sb;
  if(K2<2)return [[sb,eb]];
  const nl=secs.map(x=>x.lines.length),ns=secs.map(x=>x.lines.reduce((a,l)=>a+syl(l.text),0));
  const tl=nl.reduce((a,b)=>a+b,0)||1,ts=ns.reduce((a,b)=>a+b,0)||1;
  const w=secs.map((_,i)=>0.5*nl[i]/tl+0.5*ns[i]/ts);
  const prior=[];let cum=0;for(let i=0;i<K2-1;i++){cum+=w[i];prior.push(sb+avail*cum)}
  let mx=1e-6;for(let c=sb+3;c<eb-1;c++)mx=Math.max(mx,NOV[c]||0);const nv=c=>c<sb+3?0:(NOV[c]||0);
  const R=Math.max(3,Math.round(avail*0.15)),lam=0.3;
  const sc=(c,pr)=>Math.min(1.5,nv(c)/mx)+((c-sb)%4===0?0.12:0)+((c-sb)%8===0?0.06:0)-lam*((c-pr)/R)**2;
  const cand=prior.map((pr,i)=>{const lo=Math.max(sb+1+i,Math.round(pr-R)),hi=Math.min(eb-(K2-1-i),Math.round(pr+R));const a=[];for(let c=lo;c<=hi;c++)a.push(c);if(!a.length)a.push(Math.min(eb-(K2-1-i),Math.max(sb+1+i,Math.round(pr))));return a});
  const layers=[cand[0].map(c=>({c,v:sc(c,prior[0]),prev:null}))];
  for(let i=1;i<cand.length;i++){const nx=cand[i].map(c=>{let b=null;for(const d of layers[i-1])if(d.c<c&&(!b||d.v>b.v))b=d;return b?{c,v:b.v+sc(c,prior[i]),prev:b}:null}).filter(Boolean);
    layers.push(nx.length?nx:layers[i-1].map(d=>({c:d.c+1,v:d.v,prev:d})))}
  let end=layers[layers.length-1].reduce((a,b)=>b.v>a.v?b:a);const bs=[];while(end){bs.unshift(end.c);end=end.prev}
  const all=[sb,...bs,eb];return secs.map((_,i)=>[all[i],all[i+1]]);
}

let SECS=[],LINES=[],IMPACTS=[],IMPACT_T=[],overrides={},lyricsText='',usingDemo=true,userMarked=false;
function secLabel(s){return (s.name||{intro:'INTRO',outro:'OUTRO',chorus:'CHORUS',bridge:'BRIDGE',verse:'VERSE',pre:'PRE-CHORUS'}[s.type])+(s.num?' '+s.num:'')}
function build(){
  usingDemo=!lyricsText.trim();
  const secs=parseLyrics(usingDemo?DEMO:lyricsText);
  userMarked=/\*/.test(usingDemo?DEMO:lyricsText);
  const slots=(PRESET&&secs.length===PRESET.slots.length)?PRESET.slots:computeSlots(secs);
  SECS=[];LINES=[];let vk=0;
  secs.forEach((s,si)=>{
    const A=barT(slots[si][0]),B=barT(slots[si][1]);
    const role=s.type==='intro'?'intro':s.type==='chorus'?'chorus':s.type==='outro'?'outro':s.type==='bridge'?'bridge':s.type==='pre'?'verseB':(vk++%2===0?'verseA':'verseB');
    const sec={type:s.type,role,label:secLabel(s),artist:s.artist,start:A,end:B,idx:si,intensity:null,mood:''};
    SECS.push(sec);
    const wts=s.lines.map(l=>(s.type==='intro'||s.type==='outro')?1:1+Array.from(l.text.replace(/\s/g,'')).length*0.16);
    /* a line's natural length is ~1–3.5 bars; when the slot is much longer than that (only part of the lyrics pasted),
       pack the lines from the slot start instead of scattering them with long empty gaps — the rest becomes an interlude */
    const nat=s.lines.reduce((a,l)=>a+BAR*clamp(0.75+Array.from(l.text.replace(/\s/g,'')).length*0.09,1,3.5),0),span=Math.min(B-A,nat*1.4);
    const sum=wts.reduce((a,b)=>a+b,0);let cum=0;
    s.lines.forEach((l,i)=>{let st=A+span*cum/sum;cum+=wts[i];st=T0+Math.round((st-T0)/BEAT)*BEAT;LINES.push({...l,def:st,sec,li:i})});
  });
  loadOverrides();applyTimes();
}
function applyTimes(){
  const n=LINES.length;const anchors=[];LINES.forEach((L,i)=>{if(overrides[i]!=null)anchors.push({i,t:overrides[i],d:L.def})});
  LINES.forEach((L,i)=>{
    if(overrides[i]!=null){L.start=overrides[i];return}
    let a=null,b=null;for(const x of anchors){if(x.i<i)a=x;else if(x.i>i&&!b)b=x}
    if(a&&b){const r=(b.d-a.d)>0.001?(L.def-a.d)/(b.d-a.d):0;L.start=a.t+(b.t-a.t)*r}
    else if(a)L.start=L.def+(a.t-a.d);else if(b)L.start=Math.min(L.def,b.t-0.12*(b.i-i));else L.start=L.def});
  for(let i=1;i<n;i++)if(LINES[i].start<LINES[i-1].start+0.12)LINES[i].start=LINES[i-1].start+0.12;
  LINES.forEach((L,i)=>{const nx=i<n-1?LINES[i+1].start:SONG_END;L.end=Math.min(nx,L.start+BAR*4,SONG_END);if(L.end<=L.start)L.end=L.start+0.2;L.gi=i;L._c={}});
  const g=BEAT/4;
  LINES.forEach(L=>{
    /* word timings from word-tap or auto word sync: offsets from the line start, so they move with the line */
    const wo=wover[L.gi];if(wo&&wo.length===L.words.length){let prev=L.start;
      L.words.forEach((w,k)=>{let tt=k?L.start+Math.max(0,wo[k]):L.start;tt=Math.min(tt,L.end-0.04*(L.words.length-k));if(tt<prev)tt=prev;w.t=tt;prev=tt});return}
    const dur=L.end-L.start,span=dur*(L.sec.role==='outro'?0.5:0.74);
    const ws=L.words.map(w=>Math.max(1,Array.from(w.text).length)),tot=ws.reduce((a,b)=>a+b,0);let c=0,prev=L.start;
    L.words.forEach((w,k)=>{let tt=L.start+span*c/tot;c+=ws[k];if(k>0)tt=T0+Math.round((tt-T0)/g)*g;if(tt<prev)tt=prev;if(k===0)tt=L.start;w.t=tt;prev=tt})});
  SECS.forEach(s=>{const ls=LINES.filter(L=>L.sec===s);s.firstStart=ls.length?ls[0].start:s.start;s.lastEnd=ls.length?ls[ls.length-1].end:s.end});
  direct();
}
function rebuildImpacts(){
  IMPACTS=[];
  LINES.forEach(L=>{let ph=null;L.words.forEach((w,k)=>{if(w.emph){if(ph&&ph.k===k-1&&ph.lvl===w.emph){ph.text+=' '+w.text;ph.k=k}else{ph={t:w.t,lvl:w.emph,text:w.text,k,L};IMPACTS.push(ph)}}else ph=null})});
  IMPACTS.sort((a,b)=>a.t-b.t);IMPACT_T=IMPACTS.map(x=>x.t);
}
function syncKey(){return 'rz_sync_'+hash(lyricsText.trim()||'demo')}
/* lines whose timing came from auto-sync (not pinned by the user); user-set lines are anchors when auto-sync runs again */
let autoSet=new Set();
/* per-word timing: wover[line]=[0, offset1, offset2…] (seconds after the line start); wauto = lines whose words came from auto word sync */
let wover={},wauto=new Set();
function wordKey(){return 'rz_word_'+hash(lyricsText.trim()||'demo')}
function autoKey(){return 'rz_auto_'+hash(lyricsText.trim()||'demo')}
function loadOverrides(){overrides={};try{const o=JSON.parse(lsGet(syncKey(),'{}'));for(const k in o)overrides[+k]=o[k]}catch(e){}
  try{autoSet=new Set(JSON.parse(lsGet(autoKey(),'[]')).map(Number))}catch(e){autoSet=new Set()}
  wover={};wauto=new Set();try{const w=JSON.parse(lsGet(wordKey(),'{}'));for(const k in w.o||{})wover[+k]=w.o[k].map(Number);wauto=new Set((w.a||[]).map(Number))}catch(e){}}
function saveOverrides(){lsSet(syncKey(),JSON.stringify(overrides));lsSet(autoKey(),JSON.stringify([...autoSet].filter(i=>overrides[i]!=null)));
  lsSet(wordKey(),JSON.stringify({o:wover,a:[...wauto].filter(i=>wover[i])}))}
