/* ============================================================
   60 · RENDER — frame orchestration: title, sections, camera,
        impacts, transitions, chapter marks, HUD, end card
   ============================================================ */
let OFF=0;const FXU={glitch:0,flash:0,ca:0};
const PSEC={role:'intro',idx:0,label:'OPENING',artist:'',firstStart:0,lastEnd:1};
function impactNow(tl){const i=lastIdx(IMPACT_T,tl);if(i<0)return {e:0,lvl:0};const im=IMPACTS[i],dt=tl-im.t;return {e:dt<1.2?Math.exp(-dt/(im.lvl>1?0.34:0.24)):0,lvl:im.lvl,im}}
function drawImpactBack(imp,pal){const tx=UP(imp.im.text);setFont(100,'d');const w=ctx.measureText(tx).width||1;const px=Math.min(H*0.9,100*W*0.96/w);const s=1+(1-imp.e)*0.3;
  ctx.save();ctx.translate(W/2,H/2);ctx.scale(s,s);setFont(px,'d');ctx.textAlign='center';ctx.textBaseline='middle';ctx.globalAlpha=imp.e*(DIR.motion.glitch>0.2?0.6:0.3);
  ctx.strokeStyle=pal.ac2||pal.ac;ctx.lineWidth=2.5*U;ctx.strokeText(tx,0,px*0.04);ctx.restore()}
