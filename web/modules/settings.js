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
let SETTAB='general';
const SET_TABS=()=>[['general',tx('General','Allgemein'),'gear'],['learn',tx('Learning','Lernen'),'goal'],['sound',tx('Sound','Ton'),'speaker'],['alerts',tx('Alerts','Alarme'),'bell'],['account',tx('Account','Konto'),'user'],['data',tx('Data','Daten'),'save']];
/* one row: icon, title, explanation, control */
const stRow=(ic,t,d,ctl,cls='')=>`<div class="st-row ${cls}"><span class="st-i">${stIco(ic,20)}</span><div class="st-t"><b>${t}</b>${d?`<small>${d}</small>`:''}</div><div class="st-c">${ctl||''}</div></div>`;
const stSeg=(k,vals,labels)=>`<div class="st-seg">${vals.map((v,i)=>`<button class="${String(S.settings[k])===String(v)?'on':''}" data-a="set" data-k="${k}" data-v="${v}">${labels?labels[i]:v}</button>`).join('')}</div>`;
const stGroup=(h,rows)=>`<section class="st-g">${h?`<h3 class="st-h">${h}</h3>`:''}<div class="st-card">${rows}</div></section>`;
const stNote=()=>{try{return noteOn()}catch(e){return true}};

function stGeneral(){
  return stGroup(tx('Language and look','Sprache und Aussehen'),
    stRow('globe',tx('App language','App-Sprache'),tx('Menus and hints','Menüs und Hinweise'),stSeg('lang',['en','de'],['EN','DE']))+
    stRow('sun',tx('Theme','Design'),tx('Auto follows your phone','Auto folgt deinem Handy'),stSeg('theme',['auto','light','dark'],[tx('Auto','Auto'),tx('Light','Hell'),tx('Dark','Dunkel')])))+
  stGroup(tx('Shortcuts','Kürzel'),
    stRow('squad',tx('Squad (your words)','Kader (deine Wörter)'),`${S.cards.filter(c=>!isG(c)).length} ${tx('words','Wörter')} · ${S.cards.filter(isG).length} ${tx('grammar items','Grammatik')}`,`<button class="btn sm ghost" data-a="tab" data-k="library">${tx('Open','Öffnen')}</button>`)+
    stRow('trophy',tx('Trophy cabinet','Vitrine'),'',`<button class="btn sm ghost" data-a="cabinet">${tx('Open','Öffnen')}</button>`)+
    stRow('info',tx('About Kobel','Über Kobel'),'v'+APP_VER,`<button class="btn sm ghost" data-a="tab" data-k="about">${tx('Open','Öffnen')}</button>`));
}
function stLearn(){
  const sc=scopeInfo();
  return stGroup(tx('Daily routine','Tagesroutine'),
    stRow('goal',tx('Daily points goal','Tagesziel'),tx('Reach it to keep your day green','Erreiche es für einen grünen Tag'),stSeg('goal',[30,60,100,200]))+
    stRow('plus',tx('New words per session','Neue Wörter pro Einheit'),'',stSeg('newPer',[4,8,12]))+
    stRow('sens',tx('New-word challenge','Neue Wörter: Schwierigkeit'),tx('How long Kobel waits before testing a new word','Wie lange Kobel vor dem Abfragen wartet'),stSeg('challenge',['easy','normal','hard'],[tx('Easy','Leicht'),tx('Normal','Normal'),tx('Hard','Schwer')])))+
  stGroup(tx('What you practise','Was du übst'),
    stRow('gram',tx('Grammar share','Grammatikanteil'),tx('How much of a session is grammar','Wie viel einer Einheit Grammatik ist'),stSeg('gShare',[0,.1,.2,.3],[tx('Off','Aus'),'10%','20%','30%']))+
    stRow('list',tx('Lessons in training','Lektionen im Training'),`${sc.n} ${tx('of','von')} ${sc.total} ${tx('active','aktiv')}`,`<button class="btn sm ghost" data-a="scope">${tx('Choose','Wählen')}</button>`)+
    stRow('card',tx('Flashcard direction','Karteikarten-Richtung'),'',stSeg('dir',['both','de','en'],[tx('Both','Beide'),'DE→EN','EN→DE'])));
}
function stSound(){
  return stGroup(tx('Sound and voice','Ton und Stimme'),
    stRow('speaker',tx('Sound effects','Soundeffekte'),tx('Clicks, correct and wrong, celebrations','Klicks, richtig und falsch, Feiern'),sw('sound'))+
    stRow('mic',tx('Speak German aloud','Deutsch vorlesen'),germanOK()?tx('German voice ready','Deutsche Stimme bereit'):tx('No German voice found on this device','Keine deutsche Stimme gefunden'),sw('tts'))+
    stRow('speaker',tx('Test the German voice','Stimme testen'),'',`<button class="btn sm ghost" data-a="testvoice">${germanOK()?tx('Play','Abspielen'):NATIVE?tx('Install voice','Stimme installieren'):tx('Help','Hilfe')}</button>`));
}
function stAlerts(){
  const n=unreadN();
  return stGroup(tx('Phone notifications','Handy-Benachrichtigungen'),
    stRow('bell',tx('Notifications','Benachrichtigungen'),tx('Friend requests, match requests, study group news and nudges, updates','Freundschaftsanfragen, Spielanfragen, Lerngruppen-News und Anstupser, Updates'),`<div class="st-seg"><button class="${noteOn()?'on':''}" data-a="notify" data-v="1">${tx('On','An')}</button><button class="${noteOn()?'':'on'}" data-a="notify" data-v="0">${tx('Off','Aus')}</button></div>`)+
    stRow('fire',tx('Streak reminders','Serien-Erinnerungen'),tx('An evening reminder and a last call a few hours before your streak ends','Eine Erinnerung am Abend und ein letzter Aufruf, bevor deine Serie endet'),`<div class="st-seg"><button class="${noteStreakOn()?'on':''}" data-a="notifystreak" data-v="1">${tx('On','An')}</button><button class="${noteStreakOn()?'':'on'}" data-a="notifystreak" data-v="0">${tx('Off','Aus')}</button></div>`))+
  stGroup(tx('Inbox','Postfach'),stRow('bell',tx('Notifications inside the app','Mitteilungen in der App'),n?`${n} ${tx('unread','ungelesen')}`:tx('Nothing new','Nichts Neues'),`<button class="btn sm ghost" data-a="tab" data-k="inbox">${tx('Open','Öffnen')}</button>`))+
  `<p class="st-foot">${tx('Study group members can also nudge each other: open Table › Friends › Study groups and use "Nudge the group".','Mitglieder einer Lerngruppe können sich anstupsen: Tabelle › Freunde › Lerngruppen › „Gruppe anstupsen“.')}</p>`;
}
function stAccount(){
  return `<div class="st-card st-wrap">${idCard()}</div>${syncCard()}${updateCard()}`;
}
function stData(){
  return stGroup(tx('Backup','Sicherung'),
    stRow('save',tx('Backup file','Sicherungsdatei'),S.stats.lastBackup?tx('Last backup: ','Letzte Sicherung: ')+new Date(S.stats.lastBackup).toLocaleDateString():tx('No backup file saved yet','Noch keine Sicherung'),`<button class="btn sm c-fern" data-a="savebk">${tx('Save','Sichern')}</button>`)+
    stRow('download',tx('Load or import','Laden oder importieren'),'',`<button class="btn sm c-sky" data-a="imp">${tx('Import','Import')}</button>`)+
    stRow('card',tx('Copy backup as text','Sicherung als Text kopieren'),'',`<button class="btn sm ghost" data-a="exp">${tx('Copy','Kopieren')}</button>`)+
    stRow('card',tx('Export for Anki (TSV)','Export für Anki (TSV)'),'',`<button class="btn sm ghost" data-a="anki">${tx('Export','Export')}</button>`))+
  stGroup(tx('Careful','Vorsicht'),
    stRow('list',tx('Re-add my built-in class notes','Meine Klassennotizen neu hinzufügen'),'',`<button class="btn sm ghost" data-a="classnotes">${tx('Re-add','Hinzufügen')}</button>`)+
    stRow('fire',tx('Reset progress (keep words)','Fortschritt zurücksetzen (Wörter bleiben)'),'',`<button class="btn sm ghost" data-a="reset">${tx('Reset','Zurücksetzen')}</button>`)+
    stRow('fire',tx('Erase everything (empty library)','Alles löschen (leere Bibliothek)'),'',`<button class="btn sm ghost st-danger" data-a="wipe">${tx('Erase','Löschen')}</button>`));
}
function vSet(){
  if(!SET_TABS().some(t=>t[0]===SETTAB))SETTAB='general';
  const body={general:stGeneral,learn:stLearn,sound:stSound,alerts:stAlerts,account:stAccount,data:stData}[SETTAB]();
  const ti=tierInfo();
  return `<div class="top"><h1 class="h1">${tx('Settings','Einstellungen')}</h1></div>
  <button class="st-me" data-a="tab" data-k="profile">${avatarSvg(myAvatar(),44)}<span><b>${esc(myName())}</b><small>${esc(ti.t.n)} · ${tx('Open profile','Profil öffnen')}</small></span><i>›</i></button>
  <nav class="st-tabs" role="tablist">${SET_TABS().map(t=>`<button role="tab" class="${SETTAB===t[0]?'on':''}" data-a="settab" data-k="${t[0]}">${stIco(t[2],18)}<span>${t[1]}</span></button>`).join('')}</nav>
  <div class="st-body" id="st-body">${body}</div>
  <button class="btn ghost" style="margin-top:18px" data-a="tab" data-k="home">${tx('Back to the start','Zurück zum Start')}</button>`;
}
function vProfile(){
  const st=S.stats,ti=tierInfo(),tc=trophyCount(),L=lvl(st.xp),wk=Math.floor(curStreak()/7),n=unreadN();
  const cl=(typeof clubOf==='function'&&clubOf(myAvatar()))||null;
  return `<div class="top"><h1 class="h1">${tx('Profile','Profil')}</h1></div>
  <div class="pf-hero"><div class="pf-av">${avatarSvg(myAvatar(),92)}</div><div class="pf-id"><b>${esc(myName())}</b><span>${esc(title(L))} · ${tx('Level','Stufe')} ${L}</span><em>${cl?esc(cl[1]):''} ${esc(ti.t.n)}</em></div>
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
function vLib(){return `<button class="st-back" data-a="tab" data-k="settings">‹ ${tx('Settings','Einstellungen')}</button>`+vLib0()}
const GEAR_B='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+STI.gear+'</svg>';
function hdrBtns(){
  const n=unreadN();
  return `<button class="iconbtn bellb" data-a="tab" data-k="inbox" aria-label="Notifications">${BELL}${n?`<i class="bdot">${n>9?'9+':n}</i>`:''}</button><button class="iconbtn" data-a="tab" data-k="settings" aria-label="Settings">${GEAR_B}</button><button class="avbtn" data-a="tab" data-k="profile" aria-label="Profile">${avatarSvg(myAvatar(),38)}</button>`;
}
const SET3_ACTIONS={settab:t=>{SETTAB=t.dataset.k;render();try{window.scrollTo(0,0)}catch(e){}}};
