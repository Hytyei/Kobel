/* ───────── Kobel 4.0: learning fixes, enrichment, new question types, score bug ─────────
   Function declarations here come after the older ones, so they replace them (same pattern as ui3.js). */

/* ---- 1. parsing and sentence helpers ---- */
/* "Das weiß ich noch nicht." starts with a word that looks like an article: a sentence is never a noun */
const v4IsSentence=s=>/[.!?…]$/.test(String(s).trim());
function splitArt(de){const m=String(de).trim().match(/^(der|die|das)\s+(.+)$/i);return m&&!v4IsSentence(m[2])?{art:m[1].toLowerCase(),de:m[2].trim()}:{art:'',de:String(de).trim()}}
/* a gap on a whole word only: "an" must not match inside "Anna" */
function clozeOf(c){
  if(!c.ex)return null;
  const m=c.ex.match(/\{\{(.+?)\}\}/);
  if(m)return{pre:plain(c.ex.slice(0,m.index)),ans:m[1],post:plain(c.ex.slice(m.index+m[0].length))};
  if(c.de.length<2)return null;
  const h=new RegExp(`(?<![\\p{L}\\d])${QV_ES(c.de)}(?![\\p{L}\\d])`,'iu').exec(c.ex);
  return h?{pre:c.ex.slice(0,h.index),ans:h[0],post:c.ex.slice(h.index+h[0].length)}:null;
}
/* note shorthand ("Mach es gut! / Mach's gut!", "Firma ..., ...") is not a sentence you can build from blocks */
const v4Whole=s=>!/\s\/\s|\.\.\.|…/.test(s);
function sentenceOf(c){
  const ex=plain(c.ex);
  if(ex.split(/\s+/).length>=3&&c.exEn&&v4Whole(ex))return{de:ex,en:c.exEn};
  if(!c.ex&&c.de.split(/\s+/).length>=3&&v4Whole(c.de))return{de:c.de,en:c.en};
  return null;
}

