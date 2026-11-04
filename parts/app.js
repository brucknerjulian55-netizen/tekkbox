"use strict";
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const el=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const SCALE=[0,2,3,5,7,8,10,12],NOTE_NAMES=['A','H','C','D','E','F','G','A'],BAR=16,MAXCH=32,MAXPAT=32;
const NN=['A','A#','H','C','C#','D','D#','E','F','F#','G','G#'],noteLabel=n=>NN[((n%12)+12)%12];
const DEF=[['Kick','#ffe600',1,'Drums'],['Bass','#ff1f8f',2,'Bass'],['Clap','#2df0ff',3,'Drums'],['Hat','#b6ff3c',3,'Drums'],['Snare','#ff8a1f',3,'Drums'],['Stab','#2df0ff',4,'Melodie'],['Hoover','#ff1f8f',4,'Melodie'],['Riser','#ffe600',5,'FX'],['Melodie','#c77dff',4,'Melodie']];
/*__SOUNDS__*/
/*__BUILD__*/
/*__LIVE__*/

/* ---------- Datenmodell ---------- */
const newPat=(name,bars=1)=>({name,bars,n:{}});
const mkTrack=(id,d)=>({id,name:d[0],src:d[0],color:d[1],slot:d[2],group:d[3],vol:.85,pan:0,tune:0,len:1,mute:false,sample:null});
const mkSlot=(name)=>({name,vol:.9,mute:false,fx:[]});
const put=(p,id,arr,n=0)=>{p.n[id]=(p.n[id]||[]).concat(arr.map(s=>({s,n,l:1})))};
function defaultState(){
  const a=newPat('Pattern 1'),b=newPat('Pattern 2'),c=newPat('Break'),d=newPat('Fill');
  const K=[0,4,8,12],O=[2,6,10,14],C=[4,12];
  [a,b].forEach(p=>{put(p,0,K);put(p,1,O);put(p,3,O);put(p,2,C)});
  put(b,5,[0,3,8,11]);put(b,5,[6],3);put(b,5,[14],-2);
  put(c,3,O);put(c,2,C);put(c,6,[0,8]);put(d,0,K);put(d,1,O);put(d,4,[8,10,12,13,14,15]);put(d,7,[0]);
  return{v:2,bpm:175,cur:0,nextId:9,songMode:false,patterns:[a,b,c,d],tracks:[0,1,2,3,4,5,8,6,7].map(i=>{const t=mkTrack(i,DEF[i]);if(i===8)t.syn={wave:'sawtooth'};return t}),
    groups:['Drums','Bass','Melodie','FX'],song:[],live:[],
    slots:[mkSlot('Master'),mkSlot('Kick'),mkSlot('Bass'),mkSlot('Drums'),mkSlot('Melodie'),mkSlot('FX'),mkSlot('Slot 6'),mkSlot('Slot 7'),mkSlot('Slot 8')]};
}
function migrate(d){            /* Projekte aus Version 1 */
  if(d.v===2){if(!d.live)d.live=[];d.binds=d.binds||[];return d}
  const n=defaultState();n.bpm=d.bpm;n.cur=Math.min(d.cur||0,7);
  n.tracks.forEach(t=>Object.assign(t,d.tracks[t.id]||{}));
  n.patterns=d.patterns.map((p,i)=>{const q=newPat('Pattern '+'ABCDEFGH'[i]);p.forEach((a,t)=>a.forEach((v,s)=>{if(v!==null)(q.n[t]=q.n[t]||[]).push({s,n:v,l:1})}));return q});
  return n;
}
let S=defaultState(),sel=0,mode='play',note=0,view='lv',groupF=null;
let playing=false,recOn=false,queued=null,pos=0,nextT=0,uiQ=[],lastStep={t:0,s:0},skip={},roll=0,loadTrack=0,timer=null,phPos=-1;
const tr=id=>S.tracks.find(t=>t.id===id),pat=()=>S.patterns[S.cur],patLen=p=>p.bars*BAR;
const visTracks=()=>groupF?S.tracks.filter(t=>t.group===groupF):S.tracks;

/* ---------- Audio-Grundgerüst ---------- */
let LE={st:3,fb:.48},echoFb;
let ctx,lp,hp,drv,dry,wet,comp,echoIn,echoDl,live,workletOK=false;
let builtin={},buffers={},tBus={},voices={},slotN=[];
const stepDur=()=>60/S.bpm/4;
async function renderBuiltin(name){
  const probe=new OfflineAudioContext(1,44100*2.1,44100),d=R[name](probe),out=await probe.startRendering(),b=ctx.createBuffer(1,Math.ceil(d*44100),44100);
  const a=out.getChannelData(0).subarray(0,b.length);let pk=0;for(const x of a)pk=Math.max(pk,Math.abs(x));
  const lv={Hoover:.7,Riser:.7,Stab:.75,Hat:.6}[name]||.95;for(let j=0;j<a.length;j++)a[j]*=lv/(pk||1);
  b.copyToChannel(a,0);return b;
}
const WORKLET=`class TF extends AudioWorkletProcessor{
constructor(){super();this.L=sampleRate*12|0;this.b=[new Float32Array(this.L),new Float32Array(this.L)];this.w=0;this.vol=new Array(16).fill(1);this.time=new Array(16).fill(0);this.mode='gb';this.cyc=16;this.keep=1;this.mix=1;this.run=false;this.anchor=0;this.apos=0;this.dur=.1;this.vs=1;this.ga=[0,.5];this.go=[0,0];
this.port.onmessage=e=>Object.assign(this,e.data)}
rd(c,off){const L=this.L,p=this.w-off+L*2,i=Math.floor(p),f=p-i,b=this.b[c];return b[i%L]*(1-f)+b[(i+1)%L]*f}
process(inp,out){const I=inp[0],O=out[0];if(!O||!O.length)return true;const a=I[0]||null,bb=I[1]||a,sr=sampleRate,N=O[0].length,G=1/(.07*sr);
for(let n=0;n<N;n++){const l=a?a[n]:0,r=bb?bb[n]:0,w=this.w;this.b[0][w]=l;this.b[1][w]=r;let ol=l,or=r;
if(this.run){const pos=(currentTime+n/sr-this.anchor)/this.dur+this.apos;
if(this.mode==='gb'){const p=((pos%16)+16)%16,i=Math.floor(p),fr=p-i,j=(i+1)%16,t0=this.time[i],t1=this.time[j],up=t1>=t0&&j!==0,off=(up?t0+(t1-t0)*fr:t0)*this.dur*sr;
this.vs+=(this.vol[i]-this.vs)*.004;let g=this.vs;const e=(1-fr)*this.dur;if(!up&&e<.003)g*=e/.003;const pr=this.time[(i+15)%16],noJ=t0>=pr&&i!==0;if(!noJ&&fr*this.dur<.003)g*=fr*this.dur/.003;
ol=this.rd(0,off)*g;or=this.rd(1,off)*g}
else{const p=((pos%this.cyc)+this.cyc)%this.cyc,off=p*this.dur*sr*.5,e=Math.min(p,this.cyc-p)*this.dur,g=Math.min(1,e/.004);
if(this.keep){ol=or=0;for(let k=0;k<2;k++){this.ga[k]+=G;if(this.ga[k]>=1){this.ga[k]-=1;this.go[k]=off}const h=Math.sin(Math.PI*this.ga[k]),win=h*h;ol+=this.rd(0,this.go[k])*win;or+=this.rd(1,this.go[k])*win}ol*=g;or*=g}
else{ol=this.rd(0,off)*g;or=this.rd(1,off)*g}}
ol=l+(ol-l)*this.mix;or=r+(or-r)*this.mix}
O[0][n]=ol;if(O[1])O[1][n]=or;this.w=(w+1)%this.L}return true}}
registerProcessor('tekk-time',TF)`;
async function initAudio(){
  if(ctx)return;
  ctx=new(window.AudioContext||window.webkitAudioContext)({latencyHint:'interactive'});
  try{await ctx.audioWorklet.addModule('data:text/javascript;base64,'+btoa(WORKLET));workletOK=true}catch(e){workletOK=false}
  const bq=t=>{const f=ctx.createBiquadFilter();f.type=t;return f};
  lp=bq('lowpass');hp=bq('highpass');lp.frequency.value=20000;hp.frequency.value=20;lp.Q.value=hp.Q.value=1.4;
  live=ctx.createGain();dry=ctx.createGain();wet=ctx.createGain();drv=shaper(ctx,4);drv.oversample='2x';
  comp=ctx.createDynamicsCompressor();comp.threshold.value=-5;comp.ratio.value=14;comp.attack.value=.002;comp.release.value=.09;
  live.connect(lp);lp.connect(hp);hp.connect(dry);hp.connect(drv);drv.connect(wet);dry.connect(comp);wet.connect(comp);comp.connect(ctx.destination);
  echoDl=ctx.createDelay(1.5);const fb=ctx.createGain();echoFb=fb;echoIn=ctx.createGain();echoIn.gain.value=0;fb.gain.value=LE.fb;echoDl.delayTime.value=stepDur()*LE.st;
  live.connect(echoIn);echoIn.connect(echoDl);echoDl.connect(fb);fb.connect(echoDl);echoDl.connect(lp);
  S.slots.forEach((_,i)=>makeSlot(i));S.slots.forEach((_,i)=>rebuildSlot(i));
  S.tracks.forEach(wireTrack);setDrive();
  await Promise.all(DEF.map(async d=>builtin[d[0]]=await renderBuiltin(d[0])));
  for(const t of S.tracks){try{const f=await idbGet('s'+t.id);if(f)buffers[t.id]=await ctx.decodeAudioData(f.slice(0))}catch(e){}}
  drawAll();
}
function wireTrack(t){
  if(!ctx)return;let b=tBus[t.id];
  if(!b){const g=ctx.createGain(),p=ctx.createStereoPanner();g.connect(p);b=tBus[t.id]={g,p}}
  b.g.gain.value=t.vol;b.p.pan.value=t.pan;b.p.disconnect();b.p.connect(slotN[t.slot].in);
}
function setDrive(){if(!ctx)return;const v=+$('#drive').value/100;wet.gain.value=v*.9;dry.gain.value=1-v*.45}
function setFilter(v){if(!ctx)return;const t=ctx.currentTime,x=Math.abs(v)/100;
  lp.frequency.setTargetAtTime(v<0?20000*Math.pow(.012,x):20000,t,.012);hp.frequency.setTargetAtTime(v>0?20*Math.pow(200,x):20,t,.012);
  $('#fLab').textContent=v<-2?'Filter: Höhen weg':v>2?'Filter: Bass weg':'Filter'}
function choke(id,t){(voices[id]||[]).forEach(v=>{try{v.g.gain.cancelScheduledValues(t);v.g.gain.setTargetAtTime(0,t,.004);v.s.stop(t+.03)}catch(e){}});voices[id]=[]}
const SYND={wave:'sawtooth',uni:3,spread:12,a:.005,d:.2,s:.8,r:.12,cut:6000,res:1,oct:0};
function synthVoice(t,time,n,gate){
  const P={...SYND,...t.syn},f0=220*Math.pow(2,(t.tune+n+P.oct*12)/12),g=ctx.createGain(),fl=ctx.createBiquadFilter(),U=Math.max(1,P.uni|0),len=Math.max(.03,gate||.35),os=[];
  fl.type='lowpass';fl.frequency.value=P.cut;fl.Q.value=P.res;fl.connect(g).connect(tBus[t.id].g);
  const pk=.42,sus=Math.max(.0005,pk*P.s),a=Math.min(P.a,len*.8),dEnd=Math.min(a+P.d,len);
  g.gain.setValueAtTime(0,time);g.gain.linearRampToValueAtTime(pk,time+a);const at=a+P.d>len?pk+(sus-pk)*(len-a)/P.d:sus;g.gain.linearRampToValueAtTime(at,time+dEnd);g.gain.setValueAtTime(at,time+len);g.gain.linearRampToValueAtTime(0,time+len+P.r);
  for(let u=0;u<U;u++){const o=ctx.createOscillator(),x=U>1?u/(U-1)*2-1:0,og=ctx.createGain(),pn=ctx.createStereoPanner();o.type=P.wave;o.frequency.value=f0;o.detune.value=x*P.spread;og.gain.value=1/Math.sqrt(U);pn.pan.value=x*.6;o.connect(og).connect(pn).connect(fl);o.start(time);o.stop(time+len+P.r+.02);os.push(o)}
  const v={g,s:{stop:w=>os.forEach(o=>{try{o.stop(w)}catch(e){}})}};(voices[t.id]=voices[t.id]||[]).push(v);os[0].onended=()=>{voices[t.id]=(voices[t.id]||[]).filter(x=>x!==v);try{g.disconnect();fl.disconnect()}catch(e){}};
}
const holdable=t=>t.syn||t.loop;
function sound(t,time,n=0,gate=0){
  if(t.syn&&ctx&&tBus[t.id])return synthVoice(t,time,n,gate);
  const buf=buffers[t.id]||builtin[t.src];if(!buf||!ctx||!tBus[t.id])return;
  const s=ctx.createBufferSource(),g=ctx.createGain();s.buffer=buf;s.playbackRate.value=Math.pow(2,(t.tune+n)/12);
  s.connect(g).connect(tBus[t.id].g);g.gain.setValueAtTime(1,time);
  const off=(t.start||0)*buf.duration;if(t.loop){s.loop=true;s.loopStart=off+(buf.duration-off)*.06;s.loopEnd=off+(buf.duration-off)*.4}const full=t.loop?1e6:(buf.duration-off)/s.playbackRate.value;let len=t.loop?(gate||1):full*t.len;if(gate)len=Math.min(len,gate);
  s.start(time,off);
  if(len<full){g.gain.setValueAtTime(1,time+Math.max(0,len-.012));g.gain.linearRampToValueAtTime(0,time+len);s.stop(time+len+.01)}
  (voices[t.id]=voices[t.id]||[]).push({s,g});
  s.onended=()=>{voices[t.id]=(voices[t.id]||[]).filter(v=>v.s!==s)};
}
function trigger(t,time,n=0,gate=0){choke(t.id,time);sound(t,time,n,gate)}
function holdVoice(t,n){trigger(t,ctx.currentTime,n,8);const u=()=>{choke(t.id,ctx.currentTime);window.removeEventListener('pointerup',u);window.removeEventListener('pointercancel',u)};window.addEventListener('pointerup',u);window.addEventListener('pointercancel',u)}

