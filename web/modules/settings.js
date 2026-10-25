/* ───────── Profile and Settings, redesigned (3.2.0) ─────────
   Profile = who you are (club banner, stats, shortcuts). Settings = one topic at a time (chips on top), rows with an icon,
   a title, a one-line explanation and the control on the right. Squad (the word library) lives here now instead of in the top nav. */
const STI={
  user:'<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c.8-4 3.8-6 7.5-6s6.7 2 7.5 6"/>',
  squad:'<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 9h8M8 12.5h8M8 16h5"/>',
  bell:'<path d="M6 16V11a6 6 0 0 1 12 0v5l1.6 2H4.4z"/><path d="M10 21h4"/>',
  trophy:'<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M9 20h6"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8"/>',
  goal:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  gram:'<path d="M5 19V5h9a4 4 0 0 1 0 8H5"/><path d="M10 13l6 6"/>',
  sens:'<path d="M4 17c2-8 5-11 8-11s6 3 8 11"/><path d="M8 17c1-4 2.4-6 4-6s3 2 4 6"/>',
  list:'<path d="M5 6h14M5 12h14M5 18h9"/>',
  card:'<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/>',
  speaker:'<path d="M4 10v4h3.5L12 18V6L7.5 10z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  mic:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
  fire:'<path d="M12 21c-4 0-6.5-2.6-6.5-6 0-3 2-5 3.5-6.5.3 1.6 1 2.4 2 2.6C11 8 12.5 5.5 12 3c3.8 2 6.5 5.6 6.5 11 0 4-2.5 7-6.5 7z"/>',
  download:'<path d="M12 4v11M7.5 11 12 15.5 16.5 11M5 20h14"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/>',
  globe:'<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c3 3 3 14 0 17M12 3.5c-3 3-3 14 0 17"/>',
  cloud:'<path d="M7 18a4.5 4.5 0 0 1-.4-9A6 6 0 0 1 18 10a4 4 0 0 1-.5 8z"/>',
  save:'<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>',
  info:'<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>'
};
const stIco=(k,s=22)=>`<svg class="st-ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${STI[k]||''}</svg>`;
let SETTAB='home';
/* ---- building blocks ----
   row: icon, title, one short line, and on the right either the current value + chevron (opens a picker),
   a switch, a button, or just a chevron (opens a page). */
