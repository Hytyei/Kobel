/* ═════════ Kobel 4.2: home, tactics room, splash ═════════
   Declarations here come after the older ones, so they replace them.
   A plate is the Bundesliga stat card: a crest on stepped rings that repeat the shape of that crest, title top left,
   name and number along the bottom. brand/emboss-*.webp is black and white alpha only, so it sits on any club colour. */
const V42={stats:false,lessons:false,more:false,ph:null};
const V42_SHAPE={fca:'shield',fcu:'shield',koe:'shield',m05:'shield',scf:'shield',scp:'shield',tsg:'shield',vfb:'shield',bmg:'diamond',hsv:'diamond',svw:'diamond'};
const v42Shape=id=>V42_SHAPE[id]||'circle';
const v42Crest=size=>hasCrest(myAvatar())||clubOf(myAvatar())?badgeSvg(myAvatar(),size):'<img class="pl-eg" src="brand/eagle.png" alt="">';
/* a thin outline in the crest's own shape that leaves the crest and fades: two of them, half a beat apart */
const V42_RIP={circle:'<circle cx="50" cy="50" r="40"/>',diamond:'<path d="M50 6 88 50 50 94 12 50z"/>',shield:'<path d="M14 14h72v30c0 22-15 36-36 44C29 80 14 66 14 44z"/>'};
const v42Ripple=sh=>[0,1].map(k=>`<svg class="pl-r ${k?'r2':''}" viewBox="0 0 100 100" aria-hidden="true">${V42_RIP[sh]||V42_RIP.circle}</svg>`).join('');
function v42Fold(k,title,meta,body){
  return `<button class="h-fold ${V42[k]?'on':''}" data-a="v42fold" data-k="${k}" aria-expanded="${!!V42[k]}"><b>${title}</b><span>${meta}</span><i>${ARW}</i></button>${V42[k]?`<div class="h-foldb">${body}</div>`:''}`;
}
function v42Row(o){return `<button class="h-row ${o.cls||''}" ${o.attrs}><span><b>${o.t}</b>${o.s?`<small>${o.s}</small>`:''}</span>${o.n!=null?`<em>${o.n}</em>`:`<i>${ARW}</i>`}</button>`}
function vHome(){
  const st=S.stats,due=dueCount(),nw=newWords().length,ls=lessonList(),q=quests(),ti=tierInfo(),sc=scopeInfo(),LG0=LS(),ex=openExam(),tr=tricky().length,m=matchStats();
  const pn=pathNextTitle(),p=mdProgress(),goal=S.settings.goal||60,gp=Math.min(1,todayXp()/goal),dl=p.left,k=curStreak(),lp=lpNow(),sn=stageNow(lp);
  const cta=ex?{a:'data-a="exam"',s:tx('Season final','Saisonfinale'),t:esc(TIERS[ex.e.lg].cup),u:tx('20 questions','20 Fragen')}
    :pn?{a:'data-a="pathgo"',s:tx('Next lesson','Nächste Lektion'),t:esc(pn.label),u:esc(pn.unit)}
    :{a:'data-a="start" data-mode="mix" data-lesson=""',s:tx('Path complete','Pfad geschafft'),t:tx('Training','Training'),u:tx('Keep your words sharp','Halte deine Wörter fit')};
  const plate=`<section class="pl h-pl"><i class="pl-t pl-${v42Shape(myAvatar())}"></i>${v42Ripple(v42Shape(myAvatar()))}<span class="pl-c">${v42Crest(170)}</span>
    <div class="h-pt"><h1>${tx('Matchday','Spieltag')} ${LG0.md+1}</h1><small>${tx('Season','Saison')} ${LG0.season} · ${dl} ${tx(dl===1?'day left':'days left',dl===1?'Tag übrig':'Tage übrig')}</small></div>
    <div class="h-pf"><span class="nm"><b>${esc(myName())}</b>${vbadge(myBadge())}</span><span class="sk"><b>${k}</b><small>${tx(k===1?'day':'days',k===1?'Tag':'Tage')}</small></span></div></section>
  <button class="h-cta" ${cta.a}><span><small>${cta.s}</small><b>${cta.t}</b><em>${cta.u}</em></span><i>${PLAYI}</i></button>`;
  const rows=[
    due?v42Row({attrs:'data-a="start" data-mode="mix" data-lesson=""',t:tx('Review due cards','Fällige Karten'),s:tx('Spaced repetition','Wiederholung'),n:due}):'',
    nw?v42Row({attrs:'data-a="start" data-mode="new" data-lesson=""',t:tx('Meet new words','Neue Wörter'),s:tx('Words waiting for you','Warten auf dich'),n:nw}):'',
    tr?v42Row({attrs:'data-a="start" data-mode="tricky" data-lesson=""',t:tx('Problem zones','Problemzonen'),s:tx('Words you often miss','Oft verpasste Wörter'),n:tr}):''
  ].join('');
  const qs=q.list.map(it=>`<div class="h-q ${it.done?'done':''}"><i>${it.done?'✓':''}</i><span>${esc(qText(it))}</span><em>${Math.min(it.p,it.n)}/${it.n}</em></div>`).join('');
  const lrows=(HL.all?ls:ls.slice(0,8)).map((l,i)=>{const n=l.w||1,mast=Math.round((l.cnt.mastered+l.cnt.young*.5)/n*100),sg=lessonStage(l);
    return `<button class="b3-tr ${l.off?'dim':''}" style="--cols:38px 1fr 40px 40px 52px;--sc:${b3zone(sg)}" data-a="lsheet" data-l="${esc(l.name)}"><span class="rk">${i+1}</span><span class="nm">${stageIcon(sg,26)}<span>${esc(l.name)}${l.newc?`<small>${l.newc} ${tx('new','neu')}</small>`:''}</span></span><span class="c">${l.w}</span><span class="c ${l.due?'neg':''}">${l.due||'–'}</span><span class="pt">${mast}%</span></button>`}).join('');
  let wod='';const ws=W();
  if(ws.length){let h=0;for(const ch of dkey())h=(h*31+ch.charCodeAt(0))>>>0;const c=ws[h%ws.length];
    wod=`<div class="h-wod"><div><small>${tx('Word of the day','Wort des Tages')}</small><b>${fmtDe(c)}</b><span>${esc(c.en)}</span></div><button class="spk" data-a="say" data-t="${esc(disDe(c))}" aria-label="${tx('Listen','Anhören')}">${SPK}</button></div>`}
  const stats=`<div class="b3-tiles">
    ${b3tile('',tx('Streak','Serie'),`<span class="big">${k}</span>`,`${tx('Joker','Joker')} <b>${st.freezes}</b>`,`${tx('Best','Max')} ${st.best||0}`)}
    ${b3tile('c-fern',tx('Today','Heute'),ringSvg(gp),`<b>${todayXp()}</b> / ${goal} ${tx('pts','Pkt')}`,`${Math.round(gp*100)}%`)}
    ${b3tile('c-sky',tx('Words','Wörter'),`<span class="big">${knownN()}</span>`,`${tx('Mastered','Gemeistert')}`,masteredN())}
    ${b3tile('dk',tx('Accuracy','Quote'),`<span class="big">${pctf(m.sh?m.acc:null)}</span>`,`${tx('Shots','Schüsse')}`,m.sh)}
  </div>
  <div class="b3-panel" style="margin-top:10px"><div class="b3-pt"><h3>${tx('Weekly goal','Wochenziel')}</h3>${b3help(tx('Win the matchday: reach the points target on at least 4 active days. Win +20, no-show −30.','Gewinne den Spieltag: Punkteziel an mindestens 4 aktiven Tagen. Sieg +20, Nichtantritt −30.'))}</div>
    ${b3cmp(tx('POINTS','PUNKTE'),p.tore,p.target,`${tx('target','Ziel')} ${p.target}`)}
    ${b3cmp(tx('ACTIVE DAYS','AKTIVE TAGE'),p.days,p.need,`${tx('need','nötig')} ${p.need}`)}
    <div style="display:flex;justify-content:space-between;align-items:center"><span class="lab">${tx('Form','Form')}</span>${formChips(5)}</div></div>`;
  const lessons=`<div class="b3-tb"><div class="b3-th" style="--cols:38px 1fr 40px 40px 52px"><span>#</span><span>${tx('Lesson','Lektion')}</span><span>W</span><span>${tx('Due','Fäl')}</span><span>%</span></div>${lrows||`<div class="empty" style="padding:20px">${tx('No lessons yet. Open Squad and import your class notes.','Noch keine Lektionen. Öffne Kader und importiere deine Notizen.')}</div>`}</div>
  ${ls.length>8?`<button class="b3-more" data-a="b3all">${HL.all?tx('Show fewer','Weniger'):tx('Show all','Alle')+' '+ls.length}</button>`:''}<div class="b3-leg"><span><i style="background:var(--cl)"></i>${tx('Champions','Champions')}</span><span><i style="background:var(--orange)"></i>${tx('Bundesliga','Bundesliga')}</span><span><i style="background:#1FB45A"></i>${tx('2. Liga','2. Liga')}</span></div>`;
  const more=[v42Row({attrs:'data-a="start" data-mode="flash" data-lesson=""',t:tx('Flashcards','Karteikarten'),s:tx('Anki-style review','Anki-Stil')}),
    v42Row({attrs:'data-a="scope"',t:tx('Training scope','Trainingsumfang'),n:`${sc.n}/${sc.total}`}),
    v42Row({attrs:'data-a="custom"',t:tx('Custom study','Eigenes Training')})].join('');
  return `${plate}${typeof streakAlertHtml==='function'?streakAlertHtml():''}
  ${rows?`<div class="h-rows">${rows}</div>`:''}
  <button class="pl h-lg" data-a="tab" data-k="stats"><i class="pl-t pl-circle"></i><span class="pl-c">${LEAGUE_LOGO(ti.i,76)}</span>
    <span class="h-lgt"><small>${esc(ti.t.lv)} · ${tx('Your league','Deine Liga')}</small><b>${esc(ti.t.n)}</b></span>
    <span class="h-lgf"><span>${esc(sn.s.n)}</span><em>${Math.max(0,ti.lp)} LP</em></span></button>
  ${ti.nx?`<div class="h-lgb"><i style="width:${Math.max(2,Math.round(ti.pct*100))}%"></i></div><div class="h-lgs"><span>${ti.left} LP ${tx('to','bis')} ${esc(ti.nx.n)}</span><button data-a="tab" data-k="stats">${tx('Table','Tabelle')}</button></div>`:''}
  <div class="h-day"><div class="h-dayt"><h3>${tx('Today','Heute')}</h3><span>${todayXp()} / ${goal} ${tx('pts','Pkt')}</span></div><div class="h-dayb"><i style="width:${Math.round(gp*100)}%"></i></div>${weekBoxes(window.__b3pop)}${qs}</div>
  ${wod}
  <div class="h-folds">
  ${v42Fold('stats',tx('Your stats','Deine Werte'),`${knownN()} ${tx('words','Wörter')}`,stats)}
  ${v42Fold('lessons',tx('Lessons','Lektionen'),`${ls.length}`,lessons)}
  ${v42Fold('more',tx('More training','Mehr Training'),'',more)}
  </div>`;
}

