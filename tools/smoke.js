// Smoke test: loads index.html headless, renders frames for every direction (demo lyrics, no audio), reports JS errors.
// Then checks the per-line timing editor, and — when the browser has WebCodecs — runs a real offline MP4 export on a
// generated click track. If ffmpeg/ffprobe are installed, the exported MP4 and an AAC-only mux are decoded to verify them.
// usage: node tools/smoke.js [outdir]   (needs playwright)
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),{spawnSync}=require('child_process');
const has=bin=>{const r=spawnSync(bin,['-version']);return !r.error};
const ffcheck=f=>{const r=spawnSync('ffmpeg',['-v','error','-i',f,'-f','null','-']);return (r.stderr||'').toString().trim()};
const probe=f=>JSON.parse(spawnSync('ffprobe',['-v','error','-show_entries','stream=codec_type,codec_name,width,height,duration,nb_frames,sample_rate','-of','json',f]).stdout.toString()).streams;
function wav(sec,sr=44100){const n=sec*sr,b=Buffer.alloc(44+n*4);b.write('RIFF',0);b.writeUInt32LE(36+n*4,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(2,22);
  b.writeUInt32LE(sr,24);b.writeUInt32LE(sr*4,28);b.writeUInt16LE(4,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*4,40);
  for(let i=0;i<n;i++){const t=i/sr,bt=t%0.5,v=Math.exp(-bt*30)*Math.sin(2*Math.PI*60*bt)*0.8+0.1*Math.sin(2*Math.PI*440*t),s=Math.max(-1,Math.min(1,v))*32767|0;b.writeInt16LE(s,44+i*4);b.writeInt16LE(s,46+i*4)}
  return b}
(async()=>{const out=process.argv[2]||path.join(__dirname,'../.shots');fs.mkdirSync(out,{recursive:true});
const b=await chromium.launch({args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});const p=await b.newPage({viewport:{width:1280,height:800},acceptDownloads:true,locale:'ko-KR'});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.resolve(__dirname,'../index.html'));await p.waitForTimeout(800);await p.click('#bDemo');
console.log('post fx',JSON.stringify(await p.evaluate(()=>__post())));
await p.evaluate(()=>document.getElementById('setup').classList.add('hidden'));
for(const d of ['brutal','neon','editorial','pop','lofi','cinematic']){await p.evaluate(k=>__dir(k),d);
  for(const t of [5,20,45,70,100]){const u=await p.evaluate(t=>{__frame(t);return document.getElementById('cv').toDataURL('image/jpeg',0.6)},t);fs.writeFileSync(path.join(out,`${d}_${t}.jpg`),Buffer.from(u.split(',')[1],'base64'))}}

/* per-line timing editor: nudge pins a line by +0.05s, "자동으로" unpins it */
await p.evaluate(()=>{document.getElementById('setup').classList.remove('hidden');__dir('brutal')});
await p.click('#lineEd summary');await p.click('#lineList .lt[data-i="2"]');
const t0=await p.evaluate(()=>__lines()[2].start);await p.click('#lineList [data-a="+"]');const t1=await p.evaluate(()=>__lines()[2].start);
await p.click('#lineList [data-a="auto"]');const t2=await p.evaluate(()=>__lines()[2].start);
if(Math.abs(t1-t0-0.05)>1e-3||Math.abs(t2-t0)>1e-3)errs.push(`line editor: start ${t0} → +0.05 gave ${t1}, auto gave ${t2}`);else console.log('line editor ok');

/* AAC esds path: mux ffmpeg-made AAC frames with the page's own muxer, then decode the result */
if(has('ffmpeg')&&has('ffprobe')){
  const wp=path.join(out,'test.wav'),ap=path.join(out,'test.aac'),mp=path.join(out,'aac_only.mp4');fs.writeFileSync(wp,wav(4));
  spawnSync('ffmpeg',['-v','error','-y','-i',wp,'-c:a','aac','-b:a','128k','-ar','48000','-ac','2','-f','adts',ap]);
  const a=fs.readFileSync(ap),fr=[];for(let o=0;o+7<=a.length;){const len=((a[o+3]&3)<<11)|(a[o+4]<<3)|(a[o+5]>>5),hl=a[o+1]&1?7:9;fr.push(a.subarray(o+hl,o+len).toString('base64'));o+=len}
  const b64=await p.evaluate(async fr=>{const s=fr.map(f=>({data:Uint8Array.from(atob(f),c=>c.charCodeAt(0)),dur:1024,cts:0,key:true}));
    const u=new Uint8Array(await new Blob(mp4Mux([{kind:'audio',codec:'aac',timescale:48000,sampleRate:48000,channels:2,bitrate:128000,asc:makeASC(48000,2),samples:s}])).arrayBuffer());
    let bin='';for(let i=0;i<u.length;i+=0x8000)bin+=String.fromCharCode(...u.subarray(i,i+0x8000));return btoa(bin)},fr);
  fs.writeFileSync(mp,Buffer.from(b64,'base64'));const e=ffcheck(mp),st=probe(mp);
  if(e||!st.length||st[0].codec_name!=='aac'||Math.abs(+st[0].duration-4)>0.1)errs.push('aac mux: '+(e||JSON.stringify(st)));else console.log('aac mux ok',JSON.stringify(st[0]));
}else console.log('ffmpeg/ffprobe not found — skipped AAC mux check');

/* auto-sync: a stereo synthetic song (wide hats/pad, centred kick/snare, centred voice-like phrases at known times, one
   3.5 s instrumental gap); at least 8 of 10 line starts must land within 0.15 s */
{const sr=44100,dur=40,n=sr*dur,b=Buffer.alloc(44+n*4),syls=[8,6,9,7,8,10,6,7,9,8],gaps=[0.5,0.35,0.7,3.5,0.4,0.25,0.6,0.5,0.3,0.5],truth=[];
  b.write('RIFF',0);b.writeUInt32LE(36+n*4,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(2,22);b.writeUInt32LE(sr,24);b.writeUInt32LE(sr*4,28);b.writeUInt16LE(4,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*4,40);
  const L=new Float32Array(n),R=new Float32Array(n);let rs=1;const rn=()=>{rs^=rs<<13;rs^=rs>>>17;rs^=rs<<5;return ((rs>>>0)%10000)/10000-0.5};
  for(let i=0;i<n;i++){const t=i/sr,bt=t%0.5,bt2=(t+0.5)%1,k=Math.exp(-bt*25)*Math.sin(2*Math.PI*55*bt)*0.7,sn=(bt2<0.12&&Math.floor(t/0.5)%2===1)?rn()*Math.exp(-bt2*30)*0.5:0,
    h=(t%0.25)<0.03?rn()*0.25:0,side=Math.floor(t/0.25)%2;L[i]=k+sn+h*(side?1:0.1)+0.08*Math.sin(2*Math.PI*330*t);R[i]=k+sn+h*(side?0.1:1)+0.08*Math.sin(2*Math.PI*415*t+1)}
  let t0=4;syls.forEach((s,k)=>{const d=s/4.5;truth.push(t0);const f0=200+40*(k%3);for(let i=Math.floor(t0*sr);i<Math.floor((t0+d)*sr);i++){const t=i/sr-t0,am=0.85+0.15*Math.sin(2*Math.PI*4.5*t-Math.PI/2),env=Math.min(1,t/0.03,(d-t)/0.05);
    let v=0;for(let hh=1;hh<=10;hh++)v+=Math.sin(2*Math.PI*f0*hh*(i/sr)+hh)/hh;v*=0.18*am*env;L[i]+=v;R[i]+=v}t0+=d+gaps[k]});
  for(let i=0;i<n;i++){b.writeInt16LE(Math.max(-32767,Math.min(32767,L[i]*20000|0)),44+i*4);b.writeInt16LE(Math.max(-32767,Math.min(32767,R[i]*20000|0)),46+i*4)}
  const wp=path.join(out,'vocal_test.wav');fs.writeFileSync(wp,b);
  await p.evaluate(()=>document.getElementById('setup').classList.remove('hidden'));
  await p.fill('#lyrics','Verse 1\n'+syls.slice(0,4).map(s=>'a'.repeat(s)).join('\n')+'\n\nChorus\n'+syls.slice(4).map(s=>'b'.repeat(s)).join('\n'));await p.waitForTimeout(400);
  await p.setInputFiles('#fAudio',wp);await p.waitForFunction(()=>/분석 완료|Analysed|못했|Couldn/.test(document.getElementById('anInfo').textContent),null,{timeout:60000});
  await p.click('#bAuto');const got=await p.evaluate(()=>__lines().map(l=>l.start+OFF));
  const ok=got.filter((t,i)=>Math.abs(t-truth[i])<=0.15).length;if(ok<8)errs.push(`auto-sync: ${ok}/10 within 0.15s — ${got.map(x=>x.toFixed(2))} vs ${truth.map(x=>x.toFixed(2))}`);else console.log(`auto-sync ok (${ok}/10 within 0.15s)`);
  await p.click('#bDemo')}

/* full offline export on a generated 8s click track */
const plan=await p.evaluate(async()=>{const x=await exportPlan();return x&&{video:x.v.codec,audio:x.a.kind}});
if(plan){
  const wp=path.join(out,'click.wav');fs.writeFileSync(wp,wav(8));await p.setInputFiles('#fAudio',wp);
  await p.waitForFunction(()=>/분석 완료|분석하지 못했/.test(document.getElementById('anInfo').textContent),null,{timeout:60000});
  const st0=Date.now();await p.click('#bRec');const link=await p.waitForSelector('#recOut a[download], #recOut .btn#bRecRT',{timeout:600000});
  if(await link.getAttribute('id')==='bRecRT')errs.push('export failed: '+(await p.textContent('#recOut')));
  else{const dl=p.waitForEvent('download');await link.click();const mp=path.join(out,'export.mp4');await (await dl).saveAs(mp);
    const msg=`export ${JSON.stringify(plan)} ${(fs.statSync(mp).size/1048576).toFixed(1)}MB in ${((Date.now()-st0)/1000).toFixed(1)}s`;
    if(has('ffprobe')){const e=ffcheck(mp),st=probe(mp),v=st.find(s=>s.codec_type==='video'),a=st.find(s=>s.codec_type==='audio');
      if(e||!v||!a||v.codec_name!=='h264'||+v.nb_frames!==240||Math.abs(+a.duration-8)>0.1)errs.push('export check: '+(e||JSON.stringify(st)));
      else console.log(msg,'· ffprobe ok',JSON.stringify(st))}
    else console.log(msg,'· ffprobe not found, container not verified')}
}else console.log('no WebCodecs H.264+AAC/Opus here — skipped fast export (realtime recording is the fallback)');

console.log(errs.length?'ERRORS:\n'+errs.join('\n'):'no errors');await b.close();process.exit(errs.length?1:0)})();