/* ---- 2. content: fills gaps in existing cards, never overwrites what is already there ---- */
const V4_EN=[['I can cook great','I can cook really well'],['You can play chess great','You play chess really well'],['You can ski really great','You really can ski well'],['You can really dance super','You really dance brilliantly'],['He can bake normally','He bakes reasonably well'],['theater','theatre']];
const V4_PL=`der ingenieur:-e|die ingenieurin:-nen|der arzt:-"e|die ärztin:-nen|der verkäufer:-|die verkäuferin:-nen|der kellner:-|die kellnerin:-nen|der student:-en|die studentin:-nen|der journalist:-en|die journalistin:-nen|der architekt:-en|die architektin:-nen|der lehrer:-|die lehrerin:-nen|der friseur:-e|die friseurin:-nen|der kfz-mechatroniker:-|die kfz-mechatronikerin:-nen|der paketzusteller:-|die paketzustellerin:-nen|der schüler:-|die rentnerin:-nen|die sängerin:-nen|die krankenschwester:-n|der tierarzt:-"e|der rentner:-|die schauspielerin:-nen|das praktikum:Praktika|der azubi:-s|die ausbildung:-en|die fluggesellschaft:-en|der großvater:-"|der opa:-s|die großmutter:-"|die oma:-s|der vater:-"|der papa:-s|die mutter:-"|die mama:-s|der enkel:-|der onkel:-|der ehemann:-"er|der mann:-"er|die ehefrau:-en|die frau:-en|das mädchen:-|der cousin:-s|die cousine:-n|das sofa:-s|der tisch:-e|der schrank:-"e|der teppich:-e|das regal:-e|das bett:-en|das bild:-er|der stuhl:-"e|die lampe:-n|der sessel:-|das fenster:-|die muttersprache:-n|der tag:-e|der monat:-e|der frühling:-e|die woche:-n|das gewitter:-|die krankheit:-en|die information:-en|die batterie:-n|der name:-n|der buchstabe:-n|das auge:-n|das ende:-n|der junge:-n|das brötchen:-|das gesicht:-er|die gebühr:-en|das auto:-s|das äuglein:-|die disko:-s`.split('|').reduce((o,x)=>{const i=x.lastIndexOf(':');o[x.slice(0,i)]=x.slice(i+1);return o},{});
const V4_EX=`frankreich|Ich komme aus {{Frankreich}}.|I come from France
italien|Lena wohnt in {{Italien}}.|Lena lives in Italy
spanien|Mein Bruder wohnt in {{Spanien}}.|My brother lives in Spain
schweden|Maren kommt aus {{Schweden}}.|Maren comes from Sweden
china|Meine Tante wohnt in {{China}}.|My aunt lives in China
england|Paul kommt aus {{England}}.|Paul comes from England
russland|Mein Onkel kommt aus {{Russland}}.|My uncle comes from Russia
polen|Ich wohne in {{Polen}}.|I live in Poland
eritrea|Meine Eltern kommen aus {{Eritrea}}.|My parents come from Eritrea
deutsch|Ich lerne {{Deutsch}}.|I am learning German
französisch|Ich spreche ein bisschen {{Französisch}}.|I speak a little French
italienisch|Sie spricht {{Italienisch}}.|She speaks Italian
schwedisch|Er spricht {{Schwedisch}}.|He speaks Swedish
spanisch|Ich lerne {{Spanisch}}.|I am learning Spanish
chinesisch|Sprichst du {{Chinesisch}}?|Do you speak Chinese?
englisch|Wir sprechen {{Englisch}}.|We speak English
türkisch|Ich spreche {{Türkisch}}.|I speak Turkish
russisch|Mein Vater spricht {{Russisch}}.|My father speaks Russian
polnisch|Meine Oma spricht {{Polnisch}}.|My grandma speaks Polish
persisch|Meine Mutter spricht {{Persisch}}.|My mother speaks Persian
die muttersprache|Meine {{Muttersprache}} ist Persisch.|My native language is Persian
der ingenieur|Mein Vater ist {{Ingenieur}}.|My father is an engineer
die ingenieurin|Lena ist {{Ingenieurin}}.|Lena is an engineer
der arzt|Mein Bruder ist {{Arzt}}.|My brother is a doctor
die ärztin|Miriam ist {{Ärztin}}.|Miriam is a doctor
der verkäufer|Andreas arbeitet als {{Verkäufer}}.|Andreas works as a salesperson
die verkäuferin|Sie arbeitet als {{Verkäuferin}}.|She works as a shop assistant
der kellner|Ich arbeite als {{Kellner}}.|I work as a waiter
die kellnerin|Sie arbeitet als {{Kellnerin}}.|She works as a waitress
der student|Jonas ist {{Student}}.|Jonas is a student
die studentin|Ich bin {{Studentin}}.|I am a student
der journalist|Er arbeitet als {{Journalist}}.|He works as a journalist
die journalistin|Sie ist {{Journalistin}}.|She is a journalist
der architekt|Mein Onkel ist {{Architekt}}.|My uncle is an architect
die architektin|Meine Tante ist {{Architektin}}.|My aunt is an architect
der lehrer|Mein Vater ist {{Lehrer}}.|My father is a teacher
die lehrerin|Meine Mutter ist {{Lehrerin}}.|My mother is a teacher
der friseur|Er arbeitet als {{Friseur}}.|He works as a hairdresser
die friseurin|Ich arbeite als {{Friseurin}}.|I work as a hairdresser
der schüler|Mein Sohn ist {{Schüler}}.|My son is a pupil
der rentner|Mein Opa ist {{Rentner}}.|My grandpa is a retiree
die rentnerin|Meine Oma ist {{Rentnerin}}.|My grandma is a retiree
die sängerin|Sie ist {{Sängerin}}.|She is a singer
die krankenschwester|Meine Schwester ist {{Krankenschwester}}.|My sister is a nurse
der großvater|Mein {{Großvater}} ist 80 Jahre alt.|My grandfather is 80 years old
die großmutter|Meine {{Großmutter}} ist 79 Jahre alt.|My grandmother is 79 years old
der vater|Das ist mein {{Vater}}.|That is my father
die mutter|Das ist meine {{Mutter}}.|That is my mother
der sohn|Mein {{Sohn}} heißt Paul.|My son is called Paul
die tochter|Meine {{Tochter}} heißt Mia.|My daughter is called Mia
die geschwister|Hast du {{Geschwister}}?|Do you have siblings?
das mädchen|Das {{Mädchen}} heißt Sina.|The girl is called Sina
das sofa|Das {{Sofa}} ist groß.|The sofa is big
der tisch|Der {{Tisch}} ist grau.|The table is grey
der schrank|Der {{Schrank}} ist teuer.|The cupboard is expensive
der teppich|Der {{Teppich}} ist schön.|The carpet is beautiful
das regal|Das {{Regal}} ist aus Holz.|The shelf is made of wood
das bett|Das {{Bett}} ist so schön!|The bed is so beautiful!
die lampe|Die {{Lampe}} ist modern.|The lamp is modern
der sessel|Der {{Sessel}} kostet 99 Euro.|The armchair costs 99 euros
die tür|Die {{Tür}} ist braun.|The door is brown
hässlich|Das Bild ist {{hässlich}}.|The picture is ugly
billig|Der Tisch ist {{billig}}.|The table is cheap
groß|Das Bett ist {{groß}}.|The bed is big
klein|Der Tisch ist {{klein}}.|The table is small
modern|Die Lampe ist {{modern}}.|The lamp is modern
alt|Der Schrank ist {{alt}}.|The cupboard is old
lang|Der Tisch ist sehr {{lang}}.|The table is very long
kurz|Die Jacke ist {{kurz}}.|The jacket is short
das auto|Mein {{Auto}} ist neu.|My car is new
weiß|Die Tür ist {{weiß}}.|The door is white
gelb|Die Lampe ist {{gelb}}.|The lamp is yellow
orange|Die Jacke ist {{orange}}.|The jacket is orange
rot|Die Flasche ist {{rot}}.|The bottle is red
grün|Die Flasche ist {{grün}}.|The bottle is green
blau|Die Tasche ist {{blau}}.|The bag is blue
braun|Der Tisch ist {{braun}}.|The table is brown
schwarz|Der Laptop ist {{schwarz}}.|The laptop is black
grau|Der Stuhl ist {{grau}}.|The chair is grey
das holz|Der Tisch ist aus {{Holz}}.|The table is made of wood
das papier|Das Buch ist aus {{Papier}}.|The book is made of paper
das metall|Der Stuhl ist aus {{Metall}}.|The chair is made of metal
das plastik|Die Flasche ist aus {{Plastik}}.|The bottle is made of plastic
das glas|Die Flasche ist aus {{Glas}}.|The bottle is made of glass
das leder|Die Tasche ist aus {{Leder}}.|The bag is made of leather
der bleistift|Ich habe einen {{Bleistift}}.|I have a pencil
der kugelschreiber|Hast du einen {{Kugelschreiber}}?|Do you have a pen?
der schlüssel|Wo ist der {{Schlüssel}}?|Where is the key?
die kamera|Die {{Kamera}} ist teuer.|The camera is expensive
die zeitung|Er liest die {{Zeitung}}.|He reads the newspaper
die kette|Die {{Kette}} ist schön.|The necklace is beautiful
das handy|Mein {{Handy}} ist neu.|My mobile phone is new
der geldbeutel|Wo ist mein {{Geldbeutel}}?|Where is my wallet?
der regenschirm|Ich brauche einen {{Regenschirm}}.|I need an umbrella
die e-mail|Ich schreibe eine {{E-Mail}}.|I am writing an email
der drucker|Der {{Drucker}} ist neu.|The printer is new
die maus|Ich habe keine {{Maus}}.|I do not have a mouse
der computer|Der {{Computer}} ist alt.|The computer is old
der stift|Ich brauche einen {{Stift}}.|I need a pen
der kalender|Wo ist der {{Kalender}}?|Where is the calendar?
der bildschirm|Der {{Bildschirm}} ist groß.|The screen is big
das tablet|Ich habe kein {{Tablet}}.|I do not have a tablet
die visitenkarte|Hier ist meine {{Visitenkarte}}.|Here is my business card
die tastatur|Die {{Tastatur}} ist neu.|The keyboard is new
die firma|Die {{Firma}} heißt HotSped.|The company is called HotSped
das land|Deutschland ist ein {{Land}}.|Germany is a country
die stadt|Hamburg ist eine {{Stadt}}.|Hamburg is a city
die straße|Die {{Straße}} ist lang.|The street is long
zwei|Ich habe {{zwei}} Kinder.|I have two children
drei|Wir haben {{drei}} Kinder.|We have three children
vier|Ich packe {{vier}} Stifte.|I pack four pens
fünf|Das kostet {{fünf}} Euro.|That costs five euros
zehn|Das kostet {{zehn}} Euro.|That costs ten euros
schreiben|Ich {{schreibe}} eine E-Mail.|I am writing an email
hören|Ich {{höre}} Musik.|I am listening to music
sagen|Was {{sagst}} du?|What are you saying?
tragen|Sie {{trägt}} eine Brille.|She wears glasses
toll|Das ist {{toll}}!|That is great!
super|Das ist {{super}}!|That is great!
normal|Das ist {{normal}}.|That is normal
blöd|Das ist {{blöd}}.|That is annoying
interessant|Das Buch ist {{interessant}}.|The book is interesting
lustig|Mein Onkel ist {{lustig}}.|My uncle is funny
ledig|Ich bin {{ledig}}.|I am single
verlobt|Wir sind {{verlobt}}.|We are engaged
geschieden|Maren ist {{geschieden}}.|Maren is divorced
verwitwet|Mein Opa ist {{verwitwet}}.|My grandpa is widowed
der tag|Der {{Tag}} ist lang.|The day is long
die woche|Die {{Woche}} ist lang.|The week is long
der name|Mein {{Name}} ist Lena.|My name is Lena
das bier|Ich trinke ein {{Bier}}.|I am drinking a beer`.split('\n').reduce((o,l)=>{const p=l.split('|');o[p[0]]=[p[1],p[2]+(/[!?]$/.test(p[2])?'':'.')];return o},{});
function v4Fix(c){
  if(c.en)V4_EN.forEach(([a,b])=>{if(c.en.includes(a))c.en=c.en.split(a).join(b)});
  if(c.exEn)V4_EN.forEach(([a,b])=>{if(c.exEn.includes(a))c.exEn=c.exEn.split(a).join(b)});
  if(c.type==='g')return;
  if(c.art&&v4IsSentence(c.de)){c.de=c.art[0].toUpperCase()+c.art.slice(1)+' '+c.de;c.art=''}
  const k=((c.art?c.art+' ':'')+c.de).toLowerCase();
  if(!c.pl&&V4_PL[k])c.pl=V4_PL[k];
  if(!c.ex&&V4_EX[k]){c.ex=V4_EX[k][0];c.exEn=V4_EX[k][1]}
}
function v4Rules(){S.rules.forEach(r=>{if(r.text.includes('Er arbeitet als Friseurin'))r.text=r.text.replace('Er arbeitet als Friseurin','Er arbeitet als Friseur')})}
/* one card that is too long must never stop the whole sync: same limits as backend/src/validate.js */
const V4_MAX={lesson:80,date:10,de:120,art:3,pl:60,forms:120,en:200,ex:300,exEn:300,note:300,sentence:300,topic:80,hint:200};
function v4Wire(w){for(const k in V4_MAX)if(typeof w[k]==='string'&&w[k].length>V4_MAX[k])w[k]=w[k].slice(0,V4_MAX[k]);return w}

