/* ============================================================
   10 · SONG — model, presets, in-browser audio analysis + mood features
   ============================================================ */
/* hand-checked timelines for specific tracks, auto-applied when audio with the same duration+bpm loads:
   {dur,bpm,t0,startBar,endBar,slots,direction,title,artist,feat,kicks,snares}. Empty: no third-party song data ships in the app. */
const PRESETS=[];

let SONG=null,BEAT=0.5,BAR=2,T0=0,SONG_END=120,NB=60,KICKS=[],SNARES=[],NOV=[],PRESET=null;
function setSong(o){SONG=o;BEAT=60/o.bpm;BAR=BEAT*4;T0=o.t0;SONG_END=o.dur-0.05;NB=Math.max(1,Math.floor((SONG_END-T0)/BAR+0.02));
  KICKS=o.kicks||[];SNARES=o.snares||[];NOV=o.nov||[];PRESET=o.preset||null;const sk=$('seek');if(sk)sk.max=SONG_END}
function demoSong(){const bpm=140,t0=0.2,dur=120,b=60/bpm,k=[],sn=[];for(let t=t0+b*16;t<dur;t+=b*2){k.push(+t.toFixed(3));sn.push(+(t+b).toFixed(3))}
  return {bpm,t0,dur,kicks:k,snares:sn,startBar:4,endBar:Math.floor((dur-t0)/(b*4)),nov:[],demo:true,feats:null}}
/* no audio file: a plain beat grid of the length the user typed (silent export, music added later in the Reels/TikTok editor) */
function manualSong(dur,bpm){const b=60/bpm,k=[],sn=[];for(let t=b*4;t<dur;t+=b*2){k.push(+t.toFixed(3));sn.push(+(t+b).toFixed(3))}
  return {bpm,t0:0,dur,kicks:k,snares:sn,startBar:Math.max(1,Math.round(8/(b*4))),endBar:Math.floor(dur/(b*4)),nov:[],manual:true,feats:null}}
const barT=k=>T0+k*BAR;

