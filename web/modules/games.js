/* ───────── Word games: tap and swipe only, no typing ─────────
   Every typed question of the old app is now a tile game (askType below), plus new games:
   word search (R.wsearch), word snake (R.snake), missing letters (R.gapl). */
const GM_ABC='enisratdhulcgmobwfkzpvj';
const gmWord=c=>{
  if(!c||c.type==='g')return null;
  const w=String(c.de||'').replace(/^(der|die|das)\s+/i,'').split('/')[0].trim();
  if(!/^[\p{L}]{3,9}$/u.test(w)||/ß/.test(w))return null;
  return w.toUpperCase();
};
function gmDecoys(word,k){
  const have=new Set([...String(word).toLowerCase()]);
  let pool=[...GM_ABC].filter(ch=>!have.has(ch));
  if(/[äöü]/i.test(word))pool=pool.concat(['ä','ö','ü'].filter(x=>!have.has(x)));
  return shuffle(pool).slice(0,k);
}
const gmK=n=>n<=4?1:n<=8?2:3;

/* ---- every typed question becomes a tile game ---- */
function askType(it,cfg){
  const t=String((cfg.targets||[])[0]||'').trim(),tw=t.split(/\s+/).filter(Boolean);
  const tag=/^Type it|^Tippe/i.test(cfg.tag)?tx('Letter crumble','Buchstabensalat'):/Listen and type|Hören und/i.test(cfg.tag)?tx('Listen and spell','Hören und buchstabieren'):/Translate the sentence|Übersetze den Satz/i.test(cfg.tag)?tx('Build the sentence','Satz bauen'):cfg.tag;
  const letters=tw.length<=1;
  const hint=letters?`<p class="sub" style="margin-top:6px">${tx('Some letters are extra.','Manche Buchstaben sind zu viel.')}</p>`:'';
  const head=`${tagH(tag,cfg.color)}<h2 class="q" style="${letters?'':'font-size:24px'}">${cfg.q}</h2>${cfg.sub&&!/^(Write it|Schreibe)/.test(cfg.sub.replace(/<[^>]+>/g,''))?`<p class="sub">${cfg.sub}</p>`:''}${hint}`;
  const info=(ok,h,a)=>Object.assign({},cfg.info,{msg:h?tx('You used a hint.','Mit Tipp.'):a?tx('Second try.','Zweiter Versuch.'):undefined});
  if(letters){const U=[...t];qxBuild(it,{units:U.concat(gmDecoys(t,gmK(U.length))),sol:U,hint:true,head,info})}
  else qxBuild(it,{units:tw,word:true,head,info});
}

/* ---- missing letters ---- */
R.gapl=it=>{
  const c=byId(it.cid),raw=c&&gmWord(c);if(!c||!raw)return R.mc2?R.mc2(it):advance();
  const w=String(c.de).replace(/^(der|die|das)\s+/i,'').split('/')[0].trim(),U=[...w],k=U.length>=7?2:1;
  const idx=shuffle(U.map((_,i)=>i).filter(i=>i>0)).slice(0,k).sort((a,b)=>a-b),miss=idx.map(i=>U[i]);
  const pat=U.map((ch,i)=>idx.includes(i)?'<i class="gm-bl"></i>':esc(ch)).join('');
  qxBuild(it,{units:miss.concat(gmDecoys(w,miss.length+2)),sol:miss,hint:true,
    head:`${tagH(tx('Missing letters','Fehlende Buchstaben'),'sky')}<h2 class="q" style="font-size:26px">${esc(c.en)} ${speakBtn(disDe(c))}</h2><p class="sub">${c.art?`<span class="art ${c.art}">${c.art}</span> `:''}${tx('Fill the gaps in order.','Fülle die Lücken der Reihe nach.')}</p><div class="gm-pat">${pat}</div>`,
    info:(ok,h,a)=>Object.assign(infoFor(c,fmtDe(c)),{msg:h?tx('You used a hint.','Mit Tipp.'):a?tx('Second try.','Zweiter Versuch.'):undefined})});
};

