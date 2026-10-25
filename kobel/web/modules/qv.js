/* ───────── Question content: du/Sie guidance, sentence variants, new question types ───────── */
const QX_V={v:null};

/* ---- 1. which "you" is it? tags the English side so two different German sentences never share one translation ---- */
const QV_TAG=/\((?:in)?formal\b[^)]*\)|,\s*(?:in)?formal\)|\byou all\b|\(all\)|\(plural\)|\(to you all\)/i;
const QV_L='\\p{L}\\d';
function qvKind(de){
  const s=String(de||'').replace(/\{\{|\}\}/g,'');
  if(/(^|[^\p{L}])(du|dir|dich|dein|deine|deinen|deinem|deiner|deines)(?![\p{L}])/iu.test(s))return 'du';
  if(/(^|[^\p{L}])(ihr|euch|euer|eure|euren|eurem|eurer)(?![\p{L}])/.test(s)||/^Ihr\s+\p{L}+(?:t|et)(?![\p{L}])/u.test(s))return 'ihr';
  if(/(^|[^\p{L}])(Sie|Ihnen|Ihr|Ihre|Ihren|Ihrem|Ihrer|Ihres)(?![\p{L}])/.test(s))return 'Sie';
  return null;
}
function qvTag(en,k){
  en=String(en||'');
  if(!k||!/\b(you|your|yours|yourself)\b/i.test(en)||QV_TAG.test(en))return en;
  const t=k==='du'?'informal':k==='Sie'?'formal':'you all';
  if(/\)\s*$/.test(en)&&k!=='ihr')return en.replace(/\)\s*$/,', '+t+')');
  return en+' ('+t+')';
}
const QV_OVR={
  'Ich heiße ...':['My name is ...','My name is ... (with heißen)'],
  'Mein Name ist ...':['My name is ...','My name is ... (with Name)'],
  'welcher / welche / welches':['which','which (all three forms)'],
  'welche':['which','which (feminine and plural)'],
  'Vielen Dank':['thank you very much','thank you very much (starts with Vielen)'],
  'Danke schön.':['Thank you very much.','Thank you very much. (starts with Danke)'],
  'Ich weiß es nicht.':['I do not know.','I do not know. (with es)'],
  'Ich weiß nicht.':['I do not know.','I do not know. (without es)'],
  'Schirm':['umbrella','umbrella (short form)'],
  'Regenschirm':['umbrella','umbrella (with Regen-)'],
  'Bitte schön.':['You are welcome.','You are welcome. (Bitte …)'],
  'Bitteschön.':['You are welcome.','You are welcome. (one word)']
};

/* "it" in English hides er / sie / es in German: show which one so two sentences never share one translation */
const QV_IT=/\((?:masculine|feminine|neuter)(?: it)?\)/i;
function qvIt(de,en){
  en=String(en||'');if(!/\bit\b/i.test(en)||QV_IT.test(en))return en;
  const raw=String(de||''),s=raw.replace(/\{\{|\}\}/g,'');
  if(/\{\{\s*(?:er|sie|es)\s*\}\}/i.test(raw)||/\d|Uhr|Wetter|regnet|schneit|kalt|warm|heiß|gibt|geht|\bman\b|\s\/\s/i.test(s))return en;
  const m=s.match(/(?:^|[\s,;?!.])(er|sie|es)(?=[\s,;?!.]|$)/i);if(!m)return en;
  const p=m[1].toLowerCase(),first=s.search(/\S/)===s.indexOf(m[1])||/^\s*$/.test(s.slice(0,s.indexOf(m[1])));
  if(p==='sie'&&m[1]==='Sie'&&!first)return en;            // capital Sie in the middle is formal "you"
  const t=p==='er'?'masculine':p==='sie'?'feminine':'neuter';
  return en.replace(/\)\s*$/,'')===en?en+' ('+t+' it)':en.replace(/\)\s*$/,', '+t+' it)');
}
function regFix(c){
  if(!c)return;
  if(c.type==='g'){const k=qvKind(c.sentence);if(k)c.en=qvTag(c.en,k);c.en=qvIt(c.sentence,c.en);return}
  const o=QV_OVR[c.de];if(o&&c.en===o[0]&&!(c.lesson==='Everyday objects'&&false))c.en=o[1];
  const k=qvKind(c.de);if(k)c.en=qvTag(c.en,k);
  if(c.ex&&c.exEn){const k2=qvKind(c.ex);if(k2)c.exEn=qvTag(c.exEn,k2);c.exEn=qvIt(c.ex,c.exEn)}
  if(!c.ex&&String(c.de).split(/\s+/).length>=2)c.en=qvIt(c.de,c.en);
}