async function analyzeFile(file){
  const ab=await file.arrayBuffer();
  const AC=window.AudioContext||window.webkitAudioContext;const ac=new AC();
  const buf=await new Promise((res,rej)=>{const p=ac.decodeAudioData(ab,res,rej);if(p&&p.then)p.then(res,rej)});
  try{ac.close()}catch(e){}
  const SR=22050,len=Math.ceil(buf.duration*SR);
  const OAC=window.OfflineAudioContext||window.webkitOfflineAudioContext;const oc=new OAC(5,len,SR);
  const src=oc.createBufferSource();src.buffer=buf;const stereo=buf.numberOfChannels>1;
  const mono=oc.createGain();mono.channelCount=1;mono.channelCountMode='explicit';mono.channelInterpretation='speakers';
  const mg=oc.createChannelMerger(5);
  const lp=oc.createBiquadFilter();lp.type='lowpass';lp.frequency.value=110;
  const hp=oc.createBiquadFilter();hp.type='highpass';hp.frequency.value=1800;
  const hl=oc.createBiquadFilter();hl.type='lowpass';hl.frequency.value=7000;
  src.connect(mono);mono.connect(lp);lp.connect(mg,0,0);mono.connect(hp);hp.connect(hl);hl.connect(mg,0,1);mono.connect(mg,0,2);
  if(stereo){const sp=oc.createChannelSplitter(2);src.connect(sp);
    const mk2=(gl,gr)=>{const sum=oc.createGain(),a=oc.createGain(),b=oc.createGain();a.gain.value=gl;b.gain.value=gr;sp.connect(a,0);sp.connect(b,1);a.connect(sum);b.connect(sum);
      const f1=oc.createBiquadFilter();f1.type='highpass';f1.frequency.value=300;const f2=oc.createBiquadFilter();f2.type='lowpass';f2.frequency.value=3400;sum.connect(f1);f1.connect(f2);return f2};
    mk2(0.5,0.5).connect(mg,0,3);mk2(0.5,-0.5).connect(mg,0,4)}
  mg.connect(oc.destination);src.start(0);
  const out=await new Promise((res,rej)=>{oc.oncomplete=e=>res(e.renderedBuffer);const p=oc.startRendering();if(p&&p.then)p.then(res,rej)});
  await new Promise(r=>setTimeout(r,0));
  return analyzeBands(out.getChannelData(0),out.getChannelData(1),out.getChannelData(2),SR,buf.duration,stereo?out.getChannelData(3):null,stereo?out.getChannelData(4):null);
}
function analyzeBands(lo,hi,full,SR,dur,mid,side){
  const hop=256,fr=SR/hop,n=Math.floor(full.length/hop);
  function band(x){const e=new Float32Array(n),r=new Float32Array(n);
    for(let i=0;i<n;i++){let q=0;const o=i*hop;for(let j=0;j<hop;j++){const v=x[o+j]||0;q+=v*v}r[i]=Math.sqrt(q/hop);e[i]=Math.log1p(q/hop*3e4)}
    const d=new Float32Array(n);for(let i=1;i<n;i++)d[i]=Math.max(0,e[i]-e[i-1]);
    const w=Math.round(0.4*fr),ps=new Float64Array(n+1);for(let i=0;i<n;i++)ps[i+1]=ps[i]+d[i];
    const o2=new Float32Array(n);for(let i=0;i<n;i++){const a=Math.max(0,i-w),b=Math.min(n,i+w+1);o2[i]=Math.max(0,d[i]-(ps[b]-ps[a])/(b-a))}
    const srt=Array.from(o2).sort((a,b)=>a-b);const pk=srt[Math.floor(n*0.995)]||1;for(let i=0;i<n;i++)o2[i]/=pk;return {d:o2,r}}
  const Lb=band(lo),Hb=band(hi),Fb=band(full),Mb=mid?band(mid):null,Sb=side?band(side):null;
  const O=new Float32Array(n);for(let i=0;i<n;i++)O[i]=Fb.d[i]+0.7*Lb.d[i]+0.5*Hb.d[i];
  const at=(arr,t)=>{const x=t*fr,i=Math.floor(x),f=x-i;return i>=0&&i+1<n?arr[i]*(1-f)+arr[i+1]*f:0};
  /* tempo: autocorrelation, then fine grid search */
  const maxLag=Math.ceil(fr*60/70*4)+2,ac=new Float64Array(maxLag+2);
  for(let l=1;l<=maxLag;l++){let q=0;for(let i=l;i<n;i++)q+=O[i]*O[i-l];ac[l]=q}
  const acAt=x=>{const i=Math.floor(x),f=x-i;return i+1<=maxLag?ac[i]*(1-f)+ac[i+1]*f:0};
  let best=-1,bb=120;for(let bpm=70;bpm<=180;bpm+=0.1){const L0=fr*60/bpm,q=acAt(L0)+acAt(2*L0)+0.5*acAt(4*L0);if(q>best){best=q;bb=bpm}}
  if(bb<85)bb*=2;else if(bb>175)bb/=2;
  const gridScore=(bpm,p)=>{const sp=60/bpm/2;let q=0;for(let t=p;t<dur;t+=sp)q+=at(O,t);return q};
  let gb=-1,bpm=bb,ph=0;
  for(let b2=bb-1.5;b2<=bb+1.5;b2+=0.02){const sp=60/b2/2;for(let p=0;p<sp;p+=0.006){const q=gridScore(b2,p);if(q>gb){gb=q;bpm=b2;ph=p}}}
  if(Math.abs(bpm-Math.round(bpm))<0.1){bpm=Math.round(bpm);gb=-1;const sp=60/bpm/2;for(let p=0;p<sp;p+=0.002){const q=gridScore(bpm,p);if(q>gb){gb=q;ph=p}}}
  const beat=60/bpm,barLen=beat*4;
  let bk=-1,bar0=ph;for(let q=0;q<8;q++){const t0=ph+q*beat/2;let v=0;for(let t=t0;t<dur;t+=barLen)v+=at(Lb.d,t);if(v>bk){bk=v;bar0=t0}}
  while(bar0-barLen>-0.01)bar0-=barLen;
  bar0-=0.02;if(bar0<-0.01)bar0+=barLen;           // biquad group-delay compensation
  const g16=beat/4,snap=a=>[...new Set(a.map(t=>+(bar0+Math.round((t-bar0)/g16)*g16).toFixed(3)))].filter(t=>t>=0).sort((a,b)=>a-b);
  const peaks=(x,th,md)=>{const out=[];const m=Math.round(md*fr);for(let i=1;i<n-1;i++){if(x[i]>=th&&x[i]>=x[i-1]&&x[i]>x[i+1]){if(!out.length||i-out[out.length-1]>=m)out.push(i);else if(x[i]>x[out[out.length-1]])out[out.length-1]=i}}return out.map(i=>i/fr)};
  const kicks=snap(peaks(Lb.d,0.35,0.18).map(t=>t-0.02)),snares=snap(peaks(Hb.d,0.45,0.3).map(t=>t-0.02));
  /* per-bar features → novelty, vocal start/end */
  const nb=Math.max(1,Math.floor((dur-bar0)/barLen+0.02)),feat=[],rms=[],lowB=[],hiB=[];
  const NF=Mb?4:3,FW=[1,1,1,2.2];
  for(let k=0;k<nb;k++){const a=Math.max(0,Math.floor((bar0+k*barLen)*fr)),b=Math.min(n,Math.floor((bar0+(k+1)*barLen)*fr));let fl=0,fh=0,ff=0,fv=0,c=Math.max(1,b-a);
    for(let i=a;i<b;i++){fl+=Lb.r[i];fh+=Hb.r[i];ff+=Fb.r[i];if(Mb)fv+=Math.max(0,Mb.r[i]-1.15*Sb.r[i])}
    rms.push(ff/c);lowB.push(fl/c);hiB.push(fh/c);
    const row=[Math.log(1e-4+fl/c),Math.log(1e-4+fh/c),Math.log(1e-4+ff/c)];if(Mb)row.push(Math.log(1e-4+fv/c));feat.push(row)}
  const J=[...Array(NF).keys()],mu=J.map(j=>feat.reduce((a,f)=>a+f[j],0)/nb),sd=J.map(j=>Math.sqrt(feat.reduce((a,f)=>a+(f[j]-mu[j])**2,0)/nb)||1);
  const fn=feat.map(f=>f.map((v,j)=>(v-mu[j])/sd[j]));
  const nov=fn.map((_,k)=>{if(k<2||k>nb-2)return 0;let q=0;for(const j of J){let A=0,B=0,na=0,nb2=0;for(let i=Math.max(0,k-4);i<k;i++){A+=fn[i][j];na++}for(let i=k;i<Math.min(nb,k+4);i++){B+=fn[i][j];nb2++}q+=FW[j]*Math.abs(A/na-B/nb2)}return +q.toFixed(3)});
  const med=[...rms].sort((a,b)=>a-b)[Math.floor(nb/2)]||1e-6;
  let startBar=0;for(let k=0;k<Math.floor(nb*0.3);k++){if(rms[k]>=0.6*med){startBar=k;break}}
  let endBar=nb;for(let k=nb-1;k>startBar;k--){if(rms[k]>=0.25*med){endBar=k+1;break}}
  /* mood features over the vocal region */
  const reg=rms.slice(startBar,endBar),srt=[...reg].sort((a,b)=>a-b),db=x=>20*Math.log10(Math.max(1e-5,x));
  const sum=a=>a.reduce((p,q)=>p+q,0);
  const onsets=peaks(O,0.3,0.08).filter(t=>t>=bar0+startBar*barLen&&t<=bar0+endBar*barLen).length;
  const regDur=Math.max(1,(endBar-startBar)*barLen);
  const feats={
    loud:+db(srt[Math.floor(srt.length/2)]||1e-5).toFixed(1),
    dyn:+(db(srt[Math.floor(srt.length*0.9)]||1e-5)-db(srt[Math.floor(srt.length*0.2)]||1e-5)).toFixed(1),
    bright:+(sum(hiB.slice(startBar,endBar))/Math.max(1e-6,sum(reg))).toFixed(3),
    lowW:+(sum(lowB.slice(startBar,endBar))/Math.max(1e-6,sum(reg))).toFixed(3),
    density:+(onsets/regDur).toFixed(2),
    kickRate:+(kicks.length/dur).toFixed(2),
    bpm:+bpm.toFixed(1)
  };
  /* vocal-activity envelope for auto-sync: centre-panned 300–3400 Hz minus the side channel (mono files: full minus low band,
     much less reliable), ~21 Hz, stored as ints 0–150 relative to the 97th percentile */
  const vf=Math.max(1,Math.round(fr/20)),nvx=Math.floor(n/vf),vr=new Float32Array(nvx);
  for(let k=0;k<nvx;k++){let q=0;for(let i=k*vf;i<(k+1)*vf;i++)q+=Mb?Math.max(0,Mb.r[i]-1.15*Sb.r[i]):Math.max(0,Fb.r[i]-1.5*Lb.r[i]);vr[k]=q/vf}
  const vpk=Array.from(vr).sort((a,b)=>a-b)[Math.floor(nvx*0.97)]||1e-6,vox=Array.from(vr,x=>Math.min(150,Math.round(x/vpk*100)));
  return {bpm:+bpm.toFixed(2),t0:+bar0.toFixed(4),dur:+dur.toFixed(3),kicks,snares,startBar,endBar,nov,feats,vox,voxHz:+(fr/vf).toFixed(4),voxSt:!!Mb,v:5};
}
