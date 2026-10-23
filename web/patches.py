# small in-place patches (idempotent): each sub() is skipped when already applied
src = sub(src, "return ses.exam?finishExam():ses.arcade?finishArcade():finish();", "return ses.exam?finishExam():ses.arcade?finishArcade():ses.path?finishPath():finish();")
if "path:vPath" not in src: src = sub(src, "teach:vTeach,settings:vSet", "teach:vTeach,path:vPath,settings:vSet")
src = sub(src, "['arcade','Training',ICON.game],", "['path','Pfad',ICON.path],['arcade','Training',ICON.game],")
src = sub(src, "  ...SOCIAL_ACTIONS,\n", "  ...SOCIAL_ACTIONS,\n  ...PATH_ACTIONS,\n")
src = sub(src, '''    <button class="btn shine" data-a="start" data-mode="mix" data-lesson="">Training starten</button></div></div>''',
 '''    <button class="btn shine" data-a="pathgo">${pathHeroLabel()}</button><button class="btn ghost" style="margin-top:10px" data-a="start" data-mode="mix" data-lesson="">Training starten</button></div></div>''')
src = sub(src, '''  <button class="btn shine" data-a="start" data-mode="mix" data-lesson="">${tx('Start''',
 '''  <button class="btn shine" data-a="pathgo">${pathHeroLabel()}</button><button class="btn ghost" style="margin-top:10px" data-a="start" data-mode="mix" data-lesson="">${tx('Start''')
if 'next,openOverlay,R:()=>R' not in src:
    src = src.replace("if(location.hash==='#debug')window.__k={", "if(location.hash==='#debug')window.__k={next,openOverlay,R:()=>R,pathState,pathStart,pathBuild,", 1)

src = sub(src, 'const I18N={', 'const I18N={"Pfad": ["Path", "Pfad"], "Noch nicht ganz": ["Not quite yet", "Noch nicht ganz"], ')

src = sub(src, '<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Barlow:wght@500;600;700&display=swap" rel="stylesheet">\n', '')
src = sub(src, "--fd:'Barlow Condensed',", "--fd:'DFL Sans Condensed','Barlow Condensed',")
src = sub(src, "--fb:'Barlow','Roboto',", "--fb:'DFL Sans','Barlow','Roboto',")

