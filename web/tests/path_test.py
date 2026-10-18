import asyncio, sys, json
from playwright.async_api import async_playwright
URL='file:///home/claude/kobel/android/app/src/main/assets/www/index.html#debug'
async def boot(p,w=390,h=800):
    b=await p.chromium.launch()
    pg=await b.new_page(viewport={'width':w,'height':h},has_touch=True)
    errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)))
    await pg.goto(URL);await pg.wait_for_timeout(700)
    await pg.evaluate("[...document.querySelectorAll('button')].filter(b=>/kick off/i.test(b.textContent)).forEach(b=>b.click())")
    await pg.wait_for_timeout(500)
    await pg.evaluate("document.querySelectorAll('#sheet .bk').forEach(e=>e.click())")
    return b,pg,errs
async def main():
    async with async_playwright() as p:
        b,pg,errs=await boot(p)
        await pg.evaluate("document.querySelector('[data-k=path]').click()");await pg.wait_for_timeout(400)
        await pg.screenshot(path='/tmp/claude-0/p1.png')
        # levels 1..5 of first chapter: items build
        info=await pg.evaluate("""()=>{const k=window.__k,st=k.pathState();return st.nodes.slice(0,5).map(n=>({lv:n.lv,items:k.pathBuild(n).map(i=>i.kind).join(',')}))}""")
        for i in info:print(i)
        print('errs',errs)
        await b.close()
if __name__=="__main__":
    asyncio.run(main())
