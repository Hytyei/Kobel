/* ───────── Lernpfad: a guided path from the first easy level to the hardest ─────────
   Every lesson of your notes becomes a unit. Its words are cut into chapters of up to 8 words; every chapter has
   five levels that get harder: 1 meet the words, 2 recognise, 3 build (drag and drop, articles, plurals),
   4 sentences, 5 chapter final (typing, listening, no options). Grammar items get their own chapters.
   A level opens when the one before it is passed. Passing = 60% right (the chapter final needs 80%).
   Stars: 3 = no mistakes, 2 = 85% or better, 1 = passed. */
const PATH_LV=[
  {en:'Meet the words',de:'Wörter kennenlernen',ic:'1'},
  {en:'Recognise',de:'Erkennen',ic:'2'},
  {en:'Build',de:'Zusammenbauen',ic:'3'},
  {en:'Sentences',de:'Satzbau',ic:'4'},
  {en:'Chapter final',de:'Kapitelfinale',ic:'★'}
];
const PATH_CH=8;
const PATH_SKIP=new Set(['Classroom & instructions']);
const pathUi={open:{}};
function pst(){const st=S.stats;if(!st.path||typeof st.path!=='object')st.path={};const p=st.path;if(!p.done||typeof p.done!=='object')p.done={};return p}
function pathNodes(){
  /* units follow the order of the class notes (the built-in batches first, then anything you import); classroom
     instructions are for the daily challenge and training only, so they are not part of the path */
  const ord={};let k=0;
  BATCHES.forEach(bt=>String(bt).split(/\r?\n/).forEach(l=>{const m=l.match(/^@subject\s+(.+)$/i);if(m&&!(m[1].trim() in ord))ord[m[1].trim()]=k++}));
  const first={};S.cards.forEach((c,i)=>{if(!(c.lesson in first))first[c.lesson]=i});
  const rank=n=>n in ord?ord[n]:1e4+(first[n]??1e6);
  const ls=lessonList().filter(l=>!l.off&&!PATH_SKIP.has(l.name)&&(l.w||l.g)).sort((a,b)=>rank(a.name)-rank(b.name)||a.name.localeCompare(b.name,undefined,{numeric:true}));
  const nodes=[],units=[];
  ls.forEach((l,ui)=>{
    const ws=WALL().filter(c=>c.lesson===l.name&&act(c)),gs=GALL().filter(c=>c.lesson===l.name&&act(c));
    const chs=[];
    for(let i=0;i<ws.length;i+=PATH_CH)chs.push(ws.slice(i,i+PATH_CH).map(c=>c.id));
    if(chs.length>1&&chs[chs.length-1].length<3){const t=chs.pop();chs[chs.length-1].push(...t)}
    const u={name:l.name,ui,chs:[],from:nodes.length};
    chs.forEach((ids,ci)=>{
      const ch={ci,ids,from:nodes.length};
      PATH_LV.forEach((lv,k)=>nodes.push({key:l.name+'#'+ci+'#'+(k+1),unit:ui,ch:ci,lv:k+1,kind:'w',ids,i:nodes.length}));
      ch.to=nodes.length-1;u.chs.push(ch);
    });
    for(let i=0;i<gs.length;i+=PATH_CH){
      const ci=u.chs.length,ch={ci,g:true,from:nodes.length};
      nodes.push({key:l.name+'#g'+(i/PATH_CH)+'#1',unit:ui,ch:ci,lv:1,kind:'g',ids:gs.slice(i,i+PATH_CH).map(c=>c.id),i:nodes.length});
      ch.to=nodes.length-1;u.chs.push(ch);
    }
    u.to=nodes.length-1;if(u.chs.length)units.push(u);
  });
  return{nodes,units};
}
function pathState(){
  const P=pst(),{nodes,units}=pathNodes();
  let skipIdx=0;if(P.skipTo){const k=nodes.findIndex(n=>n.key===P.skipTo);if(k>0)skipIdx=k}
  const done=n=>(P.done[n.key]||0)>0||n.i<skipIdx;
  let cur=nodes.findIndex(n=>!done(n));
  return{P,nodes,units,done,cur,all:cur<0};
}
const pathStars=(P,n)=>P.done[n.key]||0;
function pathLabel(n){return n.kind==='g'?tx('Grammar','Grammatik'):tx(PATH_LV[n.lv-1].en,PATH_LV[n.lv-1].de)}

