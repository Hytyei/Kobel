/* ───────── 2.5.0: club badges, Friends tab, study groups, shared streaks, goal duels, alerts ─────────
   Everything here is added after the 2.4 social code. Where a 2.4 function is replaced (friendsInner, friendRow, soLoad,
   buildDeck, duel screens ...) the newer declaration below wins, so the older code stays in the file untouched. */

/* ---- clubs: official crests and stadium icons (assets/www/clubs/<id>.svg, assets/www/stadiums/<id>.png) ----
   [id, name, abbreviation, main colour, second colour, stadium]. Clubs of earlier versions that are not in the 2026/27 set any more
   (wob, stp, fch) are kept in CLUBS_OLD so that old profiles and friends still show a badge; they cannot be picked any more. */
const CLUBS=[
  ['fcb','FC Bayern München','FCB','#DC052D','#0066B2','Allianz Arena'],
  ['bvb','Borussia Dortmund','BVB','#FDE100','#0B0B0B','Signal Iduna Park'],
  ['rbl','RB Leipzig','RBL','#DD0741','#001F47','Red Bull Arena'],
  ['b04','Bayer 04 Leverkusen','B04','#E32221','#0B0B0B','BayArena'],
  ['sge','Eintracht Frankfurt','SGE','#E1000F','#0B0B0B','Deutsche Bank Park'],
  ['vfb','VfB Stuttgart','VFB','#FFFFFF','#E32219','MHP Arena'],
  ['scf','SC Freiburg','SCF','#E2001A','#0B0B0B','Europa-Park Stadion'],
  ['bmg','Borussia Mönchengladbach','BMG','#00A651','#0B0B0B','Borussia-Park'],
  ['m05','1. FSV Mainz 05','M05','#C3141E','#FFFFFF','Mewa Arena'],
  ['tsg','TSG Hoffenheim','TSG','#1961AC','#FFFFFF','SNP Arena'],
  ['fca','FC Augsburg','FCA','#BA3733','#006437','WWK Arena'],
  ['fcu','1. FC Union Berlin','FCU','#EB1923','#FDE100','Stadion An der Alten Försterei'],
  ['svw','SV Werder Bremen','SVW','#1D9053','#FFFFFF','Weserstadion'],
  ['koe','1. FC Köln','KOE','#ED1C24','#FFFFFF','RheinEnergieStadion'],
  ['hsv','Hamburger SV','HSV','#005CA9','#FFFFFF','Volksparkstadion'],
  ['s04','FC Schalke 04','S04','#004D9D','#FFFFFF','Veltins-Arena'],
  ['scp','SC Paderborn 07','SCP','#0069B4','#0B0B0B','Home Deluxe Arena'],
  ['sve','SV Elversberg','SVE','#2B2B2B','#FFFFFF','Ursapharm-Arena']
];
const CLUBS_OLD=[
  ['wob','VfL Wolfsburg','WOB','#65B32E','#FFFFFF',''],
  ['stp','FC St. Pauli','STP','#6B3A1E','#FFFFFF',''],
  ['fch','1. FC Heidenheim','FCH','#E2001A','#003C7D','']
];
const CLUB_PICK=CLUBS.map(c=>[c[0]]);
const clubOf=id=>CLUBS.find(c=>c[0]===id)||CLUBS_OLD.find(c=>c[0]===id)||null;
const hasCrest=id=>CLUBS.some(c=>c[0]===id);
function inkOn(hex){const n=parseInt(String(hex).slice(1),16)||0,r=n>>16,g=n>>8&255,b=n&255;return (r*299+g*587+b*114)/1000>150?'#0B0B0B':'#FFFFFF'}
/* the stadium icon is a mask: it takes the colour of the text around it, whatever colour the PNG itself is */
const stadIcon=(id,s=22)=>`<i class="stad" style="width:${s}px;height:${s}px;-webkit-mask-image:url(stadiums/${id}.png);mask-image:url(stadiums/${id}.png)"></i>`;
function badgeSvg(id,size=40){
  if(hasCrest(id))return `<span class="av club crest" style="width:${size}px;height:${size}px"><img src="clubs/${id}.svg" alt="" draggable="false"></span>`;
  const c=clubOf(id),bg=c?c[3]:'#D20515',fg=c?c[4]:'#0B0B0B',ab=c?c[2]:'K',ink=inkOn(bg),bar=bg.toUpperCase()===fg.toUpperCase()?'#0B0B0B':fg;
  return `<span class="av club" style="width:${size}px;height:${size}px"><svg viewBox="0 0 64 64"><path d="M8 5h48v27c0 15-10 23-24 28C18 55 8 47 8 32z" fill="${bg}" stroke="rgba(255,255,255,.45)" stroke-width="1.5"/><path d="M8.8 5.8h46.4v9.2H8.8z" fill="${bar}"/><text x="32" y="43" text-anchor="middle" font-family="DFL Sans Condensed,Barlow Condensed,Arial Narrow,sans-serif" font-weight="800" font-size="${ab.length>2?19:22}" fill="${ink}">${ab}</text></svg></span>`;
}
function avatarSvg(id,size=40){return badgeSvg(id,size)}
function applyClub(){
  try{
    const c=clubOf(S.settings.avatar),r=document.documentElement.style,bg=c?c[3]:'#D20515';
    r.setProperty('--club',bg);r.setProperty('--club2',c?c[4]:'#0B0B0B');r.setProperty('--clubink',inkOn(bg));
  }catch(e){}
}
function applyTheme(){if(S.settings.theme==='auto')delete document.documentElement.dataset.theme;else document.documentElement.dataset.theme=S.settings.theme;applySkin();applyClub()}
function applySkin(){document.documentElement.dataset.skin='bl'}
const clubCol=(id,alt)=>{const c=clubOf(id);return c?(alt&&c[3].toUpperCase()==='#FFFFFF'?c[4]:c[3]):alt?'#4A4A4A':'#D20515'};
const clubAb=(id,name)=>{const c=clubOf(id);return c?c[2]:String(name||'?').slice(0,3).toUpperCase()};
/* two team colours that are too close get a different second colour */
function pairCols(a,b){
  const x=clubCol(a),y=clubCol(b),d=h=>{const n=parseInt(h.slice(1),16);return [n>>16,n>>8&255,n&255]};
  const p=d(x),q=d(y),dist=Math.abs(p[0]-q[0])+Math.abs(p[1]-q[1])+Math.abs(p[2]-q[2]);
  if(dist>140)return[x,y];
  const c=clubOf(b);return[x,c&&c[4].toUpperCase()!==x.toUpperCase()?c[4]:'#4A4A4A'];
}
/* the scorebug, like the one on the broadcast: [crest ABB goals][goals ABB crest] */
function scorebug(L,R,o={}){
  const [cl,cr]=pairCols(L.club,R.club);
  return `<div class="sbug ${o.big?'big':''}"><div class="sbl" style="background:${cl};color:${inkOn(cl)}">${badgeSvg(L.club,o.big?44:30)}<b>${esc(clubAb(L.club,L.name))}</b><em ${o.idL?`id="${o.idL}"`:''}>${L.score}</em></div><div class="sbr" style="background:${cr};color:${inkOn(cr)}"><em ${o.idR?`id="${o.idR}"`:''}>${R.score}</em><b>${esc(clubAb(R.club,R.name))}</b>${badgeSvg(R.club,o.big?44:30)}</div></div>`;
}

