/* ───────── Roadmap: what every path node asks ─────────
   Stage 1 starts with short words and no writing; stage 4 mixes everything at test pace.
   Inside a node:  fresh target words (the chapter) + a few spiral-review words from earlier units, picked in a
   round-robin cycle (S.stats.pcy counts how often a word was used, the least used and the due ones come first),
   sentences are drawn from the whole path so they keep changing, a word never gets the same exercise twice in a
   row (S.stats.pkh), a word appears at most twice per node, and writing exercises stay at 12% or less. */
const RD_WRITE=new Set(['type','tsen','scr','gapl','listen','order','snake','wsearch']);
const WR_EVERY=50;
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
/* ---- writing clock: one letter / writing exercise per 50 answered questions, everywhere in the app ---- */
const WR_KINDS=new Set(['type','tsen','scr','listen','order','gapl','snake','wsearch']);
function wrDue(){const st=S.stats;return(st.qn|0)-(st.wlast|0)>=WR_EVERY}
function wrTake(){S.stats.wlast=S.stats.qn|0}
function pickKindOld(c,mode){
  let k=pickKindOld0(c,mode);
  if(!WR_KINDS.has(k)||isG(c))return k;
  if(wrDue()){wrTake();return k}
  const av=avail(c),alt=['mc2','art','plu','cloze','mc1'].filter(x=>av.includes(x)&&x!==ses.lastKind);
  return alt.length?alt[rnd(alt.length)]:(av.includes('mc2')?'mc2':k);
}
/* ---- rules: card, recall questions ---- */
const rdRulesOf=(lesson,topic)=>S.rules.filter(r=>(!lesson||r.lesson===lesson)&&(!topic||r.topic===topic)&&r.text);
function rdGcardFor(topic,lesson){const gs=S.cards.filter(c=>isG(c)&&act(c)&&(topic?c.topic===topic:true)&&(lesson?c.lesson===lesson:true));return gs[0]||null}
function rdRuleCard(n){
  const u=pathState().units[n.unit];if(!u)return null;
  const rs=rdRulesOf(u.name);if(!rs.length)return null;
  const g=rdGcardFor(null,u.name)||byId(n.ids[0]);
  return g?{cid:g.id,kind:'rule',lesson:u.name}:null;
}
function rdRuleQ(n,k){
  const u=pathState().units[n.unit],rk=qvUnitRank(),st=rdStats(),out=[];
  const pool=S.rules.filter(r=>r.text&&r.topic&&(rk[r.lesson]===undefined||rk[r.lesson]<=n.unit)&&rdGcardFor(r.topic));
  if(pool.length<4)return out;
  const mine=pool.filter(r=>u&&r.lesson===u.name),src=mine.length&&Math.random()<.6?mine:pool;
  const picks=shuffle(src.slice()).sort((a,b)=>(st.pcy['r'+a.id]||0)-(st.pcy['r'+b.id]||0)).slice(0,k);
  picks.forEach((r,i)=>{st.pcy['r'+r.id]=(st.pcy['r'+r.id]|0)+1;const g=rdGcardFor(r.topic);out.push({cid:g.id,kind:(i+(st.pcy['r'+r.id]|0))%2?'rrec':'rtop',rid:r.id})});
  return out;
}
const rdShort=(c,m)=>{const w=gmWord(c);return w&&w.length<=(m||6)};
const rdSent=c=>{const s=sentenceOf(c);return s&&s.de.split(/\s+/).length<=7?s:null};
function pathBuild(n){
  const own=n.ids.map(byId).filter(c=>c&&act(c));
  if(n.kind==='g'){
    /* grammar: rule card first, then the gaps, then rule recall */
    const topics=[...new Set(own.map(c=>c.topic).filter(Boolean))],pre=[];
    topics.slice(0,2).forEach(t=>{if(rdRulesOf(null,t).length)pre.push({cid:own.find(c=>c.topic===t).id,kind:'rule',topic:t})});
    const q=[];S.rules.filter(r=>r.text&&topics.includes(r.topic)).slice(0,2).forEach((r,i)=>q.push({cid:own.find(c=>c.topic===r.topic).id,kind:i%2?'rtop':'rrec',rid:r.id}));
    return pre.concat(pathSpread(shuffle(own).map(c=>({cid:c.id,kind:'gcl'})).concat(q)));
  }
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
    gmMemoItem(base).forEach(x=>body.push(K(x)));
    gmBubbleItem(base).forEach(x=>body.push(K(x)));
    shuffle(pl).slice(0,2).forEach(c=>body.push({cid:c.id,kind:'plu'}));
    cl.slice(0,2).forEach(c=>body.push({cid:c.id,kind:'cloze'}));
    rdOdd(n).forEach(x=>body.push(K(x)));
    rdReg(n,1).forEach(x=>body.push(K(x)));
    rec(rv.slice(0,3),['mc2','hear']);
    rec(shuffle(own).slice(0,3),['mc2','tf']);
  }else if(L===4&&!isR){
    sn.slice(0,3).forEach(c=>body.push({cid:c.id,kind:rdKind(c,['drag','drag','cloze'])}));
    cl.slice(0,3).forEach(c=>body.push({cid:c.id,kind:rdKind(c,['cloze','fix'])}));
    gmBubbleItem(base).forEach(x=>body.push(K(x)));
    gmMemoItem(base).forEach(x=>body.push(K(x)));
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
    gmBubbleItem(base).forEach(x=>body.push(K(x)));
    rdReg(n,1).forEach(x=>body.push(K(x)));
    if(isR)rdOdd(n).forEach(x=>body.push(K(x)));
  }
  /* rules first: the unit's rule card opens its first chapter, rule recall questions come back in later levels and checkpoints */
  const rulePre=[];
  if(!isR&&L===1&&n.ch===0){const rc=rdRuleCard(n);if(rc)rulePre.push(rc)}
  if(!isR&&(L===3||L===4)){rdRuleQ(n,1).forEach(x=>body.push(K(x)))}
  if(isR||L===5){rdRuleQ(n,2).forEach(x=>body.push(K(x)))}
  /* letter and writing exercises are rare on purpose: about one in every 50 answers */
  if(wrDue()){
    const cand=[];
    shuffle(gw).slice(0,1).forEach(c=>cand.push({cid:c.id,kind:'gapl'}));
    shuffle(base.filter(c=>scrOK(c)&&c.de.length<=7)).slice(0,1).forEach(c=>cand.push({cid:c.id,kind:'scr'}));
    gmWsItem(base,4).forEach(x=>cand.push(x));gmSnItem(base).forEach(x=>cand.push(x));
    if(cand.length&&L>=3){body.push(K(cand[rnd(cand.length)]));wrTake()}
  }
  let list=body.slice();
  /* at most 2 appearances per word, and no word right after itself */
  const cnt={};list=list.filter(x=>{if(!x.cid||keep.has(x))return true;cnt[x.cid]=(cnt[x.cid]||0)+1;return cnt[x.cid]<=2});
  const max=L===5||isR?18:L===1?16:15;
  list=pathSpread(list);
  /* trim to size, dropping plain ones first */
  for(let k=list.length-1;k>=0&&list.length>max;k--)if(!keep.has(list[k]))list.splice(k,1);
  while(list.length>max)list.pop();
  /* at most one writing / letter exercise per node */
  {let w=0;list=list.filter(x=>{if(!RD_WRITE.has(x.kind))return true;return ++w<=1})}
  /* sentence cards that were used count as used, so the next node picks other sentences */
  const st2=rdStats();list.forEach(x=>{if(x.cid&&(x.kind==='drag'||x.kind==='cloze'||x.kind==='fix'))st2.pcy[x.cid]=(st2.pcy[x.cid]||0)+1});
  /* the node counts as played for the writing clock */
  S.stats.qn=(S.stats.qn|0)+0;
  return rulePre.concat(intro,list);
}
/* quick summary used by tests and docs */
function pathPlanStats(n){const it=pathBuild(n),k={};it.forEach(x=>k[x.kind]=(k[x.kind]||0)+1);const wr=it.filter(x=>RD_WRITE.has(x.kind)).length;return{n:it.length,kinds:k,write:wr,share:it.length?wr/it.length:0}}

