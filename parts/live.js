/* ---------- Liveplay: dein eigenes Instrument ---------- */
let liveEdit=false;
const LOOK={shape:'eck',look:'neon',fs:15,showL:true,hold:false,spring:null,dir:'auto',lo:0,hi:100,glow:60,textC:''};
const lv=(type,x,y,w,h,target,color)=>({id:Date.now()+Math.random(),type,x,y,w,h,target,color,label:'',...LOOK});
function liveTargets(type){
  const r=[];
  if(type==='btn'){S.tracks.forEach(t=>r.push(['hit:'+t.id,'Sound: '+t.name]));S.tracks.forEach(t=>r.push(['mute:'+t.id,'Stumm: '+t.name]));S.patterns.forEach((p,i)=>r.push(['pat:'+i,'Pattern: '+p.name]));r.push(['roll:16','Roll 1/16 (halten)'],['roll:32','Roll 1/32 (halten)'],['echo','Echo (halten)'],['play','Start und Stopp']);
    S.slots.forEach((s,i)=>s.fx.forEach((f,k)=>r.push([`fx:${i}:${k}`,`Effekt an/aus: ${s.name}, ${FX[f.t].name}`])))}
  else{r.push(['echot','Live-Echo: Zeit'],['echof','Live-Echo: Rückkopplung'],['filter','Live-Filter'],['drive','Drive'],['bpm','Tempo']);S.slots.forEach((s,i)=>r.push(['svol:'+i,'Lautstärke Slot: '+s.name]));S.tracks.forEach(t=>r.push(['tvol:'+t.id,'Lautstärke Kanal: '+t.name]));
    S.slots.forEach((s,i)=>s.fx.forEach((f,k)=>(FX[f.t].s||[]).forEach(p=>r.push([`fxp:${i}:${k}:${p[0]}`,`${s.name}, ${FX[f.t].name}: ${p[1]}`]))))}
  return r;
}
const kindOf=c=>c.type==='btn'?'btn':'val';
const targetName=(kind,tg)=>{const x=liveTargets(kind).find(o=>o[0]===tg);return x?x[1].replace(/^[^:]*: /,'').replace(' (halten)',''):'Nicht belegt'};
function sliderRange(tg){const a=String(tg).split(':');
  if(tg==='echot')return{min:1,max:8,step:1,get:()=>LE.st,set:v=>{LE.st=v;if(ctx)echoDl.delayTime.setTargetAtTime(stepDur()*v,ctx.currentTime,.02)}};
  if(tg==='echof')return{min:0,max:.92,get:()=>LE.fb,set:v=>{LE.fb=v;if(echoFb)echoFb.gain.setTargetAtTime(v,ctx.currentTime,.02)}};
  if(tg==='filter')return{min:-100,max:100,get:()=>+fil.value,set:v=>{fil.value=v;setFilter(v)},spring:0};
  if(tg==='drive')return{min:0,max:100,get:()=>+$('#drive').value,set:v=>{$('#drive').value=v;setDrive()}};
  if(tg==='bpm')return{min:120,max:220,step:1,get:()=>S.bpm,set:v=>{S.bpm=Math.round(v);$('#bpm').textContent=S.bpm;if(ctx){echoDl.delayTime.value=stepDur()*LE.st;allTF()}save()}};
  if(a[0]==='svol'){const s=S.slots[+a[1]];return s&&{min:0,max:1.25,get:()=>s.vol,set:v=>{s.vol=v;slotVol(+a[1]);save()}}}
  if(a[0]==='tvol'){const t=tr(+a[1]);return t&&{min:0,max:1.2,get:()=>t.vol,set:v=>{t.vol=v;wireTrack(t);save()}}}
  if(a[0]==='fxp'){const f=(S.slots[+a[1]]||{fx:[]}).fx[+a[2]],sp=f&&(FX[f.t].s||[]).find(p=>p[0]===a[3]);return sp&&{min:sp[2],max:sp[3],step:sp[4],get:()=>f.p[a[3]],set:v=>{f.p[a[3]]=v;const n=fxNode(+a[1],+a[2]);if(n)n.set();save()}}}
  return null}
