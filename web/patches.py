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
_CL = "const CHANGELOG={v:'2.5.0',title:{en:'Kobel 2.5.0: Friends tab, study groups and club colours',de:'Kobel 2.5.0: Freunde-Tab, Lerngruppen und Vereinsfarben'},body:{\n  en:'New: lessons from sessions 7 to 10 (big numbers, colours, objects, office and plurals), new Tactics Room units, redesigned home-screen widgets with charts, a Learning Path from easy to hard, new exercises (drag-and-drop blocks, article sorting, true/false, matching), a Friends tab with study groups, shared streaks and phone notifications, Bundesliga club badges as your avatar with your club colours in tables and scorebugs, and matches that end like football scores.',\n  de:'Neu: Lektionen aus den Sitzungen 7 bis 10 (große Zahlen, Farben, Dinge, Büro und Plural), neue Taktikraum-Einheiten, neu gestaltete Widgets mit Diagrammen, ein Lernpfad von leicht bis schwer, neue Übungen (Wortblöcke ziehen, Artikel sortieren, Richtig/Falsch, Zuordnen), ein Freunde-Tab mit Lerngruppen, gemeinsamen Serien und Handy-Benachrichtigungen, Bundesliga-Vereinswappen als Avatar mit deinen Vereinsfarben in Tabellen und Anzeigetafeln und Spiele, die wie Fußballergebnisse enden.'}};\n"
if _re.search(r"const CHANGELOG=\{v:'2\.[45]\.0'", src):
    src = _re.sub(r"const CHANGELOG=\{v:'2\.[45]\.0'.*?\}\};\n", lambda m: _CL, src, count=1, flags=_re.S)

# ---- Sessions 7-10 and the Tactics Room list (classroom instructions are excluded from path and teaching) ----
src = sub(src, "const BATCHES=[SEED,N4,N5,N6];", "const BATCHES=[SEED,N4,N5,N6,N7,N9,N10];")
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
src = sub(src, "next,openOverlay,R:()=>R,pathState,", "next,openOverlay,R:()=>R,widgetData,pathState,")