/* ---- what a level asks: items get harder from level 1 to 5 ---- */
const pathNoun=c=>!!c.art&&/^[A-ZÄÖÜ][^\s.…]*$/.test(c.de.replace(/^(der|die|das)\s+/i,'').split('/')[0].trim());
function pathBuild(n){
  const ws=n.ids.map(byId).filter(c=>c&&act(c));
  if(n.kind==='g')return shuffle(ws).map(c=>({cid:c.id,kind:'gcl'}));
  const items=[],spk=canSpeak(),enough=WALL().length>=4,L=n.lv;
  const A=(c,k)=>items.push({cid:c.id,kind:k});
  const nouns=ws.filter(pathNoun),pl=ws.filter(c=>pluralOf(c)),cl=ws.filter(c=>clozeOf(c)),sn=ws.filter(c=>sentenceOf(c)),sc=ws.filter(scrOK);
  if(L===1){
    const fresh=ws.filter(c=>!c.srs.seen);
    shuffle(fresh).forEach(c=>A(c,'intro'));
    const body=[];
    ws.forEach(c=>body.push({cid:c.id,kind:enough?'mc1':'tf'}));
    ws.forEach(c=>body.push({cid:c.id,kind:'tf'}));
    items.push(...pathSpread(body));
  }else if(L===2){
    const body=[];
    ws.forEach(c=>body.push({cid:c.id,kind:enough?'mc2':'tf'}));
    shuffle(ws).slice(0,5).forEach(c=>body.push({cid:c.id,kind:spk&&enough?'hear':'tf'}));
    shuffle(nouns).slice(0,4).forEach(c=>body.push({cid:c.id,kind:'art'}));
    items.push(...pathSpread(body));
  }else if(L===3){
    const body=[];
    if(ws.length>=4)body.push({kind:'dmatch',cids:shuffle(ws).slice(0,6).map(c=>c.id)});
    if(nouns.length>=3)body.push({kind:'sortart',cids:shuffle(nouns).slice(0,5).map(c=>c.id)});
    shuffle(pl).slice(0,3).forEach(c=>body.push({cid:c.id,kind:'plu'}));
    shuffle(cl).slice(0,3).forEach(c=>body.push({cid:c.id,kind:'cloze'}));
    shuffle(ws).slice(0,Math.max(3,8-body.length)).forEach(c=>body.push({cid:c.id,kind:enough?'mc2':'tf'}));
    items.push(...pathSpread(body));
  }else if(L===4){
    const body=[];
    shuffle(sn).slice(0,4).forEach(c=>body.push({cid:c.id,kind:'drag'}));
    shuffle(cl).slice(0,3).forEach(c=>body.push({cid:c.id,kind:'cloze'}));
    shuffle(sc).slice(0,3).forEach(c=>body.push({cid:c.id,kind:'scr'}));
    const have=new Set(body.map(b=>b.cid));
    shuffle(ws.filter(c=>!have.has(c.id))).slice(0,Math.max(3,8-body.length)).forEach(c=>body.push({cid:c.id,kind:'type'}));
    items.push(...pathSpread(body));
  }else{
    const body=[];
    ws.forEach(c=>body.push({cid:c.id,kind:'type'}));
    if(spk)shuffle(ws).slice(0,3).forEach(c=>body.push({cid:c.id,kind:'listen'}));
    shuffle(sn).slice(0,2).forEach(c=>body.push({cid:c.id,kind:'drag'}));
    shuffle(cl).slice(0,2).forEach(c=>body.push({cid:c.id,kind:'cloze'}));
    shuffle(nouns).slice(0,2).forEach(c=>body.push({cid:c.id,kind:'art'}));
    if(nouns.length>=3)body.push({kind:'sortart',cids:shuffle(nouns).slice(0,5).map(c=>c.id)});
    items.push(...pathSpread(body));
  }
  const intro=items.filter(i=>i.kind==='intro');
  return intro.concat(items.filter(i=>i.kind!=='intro').slice(0,L===5?20:16));
}
/* shuffle, but never the same word or the same exercise twice in a row if it can be avoided */
function pathSpread(a){
  const r=shuffle(a.slice());
  for(let i=1;i<r.length;i++){
    if(r[i].cid&&r[i].cid===r[i-1].cid||r[i].kind===r[i-1].kind&&r[i].kind!=='mc1'&&r[i].kind!=='mc2'){
      const j=r.findIndex((x,k)=>k>i&&x.cid!==r[i-1].cid&&x.kind!==r[i-1].kind);
      if(j>0){const t=r[i];r[i]=r[j];r[j]=t}
    }
  }
  return r;
}
function pathStart(i){
  const st=pathState(),n=st.nodes[i];if(!n)return;
  const items=pathBuild(n);
  if(items.length<3){toast(tx('Not enough material for this level','Zu wenig Material für diese Stufe'));return}
  closeSheet();
  ses={mode:'path',path:true,pathKey:n.key,pathIdx:i,pathLv:n.lv,pathKind:n.kind,lesson:'',opt:{},items,i:0,correct:0,wrong:0,xp:0,combo:0,maxCombo:0,graded:new Set(),t0:Date.now(),learned:0,locked:false,lastKind:'',startLvl:lvl(S.stats.xp)};
  openOverlay();next();
}
function finishPath(){
  const P=pst(),total=ses.correct+ses.wrong,acc=total?ses.correct/total:1,need=ses.pathLv===5&&ses.pathKind==='w'?.8:.6;
  const pass=acc>=need,stars=pass?(ses.wrong===0?3:acc>=.85?2:1):0;
  const old=P.done[ses.pathKey]||0,first=old===0&&pass;
  if(pass&&stars>old)P.done[ses.pathKey]=stars;
  const bonus=pass?(first?15+stars*5:5):0,fin=pass&&first&&ses.pathLv===5;
  ses.xp+=10+bonus+(fin?25:0);
  const before=lvl(S.stats.xp),res=addXP(ses.xp,total),st=S.stats;
  st.sessions++;if(pass&&ses.wrong===0&&ses.items.length>=6)st.perfect++;st.maxCombo=Math.max(st.maxCombo,ses.maxCombo);
  const h=new Date().getHours();if(h>=22||h<5)st.night=true;
  bump('ans',total);bump('combo',ses.maxCombo);if(ses.learned)bump('new',ses.learned);
  const got=checkBadges();save();pushWidgets();
  sfx(pass?'win':'bad');if(pass)confetti();vib(pass?[20,30,20,30,60]:[40,40]);
  const secs=Math.round((Date.now()-ses.t0)/1000),idx=ses.pathIdx,ps=pathState(),nx=ps.nodes[idx+1],cur=ps.nodes[idx];
  const newCh=pass&&first&&nx&&nx.unit===cur.unit&&nx.ch!==cur.ch,newUnit=pass&&first&&nx&&nx.unit!==cur.unit,end=pass&&first&&!nx;
  let extra='';
  if(pass&&first&&nx)extra+=noteCard('▶',newUnit?tx('New unit: '+ps.units[nx.unit].name,'Neue Einheit: '+ps.units[nx.unit].name):newCh?tx('Next chapter unlocked','Nächstes Kapitel freigeschaltet'):tx('Next level unlocked: ','Nächste Stufe frei: ')+pathLabel(nx));
  if(end)extra+=noteCard('🏆',tx('You finished the whole path. New lessons will extend it.','Du hast den ganzen Pfad geschafft. Neue Lektionen verlängern ihn.'));
  if(!pass)extra+=noteCard('↻',tx(`You need ${Math.round(need*100)}% to pass. The words you missed come back sooner.`,`Zum Bestehen brauchst du ${Math.round(need*100)}%. Verpasste Wörter kommen früher wieder.`));
  extra+=extrasFor(res,got,lvl(st.xp)>before);
  resultScreen({mood:pass?(stars>=2?'cheer':'happy'):'oops',title:pass?(stars===3?'Perfekt!':'Gut gemacht!'):'Noch nicht ganz',sub:`${esc(ses.pathKind==='g'?tx('Grammar','Grammatik'):tx(PATH_LV[ses.pathLv-1].en,PATH_LV[ses.pathLv-1].de))}`,stars:pass?stars:0,
    rows:[{v:0,id:'xpn',l:tx('points','Punkte'),c:'lantern'},{v:Math.round(acc*100)+'%',l:tx('accuracy','Genauigkeit'),c:'fern'},{v:Math.floor(secs/60)+':'+String(secs%60).padStart(2,'0'),l:tx('time','Zeit'),c:'sky'}],
    count:{id:'xpn',to:ses.xp},extra,againLabel:pass&&nx?tx('Next level','Nächste Stufe'):pass?tx('Back to the path','Zurück zum Pfad'):tx('Try again','Nochmal'),
    again:()=>{closeSes();if(pass&&nx)pathStart(idx+1);else if(pass){tab='path';render()}else pathStart(idx)}});
}