/* ---------- Effekte in den Mixer-Slots ---------- */
const FX={
 eq:{name:'Equalizer',d:()=>({b:[{f:70,g:0,q:1,t:'lowshelf'},{f:400,g:0,q:1,t:'peaking'},{f:2500,g:0,q:1,t:'peaking'},{f:9000,g:0,q:1,t:'highshelf'}]})},
 dist:{name:'Verzerrung',d:()=>({amt:40,mix:100}),s:[['amt','Stärke',0,100,1],['mix','Anteil',0,100,1]]},
 comp:{name:'Kompressor',d:()=>({thr:-18,ratio:6,att:3,rel:120}),s:[['thr','Schwelle (dB)',-50,0,1],['ratio','Verhältnis',1,20,1],['att','Attack (ms)',0,100,1],['rel','Release (ms)',20,600,5]]},
 limit:{name:'Limiter',d:()=>({thr:-3,gain:0}),s:[['thr','Grenze (dB)',-24,0,1],['gain','Nachverstärken (dB)',0,18,1]]},
 filter:{name:'Filter',d:()=>({type:'lowpass',f:4000,q:1}),s:[['f','Frequenz (Hz)',40,18000,10],['q','Resonanz',.3,16,.1]],o:['type','Art',[['lowpass','Tiefpass'],['highpass','Hochpass'],['bandpass','Bandpass']]]},
 delay:{name:'Delay',d:()=>({steps:3,fb:40,mix:30}),s:[['steps','Zeit (Schritte)',1,12,1],['fb','Rückkopplung',0,90,1],['mix','Anteil',0,100,1]]},
 reverb:{name:'Hall',d:()=>({size:1.6,mix:20}),s:[['size','Größe (s)',.2,5,.1],['mix','Anteil',0,100,1]]},
 shape:{name:'Waveshaper',d:()=>({y:[-1,-.75,-.5,-.25,0,.25,.5,.75,1],sym:1,pre:0,post:0,mix:100}),s:[['pre','Eingang (dB)',-12,24,1],['post','Ausgang (dB)',-24,12,1],['mix','Anteil',0,100,1]]},
 gate:{name:'Beat-Gate',d:()=>({vol:Array(16).fill(1),time:Array(16).fill(0),mix:100}),s:[['mix','Anteil',0,100,1]]},
 half:{name:'Halftime',d:()=>({cyc:16,keep:1,mix:100}),s:[['mix','Anteil',0,100,1]]}
};
const B=(t,f,g,q=1)=>({t,f,g,q}),EQP={
 Kick:[B('highpass',28,0,.7),B('peaking',62,3,1.2),B('peaking',350,-4,2),B('peaking',3500,3,1)],
 Bass:[B('highpass',35,0,.7),B('peaking',95,3,1.2),B('peaking',300,-3,1.8),B('lowpass',5500,0,.7)],
 Snare:[B('highpass',120,0,.7),B('peaking',220,3,1.4),B('peaking',900,-3,1.6),B('highshelf',6000,3,1)],
 Clap:[B('highpass',220,0,.7),B('peaking',450,-2,1.5),B('peaking',1600,3,1),B('highshelf',8000,3,1)],
 Hats:[B('highpass',500,0,.7),B('peaking',1500,-3,1.2),B('peaking',8000,2,1),B('highshelf',12000,3,1)],
 Stabs:[B('highpass',200,0,.7),B('peaking',450,-3,1.5),B('peaking',2500,3,1),B('highshelf',9000,2,1)],
 Melodie:[B('highpass',150,0,.7),B('peaking',350,-2,1.4),B('peaking',3000,3,1),B('highshelf',10000,1.5,1)],
 Master:[B('highpass',25,0,.7),B('peaking',60,1,1),B('peaking',300,-1,1),B('highshelf',11000,1.5,1)],
 Neutral:[B('lowshelf',70,0),B('peaking',400,0),B('peaking',2500,0),B('highshelf',9000,0)]},EQT=[['highpass','Hochpass'],['lowshelf','Low-Shelf'],['peaking','Bell'],['highshelf','High-Shelf'],['lowpass','Tiefpass']];
const WSP={Linear:x=>x,Weich:x=>Math.tanh(x*2.2)/Math.tanh(2.2),Hart:x=>Math.max(-.55,Math.min(.55,x*1.6))/.55,Faltung:x=>Math.sin(x*Math.PI*1.5),Stufen:x=>Math.round(x*4)/4,Kurve:x=>Math.sign(x)*x*x};
const GATEP={'Aus':[()=>1,()=>0],'Halftime':[()=>1,i=>i/2],'Gate 1/8':[i=>i%4<2?1:0,()=>0],'Gate 1/16':[i=>i%2?0:1,()=>0],'Pumpen':[i=>[.15,.5,.85,1][i%4],()=>0],'Stutter':[()=>1,i=>i%2],'Tape-Stop':[i=>1-i/18,i=>i*i/30],'Trance':[i=>[1,0,1,1,0,1,1,0,1,0,1,1,0,1,0,1][i],()=>0]};
function makeFx(f){
  const P=f.p,i=ctx.createGain(),o=ctx.createGain(),n={in:i,out:o,set(){}},mixPair=()=>{const d=ctx.createGain(),w=ctx.createGain();i.connect(d).connect(o);return{d,w,mix(v){w.gain.value=v;d.gain.value=1-v}}};
  if(f.t==='eq'){const types=['lowshelf','peaking','peaking','highshelf'];n.b=types.map(t=>{const b=ctx.createBiquadFilter();b.type=t;b.Q.value=1;return b});
    n.b.reduce((a,b)=>a.connect(b),i).connect(o);n.set=()=>P.b.forEach((x,k)=>{const b=n.b[k];b.type=x.t||types[k];b.frequency.value=x.f;b.gain.value=x.g;b.Q.value=x.q||1})}
  else if(f.t==='dist'){const m=mixPair(),w=ctx.createWaveShaper(),post=ctx.createGain();w.oversample='2x';i.connect(w).connect(post).connect(m.w).connect(o);
    n.set=()=>{const k=1+P.amt/4,a=new Float32Array(2048);for(let j=0;j<2048;j++){const x=j/1024-1;a[j]=Math.tanh(x*k)}w.curve=a;post.gain.value=1/Math.sqrt(1+P.amt/30);m.mix(P.mix/100)}}
  else if(f.t==='comp'||f.t==='limit'){const c=ctx.createDynamicsCompressor(),g=ctx.createGain();i.connect(c).connect(g).connect(o);n.c=c;
    n.set=()=>{c.threshold.value=P.thr;if(f.t==='limit'){c.ratio.value=20;c.attack.value=.001;c.release.value=.06;c.knee.value=0;g.gain.value=Math.pow(10,P.gain/20)}else{c.ratio.value=P.ratio;c.attack.value=P.att/1000;c.release.value=P.rel/1000;c.knee.value=6}}}
  else if(f.t==='shape'){const m=mixPair(),pre=ctx.createGain(),w=ctx.createWaveShaper(),post=ctx.createGain();w.oversample='2x';i.connect(pre).connect(w).connect(post).connect(m.w).connect(o);
    n.set=()=>{const a=new Float32Array(2049);for(let j=0;j<2049;j++){const x=j/2048*8,k=Math.min(7,Math.floor(x)),t=x-k;a[j]=P.y[k]+(P.y[k+1]-P.y[k])*t}w.curve=a;pre.gain.value=Math.pow(10,P.pre/20);post.gain.value=Math.pow(10,P.post/20);m.mix(P.mix/100)}}
  else if(f.t==='filter'){const b=ctx.createBiquadFilter();i.connect(b).connect(o);n.set=()=>{b.type=P.type;b.frequency.value=P.f;b.Q.value=P.q}}
  else if(f.t==='delay'){const m=mixPair(),dl=ctx.createDelay(2),fb=ctx.createGain();i.connect(dl);dl.connect(fb).connect(dl);dl.connect(m.w).connect(o);n.set=()=>{dl.delayTime.setTargetAtTime(Math.min(2,P.steps*stepDur()),ctx.currentTime,.02);fb.gain.value=P.fb/100;m.d.gain.value=1;m.w.gain.value=P.mix/100}}
  else if(f.t==='reverb'){const m=mixPair(),c=ctx.createConvolver();i.connect(c).connect(m.w).connect(o);let sz=0;
    n.set=()=>{if(sz!==P.size){sz=P.size;const L=ctx.sampleRate*sz|0,b=ctx.createBuffer(2,L,ctx.sampleRate);for(let k=0;k<2;k++){const a=b.getChannelData(k);for(let j=0;j<L;j++)a[j]=(Math.random()*2-1)*Math.pow(1-j/L,3)}c.buffer=b}m.d.gain.value=1;m.w.gain.value=P.mix/100*1.5}}
  else if((f.t==='gate'||f.t==='half')&&workletOK){const w=new AudioWorkletNode(ctx,'tekk-time',{numberOfOutputs:1,outputChannelCount:[2]});i.connect(w).connect(o);n.tf=w;
    n.set=()=>{w.port.postMessage(f.t==='gate'?{mode:'gb',vol:P.vol,time:P.time,mix:P.mix/100}:{mode:'half',cyc:P.cyc,keep:P.keep,mix:P.mix/100});syncTF(w)}}
  else i.connect(o);
  n.set();return n;
}
function syncTF(w){w.port.postMessage({run:playing,anchor:nextT,apos:pos,dur:stepDur()})}
const allTF=()=>slotN.forEach(s=>s&&s.fxn.forEach(f=>f.n&&f.n.tf&&syncTF(f.n.tf)));
function makeSlot(i){const s={in:ctx.createGain(),out:ctx.createGain(),an:ctx.createAnalyser(),fxn:[]};s.an.fftSize=2048;s.an.smoothingTimeConstant=.7;s.out.connect(s.an);slotN[i]=s}
function rebuildSlot(i){
  const s=slotN[i];if(!s)return;const SL=S.slots[i];
  s.in.disconnect();s.fxn.forEach(f=>{try{f.n.in.disconnect();f.n.out.disconnect()}catch(e){}});
  s.fxn=SL.fx.map(f=>({f,n:f.on?makeFx(f):null}));
  let last=s.in;s.fxn.forEach(x=>{if(x.n){last.connect(x.n.in);last=x.n.out}});last.connect(s.out);
  s.out.disconnect();s.out.connect(s.an);s.out.connect(i===0?live:slotN[0].in);slotVol(i);
}
function slotVol(i){if(slotN[i])slotN[i].out.gain.value=S.slots[i].mute?0:S.slots[i].vol}

/* ---------- Sequencer ---------- */
function activeAt(p){
  if(!S.songMode)return[[pat(),p]];
  return S.song.flatMap(it=>{const P=S.patterns[it.p];if(!P)return[];const st=p-it.b*BAR;return st>=0&&st<patLen(P)?[[P,st]]:[]});
}
const songEnd=()=>Math.max(BAR,...S.song.map(it=>it.b*BAR+patLen(S.patterns[it.p]||{bars:1})));
function sched(){
  while(nextT<ctx.currentTime+.13){
    const act=activeAt(pos),hits=[],d=stepDur();if(nextT<ctx.currentTime)PERF.late++;lastStep={t:nextT,s:pos};
    for(const t of S.tracks){
      if(roll&&t.id===sel)continue;
      const ns=[];for(const[P,st]of act)for(const x of P.n[t.id]||[])if(x.s===st)ns.push(x);
      if(skip[t.id]===pos){skip[t.id]=-1;continue}
      if(ns.length&&!t.mute){hits.push(t.id);choke(t.id,nextT);ns.forEach(x=>sound(t,nextT,x.n,x.pr||holdable(t)?x.l*d:0))}
    }
    if(roll){const t=tr(sel),n=mode==='note'?note:0;if(t){trigger(t,nextT,n);if(roll===32)trigger(t,nextT+d/2,n)}}
    uiQ.push({t:nextT,p:pos,hits});nextT+=d;pos++;
    const end=S.songMode?songEnd():patLen(pat());
    if(pos>=end){pos=0;if(queued!==null&&!S.songMode){S.cur=queued;queued=null;uiQ.push({t:nextT,redraw:1})}allTF()}
  }
}
function startTimer(){
  try{const w=new Worker(URL.createObjectURL(new Blob(['setInterval(()=>postMessage(0),20)'],{type:'text/javascript'})));w.onmessage=()=>playing&&sched();timer=1}
  catch(e){setInterval(()=>playing&&sched(),20);timer=1}
}
async function resume(){await initAudio();if(ctx.state!=='running')await ctx.resume()}
async function togglePlay(){
  await resume();playing=!playing;$('#play').classList.toggle('on',playing);$('#play').textContent=playing?'■':'▶';
  if(playing){pos=0;nextT=ctx.currentTime+.06;uiQ=[];if(!timer)startTimer();allTF();wake(true)}
  else{allTF();S.tracks.forEach(t=>choke(t.id,ctx.currentTime));if(queued!==null){S.cur=queued;queued=null}wake(false);phPos=-1;drawPlayhead();drawPatBar()}
}
let wl=null;async function wake(on){try{if(on&&navigator.wakeLock)wl=await navigator.wakeLock.request('screen');else if(wl){wl.release();wl=null}}catch(e){}}
function record(id,n){
  if(!recOn||!playing)return;const P=pat(),L=patLen(P),q=Math.round((ctx.currentTime-lastStep.t)/stepDur()),idx=((lastStep.s+q)%L+L)%L;
  const a=P.n[id]=P.n[id]||[];if(!a.some(x=>x.s===idx&&x.n===n))a.push({s:idx,n,l:1});if(q>0)skip[id]=idx;refreshGrid();save();
}
function toggleStep(id,s){const P=pat(),a=P.n[id]=P.n[id]||[];if(a.some(x=>x.s===s))P.n[id]=a.filter(x=>x.s!==s);else a.push({s,n:mode==='note'?note:0,l:1});refreshGrid();save()}
const stepAt=(P,id,s)=>(P.n[id]||[]).find(x=>x.s===s);

/* ---------- Pads-Ansicht ---------- */
function drawSteps(){
  const b=$('#steps');if(!b.children.length)for(let i=0;i<BAR;i++){const e=el('button');e.setAttribute('aria-label','Schritt '+(i+1));e.onclick=()=>toggleStep(sel,padPage()*BAR+i);b.append(e)}
  const t=tr(sel),P=pat(),pg=padPage()*BAR;[...b.children].forEach((e,i)=>{const x=t&&stepAt(P,sel,pg+i);e.className='st'+(i%4===0?' beat':'')+(x?' on':'')+(pg+i===phPos?' ph':'');e.style.setProperty('--c',t?t.color:'');e.innerHTML=x&&x.n?`<small>${noteLabel(x.n)}</small>`:''})}