/* ---- public numbers: the days you practised (day numbers, newest 90) feed the shared streaks ---- */
function pubDays(){
  const out=[];
  try{Object.entries(S.stats.days||{}).forEach(([k,v])=>{if(v&&v.xp>0){const m=/^(\d{4})-(\d\d)-(\d\d)$/.exec(k);if(m)out.push(Math.floor(Date.UTC(+m[1],+m[2]-1,+m[3])/864e5))}})}catch(e){}
  return out.sort((a,b)=>a-b).slice(-90);
}
function refreshPub(){
  try{
    const r=recordsData(),st=S.stats;
    st.pub={lp:Math.max(0,lpNow()),stage:stageNow(lpNow()).s.n,days:pubDays(),rec:{bestDayXp:r.bestDay[1],bestWeekXp:r.bestWeek[1],busiestDay:r.busy[1],activeDays:r.activeDays,known:r.known,mastered:r.mastered,stars:r.stars,talks:r.talks,perfect:st.perfect||0,sessions:st.sessions||0,answers:st.answers||0,maxCombo:st.maxCombo||0,bestStreak:st.best||0,trophies:r.trophies,seasons:r.seasons,badges:r.badges,favGame:r.plays?r.plays[0]:''}};
  }catch(e){}
}

/* ---- the Friends tab ---- */
const FR={tab:'people',gOpen:0};
SO.groups=[];SO.meId=0;
ICON.friends='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.6 2.7-6 6-6s6 2.4 6 6"/><circle cx="17" cy="9" r="2.4"/><path d="M17 14c2.6 0 4.4 1.9 4.4 4.6"/></svg>';
function drawTabs(){
  const t=[['home',tx('Start','Start'),ICON.home],['path','Pfad',ICON.path],['arcade','Training',ICON.game],['library','Kader',ICON.lib],['stats','Tabelle',ICON.stats],['friends',tx('Friends','Freunde'),ICON.friends],['teach','Taktik',ICON.board]];
  $('#tabs .in').innerHTML=t.map(([k,n,i])=>`<button class="tab ${tab===k?'on':''}" data-a="tab" data-k="${k}">${i}<span>${n}</span></button>`).join('');
}
function vFriends(){
  const segs=[['people',tx('Friends','Freunde')],['groups',tx('Study groups','Lerngruppen')]];
  if(soOK())soLoad();
  return `<div class="top"><h1 class="h1">${tx('Friends','Freunde')}</h1><div class="chips"><div class="chip">${FLAME(16)}${curStreak()}</div></div></div>
  <div class="seg segx" style="margin-bottom:14px">${segs.map(([k,n])=>`<button class="${FR.tab===k?'on':''}" data-a="frtab" data-k="${k}">${n}</button>`).join('')}</div><div id="so-body">${FR.tab==='groups'?groupsInner():friendsInner()}</div>`;
}
function soRefresh(){const b=$('#so-body');if(b)b.innerHTML=FR.tab==='groups'?groupsInner():friendsInner();if(FR.gOpen&&$('#gp')&&!GP.play)gpDraw()}
function friendsTab(){return vFriends()}

async function soLoad(force){
  if(!soOK()||SO.loading)return;
  if(!force&&Date.now()-SO.at<6000)return;
  SO.loading=true;
  try{
    const [f,d,g]=await Promise.all([api('GET','/v1/friends'),api('GET','/v1/duels'),api('GET','/v1/groups')]);
    soSocial().friends=f.friends;SO.duels=d.duels;SO.groups=g.groups||[];SO.skew=d.now-Date.now();SO.err='';SO.at=Date.now();
    if(!SO.meId){try{const m=await api('GET','/v1/me');SO.meId=m.user.id||0}catch(e){}}
    soClaimAll();
  }catch(e){SO.err=e.message}
  SO.loading=false;SO.loaded=true;soRefresh();
  if(tab!=='friends')return;
}
function soAnnounce(){}   // alerts (below) announce challenges now

const st2=f=>f.streak2&&f.streak2.n>0?`<em class="st2" title="${tx('Streak together','Serie zusammen')}">${FLAME(12)}${f.streak2.n}</em>`:'';
function friendRow(f){
  const t=TIERS[f.tier]||TIERS[0];
  return `<div class="drow"><button class="fav" data-a="frprof" data-id="${f.id}">${avatarSvg(f.avatar,40)}</button><button class="dm lnk" data-a="frprof" data-id="${f.id}"><b>${esc(f.name)} ${st2(f)}</b><span>${esc(f.stage||t.n)} · ${f.week} ${tx('pts this week','Pkt. diese Woche')}${f.streak2&&f.streak2.n?'':' · '+(f.streak?f.streak+' '+tx('day streak','Tage Serie'):tx('no streak','keine Serie'))}</span></button><div class="da"><button class="btn sm" data-a="frchal" data-id="${f.id}" aria-label="Challenge">${tx('Duel','Duell')}</button></div></div>`;
}
function duelRow(d){
  const o=d.opponent,g=GAMES[d.game]||{n:d.game};
  let line='',acts='';
  const left=d.expiresAt-soNow();
  if(d.status==='invited'&&d.role==='b'){line=tx('challenges you','fordert dich heraus');acts=`<button class="btn sm" data-a="duelacc" data-id="${d.id}">${tx('Accept','Annehmen')}</button><button class="btn sm ghost" data-a="duelno" data-id="${d.id}">${tx('Decline','Ablehnen')}</button>`}
  else if(d.status==='invited'&&d.role==='a'){
    if(!d.my.done){line=tx('your half is waiting','deine Halbzeit wartet');acts=`<button class="btn sm" data-a="duelopen" data-id="${d.id}">${tx('Play','Spielen')}</button>`}
    else{line=tx('you played · waiting for them','du hast gespielt · wartet auf Gegner');acts=`<button class="btn sm ghost" data-a="duelno" data-id="${d.id}">${tx('Withdraw','Zurückziehen')}</button>`}
  }else if(d.status==='active'){
    if(!d.my.done){line=tx('your turn','du bist dran')+' · '+soLeft(left);acts=`<button class="btn sm" data-a="duelopen" data-id="${d.id}">${tx('Play','Spielen')}</button>`}
    else{line=tx('you finished · waiting for them','fertig · wartet auf Gegner')+' · '+soLeft(left);acts=`<button class="btn sm ghost" data-a="duelopen" data-id="${d.id}">${tx('Open','Öffnen')}</button>`}
  }else if(d.status==='declined'){line=tx('declined','abgelehnt')}
  else{const w=d.result&&d.result.winner;line=w==='me'?tx('You won','Gewonnen'):w==='them'?tx('You lost','Verloren'):w==='draw'?tx('Draw','Unentschieden'):tx('expired','abgelaufen');
    if(w)line+=` · ${d.my.score}–${d.their.score===null?'?':d.their.score}`;acts=`<button class="btn sm ghost" data-a="duelrematch" data-id="${d.id}">${tx('Rematch','Revanche')}</button>`}
  return `<div class="drow"><button class="fav" data-a="frprof" data-id="${o.id}">${avatarSvg(o.avatar,36)}</button><div class="dm"><b>${esc(o.name)}</b><span>${esc(g.n)} · ${line}</span></div><div class="da">${acts}</div></div>`;
}

