# usage: python3 tools/autosync_bench/mix.py [outdir]   (needs espeak-ng with the Korean voice, numpy)
# Realistic-ish test songs: espeak-ng Korean voice (original sentences) + reverb + centred kick/snare/bass (+ optional centred lead),
# wide hats/pads, optional doubled backing vocal. Writes <name>.wav, <name>.json {truth:[...], lyrics:"..."}
import numpy as np, subprocess, json, sys, wave, io, os
OUT=sys.argv[1] if len(sys.argv)>1 else os.path.join(os.path.dirname(os.path.abspath(__file__)),'out');os.makedirs(OUT,exist_ok=True)
SR=44100; rng=np.random.default_rng(7)
LINES=["오늘 아침엔 창문을 열고","바람이 부는 소리를 들었어","작은 화분에 물을 주면서","천천히 하루를 시작했지",
       "우리는 매일 조금씩 자라","어제보다 한 걸음 더 멀리","멈추지 말고 노래를 불러","끝까지 함께 걸어가자",
       "저녁이 오면 불을 켜고","오늘 하루를 다시 떠올려","고마운 얼굴들을 생각해","내일도 웃으며 만나자"]
def tts(text,speed=150,pitch=50):
    raw=subprocess.run(['espeak-ng','-v','ko','-s',str(speed),'-p',str(pitch),'--stdout',text],capture_output=True).stdout
    w=wave.open(io.BytesIO(raw));sr=w.getframerate();x=np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).astype(np.float32)/32768
    x=np.interp(np.arange(0,len(x),sr/SR),np.arange(len(x)),x)   # resample to 44.1k
    nz=np.where(np.abs(x)>0.02)[0];return x[nz[0]:nz[-1]+1] if len(nz) else x
def reverb(x,t=1.2,wet=0.3,seed=1):
    n=int(SR*t);r=np.random.default_rng(seed);ir=r.standard_normal(n)*np.exp(-np.arange(n)/SR*5)
    ir/=np.sqrt((ir**2).sum());y=np.fft.irfft(np.fft.rfft(x,len(x)+n)*np.fft.rfft(ir,len(x)+n))[:len(x)+n];return y*wet
def build(name,gaps,speed=150,lead=False,double=False,dur=70,bpm=96):
    n=SR*dur;L=np.zeros(n);R=np.zeros(n);t=np.arange(n)/SR;b=60/bpm
    # drums: kick (centre), snare (centre, with room), hats (wide)
    for k in np.arange(0,dur,b):
        i=int(k*SR);m=min(n-i,int(0.3*SR));tt=np.arange(m)/SR;kick=np.sin(2*np.pi*(50+80*np.exp(-tt*30))*tt)*np.exp(-tt*9)*0.7
        L[i:i+m]+=kick;R[i:i+m]+=kick
    for k in np.arange(b,dur,2*b):
        i=int(k*SR);m=min(n-i,int(0.25*SR));sn=rng.standard_normal(m)*np.exp(-np.arange(m)/SR*18)*0.35
        sn+=np.sin(2*np.pi*190*np.arange(m)/SR)*np.exp(-np.arange(m)/SR*25)*0.3;L[i:i+m]+=sn;R[i:i+m]+=sn
    for j,k in enumerate(np.arange(0,dur,b/2)):
        i=int(k*SR);m=min(n-i,int(0.05*SR));h=rng.standard_normal(m)*np.exp(-np.arange(m)/SR*80)*0.15
        if j%2:L[i:i+m]+=h;R[i:i+m]+=h*0.2
        else:R[i:i+m]+=h;L[i:i+m]+=h*0.2
    # bass (centre, saw with harmonics), chord pads (wide, decorrelated)
    roots=[55,46.25,41.2,49]
    for j,k in enumerate(np.arange(0,dur,4*b)):
        i=int(k*SR);m=min(n-i,int(4*b*SR));tt=np.arange(m)/SR;f=roots[j%4]
        saw=sum(np.sin(2*np.pi*f*h*tt)/h for h in range(1,12))*0.18;L[i:i+m]+=saw;R[i:i+m]+=saw
        for h,fr in enumerate([4,5,6]):
            L[i:i+m]+=0.03*np.sin(2*np.pi*f*fr*2*tt+h);R[i:i+m]+=0.03*np.sin(2*np.pi*f*fr*2*1.003*tt+2*h)
        if lead:   # centred sustained synth lead: harmonic, mid-range, notes on every beat
            for q in range(4):
                a=int(q*b*SR);e=min(m,int((q+1)*b*SR));tq=np.arange(e-a)/SR;fl=f*8*[1,1.25,1.5,1.25][q]
                v=sum(np.sin(2*np.pi*fl*h*tq)/h**1.5 for h in range(1,6))*0.07*np.minimum(1,tq/0.02);L[i+a:i+e]+=v;R[i+a:i+e]+=v
    # vocals
    truth=[];pos=6.0;vox=np.zeros(n)
    for k,ln in enumerate(LINES):
        v=tts(ln,speed);truth.append(pos);i=int(pos*SR);m=min(n-i,len(v));vox[i:i+m]+=v[:m]*0.5
        if double and 4<=k<8:   # chorus double, panned
            d=tts(ln,speed,70);j=i+int(0.02*SR);mm=min(n-j,len(d));L[j:j+mm]+=d[:mm]*0.22;R[j:j+mm]+=d[:mm]*0.08
        pos+=len(v)/SR+gaps[k]
    rv=reverb(vox,1.4,0.35);rvL=rv[:n];rvR=np.roll(rv,int(0.013*SR))[:n]
    L+=vox+rvL;R+=vox+rvR
    pk=max(np.abs(L).max(),np.abs(R).max(),1e-9);L/=pk*1.05;R/=pk*1.05
    out=(np.stack([L,R],1)*32767).astype(np.int16)
    with wave.open(os.path.join(OUT,name+'.wav'),'wb') as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes(out.tobytes())
    lyr='Verse 1\n'+'\n'.join(LINES[:4])+'\n\nChorus\n'+'\n'.join(LINES[4:8])+'\n\nVerse 2\n'+'\n'.join(LINES[8:])
    json.dump({'truth':truth,'lyrics':lyr},open(os.path.join(OUT,name+'.json'),'w'),ensure_ascii=False)
    print(name,'lines end at %.1fs'%pos)
g=[0.6,0.4,0.8,4.0, 0.5,0.3,0.6,4.0, 0.5,0.7,0.4,0.5]
build('pop',g);build('pop_lead',g,lead=True)
build('rap',[0.15,0.1,0.2,2.5, 0.15,0.12,0.2,2.5, 0.1,0.2,0.15,0.2],speed=210,double=True)
build('hard',[0.2,0.15,0.3,3.0, 0.2,0.15,0.25,3.0, 0.2,0.3,0.15,0.2],speed=180,lead=True,double=True)
rng=np.random.default_rng(11)
build('ballad',[1.0,0.8,1.2,5.0, 0.9,0.7,1.1,5.0, 0.8,1.0,0.9,1.0],speed=120,bpm=72,dur=90)
build('pop2',[0.4,0.35,0.5,3.5, 0.35,0.25,0.4,3.0, 0.3,0.45,0.35,0.4],speed=165,double=True,bpm=110)
build('rap2',[0.12,0.15,0.1,2.0, 0.1,0.15,0.12,2.0, 0.15,0.1,0.12,0.15],speed=235,bpm=88)
