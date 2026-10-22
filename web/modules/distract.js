/* ───────── Smarter wrong answers (3.3.0) ─────────
   A wrong option must look like the right one: same kind of word (noun, verb, phrase, adjective), same subject (the same lesson or a
   neighbouring one), similar length and word count, similar spelling and ending, and for nouns a mix of articles. Candidates are filtered
   first (hard rules, relaxed step by step only when a small lesson has too few look-alikes) and then ranked.
   Replaces smartEn, smartDe, pluralWrong and gapOptions from the base file (later declarations win). */
let DX_ORD=null,DX_N=-1;
function dxOrd(){
  if(DX_ORD&&DX_N===S.cards.length)return DX_ORD;
  const o={};let k=0;
  try{pathNodes().units.forEach(u=>{o[u.name]=k++})}catch(e){}
  S.cards.forEach(c=>{if(!(c.lesson in o))o[c.lesson]=k++});
  DX_ORD=o;DX_N=S.cards.length;return o;
}
const dxClean=s=>String(s||'').replace(/\([^)]*\)/g,' ').replace(/[?!.,…]/g,' ').replace(/\s+/g,' ').trim().toLowerCase();
const dxWords=s=>dxClean(s).split(' ').filter(Boolean);
/* word class used for look-alike matching: noun (has an article), verb, phrase/sentence, question word, or "other" (greetings, adjectives, numbers) */
function dxPos(c){
  if(c.art)return'n';
  if(/^to\s/i.test(c.en||''))return'v';
  const de=String(c.de||'');
  if(/[?.!]$/.test(de)||/\s/.test(de.replace(/^(der|die|das)\s+/i,'')))return Q_WORDS.test(de)?'q':'p';
  if(Q_WORDS.test(de))return'q';
  if(/\((?:m|f|n)\.?\)/.test(c.en||''))return'n';
  return'a';
}
const dxFirst=s=>String(s||'').split(/\s\/\s/)[0];
const dxAlts=s=>String(s||'').split(/\s\/\s/).length;
const dxEnd=(s,k=2)=>dxClean(s).replace(/\s/g,'').slice(-k);
/* too close in meaning or form to be a fair wrong answer (one contains the other, or they share every content word) */
function dxClash(a,b){
  const x=dxClean(a),y=dxClean(b);if(!x||!y)return true;
  if(x===y)return true;
  if(x.length>=4&&y.length>=4&&(x.includes(y)||y.includes(x)))return true;
  const wa=dxWords(a).filter(w=>w.length>2&&w!=='the'&&w!=='and'),wb=dxWords(b).filter(w=>w.length>2&&w!=='the'&&w!=='and');
  if(wa.length&&wb.length&&wa.every(w=>wb.includes(w)))return true;
  return false;
}
function dxPick(c,side,n){
  const own=side==='en'?c.en:disDe(c),pos=dxPos(c),ord=dxOrd(),lo=ord[c.lesson];
  const val=x=>side==='en'?x.en:disDe(x);
  const L=dxClean(dxFirst(own)).length,W=dxWords(dxFirst(own)).length,shape=/^to\s/i.test(c.en||'');
  let pool=WALL().filter(x=>x.id!==c.id&&!isG(x)&&val(x)&&!dxClash(own,val(x)));
  const tiers=[
    x=>dxPos(x)===pos&&Math.abs(dxClean(dxFirst(val(x))).length-L)<=Math.max(3,Math.round(L*.45))&&dxWords(dxFirst(val(x))).length===W&&(side!=='en'||/^to\s/i.test(x.en||'')===shape),
    x=>dxPos(x)===pos&&Math.abs(dxClean(dxFirst(val(x))).length-L)<=Math.max(4,Math.round(L*.6))&&Math.abs(dxWords(dxFirst(val(x))).length-W)<=1,
    x=>dxPos(x)===pos||Math.abs(dxClean(dxFirst(val(x))).length-L)<=Math.max(3,Math.round(L*.5)),
    x=>true];
  let cand=[];
  for(const t of tiers){cand=pool.filter(t);if(cand.length>=n+2)break}
  const rel=x=>{
    let s=0;const d=Math.abs((ord[x.lesson]??50)-(lo??50));
    s+=x.lesson===c.lesson?3.6:d<=1?2:d<=3?1:0;
    s-=Math.abs(dxAlts(val(x))-dxAlts(own))*.8;
    const a=val(x);
    s+=strSim(own,a)*(side==='de'?2.4:1.2);
    s+=dxEnd(own)===dxEnd(a)?1.1:0;
    s+=lenSim(own,a,Math.max(4,L*.6))*1.2;
    if(pos==='n'&&c.art)s+=x.art===c.art?.9:.5;      // nouns: a mix of articles, so the article never gives it away
    if(pos==='p'||pos==='q'){const fa=dxWords(own)[0],fb=dxWords(a)[0];if(fa&&fa===fb)s+=1.6;if(/[?]$/.test(side==='en'?c.en:c.de)===/[?]$/.test(side==='en'?x.en:x.de))s+=.6}
    if(pos==='v'&&side==='de')s+=/en$/i.test(own)===/en$/i.test(a)?.8:0;
    s+=(x.srs&&x.srs.seen>0)?.7:0;                    // words you already met make fairer wrong answers
    return s+Math.random()*.7;
  };
  const out=[],seen=[own];
  for(const o of cand.map(x=>({x,s:rel(x)})).sort((a,b)=>b.s-a.s)){
    const v=val(o.x);if(seen.some(y=>dxClash(y,v)))continue;
    seen.push(v);out.push(side==='en'?v:o.x);if(out.length>=n)break;
  }
  return out;
}
function smartEn(c,n=3){return dxPick(c,'en',n)}
function smartDe(c,n=3){return dxPick(c,'de',n)}

