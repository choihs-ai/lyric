/* ============================================================
   25 · AUTO-SYNC — line starts from the singing itself (beta).
   1) vocalEnvelope (called from 10_song's analysis): STFT of raw
      L/R → centre component (in-phase L/R correlation averaged over
      ~0.15 s, so chorused/detuned stereo pads drop out) → only tonal
      peaks in 700–4000 Hz (a voice is a comb of harmonics; snares,
      hats, bass and pads mostly are not) → minus a 20th-percentile
      floor (sustained centred keys). Plus centred 2–6 kHz noise for
      unvoiced consonants and a spectral-flux track for precise onsets.
   2) vocalOnsets: phrase starts + re-attacks + flux peaks.
   3) align: monotonic DP over onsets, syllable-based line lengths
      (pauses after a line are cheap, lines shorter than their
      syllables are not), singing rate re-estimated in a second pass,
      user-pinned lines kept as anchors.
   Tuned on synthetic TTS mixes (tools/autosync_bench.*): vocal-led
   mixes land most lines within 0.15 s; a loud centred lead synth
   defeats it, which vocalConfidence() detects.
   ============================================================ */
function fftIn(re,im){const n=re.length;for(let i=1,j=0;i<n;i++){let b=n>>1;for(;j&b;b>>=1)j^=b;j^=b;if(i<j){let t=re[i];re[i]=re[j];re[j]=t;t=im[i];im[i]=im[j];im[j]=t}}
  for(let len=2;len<=n;len<<=1){const a=-2*Math.PI/len,wr=Math.cos(a),wi=Math.sin(a);for(let i=0;i<n;i+=len){let cr=1,ci=0;for(let j=0;j<len/2;j++){
    const p=i+j,q=p+len/2,tr=re[q]*cr-im[q]*ci,ti=re[q]*ci+im[q]*cr;re[q]=re[p]-tr;im[q]=im[p]-ti;re[p]+=tr;im[p]+=ti;const nr=cr*wr-ci*wi;ci=cr*wi+ci*wr;cr=nr}}}}
function med(a,tmp){const n=a.length;for(let i=0;i<n;i++)tmp[i]=a[i];for(let i=1;i<n;i++){const v=tmp[i];let j=i-1;while(j>=0&&tmp[j]>v){tmp[j+1]=tmp[j];j--}tmp[j+1]=v}return tmp[n>>1]}