# ---- 2.5.0 ----
import re as _re
src = sub(src, "teach:vTeach,path:vPath,settings:vSet", "teach:vTeach,path:vPath,friends:vFriends,settings:vSet")
src = sub(src, "['cabinet','Vitrine'],['friends','Freunde']]", "['cabinet','Vitrine']]")
src = sub(src, "  ...PATH_ACTIONS,\n", "  ...PATH_ACTIONS,\n  ...SOCIAL25_ACTIONS,\n")
src = sub(src, "${AVATARS.map(a=>`<button class=\"avpick", "${CLUB_PICK.map(a=>`<button class=\"avpick")
src = sub(src, "<div class=\"sub\" style=\"margin:10px 0 6px\">${tx('Avatar','Avatar')}</div>", "<div class=\"sub\" style=\"margin:10px 0 6px\">${tx('Your club','Dein Verein')}</div>")
src = _re.sub(r"\$\{hasAccount\(\)\?`<label class=\"pf-vis\">.*?</label>`:''\}", "", src, count=1, flags=_re.S)
src = sub(src, "<div class=\"set\"><span>Skin</span>${seg('skin',['bl','clean'],['Bundesliga','Clean'])}</div>", "${notifyCard()}")
src = sub(src, "home:()=>S.settings.skin==='clean'?vHomeClean():vHome()", "home:vHome")
src = sub(src, "function render(){\n  settle();careerCheck();", "function render(){\n  settle();careerCheck();applyClub();")
src = sub(src, "soLoad(true);if(tab==='stats')render()}", "soLoad(true);if(tab==='stats'||tab==='friends')render()}")
_CL = "const CHANGELOG={v:'3.3.1',title:{en:'Kobel 3.3.1: rules first, smoother questions',de:'Kobel 3.3.1: erst die Regeln, flüssigere Fragen'},body:{\n  en:'Rules first: every unit opens with its rules, and rule questions keep coming back so you memorise them. Letter and writing exercises are now rare, about one in 50 questions. Games no longer show blank or raw text, and the flicker between questions is fixed with lighter, smoother animations. The Path is a four-stage roadmap from first words to confident sentences. Every unit now ends with a review checkpoint, words and sentences rotate through the whole path instead of repeating, writing exercises are capped at about 12% and use short words, and wrong answers in multiple choice are now close to the right one in length, type and form.',\n  de:'Erst die Regeln: jede Einheit beginnt mit ihren Regeln, und Regelfragen kommen immer wieder, damit du sie dir merkst. Buchstaben- und Schreibaufgaben sind jetzt selten, etwa jede 50. Frage. Spiele zeigen keine leeren Seiten oder rohen Text mehr, und das Flackern zwischen Fragen ist mit leichteren, flüssigeren Animationen behoben. Der Pfad ist jetzt ein Lernweg in vier Stufen, von den ersten Wörtern bis zu sicheren Sätzen. Jede Einheit endet mit einem Rückblick, Wörter und Sätze wechseln sich über den ganzen Pfad ab statt sich zu wiederholen, Schreibaufgaben machen höchstens etwa 12% aus und nutzen kurze Wörter, und falsche Antworten sind der richtigen jetzt in Länge, Art und Form ähnlich.'\n}};\n"
if _re.search(r"const CHANGELOG=\{v:'[23]\.[0-9]\.0'", src):
    src = _re.sub(r"const CHANGELOG=\{v:'[23]\.[0-9]\.0'.*?\}\};\n", lambda m: _CL, src, count=1, flags=_re.S)

# ---- Sessions 7-10 and the Tactics Room list (classroom instructions are excluded from path and teaching) ----
import re as _re0
src = _re0.sub(r"const BATCHES=\[[^\]]*\];", "const BATCHES=[SEED,N4,N5,N6,N7,N9,N10,N11];", src, count=1)
import json as _json
_units = _json.load(open(ROOT.parent / 'database/content/teaching/units.json', encoding='utf-8'))
_line = 'const TEACH=' + _json.dumps(_units, ensure_ascii=False) + ';'
_m = _re.search(r'^const TEACH=\[.*\];$', src, flags=_re.M)
if not _m: sys.exit('TEACH line missing')
src = src[:_m.start()] + _line + src[_m.end():]

# ---- widgets 2.5: extra numbers for the drawn widgets (week XP, 35-day activity, review forecast, squad counts, matchday) ----
if 'function widgetExtra()' not in src:
    src = sub(src, "function pushWidgets(){", """function widgetExtra(){
  const now=Date.now(),dow=(new Date().getDay()+6)%7,mon=now-dow*DAY,p=mdProgress(),cnt={n:0,l:0,y:0,m:0},key={new:'n',learning:'l',young:'y',mastered:'m'};
  WALL().forEach(c=>{cnt[key[stateOf(c)]]++});
  const lvl=x=>x<=0?0:x<40?1:x<100?2:3;
  return{xp7:WK.map((_,i)=>{const d=S.stats.days[dkey(mon+i*DAY)];return d?Math.round(d.xp):0}),
    heat:Array.from({length:35},(_,i)=>{const d=S.stats.days[dkey(now-(34-i)*DAY)];return lvl(d?d.xp:0)}),
    fc:Array.from({length:7},(_,i)=>{const a=dkeyStart(now+i*DAY),b=a+DAY;return S.cards.filter(c=>c.srs&&c.srs.seen>0&&(i===0?c.srs.due<b:c.srs.due>=a&&c.srs.due<b)).length}),
    cnt,mdp:{tore:p.tore,target:p.target,days:p.days,need:p.need,left:p.left}};
}
function pushWidgets(){""")
src = sub(src, "lang:S.settings.lang,week:WK.map(", "...widgetExtra(),lang:S.settings.lang,week:WK.map(")
if "window.__k={" in src and "celebrate,streakRisk" not in src: src = src.replace("window.__k={", "window.__k={stageIco,celebrate,streakRisk,poOpen,poBuild,PO,b3Banner,addXP,render,curStreak,", 1)
if "poBuild,PO," not in src: src = src.replace("celebrate,streakRisk,poOpen,poBuild,", "celebrate,streakRisk,poOpen,poBuild,PO,", 1)

