/* ============================================================
   25 · AUTO-SYNC — line starts from the vocal-activity envelope
        (SONG.vox, see 10_song). 1) segment the envelope into sung
        phrases + strong re-attacks inside long phrases, 2) a monotonic
        DP matches lines to those onsets, using syllable counts for
        expected line lengths and the slot-based default times as a
        weak prior. Heuristic: results are a starting point to refine.
   ============================================================ */
function vocalOnsets(vox,hz,snares=[]){
  const n=vox.length,v=new Float32Array(n);
  for(let i=0;i<n;i++){let q=0,c=0;for(let j=Math.max(0,i-1);j<=Math.min(n-1,i+1);j++){q+=vox[j];c++}v[i]=q/c/100}
  const ON=0.28,OFF=0.14,minOn=Math.round(0.18*hz),minGap=Math.max(2,Math.round(0.16*hz));
  const segs=[];let st=-1,low=0;
  for(let i=0;i<n;i++){
    if(st<0){if(v[i]>ON){st=i;low=0}}
    else if(v[i]<OFF){if(++low>=minGap){const e=i-low+1;if(e-st>=minOn)segs.push([st,e]);st=-1}}else low=0}
  if(st>=0&&n-st>=minOn)segs.push([st,n]);
  const C=[],R=Math.round(0.4*hz),SH=0.35*hz;
  segs.forEach(([a,b])=>{let pk=0;for(let i=a;i<b;i++)pk=Math.max(pk,v[i]);
    /* a centred snare/clap right before the voice merges into the phrase: if the first ≤0.3 s is a short burst followed by a
       dip, start after the dip instead */
    let s=a;const hit=snares.some(x=>Math.abs(x-a/hz)<0.08);   // only when a detected snare/clap sits at the segment start
    if(hit)for(let i=a+2;i<Math.min(b-SH,a+Math.round(0.3*hz));i++){let m0=0;for(let j=a;j<i;j++)m0=Math.max(m0,v[j]);
      if(v[i]<0.45*m0&&v[i]<v[i+1]){s=i;break}}
    for(let k=0;k<Math.round(0.15*hz)&&s>0&&v[s-1]<v[s]&&v[s-1]>0.04;k++)s--;   // back down the rising edge (stops at a trough)
    const len=b-s;
    if(len<SH){C.push({t:s/hz,w:0.04,ph:false});return}                     // short bursts: percussion or ad-libs — barely preferred
    C.push({t:s/hz,w:Math.min(1,0.45+0.55*pk),ph:true,end:b/hz});
    /* re-attacks inside one segment (breaths filled by drums or reverb): the longer and deeper the dip, the more it looks
       like a line break. A ≥0.2 s dip counts as a phrase start. */
    for(let i=s+Math.round(0.6*hz);i<b-Math.round(0.3*hz);i++){
      const top=Math.max(v[i],v[i+1],v[i+2]);if(top<0.3)continue;let d=0;while(i-d-1>s&&v[i-d-1]<0.35*top)d++;
      if(d>=Math.round(0.12*hz)){const long=d>=Math.round(0.2*hz);C.push({t:i/hz,w:long?Math.min(1,0.4+0.5*top):0.3,ph:long,end:b/hz});i+=R}}});
  return {C:C.sort((x,y)=>x.t-y.t),voiced:C.reduce((a,c)=>a+(c.ph?c.end-c.t:0),0)};
}
/* returns {times:[audio seconds per line], onsets, rate} or null when there isn't enough vocal signal */
function autoSync(){
  if(!SONG||!SONG.vox||!LINES.length)return null;
  const {C,voiced}=vocalOnsets(SONG.vox,SONG.voxHz,SNARES),N=LINES.length,M=C.length;
  if(M<N||voiced<2)return null;
  const S=LINES.map(L=>Math.max(1,syl(L.text))),rate=clamp(S.reduce((a,b)=>a+b,0)/voiced,1.5,9),ex=S.map(s=>s/rate+0.3);
  const ph=[0];C.forEach((c,j)=>ph.push(ph[j]+(c.ph?c.w:0)));                // prefix sums of phrase-start strength
  const newSec=i=>i>0&&LINES[i].sec!==LINES[i-1].sec;
  const prior=(i,j)=>{const d=(C[j].t-LINES[i].def-OFF)/15;return 0.12*d*d};
  const dur=(i,g)=>{if(g<0.25)return 1e9;const r=Math.log(g/ex[i]);return r>0?(newSec(i+1)?0.12:0.7)*r*r:1.5*r*r};
  const K=28,INF=1e18,dp=[],bk=[];
  dp[0]=C.map((c,j)=>-c.w+prior(0,j)+0.6*ph[j]);bk[0]=C.map(()=>-1);
  for(let i=1;i<N;i++){dp[i]=new Array(M).fill(INF);bk[i]=new Array(M).fill(-1);
    for(let k=i;k<M;k++){let best=INF,bj=-1;
      for(let j=Math.max(i-1,k-K);j<k;j++){const p=dp[i-1][j];if(p>=INF)continue;
        const q=p+dur(i-1,C[k].t-C[j].t)+0.6*(ph[k]-ph[j+1]);if(q<best){best=q;bj=j}}
      if(bj>=0){dp[i][k]=best-C[k].w+prior(i,k);bk[i][k]=bj}}}
  let end=-1,eb=INF;for(let j=0;j<M;j++){const q=dp[N-1][j]+0.25*(ph[M]-ph[j+1]);if(q<eb){eb=q;end=j}}
  if(end<0||eb>=INF)return null;
  const idx=[];for(let i=N-1,j=end;i>=0;i--){idx.unshift(j);j=bk[i][j]}
  return {times:idx.map(j=>Math.max(0,C[j].t-0.03)),onsets:M,rate};
}