/* ---- duels: turn-based only, 9 questions, one goal per right answer ---- */
const DUEL_N=9;
function buildDeck(game){
  const all=shuffle(WALL().slice()),out=[];
  if(game==='sprint'){
    for(const c of all){if(out.length>=DUEL_N)break;
      if(Math.random()<.5){const w=smartEn(c,3);if(w.length<2)continue;out.push(dkMc(disDe(c),[c.en,...w],c.en,12,tx('Translate','Übersetze')))}
      else{const w=smartDe(c,3);if(w.length<2)continue;out.push(dkMc(c.en,[disDe(c),...w.map(disDe)],disDe(c),12,tx('Pick the German','Wähle das Deutsche')))}}
  }else if(game==='dash'){
    for(const c of all.filter(c=>c.art)){if(out.length>=DUEL_N)break;out.push(dkMc(c.de,['der','die','das'],c.art,8,tx('Which article?','Welcher Artikel?')))}
  }else if(game==='plural'){
    for(const c of all.filter(pluralOf)){if(out.length>=DUEL_N)break;const r=pluralOf(c),w=pluralWrong(c,r,2);if(w.length<1)continue;out.push(dkMc(disDe(c),[r,...w],r,12,tx('Pick the plural: die …','Wähle den Plural: die …')))}
  }else if(game==='gap'){
    for(const c of shuffle(GALL().slice())){if(out.length>=DUEL_N)break;const m=(c.sentence||'').match(/\{\{(.+?)\}\}/);if(!m)continue;const ans=m[1],w=gDistract(c,ans,3);if(w.length<1)continue;
      out.push(dkMc(plain(c.sentence.replace(m[0],'____')),[ans,...w],ans,15,c.en))}
  }else if(game==='scramble'){
    for(const c of all.filter(scrOK)){if(out.length>=DUEL_N)break;const ch=[...c.de];let s=shuffle(ch.slice()),n=0;while(s.join('')===c.de&&n++<5)s=shuffle(ch.slice());
      out.push({t:'type',q:c.en.slice(0,160),a:c.de,chars:s,tm:25,hint:tx('Put the letters in order','Bringe die Buchstaben in Ordnung')})}
  }
  return out.length>=DUEL_N?out.slice(0,DUEL_N):null;
}
function challengeSheet(fid){
  closeSheet();CH.mode='turn';CH.f=fid;const f=soSocial().friends.find(x=>x.id===fid)||{name:'?'};
  const gs=SO_GAMES.map(id=>{const g=GAMES[id],bad=duelReq(id);return `<button class="gpick ${CH.g===id?'on':''}" data-a="chg" data-g="${id}" ${bad?'disabled title="'+esc(bad)+'"':''}><span class="gi">${g.ic}</span><b>${esc(g.n)}</b><i>${esc(g.tag)}</i></button>`}).join('');
  sheet(`<h2>${tx('Match vs ','Spiel gegen ')}${esc(f.name)}</h2><p class="sub">${tx('Nine questions for both of you. Every right answer is one goal, so the game ends like a football score. You play now; your friend has 24 hours.','Neun Fragen für euch beide. Jede richtige Antwort ist ein Tor, das Spiel endet wie ein Fußballergebnis. Du spielst jetzt, dein Freund hat 24 Stunden.')}</p>
  <div class="gpicks">${gs}</div>
  <button class="btn" data-a="chgo" style="margin-top:14px">${tx('Kick off','Anstoß')}</button>`);
}
async function duelCreate(){
  const deck=buildDeck(CH.g);if(!deck){toast(duelReq(CH.g));return}
  try{
    const j=await api('POST','/v1/duels',{friend:CH.f,game:CH.g,mode:'turn',deck});
    closeSheet();SO.skew=j.duel.now-Date.now();soLoad(true);dlOpen(j.duel.id);
  }catch(e){toast(e.message)}
}
const dlSides=d=>[{club:myAvatar(),name:myName(),score:d.my.score},{club:d.opponent.avatar,name:d.opponent.name,score:d.their.score===null?'–':d.their.score}];
function dlHead(){
  const d=DL.d;if(!d)return '';
  const g=GAMES[d.game]||{n:d.game},[L,R]=dlSides(d);
  return `<div class="dl-top"><button class="tr-x" data-a="dlclose" aria-label="Close">✕</button><div class="dl-t"><span>${esc(g.n)} · ${tx('9 questions','9 Fragen')}</span><b>${esc(L.name)} – ${esc(R.name)}</b></div></div>
  <div class="dl-sc">${scorebug(L,R,{idL:'dl-my',idR:'dl-th'})}<div class="dl-pr"><i id="dl-myb" style="width:${d.n?d.my.count/d.n*100:0}%"></i><i id="dl-thb" style="width:${d.n?d.their.count/d.n*100:0}%"></i></div></div>`;
}
function dlHeadUpdate(){
  const d=DL.d;if(!d||!$('#dl-my'))return;
  $('#dl-my').textContent=d.my.score;$('#dl-th').textContent=d.their.score===null?'–':d.their.score;
  $('#dl-myb').style.width=(d.my.count/d.n*100)+'%';$('#dl-thb').style.width=(d.their.count/d.n*100)+'%';
}
function dlInvite(){
  const d=DL.d,g=GAMES[d.game];
  dlEl().innerHTML=`${dlHead()}<div class="dl-body center"><h2>${esc(d.opponent.name)} ${tx('challenges you','fordert dich heraus')}</h2><p class="sub">${esc(g.n)} · ${tx('9 questions, you have 24 hours','9 Fragen, du hast 24 Stunden')}</p><div class="row2" style="margin-top:16px"><button class="btn" data-a="dlaccept">${tx('Accept and play','Annehmen und spielen')}</button><button class="btn ghost" data-a="dlno">${tx('Decline','Ablehnen')}</button></div></div>`;
}
function dlResult(){
  const run=DL.run;DL.mode='result';clearInterval(DL.timer);
  const d=DL.d,w=d.result&&d.result.winner,o=d.opponent,final=['done','expired'].includes(d.status);
  if(final)soClaim(d);
  let head,sub='';
  if(d.status==='declined')head=tx('Declined','Abgelehnt');
  else if(w==='me')head=tx('Full time: you win!','Abpfiff: du gewinnst!');else if(w==='them')head=tx('Full time: '+o.name+' wins','Abpfiff: '+o.name+' gewinnt');else if(w==='draw')head=tx('Full time: draw','Abpfiff: Unentschieden');
  else if(final)head=tx('Expired','Abgelaufen');
  else{head=tx('Half time','Halbzeit');sub=tx(o.name+' has '+soLeft(d.expiresAt-soNow())+' left to play. The result appears under Friends.',o.name+' hat noch '+soLeft(d.expiresAt-soNow())+'. Das Ergebnis erscheint unter Freunde.')}
  const [L,R]=dlSides(d);
  dlEl().innerHTML=`${dlHead()}<div class="dl-body center"><h2 class="fin">${esc(head)}</h2>${scorebug(L,R,{big:1})}<p class="sub" style="margin-top:12px">${esc(sub)}</p><div class="row2" style="margin-top:16px">${final?`<button class="btn" data-a="dlrematch">${tx('Rematch','Revanche')}</button>`:''}<button class="btn ghost" data-a="dlclose">${tx('Close','Schließen')}</button></div></div>`;
  if(!final&&run===DL.run){clearInterval(DL.poll);DL.poll=setInterval(async()=>{try{const j=await api('GET','/v1/duels/'+DL.id);if(run!==DL.run)return;DL.d=j.duel;if(['done','expired'].includes(j.duel.status)){clearInterval(DL.poll);dlResult()}}catch(e){}},4000)}
}

