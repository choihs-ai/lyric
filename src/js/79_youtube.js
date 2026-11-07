/* ============================================================
   79 · YOUTUBE — "no audio file" mode with the song playing in an
        official embedded YouTube player (IFrame Player API). The
        player is the playback clock: preview, tap sync and BPM tapping
        follow its currentTime. Nothing is downloaded or analysed —
        the audio stays inside YouTube's player, so auto-sync is not
        available and saved videos are silent (the user adds the song
        in the Reels/TikTok/Shorts editor). Per YouTube's terms the
        player stays visible (≥200×200) while it is in use.
   ============================================================ */
let YTP=null,YT_ON=false,YT_ID='',YT_API=null,ytLast={rep:-1,wall:0,out:null},YT_DUR=0,YT_AD=false,YT_HOLD=false,ytPrimeT=0,ytHold=0;
/* YT_HOLD: realtime recording runs on the internal clock, so the player (and any ad in it) never drives a saved video */
const ytActive=()=>YT_ON&&!YT_HOLD;
function ytId(s){s=String(s||'').trim();if(/^[\w-]{11}$/.test(s))return s;
  try{const u=new URL(/^https?:/i.test(s)?s:'https://'+s),h=u.hostname.replace(/^(www|m|music)\./,'');
    if(h==='youtu.be')return (u.pathname.slice(1).match(/^[\w-]{11}/)||[''])[0];
    if(h==='youtube.com'||h==='youtube-nocookie.com'){const v=u.searchParams.get('v');if(v&&/^[\w-]{11}$/.test(v))return v;
      const m=u.pathname.match(/^\/(?:shorts|embed|live|v)\/([\w-]{11})/);return m?m[1]:''}}catch(e){}
  return ''}
function ytLoadApi(){return YT_API||(YT_API=new Promise((res,rej)=>{if(window.YT&&window.YT.Player)return res(window.YT);
  const prev=window.onYouTubeIframeAPIReady;window.onYouTubeIframeAPIReady=()=>{if(prev)try{prev()}catch(e){}res(window.YT)};
  const s=document.createElement('script');s.src='https://www.youtube.com/iframe_api';s.onerror=()=>{YT_API=null;rej(new Error('api'))};document.head.appendChild(s);
  setTimeout(()=>{if(!(window.YT&&window.YT.Player)){YT_API=null;rej(new Error('timeout'))}},15000)}))}
const YT_ERR={2:T('링크가 올바르지 않아요.','That link isn\'t valid.'),5:T('이 영상은 여기서 재생할 수 없어요.','This video can\'t play here.'),
  100:T('영상을 찾을 수 없어요 (삭제되었거나 비공개).','Video not found (removed or private).'),
  101:T('이 영상은 다른 사이트에서 재생이 막혀 있어요. 같은 곡의 다른 영상(가사 영상·음원 업로드 등) 링크를 넣어 주세요.','This video blocks playback on other sites. Try another upload of the same song (lyric video, audio upload…).')};
YT_ERR[150]=YT_ERR[101];YT_ERR[153]=YT_ERR[101];
/* resolves {dur} once the video is cued and its length is known; rejects with a user-facing message */
function ytOpen(id){
  return ytLoadApi().catch(()=>{throw new Error(T('유튜브 플레이어를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.','Couldn\'t load the YouTube player. Check your connection.'))}).then(YT=>new Promise((res,rej)=>{
    ytClose();YT_ID=id;$('ytBox').classList.remove('hidden');document.body.classList.add('yt');
    let done=false;const finish=(ok,v)=>{if(done)return;done=true;ok?res(v):rej(v)};
    const tryDur=n=>{const d=YTP&&YTP.getDuration?YTP.getDuration():0;if(d>1){YT_DUR=d;finish(true,{dur:d})}else if(n>0)setTimeout(()=>tryDur(n-1),300);
      else finish(false,new Error(T('영상 길이를 알 수 없어요. 아래에 곡 길이를 직접 넣어 주세요.','Couldn\'t read the video length. Enter the song length below.')))};
    YTP=new YT.Player('ytPlayer',{width:'100%',height:'100%',videoId:id,playerVars:{playsinline:1,rel:0,modestbranding:1,controls:1,fs:0},
      events:{onReady:()=>{YT_ON=true;tryDur(20)},
        onStateChange:e=>{const s=e.data;if(s===1){playing=true;ytLast.rep=-1}else if(s===2||s===5||s===-1)playing=false;else if(s===0){playing=false;onEnded()}},
        onError:e=>{const m=YT_ERR[e.data]||T('이 영상을 재생할 수 없어요.','This video can\'t be played.');$('ytMsg').innerHTML='<b>'+esc(m)+'</b>';finish(false,new Error(m))}}})}))}
