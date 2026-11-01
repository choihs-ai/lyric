/* ============================================================
   40 · TEXT — canvases, font roles, alpha convention, layout engine
   ============================================================ */
let cv=$('cv');                                     // displayed + recorded canvas (WebGL post or 2D copy)
const SRC=document.createElement('canvas');          // all drawing happens here (2D)
const ctx=SRC.getContext('2d');
let W=1920,H=1080,U=1,aspect='16:9';
function fitCanvas(){const s=Math.min(innerWidth/W,innerHeight/H);cv.style.width=(W*s)+'px';cv.style.height=(H*s)+'px'}
function setAspect(a){aspect=a;if(a==='9:16'){W=1080;H=1920}else{W=1920;H=1080}SRC.width=W;SRC.height=H;cv.width=W;cv.height=H;U=Math.min(W,H)/1080;
  if(typeof postResize==='function')postResize();fitCanvas();LINES.forEach(L=>L._c={})}
addEventListener('resize',fitCanvas);

/* alpha convention: modes never set globalAlpha absolutely — they call A(x); GA lets the caller fade a whole pass (motion-blur ghosts, echo copies) */
let GA=1;const A=a=>{ctx.globalAlpha=GA*a};

/* font roles: d display · s serif · m mono · l light sans · h hand */
const FONT_OK={};
function fontStr(px,role){const r=DIR.fonts[role]||DIR.fonts.d;px=Math.max(1,px|0);
  return FONT_OK[r.f]===false?`${r.fb} ${px}px ${STACK[r.stack]}`:`${r.w} ${px}px "${r.f}",${STACK[r.stack]}`}
function setFont(px,role){ctx.font=fontStr(px,role||'d')}
function probe(fam){ctx.font='60px monospace';const a=ctx.measureText('가나다라ABCxyz').width;ctx.font=`60px "${fam}",monospace`;return Math.abs(ctx.measureText('가나다라ABCxyz').width-a)>0.5}
let fontEpoch=0;
function fontsChanged(){
  const ep=++fontEpoch;const fams=[...new Set(Object.values(DIR.fonts).map(r=>r.f))];
  fams.forEach(f=>{if(FONT_OK[f]==null)FONT_OK[f]=probe(f)||null});
  LINES.forEach(L=>L._c={});
  if(document.fonts&&document.fonts.load){
    Promise.all(fams.map(f=>{const r=Object.values(DIR.fonts).find(x=>x.f===f);return document.fonts.load(`${r.w} 40px "${f}"`,'가A').catch(()=>{})}))
      .then(()=>{if(ep!==fontEpoch)return;fams.forEach(f=>FONT_OK[f]=probe(f));LINES.forEach(L=>L._c={})});
    setTimeout(()=>{if(ep!==fontEpoch)return;fams.forEach(f=>FONT_OK[f]=probe(f));LINES.forEach(L=>L._c={})},3000);
  }
}
const UP=s=>DIR.motion.upper?s.toUpperCase():s;
const wordRole=(w,role)=>(DIR.motion.hand&&w.emph&&role==='d')?'h':role;

/* layout: wraps words into rows that fit maxW/maxH, emphasized words larger */
function layout(L,key,maxW,maxH,maxRows,basePx,role='d',upper=true,emScale=1.28){
  const k=key+W+DIR_KEY;if(L._c[k])return L._c[k];
  let px=basePx,res;
  for(let it=0;it<44;it++){
    const items=L.words.map((w,i)=>{const rr=wordRole(w,role),hs=rr==='h'?1.25:1;const size=px*hs*(w.emph?(w.emph>1?emScale*1.1:emScale):1);setFont(size,rr);
      const tx=upper?UP(w.text):w.text;return {i,tx,size,role:rr,wd:ctx.measureText(tx).width}});
    setFont(px,role);const sp=ctx.measureText(' ').width*0.85;
    const rows=[];let r={items:[],w:0,h:0};
    for(const it of items){const gap=r.items.length?sp:0;if(r.items.length&&r.w+gap+it.wd>maxW){rows.push(r);r={items:[],w:0,h:0}}
      const g2=r.items.length?sp:0;it.x=r.w+g2;r.w+=g2+it.wd;r.items.push(it);r.h=Math.max(r.h,it.size)}
    rows.push(r);const th=rows.reduce((a,b)=>a+b.h,0);res={px,rows,th,sp};
    if(rows.length<=maxRows&&rows.every(x=>x.w<=maxW)&&th<=maxH)break;px*=0.92}
  L._c[k]=res;return res;
}
function rowX(rw,align,mx=0.08){return align==='left'?W*mx:align==='right'?W*(1-mx)-rw:(W-rw)/2}
/* per-character placement derived from a layout (for shatter / dissolve / wave / flip / ring) */
function chars(L,lay,key,align='center'){
  const k='ch_'+key+W+DIR_KEY+align;if(L._c[k])return L._c[k];
  const out=[];const r=rnd(L.seed*3+1);let y=H/2-lay.th/2,gi=0;
  for(const row of lay.rows){const x0=rowX(row.w,align),cy=y+row.h*0.5;
    for(const it of row.items){setFont(it.size,it.role);let acc='';
      Array.from(it.tx).forEach((c,ci)=>{const xa=ctx.measureText(acc).width;acc+=c;const xb=ctx.measureText(acc).width;
        out.push({c,x:x0+it.x+xa+(xb-xa)/2,y:cy,w:xb-xa,size:it.size,role:it.role,wi:it.i,ci,gi:gi++,ang:r()*Math.PI*2,d:(0.5+r()*0.6)*Math.max(W,H),rot:(r()-0.5)*5,ang2:r()*Math.PI*2,rot2:(r()-0.5)*6,q:r()})})}
    y+=row.h}
  L._c[k]=out;return out;
}
function wordColor(w,pal){return w.emph?pal.ac:pal.fg}
function emphBox(x,y,wd,size,pal){const p=size*0.1;ctx.fillStyle=pal.ac;ctx.fillRect(x-p,y-size*0.55,wd+p*2,size*1.08);ctx.fillStyle=pal.bg}
const SP=()=>DIR.motion.speed;
