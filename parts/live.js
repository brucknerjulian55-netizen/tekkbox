/* ---------- Liveplay: dein eigenes Instrument ---------- */
let liveEdit=false;
const LOOK={act:'play',shape:'eck',look:'neon',fs:15,showL:true,hold:false,spring:null,dir:'auto',lo:0,hi:100,glow:60,textC:''};
const lv=(type,x,y,w,h,target,color)=>({id:Date.now()+Math.random(),type,x,y,w,h,target,color,label:'',...LOOK});
function liveTargets(type){
  const r=[];
  if(type==='btn'){S.tracks.forEach(t=>r.push(['hit:'+t.id,'Sound: '+t.name]));S.tracks.forEach(t=>r.push(['mute:'+t.id,'Stumm: '+t.name]));S.patterns.forEach((p,i)=>r.push(['pat:'+i,'Pattern: '+p.name]));(S.binds||[]).filter(b=>b.kind==='on').forEach(b=>r.push(['bindon:'+b.id,'Bindung: '+b.label]));r.push(['roll:16','Roll 1/16 (halten)'],['roll:32','Roll 1/32 (halten)'],['echo','Echo (halten)'],['play','Start und Stopp']);
    S.slots.forEach((s,i)=>s.fx.forEach((f,k)=>r.push([`fx:${i}:${k}`,`Effekt an/aus: ${s.name}, ${FX[f.t].name}`])))}
  else{(S.binds||[]).filter(b=>b.kind!=='on').forEach(b=>r.push(['bind:'+b.id,'Bindung: '+b.label]));r.push(['echot','Live-Echo: Zeit'],['echof','Live-Echo: Rückkopplung'],['filter','Live-Filter'],['drive','Drive'],['bpm','Tempo']);S.slots.forEach((s,i)=>r.push(['svol:'+i,'Lautstärke Slot: '+s.name]));S.tracks.forEach(t=>r.push(['tvol:'+t.id,'Lautstärke Kanal: '+t.name]));
    S.slots.forEach((s,i)=>s.fx.forEach((f,k)=>(FX[f.t].s||[]).forEach(p=>r.push([`fxp:${i}:${k}:${p[0]}`,`${s.name}, ${FX[f.t].name}: ${p[1]}`]))))}
  return r;
}
const kindOf=c=>c.type==='btn'?'btn':'val';
const targetName=(kind,tg)=>{const x=liveTargets(kind).find(o=>o[0]===tg);return x?x[1].replace(/^[^:]*: /,'').replace(' (halten)',''):'Nicht belegt'};
function sliderRange(tg){const a=String(tg).split(':');if(a[0]==='bind')return bindRange(+a[1]);
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
  if(a[0]==='hit'){const t=tr(+a[1]);if(!t)return;
    if(c.act==='toggle'){t.mute=!t.mute;if(t.mute)choke(t.id,ctx.currentTime,true);liveMark();drawPads();drawRack();save()}
    else if(c.act==='holdm'){t.mute=true;choke(t.id,ctx.currentTime,true);liveMark()}
    else if(c.act==='holdo'){t.mute=false;liveMark()}
    else{if(holdable(t))holdVoice(t,0);else trigger(t,ctx.currentTime,0);record(t.id,0)}}
  else if(a[0]==='mute'){const t=tr(+a[1]);if(t){t.mute=!t.mute;if(t.mute)choke(t.id,ctx.currentTime,true);liveMark();drawPads();drawRack();save()}}
  else if(a[0]==='pat'){if(S.patterns[+a[1]])goPat(+a[1])}
  else if(a[0]==='bindon'){const b=S.binds.find(x=>x.id===+a[1]),h=b&&fxBy(b.fid);if(h){const on=!h.f.on;[b.fid,...(b.links||[])].forEach(id=>{const x=fxBy(id);if(x){x.f.on=on;rebuildSlot(x.i)}});liveMark();save()}}
  else if(a[0]==='roll')roll=+a[1];
  else if(tg==='echo')echoIn.gain.setTargetAtTime(.8,ctx.currentTime,.01);
  else if(tg==='play')togglePlay();
  else if(a[0]==='fx'){const f=(S.slots[+a[1]]||{fx:[]}).fx[+a[2]];if(f){f.on=!f.on;rebuildSlot(+a[1]);liveMark();save()}}
}
const liveMark=()=>$$('#liveArea .lc').forEach(e=>e._c&&e.classList.toggle('act',!!liveActive(e._c)));
function liveUp(c){const a=c.target.split(':');if(a[0]==='roll')roll=0;else if(c.target==='echo'&&ctx)echoIn.gain.setTargetAtTime(0,ctx.currentTime,.02);else if(a[0]==='hit'&&ctx){const t=tr(+a[1]);if(!t)return;if(c.act==='holdm'){t.mute=false;liveMark()}else if(c.act==='holdo'){t.mute=true;choke(t.id,ctx.currentTime,true);liveMark()}else if(c.act==='play'&&c.hold)choke(t.id,ctx.currentTime)}}
function liveActive(c){const a=c.target.split(':');if(a[0]==='hit'&&c.act!=='play'){const t=tr(+a[1]);return t&&!t.mute}if(a[0]==='mute'){const t=tr(+a[1]);return t&&t.mute}if(a[0]==='bindon'){const b=S.binds.find(x=>x.id===+a[1]),h=b&&fxBy(b.fid);return h&&h.f.on}if(a[0]==='pat')return S.cur===+a[1];if(a[0]==='fx'){const f=(S.slots[+a[1]]||{fx:[]}).fx[+a[2]];return f&&f.on}return false}
function liveLabel(c){return c.label||(c.type==='xy'?targetName('val',c.tx)+' / '+targetName('val',c.ty):targetName(kindOf(c),c.target))}
const BLK={pads:{t:'Pads',w:96,h:48,n:['#mode']},steps:{t:'Schritte',w:96,h:18,n:['#steps']},fx:{t:'Live-FX',w:96,h:24,n:['.faders','.holds']}};
function parkBlocks(){const h=$('#pv');Object.values(BLK).forEach(B=>B.n.forEach(s=>h.append($(s))))}
const liveA=()=>S.area=S.area||{w:100,h:100,z:100};
function fitNew(c){const A=liveA(),s=$('#liveScroll'),i=$('#liveArea');c.w=Math.min(100,c.w*100/A.w);c.h=Math.min(100,c.h*100/A.h);if(!i.clientWidth){c.x=(100-c.w)/2;c.y=Math.min(100-c.h,(100-c.h)/2+S.live.length%5*4);return c}c.x=Math.max(0,Math.min(100-c.w,(s.scrollLeft+s.clientWidth/2)/i.clientWidth*100-c.w/2));c.y=Math.max(0,Math.min(100-c.h,(s.scrollTop+s.clientHeight/2)/i.clientHeight*100-c.h/2+(S.live.length%5-2)*5*100/A.h));return c}
function addBlock(k){if(k!=='pads'&&S.live.some(c=>c.block===k))return toast(BLK[k].t+' ist schon auf der Fläche.');const c=lv('block',2,2,BLK[k].w,BLK[k].h,'','#6a2ff0');c.block=k;const o=S.live.filter(x=>x.block==='pads').length;fitNew(c);if(k==='pads')c.y=Math.min(100-c.h,c.y+o*3);S.live.push(c);drawLive();save()}
function drawLive(){
  parkBlocks();if(view!=='lv')return;const b=$('#liveArea'),box=$('#liveScroll'),A=S.area=S.area||{w:100,h:100,z:100};b.style.width=box.clientWidth*A.w/100*A.z/100+'px';b.style.height=box.clientHeight*A.h/100*A.z/100+'px';let modeUsed=false;b.innerHTML='';b.classList.toggle('edit',liveEdit);$('#liveEditBtn').classList.toggle('on',liveEdit);$('#liveEditBtn').textContent=liveEdit?'Fertig':'Bearbeiten';
  $$('.liveAdd').forEach(e=>e.style.display=liveEdit?'':'none');
  if(!S.live.length){const m=el('div','liveEmpty');m.innerHTML=liveEdit?'<b>Leg los</b><span>Füge oben dein erstes Element hinzu. Du kannst die Leiste zur Seite wischen.</span>':'<b>Dein Instrument</b><span>Tippe auf Bearbeiten und hol dir Pads, Schritte, FX, Knöpfe, Slider, Knobs oder XY-Kästen dazu. Alles spielt das, was im Rack steht.</span>';b.append(m)}
  S.live.forEach(c=>{Object.keys(LOOK).forEach(k=>{if(c[k]===undefined)c[k]=LOOK[k]});
    const e=el('div',`lc ${c.type} sh-${c.shape} lk-${c.look}`+(liveActive(c)?' act':''));e._c=c;Object.assign(e.style,{left:c.x+'%',top:c.y+'%',width:c.w+'%',height:c.h+'%',fontSize:c.fs+'px'});e.style.setProperty('--c',c.color);e.style.setProperty('--g',c.glow/100);if(c.textC)e.style.color=c.textC;
    const vert=c.dir==='v'||(c.dir==='auto'&&c.h*b.clientHeight>c.w*b.clientWidth);
    if(c.type==='block'){if(c.block==='pads'){if(!modeUsed){e.append($('#mode'));modeUsed=true}const g=el('div','padGrid');g._c=c;e.append(g)}else BLK[c.block].n.forEach(s=>e.append($(s)));if(liveEdit)e.append(el('b','lcR'));wireLive(e,c);b.append(e);return}
    if(c.type==='xy'){const H=el('i','lcH'),V=el('i','lcV'),D=el('i','lcD');e.append(H,V,D);e._show=()=>{const x=rngGet(c,c.tx)*100,y=(1-rngGet(c,c.ty))*100;D.style.left=V.style.left=x+'%';D.style.top=H.style.top=y+'%'}}
    else if(c.type==='slider'){const f=el('i','lcF');if(vert){e.dataset.v=1}e.append(f);e._show=()=>{f.style[vert?'height':'width']=rngGet(c,c.target)*100+'%'}}
    else if(c.type==='knob'){const k=el('i','lcK');e.append(k);e._show=()=>k.style.setProperty('--v',rngGet(c,c.target))}
    if(e._show)e._show();
    if(c.showL)e.append(el('span','lcL',liveLabel(c)));
    if(liveEdit)e.append(el('b','lcR'));
    wireLive(e,c);b.append(e)});drawPads()}