/* ---- tactics room: the season has four phases, and each phase is a formation on the board. Every talk is one player,
   the pass runs from the keeper to the striker, and it goes solid as you finish talks. ---- */
const V42_PH=()=>[tx('Pre-season','Vorbereitung'),tx('First half','Erste Halbzeit'),tx('Second half','Zweite Halbzeit'),tx('Extra time','Verlängerung')];
const V42_LINES={8:[1,3,3,1],9:[1,3,3,2]};
function v42Spots(n){
  const lines=V42_LINES[n]||[1,Math.ceil((n-1)/2),Math.floor((n-1)/2)],out=[];
  lines.forEach((c,x)=>{for(let i=0;i<c;i++)out.push([40+x*280/Math.max(1,lines.length-1),100+(i-(c-1)/2)*58])});
  return out;
}
function v42Pitch(us,t,nx){
  const spots=v42Spots(us.length),pts=spots.map(p=>p.join(',')),doneN=us.filter(u=>t.done[u.u.id]).length;
  const nodes=us.map((x,k)=>{const[cx,cy]=spots[k],d=t.done[x.u.id],on=x.i===nx&&!d;
    return `<g class="pt ${d?'d':on?'n':''}" data-a="tchopen" data-u="${x.i}" role="button" aria-label="${esc(x.u.title)}"><circle cx="${cx}" cy="${cy}" r="24" fill="transparent"/><circle class="b" cx="${cx}" cy="${cy}" r="15"/><text x="${cx}" y="${cy+5}" text-anchor="middle">${x.u.md}</text></g>`}).join('');
  return `<svg class="tp" viewBox="0 0 360 200" role="group" aria-label="${tx('Formation','Aufstellung')}">
    <g class="ln"><rect x="6" y="6" width="348" height="188"/><path d="M180 6v188"/><circle cx="180" cy="100" r="30"/><rect x="6" y="52" width="46" height="96"/><rect x="308" y="52" width="46" height="96"/></g>
    <polyline class="rn" points="${pts.join(' ')}"/>${doneN>1?`<polyline class="rd" points="${pts.slice(0,doneN).join(' ')}"/>`:''}${nodes}</svg>`;
}
function vTeach(){
  const t=tch(),dn=trDone(),tot=TEACH.length,nx=trNext(),next=TEACH[nx],names=V42_PH();
  const ph=V42.ph==null?(next.ph||0):V42.ph,all=TEACH.map((u,i)=>({u,i})),us=all.filter(x=>x.u.ph===ph);
  const counts=names.map((_,p)=>{const a=all.filter(x=>x.u.ph===p);return{n:a.length,d:a.filter(x=>t.done[x.u.id]).length}});
  const go=dn>=tot?tx('Season complete','Saison abgeschlossen'):dn?tx('Next talk','Nächste Besprechung'):tx('Start here','Hier starten');
  const list=us.map(x=>{const u=x.u,seen=Math.min(t.seen[u.id]||0,u.boards.length),d=t.done[u.id],on=x.i===nx&&dn<tot;
    return `<button class="tu2 ${d?'d':''} ${on?'n':''}" data-a="tchopen" data-u="${x.i}"><span class="no">${u.md}</span><span class="tx"><small>${esc(u.tag)}</small><b>${esc(u.title)}</b><em>${esc(u.sub)}</em></span><span class="st">${d?'✓':seen?`${seen}/${u.boards.length}`:`<i>${ARW}</i>`}</span></button>`}).join('');
  return `<section class="th2"><div class="th2-h"><h1>${tx('Tactics Room','Taktikraum')}</h1><span><b>${dn}</b> / ${tot}</span></div>${v42Pitch(us,t,nx)}</section>
  <button class="h-cta" data-a="tchopen" data-u="${nx}"><span><small>${go}</small><b>${esc(next.title)}</b><em>${tx('Talk','Besprechung')} ${next.md} · ${esc(next.tag)}</em></span><i>${PLAYI}</i></button>
  <div class="th2-ph" role="tablist">${names.map((n,p)=>`<button role="tab" aria-selected="${p===ph}" class="${p===ph?'on':''}" data-a="v42ph" data-k="${p}"><b>${n}</b><span>${counts[p].d}/${counts[p].n}</span></button>`).join('')}</div>
  <div class="th2-l">${list}</div>`;
}
function trDraw(){
  const u=trUnit();if(!u)return;
  let el=$('#tr');
  if(!el){el=document.createElement('div');el.id='tr';el.className='tr';document.body.appendChild(el)}
  const b=u.boards[TR.i],n=u.boards.length,last=TR.i===n-1,you=b.k==='order'?tx('Your turn: build the sentence, word by word.','Du bist dran: Baue den Satz Wort für Wort.'):tx('Your turn. Show me you got it.','Du bist dran. Zeig, dass du es kannst.');
  /* the heading comes first and the manager's words right under it, so a board reads top to bottom */
  const body=trBoard(b,u,TR.i).replace('</div>',`</div><p class="tb-say">${esc(b.say||you)}</p>`);
  el.dataset.k=b.k;
  el.innerHTML=`<div class="tr-top"><button class="tr-x" data-a="tchclose" aria-label="${tx('Close','Schließen')}">✕</button><div class="tr-t"><span>${tx('Talk','Besprechung')} ${u.md} · ${esc(u.tag)}</span><b>${esc(u.title)}</b></div><em>${TR.i+1}/${n}</em></div>
  <div class="tr-dots">${u.boards.map((_,i)=>`<i class="${i<TR.i?'d':i===TR.i?'c':''}"></i>`).join('')}</div>
  <div class="tr-wall"><div class="wb"><div class="wb-in">${body}</div></div></div>
  <div class="tr-foot"><button class="tfb" data-a="tchprev" aria-label="${tx('Back','Zurück')}" ${TR.i===0?'disabled':''}>‹</button><button class="tfb go" data-a="tchnext"><span>${last?tx('Finish','Fertig'):tx('Next','Weiter')}</span>${ARW}</button></div>`;
  const w=el.querySelector('.wb');if(w)w.scrollTop=0;
  trMarkPlay();
  const t=tch();if((t.seen[u.id]||0)<TR.i+1){t.seen[u.id]=TR.i+1;save()}
  if(b.k==='recap'&&!t.done[u.id]){t.done[u.id]=Date.now();addXP(30,0);save();toast(tx('Talk complete: +30 XP','Besprechung abgeschlossen: +30 XP'))}
}
const V42_ACTIONS={
  v42fold:t=>{const k=t.dataset.k;V42[k]=!V42[k];render()},
  v42ph:t=>{V42.ph=+t.dataset.k;render()},
  v42auto:()=>{try{NATIVE.openAutostart()}catch(e){}}
};