/* ---- word search ---- */
function gmGrid(words){
  const N=Math.max(6,Math.min(8,Math.max(...words.map(w=>w.length))+1)),dirs=[[0,1],[1,0],[1,1]];
  for(let attempt=0;attempt<30;attempt++){
    const g=Array.from({length:N},()=>Array(N).fill('')),place=[];let ok=true;
    for(const w of words.slice().sort((a,b)=>b.length-a.length)){
      let done=false;
      for(let t=0;t<150&&!done;t++){
        const d=dirs[rnd(dirs.length)],r0=rnd(N),c0=rnd(N),r1=r0+d[0]*(w.length-1),c1=c0+d[1]*(w.length-1);
        if(r1>=N||c1>=N)continue;
        let fit=true;for(let i=0;i<w.length;i++){const ch=g[r0+d[0]*i][c0+d[1]*i];if(ch&&ch!==w[i]){fit=false;break}}
        if(!fit)continue;
        for(let i=0;i<w.length;i++)g[r0+d[0]*i][c0+d[1]*i]=w[i];
        place.push({w,r0,c0,d});done=true;
      }
      if(!done){ok=false;break}
    }
    if(!ok)continue;
    const src=(words.join('')+'ENISRATDHULCGMOBWFKZ').split('');
    for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(!g[r][c])g[r][c]=src[rnd(src.length)];
    return{g,N,place};
  }
  return null;
}
R.wsearch=it=>{
  const pool=(it.cids||[]).map(byId).filter(c=>c&&gmWord(c));
  let picks=shuffle(pool).slice(0,pool.length>=5&&(ses.items.length<12)?4:3);
  const seen=new Set();picks=picks.filter(c=>{const w=gmWord(c);if(seen.has(w))return false;seen.add(w);return true});
  const G=picks.length>=3&&gmGrid(picks.map(gmWord));
  if(!G)return pool[0]&&R.mc2?R.mc2({cid:pool[0].id,kind:'mc2'}):advance();
  const N=G.N,cs=Math.floor(Math.min(46,(Math.min(innerWidth,520)-44)/N)),words=picks.map(gmWord);
  setMain(`${tagH(tx('Word search','Wortsuche'),'fern')}<h2 class="q" style="font-size:24px">${tx('Find the German words','Finde die deutschen Wörter')}</h2><p class="sub">${tx('Swipe over the letters, or tap the first and the last one.','Wische über die Buchstaben oder tippe den ersten und den letzten an.')}</p>
  <div class="ws-g" id="wsg" style="--cs:${cs}px;grid-template-columns:repeat(${N},var(--cs))">${G.g.map((row,r)=>row.map((ch,c)=>`<div class="ws-c" data-r="${r}" data-c="${c}">${esc(ch)}</div>`).join('')).join('')}</div>
  <ul class="ws-l" id="wsl">${picks.map((c,k)=>`<li data-k="${k}"><span>${esc(c.en)}</span><b>${words[k].length}</b></li>`).join('')}</ul>`);
  setFoot(`<button class="btn ghost" id="wsh">${tx('Hint','Tipp')}</button>`);
  const grid=$('#wsg'),cell=(r,c)=>grid.children[r*N+c],found=new Set(),miss={},hs={};
  let start=null,anchor=null,line=[],wrong=0;
  const clear=()=>grid.querySelectorAll('.sel,.anch').forEach(e=>e.classList.remove('sel','anch'));
  const lineOf=(a,b)=>{
    let dr=b[0]-a[0],dc=b[1]-a[1];if(!dr&&!dc)return [a];
    const ang=Math.atan2(dr,dc),st=Math.round(ang/(Math.PI/4)),D=[[0,1],[1,1],[1,0],[1,-1],[0,-1],[-1,-1],[-1,0],[-1,1]][((st%8)+8)%8];
    const len=Math.max(Math.abs(dr),Math.abs(dc))+1,out=[];
    for(let i=0;i<len;i++){const r=a[0]+D[0]*i,c=a[1]+D[1]*i;if(r<0||c<0||r>=N||c>=N)break;out.push([r,c])}
    return out;
  };
  const show=l=>{clear();l.forEach(([r,c])=>cell(r,c).classList.add('sel'))};
  const mark=(k,flash)=>{
    const p=G.place.find(x=>x.w===words[k]);
    for(let i=0;i<p.w.length;i++)cell(p.r0+p.d[0]*i,p.c0+p.d[1]*i).classList.add('fd','f'+(k%4));
    $('#wsl').querySelector(`li[data-k="${k}"]`).classList.add('on');found.add(k);
    if(found.size===picks.length)finish();
  };
  const finish=()=>{
    const m=Object.assign({},miss);if(wrong>=4)picks.forEach(c=>{m[c.id]=m[c.id]||1});
    setTimeout(()=>multiDone(picks,m,picks.map(c=>`${esc(c.de)} = ${esc(c.en)}`).join(' · '),4),500);
  };
  const test=l=>{
    const s=l.map(([r,c])=>cell(r,c).textContent).join(''),rs=[...s].reverse().join('');
    const k=words.findIndex((w,i)=>!found.has(i)&&(w===s||w===rs));
    if(k>=0){sfx('combo',found.size*3);vib(12);l.forEach(([r,c])=>cell(r,c).classList.remove('sel'));mark(k)}
    else if(l.length>1){wrong++;sfx('back');vib(15);const ls=l;ls.forEach(([r,c])=>cell(r,c).classList.add('no'));setTimeout(()=>ls.forEach(([r,c])=>cell(r,c).classList.remove('no')),300);clear()}
    else clear();
  };
  const at=e=>{const t=document.elementFromPoint(e.clientX,e.clientY);return t&&t.classList&&t.classList.contains('ws-c')?[+t.dataset.r,+t.dataset.c]:null};
  grid.addEventListener('pointerdown',e=>{if(ses.locked)return;const p=at(e);if(!p)return;e.preventDefault();try{grid.setPointerCapture(e.pointerId)}catch(x){}start=p;line=[p];if(anchor){show(lineOf(anchor,p))}else show(line);sfx('slot',0)});
  grid.addEventListener('pointermove',e=>{if(!start)return;const p=at(e);if(!p)return;line=lineOf(start,p);show(line)});
  const up=()=>{
    if(!start)return;const s=start,l=line;start=null;
    if(l.length<=1){
      if(anchor){const a=anchor;anchor=null;clear();test(lineOf(a,s))}
      else{anchor=s;clear();cell(s[0],s[1]).classList.add('anch')}
    }else{anchor=null;test(l)}
  };
  grid.addEventListener('pointerup',up);grid.addEventListener('pointercancel',()=>{start=null;clear()});
  $('#wsh').onclick=()=>{
    if(ses.locked)return;
    const k=words.findIndex((w,i)=>!found.has(i));if(k<0)return;
    hs[k]=(hs[k]||0)+1;miss[picks[k].id]=1;sfx('hint');
    const p=G.place.find(x=>x.w===words[k]);
    if(hs[k]===1){const e=cell(p.r0,p.c0);e.classList.add('hnt');setTimeout(()=>e.classList.remove('hnt'),1600)}
    else mark(k);
  };
};