/* ---- study groups ---- */
const GP={id:0,g:null,err:'',busy:false,play:null};
const gpEl=()=>{let e=$('#gp');if(!e){e=document.createElement('div');e.id='gp';e.className='dl gp';document.body.appendChild(e)}return e};
function groupsInner(){
  if(!soOK())return friendsInner();
  const gs=SO.groups||[];
  const rows=gs.map(g=>`<button class="drow gp-row" data-a="gpopen" data-id="${g.id}"><span class="gp-av">${(g.avatars||[]).map(a=>badgeSvg(a,26)).join('')}</span><span class="dm"><b>${esc(g.name)}</b><span>${g.count} ${tx('players','Spieler')}${g.streak?` · ${FLAME(11)} ${g.streak} ${tx('days together','Tage zusammen')}`:''}</span></span>${g.todo?`<i class="gp-todo">${g.todo}</i>`:''}</button>`).join('');
  return `${SO.err?`<p class="sub" style="color:var(--badtxt)">${esc(SO.err)}</p>`:''}
  <h2 class="sec">${tx('Study groups','Lerngruppen')} · ${gs.length}</h2>
  <div class="card patch dl-list">${rows||`<p class="sub">${SO.loaded?tx('No groups yet. Make one with friends: you play rounds together, get a group table and a group streak.','Noch keine Gruppen. Gründe eine mit Freunden: ihr spielt Runden zusammen, habt eine Gruppentabelle und eine Gruppenserie.'):tx('Loading…','Lädt…')}</p>`}</div>
  <button class="btn" style="margin-top:12px" data-a="gpnew">${tx('New study group','Neue Lerngruppe')}</button>`;
}
function gpNewSheet(){
  const fr=soSocial().friends;
  if(!fr.length){toast(tx('Add a friend first (invite code).','Füge zuerst einen Freund hinzu (Einladungscode).'));return}
  sheet(`<h2>${tx('New study group','Neue Lerngruppe')}</h2><label class="sub" for="gp-n" style="display:block;margin:10px 0 4px">${tx('Name','Name')}</label><input class="inp" id="gp-n" maxlength="30" placeholder="${tx('e.g. Sunday League','z. B. Sonntagsliga')}" autocomplete="off">
  <div class="sub" style="margin:12px 0 4px">${tx('Friends to add (up to 7)','Freunde hinzufügen (bis zu 7)')}</div>
  <div class="card patch dl-list" style="padding:2px 12px">${fr.map(f=>`<label class="drow gp-pick"><input type="checkbox" value="${f.id}">${avatarSvg(f.avatar,32)}<span class="dm"><b>${esc(f.name)}</b></span></label>`).join('')}</div>
  <button class="btn" id="gp-go" style="margin-top:12px">${tx('Create group','Gruppe erstellen')}</button>`,sh=>{
    sh.querySelector('#gp-go').onclick=async()=>{
      const name=sh.querySelector('#gp-n').value.trim(),ids=[...sh.querySelectorAll('.gp-pick input:checked')].map(x=>+x.value);
      if(name.length<2){toast(tx('Give the group a name (2 to 30 characters).','Gib der Gruppe einen Namen (2 bis 30 Zeichen).'));return}
      if(ids.length>7){toast(tx('A group holds up to 8 people.','Eine Gruppe hat bis zu 8 Personen.'));return}
      try{const j=await api('POST','/v1/groups',{name,members:ids});closeSheet();await soLoad(true);gpOpen(j.group.id)}catch(e){toast(e.message)}
    };
  });
}
async function gpOpen(id){
  GP.id=id;FR.gOpen=id;GP.g=null;GP.err='';GP.play=null;
  gpEl().innerHTML=`<div class="dl-body"><p class="sub" style="text-align:center;margin-top:40vh">${tx('Loading…','Lädt…')}</p></div>`;
  await gpReload();
}
async function gpReload(){
  if(!GP.id)return;
  try{const j=await api('GET','/v1/groups/'+GP.id);GP.g=j.group;GP.err=''}catch(e){GP.err=e.message;if(/not found/i.test(e.message)){gpClose();soLoad(true);return}}
  gpDraw();
}
function gpClose(){const e=$('#gp');if(e)e.remove();GP.id=0;GP.g=null;GP.play=null;FR.gOpen=0;soLoad(true)}
const gpName=id=>{const m=GP.g&&GP.g.members.find(x=>x.id===id);return m?m.name:'?'};
function gpTable(g){
  const rows=g.table.map(r=>{
    const me=r.id===SO.meId,c=clubCol(r.avatar);
    return `<tr class="${me?'me':''}" style="--rc:${c}"><td class="n"><i class="stripe" style="background:${c}"></i>${r.rank}</td><td class="tm"><div class="tmi">${badgeSvg(r.avatar,22)}<span>${esc(r.name)}</span></div></td><td>${r.p}</td><td class="wdl">${r.w}-${r.d}-${r.l}</td><td>${r.gf}:${r.ga}</td><td>${r.gd>0?'+':''}${r.gd}</td><td class="pts">${r.pts}</td></tr>`;
  }).join('');
  return `<table class="tbl bl"><thead><tr><th class="n">#</th><th>${tx('Team','Team')}</th><th>${tx('P','Sp')}</th><th>${tx('W-D-L','S-U-N')}</th><th>${tx('G','T')}</th><th>+/-</th><th class="pts">${tx('Pts','Pkt')}</th></tr></thead><tbody>${rows}</tbody></table>`;
}
function gpRound(r){
  const open=r.status==='open',g=GAMES[r.game]||{n:r.game},mine=r.mine;
  let acts='',mid='';
  if(open){
    if(mine&&!mine.done){mid=`${tx('your turn','du bist dran')} · ${soLeft(r.expiresAt-soNow())}`;acts=`<button class="btn sm" data-a="gpplay" data-id="${r.id}">${mine.count?tx('Continue','Weiter'):tx('Play','Spielen')}</button>`}
    else mid=`${tx('played','gespielt')} ${r.played}/${r.total} · ${soLeft(r.expiresAt-soNow())}`;
  }
  let res='';
  if(r.results){
    const top=r.results.filter(x=>x.done);
    res=`<div class="gp-res">${r.results.map(x=>`<span class="${x.id===SO.meId?'me':''}"><b>${esc(x.name)}</b> ${x.done?x.goals:'–'}</span>`).join('')}</div>`;
    if(!open&&top.length>=2)mid=`${top[0].goals>top[1].goals?esc(top[0].name):tx('Draw at the top','Gleichstand an der Spitze')}`;
  }
  return `<div class="gp-round"><div class="gh"><b>${esc(g.n)}</b><span>${mid}</span>${acts}</div>${res}</div>`;
}
function gpDraw(){
  const e=$('#gp');if(!e||!GP.g)return;const g=GP.g,st=g.streak||{n:0,best:0,today:false};
  const own=g.isOwner;
  e.innerHTML=`<div class="dl-top"><button class="tr-x" data-a="gpclose" aria-label="Close">✕</button><div class="dl-t"><span>${tx('Study group','Lerngruppe')} · ${g.members.length}/8</span><b>${esc(g.name)}</b></div></div>
  <div class="dl-body gp-body">
    <div class="card patch gp-streak"><div class="gs-n">${FLAME(28)}<b>${st.n}</b></div><div><b>${tx('Group streak','Gruppenserie')}</b><span>${st.n?(st.today?tx('Everyone practised today. Keep it going tomorrow.','Alle haben heute geübt. Morgen weiter.'):tx('Everyone must practise today to keep it.','Alle müssen heute üben, um sie zu halten.')):tx('Starts when everyone practises on the same day.','Beginnt, wenn alle am selben Tag üben.')} ${st.best?`<em>${tx('Best','Rekord')} ${st.best}</em>`:''}</span></div></div>
    <h2 class="sec">${tx('Table','Tabelle')}</h2><div class="card patch gp-tbl">${gpTable(g)}<p class="sub" style="font-size:12px;margin-top:6px">${tx('3 points for a win, 1 for a draw. Skip a round and you lose it.','3 Punkte für einen Sieg, 1 für ein Remis. Wer eine Runde auslässt, verliert sie.')}</p></div>
    <h2 class="sec">${tx('Rounds','Runden')}</h2>
    <div class="card patch gp-rounds">${g.rounds.length?g.rounds.map(gpRound).join(''):`<p class="sub">${tx('No round yet. Start one: everyone gets the same nine questions and 24 hours.','Noch keine Runde. Starte eine: alle bekommen dieselben neun Fragen und 24 Stunden.')}</p>`}</div>
    <button class="btn" style="margin-top:12px" data-a="gpround">${tx('New round','Neue Runde')}</button>
    <button class="btn ghost gp-nudge" style="margin-top:10px" data-a="gpnudge"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.6 2H4.4z"/><path d="M10 21h4"/></svg><span>${tx('Nudge the group','Gruppe anstupsen')}</span></button>
    <div class="row2" style="margin-top:10px"><button class="btn ghost" data-a="gpadd">${tx('Add a friend','Freund hinzufügen')}</button>${own?`<button class="btn ghost" data-a="gpren">${tx('Rename','Umbenennen')}</button>`:''}</div>
    <div class="row2" style="margin-top:10px"><button class="btn ghost" data-a="gpleave">${tx('Leave group','Gruppe verlassen')}</button>${own?`<button class="btn ghost c-berry" data-a="gpdel">${tx('Delete group','Gruppe löschen')}</button>`:''}</div>
    ${GP.err?`<p class="sub" style="color:var(--badtxt)">${esc(GP.err)}</p>`:''}
  </div>`;
}
function gpRoundSheet(){
  const gs=SO_GAMES.map(id=>{const g=GAMES[id],bad=duelReq(id);return `<button class="gpick ${CH.g===id?'on':''}" data-a="gpg" data-g="${id}" ${bad?'disabled title="'+esc(bad)+'"':''}><span class="gi">${g.ic}</span><b>${esc(g.n)}</b><i>${esc(g.tag)}</i></button>`}).join('');
  sheet(`<h2>${tx('New round','Neue Runde')}</h2><p class="sub">${tx('Everyone in the group gets the same nine questions and has 24 hours. One goal for every right answer.','Alle in der Gruppe bekommen dieselben neun Fragen und haben 24 Stunden. Ein Tor für jede richtige Antwort.')}</p><div class="gpicks">${gs}</div><button class="btn" data-a="gpgo" style="margin-top:14px">${tx('Start the round','Runde starten')}</button>`);
}
function gpAddSheet(){
  const have=new Set(GP.g.members.map(m=>m.id)),fr=soSocial().friends.filter(f=>!have.has(f.id));
  sheet(`<h2>${tx('Add a friend','Freund hinzufügen')}</h2><div class="card patch dl-list" style="padding:2px 12px">${fr.length?fr.map(f=>`<div class="drow">${avatarSvg(f.avatar,32)}<span class="dm"><b>${esc(f.name)}</b></span><button class="btn sm" data-a="gpaddgo" data-id="${f.id}">${tx('Add','Hinzufügen')}</button></div>`).join(''):`<p class="sub">${tx('All your friends are in this group already.','Alle deine Freunde sind schon in dieser Gruppe.')}</p>`}</div>`);
}
function gpRenSheet(){
  sheet(`<h2>${tx('Rename group','Gruppe umbenennen')}</h2><input class="inp" id="gp-rn" maxlength="30" value="${esc(GP.g.name)}"><button class="btn" id="gp-rs" style="margin-top:12px">${tx('Save','Speichern')}</button>`,sh=>{
    sh.querySelector('#gp-rs').onclick=async()=>{try{const j=await api('PATCH','/v1/groups/'+GP.id,{name:sh.querySelector('#gp-rn').value.trim()});GP.g=j.group;closeSheet();gpDraw();soLoad(true)}catch(e){toast(e.message)}};
  });
}
function gpConfirm(title,body,yes,fn){
  sheet(`<h2>${esc(title)}</h2><p class="sub">${esc(body)}</p><div class="row2" style="margin-top:12px"><button class="btn c-berry" id="gp-y">${esc(yes)}</button><button class="btn ghost" data-a="close">${tx('Cancel','Abbrechen')}</button></div>`,sh=>{sh.querySelector('#gp-y').onclick=async()=>{closeSheet();try{await fn()}catch(e){toast(e.message)}}});
}

