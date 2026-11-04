/* ---------- Bau-Modus: Synthesizer, Galerie, Ordner, Packs ---------- */
const PD={w1:'saw',lvl:1,semi1:0,w2:'saw',mix2:0,semi2:0,uni:1,spread:10,chord:'none',freq:55,penv:0,pt:.05,a:.001,d:.2,s:0,r:.02,len:.3,ft:'lowpass',cut:18000,res:.7,fe:0,fd:.1,n:0,nd:.1,nhp:1000,drive:0,click:0};
const CHORDS={none:[0],moll:[0,3,7],dur:[0,4,7],quinte:[0,7,12],moll7:[0,3,7,10],oktave:[0,12]};
const WAVES={saw:'sawtooth',square:'square',sine:'sine',tri:'triangle'},WN={saw:'Säge',square:'Rechteck',sine:'Sinus',tri:'Dreieck'},CN={none:'Einzelton',moll:'Moll',dur:'Dur',quinte:'Quinte',moll7:'Moll 7',oktave:'Oktave'};
const G=(name,cat,o)=>({name,cat,patch:{...PD,...o}});
const GALLERY=[
 G('Hard Kick','Kicks',{w1:'sine',freq:52,penv:36,pt:.07,d:.3,len:.42,drive:55,click:.4}),
 G('Punch Kick','Kicks',{w1:'sine',freq:58,penv:30,pt:.05,d:.2,len:.3,drive:35,click:.5}),
 G('Tekk-Kick mit Bass','Kicks',{w1:'sine',freq:49,penv:40,pt:.06,d:.5,s:.25,len:.6,drive:75,click:.3}),
 G('Rumble Kick','Kicks',{w1:'sine',freq:45,penv:32,pt:.08,d:.6,s:.3,len:.8,drive:85,cut:1100,click:.2}),
 G('Zerrt-Kick','Kicks',{w1:'tri',freq:55,penv:42,pt:.06,d:.28,len:.38,drive:100,cut:7000,click:.3}),
 G('Kurze Kick','Kicks',{w1:'sine',freq:62,penv:34,pt:.04,d:.12,len:.17,drive:45,click:.6}),
 G('Offbeat-Bass','Bass',{w1:'saw',mix2:.7,w2:'saw',uni:2,spread:8,freq:55,d:.17,s:.5,r:.04,len:.22,cut:180,res:7,fe:3,fd:.15,drive:30}),
 G('Reese-Bass','Bass',{w1:'saw',w2:'saw',mix2:.8,semi2:0,uni:5,spread:22,freq:55,d:.4,s:.9,r:.06,len:.5,cut:700,res:3,drive:35}),
 G('Square-Bass','Bass',{w1:'square',freq:55,d:.2,s:.4,len:.26,cut:500,res:4,fe:2,fd:.1,drive:20}),
 G('Sub-Bass','Bass',{w1:'sine',freq:55,d:.3,s:.8,r:.05,len:.4,drive:15}),
 G('Closed Hat','Hats',{lvl:0,n:1,nd:.04,nhp:8500,len:.08}),
 G('Offbeat Hat','Hats',{lvl:0,n:1,nd:.11,nhp:7500,len:.15}),
 G('Open Hat','Hats',{lvl:0,n:1,nd:.28,nhp:6500,len:.35}),
 G('Shaker','Hats',{lvl:0,n:.8,nd:.07,nhp:4500,len:.11}),
 G('Tight Snare','Snares',{w1:'tri',freq:190,penv:12,pt:.03,d:.1,len:.2,n:.9,nd:.13,nhp:1700}),
 G('Rave Snare','Snares',{w1:'tri',freq:230,penv:16,pt:.03,d:.14,len:.3,n:1,nd:.22,nhp:1100,drive:40}),
 G('Noise Snare','Snares',{lvl:0,n:1,nd:.18,nhp:1400,len:.24,drive:25}),
 G('Fette Clap','Snares',{lvl:0,n:1,nd:.2,nhp:1000,len:.26,drive:30,click:.3}),
 G('Rave Stab','Stabs',{w1:'saw',w2:'saw',mix2:.7,semi2:12,uni:3,spread:12,chord:'moll',freq:220,d:.4,len:.5,cut:900,res:4,fe:3,fd:.3}),
 G('Dur Stab','Stabs',{w1:'saw',uni:3,spread:12,chord:'dur',freq:220,d:.35,len:.45,cut:1100,res:3,fe:2.5,fd:.25}),
 G('Hoover Stab','Stabs',{w1:'saw',w2:'saw',mix2:.8,semi2:-12,uni:5,spread:20,freq:220,penv:-5,pt:.12,a:.01,d:.5,s:.5,r:.1,len:.7,cut:3400,drive:30}),
 G('Quinten Stab','Stabs',{w1:'square',mix2:.6,w2:'saw',chord:'quinte',freq:220,d:.3,len:.4,cut:1600,res:2,fe:2,fd:.2}),
 G('Orgel Stab','Stabs',{w1:'square',mix2:.5,w2:'sine',semi2:12,chord:'moll7',freq:220,d:.25,s:.3,len:.35,cut:2600}),
 G('Pluck Melodie','Melodien',{w1:'saw',w2:'square',mix2:.5,uni:3,spread:9,freq:220,d:.22,len:.3,cut:900,res:3,fe:3.5,fd:.14}),
 G('Tekk Lead','Melodien',{w1:'saw',w2:'saw',mix2:.8,semi2:7,uni:5,spread:14,freq:220,a:.003,d:.3,s:.75,r:.08,len:.6,cut:5000,res:1.5,drive:30}),
 G('Sägen-Lead','Melodien',{w1:'saw',uni:7,spread:18,freq:220,a:.005,d:.2,s:.8,r:.1,len:.7,cut:8000})
];
const SYN=[['Oszillatoren',[['lvl','Lautstärke Osz. 1',0,1,.01],['semi1','Osz. 1 Halbtöne',-36,36,1],['mix2','Lautstärke Osz. 2',0,1,.01],['semi2','Osz. 2 Halbtöne',-36,36,1],['uni','Stimmen',1,7,1],['spread','Verstimmung',0,50,1]]],
 ['Tonhöhe',[['freq','Grundton (Hz)',30,880,1],['penv','Pitch-Hüllkurve',-48,60,1],['pt','Pitch-Zeit',.005,.4,.005]]],
 ['Lautstärke',[['a','Attack',.001,1,.001],['d','Decay',.01,2,.01],['s','Sustain',0,1,.01],['r','Release',.01,1,.01],['len','Länge (s)',.05,4,.01]]],
 ['Filter',[['cut','Frequenz (Hz)',40,18000,10],['res','Resonanz',.3,16,.1],['fe','Filter-Hüllkurve',0,6,.1],['fd','Filter-Zeit',.01,1,.01]]],
 ['Rauschen und Biss',[['n','Rauschen',0,1,.01],['nd','Rausch-Länge',.01,1,.01],['nhp','Rausch-Hochpass',100,12000,50],['click','Klick',0,1,.01],['drive','Verzerrung',0,100,1]]]];