/* ---- word snake: cut a row of letters into words ---- */
R.snake=it=>{
  const pool=(it.cids||[]).map(byId).filter(c=>c&&gmWord(c));
  let picks=[];const seen=new Set();let tot=0;
  for(const c of shuffle(pool)){const w=gmWord(c);if(seen.has(w)||tot+w.length>17)continue;seen.add(w);picks.push(c);tot+=w.length;if(picks.length>=3)break}
  if(picks.length<2)return pool[0]&&R.mc2?R.mc2({cid:pool[0].id,kind:'mc2'}):advance();
  const ws=picks.map(gmWord),all=[...ws.join('')],cuts=[];let acc=0;ws.slice(0,-1).forEach(w=>{acc+=w.length;cuts.push(acc)});
  const sel=new Set();let tries=0,done=false;
  const cs=Math.floor(Math.min(34,(Math.min(innerWidth,520)-40)/all.length*1.15));
  setMain(`${tagH(tx('Word snake','Wortschlange'),'berry')}<h2 class="q" style="font-size:24px">${tx(`Cut the snake into ${picks.length} words`,`Teile die Schlange in ${picks.length} Wörter`)}</h2><p class="sub">${tx('Tap between two letters to cut.','Tippe zwischen zwei Buchstaben, um zu teilen.')}</p>
  <div class="sn-row" id="snr" style="--cs:${cs}px">${all.map((ch,i)=>`<span class="sn-l">${esc(ch)}</span>${i<all.length-1?`<button type="button" class="sn-g" data-i="${i+1}" aria-label="cut"></button>`:''}`).join('')}</div>
  <ul class="ws-l" style="margin-top:22px">${picks.map((c,k)=>`<li class="on0"><span>${k+1}. ${esc(c.en)}</span><b>${ws[k].length}</b></li>`).join('')}</ul>`);
  setFoot(`<div class="row2"><button class="btn ghost" id="snc" style="flex:none;width:34%">${tx('Reset','Neu')}</button><button class="btn" id="chk" disabled>${tx('Check','Prüfen')}</button></div>`);
  const gaps=[...document.querySelectorAll('#snr .sn-g')];
  const paint=()=>{gaps.forEach(g=>g.classList.toggle('cut',sel.has(+g.dataset.i)));$('#chk').disabled=sel.size!==picks.length-1};
  gaps.forEach(g=>g.onclick=()=>{if(done||ses.locked)return;const i=+g.dataset.i;sel.has(i)?sel.delete(i):sel.add(i);sfx(sel.has(i)?'slot':'back',sel.size);vib(6);paint()});
  $('#snc').onclick=()=>{if(done)return;sel.clear();paint()};
  $('#chk').onclick=()=>{
    if(done||ses.locked)return;
    const right=cuts.every(c=>sel.has(c))&&sel.size===cuts.length;
    if(right){done=true;gaps.forEach(g=>g.classList.toggle('good',cuts.includes(+g.dataset.i)));const m={};if(tries)picks.forEach(c=>m[c.id]=1);setTimeout(()=>multiDone(picks,m,picks.map(c=>`${esc(c.de)}`).join(' · '),4),450);return}
    tries++;
    gaps.forEach(g=>{const i=+g.dataset.i,bad=sel.has(i)&&!cuts.includes(i);g.classList.toggle('bad',bad)});
    sfx('bad');vib([20,30,20]);
    if(tries>=2){
      done=true;sel.clear();cuts.forEach(c=>sel.add(c));paint();gaps.forEach(g=>g.classList.remove('bad'));
      const m={};picks.forEach(c=>{multiMiss(c,m)});setTimeout(()=>multiDone(picks,m,picks.map(c=>`${esc(c.de)}`).join(' · '),2),700);
    }else{setTimeout(()=>{gaps.forEach(g=>g.classList.remove('bad'));[...sel].forEach(i=>{if(!cuts.includes(i))sel.delete(i)});paint()},700)}
  };
};