const stRow=(ic,t,d,ctl,cls='')=>`<div class="st-row ${cls}"><span class="st-i">${stIco(ic,20)}</span><div class="st-t"><b>${t}</b>${d?`<small>${d}</small>`:''}</div><div class="st-c">${ctl||''}</div></div>`;
const stGroup=(h,rows)=>`<section class="st-g">${h?`<h3 class="st-h">${h}</h3>`:''}<div class="st-card">${rows}</div></section>`;
const stNote=()=>{try{return noteOn()}catch(e){return true}};
const sxChev='<i class="sx-ch" aria-hidden="true">›</i>';
const sxGo=(ic,t,d,attrs,val)=>`<button type="button" class="st-row sx-go" ${attrs}><span class="st-i">${stIco(ic,20)}</span><span class="st-t"><b>${t}</b>${d?`<small>${d}</small>`:''}</span><span class="st-c">${val?`<em class="sx-v">${val}</em>`:''}${sxChev}</span></button>`;
const sxSw=(ic,t,d,on,attrs)=>`<div class="st-row"><span class="st-i">${stIco(ic,20)}</span><div class="st-t"><b>${t}</b>${d?`<small>${d}</small>`:''}</div><div class="st-c"><button type="button" class="sw ${on?'on':''}" role="switch" aria-checked="${on?'true':'false'}" ${attrs} aria-label="${t}"></button></div></div>`;
/* choices (with a plain explanation each) that open in a sheet instead of a tiny toggle bar */
const SX_PICK=()=>({
  lang:{t:tx('App language','App-Sprache'),o:[['en','English',''],['de','Deutsch','']]},
  theme:{t:tx('Theme','Design'),o:[['auto',tx('Automatic','Automatisch'),tx('Follows your phone','Folgt deinem Handy')],['light',tx('Light','Hell'),''],['dark',tx('Dark','Dunkel'),'']]},
  goal:{t:tx('Daily points goal','Tagesziel'),o:[[30,'30',tx('Relaxed: a few minutes a day','Entspannt: ein paar Minuten am Tag')],[60,'60',tx('Steady: about one short session','Stetig: etwa eine kurze Einheit')],[100,'100',tx('Serious: two or three sessions','Ernsthaft: zwei bis drei Einheiten')],[200,'200',tx('Intense: a proper workout','Intensiv: ein richtiges Training')]]},
  newPer:{t:tx('New words per session','Neue Wörter pro Einheit'),o:[[4,'4',tx('Gentle','Sanft')],[8,'8',tx('Balanced','Ausgewogen')],[12,'12',tx('Fast','Schnell')]]},
  challenge:{t:tx('New-word challenge','Schwierigkeit neuer Wörter'),o:[['easy',tx('Easy','Leicht'),tx('Kobel waits longer before testing a new word','Kobel wartet länger, bevor ein neues Wort abgefragt wird')],['normal',tx('Normal','Normal'),''],['hard',tx('Hard','Schwer'),tx('New words are tested quickly','Neue Wörter werden schnell abgefragt')]]},
  gShare:{t:tx('Grammar in practice','Grammatik im Training'),o:[[0,tx('Off','Aus'),tx('Words only','Nur Wörter')],[.1,'10%',''],[.2,'20%',''],[.3,'30%',tx('A lot of grammar','Viel Grammatik')]]},
  dir:{t:tx('Flashcard direction','Karteikarten-Richtung'),o:[['both',tx('Both ways','Beide Richtungen'),''],['de',tx('DE → EN','DE → EN'),''],['en',tx('EN → DE','EN → DE'),'']]}
});
const sxLabel=k=>{const p=SX_PICK()[k],v=S.settings[k],o=p.o.find(x=>String(x[0])===String(v));return o?o[1]:String(v)};
const sxPick=k=>{const p=SX_PICK()[k];return sxGo(({lang:'globe',theme:'sun',goal:'goal',newPer:'plus',challenge:'sens',gShare:'gram',dir:'card'})[k],p.t,'',`data-a="setpick" data-k="${k}"`,esc(sxLabel(k)))};
function sxPickSheet(k){
  const p=SX_PICK()[k];if(!p)return;
  sheet(`<h3>${p.t}</h3><div class="sx-opts">${p.o.map(o=>`<button type="button" class="sx-o ${String(S.settings[k])===String(o[0])?'on':''}" data-a="setval" data-k="${k}" data-v="${o[0]}"><span><b>${o[1]}</b>${o[2]?`<small>${o[2]}</small>`:''}</span><i>${String(S.settings[k])===String(o[0])?'✓':''}</i></button>`).join('')}</div>`);
}