const padPage=()=>phPos>=0?Math.floor(phPos/BAR)%pat().bars:0;
function defaultIds(c,n){const used=new Set(S.live.filter(x=>x!==c&&x.ids).flatMap(x=>x.ids));const free=S.tracks.filter(t=>!used.has(t.id)).map(t=>t.id);return Array.from({length:n},(_,i)=>free[i]??null)}
function drawPads(){$$('.padGrid').forEach(g=>{const c=g._c;c.cols=c.cols||4;c.rows=c.rows||2;const n=c.cols*c.rows;if(!c.ids)c.ids=defaultIds(c,8);while(c.ids.length<n)c.ids.push(null);
  g.style.gridTemplateColumns=`repeat(${c.cols},1fr)`;g.style.gridTemplateRows=`repeat(${c.rows},1fr)`;
  if(g.children.length!==n){g.innerHTML='';for(let i=0;i<n;i++){const e=el('button','pad');e.addEventListener('pointerdown',ev=>{if(liveEdit)return;ev.preventDefault();padDown(c,i,e)});e.addEventListener('contextmenu',ev=>ev.preventDefault());g.append(e)}}
  const st=tr(sel);[...g.children].forEach((e,i)=>{const t=tr(c.ids[i]);e.style.outline='';
    if(mode==='note'){e.className='pad note';e.dataset.id='';e.innerHTML=`<b>${NOTE_NAMES[i%8]}</b><i>${st?esc(st.name):''}</i>`;if(SCALE[i%8]+12*Math.floor(i/8)===note)e.style.outline='2px solid var(--ink)';return}
    if(padSwap&&padSwap.c===c&&padSwap.i===i)e.style.outline='2px solid var(--lit)';if(!t){e.className='pad empty';e.dataset.id='';e.innerHTML=liveEdit?'<b>+</b>':'';return}
    e.dataset.id=t.id;e.className='pad'+(t.id===sel?' sel':'')+(t.mute?' muted':'');e.style.setProperty('--c',t.color);const ac=(c.acts&&c.acts[i])||'play';e.innerHTML=`<b>${esc(t.name)}</b><i>${t.mute?'stumm':ac==='toggle'?'Tippen':ac==='holdm'||ac==='holdo'?'Halten':t.sample?esc(t.sample):''}</i>`})})}
function flash(e){e.style.setProperty('--glow',.9);clearTimeout(e._t);e._t=setTimeout(()=>e.style.setProperty('--glow',0),90)}
async function padDown(c,i,e){
  await resume();flash(e);
  if(mode==='note'){note=SCALE[i%8]+12*Math.floor(i/8);const t=tr(sel);if(t){if(holdable(t))holdVoice(t,note);else trigger(t,ctx.currentTime,note);record(sel,note)}drawPads();return}
  const t=tr(c.ids[i]);if(!t)return;
  if(mode==='mute'){t.mute=!t.mute;if(t.mute)choke(t.id,ctx.currentTime);drawPads();save();return}
  if(mode==='hold'){t.mute=true;choke(t.id,ctx.currentTime);drawPads();const u=()=>{t.mute=false;drawPads();window.removeEventListener('pointerup',u);window.removeEventListener('pointercancel',u)};window.addEventListener('pointerup',u);window.addEventListener('pointercancel',u);return}
  const act=(c.acts&&c.acts[i])||'play';
  if(act==='toggle'){t.mute=!t.mute;if(t.mute)choke(t.id,ctx.currentTime);drawPads();drawRack();save();return}
  if(act==='holdm'||act==='holdo'){const on=act==='holdm';t.mute=on;if(on)choke(t.id,ctx.currentTime);drawPads();const u=()=>{t.mute=!on;if(!on)choke(t.id,ctx.currentTime);drawPads();window.removeEventListener('pointerup',u);window.removeEventListener('pointercancel',u)};window.addEventListener('pointerup',u);window.addEventListener('pointercancel',u);return}
  const ch=sel!==t.id;sel=t.id;if(holdable(t))holdVoice(t,0);else trigger(t,ctx.currentTime,0);record(t.id,0);if(ch){drawPads();drawSteps()}
}
function setMode(m){mode=m;$$('.seg').forEach(b=>b.classList.toggle('on',b.dataset.m===m));drawPads()}

/* ---------- Waveform wie im Sampler ---------- */
function drawWaveOn(c,buf,start=0,len=1,h=90){
  if(!c||!c.clientWidth)return;const{g,w}=sizeCanvas(c,h),C=prCol();g.clearRect(0,0,w,h);g.strokeStyle=C('--deep');g.beginPath();g.moveTo(0,h/2+.5);g.lineTo(w,h/2+.5);g.stroke();if(!buf)return;
  const a=buf.getChannelData(0),b=buf.numberOfChannels>1?buf.getChannelData(1):a,st=a.length/w;let gp=0;for(let i=0;i<a.length;i+=7)gp=Math.max(gp,Math.abs(a[i]));const sc=(h/2-2)/(gp||1);
  const sx=start*w,ex=sx+(w-sx)*len;
  for(let x=0;x<w;x++){let lo=1,hi=-1;const i0=x*st|0,i1=Math.min(a.length,(x+1)*st|0),inc=Math.max(1,(i1-i0)/40|0);for(let i=i0;i<i1;i+=inc){const v=(a[i]+b[i])/2;if(v<lo)lo=v;if(v>hi)hi=v}if(hi<lo)continue;g.fillStyle=x<sx||x>ex?C('--line'):C('--lit');g.fillRect(x,h/2-hi*sc,1,Math.max(1,(hi-lo)*sc))}
  if(start>0||len<1){g.fillStyle=C('--hot');g.fillRect(sx,0,2,h);g.fillRect(ex-2,0,2,h)}
}
const trBuf=t=>t&&(buffers[t.id]||builtin[t.src]);
function drawRackWave(){const t=tr(sel);if(view==='rv'&&t){drawWaveOn($('#rackWave'),trBuf(t),t.start||0,t.len,56);$('#rackWaveN').textContent=t.sample||t.name}}
const FILLS={
 Kick:[['Jedes 4. Feld',i=>i%4===0],['Doppelschlag am Taktende',i=>i%4===0||i%16===15],['Halbes Tempo',i=>i%8===0]],
 'Snare und Clap':[['Jedes 8. Feld (ab Feld 5)',i=>i%8===4],['Jedes 4. Feld',i=>i%4===0],['Wirbel am Taktende',i=>i%8===4||i%16>=12]],
 Hats:[['Offbeat, 2 nach der Kick',i=>i%4===2],['Jedes 2. Feld',i=>i%2===0],['Jedes Feld',()=>true],['Offbeat mit Extra',i=>i%4===2||i%8===7]],
 Bass:[['Offbeat, 2 nach der Kick',i=>i%4===2],['Rollend, 3 nach der Kick',i=>i%4!==0],['Galopp',i=>i%4>=2]],
 Stabs:[['Offbeat, 2 nach der Kick',i=>i%4===2],['Hardtekk-Rhythmus',i=>[0,3,6,8,11,14].includes(i%16)],['Jeder Beat',i=>i%4===0],['Jedes 8. Feld',i=>i%8===0]],
 Melodie:[['Hymne',[[0,0,2],[2,0,1],[3,3,2],[6,0,1],[8,7,3],[11,5,1],[12,3,2],[14,2,2]]],['Aufsteigend',[0,3,5,7,8,7,5,3].map((n,i)=>[i*2,n,2])],['Arpeggio',[...Array(16)].map((_,i)=>[i,[0,3,7,12][i%4],1])],['Offbeat-Riff',[[2,0,2],[6,0,2],[10,3,2],[14,-2,2]]],['Treppe runter',[12,10,8,7,5,3,2,0].map((n,i)=>[i*2,n,2])]]};
function fillCat(t){const n=(t.name+' '+(t.sample||'')+' '+t.src).toLowerCase();return /kick/.test(n)?'Kick':/snare|clap/.test(n)?'Snare und Clap':/hat|shaker/.test(n)?'Hats':/bass|reese|sub/.test(n)?'Bass':/stab|hoover/.test(n)?'Stabs':/lead|pluck|melod/.test(n)?'Melodie':'Stabs'}
function fillSheet(){
  const t=tr(sel),c=fillCat(t),cats=[c,...Object.keys(FILLS).filter(k=>k!==c)];
  openSheet(`<h2>Muster für ${esc(t.name)}</h2><p>Füllt den Kanal im aktuellen Pattern aus. Vorhandene Noten dieses Kanals werden ersetzt.</p>
  ${cats.map(k=>`<p style="margin:9px 0 4px;font-weight:700">${k}</p><div class="row">${FILLS[k].map((f,i)=>`<button class="act ${k===c?'':'alt'}" data-c="${k}" data-i="${i}">${f[0]}</button>`).join('')}</div>`).join('')}
  <div class="row"><button class="act alt" id="fX">Kanal leeren</button><button class="act alt" id="sC">Fertig</button></div>`);
  $$('#sheet [data-c]').forEach(b=>b.onclick=()=>{const P=pat(),o=P.n[t.id]||[],n=o.length?o[0].n:0,f=FILLS[b.dataset.c][+b.dataset.i][1],a=[];if(Array.isArray(f)){for(let bar=0;bar<P.bars;bar++)f.forEach(x=>a.push({s:x[0]+bar*BAR,n:x[1],l:x[2],pr:1}))}else for(let s=0;s<patLen(P);s++)if(f(s))a.push({s,n,l:1});P.n[t.id]=a;refreshGrid();save();closeSheet();toast(FILLS[b.dataset.c][+b.dataset.i][0])});
  $('#fX').onclick=()=>{delete pat().n[t.id];refreshGrid();save();closeSheet()};$('#sC').onclick=closeSheet;
}
/* ---------- Channel Rack ---------- */
let rackPh=null,rackCells=[],rackSel=null,rackDrag=false,rackSkip=false,rackLP=0;
function rackMark(){$$('.rRow').forEach(r=>r.classList.toggle('picked',!!rackSel&&rackSel.has(+r.dataset.id)));const b=$('#rackSel');b.style.display=rackSel?'':'none';if(rackSel)$('#rsN').textContent=rackSel.size+' gewählt'}
function rackSwap(a,b){const i=S.tracks.findIndex(t=>t.id===a),j=S.tracks.findIndex(t=>t.id===b);if(i<0||j<0)return;[S.tracks[i],S.tracks[j]]=[S.tracks[j],S.tracks[i]];drawRack();save();toast('Getauscht')}
let rackSwapFrom=null;
function rackEnd(){rackSwapFrom=null;rackSel=null;rackDrag=false;rackMark()}
function rackPickAt(x,y){const r=document.elementFromPoint(x,y),w=r&&r.closest&&r.closest('.rRow');if(w&&rackSel){rackSel.add(+w.dataset.id);rackMark()}}
function delTracks(ids){const keep=S.tracks.filter(t=>!ids.includes(t.id));if(!keep.length){toast('Ein Kanal muss bleiben.');return false}S.tracks=keep;ids.forEach(id=>{S.patterns.forEach(p=>delete p.n[id]);idbDel('s'+id);delete buffers[id]});S.live.forEach(c=>{if(c.ids)c.ids=c.ids.map(i=>ids.includes(i)?null:i)});if(!tr(sel))sel=S.tracks[0].id;drawAll();save();return true}
function drawGroups(){const b=$('#groups');b.innerHTML='';[[null,'Alle'],...S.groups.map(g=>[g,g])].forEach(([g,l])=>{const e=el('button','chip'+(g===groupF?' on':''),l);e.onclick=()=>{groupF=g;drawRack();drawPads();drawGroups()};b.append(e)});
  const a=el('button','chip','+ Gruppe');a.onclick=groupSheet;b.append(a)}