/* ---- memory: flip two cards, match a German word with its meaning ---- */
R.memo=it=>{
  const picks=(it.cids||[]).map(byId).filter(c=>c&&c.type!=='g'&&c.de&&c.en&&String(c.de).length<=18&&String(c.en).length<=22);
  const seen=new Set(),P=picks.filter(c=>{const k=c.de.toLowerCase()+'|'+c.en.toLowerCase();if(seen.has(k))return false;seen.add(k);return true}).slice(0,6);
  if(P.length<4)return P[0]&&R.mc2?R.mc2({cid:P[0].id,kind:'mc2'}):advance();
  const cards=shuffle(P.flatMap(c=>[{id:c.id,side:'de',t:fmtDe(c)},{id:c.id,side:'en',t:c.en}]));
  const cols=cards.length>8?3:2;
  setMain(`${tagH(tx('Memory','Memory'),'lilac')}<h2 class="q" style="font-size:24px">${tx('Match the pairs','Finde die Paare')}</h2><p class="sub">${tx('Flip two cards: a German word and its meaning.','Drehe zwei Karten: ein deutsches Wort und seine Bedeutung.')}</p>
  <div class="mm-g" id="mmg" style="grid-template-columns:repeat(${cols},1fr)">${cards.map((c,i)=>`<button type="button" class="mm-c ${c.side}" data-i="${i}" data-id="${c.id}"><span class="mm-in"><i class="mm-f">?</i><b class="mm-b" style="font-size:${c.t.length>12?11:c.t.length>9?13:15}px">${esc(c.t)}</b></span></button>`).join('')}</div>
  <p class="mm-s" id="mms"></p>`);
  setFoot(`<div class="row2"><span class="sub" id="mmt" style="align-self:center">${tx('Pairs','Paare')}: 0 / ${P.length}</span></div>`);
  const el=[...document.querySelectorAll('#mmg .mm-c')];let open=[],done=0,moves=0,busy=false;const bad={};
  el.forEach(b=>b.onclick=()=>{
    if(busy||ses.locked||b.classList.contains('up')||b.classList.contains('ok'))return;
    b.classList.add('up');sfx('slot',open.length*2);vib(5);open.push(b);
    if(open.length<2)return;
    moves++;busy=true;const [x,y]=open,cx=cards[+x.dataset.i],cy=cards[+y.dataset.i];open=[];
    if(cx.id===cy.id&&cx.side!==cy.side){
      setTimeout(()=>{x.classList.add('ok');y.classList.add('ok');done++;sfx('combo',done*3);vib(12);$('#mmt').textContent=`${tx('Pairs','Paare')}: ${done} / ${P.length}`;busy=false;
        if(done===P.length){const m={};P.forEach(c=>{if((bad[c.id]||0)>=2)m[c.id]=1});if(moves>P.length*2.5)P.forEach(c=>m[c.id]=1);setTimeout(()=>multiDone(P,m,P.map(c=>`${esc(c.de)} = ${esc(c.en)}`).join(' · '),3),500)}},320);
    }else{
      bad[cx.id]=(bad[cx.id]||0)+1;bad[cy.id]=(bad[cy.id]||0)+1;
      setTimeout(()=>{x.classList.add('no');y.classList.add('no');sfx('back');vib(12)},250);
      setTimeout(()=>{x.classList.remove('up','no');y.classList.remove('up','no');busy=false},850);
    }
  });
};