/* playing a group round: same screen idea as a duel, against the group's endpoints */
async function gpPlay(rid){
  const run=++DL.run;
  GP.play={rid,i:0,deck:null,locked:false,typed:[],used:[],goals:0,n:9};
  gpEl().innerHTML=`<div class="dl-body"><p class="sub" style="text-align:center;margin-top:40vh">${tx('Loading…','Lädt…')}</p></div>`;
  try{
    await api('POST',`/v1/groups/${GP.id}/games/${rid}/start`);
    const j=await api('GET',`/v1/groups/${GP.id}/games/${rid}`);if(run!==DL.run)return;
    const r=j.round;if(!r.deck){await gpReload();return}
    GP.play.deck=r.deck;GP.play.i=r.mine?r.mine.count:0;GP.play.goals=r.mine?r.mine.goals:0;
    gpQuestion(run);
  }catch(e){toast(e.message);await gpReload()}
}
function gpQuestion(run){
  const P=GP.play;if(!P||run!==DL.run)return;
  const it=P.deck[P.i];if(!it){gpDone();return}
  P.locked=false;P.typed=[];P.used=[];
  const body=it.t==='mc'?`<div class="opts ${it.o.length===3&&it.o.join()==='der,die,das'?'art3':''}">${it.o.map((o,k)=>`<button class="opt ${/^(der|die|das)$/.test(o)?o:''}" data-a="gpick" data-i="${k}"><span class="k">${k+1}</span><span>${esc(o)}</span></button>`).join('')}</div>`
    :`<div class="dl-build" id="dl-build"><em>${tx('Tap the letters','Tippe die Buchstaben')}</em></div><div class="dl-chars">${it.chars.map((c,k)=>`<button class="ch" data-a="gpchar" data-i="${k}">${esc(c)}</button>`).join('')}</div><div class="row2" style="margin-top:10px"><button class="btn sm ghost" data-a="gpback">⌫</button><button class="btn sm" data-a="gpsend">${tx('Check','Prüfen')}</button></div><div id="dl-ans" class="sub" style="text-align:center;margin-top:8px"></div>`;
  gpEl().innerHTML=`<div class="dl-top"><button class="tr-x" data-a="gpclose2" aria-label="Close">✕</button><div class="dl-t"><span>${esc(GP.g?GP.g.name:'')}</span><b>${tx('Goals','Tore')}: <span id="gp-g">${P.goals}</span></b></div></div>
  <div class="dl-body"><div class="dl-q">${P.i+1} / ${P.n}</div><div class="dl-tb"><i id="dl-tb"></i></div><p class="sub" style="text-align:center">${esc(it.hint||'')}</p><h2 class="q big" style="text-align:center">${esc(it.q)}</h2>${body}</div>`;
  const t0=Date.now(),lim=it.tm*1000;clearInterval(DL.timer);
  DL.timer=setInterval(()=>{if(run!==DL.run){clearInterval(DL.timer);return}const f=Math.max(0,1-(Date.now()-t0)/lim),b=$('#dl-tb');if(b)b.style.width=f*100+'%';if(f<=0){clearInterval(DL.timer);gpSend(null)}},100);
}
async function gpSend(v){
  const P=GP.play;if(!P||P.locked)return;P.locked=true;clearInterval(DL.timer);const run=DL.run,i=P.i,it=P.deck[i];
  let r;
  try{r=await api('POST',`/v1/groups/${GP.id}/games/${P.rid}/answer`,{i,v})}
  catch(e){if(run!==DL.run)return;toast(e.message);GP.play=null;await gpReload();return}
  if(run!==DL.run)return;
  P.goals=r.goals;const g=$('#gp-g');if(g)g.textContent=r.goals;
  if(it.t==='mc'){const k=it.o.indexOf(r.answer);document.querySelectorAll('#gp .opt').forEach((b,j)=>{if(j===k)b.classList.add('ok');else if(j===v&&!r.correct)b.classList.add('no')})}
  else{const a=$('#dl-ans');if(a)a.innerHTML=r.correct?`<b>✓ ${esc(r.answer)}</b>`:`<b style="color:var(--red)">✗ ${esc(r.answer)}</b>`}
  sfx(r.correct?'ok':'no');if(r.correct)vib(12);
  setTimeout(()=>{if(run!==DL.run)return;P.i++;if(P.i>=P.n){P.round=r.round;gpDone()}else gpQuestion(run)},900);
}
async function gpDone(){
  const P=GP.play;GP.play=null;clearInterval(DL.timer);
  addXP(10,0);save();
  await gpReload();soLoad(true);
  toast(tx('Round finished: ','Runde beendet: ')+(P?P.goals:'')+tx(' goals',' Tore'));
}

