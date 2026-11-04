/* ---------- Liveplay: frei belegbare Knöpfe und Slider ---------- */
let liveEdit=false,liveId=100;
const lv=(type,x,y,w,h,target,color)=>({id:liveId++,type,x,y,w,h,target,color,label:''});
const defaultLive=()=>[lv('btn',2,2,23,22,'hit:0','#ffe600'),lv('btn',27,2,23,22,'hit:1','#ff1f8f'),lv('btn',52,2,23,22,'hit:2','#2df0ff'),lv('btn',77,2,21,22,'hit:3','#b6ff3c'),lv('btn',2,26,23,22,'hit:5','#2df0ff'),lv('btn',27,26,23,22,'hit:6','#ff1f8f'),lv('btn',52,26,23,22,'roll:16','#ff8a1f'),lv('btn',77,26,21,22,'echo','#b6ff3c'),lv('slider',2,51,62,14,'filter','#2df0ff'),lv('slider',66,51,32,14,'drive','#ff1f8f'),lv('btn',2,68,31,30,'pat:0','#ffe600'),lv('btn',35,68,31,30,'pat:1','#ffe600'),lv('btn',68,68,30,30,'pat:2','#ffe600')];
function liveTargets(type){
  const r=[];if(type==='xy'){return[['echot','Live-Echo: Zeit'],['echof','Live-Echo: Rückkopplung'],...liveTargets('slider')]}
  if(type==='btn'){S.tracks.forEach(t=>r.push(['hit:'+t.id,'Sound: '+t.name]));S.tracks.forEach(t=>r.push(['mute:'+t.id,'Stumm: '+t.name]));S.patterns.forEach((p,i)=>r.push(['pat:'+i,'Pattern: '+p.name]));r.push(['roll:16','Roll 1/16 (halten)'],['roll:32','Roll 1/32 (halten)'],['echo','Echo (halten)'],['play','Start und Stopp']);
    S.slots.forEach((s,i)=>s.fx.forEach((f,k)=>r.push([`fx:${i}:${k}`,`Effekt an/aus: ${s.name}, ${FX[f.t].name}`])))}
  else{r.push(['filter','Live-Filter'],['drive','Drive'],['bpm','Tempo']);S.slots.forEach((s,i)=>r.push(['svol:'+i,'Lautstärke Slot: '+s.name]));S.tracks.forEach(t=>r.push(['tvol:'+t.id,'Lautstärke Kanal: '+t.name]));
    S.slots.forEach((s,i)=>s.fx.forEach((f,k)=>(FX[f.t].s||[]).forEach(p=>r.push([`fxp:${i}:${k}:${p[0]}`,`${s.name}, ${FX[f.t].name}: ${p[1]}`]))))}
  return r;
}
const targetName=(type,tg)=>{const x=liveTargets(type).find(o=>o[0]===tg);return x?x[1].replace(/^[^:]*: /,'').replace(' (halten)',''):'Nicht belegt'};
function sliderRange(tg){const a=tg.split(':');
  if(tg==='echot')return{min:1,max:8,step:1,get:()=>LE.st,set:v=>{LE.st=v;if(ctx)echoDl.delayTime.setTargetAtTime(stepDur()*v,ctx.currentTime,.02)}};
  if(tg==='echof')return{min:0,max:.92,get:()=>LE.fb,set:v=>{LE.fb=v;if(echoFb)echoFb.gain.setTargetAtTime(v,ctx.currentTime,.02)}};
  if(tg==='filter')return{min:-100,max:100,get:()=>+fil.value,set:v=>{fil.value=v;setFilter(v)},spring:0};
  if(tg==='drive')return{min:0,max:100,get:()=>+$('#drive').value,set:v=>{$('#drive').value=v;setDrive()}};
  if(tg==='bpm')return{min:120,max:220,get:()=>S.bpm,set:v=>{S.bpm=Math.round(v);$('#bpm').textContent=S.bpm;if(ctx){echoDl.delayTime.value=stepDur()*3;allTF()}save()}};
  if(a[0]==='svol'){const s=S.slots[+a[1]];return s&&{min:0,max:1.25,get:()=>s.vol,set:v=>{s.vol=v;slotVol(+a[1]);save()}}}
  if(a[0]==='tvol'){const t=tr(+a[1]);return t&&{min:0,max:1.2,get:()=>t.vol,set:v=>{t.vol=v;wireTrack(t);save()}}}
  if(a[0]==='fxp'){const f=(S.slots[+a[1]]||{fx:[]}).fx[+a[2]],sp=f&&(FX[f.t].s||[]).find(p=>p[0]===a[3]);return sp&&{min:sp[2],max:sp[3],step:sp[4],get:()=>f.p[a[3]],set:v=>{f.p[a[3]]=v;const n=fxNode(+a[1],+a[2]);if(n)n.set();save()}}}
  return null}