function drawRack(){
  const b=$('#rackScroll'),keep=b.scrollLeft,P=pat(),L=patLen(P);b.innerHTML='';rackCells=[];
  visTracks().forEach(t=>{
    const r=el('div','rRow'+(rackSel&&rackSel.has(t.id)?' picked':'')),h=el('div','rHead'),m=el('button','rMute'+(t.mute?' off':'')),n=el('button','rName'+(t.id===sel?' sel':''),t.name),o=el('button','rOpt','⋯'),c=el('div','rCells');
    r.dataset.id=t.id;r.style.setProperty('--c',t.color);m.setAttribute('aria-label',t.name+' stumm schalten');o.setAttribute('aria-label',t.name+' bearbeiten');
    m.onclick=()=>{t.mute=!t.mute;drawRack();drawPads();save()};
    n.addEventListener('pointerdown',ev=>{const x=ev.clientX,y=ev.clientY;rackSkip=false;clearTimeout(rackLP);rackLP=setTimeout(()=>{rackSel=rackSel||new Set();rackSel.add(t.id);rackDrag=true;rackSkip=true;rackMark();try{navigator.vibrate&&navigator.vibrate(18)}catch(e){}},450);n._xy=[x,y]});
    n.onclick=async()=>{if(rackSkip){rackSkip=false;return}if(rackSwapFrom!=null){const a=rackSwapFrom;rackSwapFrom=null;if(a!==t.id)rackSwap(a,t.id);rackEnd();return}if(rackSel){rackSel.has(t.id)?rackSel.delete(t.id):rackSel.add(t.id);rackMark();return}await resume();sel=t.id;trigger(t,ctx.currentTime,0);drawRack();drawPads();drawSteps()};
    o.onclick=()=>{sel=t.id;channelSheet()};
    h.append(m,n,o);
    for(let s=0;s<L;s++){const x=stepAt(P,t.id,s),e=el('button','rc'+(s%4===0?' beat':'')+(s%BAR===0&&s?' barS':'')+(x?' on':'')+(s===phPos?' ph':''),x&&x.n?noteLabel(x.n):'');e.dataset.s=s;e.setAttribute('aria-label',t.name+' Schritt '+(s+1));e.onclick=()=>{sel=t.id;toggleStep(t.id,s)};c.append(e);(rackCells[s]=rackCells[s]||[]).push(e)}
    r.append(h,c);b.append(r)});
  const w=el('div','addRow'),a=el('button','mini','+ Kanal');a.onclick=addChannelSheet;const f=el('button','mini','Muster');f.onclick=fillSheet;f.style.marginLeft='4px';w.append(a,f);b.append(w);b.scrollLeft=keep;drawRackWave();
}
const SYNS=[['oct','Oktave',-3,3,1],['uni','Stimmen',1,5,1],['spread','Verstimmung',0,40,1],['a','Attack',.001,1,.001],['d','Decay',.01,2,.01],['s','Sustain',0,1,.01],['r','Release',.01,2,.01],['cut','Filter',100,18000,10],['res','Resonanz',.3,14,.1]];
function channelSheet(){
  const t=tr(sel);if(!t)return;
  const shared=padCtx?S.live.reduce((a,c)=>a+(c.ids||[]).filter(x=>x===t.id).length,0):0;
  openSheet(`<h2>${esc(t.name)}</h2><p>${t.sample?'Dein Sample: '+esc(t.sample):'Eingebauter Sound: '+t.src}</p>${shared>1?`<div class="mcR" style="--s:var(--lit)"><b>Dieser Kanal liegt auf ${shared} Pads</b><span>Name, Stumm und Noten gelten für alle diese Pads. Für eine eigene Spur trenne dieses Pad ab.</span></div><div class="row"><button class="act full" id="cSp">Eigenen Kanal für dieses Pad anlegen</button></div>`:''}
  <p style="margin-bottom:4px">Klangquelle</p><div class="segRow" id="cSrc" style="flex-wrap:wrap">${[['','Sample'],['sine','Sinus'],['triangle','Dreieck'],['sawtooth','Säge'],['square','Rechteck']].map(o=>`<button class="act ${(t.syn?t.syn.wave:'')===o[0]?'sel':'alt'}" style="flex:1 1 30%" data-v="${o[0]}">${o[1]}</button>`).join('')}</div>
  ${t.syn?`<p>Der Ton klingt genau so lange wie die Note.</p><div class="syGrid">${SYNS.map(p=>`<label class="fader"><span>${p[1]}: <b id="sy_${p[0]}">${t.syn[p[0]]??SYND[p[0]]}</b></span><input data-y="${p[0]}" type="range" min="${p[2]}" max="${p[3]}" step="${p[4]}" value="${t.syn[p[0]]??SYND[p[0]]}" data-def="${SYND[p[0]]}"></label>`).join('')}</div>`:`<canvas class="ed" id="cW" height="90" aria-label="Waveform, tippen zum Abspielen"></canvas><div class="row"><button class="act ${t.loop?'sel':'alt'} full" id="cLoop">Ton halten: ${t.loop?'An':'Aus'} (Sample wiederholt sich, solange die Note läuft)</button></div>`}
  <div class="row"><button class="act" id="sL">Sample laden</button><button class="act alt" id="sR">Eingebauten Sound nutzen</button><button class="act full" id="cP2">Aus meinen Sounds laden</button><button class="act alt full" id="cM">Muster einfüllen</button>${padCtx?'<button class="act alt" id="cPd">Pad anders belegen</button><button class="act alt" id="cPs">Sound tauschen</button>':''}</div>${padCtx?`<p>Was das Pad macht</p><div class="segRow" id="cAct" style="flex-wrap:wrap">${PADACT.map(o=>`<button class="act ${((padCtx.c.acts&&padCtx.c.acts[padCtx.i])||'play')===o[0]?'sel':'alt'}" style="flex:1 1 45%" data-v="${o[0]}">${o[1]}</button>`).join('')}</div>`:''}
  <label>Name<input id="cN" type="text" maxlength="20" value="${esc(t.name)}"></label>
  <div class="row"><label>Gruppe<select id="cG"><option value="">Keine</option>${S.groups.map(g=>`<option${g===t.group?' selected':''}>${esc(g)}</option>`).join('')}</select></label>
  <label>Mixer-Slot<select id="cS">${S.slots.map((s,i)=>i?`<option value="${i}"${i===t.slot?' selected':''}>${i}: ${esc(s.name)}</option>`:'').join('')}</select></label></div>
  <label>Lautstärke<input id="sV" type="range" min="0" max="120" value="${t.vol*100}" data-def="85"></label>
  <label>Panorama<input id="cP" type="range" min="-100" max="100" value="${t.pan*100}" data-def="0"></label>
  <label><span>Tonhöhe: <span id="sTv">${t.tune>0?'+':''}${t.tune}</span> Halbtöne</span><input id="sT" type="range" min="-24" max="24" value="${t.tune}" data-def="0"></label>
  <label>Start<input id="cSt" type="range" min="0" max="90" value="${(t.start||0)*100}" data-def="0"></label>
  <label>Länge<input id="sD" type="range" min="5" max="100" value="${t.len*100}" data-def="100"></label>
  <div class="colorRow"><span>Farbe</span><input id="cC" type="color" value="${t.color}"></div>
  <div class="bndC"><button class="chip${bound(b=>b.kind==='tvol'&&b.tid===t.id)?' on':''}" id="cBv">Lautstärke live binden</button><button class="chip${bound(b=>b.kind==='tpan'&&b.tid===t.id)?' on':''}" id="cBp">Panorama live binden</button></div><div class="row"><button class="act alt" id="cR">Standard</button><button class="act alt" id="cD">Kanal löschen</button><button class="act full" id="sC">Fertig</button></div>`);
  if(shared>1)$('#cSp').onclick=async()=>{const p=padCtx;fixIds();const n={...t,id:S.nextId++,name:(t.name+' neu').slice(0,20),mute:false};S.tracks.splice(S.tracks.indexOf(t)+1,0,n);wireTrack(n);if(buffers[t.id])buffers[n.id]=buffers[t.id];const f=await idbGet('s'+t.id);if(f)await idbSet('s'+n.id,f);p.c.ids[p.i]=n.id;sel=n.id;drawAll();save();channelSheet();toast('Eigener Kanal angelegt: '+n.name)};
  if(padCtx){$('#cPs').onclick=()=>{const p=padCtx;padSwapStart(p.c,p.i)};$('#cPd').onclick=()=>{const p=padCtx;padAssign(p.c,p.i)};$$('#cAct button').forEach(b=>b.onclick=()=>{const p=padCtx;p.c.acts=p.c.acts||[];p.c.acts[p.i]=b.dataset.v;t.mute=b.dataset.v==='holdo';drawPads();drawRack();save();const y=$('#sheet').scrollTop;channelSheet();$('#sheet').scrollTop=y})}
  $('#cP2').onclick=()=>soundPicker('Sound für '+t.name,async(b,n)=>{await assignBuf(t,b,n);channelSheet();toast(n+' geladen')},channelSheet);
  $('#cBv').onclick=()=>bindSheet({kind:'tvol',tid:t.id,min:0,max:1.2,step:.01,label:`Kanal ${t.name}: Lautstärke`,short:t.name},channelSheet);$('#cBp').onclick=()=>bindSheet({kind:'tpan',tid:t.id,min:-1,max:1,step:.01,label:`Kanal ${t.name}: Panorama`,short:'Pan '+t.name},channelSheet);
  $('#cR').onclick=()=>{Object.assign(t,{vol:.85,pan:0,tune:0,len:1,start:0});if(t.syn)t.syn={wave:t.syn.wave};wireTrack(t);drawAll();save();channelSheet();toast('Auf Standard zurückgesetzt')};
  $('#sL').onclick=()=>{loadTrack=t.id;$('#file').click()};
  $('#sR').onclick=async()=>{delete buffers[t.id];t.sample=null;await idbDel('s'+t.id);drawAll();save();channelSheet()};
  $('#cN').oninput=e=>{t.name=e.target.value||t.src;drawRack();drawPads();save()};
  $('#cG').onchange=e=>{t.group=e.target.value||null;drawRack();drawPads();save()};
  $('#cS').onchange=e=>{t.slot=+e.target.value;wireTrack(t);drawMixer();save()};
  $('#sV').oninput=e=>{t.vol=e.target.value/100;wireTrack(t);save()};
  $('#cP').oninput=e=>{t.pan=e.target.value/100;wireTrack(t);save()};
  $('#sT').oninput=e=>{t.tune=+e.target.value;$('#sTv').textContent=(t.tune>0?'+':'')+t.tune;save()};
  $('#sT').onchange=$('#sD').onchange=$('#cSt').onchange=()=>{if(ctx)trigger(t,ctx.currentTime,0)};
  $$('#cSrc button').forEach(b=>b.onclick=async()=>{await resume();const v=b.dataset.v;t.syn=v?{...(t.syn||{uni:v==='sine'||v==='triangle'?1:3}),wave:v}:null;drawRackWave();save();const y=$('#sheet').scrollTop;channelSheet();$('#sheet').scrollTop=y;trigger(t,ctx.currentTime,0,.5)});
  $$('#sheet [data-y]').forEach(e=>{e.oninput=()=>{t.syn[e.dataset.y]=+e.value;$('#sy_'+e.dataset.y).textContent=e.value;save()};e.onchange=()=>trigger(t,ctx.currentTime,0,.5)});
  if($('#cLoop'))$('#cLoop').onclick=()=>{t.loop=!t.loop;save();channelSheet()};
  const wv=()=>{if($('#cW'))drawWaveOn($('#cW'),trBuf(t),t.start||0,t.len)};wv();if($('#cW'))$('#cW').onclick=async()=>{await resume();trigger(t,ctx.currentTime,0)};$('#cM').onclick=fillSheet;
  $('#sD').oninput=e=>{t.len=e.target.value/100;wv();save()};
  $('#cSt').oninput=e=>{t.start=e.target.value/100;wv();save()};
  $('#cC').oninput=e=>{t.color=e.target.value;drawAll();save()};
  $('#cD').onclick=()=>{if(delTracks([t.id])){closeSheet();toast(t.name+' gelöscht')}};
  $('#sC').onclick=closeSheet;
}
function addChannelSheet(){
  if(S.tracks.length>=MAXCH){toast('Mehr als '+MAXCH+' Kanäle gehen nicht.');return}
  openSheet(`<h2>Neuer Kanal</h2><p>Wähle einen Startsound. Dein eigenes Sample lädst du danach über ⋯.</p><div class="row3">${DEF.map(d=>`<button class="act alt" data-s="${d[0]}">${d[0]}</button>`).join('')}</div><div class="row"><button class="act alt full" id="sC">Abbrechen</button></div>`);
  $$('#sheet [data-s]').forEach(b=>b.onclick=()=>{const d=DEF.find(x=>x[0]===b.dataset.s),t=(fixIds(),mkTrack(S.nextId++,d));if(d[0]==='Melodie')t.syn={wave:'sawtooth'};t.group=groupF||d[3];S.tracks.push(t);wireTrack(t);sel=t.id;drawAll();save();closeSheet()});
  $('#sC').onclick=closeSheet;
}
function groupSheet(){
  openSheet(`<h2>Filtergruppen</h2><p>Mit Gruppen blendest du im Rack und auf den Pads nur bestimmte Kanäle ein.</p>
  ${S.groups.map((g,i)=>`<div class="fxRow" style="grid-template-columns:minmax(0,1fr) 90px"><input type="text" data-g="${i}" maxlength="16" value="${esc(g)}"><button class="act alt" data-d="${i}">Löschen</button></div>`).join('')}
  <div class="row"><button class="act" id="gA">Gruppe hinzufügen</button><button class="act alt" id="sC">Fertig</button></div>`);
  $$('#sheet [data-g]').forEach(e=>e.onchange=()=>{const i=+e.dataset.g,o=S.groups[i],v=e.value.trim()||o;S.groups[i]=v;S.tracks.forEach(t=>{if(t.group===o)t.group=v});if(groupF===o)groupF=v;drawGroups();save()});
  $$('#sheet [data-d]').forEach(e=>e.onclick=()=>{const o=S.groups.splice(+e.dataset.d,1)[0];S.tracks.forEach(t=>{if(t.group===o)t.group=null});if(groupF===o)groupF=null;drawGroups();drawRack();drawPads();save();groupSheet()});
  $('#gA').onclick=()=>{S.groups.push('Gruppe '+(S.groups.length+1));drawGroups();save();groupSheet()};
  $('#sC').onclick=closeSheet;
}

/* ---------- Piano Roll ---------- */
const PR={w:30,h:26,top:24,bot:-24,snap:1,drag:null,fit:false};
const prRow=n=>PR.top-n,prN=y=>PR.top-Math.floor(y/PR.h);
function prCol(){const a=getComputedStyle(document.documentElement);return k=>a.getPropertyValue(k).trim()}
function drawPianoKeys(){const b=$('#prKeys');if(b.children.length)return;for(let n=PR.top;n>=PR.bot;n--){const nm=noteLabel(n),k=el('button','pk'+(nm.includes('#')?' blk':''),nm==='A'||nm==='C'?nm+(Math.floor((n+9)/12)+3+(nm==='C'?0:0)):nm);k.style.height=PR.h+'px';k.onclick=async()=>{await resume();const t=tr(sel);if(t)trigger(t,ctx.currentTime,n)};b.append(k)}}
function drawPiano(){
  if(view!=='ov')return;drawPianoKeys();const c=$('#prCanvas'),P=pat(),L=patLen(P),W=L*PR.w,H=(PR.top-PR.bot+1)*PR.h,dpr=Math.min(2,devicePixelRatio||1);
  c.width=W*dpr;c.height=H*dpr;c.style.width=W+'px';c.style.height=H+'px';
  const g=c.getContext('2d'),C=prCol();g.scale(dpr,dpr);g.fillStyle=C('--well');g.fillRect(0,0,W,H);
  for(let n=PR.top;n>=PR.bot;n--)if(noteLabel(n).includes('#')){g.fillStyle=C('--deep');g.fillRect(0,prRow(n)*PR.h,W,PR.h)}
  g.lineWidth=1;for(let s=0;s<=L;s++){g.strokeStyle=C('--line');g.globalAlpha=s%BAR===0?1:s%4===0?.6:.2;g.beginPath();g.moveTo(s*PR.w+.5,0);g.lineTo(s*PR.w+.5,H);g.stroke()}
  g.strokeStyle=C('--line');g.globalAlpha=.25;for(let r=0;r<=PR.top-PR.bot+1;r++){g.beginPath();g.moveTo(0,r*PR.h+.5);g.lineTo(W,r*PR.h+.5);g.stroke()}g.globalAlpha=1;
  const t=tr(sel);S.tracks.forEach(o=>{if(o.id===sel)return;g.globalAlpha=.22;g.fillStyle=o.color;(P.n[o.id]||[]).forEach(x=>{g.fillRect(x.s*PR.w+1,prRow(x.n)*PR.h+1,x.l*PR.w-2,PR.h-2)})});g.globalAlpha=1;
  if(t)(P.n[sel]||[]).forEach(x=>{const X=x.s*PR.w+1,Y=prRow(x.n)*PR.h+1,w=x.l*PR.w-2;g.fillStyle=t.color;g.fillRect(X,Y,w,PR.h-2);g.fillStyle=C('--well');g.font='700 12px sans-serif';g.fillText(noteLabel(x.n),X+3,Y+18,w-5);g.fillRect(X+w-3,Y+4,1.5,PR.h-10)});
}
function prFocus(){const b=$('#prScroll');if(!b.clientWidth)return;
  if(!PR.fit){PR.fit=true;PR.w=Math.max(16,Math.floor((b.clientWidth-44)/BAR));drawPiano()}
  const a=pat().n[sel]||[],m=a.length?a.reduce((x,y)=>x+y.n,0)/a.length:0,f=a.length?Math.min(...a.map(x=>x.s)):0;b.scrollTop=(PR.top-m+.5)*PR.h-b.clientHeight/2;b.scrollLeft=Math.max(0,f*PR.w-20)}
function prSetBrush(l){PR.brush=l;const b=$('#prBrush');b.style.display=l?'':'none';b.textContent=`Stempel ${l} ✕`;if(l)toast(`Länge ${l} aufgenommen. Tippe auf freie Felder.`)}
function noteSheet(x){const P=pat(),L=patLen(P),draw=()=>{openSheet(`<h2>Note ${noteLabel(x.n)}</h2><p>Feld ${x.s+1}, Länge in Feldern.</p><div class="stp"><span>Länge</span><button class="act alt" id="nL" aria-label="Kürzer">−</button><b>${x.l}</b><button class="act alt" id="nM" aria-label="Länger">+</button></div>
  <div class="row3">${[1,2,3,4,8,16].map(v=>`<button class="act ${x.l===v?'sel':'alt'}" data-l="${v}">${v}</button>`).join('')}</div>
  <div class="row"><button class="act alt" id="nD">Note löschen</button><button class="act" id="sC">Fertig</button></div>`);
  const set=v=>{x.l=Math.max(1,Math.min(L-x.s,v));x.pr=1;drawPiano();refreshGrid();save();draw()};$('#nL').onclick=()=>set(x.l-1);$('#nM').onclick=()=>set(x.l+1);$$('#sheet [data-l]').forEach(b=>b.onclick=()=>set(+b.dataset.l));
  $('#nD').onclick=()=>{P.n[sel]=P.n[sel].filter(y=>y!==x);refreshGrid();save();closeSheet()};$('#sC').onclick=closeSheet};draw()}
