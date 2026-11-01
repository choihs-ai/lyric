/* ============================================================
   55 · BACKGROUNDS — textures & environments per direction role
   ============================================================ */
function mkCanvas(w,h,fn){const c=document.createElement('canvas');c.width=w;c.height=h;fn(c.getContext('2d'));return c}
const GRAINS=[0,1,2].map(()=>ctx.createPattern(mkCanvas(256,256,g=>{const id=g.createImageData(256,256);for(let i=0;i<id.data.length;i+=4){const v=Math.random()*255|0;id.data[i]=id.data[i+1]=id.data[i+2]=v;id.data[i+3]=255}g.putImageData(id,0,0)}),'repeat'));
const SCAN=ctx.createPattern(mkCanvas(4,6,g=>{g.fillStyle='rgba(0,0,0,.55)';g.fillRect(0,0,4,2)}),'repeat');
const dotCache={};function dots(col){return dotCache[col]||(dotCache[col]=ctx.createPattern(mkCanvas(22,22,g=>{g.fillStyle=col;g.beginPath();g.arc(11,11,6.2,0,Math.PI*2);g.fill()}),'repeat'))}
function particles(n,seed,t,col,speed,size,alpha,up){
  const r=rnd(seed);ctx.fillStyle=col;
  for(let i=0;i<n;i++){const x0=r()*W,sp=(0.4+r())*speed,ph=r()*H*1.2,sz=(0.6+r()*1.4)*size*U;
    const y=up?H*1.1-((t*sp*U*60+ph)%(H*1.2)):((t*sp*U*60+ph)%(H*1.2))-H*0.1;ctx.globalAlpha=alpha*(0.4+r()*0.6);ctx.fillRect(x0+Math.sin(t*0.6+i)*20*U,y,sz,sz)}
  ctx.globalAlpha=1;
}
function glow(x,y,r,col,a){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,hexA(col,a));g.addColorStop(1,hexA(col,0));ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2)}
const BG={
  brutalIntro(pal,t){const g=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*0.15,W/2,H/2,Math.max(W,H)*0.75);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,hexA(pal.ac,0.16+K*0.28));ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    if(K>0.55){ctx.fillStyle=hexA(pal.ac,(K-0.55)*0.55*INTENSITY);ctx.fillRect(0,0,W,H)}
    const r=rnd(Math.floor((t-T0)/BEAT)+11);ctx.fillStyle=hexA(pal.ac,0.55*S);for(let i=0;i<3;i++)ctx.fillRect(r()*W,0,(2+r()*16)*U,H)},
  smoke(pal,t){const p=pal.p||0;
    for(let i=0;i<6;i++){const r=rnd(i*977+3);glow(W*(r()*1.1-0.05+0.12*Math.sin(t*0.07*(1+i*0.3)+i)),H*(0.2+0.7*r()+0.08*Math.cos(t*0.05+i)),Math.max(W,H)*(0.3+r()*0.3),pal.ac,0.07+0.05*K+0.04*p)}
    if(p>0.3)particles(Math.round(60*p),77,t,pal.ac,1.6+p*2,3,0.75*(p-0.3)/0.7,true)},
  textRows(pal,t,tl,sec,L){const tx=UP(L.text)+'  /  ';const fs=H*0.15;setFont(fs,'d');const sw=ctx.measureText(tx).width||1;
    ctx.save();ctx.globalAlpha=pal.inv?0.4:0.85;ctx.strokeStyle=pal.sub;ctx.lineWidth=1.6*U;ctx.textBaseline='middle';ctx.textAlign='left';
    for(let row=0,y=fs*0.6;y<H+fs;row++,y+=fs*1.12){const dir=row%2?1:-1;const off=(((t*W*0.06*dir)+row*sw*0.37)%sw+sw)%sw;for(let x=-off;x<W;x+=sw)ctx.strokeText(tx,x,y)}ctx.restore();
    ctx.save();ctx.globalAlpha=0.3;ctx.fillStyle=SCAN;ctx.fillRect(0,0,W,H);ctx.restore();
    if(S>0.7){ctx.fillStyle=hexA(pal.fg,(S-0.7)*0.25);ctx.fillRect(0,0,W,H)}},
  paperSun(pal,t){ctx.save();ctx.strokeStyle=hexA(pal.fg,0.07);ctx.lineWidth=1*U;const gs=72*U;ctx.beginPath();for(let x=gs;x<W;x+=gs){ctx.moveTo(x,0);ctx.lineTo(x,H)}for(let y=gs;y<H;y+=gs){ctx.moveTo(0,y);ctx.lineTo(W,y)}ctx.stroke();
    const land=W>H,sx=land?W*0.8:W*0.72,sy=land?H*0.3:H*0.2,sr=Math.min(W,H)*0.3*(1+K*0.05);
    ctx.beginPath();ctx.arc(sx,sy,sr,0,Math.PI*2);ctx.clip();ctx.translate(sx,sy);ctx.rotate(t*0.05);ctx.globalAlpha=0.9;ctx.fillStyle=dots(pal.ac);ctx.fillRect(-sr*1.5,-sr*1.5,sr*3,sr*3);ctx.restore();
    ctx.save();ctx.strokeStyle=hexA(pal.fg,0.45);ctx.lineWidth=1.2*U;[[0.06,0.12],[0.94,0.88]].forEach(([a,b])=>{const x=W*a,y=H*b,r=12*U;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.moveTo(x-r*1.8,y);ctx.lineTo(x+r*1.8,y);ctx.moveTo(x,y-r*1.8);ctx.lineTo(x,y+r*1.8);ctx.stroke()});
    ctx.fillStyle=pal.ac;ctx.fillRect(0,0,10*U+K*14*U,H);ctx.restore()},
  ecg(pal,t){particles(50,5,t,pal.fg,0.25,2,0.25,true);
    ctx.save();ctx.strokeStyle=hexA(pal.ac,0.75);ctx.lineWidth=2*U;ctx.beginPath();const y0=H*(W>H?0.8:0.74);
    for(let x=0;x<=W;x+=4*U){const tx=t-(W-x)/W*3;const v=env(KICKS,tx,0.06);const y=y0-90*U*v*Math.sin(v*9);x?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.stroke();ctx.restore()},
  neonHaze(pal,t){const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,pal.bg);g.addColorStop(1,mix(pal.bg,pal.sub,0.6));ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    glow(W*(0.25+0.08*Math.sin(t*0.13)),H*0.35,Math.max(W,H)*0.5,pal.ac,0.16+K*0.1);glow(W*(0.78+0.06*Math.cos(t*0.11)),H*0.7,Math.max(W,H)*0.45,pal.ac2||pal.ac,0.13+K*0.08);
    ctx.save();ctx.globalAlpha=0.1;ctx.fillStyle=pal.ac2||pal.ac;const r=rnd(7);for(let i=0;i<14;i++){const x=(r()*W+t*W*0.01*(r()-0.5))%W;ctx.fillRect(x,0,(1+r()*2)*U,H)}ctx.restore();
    particles(30,9,t,pal.fg,0.4,2,0.25,true)},
  synthGrid(pal,t){const hz=H*0.6;const g=ctx.createLinearGradient(0,0,0,hz);g.addColorStop(0,pal.bg);g.addColorStop(1,mix(pal.bg,pal.ac2||pal.ac,0.25));ctx.fillStyle=g;ctx.fillRect(0,0,W,hz);
    const sr=Math.min(W,H)*0.22,sx=W/2,sy=hz-sr*0.25;ctx.save();ctx.beginPath();ctx.arc(sx,sy,sr,0,Math.PI*2);ctx.clip();const sg=ctx.createLinearGradient(0,sy-sr,0,sy+sr);sg.addColorStop(0,pal.ac2||'#ffe94a');sg.addColorStop(1,pal.ac);ctx.fillStyle=sg;ctx.globalAlpha=0.55;ctx.fillRect(sx-sr,sy-sr,sr*2,sr*2);
      ctx.globalAlpha=1;ctx.fillStyle=pal.bg;for(let i=0;i<7;i++){const yy=sy+i*sr*0.14;ctx.fillRect(sx-sr,yy,sr*2,2*U+i*1.6*U)}ctx.restore();
    ctx.fillStyle=mix(pal.bg,'#000000',0.3);ctx.fillRect(0,hz,W,H-hz);
    ctx.save();ctx.strokeStyle=hexA(pal.ac,0.55+K*0.3);ctx.lineWidth=1.5*U;ctx.beginPath();
    for(let i=-14;i<=14;i++){ctx.moveTo(W/2+i*W*0.012,hz);ctx.lineTo(W/2+i*W*0.16,H)}
    const sp=(t/BEAT)%1;for(let k=0;k<12;k++){const z=(k+1-sp)/12;const yy=hz+(H-hz)*Math.pow(z,2.2);ctx.moveTo(0,yy);ctx.lineTo(W,yy)}ctx.stroke();ctx.restore();
    glow(W/2,hz,W*0.6,pal.ac,0.12)},
  streaks(pal,t){glow(W/2,H/2,Math.max(W,H)*0.6,pal.ac,0.12+K*0.12);
    ctx.save();ctx.translate(W/2,H/2);ctx.rotate(-0.35);const r=rnd(Math.floor(t/BEAT)+3);
    for(let i=0;i<9;i++){const y=(r()-0.5)*H*1.4,len=W*(0.3+r()*0.6),sp=(t*W*(0.6+r())+r()*W*3)%(W*3)-W*1.5;const g=ctx.createLinearGradient(sp-len,0,sp,0);const c=i%2?pal.ac:(pal.ac2||pal.ac);g.addColorStop(0,hexA(c,0));g.addColorStop(1,hexA(c,0.35+S*0.3));ctx.fillStyle=g;ctx.fillRect(sp-len,y,len,(2+r()*5)*U)}
    ctx.restore()},
  paperGrid(pal,t,tl,sec){ctx.save();const m=W*0.06,cw=(W-2*m)/12;ctx.strokeStyle=hexA(pal.fg,0.06);ctx.lineWidth=1*U;ctx.beginPath();for(let i=0;i<=12;i++){ctx.moveTo(m+i*cw,0);ctx.lineTo(m+i*cw,H)}ctx.stroke();
    ctx.strokeStyle=hexA(pal.fg,0.35);ctx.beginPath();ctx.moveTo(m,H*0.09);ctx.lineTo(W-m,H*0.09);ctx.moveTo(m,H*0.91);ctx.lineTo(W-m,H*0.91);ctx.stroke();
    setFont(15*U,'m');ctx.fillStyle=pal.fg;ctx.globalAlpha=0.6;ctx.textBaseline='bottom';ctx.textAlign='left';ctx.fillText(metaTitle(),m,H*0.09-8*U);ctx.textAlign='right';ctx.fillText(`№ ${pad2(sec.idx+1)} · ${sec.label}`,W-m,H*0.09-8*U);
    ctx.textBaseline='top';ctx.textAlign='left';ctx.fillText(secArtist(sec),m,H*0.91+8*U);ctx.textAlign='right';ctx.fillText(`p. ${pad3(Math.max(1,Math.floor((t-T0)/BAR)+1))}`,W-m,H*0.91+8*U);ctx.restore()},
  bigNumeral(pal,t,tl,sec,L){BG.paperGrid(pal,t,tl,sec);ctx.save();setFont(H*0.9,'s');ctx.textAlign='right';ctx.textBaseline='alphabetic';ctx.strokeStyle=hexA(pal.fg,0.12);ctx.lineWidth=2*U;ctx.strokeText(pad2(sec.idx+1),W*0.97,H*0.98);ctx.restore()},
  popShapes(pal,t){ctx.save();const r=rnd(42);const cols=[pal.ac,pal.ac2||pal.ac,pal.sub];
    for(let i=0;i<9;i++){const x=r()*W,y=r()*H,s=(40+r()*140)*U*(1+K*0.12*(i%2)),c=cols[i%3],rot=t*(r()-0.5)*0.8,type=i%3;ctx.save();ctx.translate(x+Math.sin(t*0.7+i)*20*U,y+Math.cos(t*0.6+i)*16*U);ctx.rotate(rot);ctx.fillStyle=c;ctx.globalAlpha=0.55;
      if(type===0){ctx.beginPath();ctx.arc(0,0,s*0.5,0,Math.PI*2);ctx.fill()}
      else if(type===1){ctx.beginPath();for(let k=0;k<10;k++){const a=k*Math.PI/5,rr=k%2?s*0.22:s*0.5;ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr)}ctx.closePath();ctx.fill()}
      else{ctx.strokeStyle=c;ctx.lineWidth=10*U;ctx.lineJoin='round';ctx.beginPath();for(let k=0;k<6;k++)ctx.lineTo(-s+k*s*0.4,(k%2?-1:1)*s*0.18);ctx.stroke()}ctx.restore()}
    ctx.restore()},
  stripes(pal,t){ctx.save();ctx.translate(W/2,H/2);ctx.rotate(-0.5);ctx.fillStyle=pal.sub;const w=90*U,off=(t*120*U)%(w*2);for(let x=-W*1.5-off;x<W*1.5;x+=w*2)ctx.fillRect(x,-H*1.5,w,H*3);ctx.restore();
    if(K>0.5){ctx.save();ctx.globalAlpha=(K-0.5)*0.6;ctx.fillStyle=pal.ac;const r=rnd(Math.floor(t*8));for(let i=0;i<30;i++){ctx.save();ctx.translate(r()*W,r()*H);ctx.rotate(r()*3);ctx.fillRect(-8*U,-3*U,16*U,6*U);ctx.restore()}ctx.restore()}},
  vhs(pal,t){glow(W*0.05,H*0.2,Math.max(W,H)*0.55,pal.ac2||'#e0a96d',0.12);glow(W*0.95,H*0.9,Math.max(W,H)*0.4,pal.ac,0.08);
    ctx.save();const by=((t*0.18)%1.3-0.15)*H;ctx.fillStyle=hexA(pal.fg,0.05);ctx.fillRect(0,by,W,H*0.05);ctx.globalAlpha=0.08;ctx.fillStyle=pal.fg;const r=rnd(Math.floor(t*20));for(let i=0;i<40;i++)ctx.fillRect(r()*W,by+r()*H*0.05,r()*60*U,1*U);ctx.restore();
    setFont(22*U,'m');ctx.save();ctx.globalAlpha=0.6;ctx.fillStyle=pal.fg;ctx.textAlign='right';ctx.textBaseline='top';ctx.fillText('▶ PLAY',W-70*U,H*0.12);ctx.restore()},
  rain(pal,t){BG.vhs(pal,t);ctx.save();ctx.strokeStyle=hexA(pal.fg,0.12);ctx.lineWidth=1*U;ctx.beginPath();const r=rnd(5);
    for(let i=0;i<80;i++){const x=r()*W,sp=0.6+r()*0.6,y=((t*sp*H*0.9+r()*H)%(H*1.2))-H*0.1,l=(20+r()*40)*U;ctx.moveTo(x,y);ctx.lineTo(x-l*0.15,y+l)}ctx.stroke();ctx.restore()},
  rays(pal,t){ctx.save();ctx.translate(W/2,-H*0.15);ctx.globalCompositeOperation='lighter';
    for(let i=0;i<7;i++){const a=(i-3)*0.16+Math.sin(t*0.1+i)*0.04,len=H*1.4,w=(0.05+0.04*Math.sin(t*0.3+i*1.7))*len;ctx.save();ctx.rotate(a);const g=ctx.createLinearGradient(0,0,0,len);g.addColorStop(0,hexA(pal.ac,0.14+K*0.05));g.addColorStop(1,hexA(pal.ac,0));ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(-w*0.1,0);ctx.lineTo(w*0.1,0);ctx.lineTo(w,len);ctx.lineTo(-w,len);ctx.fill();ctx.restore()}
    ctx.restore();particles(70,13,t*0.4,pal.ac,0.3,2.2,0.35,false)},
  dust(pal,t){glow(W*0.5,H*0.45,Math.max(W,H)*0.6,pal.ac,0.07);particles(90,21,t*0.35,pal.fg,0.25,2,0.3,true)},
};
function drawBG(sec,pal,t,tl,L){ctx.fillStyle=pal.bg;ctx.fillRect(0,0,W,H);const k=roleOf(sec).bg;if(BG[k]){ctx.save();BG[k](pal,t,tl,sec,L);ctx.restore()}}