# ---- 3.0 ----
src = sub(src, "  ...SOCIAL25_ACTIONS,\n", "  ...SOCIAL25_ACTIONS,\n  ...B3_ACTIONS,\n")

# ---- 3.0: celebrations + streak play-off wiring ----
src = sub(src, "function addXP(n,answers=0){\n  const st=S.stats,t=dkey(),r={};",
 "function addXP(n,answers=0){const _b=b3Snap(),r=addXP0(n,answers);b3Queue(r,_b);return r}\nfunction addXP0(n,answers=0){\n  const st=S.stats,t=dkey(),r={};")
src = sub(src, "    if(st.last&&gap===1)st.streak++;\n    else if(gap===2&&st.freezes>0)",
 "    if(st.last&&gap===1)st.streak++;\n    else if(gap===2&&st.saveTok&&st.saveTok.day===t){st.streak++;r.usedPlayoff=true}\n    else if(gap===2&&st.freezes>0)")
src = sub(src, "return g<=1||(g===2&&st.freezes>0)?st.streak:0}", "return g<=1||(g===2&&(st.freezes>0||(st.saveTok&&st.saveTok.day===dkey())))?st.streak:0}")
src = sub(src, "    const L=LS();if(!L.ob)L.ob={};\n    const lp=lpNow(),st=stageNow(lp);", "    const L=LS();if(!L.ob)L.ob={};\n    const lp=lpNow(),st=stageNow(lp);b3ZoneCheck();")
src = sub(src, "      L.stg=st.i;save();\n", "      celebrate({k:'stage',n:STAGES[st.i].n,d:STAGES[st.i].d,ti:STAGES[st.i].ti,i:st.i},700);L.stg=st.i;save();\n")
src = sub(src, "  L.md++;L.mdStart=weekStart(a+7*DAY+6*36e5);", "  celebrate({k:'md',n:L.md+1,res,tore,days,d:delta},1200);\n  L.md++;L.mdStart=weekStart(a+7*DAY+6*36e5);")
src = sub(src, "  ...B3_ACTIONS,\n", "  ...B3_ACTIONS,\n  ...PO_ACTIONS,\n")
src = sub(src, "setTimeout(newsSheet,900);", "setTimeout(newsSheet,900);setTimeout(poAsk,2800);")
src = sub(src, "if(settle()){render();newsSheet()}}", "if(settle()){render();newsSheet()}setTimeout(poAsk,1200)}")
src = sub(src, "toast('Quest done: +15 points')", "b3Banner('✓',tx('Quest done','Aufgabe erledigt'),'+15 '+tx('points','Punkte'))")
src = sub(src, "setTimeout(()=>toast('Quest bonus: +40 points'),900)", "setTimeout(()=>b3Banner('★',tx('All quests done','Alle Aufgaben erledigt'),'+40 '+tx('points','Punkte')),1500)")
src = _re.sub(r"const APP_VER='[0-9.]+';", "const APP_VER='3.3.1';", src, count=1)