function prSelect(){const b=$('#prCh');b.innerHTML=S.tracks.map(t=>`<option value="${t.id}"${t.id===sel?' selected':''}>${esc(t.name)}</option>`).join('')}
function prHit(s,n){return(pat().n[sel]||[]).find(x=>x.n===n&&s>=x.s&&s<x.s+x.l)}
function prPos(e){const r=$('#prCanvas').getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}
function wirePiano(){
  const c=$('#prCanvas');
  let mom=0;
  c.addEventListener('pointerdown',e=>{
    if(PR.drag)return;e.preventDefault();resume();c.setPointerCapture(e.pointerId);cancelAnimationFrame(mom);
    const{x,y}=prPos(e),s=Math.floor(x/PR.w),n=prN(y),hit=prHit(s,n),b=$('#prScroll');
    if(hit){const edge=(hit.s+hit.l)*PR.w-x<Math.min(16,hit.l*PR.w*.45),d=PR.drag={k:edge?'size':'move',x:hit,ds:s-hit.s,moved:false,was:true};d.lp=setTimeout(()=>{if(!d.moved){d.long=true;prSetBrush(hit.l);try{navigator.vibrate&&navigator.vibrate(18)}catch(e){}drawPiano()}},450)}
    else PR.drag={k:'tap',s,n,cx:e.clientX,cy:e.clientY,sl:b.scrollLeft,st:b.scrollTop,vx:0,vy:0,lx:e.clientX,ly:e.clientY,lt:performance.now(),moved:false};
  });
  c.addEventListener('pointermove',e=>{const d=PR.drag;if(!d)return;
    if(d.k==='tap'){const dx=e.clientX-d.cx,dy=e.clientY-d.cy,b=$('#prScroll');if(Math.hypot(dx,dy)>9)d.moved=true;if(!d.moved)return;b.scrollLeft=d.sl-dx;b.scrollTop=d.st-dy;const t=performance.now(),dt=Math.max(1,t-d.lt);d.vx=(d.lx-e.clientX)/dt;d.vy=(d.ly-e.clientY)/dt;d.lx=e.clientX;d.ly=e.clientY;d.lt=t;return}
    const{x,y}=prPos(e),L=patLen(pat()),v=d.x;
    if(d.k==='size'){const l=Math.max(PR.snap,Math.ceil((x/PR.w-v.s)/PR.snap)*PR.snap);if(l!==v.l&&v.s+l<=L){v.l=l;v.pr=1;d.moved=true;clearTimeout(d.lp);drawPiano()}}
    else{const ns=Math.max(0,Math.min(L-v.l,Math.floor((Math.floor(x/PR.w)-d.ds)/PR.snap)*PR.snap)),nn=Math.max(PR.bot,Math.min(PR.top,prN(y)));if(ns!==v.s||nn!==v.n){const pc=nn!==v.n;clearTimeout(d.lp);v.s=ns;v.n=nn;v.pr=1;d.moved=true;if(pc){const t=tr(sel);if(t)trigger(t,ctx.currentTime,nn)}drawPiano()}}});
  const up=()=>{const d=PR.drag;PR.drag=null;if(!d)return;clearTimeout(d.lp);const P=pat();
    if(d.k==='tap'){
      if(d.moved){let{vx,vy}=d,b=$('#prScroll');const go=()=>{b.scrollLeft+=vx*16;b.scrollTop+=vy*16;vx*=.94;vy*=.94;if(Math.abs(vx)+Math.abs(vy)>.03)mom=requestAnimationFrame(go)};if(performance.now()-d.lt<60)go();return}
      const st=Math.floor(d.s/PR.snap)*PR.snap,L=patLen(P),nt={s:st,n:d.n,l:Math.min(PR.brush||PR.snap,L-st),pr:1};if(st>=L||d.n>PR.top||d.n<PR.bot)return;(P.n[sel]=P.n[sel]||[]).push(nt);const t=tr(sel);if(t&&ctx)trigger(t,ctx.currentTime,d.n)
    }else if(d.was&&!d.moved&&!d.long)PR.tapN=d.x;
    drawPiano();refreshGrid();save()};
  c.addEventListener('click',()=>{if(PR.tapN){const n=PR.tapN;PR.tapN=null;noteSheet(n)}});
  $('#prBrush').onclick=()=>{prSetBrush(0);drawPiano()};
  c.addEventListener('pointerup',up);c.addEventListener('pointercancel',()=>{const d=PR.drag;if(d&&d.k==='tap')d.moved=true;up()});
  $('#prCh').onchange=e=>{sel=+e.target.value;drawPiano();drawPads();drawSteps();prFocus()};
  $('#prSnap').onchange=e=>{PR.snap=+e.target.value};
  $('#prZoomIn').onclick=()=>{PR.w=Math.min(60,PR.w+6);drawPiano()};$('#prZoomOut').onclick=()=>{PR.w=Math.max(14,PR.w-6);drawPiano()};
}

/* ---------- Song ---------- */
const SONGROWS=4,SONGBARS=48;let songCells=[];
function drawSong(){
  if(view!=='sv')return;const b=$('#songScroll'),keep=b.scrollLeft;b.innerHTML='';songCells=[];
  const hd=el('div','sRow sBars');hd.append(el('div','sLab',''));for(let i=0;i<SONGBARS;i++){const c=el('div','sc',i+1);c.style.display='flex';c.style.alignItems='center';c.style.justifyContent='center';hd.append(c);(songCells[i]=songCells[i]||[]).push(c)}b.append(hd);
  for(let r=0;r<SONGROWS;r++){const row=el('div','sRow');row.append(el('div','sLab','Spur '+(r+1)));
    for(let i=0;i<SONGBARS;i++){const it=S.song.find(x=>x.r===r&&i>=x.b&&i<x.b+(S.patterns[x.p]?S.patterns[x.p].bars:1)),c=el('button','sc'+(it?(it.b===i?' fill':' cont'):''),it&&it.b===i?S.patterns[it.p].name:'');c.setAttribute('aria-label','Spur '+(r+1)+' Takt '+(i+1));
      c.onclick=()=>{if(it)S.song=S.song.filter(x=>x!==it);else{const B=pat().bars;S.song=S.song.filter(x=>!(x.r===r&&x.b<i+B&&x.b+S.patterns[x.p].bars>i));S.song.push({r,b:i,p:S.cur})}drawSong();save()};row.append(c)}b.append(row)}
  b.scrollLeft=keep;
}