function glitch2d(a){ctx.save();ctx.setTransform(1,0,0,1,0,0);const r=rnd((performance.now()/45)|0);for(let i=0;i<6;i++){const y=r()*H,h=(0.015+r()*0.07)*H,dx=(r()-0.5)*a*W*0.12;try{ctx.drawImage(SRC,0,y,W,h,dx,y,W,h)}catch(e){}}ctx.restore()}
function transition(sec,pal,p,tl){
  if(p<0||p>=1)return;const k=DIR.trans;
  if(k==='slit'){for(let i=0;i<9;i+=2){const q=eInOut(clamp(p*1.6-i*0.06));if(q<=0||q>=1)continue;const h=H/9;ctx.fillStyle=i%4?pal.fg:pal.ac;ctx.fillRect((-1+2*q)*W,i*h,W,h+1)}}
  else if(k==='sweep'){const x=lerp(-W*0.3,W*1.3,E.inOut(p));const g=ctx.createLinearGradient(x-W*0.25,0,x+W*0.05,0);g.addColorStop(0,hexA(pal.ac,0));g.addColorStop(0.8,hexA(pal.ac2||pal.ac,0.55));g.addColorStop(1,hexA('#ffffff',0));
    ctx.save();ctx.globalCompositeOperation='lighter';ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.restore()}
  else if(k==='circle'&&sec.idx>0){const ps=SECS[sec.idx-1],pl=LINES.filter(L=>L.sec===ps).pop();if(!pl)return;const pp=paletteFor(ps,tl,pl);const R=Math.hypot(W,H)*0.6*E.outCubic(p);
    ctx.save();ctx.beginPath();ctx.rect(0,0,W,H);ctx.arc(W/2,H/2,R,0,Math.PI*2,true);ctx.fillStyle=pp.bg;ctx.fill('evenodd');ctx.restore()}
  else if(k==='fadeBlack'){ctx.fillStyle=hexA('#000000',1-E.outCubic(p));ctx.fillRect(0,0,W,H)}
}
function chapter(sec,pal,p){
  if(p>2.2||p<0)return;const a=p<0.25?eOutExpo(p/0.25):p>1.8?1-(p-1.8)/0.4:1;const num=pad2(sec.idx+1);const lb=DIR.fx.lbox?H*DIR.fx.lbox:0;
  ctx.save();ctx.globalAlpha=a;
  if(DIR.trans==='slit'||DIR.trans==='sweep'||DIR.trans==='circle'){setFont(H*(W>H?0.26:0.14),'d');ctx.textBaseline='alphabetic';ctx.textAlign='left';ctx.strokeStyle=pal.ac;ctx.lineWidth=2*U;
    const x=W*0.06-(1-a)*60*U,y=W>H?H*0.9:H*0.78;   // portrait: keep clear of Shorts/Reels caption area
   ctx.strokeText(num,x,y);const nw=ctx.measureText(num).width;setFont(20*U,'m');ctx.fillStyle=pal.fg;ctx.fillText(sec.label+(sec.mood?' · '+sec.mood:''),x+nw+24*U,y-36*U);ctx.globalAlpha=a*0.6;ctx.fillText(secArtist(sec),x+nw+24*U,y-8*U)}
  else{const role=DIR.motion.hand?'h':'s';setFont((role==='h'?34:20)*U,role);ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=pal.fg;const y=W>H?H-lb-70*U:H*0.8;
    const txt=`${num}  ·  ${sec.label}${sec.mood?'  ·  '+sec.mood:''}`;ctx.fillText(txt,W/2,y);const tw=ctx.measureText(txt).width;ctx.fillStyle=pal.ac;ctx.fillRect(W/2-tw/2-20*U-40*U*a,y,40*U*a,1.5*U);ctx.fillRect(W/2+tw/2+20*U,y,40*U*a,1.5*U)}
  ctx.restore();
}
function tcode(t){t=Math.max(0,t);const m=Math.floor(t/60),s=Math.floor(t%60),f=Math.floor((t%1)*30);return `${pad2(m)}:${pad2(s)}:${pad2(f)}`}
function hud(t,pal,sec,L){
  const lb=DIR.fx.lbox?H*DIR.fx.lbox:0,m=44*U+lb*0.0;ctx.save();ctx.globalAlpha=1;ctx.fillStyle=pal.ac;ctx.fillRect(0,H-lb-3*U,W*clamp(t/SONG_END),3*U);
  if(DIR_KEY==='editorial'){ctx.restore();return}
  const top=lb+44*U,bot=H-lb-44*U;ctx.fillStyle=pal.fg;ctx.strokeStyle=pal.fg;ctx.lineWidth=1.2*U;ctx.globalAlpha=0.6;
  const c=18*U;[[m,top,1,1],[W-m,top,-1,1],[m,bot,1,-1],[W-m,bot,-1,-1]].forEach(([x,y,sx,sy])=>{ctx.beginPath();ctx.moveTo(x,y+sy*c);ctx.lineTo(x,y);ctx.lineTo(x+sx*c,y);ctx.stroke()});
  setFont(17*U,'m');ctx.textBaseline='top';ctx.textAlign='left';const ix=m+30*U;
  ctx.fillText(metaTitle().slice(0,30),ix,top);ctx.globalAlpha=0.38;ctx.fillText(`${pad2(sec.idx+1)} — ${sec.label}`,ix,top+24*U);
  ctx.textAlign='right';ctx.globalAlpha=0.6;ctx.fillText(tcode(t),W-ix,top);ctx.globalAlpha=0.38;ctx.fillText(`L.${pad3(L.gi+1)} / ${pad3(LINES.length)}`,W-ix,top+24*U);
  ctx.textBaseline='bottom';ctx.textAlign='left';ctx.globalAlpha=0.6;ctx.fillText(secArtist(sec),ix,bot);ctx.globalAlpha=0.38;ctx.fillText(`${Math.round(SONG.bpm)} BPM · ${DIR.name}`,ix,bot-24*U);
  const b=Math.max(0,Math.floor((t-T0)/BEAT)),bar=Math.min(NB,Math.floor(b/4)+1),bi=b%4;
  ctx.textAlign='right';ctx.globalAlpha=0.6;ctx.fillText(`BAR ${pad2(bar)}/${NB}`,W-ix,bot);
  for(let i=0;i<4;i++){const s=9*U,x=W-ix-(3-i)*(s+6*U)-s,y=bot-34*U-s;ctx.globalAlpha=i===bi?0.9:0.22;ctx.fillRect(x,y,s,s)}
  ctx.restore();
}
/* ---------- title sequences ---------- */
function titleBase(t,end){
  const pal=roleOf(PSEC).pal(PSEC,0,{li:0,text:metaTitle(),words:[]});drawBG(PSEC,pal,t,t,{text:metaTitle(),words:[]});return pal}