function wireLive(e,c){
  const area=$('#liveArea');let mode=null,sx,sy,ox,oy,ow,oh,moved,start,kv,lpT=0,padI=-1;
  const pad=ev=>{const q=e.getBoundingClientRect();rngSet(c,c.tx,(ev.clientX-q.left)/q.width);rngSet(c,c.ty,1-(ev.clientY-q.top)/q.height);e._show()};
  const slide=ev=>{const q=e.getBoundingClientRect();rngSet(c,c.target,e.dataset.v?1-(ev.clientY-q.top)/q.height:(ev.clientX-q.left)/q.width);e._show()};
  const knob=ev=>{rngSet(c,c.target,kv+(sy-ev.clientY)/170);e._show()};
  e.addEventListener('pointerdown',ev=>{if(c.type==='block'&&!liveEdit)return;ev.preventDefault();resume();e.setPointerCapture(ev.pointerId);sx=ev.clientX;sy=ev.clientY;
    if(liveEdit){mode=ev.target.classList.contains('lcR')?'size':'move';ox=c.x;oy=c.y;ow=c.w;oh=c.h;moved=false;const pe=ev.target.closest&&ev.target.closest('.pad');padI=pe?[...pe.parentNode.children].indexOf(pe):-1;clearTimeout(lpT);if(mode==='move')lpT=setTimeout(()=>{if(!moved){mode=null;if(padI>=0&&c.type==='block')padHold(c,padI);else liveSheet(c)}},470);return}
    if(!ctx)return;
    if(c.type==='btn'){e.classList.add('down');liveDown(c);return}
    if(c.type==='xy'){mode='pad';start=[rngGet(c,c.tx),rngGet(c,c.ty)];if(/^echo/.test(c.tx+c.ty))echoIn.gain.setTargetAtTime(.8,ctx.currentTime,.01);pad(ev);return}
    start=rngGet(c,c.target);kv=start;if(c.type==='knob'){mode='knob';return}mode='slide';slide(ev)});
  e.addEventListener('pointermove',ev=>{if(mode==='slide')return slide(ev);if(mode==='pad')return pad(ev);if(mode==='knob')return knob(ev);if(!mode)return;
    const dx=(ev.clientX-sx)/area.clientWidth*100,dy=(ev.clientY-sy)/area.clientHeight*100;if(Math.abs(dx)+Math.abs(dy)>1.2){moved=true;clearTimeout(lpT)}if(!moved)return;
    const G=liveSnap(c,mode,ox+dx,oy+dy,ow+dx,oh+dy,area);
    if(mode==='move'){c.x=G.x;c.y=G.y}else{c.w=G.w;c.h=G.h}
    liveGuides(area,G.gx,G.gy);
    Object.assign(e.style,{left:c.x+'%',top:c.y+'%',width:c.w+'%',height:c.h+'%'})});
  const up=()=>{clearTimeout(lpT);if(liveEdit){if(mode==='move'&&!moved)e._tap=1;else if(mode){drawLive();save()}mode=null;return}
    if(c.type==='btn'){e.classList.remove('down');if(ctx)liveUp(c)}
    else if(mode==='pad'){if(/^echo/.test(c.tx+c.ty)&&ctx)echoIn.gain.setTargetAtTime(0,ctx.currentTime,.02);if(c.spring){rngSet(c,c.tx,start[0]);rngSet(c,c.ty,start[1]);e._show()}}
    else if(mode==='slide'||mode==='knob'){const r=sliderRange(c.target),sp=c.spring===null?r&&r.spring!==undefined:c.spring;if(sp&&r){if(c.spring===null&&r.spring!==undefined)r.set(r.spring);else rngSet(c,c.target,start);e._show()}}
    mode=null};
  e.addEventListener('pointerup',up);e.addEventListener('pointercancel',up);
  e.addEventListener('click',()=>{if(e._tap){e._tap=0;if(c.type==='block'&&padI>=0){if(padSwap)padSwapTo(c,padI);else padEdit(c,padI)}else liveSheet(c)}});
}
const sizeRows=c=>[['w','Breite'],['h','Höhe'],['x','Links'],['y','Oben']].map(([k,l])=>`<div class="stp"><span>${l}</span><button class="act alt" data-z="${k}" data-d="-2" aria-label="${l} kleiner">−</button><b id="z${k}">${Math.round(c[k])} %</b><button class="act alt" data-z="${k}" data-d="2" aria-label="${l} größer">+</button></div>`).join('');
function wireSize(c){$$('#sheet [data-z]').forEach(b=>{let h;const k=b.dataset.z,d=+b.dataset.d,step=()=>{const A=liveA(),sc=100/(k==='w'||k==='x'?A.w:A.h),mx=k==='w'?100-c.x:k==='h'?100-c.y:k==='x'?100-c.w:100-c.h,mn=k==='w'||k==='h'?2:0;c[k]=Math.max(mn,Math.min(mx,c[k]+d*sc));$('#z'+k).textContent=Math.round(c[k])+' %';drawLive();save()};
  b.addEventListener('pointerdown',e=>{e.preventDefault();step();h=setTimeout(()=>h=setInterval(step,70),350)});['pointerup','pointercancel','pointerleave'].forEach(n=>b.addEventListener(n,()=>{clearTimeout(h);clearInterval(h)}))})}
