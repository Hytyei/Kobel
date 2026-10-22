import asyncio, json, urllib.request, sys
from playwright.async_api import async_playwright
BASE='http://127.0.0.1:8799'
def mk(n): return json.load(urllib.request.urlopen(f'{BASE}/mkuser?n={n}'))
def call(code,method,path,body=None):
    r=urllib.request.Request(BASE+path,method=method,data=json.dumps(body).encode() if body is not None else None,headers={'Authorization':'Bearer '+code,'Content-Type':'application/json'})
    try: return json.load(urllib.request.urlopen(r))
    except urllib.error.HTTPError as e: return json.load(e)
async def main():
    me=mk('Hadi'); fr=mk('Bobby'); fr2=mk('Clara')
    # friendships via invite codes (server side)
    for f in (fr,fr2):
        code=call(f['code'],'POST','/v1/friends/code')['code']
        call(me['code'],'POST','/v1/friends',{'code':code})
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={'width':390,'height':800},has_touch=True)
        errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto(BASE+'/#debug'); await pg.wait_for_timeout(600)
        await pg.evaluate("[...document.querySelectorAll('button')].filter(b=>/kick off/i.test(b.textContent)).forEach(b=>b.click())")
        await pg.wait_for_timeout(400)
        await pg.evaluate("document.querySelectorAll('#sheet .bk').forEach(e=>e.click())")
        await pg.evaluate("(c)=>{const S=window.__k.S();S.sync={url:location.origin,code:c,pulled:0};S.settings.avatar='bvb';S.settings.username='Hadi'}",me['code'])
        await pg.evaluate("document.querySelector('[data-k=friends]').click()"); await pg.wait_for_timeout(1200)
        await pg.screenshot(path='/tmp/claude-0/s_friends.png')
        print('friend rows:',await pg.evaluate("document.querySelectorAll('#so-body .drow').length"))
        # groups tab
        await pg.evaluate("document.querySelector('[data-a=frtab][data-k=groups]').click()"); await pg.wait_for_timeout(300)
        await pg.evaluate("document.querySelector('[data-a=gpnew]').click()"); await pg.wait_for_timeout(300)
        await pg.fill('#gp-n','Sunday League')
        await pg.evaluate("document.querySelectorAll('.gp-pick input').forEach(i=>i.click())")
        await pg.screenshot(path='/tmp/claude-0/s_newgroup.png')
        await pg.click('#gp-go'); await pg.wait_for_timeout(900)
        await pg.screenshot(path='/tmp/claude-0/s_group.png')
        print('group open:',await pg.evaluate("!!document.querySelector('#gp')&&document.querySelector('#gp .dl-t b').textContent"))
        # nudge the group
        await pg.evaluate("document.querySelector('[data-a=gpnudge]').click()"); await pg.wait_for_timeout(500)
        await pg.screenshot(path='/tmp/claude-0/s_nudge.png')
        await pg.evaluate("document.querySelector('[data-a=gpnudgego][data-kind=practise]').click()"); await pg.wait_for_timeout(900)
        print('nudge sheet closed:',await pg.evaluate("!document.querySelector('.nd-list')"))
        al=call(fr['code'],'GET','/v1/alerts?since=0')['alerts']
        print('friend sees ping:',[ (a['type'],a.get('kind'),a.get('name')) for a in al if a['type']=='group_ping'])
        await pg.evaluate("document.querySelector('[data-a=gpnudge]').click()"); await pg.wait_for_timeout(400)
        await pg.evaluate("document.querySelector('[data-a=gpnudgego][data-kind=round]').click()"); await pg.wait_for_timeout(700)
        print('cooldown msg:',await pg.evaluate("document.querySelector('#nd-e')&&document.querySelector('#nd-e').textContent"))
        # start a round and answer 9 with first option
        await pg.evaluate("document.querySelector('[data-a=gpround]').click()"); await pg.wait_for_timeout(200)
        await pg.evaluate("document.querySelector('[data-a=gpgo]').click()"); await pg.wait_for_timeout(1200)
        for i in range(9):
            await pg.wait_for_selector('#gp .opt, #gp .ch',timeout=4000)
            if await pg.evaluate("!!document.querySelector('#gp .opt')"):
                await pg.evaluate("document.querySelector('#gp .opt').click()")
            else:
                await pg.evaluate("[...document.querySelectorAll('#gp .ch')].forEach(c=>c.click());document.querySelector('[data-a=gpsend]').click()")
            await pg.wait_for_timeout(1250)
        await pg.wait_for_timeout(800)
        await pg.screenshot(path='/tmp/claude-0/s_group2.png')
        print('errs',errs)
        await b.close()
asyncio.run(main())