/* ---- rule card: read the rule, see examples, then practise ---- */
R.rule=it=>{
  const rs=rdRulesOf(it.lesson,it.topic),topics=[...new Set(rs.map(r=>r.topic))].slice(0,3);
  const body=topics.map(t=>{
    const lines=rs.filter(r=>r.topic===t).slice(0,4).map(r=>`<li>${esc(r.text)}</li>`).join('');
    const ex=S.cards.filter(c=>isG(c)&&c.topic===t&&c.sentence).slice(0,2).map(c=>`<div class="rl-ex">${esc(plain(c.sentence).replace(/\{\{(.+?)\}\}/g,'$1'))}<small>${esc(c.en||'')}</small></div>`).join('');
    return `<div class="rl-t">${esc(t)}</div><ul class="rl-l">${lines}</ul>${ex}`;
  }).join('');
  setMain(`${tagH(tx('Rule first','Erst die Regel'),'lilac')}<div class="rulec">${body}</div>`);
  setFoot('<button class="btn" id="got">'+tx('Got it, now practise','Verstanden, jetzt üben')+'</button>');
  $('#got').onclick=()=>advance();
};
/* which topic does this rule belong to? */
R.rrec=it=>{
  const r=S.rules.find(x=>x.id===it.rid),c=byId(it.cid);if(!r||!c)return advance();
  const rk=qvUnitRank(),others=[...new Set(S.rules.filter(x=>x.topic&&x.topic!==r.topic).map(x=>x.topic))];
  const near=others.filter(t=>S.rules.some(x=>x.topic===t&&x.lesson===r.lesson)),far=shuffle(others.filter(t=>!near.includes(t)));
  const ds=shuffle(near).concat(far).slice(0,3);if(ds.length<3)return advance();
  askChoice(it,{tag:tx('Which rule is this?','Zu welcher Regel gehört das?'),color:'lilac',q:`<div class="rl-q">${esc(r.text)}</div>`,opts:shuffle([r.topic,...ds]).map(v=>({v,html:esc(v)})),correct:r.topic,info:{answer:esc(r.topic),note:esc(r.text)}});
};
/* which rule fits this topic? */
R.rtop=it=>{
  const r=S.rules.find(x=>x.id===it.rid),c=byId(it.cid);if(!r||!c)return advance();
  const len=r.text.length,pool=S.rules.filter(x=>x.topic!==r.topic&&x.text).sort((a,b)=>Math.abs(a.text.length-len)-Math.abs(b.text.length-len)+(a.lesson===r.lesson?-30:0)-(b.lesson===r.lesson?-30:0));
  const ds=pool.slice(0,6).filter((x,i,a)=>a.findIndex(y=>y.topic===x.topic)===i).slice(0,3);if(ds.length<3)return advance();
  askChoice(it,{tag:tx('Pick the rule','Die richtige Regel'),color:'lilac',q:`<h2 class="q">${esc(r.topic)}</h2>`,opts:shuffle([r,...ds]).map(x=>({v:x.id,html:`<span style="font-size:15px;line-height:1.25;display:block">${esc(x.text)}</span>`})),correct:r.id,info:{answer:esc(r.text),note:esc(r.topic)}});
};
/* grammar gaps: always with options, typing tiles only on the rare writing turn */
R.gcl=it=>{
  const c=byId(it.cid),z=gz(c);
  const sentence=`${esc(z.pre)}<span class="blank" id="bl">&nbsp;&nbsp;&nbsp;</span>${esc(z.post)}`;
  const info={answer:esc(z.ans),say:plain(c.sentence),ex:esc(c.en),note:[c.hint,rulesFor(c.topic)].filter(Boolean).join(' · '),fill:z.ans};
  const tag='Grammar · '+esc(c.topic),ds=gDistract(c,z.ans,3);
  if(ds.length>=2){askChoice(it,{tag,color:'lilac',q:sentence,sub:esc(c.en),opts:shuffle([z.ans,...ds]).map(v=>({v,html:esc(v)})),correct:z.ans,info});return}
  askType(it,{tag,color:'lilac',q:sentence,sub:esc(c.en),targets:[z.ans],ph:'Missing word',info});
};

/* the first test of a new word never asks for typing, except on the rare writing turn */
function firstKind(c){
  const k=firstKind0(c);if(k!=='type')return k;
  if(wrDue()){wrTake();return k}
  const av=avail(c);return av.includes('mc2')?'mc2':av.includes('mc1')?'mc1':k;
}