function drawTitle(t,end){return DIR.title==='elegant'?titleElegant(t,end):titleSlam(t,end)}
function titleSlam(t,end){
  const pal=titleBase(t,end);
  ctx.save();ctx.strokeStyle=hexA(pal.fg,0.14);ctx.lineWidth=1*U;
  for(let i=1;i<12;i++){const p=eOutExpo(clamp((t-0.3-i*0.08)/1.8)),x=W*i/12;ctx.beginPath();ctx.moveTo(x,H/2-H/2*p);ctx.lineTo(x,H/2+H/2*p);ctx.stroke()}
  for(let j=1;j<6;j++){const p=eOutExpo(clamp((t-0.9-j*0.1)/1.8)),y=H*j/6;ctx.beginPath();ctx.moveTo(W/2-W/2*p,y);ctx.lineTo(W/2+W/2*p,y);ctx.stroke()}ctx.restore();
  const title=titleText(),art=metaArtist(),feat=metaFeat(),cut=x=>x.length>26?x.slice(0,25)+'…':x;
  const labs=[[cut(art),0.07,0.1],[feat?cut('FEAT. '+feat):'',0.07,0.135],[cut('TRACK — '+title),0.6,0.1],[`${Math.round(SONG.bpm)} BPM · ${DIR.name} · ${NB} BARS`,0.6,0.135],['FAN-MADE KINETIC LYRIC MOTION',0.07,0.87],['00 — OPENING',0.6,0.87]].filter(x=>x[0]);
  setFont(18*U,'m');ctx.fillStyle=pal.fg;ctx.textBaseline='top';ctx.textAlign='left';const ls=Math.min(0.45,end/16);
  labs.forEach(([q,x,y],i)=>{const st=0.3+i*ls,nn=Math.floor(clamp((t-st)/Math.min(0.5,end/10))*q.length);if(nn<=0)return;ctx.globalAlpha=0.7;ctx.fillText(q.slice(0,nn)+(nn<q.length&&(t*8|0)%2?'▌':''),W*x,H*y)});ctx.globalAlpha=1;
  let slam=KICKS.find(k=>k>end*0.42&&k<end-0.8);if(slam==null)slam=end*0.5;
  const cs=Array.from(title);setFont(100,'d');const w100=ctx.measureText(title).width||1;const px=Math.min(H*0.3,100*W*0.86/w100);setFont(px,'d');const cw=cs.map(c=>ctx.measureText(c).width);
  const sumw=cw.reduce((a,b)=>a+b,0),maxSp=cs.length>1?Math.max(0,(W*0.95-sumw)/(cs.length-1)):0;
  const post=t>=slam,pre=clamp(t/slam);const spacing=post?px*0.01:Math.min(px*0.42,maxSp)*(1-eInOut(pre))+px*0.01;const total=sumw+spacing*(cs.length-1);
  const zd=Math.min(1.9,end*0.25),zp=clamp((t-(end-zd))/zd),zoom=1+Math.pow(zp,3)*18;const punch=post?1+0.08*Math.exp(-(t-slam)/0.18)+K*0.03:1;
  const t1=Math.min(1.2,slam*0.2),step=Math.min(0.32,Math.max(0.03,(slam-t1-0.4)/Math.max(1,cs.length))),dr=Math.min(1.8,Math.max(0.35,slam*0.35));
  ctx.save();ctx.translate(W/2,H/2);ctx.scale(zoom*punch,zoom*punch);ctx.translate(-total/2,0);ctx.textBaseline='middle';ctx.textAlign='left';
  let x=0;cs.forEach((c,i)=>{const r=rnd(i*131+7),a=clamp((t-t1-i*step)/dr),e=eOutExpo(a);let y=(1-e)*H*0.55,rot=(1-e)*(r()-0.5)*0.8;if(post){y=0;rot=0}
    ctx.save();ctx.translate(x+cw[i]/2,y);ctx.rotate(rot);ctx.globalAlpha=post?1:a*0.9;
    if(post){ctx.fillStyle=pal.fg;ctx.fillText(c,-cw[i]/2,px*0.04)}else{ctx.strokeStyle=pal.fg;ctx.lineWidth=2*U;ctx.strokeText(c,-cw[i]/2,px*0.04)}ctx.restore();x+=cw[i]+spacing});
  ctx.restore();
  if(post){const a=clamp((t-slam-0.3)/0.4)*(1-zp*2);if(a>0){setFont(24*U,'m');ctx.globalAlpha=a;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=pal.ac;ctx.fillText(art+(feat?'  ×  '+feat:''),W/2,H/2+px*0.78);ctx.globalAlpha=1}
    const f=Math.exp(-(t-slam)/0.16);if(f>0.02){ctx.globalCompositeOperation=pal.light?'multiply':'screen';ctx.fillStyle=hexA(pal.ac,f*0.9);ctx.fillRect(0,0,W,H);ctx.globalCompositeOperation='source-over'}
    if(K>0.6&&zp<0.5)FXU.glitch=Math.max(FXU.glitch,K*0.6*DIR.motion.glitch)}
  if(zp>0.85){ctx.fillStyle=hexA(pal.fg,(zp-0.85)/0.15);ctx.fillRect(0,0,W,H)}
  return pal;
}
function titleElegant(t,end){
  const pal=titleBase(t,end),title=titleText(),art=metaArtist(),feat=metaFeat();const lb=DIR.fx.lbox?H*DIR.fx.lbox:0;
  const role=DIR_KEY==='lofi'?'s':'d';const cs=Array.from(title);setFont(100,role);const w100=ctx.measureText(title).width||1;const px=Math.min(H*0.2,100*W*0.62/w100);setFont(px,role);
  const cw=cs.map(c=>ctx.measureText(c).width),sumw=cw.reduce((a,b)=>a+b,0);
  const p=clamp(t/(end*0.85)),sp=px*(0.65*(1-E.outCubic(p))+0.12),total=sumw+sp*(cs.length-1);const out=clamp((t-(end-0.9))/0.9);
  ctx.save();ctx.globalAlpha=1-out;ctx.textBaseline='middle';ctx.textAlign='left';let x=W/2-total/2;const y=H/2;
  cs.forEach((c,i)=>{const a=clamp((t-0.4-i*Math.min(0.18,end*0.4/cs.length))/1.2);ctx.globalAlpha=(1-out)*E.outCubic(a);ctx.fillStyle=pal.fg;ctx.fillText(c,x,y+(1-E.outCubic(a))*20*U);x+=cw[i]+sp});
  const rl=E.outExpo(clamp((t-0.8)/2.2))*(total+80*U);ctx.globalAlpha=(1-out)*0.8;ctx.fillStyle=pal.ac;ctx.fillRect(W/2-rl/2,y-px*0.85,rl,1.5*U);ctx.fillRect(W/2-rl/2,y+px*0.8,rl,1.5*U);
  const ca=clamp((t-1.6)/1.2)*(1-out);setFont(19*U,'m');ctx.textAlign='center';ctx.globalAlpha=ca*0.85;ctx.fillStyle=pal.fg;
  ctx.fillText(credit('  ·  '),W/2,y+px*0.8+44*U);ctx.globalAlpha=ca*0.45;ctx.fillText(`${DIR.name} · ${Math.round(SONG.bpm)} BPM`,W/2,y-px*0.85-36*U);
  ctx.restore();return pal;
}
function drawEnd(t,st){
  const sec={role:'outro',idx:SECS.length,label:'END',artist:'',firstStart:st,lastEnd:st+1};const pal=roleOf(sec).pal(sec,t,{li:0});drawBG(sec,pal,t,t,{text:'',words:[]});
  const a=clamp((t-st)/1.2);ctx.save();ctx.globalAlpha=a;ctx.textAlign='center';ctx.textBaseline='middle';
  const title=titleText();setFont(100,'d');const w100=ctx.measureText(title).width||1;const px=Math.min(W*0.08,H*0.14,100*W*0.8/w100);setFont(px,'d');ctx.strokeStyle=pal.fg;ctx.lineWidth=2*U;ctx.strokeText(title,W/2,H/2-px*0.2);
  setFont(20*U,'m');ctx.fillStyle=pal.ac;ctx.fillText(credit(' — '),W/2,H/2+px*0.6);ctx.globalAlpha=a*0.45;ctx.fillStyle=pal.fg;ctx.fillText('FAN-MADE KINETIC LYRIC MOTION',W/2,H/2+px*0.6+34*U);ctx.restore();
  return pal;
}
/* gaps between lines (instrumental breaks, partial lyrics): a slow outline of what comes next instead of an empty screen */
function drawInterlude(tl,gs,nx,pal){
  const ge=nx.start,a=Math.min(clamp((tl-gs)/0.8),clamp((ge-0.3-tl)/0.6))*(0.2+K*0.14);if(a<=0.01)return;
  const tx=UP(nx.li===0?nx.sec.label:(metaTitle()||nx.sec.label));setFont(100,'d');const w=ctx.measureText(tx).width||1,px=Math.min(H*0.26,100*W*0.84/w);
  ctx.save();ctx.translate(W/2,H/2);ctx.scale(1+K*0.025,1+K*0.025);setFont(px,'d');ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.globalAlpha=a;ctx.strokeStyle=pal.ac2||pal.ac;ctx.lineWidth=2*U;ctx.strokeText(tx,0,0);
  ctx.globalAlpha=Math.min(1,a*2.2);ctx.fillStyle=pal.fg;ctx.fillRect(-W*0.15,px*0.62,W*0.3*clamp((tl-gs)/(ge-gs)),2*U);ctx.restore();
}
/* ---------- main frame ---------- */
function frame(t){
  ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';GA=1;
  K=env(KICKS,t,0.12);S=env(SNARES,t,0.09);FXU.glitch=0;FXU.flash=0;
  const tl=t-OFF,sb=barT(SONG.startBar),first=LINES.length?LINES[0].start:sb,titleEnd=Math.min(sb,first),last=LINES.length?LINES[LINES.length-1].end:0;
  let pal;
  if(tl<titleEnd&&titleEnd>=2.2)pal=drawTitle(t,titleEnd);
  else if(!LINES.length||tl>last+0.4)pal=drawEnd(t,last+0.4);
  else{
    let ci=0;for(let i=0;i<LINES.length;i++){if(LINES[i].start<=tl)ci=i;else break}
    const L=LINES[ci],sec=L.sec;pal=paletteFor(sec,tl,L);
    drawBG(sec,pal,t,tl,L);
    const imp=impactNow(tl),sh=DIR.motion.shake*INTENSITY;
    const shake=(K*3+imp.e*(imp.lvl>1?26:9))*U*sh,r=rnd((t*30)|0);
    const drift=(DIR_KEY==='cinematic'||DIR_KEY==='lofi'||DIR_KEY==='editorial')?clamp((tl-L.start)/Math.max(0.5,L.end-L.start))*0.035:0;
    /* portrait: shrink the lyric layer slightly and lift it so it sits inside the Shorts/Reels safe area */
    const pv=W>H,cy=pv?H*0.465:H/2,z=(1+(K*0.012+imp.e*0.02)*sh+drift)*(pv?0.9:1);
    ctx.save();ctx.translate(W/2+(r()-0.5)*shake*2,cy+(r()-0.5)*shake*2);ctx.scale(z,z);ctx.translate(-W/2,-H/2);
    if(imp.e>0.02)drawImpactBack(imp,pal);
    const P=LINES[ci-1];
    if(P){const x=(tl-L.start)/exitDur(P.mode);if(x<1&&P.end>=L.start-0.01)drawLine(P,tl,paletteFor(P.sec,tl,P),clamp(x))}
    const ex=tl>L.end?(tl-L.end)/exitDur(L.mode):0;if(ex<1)drawLine(L,tl,pal,clamp(ex));
    drawAdlibs(L,tl,pal);
    const nx=LINES[ci+1],gs=L.end+exitDur(L.mode);if(nx&&nx.start-gs>2.5&&tl>gs&&tl<nx.start)drawInterlude(tl,gs,nx,pal);
    ctx.restore();GA=1;
    const ss=sec.firstStart;if(sec.idx>0&&tl>=ss)transition(sec,pal,(tl-ss)/0.5,tl);
    chapter(sec,pal,tl-ss);
    const gl=DIR.motion.glitch*INTENSITY;
    if(imp.lvl>1&&imp.e>0.2)FXU.glitch=Math.max(FXU.glitch,imp.e*gl);else if(sec.role==='chorus'&&K>0.75)FXU.glitch=Math.max(FXU.glitch,0.35*K*gl);
    if(imp.lvl>1&&imp.e>0.55){ctx.save();if(gl>0.2){ctx.globalCompositeOperation='difference';ctx.globalAlpha=clamp((imp.e-0.55)*2.4);ctx.fillStyle='#ffffff'}else{ctx.globalAlpha=clamp((imp.e-0.55)*0.8);ctx.fillStyle=pal.ac}ctx.fillRect(0,0,W,H);ctx.restore()}
    FXU.flash=imp.e*(imp.lvl>1?1:0.4);
    hud(t,pal,sec,L);
  }
  present(t,pal||{});
}
