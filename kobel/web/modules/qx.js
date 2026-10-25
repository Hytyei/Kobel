/* ───────── Question experience: motion, animated backgrounds, combo, letter tiles, logo motion ─────────
   Wraps the question screen (setMain / resolve / openOverlay / resultScreen are renamed *0 by patches.py and wrapped here). */
const QX={lc:0,kd:null};
const qxReduce=()=>{try{return matchMedia('(prefers-reduced-motion:reduce)').matches}catch(e){return false}};
const qxSoundOn=()=>{try{return !!S.settings.sound}catch(e){return false}};

/* ---- animated background + dots, added once per session overlay ---- */
function qxDecorate(el){
  if(!el||el.querySelector('.qx-bg'))return;
  const bg=document.createElement('div');bg.className='qx-bg';bg.setAttribute('aria-hidden','true');
  bg.innerHTML='<i class="qx-str"></i><i class="qx-hl"></i><i class="qx-rail"></i>';
  el.insertBefore(bg,el.firstChild);
  const fl=document.createElement('div');fl.className='qx-flash';fl.id='qxf';el.insertBefore(fl,bg.nextSibling);
  const top=el.querySelector('.ses-top');if(top){const d=document.createElement('div');d.className='qx-dots';d.id='qxd';top.appendChild(d)}
}
function openOverlay(rush){
  openOverlay0(rush);
  QX.lc=0;
  const el=$('#ses');qxDecorate(el);
  if(!qxReduce()){const k=document.createElement('div');k.className='qx-kick';k.innerHTML='<i></i>';document.body.appendChild(k);setTimeout(()=>k.remove(),1000)}
}
function setMain(h){
  setMain0(h);
  const m=$('#sMain');if(!m)return;
  m.classList.remove('qx-in');void m.offsetWidth;m.classList.add('qx-in');if(ses&&ses.i>0)sfx('whoosh');
  m.querySelectorAll('.opt').forEach((e,i)=>e.style.setProperty('--i',i));
  const tk=m.dataset.qt=String(Date.now());
  setTimeout(()=>{if(m.dataset.qt===tk)m.classList.remove('qx-in')},1300);
}