function liveDown(c){const tg=c.target,a=tg.split(':');
  if(a[0]==='hit'){const t=tr(+a[1]);if(t){trigger(t,ctx.currentTime,0);record(t.id,0)}}
  else if(a[0]==='mute'){const t=tr(+a[1]);if(t){t.mute=!t.mute;drawLive();drawPads();save()}}
  else if(a[0]==='pat'){if(S.patterns[+a[1]])goPat(+a[1])}
  else if(a[0]==='roll')roll=+a[1];
  else if(tg==='echo')echoIn.gain.setTargetAtTime(.8,ctx.currentTime,.01);
  else if(tg==='play')togglePlay();
  else if(a[0]==='fx'){const f=(S.slots[+a[1]]||{fx:[]}).fx[+a[2]];if(f){f.on=!f.on;rebuildSlot(+a[1]);drawLive();save()}}
}
function liveUp(c){if(c.target.startsWith('roll'))roll=0;else if(c.target==='echo'&&ctx)echoIn.gain.setTargetAtTime(0,ctx.currentTime,.02)}
function liveActive(c){const a=c.target.split(':');if(a[0]==='mute'){const t=tr(+a[1]);return t&&t.mute}if(a[0]==='pat')return S.cur===+a[1];if(a[0]==='fx'){const f=(S.slots[+a[1]]||{fx:[]}).fx[+a[2]];return f&&f.on}return false}
function drawLive(){
  if(view!=='lv')return;const b=$('#liveArea');b.innerHTML='';b.classList.toggle('edit',liveEdit);$('#liveEditBtn').classList.toggle('on',liveEdit);$('#liveEditBtn').textContent=liveEdit?'Fertig':'Bearbeiten';$('#liveAddB').style.display=$('#liveAddS').style.display=$('#liveAddX').style.display=liveEdit?'':'none';
  S.live.forEach(c=>{const e=el('div','lc '+c.type+(liveActive(c)?' act':''));Object.assign(e.style,{left:c.x+'%',top:c.y+'%',width:c.w+'%',height:c.h+'%'});e.style.setProperty('--c',c.color);
    const lab=el('span','lcL',c.label||(c.type==='xy'?targetName('xy',c.tx)+' / '+targetName('xy',c.ty):targetName(c.type,c.target)));
    if(c.type==='xy'){const H=el('i','lcH'),V=el('i','lcV'),D=el('i','lcD');e.append(H,V,D);const show=()=>{const n=t=>{const r=sliderRange(t);return r?(r.get()-r.min)/(r.max-r.min):.5},x=n(c.tx)*100,y=(1-n(c.ty))*100;D.style.left=V.style.left=x+'%';D.style.top=H.style.top=y+'%'};e._show=show;show()}
    else if(c.type==='slider'){const r=sliderRange(c.target),fillE=el('i','lcF');e.append(fillE);const show=()=>{if(!r)return;const v=(r.get()-r.min)/(r.max-r.min);fillE.style[e.dataset.v?'height':'width']=Math.max(0,Math.min(1,v))*100+'%'};e.dataset.v=c.h*$('#liveArea').clientHeight>c.w*$('#liveArea').clientWidth?1:'';e._show=show;show()}
    e.append(lab);if(liveEdit){const h=el('b','lcR');e.append(h)}
    wireLive(e,c);b.append(e)})}