/* ---- pages ---- */
function stLook(){
  return stGroup('',sxPick('lang')+sxPick('theme'));
}
function stLearn(){
  return stGroup(tx('Daily routine','Tagesroutine'),sxPick('goal')+sxPick('newPer')+sxPick('challenge'))+
    stGroup(tx('What you practise','Was du übst'),sxPick('gShare')+sxPick('dir'));
}
function stSound(){
  return stGroup('',
    sxSw('speaker',tx('Sound effects','Soundeffekte'),tx('Taps, right and wrong answers, celebrations','Tippen, richtig und falsch, Feiern'),!!S.settings.sound,'data-a="tog" data-k="sound"')+
    sxSw('mic',tx('Speak German aloud','Deutsch vorlesen'),germanOK()?tx('German voice ready','Deutsche Stimme bereit'):tx('No German voice found on this device','Keine deutsche Stimme gefunden'),!!S.settings.tts,'data-a="tog" data-k="tts"')+
    sxGo('speaker',tx('Test the German voice','Stimme testen'),'','data-a="testvoice"',germanOK()?tx('Play','Abspielen'):NATIVE?tx('Install voice','Stimme installieren'):tx('Help','Hilfe')));
}
function stAlerts(){
  const n=unreadN();
  return stGroup('',
    sxSw('bell',tx('Notifications','Benachrichtigungen'),tx('Friend and match requests, study group news, new versions','Freundschafts- und Spielanfragen, Lerngruppen, neue Versionen'),stNote(),`data-a="notify" data-v="${stNote()?0:1}"`)+
    sxSw('fire',tx('Streak reminders','Serien-Erinnerungen'),tx('An evening reminder and a last call before your streak ends','Abendliche Erinnerung und ein letzter Aufruf vor dem Ende deiner Serie'),noteStreakOn(),`data-a="notifystreak" data-v="${noteStreakOn()?0:1}"`))+
  stGroup('',sxGo('bell',tx('Inbox','Postfach'),n?`${n} ${tx('unread','ungelesen')}`:tx('Nothing new','Nichts Neues'),'data-a="tab" data-k="inbox"'))+
  `<p class="st-foot">${tx('Tip: study group members can nudge each other from Table › Friends › Study groups.','Tipp: Mitglieder einer Lerngruppe können sich unter Tabelle › Freunde › Lerngruppen anstupsen.')}</p>`;
}
function stWords(){
  const sc=scopeInfo();
  return stGroup('',
    sxGo('squad',tx('Squad (your words)','Kader (deine Wörter)'),`${S.cards.filter(c=>!isG(c)).length} ${tx('words','Wörter')} · ${S.cards.filter(isG).length} ${tx('grammar items','Grammatik')}`,'data-a="tab" data-k="library"')+
    sxGo('list',tx('Lessons in training','Lektionen im Training'),`${sc.n} ${tx('of','von')} ${sc.total} ${tx('active','aktiv')}`,'data-a="scope"')+
    sxGo('trophy',tx('Trophy cabinet','Vitrine'),'','data-a="cabinet"'))+
  stGroup(tx('Class notes','Klassennotizen'),sxGo('list',tx('Re-add my built-in class notes','Meine Klassennotizen neu hinzufügen'),tx('Adds lessons you are missing; nothing is removed','Fügt fehlende Lektionen hinzu; nichts wird entfernt'),'data-a="classnotes"'));
}
function stData(){
  return stGroup(tx('Backup','Sicherung'),
    sxGo('save',tx('Save a backup file','Sicherungsdatei speichern'),S.stats.lastBackup?tx('Last backup: ','Letzte Sicherung: ')+new Date(S.stats.lastBackup).toLocaleDateString():tx('No backup file yet','Noch keine Sicherung'),'data-a="savebk"')+
    sxGo('download',tx('Load a backup','Sicherung laden'),'','data-a="imp"')+
    sxGo('card',tx('Copy backup as text','Sicherung als Text kopieren'),'','data-a="exp"')+
    sxGo('card',tx('Export for Anki (TSV)','Export für Anki (TSV)'),'','data-a="anki"'))+
  stGroup(tx('Careful','Vorsicht'),
    sxGo('fire',tx('Reset progress','Fortschritt zurücksetzen'),tx('Keeps your words','Deine Wörter bleiben'),'data-a="reset"')+
    sxGo('fire',tx('Erase everything','Alles löschen'),tx('Empties the library too','Leert auch die Bibliothek'),'data-a="wipe" data-danger="1"'));
}
function stAbout(){
  const i=U.info||{};
  const upd=U.state==='available'||U.state==='ready'?tx('New version ','Neue Version ')+esc(String(i.latest||'')):U.state==='checking'?tx('Checking…','Prüfe …'):U.state==='uptodate'?tx('You have the latest version','Du hast die neueste Version'):tx('Tap to check','Tippen zum Prüfen');
  return stGroup('',sxGo('download',tx('Check for updates','Nach Updates suchen'),upd,'data-a="updcheck"',''))+
    stGroup('',sxGo('info',tx('About Kobel','Über Kobel'),'v'+APP_VER,'data-a="tab" data-k="about"'));
}
const SX_PAGES=()=>({
  account:[tx('Account and sync','Konto und Sync'),()=>stAccountPage()],
  learn:[tx('Learning','Lernen'),stLearn],
  sound:[tx('Sound and voice','Ton und Stimme'),stSound],
  alerts:[tx('Notifications','Benachrichtigungen'),stAlerts],
  look:[tx('Language and look','Sprache und Aussehen'),stLook],
  words:[tx('Words and lessons','Wörter und Lektionen'),stWords],
  data:[tx('Backup and data','Sicherung und Daten'),stData],
  about:[tx('Updates and about','Updates und Info'),stAbout]
});
/* the account page is the one from auth.js (without the update card: updates have their own page now) */
function stAccountPage(){return stAccount().replace(/<h2 class="sec">App-Update<\/h2>[\s\S]*$/,'')}
function sxSummary(){
  const S0=S.settings,on=v=>v?tx('On','An'):tx('Off','Aus');
  return {
    learn:`${tx('Goal','Ziel')} ${S0.goal} · ${S0.newPer} ${tx('new words','neue Wörter')}`,
    sound:`${tx('Sound','Ton')} ${on(S0.sound).toLowerCase()} · ${tx('voice','Stimme')} ${on(S0.tts).toLowerCase()}`,
    alerts:stNote()?tx('On','An'):tx('Off','Aus'),
    look:`${sxLabel('lang')} · ${sxLabel('theme')}`,
    words:`${S.cards.filter(c=>!isG(c)).length} ${tx('words','Wörter')}`,
    data:S.stats.lastBackup?tx('Last backup ','Letzte Sicherung ')+new Date(S.stats.lastBackup).toLocaleDateString():tx('No backup yet','Noch keine Sicherung'),
    about:'v'+APP_VER+(U.state==='available'?' · '+tx('update ready','Update bereit'):'')
  };
}
/* ---- Settings home: ONE page, the everyday controls are right here (no digging through sub-pages) ---- */
function sxSeg(k,ic,desc){
  const p=SX_PICK()[k],cur=String(S.settings[k]),sel=p.o.find(o=>String(o[0])===cur);
  return `<div class="sxg-blk"><div class="sxg-hd"><span class="st-i">${stIco(ic,20)}</span><b>${p.t}</b></div>
    <div class="sxg" role="radiogroup" aria-label="${p.t}">${p.o.map(o=>`<button type="button" role="radio" aria-checked="${String(o[0])===cur}" class="${String(o[0])===cur?'on':''}" data-a="setv" data-k="${k}" data-v="${o[0]}">${o[1]}</button>`).join('')}</div>
    <p class="sxg-d">${sel&&sel[2]?sel[2]:(desc||'')}</p></div>`;
}
const SX_JUMP=()=>[['learn',tx('Learning','Lernen')],['sound',tx('Sound','Ton')],['alerts',tx('Alerts','Hinweise')],['look',tx('Look','Look')],['lib',tx('Words','Wörter')],['about',tx('About','Info')]];
function stHome(){
  let signed=false,uname='';try{signed=hasAccount();const u=myInfo()||{};uname=u.username?'@'+u.username:''}catch(e){}
  const hasUpd=(U.state==='available'||U.state==='ready')&&U.info&&U.info.latest;
  const upd=hasUpd?`<button type="button" class="sx-upd" data-a="updcheck"><b>${tx('Update available','Update verfügbar')}</b><span>Kobel ${esc(String(U.info.latest).replace(/^v/i,''))} · ${tx('tap to install','tippen zum Installieren')}</span><i>›</i></button>`:'';
  const sc=scopeInfo(),n=unreadN();
  const sw=(ic,t,d,on,attrs)=>sxSw(ic,t,d,on,attrs);
  const updTxt=U.state==='checking'?tx('Checking…','Prüfe …'):U.state==='uptodate'?tx('You have the latest version','Du hast die neueste Version'):hasUpd?tx('New version ','Neue Version ')+esc(String(U.info.latest)):tx('Tap to check','Tippen zum Prüfen');
  return `<div class="st-me2"><button class="st-who" data-a="setpage" data-k="account">${avatarSvg(myAvatar(),56)}<span><b>${esc(myName())}${vbadge(myBadge())}</b><small>${signed?(uname||tx('Signed in','Angemeldet')):tx('Not signed in','Nicht angemeldet')}</small></span></button>
    ${signed?`<button class="st-pill" data-a="setpage" data-k="account">${tx('Account','Konto')}</button>`:`<button class="st-pill hot" data-a="authin">${tx('Sign in','Anmelden')}</button>`}</div>
  <button class="sx-prof" data-a="tab" data-k="profile">${stIco('user',18)}<span>${tx('View my profile','Mein Profil ansehen')}</span><i>›</i></button>
  ${upd}
  <nav class="st-jump" aria-label="${tx('Jump to','Springe zu')}">${SX_JUMP().map(j=>`<button type="button" data-a="setjump" data-k="${j[0]}">${j[1]}</button>`).join('')}</nav>

  <section class="st-g" id="sx-learn"><h3 class="st-h">${tx('Learning','Lernen')}</h3><div class="st-card st-pad">
    ${sxSeg('goal','goal')}${sxSeg('newPer','plus')}${sxSeg('challenge','sens')}${sxSeg('gShare','gram')}${sxSeg('dir','card')}</div></section>

  <section class="st-g" id="sx-sound"><h3 class="st-h">${tx('Sound and voice','Ton und Stimme')}</h3><div class="st-card">
    ${sw('speaker',tx('Sound effects','Soundeffekte'),tx('Taps, right and wrong answers, celebrations','Tippen, richtig und falsch, Feiern'),!!S.settings.sound,'data-a="tog" data-k="sound"')}
    ${sw('mic',tx('Speak German aloud','Deutsch vorlesen'),germanOK()?tx('German voice ready','Deutsche Stimme bereit'):tx('No German voice found on this device','Keine deutsche Stimme gefunden'),!!S.settings.tts,'data-a="tog" data-k="tts"')}
    ${sxGo('speaker',tx('Test the German voice','Stimme testen'),'','data-a="testvoice"',germanOK()?tx('Play','Abspielen'):NATIVE?tx('Install voice','Stimme installieren'):tx('Help','Hilfe'))}</div></section>

  <section class="st-g" id="sx-alerts"><h3 class="st-h">${tx('Notifications','Benachrichtigungen')}</h3><div class="st-card">
    ${sw('bell',tx('Notifications','Benachrichtigungen'),tx('Friend and match requests, study group news, new versions','Freundschafts- und Spielanfragen, Lerngruppen, neue Versionen'),stNote(),`data-a="notify" data-v="${stNote()?0:1}"`)}
    ${sw('fire',tx('Streak reminders','Serien-Erinnerungen'),tx('An evening reminder and a last call before your streak ends','Abendliche Erinnerung und ein letzter Aufruf vor dem Ende deiner Serie'),noteStreakOn(),`data-a="notifystreak" data-v="${noteStreakOn()?0:1}"`)}
    ${sxGo('bell',tx('Inbox','Postfach'),n?`${n} ${tx('unread','ungelesen')}`:tx('Nothing new','Nichts Neues'),'data-a="tab" data-k="inbox"')}</div></section>

  <section class="st-g" id="sx-look"><h3 class="st-h">${tx('Language and look','Sprache und Aussehen')}</h3><div class="st-card st-pad">${sxSeg('lang','globe')}${sxSeg('theme','sun')}</div></section>

  <section class="st-g" id="sx-lib"><h3 class="st-h">${tx('Your words','Deine Wörter')}</h3><div class="st-card">
    ${sxGo('squad',tx('Squad (your words)','Kader (deine Wörter)'),`${S.cards.filter(c=>!isG(c)).length} ${tx('words','Wörter')} · ${S.cards.filter(isG).length} ${tx('grammar items','Grammatik')}`,'data-a="tab" data-k="library"')}
    ${sxGo('list',tx('Lessons in training','Lektionen im Training'),`${sc.n} ${tx('of','von')} ${sc.total} ${tx('active','aktiv')}`,'data-a="scope"')}
    ${sxGo('trophy',tx('Trophy cabinet','Vitrine'),'','data-a="cabinet"')}
    ${sxGo('save',tx('Backup and data','Sicherung und Daten'),S.stats.lastBackup?tx('Last backup ','Letzte Sicherung ')+new Date(S.stats.lastBackup).toLocaleDateString():tx('No backup yet','Noch keine Sicherung'),'data-a="setpage" data-k="data"')}</div></section>

  <section class="st-g" id="sx-about"><h3 class="st-h">${tx('About','Info')}</h3><div class="st-card">
    ${sxGo('download',tx('Check for updates','Nach Updates suchen'),updTxt,'data-a="updcheck"','')}
    ${sxGo('info',tx('About Kobel','Über Kobel'),'v'+APP_VER,'data-a="tab" data-k="about"')}</div></section>`;
}
function vSet(){
  const pages=SX_PAGES();
  try{if(RN.tab!=='settings')SETTAB='home'}catch(e){}
  if(!pages[SETTAB])SETTAB='home';
  if(SETTAB==='home')return `<div class="top st-top"><h1 class="h1">${tx('Settings','Einstellungen')}</h1></div><div class="st-body" id="st-body">${stHome()}</div>`;
  const pg=pages[SETTAB];
  return `<button class="st-back" data-a="setpage" data-k="home">‹ ${tx('Settings','Einstellungen')}</button><div class="top st-top"><h1 class="h1">${pg[0]}</h1></div><div class="st-body" id="st-body">${pg[1]()}</div>`;
}
function vProfile(){
  const st=S.stats,ti=tierInfo(),tc=trophyCount(),L=lvl(st.xp),wk=Math.floor(curStreak()/7),n=unreadN();
  const cl=(typeof clubOf==='function'&&clubOf(myAvatar()))||null;
  return `<div class="top"><h1 class="h1">${tx('Profile','Profil')}</h1></div>
  <div class="pf-hero"><div class="pf-av">${avatarSvg(myAvatar(),92)}</div><div class="pf-id"><b>${esc(myName())}${vbadge(myBadge(),true)}</b><span>${esc(title(L))} · ${tx('Level','Stufe')} ${L}</span><em>${cl?esc(cl[1]):''} ${esc(ti.t.n)}</em></div>
    <button class="pf-ed" data-a="pfedit" aria-label="${tx('Edit profile','Profil bearbeiten')}">${stIco('gear',20)}<span>${tx('Edit','Ändern')}</span></button></div>
  <div class="statgrid" style="grid-template-columns:repeat(3,1fr)">${sCell(curStreak(),tx('Streak','Serie'),wk?`${wk} ${tx(wk===1?'week':'weeks',wk===1?'Woche':'Wochen')}`:tx('days','Tage'))}${sCell(ti.lp,'LP',esc(ti.t.lv))}${sCell(knowledge(),tx('Words known','Wörter'),tx('equivalents','Äquivalente'))}</div>
  <div class="statgrid" style="grid-template-columns:repeat(3,1fr)">${sCell(tc.gold,tx('Gold','Gold'),'')}${sCell(tc.silver,tx('Silver','Silber'),'')}${sCell(tc.bronze,'Bronze','')}</div>
  <div class="pf-tiles">
    <button data-a="tab" data-k="library"><span>${stIco('squad',26)}</span><b>${tx('Squad','Kader')}</b><small>${S.cards.filter(c=>!isG(c)).length} ${tx('words','Wörter')}</small></button>
    <button data-a="tab" data-k="inbox"><span>${stIco('bell',26)}${n?`<i>${n>9?'9+':n}</i>`:''}</span><b>${tx('Inbox','Postfach')}</b><small>${n?n+' '+tx('unread','ungelesen'):tx('all read','alles gelesen')}</small></button>
    <button data-a="cabinet"><span>${stIco('trophy',26)}</span><b>${tx('Trophies','Pokale')}</b><small>${tc.gold+tc.silver+tc.bronze}</small></button>
    <button data-a="tab" data-k="settings"><span>${stIco('gear',26)}</span><b>${tx('Settings','Einstellungen')}</b><small>${tx('everything else','alles andere')}</small></button>
  </div>
  <div class="st-card st-wrap" style="margin-top:12px">${idCard()}</div>
  <button class="btn ghost" style="margin-top:14px" data-a="tab" data-k="home">${tx('Back to the start','Zurück zum Start')}</button>`;
}
/* the library page gets a way back, since it is no longer in the top nav */
function vLib(){return `<button class="st-back" data-a="setpage" data-k="words">‹ ${tx('Words and lessons','Wörter und Lektionen')}</button>`+vLib0()}
const GEAR_B='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+STI.gear+'</svg>';
function hdrBtns(){
  const n=unreadN();
  return `<button class="iconbtn bellb" data-a="tab" data-k="inbox" aria-label="Notifications">${BELL}${n?`<i class="bdot">${n>9?'9+':n}</i>`:''}</button><button class="iconbtn" data-a="tab" data-k="settings" aria-label="Settings">${GEAR_B}</button><button class="avbtn" data-a="tab" data-k="profile" aria-label="Profile">${avatarSvg(myAvatar(),38)}</button>`;
}
const SET3_ACTIONS={
  setpage:t=>{SETTAB=t.dataset.k;render();try{window.scrollTo(0,0)}catch(e){}},
  setpick:t=>sxPickSheet(t.dataset.k),
  setval:t=>{A.set(t);closeSheet()},
  updcheck:()=>checkUpdate(true),
  /* a choice made inside the page keeps the scroll position */
  setv:t=>{const y=window.scrollY;A.set(t);requestAnimationFrame(()=>window.scrollTo(0,y))},
  setjump:t=>{const e=document.getElementById('sx-'+t.dataset.k);if(e)e.scrollIntoView({behavior:'smooth',block:'start'})}
};