/* ---------- Mixer ---------- */
function drawMixer(){
  const b=$('#mixList');b.innerHTML='';S.slots.forEach((s,i)=>{
    const r=el('div','mx'),n=el('button','');n.style.textAlign='left';n.style.minWidth='0';n.innerHTML=`<span class="mxN" style="display:block">${i?i+': ':''}${esc(s.name)}</span><span class="mxF">${s.fx.length?s.fx.map(f=>FX[f.t].name).join(', '):'Keine Effekte'}</span>`;n.onclick=()=>slotSheet(i);
    const fb=el('label','fader mxL'),f=el('input');f.type='range';f.min=0;f.max=125;f.value=s.vol*100;f.dataset.def=90;f.setAttribute('aria-label',s.name+' Lautstärke');f.oninput=()=>{s.vol=f.value/100;slotVol(i);save()};fb.append(f);
    const m=el('button','mxM'+(s.mute?' on':''),'M');m.setAttribute('aria-label',s.name+' stumm');m.onclick=()=>{s.mute=!s.mute;slotVol(i);drawMixer();save()};
    const t=el('div','mtr'),bar=el('i');bar.dataset.m=i;t.append(bar);r.append(n,fb,m,t);b.append(r)})
}
function meters(){if(view!=='mv')return;const a=new Float32Array(512);$$('.mtr i').forEach(e=>{const s=slotN[+e.dataset.m];if(!s)return;s.an.getFloatTimeDomainData(a);let p=0;for(const x of a)p=Math.max(p,Math.abs(x));e.style.width=Math.min(100,p*100)+'%';e.style.background=p>=1?'var(--rec)':'var(--lit)'})}
function slotSheet(i){
  const s=S.slots[i],canAdd=s.fx.length<6;
  openSheet(`<h2>${i?i+': ':''}${esc(s.name)}</h2><p>Der Sound läuft von oben nach unten durch die Effekte.</p>
  ${i?`<label>Name<input id="slN" type="text" maxlength="16" value="${esc(s.name)}"></label>`:''}
  ${s.fx.map((f,k)=>`<div class="fxRow"><button class="act ${f.on?'':'alt'}" data-on="${k}" aria-label="An oder aus">${f.on?'An':'Aus'}</button><button class="act alt" data-e="${k}">${FX[f.t].name}</button><button class="act alt" data-u="${k}" aria-label="Nach oben">↑</button><button class="act alt" data-x="${k}" aria-label="Entfernen">✕</button></div>`).join('')}
  ${canAdd?`<p style="margin-top:9px">Effekt hinzufügen</p><div class="row3">${Object.keys(FX).map(k=>`<button class="act alt" data-a="${k}">${FX[k].name}</button>`).join('')}</div>`:'<p>Mehr als 6 Effekte pro Slot gehen nicht.</p>'}
  <div class="bndC"><button class="chip${bound(b=>b.kind==='svol'&&b.slot===i)?' on':''}" id="slB">Lautstärke live binden</button></div><div class="row"><button class="act alt" id="slR">Standard</button><button class="act" id="sC">Fertig</button></div>`);
  $('#slB').onclick=()=>bindSheet({kind:'svol',slot:i,min:0,max:1.25,step:.01,label:`Slot ${s.name}: Lautstärke`,short:s.name},()=>slotSheet(i));
  $('#slR').onclick=()=>{s.vol=.9;s.mute=false;s.fx=[];rebuildSlot(i);drawMixer();save();slotSheet(i);toast('Slot zurückgesetzt')};
  const ch=()=>{rebuildSlot(i);drawMixer();save();slotSheet(i)};
  if(i)$('#slN').onchange=e=>{s.name=e.target.value||s.name;drawMixer();save()};
  $$('#sheet [data-a]').forEach(b=>b.onclick=async()=>{await resume();s.fx.push({id:uid(),t:b.dataset.a,on:true,p:FX[b.dataset.a].d()});ch();fxSheet(i,s.fx.length-1)});
  $$('#sheet [data-on]').forEach(b=>b.onclick=()=>{const f=s.fx[+b.dataset.on];f.on=!f.on;ch()});
  $$('#sheet [data-x]').forEach(b=>b.onclick=()=>{s.fx.splice(+b.dataset.x,1);ch()});
  $$('#sheet [data-u]').forEach(b=>b.onclick=()=>{const k=+b.dataset.u;if(k){[s.fx[k-1],s.fx[k]]=[s.fx[k],s.fx[k-1]];ch()}});
  $$('#sheet [data-e]').forEach(b=>b.onclick=()=>fxSheet(i,+b.dataset.e));
  $('#sC').onclick=closeSheet;
}
const fxNode=(i,k)=>slotN[i]&&slotN[i].fxn[k]&&slotN[i].fxn[k].n;
function fxSheet(i,k){
  const f=S.slots[i].fx[k],D=FX[f.t],P=f.p,push=()=>{const n=fxNode(i,k);if(n)n.set();save()};
  let h=`<h2>${D.name}</h2>`;
  if(f.t==='eq')h+=`<p>Ziehe die Punkte: links, rechts für die Frequenz, hoch, runter für die Lautstärke.</p><div class="row3">${Object.keys(EQP).map(n=>`<button class="act alt" data-q="${n}">${n}</button>`).join('')}</div><canvas class="ed" id="eqC" height="220"></canvas><div id="eqI"></div><div class="row"><label><span>Punkt <span id="eqN">1</span></span><select id="eqT">${EQT.map(o=>`<option value="${o[0]}">${o[1]}</option>`).join('')}</select></label><label><span>Breite (Q): <span id="eqQv"></span></span><input id="eqQ" type="range" min=".3" max="10" step=".1" data-def="1"></label></div>`;
  if(f.t==='gate')h+=`<p>Male die Kurve über einen Takt. Obere Zeile: Lautstärke. Untere Zeile: Zeitversatz, damit wird der Sound langsamer, stottert oder stoppt.</p><canvas class="ed" id="gaC" height="240"></canvas><div class="row3">${Object.keys(GATEP).map(n=>`<button class="act alt" data-p="${n}">${n}</button>`).join('')}</div>`;
  if(f.t==='shape')h+=`<p>Male die Kennlinie: Sie zeigt, wie das Signal umgeformt wird. Die Diagonale lässt den Sound unverändert.</p><canvas class="ed" id="wsC" height="240"></canvas><div class="row3">${Object.keys(WSP).map(n=>`<button class="act alt" data-w="${n}">${n}</button>`).join('')}</div><div class="row"><button class="act ${P.sym?'sel':'alt'}" id="wsS">Symmetrisch</button><button class="act ${P.sym?'alt':'sel'}" id="wsF">Frei</button></div>`;
  if(f.t==='delay')h+=`<p>Finger links, rechts: Zeit. Finger hoch, runter: Rückkopplung.</p><canvas class="ed" id="dlX" height="190"></canvas>`;
  if(f.t==='half')h+=`<p>Spielt die Melodie halb so schnell und springt am Ende jedes Abschnitts zurück.</p><div class="row"><button class="act ${P.keep?'':'alt'}" id="hK">Tonhöhe halten</button><button class="act ${P.keep?'alt':''}" id="hT">Oktave tiefer</button></div><label>Abschnitt<select id="hC"><option value="8"${P.cyc==8?' selected':''}>2 Beats</option><option value="16"${P.cyc==16?' selected':''}>1 Takt</option><option value="32"${P.cyc==32?' selected':''}>2 Takte</option></select></label>`;
  if((f.t==='gate'||f.t==='half')&&!workletOK)h+=`<p>Dieser Effekt läuft in diesem Browser nicht. Nimm eine aktuelle Chrome-Version.</p>`;
  if(D.o)h+=`<label>${D.o[1]}<select id="fO">${D.o[2].map(o=>`<option value="${o[0]}"${P[D.o[0]]===o[0]?' selected':''}>${o[1]}</option>`).join('')}</select></label>`;
  const fxDef=D.d();(D.s||[]).forEach(s=>h+=`<label><span>${s[1]}: <span id="v_${s[0]}">${P[s[0]]}</span></span><input data-k="${s[0]}" data-def="${fxDef[s[0]]}" type="range" min="${s[2]}" max="${s[3]}" step="${s[4]}" value="${P[s[0]]}"></label>`);
  ensureFxIds();h+=bindChips(f,i,k);h+=`<div class="row"><button class="act alt" id="fR">Standard</button><button class="act" id="fB">Zurück</button></div>`;openSheet(h);
  wireChips(f,i,k);
  $('#fR').onclick=()=>{f.p=D.d();rebuildSlot(i);save();fxSheet(i,k);toast('Auf Standard zurückgesetzt')};
  $$('#sheet [data-k]').forEach(e=>e.oninput=()=>{P[e.dataset.k]=+e.value;$('#v_'+e.dataset.k).textContent=e.value;push()});
  if(D.o)$('#fO').onchange=e=>{P[D.o[0]]=e.target.value;push()};
  $('#fB').onclick=()=>{edStop();slotSheet(i)};
  if(f.t==='half'){$('#hK').onclick=()=>{P.keep=1;push();fxSheet(i,k)};$('#hT').onclick=()=>{P.keep=0;push();fxSheet(i,k)};$('#hC').onchange=e=>{P.cyc=+e.target.value;push()}}
  if(f.t==='gate'){$$('#sheet [data-p]').forEach(b=>b.onclick=()=>{const[v,t]=GATEP[b.dataset.p];P.vol=P.vol.map((_,j)=>v(j));P.time=P.time.map((_,j)=>t(j));push();drawGate()});gateEd(P,push)}
  if(f.t==='eq'){eqEd(i,k,P,push);$$('#sheet [data-q]').forEach(b=>b.onclick=()=>{P.b=EQP[b.dataset.q].map(x=>({...x}));push();eqPick(0)})}
  if(f.t==='shape')wsEd(i,k,f,P,push);
  if(f.t==='delay'){const c=$('#dlX');xyCanvas(c,190,()=>[(P.steps-1)/11,P.fb/90],(x,y)=>{P.steps=Math.round(x*11)+1;P.fb=Math.round(y*90);['steps','fb'].forEach(a=>{const e=$(`[data-k="${a}"]`);e.value=P[a];$('#v_'+a).textContent=P[a]});push()})}
}
let edRaf=0,drawGate=()=>{},eqPick=()=>{};const edStop=()=>{cancelAnimationFrame(edRaf);edRaf=0};
function sizeCanvas(c,h){const w=c.clientWidth||320,d=Math.min(2,devicePixelRatio||1);c.width=w*d;c.height=h*d;c.style.height=h+'px';const g=c.getContext('2d');g.scale(d,d);return{g,w,h}}
function xyCanvas(c,h,get,set){
  const{g,w}=sizeCanvas(c,h),C=prCol(),draw=()=>{const[x,y]=get();g.clearRect(0,0,w,h);g.strokeStyle=C('--deep');for(let i=1;i<4;i++){g.beginPath();g.moveTo(w*i/4,0);g.lineTo(w*i/4,h);g.moveTo(0,h*i/4);g.lineTo(w,h*i/4);g.stroke()}g.strokeStyle=C('--hot');g.beginPath();g.moveTo(x*w,0);g.lineTo(x*w,h);g.moveTo(0,(1-y)*h);g.lineTo(w,(1-y)*h);g.stroke();g.fillStyle=C('--lit');g.beginPath();g.arc(x*w,(1-y)*h,13,0,7);g.fill()};draw();
  let down=false;const mv=e=>{const r=c.getBoundingClientRect();set(Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),Math.max(0,Math.min(1,1-(e.clientY-r.top)/r.height)));draw()};
  c.onpointerdown=e=>{down=true;c.setPointerCapture(e.pointerId);mv(e)};c.onpointermove=e=>down&&mv(e);c.onpointerup=c.onpointercancel=()=>down=false;
}
function wsEd(i,k,f,P,push){
  const c=$('#wsC'),{g,w,h}=sizeCanvas(c,240),C=prCol(),X=j=>j/8*w,Y=v=>(1-v)/2*h,draw=()=>{g.clearRect(0,0,w,h);g.strokeStyle=C('--deep');for(let j=1;j<8;j++){g.beginPath();g.moveTo(X(j),0);g.lineTo(X(j),h);g.moveTo(0,h*j/8);g.lineTo(w,h*j/8);g.stroke()}g.strokeStyle=C('--line');g.beginPath();g.moveTo(0,h);g.lineTo(w,0);g.stroke();g.strokeStyle=C('--lit');g.lineWidth=2.5;g.beginPath();P.y.forEach((v,j)=>j?g.lineTo(X(j),Y(v)):g.moveTo(0,Y(v)));g.stroke();g.lineWidth=1;g.fillStyle=C('--hot');P.y.forEach((v,j)=>{g.beginPath();g.arc(X(j),Y(v),6,0,7);g.fill()})};draw();
  const set=e=>{const r=c.getBoundingClientRect(),j=Math.max(0,Math.min(8,Math.round((e.clientX-r.left)/r.width*8))),v=Math.max(-1,Math.min(1,1-2*(e.clientY-r.top)/r.height));P.y[j]=Math.round(v*50)/50;if(P.sym)P.y[8-j]=-P.y[j];if(P.sym&&j===4)P.y[4]=0;const n=fxNode(i,k);if(n)n.set();draw()};
  let down=false;c.onpointerdown=e=>{down=true;c.setPointerCapture(e.pointerId);set(e)};c.onpointermove=e=>down&&set(e);c.onpointerup=c.onpointercancel=()=>{if(down){down=false;save()}};
  $$('#sheet [data-w]').forEach(b=>b.onclick=()=>{const F=WSP[b.dataset.w];P.y=P.y.map((_,j)=>F(j/4-1));push();draw()});
  $('#wsS').onclick=()=>{P.sym=1;push();fxSheet(i,S.slots[i].fx.indexOf(f))};$('#wsF').onclick=()=>{P.sym=0;push();fxSheet(i,S.slots[i].fx.indexOf(f))};
}
function gateEd(P,push){
  const c=$('#gaC'),{g,w,h}=sizeCanvas(c,240),H=h/2,C=prCol();
  drawGate=()=>{g.clearRect(0,0,w,h);const bw=w/16;for(let i=0;i<16;i++){g.fillStyle=i%4?C('--deep'):C('--line');g.fillRect(i*bw+1,0,bw-2,H-3);g.fillRect(i*bw+1,H+3,bw-2,H-3);g.fillStyle=C('--lit');const v=P.vol[i]*(H-3);g.fillRect(i*bw+1,H-3-v,bw-2,v);g.fillStyle=C('--ice');g.fillRect(i*bw+1,H+3,bw-2,P.time[i]/8*(H-3))}};drawGate();
  const paint=e=>{const r=c.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top,i=Math.max(0,Math.min(15,Math.floor(x/w*16)));if(lane<0)lane=y<H?0:1;if(lane===0)P.vol[i]=Math.max(0,Math.min(1,1-y/(H-3)));else P.time[i]=Math.round(Math.max(0,Math.min(1,(y-H-3)/(H-3)))*16)/2;drawGate()};
  let lane=-1,down=false;c.onpointerdown=e=>{down=true;lane=-1;c.setPointerCapture(e.pointerId);paint(e)};c.onpointermove=e=>down&&paint(e);c.onpointerup=c.onpointercancel=()=>{if(down){down=false;push()}};
}
function eqEd(i,k,P,push){
  const c=$('#eqC'),{g,w,h}=sizeCanvas(c,220),C=prCol(),X=f=>Math.log(f/20)/Math.log(1000)*w,F=x=>20*Math.pow(1000,x/w),Y=d=>h/2-d/18*(h/2-10),D=y=>Math.max(-18,Math.min(18,(h/2-y)/(h/2-10)*18));
  const fq=new Float32Array(160).map((_,j)=>20*Math.pow(1000,j/159)),mag=new Float32Array(160),ph=new Float32Array(160),sl=slotN[i],spec=new Uint8Array(sl?sl.an.frequencyBinCount:0);
  const paint=()=>{edRaf=requestAnimationFrame(paint);if(!document.body.classList.contains('open')||!$('#eqC'))return edStop();g.clearRect(0,0,w,h);
    g.font='600 10px sans-serif';g.strokeStyle=C('--deep');g.fillStyle=C('--dim');[[30,'30'],[60,'60'],[100,'100'],[200,'200'],[500,'500'],[1000,'1k'],[2000,'2k'],[5000,'5k'],[10000,'10k']].forEach(([f,l])=>{g.beginPath();g.moveTo(X(f),0);g.lineTo(X(f),h);g.stroke();g.fillText(l,X(f)+2,h-3)});[12,6,0,-6,-12].forEach(d=>{g.beginPath();g.moveTo(0,Y(d));g.lineTo(w,Y(d));g.stroke();g.fillText((d>0?'+':'')+d+' dB',w-36,Y(d)-2)});
    if(sl){sl.an.getByteFrequencyData(spec);g.fillStyle=C('--line');g.globalAlpha=.75;const ny=ctx.sampleRate/2;for(let j=0;j<100;j++){const f=20*Math.pow(1000,j/99),v=spec[Math.min(spec.length-1,Math.round(f/ny*spec.length))]/255;g.fillRect(j/99*w,h-v*h,w/99+1,v*h)}g.globalAlpha=1}
    const n=fxNode(i,k),tot=new Float32Array(160).fill(1);if(n&&n.b)n.b.forEach(b=>{b.getFrequencyResponse(fq,mag,ph);for(let j=0;j<160;j++)tot[j]*=mag[j]});
    g.strokeStyle=C('--ice');g.lineWidth=2.5;g.beginPath();for(let j=0;j<160;j++){const y=Y(20*Math.log10(tot[j]));j?g.lineTo(j/159*w,y):g.moveTo(0,y)}g.stroke();g.lineWidth=1;
    P.b.forEach((b,j)=>{const flat=b.t==='highpass'||b.t==='lowpass';g.fillStyle=j===cur?C('--lit'):C('--hot');g.beginPath();g.arc(X(b.f),Y(flat?0:b.g),11,0,7);g.fill();g.fillStyle='#fff';g.font='700 13px sans-serif';g.fillText(j+1,X(b.f)-3.5,Y(flat?0:b.g)+4.5)})};
  const info=()=>{const b=P.b[cur],n=EQT.find(o=>o[0]===(b.t||'peaking'))[1],fl=b.t==='highpass'||b.t==='lowpass';$('#eqI').textContent=`Punkt ${cur+1}, ${n}: ${b.f>=1000?(b.f/1000).toFixed(2)+' kHz':b.f+' Hz'}${fl?'':', '+(b.g>0?'+':'')+b.g+' dB'}, Q ${b.q||1}`};
  let hit=-1,cur=0;edStop();paint();
  eqPick=j=>{cur=j;const b=P.b[j];$('#eqN').textContent=j+1;$('#eqT').value=b.t||(j===0?'lowshelf':j===3?'highshelf':'peaking');$('#eqQ').value=b.q||1;$('#eqQv').textContent=b.q||1;info()};eqPick(0);
  $('#eqT').onchange=e=>{P.b[cur].t=e.target.value;push();info()};$('#eqQ').oninput=e=>{P.b[cur].q=+e.target.value;$('#eqQv').textContent=e.target.value;push();info()};
  c.onpointerdown=e=>{const r=c.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;let best=1e9;hit=-1;P.b.forEach((b,j)=>{const d=Math.hypot(X(b.f)-x,Y(b.g)-y);if(d<best&&d<42){best=d;hit=j}});if(hit>=0){c.setPointerCapture(e.pointerId);eqPick(hit)}};
  c.onpointermove=e=>{if(hit<0)return;const r=c.getBoundingClientRect();P.b[hit].f=Math.round(Math.max(20,Math.min(20000,F(e.clientX-r.left))));P.b[hit].g=Math.round(D(e.clientY-r.top)*2)/2;const n=fxNode(i,k);if(n)n.set();info()};
  c.onpointerup=c.onpointercancel=()=>{if(hit>=0)push();hit=-1};
}

/* ---------- Pattern ---------- */
function drawPatBar(){const e=$('#patName');e.textContent=S.songMode?'Song':(S.cur+1)+': '+pat().name+(queued!==null?'  ▸ '+S.patterns[queued].name:'');e.classList.toggle('queued',queued!==null);$('#songMode').classList.toggle('on',S.songMode)}
function goPat(i){const n=S.patterns.length;i=(i+n)%n;if(playing&&!S.songMode&&i!==S.cur)queued=i;else{queued=null;S.cur=i}drawAll();if(view==='ov')prFocus();save()}
function patSheet(){
  const P=pat();
  openSheet(`<h2>${esc(P.name)}</h2><p>Jedes Pattern hat eigene Noten für alle Kanäle.</p>
  <label>Name<input id="pN" type="text" maxlength="16" value="${esc(P.name)}"></label>
  <label>Länge<select id="pL">${[1,2,4,8].map(b=>`<option value="${b}"${b===P.bars?' selected':''}>${b*BAR} Felder (${b} ${b>1?'Takte':'Takt'})</option>`).join('')}</select></label>
  <div class="row3" id="pList">${S.patterns.map((p,i)=>`<button class="act ${i===S.cur?'sel':'alt'}" data-p="${i}">${i+1}: ${esc(p.name)}</button>`).join('')}</div>
  <div class="row"><button class="act" id="pC">Pattern duplizieren</button><button class="act alt" id="pX">Noten löschen</button><button class="act alt" id="pD">Pattern entfernen</button><button class="act alt" id="sC">Fertig</button></div>`);
  $('#pN').oninput=e=>{P.name=e.target.value||P.name;drawPatBar();save()};
  $('#pL').onchange=e=>{P.bars=+e.target.value;const L=patLen(P);Object.keys(P.n).forEach(k=>P.n[k]=P.n[k].filter(x=>x.s<L));drawAll();save()};
  $$('#pList [data-p]').forEach(b=>b.onclick=()=>{goPat(+b.dataset.p);patSheet()});
  $('#pC').onclick=()=>{if(S.patterns.length>=MAXPAT)return toast('Mehr als '+MAXPAT+' Pattern gehen nicht.');const c=JSON.parse(JSON.stringify(P));c.name=P.name.slice(0,12)+' 2';S.patterns.splice(S.cur+1,0,c);S.song.forEach(x=>{if(x.p>S.cur)x.p++});S.cur++;drawAll();save();patSheet()};
  $('#pX').onclick=()=>{P.n={};drawAll();save();toast('Noten gelöscht');closeSheet()};
  $('#pD').onclick=()=>{if(S.patterns.length<2)return toast('Ein Pattern muss bleiben.');const c=S.cur;S.patterns.splice(c,1);S.song=S.song.filter(x=>x.p!==c);S.song.forEach(x=>{if(x.p>c)x.p--});S.cur=Math.min(c,S.patterns.length-1);queued=null;drawAll();save();closeSheet()};
  $('#sC').onclick=closeSheet;
}