let LIVEP=[];const saveLP=()=>idbSet('livep',JSON.stringify(LIVEP));
function savePreset(c){openSheet(`<h2>Als Vorlage speichern</h2><p>Die Vorlage steht dir in jedem Projekt unter „+ Vorlage“ bereit.</p><label>Name<input id="vN" type="text" maxlength="20" value="${esc(c.label||'Meine Vorlage')}"></label><div class="row"><button class="act" id="vS">Speichern</button><button class="act alt" id="sC">Abbrechen</button></div>`);$('#sC').onclick=()=>liveSheet(c);$('#vS').onclick=()=>{const{id,x,y,...rest}=c,A=liveA();rest.w=c.w*A.w/100;rest.h=c.h*A.h/100;LIVEP.push({...rest,pname:$('#vN').value.trim()||'Vorlage'});saveLP();toast('Vorlage gespeichert');liveSheet(c)}}
function presetSheet(){openSheet(`<h2>Deine Vorlagen</h2>${LIVEP.length?'<p>Tippe eine Vorlage an, um sie auf die Fläche zu legen.</p>':'<p>Noch keine Vorlagen. Öffne ein Element und tippe auf „Als Vorlage speichern“.</p>'}<div class="pkGal">${LIVEP.map((p,i)=>`<div class="pkRow" style="grid-template-columns:minmax(0,1fr) 44px"><button class="lbN" data-p="${i}">${esc(p.pname)}</button><button class="lbP" data-x="${i}" aria-label="${esc(p.pname)} löschen">✕</button></div>`).join('')}</div><div class="row"><button class="act full" id="sC">Fertig</button></div>`);$('#sC').onclick=closeSheet;
  $$('#sheet [data-p]').forEach(b=>b.onclick=()=>{const{pname,...p}=LIVEP[+b.dataset.p];S.live.push(fitNew({...p,id:Date.now()+Math.random()}));drawLive();save();closeSheet()});
  $$('#sheet [data-x]').forEach(b=>b.onclick=()=>{LIVEP.splice(+b.dataset.x,1);saveLP();presetSheet()})}
function liveSnap(c,mode,x,y,w,h,area){
  const tx=8/area.clientWidth*100,ty=8/area.clientHeight*100,gapX=6/area.clientWidth*100,gapY=6/area.clientHeight*100,O=S.live.filter(o=>o!==c),xs=[0,100],ys=[0,100],ws=[],hs=[];
  O.forEach(o=>{xs.push(o.x,o.x+o.w,o.x+o.w/2,o.x-gapX,o.x+o.w+gapX);ys.push(o.y,o.y+o.h,o.y+o.h/2,o.y-gapY,o.y+o.h+gapY);ws.push(o.w);hs.push(o.h)});
  const best=(vals,list,t)=>{let d=null,g=null;vals.forEach(v=>list.forEach(l=>{const m=l-v;if(Math.abs(m)<t&&(d===null||Math.abs(m)<Math.abs(d))){d=m;g=l}}));return{d:d||0,g}};
  const R={gx:null,gy:null};
  if(mode==='move'){w=c.w;h=c.h;const a=best([x,x+w,x+w/2],xs,tx),b=best([y,y+h,y+h/2],ys,ty);R.x=Math.max(0,Math.min(100-w,x+a.d));R.y=Math.max(0,Math.min(100-h,y+b.d));R.gx=a.g;R.gy=b.g}
  else{const a=best([c.x+w],xs,tx),b=best([c.y+h],ys,ty);let W=w+a.d,H=h+b.d;R.gx=a.g;R.gy=b.g;ws.forEach(v=>{if(Math.abs(v-w)<tx){W=v;R.gx=c.x+v}});hs.forEach(v=>{if(Math.abs(v-h)<ty){H=v;R.gy=c.y+v}});R.w=Math.max(2,Math.min(100-c.x,W));R.h=Math.max(2,Math.min(100-c.y,H))}
  return R}
function liveGuides(area,gx,gy){[['lgX',gx,'left'],['lgY',gy,'top']].forEach(([id,v,k])=>{let e=document.getElementById(id);if(v===null){if(e)e.remove();return}if(!e){e=el('i','lg '+id);e.id=id;area.append(e)}e.style[k]=v+'%'})}
let padSwap=null;
function padHold(c,i){const t=tr(c.ids[i]);openSheet(`<h2>${t?esc(t.name):'Leeres Pad'}</h2><div class="row"><button class="act full" id="phS">Sound mit anderem Pad tauschen</button><button class="act alt" id="phE">Sound-Einstellungen</button><button class="act alt" id="phB">Größe des Blocks</button><button class="act alt" id="phX">Pad leeren</button><button class="act alt" id="phD">Block löschen</button><button class="act alt full" id="sC">Abbrechen</button></div>`);
  $('#phS').onclick=()=>padSwapStart(c,i);$('#phX').onclick=()=>{c.ids[i]=null;if(c.acts)c.acts[i]='play';drawPads();save();closeSheet()};$('#phD').onclick=()=>{openSheet(`<h2>Block löschen?</h2><p>Der Pad-Block verschwindet von der Fläche. Deine Kanäle und Noten im Rack bleiben.</p><div class="row"><button class="act" id="dY">Löschen</button><button class="act alt" id="dN">Abbrechen</button></div>`);$('#dY').onclick=()=>{S.live=S.live.filter(x=>x!==c);drawLive();save();closeSheet()};$('#dN').onclick=()=>padHold(c,i)};$('#phE').onclick=()=>padEdit(c,i);$('#phB').onclick=()=>liveSheet(c);$('#sC').onclick=closeSheet}