function ytClose(){if(YTP){try{YTP.destroy()}catch(e){}}YTP=null;YT_ON=false;YT_ID='';YT_DUR=0;playing=false;clearInterval(ytPrimeT);ytSetAd(false);
  const b=$('ytBox');if(b){b.classList.add('hidden');$('ytSlot').innerHTML='<div id="ytPlayer"></div>'}document.body.classList.remove('yt')}
/* the player reports time coarsely on some devices: interpolate between reports while playing, and never step back by a
   small amount (a real seek moves more than 0.3 s and is followed at once) */
function ytNow(){if(!YTP||!YTP.getCurrentTime)return 0;const t=+YTP.getCurrentTime()||0,w=performance.now();
  if(!playing){ytLast={rep:t,wall:w,out:t};ytSetAd(false);ytHold=t;return t}
  if(t!==ytLast.rep){ytLast.rep=t;ytLast.wall=w}
  /* ads: the API says nothing about them, so infer one when the player is "playing" but the song's time stands still
     (>0.7 s), or when the reported duration is not the song's (some players report the ad's own clock). Buffering looks
     the same and is handled the same way: the lyrics hold and taps are ignored until the song moves again. */
  const d=YTP.getDuration?+YTP.getDuration()||0:0,stall=w-ytLast.wall>700,adClock=YT_DUR>0&&d>0&&Math.abs(d-YT_DUR)>1.5,ad=stall||adClock;
  ytSetAd(ad);if(ad){ytLast.out=null;if(!adClock)ytHold=Math.min(ytHold,ytLast.rep);return ytHold}   // hold the song where it really was
  let est=ytLast.rep+Math.min(0.5,(w-ytLast.wall)/1000*RATE);
  if(ytLast.out!=null&&est<ytLast.out&&ytLast.out-est<0.3)est=ytLast.out;
  ytLast.out=est;ytHold=est;return est}
function ytSetAd(on){if(on===YT_AD)return;YT_AD=on;const e=$('ytAd');if(e)e.classList.toggle('hidden',!on)}
/* "skip the ad first": play muted until the song itself is running (past 0.5 s, right duration), then rewind to 0:00.
   An ad usually runs once per view, so the next play — preview or tap sync — starts straight on the song. */
function ytPrime(){if(!YT_ON)return;const m=$('ytMsg');clearInterval(ytPrimeT);
  try{YTP.mute();YTP.seekTo(0,true);YTP.playVideo()}catch(e){}
  m.innerHTML=T('광고를 먼저 넘기는 중… 광고가 나오면 끝까지 기다려 주세요 (소리는 꺼 둬요).','Getting past the ad… if one plays, let it finish (muted).');
  const t0=performance.now();ytPrimeT=setInterval(()=>{const t=ytNow(),d=+YTP.getDuration()||0;
    if(playing&&!YT_AD&&t>0.5&&(!YT_DUR||Math.abs(d-YT_DUR)<1.5)){clearInterval(ytPrimeT);try{YTP.pauseVideo();YTP.seekTo(0,true);YTP.unMute()}catch(e){}
      m.innerHTML=T('<b>준비됐어요.</b> 이제 재생하면 보통 광고 없이 바로 노래가 시작돼요. 그래도 광고가 나오면 가사가 멈춰 기다려요.','<b>Ready.</b> Playing now usually starts straight on the song. If an ad still appears, the lyrics wait for it.')}
    else if(performance.now()-t0>150000){clearInterval(ytPrimeT);try{YTP.pauseVideo();YTP.unMute()}catch(e){}m.innerHTML=T('광고가 끝나지 않았어요. 다시 눌러 주세요.','The ad didn\'t finish. Try again.')}},250)}
$('bYtPrime').onclick=ytPrime;
/* the player must stay visible (≥200×200), so instead of hiding it the user can move it between the bottom and top corners */
$('ytMove').onclick=()=>{const b=$('ytBox');b.classList.toggle('top');lsSet('rz_yt_top',b.classList.contains('top')?'1':'0')};
if(lsGet('rz_yt_top','0')==='1')$('ytBox').classList.add('top');