/* ---------- Farben ---------- */
const AREAS=[['body','Hintergrund'],['deep','Knöpfe und Flächen'],['well','Tiefe Bereiche'],['line','Linien'],['ink','Text'],['dim','Leiser Text'],['lit','Akzent 1'],['hot','Akzent 2'],['ice','Akzent 3']];
const THEMES={
 'Tekk-Neon':{body:'#07040f',deep:'#160a2c',well:'#0c0619',line:'#6a2ff0',ink:'#f6efff',dim:'#b49ad8',lit:'#ffd21f',hot:'#ff2a6d',ice:'#22e6ff'},
 'Säure':{body:'#050a05',deep:'#0f1f10',well:'#081208',line:'#3fae2a',ink:'#efffe6',dim:'#9fc79a',lit:'#d9ff00',hot:'#ff3d00',ice:'#00ffa2'},
 'Stroboskop':{body:'#000000',deep:'#161616',well:'#0a0a0a',line:'#6f6f6f',ink:'#ffffff',dim:'#b5b5b5',lit:'#ffffff',hot:'#ff0033',ice:'#ffffff'},
 'Elektro-Blau':{body:'#1b12c4',deep:'#120a8c',well:'#0a0558',line:'#4a40ea',ink:'#f4f2ff',dim:'#b4afee',lit:'#ffe600',hot:'#ff1f8f',ice:'#2df0ff'},
 'Studio-Grau':{body:'#3a4046',deep:'#2b3035',well:'#1d2125',line:'#5c656d',ink:'#eef1f3',dim:'#a6b0b8',lit:'#ff9f2d',hot:'#ff5a36',ice:'#6fd3c7'},
 'Laser-Pink':{body:'#c40f6c',deep:'#8a0a4c',well:'#4e0529',line:'#f04b9e',ink:'#fff0f7',dim:'#f4b4d3',lit:'#fff14d',hot:'#2b0bff',ice:'#42f5d4'},
 'Giftgrün':{body:'#0d6b34',deep:'#084a24',well:'#032a14',line:'#27a65c',ink:'#efffe9',dim:'#a9dcb8',lit:'#d4ff2a',hot:'#ff3fa4',ice:'#57f0ff'},
 'Blutrot':{body:'#a30f14',deep:'#700a0d',well:'#3f0507',line:'#d9413f',ink:'#fff0ea',dim:'#efb0a6',lit:'#ffc61a',hot:'#ffffff',ice:'#ff8a3d'},
 'Tageslicht':{body:'#e7e5f5',deep:'#cbc7ec',well:'#fbfaff',line:'#9791d6',ink:'#160e6e',dim:'#4f4a96',lit:'#1b12c4',hot:'#d4116f',ice:'#00808f'}
};
let TH={name:'Tekk-Neon',c:{...THEMES['Tekk-Neon']},bgOn:false,bgOp:70},bgUrl=null,BGS=[],bgUrls={};
function bgStyle(e){const z=(TH.bgZ??100)/100,x=TH.bgX??50,y=TH.bgY??50;e.style.backgroundPosition=`${x}% ${y}%`;e.style.transformOrigin=`${x}% ${y}%`;e.style.transform=`scale(${z})`}
function setBg(){bgUrl=(TH.bgOn&&bgUrls[TH.bgId])||null;$('#bg .img').style.backgroundImage=bgUrl?`url(${bgUrl})`:'none'}
async function loadBg(){const m=await idbGet('bgs');BGS=m?JSON.parse(m):[];const old=await idbGet('bgimg');if(old&&!BGS.length){const id=Date.now();await idbSet('bg_'+id,old);BGS=[{id,type:'image/png'}];await idbSet('bgs',JSON.stringify(BGS));await idbDel('bgimg');TH.bgId=id}
  for(const b of BGS){if(!bgUrls[b.id]){const ab=await idbGet('bg_'+b.id);if(ab)bgUrls[b.id]=URL.createObjectURL(new Blob([ab],{type:b.type}))}}setBg()}
async function addBg(f){const id=Date.now();await idbSet('bg_'+id,await f.arrayBuffer());BGS.unshift({id,type:f.type});while(BGS.length>3){const o=BGS.pop();await idbDel('bg_'+o.id);if(bgUrls[o.id]){URL.revokeObjectURL(bgUrls[o.id]);delete bgUrls[o.id]}}await idbSet('bgs',JSON.stringify(BGS));Object.assign(TH,{bgId:id,bgOn:true,bgZ:100,bgX:50,bgY:50});await loadBg();applyTheme()}
function bgSheet(){const pv=()=>{const e=$('#bgP .im');if(!e)return;e.style.backgroundImage=bgUrl?`url(${bgUrl})`:'none';bgStyle(e)};
  openSheet(`<h2>Bild anpassen</h2><p>Ziehe das Bild in der Vorschau an die gewünschte Stelle.</p><div id="bgP"><div class="im"></div></div>
  <label><span>Größe: <span id="bgZv">${TH.bgZ??100}</span> %</span><input id="bgZ" type="range" min="50" max="300" value="${TH.bgZ??100}" data-def="100"></label>
  <label><span>Links, rechts: <span id="bgXv">${Math.round(TH.bgX??50)}</span> %</span><input id="bgXr" type="range" min="0" max="100" value="${TH.bgX??50}" data-def="50"></label>
  <label><span>Oben, unten: <span id="bgYv">${Math.round(TH.bgY??50)}</span> %</span><input id="bgYr" type="range" min="0" max="100" value="${TH.bgY??50}" data-def="50"></label>
  <div class="row"><button class="act alt" id="bgR">Standard</button><button class="act" id="bgB">Zurück</button></div>`);pv();
  const up=()=>{applyTheme();pv()},P=$('#bgP');let d=null;
  $('#bgZ').oninput=e=>{TH.bgZ=+e.target.value;$('#bgZv').textContent=TH.bgZ;up()};$('#bgXr').oninput=e=>{TH.bgX=+e.target.value;$('#bgXv').textContent=TH.bgX;up()};$('#bgYr').oninput=e=>{TH.bgY=+e.target.value;$('#bgYv').textContent=TH.bgY;up()};
  P.onpointerdown=e=>{d=[e.clientX,e.clientY,TH.bgX??50,TH.bgY??50];P.setPointerCapture(e.pointerId)};P.onpointermove=e=>{if(!d)return;const r=P.getBoundingClientRect();TH.bgX=Math.max(0,Math.min(100,d[2]-(e.clientX-d[0])/r.width*100));TH.bgY=Math.max(0,Math.min(100,d[3]-(e.clientY-d[1])/r.height*100));$('#bgXr').value=TH.bgX;$('#bgYr').value=TH.bgY;$('#bgXv').textContent=Math.round(TH.bgX);$('#bgYv').textContent=Math.round(TH.bgY);up()};P.onpointerup=P.onpointercancel=()=>d=null;
  $('#bgR').onclick=()=>{Object.assign(TH,{bgZ:100,bgX:50,bgY:50});applyTheme();bgSheet()};$('#bgB').onclick=themeSheet}
function applyTheme(){const R=document.documentElement.style;Object.entries(TH.c).forEach(([k,v])=>R.setProperty('--'+k,v));const on=TH.bgOn&&bgUrl,op=(TH.bgOp??70)/100,A=Math.round((1-op*.65)*255).toString(16).padStart(2,'0');R.setProperty('--deepA',on?TH.c.deep+A:TH.c.deep);R.setProperty('--wellA',on?TH.c.well+A:TH.c.well);$('#bg .img').style.opacity=on?op:0;bgStyle($('#bg .img'));$('#bg .grid').style.display=on?'none':'';const m=$('meta[name=theme-color]');if(m)m.content=TH.c.body;if(view==='ov')drawPiano();saveTheme()}
function saveTheme(){try{localStorage.setItem('tekk-theme2',JSON.stringify(TH))}catch(e){}idbSet('theme2',JSON.stringify(TH))}
function themeSheet(){
  openSheet(`<h2>Farben</h2><p>Wähle ein Theme oder färbe jeden Bereich selbst.</p>
  <div class="row">${Object.entries(THEMES).map(([n,c])=>`<button class="act ${TH.name===n?'sel':'alt'}" data-t="${n}">${n}<span class="prev">${['body','deep','lit','hot','ice'].map(k=>`<i style="background:${c[k]}"></i>`).join('')}</span></button>`).join('')}</div>
  ${AREAS.map(([k,l])=>`<label class="colorRow"><span>${l}</span><input type="color" data-c="${k}" value="${TH.c[k]}"></label>`).join('')}
  <h3>Hintergrundbild</h3><div class="bgT">${[0,1,2].map(i=>{const b=BGS[i];return b?`<button class="bgS${TH.bgOn&&TH.bgId===b.id?' on':''}" data-b="${b.id}" style="background-image:url(${bgUrls[b.id]||''})" aria-label="Bild ${i+1} wählen"></button>`:`<button class="bgS leer" data-n="1" aria-label="Bild laden">+</button>`}).join('')}</div>
  <div class="row"><button class="act" id="bgL">Neues Bild laden</button><button class="act alt" id="bgA">Bild anpassen</button><button class="act alt full" id="bgX">Kein Bild</button></div>
  <label><span>Sichtbarkeit: <span id="bgV">${TH.bgOp??70}</span> %</span><input id="bgO" type="range" min="10" max="100" value="${TH.bgOp??70}"></label>
  <div class="row"><button class="act alt" id="thR">Standard</button><button class="act" id="sC">Fertig</button></div>`);
  $('#bgL').onclick=()=>$('#imgFile').click();$('#bgA').onclick=()=>bgUrl?bgSheet():toast('Wähle zuerst ein Bild.');$('#bgX').onclick=()=>{TH.bgOn=false;setBg();applyTheme();themeSheet()};
  $$('#sheet [data-b]').forEach(b=>b.onclick=()=>{TH.bgId=+b.dataset.b;TH.bgOn=true;setBg();applyTheme();themeSheet()});$$('#sheet [data-n]').forEach(b=>b.onclick=()=>$('#imgFile').click());
  $('#bgO').oninput=e=>{TH.bgOp=+e.target.value;$('#bgV').textContent=e.target.value;applyTheme()};
  $('#thR').onclick=()=>{TH={name:'Tekk-Neon',c:{...THEMES['Tekk-Neon']},bgOn:false,bgOp:70};setBg();applyTheme();themeSheet();toast('Farben zurückgesetzt')};
  $$('#sheet [data-t]').forEach(b=>b.onclick=()=>{TH={...TH,name:b.dataset.t,c:{...THEMES[b.dataset.t]}};applyTheme();themeSheet()});
  $$('#sheet [data-c]').forEach(e=>e.oninput=()=>{TH.c[e.dataset.c]=e.value;TH.name='Eigenes';applyTheme()});
  $('#sC').onclick=closeSheet;
}

/* ---------- Menü und Sheets ---------- */
function openSheet(h){edStop();$('#sheet').innerHTML=h;document.body.classList.add('open');$('#sheet').scrollTop=0}
function closeSheet(){padCtx=null;edStop();document.body.classList.remove('open')}
function toast(t){const e=$('#toast');e.textContent=t;e.style.display='block';clearTimeout(e._t);e._t=setTimeout(()=>e.style.display='none',2600)}
function menuSheet(){
  openSheet(`<h2>Menü</h2><p>Änderungen werden automatisch auf diesem Gerät gespeichert.${idbOK?'':' Dieser Browser speichert hier nicht dauerhaft. Sichere dein Projekt deshalb als Datei.'}</p>
  <div class="row"><button class="act full" id="mT">Farben</button><button class="act alt full" id="mP">Leistung</button><button class="act" id="mE">Projekt als Datei sichern</button><button class="act alt" id="mI">Projekt-Datei öffnen</button>
  ${window.TekkNative?`<button class="act alt full" id="mU">Nach Updates suchen (Version 1.${TekkNative.version()})</button>`:''}<button class="act alt full" id="mN">Neu anfangen</button><button class="act alt full" id="mQ">Fertig</button></div>`);
  if(window.TekkNative)$('#mU').onclick=()=>checkUpdate(false);$('#mT').onclick=themeSheet;$('#mP').onclick=perfSheet;$('#mE').onclick=exportProject;$('#mI').onclick=()=>$('#projFile').click();$('#mQ').onclick=closeSheet;
  $('#mN').onclick=()=>{openSheet(`<h2>Neu anfangen?</h2><p>Alle Pattern und geladenen Samples werden aus der App gelöscht. Sichere dein Projekt vorher als Datei, wenn du es behalten willst.</p><div class="row"><button class="act" id="nY">Alles löschen</button><button class="act alt" id="nN">Abbrechen</button></div>`);
    $('#nN').onclick=menuSheet;$('#nY').onclick=async()=>{for(const t of S.tracks){await idbDel('s'+t.id);delete buffers[t.id]}S=defaultState();sel=0;groupF=null;applyState();save();closeSheet();toast('Neues Projekt gestartet')}};
}
function fixIds(){const seen=new Set();let mx=-1;S.tracks.forEach(t=>{if(Number.isFinite(t.id))mx=Math.max(mx,t.id)});
  S.tracks.forEach(t=>{if(Number.isFinite(t.id)&&!seen.has(t.id)){seen.add(t.id);return}const o=t.id,n=++mx;S.patterns.forEach(p=>{if(p.n[o])p.n[n]=JSON.parse(JSON.stringify(p.n[o]))});t.id=n;seen.add(n);
    if(buffers[o])buffers[n]=buffers[o];idbGet('s'+o).then(f=>{if(f)idbSet('s'+n,f)});wireTrack(t)});S.nextId=mx+1}
function applyState(){fixIds();if(ctx){S.slots.forEach((_,i)=>{if(!slotN[i])makeSlot(i)});S.slots.forEach((_,i)=>rebuildSlot(i));S.tracks.forEach(wireTrack)}$('#bpm').textContent=S.bpm;queued=null;if(!tr(sel))sel=S.tracks[0].id;drawAll()}
function refreshGrid(){drawSteps();if(view==='rv'){drawRack()}if(view==='ov')drawPiano()}
function drawAll(){ensureFxIds();drawLive();drawPatBar();drawSteps();drawPads();drawGroups();drawRack();prSelect();drawPiano();drawSong();drawMixer()}
function drawPlayhead(){
  if(view==='lv')drawSteps();if(rackPh)rackPh.forEach(e=>e.classList.remove('ph'));rackPh=null;
  if(view==='rv'&&phPos>=0){const c=rackCells[S.songMode?phPos%(patLen(pat())):phPos];if(c){c.forEach(e=>e.classList.add('ph'));rackPh=c}}
  const h=$('#prHead');if(view==='ov'&&phPos>=0){h.style.display='block';h.style.height=$('#prInner').offsetHeight+'px';h.style.transform=`translateX(${(phPos%patLen(pat()))*PR.w}px)`}else h.style.display='none';
  songCells.forEach(a=>a.forEach(e=>e.classList.remove('ph')));if(view==='sv'&&S.songMode&&phPos>=0){const c=songCells[Math.floor(phPos/BAR)];if(c)c.forEach(e=>e.classList.add('ph'))}
}
let pulse=0;const FL=()=>$$('#bg .l');let flE=null,lE=null;
function beatFx(){if(!flE){flE=$('#bg .flash');lE=FL()}if(pulse<.01)return;pulse*=.86;flE.style.opacity=pulse*.8;lE.forEach(e=>e.style.opacity=.1+pulse*.75)}
function frame(n){requestAnimationFrame(frame);perfTick(n||0);meters();beatFx();if(!ctx||!playing)return;const t=ctx.currentTime-(ctx.outputLatency||0);let ch=false;
  while(uiQ.length&&uiQ[0].t<=t){const q=uiQ.shift();if(q.redraw){drawAll();continue}phPos=q.p;ch=true;if(q.p%4===0)pulse=1;if(mode!=='note'&&view==='lv')q.hits.forEach(id=>$$(`.pad[data-id="${id}"]`).forEach(flash))}
  if(ch)drawPlayhead()}