/* ---- alerts: while the app is open, show what is new (the Android app also shows them as phone notifications) ---- */
const ALERT_TXT={
  friend:a=>[tx('New friend','Neuer Freund'),tx(`${a.name} added you as a friend.`,`${a.name} hat dich als Freund hinzugefügt.`)],
  duel_invite:a=>[tx('Match request','Spielanfrage'),tx(`${a.name} challenges you: ${(GAMES[a.game]||{n:a.game}).n}.`,`${a.name} fordert dich heraus: ${(GAMES[a.game]||{n:a.game}).n}.`)],
  duel_result:a=>[tx('Full time','Abpfiff'),tx(`You vs ${a.name}: ${a.goals[0]}–${a.goals[1]}.`,`Du gegen ${a.name}: ${a.goals[0]}–${a.goals[1]}.`)],
  group_added:a=>[tx('Study group','Lerngruppe'),tx(`You were added to ${a.groupName}.`,`Du wurdest zu ${a.groupName} hinzugefügt.`)],
  group_round:a=>[tx('New round','Neue Runde'),tx(`${a.name} started a round in ${a.groupName}.`,`${a.name} hat in ${a.groupName} eine Runde gestartet.`)],
  group_result:a=>[tx('Round over','Runde beendet'),tx(`The results are in for ${a.groupName}.`,`Die Ergebnisse für ${a.groupName} sind da.`)],
  group_ping:a=>[tx('Nudge from '+a.name,'Anstupser von '+a.name),a.kind==='custom'?`${a.groupName}: ${a.text}`:a.kind==='round'?tx(`A round is waiting in ${a.groupName}.`,`In ${a.groupName} wartet eine Runde.`):a.kind==='streak'?tx(`Let's keep the ${a.groupName} streak alive today.`,`Halten wir heute die Serie von ${a.groupName} am Leben.`):tx(`${a.groupName}: time to practise!`,`${a.groupName}: Zeit zum Üben!`)]
};
let alBusy=false;
async function alPoll(){
  if(!soOK()||alBusy||document.hidden)return;
  alBusy=true;
  try{
    if(!S.alertsAt){S.alertsAt=Date.now();save()}
    const j=await api('GET','/v1/alerts?since='+Math.floor(S.alertsAt));
    let fresh=0;
    for(const a of (j.alerts||[]).slice().reverse()){
      const f=ALERT_TXT[a.type];if(!f)continue;const [t,b]=f(a);
      if(addNotice({id:'al:'+a.id+':'+a.ts,kind:'news',title:t,body:b,t:a.ts})){fresh++;if(fresh<=2)toast(t+': '+b)}
    }
    S.alertsAt=j.now||Date.now();save();
    if(fresh){if(tab==='friends')soLoad(true);if(tab==='home'||tab==='inbox')render()}
  }catch(e){}
  alBusy=false;
}
setInterval(alPoll,30000);setTimeout(alPoll,4000);

