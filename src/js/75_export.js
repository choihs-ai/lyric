/* ============================================================
   75 · EXPORT — faster-than-realtime MP4. Renders every frame
        offline with frame(t), encodes with WebCodecs (H.264 video,
        AAC audio — Opus when AAC is unavailable) and muxes the MP4
        in-page. 80_app falls back to realtime MediaRecorder capture
        when exportPlan() finds no usable encoder pair.
   ============================================================ */
const FPS=30,VTS=FPS*1000,ASR=48000;
let EXPORTING=false,EXP_CANCEL=false;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const toU8=d=>d instanceof ArrayBuffer?new Uint8Array(d.slice(0)):new Uint8Array(d.buffer.slice(d.byteOffset,d.byteOffset+d.byteLength));
/* AAC-LC AudioSpecificConfig for a known rate/channel count (we always request mp4a.40.2 at ASR, so this is exact) */
function makeASC(sr,ch){const fi=[96000,88200,64000,48000,44100,32000,24000,22050,16000,12000,11025,8000].indexOf(sr);return Uint8Array.of(2<<3|fi>>1,(fi&1)<<7|ch<<3)}

/* ---------- minimal MP4 (ISO BMFF) muxer: moov before mdat (fast start), one chunk per track per second ----------
   track: {kind:'video', timescale, width, height, avcC, samples} | {kind:'audio', codec:'aac'|'opus', timescale, sampleRate, channels, bitrate, asc|preSkip, samples}
   sample: {data:Uint8Array, dur (track ticks), cts (ticks, pts−dts), key}  — samples in decode order. Returns Blob parts. */