function padSwapStart(c,i){padSwap={c,i};closeSheet();swapBar();drawPads()}
function swapBar(){const b=$('#swapBar');b.style.display=padSwap?'':'none'}
function padSwapTo(c,i){const s=padSwap;padSwap=null;swapBar();if(s.c===c&&s.i===i){drawPads();return}const a=s.c.acts||(s.c.acts=[]),b=c.acts||(c.acts=[]);[s.c.ids[s.i],c.ids[i]]=[c.ids[i],s.c.ids[s.i]];[a[s.i],b[i]]=[b[i],a[s.i]];drawPads();save();toast('Getauscht')}
let padCtx=null;const PADACT=[['play','Sound anschlagen'],['toggle','Antippen: stumm an/aus'],['holdm','Halten: stumm'],['holdo','Halten: hörbar']];
function padEdit(c,i){const t=tr(c.ids[i]);if(!t)return padAssign(c,i);sel=t.id;padCtx={c,i};channelSheet()}
function padAssign(c,i){openSheet(`<h2>Pad belegen</h2><p>Wähle einen Kanal aus dem Rack oder lade einen neuen Sound. Liegt ein Kanal auf zwei Pads, reagieren beide gemeinsam.</p><div class="row"><button class="act full" id="paN">Neuen Sound laden</button></div><div class="pkGal">${S.tracks.map(t=>{const u=S.live.some(l=>(l.ids||[]).includes(t.id));return `<button class="lbN" data-t="${t.id}">${esc(t.name)}${u?' (schon auf einem Pad)':''}</button>`}).join('')}</div><div class="row"><button class="act alt" id="paX">Pad leeren</button><button class="act alt" id="sC">Abbrechen</button></div>`);
  $$('#sheet [data-t]').forEach(b=>b.onclick=()=>{c.ids[i]=+b.dataset.t;drawLive();save();closeSheet()});$('#paX').onclick=()=>{c.ids[i]=null;drawLive();save();closeSheet()};$('#sC').onclick=closeSheet;
  $('#paN').onclick=()=>soundPicker('Sound für dieses Pad',async(buf,name)=>{const t=await newChannel(buf,name,'Live');if(t){c.ids[i]=t.id;drawLive();save();toast(name+' liegt auf dem Pad')}closeSheet()},()=>padAssign(c,i))}
function areaResize(k,nw){const A=liveA(),old=A[k];if(nw===old)return;A[k]=nw;if(k==='z')return;const f=old/nw,p=k==='w'?'x':'y';S.live.forEach(c=>{c[k]=Math.min(100,c[k]*f);c[p]=Math.max(0,Math.min(100-c[k],c[p]*f))})}
function areaSheet(){const A=S.area=S.area||{w:100,h:100,z:100},R=[['w','Fläche Breite',100,400,25],['h','Fläche Höhe',100,400,25],['z','Ansicht',50,150,10]];
  openSheet(`<h2>Fläche</h2><p>Mach die Fläche größer und scrolle mit dem Finger über freie Stellen. Mit Ansicht siehst du mehr oder weniger davon auf einmal.</p>${R.map(r=>`<div class="stp"><span>${r[1]}</span><button class="act alt" data-a="${r[0]}" data-d="-1" aria-label="Kleiner">−</button><b id="a${r[0]}">${A[r[0]]} %</b><button class="act alt" data-a="${r[0]}" data-d="1" aria-label="Größer">+</button></div>`).join('')}<div class="row"><button class="act alt" id="aR">Standard</button><button class="act" id="sC">Fertig</button></div>`);
  $$('#sheet [data-a]').forEach(b=>b.onclick=()=>{const r=R.find(x=>x[0]===b.dataset.a);const k=r[0],old=A[k],nw=Math.max(r[2],Math.min(r[3],old+r[4]*+b.dataset.d));areaResize(k,nw);$('#a'+k).textContent=A[k]+' %';drawLive();save()});
  $('#aR').onclick=()=>{areaResize('w',100);areaResize('h',100);A.z=100;drawLive();save();areaSheet()};$('#sC').onclick=closeSheet}