const rngGet=(c,t)=>{const r=sliderRange(t);if(!r)return.5;const u=(r.get()-r.min)/(r.max-r.min),lo=c.lo/100,hi=c.hi/100;return hi>lo?Math.max(0,Math.min(1,(u-lo)/(hi-lo))):u};
const rngSet=(c,t,v)=>{const r=sliderRange(t);if(!r)return;v=Math.max(0,Math.min(1,v));let x=r.min+(c.lo/100+(c.hi-c.lo)/100*v)*(r.max-r.min);if(r.step)x=Math.round(x/r.step)*r.step;r.set(x)};
function liveDown(c){const tg=c.target,a=tg.split(':');
  if(a[0]==='hit'){const t=tr(+a[1]);if(t){trigger(t,ctx.currentTime,0);record(t.id,0)}}
  else if(a[0]==='mute'){const t=tr(+a[1]);if(t){t.mute=!t.mute;drawLive();drawPads();save()}}
  else if(a[0]==='pat'){if(S.patterns[+a[1]])goPat(+a[1])}
  else if(a[0]==='roll')roll=+a[1];
  else if(tg==='echo')echoIn.gain.setTargetAtTime(.8,ctx.currentTime,.01);
  else if(tg==='play')togglePlay();
  else if(a[0]==='fx'){const f=(S.slots[+a[1]]||{fx:[]}).fx[+a[2]];if(f){f.on=!f.on;rebuildSlot(+a[1]);drawLive();save()}}
}
function liveUp(c){const a=c.target.split(':');if(a[0]==='roll')roll=0;else if(c.target==='echo'&&ctx)echoIn.gain.setTargetAtTime(0,ctx.currentTime,.02);else if(a[0]==='hit'&&c.hold&&ctx)choke(+a[1],ctx.currentTime)}
function liveActive(c){const a=c.target.split(':');if(a[0]==='mute'){const t=tr(+a[1]);return t&&t.mute}if(a[0]==='pat')return S.cur===+a[1];if(a[0]==='fx'){const f=(S.slots[+a[1]]||{fx:[]}).fx[+a[2]];return f&&f.on}return false}
function liveLabel(c){return c.label||(c.type==='xy'?targetName('val',c.tx)+' / '+targetName('val',c.ty):targetName(kindOf(c),c.target))}
function drawLive(){
  if(view!=='lv')return;const b=$('#liveArea');b.innerHTML='';b.classList.toggle('edit',liveEdit);$('#liveEditBtn').classList.toggle('on',liveEdit);$('#liveEditBtn').textContent=liveEdit?'Fertig':'Bearbeiten';
  $$('.liveAdd').forEach(e=>e.style.display=liveEdit?'':'none');
  if(!S.live.length){const m=el('div','liveEmpty');m.innerHTML=liveEdit?'<b>Leg los</b><span>Füge oben einen Knopf, Slider, Knob oder XY-Kasten hinzu.</span>':'<b>Dein Instrument</b><span>Tippe auf Bearbeiten und baue dir dein eigenes Live-Setup.</span>';b.append(m)}
  S.live.forEach(c=>{Object.keys(LOOK).forEach(k=>{if(c[k]===undefined)c[k]=LOOK[k]});
    const e=el('div',`lc ${c.type} sh-${c.shape} lk-${c.look}`+(liveActive(c)?' act':''));Object.assign(e.style,{left:c.x+'%',top:c.y+'%',width:c.w+'%',height:c.h+'%',fontSize:c.fs+'px'});e.style.setProperty('--c',c.color);e.style.setProperty('--g',c.glow/100);if(c.textC)e.style.color=c.textC;
    const vert=c.dir==='v'||(c.dir==='auto'&&c.h*b.clientHeight>c.w*b.clientWidth);
    if(c.type==='xy'){const H=el('i','lcH'),V=el('i','lcV'),D=el('i','lcD');e.append(H,V,D);e._show=()=>{const x=rngGet(c,c.tx)*100,y=(1-rngGet(c,c.ty))*100;D.style.left=V.style.left=x+'%';D.style.top=H.style.top=y+'%'}}
    else if(c.type==='slider'){const f=el('i','lcF');if(vert){e.dataset.v=1}e.append(f);e._show=()=>{f.style[vert?'height':'width']=rngGet(c,c.target)*100+'%'}}
    else if(c.type==='knob'){const k=el('i','lcK');e.append(k);e._show=()=>k.style.setProperty('--v',rngGet(c,c.target))}
    if(e._show)e._show();
    if(c.showL)e.append(el('span','lcL',liveLabel(c)));
    if(liveEdit)e.append(el('b','lcR'));
    wireLive(e,c);b.append(e)})}
