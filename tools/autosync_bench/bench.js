// usage: node tools/autosync_bench/bench.js [songdir] [song,song,…]  → per-song accuracy of the app's autoSync() (run mix.py first)
const {chromium}=require('playwright');const fs=require('fs');const path=require('path'),page=path.resolve(__dirname,'../../index.html'),dir=process.argv[2]||path.join(__dirname,'out');
(async()=>{const b=await chromium.launch();let tot=0,ok15=0,ok30=0;
for(const name of (process.argv[3]||'pop,pop_lead,rap,hard,ballad,pop2,rap2').split(',')){const j=JSON.parse(fs.readFileSync(path.join(dir,`${name}.json`)));
  const p=await (await b.newContext({locale:'ko-KR'})).newPage();await p.goto('file://'+page);await p.waitForTimeout(400);
  await p.fill('#lyrics',j.lyrics);await p.waitForTimeout(400);await p.setInputFiles('#fAudio',path.join(dir,`${name}.wav`));
  await p.waitForFunction(()=>/분석 완료|못했/.test(document.getElementById('anInfo').textContent),null,{timeout:90000});
  const r=await p.evaluate(()=>{const r=autoSync();window._conf=r&&r.confidence;return r?r.times:null});const conf=await p.evaluate(()=>window._conf);
  const err=r?r.map((t,i)=>t-j.truth[i]):j.truth.map(()=>99);const a=err.filter(e=>Math.abs(e)<=0.15).length,c=err.filter(e=>Math.abs(e)<=0.3).length;tot+=err.length;ok15+=a;ok30+=c;
  console.log(name.padEnd(9),'conf',(conf||0).toFixed(2),`≤0.15s ${a}/${err.length}  ≤0.3s ${c}/${err.length}  err:`,err.map(e=>(e>=0?'+':'')+e.toFixed(2)).join(' '));await p.close()}
console.log(`TOTAL ≤0.15s ${ok15}/${tot} (${Math.round(ok15/tot*100)}%)  ≤0.3s ${ok30}/${tot} (${Math.round(ok30/tot*100)}%)`);await b.close()})();
