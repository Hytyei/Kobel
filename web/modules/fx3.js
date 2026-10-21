/* ═════════ 3.0 celebrations: promotion, streak, level, goal, matchday, stage, path levels ═════════ */
const CEL={q:[],busy:false,timer:0,cur:null};
const celClub=()=>{const c=clubOf(myAvatar());return{cc:c?c[3]:'#D20515',ci:c?inkOn(c[3]):'#fff'}};
const celReduce=()=>{try{return matchMedia('(prefers-reduced-motion:reduce)').matches}catch(e){return false}};
const CEL_UP='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="square"><path d="M12 20V5M5 12l7-7 7 7"/></svg>';
const CEL_DN='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="square"><path d="M12 4v15M5 12l7 7 7-7"/></svg>';
function celebrate(o,delay){
  if(o.k==='md')CEL.q=CEL.q.filter(x=>x.k!=='md');
  CEL.q.push(o);
  if(!CEL.busy){CEL.busy=true;clearTimeout(CEL.timer);CEL.timer=setTimeout(celNext,delay==null?900:delay)}
}
function celNext(){
  const o=CEL.q.shift();
  if(!o){CEL.busy=false;if(!ses&&!$('#po'))render();return}
  closeSheet();celShow(o);
}
const letters=(t,d0=.5)=>{let i=0;return String(t).split(' ').map(w=>`<span class="wd" style="display:inline-block;white-space:nowrap">${w.split('').map(ch=>`<span style="animation-delay:${(d0+(i++)*.055).toFixed(2)}s">${esc(ch)}</span>`).join('')}</span>`).join('<span class="sp"></span>')};
function celSfx(k){
  if(!S.settings.sound)return;
  const seq={promo:[[392,0],[523,.12],[659,.24],[784,.36],[1046,.5],[1318,.66]],streak:[[330,0],[415,.1],[523,.2],[659,.3],[880,.45]],level:[[523,0],[659,.1],[784,.2],[1046,.34]],goal:[[587,0],[740,.12],[880,.26]],md:[[523,0],[659,.12],[784,.24]],stars:[[659,.3],[784,.6],[1046,.9]],down:[[294,0],[247,.18],[196,.36]]}[k];
  if(seq)seq.forEach(([f,t])=>tone(f,t,.34,k==='down'?'sawtooth':'triangle',k==='down'?.05:.12));
}
function celConfetti(cv,power){
  if(celReduce()||!cv)return;
  const ctx=cv.getContext('2d'),w=cv.width=innerWidth,h=cv.height=innerHeight,{cc}=celClub();
  const cols=[cc,'#FFFFFF','#FFD200','#2BA3E0','#1FB45A','#FF4B5C'],ps=[];
  const burst=(x,ang,n)=>{for(let i=0;i<n;i++){const a=ang+(Math.random()-.5)*.9,v=14+Math.random()*13;ps.push({x,y:h+10,vx:Math.cos(a)*v,vy:-Math.sin(a)*v,s:6+Math.random()*8,r:Math.random()*6,vr:(Math.random()-.5)*.4,c:cols[rnd(cols.length)],k:rnd(3),g:.34+Math.random()*.1})}};
  const rain=n=>{for(let i=0;i<n;i++)ps.push({x:Math.random()*w,y:-20-Math.random()*h*.4,vx:(Math.random()-.5)*2,vy:2+Math.random()*3,s:6+Math.random()*7,r:Math.random()*6,vr:(Math.random()-.5)*.3,c:cols[rnd(cols.length)],k:rnd(3),g:.06})};
  const t0=performance.now();let fired=0;
  (function step(now){
    if(!cv.isConnected)return;
    const t=now-t0;
    if(fired===0&&t>400){burst(w*.08,1.15,45*power);burst(w*.92,2.0,45*power);fired=1}
    if(fired===1&&t>1100&&power>1){burst(w*.2,1.3,30);burst(w*.8,1.85,30);fired=2}
    if(power>1&&t>1600&&t<4200&&Math.random()<.35)rain(3);
    ctx.clearRect(0,0,w,h);
    for(let i=ps.length-1;i>=0;i--){const p=ps[i];p.vy+=p.g;p.vx*=.992;p.x+=p.vx;p.y+=p.vy;p.r+=p.vr;
      if(p.y>h+30){ps.splice(i,1);continue}
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.r);ctx.fillStyle=p.c;
      if(p.k===0)ctx.fillRect(-p.s/2,-p.s/3,p.s,p.s*.6);else if(p.k===1){ctx.beginPath();ctx.arc(0,0,p.s*.42,0,7);ctx.fill()}else{ctx.beginPath();ctx.moveTo(0,-p.s/2);ctx.lineTo(p.s/2,p.s/2);ctx.lineTo(-p.s/2,p.s/2);ctx.fill()}
      ctx.restore()}
    if(t<7000&&(ps.length||t<1500))requestAnimationFrame(step);else ctx.clearRect(0,0,w,h);
  })(t0);
}
function celCount(el,from,to,ms,pre=''){
  if(!el)return;const t0=performance.now();
  (function s(now){const p=Math.min(1,(now-t0)/ms),e=1-Math.pow(1-p,3);el.textContent=pre+Math.round(from+(to-from)*e);if(p<1&&el.isConnected)requestAnimationFrame(s)})(t0);
}
const STREAK_MS={3:['Three in a row','Drei am Stück'],7:['A week unbeaten','Eine Woche ungeschlagen'],14:['Two weeks strong','Zwei Wochen stark'],21:['Three weeks on fire','Drei Wochen in Flammen'],30:['A month without a miss','Ein Monat ohne Ausfall'],50:['Fifty days','Fünfzig Tage'],75:['Seventy-five days','Fünfundsiebzig Tage'],100:['One hundred days','Hundert Tage'],150:['150 days','150 Tage'],200:['200 days','200 Tage'],365:['A full year','Ein ganzes Jahr']};
const CELV={
  streak(o){
    const ms=STREAK_MS[o.n],{cc}=celClub();
    const sparks=Array.from({length:9},(_,i)=>`<i class="spk" style="--sx:${(i-4)*14}px;--sd:${(1+i*.18).toFixed(2)}s;left:${44+i*1.4}%"></i>`).join('');
    const kick=o.saved==='playoff'?tx('Play-Off won','Play-Off gewonnen'):o.saved==='joker'?tx('Joker used','Joker eingesetzt'):ms?tx('Milestone','Meilenstein'):tx('Streak extended','Serie verlängert');
    const msg=o.saved==='playoff'?tx('Streak saved at the last second. Class from you.','Serie in letzter Sekunde gerettet. Stark.'):o.saved==='joker'?tx('A joker covered the missed day. Do not push your luck.','Ein Joker hat den verpassten Tag gedeckt. Nicht übertreiben.'):ms?tx(ms[0]+'. Keep the fire going.',ms[1]+'. Halte das Feuer am Brennen.'):o.n===1?tx('The fire is lit. Come back tomorrow.','Das Feuer brennt. Komm morgen wieder.'):tx('Come back tomorrow to keep it alive.','Komm morgen wieder, damit es weiterbrennt.');
    return{cls:'k-streak',cc:o.saved?'#2BA3E0':'#FF5A3C',conf:ms||o.saved?2:0,sfx:'streak',vib:[30,40,30,40,80],html:`<div class="cel-k">${kick}</div>
      <div class="cel-fl"><div class="core">${SVG_FLAME}</div><div class="core2">${SVG_FLAME}</div><div class="core3">${SVG_FLAME}</div>${sparks}</div>
      <div class="cel-num"><b id="celn">${Math.max(0,o.n-1)}</b></div>
      <div class="cel-t" style="--d:1.1s;margin-top:4px">${tx(o.n===1?'day streak':'day streak','Tage in Serie')}</div>
      ${weekBoxes(true)}
      <div class="cel-s" style="--d:1.7s">${msg}${o.gotFreeze?`<br><b style="color:#fff">+1 ${tx('joker earned','Joker verdient')}</b>`:''}</div>`,
      run(el){setTimeout(()=>{const n=$('#celn',el);if(n){n.textContent=o.n;n.classList.add('pop')}},1500)}};
  },
  level(o){
    const {cc,ci}=celClub();
    return{cls:'k-level',conf:1,sfx:'level',vib:[30,30,60],html:`<div class="cel-k">${tx('Level up','Level aufgestiegen')}</div><div class="cel-lv" style="margin-top:16px">${o.n}</div>
      <div class="cel-t" style="--d:.9s">${esc(o.title)}</div><div class="cel-s" style="--d:1.1s">${o.newTitle?tx('New title unlocked.','Neuer Titel freigeschaltet.'):tx('Every point counts. Keep going.','Jeder Punkt zählt. Weiter so.')}</div>
      <div class="cel-lvb"><i data-w="${lvlPct()}%"></i></div>`,run(el){setTimeout(()=>{const i=$('.cel-lvb i',el);if(i)i.style.width=i.dataset.w},50)}};
  },
  goal(o){
    const r=86,C=2*Math.PI*r;
    return{cls:'k-goal',cc:'#1FB45A',conf:1,sfx:'goal',vib:[20,30,60],html:`<div class="cel-k">${tx('Daily goal','Tagesziel')}</div>
      <div class="cel-ring" style="margin-top:14px"><svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="${r}" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="14"/><circle class="v" cx="100" cy="100" r="${r}" fill="none" stroke="#1FB45A" stroke-width="14" stroke-linecap="butt" style="--C:${C}"/></svg><div class="ck"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="square"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div></div>
      <div class="cel-t" style="--d:1.2s">${tx('Goal reached','Ziel erreicht')}</div><div class="cel-s" style="--d:1.4s">${o.xp} / ${o.goal} ${tx('points today','Punkte heute')}</div>`};
  },
  md(o){
    const win=o.res[0]==='W',col=win?'#1FB45A':o.res==='D'?'#F5A524':'#D20515',nm={ 'W+':tx('Perfect week','Perfekte Woche'),W:tx('Matchday won','Spieltag gewonnen'),D:tx('Draw','Remis'),L:tx('Matchday lost','Spieltag verloren'),X:tx('No-show','Nicht angetreten')}[o.res];
    return{cls:'k-md',cc:col,conf:win?1:0,sfx:win?'md':'down',vib:win?[30,30,60]:[60],html:`<div class="cel-k">${tx('Matchday','Spieltag')} ${o.n} · ${tx('Full time','Abpfiff')}</div>
      <div class="cel-res" style="--rc:${col};margin-top:16px">${o.res==='X'?'R':o.res[0]}${o.res==='W+'?'<small style="font-size:40px">+</small>':''}</div>
      <div class="cel-t" style="--d:.9s">${nm}</div>
      <div class="cel-row" style="--d:1.2s;grid-template-columns:repeat(3,1fr)"><div><b>${o.tore}</b><span>${tx('points','Punkte')}</span></div><div><b>${o.days}/7</b><span>${tx('active days','Tage')}</span></div><div><b id="celm">0</b><span>LP</span></div></div>
      <div class="cel-s" style="--d:1.5s">${win?tx('Target reached. Form goes up.','Ziel erreicht. Die Form steigt.'):o.res==='D'?tx('Close. Reach the target on four days next week.','Knapp. Erreiche nächste Woche das Ziel an vier Tagen.'):tx('Your form drops. A good week fixes it.','Deine Form sinkt. Eine gute Woche macht es wieder gut.')}</div>`,
      run(el){celCount($('#celm',el),0,o.d,1200,o.d>0?'+':'')}};
  },
  zone(o){
    const ti=tierInfo(),nx=ti.nx;
    return{cls:'k-zone',cc:'#2ED177',conf:1,sfx:'level',vib:[30,40,60],html:`<div class="cel-k">${tx('Promotion zone','Aufstiegsplatz')}</div>
      <div class="cel-up" style="margin-top:18px;transform:scale(1.6)">${CEL_UP}</div>
      <div class="cel-sh" style="margin-top:10px">${nx?tierShield(ti.i+1,190):tierShield(ti.i,190)}</div>
      <h1 class="cel-h" style="font-size:clamp(36px,12vw,56px)">${letters(tx('You are up','Du bist oben'),.5)}</h1>
      <div class="cel-s" style="--d:1.3s">${nx?tx(`Your league points reach the ${nx.n} line. Hold it until the season ends to be promoted.`,`Deine Liga-Punkte erreichen die Linie zur ${nx.n}. Halte sie bis zum Saisonende, um aufzusteigen.`):''}</div>`};
  },
  stage(o){
    return{cls:'k-stage',conf:1,sfx:'level',vib:[30,40,60],html:`<div class="cel-k">${tx('New career stage','Neue Karrierestufe')}</div>
      <div class="cel-sh" style="margin-top:14px;height:190px">${tierShield(o.ti,170)}</div>
      <h1 class="cel-h" style="font-size:clamp(34px,11vw,54px)">${letters(o.n,.5)}</h1><div class="cel-s" style="--d:1.2s">${esc(o.d)}</div>`};
  },
  pathlvl(o){
    const big=o.end||o.newUnit,txt=o.end?tx('Path complete','Pfad geschafft'):o.newUnit?tx('Unit complete','Einheit geschafft'):o.newCh?tx('Chapter complete','Kapitel geschafft'):tx('Level complete','Stufe geschafft');
    return{cls:'k-path',cc:'#1FB45A',conf:big?2:o.stars===3?1:0,sfx:'stars',vib:[20,40,20,40,80],html:`<div class="cel-k">${esc(o.unit||'')}</div>
      <h1 class="cel-h" style="font-size:clamp(36px,12vw,58px);margin-top:10px">${letters(txt,.2)}</h1>
      <div class="cel-stars" style="margin-top:12px">${[0,1,2].map(i=>`<span class="${i<o.stars?'on':'off'}" style="animation-delay:${(.5+i*.3).toFixed(2)}s">★</span>`).join('')}</div>
      <div class="cel-t" style="--d:1.5s;font-size:26px">${esc(o.label||'')}</div>
      <div class="cel-s" style="--d:1.7s">${o.newUnit?tx('A new unit is open. Harder words ahead.','Eine neue Einheit ist offen. Schwerere Wörter warten.'):o.newCh?tx('Next chapter unlocked.','Nächstes Kapitel freigeschaltet.'):o.stars===3?tx('Flawless. Three stars.','Fehlerfrei. Drei Sterne.'):tx('Next level unlocked.','Nächste Stufe freigeschaltet.')}</div>`};
  },
  season(o){
    const up=o.out==='up',dn=o.out==='down',T=TIERS,{cc}=celClub();
    const hint=dn?tx('Hit your weekly target and keep your words fresh to climb back.','Erreiche dein Wochenziel und halte deine Wörter frisch, um zurückzukommen.'):up?tx('New league, new vocabulary. Keep the streak alive.','Neue Liga, neuer Wortschatz. Halte die Serie am Leben.'):tx('Keep going: the next promotion is closer than you think.','Weiter so: der nächste Aufstieg ist näher, als du denkst.');
    return{cls:'k-season '+(dn?'down':''),cc:dn?'#5B6670':up?cc:'#2BA3E0',conf:up?2:dn?0:1,sfx:dn?'down':'promo',vib:up?[40,40,40,40,120]:[60],html:`<div class="cel-k">${tx('Season','Saison')} ${o.n} · ${tx('Full time','Abpfiff')}</div>
      ${up?`<div class="cel-up" style="margin-top:14px">${CEL_UP}</div>`:dn?`<div class="cel-up" style="margin-top:14px;color:#FF4B5C">${CEL_DN}</div>`:'<div style="height:44px"></div>'}
      <div class="cel-sh" style="${dn?'filter:grayscale(.7)':''}">${tierShield(o.to,190)}${up||dn?`<div class="cel-from">${tierShield(o.from,64)}</div>`:''}</div>
      <h1 class="cel-h">${letters(up?tx('Promoted!','Aufstieg!'):dn?tx('Relegated','Abstieg'):tx('Safe!','Klassenerhalt!'),.6)}</h1>
      <div class="cel-t" style="--d:1.2s">${esc(T[o.to].n)}</div><div class="cel-s" style="--d:1.35s">${T[o.to].lv} · ${o.lp} LP. ${hint}</div>
      <div class="cel-row" style="--d:1.5s"><div class="w"><b>${o.w}</b><span>${tx('Wins','Siege')}</span></div><div class="d"><b>${o.d}</b><span>${tx('Draws','Remis')}</span></div><div class="l"><b>${o.l}</b><span>${tx('Losses','Niederlagen')}</span></div></div>`,
      btns:openExam()&&!up?'':''};
  }
};
function celShow(o){
  const v=CELV[o.k];if(!v){celNext();return}
  const d=v(o),{cc,ci}=celClub();CEL.cur=o;
  const el=document.createElement('div');el.id='cel';el.className='cel '+(d.cls||'');
  el.style.setProperty('--cc',d.cc||cc);el.style.setProperty('--ci',ci);
  const ex=o.k==='season'&&openExam()?`<button class="cel-ok" data-x="exam" style="--d:2.1s">${tx('Play the season final','Saisonfinale spielen')}</button>`:'';
  el.innerHTML=`<div class="cel-bg"><i class="glow"></i><i class="rays"></i><i class="ring"></i><i class="ring"></i><i class="ring"></i></div><canvas class="cel-cf"></canvas><div class="cel-in">${d.html}<button class="cel-ok" data-x="ok">${tx('Continue','Weiter')}</button>${ex}</div>`;
  document.body.appendChild(el);
  celSfx(d.sfx);if(d.vib)vib(d.vib);
  if(d.conf)celConfetti(el.querySelector('.cel-cf'),d.conf);
  if(d.run)d.run(el);
  const born=Date.now();
  el.addEventListener('click',e=>{
    const b=e.target.closest('[data-x]');
    if(b&&b.dataset.x==='exam'){celClose(()=>startExam());return}
    if(b||Date.now()-born>2600)celClose();
  });
}
function celClose(after){
  const el=$('#cel');if(!el)return;
  el.classList.add('out');
  setTimeout(()=>{el.remove();window.__b3pop=CEL.cur&&CEL.cur.k==='streak';
    const chip=document.querySelector('.b3-chip');if(chip&&window.__b3pop){chip.classList.add('bump')}
    if(after){CEL.q=[];CEL.busy=false;after();return}
    setTimeout(()=>{if(CEL.q.length)celNext();else{CEL.busy=false;if(!ses&&!$('#po'))render();window.__b3pop=false}},180)},280);
}
/* lower-third banner for small wins (badges, quests) */
function b3Banner(ic,t,s){
  const old=$('.b3-ban');if(old)old.remove();
  const b=document.createElement('div');b.className='b3-ban';b.innerHTML=`<div><i>${esc(ic)}</i><span>${esc(t)}${s?`<small>${esc(s)}</small>`:''}</span></div>`;
  document.body.appendChild(b);if(S.settings.sound)tone(784,0,.18,'triangle',.1);setTimeout(()=>b.remove(),3700);
}
/* hooks called from addXP (patched), careerCheck, closeMatchday and the path */
function b3Snap(){const st=S.stats;return{lvl:lvl(st.xp),goal:todayXp()>=(S.settings.goal||60),streak:curStreak(),title:title(lvl(st.xp))}}
function b3Queue(r,b){
  try{
    const st=S.stats,goal=S.settings.goal||60,L=lvl(st.xp);
    if(r.streakUp)celebrate({k:'streak',n:st.streak,from:b.streak,saved:r.usedPlayoff||window.__poWin?'playoff':r.usedFreeze?'joker':'',gotFreeze:r.gotFreeze});
    if(!b.goal&&todayXp()>=goal)celebrate({k:'goal',xp:todayXp(),goal});
    if(L>b.lvl)celebrate({k:'level',n:L,title:title(L),newTitle:title(L)!==b.title});
  }catch(e){}
}
function b3ZoneCheck(){
  try{const L=LS(),z=tierInfo().zone;
    if(L.zq===undefined){L.zq=z;return}
    if(L.zq!==z){const was=L.zq;L.zq=z;save();if(z==='up'&&was!=='up')celebrate({k:'zone'},600)}
  }catch(e){}
}
function b3PathCelebrate(o){try{if(o.pass&&(o.first||o.improved))celebrate({k:'pathlvl',stars:o.stars,label:o.label,unit:o.unit,newCh:o.newCh,newUnit:o.newUnit,end:o.end},700)}catch(e){}}
function newsSheet(){
  const L=LS();if(!L.news.length)return;
  while(L.news.length){const n=L.news.shift();celebrate({k:'season',n:n.n,from:n.from,to:n.to,out:n.out,lp:n.lp,w:n.w,d:n.d,l:n.l},400)}
  save();
}
