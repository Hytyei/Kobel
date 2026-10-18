import asyncio, sys
sys.path.insert(0,'/home/claude/kobel/web/tests')
from path_test import boot
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b,pg,errs=await boot(p)
        await pg.evaluate("document.querySelector('.avbtn').click()");await pg.wait_for_timeout(300)
        await pg.evaluate("document.querySelector('[data-a=pfedit]').click()");await pg.wait_for_timeout(500)
        await pg.screenshot(path='/tmp/claude-0/s_profile.png')
        print('vis checkbox:',await pg.evaluate("!!document.querySelector('#pf-v')"),'picks',await pg.evaluate("document.querySelectorAll('.avpick').length"))
        await pg.evaluate("document.querySelector('.avpick[data-id=bvb]').click();document.querySelector('#pf-s').click()");await pg.wait_for_timeout(400)
        print('accent',await pg.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--club')"))
        await pg.evaluate("document.querySelector('[data-k=stats]').click()");await pg.wait_for_timeout(500)
        await pg.screenshot(path='/tmp/claude-0/s_table2.png',full_page=False)
        print(errs);await b.close()
asyncio.run(main())