/* ---------- Speichern ---------- */
let db=null,idbOK=true,saveT=0;
const openDb=()=>new Promise(r=>{try{const q=indexedDB.open('tekkbox',1);q.onupgradeneeded=()=>q.result.createObjectStore('kv');q.onsuccess=()=>{db=q.result;r()};q.onerror=()=>{idbOK=false;r()}}catch(e){idbOK=false;r()}});
const tx=(m,f)=>new Promise(r=>{if(!db)return r(null);try{const q=f(db.transaction('kv',m).objectStore('kv'));q.onsuccess=()=>r(q.result);q.onerror=()=>r(null)}catch(e){r(null)}});
const idbGet=k=>tx('readonly',s=>s.get(k)),idbSet=(k,v)=>tx('readwrite',s=>s.put(v,k)),idbDel=k=>tx('readwrite',s=>s.delete(k));
function save(){clearTimeout(saveT);saveT=setTimeout(()=>idbSet('state',JSON.stringify(S)),300)}
const b64=ab=>{let s='';const u=new Uint8Array(ab),c=32768;for(let i=0;i<u.length;i+=c)s+=String.fromCharCode.apply(null,u.subarray(i,i+c));return btoa(s)};
const unb64=s=>{const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u.buffer};
const REPO='brucknerjulian55-netizen/tekkbox';
async function deliver(name,blob,share){
  const N=window.TekkNative;
  if(N){const ab=await blob.arrayBuffer(),sz=1<<19;N.begin(name,blob.type||'application/json');for(let i=0;i<ab.byteLength;i+=sz)N.chunk(b64(ab.slice(i,i+sz)));if(share){N.finish(true);return true}const r=N.saveDownload();if(r>=0)toast(`Gespeichert in Download/Tekkbox: ${name} (${Math.max(1,Math.round(r/1024))} KB)`);return true}
  const a=el('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.append(a);a.click();a.remove();return false}
async function checkUpdate(silent){
  const N=window.TekkNative;if(!N)return;
  try{const r=await fetch('https://api.github.com/repos/'+REPO+'/releases/latest');if(!r.ok)throw 0;const d=await r.json(),v=+String(d.tag_name).replace(/\D/g,''),a=(d.assets||[]).find(x=>/\.apk$/.test(x.name));
    if(v>N.version()&&a){if(silent)toast('Update verfügbar: im Menü laden');else{openSheet(`<h2>Update verfügbar</h2><p>Version 1.${v} ist da. Der Browser lädt die Datei, danach tippst du auf Installieren. Deine Projekte bleiben erhalten.</p><div class="row"><button class="act" id="uY">Update laden</button><button class="act alt" id="sC">Später</button></div>`);$('#uY').onclick=()=>N.openUrl(a.browser_download_url);$('#sC').onclick=closeSheet}}
    else if(!silent)toast('Du hast die neueste Version.')}
  catch(e){if(!silent)toast('Keine Verbindung. Prüfe dein Internet.')}}
window.TekkBack=()=>{if(document.body.classList.contains('open')){closeSheet();return true}return false};
async function exportProject(){const samples={};for(const t of S.tracks){const f=await idbGet('s'+t.id);if(f)samples[t.id]=b64(f)}
  const d=new Date(),P2=n=>String(n).padStart(2,'0'),nm=`tekkbox-${d.getFullYear()}-${P2(d.getMonth()+1)}-${P2(d.getDate())}_${P2(d.getHours())}-${P2(d.getMinutes())}.json`;try{await deliver(nm,new Blob([JSON.stringify({tekkbox:2,state:S,samples})],{type:'application/json'}),false);if(!window.TekkNative)toast('Projekt gesichert: '+nm)}catch(e){toast('Das Speichern ist fehlgeschlagen. Probiere es noch einmal.')}}
async function importProject(file){
  try{const d=JSON.parse(await file.text());if(!d.tekkbox||!d.state||!d.state.patterns)throw 0;await resume();for(const t of S.tracks){await idbDel('s'+t.id);delete buffers[t.id]}S=migrate(d.state);
    for(const k of Object.keys(d.samples||{})){const ab=unb64(d.samples[k]);await idbSet('s'+k,ab);buffers[k]=await ctx.decodeAudioData(ab.slice(0))}applyState();save();closeSheet();toast('Projekt geöffnet')}
  catch(e){toast(file.size===0?'Diese Datei ist leer (0 KB). Sie stammt von der alten Speicherfunktion.':'Diese Datei ist kein Tekkbox-Projekt.')}}
async function loadSample(file){await resume();
  try{const ab=await file.arrayBuffer(),buf=await ctx.decodeAudioData(ab.slice(0)),t=tr(loadTrack);buffers[t.id]=buf;t.sample=file.name.replace(/\.[^.]+$/,'');await idbSet('s'+t.id,ab);drawAll();save();sel=t.id;trigger(t,ctx.currentTime,0);channelSheet();toast('Sample geladen')}
  catch(e){toast('Diese Datei lässt sich nicht lesen. Probiere WAV oder MP3.')}}

/* ---------- Verdrahtung ---------- */
function clearTimeoutIfMoved(){}
function setView(v){view=v;if(v!=='rv'&&rackSel)rackEnd();if(v!=='lv')parkBlocks();$$('.view').forEach(e=>e.classList.toggle('on',e.id===v));$$('#nav button').forEach(b=>b.classList.toggle('on',b.dataset.v===v));if(v==='rv')drawRack();if(v==='ov'){prSelect();drawPiano();prFocus()}if(v==='sv')drawSong();if(v==='mv')drawMixer();if(v==='bv')drawBuild();if(v==='lv')drawLive();drawPlayhead()}
function holdBtn(e,on,off){e.addEventListener('pointerdown',async ev=>{ev.preventDefault();e.setPointerCapture&&e.setPointerCapture(ev.pointerId);await resume();e.classList.add('on');on()});['pointerup','pointercancel','lostpointercapture'].forEach(n=>e.addEventListener(n,()=>{e.classList.remove('on');off()}))}
function bpmBtn(e,d){let h;const set=()=>{S.bpm=Math.min(260,Math.max(100,S.bpm+d));$('#bpm').textContent=S.bpm;if(ctx){echoDl.delayTime.value=stepDur()*LE.st;slotN.forEach(s=>s.fxn.forEach(f=>f.n&&f.n.set()));allTF()}save()};
  e.addEventListener('pointerdown',ev=>{ev.preventDefault();set();h=setTimeout(()=>h=setInterval(set,70),350)});['pointerup','pointercancel','pointerleave'].forEach(n=>e.addEventListener(n,()=>{clearTimeout(h);clearInterval(h)}))}
$('#liveEditBtn').onclick=()=>{liveEdit=!liveEdit;drawLive()};$('#liveAddB').onclick=()=>addLive('btn');$('#liveAddS').onclick=()=>addLive('slider');$('#liveAddX').onclick=()=>addLive('xy');$('#liveAddK').onclick=()=>addLive('knob');$('#liveClear').onclick=liveClearSheet;$('#swapX').onclick=()=>{padSwap=null;swapBar();drawPads()};$('#liveAddBd').onclick=bindPick;$('#liveAddV').onclick=presetSheet;$('#liveAddP').onclick=()=>addBlock('pads');$('#liveAddT').onclick=()=>addBlock('steps');$('#liveAddF').onclick=()=>addBlock('fx');$('#mixChk').onclick=mixCheck;$('#liveSize').onclick=areaSheet;
document.addEventListener('pointermove',e=>{if(rackDrag)rackPickAt(e.clientX,e.clientY);else if(rackLP)clearTimeoutIfMoved(e)},true);
['pointerup','pointercancel'].forEach(n=>document.addEventListener(n,()=>{clearTimeout(rackLP);rackLP=0;rackDrag=false},true));
$('#rackScroll').addEventListener('touchmove',e=>{if(rackDrag)e.preventDefault()},{passive:false});
$('#rsX').onclick=()=>{const P=pat();rackSel.forEach(id=>delete P.n[id]);refreshGrid();save();toast('Kanäle im Pattern geleert');rackEnd()};
$('#rsA').onclick=()=>{visTracks().forEach(t=>rackSel.add(t.id));rackMark()};$('#rsQ').onclick=rackEnd;
$('#rsS').onclick=()=>{const a=[...rackSel];if(a.length===2){rackSwap(a[0],a[1]);rackEnd();return}if(a.length===1){rackSwapFrom=a[0];toast('Tippe den Kanal an, mit dem getauscht wird.');return}toast('Wähle einen oder zwei Kanäle.')};
$('#rsD').onclick=()=>{const ids=[...rackSel];openSheet(`<h2>${ids.length} ${ids.length>1?'Kanäle':'Kanal'} löschen?</h2><p>Die Kanäle verschwinden mit ihren Noten aus allen Pattern.</p><div class="row"><button class="act" id="dY">Löschen</button><button class="act alt" id="sC">Abbrechen</button></div>`);$('#dY').onclick=()=>{if(delTracks(ids)){rackEnd();toast('Gelöscht')}closeSheet()};$('#sC').onclick=closeSheet};
$('#prFill').onclick=fillSheet;
$('#rackWave').onclick=async()=>{await resume();const t=tr(sel);if(t)trigger(t,ctx.currentTime,0)};
$('#go').onclick=async()=>{$('#hint').style.display='none';await resume()};
$('#play').onclick=togglePlay;$('#rec').onclick=()=>{recOn=!recOn;$('#rec').classList.toggle('on',recOn)};
$('#menu').onclick=menuSheet;$('#sheetBg').onclick=closeSheet;window.addEventListener('resize',()=>{if(view==='lv')drawLive()});$('#soundBtn').onclick=channelSheet;
$('#patPrev').onclick=()=>goPat((queued??S.cur)-1);$('#patNext').onclick=()=>goPat((queued??S.cur)+1);$('#patName').onclick=patSheet;
$('#patAdd').onclick=()=>{if(S.patterns.length>=MAXPAT)return toast('Mehr als '+MAXPAT+' Pattern gehen nicht.');S.patterns.push(newPat('Pattern '+(S.patterns.length+1)));goPat(S.patterns.length-1)};
$('#songMode').onclick=()=>{S.songMode=!S.songMode;queued=null;pos=0;drawPatBar();save()};
$$('.seg').forEach(b=>b.onclick=()=>setMode(b.dataset.m));$$('#nav button').forEach(b=>b.onclick=()=>setView(b.dataset.v));
bpmBtn($('#bpmDn'),-1);bpmBtn($('#bpmUp'),1);
const fil=$('#filter');fil.oninput=()=>setFilter(+fil.value);['pointerup','pointercancel','touchend'].forEach(n=>fil.addEventListener(n,()=>{fil.value=0;setFilter(0)}));$('#drive').oninput=setDrive;
$$('.hold[data-h]').forEach(e=>{const h=e.dataset.h;holdBtn(e,()=>{if(h==='echo')echoIn.gain.setTargetAtTime(.8,ctx.currentTime,.01);else roll=h==='r16'?16:32},()=>{if(h==='echo'){if(ctx)echoIn.gain.setTargetAtTime(0,ctx.currentTime,.02)}else roll=0})});
$('#packFile').onchange=e=>{const f=e.target.files[0];e.target.value='';if(f)importPack(f)};
$('#libFile').onchange=e=>{const f=e.target.files[0];e.target.value='';if(f)importAudio(f)};
$$('#bTabs .seg').forEach(b=>b.onclick=()=>{bTab=b.dataset.b;drawBuild()});
let filePick=null;
$('#file').onchange=e=>{const f=e.target.files[0];e.target.value='';if(!f)return;if(filePick){const c=filePick;filePick=null;c(f)}else loadSample(f)};
$('#imgFile').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;await addBg(f);if(document.body.classList.contains('open'))themeSheet();toast('Hintergrund geladen')};
$('#projFile').onchange=e=>{const f=e.target.files[0];e.target.value='';if(f)importProject(f)};
let lpT=0,lpX=0,lpY=0;const rstE=$('#rst'),hideRst=()=>{rstE.style.display='none';rstE._r=null};
rstE.onclick=()=>{const r=rstE._r;if(r){r.value=r.dataset.def;r.dispatchEvent(new Event('input',{bubbles:true}));r.dispatchEvent(new Event('change',{bubbles:true}));toast('Auf Standard zurückgesetzt')}hideRst()};
document.addEventListener('pointerdown',e=>{if(e.target===rstE)return;hideRst();const box=e.target.closest&&e.target.closest('label,.fader'),a=$('.armedBox');if(a&&a!==box)disarm();
  const r=box&&box.querySelector('input[type=range]');clearTimeout(lpT);if(r&&r.dataset.def!==undefined){lpX=e.clientX;lpY=e.clientY;lpT=setTimeout(()=>{rstE.textContent='Auf Standard zurücksetzen';rstE._r=r;rstE.style.left=Math.max(120,Math.min(innerWidth-120,lpX))+'px';rstE.style.top=Math.max(60,lpY)+'px';rstE.style.display='block';try{navigator.vibrate&&navigator.vibrate(18)}catch(x){}},480)}},true);
document.addEventListener('pointermove',e=>{if(Math.hypot(e.clientX-lpX,e.clientY-lpY)>12)clearTimeout(lpT)},true);
['pointerup','pointercancel'].forEach(n=>document.addEventListener(n,()=>clearTimeout(lpT),true));
document.addEventListener('contextmenu',e=>{if(e.target.closest&&e.target.closest('label,.fader'))e.preventDefault()},true);
const disarm=()=>{$$('input.armed').forEach(e=>e.classList.remove('armed'));$$('.armedBox').forEach(e=>e.classList.remove('armedBox'))};
document.addEventListener('click',e=>{const box=e.target.closest&&e.target.closest('label,.fader');const r=box&&box.querySelector('input[type=range]:not(.free)');if(r&&!r.classList.contains('armed')){disarm();r.classList.add('armed');box.classList.add('armedBox')}else if(!r)disarm()},true);
window.addEventListener('pagehide',()=>{if(db)idbSet('state',JSON.stringify(S))});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&db)idbSet('state',JSON.stringify(S))});
wirePiano();
(async()=>{
  try{const j=localStorage.getItem('tekk-theme2');if(j)TH=JSON.parse(j)}catch(e){}
  await openDb();
  try{const j=await idbGet('theme2');if(j)TH=JSON.parse(j);await loadBg();const l=await idbGet('lib');if(l)LIB=JSON.parse(l);const lp=await idbGet('livep');if(lp)LIVEP=JSON.parse(lp);const s=await idbGet('state');if(s){const d=JSON.parse(s);if(d.patterns&&d.patterns.length)S=migrate(d)}}catch(e){}
  applyTheme();applyState();requestAnimationFrame(frame);checkUpdate(true)
})();
window.TEKK={get S(){return S},get ctx(){return ctx},get buffers(){return buffers},get builtin(){return builtin},get slotN(){return slotN},get workletOK(){return workletOK},get TH(){return TH},PERF,fill(){TEKK.S.slots.forEach((s,i)=>{s.fx.forEach(f=>f.p=FX[f.t].d());rebuildSlot(i)})},get voices(){return voices},get sel(){return sel},get LIB(){return LIB},GALLERY,renderPatch};