/* L,R at sr (22050) → {vox,vfx,cns: ints 0–150, hz ≈ 43} */
function vocalEnvelope(L,R,sr){
  const N=1024,hop=512,nf=Math.max(1,Math.floor((L.length-N)/hop)+1),win=new Float32Array(N);for(let i=0;i<N;i++)win[i]=0.5-0.5*Math.cos(2*Math.PI*i/N);
  const k0=Math.round(700*N/sr),k1=Math.round(4000*N/sr),nb=k1-k0+1,c0=Math.round(2000*N/sr),c1=Math.round(6000*N/sr),nc=c1-c0+1;
  const S=new Float32Array(nf*nb),CN=new Float32Array(nf),re=new Float64Array(N),im=new Float64Array(N);
  const xc=new Float64Array(nb),pL=new Float64Array(nb),pR=new Float64Array(nb),xc2=new Float64Array(nc),pL2=new Float64Array(nc),pR2=new Float64Array(nc);
  for(let f=0;f<nf;f++){const o=f*hop;for(let i=0;i<N;i++){re[i]=(L[o+i]||0)*win[i];im[i]=(R[o+i]||0)*win[i]}fftIn(re,im);   // one FFT for both channels (L real, R imaginary)
    for(let k=k0;k<=k1;k++){const a=re[k],b=im[k],c=re[N-k],d=im[N-k],lr=(a+c)/2,li=(b-d)/2,rr=(b+d)/2,ri=(c-a)/2,q=k-k0;
      xc[q]+=0.3*((lr*rr+li*ri)-xc[q]);pL[q]+=0.3*((lr*lr+li*li)-pL[q]);pR[q]+=0.3*((rr*rr+ri*ri)-pR[q]);
      const co=Math.max(0,xc[q]/Math.sqrt(pL[q]*pR[q]+1e-18)),mr=(lr+rr)/2,mi=(li+ri)/2;S[f*nb+q]=Math.sqrt(mr*mr+mi*mi)*co*co}
    let cn=0;for(let k=c0;k<=c1;k++){const a=re[k],b=im[k],c=re[N-k],d=im[N-k],lr=(a+c)/2,li=(b-d)/2,rr=(b+d)/2,ri=(c-a)/2,q=k-c0;
      xc2[q]+=0.5*((lr*rr+li*ri)-xc2[q]);pL2[q]+=0.5*((lr*lr+li*li)-pL2[q]);pR2[q]+=0.5*((rr*rr+ri*ri)-pR2[q]);
      const co=Math.max(0,xc2[q]/Math.sqrt(pL2[q]*pR2[q]+1e-18));cn+=((lr+rr)**2+(li+ri)**2)/4*co*co}
    CN[f]=Math.pow(cn,0.3)}
  const W=8,tw=new Float32Array(2*W+1),tmp=new Float32Array(2*W+1),E=new Float32Array(nf),FX=new Float32Array(nf),prev=new Float32Array(nb);
  for(let f=0;f<nf;f++){let e=0,fx=0;
    for(let k=0;k<nb;k++){for(let j=-W;j<=W;j++){const kk=Math.min(nb-1,Math.max(0,k+j));tw[j+W]=S[f*nb+kk]}const p=med(tw,tmp);
      const hv=Math.max(0,S[f*nb+k]-2*p);e+=hv*hv;const lv=Math.log(1e-6+hv);fx+=Math.max(0,lv-prev[k]);prev[k]=lv}
    E[f]=Math.pow(e,0.3);FX[f]=fx}
  const hz=sr/hop,FW=Math.round(2.5*hz),fl=new Float32Array(nf);
  for(let f=0;f<nf;f+=8){const a=Math.max(0,f-FW),b=Math.min(nf,f+FW),arr=Array.from(E.subarray(a,b)).sort((x,y)=>x-y),q=arr[Math.floor(arr.length*0.2)]||0;for(let g=f;g<Math.min(nf,f+8);g++)fl[g]=q}
  const v=new Float32Array(nf);for(let f=0;f<nf;f++)v[f]=Math.max(0,E[f]-fl[f]);
  const pct=(a,p)=>Array.from(a).sort((x,y)=>x-y)[Math.floor(a.length*p)];
  const pv=pct(v,0.97)||1,pf=pct(FX,0.98)||1,cmed=pct(CN,0.5)||0,cpk=pct(CN,0.97)||1;
  const q=(a,f)=>Array.from(a,x=>Math.min(150,Math.max(0,Math.round(f(x)))));
  return {vox:q(v,x=>x/pv*100),vfx:q(FX,x=>x/pf*100),cns:q(CN,x=>(x-cmed)/(cpk-cmed+1e-9)*100),hz};
}

/* share of the song where the vocal envelope is near silent: vocal-led mixes ~0.45+, a centred lead playing throughout ~0.25 */
function vocalConfidence(){const v=SONG&&SONG.vox;if(!v||!v.length)return 0;return v.filter(x=>x<5).length/v.length}