/* ---- progress dots, combo chip, milestones ---- */
function qxDots(){
  const d=$('#qxd');if(!d||!ses||!ses.items)return;
  const n=ses.items.length;if(n>30||ses.rush){d.style.display='none';return}
  while(d.children.length<n)d.appendChild(document.createElement('i'));
  while(d.children.length>n)d.lastChild.remove();
  const h=ses.qxHist||[];
  [...d.children].forEach((e,i)=>{const r=h[i];e.className=r==='ok'?'g':r==='close'?'n':r==='bad'?'r':''});
}
const QX_MILES={3:['Hattrick','3 in a row'],5:['On fire','5 in a row'],8:['Unstoppable','8 in a row'],12:['Weltklasse','12 in a row'],16:['Legende','16 in a row'],20:['Unfassbar','20 in a row']};
function qxChime(n){sfx('combo',n)}
function qxMile(n){
  const k=QX_MILES[n]||(n>20&&n%10===0?['Unfassbar',n+' in a row']:null);if(!k)return;
  const s=$('#ses');if(!s)return;
  const e=document.createElement('div');e.className='qx-ms';e.innerHTML=`<b>${k[0]}</b><i>${k[1]}</i>`;s.appendChild(e);setTimeout(()=>e.remove(),1600);
  qxChime(n);vib([18,30,18,30,40]);
  if(typeof confetti==='function'&&n>=5)try{confetti()}catch(er){}
}
function qxCombo(){
  const c=$('#cmb');if(!c||!ses)return;
  if(ses.arcade&&!ses.rush)return;           // arcade shows its own score here
  const n=ses.combo|0,prev=QX.lc;
  const tier=n>=12?4:n>=8?3:n>=5?2:n>=2?1:0;
  if(n>=2){
    c.className='combo t'+tier;
    c.innerHTML=`<span class="cf">${SVG_FLAME}</span><b>×${n}</b>`;
    if(n!==prev){void c.offsetWidth;c.classList.add('pulse')}
  }else if(prev>=3&&n===0){
    c.className='combo lost t1';c.innerHTML=`<span class="cf">${SVG_FLAME}</span><b>×${prev}</b>`;
    setTimeout(()=>{if(ses&&ses.combo===0){c.className='combo';c.innerHTML=''}},650);
  }else{c.className='combo';c.innerHTML=''}
  if(n!==prev){
    const s=$('#ses');if(s)s.classList.toggle('qx-hot',n>=5);
    if(n>prev)qxMile(n);
  }
  QX.lc=n;
}
function qxBurst(el,good){
  if(!el||qxReduce()||!el.animate)return;
  const r=el.getBoundingClientRect();if(!r.width)return;
  const cx=r.left+Math.min(r.width,260)/2+(r.width>260?(r.width-260)/2:0),cy=r.top+r.height/2;
  const cols=good?['#2fd27a','#9dffc6','#fff','#ffd23f']:['#D20515','#ff7a85'];
  for(let i=0;i<14;i++){
    const p=document.createElement('i');p.className='qx-p';p.style.cssText=`left:${cx}px;top:${cy}px;background:${cols[i%cols.length]}`;document.body.appendChild(p);
    const a=Math.random()*Math.PI*2,d=60+Math.random()*90,s=.6+Math.random()*.9;
    p.animate([{transform:'translate(-50%,-50%) scale(1)',opacity:1},{transform:`translate(${Math.cos(a)*d-4}px,${Math.sin(a)*d-30}px) rotate(${Math.random()*360}deg) scale(${s})`,opacity:0}],{duration:600+Math.random()*300,easing:'cubic-bezier(.1,.7,.3,1)'}).onfinish=()=>p.remove();
  }
}
function resolve(it,res,info={}){
  if(ses.locked)return;
  const c0=ses.combo|0;
  resolve0(it,res,info);
  S.stats.qn=(S.stats.qn|0)+1;
  try{
    if(!ses.qxHist)ses.qxHist=[];ses.qxHist[Math.min(ses.i,99)]=res;
    const m=$('#sMain'),good=res!=='bad';
    const t=m&&m.querySelector('.opt.ok,.qx-slots,.ansline,.blank.filled,.inp,.qx-tok.right,.dline');
    if(good)qxBurst(t,true);
    const f=$('#qxf');if(f){f.className='qx-flash '+(good?'good':'bad');void f.offsetWidth;}
    const i=m&&m.querySelector('.inp');if(i)i.classList.add(good?'qx-good':'qx-bad');
    qxDots();
    const trk=$('#trk');if(trk)trk.classList.toggle('perfect',ses.wrong===0&&(ses.correct|0)>=3);
    qxCombo();
  }catch(e){}
}
function resultScreen(cfg){
  try{
    if(ses&&(ses.maxCombo|0)>=3)cfg.extra=noteCard(FLAME(20),tx(`Best run: ${ses.maxCombo} correct in a row`,`Beste Serie: ${ses.maxCombo} richtige in Folge`))+(cfg.extra||'');
    if(ses&&ses.wrong===0&&(ses.correct|0)>=5)cfg.extra=noteCard('★',tx('A perfect run, no mistakes.','Perfekter Lauf, kein Fehler.'))+(cfg.extra||'');
  }catch(e){}
  resultScreen0(cfg);
  try{const f=$('#sMain .fin');if(f&&cfg.mood!=='oops'&&!qxReduce()){f.insertAdjacentHTML('afterbegin','<div class="qx-stamp"></div>');setTimeout(()=>sfx('stamp'),330)}}catch(e){}
}

/* ---- letter tiles: the spelling game and the sentence builder ----
   Slots show how many letters there are, tapping a tile flies it into the next free slot (or back), the first mistake is
   forgiven (right letters turn green and stay), a hint locks the next correct letter, a correct word submits itself. */