function wireLive(e,c){
  const area=$('#liveArea');let mode=null,sx,sy,ox,oy,ow,oh,moved,start,kv;
  const pad=ev=>{const q=e.getBoundingClientRect();rngSet(c,c.tx,(ev.clientX-q.left)/q.width);rngSet(c,c.ty,1-(ev.clientY-q.top)/q.height);e._show()};
  const slide=ev=>{const q=e.getBoundingClientRect();rngSet(c,c.target,e.dataset.v?1-(ev.clientY-q.top)/q.height:(ev.clientX-q.left)/q.width);e._show()};
  const knob=ev=>{rngSet(c,c.target,kv+(sy-ev.clientY)/170);e._show()};
  e.addEventListener('pointerdown',ev=>{ev.preventDefault();resume();e.setPointerCapture(ev.pointerId);sx=ev.clientX;sy=ev.clientY;
    if(liveEdit){mode=ev.target.classList.contains('lcR')?'size':'move';ox=c.x;oy=c.y;ow=c.w;oh=c.h;moved=false;return}
    if(!ctx)return;
    if(c.type==='btn'){e.classList.add('down');liveDown(c);return}
    if(c.type==='xy'){mode='pad';start=[rngGet(c,c.tx),rngGet(c,c.ty)];if(/^echo/.test(c.tx+c.ty))echoIn.gain.setTargetAtTime(.8,ctx.currentTime,.01);pad(ev);return}
    start=rngGet(c,c.target);kv=start;if(c.type==='knob'){mode='knob';return}mode='slide';slide(ev)});
  e.addEventListener('pointermove',ev=>{if(mode==='slide')return slide(ev);if(mode==='pad')return pad(ev);if(mode==='knob')return knob(ev);if(!mode)return;
    const dx=(ev.clientX-sx)/area.clientWidth*100,dy=(ev.clientY-sy)/area.clientHeight*100;if(Math.abs(dx)+Math.abs(dy)>1.2)moved=true;if(!moved)return;
    const snap=v=>Math.round(v/2)*2;
    if(mode==='move'){c.x=Math.max(0,Math.min(100-c.w,snap(ox+dx)));c.y=Math.max(0,Math.min(100-c.h,snap(oy+dy)))}else{c.w=Math.max(8,Math.min(100-c.x,snap(ow+dx)));c.h=Math.max(6,Math.min(100-c.y,snap(oh+dy)))}
    Object.assign(e.style,{left:c.x+'%',top:c.y+'%',width:c.w+'%',height:c.h+'%'})});
  const up=()=>{if(liveEdit){if(mode==='move'&&!moved)e._tap=1;else if(mode){drawLive();save()}mode=null;return}
    if(c.type==='btn'){e.classList.remove('down');if(ctx)liveUp(c)}
    else if(mode==='pad'){if(/^echo/.test(c.tx+c.ty)&&ctx)echoIn.gain.setTargetAtTime(0,ctx.currentTime,.02);if(c.spring){rngSet(c,c.tx,start[0]);rngSet(c,c.ty,start[1]);e._show()}}
    else if(mode==='slide'||mode==='knob'){const r=sliderRange(c.target),sp=c.spring===null?r&&r.spring!==undefined:c.spring;if(sp&&r){if(c.spring===null&&r.spring!==undefined)r.set(r.spring);else rngSet(c,c.target,start);e._show()}}
    mode=null};
  e.addEventListener('pointerup',up);e.addEventListener('pointercancel',up);
  e.addEventListener('click',()=>{if(e._tap){e._tap=0;liveSheet(c)}});
}
const seg=(id,opts,val)=>`<div class="segRow" id="${id}">${opts.map(o=>`<button class="act ${o[0]===val?'sel':'alt'}" data-v="${o[0]}">${o[1]}</button>`).join('')}</div>`;
function liveSheet(c){
  const kind=kindOf(c),isHit=c.target&&c.target.startsWith('hit:'),opts=sel=>liveTargets(kind==='btn'?'btn':'val').map(o=>`<option value="${o[0]}"${o[0]===sel?' selected':''}>${esc(o[1])}</option>`).join('');
  openSheet(`<h2>${{btn:'Knopf',slider:'Slider',knob:'Knob',xy:'XY-Kasten'}[c.type]}</h2>
  ${c.type==='btn'?`<div class="row"><button class="act full" id="lS">Eigenen Sound auf diesen Knopf laden</button></div>`:''}
  ${c.type==='xy'?['tx','ty'].map((k,i)=>`<label>${i?'Y, hoch und runter':'X, links und rechts'}<select id="l${k}">${opts(c[k])}</select></label>`).join(''):`<label>Belegung<select id="lT">${opts(c.target)}</select></label>`}
  <label>Beschriftung<input id="lL" type="text" maxlength="18" value="${esc(c.label)}" placeholder="${esc(liveLabel({...c,label:''}))}"></label>
  ${c.type==='btn'&&isHit?`<p>Beim Loslassen</p>${seg('lH',[[0,'Sound läuft weiter'],[1,'Sound stoppt']],c.hold?1:0)}`:''}
  ${c.type!=='btn'?`<p>Beim Loslassen</p>${seg('lSp',[['auto','Automatisch'],[1,'Zurückspringen'],[0,'Stehen bleiben']],c.spring===null?'auto':c.spring?1:0)}`:''}
  ${c.type==='slider'?`<p>Richtung</p>${seg('lDir',[['auto','Automatisch'],['h','Waagerecht'],['v','Senkrecht']],c.dir)}`:''}
  ${c.type!=='btn'?`<label><span>Bereich von: <span id="vlo">${c.lo}</span> %</span><input id="llo" type="range" min="0" max="100" value="${c.lo}"></label><label><span>Bereich bis: <span id="vhi">${c.hi}</span> %</span><input id="lhi" type="range" min="0" max="100" value="${c.hi}"></label>`:''}
  <h3>Aussehen</h3>
  <p>Form</p>${seg('lSh',[['eck','Eckig'],['schraeg','Schräg'],['rund','Rund'],['hex','Sechseck']],c.shape)}
  <p>Stil</p>${seg('lLk',[['neon','Neon'],['voll','Voll'],['umriss','Umriss'],['glas','Glas']],c.look)}
  <div class="colorRow"><span>Farbe</span><input id="lC" type="color" value="${c.color}"></div>
  <div class="colorRow"><span>Schriftfarbe</span><input id="lTc" type="color" value="${c.textC||'#ffffff'}"></div>
  <label><span>Leuchten: <span id="vgl">${c.glow}</span> %</span><input id="lG" type="range" min="0" max="100" value="${c.glow}"></label>
  <label><span>Schriftgröße: <span id="vfs">${c.fs}</span></span><input id="lF" type="range" min="10" max="34" value="${c.fs}"></label>
  <label><span>Breite: <span id="vw">${Math.round(c.w)}</span> %</span><input id="lW" type="range" min="8" max="100" step="2" value="${c.w}"></label>
  <label><span>Höhe: <span id="vh">${Math.round(c.h)}</span> %</span><input id="lHt" type="range" min="6" max="100" step="2" value="${c.h}"></label>
  <div class="row"><button class="act alt" id="lTx">${c.showL?'Text ausblenden':'Text einblenden'}</button><button class="act alt" id="lCp">Duplizieren</button><button class="act alt" id="lR">Standard</button><button class="act alt" id="lD">Löschen</button><button class="act full" id="sC">Fertig</button></div>`);
  const chg=()=>{drawLive();save()},segOn=(id,f)=>$$(`#${id} button`).forEach(b=>b.onclick=()=>{f(b.dataset.v);chg();const t=$('#sheet').scrollTop;liveSheet(c);$('#sheet').scrollTop=t});
  if(c.type==='btn')$('#lS').onclick=()=>soundPicker('Sound für diesen Knopf',async(buf,name)=>{const t=await newChannel(buf,name,'Live');if(t){c.target='hit:'+t.id;if(!c.label)c.label=name.slice(0,18);chg();toast(name+' liegt auf dem Knopf')}liveSheet(c)},()=>liveSheet(c));
  if(c.type==='xy')['tx','ty'].forEach(k=>$('#l'+k).onchange=e=>{c[k]=e.target.value;chg()});else $('#lT').onchange=e=>{c.target=e.target.value;chg();liveSheet(c)};
  $('#lL').oninput=e=>{c.label=e.target.value;chg()};$('#lC').oninput=e=>{c.color=e.target.value;chg()};$('#lTc').oninput=e=>{c.textC=e.target.value;chg()};
  const rg=(id,k,v)=>{const e=$('#'+id);if(e)e.oninput=()=>{c[k]=+e.value;$('#'+v).textContent=e.value;chg()}};rg('lG','glow','vgl');rg('lF','fs','vfs');rg('lW','w','vw');rg('lHt','h','vh');rg('llo','lo','vlo');rg('lhi','hi','vhi');
  segOn('lSh',v=>c.shape=v);segOn('lLk',v=>c.look=v);
  if($('#lH'))segOn('lH',v=>c.hold=v==='1');if($('#lSp'))segOn('lSp',v=>c.spring=v==='auto'?null:v==='1');if($('#lDir'))segOn('lDir',v=>c.dir=v);
  $('#lTx').onclick=()=>{c.showL=!c.showL;chg();liveSheet(c)};
  $('#lCp').onclick=()=>{const d={...c,id:Date.now()+Math.random(),x:Math.min(100-c.w,c.x+3),y:Math.min(100-c.h,c.y+3)};S.live.push(d);chg();closeSheet()};
  $('#lR').onclick=()=>{Object.assign(c,LOOK,{label:''});chg();liveSheet(c)};
  $('#lD').onclick=()=>{S.live=S.live.filter(x=>x!==c);chg();closeSheet()};$('#sC').onclick=closeSheet;
}
function addLive(type){const C={btn:['#ff2a6d',38,40,24,16],slider:['#22e6ff',20,44,60,12],knob:['#b14dff',38,38,24,16],xy:['#ff2a6d',20,28,60,34]}[type],c=lv(type,C[1],C[2],C[3],C[4],type==='btn'?'hit:'+sel:type==='xy'?'':'filter',C[0]);if(type==='xy'){c.tx='echot';c.ty='echof'}S.live.push(c);drawLive();save();if(type==='btn')liveSheet(c)}
function liveClearSheet(){openSheet(`<h2>Live-Fläche leeren?</h2><p>Alle Knöpfe, Slider, Knobs und XY-Kästen verschwinden. Deine Sounds bleiben.</p><div class="row"><button class="act" id="cY">Alles entfernen</button><button class="act alt" id="sC">Abbrechen</button></div>`);$('#cY').onclick=()=>{S.live=[];drawLive();save();closeSheet()};$('#sC').onclick=closeSheet}

