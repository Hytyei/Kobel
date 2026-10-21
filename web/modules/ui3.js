/* ═════════ Kobel 3.0 shell, home and table ═════════
   Declarations here come after the older ones, so they replace them (same pattern as 2.5.0). */
const ARW='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="square"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
const ARWU='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"><path d="M7 17 17 7M8 7h9v9"/></svg>';
const PLAYI='<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
const STADIUM='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M2.5 14c0-3 4-5 9.5-5s9.5 2 9.5 5-4 5-9.5 5-9.5-2-9.5-5z"/><path d="M6 14c0-1.6 2.6-2.8 6-2.8s6 1.2 6 2.8-2.6 2.8-6 2.8-6-1.2-6-2.8z"/><path d="M4 10.5V8M20 10.5V8M12 9V6"/></svg>';
const NAV3=()=>[['home',tx('Start','Start')],['path',tx('Path','Pfad')],['arcade',tx('Training','Training')],['library',tx('Squad','Kader')],['stats',tx('Table','Tabelle')],['friends',tx('Friends','Freunde')],['teach',tx('Tactics','Taktik')]];
const lvlPct=()=>{const x=S.stats.xp,L=lvl(x),a=60*(L-1)*(L-1),b=60*L*L;return Math.max(2,Math.min(100,(x-a)/(b-a)*100))};
function drawTop(){
  let h=$('#b3top');
  if(!h){h=document.createElement('header');h.id='b3top';h.className='b3-top';document.body.insertBefore(h,$('#app'))}
  const old=h.querySelector('.b3-nav'),sl=old?old.scrollLeft:0,n=unreadN();
  h.innerHTML=`<div class="b3-row"><button class="b3-logo" data-a="tab" data-k="home" aria-label="Kobel"><img src="brand/logo.png" alt="" onerror="this.outerHTML='<span class=&quot;fb&quot;>K</span>'"><b>Kobel</b></button>
    <div class="b3-r"><button class="b3-chip" data-a="tab" data-k="home" aria-label="Streak">${FLAME(16)}<span id="b3sk">${curStreak()}</span></button>
    <button class="b3-ib" data-a="tab" data-k="inbox" aria-label="Notifications">${BELL}${n?`<i class="bdot">${n>9?'9+':n}</i>`:''}</button>
    <button class="b3-av" data-a="tab" data-k="profile" aria-label="Profile">${avatarSvg(myAvatar(),32)}</button></div></div>
    <nav class="b3-nav">${NAV3().map(([k,t])=>`<button data-a="tab" data-k="${k}" class="${tab===k?'on':''}">${t}${k==='friends'&&typeof friendsBadge==='function'&&friendsBadge()?'<span class="dot"></span>':''}</button>`).join('')}</nav>
    <div class="b3-lvl"><i data-w="${lvlPct()}%"></i></div>`;
  const nv=h.querySelector('.b3-nav');nv.scrollLeft=sl;
  const on=nv.querySelector('.on');
  if(on){const l=on.offsetLeft-12,r=on.offsetLeft+on.offsetWidth+12;if(l<nv.scrollLeft)nv.scrollTo({left:l,behavior:sl?'smooth':'auto'});else if(r>nv.scrollLeft+nv.clientWidth)nv.scrollTo({left:r-nv.clientWidth,behavior:sl?'smooth':'auto'})}
}
function drawTabs(){drawTop()}
function render(){
  settle();careerCheck();applyClub();
  const keepY=window.scrollY;
  $('#app').innerHTML=`<div class="view">${({home:vHome,arcade:vArcade,library:vLib,stats:vStats,teach:vTeach,path:vPath,friends:vFriends,settings:vSet,about:vAbout,profile:vProfile,inbox:vInbox})[tab]()}</div>`;
  drawTabs();
  if(tab==='library')libList();
  requestAnimationFrame(()=>{
    document.querySelectorAll('.bar i[data-w],.b3-lvl i[data-w],.tier-bar i[data-w]').forEach(i=>i.style.width=i.dataset.w);
    document.querySelectorAll('.b3-cmp .a[data-w]').forEach(i=>i.style.width=i.dataset.w);
    document.querySelectorAll('.fc7 b[data-h]').forEach(i=>i.style.height=i.dataset.h);
    document.querySelectorAll('.b3-ring circle[data-o]').forEach(c=>c.style.strokeDashoffset=c.dataset.o);
    const cur=document.querySelector('.b3-tk .cur');if(cur){const tk=cur.parentNode;tk.scrollLeft=Math.max(0,cur.offsetLeft-tk.clientWidth/2+cur.offsetWidth/2)}
  });
  try{b3AfterRender()}catch(e){}
}
function b3AfterRender(){}
const b3zone=k=>k==='mastered'?'var(--cl)':k==='young'?'var(--orange)':k==='learning'?'#1FB45A':'transparent';
const tierShield=(i,s=42)=>LEAGUE_LOGO(i,s);
function b3help(t){return `<button class="b3-q" data-a="b3help" data-t="${esc(t)}" aria-label="Info">?</button>`}
function b3fx(o){return `<button class="b3-fx ${o.cls||''}" ${o.attrs||''}><span class="tm">${o.tm||''}</span><span class="mid"><b>${o.t}</b>${o.s?`<small>${o.s}</small>`:''}</span><span class="bx">${o.n!=null?`<i>${o.n}</i>`:''}<i class="go">${PLAYI}</i></span></button>`}
function ringSvg(p,size=96,w=9){const r=(size-w)/2,C=2*Math.PI*r;return `<div class="b3-ring" style="width:${size}px;height:${size}px"><svg viewBox="0 0 ${size} ${size}"><circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="${w}"/><circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="#fff" stroke-width="${w}" stroke-dasharray="${C}" stroke-dashoffset="${C}" data-o="${C*(1-Math.min(1,p))}" style="transition:stroke-dashoffset 1.1s cubic-bezier(.2,.8,.2,1)"/></svg><b>${Math.round(Math.min(1,p)*100)}%</b></div>`}
function b3tile(cls,title,mid,left,right){return `<div class="b3-tile ${cls}"><div class="b3-tt">${title}</div><div class="b3-tm">${mid}</div><div class="b3-tf"><span>${left}</span><em>${right}</em></div></div>`}
function weekBoxes(just){
  const st=S.stats,now=new Date(),dow=(now.getDay()+6)%7,mon=Date.now()-dow*DAY;
  return `<div class="b3-wk">${(isDe()?['MO','DI','MI','DO','FR','SA','SO']:['MO','TU','WE','TH','FR','SA','SU']).map((n,i)=>{const t=mon+i*DAY,d=st.days[dkey(t)],done=d&&d.xp>0;return `<div class="${done?'d':''} ${i===dow?'t':''} ${just&&i===dow&&done?'pop':''}">${n}<i>${done?'✓':''}</i></div>`}).join('')}</div>`;
}
function b3cmp(label,val,target,sub){
  const p=Math.max(0,Math.min(1,val/Math.max(1,target)));
  return `<div class="b3-cmp ${p>=1?'full':''}"><div class="a" data-w="${Math.max(12,p*100)}%"><b>${val}</b></div><div class="t"><b>${target}</b></div></div><div class="b3-cl"><span><b>${label}</b></span><span>${sub}</span></div>`;
}
const HL={all:false};
const B3_ACTIONS={b3help:t=>toast(t.dataset.t),b3all:()=>{HL.all=!HL.all;render()}};
function vHome(){
  const st=S.stats,L=lvl(st.xp),due=dueCount(),nw=newWords().length,ls=lessonList(),q=quests(),ti=tierInfo(),sc=scopeInfo(),LG0=LS(),ex=openExam(),tr=tricky().length,m=matchStats();
  const club=clubOf(myAvatar()),pn=pathNextTitle(),p=mdProgress(),goal=S.settings.goal||60,gp=Math.min(1,todayXp()/goal);
  const hero=`<section class="b3-hero"><div><h1>${esc(myName())}</h1>
    <div class="b3-hv" style="font-weight:800;margin-top:12px"><span>${esc(club?club[1]:'Kobel FC')}</span></div>
    <div class="b3-hv" style="margin-top:6px">${club&&club[5]?stadIcon(club[0],24):STADIUM}<span>${esc(club&&club[5]?club[5]:tx('Kobel Park','Kobel-Stadion'))}</span></div>
    <div class="b3-hv" style="margin-top:8px;opacity:.9">${LEAGUE_LOGO(ti.i,24)}<span>${esc(ti.t.n)} · ${esc(ti.t.lv)} · ${esc(title(L))}</span></div></div>
    <div class="b3-crest">${club?badgeSvg(myAvatar(),200):'<img src="brand/logo.png" alt="">'}</div>
    <div class="b3-hb"><button class="b3-wb red" data-a="pathgo"><span>${pn?esc(pn.label):tx('Open the path','Pfad öffnen')}</span>${ARWU}</button><button class="b3-wb dark" data-a="start" data-mode="mix" data-lesson=""><span>${tx('Training','Training')}</span>${ARWU}</button></div></section>
  <div class="b3-strip"><div><b>${due}</b><span>${tx('Due','Fällig')}</span></div><div><b>${nw}</b><span>${tx('New','Neu')}</span></div><div><b>${todayXp()}</b><span>${tx('Today','Heute')}</span></div></div>`;
  const ticker=TIERS.map((t,i)=>`<button class="${i===ti.i?'cur':i<ti.i?'done':''}" data-a="tab" data-k="stats">${tierShield(i,44)}<b>${esc(t.n.replace('Champions League','Champions').replace('Europa League','Europa').replace('2. Bundesliga','2. BL'))}</b><span>${t.lv} · ${i===ti.i?ti.lp+' LP':i<ti.i?'✓':t.min.toLocaleString('en')}</span></button>`).join('');
  const lShow=HL.all?ls:ls.slice(0,8);const lrows=lShow.map((l,i)=>{const n=l.w||1,mast=Math.round((l.cnt.mastered+l.cnt.young*.5)/n*100),sg=lessonStage(l);
    return `<button class="b3-tr ${l.off?'dim':''}" style="--cols:38px 1fr 40px 40px 52px;--sc:${b3zone(sg)}" data-a="lsheet" data-l="${esc(l.name)}"><span class="rk">${i+1}</span><span class="nm">${stageIcon(sg,26)}<span>${esc(l.name)}${l.newc?`<small>${l.newc} ${tx('new','neu')}</small>`:''}</span></span><span class="c">${l.w}</span><span class="c ${l.due?'neg':''}">${l.due||'–'}</span><span class="pt">${mast}%</span></button>`}).join('');
  let wod='';const ws=W();
  if(ws.length){let h=0;for(const ch of dkey())h=(h*31+ch.charCodeAt(0))>>>0;const c=ws[h%ws.length];
    wod=`<h2 class="sec">${tx('Word of the day','Wort des Tages')}</h2><div class="b3-panel"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><div><div style="font:800 40px/1 var(--fd);letter-spacing:-.03em">${fmtDe(c)}</div><div class="sub" style="margin-top:6px">${esc(c.en)}${c.forms?` · ${esc(c.forms)}`:''}</div></div><button class="spk" data-a="say" data-t="${esc(disDe(c))}">${SPK}</button></div>${c.ex?`<p style="margin:14px 0 0;font-size:17px">${esc(plain(c.ex))}</p><p class="sub">${esc(c.exEn)}</p>`:''}</div>`}
  const qs=q.list.map(it=>`<div class="quest ${it.done?'done':''}"><div class="qi">${it.done?'✓':'•'}</div><div class="qt">${esc(qText(it))}<div class="bar"><i data-w="${Math.min(100,it.p/it.n*100)}%" style="width:0"></i></div></div><span style="font:800 16px var(--fd)">${Math.min(it.p,it.n)}/${it.n}</span></div>`).join('');
  const dl=p.left;
  return `${hero}${typeof streakAlertHtml==='function'?streakAlertHtml():''}
  <div style="height:16px"></div><div class="b3-tk">${ticker}</div><button class="b3-link" data-a="tab" data-k="stats">${tx('View full table','Zur Tabelle')}</button>
  <h2 class="sec" style="margin-top:30px">${tx('Matchday','Spieltag')} ${LG0.md+1}</h2><div class="b3-kick">${tx('Season','Saison')} ${LG0.season} · ${dl} ${tx(dl===1?'day left':'days left',dl===1?'Tag übrig':'Tage übrig')}</div>
  <div style="height:18px"></div>
  ${ex?b3fx({cls:'hot',attrs:'data-a="exam"',tm:tx('FINAL','FINALE'),t:esc(TIERS[ex.e.lg].cup),s:tx('Season exam · 20 questions','Saisonfinale · 20 Fragen')}):''}
  ${b3fx({cls:'lead',attrs:'data-a="pathgo"',tm:tx('NEXT','NÄCHST'),t:pn?esc(pn.label):tx('Open the path','Pfad öffnen'),s:pn?esc(pn.unit):tx('Learning path','Lernpfad')})}
  ${b3fx({cls:due?'':'off',attrs:'data-a="start" data-mode="mix" data-lesson=""',tm:tx('DUE','FÄLLIG'),t:tx('Review due cards','Fällige Karten'),s:tx('Spaced repetition','Wiederholung'),n:due})}
  ${b3fx({cls:nw?'':'off',attrs:'data-a="start" data-mode="new" data-lesson=""',tm:tx('NEW','NEU'),t:tx('Meet new words','Neue Wörter'),s:nw?`${nw} ${tx('waiting','warten')}`:tx('All caught up','Alles gelernt'),n:nw})}
  ${b3fx({attrs:'data-a="start" data-mode="flash" data-lesson=""',tm:'CARDS',t:tx('Flashcards','Karteikarten'),s:tx('Anki-style review','Anki-Stil')})}
  ${b3fx({cls:tr?'':'off',attrs:'data-a="start" data-mode="tricky" data-lesson=""',tm:tx('FIX','FIX'),t:tx('Problem zones','Problemzonen'),s:tr?`${tr} ${tx('to fix','zu üben')}`:tx('None yet, nice','Noch keine'),n:tr})}
  <h2 class="sec">${tx('Your stats','Deine Werte')}</h2>
  <div class="b3-tiles">
    ${b3tile('',tx('Streak','Serie'),`<span class="big">${curStreak()}</span>`,`${tx('Joker','Joker')} <b>${st.freezes}</b>`,`${tx('Best','Max')} ${st.best||0}`)}
    ${b3tile('c-fern',tx('Today','Heute'),ringSvg(gp),`<b>${todayXp()}</b> / ${goal} ${tx('pts','Pkt')}`,`${Math.round(gp*100)}%`)}
    ${b3tile('c-sky',tx('Words','Wörter'),`<span class="big">${knownN()}</span>`,`${tx('Mastered','Gemeistert')}`,masteredN())}
    ${b3tile('dk',tx('Accuracy','Quote'),`<span class="big">${pctf(m.sh?m.acc:null)}</span>`,`${tx('Shots','Schüsse')}`,m.sh)}
  </div>
  <div class="b3-panel" style="margin-top:10px"><div class="b3-pt"><h3>${tx('Streak','Serie')}</h3>${b3help(tx('Practise on consecutive days. Every 7th day earns a joker that saves a missed day.','Übe an aufeinanderfolgenden Tagen. Jeder 7. Tag gibt einen Joker, der einen verpassten Tag rettet.'))}</div>
    <div class="b3-sk"><div class="n" id="b3skn">${curStreak()}</div><div class="u">${tx(curStreak()===1?'day':'days',curStreak()===1?'Tag':'Tage')}${Math.floor(curStreak()/7)?`<br>${Math.floor(curStreak()/7)} ${tx('wk','Wo')}`:''}</div><div class="fl">${FLAME(64)}</div></div>${weekBoxes(window.__b3pop)}</div>
  <div class="b3-panel"><div class="b3-pt"><h3>${tx('Weekly goal','Wochenziel')}</h3>${b3help(tx('Win the matchday: reach the points target on at least 4 active days. Win +20, no-show −30.','Gewinne den Spieltag: Punkteziel an mindestens 4 aktiven Tagen. Sieg +20, Nichtantritt −30.'))}</div>
    ${b3cmp(tx('POINTS','PUNKTE'),p.tore,p.target,`${tx('target','Ziel')} ${p.target}`)}
    ${b3cmp(tx('ACTIVE DAYS','AKTIVE TAGE'),p.days,p.need,`${tx('need','nötig')} ${p.need}`)}
    <div style="display:flex;justify-content:space-between;align-items:center"><span class="lab">${tx('Form','Form')}</span>${formChips(5)}</div></div>
  <div class="b3-panel"><div class="b3-pt"><h3>${tx('Daily quests','Tagesaufgaben')}</h3>${b3help(tx('Finish all three for a +40 bonus.','Alle drei erledigt: +40 Bonus.'))}</div>${qs}<p class="sub" style="font-size:13px;margin-top:8px">${q.chest?tx('All done: bonus collected.','Alle erledigt: Bonus kassiert.'):tx('Finish all three for a +40 bonus.','Alle drei erledigt: +40 Bonus.')}</p></div>
  <h2 class="sec">${tx('Fixtures & results','Spielplan')}</h2>
  <div class="b3-tb"><div class="b3-th" style="--cols:38px 1fr 40px 40px 52px"><span>#</span><span>${tx('Lesson','Lektion')}</span><span>W</span><span>${tx('Due','Fäl')}</span><span>%</span></div>${lrows||`<div class="empty" style="padding:20px">${tx('No lessons yet. Open Squad and import your class notes.','Noch keine Lektionen. Öffne Kader und importiere deine Notizen.')}</div>`}</div>
  ${ls.length>8?`<button class="b3-more" data-a="b3all">${HL.all?tx('Show fewer','Weniger'):tx('Show all','Alle')+' '+ls.length}</button>`:''}<div class="b3-leg"><span><i style="background:var(--cl)"></i>${tx('Champions','Champions')}</span><span><i style="background:var(--orange)"></i>${tx('Bundesliga','Bundesliga')}</span><span><i style="background:#1FB45A"></i>${tx('2. Liga','2. Liga')}</span></div>
  <div style="height:12px"></div><button class="b3-wb" data-a="scope"><span>${tx('Training scope','Trainingsumfang')} · ${sc.n}/${sc.total}</span>${ARWU}</button>
  <div style="height:10px"></div><button class="b3-wb" data-a="custom"><span>${tx('Custom study','Eigenes Training')}</span>${ARWU}</button>${wod}`;
}

