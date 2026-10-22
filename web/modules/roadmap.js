/* ───────── Roadmap: what every path node asks ─────────
   Stage 1 starts with short words and no writing; stage 4 mixes everything at test pace.
   Inside a node:  fresh target words (the chapter) + a few spiral-review words from earlier units, picked in a
   round-robin cycle (S.stats.pcy counts how often a word was used, the least used and the due ones come first),
   sentences are drawn from the whole path so they keep changing, a word never gets the same exercise twice in a
   row (S.stats.pkh), a word appears at most twice per node, and writing exercises stay at 12% or less. */
const RD_WRITE=new Set(['type','tsen','scr','gapl','listen']);
const RD_SHARE=.12;
function rdStats(){const st=S.stats;if(!st.pcy||typeof st.pcy!=='object')st.pcy={};if(!st.pkh||typeof st.pkh!=='object')st.pkh={};return st}
/* earlier words of the path, in path order, without the ones the node is about */
function rdEarlier(n){
  const st=pathState(),seen=new Set(n.ids),out=[];
  for(let i=0;i<n.i&&i<st.nodes.length;i++){const m=st.nodes[i];if(m.kind==='g')continue;m.ids.forEach(id=>{if(!seen.has(id)){seen.add(id);const c=byId(id);if(c&&act(c)&&!isG(c))out.push(c)}})}
  return out;
}
/* least used first (cycling), words that are due come before the rest */
function rdCycle(pool,k,bump){
  const st=rdStats(),now=Date.now();
  const a=shuffle(pool.slice()).sort((x,y)=>{
    const dx=x.srs&&x.srs.seen>0&&x.srs.due<=now?-1:0,dy=y.srs&&y.srs.seen>0&&y.srs.due<=now?-1:0;
    return (st.pcy[x.id]||0)-(st.pcy[y.id]||0)+(dx-dy)*.5;
  }).slice(0,k);
  if(bump)a.forEach(c=>st.pcy[c.id]=(st.pcy[c.id]||0)+1);
  return a;
}
/* choose a kind this word did not just get */
function rdKind(c,list){
  const st=rdStats(),last=st.pkh[c.id],ok=list.filter(k=>k!==last),k=(ok.length?ok:list)[rnd((ok.length?ok:list).length)];
  st.pkh[c.id]=k;return k;
}
/* regional du/Sie and odd-one-out items, rotated through the whole path instead of always hitting the same cards */
function rdReg(n,k){
  const rk=qvUnitRank(),pool=S.cards.filter(c=>act(c)&&(rk[c.lesson]===undefined||rk[c.lesson]<=n.unit)&&qvRegOf(c));
  return rdCycle(pool,k,true).map(c=>({cid:c.id,kind:'reg'}));
}
function rdOdd(n){
  const rk=qvUnitRank(),st=rdStats();
  const nouns=S.cards.filter(c=>act(c)&&!isG(c)&&pathNoun(c)&&/^[A-ZÄÖÜ][\p{L}-]+$/u.test(c.de||'')&&(rk[c.lesson]===undefined||rk[c.lesson]<=n.unit));
  const by={};nouns.forEach(c=>(by[c.art]=by[c.art]||[]).push(c));
  const arts=Object.keys(by);if(arts.length<2)return[];
  const A=shuffle(arts.filter(a=>by[a].length>=3))[0];if(!A)return[];
  const others=arts.filter(a=>a!==A),oddArt=others[rnd(others.length)];
  const trio=rdCycle(by[A],3,true),odd=rdCycle(by[oddArt],1,true)[0];
  return trio.length===3&&odd?[{cid:odd.id,kind:'odd',cids:[...trio.map(x=>x.id),odd.id]}]:[];
}
const rdShort=(c,m)=>{const w=gmWord(c);return w&&w.length<=(m||6)};
const rdSent=c=>{const s=sentenceOf(c);return s&&s.de.split(/\s+/).length<=7?s:null};
function pathBuild(n){
  const own=n.ids.map(byId).filter(c=>c&&act(c));
  if(n.kind==='g')return shuffle(own).map(c=>({cid:c.id,kind:'gcl'}));
  const enough=WALL().length>=4,spk=canSpeak(),L=n.lv,stg=n.stage||1,isR=n.kind==='r';
  const early=rdEarlier(n);
  /* review words: more of them in later levels and stages */
  const rvN=isR?6:L<=1?0:Math.min(5,L-1+(stg>2?1:0));
  const rv=rvN&&early.length?rdCycle(early,rvN,true):[];
  const ws=isR?rdCycle(own,Math.min(own.length,8),true):own;
  const base=ws.concat(rv);
  const nouns=ws.filter(pathNoun),allNouns=base.filter(pathNoun),pl=base.filter(c=>pluralOf(c)),gw=ws.filter(c=>rdShort(c,stg<2?5:6));
  /* sentences come from the whole path so they rotate: own first, then least used */
  const sentPool=rdCycle(base.concat(early.filter(c=>rdSent(c)).slice(-60)).filter((c,i,a)=>a.indexOf(c)===i&&rdSent(c)),12,false);
  const sn=sentPool.filter(c=>rdSent(c)),cl=base.filter(c=>clozeOf(c)&&c.ex);
  const body=[],keep=new Set(),K=x=>{keep.add(x);return x};
  const MC=['mc2','mc2','hear','tf'],MC1=['mc1','tf'];
  const rec=(cs,kinds)=>cs.forEach(c=>{const k=rdKind(c,kinds.filter(x=>(x!=='mc1'&&x!=='mc2'&&x!=='hear')||enough).filter(x=>x!=='hear'||spk));body.push({cid:c.id,kind:k})});
  const intro=[];
  if(L===1&&!isR){
    shuffle(own.filter(c=>!c.srs.seen)).forEach(c=>intro.push({cid:c.id,kind:'intro'}));
    own.forEach(c=>body.push({cid:c.id,kind:enough?'mc1':'tf'}));
    shuffle(own).slice(0,Math.ceil(own.length*.7)).forEach(c=>body.push({cid:c.id,kind:'tf'}));
    gmMemoItem(own).forEach(x=>body.push(K(x)));
  }else if(L===2&&!isR){
    rec(own,['mc2','mc2','hear','tf']);
    rec(rv,['mc2','tf','hear']);
    shuffle(nouns).slice(0,3).forEach(c=>body.push({cid:c.id,kind:'art'}));
    if(own.length>=4)body.push(K({kind:'dmatch',cids:shuffle(own).slice(0,5).map(c=>c.id)}));
    gmBubbleItem(own).forEach(x=>body.push(K(x)));
    rdReg(n,1).forEach(x=>body.push(K(x)));
  }else if(L===3&&!isR){
    if(own.length>=4)body.push(K({kind:'dmatch',cids:shuffle(base).slice(0,6).map(c=>c.id)}));
    if(allNouns.length>=3)body.push(K({kind:'sortart',cids:shuffle(allNouns).slice(0,5).map(c=>c.id)}));
    gmWsItem(own,4).forEach(x=>body.push(K(x)));
    gmMemoItem(base).forEach(x=>body.push(K(x)));
    gmSnItem(own).forEach(x=>body.push(K(x)));
    shuffle(pl).slice(0,2).forEach(c=>body.push({cid:c.id,kind:'plu'}));
    cl.slice(0,2).forEach(c=>body.push({cid:c.id,kind:'cloze'}));
    rdOdd(n).forEach(x=>body.push(K(x)));
    rdReg(n,1).forEach(x=>body.push(K(x)));
    rec(rv.slice(0,3),['mc2','hear']);
    rec(shuffle(own).slice(0,3),['mc2','tf']);
  }else if(L===4&&!isR){
    sn.slice(0,3).forEach(c=>body.push({cid:c.id,kind:rdKind(c,['drag','drag','cloze'])}));
    cl.slice(0,3).forEach(c=>body.push({cid:c.id,kind:rdKind(c,['cloze','fix'])}));
    gmSnItem(base).forEach(x=>body.push(K(x)));
    gmBubbleItem(base).forEach(x=>body.push(K(x)));
    shuffle(gw).slice(0,stg<2?0:1).forEach(c=>body.push(K({cid:c.id,kind:'gapl'})));
    rdReg(n,1).forEach(x=>body.push(K(x)));
    rdOdd(n).forEach(x=>body.push(K(x)));
    rec(shuffle(rv).slice(0,3),['mc2','tf']);
    rec(shuffle(own).slice(0,3),['mc2','hear']);
  }else{
    /* chapter test (L5) and unit checkpoint (r): everything at a faster pace, a little writing at the end */
    rec(shuffle(base).slice(0,isR?5:4),['mc2','mc2','hear']);
    sn.slice(0,2).forEach(c=>body.push({cid:c.id,kind:'drag'}));
    cl.slice(0,2).forEach(c=>body.push({cid:c.id,kind:rdKind(c,['cloze','fix'])}));
    shuffle(allNouns).slice(0,2).forEach(c=>body.push({cid:c.id,kind:'art'}));
    shuffle(pl).slice(0,1).forEach(c=>body.push({cid:c.id,kind:'plu'}));
    if(base.length>=4)body.push(K({kind:'dmatch',cids:shuffle(base).slice(0,6).map(c=>c.id)}));
    if(allNouns.length>=3)body.push(K({kind:'sortart',cids:shuffle(allNouns).slice(0,5).map(c=>c.id)}));
    gmWsItem(base,4).forEach(x=>body.push(K(x)));
    gmSnItem(base).forEach(x=>body.push(K(x)));
    rdReg(n,1).forEach(x=>body.push(K(x)));
    if(isR)rdOdd(n).forEach(x=>body.push(K(x)));
    /* the writing slots: one short word to complete (stage 2 and up), one short sentence to order by typing */
    if(stg>=2)shuffle(gw).slice(0,1).forEach(c=>body.push(K({cid:c.id,kind:'gapl'})));
    if(stg>=3)shuffle(base.filter(c=>scrOK(c)&&c.de.length<=7)).slice(0,1).forEach(c=>body.push(K({cid:c.id,kind:'scr'})));
  }
  let list=body.slice();
  /* at most 2 appearances per word, and no word right after itself */
  const cnt={};list=list.filter(x=>{if(!x.cid||keep.has(x))return true;cnt[x.cid]=(cnt[x.cid]||0)+1;return cnt[x.cid]<=2});
  const max=L===5||isR?18:L===1?16:15;
  list=pathSpread(list);
  /* trim to size, dropping plain ones first */
  for(let k=list.length-1;k>=0&&list.length>max;k--)if(!keep.has(list[k]))list.splice(k,1);
  while(list.length>max)list.pop();
  /* writing budget */
  const cap=Math.floor((list.length+intro.length)*RD_SHARE);let w=list.filter(x=>RD_WRITE.has(x.kind)).length;
  for(let k=list.length-1;k>=0&&w>cap;k--)if(RD_WRITE.has(list[k].kind)){list.splice(k,1);w--}
  /* sentence cards that were used count as used, so the next node picks other sentences */
  const st2=rdStats();list.forEach(x=>{if(x.cid&&(x.kind==='drag'||x.kind==='cloze'||x.kind==='fix'))st2.pcy[x.cid]=(st2.pcy[x.cid]||0)+1});
  return intro.concat(list);
}
/* quick summary used by tests and docs */
function pathPlanStats(n){const it=pathBuild(n),k={};it.forEach(x=>k[x.kind]=(k[x.kind]||0)+1);const wr=it.filter(x=>RD_WRITE.has(x.kind)).length;return{n:it.length,kinds:k,write:wr,share:it.length?wr/it.length:0}}
