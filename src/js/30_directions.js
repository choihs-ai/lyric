/* ============================================================
   30 · DIRECTIONS — art-direction presets
   each: fonts · palettes per section role · backgrounds · mode pools ·
         motion character · post-FX look · transition · title style
   ============================================================ */
const STACK={sans:'"Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",sans-serif',serif:'"AppleMyungjo","Nanum Myeongjo","Noto Serif KR",serif',
  mono:'ui-monospace,Menlo,Consolas,monospace',hand:'"Nanum Pen Script","Apple SD Gothic Neo",cursive'};
const FONT_CSS='https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Noto+Sans+KR:wght@200;300;500;700;900&family=Noto+Serif+KR:wght@400;900&family=Space+Mono:wght@400;700&family=Hahmlet:wght@300;800&family=Gowun+Batang:wght@700&family=Bagel+Fat+One&family=Nanum+Pen+Script&family=Song+Myung&display=swap';
const secProg=(sec,tl)=>clamp((tl-sec.firstStart)/Math.max(1,sec.lastEnd-sec.firstStart));
const F=(f,w,stack,fb)=>({f,w,stack,fb:fb||w});

const DIRECTIONS={
 brutal:{
  name:'BRUTAL',ko:'브루탈',desc:'트랩·드릴·공격적인 랩 — 검정·핏빛, 하드컷, 글리치',
  fonts:{d:F('Black Han Sans',400,'sans',900),s:F('Noto Serif KR',900,'serif'),m:F('Space Mono',700,'mono'),l:F('Noto Sans KR',300,'sans'),h:F('Nanum Pen Script',400,'hand')},
  roles:{
   intro:{pal:()=>({bg:'#0a0908',fg:'#efe9df',ac:'#ff2a1a',sub:'#4a1d19'}),bg:'brutalIntro',pool:['slam','echo']},
   verseA:{pal:(s,tl)=>{const p=secProg(s,tl);return {bg:mix('#0b0f13','#160805',p),fg:'#ebe7e1',ac:mix('#a9bccb','#ff5f17',eInOut(p)),sub:mix('#2c3740','#4a2010',p),p}},bg:'smoke',pool:['stack','cross','shatter','track','split','vertical','slam','depth']},
   chorus:{pal:(s,tl,L)=>L.li%2?{bg:'#c9151b',fg:'#0b0b0b',ac:'#f3efe7',sub:'#8e1015',inv:1}:{bg:'#0b0b0b',fg:'#f3efe7',ac:'#ff2419',sub:'#3c1513'},bg:'textRows',pool:['giant','cross','split','giant','slam','depth']},
   verseB:{pal:()=>({bg:'#eee6d4',fg:'#121212',ac:'#ff4d00',ac2:'#1d3bff',sub:'#c2b69c',light:1}),bg:'paperSun',pool:['ticker','stack','slam','track','split','cross','shatter']},
   bridge:{pal:()=>({bg:'#0e0c14',fg:'#ece8f2',ac:'#8a7dff',sub:'#2b2640'}),bg:'smoke',pool:['track','stack','slam']},
   outro:{pal:()=>({bg:'#050505',fg:'#cbc5bb',ac:'#d7261e',sub:'#2e2b28'}),bg:'ecg',pool:['dissolve']},
  },
  motion:{shake:1,glitch:1,blur:true,upper:true,speed:1,align:{center:0.8,left:0.1,right:0.1}},
  fx:{ca:0.35,caKick:0.9,bloom:0.15,grain:0.12,vig:0.38,scan:0.08,warp:0,sat:1.05,con:1.08,tint:[1,0.98,0.96],shadow:[0.1,0,0],high:[0.1,0.05,0],lbox:0},
  trans:'slit',title:'slam'},

 neon:{
  name:'NEON',ko:'네온',desc:'밤·R&B·신스 — 마젠타·시안 발광, 부드러운 슬라이드',
  fonts:{d:F('Noto Sans KR',900,'sans'),s:F('Noto Serif KR',900,'serif'),m:F('Space Mono',400,'mono'),l:F('Noto Sans KR',200,'sans'),h:F('Nanum Pen Script',400,'hand')},
  roles:{
   intro:{pal:()=>({bg:'#06050d',fg:'#f2efff',ac:'#ff2fd2',ac2:'#2ef2ff',sub:'#2a2350'}),bg:'neonHaze',pool:['maskRise','track','slam']},
   verseA:{pal:(s,tl)=>{const p=secProg(s,tl);return {bg:mix('#07071a','#120620',p),fg:'#ece9ff',ac:mix('#2ef2ff','#ff2fd2',p),ac2:'#ff2fd2',sub:'#25204a',p}},bg:'synthGrid',pool:['maskRise','cross','wave','depth','track','stack','flip','ring']},
   chorus:{pal:(s,tl,L)=>L.li%2?{bg:'#1a0630',fg:'#ffffff',ac:'#2ef2ff',ac2:'#ff2fd2',sub:'#4b1a7a'}:{bg:'#0b0420',fg:'#ffffff',ac:'#ff2fd2',ac2:'#2ef2ff',sub:'#3b1a5c'},bg:'streaks',pool:['giant','depth','slam','flip','cross']},
   verseB:{pal:()=>({bg:'#020c14',fg:'#e8fbff',ac:'#ffe94a',ac2:'#2ef2ff',sub:'#0f3341'}),bg:'neonHaze',pool:['wave','maskRise','ring','track','scatter','depth']},
   bridge:{pal:()=>({bg:'#0a0418',fg:'#f2efff',ac:'#ff2fd2',sub:'#2a2350'}),bg:'neonHaze',pool:['wave','maskRise','depth']},
   outro:{pal:()=>({bg:'#04040a',fg:'#b3acd6',ac:'#ff2fd2',sub:'#1d1a33'}),bg:'neonHaze',pool:['dissolve','typewriter']},
  },
  motion:{shake:0.45,glitch:0.25,blur:true,upper:true,speed:1.1,align:{center:0.6,left:0.25,right:0.15}},
  fx:{ca:0.45,caKick:0.6,bloom:1.0,grain:0.06,vig:0.45,scan:0.14,warp:0,sat:1.15,con:1.06,tint:[1,0.96,1.07],shadow:[0.05,0,0.15],high:[0.12,0,0.1],lbox:0},
  trans:'sweep',title:'slam'},

 editorial:{
  name:'EDITORIAL',ko:'에디토리얼',desc:'인디·어쿠스틱·잔잔한 곡 — 종이, 세리프, 여백과 그리드',
  fonts:{d:F('Hahmlet',800,'serif',900),s:F('Gowun Batang',700,'serif'),m:F('Space Mono',400,'mono'),l:F('Noto Sans KR',300,'sans'),h:F('Nanum Pen Script',400,'hand')},
  roles:{
   intro:{pal:()=>({bg:'#f1ede4',fg:'#141414',ac:'#c8412c',sub:'#d5ccba',light:1}),bg:'paperGrid',pool:['typewriter','maskRise']},
   verseA:{pal:()=>({bg:'#f1ede4',fg:'#141414',ac:'#c8412c',sub:'#d5ccba',light:1}),bg:'paperGrid',pool:['scatter','maskRise','stack','typewriter','vertical','track']},
   chorus:{pal:(s,tl,L)=>L.li%2?{bg:'#f1ede4',fg:'#141414',ac:'#c8412c',sub:'#d5ccba',light:1}:{bg:'#151515',fg:'#f1ede4',ac:'#ef5a3c',sub:'#2e2a26'},bg:'bigNumeral',pool:['maskRise','scatter','giant','stack']},
   verseB:{pal:()=>({bg:'#e7ebe7',fg:'#111417',ac:'#2747c9',sub:'#c6ccc6',light:1}),bg:'paperGrid',pool:['scatter','typewriter','maskRise','vertical','track']},
   bridge:{pal:()=>({bg:'#ece4d6',fg:'#1b1712',ac:'#7a5b2e',sub:'#d4c6ae',light:1}),bg:'paperGrid',pool:['typewriter','maskRise']},
   outro:{pal:()=>({bg:'#f1ede4',fg:'#4a463f',ac:'#c8412c',sub:'#dcd4c4',light:1}),bg:'paperGrid',pool:['dissolve','typewriter']},
  },
  motion:{shake:0.08,glitch:0,blur:false,upper:false,speed:1.45,align:{center:0.3,left:0.45,right:0.25}},
  fx:{ca:0,caKick:0,bloom:0,grain:0.09,vig:0.16,scan:0,warp:0,sat:0.95,con:1.0,tint:[1.02,1,0.97],shadow:[0.02,0.01,0],high:[0.02,0.01,0],lbox:0},
  trans:'cut',title:'elegant'},

 pop:{
  name:'POP',ko:'팝',desc:'밝고 신나는 곡 — 원색 블록, 통통 튀는 글자',
  fonts:{d:F('Bagel Fat One',400,'sans',900),s:F('Noto Serif KR',900,'serif'),m:F('Space Mono',700,'mono'),l:F('Noto Sans KR',500,'sans'),h:F('Nanum Pen Script',400,'hand')},
  roles:{
   intro:{pal:()=>({bg:'#ffdd2e',fg:'#141217',ac:'#ff3d7f',ac2:'#2f5bff',sub:'#f2c400',light:1}),bg:'popShapes',pool:['bounce','slam']},
   verseA:{pal:()=>({bg:'#ff6fa8',fg:'#16121c',ac:'#ffffff',ac2:'#ffe23d',sub:'#ff8fbe',light:1}),bg:'popShapes',pool:['bounce','stack','ring','flip','wave','scatter']},
   chorus:{pal:(s,tl,L)=>L.li%2?{bg:'#ffe23d',fg:'#141217',ac:'#2f5bff',ac2:'#ff3d7f',sub:'#f5cf00',light:1}:{bg:'#2f5bff',fg:'#ffffff',ac:'#ffe23d',ac2:'#ff3d7f',sub:'#4b72ff'},bg:'stripes',pool:['giant','bounce','flip','ring']},
   verseB:{pal:()=>({bg:'#19c37d',fg:'#0d1b14',ac:'#ffffff',ac2:'#ffe23d',sub:'#3fd897',light:1}),bg:'popShapes',pool:['bounce','wave','scatter','stack','flip']},
   bridge:{pal:()=>({bg:'#9b6bff',fg:'#ffffff',ac:'#ffe23d',sub:'#ad86ff'}),bg:'popShapes',pool:['bounce','wave']},
   outro:{pal:()=>({bg:'#ffdd2e',fg:'#141217',ac:'#ff3d7f',sub:'#f2c400',light:1}),bg:'popShapes',pool:['bounce','dissolve']},
  },
  motion:{shake:0.35,glitch:0,blur:true,upper:true,speed:0.9,align:{center:0.85,left:0.08,right:0.07}},
  fx:{ca:0.08,caKick:0.25,bloom:0.15,grain:0.04,vig:0.08,scan:0,warp:0,sat:1.12,con:1.04,tint:[1,1,1],shadow:[0,0,0],high:[0,0,0],lbox:0},
  trans:'circle',title:'slam'},

 lofi:{
  name:'LO-FI',ko:'로파이',desc:'감성 랩·새벽 감성 — 바랜 색, VHS, 손글씨',
  fonts:{d:F('Noto Sans KR',700,'sans'),s:F('Gowun Batang',700,'serif'),m:F('Space Mono',400,'mono'),l:F('Noto Sans KR',300,'sans'),h:F('Nanum Pen Script',400,'hand')},
  roles:{
   intro:{pal:()=>({bg:'#16181a',fg:'#e8e2d6',ac:'#9cc0d6',ac2:'#e0a96d',sub:'#2b3034'}),bg:'vhs',pool:['dissolve','maskRise']},
   verseA:{pal:(s,tl)=>{const p=secProg(s,tl);return {bg:mix('#16181a','#1c1814',p),fg:'#e8e2d6',ac:mix('#9cc0d6','#e0a96d',p),sub:'#2b3034',p}},bg:'rain',pool:['wave','typewriter','maskRise','dissolve','stack','vertical']},
   chorus:{pal:(s,tl,L)=>L.li%2?{bg:'#c7d5dc',fg:'#1b1f22',ac:'#a8572b',sub:'#b2c3cc',light:1}:{bg:'#20201e',fg:'#f1e9da',ac:'#e0a96d',sub:'#3a352e'},bg:'vhs',pool:['maskRise','giant','wave','depth']},
   verseB:{pal:()=>({bg:'#1d1a20',fg:'#ece3ef',ac:'#c9a6d8',sub:'#332c38'}),bg:'rain',pool:['typewriter','wave','dissolve','scatter']},
   bridge:{pal:()=>({bg:'#191714',fg:'#e8e2d6',ac:'#e0a96d',sub:'#2e2a24'}),bg:'vhs',pool:['dissolve','wave']},
   outro:{pal:()=>({bg:'#0f1011',fg:'#9f9a90',ac:'#9cc0d6',sub:'#24272a'}),bg:'rain',pool:['dissolve']},
  },
  motion:{shake:0.15,glitch:0.15,blur:true,upper:false,speed:1.3,hand:true,align:{center:0.55,left:0.3,right:0.15}},
  fx:{ca:0.28,caKick:0.2,bloom:0.35,grain:0.17,vig:0.55,scan:0.18,warp:0.55,sat:0.78,con:0.95,tint:[1.03,1,0.94],shadow:[0,0.03,0.06],high:[0.07,0.04,0],lbox:0},
  trans:'fadeBlack',title:'elegant'},

 cinematic:{
  name:'CINEMATIC',ko:'시네마틱',desc:'웅장하고 극적인 곡 — 레터박스, 금빛, 느린 푸시인',
  fonts:{d:F('Song Myung',400,'serif',900),s:F('Noto Serif KR',900,'serif'),m:F('Space Mono',400,'mono'),l:F('Noto Sans KR',200,'sans'),h:F('Nanum Pen Script',400,'hand')},
  roles:{
   intro:{pal:()=>({bg:'#050505',fg:'#efe6d2',ac:'#d4a64a',sub:'#2b241a'}),bg:'rays',pool:['track','maskRise']},
   verseA:{pal:(s,tl)=>{const p=secProg(s,tl);return {bg:mix('#06080a','#0d0905',p),fg:'#ece3cf',ac:'#d4a64a',sub:'#262017',p}},bg:'dust',pool:['track','maskRise','depth','dissolve','scatter']},
   chorus:{pal:(s,tl,L)=>L.li%2?{bg:'#140c04',fg:'#fff6e0',ac:'#f0c060',sub:'#3a2c14'}:{bg:'#0a0805',fg:'#fff6e0',ac:'#f0c060',sub:'#3a2c14'},bg:'rays',pool:['depth','giant','track','maskRise']},
   verseB:{pal:()=>({bg:'#04070a',fg:'#e2ecf0',ac:'#7fb4c8',sub:'#16242b'}),bg:'dust',pool:['track','maskRise','dissolve','depth']},
   bridge:{pal:()=>({bg:'#070605',fg:'#efe6d2',ac:'#d4a64a',sub:'#2b241a'}),bg:'rays',pool:['track','dissolve']},
   outro:{pal:()=>({bg:'#000000',fg:'#bfb6a3',ac:'#d4a64a',sub:'#1d1912'}),bg:'dust',pool:['dissolve','track']},
  },
  motion:{shake:0.2,glitch:0,blur:true,upper:true,speed:1.5,align:{center:0.9,left:0.05,right:0.05}},
  fx:{ca:0.1,caKick:0.15,bloom:0.6,grain:0.1,vig:0.62,scan:0,warp:0,sat:0.9,con:1.1,tint:[1.03,1,0.95],shadow:[0,0.05,0.08],high:[0.1,0.05,0],lbox:0.115},
  trans:'fadeBlack',title:'elegant'},
};
const DIR_KEYS=Object.keys(DIRECTIONS);
let DIR=DIRECTIONS.brutal,DIR_KEY='brutal',INTENSITY=1;
function setDirection(k){if(!DIRECTIONS[k])k='brutal';DIR_KEY=k;DIR=DIRECTIONS[k];fontsChanged()}
function roleOf(sec){return DIR.roles[sec.role]||DIR.roles.verseA}
function paletteFor(sec,tl,L){return roleOf(sec).pal(sec,tl,L)}