/* ---- 3. feedback: why it was wrong, and what to look at again ---- */
const V4_ART_TIPS=[[/(ung|heit|keit|schaft|ion|tät)$/i,'die','The ending decides: -ung, -heit, -keit, -schaft, -ion, -tät are die.','Die Endung entscheidet: -ung, -heit, -keit, -schaft, -ion, -tät sind die.'],[/in$/,'die','-in marks a woman: always die.','-in steht für eine Frau: immer die.'],[/(chen|lein)$/,'das','-chen and -lein are always das.','-chen und -lein sind immer das.'],[/e$/,'die','Most nouns ending in -e are die.','Die meisten Nomen auf -e sind die.'],[/^Ge/,'das','Most nouns starting with Ge- are das.','Die meisten Nomen mit Ge- sind das.'],[/o$/,'das','Most nouns ending in -o are das.','Die meisten Nomen auf -o sind das.'],[/tag$/i,'der','Days are always der.','Tage sind immer der.']];
function v4ArtTip(c){const t=V4_ART_TIPS.find(x=>x[0].test(c.de)&&x[1]===c.art);return t?tx(t[2],t[3]):''}
function v4Info(it,res,info){
  if(res==='bad'&&it&&it.kind==='art'&&!info.note){const c=byId(it.cid),t=c&&v4ArtTip(c);if(t)return Object.assign({},info,{note:t})}
  return info;
}
function v4Miss(cid){if(ses&&cid){(ses.missed||(ses.missed=new Set())).add(cid)}}
function v4MissCard(){
  const m=ses&&ses.missed;if(!m||!m.size)return '';
  const rows=[...m].slice(0,6).map(id=>S.cards.find(c=>c.id===id)).filter(Boolean).map(c=>`<li><b>${isG(c)?esc(plain(c.sentence)):fmtDe(c)}</b><span>${esc(c.en)}</span></li>`).join('');
  return rows?`<div class="v4-miss"><h3>${tx('Look at these again','Schau dir das nochmal an')}</h3><ul>${rows}</ul>${m.size>6?`<p class="sub">+${m.size-6} ${tx('more','weitere')}</p>`:''}</div>`:'';
}