const seg=(id,opts,val)=>`<div class="segRow" id="${id}">${opts.map(o=>`<button class="act ${o[0]===val?'sel':'alt'}" data-v="${o[0]}">${o[1]}</button>`).join('')}</div>`;
function liveSheet(c){
  if(c.type==='block'){openSheet(`<h2>${BLK[c.block].t}</h2><p>Spielt das, was im Rack steht. Änderungen hier gelten überall.</p>${c.block==='pads'?['cols','rows'].map((k,i)=>`<div class="stp"><span>${i?'Reihen':'Spalten'}</span><button class="act alt" data-g="${k}" data-d="-1" aria-label="Weniger">−</button><b id="g${k}">${c[k]||(i?2:4)}</b><button class="act alt" data-g="${k}" data-d="1" aria-label="Mehr">+</button></div>`).join('')+`<p>Alle Pads dieses Blocks</p><div class="segRow" style="flex-wrap:wrap">${PADACT.map(o=>`<button class="act alt" style="flex:1 1 45%" data-all="${o[0]}">${o[1]}</button>`).join('')}</div>`:''}${sizeRows(c)}<div class="row"><button class="act alt" id="lD">Entfernen</button><button class="act" id="sC">Fertig</button></div>`);wireSize(c);$$('#sheet [data-all]').forEach(b=>b.onclick=()=>{const v=b.dataset.all;c.acts=(c.ids||[]).map(()=>v);(c.ids||[]).forEach(id=>{const t=tr(id);if(t)t.mute=v==='holdo'});drawPads();drawRack();save();toast('Für alle Pads gesetzt')});$$('#sheet [data-g]').forEach(b=>b.onclick=()=>{const k=b.dataset.g;c[k]=Math.max(1,Math.min(8,(c[k]||(k==='cols'?4:2))+ +b.dataset.d));$('#g'+k).textContent=c[k];drawLive();save()});$('#lD').onclick=()=>{S.live=S.live.filter(x=>x!==c);drawLive();save();closeSheet()};$('#sC').onclick=closeSheet;return}
  const kind=kindOf(c),isHit=c.target&&c.target.startsWith('hit:'),opts=sel=>liveTargets(kind==='btn'?'btn':'val').map(o=>`<option value="${o[0]}"${o[0]===sel?' selected':''}>${esc(o[1])}</option>`).join('');
  openSheet(`<h2>${{btn:'Knopf',slider:'Slider',knob:'Knob',xy:'XY-Kasten'}[c.type]}</h2>
  ${c.type==='btn'?`<div class="row"><button class="act full" id="lS">Eigenen Sound auf diesen Knopf laden</button></div>`:''}
  ${c.type==='xy'?['tx','ty'].map((k,i)=>`<label>${i?'Y, hoch und runter':'X, links und rechts'}<select id="l${k}">${opts(c[k])}</select></label>`).join(''):`<label>Belegung<select id="lT">${opts(c.target)}</select></label>`}
  <label>Beschriftung<input id="lL" type="text" maxlength="18" value="${esc(c.label)}" placeholder="${esc(liveLabel({...c,label:''}))}"></label>
  ${c.type==='btn'&&isHit?`<p>Was der Knopf macht</p><div class="segRow" id="lA" style="flex-wrap:wrap">${[['play','Sound anschlagen'],['toggle','Antippen: stumm an/aus'],['holdm','Halten: stumm'],['holdo','Halten: hörbar']].map(o=>`<button class="act ${c.act===o[0]?'sel':'alt'}" style="flex:1 1 45%" data-v="${o[0]}">${o[1]}</button>`).join('')}</div><p>${c.act==='play'?'Spielt den Sound einmal.':'Steuert den Kanal, der im Rack läuft. Der Knopf leuchtet, solange der Kanal zu hören ist.'}</p>${c.act==='play'?`<p>Beim Loslassen</p>${seg('lH',[[0,'Sound läuft weiter'],[1,'Sound stoppt']],c.hold?1:0)}`:''}`:''}
  ${c.type!=='btn'?`<p>Beim Loslassen</p>${seg('lSp',[['auto','Automatisch'],[1,'Zurückspringen'],[0,'Stehen bleiben']],c.spring===null?'auto':c.spring?1:0)}`:''}
  ${c.type==='slider'?`<p>Richtung</p>${seg('lDir',[['auto','Automatisch'],['h','Waagerecht'],['v','Senkrecht']],c.dir)}`:''}
  ${c.type!=='btn'?`<label><span>Bereich von: <span id="vlo">${c.lo}</span> %</span><input id="llo" type="range" min="0" max="100" value="${c.lo}" data-def="0"></label><label><span>Bereich bis: <span id="vhi">${c.hi}</span> %</span><input id="lhi" type="range" min="0" max="100" value="${c.hi}" data-def="100"></label>`:''}
  <h3>Aussehen</h3>
  <p>Form</p>${seg('lSh',[['eck','Eckig'],['schraeg','Schräg'],['rund','Rund'],['hex','Sechseck']],c.shape)}
  <p>Stil</p>${seg('lLk',[['neon','Neon'],['voll','Voll'],['umriss','Umriss'],['glas','Glas']],c.look)}
  <div class="colorRow"><span>Farbe</span><input id="lC" type="color" value="${c.color}"></div>
  <div class="colorRow"><span>Schriftfarbe</span><input id="lTc" type="color" value="${c.textC||'#ffffff'}"></div>
  <label><span>Leuchten: <span id="vgl">${c.glow}</span> %</span><input id="lG" type="range" min="0" max="100" value="${c.glow}" data-def="60"></label>
  <label><span>Schriftgröße: <span id="vfs">${c.fs}</span></span><input id="lF" type="range" min="10" max="34" value="${c.fs}" data-def="15"></label>
  ${sizeRows(c)}
  <div class="row"><button class="act alt" id="lTx">${c.showL?'Text ausblenden':'Text einblenden'}</button><button class="act alt" id="lCp">Duplizieren</button><button class="act alt" id="lVg">Als Vorlage speichern</button><button class="act alt" id="lFr">Nach vorne</button><button class="act alt" id="lR">Standard</button><button class="act alt" id="lD">Löschen</button><button class="act full" id="sC">Fertig</button></div>`);
  const chg=()=>{drawLive();save()},segOn=(id,f)=>$$(`#${id} button`).forEach(b=>b.onclick=()=>{f(b.dataset.v);chg();const t=$('#sheet').scrollTop;liveSheet(c);$('#sheet').scrollTop=t});
  if(c.type==='btn')$('#lS').onclick=()=>soundPicker('Sound für diesen Knopf',async(buf,name)=>{const t=await newChannel(buf,name,'Live');if(t){c.target='hit:'+t.id;if(!c.label)c.label=name.slice(0,18);chg();toast(name+' liegt auf dem Knopf')}liveSheet(c)},()=>liveSheet(c));
  if(c.type==='xy')['tx','ty'].forEach(k=>$('#l'+k).onchange=e=>{c[k]=e.target.value;chg()});else $('#lT').onchange=e=>{c.target=e.target.value;chg();liveSheet(c)};
  $('#lL').oninput=e=>{c.label=e.target.value;chg()};$('#lC').oninput=e=>{c.color=e.target.value;chg()};$('#lTc').oninput=e=>{c.textC=e.target.value;chg()};
  const rg=(id,k,v)=>{const e=$('#'+id);if(e)e.oninput=()=>{c[k]=+e.value;$('#'+v).textContent=e.value;chg()}};rg('lG','glow','vgl');rg('lF','fs','vfs');wireSize(c);$('#lVg').onclick=()=>savePreset(c);$('#lFr').onclick=()=>{S.live=S.live.filter(x=>x!==c);S.live.push(c);chg();toast('Liegt jetzt vorne')};rg('llo','lo','vlo');rg('lhi','hi','vhi');
  segOn('lSh',v=>c.shape=v);segOn('lLk',v=>c.look=v);
  if($('#lA'))segOn('lA',v=>{c.act=v;const t=tr(+c.target.split(':')[1]);if(t){t.mute=v==='holdo';drawPads();drawRack()}});if($('#lH'))segOn('lH',v=>c.hold=v==='1');if($('#lSp'))segOn('lSp',v=>c.spring=v==='auto'?null:v==='1');if($('#lDir'))segOn('lDir',v=>c.dir=v);
  $('#lTx').onclick=()=>{c.showL=!c.showL;chg();liveSheet(c)};
  $('#lCp').onclick=()=>{const d={...c,id:Date.now()+Math.random(),x:Math.min(100-c.w,c.x+3),y:Math.min(100-c.h,c.y+3)};S.live.push(d);chg();closeSheet()};
  $('#lR').onclick=()=>{Object.assign(c,LOOK,{label:''});chg();liveSheet(c)};
  $('#lD').onclick=()=>{S.live=S.live.filter(x=>x!==c);chg();closeSheet()};$('#sC').onclick=closeSheet;
}
function addLive(type){const C={btn:['#ff2a6d',38,40,24,16],slider:['#22e6ff',20,44,60,12],knob:['#b14dff',38,38,24,16],xy:['#ff2a6d',20,28,60,34]}[type],c=lv(type,C[1],C[2],C[3],C[4],type==='btn'?'hit:'+sel:type==='xy'?'':'filter',C[0]);if(type==='xy'){c.tx='echot';c.ty='echof'}fitNew(c);S.live.push(c);drawLive();save();if(type==='btn')liveSheet(c)}
function liveClearSheet(){openSheet(`<h2>Live-Fläche leeren?</h2><p>Alle Knöpfe, Slider, Knobs und XY-Kästen verschwinden. Deine Sounds bleiben.</p><div class="row"><button class="act" id="cY">Alles entfernen</button><button class="act alt" id="sC">Abbrechen</button></div>`);$('#cY').onclick=()=>{S.live=[];drawLive();save();closeSheet()};$('#sC').onclick=closeSheet}