# ---- 3.0: career step icons, league logos ----
src = sub(src, "return `<div class=\"stg ${st}\"><i>${st==='done'?'✓':st==='cur'?'●':''}</i><div>", "return `<div class=\"stg ${st}\"><span class=\"sico\">${stageIco(i,22)}</span><div>")
src = sub(src, "<div class=\"kick\">${tx('Your stage','Deine Stufe')} · ${esc(TIERS[ti].n)}</div><div style=\"font:800 30px/1.05 var(--fd);text-transform:uppercase\">${esc(sn.s.n)}</div>", "<div style=\"display:flex;gap:14px;align-items:center\"><span class=\"sico big\">${stageIco(sn.i,34)}</span><div><div class=\"kick\">${tx('Your stage','Deine Stufe')} · ${esc(TIERS[ti].n)}</div><div style=\"font:800 30px/1.05 var(--fd);text-transform:uppercase\">${esc(sn.s.n)}</div></div></div>")
if "widgetData,stageIco," not in src: src = src.replace("widgetData,celebrate,", "widgetData,stageIco,celebrate,", 1)

# ---- 3.1.0: question experience ----
src = sub(src, "function drawTop(){\n  if(!ses)return;", "function drawSesTop(){\n  if(!ses)return;")
src = sub(src, "function openOverlay(rush){\n  wipe();", "function openOverlay0(rush){\n  wipe();")
src = sub(src, "const setMain=h=>{const m=$('#sMain');m.innerHTML=h;m.scrollTop=0};", "const setMain0=h=>{const m=$('#sMain');m.innerHTML=h;m.scrollTop=0};")
src = sub(src, "function resolve(it,res,info={}){\n  if(ses.locked)return;ses.locked=true;", "function resolve0(it,res,info={}){\n  if(ses.locked)return;ses.locked=true;")
src = sub(src, "function resultScreen(cfg){\n  $('#prog')", "function resultScreen0(cfg){\n  $('#prog')")
src = sub(src, "const byId=id=>S.cards.find(c=>c.id===id);", "const byId=id=>QXV(S.cards.find(c=>c.id===id));")
src = sub(src, "function mk(o){\n  const base={id:o.id", "function mk(o){const c=mk0(o);try{regFix(c)}catch(e){}return c}\nfunction mk0(o){\n  const base={id:o.id")
src = sub(src, "  defaults();\n  if(!S.batch)S.batch=1;", "  defaults();\n  S.cards.forEach(c=>{try{regFix(c)}catch(e){}});\n  if(!S.batch)S.batch=1;")
_tap = "<div class=\"dl-build\" id=\"dl-build\"><em>${tx('Tap the letters','Tippe die Buchstaben')}</em></div>"
src = sub(src, _tap, "<div class=\"dl-build qx-slots\" id=\"dl-build\">${qxSlots([],it.chars.length)}</div>", 2)
src = sub(src, "if(b)b.textContent=DL.typed.join('')", "if(b)qxShow(b,DL.typed,DL.deck[DL.i].chars.length)")
src = sub(src, "if(e)e.textContent=DL.typed.join('')||''", "if(e)qxShow(e,DL.typed,DL.deck[DL.i].chars.length)")
src = sub(src, "if(b)b.textContent=P.typed.join('')", "if(b)qxShow(b,P.typed,P.deck[P.i].chars.length)")
src = sub(src, "if(e)e.textContent=P.typed.join('')||''", "if(e)qxShow(e,P.typed,P.deck[P.i].chars.length)")
if "ses:()=>ses" not in src:
    src = src.replace("next,openOverlay,R:()=>R,", "next,openOverlay,ses:()=>ses,R:()=>R,qvVary,regFix,qvRegOf,", 1)
if "{sfx,qvKind," not in src:
    src = src.replace("window.__k={", "window.__k={sfx,qvKind,", 1)

# ---- 3.1.0: tag du/Sie on every card, also when the notes are merged ----
src = sub(src, "function addParsed(p,lo){\n  let a=0,u=0,ga=0,gu=0,ra=0;", "function addParsed(p,lo){const r=addParsed0(p,lo);try{S.cards.forEach(regFix)}catch(e){}return r}\nfunction addParsed0(p,lo){\n  let a=0,u=0,ga=0,gu=0,ra=0;")
src = src.replace("qvKind,qvKind,", "qvKind,")

src = src.replace("const APP_VER='3.0.0';", "const APP_VER='3.2.0';")