function wireLive(e,c){
  const area=$('#liveArea');let mode=null,sx,sy,ox,oy,ow,oh,moved;
  e.addEventListener('pointerdown',ev=>{ev.preventDefault();resume();e.setPointerCapture(ev.pointerId);
    if(liveEdit){mode=ev.target.classList.contains('lcR')?'size':'move';sx=ev.clientX;sy=ev.clientY;ox=c.x;oy=c.y;ow=c.w;oh=c.h;moved=false;return}
    if(!ctx)return;if(c.type==='btn'){e.classList.add('down');liveDown(c)}else if(c.type==='xy'){mode='pad';if(/^echo/.test(c.tx+c.ty))echoIn.gain.setTargetAtTime(.8,ctx.currentTime,.01);pad(ev)}else{mode='slide';slide(ev)}});
  const setR=(r,v)=>{let x=r.min+Math.max(0,Math.min(1,v))*(r.max-r.min);if(r.step)x=Math.round(x/r.step)*r.step;r.set(x)};
  const pad=ev=>{const q=e.getBoundingClientRect(),X=sliderRange(c.tx),Y=sliderRange(c.ty);if(X)setR(X,(ev.clientX-q.left)/q.width);if(Y)setR(Y,1-(ev.clientY-q.top)/q.height);e._show()};
  const slide=ev=>{const r=sliderRange(c.target);if(!r)return;const q=e.getBoundingClientRect(),v=e.dataset.v?1-(ev.clientY-q.top)/q.height:(ev.clientX-q.left)/q.width;setR(r,v);e._show()};
  e.addEventListener('pointermove',ev=>{if(mode==='slide')return slide(ev);if(mode==='pad')return pad(ev);if(!mode)return;const dx=(ev.clientX-sx)/area.clientWidth*100,dy=(ev.clientY-sy)/area.clientHeight*100;if(Math.abs(dx)+Math.abs(dy)>1)moved=true;
    if(mode==='move'){c.x=Math.max(0,Math.min(100-c.w,ox+dx));c.y=Math.max(0,Math.min(100-c.h,oy+dy))}else{c.w=Math.max(8,Math.min(100-c.x,ow+dx));c.h=Math.max(6,Math.min(100-c.y,oh+dy))}e.style.left=c.x+'%';e.style.top=c.y+'%';e.style.width=c.w+'%';e.style.height=c.h+'%'});
  const up=()=>{if(liveEdit){if(mode&&!moved&&mode==='move')e._tap=1;else if(mode){drawLive();save()}mode=null;return}
    if(c.type==='btn'){e.classList.remove('down');if(ctx)liveUp(c)}else if(mode==='pad'){if(/^echo/.test(c.tx+c.ty)&&ctx)echoIn.gain.setTargetAtTime(0,ctx.currentTime,.02)}else if(mode==='slide'){const r=sliderRange(c.target);if(r&&r.spring!==undefined){r.set(r.spring);e._show()}}mode=null};
  e.addEventListener('pointerup',up);e.addEventListener('pointercancel',up);
  e.addEventListener('click',()=>{if(e._tap){e._tap=0;liveSheet(c)}});
}
function liveSheet(c){
  openSheet(`<h2>${c.type==='btn'?'Knopf':c.type==='xy'?'XY-Kasten':'Slider'}</h2><p>Lege fest, was dieses Element steuert.</p>
  ${c.type==='xy'?['tx','ty'].map((k,i)=>`<label>${i?'Y (hoch, runter)':'X (links, rechts)'}<select id="l${k}">${liveTargets('xy').map(o=>`<option value="${o[0]}"${o[0]===c[k]?' selected':''}>${esc(o[1])}</option>`).join('')}</select></label>`).join(''):`<label>Belegung<select id="lT">${liveTargets(c.type).map(o=>`<option value="${o[0]}"${o[0]===c.target?' selected':''}>${esc(o[1])}</option>`).join('')}</select></label>`}
  <label>Beschriftung<input id="lL" type="text" maxlength="16" value="${esc(c.label)}" placeholder="${c.type==='xy'?'':esc(targetName(c.type,c.target))}"></label>
  <div class="colorRow"><span>Farbe</span><input id="lC" type="color" value="${c.color}"></div>
  <div class="row"><button class="act alt" id="lD">Löschen</button><button class="act" id="sC">Fertig</button></div>`);
  if(c.type==='xy')['tx','ty'].forEach(k=>$('#l'+k).onchange=e=>{c[k]=e.target.value;drawLive();save()});else $('#lT').onchange=e=>{c.target=e.target.value;drawLive();save();liveSheet(c)};$('#lL').oninput=e=>{c.label=e.target.value;drawLive();save()};$('#lC').oninput=e=>{c.color=e.target.value;drawLive();save()};
  $('#lD').onclick=()=>{S.live=S.live.filter(x=>x!==c);drawLive();save();closeSheet()};$('#sC').onclick=closeSheet;
}
function addLive(type){const c=type==='btn'?lv('btn',38,40,24,16,'hit:'+sel,'#ffe600'):type==='xy'?Object.assign(lv('xy',20,30,60,34,'','#ff1f8f'),{tx:'echot',ty:'echof'}):lv('slider',20,44,60,12,'filter','#2df0ff');c.id=Date.now();S.live.push(c);drawLive();save()}