function mp4Mux(tracks){
  const u32=a=>{const o=new Uint8Array(a.length*4),d=new DataView(o.buffer);a.forEach((v,i)=>d.setUint32(i*4,v>>>0));return o};
  const u16=a=>{const o=new Uint8Array(a.length*2),d=new DataView(o.buffer);a.forEach((v,i)=>d.setUint16(i*2,v&65535));return o};
  const str=s=>Uint8Array.from(s,c=>c.charCodeAt(0)),Z=n=>new Uint8Array(n);
  const box=(type,...parts)=>{let n=8;parts.forEach(p=>n+=p.length);const o=new Uint8Array(n);new DataView(o.buffer).setUint32(0,n);o.set(str(type),4);let k=8;parts.forEach(p=>{o.set(p,k);k+=p.length});return o};
  const full=(type,ver,flags,...parts)=>box(type,u32([(ver<<24|flags)>>>0]),...parts);
  const MAT=u32([0x10000,0,0,0,0x10000,0,0,0,0x40000000]);
  tracks.forEach(T=>{let d=0;T.samples.forEach(s=>{s.dts=d;d+=s.dur});T.dur=d;T.chunks=[]});
  const order=[],pos=tracks.map(()=>0),secs=Math.ceil(Math.max(...tracks.map(T=>T.dur/T.timescale)))+1;
  for(let w=1;w<=secs;w++)tracks.forEach((T,k)=>{const s=[];
    while(pos[k]<T.samples.length&&(w===secs||T.samples[pos[k]].dts<w*T.timescale))s.push(T.samples[pos[k]++]);
    if(s.length){const c={s,size:s.reduce((a,x)=>a+x.data.length,0),off:0};T.chunks.push(c);order.push(c)}});
  const rl=(S,f)=>{const e=[];S.forEach(s=>{const v=f(s);if(e.length&&e[e.length-1]===v)e[e.length-2]++;else e.push(1,v)});return e};
  const esds=T=>{const a=[...T.asc],br=T.bitrate||192000,be=v=>[v>>>24&255,v>>>16&255,v>>>8&255,v&255];
    const dsi=[5,a.length,...a],dcd=[4,13+dsi.length,0x40,0x15,0,0,0,...be(br),...be(br),...dsi];
    return full('esds',0,0,Uint8Array.from([3,dcd.length+6,0,0,0,...dcd,6,1,2]))};
  const entry=T=>T.kind==='video'
    ?box('avc1',Z(6),u16([1]),Z(16),u16([T.width,T.height]),u32([0x480000,0x480000,0]),u16([1]),Z(32),u16([0x18,0xffff]),box('avcC',T.avcC))
    :box(T.codec==='opus'?'Opus':'mp4a',Z(6),u16([1]),Z(8),u16([T.channels,16,0,0]),u32([T.sampleRate*65536]),
      T.codec==='opus'?box('dOps',Uint8Array.of(0,T.channels),u16([T.preSkip]),u32([T.sampleRate]),u16([0]),Uint8Array.of(0)):esds(T));
  const stbl=T=>{const S=T.samples,tt=rl(S,s=>s.dur),p=[full('stsd',0,0,u32([1]),entry(T)),full('stts',0,0,u32([tt.length/2,...tt]))];
    if(S.some(s=>s.cts)){const ct=rl(S,s=>s.cts|0);p.push(full('ctts',1,0,u32([ct.length/2,...ct])))}
    if(T.kind==='video'&&S.some(s=>!s.key)){const k=[];S.forEach((s,i)=>{if(s.key)k.push(i+1)});p.push(full('stss',0,0,u32([k.length,...k])))}
    const sc=[];T.chunks.forEach((c,i)=>{if(!sc.length||sc[sc.length-2]!==c.s.length)sc.push(i+1,c.s.length,1)});
    p.push(full('stsc',0,0,u32([sc.length/3,...sc])),full('stsz',0,0,u32([0,S.length,...S.map(s=>s.data.length)])),full('stco',0,0,u32([T.chunks.length,...T.chunks.map(c=>c.off)])));
    return box('stbl',...p)};
  const trak=(T,id)=>{const v=T.kind==='video',ms=Math.round(T.dur*1000/T.timescale);
    return box('trak',full('tkhd',0,3,u32([0,0,id,0,ms,0,0]),u16([0,0,v?0:0x100,0]),MAT,u32([v?T.width*65536:0,v?T.height*65536:0])),
      box('mdia',full('mdhd',0,0,u32([0,0,T.timescale,T.dur]),u16([0x55c4,0])),
        full('hdlr',0,0,u32([0]),str(v?'vide':'soun'),Z(12),str(v?'VideoHandler':'SoundHandler'),Z(1)),
        box('minf',v?full('vmhd',0,1,Z(8)):full('smhd',0,0,Z(4)),box('dinf',full('dref',0,0,u32([1]),full('url ',0,1))),stbl(T))))};
  const moov=()=>box('moov',full('mvhd',0,0,u32([0,0,1000,Math.max(...tracks.map(T=>Math.round(T.dur*1000/T.timescale))),0x10000]),u16([0x100]),Z(10),MAT,Z(24),u32([tracks.length+1])),
    ...tracks.map((T,i)=>trak(T,i+1)));
  const ftyp=box('ftyp',str('isom'),u32([0x200]),str('isomiso2avc1mp41'));
  const place=base=>{let o=base;order.forEach(c=>{c.off=o;o+=c.size})};
  place(0);place(ftyp.length+moov().length+8);              // moov size doesn't depend on the offsets, so two passes are exact
  const mdat=order.reduce((a,c)=>a+c.size,0)+8;if(mdat>0xffffffff)throw new Error(T('영상이 너무 커요 (4GB 초과)','Video too large (over 4 GB)'));
  const hdr=new Uint8Array(8);new DataView(hdr.buffer).setUint32(0,mdat);hdr.set(str('mdat'),4);
  return [ftyp,moov(),hdr,...order.flatMap(c=>c.s.map(s=>s.data))];
}

/* ---------- capability check: an H.264 config that fits W×H, plus AAC (or Opus) audio when available.
   {v,a:null} is still usable for silent exports (no audio file). ---------- */
async function exportPlan(){
  if(!window.VideoEncoder||!window.VideoFrame)return null;
  let v=null,a=null;
  for(const codec of ['avc1.640028','avc1.4d0028','avc1.420028']){const c={codec,width:W,height:H,bitrate:10e6,framerate:FPS,avc:{format:'avc'}};
    try{if((await VideoEncoder.isConfigSupported(c)).supported){v=c;break}}catch(e){}}
  if(window.AudioEncoder&&window.AudioData)for(const [codec,kind,bitrate] of [['mp4a.40.2','aac',192000],['opus','opus',160000]]){const c={codec,sampleRate:ASR,numberOfChannels:2,bitrate};
    try{if((await AudioEncoder.isConfigSupported(c)).supported){a={cfg:c,kind};break}}catch(e){}}
  return v?{v,a}:null;
}