/* coming back to a page that stayed alive overnight: the widgets get today's numbers at once */
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')pushWidgets()});

/* ---- what the form widget needs: every day is a game. W = daily goal reached, D = played but short of it, L = no-show,
   N = before your first day. The last letter is today and the Android side reads it together with `day`. ---- */
function v42Widget(){
  const st=S.stats,goal=S.settings.goal||60,keys=Object.keys(st.days||{}).filter(k=>st.days[k].xp>0).sort(),first=keys[0]||dkey(),now=Date.now();
  let run='';
  for(let i=7;i>=0;i--){const k=dkey(now-i*DAY),x=(st.days[k]&&st.days[k].xp)||0;run+=x>=goal?'W':x>0?'D':k<first?'N':'L'}
  return{day:dkey(),last:st.last||'',run,freezes:st.freezes||0,stage:stageNow(lpNow()).s.n,tierI:tierInfo().i};
}

/* the splash runs on CSS alone once the page has loaded; this only clears it away and hands the system bars back */
(function v42Splash(){
  const e=document.getElementById('kb');
  const bars=()=>{try{if(NATIVE&&NATIVE.splashDone)NATIVE.splashDone()}catch(_){}};
  if(!e){bars();return}
  /* timed from the animation, not from here: on a slow phone the first frame comes long after this line runs */
  e.addEventListener('animationstart',ev=>{if(ev.animationName==='kbUp')bars()});
  e.addEventListener('animationend',ev=>{if(ev.animationName==='kbOff')e.remove()});
  setTimeout(()=>{bars();e.remove()},9000);
  e.addEventListener('pointerdown',()=>{e.classList.add('skip');bars();setTimeout(()=>e.remove(),260)});
})();