/* ---- bubble pop: the right translation floats up, pop it before it leaves ---- */
R.bubble=it=>{
  const P=(it.cids||[]).map(byId).filter(c=>c&&c.type!=='g'&&c.de&&c.en&&String(c.en).length<=24).slice(0,6);
  const pool=WALL().filter(c=>c.en&&String(c.en).length<=24);
  if(P.length<3||pool.length<6)return P[0]&&R.mc2?R.mc2({cid:P[0].id,kind:'mc2'}):advance();
  let r=0,miss={},busy=false,pops=0;
  const draw=()=>{
    const c=P[r],opts=[c],low=new Set([String(c.en).toLowerCase()]);
    for(const d of shuffle(pool.slice())){if(opts.length>=4)break;const k=String(d.en).toLowerCase();if(!low.has(k)&&d.id!==c.id){low.add(k);opts.push(d)}}
    const xs=shuffle([3,27,51,73]);
    setMain(`${tagH(tx('Bubble pop','Blasenjagd'),'sky')}<h2 class="q" style="font-size:30px">${esc(fmtDe(c))} ${speakBtn(disDe(c))}</h2><p class="sub">${tx('Pop the bubble with the right meaning.','Platze die Blase mit der richtigen Bedeutung.')} · ${r+1}/${P.length}</p>
    <div class="bb-sky" id="bbs">${shuffle(opts.slice()).map((o,i)=>`<button type="button" class="bb" data-id="${o.id}" style="left:${xs[i]}%;animation-duration:${(9.5+i*.5).toFixed(1)}s;animation-delay:${(i*.35).toFixed(2)}s"><span>${esc(o.en)}</span></button>`).join('')}</div>`);
    setFoot('');busy=false;
    const sky=$('#bbs');
    sky.querySelectorAll('.bb').forEach(b=>{
      b.onclick=()=>{
        if(busy||ses.locked)return;
        if(b.dataset.id===String(c.id)){busy=true;b.classList.add('pop');sfx('ok',++pops);vib(12);sky.querySelectorAll('.bb:not(.pop)').forEach(x=>x.classList.add('away'));setTimeout(next2,520)}
        else{miss[c.id]=1;b.classList.add('pop','bad');sfx('back');vib(15)}
      };
      b.addEventListener('animationend',e=>{if(e.animationName==='bbRise'&&b.dataset.id===String(c.id)&&!busy){busy=true;miss[c.id]=1;b.classList.add('pop','bad');sky.querySelectorAll('.bb:not(.pop)').forEach(x=>x.classList.add('away'));sfx('bad');setTimeout(next2,600)}});
    });
  };
  const next2=()=>{r++;if(r>=P.length){multiDone(P,miss,P.map(c=>`${esc(c.de)} = ${esc(c.en)}`).join(' · '),3)}else draw()};
  draw();
};

