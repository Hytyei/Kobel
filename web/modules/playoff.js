/* ═════════ Streak Play-Off: one very hard question that saves a streak in danger ═════════
   Danger = a streak of 2+ days that ends at midnight (evening, nothing practised today) or that already missed
   yesterday with no joker left. A win keeps the streak, a loss costs it. One attempt per day, no options, no hints. */
const PO={q:null,t0:0,timer:0,done:false};
const PO_HOUR=17;
function streakRisk(){
  const st=S.stats,t=dkey();
  if(!st.last||(st.streak||0)<2)return null;
  if(st.po&&st.po.day===t)return null;                       // already tried today
  const g=dayDiff(st.last,t),hr=new Date().getHours();
  if(g===1&&hr>=PO_HOUR)return{kind:'danger',streak:st.streak,left:new Date(new Date().setHours(24,0,0,0))-Date.now()};
  if(g===2&&!(st.freezes>0)&&!(st.saveTok&&st.saveTok.day===t))return{kind:'last',streak:st.streak,left:new Date(new Date().setHours(24,0,0,0))-Date.now()};
  return null;
}
const fmtLeft=ms=>{const m=Math.max(0,Math.floor(ms/6e4));return Math.floor(m/60)+'h '+String(m%60).padStart(2,'0')+'m'};
function streakAlertHtml(){
  const r=streakRisk();if(!r||!poBuild(true))return '';
  const last=r.kind==='last';
  return `<div class="b3-alert"><span class="fl">${FLAME(34)}</span><div style="flex:1;min-width:0"><b>${last?tx('Streak on the edge','Serie am Abgrund'):tx('Streak in danger','Serie in Gefahr')} · ${r.streak}</b><small>${last?tx('You missed a day. Win the Play-Off or lose it.','Du hast einen Tag verpasst. Gewinne das Play-Off oder verliere sie.'):tx('Ends in','Endet in')+' '+fmtLeft(r.left)+'. '+tx('Practise, or take the Play-Off.','Übe, oder spiele das Play-Off.')}</small></div><button class="b3-wb" data-a="poopen" style="flex:none"><span>Play-Off</span></button></div>`;
}
/* ---- build the question: always built from tiles, never multiple choice. The trap tiles are near misses of the real
   answer (the other article or case, the other verb ending, the umlaut or not, another plural ending), so a learner has
   to know the form: random extra words or letters that are not in the answer at all gave it away at a glance. ---- */
const poScore=c=>((c.bad||0)+(c.srs?c.srs.lapses:0)*2+1)/((c.ok||0)+1)+Math.random()*.8;
const PO_SETS=[['der','die','das','den','dem','des'],['ein','eine','einen','einem','einer'],['kein','keine','keinen','keinem'],['mein','meine','meinen','meinem'],['dein','deine','deinen','deinem'],
  ['ich','du','er','sie','es','wir','ihr'],['mich','dich','mir','dir','ihn','ihm'],['bin','bist','ist','sind','seid'],['habe','hast','hat','haben','habt'],['kann','kannst','können','könnt'],
  ['mag','magst','mögen','mögt'],['möchte','möchtest','möchten'],['in','im','ins','am','an','um'],['aus','bei','von','zu','nach']];