/* ───────── table tab ───────── */
const TIER_STRIPE=['#1FB45A','#2BA3E0','var(--orange)','var(--orange)','var(--cl)','var(--cl)'];
function ladderHtml(){
  const ti=tierInfo(),rows=TIERS.map((t,i)=>({t,i})).reverse().map(({t,i},k)=>{
    const me=i===ti.i;
    return `<div class="b3-tr ${me?'me':''}" style="--cols:38px 1fr 54px 64px;--sc:${TIER_STRIPE[i]}"><span class="rk">${k+1}${i===ti.i+1?'<s class="up">▲</s>':''}</span><span class="nm">${tierShield(i,32)}<span>${esc(t.n)}<small>${t.lv}</small></span></span><span class="c">${t.lv}</span><span class="pt">${i===0?'0':t.min.toLocaleString('en')}</span></div>`}).join('');
  return `<div class="b3-tb"><div class="b3-th" style="--cols:38px 1fr 54px 64px"><span>#</span><span>${tx('League','Liga')}</span><span>${tx('Level','Stufe')}</span><span>LP</span></div>${rows}</div>`;
}
function leagueHtml(){
  const my={name:myName(),avatar:myAvatar(),points:LG.range==='week'?pointsSince(7):LG.range==='month'?pointsSince(30):S.stats.xp,streak:curStreak(),isMe:true};
  const online=LG.rows&&LG.rows.length,rows=online?LG.rows:[my];
  const body=rows.map((r,i)=>{const av=r.isMe?myAvatar():r.avatar;return `<div class="b3-tr ${r.isMe?'me':''}" style="--cols:38px 1fr 56px 64px;--sc:${i<3?'var(--cl)':i<5?'var(--orange)':'transparent'}"><span class="rk">${i+1}</span><span class="nm">${badgeSvg(av,28)}<span>${esc(r.isMe?myName():r.name)}</span></span><span class="c">${r.streak||0}</span><span class="pt">${r.points}</span></div>`}).join('');
  return `<div class="seg">${[['week',tx('Week','Woche')],['month',tx('Month','Monat')],['all',tx('All time','Gesamt')]].map(([k,n])=>`<button class="${LG.range===k?'on':''}" data-a="lrange" data-k="${k}">${n}</button>`).join('')}</div>
  <div class="b3-tb"><div class="b3-th" style="--cols:38px 1fr 56px 64px"><span>#</span><span>${tx('Player','Spieler')}</span><span>${tx('Streak','Serie')}</span><span>${tx('Pts','Pkt')}</span></div>${body}</div>
  <p class="sub" style="font-size:13px;margin-top:10px">${online?tx('Live standings. Everyone with an account is in the table.','Live-Tabelle. Alle mit einem Konto sind dabei.'):(S.sync&&S.sync.url?(LG.err?esc(LG.err):tx('Loading standings…','Tabelle lädt…')):tx('Connect your server in Settings to compete with friends.','Verbinde deinen Server in den Einstellungen, um mit Freunden zu spielen.'))}</p>`;
}
function leagueTab(){
  const ti=tierInfo(),L=LS(),k=knowledge();
  const rs=L.res.slice(-8).reverse().map(r=>`<div class="b3-tr" style="--cols:56px 1fr 52px 50px 46px;--sc:${r.res[0]==='W'?'#1FB45A':r.res==='D'?'var(--orange)':'var(--red)'}"><span class="rk">${r.s}.${r.m}</span><span class="nm"><span>${r.tore} ${tx('pts','Pkt')}<small>${r.days}/7 ${tx('days','Tage')}</small></span></span><span class="c"><b>${RL()[r.res]}</b></span><span class="c ${r.d<0?'neg':r.d>0?'pos':''}">${r.d>0?'+':''}${r.d}</span><span class="c"></span></div>`).join('');
  const ss=L.seasons.slice().reverse().map(x=>`<div class="b3-tr" style="--cols:38px 1fr 64px 52px 34px;--sc:${x.out==='up'?'#1FB45A':x.out==='down'?'var(--red)':'transparent'}"><span class="rk">${x.n}</span><span class="nm"><span>${esc(TIERS[x.lg].n)}</span></span><span class="c">${x.w}-${x.d}-${x.l}</span><span class="pt">${x.lp}</span><span class="c">${x.out==='up'?'<b class="pos">↑</b>':x.out==='down'?'<b class="neg">↓</b>':'='}</span></div>`).join('');
  loadLeague();
  return `<div class="b3-panel"><div class="b3-pt"><div><div class="lab">${tx('Your league','Deine Liga')} · ${ti.t.lv}</div><h2 style="font-size:40px;margin-top:6px">${esc(ti.t.n)}</h2></div>${tierShield(ti.i,56)}</div>
    ${b3cmp(tx('LEAGUE POINTS','LIGA-PUNKTE'),Math.max(0,ti.lp),ti.nx?ti.nx.min:Math.max(1,ti.lp),ti.nx?`${ti.left} LP ${tx('to','bis')} ${esc(ti.nx.n)}`:tx('Top league reached','Höchste Liga'))}
    <p class="sub" style="font-size:14px">${zoneTxt(ti.zone)}</p></div>
  <div class="statgrid" style="grid-template-columns:repeat(3,1fr)">${sCell(k,tx('Squad value','Kaderwert'),tx('word equivalents','Wortäquivalente'))}${sCell((L.form>0?'+':'')+L.form,'Form',tx('weekly results','Wochenergebnisse'))}${sCell((L.bonus>0?'+':'')+L.bonus,tx('Bonus','Boni'),tx('goals + finals','Ziele + Finals'))}</div>
  <h2 class="sec">${tx('League ladder','Ligenleiter')}</h2>${ladderHtml()}
  <h2 class="sec">${tx('Standings','Tabelle')}</h2>${leagueHtml()}
  ${careerHtml()}
  <h2 class="sec">${tx('Matchdays','Spieltage')}</h2>${rs?`<div class="b3-tb"><div class="b3-th" style="--cols:56px 1fr 52px 50px 46px"><span>S.MD</span><span>${tx('Points','Punkte')}</span><span>${tx('Res','Erg')}</span><span>LP</span><span></span></div>${rs}</div>`:`<div class="b3-panel"><p class="sub">${tx('Your first matchday closes on Monday. Hit the weekly target to win it.','Dein erster Spieltag endet am Montag. Erreiche das Wochenziel, um ihn zu gewinnen.')}</p></div>`}
  ${ss?`<h2 class="sec">${tx('Season record','Saisonbilanz')}</h2><div class="b3-tb"><div class="b3-th" style="--cols:38px 1fr 64px 52px 34px"><span>#</span><span>${tx('League','Liga')}</span><span>W-D-L</span><span>LP</span><span></span></div>${ss}</div>`:''}`;
}
function vStats(){
  const body=statTab==='stats'?statsTab():statTab==='cabinet'?cabinetTab():statTab==='friends'?friendsTab():leagueTab();
  return `<div class="top"><h1 class="h1">${tx('Table','Tabelle')}</h1></div><div class="b3-kick">${tx('Season','Saison')} ${LS().season}</div><div style="height:18px"></div>
  <div class="seg">${[['league',tx('League','Liga')],['stats',tx('Statistics','Statistik')],['cabinet',tx('Cabinet','Vitrine')]].map(([k,n])=>`<button class="${statTab===k?'on':''}" data-a="stab" data-k="${k}">${n}</button>`).join('')}</div>${body}`;
}

