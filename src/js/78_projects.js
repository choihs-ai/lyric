/* ============================================================
   78 · PROJECTS — several songs on one device. The working state
        lives in the usual rz_* localStorage keys; switching saves a
        snapshot of them (plus the lyric-keyed tap sync) under the
        current project, writes the target's snapshot back and
        reloads. The audio file is kept per project in IndexedDB
        (optional — private mode or a full quota just skips it).
        Export/import is a JSON file without audio.
   ============================================================ */
const PKEYS=['rz_lyrics','rz_meta','rz_dir','rz_dir_lock','rz_aspect','rz_off','rz_int','rz_aiemph','rz_manual'];
const PFILE='lyric-motion-project';
let PROJ_ID='',PROJS=[],PROJ_LEAVING=false;   // LEAVING: the working keys already hold the next project — never snapshot them as this one
const projList=()=>{try{const a=JSON.parse(lsGet('rz_projects','[]'));return Array.isArray(a)?a:[]}catch(e){return []}};
const projSaveList=()=>lsSet('rz_projects',JSON.stringify(PROJS));
const newPid=()=>'p'+Date.now().toString(36)+Math.floor(Math.random()*1e4).toString(36);

/* ---------- audio per project (IndexedDB) ---------- */
let IDBP=null;
function idb(){return IDBP||(IDBP=new Promise((res,rej)=>{try{const r=indexedDB.open('lyric-motion',1);r.onupgradeneeded=()=>r.result.createObjectStore('audio');
  r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}catch(e){rej(e)}}))}
function idbDo(mode,fn){return idb().then(db=>new Promise((res,rej)=>{const tx=db.transaction('audio',mode),q=fn(tx.objectStore('audio'));
  tx.oncomplete=()=>res(q&&q.result);tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error)}))}
function projStoreAudio(f){if(!PROJ_ID)return;(f?idbDo('readwrite',s=>s.put({name:f.name,type:f.type,blob:f},PROJ_ID)):idbDo('readwrite',s=>s.delete(PROJ_ID))).catch(()=>{})}
function projRestoreAudio(){if(!PROJ_ID||MANUAL)return;idbDo('readonly',s=>s.get(PROJ_ID)).then(x=>{if(x&&x.blob&&!AUDIO_FILE)loadAudioFile(new File([x.blob],x.name,{type:x.type||'audio/mpeg'}),false)}).catch(()=>{})}

/* ---------- snapshots ---------- */
function projName(){
  try{const m=JSON.parse(lsGet('rz_meta','{}'));if(m.t&&m.t.trim())return m.t.trim().slice(0,30)}catch(e){}
  if(AUDIO_TITLE)return AUDIO_TITLE;
  const ln=lsGet('rz_lyrics','').split('\n').map(s=>s.trim()).find(s=>s&&!parseHeader(s));return ln?ln.replace(/[*()]/g,'').slice(0,24):T('새 프로젝트','New project')}
function projSnapshot(){const keys={};PKEYS.forEach(k=>{const v=lsGet(k,null);if(v!=null)keys[k]=v});
  const sync={};[syncKey(),autoKey(),wordKey()].forEach(k=>{const v=lsGet(k,null);if(v!=null)sync[k]=v});return {app:PFILE,v:1,name:projName(),keys,sync}}
function projSaveCur(){if(!PROJ_ID||PROJ_LEAVING)return;
  clearTimeout(deb);const lv=$('lyrics').value;if(lv!==lyricsText){lyricsText=lv;lsSet('rz_lyrics',lv)}   // flush typing still inside the input debounce
 lsSet('rz_proj_'+PROJ_ID,JSON.stringify(projSnapshot()));projTouch()}
function projApply(sn){PKEYS.forEach(lsDel);Object.entries(sn.keys||{}).forEach(([k,v])=>{if(PKEYS.includes(k))lsSet(k,String(v))});
  Object.entries(sn.sync||{}).forEach(([k,v])=>{if(/^rz_(sync|auto|word)_\d+$/.test(k))lsSet(k,String(v))})}
function projOpen(id){PROJ_LEAVING=true;lsSet('rz_cur',id);location.reload()}
function projTouch(){if(PROJ_LEAVING)return;const p=PROJS.find(x=>x.id===PROJ_ID);if(!p)return;p.name=projName();p.updated=Date.now();projSaveList();projRender()}