# ---- 3.1.0: only real nouns in der/die/das questions ----
src = src.replace("if(id==='dash')pool=pool.filter(c=>c.art);", "if(id==='dash')pool=pool.filter(c=>c.art&&pathNoun(c));")
src = src.replace("for(const c of all.filter(c=>c.art)){if(out.length>=DECK_N)", "for(const c of all.filter(c=>c.art&&pathNoun(c))){if(out.length>=DECK_N)")
src = src.replace("for(const c of all.filter(c=>c.art)){if(out.length>=DUEL_N)", "for(const c of all.filter(c=>c.art&&pathNoun(c))){if(out.length>=DUEL_N)")

# ---- 3.2.0: new arcade games (no typing) ----
src = sub(src, "  scramble:IC('<rect x=\"3\" y=\"4\" width=\"18\" height=\"16\" rx=\"1.5\"/>",
 "  search:IC('<rect x=\"3.5\" y=\"3.5\" width=\"17\" height=\"17\" rx=\"1.5\"/><path d=\"M7 8h5M7 12h10M7 16h6\" stroke-width=\"1.6\"/>'),\n  snake:IC('<path d=\"M3 15c3-8 5 6 8-2s5 6 8-2\" stroke-width=\"1.8\"/><path d=\"M13 5l2 4M17 4l1 5\" stroke-width=\"1.6\"/>'),\n  scramble:IC('<rect x=\"3\" y=\"4\" width=\"18\" height=\"16\" rx=\"1.5\"/>")
src = sub(src, "  scramble:{n:'Aufstellung',",
 "  search:{n:'Wortsuche',ic:GICON.search,col:'fern',kind:'sess',stars:[60,100,140],tag:'Find the hidden words in the grid.',how:'Three grids. Swipe over the letters of each word, or tap the first and the last letter.'},\n  snake:{n:'Wortschlange',ic:GICON.snake,col:'berry',kind:'sess',stars:[60,100,140],tag:'Cut the snake into words.',how:'Six snakes. Tap between letters to cut a row of letters into the right words.'},\n  scramble:{n:'Aufstellung',")
src = sub(src, "    case'gap':return poolG(lesson).length>=3?null:'Needs 3+ grammar items';",
 "    case'gap':return poolG(lesson).length>=3?null:'Needs 3+ grammar items';\n    case'search':return w.filter(gmWord).length>=5?null:'Needs 5+ single words';\n    case'snake':return w.filter(gmWord).length>=3?null:'Needs 3+ single words';")
src = sub(src, "  else if(id==='echo')items=shuffle(words).slice(0,8).map(c=>({cid:c.id,kind:'listen'}));",
 "  else if(id==='echo')items=shuffle(words).slice(0,8).map(c=>({cid:c.id,kind:'listen'}));\n  else if(id==='search'){const p=shuffle(words.filter(gmWord));for(let r=0;r<3;r++){const g=p.slice(r*4,r*4+4);if(g.length>=3)items.push({kind:'wsearch',cids:g.map(c=>c.id)})}}\n  else if(id==='snake'){const p=shuffle(words.filter(gmWord));for(let r=0;r<6;r++){const g=[];for(let k=0;k<3;k++)if(p.length)g.push(p[(r*3+k)%p.length]);if(g.length>=2)items.push({kind:'snake',cids:g.map(c=>c.id)})}}")
src = src.replace("tag:'Listen, then spell what you hear.',how:'Eight words. Umlauts and ß count, but tiny typos are forgiven.'","tag:'Listen, then spell what you hear.',how:'Eight words. Tap the letters you hear, some are extra.'")

# ---- 3.2.0: Squad moves into Settings, new Profile and Settings ----
if "function vLib0(){" not in src:
    src = src.replace("function vLib(){", "function vLib0(){", 1)
src = src.replace("['arcade',tx('Training','Training')],['library',tx('Squad','Kader')],['stats'", "['arcade',tx('Training','Training')],['stats'")
src = sub(src, "  ...PO_ACTIONS,\n", "  ...PO_ACTIONS,\n  ...SET3_ACTIONS,\n")

