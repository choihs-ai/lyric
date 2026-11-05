'use strict';
/* ============================================================
   00 · UTIL — math, easing, random, color, storage, DOM
   ============================================================ */
const $=id=>document.getElementById(id);
/* UI language: saved choice, else the browser's. T(ko,en) picks the string; template text uses data-en (see applyLang in 80_app) */
const LANG=(()=>{try{const s=localStorage.getItem('rz_lang');if(s==='ko'||s==='en')return s}catch(e){}return /^ko\b/i.test(navigator.language||'')?'ko':'en'})();
const T=(ko,en)=>LANG==='en'?en:ko;
const esc=x=>String(x).replace(/[<>&"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'})[c]);
const clamp=(x,a=0,b=1)=>x<a?a:x>b?b:x;
const lerp=(a,b,t)=>a+(b-a)*t;
const E={
  outExpo:x=>x>=1?1:1-Math.pow(2,-10*x),
  outCubic:x=>1-Math.pow(1-x,3),
  outQuint:x=>1-Math.pow(1-x,5),
  inCubic:x=>x*x*x,
  inOut:x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2,
  outBack:x=>{const c=1.70158,c3=c+1;return 1+c3*Math.pow(x-1,3)+c*Math.pow(x-1,2)},
  outElastic:x=>x<=0?0:x>=1?1:Math.pow(2,-10*x)*Math.sin((x*10-0.75)*(2*Math.PI)/3)+1,
  spring:(x,k=7,d=5)=>x<=0?0:1-Math.exp(-d*x)*Math.cos(k*x),
};
const eOutExpo=E.outExpo,eOutBack=E.outBack,eInOut=E.inOut,eIn=E.inCubic;
function rnd(seed){let s=(seed>>>0)||1;return()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return (s%100000)/100000}}
function hash(str){let h=2166136261;for(const c of String(str)){h^=c.codePointAt(0);h=Math.imul(h,16777619)}return h>>>0}
function hexA(h,a){const n=parseInt(h.slice(1),16);return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`}
function mix(a,b,p){const x=parseInt(a.slice(1),16),y=parseInt(b.slice(1),16);const r=Math.round;
  const R=r((x>>16&255)+((y>>16&255)-(x>>16&255))*p),G=r((x>>8&255)+((y>>8&255)-(x>>8&255))*p),B=r((x&255)+((y&255)-(x&255))*p);
  return '#'+((1<<24)|(R<<16)|(G<<8)|B).toString(16).slice(1)}
function lum(h){const n=parseInt(h.slice(1),16);return (0.299*(n>>16&255)+0.587*(n>>8&255)+0.114*(n&255))/255}
function lastIdx(arr,t){let lo=0,hi=arr.length-1,r=-1;while(lo<=hi){const m=(lo+hi)>>1;if(arr[m]<=t){r=m;lo=m+1}else hi=m-1}return r}
function env(arr,t,d){const i=lastIdx(arr,t);return i<0?0:Math.exp(-(t-arr[i])/d)}
const pad2=n=>String(n).padStart(2,'0'),pad3=n=>String(n).padStart(3,'0');
function lsGet(k,d){try{const v=localStorage.getItem(k);return v==null?d:v}catch(e){return d}}
function lsSet(k,v){try{localStorage.setItem(k,v)}catch(e){}}
function lsDel(k){try{localStorage.removeItem(k)}catch(e){}}
function pickWeighted(items,weights,r){const tot=weights.reduce((a,b)=>a+b,0);if(tot<=0)return items[0];let x=r*tot;for(let i=0;i<items.length;i++){x-=weights[i];if(x<=0)return items[i]}return items[items.length-1]}
