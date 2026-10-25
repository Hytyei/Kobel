import asyncio,sys
sys.path.insert(0,'/home/claude/kobel/web/tests')
from playwright.async_api import async_playwright
from path_test import boot
async def main():
    async with async_playwright() as p:
        b,pg,errs=await boot(p)
        await pg.evaluate("window.__k.pathStart(0)");await pg.wait_for_timeout(300)
        await pg.evaluate("()=>{const s=window.__k.ses();s.i=s.items.length;s.correct=12;s.wrong=1;window.__k.next()}");await pg.wait_for_timeout(400)
        await pg.screenshot(path='/tmp/claude-0/f_res.png')
        print(await pg.evaluate("document.querySelector('#sMain').innerText.replace(/\\n+/g,' | ')"))
        print('done',await pg.evaluate("JSON.stringify(window.__k.S().stats.path)"))
        await pg.wait_for_timeout(1500)
        while await pg.evaluate("!!document.querySelector('#cel')"):
            await pg.evaluate("document.querySelector('#cel [data-x=ok]').click()");await pg.wait_for_timeout(900)
        await pg.click('#again');await pg.wait_for_timeout(400)
        print('now level',await pg.evaluate("window.__k.ses().pathLv"))
        await pg.click('.x');await pg.wait_for_timeout(200)
        await pg.evaluate("document.getElementById('q-leave')&&document.getElementById('q-leave').click()");await pg.wait_for_timeout(300)
        await pg.evaluate("document.querySelector('[data-k=path]').click()");await pg.wait_for_timeout(500)
        await pg.screenshot(path='/tmp/claude-0/f_path.png',full_page=False)
        await pg.evaluate("document.querySelector('.pn.cur').click()");await pg.wait_for_timeout(400)
        await pg.screenshot(path='/tmp/claude-0/f_sheet.png')
        await pg.evaluate("document.querySelector('[data-k=home]').click()");await pg.wait_for_timeout(300)
        await pg.evaluate("document.querySelectorAll('#sheet .bk').forEach(e=>e.click())")
        await pg.screenshot(path='/tmp/claude-0/f_home.png')
        print(errs)
        await b.close()
asyncio.run(main())