/* ---- training: the game of the day leads on a plate, the rest are fixture rows in two groups. One colour family,
   names on one line, best score and stars on the right. ---- */
function v42Stars(n){return `<i class="tg-st" aria-label="${n} ${tx('stars','Sterne')}">${[0,1,2].map(k=>`<u class="${k<n?'on':''}"></u>`).join('')}</i>`}
function v42GameRow(id,f){
  const g=GAMES[id],s=S.games[id]||{},req=gameReq(id,arc.lesson);
  return `<button class="tg-r ${req?'off':''}" data-a="game" data-id="${id}" ${req?'data-lock="1"':''} aria-label="${esc(g.n)}: ${esc(req||g.tag)}">
    <span class="tg-i">${g.ic}</span><span class="tg-t"><b>${esc(g.n)}${f===id?' <em>×2</em>':''}</b><small>${esc(req||g.tag)}</small></span>
    <span class="tg-s">${s.best?`<b>${s.best}</b>${v42Stars(s.stars||0)}`:`<span>${tx('New','Neu')}</span>`}</span></button>`;
}
function vArcade(){
  const ids=Object.keys(GAMES),f=featuredId(),sc=scopeInfo();
  const opts=[['',tx('All active lessons','Alle aktiven Lektionen')],...lessonList().map(l=>[l.name,l.name])].map(([v,t])=>`<option value="${esc(v)}" ${arc.lesson===v?'selected':''}>${esc(t)}</option>`).join('');
  const fg=f&&GAMES[f],fs=f&&(S.games[f]||{});
  const lead=fg?`<button class="pl tg-pl" data-a="game" data-id="${f}"><i class="pl-t pl-circle"></i><span class="pl-c tg-pi">${fg.ic}</span>
    <span class="tg-pk"><small>${tx('Game of the day','Spiel des Tages')} · ${tx('double points','doppelte Punkte')}</small><b>${esc(fg.n)}</b><em>${esc(fg.tag)}</em></span>
    <span class="tg-pf"><span>${fs.best?`${tx('Best','Bestwert')} <b>${fs.best}</b>`:tx('Not played yet','Noch nicht gespielt')}</span><i>${PLAYI}</i></span></button>`:'';
  const rush=ids.filter(id=>GAMES[id].kind==='rush'&&id!==f),rest=ids.filter(id=>GAMES[id].kind!=='rush'&&id!==f);
  return `<div class="top"><h1 class="h1">Training</h1></div>
  <p class="sub tg-sub">${tx('Minigames built from your own notes. Words you miss come back in your next practice.','Minispiele aus deinen eigenen Notizen. Verpasste Wörter kommen im nächsten Training wieder.')}</p>
  ${lead}
  <div class="tg-f"><select class="inp" id="arcl" aria-label="${tx('Lessons','Lektionen')}">${opts}</select><button class="tg-sc" data-a="scope">${tx('Scope','Umfang')} <b>${sc.n}/${sc.total}</b></button></div>
  ${rush.length?`<h2 class="tg-h">${tx('Against the clock','Gegen die Uhr')}</h2><div class="tg-l">${rush.map(id=>v42GameRow(id,f)).join('')}</div>`:''}
  <h2 class="tg-h">${tx('Full matches','Ganze Spiele')}</h2><div class="tg-l">${rest.map(id=>v42GameRow(id,f)).join('')}</div>`;
}