/* ---- 4. new question types ---- */
/* choose what a person would really answer. g groups replies that could both fit, so they are never each other's wrong option. */
const V4_REPLY=[
  ['hi','Greetings & polite phrases','Wie geht es dir?','How are you?','Gut, danke. Und dir?','Good, thanks. And you?'],
  ['from','Countries & languages','Woher kommst du?','Where are you from?','Ich komme aus Spanien.','I come from Spain.'],
  ['lang','Countries & languages','Welche Sprachen sprichst du?','Which languages do you speak?','Ich spreche Deutsch und Englisch.','I speak German and English.'],
  ['name','Introductions & names','Wie heißt du?','What is your name?','Ich heiße Lena.','My name is Lena.'],
  ['job','Jobs & work','Was machst du beruflich?','What do you do for a living?','Ich arbeite als Lehrerin.','I work as a teacher.'],
  ['who','Questions & answers','Wer ist das?','Who is that?','Das ist mein Bruder.','That is my brother.'],
  ['neg','Questions & answers','Wohnst du nicht in Berlin?','Do you not live in Berlin?','Doch, ich wohne in Berlin.','Yes, I do live in Berlin.'],
  ['age','Personal details','Wie alt bist du?','How old are you?','Ich bin 28 Jahre alt.','I am 28 years old.'],
  ['live','Personal details','Wo wohnst du?','Where do you live?','Ich wohne in Hamburg.','I live in Hamburg.'],
  ['price','Describing & prices','Wie viel kostet der Stuhl?','How much does the chair cost?','Er kostet 59 Euro.','It costs 59 euros.'],
  ['opin','Describing & prices','Wie findest du das Bild?','What do you think of the picture?','Ich finde es schön.','I think it is beautiful.'],
  ['thx','Asking & thanking','Vielen Dank!','Thank you very much!','Bitte schön.','You are welcome.'],
  ['tel','Phone calls at the office','Ist Frau Müller da?','Is Ms Müller there?','Einen Moment bitte.','One moment, please.'],
  ['can','Can you help? (everyday)','Kannst du mir helfen?','Can you help me?','Ja, sehr gern.','Yes, with pleasure.'],
  ['can','Hobbies & activities','Kannst du schwimmen?','Can you swim?','Ja, aber nicht so gut.','Yes, but not so well.'],
  ['free','Talking about your free time','Was machst du gern?','What do you like to do?','Ich spiele gern Tennis.','I like playing tennis.'],
  ['oft','Time words: when? how often?','Wie oft gehst du ins Kino?','How often do you go to the cinema?','Ich gehe oft ins Kino.','I often go to the cinema.'],
  ['time','Telling time: official (24 hours)','Wie spät ist es?','What time is it?','Es ist drei Uhr.','It is three o’clock.'],
  ['at','Telling time: everyday (12 hours)','Um wie viel Uhr gehst du ins Kino?','At what time do you go to the cinema?','Um viertel nach sieben.','At a quarter past seven.'],
  ['eat','Table talk','Was isst du gern zum Frühstück?','What do you like to eat for breakfast?','Ich esse gern Brot mit Käse.','I like eating bread with cheese.'],
  ['eat','Table talk','Was trinkst du gern?','What do you like to drink?','Ich trinke gern Kaffee mit Milch.','I like drinking coffee with milk.'],
  ['like','Liking and agreeing','Ich mag Schokolade.','I like chocolate.','Ich auch!','Me too!'],
  ['dislike','Liking and agreeing','Ich mag keinen Fisch.','I do not like fish.','Ich auch nicht!','Me neither!'],
  ['plan','Making plans','Gehen wir ins Kino?','Shall we go to the cinema?','Oh ja! Gute Idee.','Oh yes! Good idea.'],
  ['late','Making plans','Um acht Uhr?','At eight o’clock?','Nein, das ist zu spät.','No, that is too late.']
];
R.reply=it=>{
  const r=V4_REPLY[it.r],rk=qvUnitRank();
  const wrong=shuffle(V4_REPLY.filter(x=>x[0]!==r[0]&&rk[x[1]]!==undefined)).slice(0,3).map(x=>x[4]);
  const opts=shuffle([r[4],...wrong]).map(v=>({v,html:esc(v)}));
  askChoice(it,{tag:tx('What do you say?','Was sagst du?'),color:'sky',q:`<div class="qx-say">${esc(r[2])} ${speakBtn(r[2])}</div>`,sub:esc(r[3]),opts,correct:r[4],info:{answer:esc(r[4]),say:r[4],ex:esc(r[5])}});
  if(canSpeak())setTimeout(()=>speak(r[2]),250);
};
const V4_H=['zwölf','eins','zwei','drei','vier','fünf','sechs','sieben','acht','neun','zehn','elf'];
function v4Time(h,m){
  const a=V4_H[h%12],b=V4_H[(h+1)%12];
  return{0:(h%12===1?'ein':a)+' Uhr',5:'fünf nach '+a,10:'zehn nach '+a,15:'viertel nach '+a,25:'fünf vor halb '+b,30:'halb '+b,35:'fünf nach halb '+b,45:'viertel vor '+b,50:'zehn vor '+b,55:'fünf vor '+b}[m];
}
function v4Clock(h,m){
  const pt=(deg,r)=>{const t=(deg-90)*Math.PI/180;return `${(50+r*Math.cos(t)).toFixed(1)} ${(50+r*Math.sin(t)).toFixed(1)}`};
  const ticks=Array.from({length:12},(_,i)=>`<path d="M${pt(i*30,44)}L${pt(i*30,i%3?40:36)}"/>`).join('');
  return `<svg class="v4-clock" viewBox="0 0 100 100" role="img" aria-label="${h%12||12}:${String(m).padStart(2,'0')}"><rect x="2" y="2" width="96" height="96"/><g class="t">${ticks}</g><path class="h" d="M50 50L${pt((h%12)*30+m/2,24)}"/><path class="m" d="M50 50L${pt(m*6,36)}"/><rect class="c" x="47" y="47" width="6" height="6"/></svg>`;
}
R.clock=it=>{
  const{h,m}=it,right=v4Time(h,m);
  /* the classic trap comes first: halb counts to the NEXT hour */
  const traps=[v4Time(h-1,m),v4Time(h+1,m),v4Time(h,(m+30)%60)].filter(Boolean),more=[0,15,30,45,25,35,50,55].map(x=>v4Time(h,x));
  const wrong=[...new Set([...traps,...shuffle(more)])].filter(x=>x&&x!==right).slice(0,3);
  askChoice(it,{tag:tx('Read the clock','Lies die Uhr'),color:'lantern',q:v4Clock(h,m),sub:tx('Wie spät ist es?','Wie spät ist es?'),opts:shuffle([right,...wrong]).map(v=>({v,html:esc(v)})),correct:right,
    info:{answer:esc(right),say:'Es ist '+right,note:m===30||m===25||m===35?tx('halb counts to the NEXT hour.','halb zählt zur NÄCHSTEN Stunde.'):''}});
};
function v4ClockItems(k){return shuffle([[3,15],[4,30],[7,45],[9,25],[10,35],[1,50],[6,55],[2,0],[8,30],[11,15],[5,45],[12,30]]).slice(0,k).map(([h,m])=>({kind:'clock',h:m>=25?h-1:h,m}))}
/* levels 3 to 5 and checkpoints: real answers and the clock, for lessons you have already reached */
function v4Extra(n,list){
  if(n.kind==='g'||(n.kind==='w'&&n.lv<3))return list;
  const rk=qvUnitRank(),st=rdStats(),add=[];
  const open=V4_REPLY.map((r,i)=>i).filter(i=>rk[V4_REPLY[i][1]]!==undefined&&rk[V4_REPLY[i][1]]<=n.unit);
  shuffle(open).sort((a,b)=>(st.pcy['rp'+a]||0)-(st.pcy['rp'+b]||0)).slice(0,n.kind==='r'?2:1).forEach(i=>{st.pcy['rp'+i]=(st.pcy['rp'+i]||0)+1;add.push({kind:'reply',r:i})});
  const tu=rk['Telling time: everyday (12 hours)'];
  if(tu!==undefined&&tu<=n.unit&&(n.unit===tu||n.kind==='r'))add.push(...v4ClockItems(n.unit===tu?2:1));
  const out=list.slice();add.forEach(x=>out.splice(rnd(out.length+1),0,x));
  return out;
}

