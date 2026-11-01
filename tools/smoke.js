// Smoke test: loads index.html headless, renders frames for every direction (demo lyrics, no audio), reports JS errors.
// usage: node tools/smoke.js [outdir]   (needs playwright)
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
(async()=>{const out=process.argv[2]||path.join(__dirname,'../.shots');fs.mkdirSync(out,{recursive:true});
const b=await chromium.launch({args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});const p=await b.newPage({viewport:{width:1280,height:800}});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.resolve(__dirname,'../index.html'));await p.waitForTimeout(800);await p.click('#bDemo');
console.log('post fx',JSON.stringify(await p.evaluate(()=>__post())));
await p.evaluate(()=>document.getElementById('setup').classList.add('hidden'));
for(const d of ['brutal','neon','editorial','pop','lofi','cinematic']){await p.evaluate(k=>__dir(k),d);
  for(const t of [5,20,45,70,100]){const u=await p.evaluate(t=>{__frame(t);return document.getElementById('cv').toDataURL('image/jpeg',0.6)},t);fs.writeFileSync(path.join(out,`${d}_${t}.jpg`),Buffer.from(u.split(',')[1],'base64'))}}
console.log(errs.length?'ERRORS:\n'+errs.join('\n'):'no errors');await b.close();process.exit(errs.length?1:0)})();