/* ---- the path screen ---- */
const PATH_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="18" r="2.4"/><circle cx="18" cy="6" r="2.4"/><path d="M8.2 17c4 0 3-5 7.6-5.6M10 6.5h3"/></svg>';
ICON.path=PATH_ICON;
function pathNodeHtml(st,n,pos){
  const P=st.P,s=pathStars(P,n),d=st.done(n),isCur=n.i===st.cur,locked=!d&&!isCur;
  const off=[0,-34,-48,-34,0,34,48,34][pos%8];
  const cls=d?'done':isCur?'cur':'lock';
  const lab=n.kind==='g'?'G':PATH_LV[n.lv-1].ic;
  return `<div class="pn-row" style="--off:${off}px"><button class="pn ${cls} ${n.lv===5&&n.kind==='w'?'fin':''}" data-a="pathnode" data-i="${n.i}" aria-label="${esc(pathLabel(n))}">${isCur?`<span class="pn-go">${tx('START','LOS')}</span>`:''}<span class="pn-i">${locked?'🔒':d&&n.lv!==5?'✓':lab}</span>${d?`<span class="pn-s">${'★'.repeat(s)}<span class="o">${'★'.repeat(Math.max(0,3-s))}</span></span>`:''}</button></div>`;
}
function vPath(){
  const st=pathState(),{units,nodes}=st;
  if(!nodes.length)return `<div class="top"><h1 class="h1">${tx('Path','Pfad')}</h1></div><div class="empty">${tx('No lessons yet. Open Kader and import your class notes, then your path appears here.','Noch keine Lektionen. Öffne den Kader und importiere deine Notizen, dann erscheint hier dein Pfad.')}</div>`;
  const total=nodes.length,dn=nodes.filter(n=>st.done(n)).length,curN=nodes[st.cur];
  const curUnit=curN?curN.unit:units.length-1;
  let h=`<div class="top"><h1 class="h1">${tx('Path','Pfad')}</h1><div class="chips"><div class="chip">${dn}/${total}</div></div></div>
  <p class="sub" style="margin-bottom:12px">${tx('Start easy, finish hard. Each level you pass opens the next one.','Leicht anfangen, schwer enden. Jede bestandene Stufe öffnet die nächste.')}</p>
  <div class="pbar"><i style="width:${Math.round(dn/total*100)}%"></i></div>`;
  if(curN)h+=`<button class="btn shine" style="margin:14px 0 4px" data-a="pathgo">${tx('Continue','Weiter')}: ${esc(units[curN.unit].name)} · ${esc(pathLabel(curN))}</button>`;
  units.forEach(u=>{
    const un=nodes.slice(u.from,u.to+1),ud=un.filter(n=>st.done(n)).length,complete=ud===un.length,isCur=u.ui===curUnit&&!st.all;
    const open=pathUi.open[u.name]!==undefined?pathUi.open[u.name]:isCur;
    const stars=un.reduce((a,n)=>a+pathStars(st.P,n),0);
    h+=`<button class="patch punit ${complete?'c-fern':isCur?'c-lantern':''}" data-a="pathunit" data-u="${esc(u.name)}"><div><div class="kick">${tx('Unit','Einheit')} ${u.ui+1}</div><div class="pu-n">${esc(u.name)}</div><div class="sub" style="font-size:14px">${ud}/${un.length} ${tx('levels','Stufen')}${stars?` · ${stars}★`:''}</div></div><span class="pu-c">${open?'⌃':'⌄'}</span></button>`;
    if(open){
      h+='<div class="ptrack">';
      u.chs.forEach(ch=>{
        const cn=nodes.slice(ch.from,ch.to+1);
        h+=`<div class="pch">${ch.g?tx('Grammar','Grammatik'):tx('Chapter','Kapitel')+' '+(ch.ci+1)}${ch.g?'':` · ${ch.ids.length} ${tx('words','Wörter')}`}</div>`;
        cn.forEach((n,k)=>h+=pathNodeHtml(st,n,k));
      });
      h+='</div>';
    }
  });
  return h;
}
function pathNodeSheet(i){
  const st=pathState(),n=st.nodes[i];if(!n)return;
  const d=st.done(n),isCur=i===st.cur,ws=n.ids.map(byId).filter(Boolean),u=st.units[n.unit];
  const names=ws.slice(0,12).map(c=>isG(c)?esc(plain(c.sentence).slice(0,40)):fmtDe(c)).join(' · ');
  const can=d||isCur;
  const body={1:tx('You meet the new words, then pick the meaning.','Du lernst die neuen Wörter kennen und wählst die Bedeutung.'),
    2:tx('Pick the right translation, listen, choose articles.','Übersetzung wählen, zuhören, Artikel wählen.'),
    3:tx('Drag pairs together, sort nouns into der, die, das, plurals and gaps.','Paare zusammenziehen, Nomen in der, die, das sortieren, Plural und Lücken.'),
    4:tx('Drag word blocks into sentences, fill gaps, unscramble words.','Wortblöcke zu Sätzen ziehen, Lücken füllen, Wörter ordnen.'),
    5:tx('No options: type the words, listen and write, build sentences. Needs 80%.','Keine Auswahl: Wörter tippen, hören und schreiben, Sätze bauen. Mindestens 80%.')}[n.lv];
  sheet(`<div class="kick">${esc(u.name)} · ${n.kind==='g'?tx('Grammar','Grammatik'):tx('Chapter','Kapitel')+' '+(n.ch+1)}</div><h3 style="font-size:30px">${esc(pathLabel(n))}</h3>
  <p class="sub" style="margin-top:6px">${n.kind==='g'?tx('Fill the gaps from your grammar notes.','Fülle die Lücken aus deinen Grammatiknotizen.'):body}</p>
  <div class="sub" style="margin:12px 0;font-size:14px">${names}</div>
  ${d?`<div class="bigstars" style="font-size:28px;margin:0 0 8px">${'★'.repeat(pathStars(st.P,n)||1)}</div>`:''}
  <div style="display:flex;flex-direction:column;gap:10px;margin-top:8px">
  ${can?`<button class="btn" data-a="pathrun" data-i="${i}">${d?tx('Play again','Nochmal spielen'):tx('Start','Starten')}</button>`:
    `<div class="sub" style="font-size:14px">${tx('Pass the levels before this one to open it.','Bestehe zuerst die Stufen davor.')}</div><button class="btn ghost" data-a="pathskip" data-i="${i}">${tx('I know this already: jump here','Kann ich schon: hierher springen')}</button>`}
  </div>`);
}
const PATH_ACTIONS={
  pathnode:t=>pathNodeSheet(+t.dataset.i),
  pathrun:t=>pathStart(+t.dataset.i),
  pathgo:()=>{const st=pathState();if(st.cur<0){toast(tx('Path complete. Add lessons to extend it.','Pfad geschafft. Neue Lektionen verlängern ihn.'));return}pathStart(st.cur)},
  pathunit:t=>{const st=pathState(),u=st.units.find(x=>x.name===t.dataset.u);if(!u)return;
    const cn=st.nodes[st.cur],isCur=cn&&cn.unit===u.ui&&!st.all,o=pathUi.open[u.name];pathUi.open[u.name]=!(o!==undefined?o:isCur);render()},
  pathskip:t=>{const i=+t.dataset.i,st=pathState(),n=st.nodes[i];if(!n)return;
    if(!t.dataset.s){t.dataset.s=1;t.textContent=tx('Tap again to skip everything before this level','Nochmal tippen: alles davor überspringen');return}
    st.P.skipTo=n.key;save();closeSheet();render();toast(tx('Skipped ahead','Übersprungen'))}
};
const pathNextTitle=()=>{const st=pathState();if(st.cur<0)return null;const n=st.nodes[st.cur];return{unit:st.units[n.unit].name,label:pathLabel(n),idx:st.cur}};

