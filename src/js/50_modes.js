/* ============================================================
   50 · KINETIC MODES — 19 line treatments
   signature: (L line, t lyric-time, pal, ex exit-progress 0..1)
   ============================================================ */
let K=0,S=0;                                   // kick / snare envelopes (set per frame)
const ink=c=>lum(c)>0.55?'#141217':'#ffffff';

function mSlam(L,t,pal,ex,o={}){
  const lay=layout(L,'slam'+(o.k||''),o.maxW||W*0.84,o.maxH||H*0.62,o.rows||3,Math.min(H*0.26,W*0.17),o.role||'d',true);
  const al=o.align||L.align;let y=(o.cy||H/2)-lay.th/2;const d=0.15*SP();
  ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';if(ex>0)ctx.translate(0,-eIn(ex)*H*0.12);
  for(const r of lay.rows){const x0=rowX(r.w,al),cy=y+r.h*0.5;
    for(const it of r.items){const w=L.words[it.i];const a=clamp((t-w.t)/d);if(a<=0)continue;
      const e=eOutBack(a);const s=(1+(1-e)*0.5)*(1+(w.emph?K*0.07:K*0.015)*DIR.motion.shake)*(1-ex*0.3);
      ctx.save();ctx.translate(x0+it.x+it.wd/2,cy);ctx.scale(s,s*(1-ex*0.5));A(clamp(a*3)*(1-ex));setFont(it.size,it.role);
      if(o.stroke){ctx.strokeStyle=o.stroke;ctx.lineWidth=o.lw/s;ctx.strokeText(it.tx,0,it.size*0.04)}
      else{if(w.emph>1)emphBox(-it.wd/2,0,it.wd,it.size,pal);else ctx.fillStyle=wordColor(w,pal);ctx.fillText(it.tx,0,it.size*0.04)}
      ctx.restore()}
    y+=r.h}
  ctx.restore();
}
function mEcho(L,t,pal,ex){
  const n=2+Math.min(L.rep,3)*2,lt=t-L.start,g0=GA;
  for(let k=n;k>=1;k--){const s=1+k*0.075*(0.35+eOutExpo(clamp(lt/0.7)))+K*0.025*k;
    ctx.save();ctx.translate(W/2,H/2);ctx.scale(s,s);ctx.translate(-W/2,-H/2);GA=g0*0.55/k;mSlam(L,t,pal,ex,{stroke:pal.ac,lw:2*U,align:'center'});ctx.restore()}
  GA=g0;mSlam(L,t,pal,ex,{align:'center'});
}
function mStack(L,t,pal,ex){
  const key='stack'+W+DIR_KEY;let c=L._c[key];
  if(!c){const r=rnd(L.seed);const nw=L.words.length,per=nw<=5?1:Math.ceil(nw/5);const rows=[];
    for(let i=0;i<nw;i+=per){const idx=[];for(let j=i;j<Math.min(nw,i+per);j++)idx.push(j);rows.push(idx)}
    const items=rows.map(idx=>{const tx=idx.map(j=>UP(L.words[j].text)).join(' ');const em=Math.max(...idx.map(j=>L.words[j].emph));
      const frac=em?0.84:0.4+r()*0.36;setFont(100,'d');const w100=ctx.measureText(tx).width||1;return {idx,tx,em,px:Math.min(H*0.2,100*W*frac/w100),indent:r()*W*0.12}});
    let th=items.reduce((a,b)=>a+b.px*1.08,0);const lim=H*0.72;if(th>lim){const f=lim/th;items.forEach(it=>it.px*=f);th=lim}
    items.forEach(it=>{setFont(it.px,'d');it.w=ctx.measureText(it.tx).width;if(W*0.07+it.indent+it.w>W*0.88)it.indent=Math.max(0,W*0.81-it.w)});
    c=L._c[key]={items,th}}
  let y=(H-c.th)/2;const right=L.align==='right';
  ctx.save();ctx.textBaseline='middle';ctx.textAlign='left';
  c.items.forEach((it,k)=>{const t0=L.words[it.idx[0]].t;const a=clamp((t-t0)/(0.24*SP()));const h=it.px*1.08;
    if(a>0){const e=eOutExpo(a);const bx=right?W*0.93-it.indent-it.w:W*0.07+it.indent;let x=bx-(1-e)*40*U*(right?-1:1),al=1;
      if(ex>0){const q=eIn(clamp(ex*1.3-k*0.06));x-=q*W*0.45*(right?-1:1);al=1-q}
      A(al);ctx.save();ctx.beginPath();if(right)ctx.rect(x+it.w-(it.w+24*U)*e+12*U,y,(it.w+24*U)*e,h);else ctx.rect(x-12*U,y,(it.w+24*U)*e,h);ctx.clip();setFont(it.px,'d');
      if(it.em>1){ctx.fillStyle=pal.ac;ctx.fillRect(x-8*U,y+h*0.04,it.w+16*U,h*0.92);ctx.fillStyle=pal.bg}else ctx.fillStyle=it.em?pal.ac:pal.fg;
      ctx.fillText(it.tx,x,y+h*0.53);ctx.restore();
      ctx.fillStyle=pal.ac;ctx.fillRect(right?x+it.w*(1-e):x,y+h-2*U,it.w*e,2*U);
      setFont(16*U,'m');ctx.fillStyle=pal.fg;A(al*0.55);ctx.fillText(pad2(k+1),right?x-40*U:x+it.w*e+18*U,y+h*0.22)}
    y+=h});
  A(0.5*(1-ex));ctx.translate(right?60*U:W-60*U,H*0.5);ctx.rotate(-Math.PI/2);setFont(15*U,'m');ctx.textAlign='center';ctx.fillStyle=pal.fg;
  ctx.fillText([`L.${pad3(L.gi+1)}`,L.sec.label,secArtist(L.sec)].filter(Boolean).join(' — '),0,0);
  ctx.restore();
}
function mCross(L,t,pal,ex){
  const key='cross'+W+DIR_KEY;let c=L._c[key];
  if(!c){let px=W>H?H*0.36:H*0.19;setFont(px,'d');const fw=ctx.measureText(UP(L.text)).width;if(fw>W*1.7)px*=W*1.7/fw;
    setFont(px,'d');const sp=ctx.measureText(' ').width;let x=0;const items=L.words.map(w=>{const tx=UP(w.text),wd=ctx.measureText(tx).width,it={tx,wd,x};x+=wd+sp;return it});
    c=L._c[key]={px,items,tw:x-sp}}
  const dur=Math.max(0.6,L.end-L.start),p=(t-L.start)/(dur+0.3),q=p*0.75+eInOut(clamp(p))*0.25;
  const x0=W*1.02-(W*1.04+c.tw)*q,y=H*0.5;
  ctx.save();ctx.textBaseline='middle';ctx.textAlign='left';ctx.lineJoin='round';
  A(0.45*(1-ex));ctx.fillStyle=pal.fg;ctx.fillRect(0,y-c.px*0.64,W,1.5*U);ctx.fillRect(0,y+c.px*0.62,W,1.5*U);
  A(1-ex);setFont(c.px*0.085,'m');ctx.fillStyle=pal.ac;ctx.fillText(`→ ${pad3(L.gi+1)}  ${L.sec.label}`,W*0.06,y-c.px*0.64-18*U);
  setFont(c.px,'d');ctx.lineWidth=3*U;
  c.items.forEach((it,k)=>{const w=L.words[k],x=x0+it.x;if(x>W||x+it.wd<0)return;
    if(t>=w.t){A(1-ex);if(w.emph>1)emphBox(x,y,it.wd,c.px,pal);else ctx.fillStyle=wordColor(w,pal);ctx.fillText(it.tx,x,y+c.px*0.04)}
    else{ctx.strokeStyle=pal.fg;A((1-ex)*0.5);ctx.strokeText(it.tx,x,y+c.px*0.04)}});
  ctx.restore();
}
function mShatter(L,t,pal,ex){
  const lay=layout(L,'slam',W*0.82,H*0.6,3,Math.min(H*0.24,W*0.16),'d',true);const ch=chars(L,lay,'sh','center');
  ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';
  for(const p of ch){const w=L.words[p.wi];const a=clamp((t-w.t-p.ci*0.022)/(0.42*SP()));if(a<=0)continue;const e=eOutExpo(a);
    let x=p.x+Math.cos(p.ang)*p.d*(1-e),y=p.y+Math.sin(p.ang)*p.d*(1-e),rot=p.rot*(1-e),s=1+(1-e)*1.4,al=clamp(a*2.5);
    if(ex>0){const q=eIn(ex);x+=Math.cos(p.ang2)*q*W*0.5;y+=Math.sin(p.ang2)*q*W*0.4+q*q*H*0.3;rot+=p.rot2*q;al*=1-ex}
    if(K>0.4){x+=Math.sin(p.ang*9+t*40)*K*7*U*DIR.motion.shake;y+=Math.cos(p.ang*7+t*33)*K*5*U*DIR.motion.shake}
    ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.scale(s,s);A(al);setFont(p.size,p.role);ctx.fillStyle=wordColor(w,pal);ctx.fillText(p.c,0,p.size*0.04);ctx.restore()}
  ctx.restore();
}
function mTrack(L,t,pal,ex){
  const lay=layout(L,'track',W*0.74,H*0.5,2,Math.min(H*0.22,W*0.15),'d',true);
  const key='tr'+W+DIR_KEY;let cw=L._c[key];
  if(!cw)cw=L._c[key]=lay.rows.map(r=>r.items.map(it=>{setFont(it.size,it.role);return Array.from(it.tx).map(c=>({c,w:ctx.measureText(c).width}))}));
  const e0=eOutExpo(clamp((t-L.start)/(0.7*SP())));const base=1-ex;
  ctx.save();ctx.translate(W/2,H/2);ctx.transform(1,0,-0.32*(1-e0)*(DIR_KEY==='cinematic'?0:1),1,0,0);ctx.translate(-W/2,-H/2);
  if(ex>0)ctx.translate(W*0.3*eIn(ex)*(DIR_KEY==='cinematic'?0:1),0);
  ctx.textBaseline='middle';ctx.textAlign='left';let y=H/2-lay.th/2;
  lay.rows.forEach((r,ri)=>{
    const sp=r.items.map(it=>{const w=L.words[it.i];const e=eOutExpo(clamp((t-w.t)/(0.5*SP())));return it.size*(1.05*(1-e))-it.size*0.02+(DIR_KEY==='cinematic'?it.size*0.12:0)});
    let tot=0;r.items.forEach((it,k)=>{const n=cw[ri][k].length;tot+=cw[ri][k].reduce((a,b)=>a+b.w,0)+sp[k]*(n-1);if(k)tot+=lay.sp});
    let x=rowX(tot,L.align==='center'?'center':L.align,0.1);const cy=y+r.h/2;
    r.items.forEach((it,k)=>{const w=L.words[it.i];const a=clamp((t-w.t)/(0.08*SP()+(DIR_KEY==='cinematic'?0.5:0)));setFont(it.size,it.role);
      const ww=cw[ri][k].reduce((a2,b)=>a2+b.w,0)+sp[k]*(cw[ri][k].length-1);
      if(a>0){A(base*a);if(w.emph>1)emphBox(x,cy,ww,it.size,pal);else ctx.fillStyle=wordColor(w,pal);let xx=x;cw[ri][k].forEach(o=>{ctx.fillText(o.c,xx,cy+it.size*0.04);xx+=o.w+sp[k]})}
      x+=ww+lay.sp});
    y+=r.h});
  A(base);ctx.fillStyle=pal.ac;ctx.fillRect(W*0.5-W*0.4*e0,H/2+lay.th/2+18*U,W*0.8*e0,2*U);
  setFont(15*U,'m');ctx.fillStyle=pal.fg;A(base*0.55);ctx.fillText(`TRACKING ${Math.round(-(1-e0)*1000)} / L.${pad3(L.gi+1)}`,W*0.1,H/2+lay.th/2+44*U);
  ctx.restore();
}
function mSplit(L,t,pal,ex){
  const key='split'+W+DIR_KEY;let c=L._c[key];
  if(!c){setFont(100,'d');const w100=ctx.measureText(UP(L.text)).width||1;const px=Math.min(H*0.3,W*0.2,100*W*0.88/w100);
    setFont(px,'d');const sp=ctx.measureText(' ').width;let x=0;const items=L.words.map(w=>{const tx=UP(w.text),wd=ctx.measureText(tx).width,it={tx,wd,x};x+=wd+sp;return it});
    c=L._c[key]={px,items,tw:x-sp}}
  const e=eOutExpo(clamp((t-L.start)/(0.5*SP()))),off=(1-e)*W*0.75,kk=K*16*U*DIR.motion.shake,y=H/2,sep=eIn(ex)*H*0.3,x0=(W-c.tw)/2;
  ctx.save();ctx.textBaseline='middle';ctx.textAlign='left';setFont(c.px,'d');
  for(let h=0;h<2;h++){ctx.save();ctx.beginPath();if(h===0)ctx.rect(0,0,W,y);else ctx.rect(0,y,W,H-y);ctx.clip();
    const dx=h===0?-off-kk:off+kk,dy=h===0?-sep:sep;
    c.items.forEach((it,k)=>{const w=L.words[k];const on=t>=w.t;A((1-ex)*(on?1:0.16));
      if(on&&w.emph>1)emphBox(x0+it.x+dx,y+dy,it.wd,c.px,pal);else ctx.fillStyle=on?wordColor(w,pal):pal.fg;ctx.fillText(it.tx,x0+it.x+dx,y+dy+c.px*0.04)});
    ctx.restore()}
  A(1-ex);ctx.fillStyle=pal.ac;ctx.fillRect(W/2-W*0.5*e,y-2*U,W*e,4*U);
  setFont(15*U,'m');ctx.fillStyle=pal.fg;A((1-ex)*0.6);ctx.fillText('A',W*0.04,y-c.px*0.5);ctx.textAlign='right';ctx.fillText('B',W*0.96,y+c.px*0.5);
  ctx.restore();
}
function mVertical(L,t,pal,ex){
  const key='vt'+W+DIR_KEY;let c=L._c[key];
  if(!c){const list=[];L.words.forEach((w,wi)=>Array.from(UP(w.text)).forEach((ch,ci)=>list.push({c:ch,wi,ci})));
    let cols=[list];if(list.length>9){let best=1,bd=1e9;for(let i=1;i<list.length;i++){if(list[i].ci===0&&Math.abs(i-list.length/2)<bd){bd=Math.abs(i-list.length/2);best=i}}cols=[list.slice(0,best),list.slice(best)]}
    const len=Math.max(...cols.map(x=>x.length));c=L._c[key]={cols,len,px:Math.min(H*0.8/len,W>H?W*0.12:W*0.24)}}
  const {cols,px}=c;const land=W>H,left=L.align==='left';
  ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';
  const baseX=land?(left?W*0.3:W*0.6):W/2-(cols.length-1)*px*0.56;
  A(1-ex);setFont(land?H*0.56:W*0.5,'d');ctx.strokeStyle=pal.sub;ctx.lineWidth=2*U;
  if(land){ctx.textAlign=left?'right':'left';ctx.strokeText(pad2((L.gi+1)%100),left?W*0.94:W*0.06,H*0.5)}else ctx.strokeText(pad2((L.gi+1)%100),W/2,H*0.5);
  setFont(16*U,'m');ctx.fillStyle=pal.fg;A((1-ex)*0.6);ctx.textAlign='left';
  const cx=land?(left?W*0.72:W*0.07):W*0.08,cy=land?H*0.8:H*0.9;
  ctx.fillText(`LINE ${pad3(L.gi+1)}`,cx,cy);ctx.fillText(L.sec.label,cx,cy+24*U);ctx.fillText(secArtist(L.sec),cx,cy+48*U);
  ctx.textAlign='center';
  cols.forEach((col,k)=>{const x=baseX+k*px*1.12;const top=H/2-col.length*px*0.98/2+px*0.49;
    col.forEach((o,i)=>{const w=L.words[o.wi];const a=clamp((t-w.t-o.ci*0.03)/(0.3*SP()));if(a<=0)return;
      let y=top+i*px*0.98-(1-eOutBack(a))*H*0.2,al=clamp(a*3);if(ex>0){const q=eIn(clamp(ex*1.4-i*0.03));y+=q*H*0.7;al*=1-q}
      A(al);setFont(px*0.94,'d');ctx.fillStyle=wordColor(w,pal);if(w.emph>1){ctx.fillStyle=pal.ac;ctx.fillRect(x-px*0.52,y-px*0.5,px*1.04,px*0.98);ctx.fillStyle=pal.bg}
      ctx.fillText(o.c,x,y+px*0.04)})});
  ctx.restore();
}
function mGiant(L,t,pal,ex){
  if(ex>0)return;let j=-1;L.words.forEach((w,k)=>{if(t>=w.t)j=k});if(j<0)return;
  const w=L.words[j],tx=UP(w.text);setFont(100,'d');const w100=ctx.measureText(tx).width||1;const px=Math.min(H*0.62,W>H?H*0.7:W*0.5,100*W*0.88/w100);
  const a=clamp((t-w.t)/(0.12*SP())),s=1+(1-eOutExpo(a))*0.35+K*0.03*DIR.motion.shake;
  if(w.emph){A(1);ctx.fillStyle=pal.ac;ctx.fillRect(-W*0.1,-H*0.1,W*1.2,H*1.2)}
  ctx.save();ctx.translate(W/2,H*0.47);ctx.scale(s,s);setFont(px,'d');ctx.textAlign='center';ctx.textBaseline='middle';A(1);ctx.fillStyle=w.emph?ink(pal.ac):pal.fg;ctx.fillText(tx,0,px*0.04);ctx.restore();
  ctx.save();setFont(30*U,'d');let x=W*0.07;const y=Math.max(H*0.15,150*U)+(DIR.fx.lbox?H*DIR.fx.lbox:0);ctx.textAlign='left';ctx.textBaseline='middle';
  for(let k=0;k<=j;k++){const tt=UP(L.words[k].text);const ww=ctx.measureText(tt+' ').width;if(x+ww>W*0.93)break;
    A(k===j?1:0.55);ctx.fillStyle=w.emph?ink(pal.ac):(k===j?pal.ac:pal.fg);ctx.fillText(tt,x,y);x+=ww}
  A(1);ctx.fillStyle=w.emph?ink(pal.ac):pal.ac;ctx.fillRect(W*0.07,y+26*U,W*0.86*((j+1)/L.words.length),3*U);ctx.restore();
}
function mTicker(L,t,pal,ex){
  const tx=UP(L.text)+'  ●  ';setFont(H*(W>H?0.1:0.07),'d');const sw=ctx.measureText(tx).width||1;
  ctx.save();A(0.85*(1-ex));ctx.strokeStyle=pal.fg;ctx.lineWidth=1.6*U;ctx.textBaseline='middle';ctx.textAlign='left';const lt=t-L.start;
  for(let b=0;b<2;b++){const y=b?H*0.85:H*0.15,dir=b?1:-1;const off=(((lt+L.seed%7)*W*0.16*dir)%sw+sw)%sw;for(let x=-off;x<W;x+=sw)ctx.strokeText(tx,x,y)}
  ctx.restore();mSlam(L,t,pal,ex,{maxW:W*0.8,maxH:H*0.46,k:'tk',align:'center'});
}
function mDissolve(L,t,pal,ex){
  const lay=layout(L,'dis',W*0.8,H*0.4,3,Math.min(H*0.1,W*0.075),'s',false,1.15);const ch=chars(L,lay,'dis',L.align);
  ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';
  for(const p of ch){const w=L.words[p.wi];const a=clamp((t-L.start-p.gi*0.05*SP())/(0.8*SP()));if(a<=0)continue;const e=eOutExpo(a);
    let x=p.x,y=p.y+(1-e)*26*U,al=a;if(ex>0){const q=eOutExpo(ex);y-=q*(40+p.q*120)*U;x+=(p.q-0.5)*q*90*U;al*=1-ex}
    A(al);setFont(p.size,p.role);ctx.fillStyle=wordColor(w,pal);ctx.fillText(p.c,x,y)}
  ctx.restore();
}
/* ---------- new treatments ---------- */
function mMaskRise(L,t,pal,ex){
  const lay=layout(L,'mask',W*0.8,H*0.6,3,Math.min(H*0.2,W*0.13),'d',true);const gap=14*U;
  const tot=lay.rows.reduce((a,r)=>a+r.h*1.04+gap,0)-gap;let y=H/2-tot/2;const d=0.55*SP();
  ctx.save();ctx.textBaseline='middle';ctx.textAlign='left';
  lay.rows.forEach((r,ri)=>{const x0=rowX(r.w,L.align),h=r.h*1.04,cy=y+h/2;
    ctx.save();ctx.beginPath();ctx.rect(0,y-2*U,W,h+4*U);ctx.clip();
    r.items.forEach(it=>{const w=L.words[it.i];const a=clamp((t-w.t)/d);if(a<=0)return;const e=E.outQuint(a);
      let dy=(1-e)*h*1.05;if(ex>0)dy-=E.inCubic(clamp(ex*1.2-ri*0.08))*h*1.1;
      A(1);setFont(it.size,it.role);if(w.emph>1)emphBox(x0+it.x,cy+dy,it.wd,it.size,pal);else ctx.fillStyle=wordColor(w,pal);ctx.fillText(it.tx,x0+it.x,cy+dy+it.size*0.04)});
    ctx.restore();
    const g=E.outExpo(clamp((t-L.words[r.items[0].i].t)/(0.8*SP())))*(1-ex);const lw=r.w*g;
    A(0.9);ctx.fillStyle=pal.ac;ctx.fillRect(L.align==='right'?x0+r.w-lw:L.align==='center'?x0+(r.w-lw)/2:x0,y+h+4*U,lw,2*U);
    y+=h+gap});
  ctx.restore();
}
function mFlip(L,t,pal,ex){
  const lay=layout(L,'flip',W*0.82,H*0.6,3,Math.min(H*0.22,W*0.15),'d',true);const ch=chars(L,lay,'fl',L.align);
  ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';
  for(const p of ch){const w=L.words[p.wi];const a=clamp((t-w.t-p.ci*0.035)/(0.42*SP()));if(a<=0)continue;
    let ang=(1-E.outBack(a))*Math.PI*0.5;if(ex>0)ang=-E.inCubic(clamp(ex*1.3-p.gi*0.015))*Math.PI*0.5;
    const sy=Math.cos(ang);if(Math.abs(sy)<0.03)continue;
    ctx.save();ctx.translate(p.x,p.y);ctx.transform(1,0,Math.sin(ang)*0.22,sy,0,0);A(clamp(a*2)*(0.5+0.5*Math.abs(sy))*(ex>0?1-ex*0.5:1));
    setFont(p.size,p.role);ctx.fillStyle=w.emph?pal.ac:pal.fg;ctx.fillText(p.c,0,p.size*0.04);ctx.restore()}
  ctx.restore();
}
function mWave(L,t,pal,ex){
  const lay=layout(L,'wave',W*0.82,H*0.55,3,Math.min(H*0.2,W*0.14),'d',true);const ch=chars(L,lay,'wv',L.align);
  ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';
  for(const p of ch){const w=L.words[p.wi];const a=clamp((t-w.t-p.ci*0.03)/(0.5*SP()));if(a<=0)continue;const e=E.outCubic(a);
    const amp=(0.12*(1-e)+0.035+K*0.04*DIR.motion.shake)*p.size;
    const y=p.y+Math.sin(t*3.2-p.gi*0.55)*amp+(1-e)*p.size*0.6-(ex>0?E.inCubic(ex)*p.size*1.2:0);
    ctx.save();ctx.translate(p.x,y);ctx.rotate(Math.sin(t*2.4-p.gi*0.5)*0.05);A(e*(1-ex));setFont(p.size,p.role);ctx.fillStyle=w.emph?pal.ac:pal.fg;ctx.fillText(p.c,0,p.size*0.04);ctx.restore()}
  ctx.restore();
}
function mDepth(L,t,pal,ex){
  const lay=layout(L,'depth',W*0.8,H*0.6,3,Math.min(H*0.24,W*0.16),'d',true);let y=H/2-lay.th/2;const d=0.5*SP();
  ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';
  for(const r of lay.rows){const x0=(W-r.w)/2,cy=y+r.h/2;
    for(const it of r.items){const w=L.words[it.i];const a=clamp((t-w.t)/d);if(a<=0)continue;const e=E.outExpo(a);
      const z=ex>0?lerp(1,0.2,E.inCubic(ex)):lerp(7,1,e);const s=1/z;
      ctx.save();ctx.translate(W/2+(x0+it.x+it.wd/2-W/2)*s,H/2+(cy-H/2)*s);ctx.scale(s,s);A(clamp(a*2)*(ex>0?1-ex:1)*clamp(1.6-z*0.2));setFont(it.size,it.role);
      if(w.emph>1)emphBox(-it.wd/2,0,it.wd,it.size,pal);else ctx.fillStyle=wordColor(w,pal);ctx.fillText(it.tx,0,it.size*0.04);ctx.restore()}
    y+=r.h}
  ctx.restore();
}
function mTypewriter(L,t,pal,ex){
  const role=(DIR_KEY==='editorial'||DIR_KEY==='cinematic')?'s':DIR_KEY==='lofi'?'l':'m';
  const al=L.align==='center'?'left':L.align;const lay=layout(L,'tw',W*0.76,H*0.5,4,Math.min(H*0.1,W*0.07),role,false,1.0);const ch=chars(L,lay,'tw',al);
  ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';let last=null;
  for(const p of ch){const w=L.words[p.wi];if(t<w.t+p.ci*0.045*SP())break;
    if(w.emph){A(0.3*(1-ex));ctx.fillStyle=pal.ac;ctx.fillRect(p.x-p.w/2-1,p.y-p.size*0.4,p.w+2,p.size*0.82)}
    A(1-ex);setFont(p.size,p.role);ctx.fillStyle=w.emph>1?pal.ac:pal.fg;ctx.fillText(p.c,p.x,p.y+p.size*0.04);last=p}
  if(last&&ex===0&&((t*2.4)|0)%2===0){A(1);ctx.fillStyle=pal.ac;ctx.fillRect(last.x+last.w/2+4*U,last.y-last.size*0.42,Math.max(3*U,last.size*0.08),last.size*0.84)}
  ctx.restore();
}
function mScatter(L,t,pal,ex){
  const key='sc'+W+DIR_KEY;let c=L._c[key];
  if(!c){const r=rnd(L.seed+77);const roles=['d','l','s'];
    const items=L.words.map((w,i)=>{const role=w.emph?'d':roles[Math.floor(r()*3)];const tx=UP(w.text);setFont(100,role);const w100=ctx.measureText(tx).width||1;
      return {i,tx,role,px:Math.min(H*(w.emph?0.26:0.15),100*W*(w.emph?0.62:0.22+r()*0.3)/w100)}});
    let th=items.reduce((a,b)=>a+b.px*1.12,0);const lim=H*0.72;if(th>lim){const f=lim/th;items.forEach(it=>it.px*=f);th=lim}
    const cw=W/12;items.forEach(it=>{setFont(it.px,it.role);it.w=ctx.measureText(it.tx).width;const maxCol=Math.max(1,Math.floor((W*0.92-it.w)/cw));it.x=Math.max(W*0.06,Math.min(W*0.94-it.w,cw*(1+Math.floor(r()*maxCol))))});
    c=L._c[key]={items,th}}
  let y=(H-c.th)/2;ctx.save();ctx.textBaseline='middle';ctx.textAlign='left';
  c.items.forEach((it,k)=>{const w=L.words[it.i];const h=it.px*1.12;const a=clamp((t-w.t)/(0.35*SP()));
    if(a>0){const e=E.outCubic(a)*(1-ex);const dx=(1-E.outCubic(a))*30*U*(k%2?1:-1)-(ex>0?E.inCubic(ex)*40*U*(k%2?-1:1):0);
      A(e);setFont(it.px,it.role);if(w.emph>1)emphBox(it.x+dx,y+h/2,it.w,it.px,pal);else ctx.fillStyle=wordColor(w,pal);ctx.fillText(it.tx,it.x+dx,y+h/2+it.px*0.04);
      A(e*0.55);setFont(13*U,'m');ctx.fillStyle=pal.fg;ctx.fillText(pad2(it.i+1),it.x+dx,y+6*U);
      A(e);ctx.fillStyle=pal.sub;const rx=it.x+dx+it.w+16*U;ctx.fillRect(rx,y+h/2,Math.max(0,W*0.94-rx)*E.outCubic(a)*0.5,1*U)}
    y+=h});
  ctx.restore();
}
function mRing(L,t,pal,ex){
  const R=Math.min(W,H)*0.34,key='ring'+W+DIR_KEY;let c=L._c[key];
  if(!c){const tx=UP(L.text)+'  ✦  ';const arr=Array.from(tx);let px=H*0.09;setFont(px,'d');let tot=arr.reduce((a,ch)=>a+ctx.measureText(ch).width,0);
    px*=Math.min(1.5,(2*Math.PI*R*0.96)/tot);setFont(px,'d');const cs=arr.map(ch=>({c:ch,w:ctx.measureText(ch).width,wi:-1}));
    let wi=0,ci=0;const wl=L.words.map(w=>Array.from(UP(w.text)).length);cs.forEach(o=>{if(o.c===' '||wi>=L.words.length)return;o.wi=wi;if(++ci>=wl[wi]){wi++;ci=0}});
    c=L._c[key]={cs,px}}
  const lt=t-L.start,e=E.outExpo(clamp(lt/(0.7*SP())));const rr=R*(0.85+0.15*e)*(1+K*0.03*DIR.motion.shake)*(1+(ex>0?E.inCubic(ex)*0.6:0));
  ctx.save();ctx.translate(W/2,H/2);ctx.textAlign='center';ctx.textBaseline='middle';setFont(c.px,'d');let ang=-Math.PI/2+lt*0.35-(1-e)*1.2;
  for(const o of c.cs){const aw=o.w/rr;ang+=aw/2;const w=o.wi>=0?L.words[o.wi]:null;const on=w?t>=w.t:true;
    ctx.save();ctx.rotate(ang);ctx.translate(0,-rr);A(e*(1-ex)*(on?1:0.22));ctx.fillStyle=w&&w.emph?pal.ac:pal.fg;ctx.fillText(o.c,0,0);ctx.restore();ang+=aw/2}
  let j=-1;L.words.forEach((w,k)=>{if(t>=w.t)j=k});
  if(j>=0){const w=L.words[j],tx=UP(w.text);setFont(100,'d');const w100=ctx.measureText(tx).width||1;const px=Math.min(rr*0.55,100*rr*1.3/w100);const a=clamp((t-w.t)/0.15),s=1+(1-E.outBack(a))*0.3;
    ctx.save();ctx.scale(s,s);setFont(px,'d');A((1-ex)*a);ctx.fillStyle=w.emph?pal.ac:pal.fg;ctx.fillText(tx,0,px*0.04);ctx.restore()}
  ctx.restore();
}
function mBounce(L,t,pal,ex){
  const lay=layout(L,'bounce',W*0.84,H*0.6,3,Math.min(H*0.24,W*0.16),'d',true);let y=H/2-lay.th/2;
  ctx.save();ctx.textAlign='center';ctx.textBaseline='alphabetic';
  lay.rows.forEach(r=>{const x0=rowX(r.w,L.align),base=y+r.h*0.8;
    r.items.forEach((it,k)=>{const w=L.words[it.i];const lt=t-w.t;if(lt<0)return;const T=0.5*SP();let dy,sx=1,sy=1;
      if(lt<T*0.4){const p=lt/(T*0.4);dy=-(1-p*p)*H*0.35;sy=1.12;sx=0.92}else{const p=(lt-T*0.4)/(T*0.9);dy=0;const sq=Math.exp(-p*5)*Math.cos(p*14);sy=1-0.26*sq;sx=1+0.2*sq}
      if(ex>0){dy=-E.inCubic(ex)*H*0.1;sy=1+ex*0.2;sx=1-ex*0.2}
      const kk=1+K*0.05*DIR.motion.shake;
      ctx.save();ctx.translate(x0+it.x+it.wd/2,base+dy);ctx.scale(sx*kk,sy*kk);A(1-ex);setFont(it.size,it.role);
      if(w.emph){const p=it.size*0.12,bc=w.emph>1?(pal.ac2||pal.ac):pal.ac;ctx.save();ctx.rotate((rnd(L.seed+k)()-0.5)*0.12);ctx.fillStyle=bc;ctx.fillRect(-it.wd/2-p,-it.size*0.86,it.wd+2*p,it.size*1.04);ctx.restore();ctx.fillStyle=ink(bc)}
      else ctx.fillStyle=pal.fg;
      ctx.fillText(it.tx,0,0);ctx.restore()});
    y+=r.h});
  ctx.restore();
}
const MODES={slam:mSlam,echo:mEcho,stack:mStack,cross:mCross,shatter:mShatter,track:mTrack,split:mSplit,vertical:mVertical,giant:mGiant,ticker:mTicker,dissolve:mDissolve,
  maskRise:mMaskRise,flip:mFlip,wave:mWave,depth:mDepth,typewriter:mTypewriter,scatter:mScatter,ring:mRing,bounce:mBounce};
