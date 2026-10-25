/* ───────── new-version popup (3.4.0) ─────────
   A real popup on top of everything (not a sheet, so no other sheet can close it): version, what is new,
   "Update now" -> download with progress -> "Install". "Later" hides it for a few hours (tapping outside only closes it for now). The check runs at start and
   whenever the app comes back to the foreground (at most once per half hour; a failed check is retried soon). */
function updSnoozed(tag){const z=(S.updSnooze||{});return z.tag===tag&&Date.now()<z.until}
function updNotes(n){
  const L=String(n||'').replace(/\r/g,'').split('\n').filter(x=>!/^\s*#/.test(x)).map(x=>x.replace(/^[#>*\-\s]+/,'').trim()).filter(Boolean).slice(0,6);
  return L.length?`<ul class="up-n">${L.map(x=>`<li>${esc(x.slice(0,140))}</li>`).join('')}</ul>`:'';
}
function updDraw(){
  const w=document.getElementById('updpop');if(!w)return;
  const i=U.info||{},st=U.state,box=w.querySelector('.up-box');
  const mb=i.size?` · ${(i.size/1048576).toFixed(1)} MB`:'';
  let body='';
  if(st==='downloading')body=`<p class="up-s">${tx('Downloading…','Wird heruntergeladen …')}</p><div class="up-bar"><i style="width:${U.pct}%"></i></div><b class="up-p">${Math.round(U.pct)}%</b>`;
  else if(st==='ready')body=`<p class="up-s">${tx('Download finished. Android will ask you to confirm the installation. Your progress stays.','Download fertig. Android fragt dich nach der Installation. Dein Fortschritt bleibt erhalten.')}</p><button class="btn c-fern" data-u="inst" type="button">${tx('Install now','Jetzt installieren')}</button>`;
  else body=`${updNotes(i.notes)}${U.msg?`<p class="up-e">${esc(U.msg)}</p>`:''}<button class="btn c-fern" data-u="dl" type="button">${U.msg?tx('Try again','Nochmal versuchen'):tx('Update now','Jetzt aktualisieren')}${mb}</button><button class="btn ghost" data-u="later" type="button">${tx('Later','Später')}</button>`;
  box.innerHTML=`<div class="up-k">${tx('New version','Neue Version')}</div><h3>Kobel ${esc(String(i.latest||'').replace(/^v/i,''))}</h3><p class="up-c">${tx('You have','Du hast')} ${esc(U.ver||i.current||'')}</p>${body}`;
  box.querySelectorAll('[data-u]').forEach(b=>b.onclick=()=>{
    const k=b.dataset.u;
    if(k==='later'){S.updSnooze={tag:i.latest,until:Date.now()+6*36e5};save();updClose()}
    else if(k==='dl'){U.msg='';U.state='downloading';U.pct=0;updDraw();try{NATIVE.downloadUpdate()}catch(e){onKobelUpdateError('Could not start the download')}}
    else if(k==='inst'){try{NATIVE.installUpdate()}catch(e){toast('Could not open the installer')}}
  });
}
function updClose(){const w=document.getElementById('updpop');if(w){w.classList.add('out');setTimeout(()=>w.remove(),200)}}
function updOpen(force){
  const i=U.info||{};if(document.getElementById('updpop')||!i.latest)return;
  if(!force&&updSnoozed(i.latest))return;
  const w=document.createElement('div');w.id='updpop';
  w.innerHTML='<div class="up-bk"></div><div class="up-box" role="dialog" aria-modal="true"></div>';
  document.body.appendChild(w);
  w.querySelector('.up-bk').onclick=()=>{if(U.state!=='downloading'){updClose()}};
  updDraw();
}
/* wrap the existing handlers: they keep the Settings card up to date, this adds the popup */
(function(){
  const oi=window.onKobelUpdateInfo,op=window.onKobelUpdateProgress,orr=window.onKobelUpdateReady,oe=window.onKobelUpdateError;
  window.onKobelUpdateInfo=j=>{
    const man=U.manual;U.manual=false;
    U.toasted=1;oi(j);
    const i=U.info||{};
    if(i.error){S.lastUpdateCheck=Date.now()-9*60000;if(man)toast(i.error)}   /* a failed check is tried again in a minute or so */
    else{S.lastUpdateCheck=Date.now()}
    if(!i.error&&i.newer)updOpen(man);
    else if(man&&!i.error)toast(tx('Kobel is up to date','Kobel ist auf dem neuesten Stand')+' ('+(i.current||U.ver||'')+')');
    save();
  };
  window.onKobelUpdateProgress=p=>{op(p);if(document.getElementById('updpop'))updDraw()};
  window.onKobelUpdateReady=()=>{orr();if(!document.getElementById('updpop'))updOpen(true);else updDraw()};
  window.onKobelUpdateError=m=>{oe(m);if(document.getElementById('updpop'))updDraw()};
})();
/* start-up and return-to-app checks; manual checks (Settings) always show the result */
const checkUpdate0=checkUpdate;
checkUpdate=function(manual){U.manual=!!manual;if(manual&&U.state==='available'&&U.info&&U.info.newer){updOpen(true);return}checkUpdate0(manual)};
function updAuto(){
  if(!(NATIVE&&NATIVE.checkUpdate))return;
  if(U.state==='downloading'||document.getElementById('updpop'))return;
  if(Date.now()-(S.lastUpdateCheck||0)<10*60000)return;
  checkUpdate0(false);
}
/* every start of the app checks (no waiting time); coming back to the app checks at most every 10 minutes */
setTimeout(()=>{S.lastUpdateCheck=0;updAuto()},1800);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(updAuto,1500)});