const PO_UML={a:'ä',o:'ö',u:'ü',ä:'a',ö:'o',ü:'u'};
const poCase=(like,w)=>like[0]&&like[0]!==like[0].toLowerCase()?w[0].toUpperCase()+w.slice(1):w;
/** near misses of one word, written the same way (capital stays capital) */
function poTwins(w,uml){
  const lc=w.toLowerCase(),set=PO_SETS.find(x=>x.includes(lc));
  if(set)return set.filter(x=>x!==lc).map(x=>poCase(w,x));
  const out=[];
  const m=/^([a-zäöüß]{3,}?)(en|st|e|t)$/.exec(w);              // a lower-case verb: swap its ending
  if(m)['e','st','t','en'].forEach(e=>{if(e!==m[2])out.push(m[1]+e)});
  const v=uml&&/[aouäöü]/i.exec(w);if(v){const k=v.index,ch=w[k],to=PO_UML[ch.toLowerCase()];if(to)out.push(w.slice(0,k)+(ch===ch.toLowerCase()?to:to.toUpperCase())+w.slice(k+1))}
  return out.filter(x=>x!==w);
}
const poBare=w=>w.replace(/[.,!?;:]+$/,'');
function poSentenceTraps(W,known){
  const have=new Set(W),traps=[];
  shuffle(W.map((w,i)=>i)).forEach(i=>{
    if(traps.length>=3)return;
    const w=W[i],b=poBare(w),tail=w.slice(b.length);if(b.length<2)return;
    const alt=shuffle(poTwins(b)).map(x=>x+tail).find(x=>!have.has(x)&&!traps.includes(x));
    if(alt)traps.push(alt);
  });
  if(traps.length<3){   // too few near misses: fill with words from your other sentences
    const more=shuffle(known.map(sentenceOf).filter(Boolean).flatMap(x=>x.de.split(/\s+/)).filter(w=>w.length>=3&&!have.has(w)&&!/[.!?]$/.test(w)));
    for(const w of more){if(traps.length>=3)break;if(!traps.includes(w))traps.push(w)}
  }
  return traps;
}
/** letters for a spelled word: the umlaut or not, and endings a plural or a verb could have */
function poLetterTraps(word,k){
  const out=[],v=/[aouäöü]/i.exec(word);
  if(v){const to=PO_UML[v[0].toLowerCase()];if(to)out.push(to)}
  shuffle(['e','n','r','s','t','e','n']).forEach(ch=>{if(out.length<k)out.push(ch)});
  return out.slice(0,k);
}
let PO_PEEK={at:0,v:null};
function poBuild(peek){
  /* the home screen asks "is there a Play-Off?" on every redraw: remember the answer for a minute */
  if(peek&&Date.now()-PO_PEEK.at<6e4&&PO_PEEK.n===S.cards.length)return PO_PEEK.v;
  const known=S.cards.filter(c=>!c.susp&&c.srs&&c.srs.seen>0);
  const pools={sent:[],noun:[],gap:[]};
  known.forEach(c=>{
    if(isG(c)){const z=gz(c);if(z&&z.ans&&c.en)pools.gap.push(c);return}
    const s=sentenceOf(c);if(s){const n=s.de.split(/\s+/).length;if(n>=5&&n<=12&&s.en&&!/\s\/\s|[()]/.test(s.de+s.en))pools.sent.push(c)}
    if(c.art&&c.pl&&pluralOf(c))pools.noun.push(c);
  });
  const avail=Object.keys(pools).filter(k=>pools[k].length);
  if(peek){PO_PEEK={at:Date.now(),n:S.cards.length,v:avail.length?true:null};return PO_PEEK.v}
  if(!avail.length)return null;
  const wt={sent:.45,noun:.3,gap:.25},sum=avail.reduce((a,k)=>a+wt[k],0);let r=Math.random()*sum,type=avail[0];
  for(const k of avail){r-=wt[k];if(r<=0){type=k;break}}
  const top=pools[type].sort((a,b)=>poScore(b)-poScore(a)).slice(0,8),c=top[rnd(top.length)];
  if(type==='sent'){
    const s=sentenceOf(c),W=s.de.split(/\s+/);
    return{type,id:c.id,limit:100,label:tx('Build the sentence in German','Baue den Satz auf Deutsch'),prompt:s.en,answer:s.de,board:{units:shuffle(W.concat(poSentenceTraps(W,known))),sol:W,word:true},hint:tx('Tap the words in the right order. Three tiles are near misses: a wrong ending, article or form.','Tippe die Wörter in der richtigen Reihenfolge. Drei Kacheln sind knapp daneben: falsche Endung, falscher Artikel oder falsche Form.')}}
  if(type==='noun'){const pl=pluralOf(c),U=[...pl];
    return{type,id:c.id,limit:45,label:tx('Article and plural','Artikel und Plural'),prompt:c.en,answer:`${c.art} ${c.de}, die ${pl}`,art:c.art,board:{units:shuffle(U.concat(poLetterTraps(pl,3))),sol:U},hint:tx('Pick the article of the singular noun, then spell the plural. Three letters are traps: an umlaut or an ending that is not there.','Wähle den Artikel des Singulars und buchstabiere dann den Plural. Drei Buchstaben sind Fallen: ein Umlaut oder eine Endung, die nicht dazugehört.')}}
  const z=gz(c),ans=z.ans.trim(),one=!/\s/.test(ans),twins=one?poTwins(ans,true).filter(x=>x!==ans):[];
  let board;
  if(one&&twins.length>=3)board={units:shuffle([ans,...shuffle(twins).slice(0,3)]),sol:[ans],word:true};   // der / den / dem ...: pick the one form that fits
  else if(one)board={units:shuffle([...ans].concat(poLetterTraps(ans,3))),sol:[...ans]};
  else{const U=ans.split(/\s+/);board={units:shuffle(U.concat(poSentenceTraps(U,known).slice(0,2))),sol:U,word:true}}
  return{type:'gap',id:c.id,limit:35,label:tx('Fill the gap, hard mode','Lücke füllen, schwer'),prompt:`${z.pre}____${z.post}`,en:c.en,answer:ans,board,hint:board.sol.length===1&&board.word?tx('Only one of these forms fits the sentence.','Nur eine dieser Formen passt in den Satz.'):tx('Spell the missing word. Three tiles are traps.','Buchstabiere das fehlende Wort. Drei Kacheln sind Fallen.')}
}
const poN=x=>norm(String(x).replace(/(\w)['’]s\b/g,'$1 es'));
function poCheck(q,got,art){
  const ok=got.length===q.board.sol.length&&got.every((x,i)=>x===q.board.sol[i]);
  return q.type==='noun'?ok&&art===q.art:ok;
}
/* ---- UI ---- */
function poClose(){clearInterval(PO.timer);const e=$('#po');if(e)e.remove();PO.q=null}
function poOpen(){
  const r=streakRisk();if(!r)return;
  if(!poBuild(true)){toast(tx('Learn a few words first, then the Play-Off can use them.','Lerne erst ein paar Wörter, dann kann das Play-Off sie nutzen.'));return}
  closeSheet();poClose();
  const last=r.kind==='last',el=document.createElement('div');el.id='po';el.className='po';
  el.innerHTML=`<div class="po-top"><button class="x" data-a="poquit" aria-label="Close">✕</button><div style="flex:1;font:800 15px var(--fd);letter-spacing:.14em;text-transform:uppercase">${last?tx('Relegation play-off','Relegations-Play-off'):tx('Streak play-off','Serien-Play-off')}</div></div>
  <div class="po-main"><span class="po-tag">${r.streak} ${tx('day streak at stake','Tage Serie auf dem Spiel')}</span>
  <div class="po-big">${tx('One question.<br>One chance.','Eine Frage.<br>Eine Chance.')}</div>
  <div class="po-rule"><b>${tx('Hard','Schwer')}</b><span>${tx('Taken from the words and sentences you miss most. Build the answer from tiles, and some tiles are traps.','Aus den Wörtern und Sätzen, bei denen du die meisten Fehler machst. Baue die Antwort aus Kacheln, manche sind Fallen.')}</span><b>${tx('No help','Keine Hilfe')}</b><span>${tx('No options, no hints, no hear-it button, a running clock.','Keine Auswahl, keine Tipps, kein Vorlesen, eine laufende Uhr.')}</span><b>${tx('Win','Sieg')}</b><span>${last?tx('Your streak is kept and continues today.','Deine Serie bleibt erhalten und läuft heute weiter.'):tx('Today counts as practised. The streak lives.','Heute zählt als geübt. Die Serie lebt.')}</span><b>${tx('Lose','Niederlage')}</b><span>${tx('The streak goes. No second try today.','Die Serie ist weg. Heute kein zweiter Versuch.')}</span></div></div>
  <div class="po-foot"><button class="btn" id="po-go" style="background:var(--red)">${tx('Take the Play-Off','Play-Off spielen')} →</button><button class="btn ghost" data-a="poquit" style="margin-top:10px">${tx('Not now, I will practise','Nicht jetzt, ich übe')}</button></div>`;
  document.body.appendChild(el);
  $('#po-go').onclick=()=>poStart(r);
}
function poStart(r){
  const q=poBuild();if(!q){poClose();return}
  PO.q=q;PO.done=false;PO.risk=r;
  S.stats.po={day:dkey(),tried:true,won:false,id:q.id,type:q.type};save();   // opening it commits: no re-rolling an easier question
  const el=$('#po');
  const prompt=q.type==='gap'?`<div class="po-q">${esc(q.prompt).replace('____','<span style="border-bottom:4px solid var(--red);padding:0 24px"></span>')}</div><div class="po-en">${esc(q.en)}</div>`:`<div class="po-en" style="font-size:26px;margin-top:20px">${esc(q.prompt)}</div>`;
  el.innerHTML=`<div class="po-top"><button class="x" data-a="poforfeit" aria-label="Give up">✕</button><div class="po-clock"><i id="po-c"></i></div><div class="po-t" id="po-t">${q.limit}</div></div>
  <div class="po-main"><span class="po-tag">${tx('Play-off','Play-off')} · ${PO.risk.streak} ${tx('days','Tage')}</span><div class="po-hint" style="margin-top:14px">${esc(q.label)}</div>${prompt}
  ${q.type==='noun'?`<div class="po-art" id="poa">${['der','die','das'].map(x=>`<button type="button" data-a2="${x}">${x}</button>`).join('')}</div>`:''}
  <div class="po-slots" id="pos"></div><div class="po-bank" id="pob"></div><div class="po-act"><button type="button" id="por" class="uk">${tx('Reset','Neu')}</button></div>
  <div class="po-hint" style="margin-top:12px">${esc(q.hint)}</div></div>
  <div class="po-foot"><button class="btn" id="po-ok" style="background:#fff;color:#0B141B">${tx('Lock in answer','Antwort abgeben')}</button></div>`;
  PO.t0=Date.now();
  const tick=()=>{const left=Math.max(0,q.limit-(Date.now()-PO.t0)/1000);const c=$('#po-c'),t=$('#po-t');if(c)c.style.width=(left/q.limit*100)+'%';if(t)t.textContent=Math.ceil(left);if(left<=8&&c)c.style.background='#fff';if(left<=0){clearInterval(PO.timer);poResolve(false,'')}};
  clearInterval(PO.timer);PO.timer=setInterval(tick,250);
  const B=q.board,n=B.sol.length,T=B.units.map((u,i)=>({id:i,u,slot:-1})),slots=Array(n).fill(null);let art='';
  const draw=()=>{
    $('#pos').innerHTML=slots.map((id,k)=>`<div class="po-slot ${id!==null?'f':''} ${B.word?'w':''}" data-k="${k}">${id!==null?`<button type="button" class="po-t2" data-id="${id}">${esc(T[id].u)}</button>`:''}</div>`).join('');
    $('#pob').innerHTML=T.map(t=>`<div class="po-cell ${B.word?'w':''}">${t.slot<0?`<button type="button" class="po-t2" data-id="${t.id}">${esc(t.u)}</button>`:''}</div>`).join('');
    const full=slots.every(v=>v!==null)&&(q.type!=='noun'||art);const ok=$('#po-ok');ok.disabled=!full;ok.style.opacity=full?1:.45;
  };
  const tap=id=>{if(PO.done)return;const t=T[id];if(t.slot<0){const k=slots.indexOf(null);if(k<0)return;slots[k]=id;t.slot=k;sfx('slot',k)}else{slots[t.slot]=null;t.slot=-1;sfx('back')}vib(6);draw()};
  el.addEventListener('click',e=>{const b=e.target.closest('.po-t2');if(b){tap(+b.dataset.id);return}const a=e.target.closest('[data-a2]');if(a){art=a.dataset.a2;el.querySelectorAll('[data-a2]').forEach(x=>x.classList.toggle('on',x===a));sfx('tick');draw()}});
  $('#por').onclick=()=>{if(PO.done)return;slots.fill(null);T.forEach(t=>t.slot=-1);draw()};
  $('#po-ok').onclick=()=>{
    if(slots.some(v=>v===null))return;
    const got=slots.map(id=>T[id].u),ok=poCheck(q,got,art);
    poResolve(ok,(q.type==='noun'?art+' ':'')+(B.word?got.join(' '):got.join('')));
  };
  draw();
}
function poResolve(ok,raw){
  if(PO.done)return;PO.done=true;clearInterval(PO.timer);
  const q=PO.q,el=$('#po'),r=PO.risk;
  S.stats.po={day:dkey(),tried:true,won:!!ok};
  if(ok){S.stats.poWins=(S.stats.poWins||0)+1}
  else{S.stats.streak=0;S.stats.last=null}
  save();sfx(ok?'win':'lose');vib(ok?[30,40,30,40,90]:[200]);
  el.innerHTML=`<div class="po-top"><div style="flex:1;font:800 15px var(--fd);letter-spacing:.14em;text-transform:uppercase">${tx('Play-off','Play-off')}</div></div>
  <div class="po-main"><span class="po-tag" style="background:${ok?'var(--green)':'var(--red)'}">${ok?tx('Full time · won','Abpfiff · gewonnen'):tx('Full time · lost','Abpfiff · verloren')}</span>
  <div class="po-big">${ok?tx('Streak<br>saved.','Serie<br>gerettet.'):tx('Streak<br>gone.','Serie<br>weg.')}</div>
  <div class="po-ans ${ok?'ok':'no'}"><small>${tx('Correct answer','Richtige Antwort')}</small>${esc(q.answer)}</div>
  ${raw&&!ok?`<div class="po-ans"><small>${tx('Your answer','Deine Antwort')}</small>${esc(raw)}</div>`:''}
  ${!raw&&!ok?`<div class="po-hint" style="margin-top:12px">${tx('Time ran out.','Die Zeit ist abgelaufen.')}</div>`:''}
  <div class="po-hint" style="margin-top:16px">${ok?tx('You can practise as usual now.','Du kannst jetzt wie gewohnt weiterüben.'):tx('Practise today to start a new streak.','Übe heute, um eine neue Serie zu starten.')}</div></div>
  <div class="po-foot"><button class="btn" id="po-fin" style="background:${ok?'var(--green)':'#fff'};color:${ok?'#fff':'#0B141B'}">${ok?tx('Claim the streak','Serie sichern'):tx('Back to the table','Zurück zur Tabelle')}</button></div>`;
  $('#po-fin').onclick=()=>{
    if(ok){
      const t=dkey();if(r.kind==='last')S.stats.saveTok={day:t};
      window.__poWin=true;addXP(10,0);window.__poWin=false;
      try{const got=checkBadges();save();pushWidgets&&pushWidgets()}catch(e){save()}
    }
    poClose();render();
  };
}
function poForfeit(){
  if(PO.done)return;
  sheet(`<h3>${tx('Give up the Play-Off?','Play-Off aufgeben?')}</h3><p class="sub">${tx('That counts as a loss. There is no second try today.','Das zählt als Niederlage. Heute gibt es keinen zweiten Versuch.')}</p><div class="row2" style="margin-top:14px"><button class="btn c-fern" id="pf-stay">${tx('Keep playing','Weiterspielen')}</button><button class="btn c-berry" id="pf-no">${tx('Give up','Aufgeben')}</button></div>`,sh=>{
    $('#pf-stay',sh).onclick=closeSheet;$('#pf-no',sh).onclick=()=>{closeSheet();poResolve(false,'')};
  });
}
/* ask once per few hours when the app opens */
function poAsk(){
  try{
    const r=streakRisk();if(!r||!poBuild(true))return;
    if(ses||$('#po')||$('#cel')||$('#sheet')){clearTimeout(PO.ask);PO.ask=setTimeout(poAsk,5000);return}   // busy: ask again shortly, not hours later
    const st=S.stats,key=r.kind+':'+dkey();if(st.poAsk&&Date.now()-st.poAsk<3*36e5&&st.poAskKey===key)return;
    st.poAsk=Date.now();st.poAskKey=key;save();
    const last=r.kind==='last';
    sheet(`<div class="kick">${last?tx('Streak on the edge','Serie am Abgrund'):tx('Streak in danger','Serie in Gefahr')}</div><h3 style="font-size:38px;margin:6px 0 8px">${r.streak} ${tx('days','Tage')}</h3>
    <p class="sub">${last?tx('You missed yesterday. Win the Play-Off to keep your streak, or practise and start again.','Du hast gestern verpasst. Gewinne das Play-Off, um deine Serie zu behalten, oder übe und beginne neu.'):tx('Your streak ends in '+fmtLeft(r.left)+'. Practise now, or answer one very hard question.','Deine Serie endet in '+fmtLeft(r.left)+'. Übe jetzt oder beantworte eine sehr schwere Frage.')}</p>
    <div style="display:flex;flex-direction:column;gap:10px;margin-top:18px"><button class="btn" style="background:var(--red)" data-a="poopen">${tx('Play-Off · one hard question','Play-Off · eine schwere Frage')}</button>${last?'':`<button class="btn" style="background:#fff;color:#0B141B" data-a="pathgo" id="po-pr">${tx('Practise now','Jetzt üben')}</button>`}<button class="btn ghost" id="po-later">${tx('Later','Später')}</button></div>`,sh=>{$('#po-later',sh).onclick=closeSheet});
  }catch(e){}
}
const PO_ACTIONS={poopen:()=>poOpen(),poquit:()=>poClose(),poforfeit:()=>poForfeit()};
BADGES.push({id:'po1',e:'PO',n:'Relegations-Retter',t:()=>(S.stats.poWins||0)>=1});