async function renderPatch(P,semi=0){
  const sr=44100,len=Math.max(.05,P.len),c=new OfflineAudioContext(2,Math.ceil(sr*len),sr),amp=c.createGain(),f=c.createBiquadFilter(),sum=c.createGain(),end=c.createGain();
  sum.connect(f);f.connect(amp);f.type=P.ft;f.Q.value=P.res;
  const cu=Math.min(18000,P.cut*Math.pow(2,P.fe));f.frequency.setValueAtTime(cu,0);if(P.fe>0)f.frequency.exponentialRampToValueAtTime(P.cut,Math.min(len,P.fd));
  const relT=Math.max(0,len-P.r),aEnd=Math.min(P.a,relT),dEnd=Math.min(aEnd+P.d,relT);
  amp.gain.setValueAtTime(0,0);amp.gain.linearRampToValueAtTime(1,aEnd);
  amp.gain.exponentialRampToValueAtTime(Math.max(.001,P.s),dEnd);amp.gain.setValueAtTime(Math.max(.001,P.s),relT);amp.gain.linearRampToValueAtTime(0,len);
  const base=P.freq*Math.pow(2,semi/12),U=Math.max(1,P.uni|0);
  const osc=(wave,fr,level)=>{for(let u=0;u<U;u++){const o=c.createOscillator(),g=c.createGain(),p=c.createStereoPanner(),x=U>1?u/(U-1)*2-1:0;o.type=WAVES[wave];o.detune.value=x*P.spread;p.pan.value=x*.6;g.gain.value=level/Math.sqrt(U);
    o.frequency.setValueAtTime(Math.max(1,fr*Math.pow(2,P.penv/12)),0);if(P.penv)o.frequency.exponentialRampToValueAtTime(Math.max(1,fr),P.pt);o.connect(g).connect(p).connect(sum);o.start()}};
  (CHORDS[P.chord]||[0]).forEach(iv=>{const fr=base*Math.pow(2,iv/12);if(P.lvl>0)osc(P.w1,fr*Math.pow(2,(P.semi1||0)/12),P.lvl);if(P.mix2>0)osc(P.w2,fr*Math.pow(2,P.semi2/12),P.mix2)});
  amp.connect(end);
  const nz=(lvl,dec,hpf)=>{const n=c.createBufferSource(),h=c.createBiquadFilter(),g=c.createGain();n.buffer=noiseBuf(c,Math.min(len,dec+.02));h.type='highpass';h.frequency.value=hpf;g.gain.setValueAtTime(lvl,0);g.gain.exponentialRampToValueAtTime(.001,Math.min(len,dec));n.connect(h).connect(g).connect(end);n.start()};
  if(P.n>0)nz(P.n,P.nd,P.nhp);if(P.click>0)nz(P.click*.8,.012,2500);
  const s=shaper(c,1+P.drive/9);s.oversample='2x';if(P.drive>0){end.connect(s).connect(c.destination)}else end.connect(c.destination);
  const b=await c.startRendering();let pk=0;for(let k=0;k<2;k++)for(const x of b.getChannelData(k))pk=Math.max(pk,Math.abs(x));
  const lv=.92/(pk||1);for(let k=0;k<2;k++){const a=b.getChannelData(k);for(let j=0;j<a.length;j++)a[j]*=lv}return b;
}
function toWav(b){
  const ch=b.numberOfChannels,n=b.length,sr=b.sampleRate,o=new ArrayBuffer(44+n*ch*2),v=new DataView(o),w=(p,s)=>{for(let i=0;i<s.length;i++)v.setUint8(p+i,s.charCodeAt(i))};
  w(0,'RIFF');v.setUint32(4,36+n*ch*2,true);w(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,ch,true);v.setUint32(24,sr,true);v.setUint32(28,sr*ch*2,true);v.setUint16(32,ch*2,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,n*ch*2,true);
  const d=[...Array(ch)].map((_,i)=>b.getChannelData(i));let p=44;for(let i=0;i<n;i++)for(let k=0;k<ch;k++){v.setInt16(p,Math.max(-1,Math.min(1,d[k][i]))*32767,true);p+=2}return o;
}
/* Bibliothek: gilt für alle Projekte */
let LIB={folders:['Meine Sounds'],items:[],next:1},SP={...GALLERY[0].patch},spBase={...GALLERY[0].patch},spName=GALLERY[0].name,spBuf=null,bTab='synth',folder='Kicks',previewSrc=null,galCache={};
const CATS=[...new Set(GALLERY.map(g=>g.cat))];
const saveLib=()=>idbSet('lib',JSON.stringify(LIB));
function previewBuf(b){if(!ctx)return;try{previewSrc&&previewSrc.stop()}catch(e){}const s=ctx.createBufferSource();s.buffer=b;s.connect(slotN[0].in);s.start();previewSrc=s}
async function assignBuf(t,buf,name){buffers[t.id]=buf;t.sample=name;await idbSet('s'+t.id,toWav(buf));drawAll();save()}
async function newChannel(buf,name,cat){if(S.tracks.length>=MAXCH){toast('Mehr als '+MAXCH+' Kanäle gehen nicht.');return null}const t=mkTrack(S.nextId++,[name.slice(0,20),['#ffe600','#ff1f8f','#2df0ff','#b6ff3c','#ff8a1f'][S.tracks.length%5],5,null]);t.src='Kick';if(cat==='Live'&&!S.groups.includes('Live')){S.groups.push('Live')}t.group=S.groups.includes(cat)?cat:null;S.tracks.push(t);wireTrack(t);await assignBuf(t,buf,name);sel=t.id;return t}
function drawBuild(){
  if(view!=='bv')return;$$('#bTabs .seg').forEach(b=>b.classList.toggle('on',b.dataset.b===bTab));$('#bSynth').style.display=bTab==='synth'?'':'none';$('#bLib').style.display=bTab==='lib'?'':'none';
  if(bTab==='synth')drawSynth();else drawLib();
}
function drawSynth(){
  const b=$('#bSynth');if(b.dataset.ok){syncSynth();return}b.dataset.ok=1;
  b.innerHTML=`<div class="prBar"><select id="syP" aria-label="Vorlage">${GALLERY.map((g,i)=>`<option value="${i}">${g.cat}: ${g.name}</option>`).join('')}</select></div>
  <canvas class="ed" id="syW" height="90"></canvas><div class="prBar" id="syNotes">${NOTE_NAMES.map((n,i)=>`<button class="mini" data-n="${SCALE[i]}">${n}</button>`).join('')}</div>
  <div class="row2"><button class="key" id="syPlay">Anhören</button><button class="key" id="syCh">Auf Kanal</button><button class="key" id="sySave">Speichern</button><button class="key" id="syRes">Standard</button></div>
  <div class="row2 sel2"><label class="fld">Oszillator 1<select id="syW1">${Object.keys(WAVES).map(w=>`<option value="${w}">${WN[w]}</option>`).join('')}</select></label><label class="fld">Oszillator 2<select id="syW2">${Object.keys(WAVES).map(w=>`<option value="${w}">${WN[w]}</option>`).join('')}</select></label><label class="fld">Akkord<select id="syC">${Object.keys(CHORDS).map(w=>`<option value="${w}">${CN[w]}</option>`).join('')}</select></label></div>
  ${SYN.map(([h,r])=>`<h3>${h}</h3><div class="syGrid">${r.map(s=>`<label class="fader"><span>${s[1]}: <b id="sv_${s[0]}"></b></span><input data-s="${s[0]}" type="range" min="${s[2]}" max="${s[3]}" step="${s[4]}"></label>`).join('')}</div>`).join('')}`;
  let t;const go=()=>{clearTimeout(t);t=setTimeout(()=>synthPlay(0),180)};
  $$('#bSynth [data-s]').forEach(e=>e.oninput=()=>{SP[e.dataset.s]=+e.value;$('#sv_'+e.dataset.s).textContent=e.value;spName='Eigener Sound';go()});
  $('#syW1').onchange=e=>{SP.w1=e.target.value;go()};$('#syW2').onchange=e=>{SP.w2=e.target.value;go()};$('#syC').onchange=e=>{SP.chord=e.target.value;go()};
  $('#syRes').onclick=()=>{SP={...spBase};syncSynth();synthPlay(0);toast('Auf Standard zurückgesetzt')};
  $('#syP').onchange=e=>{const g=GALLERY[+e.target.value];SP={...g.patch};spBase={...g.patch};spName=g.name;syncSynth();synthPlay(0)};
  $('#syPlay').onclick=()=>synthPlay(0);$$('#syNotes [data-n]').forEach(e=>e.onclick=()=>synthPlay(+e.dataset.n));
  $('#syCh').onclick=async()=>{await resume();const bf=await renderPatch(SP),t=tr(sel);if(t){await assignBuf(t,bf,spName);toast(spName+' liegt auf Kanal '+t.name)}};
  $('#sySave').onclick=saveSheet;syncSynth();resume().then(()=>renderPatch(SP)).then(x=>{spBuf=x;drawWave()});
}
function syncSynth(){$$('#bSynth [data-s]').forEach(e=>{e.value=SP[e.dataset.s];$('#sv_'+e.dataset.s).textContent=SP[e.dataset.s]});$('#syW1').value=SP.w1;$('#syW2').value=SP.w2;$('#syC').value=SP.chord;drawWave()}
function drawWave(){const c=$('#syW');if(!c||!c.clientWidth)return;const{g,w,h}=sizeCanvas(c,90),C=prCol();g.clearRect(0,0,w,h);if(!spBuf)return;const a=spBuf.getChannelData(0),st=Math.max(1,a.length/w|0);g.fillStyle=C('--lit');for(let x=0;x<w;x++){let m=0;for(let i=x*st;i<(x+1)*st&&i<a.length;i+=4)m=Math.max(m,Math.abs(a[i]));g.fillRect(x,h/2-m*h/2,1,Math.max(1,m*h))}}
async function synthPlay(semi){await resume();spBuf=await renderPatch(SP,semi);drawWave();previewBuf(spBuf)}
function saveSheet(){
  openSheet(`<h2>Sound speichern</h2><p>Der Sound landet in deiner Bibliothek und steht in jedem Projekt bereit.</p><label>Name<input id="lN" type="text" maxlength="24" value="${esc(spName)}"></label><label>Ordner<select id="lF">${LIB.folders.map(f=>`<option>${esc(f)}</option>`).join('')}</select></label><div class="row"><button class="act" id="lS">Speichern</button><button class="act alt" id="sC">Abbrechen</button></div>`);
  $('#sC').onclick=closeSheet;
  $('#lS').onclick=async()=>{await resume();const b=await renderPatch(SP),id=LIB.next++,name=$('#lN').value.trim()||'Sound '+id,f=$('#lF').value;await idbSet('L'+id,toWav(b));LIB.items.push({id,name,folder:f,patch:{...SP}});await saveLib();folder=f;closeSheet();toast(name+' gespeichert');if(view==='bv')drawBuild()};
}
const libItems=()=>CATS.includes(folder)?GALLERY.filter(g=>g.cat===folder).map((g,i)=>({gal:GALLERY.indexOf(g),name:g.name,patch:g.patch})):LIB.items.filter(i=>i.folder===folder);
async function itemBuf(it){await resume();if(it.gal!=null){if(!galCache[it.gal])galCache[it.gal]=await renderPatch(it.patch);return galCache[it.gal]}const ab=await idbGet('L'+it.id);return ctx.decodeAudioData(ab.slice(0))}
function soundPicker(title,onPick,onBack){
  let f=CATS.includes(folder)||LIB.folders.includes(folder)?folder:CATS[0];
  const list=()=>CATS.includes(f)?GALLERY.filter(g=>g.cat===f).map(g=>({gal:GALLERY.indexOf(g),name:g.name,patch:g.patch})):LIB.items.filter(i=>i.folder===f);
  const draw=()=>{openSheet(`<h2>${esc(title)}</h2><p>Wähle aus deinen gespeicherten Sounds oder der Galerie. ▶ hört rein.</p><div class="chips" style="margin-bottom:8px">${[...LIB.folders,...CATS].map(x=>`<button class="chip${x===f?' on':''}" data-f="${esc(x)}">${esc(x)}</button>`).join('')}</div>
    <div class="pkGal">${list().map((it,i)=>`<div class="pkRow"><button class="lbP" data-pl="${i}" aria-label="${esc(it.name)} anhören">▶</button><button class="lbN" data-t="${i}">${esc(it.name)}</button></div>`).join('')||'<p>Dieser Ordner ist leer.</p>'}</div>
    <div class="row"><button class="act alt" id="pkF">Datei vom Handy</button><button class="act alt" id="pkB">Abbrechen</button></div>`);
    $$('#sheet [data-f]').forEach(b=>b.onclick=()=>{f=b.dataset.f;draw()});
    $$('#sheet [data-pl]').forEach(b=>b.onclick=async()=>previewBuf(await itemBuf(list()[+b.dataset.pl])));
    $$('#sheet [data-t]').forEach(b=>b.onclick=async()=>{const it=list()[+b.dataset.t];onPick(await itemBuf(it),it.name)});
    $('#pkF').onclick=()=>{filePick=async file=>{await resume();try{const ab=await file.arrayBuffer();onPick(await ctx.decodeAudioData(ab.slice(0)),file.name.replace(/\.[^.]+$/,''))}catch(e){toast('Diese Datei lässt sich nicht lesen. Probiere WAV oder MP3.')}};$('#file').click()};
    $('#pkB').onclick=()=>onBack?onBack():closeSheet()};
  resume().then(draw);
}
function drawLib(){
  const b=$('#bLib'),own=!CATS.includes(folder);b.innerHTML=`<div class="chips">${[...CATS,...LIB.folders].map(f=>`<button class="chip${f===folder?' on':''}" data-f="${esc(f)}">${esc(f)}</button>`).join('')}<button class="chip" id="fA">+ Ordner</button></div>
  <div class="libList">${libItems().map((it,i)=>`<div class="lb"><button class="lbP" data-pl="${i}" aria-label="${esc(it.name)} anhören">▶</button><button class="lbN" data-op="${i}">${esc(it.name)}</button></div>`).join('')||'<p class="note">Dieser Ordner ist leer. Baue im Synth einen Sound oder importiere eine Audio-Datei.</p>'}</div>
  <div class="row2">${own?'<button class="key" id="fI">Audio importieren</button>':''}<button class="key" id="fP">Pack exportieren</button><button class="key" id="fO">Pack importieren</button></div>`;
  $$('#bLib [data-f]').forEach(e=>e.onclick=()=>{folder=e.dataset.f;drawLib()});
  $$('#bLib [data-pl]').forEach(e=>e.onclick=async()=>previewBuf(await itemBuf(libItems()[+e.dataset.pl])));
  $$('#bLib [data-op]').forEach(e=>e.onclick=()=>itemSheet(libItems()[+e.dataset.op]));
  $('#fA').onclick=()=>{openSheet(`<h2>Neuer Ordner</h2><p>Ein Ordner ist zugleich dein Sample Pack.</p><label>Name<input id="nF" type="text" maxlength="20"></label><div class="row"><button class="act" id="nS">Anlegen</button><button class="act alt" id="sC">Abbrechen</button></div>`);$('#sC').onclick=closeSheet;$('#nS').onclick=()=>{const v=$('#nF').value.trim();if(!v)return toast('Gib dem Ordner einen Namen.');if(![...CATS,...LIB.folders].includes(v))LIB.folders.push(v);folder=v;saveLib();closeSheet();drawLib()}};
  if(own)$('#fI').onclick=()=>$('#libFile').click();
  $('#fP').onclick=exportPack;$('#fO').onclick=()=>$('#packFile').click();
}
function itemSheet(it){
  const own=it.gal==null;
  openSheet(`<h2>${esc(it.name)}</h2><p>Gewählter Kanal: ${esc((tr(sel)||{}).name||'')}</p><canvas class="ed" id="iW" height="90" aria-label="Waveform, tippen zum Abspielen"></canvas><div class="row"><button class="act" id="iC">Auf gewählten Kanal</button><button class="act" id="iN">Neuer Kanal</button>${it.patch?'<button class="act alt" id="iE">Im Synth öffnen</button>':''}${own?'<button class="act alt" id="iR">Umbenennen</button><button class="act alt" id="iM">Ordner wechseln</button><button class="act alt" id="iD">Löschen</button>':''}<button class="act alt full" id="sC">Fertig</button></div>`);
  itemBuf(it).then(b=>{drawWaveOn($('#iW'),b);previewBuf(b);$('#iW').onclick=()=>previewBuf(b)});
  $('#sC').onclick=closeSheet;
  $('#iC').onclick=async()=>{const t=tr(sel);await assignBuf(t,await itemBuf(it),it.name);closeSheet();toast(it.name+' liegt auf Kanal '+t.name)};
  $('#iN').onclick=async()=>{const t=await newChannel(await itemBuf(it),it.name,folder);if(t){closeSheet();toast('Neuer Kanal: '+t.name)}};
  if(it.patch)$('#iE').onclick=()=>{SP={...PD,...it.patch};spBase={...SP};spName=it.name;bTab='synth';closeSheet();drawBuild()};
  if(own){
    $('#iR').onclick=()=>{openSheet(`<h2>Umbenennen</h2><label>Name<input id="rN" type="text" maxlength="24" value="${esc(it.name)}"></label><div class="row"><button class="act full" id="rS">Speichern</button></div>`);$('#rS').onclick=()=>{it.name=$('#rN').value.trim()||it.name;saveLib();closeSheet();drawLib()}};
    $('#iM').onclick=()=>{openSheet(`<h2>Ordner wechseln</h2><div class="row">${LIB.folders.map(f=>`<button class="act alt" data-m="${esc(f)}">${esc(f)}</button>`).join('')}</div>`);$$('#sheet [data-m]').forEach(b=>b.onclick=()=>{it.folder=b.dataset.m;saveLib();closeSheet();drawLib()})};
    $('#iD').onclick=async()=>{LIB.items=LIB.items.filter(x=>x!==it);await idbDel('L'+it.id);await saveLib();closeSheet();drawLib();toast(it.name+' gelöscht')};
  }
}
async function exportPack(){
  await resume();const list=libItems();if(!list.length)return toast('Dieser Ordner ist leer.');
  const items=[];for(const it of list)items.push(it.gal!=null||it.patch?{name:it.name,patch:it.patch}:{name:it.name,wav:b64(await idbGet('L'+it.id))});
  const name=folder.replace(/[^\wäöüÄÖÜß -]/g,'')||'Pack',file=new File([JSON.stringify({tekkpack:1,name:folder,items})],name+'.tekkpack.json',{type:'application/json'});
  if(!window.TekkNative)try{if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:name});return}}catch(e){if(e.name==='AbortError')return}
  if(!await deliver(file.name,file,true))toast('Pack gesichert: '+file.name)}