# ---- 3.2.0: memory, bubble pop and missing-letters as Minigames ----
src = sub(src, "  scramble:IC('<rect x=\"3\" y=\"4\" width=\"18\" height=\"16\" rx=\"1.5\"/>",
 "  memo:IC('<rect x=\"3.5\" y=\"4\" width=\"7\" height=\"7.5\" rx=\"1\"/><rect x=\"13.5\" y=\"4\" width=\"7\" height=\"7.5\" rx=\"1\"/><rect x=\"3.5\" y=\"13\" width=\"7\" height=\"7.5\" rx=\"1\"/><path d=\"M15.5 17.2l2 2 3-3.6\" stroke-width=\"1.6\"/>'),\n  bubble:IC('<circle cx=\"9\" cy=\"14\" r=\"5.5\"/><circle cx=\"17\" cy=\"7\" r=\"3.2\"/><path d=\"M6.5 12.2a3 3 0 0 1 2-1.6\" stroke-width=\"1.4\"/>'),\n  scramble:IC('<rect x=\"3\" y=\"4\" width=\"18\" height=\"16\" rx=\"1.5\"/>")
src = sub(src, "  scramble:{n:'Aufstellung',",
 "  memo:{n:'Gedächtnis',ic:GICON.memo,col:'lilac',kind:'sess',stars:[60,100,140],tag:'Flip cards and find the pairs.',how:'Three boards of six pairs: a German word and its meaning. Fewer wrong flips earn more.'},\n  bubble:{n:'Blasenjagd',ic:GICON.bubble,col:'sky',kind:'sess',stars:[60,100,140],tag:'Pop the bubble with the right meaning.',how:'Six words. The right translation floats up among three wrong ones. Pop it before it leaves.'},\n  scramble:{n:'Aufstellung',")
src = sub(src, "    case'search':return w.filter(gmWord).length>=5?null:'Needs 5+ single words';",
 "    case'search':return w.filter(gmWord).length>=5?null:'Needs 5+ single words';\n    case'memo':return w.length>=6?null:'Needs 6+ words';\n    case'bubble':return w.length>=6?null:'Needs 6+ words';")
src = sub(src, "  else if(id==='search'){const p=shuffle(words.filter(gmWord));",
 "  else if(id==='memo'){const p=shuffle(words.filter(c=>String(c.de).length<=18));for(let r=0;r<3;r++){const g=p.slice(r*6,r*6+6);if(g.length>=4)items.push({kind:'memo',cids:g.map(c=>c.id)})}}\n  else if(id==='bubble'){const p=shuffle(words);for(let r=0;r<2;r++){const g=p.slice(r*6,r*6+6);if(g.length>=3)items.push({kind:'bubble',cids:g.map(c=>c.id)})}}\n  else if(id==='search'){const p=shuffle(words.filter(gmWord));")

# ---- 3.3.0: expose helpers for tests ----
if "{smartEn," not in src:
    src = src.replace("window.__k={", "window.__k={smartEn,smartDe,posOf,dxPos,pluralWrong,gapOptions,", 1)

if "dxPos," not in src.split("window.__k={",1)[1][:120]:
    src = src.replace("window.__k={smartEn,", "window.__k={dxPos,smartEn,", 1)

# roadmap: expose the planner for simulations
if "window.__k={" in src and "pathPlanStats," not in src.split("window.__k={",1)[1][:200]:
    src = src.replace("window.__k={", "window.__k={pathPlanStats,byId,rdEarlier,", 1)

# rule-first path: the old kind picker moves aside so the writing clock can wrap it
if "function pickKindOld0(" not in src:
    src = src.replace("function pickKindOld(c,mode){", "function pickKindOld0(c,mode){", 1)

if "function firstKind0(" not in src:
    src = src.replace("function firstKind(c){", "function firstKind0(c){", 1)