/* plural options: shapes that are plausible for the ending of the word */
function pluralWrong(c,right,n){
  const b=c.de,um=umlaut(b);let cand;
  if(/e$/i.test(b))cand=[b+'n',b+'s',b,um+'n'];
  else if(/(er|el|en)$/i.test(b))cand=[b,um,b+'s',b+'n',um+'n'];
  else if(/in$/i.test(b))cand=[b+'nen',b+'en',b+'s',b+'e'];
  else if(/(ung|heit|keit|schaft|tion|ität)$/i.test(b))cand=[b+'en',b+'e',b+'s',b+'er'];
  else cand=[b+'e',b+'en',b+'er',um+'e',um+'er',b+'s',b+'n',um];
  const u=[...new Set(cand)].filter(x=>x&&x!==right);
  /* keep the look-alikes: forms that differ from the right one by one change come first */
  u.sort((a,z)=>strSim(right,z)-strSim(right,a)+(Math.random()-.5)*.3);
  return u.slice(0,n);
}
/* gap answers: families of look-alike words first, then words of the same shape from the same topic */
function gapOptions(c,ans,n=3,topic=''){
  const low=ans.toLowerCase(),cap=/^[A-ZÄÖÜ]/.test(ans),seen=new Set([low]),out=[];
  const fix=v=>cap?v[0].toUpperCase()+v.slice(1):v[0].toLowerCase()+v.slice(1);
  const add=v=>{if(!v)return false;const k=v.toLowerCase();if(seen.has(k))return false;seen.add(k);out.push(v);return out.length>=n};
  const set=GAP_SETS.find(s=>s.some(w=>w.toLowerCase()===low));
  const near=set?shuffle(set.filter(w=>w.toLowerCase()!==low)).map(fix):(/\s/.test(ans)||cap?[]:shuffle(verbVariants(ans)));
  for(const v of near)if(add(v))return out;
  const multi=/\s/.test(ans),lo=dxOrd()[c&&c.lesson];
  const pool=gapPool().filter(o=>/\s/.test(o.v)===multi&&Math.abs(o.v.length-ans.length)<=Math.max(2,Math.round(ans.length*.4))).map(o=>({v:o.v,s:strSim(ans,o.v)*2+(/^[A-ZÄÖÜ]/.test(o.v)===cap?.8:0)+lenSim(ans,o.v,5)+(topic&&o.t===topic?1.5:0)+(dxEnd(ans)===dxEnd(o.v)?1:0)+Math.random()*.7}));
  pool.sort((a,b)=>b.s-a.s);
  for(const o of pool)if(add(o.v))break;
  if(out.length<n){const rest=gapPool().filter(o=>/\s/.test(o.v)===multi).map(o=>({v:o.v,s:strSim(ans,o.v)+lenSim(ans,o.v,6)+Math.random()}));rest.sort((a,b)=>b.s-a.s);for(const o of rest)if(add(o.v))break}
  return out;
}