/* ---- path builder: no typing, more games ---- */
function gmWsItem(ws,k){const p=ws.filter(gmWord);return p.length>=3?[{kind:'wsearch',cids:shuffle(p).slice(0,Math.min(p.length,k||4)).map(c=>c.id)}]:[]}
function gmMemoItem(ws){const p=ws.filter(c=>c.type!=='g'&&String(c.de).length<=18);return p.length>=4?[{kind:'memo',cids:shuffle(p).slice(0,6).map(c=>c.id)}]:[]}
function gmBubbleItem(ws){const p=ws.filter(c=>c.type!=='g'&&String(c.en).length<=24);return p.length>=3?[{kind:'bubble',cids:shuffle(p).slice(0,5).map(c=>c.id)}]:[]}
function gmSnItem(ws){const p=ws.filter(gmWord);return p.length>=2?[{kind:'snake',cids:shuffle(p).slice(0,4).map(c=>c.id)}]:[]}
function pathBuild(n){
  const ws=n.ids.map(byId).filter(c=>c&&act(c));
  if(n.kind==='g')return shuffle(ws).map(c=>({cid:c.id,kind:'gcl'}));
  const items=[],keep=new Set(),spk=canSpeak(),enough=WALL().length>=4,L=n.lv;
  const nouns=ws.filter(pathNoun),pl=ws.filter(c=>pluralOf(c)),cl=ws.filter(c=>clozeOf(c)),sn=ws.filter(c=>sentenceOf(c)),sc=ws.filter(scrOK),gw=ws.filter(gmWord);
  const K=(x)=>{keep.add(x);return x};
  if(L===1){
    const fresh=ws.filter(c=>!c.srs.seen);
    shuffle(fresh).forEach(c=>items.push({cid:c.id,kind:'intro'}));
    const body=[];
    ws.forEach(c=>body.push({cid:c.id,kind:enough?'mc1':'tf'}));
    ws.forEach(c=>body.push({cid:c.id,kind:'tf'}));
    items.push(...pathSpread(body));
  }else if(L===2){
    const body=[];
    ws.forEach(c=>body.push({cid:c.id,kind:enough?'mc2':'tf'}));
    shuffle(ws).slice(0,4).forEach(c=>body.push({cid:c.id,kind:spk&&enough?'hear':'tf'}));
    shuffle(nouns).slice(0,3).forEach(c=>body.push({cid:c.id,kind:'art'}));
    shuffle(gw).slice(0,2).forEach(c=>body.push(K({cid:c.id,kind:'gapl'})));
    qvRegItems(n,1).forEach(x=>body.push(K(x)));
    items.push(...pathSpread(body));
  }else if(L===3){
    const body=[];
    if(ws.length>=4)body.push({kind:'dmatch',cids:shuffle(ws).slice(0,6).map(c=>c.id)});
    if(nouns.length>=3)body.push({kind:'sortart',cids:shuffle(nouns).slice(0,5).map(c=>c.id)});
    gmWsItem(ws,4).forEach(x=>body.push(K(x)));
    gmMemoItem(ws).forEach(x=>body.push(K(x)));
    shuffle(pl).slice(0,2).forEach(c=>body.push({cid:c.id,kind:'plu'}));
    shuffle(cl).slice(0,2).forEach(c=>body.push({cid:c.id,kind:'cloze'}));
    shuffle(gw).slice(0,2).forEach(c=>body.push(K({cid:c.id,kind:'gapl'})));
    [...qvOddItems(n,ws,1),...qvRegItems(n,1)].forEach(x=>body.push(K(x)));
    shuffle(ws).slice(0,Math.max(3,8-body.length)).forEach(c=>body.push({cid:c.id,kind:enough?'mc2':'tf'}));
    items.push(...pathSpread(body));
  }else if(L===4){
    const body=[];
    shuffle(sn).slice(0,3).forEach(c=>body.push({cid:c.id,kind:'drag'}));
    shuffle(cl).slice(0,2).forEach(c=>body.push({cid:c.id,kind:'cloze'}));
    shuffle(cl).slice(0,2).forEach(c=>body.push(K({cid:c.id,kind:'fix'})));
    shuffle(sc).slice(0,2).forEach(c=>body.push({cid:c.id,kind:'scr'}));
    gmSnItem(ws).forEach(x=>body.push(K(x)));
    gmBubbleItem(ws).forEach(x=>body.push(K(x)));
    shuffle(gw).slice(0,2).forEach(c=>body.push(K({cid:c.id,kind:'gapl'})));
    qvRegItems(n,1).forEach(x=>body.push(K(x)));
    const have=new Set(body.map(b=>b.cid));
    shuffle(ws.filter(c=>!have.has(c.id))).slice(0,Math.max(3,9-body.length)).forEach(c=>body.push({cid:c.id,kind:'mc2'}));
    items.push(...pathSpread(body));
  }else{
    const body=[];
    shuffle(ws).slice(0,4).forEach(c=>body.push({cid:c.id,kind:'type'}));
    if(spk)shuffle(ws).slice(0,2).forEach(c=>body.push({cid:c.id,kind:'listen'}));
    shuffle(sn).slice(0,2).forEach(c=>body.push(K({cid:c.id,kind:'tsen'})));
    shuffle(sn).slice(0,2).forEach(c=>body.push({cid:c.id,kind:'drag'}));
    shuffle(cl).slice(0,2).forEach(c=>body.push({cid:c.id,kind:'cloze'}));
    shuffle(cl).slice(0,1).forEach(c=>body.push(K({cid:c.id,kind:'fix'})));
    shuffle(nouns).slice(0,2).forEach(c=>body.push({cid:c.id,kind:'art'}));
    gmWsItem(ws,4).forEach(x=>body.push(K(x)));
    gmSnItem(ws).forEach(x=>body.push(K(x)));
    gmMemoItem(ws).forEach(x=>body.push(K(x)));
    gmBubbleItem(ws).forEach(x=>body.push(K(x)));
    qvRegItems(n,1).forEach(x=>body.push(K(x)));
    if(nouns.length>=3)body.push({kind:'sortart',cids:shuffle(nouns).slice(0,5).map(c=>c.id)});
    items.push(...pathSpread(body));
  }
  const intro=items.filter(i=>i.kind==='intro'),rest=items.filter(i=>i.kind!=='intro'),max=L===5?20:16;
  for(let k=rest.length-1;k>=0&&rest.length>max;k--)if(!keep.has(rest[k]))rest.splice(k,1);
  return intro.concat(rest.slice(0,max));
}