const QX_ICO={hint:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/></svg>',clear:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>'};
function qxBuild(it,o){
  const U=o.units,sol=o.sol||U,n=sol.length,m=U.length,word=!!o.word,ts=word?0:(m<=6?54:m<=8?44:m<=10?34:m<=12?29:26);
  let order=U.map((_,i)=>i),tries=0;
  do{order=shuffle(order.slice());tries++}while(n>1&&m===n&&order.every((v,i)=>U[v]===sol[i])&&tries<8);
  const T=U.map((u,i)=>({id:i,u,slot:-1,lock:false})),slots=Array(n).fill(null);
  let hints=0,attempts=0,done=false,busy=false;
  setMain(`${o.head}<div class="qx-b ${word?'word':''}" style="--ts:${ts}px" id="qxb"><div class="qx-slots" id="qxs">${sol.map((_,k)=>`<div class="qx-slot" data-k="${k}"></div>`).join('')}</div><div class="qx-meter" id="qxm"></div>
    <div class="qx-bank">${order.map(id=>`<div class="qx-cell" data-id="${id}"></div>`).join('')}</div>
    <div class="qx-acts">${o.hint?`<button type="button" id="qxh">${QX_ICO.hint}${tx('Hint','Tipp')}</button>`:''}<button type="button" id="qxc">${QX_ICO.clear}${tx('Reset','Neu')}</button></div><div class="qx-msg" id="qxg"></div></div>`);
  setFoot(`<div class="row2"><button class="btn ghost" id="skp" style="flex:none;width:34%">${tx('Skip','Weiter')}</button><button class="btn" id="chk" disabled>${tx('Check','Prüfen')}</button></div>`);
  const root=$('#qxb'),slotEl=[...root.querySelectorAll('.qx-slot')],cellEl={};
  root.querySelectorAll('.qx-cell').forEach(c=>cellEl[c.dataset.id]=c);
  order.forEach((id,k)=>{
    const t=T[id],b=document.createElement('button');b.type='button';b.className='qx-t in'+(t.u==='I'||t.u==='l'?' ser':'');b.textContent=t.u;b.style.setProperty('--i',k);b.dataset.id=id;
    b.addEventListener('animationend',()=>b.classList.remove('in'),{once:true});
    t.el=b;cellEl[id].appendChild(b);
  });
  const msg=s=>{const g=$('#qxg');if(g)g.textContent=s||''};
  const filled=()=>slots.filter(v=>v!==null).length;
  const isRight=()=>slots.every((id,k)=>id!==null&&U[id]===sol[k]);
  const refresh=()=>{
    const f=filled(),full=f===n,m=$('#qxm');if(m)m.textContent=`${f} / ${n}`;
    const nx=slots.findIndex(v=>v===null);slotEl.forEach((s,k)=>s.classList.toggle('nx',k===nx&&!done));
    const c=$('#chk');if(c){c.disabled=!full||done;c.classList.toggle('ready',full&&!done)}
    root.querySelectorAll('.qx-cell').forEach(c=>c.classList.toggle('used',c.children.length===0));
  };
  const flip=fn=>{
    const before=T.map(t=>t.el.getBoundingClientRect());fn();
    if(qxReduce()||!T[0].el.animate)return;
    T.forEach((t,i)=>{const a=before[i],b=t.el.getBoundingClientRect(),dx=a.left-b.left,dy=a.top-b.top;
      if(Math.abs(dx)+Math.abs(dy)>2)t.el.animate([{transform:`translate(${dx}px,${dy}px) scale(1.1)`,zIndex:6},{transform:'none',zIndex:6}],{duration:280,easing:'cubic-bezier(.2,.9,.3,1)'})});
  };
  const put=(t,k)=>{slots[k]=t.id;t.slot=k;slotEl[k].appendChild(t.el)};
  const take=t=>{if(t.slot>=0){slots[t.slot]=null;t.slot=-1}cellEl[t.id].appendChild(t.el)};
  const firstFree=()=>slots.findIndex(v=>v===null);
  const tap=t=>{
    if(done||ses.locked||busy||t.lock)return;
    if(t.slot<0){const k=firstFree();if(k<0)return;flip(()=>put(t,k))}else flip(()=>take(t));
    sfx(t.slot<0?'back':'slot',t.slot<0?0:t.slot);vib(6);msg('');refresh();
    if(filled()===n&&isRight())setTimeout(()=>submit(false),380);
  };
  root.addEventListener('click',e=>{const b=e.target.closest('.qx-t');if(b)tap(T[+b.dataset.id])});
  $('#qxc').onclick=()=>{if(done||busy)return;flip(()=>T.forEach(t=>{if(!t.lock&&t.slot>=0)take(t)}));msg('');refresh()};
  const hb=$('#qxh');
  if(hb)hb.onclick=()=>{
    if(done||busy||ses.locked||hints>=n-1)return;
    const k=sol.findIndex((u,i)=>{const id=slots[i];return !(id!==null&&T[id].lock)&&!(id!==null&&U[id]===u)});
    if(k<0)return;
    const cur=slots[k]!==null?T[slots[k]]:null;
    let cand=T.find(t=>!t.lock&&t.u===sol[k]&&t.slot<0)||T.find(t=>!t.lock&&t.u===sol[k]&&t.slot>=0&&t.slot!==k);
    if(!cand)return;
    hints++;
    flip(()=>{if(cur)take(cur);if(cand.slot>=0)take(cand);put(cand,k);cand.lock=true;cand.el.classList.add('lock')});
    sfx('hint');msg(tx('Hint used: that letter is locked in.','Tipp benutzt: Dieser Buchstabe ist fest.'));refresh();
    if(hints>=n-1)hb.disabled=true;
    if(filled()===n&&isRight())setTimeout(()=>submit(false),380);
  };
  const submit=skip=>{
    if(done||ses.locked)return;
    if(skip){done=true;T.forEach(t=>t.el.classList.add('lock'));refresh();resolve(it,'bad',o.info(false,hints,attempts));return}
    if(filled()<n)return;
    if(isRight()){
      done=true;slots.forEach((id,k)=>{const el=T[id].el;el.style.setProperty('--i',k);el.classList.add('hit')});refresh();
      resolve(it,hints||attempts?'close':'ok',o.info(true,hints,attempts));return;
    }
    attempts++;
    if(attempts>=2){
      done=true;slots.forEach((id,k)=>{T[id].el.classList.add(U[id]===sol[k]?'keep':'miss')});refresh();
      resolve(it,'bad',o.info(false,hints,attempts));return;
    }
    busy=true;
    const wrong=[];slots.forEach((id,k)=>{const t=T[id];if(U[id]===sol[k]){t.lock=true;t.el.classList.add('lock')}else{t.el.classList.add('miss');wrong.push(t)}});
    msg(tx('Not quite. The green ones are right, try the rest again.','Noch nicht. Die grünen stimmen, versuch den Rest nochmal.'));sfx('bad');vib([20,30,20]);
    setTimeout(()=>{if(done)return;flip(()=>wrong.forEach(t=>{t.el.classList.remove('miss');take(t)}));busy=false;refresh()},750);
  };
  $('#chk').onclick=()=>submit(false);$('#skp').onclick=()=>submit(true);
  QX.kd=e=>{
    if(!$('#qxb')||done||busy||ses.locked||e.ctrlKey||e.metaKey||e.altKey)return;
    if(document.activeElement&&/INPUT|TEXTAREA/.test(document.activeElement.tagName))return;
    if(e.key==='Backspace'){const k=slots.map((v,i)=>v!==null&&!T[v].lock?i:-1).filter(i=>i>=0).pop();if(k!==undefined){e.preventDefault();tap(T[slots[k]])}}
    else if(e.key==='Enter'){if(filled()===n){e.preventDefault();submit(false)}}
    else if(!word&&e.key.length===1){const ch=e.key.toLowerCase(),t=T.find(t=>!t.lock&&t.slot<0&&t.u.toLowerCase()===ch);if(t){e.preventDefault();tap(t)}}
  };
  refresh();
}
if(!window.__qxKeys){window.__qxKeys=1;document.addEventListener('keydown',e=>{if(QX.kd)QX.kd(e)})}