/* ---------- Mix-Check ---------- */
const BANDS=[['Sub',20,60,8,35],['Bass',60,250,25,55],['Tiefe Mitten',250,1000,6,22],['Mitten',1000,4000,4,20],['Höhen',4000,20000,1,14]];
const dB=x=>x>0?20*Math.log10(x):-99;
async function mixCheck(){
  await resume();const was=playing;if(!was)await togglePlay();
  openSheet(`<h2>Mix-Check läuft</h2><p>Die App hört jetzt 8 Sekunden lang zu. Lass es einfach laufen.</p><canvas class="ed" id="mcBar" height="10"></canvas>`);
  const N=S.slots.map(()=>({pk:0,e:0,n:0})),bins=new Float32Array(slotN[0].an.frequencyBinCount),pow=BANDS.map(()=>0),a=new Float32Array(2048),T0=performance.now(),LEN=8000,ny=ctx.sampleRate/2;
  await new Promise(done=>{const tick=()=>{const t=performance.now()-T0;
      S.slots.forEach((s,i)=>{const R=N[i];slotN[i].an.getFloatTimeDomainData(a);let e=0;for(const x of a){const v=Math.abs(x);if(v>R.pk)R.pk=v;e+=x*x}R.e+=e/a.length;R.n++});
      slotN[0].an.getFloatFrequencyData(bins);bins.forEach((d,j)=>{if(!isFinite(d))return;const f=j/bins.length*ny,p=Math.pow(10,d/10);BANDS.forEach((b,k)=>{if(f>=b[1]&&f<b[2])pow[k]+=p})});
      const c=$('#mcBar');if(c&&c.clientWidth){const{g,w}=sizeCanvas(c,10);g.fillStyle=prCol()('--hot');g.fillRect(0,0,w*t/LEN,10)}
      if(t<LEN)setTimeout(tick,60);else done()};tick()});
  if(!was)await togglePlay();mixReport(N,pow);
}
function mixReport(N,pow){
  const M=N[0],rms=dB(Math.sqrt(M.e/Math.max(1,M.n))),pk=dB(M.pk),tot=pow.reduce((a,b)=>a+b,0)||1,rows=[],row=(st,t,x)=>rows.push([st,t,x]);
  if(M.pk<.002){openSheet(`<h2>Mix-Check</h2><p>Es war nichts zu hören. Setze Noten ins Pattern und prüfe, ob Kanäle stumm sind.</p><div class="row"><button class="act full" id="sC">Fertig</button></div>`);$('#sC').onclick=closeSheet;return}
  if(pk>0)row('bad','Master übersteuert',`Spitzen bei +${pk.toFixed(1)} dB. Zieh die Slots runter oder leg einen Limiter auf den Master.`);else if(pk>-1)row('warn','Master sehr knapp',`Spitze bei ${pk.toFixed(1)} dB. Lass etwas Luft nach oben.`);else row('ok','Spitzenpegel passt',`Spitze bei ${pk.toFixed(1)} dB.`);
  if(rms<-20)row('warn','Mix ist leise',`Durchschnitt ${rms.toFixed(1)} dB. Für Hardtekk darf es lauter sein.`);else if(rms>-6)row('bad','Mix ist sehr dicht',`Durchschnitt ${rms.toFixed(1)} dB. Das kann platt klingen und verzerren.`);else row('ok','Lautheit passt',`Durchschnitt ${rms.toFixed(1)} dB.`);
  const cf=pk-rms;if(cf<5)row('warn','Wenig Dynamik',`Nur ${cf.toFixed(1)} dB zwischen Spitze und Durchschnitt. Die Kick verliert so an Punch.`);
  const bars=BANDS.map((b,k)=>{const v=pow[k]/tot*100,rv=Math.round(v),st=rv<b[3]?'low':rv>b[4]?'high':'ok';if(st==='high')row('warn',b[0]+' zu stark',`${v.toFixed(0)} % der Energie, gut wären bis ${b[4]} %. Senke den Bereich mit dem EQ oder nimm den Sound leiser.`);if(st==='low')row('warn',b[0]+' zu schwach',`${v.toFixed(0)} % der Energie, gut wären ab ${b[3]} %.`);return{n:b[0],v,st,lo:b[3],hi:b[4]}});
  const lvl=[];S.slots.forEach((s,i)=>{if(!i||N[i].pk<.002)return;const r=dB(Math.sqrt(N[i].e/Math.max(1,N[i].n))),p=dB(N[i].pk);lvl.push({n:s.name,r,p});if(p>0)row('bad',s.name+' übersteuert',`Spitze bei +${p.toFixed(1)} dB. Zieh den Slot runter.`)});
  const kk=S.tracks.find(t=>t.src==='Kick'&&!t.mute),bs=S.tracks.find(t=>t.src==='Bass'&&!t.mute);
  if(kk&&bs&&kk.slot!==bs.slot&&N[kk.slot].pk>.002&&N[bs.slot].pk>.002){const d=dB(Math.sqrt(N[kk.slot].e/N[kk.slot].n))-dB(Math.sqrt(N[bs.slot].e/N[bs.slot].n));if(d<-6)row('warn','Kick geht unter',`Die Kick ist ${(-d).toFixed(1)} dB leiser als der Bass. Bei Hardtekk sollte sie führen.`)}
  const col={ok:'var(--ice)',warn:'var(--lit)',bad:'var(--rec)'},mx=Math.max(...lvl.map(l=>l.r),-60);
  openSheet(`<h2>Mix-Check</h2><p>Die Werte sind Richtwerte für Hardtekk. Am Ende entscheiden deine Ohren, vergleiche auch mit Tracks, die du gut findest.</p>
  ${rows.map(r=>`<div class="mcR" style="--s:${col[r[0]]}"><b>${esc(r[1])}</b><span>${esc(r[2])}</span></div>`).join('')}
  <h3>Frequenzen</h3>${bars.map(b=>`<div class="mcB"><span>${b.n}</span><i><u style="left:${Math.min(100,b.lo*1.4)}%;width:${Math.min(100,(b.hi-b.lo)*1.4)}%"></u><em style="width:${Math.min(100,b.v*1.4)}%;background:${b.st==='ok'?'var(--ice)':'var(--lit)'}"></em></i><b>${b.v.toFixed(0)} %</b></div>`).join('')}
  ${lvl.length?`<h3>Slots</h3>${lvl.map(l=>`<div class="mcB"><span>${esc(l.n)}</span><i><em style="width:${Math.max(3,100+(l.r-mx)*3)}%;background:var(--hot)"></em></i><b>${l.r.toFixed(1)} dB</b></div>`).join('')}`:''}
  <div class="row" style="margin-top:9px"><button class="act alt" id="mcA">Nochmal prüfen</button><button class="act" id="sC">Fertig</button></div>`);
  $('#mcA').onclick=mixCheck;$('#sC').onclick=closeSheet;
}