/* ---------- actions ---------- */
function projSwitch(id){if(id===PROJ_ID||EXPORTING||recording)return;projSaveCur();
  let sn=null;try{sn=JSON.parse(lsGet('rz_proj_'+id,'null'))}catch(e){}projApply(sn||{keys:{}});projOpen(id)}
function projNew(sn){if(EXPORTING||recording)return;projSaveCur();const id=newPid();sn=sn||{keys:{}};
  PROJS.unshift({id,name:sn.name||T('새 프로젝트','New project'),updated:Date.now()});projSaveList();lsSet('rz_proj_'+id,JSON.stringify(sn));projApply(sn);projOpen(id)}
function projDelete(){if(EXPORTING||recording)return;const p=PROJS.find(x=>x.id===PROJ_ID);
  const nm=p?p.name:T('이 프로젝트','this project');if(!confirm(T(`"${nm}"를 지울까요? 가사·싱크·저장된 음원이 이 기기에서 사라져요.`,`Delete "${nm}"? Its lyrics, sync and saved audio will be removed from this device.`)))return;
  projStoreAudio(null);lsDel('rz_proj_'+PROJ_ID);PROJS=PROJS.filter(x=>x.id!==PROJ_ID);projSaveList();
  const next=PROJS[0];if(next){let sn=null;try{sn=JSON.parse(lsGet('rz_proj_'+next.id,'null'))}catch(e){}projApply(sn||{keys:{}});projOpen(next.id)}
  else{PROJ_LEAVING=true;PKEYS.forEach(lsDel);lsDel('rz_cur');location.reload()}}
function projExport(){projSaveCur();const sn=projSnapshot(),blob=new Blob([JSON.stringify(sn,null,1)],{type:'application/json'});
  const name=(sn.name||'project').replace(/[^0-9A-Za-z가-힣]+/g,'_').replace(/^_|_$/g,'')+'.lyricmotion.json';
  if(DL){DL.save({filename:name,data:blob}).catch(()=>{});return}
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000)}
function projImport(f){f.text().then(t=>{let sn=null;try{sn=JSON.parse(t)}catch(e){}
  if(!sn||sn.app!==PFILE||typeof sn.keys!=='object'){$('projMsg').innerHTML=T('<b>프로젝트 파일이 아니에요.</b> 이 앱에서 내보낸 .json 파일을 골라 주세요.','<b>Not a project file.</b> Choose a .json file exported from this app.');return}
  projNew({app:PFILE,v:1,name:String(sn.name||T('불러온 프로젝트','Imported project')).slice(0,30),keys:sn.keys,sync:sn.sync||{}})})}

/* ---------- UI ---------- */
function projRender(){const sel=$('projSel');if(!sel)return;
  sel.innerHTML=PROJS.map(p=>`<option value="${esc(p.id)}"${p.id===PROJ_ID?' selected':''}>${esc(p.name||T('새 프로젝트','New project'))}</option>`).join('');
  $('projCount').textContent=PROJS.length>1?`· ${PROJS.length}`:''}
function projInit(){PROJS=projList();PROJ_ID=lsGet('rz_cur','');
  if(!PROJS.find(p=>p.id===PROJ_ID)){                              // first run, or the current project was lost: adopt the working state
    PROJ_ID=PROJS.length&&!lsGet('rz_lyrics','')?PROJS[0].id:newPid();
    if(!PROJS.find(p=>p.id===PROJ_ID))PROJS.unshift({id:PROJ_ID,name:projName(),updated:Date.now()});lsSet('rz_cur',PROJ_ID);projSaveList()}
  projRender();
  $('projSel').onchange=e=>projSwitch(e.target.value);
  $('bProjNew').onclick=()=>projNew();$('bProjDel').onclick=projDelete;$('bProjExp').onclick=projExport;
  $('fProj').onchange=e=>{const f=e.target.files[0];if(f)projImport(f);e.target.value=''};
  addEventListener('pagehide',projSaveCur);document.addEventListener('visibilitychange',()=>{if(document.hidden)projSaveCur()})}
