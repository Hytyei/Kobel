/* ───────── Games 3.4: fix the mistake, word order, true or false ─────────
   No typing. Sentences come from your own class notes (example sentences and grammar items). */
function g2Sent(c){
  if(!c)return null;
  if(c.type==='g'){const z=gz(c);if(!z)return null;const de=(z.pre+z.ans+z.post).replace(/\s+/g,' ').trim();const n=de.split(/\s+/).length;return n>=3&&n<=10?{de,en:plain(c.en||'')}:null}
  if(!c.de)return null;
  const s=sentenceOf(c);if(!s)return null;const n=s.de.split(/\s+/).length;return n>=3&&n<=10?s:null;
}
/* wrong versions of a sentence: two words swapped, the verb pushed to the end, a wrong article, a missing capital */
function g2Variants(de,kinds){
  const m=de.match(/^(.*?)([.!?]*)$/),P=m[2],T=m[1].split(/\s+/),out=[];
  const add=(a,k,idx)=>{const s=a.join(' ')+P;if(s!==de&&!out.some(o=>o.s===s)&&(!kinds||kinds.includes(k)))out.push({s,k,idx})};
  for(let i=1;i<T.length-1;i++)if(T[i].toLowerCase()!==T[i+1].toLowerCase()){const a=T.slice();[a[i],a[i+1]]=[a[i+1],a[i]];add(a,'swap',[i,i+1])}
  if(T.length>=4){const a=T.slice(),v=a.splice(1,1)[0];a.push(v);add(a,'verb',[1,T.length-1])}
  const ART={der:['die','das'],die:['der','das'],das:['der','die'],den:['dem','der'],dem:['den','der'],ein:['eine','einen'],eine:['ein','einer']};
  T.forEach((w,i)=>{const l=w.toLowerCase();if(i>0&&ART[l])ART[l].forEach(r=>{const a=T.slice();a[i]=w[0]===w[0].toUpperCase()?r[0].toUpperCase()+r.slice(1):r;add(a,'art',[i])})});
  /* wrong verb ending: the form of another person (können, sein, haben, regular verbs) */
  const CJ=[['kann','kannst','können','könnt'],['bin','bist','ist','sind','seid'],['habe','hast','hat','haben','habt'],['heiße','heißt','heißen'],['komme','kommst','kommt','kommen'],['wohne','wohnst','wohnt','wohnen'],['spiele','spielst','spielt','spielen'],['fahre','fährst','fährt','fahren']];
  T.forEach((w,i)=>{const l=w.toLowerCase().replace(/[,.!?]/g,'');const g=CJ.find(x=>x.includes(l));if(!g)return;
    g.filter(f=>f!==l).slice(0,6).forEach(f=>{const a=T.slice();a[i]=w[0]===w[0].toUpperCase()?f[0].toUpperCase()+f.slice(1):f;add(a,'conj',[i])})});
  T.forEach((w,i)=>{if(i>0&&/^[A-ZÄÖÜ][a-zäöüß]{2,}$/.test(w)&&w!=='Sie'){const a=T.slice();a[i]=w[0].toLowerCase()+w.slice(1);add(a,'cap',[i])}});
  return out;
}
const g2Why={conj:()=>tx('The verb ending must match the subject.','Die Verbendung muss zum Subjekt passen.'),swap:()=>tx('Two words changed places.','Zwei Wörter haben die Plätze getauscht.'),verb:()=>tx('The verb belongs in position 2.','Das Verb steht auf Position 2.'),art:()=>tx('Check the article.','Achte auf den Artikel.'),cap:()=>tx('German nouns start with a capital letter.','Nomen schreibt man im Deutschen groß.')};
function g2Pick(v,n){const by={};v.forEach(x=>(by[x.k]=by[x.k]||[]).push(x));const ks=shuffle(Object.keys(by)),out=[];let r=0;while(out.length<n&&r<4){ks.forEach(k=>{if(out.length<n&&by[k][r])out.push(by[k][r])});r++}return out}