R.scr=it=>{
  const c=byId(it.cid),word=c.de,U=[...word];
  qxBuild(it,{units:U,hint:true,
    head:`${tagH(tx('Unscramble','Buchstaben ordnen'),'lilac')}<h2 class="q" style="font-size:28px">${esc(c.en)} ${speakBtn(disDe(c))}</h2><p class="sub">${c.art?`<span class="art ${c.art}">${c.art}</span> `:''}${U.length} ${tx('letters','Buchstaben')}</p>`,
    info:(ok,h,a)=>Object.assign(infoFor(c,fmtDe(c)),{msg:h?tx('You used a hint.','Mit Tipp.'):tx('Second try.','Zweiter Versuch.'),hints:h})});
};
R.order=it=>{
  const c=byId(it.cid),s=sentenceOf(c),words=s.de.split(/\s+/);
  qxBuild(it,{units:words,word:true,
    head:`${tagH(tx('Build the sentence','Satz bauen'),'berry')}<h2 class="q" style="font-size:24px">${esc(s.en)}</h2>`,
    info:()=>({answer:esc(s.de),say:s.de})});
};

/* duel and group games: same slot look for the typed letters */
function qxSlots(arr,n){
  const m=Math.max(n||0,arr.length);let h='';
  for(let k=0;k<m;k++)h+=`<div class="qx-slot${arr[k]!==undefined?' f':''}">${arr[k]!==undefined?esc(arr[k]):''}</div>`;
  return h;
}
function qxShow(el,arr,n){el.classList.add('qx-slots');el.innerHTML=qxSlots(arr,n)}