/* ---- 5. questions never hand out free points and never freeze the session ---- */
/* England = England asks nothing: the same word is practised in a sentence or by its article instead */
const v4Same=c=>{if(!c||isG(c))return false;const e=String(c.en).toLowerCase().split(/[\/(]/)[0].replace(/^(the|to|an?)\s+/,'').trim();return e===c.de.toLowerCase().trim()};
['mc1','mc2','tf'].forEach(k=>{const f=R[k];R[k]=it=>{const c=byId(it.cid);if(v4Same(c)){if(sentenceOf(c))return R.drag(it);if(c.art)return R.art(it)}return f(it)}});
{const f=R.cloze;R.cloze=it=>{const c=byId(it.cid);if(c&&clozeOf(c))return f(it);if(c&&sentenceOf(c))return R.drag(it);return R.mc2(it)}}
Object.keys(R).forEach(k=>{const f=R[k];R[k]=Object.assign(it=>{try{return f(it)}catch(e){try{console.error('question failed',k,e)}catch(x){}if(ses&&ses.items&&ses.items[ses.i]===it){ses.items.splice(ses.i,1);ses.locked=false;next()}}},{__qv:1})});

const V4_STAGE={'Street football: jackets for goalposts. You are just starting.':'Straßenfußball: Jacken als Torpfosten. Du fängst gerade an.','A courtyard tournament with the neighbours.':'Ein Hofturnier mit den Nachbarn.','Weekend games in the park, teams picked on the spot.':'Spiele im Park am Wochenende, Teams werden spontan gewählt.','Sunday league: real shirts, real referee.':'Sonntagsliga: echte Trikots, echter Schiri.','Your first club. Muddy pitches, big heart.':'Dein erster Verein. Matschige Plätze, großes Herz.','Climbing the local pyramid.':'Du kletterst die lokale Pyramide hinauf.','Top of the district. The scouts start to notice.':'Spitze im Bezirk. Die Scouts werden aufmerksam.','A proper amateur league with a proper table.':'Eine richtige Amateurliga mit richtiger Tabelle.','State level. Away trips by minibus.':'Landesebene. Auswärtsfahrten im Kleinbus.','Semi-pro football. Training four times a week.':'Halbprofis. Viermal Training pro Woche.','One step from the professional game.':'Ein Schritt vor dem Profifußball.','You fight for a place in the cup draw.':'Du kämpfst um einen Platz in der Auslosung.','The cup draw: a big club away from home.':'Die Auslosung: ein großer Verein auswärts.','Giant killer. The whole town travels with you.':'Pokalschreck. Die ganze Stadt fährt mit.','Last 16 of the DFB-Pokal.':'Letzte 16 im DFB-Pokal.','Quarter-final under floodlights.':'Viertelfinale unter Flutlicht.','One match from Berlin.':'Ein Spiel vor Berlin.','The final in the Olympiastadion.':'Das Finale im Olympiastadion.','Promoted. Everything is new again.':'Aufgestiegen. Alles ist wieder neu.','A solid mid-table team with a clear plan.':'Ein solides Mittelfeldteam mit klarem Plan.','Looking up at the promotion places.':'Der Blick geht zu den Aufstiegsplätzen.','Fighting for the top three.':'Kampf um die ersten drei Plätze.','Two matches for the Bundesliga.':'Zwei Spiele um die Bundesliga.','Welcome to the big stage.':'Willkommen auf der großen Bühne.','A comfortable mid-tier team: safe, respected.':'Ein sicheres Mittelfeldteam: ungefährdet und respektiert.','Pushing for a European place.':'Du drängst auf einen Europapokalplatz.','You are building a championship squad.':'Du baust einen Meisterkader auf.','Top of the table in the spring.':'Tabellenführer im Frühling.','Champions of Germany.':'Deutscher Meister.','Europa League: first European nights.':'Europa League: erste Europapokalnächte.','Knockout football.':'K.-o.-Fußball.','Last 16 in Europe.':'Letzte 16 in Europa.','Two legs from the final.':'Zwei Spiele vor dem Finale.','A European final.':'Ein Europapokalfinale.','The Champions League doors open.':'Die Türen zur Champions League gehen auf.','The anthem. The stars. The pressure.':'Die Hymne. Die Stars. Der Druck.','One slip and it is over.':'Ein Fehler, und es ist vorbei.','The best eight in Europe.':'Die besten acht Europas.','A night nobody forgets.':'Eine Nacht, die niemand vergisst.','The final.':'Das Finale.','A legend of the game.':'Eine Legende des Spiels.'};
const v4Stage=d=>isDe()&&V4_STAGE[d]||d;

/* ---- 6. toasts stack instead of covering each other ---- */
function toast(m){
  let w=document.getElementById('toasts');
  if(!w){w=document.createElement('div');w.id='toasts';w.setAttribute('role','status');document.body.appendChild(w)}
  while(w.children.length>=3)w.firstChild.remove();
  const t=document.createElement('div');t.className='toast';t.textContent=m;w.appendChild(t);setTimeout(()=>t.remove(),2700);
}

/* ---- training: solid club-colour leader tiles, like the stats pages ---- */
function vArcade(){
  const ids=Object.keys(GAMES),f=featuredId(),sc=scopeInfo();
  const opts=[['',tx('In training scope','Im Trainingsumfang')+' ('+sc.n+'/'+sc.total+')'],...lessonList().map(l=>[l.name,l.name])].map(([v,t])=>`<option value="${esc(v)}" ${arc.lesson===v?'selected':''}>${esc(t)}</option>`).join('');
  const gc=id=>{const g=GAMES[id],s=S.games[id]||{},req=gameReq(id,arc.lesson);
    return `<button class="v4-g ${g.col||''} ${req?'off':''}" data-a="game" data-id="${id}" ${req?'data-lock="1"':''} aria-label="${esc(g.n)}: ${esc(req||g.tag)}"><span class="n">${g.n}${f===id?' ×2':''}</span><span class="i">${g.ic}</span><span class="f"><span>${s.best?tx('Best','Bestwert'):tx('New','Neu')}</span>${s.best?s.best:''}</span></button>`};
  return `<div class="top"><h1 class="h1">Training</h1></div>
  <p class="sub" style="margin-bottom:8px;text-align:center">${tx('Minigames built from your own notes. Words you miss come back in your next practice.','Minispiele aus deinen eigenen Notizen. Verpasste Wörter kommen im nächsten Training wieder.')}</p>
  <select class="inp" id="arcl">${opts}</select>
  <button class="scopebtn" data-a="scope"><span><span class="kick">${tx('Training scope','Trainingsumfang')}</span><br><b>${sc.n} ${tx('of','von')} ${sc.total} ${tx('lessons active','Lektionen aktiv')}</b></span><span style="font:800 26px var(--fd)">›</span></button>
  <div class="v4-gs">${ids.map(gc).join('')}</div>
  ${f?`<p class="sub" style="text-align:center;margin-top:14px">${tx('Game of the day','Spiel des Tages')}: <b>${esc(GAMES[f].n)}</b> ${tx('gives double points.','gibt doppelte Punkte.')}</p>`:''}`;
}

/* ---- 7. the score bug: questions are a match. Minutes run with the session, you against the mistakes. ---- */
const v4Abbr=()=>{const c=clubOf(myAvatar());return c?String(c[2]).slice(0,3).toUpperCase():'KOB'};
function v4BugMount(){
  const top=document.querySelector('#ses .ses-top');
  if(!top||!ses||ses.rush||document.getElementById('v4b'))return;
  const x=top.querySelector('.x');
  x.insertAdjacentHTML('afterend',`<div class="v4b" id="v4b" role="img"><span class="v4b-m" id="v4bm">0'</span><span class="v4b-h"><i class="v4b-tk" id="v4bt">${'<u></u>'.repeat(5)}</i><small>${esc(v4Abbr())}</small><b id="v4bh">0</b></span><span class="v4b-a"><small>${tx('OPP','GEG')}</small><b id="v4ba">0</b></span></div>`);
  document.getElementById('ses').classList.add('v4-bug');
}
function v4Bug(){
  const b=document.getElementById('v4b');if(!b||!ses||!ses.items)return;
  const n=Math.max(1,ses.items.length),min=Math.min(90,Math.round(ses.i/n*90)),h=ses.correct|0,a=ses.wrong|0;
  document.getElementById('v4bm').textContent=min+"'";
  const hE=document.getElementById('v4bh'),aE=document.getElementById('v4ba');
  if(hE.textContent!==String(h)){hE.textContent=h;hE.classList.remove('hit');void hE.offsetWidth;hE.classList.add('hit')}
  if(aE.textContent!==String(a)){aE.textContent=a;aE.classList.remove('hit');void aE.offsetWidth;aE.classList.add('hit')}
  b.setAttribute('aria-label',`${min}. ${tx('minute','Minute')}, ${h} : ${a}`);
  const on=Math.min(5,ses.combo|0);[...document.getElementById('v4bt').children].forEach((u,i)=>u.classList.toggle('on',i<on));
}
/* full time: the same bug, large, opens the result screen */
function v4FullTime(){
  if(!ses||ses.rush||!((ses.correct|0)+(ses.wrong|0)))return '';
  return `<div class="v4-ft"><div class="v4-ft-k">${tx('Full time','Abpfiff')}</div><div class="v4-ft-b"><span class="h"><small>${esc(v4Abbr())}</small><b>${ses.correct|0}</b></span><span class="a"><small>${tx('OPP','GEG')}</small><b>${ses.wrong|0}</b></span></div></div>`;
}