async function importPack(file){
  try{await resume();const d=JSON.parse(await file.text());if(!d.tekkpack||!Array.isArray(d.items))throw 0;
    let f=String(d.name||'Import').slice(0,20);while(CATS.includes(f)||LIB.folders.includes(f))f=f.slice(0,17)+' 2';LIB.folders.push(f);
    for(const x of d.items){const id=LIB.next++;let ab;if(x.patch){const p={...PD};for(const k of Object.keys(PD))if(x.patch[k]!==undefined&&typeof x.patch[k]===typeof PD[k])p[k]=x.patch[k];p.len=Math.min(4,p.len);ab=toWav(await renderPatch(p));LIB.items.push({id,name:String(x.name).slice(0,24),folder:f,patch:p})}else if(x.wav){ab=unb64(x.wav);await ctx.decodeAudioData(ab.slice(0));LIB.items.push({id,name:String(x.name).slice(0,24),folder:f})}else continue;await idbSet('L'+id,ab)}
    await saveLib();folder=f;bTab='lib';drawBuild();toast('Pack importiert: '+f)}
  catch(e){toast('Diese Datei ist kein Tekkbox-Pack.')}}
async function importAudio(file){await resume();try{const ab=await file.arrayBuffer();await ctx.decodeAudioData(ab.slice(0));const id=LIB.next++;await idbSet('L'+id,ab);LIB.items.push({id,name:file.name.replace(/\.[^.]+$/,'').slice(0,24),folder});await saveLib();drawLib();toast('Audio importiert')}catch(e){toast('Diese Datei lässt sich nicht lesen. Probiere WAV oder MP3.')}}

