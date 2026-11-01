"""Renders every question of every path level and fails on a crash, a missing answer or duplicate options.
Needs Playwright and a local Chrome: pip install playwright, then python web/tests/walk_test.py [rounds]"""
import asyncio, json, pathlib, sys
from playwright.async_api import async_playwright
WWW = pathlib.Path(__file__).resolve().parents[2] / 'android/app/src/main/assets/www'
HOOK = """()=>{window.__log=[];window.__ac=(it,c)=>window.__log.push({v:c.opts.map(o=>String(o.v)),h:c.opts.map(o=>String(o.html).replace(/<[^>]+>/g,' ').trim().toLowerCase()),ok:String(c.correct)})}"""
WALK = """async rounds=>{const k=window.__k,st=k.pathState(),bad=[],n0={q:0};
  for(let r=0;r<rounds;r++)for(const n of st.nodes){
    const items=k.pathBuild(n);
    k.setSes({mode:'path',path:true,pathKey:n.key,pathIdx:n.i,pathLv:n.lv,pathKind:n.kind,lesson:'',opt:{},items,i:0,correct:0,wrong:0,xp:0,combo:0,maxCombo:0,graded:new Set(),t0:Date.now(),learned:0,locked:false,lastKind:'',startLvl:1});
    k.openOverlay();
    for(let j=0;j<items.length;j++){const it=items[j],s=k.ses();s.i=j;s.locked=false;s.cur=it;window.__log.length=0;n0.q++;
      const f=console.error;let failed='';console.error=(...a)=>{failed=a.join(' ')};
      k.R()[it.kind](it);console.error=f;
      if(failed)bad.push([n.key,it.kind,failed.slice(0,120)]);
      const L=window.__log[window.__log.length-1];
      if(L&&!L.v.includes(L.ok))bad.push([n.key,it.kind,'answer not offered: '+L.ok]);
      if(L&&new Set(L.h).size<L.h.length)bad.push([n.key,it.kind,'same option twice: '+L.h.join(' | ')]);
      if(items.length!==k.ses().items.length)break}
    document.querySelector('#ses').remove();k.setSes(null)}
  return{nodes:st.nodes.length,questions:n0.q,bad}}"""
async def main(rounds):
    html = (WWW / 'index.html').read_text(encoding='utf-8').replace('function askChoice(it,cfg){', 'function askChoice(it,cfg){if(window.__ac)window.__ac(it,cfg);').replace('<head>', '<head><base href="' + WWW.as_uri() + '/">', 1)
    tmp = pathlib.Path(__file__).with_name('_walk.html')
    tmp.write_text(html, encoding='utf-8')
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(channel='chrome')
            pg = await b.new_page(viewport={'width': 390, 'height': 844})
            errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto(tmp.as_uri() + '#debug')
            await pg.wait_for_timeout(800)
            await pg.evaluate("[...document.querySelectorAll('button')].filter(b=>/kick off/i.test(b.textContent)).forEach(b=>b.click())")
            await pg.wait_for_timeout(300)
            await pg.evaluate("window.__k.S().settings.tts=false")
            await pg.evaluate(HOOK)
            r = await pg.evaluate(WALK, rounds)
            await b.close()
    finally:
        tmp.unlink(missing_ok=True)
    print(r['nodes'], 'levels,', r['questions'], 'questions,', len(r['bad']), 'problems,', len(errs), 'page errors')
    for x in r['bad'][:20]: print(json.dumps(x, ensure_ascii=False))
    for e in errs[:5]: print(e)
    sys.exit(1 if r['bad'] or errs else 0)
if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    asyncio.run(main(int(sys.argv[1]) if len(sys.argv) > 1 else 3))