/* ---------- offline render + encode. file=null → silent video of SONG.dur. onProg(fraction, secondsLeft). Throws Error('cancel') when EXP_CANCEL is set. ---------- */
async function fastExport(plan,file,onProg){
  EXPORTING=true;EXP_CANCEL=false;let err=null,venc=null,aenc=null;const fail=e=>{err=err||e};
  try{
    let buf=null;if(file){const ab=await file.arrayBuffer();const OAC=window.OfflineAudioContext||window.webkitOfflineAudioContext;const oc=new OAC(2,1,ASR);
      buf=await new Promise((res,rej)=>{const p=oc.decodeAudioData(ab,res,rej);if(p&&p.then)p.then(res,rej)})}
    /* audio first — it encodes far faster than realtime */
    const kind=plan.a?plan.a.kind:'',fd=kind==='aac'?1024:960,as=[];let adesc=null;
    if(buf){aenc=new AudioEncoder({output:(c,m)=>{if(m&&m.decoderConfig&&m.decoderConfig.description&&!adesc)adesc=toU8(m.decoderConfig.description);
      let d=new Uint8Array(c.byteLength);c.copyTo(d);if(kind==='aac'&&d[0]===0xff&&(d[1]&0xf6)===0xf0)d=d.subarray(d[1]&1?7:9);   // strip ADTS if an encoder adds it
      as.push({data:d,dur:c.duration?Math.round(c.duration*ASR/1e6):fd,cts:0,key:true})},error:fail});
    aenc.configure(plan.a.cfg);
    const L0=buf.getChannelData(0),R0=buf.numberOfChannels>1?buf.getChannelData(1):L0,B=ASR/10;
    for(let o=0;o<buf.length;o+=B){if(err)throw err;if(EXP_CANCEL)throw new Error('cancel');
      const n=Math.min(B,buf.length-o),d=new Float32Array(n*2);d.set(L0.subarray(o,o+n));d.set(R0.subarray(o,o+n),n);
      const ad=new AudioData({format:'f32-planar',sampleRate:ASR,numberOfFrames:n,numberOfChannels:2,timestamp:Math.round(o*1e6/ASR),data:d});aenc.encode(ad);ad.close();
      while(aenc.encodeQueueSize>8&&!err)await sleep(2);
      if(o%(B*30)===0){onProg(0.04*o/buf.length,0);await sleep(0)}}
    await aenc.flush();if(err)throw err}
    /* video: every frame rendered offline through the normal frame(t) path */
    const vs=[];let avcC=null;
    venc=new VideoEncoder({output:(c,m)=>{if(m&&m.decoderConfig&&m.decoderConfig.description&&!avcC)avcC=toU8(m.decoderConfig.description);
      const d=new Uint8Array(c.byteLength);c.copyTo(d);vs.push({data:d,key:c.type==='key',pts:Math.round(c.timestamp*VTS/1e6)})},error:fail});
    venc.configure(plan.v);
    const nF=Math.ceil((buf?buf.duration:SONG.dur)*FPS),t0=performance.now();
    for(let i=0;i<nF;i++){if(err)throw err;if(EXP_CANCEL)throw new Error('cancel');
      frame(i/FPS);
      const vf=new VideoFrame(cv,{timestamp:Math.round(i*1e6/FPS),duration:Math.round(1e6/FPS)});venc.encode(vf,{keyFrame:i%(FPS*2)===0});vf.close();
      while(venc.encodeQueueSize>4&&!err)await sleep(1);
      if(i%5===4||i===nF-1){const f=(i+1)/nF;onProg(0.04+0.95*f,(performance.now()-t0)/1000/f*(1-f));await sleep(0)}}
    await venc.flush();if(err)throw err;
    if(!avcC||!vs.length)throw new Error(T('H.264 인코더가 설정 정보를 주지 않았어요','The H.264 encoder returned no configuration'));
    /* decode order → dts; any B-frame reordering becomes ctts offsets */
    const sp=vs.map(s=>s.pts).sort((a,b)=>a-b);vs.forEach((s,i)=>{s.dur=i+1<vs.length?sp[i+1]-sp[i]:VTS/FPS;s.cts=s.pts-sp[i]});
    const pre=adesc&&adesc.length>=12&&String.fromCharCode(...adesc.subarray(0,8))==='OpusHead'?adesc[10]|adesc[11]<<8:312;
    const tracks=[{kind:'video',timescale:VTS,width:W,height:H,avcC,samples:vs}];
    if(buf)tracks.push({kind:'audio',codec:kind,timescale:ASR,sampleRate:ASR,channels:2,bitrate:plan.a.cfg.bitrate,asc:makeASC(ASR,2),preSkip:pre,samples:as});
    const parts=mp4Mux(tracks);
    onProg(1,0);
    return new Blob(parts,{type:'video/mp4'});
  }finally{EXPORTING=false;[venc,aenc].forEach(e=>{try{if(e&&e.state!=='closed')e.close()}catch(x){}})}
}