/* ---- logo motion: splash ---- */
function qxSplash(){
  try{
    if(qxReduce()||/debug|nosplash/.test(location.hash||'')||document.getElementById('qxs'))return;
    const s=document.createElement('div');s.id='qxs';s.className='qxs';
    s.innerHTML=`<svg class="qxs-pitch" viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="36" pathLength="1"/><circle cx="100" cy="100" r="62" pathLength="1"/><circle cx="100" cy="100" r="90" pathLength="1"/></svg>
    <div class="qxs-in"><div style="position:relative"><div class="qxs-ring"></div><div class="qxs-ring r2"></div><div class="qxs-mark"><i class="qxs-bg"></i><i class="qxs-eg"></i><i class="qxs-sh"></i></div></div>
    <div class="qxs-word">${[...'KOBEL'].map((ch,i)=>`<span style="animation-delay:${.95+i*.07}s">${ch}</span>`).join('')}</div><div class="qxs-tag">Deutsch · Bundesliga der Wörter</div></div>`;
    document.body.appendChild(s);
    const kill=()=>{if(s.parentNode)s.remove();qxShine()};
    s.addEventListener('click',()=>{s.style.transition='opacity .25s';s.style.opacity='0';setTimeout(kill,260)});
    setTimeout(kill,2500);
  }catch(e){}
}
function qxShine(){
  const l=document.querySelector('.b3-logo');if(!l||qxReduce())return;
  l.classList.remove('qx-shine');void l.offsetWidth;l.classList.add('qx-shine');setTimeout(()=>l.classList.remove('qx-shine'),1000);
}
qxSplash();
try{let hid=0;document.addEventListener('visibilitychange',()=>{if(document.hidden)hid=Date.now();else if(hid&&Date.now()-hid>30000)qxShine()})}catch(e){}