/* tap the word that is wrong */
R.fixw=it=>{
  const c=byId(it.cid),s=g2Sent(c),v=s&&g2Variants(s.de);
  if(!s||!v.length)return R.fix(it);
  const w=v[rnd(v.length)],toks=w.s.split(/\s+/);
  setMain(`${tagH(tx('Find the mistake','Finde den Fehler'),'berry')}<h2 class="q" style="font-size:26px">${tx('There is a mistake in this sentence. Tap the wrong word.','In diesem Satz ist ein Fehler. Tippe auf das falsche Wort.')}</h2><p class="sub">${esc(s.en)}</p><div class="qx-toks">${toks.map((t,i)=>`<button type="button" class="qx-tok" data-i="${i}">${esc(t)}</button>`).join('')}</div>`);
  setFoot(`<button class="btn ghost" id="skp">${tx('I do not know','Weiß ich nicht')}</button>`);
  const fin=i=>{
    if(ses.locked)return;
    const ok=w.idx.includes(i);
    $('#sMain').querySelectorAll('.qx-tok').forEach((b,k)=>{b.disabled=true;if(w.idx.includes(k))b.classList.add(ok?'right':'fix');else if(k===i)b.classList.add('bad')});
    resolve(it,ok?'ok':'bad',{answer:esc(s.de),say:s.de,ex:`${esc(w.s)} → <b>${esc(s.de)}</b>`,note:g2Why[w.k]()});
  };
  $('#sMain').querySelectorAll('.qx-tok').forEach(b=>b.onclick=()=>fin(+b.dataset.i));
  $('#skp').onclick=()=>fin(-1);
};
/* choose the sentence that is correct (kinds: which mistakes the wrong versions contain) */
function g2Choose(it,kinds,tag,q){
  const c=byId(it.cid),s=g2Sent(c),v=s&&g2Pick(g2Variants(s.de,kinds),2);
  if(!s||!v||v.length<2)return false;
  const opts=shuffle([{v:'ok',html:esc(s.de)}].concat(v.map((x,i)=>({v:'w'+i,html:esc(x.s)}))));
  askChoice(it,{tag,color:'berry',q:`<div class="qx-say" style="font-size:22px">${esc(s.en)}</div>`,sub:q,opts,correct:'ok',cls:'g2o',
    info:{answer:esc(s.de),say:s.de,note:v.map(x=>g2Why[x.k]()).filter((a,i,r)=>r.indexOf(a)===i).join(' ')}});
  return true;
}
R.fixmc=it=>{if(!g2Choose(it,['art','cap','swap','conj'],tx('Correct version','Richtige Version'),tx('Which sentence is written correctly?','Welcher Satz ist richtig geschrieben?')))R.fix(it)};
R.ordmc=it=>{if(!g2Choose(it,['swap','verb'],tx('Word order','Wortstellung'),tx('Which word order is right?','Welche Wortstellung ist richtig?')))R.order(it)};
/* does the German sentence mean this? */
R.tfs=it=>{
  const c=byId(it.cid),s=g2Sent(c);if(!s||!s.en)return R.tf(it);
  const others=WALL().map(g2Sent).filter(x=>x&&x.en&&x.en!==s.en);
  const right=!others.length||Math.random()<.5,shown=right?s.en:others[rnd(others.length)].en;
  askChoice(it,{tag:tx('True or false','Richtig oder falsch'),color:'sky',q:`<div class="qx-say" style="font-size:22px">${esc(s.de)} ${speakBtn(s.de)}</div><div class="tfq">= ${esc(shown)} ?</div>`,
    opts:[{v:'y',html:tx('True','Richtig')},{v:'n',html:tx('False','Falsch')}],correct:right?'y':'n',cls:'tf2',info:{answer:`${esc(s.de)} = ${esc(s.en)}`,say:s.de}});
};
/* games built from these kinds */
const G2_SENT=lesson=>poolW(lesson).concat(poolG(lesson)).filter(g2Sent);
function g2Items(id,lesson){
  const W=shuffle(G2_SENT(lesson));
  if(id==='fixit')return W.slice(0,8).map((c,i)=>({cid:c.id,kind:i%2?'fixmc':'fixw'}));
  if(id==='satz')return shuffle(poolW(lesson).filter(c=>{const s=g2Sent(c);return s&&s.de.split(/\s+/).length<=8})).slice(0,8).map((c,i)=>({cid:c.id,kind:i%2?'ordmc':'order'}));
  if(id==='truth')return W.slice(0,8).map((c,i)=>({cid:c.id,kind:'tfs'})).concat(shuffle(poolW(lesson)).slice(0,4).map(c=>({cid:c.id,kind:'tf'}))).slice(0,10);
  return [];
}