/* ---- 2. sentence variants: when a sentence comes back, a small detail changes (country, name, job, number, colour…) ---- */
const QV_SETS=[
  {k:'ctry',a:[['Deutschland','Germany'],['Spanien','Spain'],['Italien','Italy'],['Frankreich','France'],['Österreich','Austria'],['Polen','Poland'],['Griechenland','Greece'],['Portugal','Portugal'],['England','England'],['Russland','Russia'],['China','China'],['Japan','Japan'],['Brasilien','Brazil'],['Syrien','Syria'],['Indien','India'],['Ägypten','Egypt'],['Marokko','Morocco'],['Kanada','Canada'],['Kroatien','Croatia']]},
  {k:'dem',a:[['Iran','Iran'],['Irak','Iraq'],['Libanon','Lebanon'],['Sudan','Sudan'],['Jemen','Yemen']]},
  {k:'der',a:[['Türkei','Turkey'],['Schweiz','Switzerland'],['Ukraine','Ukraine'],['Slowakei','Slovakia']]},
  {k:'lang',a:[['Persisch','Persian'],['Türkisch','Turkish'],['Spanisch','Spanish'],['Englisch','English'],['Französisch','French'],['Italienisch','Italian'],['Arabisch','Arabic'],['Russisch','Russian'],['Polnisch','Polish'],['Chinesisch','Chinese'],['Japanisch','Japanese']]},
  {k:'city',a:[['Hamburg','Hamburg'],['Berlin','Berlin'],['München','Munich'],['Köln','Cologne'],['Frankfurt','Frankfurt'],['Dresden','Dresden'],['Bremen','Bremen'],['Leipzig','Leipzig'],['Stuttgart','Stuttgart'],['Hannover','Hanover'],['Düsseldorf','Düsseldorf'],['Nürnberg','Nuremberg']]},
  {k:'fn',a:['Anna','Lena','Sara','Mia','Sina','Eva','Violeta','Miriam','Lydia','Laura','Julia','Maria','Emma','Nora'].map(x=>[x,x])},
  {k:'mn',a:['Jonas','Paul','Leon','Ali','Antonio','Arno','Max','Tim','Felix','Lukas','David','Omid'].map(x=>[x,x])},
  {k:'sur',a:['Müller','Schmidt','Meier','Schulz','Becker','Wagner','Patschorke'].map(x=>[x,x])},
  {k:'jf',a:[['Ärztin','doctor'],['Lehrerin','teacher'],['Journalistin','journalist'],['Architektin','architect'],['Friseurin','hairdresser'],['Studentin','student'],['Ingenieurin','engineer'],['Kellnerin','waitress'],['Krankenschwester','nurse'],['Schauspielerin','actress'],['Sängerin','singer'],['Verkäuferin','shop assistant']]},
  {k:'jm',a:[['Arzt','doctor'],['Lehrer','teacher'],['Journalist','journalist'],['Architekt','architect'],['Friseur','hairdresser'],['Student','student'],['Ingenieur','engineer'],['Kellner','waiter'],['Schauspieler','actor'],['Sänger','singer'],['Verkäufer','shop assistant']]},
  {k:'num',a:[['zwei','two'],['drei','three'],['vier','four'],['fünf','five'],['sechs','six'],['sieben','seven'],['acht','eight'],['neun','nine'],['zehn','ten']]},
  {k:'col',a:[['grün','green'],['blau','blue'],['rot','red'],['gelb','yellow'],['schwarz','black'],['weiß','white'],['braun','brown'],['grau','grey']]},
  {k:'mat',a:[['Plastik','plastic'],['Glas','glass'],['Metall','metal'],['Holz','wood'],['Papier','paper']]},
  {k:'fm',a:[['Vater','father'],['Bruder','brother'],['Onkel','uncle'],['Opa','grandpa'],['Sohn','son']]},
  {k:'ff',a:[['Mutter','mother'],['Schwester','sister'],['Tante','aunt'],['Oma','grandma'],['Tochter','daughter']]}
];
const QV_ES=s=>String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const QV_RE=(t,fl)=>new RegExp(`(?<![${QV_L}])((?:an?\\s+)?)(${QV_ES(t)})(?![${QV_L}])`,fl);
function qvRng(seed){let a=(seed>>>0)||1;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function qvVary(de,en,seed){
  const rnd=qvRng(seed),parts=String(de).split(/(\{\{.*?\}\})/),full=parts.join('');
  let E=String(en),swaps=0,changed=false;
  const sets=QV_SETS.map(s=>({s,r:rnd()})).sort((a,b)=>a.r-b.r).map(x=>x.s);
  const inDe=t=>parts.some((p,i)=>i%2===0&&QV_RE(t,'u').test(p));
  const inEn=t=>QV_RE(t,'iu').test(E);
  const anyDe=t=>QV_RE(t,'u').test(full),anyEn=t=>QV_RE(t,'iu').test(E);
  for(const set of sets){
    if(swaps>=2)break;
    const found=set.a.filter(([d,e])=>inDe(d)&&inEn(e));
    if(!found.length)continue;
    const free=set.a.filter(([d,e])=>!anyDe(d)&&!anyEn(e));
    if(free.length<found.length)continue;
    const pick=free.map(x=>({x,r:rnd()})).sort((a,b)=>a.r-b.r).map(o=>o.x);
    found.forEach(([d,e],i)=>{
      const [nd,ne]=pick[i];
      for(let k=0;k<parts.length;k+=2)parts[k]=parts[k].replace(QV_RE(d,'gu'),(m,art,w)=>art+nd);
      E=E.replace(QV_RE(e,'giu'),(m,art,w)=>{
        let nw=ne;if(/^[A-Z]/.test(w)&&!/^[A-Z]/.test(nw))nw=nw[0].toUpperCase()+nw.slice(1);
        if(art){const A=/^[aeiou]/i.test(ne)?'an':'a';art=(art[0]==='A'?A[0].toUpperCase()+A.slice(1):A)+' '}
        return art+nw;
      });
      changed=true;
    });
    swaps++;
  }
  /* ages and similar two-digit numbers that appear on both sides */
  if(swaps<2){
    const dm=parts.map((p,i)=>i%2===0?(p.match(/(?<![\d:.,])\d{2}(?![\d:.,])/g)||[]):[]).flat();
    if(dm.length===1&&/(?:\bis|\bam|\bare|\bold)\s+\d{2}\b/i.test(E)&&new RegExp('(?<![\\d:.,])'+dm[0]+'(?![\\d:.,])').test(E)&&!/Uhr|:|€|Euro/.test(full)){
      let n;do{n=String(18+Math.floor(rnd()*52))}while(n===dm[0]);
      for(let k=0;k<parts.length;k+=2)parts[k]=parts[k].replace(dm[0],n);
      E=E.replace(dm[0],n);changed=true;
    }
  }
  return{de:parts.join(''),en:E,changed};
}
const QV_SENT=new Set(['cloze','gcl','drag','order','type','tsen','fix']);
function qvPrepare(it){
  QX_V.v=null;
  if(!it||!it.cid||!QV_SENT.has(it.kind)||it.noVar)return;
  const c=S.cards.find(x=>x.id===it.cid);if(!c)return;
  const st=S.stats;if(!st.sv||typeof st.sv!=='object')st.sv={};
  const n=st.sv[c.id]||0;st.sv[c.id]=n+1;
  if(n===0)return;                         // the first time you see a sentence it is exactly as in your notes
  const f={},seed=(typeof h53==='function'?h53(c.id):0)+n*7919;let any=false;
  if(c.type==='g'){const r=qvVary(c.sentence,c.en,seed);if(r.changed){f.sentence=r.de;f.en=r.en;any=true}}
  else if(c.ex&&c.exEn){const r=qvVary(c.ex,c.exEn,seed);if(r.changed){f.ex=r.de;f.exEn=r.en;any=true}}
  else if(!c.ex&&String(c.de).split(/\s+/).length>=3){const r=qvVary(c.de,c.en,seed);if(r.changed){f.de=r.de;f.en=r.en;any=true}}
  if(any)QX_V.v={cid:c.id,f};
}
function QXV(c){
  const v=QX_V.v;
  if(!c||!v||v.cid!==c.id||typeof ses==='undefined'||!ses||!document.getElementById('ses'))return c;
  return new Proxy(c,{get:(t,k)=>(typeof k==='string'&&k in v.f)?v.f[k]:t[k],set:(t,k,x)=>{t[k]=x;return true}});
}
Object.keys(R).forEach(k=>{const f=R[k];if(typeof f==='function'&&!f.__qv)R[k]=Object.assign(it=>{qvPrepare(it);return f(it)},{__qv:1})});

/* ---- 3. new question types ---- */
/* du, Sie or ihr? */
const QV_WHO={
  du:{h:tx('informal · one person you know','informal · eine Person, die du kennst'),n:tx('du: friends, family, children. The verb ends in -st (du kommst).','du: Freunde, Familie, Kinder. Das Verb endet auf -st (du kommst).')},
  Sie:{h:tx('formal · one or more strangers','formal · eine oder mehrere fremde Personen'),n:tx('Sie (capital S): office, shops, strangers. The verb looks like the plural (Sie kommen). Other forms: Ihnen, Ihr.','Sie (großes S): Büro, Geschäft, Fremde. Das Verb sieht aus wie der Plural (Sie kommen). Weitere Formen: Ihnen, Ihr.')},
  ihr:{h:tx('informal · several people you know','informal · mehrere Personen, die du kennst'),n:tx('ihr: a group of friends or family. The verb ends in -t (ihr kommt).','ihr: eine Gruppe von Freunden oder Familie. Das Verb endet auf -t (ihr kommt).')}
};
function qvRegOf(c){
  if(!c)return null;
  const tagK=e=>/\binformal\b/i.test(e)?'du':/\bformal\b/i.test(e)?'Sie':/\byou all\b|\(all\)|\(plural\)/i.test(e)?'ihr':null;
  const L=c.type==='g'?[[plain(c.sentence),c.en]]:[[c.de,c.en],[c.ex?plain(c.ex):'',c.exEn]];
  for(const [d,e] of L){if(!d||!e)continue;const k=qvKind(d),t=tagK(e);if(k&&t&&k===t&&String(d).split(/\s+/).length>=2)return{de:d,en:e,k}}
  return null;
}
R.reg=it=>{
  const c=byId(it.cid),r=qvRegOf(c);if(!r)return R.mc1?R.mc1(it):advance();
  const opts=['du','Sie','ihr'].map(k=>({v:k,html:`<span><b style="font:800 24px var(--fd)">${k}</b><span class="qx-reg ${k.toLowerCase()}">${k==='du'?tx('informal','informal'):k==='Sie'?tx('formal','formal'):tx('group','Gruppe')}</span><br><small style="opacity:.75;font-weight:500">${esc(QV_WHO[k].h)}</small></span>`}));
  askChoice(it,{tag:tx('du, Sie or ihr?','du, Sie oder ihr?'),color:'sky',q:`<div class="qx-say">${esc(r.de)} ${speakBtn(r.de)}</div>`,sub:tx('Who is being spoken to?','Wer wird hier angesprochen?'),opts,correct:r.k,
    info:{answer:`<b>${r.k}</b> · ${esc(QV_WHO[r.k].h)}`,say:r.de,ex:esc(r.en),note:QV_WHO[r.k].n}});
};
/* which noun has a different article? */
R.odd=it=>{
  const ids=it.cids||[],cs=ids.map(byId).filter(Boolean),odd=byId(it.cid);
  if(cs.length<4||!odd||cs.some(x=>!/^[A-ZÄÖÜ][\p{L}-]+$/u.test(x.de||'')))return R.art?R.art(it):advance();
  const opts=shuffle(cs.slice()).map(x=>({v:x.id,html:esc(x.de)}));
  const same=cs.filter(x=>x.id!==odd.id),A=same[0].art;
  askChoice(it,{tag:tx('Odd one out','Welches passt nicht?'),color:'lilac',q:tx('Which noun has a different article?','Welches Nomen hat einen anderen Artikel?'),sub:tx('Three share an article. One does not.','Drei haben denselben Artikel. Eines nicht.'),opts,correct:odd.id,
    info:{answer:`<span class="art ${odd.art}">${odd.art}</span> ${esc(odd.de)}`,say:odd.art+' '+odd.de,ex:same.map(x=>`<span class="art ${x.art}">${x.art}</span> ${esc(x.de)}`).join(' · ')}});
};
/* find the mistake: tap the wrong word */
R.fix=it=>{
  const c=byId(it.cid),cz=c&&clozeOf(c);
  if(!cz)return R.cloze(it);
  const wrong=(gapOptions(c,cz.ans,3)||[]).find(w=>w&&w.toLowerCase()!==cz.ans.toLowerCase());
  if(!wrong)return R.cloze(it);
  const pre=cz.pre.split(/\s+/).filter(Boolean),mid=wrong.split(/\s+/).filter(Boolean),post=cz.post.split(/\s+/).filter(Boolean);
  const toks=[...pre,...mid,...post],lo=pre.length,hi=pre.length+mid.length-1;
  const good=cz.pre+cz.ans+cz.post;
  setMain(`${tagH(tx('Find the mistake','Finde den Fehler'),'berry')}<h2 class="q" style="font-size:26px">${tx('One word does not belong. Tap it.','Ein Wort ist falsch. Tippe darauf.')}</h2><p class="sub">${esc(c.exEn)}</p><div class="qx-toks">${toks.map((w,i)=>`<button type="button" class="qx-tok" data-i="${i}">${esc(w)}</button>`).join('')}</div>`);
  setFoot(`<button class="btn ghost" id="skp">${tx('I do not know','Weiß ich nicht')}</button>`);
  const fin=(i)=>{
    if(ses.locked)return;
    const ok=i>=lo&&i<=hi;
    $('#sMain').querySelectorAll('.qx-tok').forEach((b,k)=>{b.disabled=true;if(k>=lo&&k<=hi){b.classList.add(ok?'right':'fix')}else if(k===i)b.classList.add('bad')});
    resolve(it,ok?'ok':'bad',{answer:esc(plain(good)),say:plain(good),ex:`${esc(wrong)} → <b>${esc(cz.ans)}</b>`,note:c.note});
  };
  $('#sMain').querySelectorAll('.qx-tok').forEach(b=>b.onclick=()=>fin(+b.dataset.i));
  $('#skp').onclick=()=>fin(-1);
};
/* translate a whole sentence by typing */
R.tsen=it=>{
  const c=byId(it.cid),s=sentenceOf(c);if(!s)return R.type(it);
  askType(it,{tag:tx('Translate the sentence','Übersetze den Satz'),color:'berry',q:esc(s.en),sub:tx('Write it in German.','Schreibe es auf Deutsch.'),targets:[s.de,s.de.replace(/[.!?]+$/,'')],ph:tx('In German…','Auf Deutsch…'),info:{answer:esc(s.de),say:s.de,note:c.note}});
};
['reg','odd','fix','tsen'].forEach(k=>{const f=R[k];R[k]=Object.assign(it=>{qvPrepare(it);return f(it)},{__qv:1})});

/* ---- helpers for the path builder ---- */
function qvUnitRank(){const o={};try{pathNodes().units.forEach((u,i)=>o[u.name]=i)}catch(e){}return o}
function qvRegItems(n,k){
  const rk=qvUnitRank(),lim=n.unit;
  const pool=S.cards.filter(c=>act(c)&&(rk[c.lesson]===undefined||rk[c.lesson]<=lim)&&qvRegOf(c));
  const near=shuffle(pool.filter(c=>rk[c.lesson]===lim)),far=shuffle(pool.filter(c=>rk[c.lesson]!==lim));
  const seen=new Set(),out=[];
  [...near,...far].forEach(c=>{if(out.length<k&&!seen.has(c.id)){seen.add(c.id);out.push({cid:c.id,kind:'reg'})}});
  return out;
}
function qvOddItems(n,ws,k){
  const rk=qvUnitRank(),lim=n.unit,out=[];
  const nouns=S.cards.filter(c=>act(c)&&!isG(c)&&pathNoun(c)&&/^[A-ZÄÖÜ][\p{L}-]+$/u.test(c.de||'')&&(rk[c.lesson]===undefined||rk[c.lesson]<=lim));
  const mine=new Set(ws.map(c=>c.id));
  for(let t=0;t<k;t++){
    const by={};nouns.forEach(c=>(by[c.art]=by[c.art]||[]).push(c));
    const arts=Object.keys(by).filter(a=>by[a].length>=3);if(arts.length<1||Object.keys(by).length<2)break;
    const A=shuffle(arts)[0],others=Object.keys(by).filter(a=>a!==A);
    const trio=shuffle(by[A].slice()).sort((a,b)=>(mine.has(b.id)?1:0)-(mine.has(a.id)?1:0)).slice(0,3);
    const oddPool=by[others[rnd(others.length)]],odd=shuffle(oddPool.slice()).sort((a,b)=>(mine.has(b.id)?1:0)-(mine.has(a.id)?1:0))[0];
    out.push({cid:odd.id,kind:'odd',cids:[...trio.map(x=>x.id),odd.id]});
  }
  return out;
}