const EXIT={dissolve:1.0,shatter:0.38,stack:0.3,giant:0.01,depth:0.35,maskRise:0.4,flip:0.35,wave:0.35,ring:0.45,typewriter:0.3,scatter:0.3,bounce:0.25};
const exitDur=m=>(EXIT[m]||0.22)*Math.min(1.4,SP());
const MB=new Set(['cross','depth','shatter','bounce','slam','flip','echo']);
function drawLine(L,t,pal,ex){
  const fn=MODES[L.mode]||mSlam,lt=t-L.start;
  if(DIR.motion.blur&&MB.has(L.mode)&&(lt<0.32*SP()||ex>0||L.mode==='cross')){const g0=GA;
    for(const [dt,a] of [[0.034,0.16],[0.017,0.3]]){GA=g0*a;ctx.save();fn(L,t-dt,pal,ex>0?clamp(ex-dt/exitDur(L.mode)):0);ctx.restore()}GA=g0}
  ctx.save();fn(L,t,pal,ex);ctx.restore();
}
function drawAdlibs(L,t,pal){
  if(!L.adlibs.length)return;const dur=L.end-L.start;
  L.adlibs.forEach((a,k)=>{const t0=L.start+dur*(0.5+k*0.15),p=clamp((t-t0)/0.18);if(p<=0||t>L.end+0.15)return;
    const r=rnd(L.seed+k*31),tx='('+UP(a)+')',role=DIR_KEY==='editorial'||DIR_KEY==='cinematic'?'s':DIR.motion.hand?'h':'m';setFont((role==='h'?40:26)*U,role);const w=ctx.measureText(tx).width;
    ctx.save();ctx.translate(W*(0.56+r()*0.22),H*(0.17+r()*0.08)+(DIR.fx.lbox?H*DIR.fx.lbox:0));ctx.rotate((r()-0.5)*0.14);const s=0.6+eOutBack(p)*0.4;ctx.scale(s,s);A(1);
    if(role==='m'){ctx.fillStyle=pal.ac;ctx.fillRect(-12*U,-22*U,w+24*U,44*U);ctx.fillStyle=pal.bg}else ctx.fillStyle=pal.ac;
    ctx.textBaseline='middle';ctx.textAlign='left';ctx.fillText(tx,0,0);ctx.restore()});
}
