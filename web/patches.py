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
_CL = "const CHANGELOG={v:'3.0.0',title:{en:'Kobel 3.0.0: new design, celebrations, Play-Off and club crests',de:'Kobel 3.0.0: neues Design, Feiern, Play-off und Vereinswappen'},body:{\n  en:'Big update. New: the real club crests and stadium icons (pick one of the 18 clubs of the 2026/27 season), lessons from session 11 (accusative and office phone calls), a full redesign after the Bundesliga website and app (top bar, club banner in your colours, ticker, standings tables, fixture rows, stat tiles), celebration screens for promotion, streaks, levels, daily goals, matchdays and path levels, and a Play-Off: when your streak is about to break you can win it back with one very hard typed question. Also: lessons from sessions 7 to 10 (big numbers, colours, objects, office and plurals), new Tactics Room units, redesigned home-screen widgets with charts, a Learning Path from easy to hard, new exercises (drag-and-drop blocks, article sorting, true/false, matching), a Friends tab with study groups, shared streaks and phone notifications, Bundesliga club badges as your avatar with your club colours in tables and scorebugs, and matches that end like football scores.',\n  de:'Großes Update. Neu: die echten Vereinswappen und Stadion-Symbole (wähle einen der 18 Vereine der Saison 2026/27), Lektionen aus Sitzung 11 (Akkusativ und Telefonieren im Büro), neues Design nach der Bundesliga-Website und -App (Kopfleiste, Vereinsbanner in deinen Farben, Ticker, Tabellen, Spielplan-Zeilen, Statistik-Kacheln), Feierbildschirme für Aufstieg, Serien, Level, Tagesziele, Spieltage und Pfad-Stufen und ein Play-off: Wenn deine Serie zu reißen droht, kannst du sie mit einer sehr schweren getippten Frage zurückgewinnen. Außerdem: Lektionen aus den Sitzungen 7 bis 10 (große Zahlen, Farben, Dinge, Büro und Plural), neue Taktikraum-Einheiten, neu gestaltete Widgets mit Diagrammen, ein Lernpfad von leicht bis schwer, neue Übungen (Wortblöcke ziehen, Artikel sortieren, Richtig/Falsch, Zuordnen), ein Freunde-Tab mit Lerngruppen, gemeinsamen Serien und Handy-Benachrichtigungen, Bundesliga-Vereinswappen als Avatar mit deinen Vereinsfarben in Tabellen und Anzeigetafeln und Spiele, die wie Fußballergebnisse enden.'}};\n"
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
if "window.__k={" in src and "celebrate,streakRisk" not in src: src = src.replace("window.__k={", "window.__k={celebrate,streakRisk,poOpen,poBuild,PO,b3Banner,addXP,render,curStreak,", 1)
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
src = sub(src, "      L.stg=st.i;save();\n", "      celebrate({k:'stage',n:STAGES[st.i].n,d:STAGES[st.i].d,ti:STAGES[st.i].ti},700);L.stg=st.i;save();\n")
src = sub(src, "  L.md++;L.mdStart=weekStart(a+7*DAY+6*36e5);", "  celebrate({k:'md',n:L.md+1,res,tore,days,d:delta},1200);\n  L.md++;L.mdStart=weekStart(a+7*DAY+6*36e5);")
src = sub(src, "  ...B3_ACTIONS,\n", "  ...B3_ACTIONS,\n  ...PO_ACTIONS,\n")
src = sub(src, "setTimeout(newsSheet,900);", "setTimeout(newsSheet,900);setTimeout(poAsk,2800);")
src = sub(src, "if(settle()){render();newsSheet()}}", "if(settle()){render();newsSheet()}setTimeout(poAsk,1200)}")
src = sub(src, "toast('Quest done: +15 points')", "b3Banner('✓',tx('Quest done','Aufgabe erledigt'),'+15 '+tx('points','Punkte'))")
src = sub(src, "setTimeout(()=>toast('Quest bonus: +40 points'),900)", "setTimeout(()=>b3Banner('★',tx('All quests done','Alle Aufgaben erledigt'),'+40 '+tx('points','Punkte')),1500)")
src = sub(src, "const APP_VER='2.4.0';", "const APP_VER='3.0.0';")