const AS={skip:0.5,longW:1,secW:0.04,shortW:1.5,weakW:0.4,dipR:0.55,reW:0.5,endSkip:0.2,gapW:1,gapFull:0.6,gapPh:0.18};   // tuned in-app on synthetic TTS mixes
function vocalOnsets(env){
  if(env._vc)return env._vc;
  const {vox,vfx}=env,hz=env.voxHz,cn=env.cns?env.cns.map(x=>x/100):null,n=vox.length,v=new Float32Array(n),fx=new Float32Array(n);
  for(let i=0;i<n;i++){let q=0,c=0;for(let j=Math.max(0,i-1);j<=Math.min(n-1,i+1);j++){q+=vox[j];c++}v[i]=q/c/100;fx[i]=(vfx?vfx[i]:0)/100}
  const ON=0.22,OFF=0.1,minOn=Math.round(0.35*hz),minGap=Math.max(2,Math.round(0.1*hz)),C=[],segs=[];let st=-1,low=0;
  for(let i=0;i<n;i++){if(st<0){if(v[i]>ON){st=i;low=0}}else if(v[i]<OFF){if(++low>=minGap){const e=i-low+1;if(e-st>=minOn)segs.push([st,e]);st=-1}}else low=0}
  if(st>=0&&n-st>=minOn)segs.push([st,n]);
  const peakNear=(c,a,b)=>{let bi=c,bv=-1;for(let i=Math.max(0,a);i<=Math.min(n-1,b);i++)if(fx[i]>bv){bv=fx[i];bi=i}return bi};
  const W=Math.round(0.12*hz);
  /* line starts follow pauses: weight each phrase start by the silence before it, and only a real pause (≥ AS.gapPh)
     makes it a phrase start — short gaps between words inside a line don't */
  segs.forEach(([a,b],si)=>{let pk=0;for(let i=a;i<b;i++)pk=Math.max(pk,v[i]);const gap=si?(a-segs[si-1][1])/hz:9,gw=AS.gapW?0.4+0.6*clamp(gap/AS.gapFull):1;
    let s=a;for(let k=0;k<W&&s>0&&v[s-1]<v[s]&&v[s-1]>0.03;k++)s--;                                     // back down the rising edge
    s=peakNear(s,s-2,s+W);                                                                                // sharpen to the strongest spectral change
    if(cn){let g=s;const lim=Math.max(0,s-Math.round(0.3*hz));while(g>lim&&cn[g-1]>0.25&&v[g-1]<0.6*pk)g--;if(s-g>=2)s=g}   // unvoiced consonant first (ㅈ ㅊ ㅅ ㄲ…)
    C.push({t:s/hz,w:Math.min(1,0.45+0.55*pk)*gw,ph:gap>=AS.gapPh});
    for(let i=s+Math.round(0.5*hz);i<b-Math.round(0.25*hz);i++){                                        // breaths filled by reverb: a dip, then a strong change
      const top=Math.max(v[i],v[i+1],v[i+2]);let d=0;while(i-d-1>s&&v[i-d-1]<AS.dipR*top)d++;
      if(d>=Math.round(0.08*hz)&&top>0.25){const long=d>=Math.round(0.16*hz);C.push({t:peakNear(i,i-2,i+3)/hz,w:long?AS.reW:AS.reW/2,ph:long});i+=Math.round(0.35*hz)}}});
  for(let i=2;i<n-2;i++)if(fx[i]>0.5&&fx[i]>=fx[i-1]&&fx[i]>=fx[i+1]&&v[i+2]>0.2&&!C.some(c=>Math.abs(c.t-i/hz)<0.2))C.push({t:i/hz,w:AS.weakW,ph:false});   // continuous rap
  let voiced=0;segs.forEach(([a,b])=>voiced+=(b-a)/hz);
  return env._vc={C:C.sort((x,y)=>x.t-y.t),voiced};
}
function alignOnce(C0,S,sec,defs,anchors,rate){
  const C=C0.slice(),N=S.length;Object.entries(anchors).forEach(([i,t])=>C.push({t,w:1,ph:false,anchor:+i}));C.sort((x,y)=>x.t-y.t);
  const M=C.length;if(M<N)return null;
  const ex=S.map(s=>s/rate+0.25),ph=[0];C.forEach((c,j)=>ph.push(ph[j]+(c.ph?c.w:0)));
  const newSec=i=>i>0&&sec[i]!==sec[i-1],allow=(i,j)=>C[j].anchor===undefined?!(i in anchors):C[j].anchor===i;
  const prior=(i,j)=>{const d=(C[j].t-defs[i])/20;return 0.08*d*d};
  const dur=(i,g)=>{if(g<0.2)return 1e9;const r=Math.log(g/ex[i]);return r>0?(newSec(i+1)?AS.secW:AS.longW)*r*r:AS.shortW*r*r};
  const K=40,INF=1e18,dp=[],bk=[];
  dp[0]=C.map((c,j)=>allow(0,j)?-c.w+prior(0,j)+AS.skip*ph[j]:INF);bk[0]=C.map(()=>-1);
  for(let i=1;i<N;i++){dp[i]=new Array(M).fill(INF);bk[i]=new Array(M).fill(-1);
    for(let k=i;k<M;k++){if(!allow(i,k))continue;let best=INF,bj=-1;
      for(let j=Math.max(i-1,k-K);j<k;j++){const p=dp[i-1][j];if(p>=INF)continue;const q=p+dur(i-1,C[k].t-C[j].t)+AS.skip*(ph[k]-ph[j+1]);if(q<best){best=q;bj=j}}
      if(bj>=0){dp[i][k]=best-C[k].w+prior(i,k);bk[i][k]=bj}}}
  let end=-1,eb=INF;for(let j=0;j<M;j++){const q=dp[N-1][j]+AS.endSkip*(ph[M]-ph[j+1]);if(q<eb){eb=q;end=j}}
  if(end<0||eb>=INF)return null;const idx=[];for(let i=N-1,j=end;i>=0;i--){idx.unshift(j);j=bk[i][j]}
  return idx.map(j=>C[j].anchor!==undefined?C[j].t:Math.max(0,C[j].t-0.02));
}
/* anchors: {lineIndex: audioTime} kept exactly. Returns {times (audio s), anchored, confidence} or null. */
function autoSync(anchors={}){
  if(!SONG||!SONG.vox||!LINES.length)return null;
  const {C,voiced}=vocalOnsets(SONG);if(voiced<2)return null;
  const S=LINES.map(L=>Math.max(1,syl(L.text))),sec=LINES.map(L=>L.sec.idx),defs=LINES.map(L=>L.def+OFF);
  let rate=clamp(S.reduce((a,b)=>a+b,0)/voiced,1.5,9),out=null;
  for(let pass=0;pass<2;pass++){const r=alignOnce(C,S,sec,defs,anchors,rate);if(!r)break;out=r;   // pass 2: singing rate from pass 1's line gaps
    const rs=[];for(let i=0;i+1<S.length;i++)if(sec[i]===sec[i+1]){const g=r[i+1]-r[i];if(g>0.3)rs.push(S[i]/Math.max(0.3,g-0.25))}
    if(rs.length<3)break;rs.sort((x,y)=>x-y);rate=clamp(rs[rs.length>>1],1.5,9)}
  return out&&{times:out,anchored:Object.keys(anchors).length,confidence:vocalConfidence()};
}
/* tap correction: move a tap (audio s) to the nearest vocal onset in [-0.2, +0.12] s, if any */
function snapToVocal(t){if(!SONG||!SONG.vox)return t;const {C}=vocalOnsets(SONG);let best=null,bs=1e9;
  for(const c of C){if(c.t<t-0.2)continue;if(c.t>t+0.12)break;const s=Math.abs(c.t-t)-c.w*0.1;if(s<bs){bs=s;best=c}}
  return best?Math.max(0,best.t-0.02):t}