/* ---------- Bindungen: einzelne Werte für den Live-Tab freigeben ---------- */
const uid=()=>Date.now()+Math.floor(Math.random()*1e6);
function ensureFxIds(){S.binds=S.binds||[];S.slots.forEach(s=>s.fx.forEach(f=>{if(!f.id)f.id=uid()}))}
function fxBy(fid){for(let i=0;i<S.slots.length;i++){const k=S.slots[i].fx.findIndex(f=>f.id===fid);if(k>=0)return{i,k,f:S.slots[i].fx[k]}}return null}
const pGet=(P,p)=>p.split('.').reduce((o,k)=>o&&o[k],P);
const pSet=(P,p,v)=>{const a=p.split('.'),l=a.pop();a.reduce((o,k)=>o[k],P)[l]=v};
function fxParams(f){const D=FX[f.t],r=(D.s||[]).map(s=>({path:s[0],name:s[1],min:s[2],max:s[3],step:s[4],log:s[0]==='f'}));
  if(f.t==='eq')f.p.b.forEach((_,j)=>r.push({path:`b.${j}.f`,name:`Punkt ${j+1} Frequenz`,min:20,max:20000,step:1,log:true},{path:`b.${j}.g`,name:`Punkt ${j+1} Lautstärke`,min:-18,max:18,step:.5},{path:`b.${j}.q`,name:`Punkt ${j+1} Breite`,min:.3,max:10,step:.1}));
  return r}
let bindQ=new Set(),bindRaf=0;
function bindApply(n){bindQ.add(n);if(!bindRaf)bindRaf=requestAnimationFrame(()=>{bindRaf=0;bindQ.forEach(x=>{try{x.set()}catch(e){}});bindQ.clear()})}
function bindRef(b){
  if(b.kind==='fx'){const h=fxBy(b.fid);if(!h)return null;return{get:()=>pGet(h.f.p,b.path),set:v=>{[b.fid,...(b.links||[])].forEach(id=>{const x=fxBy(id);if(!x)return;pSet(x.f.p,b.path,v);const n=fxNode(x.i,x.k);if(n)bindApply(n)});save()}}}
  if(b.kind==='svol'){const s=S.slots[b.slot];return s&&{get:()=>s.vol,set:v=>{s.vol=v;slotVol(b.slot);save()}}}
  const t=tr(b.tid);if(!t)return null;
  if(b.kind==='tvol')return{get:()=>t.vol,set:v=>{t.vol=v;wireTrack(t);save()}};
  if(b.kind==='tpan')return{get:()=>t.pan,set:v=>{t.pan=v;wireTrack(t);save()}};
  return null}
function bindRange(id){const b=(S.binds||[]).find(x=>x.id===id),r=b&&bindRef(b);if(!r)return null;
  const to=u=>{let v=b.log?b.min*Math.pow(b.max/b.min,u):b.min+(b.max-b.min)*u;if(b.step)v=Math.round(v/b.step)*b.step;return +v.toFixed(4)},from=v=>b.log?Math.log(v/b.min)/Math.log(b.max/b.min):(v-b.min)/((b.max-b.min)||1);
  return{min:0,max:1,get:()=>Math.max(0,Math.min(1,from(r.get()))),set:u=>r.set(to(u))}}
const fmtV=(b,v)=>b.log&&v>=1000?(v/1000).toFixed(2)+' k':(+v).toFixed(b.step&&b.step<1?(b.step<.1?2:1):0);
function bindSheet(d,back){
  let b=S.binds.find(x=>x.kind===d.kind&&x.fid===d.fid&&x.path===d.path&&x.slot===d.slot&&x.tid===d.tid);const isNew=!b;if(isNew)b={...d,lo:d.min,hi:d.max,id:uid()};
  const pos=v=>Math.round((d.log?Math.log(v/d.lo0)/Math.log(d.hi0/d.lo0):(v-d.lo0)/((d.hi0-d.lo0)||1))*1000),val=p=>{const u=p/1000;let v=d.log?d.lo0*Math.pow(d.hi0/d.lo0,u):d.lo0+(d.hi0-d.lo0)*u;if(d.step)v=Math.round(v/d.step)*d.step;return +v.toFixed(4)};
  d.lo0=d.lo0??d.min;d.hi0=d.hi0??d.max;const min0=b.min,max0=b.max;
  openSheet(`<h2>Live binden</h2><p>${esc(d.label)}</p>
  <label><span>Minimum: <span id="bMn">${fmtV(d,b.min)}</span></span><input id="bMi" type="range" min="0" max="1000" value="${pos(b.min)}" data-def="0"></label>
  <label><span>Maximum: <span id="bMx">${fmtV(d,b.max)}</span></span><input id="bMa" type="range" min="0" max="1000" value="${pos(b.max)}" data-def="1000"></label>
  <p>Der Regler im Live-Tab bleibt immer zwischen diesen beiden Werten.</p>
  ${isNew||d.kind!=='fx'?'':'<div class="row"><button class="act alt full" id="bLn">Auch auf andere Slots legen</button></div>'}<div class="row"><button class="act" id="bS">${isNew?'Binden':'Speichern'}</button><button class="act alt" id="bK">Binden und Knob anlegen</button>${isNew?'':'<button class="act alt full" id="bX">Bindung entfernen</button>'}<button class="act alt full" id="bB">Zurück</button></div>`);
  let mn=b.min,mx=b.max;$('#bMi').oninput=e=>{mn=val(+e.target.value);$('#bMn').textContent=fmtV(d,mn)};$('#bMa').oninput=e=>{mx=val(+e.target.value);$('#bMx').textContent=fmtV(d,mx)};
  const commit=()=>{b.min=mn;b.max=mx;if(isNew)S.binds.push(b);const r=bindRef(b);if(r){const v=r.get(),l=Math.min(mn,mx),h=Math.max(mn,mx);if(v<l)r.set(l);if(v>h)r.set(h)}save()};
  if($('#bLn'))$('#bLn').onclick=()=>bindLinkSheet(b,back);
  $('#bS').onclick=()=>{commit();toast('Gebunden. Im Live-Tab unter + Bindung');back()};
  $('#bK').onclick=()=>{commit();const c=lv('knob',38,38,24,16,'bind:'+b.id,'#b14dff');c.label=d.short||'';fitNew(c);S.live.push(c);save();toast('Knob liegt im Live-Tab');back()};
  if(!isNew)$('#bX').onclick=()=>{S.binds=S.binds.filter(x=>x!==b);S.live=S.live.filter(c=>c.target!=='bind:'+b.id);save();back()};$('#bB').onclick=back;
}
const bound=(fn)=>(S.binds||[]).some(fn);
function bindChips(f,i,k){const sN=S.slots[i].name,D=FX[f.t],ps=fxParams(f);
  return `<h3>Live binden</h3><p>Wähle die Werte, die du im Live-Tab steuern willst.</p><div class="bndC">${ps.map((p,j)=>`<button class="chip${bound(b=>b.fid===f.id&&b.path===p.path)?' on':''}" data-bp="${j}">${esc(p.name)}</button>`).join('')}<button class="chip${bound(b=>b.fid===f.id&&b.kind==='on')?' on':''}" id="bOn">An und Aus</button></div>`}