/* ---- phone notifications (Android): the app shell polls the same feed in the background ---- */
const noteOn=()=>S.settings.notify!==false;
const noteStreakOn=()=>S.settings.notifyStreak!==false;
function pushNotifyState(){
  try{
    if(!NATIVE||!NATIVE.setNotify)return;
    const c=S.sync||{},st=S.stats;
    if(noteOn()&&c.code&&!S.settings.noteAsked){S.settings.noteAsked=1;save();noteAsk()}
    NATIVE.setNotify(JSON.stringify({on:noteOn(),streakOn:noteStreakOn(),url:c.url||'',code:c.code||'',de:isDe(),streak:st.streak||0,last:st.last||'',freezes:st.freezes||0}));
  }catch(e){}
}
function noteAsk(){try{if(NATIVE&&NATIVE.askNotifyPermission)NATIVE.askNotifyPermission()}catch(e){}}
setInterval(pushNotifyState,60000);setTimeout(pushNotifyState,3000);
document.addEventListener('visibilitychange',()=>{if(document.hidden)pushNotifyState()});

/* manual nudge: preset messages (or one short custom line) sent to the other members of the group */
const NUDGES=()=>[['practise',tx('Time to practise!','Zeit zum Üben!'),tx('A friendly reminder','Eine freundliche Erinnerung')],['round',tx('A round is waiting','Eine Runde wartet'),tx('Play the open round','Spielt die offene Runde')],['streak',tx('Save our group streak','Rettet unsere Gruppenserie'),tx('Everyone needs to practise today','Alle müssen heute üben')]];
function gpNudgeSheet(){
  sheet(`<h2>${tx('Nudge the group','Gruppe anstupsen')}</h2><p class="sub">${tx('The other members get a notification. You can nudge a group once every 10 minutes, 5 times a day.','Die anderen Mitglieder bekommen eine Benachrichtigung. Du kannst eine Gruppe alle 10 Minuten anstupsen, höchstens 5 Mal am Tag.')}</p>
  <div class="nd-list">${NUDGES().map(n=>`<button class="nd-b" data-a="gpnudgego" data-kind="${n[0]}"><b>${n[1]}</b><span>${n[2]}</span></button>`).join('')}</div>
  <label class="sub" for="nd-t" style="display:block;margin:14px 0 4px">${tx('Or write a short message (optional)','Oder schreibe eine kurze Nachricht (optional)')}</label>
  <div class="nd-own"><input class="inp" id="nd-t" maxlength="60" placeholder="${tx('e.g. Quiz at 8?','z. B. Quiz um 8?')}" autocomplete="off"><button class="btn sm" data-a="gpnudgego" data-kind="custom">${tx('Send','Senden')}</button></div>
  <p class="sub" id="nd-e" style="min-height:18px;margin-top:8px;font-size:13px"></p>`);
}
async function gpNudgeGo(t){
  const kind=t.dataset.kind,e=$('#nd-e'),body={kind};
  if(kind==='custom'){body.text=($('#nd-t')||{}).value||'';if(!body.text.trim()){if(e)e.textContent=tx('Write a message first.','Schreibe zuerst eine Nachricht.');return}}
  document.querySelectorAll('.nd-b,.nd-own .btn').forEach(b=>b.disabled=true);
  try{const j=await api('POST',`/v1/groups/${GP.id}/ping`,body);closeSheet();b3Banner('🔔',tx('Nudge sent','Anstupser gesendet'),tx(`${j.sent} member(s) notified`,`${j.sent} Mitglied(er) benachrichtigt`));sfx('ok',1)}
  catch(er){document.querySelectorAll('.nd-b,.nd-own .btn').forEach(b=>b.disabled=false);if(e){e.style.color='var(--badtxt)';e.textContent=er.message}}
}
const SOCIAL25_ACTIONS={
  gpnudge:gpNudgeSheet,gpnudgego:gpNudgeGo,
  frtab:t=>{FR.tab=t.dataset.k;render()},
  gpnew:gpNewSheet,
  gpopen:t=>gpOpen(+t.dataset.id),
  gpclose:gpClose,
  gpclose2:()=>{DL.run++;clearInterval(DL.timer);GP.play=null;gpReload()},
  gpround:gpRoundSheet,
  gpg:t=>{CH.g=t.dataset.g;gpRoundSheet()},
  gpgo:async()=>{const deck=buildDeck(CH.g);if(!deck){toast(duelReq(CH.g));return}
    try{const j=await api('POST',`/v1/groups/${GP.id}/games`,{game:CH.g,deck});closeSheet();await gpReload();gpPlay(j.round.id)}catch(e){toast(e.message)}},
  gpplay:t=>gpPlay(+t.dataset.id),
  gpadd:gpAddSheet,
  gpaddgo:async t=>{try{const j=await api('POST',`/v1/groups/${GP.id}/members`,{user:+t.dataset.id});GP.g=j.group;closeSheet();gpDraw();soLoad(true)}catch(e){toast(e.message)}},
  gpren:gpRenSheet,
  gpleave:()=>gpConfirm(tx('Leave this group?','Gruppe verlassen?'),tx('You will not see the group any more. A member can add you again.','Du siehst die Gruppe nicht mehr. Ein Mitglied kann dich wieder hinzufügen.'),tx('Leave','Verlassen'),async()=>{await api('DELETE',`/v1/groups/${GP.id}/members/${SO.meId}`);gpClose()}),
  gpdel:()=>gpConfirm(tx('Delete this group?','Gruppe löschen?'),tx('The table and all rounds are deleted for everybody.','Tabelle und alle Runden werden für alle gelöscht.'),tx('Delete','Löschen'),async()=>{await api('DELETE','/v1/groups/'+GP.id);gpClose()}),
  gpick:t=>{const P=GP.play;if(!P||P.locked)return;document.querySelectorAll('#gp .opt').forEach(b=>b.classList.remove('sel'));t.classList.add('sel');gpSend(+t.dataset.i)},
  gpchar:t=>{const P=GP.play;if(!P||P.locked||t.disabled)return;const i=+t.dataset.i;t.disabled=true;P.used.push(i);P.typed.push(P.deck[P.i].chars[i]);const b=$('#dl-build');if(b)b.textContent=P.typed.join('')},
  gpback:()=>{const P=GP.play;if(!P||P.locked||!P.used.length)return;const i=P.used.pop();P.typed.pop();const b=document.querySelector(`#gp .ch[data-i="${i}"]`);if(b)b.disabled=false;const e=$('#dl-build');if(e)e.textContent=P.typed.join('')||''},
  gpsend:()=>{const P=GP.play;if(P&&P.typed.length)gpSend(P.typed.join(''))},
  notify:t=>{S.settings.notify=t.dataset.v==='1';save();if(S.settings.notify)noteAsk();pushNotifyState();render()},
  notifystreak:t=>{S.settings.notifyStreak=t.dataset.v==='1';save();pushNotifyState();render()}
};
function notifyCard(){
  return `<div class="set"><span>${tx('Phone notifications','Handy-Benachrichtigungen')}<div class="sub" style="font-size:12px;font-weight:500">${tx('Friend requests, match requests, study groups, updates','Freundschaftsanfragen, Spielanfragen, Lerngruppen, Updates')}</div></span><div class="seg"><button class="${noteOn()?'on':''}" data-a="notify" data-v="1">${tx('On','An')}</button><button class="${noteOn()?'':'on'}" data-a="notify" data-v="0">${tx('Off','Aus')}</button></div></div>
  <div class="set"><span>${tx('Streak reminder','Serien-Erinnerung')}<div class="sub" style="font-size:12px;font-weight:500">${tx('An evening alert when your streak is about to end','Abends eine Erinnerung, wenn deine Serie endet')}</div></span><div class="seg"><button class="${noteStreakOn()?'on':''}" data-a="notifystreak" data-v="1">${tx('On','An')}</button><button class="${noteStreakOn()?'':'on'}" data-a="notifystreak" data-v="0">${tx('Off','Aus')}</button></div></div>`;
}