/* ---------- word starts inside lines (beta) ----------
   For each line: the sung span runs from the line start to the last voiced frame before the next line. Syllable-level
   onsets are spectral-flux peaks while voiced (pulled back over an unvoiced consonant when the centred noise track rises
   just before). Each word after the first picks one onset — or keeps its syllable-proportional expected position — by a
   small DP that prefers strong onsets near the expected position and keeps words in order ≥60 ms apart.
   only(i) filters lines; results go to wover (offsets from the line start) and wauto. Returns the number of lines set. */
const AW={vOn:30,rise:30,gapSig:0.6,skip:0,virt:0.3,minGap:0.06,dipW:0.3,cnBack:0.15};   // tuned in-app on per-word TTS mixes
function autoWords(only){
  if(!SONG||!SONG.vox)return 0;const hz=SONG.voxHz,v=SONG.vox,cn=SONG.cns,n=v.length;let done=0;
  LINES.forEach((L,i)=>{const W=L.words.length;if(W<2||(only&&!only(i)))return;
    const s=L.start+OFF,a=Math.max(0,Math.round(s*hz)),b=Math.min(n-6,Math.round((L.end+OFF)*hz));if(b-a<6)return;
    let ve=a;for(let f=a;f<=b;f++)if(v[f]>AW.vOn)ve=f;                                            // end of singing (reverb tails stay under vOn)
    const S=L.words.map(w=>Math.max(1,Math.round(syl(w.text)))),tot=S.reduce((x,y)=>x+y,0),D=Math.max(0.3,(ve-a)/hz),avg=D/tot;
    /* syllable onsets: the voice dips and rises again at each syllable (deeper dips = gaps between words); pulled back
       over an unvoiced consonant (ㅅ ㅈ ㅊ ㅎ…) when the centred noise track is already up just before */
    const C=[];for(let f=a+3;f<ve;f++){if(!(v[f]<=v[f-1]&&v[f]<=v[f+1]))continue;
      let up=0,pre=0;for(let q=1;q<=4;q++){up=Math.max(up,v[f+q]);pre=Math.max(pre,v[f-q])}
      if(up-v[f]<AW.rise)continue;let g=f;
      if(cn){const lim=f-Math.round(AW.cnBack*hz);while(g>lim&&g>a+1&&cn[g-1]>15&&cn[g-1]<=cn[g]+8&&v[g-1]<=v[f]+6)g--}
      C.push({t:g/hz,w:Math.min(1,(up-v[f])/100+AW.dipW*Math.max(0,pre-v[f])/100+(v[f]<6?0.3:0))});f+=2}
    /* DP: syllable j (1..tot-1) takes an onset in order, or a virtual onset at its proportional position; gaps should be
       near the line's average syllable length, strong onsets are preferred, skipped strong onsets cost a little */
    const M=C.length,INF=1e9,ph=[0];C.forEach((c,q)=>ph.push(ph[q]+c.w));
    let prev=[{t:s,cost:0,ci:-1,bk:null}];
    for(let j=1;j<tot;j++){const ex=s+avg*j,cur=[];
      const cands=C.map((c,q)=>({t:c.t,w:c.w,ci:q})).filter(c=>Math.abs(c.t-ex)<Math.max(0.5,2.5*avg)).concat([{t:ex,w:-AW.virt,ci:null}]);
      for(const c of cands){let best=null;
        for(const p of prev){if(c.t<p.t+AW.minGap)continue;if(c.ci!=null&&p.ci!=null&&c.ci<=p.ci)continue;
          const g=c.t-p.t,sk=c.ci!=null?AW.skip*(ph[c.ci]-ph[(p.ci==null?-1:p.ci)+1]):0,val=p.cost+0.5*((g-avg)/(AW.gapSig*avg))**2-c.w+Math.max(0,sk);
          if(!best||val<best.cost)best={t:c.t,cost:val,ci:c.ci!=null?c.ci:p.ci,bk:p}}
        if(best)cur.push(best)}
      if(!cur.length)return;cur.sort((x,y)=>x.cost-y.cost);prev=cur.slice(0,60)}
    let node=prev.reduce((x,y)=>y.cost<x.cost?y:x);const on=new Array(tot);for(let j=tot-1;j>=0;j--){on[j]=node.t;node=node.bk}
    let k0=0;wover[i]=S.map(x=>{const t=on[k0];k0+=x;return +(t-s).toFixed(3)});wover[i][0]=0;wauto.add(i);done++});
  return done;
}
