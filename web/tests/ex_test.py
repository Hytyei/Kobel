import asyncio
from playwright.async_api import async_playwright
import sys; sys.path.insert(0,'/home/claude/kobel/web/tests')
from path_test import boot
async def main():
    async with async_playwright() as p:
        b,pg,errs=await boot(p)
        setup="""(kind)=>{const k=window.__k,S=k.S();const nouns=k.WALL().filter(c=>c.art&&/^[A-ZÄÖÜ][^\\s.…]*$/.test(c.de)).slice(0,5);
          const sn=k.WALL().filter(c=>c.ex&&c.exEn&&c.ex.split(' ').length>=3)[0];
          const ws=k.WALL().slice(0,5).map(c=>c.id);
          k.setSes({mode:'path',path:true,pathKey:'x',pathIdx:0,pathLv:3,pathKind:'w',lesson:'',opt:{},items:[],i:0,correct:0,wrong:0,xp:0,combo:0,maxCombo:0,graded:new Set(),t0:Date.now(),learned:0,locked:false,lastKind:''});
          const it=kind==='sortart'?{kind,cids:nouns.map(c=>c.id)}:kind==='dmatch'?{kind,cids:ws}:{kind,cid:(kind==='drag'?sn:nouns[0]).id};
          k.ses().items=[it];k.openOverlay();k.next();return JSON.stringify(it)}"""
        for kind in ['tf','drag','sortart','dmatch']:
            await pg.evaluate("document.getElementById('ses')&&document.getElementById('ses').remove()")
            r=await pg.evaluate(setup,kind)
            await pg.wait_for_timeout(300)
            await pg.screenshot(path=f'/tmp/claude-0/e_{kind}.png')
            if kind=='sortart':
                for _ in range(5):
                    r=await pg.evaluate('''()=>{const el=document.querySelector('#tray .dg');if(!el)return null;const c=window.__k.WALL().find(c=>String(c.id)===el.dataset.id);const b=document.querySelector('.ab.'+c.art).getBoundingClientRect(),r=el.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2,b.x+b.width/2,b.y+30]}''')
                    if not r:break
                    await pg.mouse.move(r[0],r[1]);await pg.mouse.down();await pg.mouse.move(r[0]+20,r[1]+20,steps=3);await pg.mouse.move(r[2],r[3],steps=8);await pg.mouse.up();await pg.wait_for_timeout(100)
                print('sortart footer:',await pg.evaluate("document.querySelector('#sFoot').innerText"))
            if kind=='drag':
                for _ in range(8):
                    r=await pg.evaluate('''()=>{const els=[...document.querySelectorAll('#bk .dg')];if(!els.length)return null;const words=window.__k.ses().items[0].cid;return 1}''')
                    break
                order=await pg.evaluate('''()=>{const c=window.__k.WALL().find(c=>String(c.id)===String(window.__k.ses().items[0].cid));return c.ex.replace(/\{\{|\}\}/g,'').split(/\s+/)}''')
                for w in order:
                    r=await pg.evaluate('''(w)=>{const el=[...document.querySelectorAll('#bk .dg')].find(e=>e.textContent===w);const a=document.querySelector('#al').getBoundingClientRect(),r=el.getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2,a.right-10,a.y+20]}''',w)
                    await pg.mouse.move(r[0],r[1]);await pg.mouse.down();await pg.mouse.move(r[0]+12,r[1]-12,steps=3);await pg.mouse.move(r[2],r[3],steps=8);await pg.mouse.up();await pg.wait_for_timeout(80)
                await pg.click('#chk');await pg.wait_for_timeout(200)
                print('drag footer:',await pg.evaluate("document.querySelector('#sFoot').innerText"))
        print(errs)
        await b.close()
asyncio.run(main())