/* the league table (server): everybody is in it, your club colours your row */
function leagueHtml(){
  const my={name:myName(),avatar:myAvatar(),points:LG.range==='week'?pointsSince(7):LG.range==='month'?pointsSince(30):S.stats.xp,streak:curStreak(),isMe:true};
  const online=LG.rows&&LG.rows.length,rows=online?LG.rows:[my];
  const body=rows.map((r,i)=>{const av=r.isMe?myAvatar():r.avatar,c=clubCol(av);return `<tr class="${r.isMe?'me':''}"><td class="n"><i class="stripe" style="background:${c}"></i>${i+1}</td><td class="tm"><div class="tmi">${badgeSvg(av,22)}<span>${esc(r.isMe?myName():r.name)}</span></div></td><td class="pts">${r.points}</td><td>${r.streak||0}</td></tr>`}).join('');
  return `<div class="seg" style="margin-bottom:10px">${[['week','Woche'],['month','Monat'],['all','Gesamt']].map(([k,n])=>`<button class="${LG.range===k?'on':''}" data-a="lrange" data-k="${k}">${n}</button>`).join('')}</div>
  <div class="card patch" style="padding:8px 10px 14px 14px"><table class="tbl bl"><thead><tr><th class="n">#</th><th>${tx('Player','Spieler')}</th><th class="pts">${tx('Pts','Pkt')}</th><th>${tx('Streak','Serie')}</th></tr></thead><tbody>${body}</tbody></table>
  <p class="sub" style="font-size:13px;margin-top:8px">${online?tx('Live standings. Everyone with an account is in the table.','Live-Tabelle. Alle mit einem Konto sind dabei.'):(S.sync&&S.sync.url?(LG.err?esc(LG.err):tx('Loading standings…','Tabelle lädt…')):tx('Connect your server in Settings to compete with friends.','Verbinde deinen Server in den Einstellungen, um mit Freunden zu spielen.'))}</p></div>`;
}