/* ───────── new exercise types: tf, hear, drag (word blocks), sortart, dmatch ───────── */
/* one small drag-and-drop helper for touch and mouse: drag a .dg element onto a .dz zone, a plain tap calls onTap */
function dragKit(root,o){
  let cur=null;
  const zoneAt=(x,y)=>{const e=document.elementFromPoint(x,y);return e&&e.closest?e.closest('.dz'):null};
  const clearHi=()=>root.querySelectorAll('.dz.hi').forEach(z=>z.classList.remove('hi'));
  root.addEventListener('pointerdown',e=>{
    const el=e.target.closest('.dg');if(!el||el.classList.contains('lock')||!root.contains(el))return;
    cur={el,x:e.clientX,y:e.clientY,moved:false,ghost:null,id:e.pointerId};
    try{el.setPointerCapture(e.pointerId)}catch(_){}
  });
  root.addEventListener('pointermove',e=>{
    if(!cur||e.pointerId!==cur.id)return;
    const dx=e.clientX-cur.x,dy=e.clientY-cur.y;
    if(!cur.moved&&Math.hypot(dx,dy)>8){
      cur.moved=true;const r=cur.el.getBoundingClientRect();
      const g=cur.el.cloneNode(true);g.classList.add('ghost');g.style.width=r.width+'px';g.style.height=r.height+'px';
      document.body.appendChild(g);cur.ghost=g;cur.ox=cur.x-r.left;cur.oy=cur.y-r.top;cur.el.classList.add('lifted');
    }
    if(cur.moved){
      e.preventDefault();
      cur.ghost.style.transform=`translate(${e.clientX-cur.ox}px,${e.clientY-cur.oy}px)`;
      clearHi();const z=zoneAt(e.clientX,e.clientY);if(z)z.classList.add('hi');
    }
  });
  const end=e=>{
    if(!cur||e.pointerId!==cur.id)return;
    const c=cur;cur=null;clearHi();
    if(c.ghost)c.ghost.remove();c.el.classList.remove('lifted');
    if(c.moved){const z=zoneAt(e.clientX,e.clientY);o.onDrop(c.el,z,e.clientX,e.clientY)}
    else if(e.type==='pointerup')o.onTap&&o.onTap(c.el);
  };
  root.addEventListener('pointerup',end);root.addEventListener('pointercancel',end);
  root.addEventListener('contextmenu',e=>{if(e.target.closest('.dg'))e.preventDefault()});
}
/* true / false: does this German word mean that? */
R.tf=it=>{
  const c=byId(it.cid),right=Math.random()<.5,pool=smartEn(c,3).filter(v=>v!==c.en),shown=right||!pool.length?c.en:pool[rnd(pool.length)],truth=shown===c.en;
  askChoice(it,{tag:tx('True or false','Richtig oder falsch'),color:'sky',q:`${fmtDe(c)} ${speakBtn(disDe(c))}<div class="tfq">= ${esc(shown)} ?</div>`,
    opts:[{v:'y',html:tx('True','Richtig')},{v:'n',html:tx('False','Falsch')}],correct:truth?'y':'n',cls:'tf2',info:infoFor(c,esc(c.en))});
  if(canSpeak())setTimeout(()=>speak(disDe(c)),250);
};
/* listen, then choose the meaning */
R.hear=it=>{
  const c=byId(it.cid),opts=shuffle([c.en,...smartEn(c)]).map(v=>({v,html:esc(v)}));
  askChoice(it,{tag:tx('Listen and choose','Hören und wählen'),color:'lantern',q:`<button class="spk" style="width:64px;height:64px;font-size:30px;border-radius:20px" data-a="say" data-t="${esc(disDe(c))}">${SPK}</button> <button class="spk" style="background:var(--lilac)" data-a="slow" data-t="${esc(disDe(c))}">½×</button>`,sub:tx('What does it mean?','Was bedeutet das?'),opts,correct:c.en,info:infoFor(c,`${fmtDe(c)} = ${esc(c.en)}`)});
  setTimeout(()=>speak(disDe(c)),300);
};
/* drag the word blocks into the right order */
R.drag=it=>{
  const c=byId(it.cid),s=sentenceOf(c),words=s.de.split(/\s+/);
  let bank=shuffle(words.map((w,i)=>({w,i}))),ans=[];
  setMain(`${tagH(tx('Drag the blocks','Blöcke ziehen'),'berry')}<h2 class="q" style="font-size:24px">${esc(s.en)}</h2>
  <div class="dline dz" id="al" data-z="a"></div><div class="dhint">${tx('Drag the words into the line. Tap to move one back.','Zieh die Wörter in die Zeile. Tippen schickt ein Wort zurück.')}</div><div class="dbank dz" id="bk" data-z="b"></div>`);
  setFoot('<div class="row2"><button class="btn ghost" id="skp" style="flex:none;width:34%">'+tx('Skip','Weiter')+'</button><button class="btn" id="chk" disabled>'+tx('Check','Prüfen')+'</button></div>');
  const draw=()=>{
    $('#al').innerHTML=ans.length?ans.map((t,k)=>`<span class="blk dg" data-from="a" data-k="${k}">${esc(t.w)}</span>`).join(''):`<em class="dph">${tx('Your sentence','Dein Satz')}</em>`;
    $('#bk').innerHTML=bank.map((t,k)=>`<span class="blk dg" data-from="b" data-k="${k}">${esc(t.w)}</span>`).join('');
    $('#chk').disabled=bank.length>0||ses.locked;
  };
  draw();
  const insertAt=(x,y)=>{
    const kids=[...$('#al').querySelectorAll('.blk')];let n=0;
    kids.forEach(k=>{const r=k.getBoundingClientRect(),cy=r.top+r.height/2,cx=r.left+r.width/2;if(y>r.bottom||(Math.abs(y-cy)<=r.height/2+2&&x>cx))n++});
    return n;
  };
  dragKit($('#sMain'),{
    onTap:el=>{if(ses.locked)return;const k=+el.dataset.k;if(el.dataset.from==='b')ans.push(bank.splice(k,1)[0]);else bank.push(ans.splice(k,1)[0]);sfx('tick');draw()},
    onDrop:(el,z,x,y)=>{
      if(ses.locked)return;const k=+el.dataset.k,from=el.dataset.from;
      if(!z){draw();return}
      const t=(from==='a'?ans:bank).splice(k,1)[0];
      if(z.dataset.z==='a'){let at=insertAt(x,y);if(from==='a'&&at>k)at--;ans.splice(Math.min(at,ans.length),0,t)}else bank.push(t);
      sfx('tick');draw();
    }
  });
  const go=skip=>{if(ses.locked)return;const ok=!skip&&ans.map(t=>t.w).join(' ')===words.join(' ');
    $('#sMain').querySelectorAll('.dg').forEach(e=>e.classList.add('lock'));
    resolve(it,ok?'ok':'bad',{answer:esc(s.de),say:s.de})};
  $('#chk').onclick=()=>go(false);$('#skp').onclick=()=>go(true);
};
/* finishing step shared by the multi-card exercises (same bookkeeping as the match game) */
function multiDone(cs,miss,msg,ptsPer){
  ses.locked=true;
  cs.forEach(c=>{track(c,miss[c.id]?'close':'ok');c.ok=(c.ok||0)+1;if(!ses.arcade&&!ses.graded.has(c.id)){ses.graded.add(c.id);const was=c.srs.seen===0;grade(c,miss[c.id]?1:2,false);if(was)ses.learned++}});
  ses.correct+=cs.length;ses.combo+=1;ses.maxCombo=Math.max(ses.maxCombo,ses.combo);
  const pts=cs.length*(ptsPer||3);ses.xp+=pts;floatXP(pts);sfx('ok');save();drawTop();
  setFoot(`<div class="fb">${emil('cheer',54)}<div class="grow"><div class="h">${PRAISE[rnd(PRAISE.length)]}</div><div class="b">${msg}</div></div></div><button class="btn c-fern" id="cont">${tx('Continue','Weiter')}</button>`,'good fb');
  $('#cont').onclick=advance;
}
function multiMiss(c,miss){miss[c.id]=(miss[c.id]||0)+1;ses.wrong++;ses.combo=0;track(c,'bad');c.bad=(c.bad||0)+1;sfx('bad');vib(30);drawTop()}
/* sort nouns into der / die / das */
R.sortart=it=>{
  const cs=it.cids.map(byId).filter(c=>c&&c.art);let placed=0;const miss={};
  setMain(`${tagH(tx('Sort the nouns','Nomen sortieren'),'lilac')}<h2 class="q" style="font-size:22px">${tx('Drag every word to its article','Zieh jedes Wort zu seinem Artikel')}</h2>
  <div class="abk">${['der','die','das'].map(a=>`<div class="ab dz ${a}" data-z="${a}"><b>${a}</b><div class="ab-in"></div></div>`).join('')}</div>
  <div class="dbank dz" id="tray" data-z="tray">${shuffle(cs).map(c=>`<span class="blk dg" data-id="${c.id}">${esc(c.de.replace(/^(der|die|das)\s+/i,''))}</span>`).join('')}</div>
  <div class="dhint">${tx('Tap a word, then tap an article, if dragging is hard.','Oder: erst ein Wort antippen, dann den Artikel.')}</div>`);
  setFoot('<button class="btn" disabled>'+tx('Sort all words','Alle Wörter sortieren')+'</button>');
  let pick=null;
  const place=(el,a)=>{
    if(ses.locked||el.classList.contains('lock'))return;
    const c=byId(el.dataset.id);if(!c)return;
    if(c.art===a){const box=$('#sMain').querySelector('.ab.'+a+' .ab-in');el.classList.add('lock','okc');el.classList.remove('pk');box.appendChild(el);pick=null;placed++;sfx('tick');
      if(canSpeak())speak(a+' '+c.de.replace(/^(der|die|das)\s+/i,''),1);
      if(placed===cs.length)multiDone(cs,miss,tx('All nouns sorted.','Alle Nomen sortiert.'))}
    else{multiMiss(c,miss);el.classList.add('no');setTimeout(()=>el.classList.remove('no'),450);el.classList.remove('pk');pick=null}
  };
  dragKit($('#sMain'),{
    onDrop:(el,z)=>{if(z&&['der','die','das'].includes(z.dataset.z))place(el,z.dataset.z)},
    onTap:el=>{if(el.classList.contains('lock'))return;$('#sMain').querySelectorAll('.dg.pk').forEach(x=>x.classList.remove('pk'));el.classList.add('pk');pick=el;sfx('tick')}
  });
  $('#sMain').querySelectorAll('.ab').forEach(b=>b.addEventListener('click',e=>{if(e.target.closest('.dg'))return;if(pick)place(pick,b.dataset.z)}));
};
/* drag each German word onto its English meaning */
R.dmatch=it=>{
  const cs=it.cids.map(byId).filter(Boolean);let done=0;const miss={};
  setMain(`${tagH(tx('Match the pairs','Paare finden'),'fern')}<h2 class="q" style="font-size:22px">${tx('Drag each German word onto its meaning','Zieh jedes deutsche Wort zur Bedeutung')}</h2>
  <div class="dmrows">${shuffle(cs).map(c=>`<div class="dmr dz" data-z="${c.id}"><span class="dmt">${esc(c.en)}</span><span class="dms"></span></div>`).join('')}</div>
  <div class="dbank dz" id="tray" data-z="tray">${shuffle(cs).map(c=>`<span class="blk dg" data-id="${c.id}">${fmtDe(c)}</span>`).join('')}</div>`);
  setFoot('<button class="btn" disabled>'+tx('Match all pairs','Alle Paare finden')+'</button>');
  let pick=null;
  const place=(el,row)=>{
    if(ses.locked||el.classList.contains('lock')||row.classList.contains('ok'))return;
    const c=byId(el.dataset.id);
    if(row.dataset.z===el.dataset.id){row.classList.add('ok');row.querySelector('.dms').appendChild(el);el.classList.add('lock','okc');el.classList.remove('pk');pick=null;done++;sfx('tick');
      if(canSpeak())speak(disDe(c),1);
      if(done===cs.length)multiDone(cs,miss,tx('All pairs matched.','Alle Paare gefunden.'))}
    else{multiMiss(c,miss);el.classList.add('no');row.classList.add('no');setTimeout(()=>{el.classList.remove('no');row.classList.remove('no')},450);el.classList.remove('pk');pick=null}
  };
  dragKit($('#sMain'),{
    onDrop:(el,z)=>{if(z&&z.classList.contains('dmr'))place(el,z)},
    onTap:el=>{if(el.classList.contains('lock'))return;$('#sMain').querySelectorAll('.dg.pk').forEach(x=>x.classList.remove('pk'));el.classList.add('pk');pick=el;sfx('tick');if(canSpeak())speak(disDe(byId(el.dataset.id)),1)}
  });
  $('#sMain').querySelectorAll('.dmr').forEach(r=>r.addEventListener('click',e=>{if(e.target.closest('.dg'))return;if(pick)place(pick,r)}));
};
function pathHeroLabel(){const n=pathNextTitle();return n?tx('Continue the path','Weiter auf dem Pfad')+' · '+esc(n.label):tx('Open the path','Pfad öffnen')}