function wireChips(f,i,k){const ps=fxParams(f),sN=S.slots[i].name,D=FX[f.t];
  $$('#sheet [data-bp]').forEach(e=>e.onclick=()=>{const p=ps[+e.dataset.bp];bindSheet({kind:'fx',fid:f.id,path:p.path,min:p.min,max:p.max,step:p.step,log:p.log,label:`${sN}, ${D.name}: ${p.name}`,short:p.name},()=>fxSheet(i,S.slots[i].fx.indexOf(f)))});
  $('#bOn').onclick=()=>{const h=S.binds.find(b=>b.fid===f.id&&b.kind==='on');if(h){S.binds=S.binds.filter(b=>b!==h);S.live=S.live.filter(c=>c.target!=='bindon:'+h.id);toast('Bindung entfernt')}else{S.binds.push({id:uid(),kind:'on',fid:f.id,label:`${sN}, ${D.name}: An und Aus`});toast('Gebunden. Im Live-Tab unter + Bindung')}save();fxSheet(i,S.slots[i].fx.indexOf(f))}}
function bindPick(){const L=(S.binds||[]).filter(b=>b.kind==='on'?fxBy(b.fid):bindRef(b));
  openSheet(`<h2>Bindungen</h2>${L.length?'<p>Tippe auf eine Art, um die Bindung auf die Fläche zu legen.</p>':'<p>Noch nichts gebunden. Öffne im Mixer einen Effekt und wähle unter Live binden die Werte aus.</p>'}
  ${L.map(b=>`<div class="bnR"><b>${esc(b.label)}</b>${b.kind==='on'?`<button class="chip" data-a="${b.id}" data-t="btn">Knopf</button><button class="chip" data-lk="${b.id}">Slots${(b.links||[]).length?' +'+b.links.length:''}</button>`:`<span>${fmtV(b,b.min)} bis ${fmtV(b,b.max)}</span><button class="chip" data-a="${b.id}" data-t="knob">Knob</button><button class="chip" data-a="${b.id}" data-t="slider">Slider</button>${b.kind==='fx'?`<button class="chip" data-lk="${b.id}">Slots${(b.links||[]).length?' +'+b.links.length:''}</button>`:''}`}</div>`).join('')}
  <div class="row"><button class="act full" id="sC">Fertig</button></div>`);$('#sC').onclick=closeSheet;
  $$('#sheet [data-lk]').forEach(e=>e.onclick=()=>bindLinkSheet(S.binds.find(x=>x.id===+e.dataset.lk),bindPick));
  $$('#sheet [data-a]').forEach(e=>e.onclick=()=>{const id=+e.dataset.a,b=S.binds.find(x=>x.id===id),ty=e.dataset.t,C={btn:[24,16],knob:[24,16],slider:[60,12]}[ty],c=lv(ty,38,40,C[0],C[1],(b.kind==='on'?'bindon:':'bind:')+id,ty==='slider'?'#22e6ff':'#b14dff');if(ty==='slider')c.dir='h';c.label=(b.short||b.label.split(': ').pop()).slice(0,18);fitNew(c);S.live.push(c);drawLive();save();closeSheet()})}
function bindLinkSheet(b,back){const h=fxBy(b.fid);if(!h)return back();const T=h.f.t,D=FX[T];b.links=(b.links||[]).filter(fxBy);
  openSheet(`<h2>Auf andere Slots legen</h2><p>${esc(b.label)}. Der Regler steuert alle verbundenen Slots gemeinsam. Hat ein Slot den Effekt ${D.name} noch nicht, wird er mit deinen Einstellungen dorthin kopiert.</p>
  ${S.slots.map((s,i)=>{if(i===h.i)return'';const l=b.links.map(fxBy).find(x=>x&&x.i===i);return `<div class="bnR" style="grid-template-columns:minmax(0,1fr) auto auto"><b style="grid-column:auto">${i?i+': ':''}${esc(s.name)}</b>${l?`<button class="chip" data-c="${l.f.id}">Einstellungen übernehmen</button><button class="chip on" data-u="${l.f.id}">Verbunden</button>`:`<button class="chip" data-l="${i}">Verbinden</button>`}</div>`}).join('')}
  <div class="row"><button class="act full" id="sC">Fertig</button></div>`);
  const clone=()=>JSON.parse(JSON.stringify(h.f.p));
  $$('#sheet [data-l]').forEach(e=>e.onclick=async()=>{await resume();const i=+e.dataset.l;let f=S.slots[i].fx.find(x=>x.t===T&&!b.links.includes(x.id));if(!f){if(S.slots[i].fx.length>=6)return toast('Dieser Slot hat schon 6 Effekte.');f={id:uid(),t:T,on:h.f.on,p:clone()};S.slots[i].fx.push(f);rebuildSlot(i)}b.links.push(f.id);drawMixer();save();bindLinkSheet(b,back)});
  $$('#sheet [data-u]').forEach(e=>e.onclick=()=>{b.links=b.links.filter(x=>x!==+e.dataset.u);save();bindLinkSheet(b,back)});
  $$('#sheet [data-c]').forEach(e=>e.onclick=()=>{const x=fxBy(+e.dataset.c);if(x){x.f.p=clone();rebuildSlot(x.i);save();toast('Einstellungen übernommen')}});
  $('#sC').onclick=back}
/* ---------- Leistung ---------- */
const PERF={late:0,fps:0,fr:0,t:0,long:0};
function perfTick(now){PERF.fr++;if(now-PERF.t>=1000){PERF.fps=PERF.fr;PERF.fr=0;PERF.t=now}}
function perfSheet(){const fx=S.slots.reduce((a,s)=>a+s.fx.filter(f=>f.on).length,0),hv=S.slots.reduce((a,s)=>a+s.fx.filter(f=>f.on&&(f.t==='reverb'||f.t==='gate'||f.t==='half')).length,0),vo=Object.values(voices).reduce((a,v)=>a+v.length,0),lat=ctx?Math.round(((ctx.baseLatency||0)+(ctx.outputLatency||0))*1000):0;
  openSheet(`<h2>Leistung</h2><p>Starte dein Projekt, spiele etwas und schau hier nach. Aussetzer sollten bei 0 bleiben.</p>
  ${[['Aussetzer im Timing',PERF.late],['Bilder pro Sekunde',PERF.fps],['Stimmen gerade',vo],['Aktive Effekte',fx],['Davon schwer',hv],['Kanäle',S.tracks.length],['Audio-Verzögerung',lat+' ms']].map(r=>`<div class="stp" style="grid-template-columns:1fr auto"><span>${r[0]}</span><b>${r[1]}</b></div>`).join('')}
  <p style="margin-top:9px">Audio-Puffer</p><div class="segRow" id="pfB">${[['0','Schnell'],['1','Mittel'],['2','Stabil']].map(o=>`<button class="act ${(()=>{let v='1';try{v=localStorage.getItem('tekk-buf')??'1'}catch(e){}return v})()===o[0]?'sel':'alt'}" data-v="${o[0]}">${o[1]}</button>`).join('')}</div><p>Bei Knacksen: Stabil. Pads reagieren dann etwas später. Die App startet zum Umstellen neu.</p><div class="row"><button class="act alt" id="pfR">Zähler zurücksetzen</button><button class="act" id="sC">Fertig</button></div>`);$('#pfR').onclick=()=>{PERF.late=0;perfSheet()};$$('#pfB button').forEach(b=>b.onclick=async()=>{try{localStorage.setItem('tekk-buf',b.dataset.v)}catch(e){}await idbSet('state',JSON.stringify(S));location.reload()});$('#sC').onclick=closeSheet}

