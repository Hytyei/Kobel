/* ───────── Accounts: username + password, Google, founder badge ─────────
   The old anonymous "Kobel ID" is replaced by a username (and password) or a Google account. A sign-in returns a
   session token that is stored exactly where the Kobel ID used to be (S.sync.code), so sync, friends, groups and
   notifications work unchanged. Old Kobel IDs keep working until their owner adds a username or links Google. */
const USER_RE=/^[A-Za-z0-9][A-Za-z0-9_.]{2,19}$/;
const hexOf=buf=>[...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
const AU={busy:false,mode:'signup',chk:0};
try{Object.assign(STI,{user:'<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c.9-4 4-6 7.500-6s6.600 2 7.500 6"/>',lock:'<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',google:'<circle cx="12" cy="12" r="8"/><path d="M12 12h7.500"/>'})}catch(e){}

/* ---- the verified founder badge ---- */
function vbadge(b,big){
  if(b!=='founder')return '';
  const t=tx('Verified founder','Verifizierter Gründer');
  return `<span class="vb${big?' big':''}" title="${esc(t)}" aria-label="${esc(t)}" role="img"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.8l8.2 3v6.4c0 5.1-3.4 9.5-8.2 11-4.8-1.5-8.2-5.9-8.2-11V4.8z" fill="#F5C518"/><path d="M12 1.8l8.2 3v6.4c0 5.1-3.4 9.5-8.2 11z" fill="#D9A500" opacity=".55"/><path d="M7.8 12.2l3 3 5.6-6" fill="none" stroke="#111" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>${big?`<i>${tx('Founder','Gründer')}</i>`:''}</span>`;
}
const myInfo=()=>(acct().user)||null;
const myBadge=()=>{const u=myInfo();return u&&u.badge||''};

/* ---- talking to the server before there is a session ---- */
async function authApi(method,path,body,token){
  const base=defaultApi();if(!base)throw new Error(tx('This build has no server address.','Dieser Build hat keine Serveradresse.'));
  let res;
  try{res=await fetch(base.replace(/\/+$/,'')+path,{method,headers:Object.assign({'Content-Type':'application/json'},token?{Authorization:'Bearer '+token}:{}),body:body?JSON.stringify(body):undefined})}
  catch(e){throw new Error(tx('No internet connection. Please try again.','Keine Internetverbindung. Bitte versuche es erneut.'))}
  let j=null;try{j=await res.json()}catch(e){}
  if(!res.ok){const er=new Error((j&&j.error&&j.error.message)||tx('Server error ','Serverfehler ')+res.status);er.code=j&&j.error&&j.error.code;er.status=res.status;throw er}
  return j;
}
/* the phone does the slow part of the password hashing; the server only ever sees this key */
async function pwKey(username,password){
  if(!(window.crypto&&crypto.subtle))throw new Error(tx('This device cannot protect passwords. Use Google instead.','Dieses Gerät kann Passwörter nicht schützen. Nutze Google.'));
  const enc=new TextEncoder(),km=await crypto.subtle.importKey('raw',enc.encode(String(password).normalize('NFKC')),'PBKDF2',false,['deriveBits']);
  return hexOf(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:enc.encode('kobel|'+String(username).toLowerCase()),iterations:150000},km,256));
}
async function sha256Hex(t){return hexOf(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(t)))}
const deviceLabel=()=>NATIVE?'Android':'Web';

/* ---- remembering the account on this phone ---- */
function rememberUser(u){
  if(!u)return;
  const a=acct();a.user={username:u.username||null,badge:u.badge||null,hasPassword:!!u.hasPassword,google:u.google||null,legacy:!!u.legacy,name:u.name};
  if(u.name)S.settings.username=u.name;
  save();
}
async function refreshMe(){
  if(!hasAccount())return null;
  try{const j=await api('GET','/v1/me');rememberUser(j.user);return j.user}catch(e){return null}
}
/* a successful sign-in or sign-up: keep the session, merge this phone's data with the account, show the app */
async function finishAuth(res,opts){
  const base=defaultApi();
  S.sync={url:base,code:res.token,pulled:0};
  {const a=acct();a.auto=false;a.noAuto=false;a.idShown=true;a.asked=true;a.err=''}
  rememberUser(res.user);
  S.settings.welcomed=true;save();closeSheet();
  const w=document.getElementById('welcome');if(w)w.remove();
  const ok=await syncNow(true);await adoptServerName();loadNotices();render();
  if(ok!==false)toast(tx('Welcome, ','Willkommen, ')+myName());
  if(opts&&opts.chooseName&&!res.user.username)setTimeout(()=>usernameSheet({first:true}),700);
}

/* ---- sign up / sign in sheet ---- */
function authSheet(mode,o){
  o=o||{};AU.mode=mode==='login'?'login':'signup';
  const signup=AU.mode==='signup',google=!!defaultApi();
  sheet(`<h3>${signup?tx('Create your account','Konto erstellen'):tx('Welcome back','Willkommen zurück')}</h3>
  <div class="au-tabs"><button type="button" data-m="signup" class="${signup?'on':''}">${tx('Create account','Konto erstellen')}</button><button type="button" data-m="login" class="${signup?'':'on'}">${tx('Sign in','Anmelden')}</button></div>
  ${o.intro?`<p class="sub" style="margin:0 0 10px">${o.intro}</p>`:''}
  ${google?`<button class="btn au-g" id="au-google" type="button">${GOOGLE_G}<span>${tx('Continue with Google','Weiter mit Google')}</span></button><div class="au-or"><span>${tx('or with a username','oder mit Benutzername')}</span></div>`:''}
  <label class="sub au-l" for="au-u">${tx('Username','Benutzername')}</label>
  <input class="inp" id="au-u" maxlength="20" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="${tx('e.g. maren_k','z. B. maren_k')}">
  <p class="sub au-h" id="au-uh">${signup?tx('3 to 20 letters, numbers, dot or underscore.','3 bis 20 Buchstaben, Zahlen, Punkt oder Unterstrich.'):''}</p>
  <label class="sub au-l" for="au-p">${tx('Password','Passwort')}</label>
  <div class="au-pw"><input class="inp" id="au-p" type="password" autocomplete="${signup?'new-password':'current-password'}" placeholder="${signup?tx('At least 8 characters','Mindestens 8 Zeichen'):''}"><button type="button" class="au-eye" id="au-eye" aria-label="${tx('Show password','Passwort zeigen')}">${tx('Show','Zeigen')}</button></div>
  ${signup?`<label class="sub au-l" for="au-p2">${tx('Repeat password','Passwort wiederholen')}</label><input class="inp" id="au-p2" type="password" autocomplete="new-password">`:''}
  <div id="au-fk" style="display:none"><label class="sub au-l" for="au-k">${tx('Founder key','Gründerschlüssel')}</label><input class="inp" id="au-k" type="password" autocomplete="off" placeholder="${tx('Only for the creator','Nur für den Ersteller')}"></div>
  <p class="sub au-h" id="au-e" style="min-height:20px"></p>
  <button class="btn c-fern" id="au-go" type="button">${signup?tx('Create account','Konto erstellen'):tx('Sign in','Anmelden')}</button>
  <p class="sub au-h" style="margin-top:12px">${signup?tx('You only sign up once. Kobel keeps you signed in on this phone.','Du meldest dich nur einmal an. Kobel hält dich auf diesem Handy angemeldet.'):tx('Forgot your password? Sign in with Google if you linked it. Passwords cannot be reset by email.','Passwort vergessen? Melde dich mit Google an, falls verknüpft. Passwörter können nicht per E-Mail zurückgesetzt werden.')}</p>
  <button class="au-old" id="au-old" type="button">${tx('I still use an old Kobel ID','Ich nutze noch eine alte Kobel-ID')}</button>`,sh=>{
    const U=$('#au-u',sh),P=$('#au-p',sh),P2=$('#au-p2',sh),E=$('#au-e',sh),H=$('#au-uh',sh),go=$('#au-go',sh);
    const bad=m=>{E.textContent=m;E.style.color='var(--badtxt)'};
    sh.querySelectorAll('.au-tabs button').forEach(b=>b.onclick=()=>{if(b.dataset.m!==AU.mode){const u=U.value;authSheet(b.dataset.m,o);const n=$('#au-u');if(n)n.value=u}});
    $('#au-eye',sh).onclick=e=>{const sh2=P.type==='password';P.type=sh2?'text':'password';if(P2)P2.type=P.type;e.target.textContent=sh2?tx('Hide','Verbergen'):tx('Show','Zeigen')};
    const gb=$('#au-google',sh);if(gb)gb.onclick=()=>googleStart('signin');
    $('#au-old',sh).onclick=()=>{closeSheet();setTimeout(()=>restoreSheet(),250)};
    U.oninput=()=>{
      $('#au-fk',sh).style.display=U.value.trim().toLowerCase()==='hytyei'?'':'none';
      if(!signup)return;clearTimeout(AU.chk);const v=U.value.trim();
      if(!v){H.textContent=tx('3 to 20 letters, numbers, dot or underscore.','3 bis 20 Buchstaben, Zahlen, Punkt oder Unterstrich.');H.style.color='';return}
      if(!USER_RE.test(v)){H.textContent=tx('Use 3 to 20 letters, numbers, dot or underscore.','Nutze 3 bis 20 Buchstaben, Zahlen, Punkt oder Unterstrich.');H.style.color='var(--badtxt)';return}
      AU.chk=setTimeout(async()=>{
        try{const r=await authApi('GET','/v1/auth/username?u='+encodeURIComponent(v));if(U.value.trim()!==v)return;
          H.textContent=r.available?tx('Available','Verfügbar'):r.reason==='reserved'?tx('That name is reserved.','Dieser Name ist reserviert.'):tx('Already taken.','Schon vergeben.');
          H.style.color=r.available?'var(--goodtxt,#2fd27a)':(r.reason==='reserved'&&v.toLowerCase()==='hytyei'?'':'var(--badtxt)')}catch(e){}
      },450);
    };
    go.onclick=async()=>{
      if(AU.busy)return;const u=U.value.trim(),p=P.value;
      if(!USER_RE.test(u)){bad(tx('Enter a valid username.','Gib einen gültigen Benutzernamen ein.'));return}
      if(signup){
        if(p.length<8){bad(tx('The password needs at least 8 characters.','Das Passwort braucht mindestens 8 Zeichen.'));return}
        if(p!==P2.value){bad(tx('The two passwords are not the same.','Die beiden Passwörter sind nicht gleich.'));return}
      }else if(!p){bad(tx('Enter your password.','Gib dein Passwort ein.'));return}
      AU.busy=true;go.disabled=true;E.style.color='';E.textContent=tx('One moment…','Einen Moment…');
      try{
        const key=await pwKey(u,p);
        const body={username:u,password:key,label:deviceLabel()};
        const fk=$('#au-k',sh);if(signup&&fk&&fk.value)body.founderKey=fk.value;
        const res=await authApi('POST',signup?'/v1/auth/signup':'/v1/auth/login',body);
        AU.busy=false;await finishAuth(res);
      }catch(e){
        AU.busy=false;go.disabled=false;
        bad(e.code==='invalid_credentials'?tx('Wrong username or password.','Falscher Benutzername oder falsches Passwort.'):e.code==='taken'?tx('That username is already taken.','Dieser Benutzername ist schon vergeben.'):e.code==='reserved'?tx('That username is reserved.','Dieser Benutzername ist reserviert.'):e.code==='rate_limited'?e.message:e.message);
      }
    };
    setTimeout(()=>U.focus(),250);
  });
}
const GOOGLE_G='<svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.100 0 24s.9 7.600 2.600 10.800z"/><path fill="#34A853" d="M24 48c6.500 0 11.900-2.100 15.900-5.800l-7.500-5.800c-2.100 1.400-4.800 2.300-8.400 2.300-6.300 0-11.600-4.100-13.500-9.800l-7.900 6.100C6.500 42.600 14.600 48 24 48z"/></svg>';

/* ---- Google: the browser does the sign-in, the app gets a one-time code back through kobel://auth ---- */
const GKEY='kobel_goog';
async function googleStart(intent){
  if(!NATIVE||!NATIVE.openUrl){toast(tx('Google sign-in works in the Android app.','Die Google-Anmeldung funktioniert in der Android-App.'));return}
  try{
    const verifier=hexOf(crypto.getRandomValues(new Uint8Array(32)));
    const r=await authApi('POST','/v1/auth/google/start',{intent,challenge:await sha256Hex(verifier)},intent==='link'&&hasAccount()?S.sync.code:null);
    try{localStorage.setItem(GKEY,JSON.stringify({verifier,intent,t:Date.now()}))}catch(e){}
    toast(tx('Opening Google…','Öffne Google…'));
    NATIVE.openUrl(r.url);
  }catch(e){toast(e.code==='google_not_configured'?tx('Google sign-in is not set up on the server yet.','Die Google-Anmeldung ist auf dem Server noch nicht eingerichtet.'):e.message)}
}
let gDone=false;
async function googleDone(code){
  if(gDone||!code)return;gDone=true;
  let st=null;try{st=JSON.parse(localStorage.getItem(GKEY)||'null');localStorage.removeItem(GKEY)}catch(e){}
  try{
    if(!st||Date.now()-st.t>15*60000)throw new Error(tx('This sign-in expired. Please try again.','Diese Anmeldung ist abgelaufen. Bitte versuche es erneut.'));
    const res=await authApi('POST','/v1/auth/exchange',{code,verifier:st.verifier,label:deviceLabel()});
    if(res.linked&&hasAccount()){
      rememberUser(res.user);closeSheet();render();
      toast(tx('Google account linked','Google-Konto verknüpft'));
      if(!res.user.username)setTimeout(()=>usernameSheet({first:true}),600);
    }else await finishAuth(res,{chooseName:true});
  }catch(e){toast(e.message)}
  finally{gDone=false}
}
function googleFailed(){toast(tx('Google sign-in did not finish. Please try again.','Die Google-Anmeldung wurde nicht abgeschlossen. Bitte versuche es erneut.'));try{localStorage.removeItem(GKEY)}catch(e){}}
/* called by the Android shell (and at start-up / on return to the app) */
function checkPendingAuth(){
  try{
    if(!NATIVE||!NATIVE.takeAuth)return;
    const v=String(NATIVE.takeAuth()||'');
    if(!v)return;
    if(v.indexOf('error')===0)googleFailed();else googleDone(v);
  }catch(e){}
}
window.kobelAuth=v=>{if(v)googleDone(String(v))};
document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(checkPendingAuth,200)});
setTimeout(checkPendingAuth,900);

/* ---- choose or change the username ---- */
function usernameSheet(o){
  o=o||{};const u=myInfo()||{},cur=u.username||'',signed=hasAccount();
  if(!signed){authSheet('signup');return}
  sheet(`<h3>${cur?tx('Change username','Benutzernamen ändern'):tx('Choose a username','Benutzername wählen')}</h3>
  <p class="sub" style="margin:8px 0 12px">${o.first?tx('Pick the name your friends will see. You can skip this and do it later in Settings › Account.','Wähle den Namen, den deine Freunde sehen. Du kannst das überspringen und später unter Einstellungen › Konto machen.'):tx('This is the name in leagues, friend lists and groups, and the one you sign in with. You can change it once a week.','Das ist der Name in Ligen, Freundeslisten und Gruppen, und den du zum Anmelden nutzt. Du kannst ihn einmal pro Woche ändern.')}</p>
  <input class="inp" id="un-u" maxlength="20" value="${esc(cur)}" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="${tx('e.g. maren_k','z. B. maren_k')}">
  <p class="sub au-h" id="un-h">${tx('3 to 20 letters, numbers, dot or underscore.','3 bis 20 Buchstaben, Zahlen, Punkt oder Unterstrich.')}</p>
  <div id="un-fk" style="display:none"><label class="sub au-l" for="un-k">${tx('Founder key (optional)','Gründerschlüssel (optional)')}</label><input class="inp" id="un-k" type="password" autocomplete="off"></div>
  <button class="btn c-fern" id="un-go" type="button" style="margin-top:8px">${tx('Save username','Benutzernamen speichern')}</button>
  ${o.first?`<button class="btn ghost" id="un-skip" type="button" style="margin-top:10px">${tx('Skip for now','Jetzt überspringen')}</button>`:''}`,sh=>{
    const U=$('#un-u',sh),H=$('#un-h',sh),go=$('#un-go',sh);let t=0;
    const bad=m=>{H.textContent=m;H.style.color='var(--badtxt)'};
    U.oninput=()=>{$('#un-fk',sh).style.display=U.value.trim().toLowerCase()==='hytyei'&&!myBadge()?'':'none';clearTimeout(t);const v=U.value.trim();
      if(!USER_RE.test(v)){bad(tx('Use 3 to 20 letters, numbers, dot or underscore.','Nutze 3 bis 20 Buchstaben, Zahlen, Punkt oder Unterstrich.'));return}
      if(v.toLowerCase()===cur.toLowerCase()){H.textContent='';return}
      t=setTimeout(async()=>{try{const r=await authApi('GET','/v1/auth/username?u='+encodeURIComponent(v));if(U.value.trim()!==v)return;
        H.textContent=r.available?tx('Available','Verfügbar'):r.reason==='reserved'?tx('That name is reserved.','Dieser Name ist reserviert.'):tx('Already taken.','Schon vergeben.');H.style.color=r.available?'var(--goodtxt,#2fd27a)':(v.toLowerCase()==='hytyei'?'':'var(--badtxt)')}catch(e){}},450)};
    const sk=$('#un-skip',sh);if(sk)sk.onclick=()=>closeSheet();
    go.onclick=async()=>{
      const v=U.value.trim();if(!USER_RE.test(v)){bad(tx('Enter a valid username.','Gib einen gültigen Benutzernamen ein.'));return}
      go.disabled=true;
      try{const body={username:v},k=$('#un-k',sh);if(k&&k.value)body.founderKey=k.value;
        const r=await api('POST','/v1/me/username',body);rememberUser(r.user);closeSheet();render();toast(tx('Username saved','Benutzername gespeichert'));
        if(!r.user.hasPassword&&!r.user.google)setTimeout(()=>passwordSheet(),500);
      }catch(e){go.disabled=false;bad(e.message)}
    };
  });
}
/* ---- set or change the password ---- */
function passwordSheet(){
  const u=myInfo()||{};if(!hasAccount())return authSheet('login');
  if(!u.username){usernameSheet();return}
  const has=!!u.hasPassword;
  sheet(`<h3>${has?tx('Change password','Passwort ändern'):tx('Set a password','Passwort festlegen')}</h3>
  <p class="sub" style="margin:8px 0 12px">${tx('With a password you can sign in on any phone with your username.','Mit einem Passwort kannst du dich auf jedem Handy mit deinem Benutzernamen anmelden.')}</p>
  ${has?`<label class="sub au-l" for="pw-c">${tx('Current password','Aktuelles Passwort')}</label><input class="inp" id="pw-c" type="password" autocomplete="current-password">`:''}
  <label class="sub au-l" for="pw-n">${tx('New password','Neues Passwort')}</label><input class="inp" id="pw-n" type="password" autocomplete="new-password" placeholder="${tx('At least 8 characters','Mindestens 8 Zeichen')}">
  <label class="sub au-l" for="pw-n2">${tx('Repeat password','Passwort wiederholen')}</label><input class="inp" id="pw-n2" type="password" autocomplete="new-password">
  <p class="sub au-h" id="pw-e" style="min-height:20px"></p>
  <button class="btn c-fern" id="pw-go" type="button">${tx('Save password','Passwort speichern')}</button>`,sh=>{
    const E=$('#pw-e',sh),go=$('#pw-go',sh),bad=m=>{E.textContent=m;E.style.color='var(--badtxt)'};
    go.onclick=async()=>{
      const n=$('#pw-n',sh).value;
      if(n.length<8){bad(tx('The password needs at least 8 characters.','Das Passwort braucht mindestens 8 Zeichen.'));return}
      if(n!==$('#pw-n2',sh).value){bad(tx('The two passwords are not the same.','Die beiden Passwörter sind nicht gleich.'));return}
      go.disabled=true;E.style.color='';E.textContent=tx('One moment…','Einen Moment…');
      try{
        const body={password:await pwKey(u.username,n)};
        if(has)body.current=await pwKey(u.username,$('#pw-c',sh).value);
        await api('POST','/v1/me/password',body);
        const a=acct();if(a.user)a.user.hasPassword=true;save();closeSheet();render();toast(tx('Password saved','Passwort gespeichert'));
      }catch(e){go.disabled=false;bad(e.code==='wrong_password'||e.message==='Wrong access code'?tx('The current password is not right.','Das aktuelle Passwort ist nicht richtig.'):e.message)}
    };
  });
}
/* ---- sign out ---- */
async function signOut(t){
  if(!t.dataset.s){t.dataset.s=1;t.textContent=tx('Tap again to sign out','Nochmal tippen zum Abmelden');return}
  try{await api('POST','/v1/auth/logout')}catch(e){}
  S.sync=null;S.tomb=[];const a=acct();a.user=null;a.noAuto=true;a.auto=false;save();render();
  toast(tx('Signed out. Your words and progress stay on this phone.','Abgemeldet. Deine Wörter und dein Fortschritt bleiben auf diesem Handy.'));
}
async function unlinkGoogle(){
  try{await api('DELETE','/v1/me/google');const a=acct();if(a.user)a.user.google=null;save();render();toast(tx('Google unlinked','Google getrennt'))}
  catch(e){toast(e.code==='only_sign_in'||/username and password/i.test(e.message)?tx('Set a username and password first, so you can still sign in.','Lege zuerst Benutzername und Passwort fest, damit du dich weiter anmelden kannst.'):e.message)}
}

/* ---- Settings › Account ---- */
function stAccount(){
  const signed=hasAccount(),u=myInfo()||{};
  if(!signed){
    return `<div class="st-card st-wrap au-card"><div class="au-h1">${tx('Sign in to back up and play with friends','Melde dich an, um zu sichern und mit Freunden zu spielen')}</div>
    <p class="sub" style="margin:6px 0 12px">${tx('Create an account once. Kobel keeps you signed in, and you can load your words and progress on any phone.','Erstelle einmal ein Konto. Kobel hält dich angemeldet, und du kannst deine Wörter und deinen Fortschritt auf jedem Handy laden.')}</p>
    <div class="row2"><button class="btn c-fern" data-a="authup">${tx('Create account','Konto erstellen')}</button><button class="btn ghost" data-a="authin">${tx('Sign in','Anmelden')}</button></div></div>${updateCard()}`;
  }
  const row=(ic,l,sub,btn)=>stRow(ic,l,sub,btn);
  const secure=u.legacy?`<div class="au-warn"><b>${tx('Secure your account','Sichere dein Konto')}</b><span>${tx('You still sign in with an old Kobel ID. Add a username and password, or link Google, so you can always get back in.','Du meldest dich noch mit einer alten Kobel-ID an. Lege Benutzername und Passwort fest oder verknüpfe Google, damit du immer wieder hineinkommst.')}</span></div>`:'';
  const head=`<div class="st-card st-wrap au-card"><div class="au-me">${avatarSvg(myAvatar(),52)}<div><b>${esc(myName())}${vbadge(u.badge)}</b><small>${u.username?'@'+esc(u.username):tx('No username yet','Noch kein Benutzername')}${u.google?' · '+esc(u.google):''}</small></div></div>${secure}</div>`;
  const rows=row('user',tx('Username','Benutzername'),u.username?esc(u.username):tx('Not set','Nicht festgelegt'),`<button class="btn sm c-sky" data-a="authname">${u.username?tx('Change','Ändern'):tx('Choose','Wählen')}</button>`)+
    row('lock',tx('Password','Passwort'),u.hasPassword?tx('Set','Festgelegt'):tx('Not set','Nicht festgelegt'),`<button class="btn sm c-sky" data-a="authpw">${u.hasPassword?tx('Change','Ändern'):tx('Set','Festlegen')}</button>`)+
    row('google',tx('Google account','Google-Konto'),u.google?esc(u.google):tx('Not linked','Nicht verknüpft'),u.google?`<button class="btn sm ghost" data-a="authunlink">${tx('Unlink','Trennen')}</button>`:`<button class="btn sm c-sky" data-a="authlink">${tx('Link','Verknüpfen')}</button>`);
  const out=`<div class="st-card st-wrap"><button class="btn ghost st-danger" data-a="authout">${tx('Sign out','Abmelden')}</button><p class="sub" style="font-size:13px;margin-top:8px">${tx('Signing out keeps your words and progress on this phone. Sign in again to sync.','Beim Abmelden bleiben Wörter und Fortschritt auf diesem Handy. Melde dich wieder an, um zu synchronisieren.')}</p></div>`;
  const old=u.legacy?`<div class="st-card st-wrap">${idCard()}</div>`:'';
  return head+stGroup(tx('Sign-in','Anmeldung'),rows)+syncCard()+old+out+updateCard();
}
/* Cloud sync card for signed-in accounts (no more "Kobel ID" wording) */
function syncCard(){
  const c=S.sync;
  if(!(c&&c.url))return '';
  return `<h2 class="sec">${tx('Cloud sync','Cloud-Sync')}</h2><div class="card patch"><p class="sub" style="margin-bottom:10px"><span id="sync-st">${esc(syncStatus)}</span></p><button class="btn c-sky" data-a="syncnow">${tx('Sync now','Jetzt synchronisieren')}</button></div>`+autoSaveCard();
}
/* no more anonymous accounts: new installs sign up, old accounts are nudged once to add a username or Google */
function maybeAutoAccount(){
  const a=acct();
  if(!defaultApi()||document.getElementById('welcome'))return;
  if(!hasAccount()){
    if(!a.noAuto&&!a.asked&&S.settings.welcomed)setTimeout(()=>{if(!hasAccount()&&!document.querySelector('.sheetw')&&!a.asked){a.asked=true;save();authSheet('signup',{intro:tx('Create an account to back up your words and progress online and to use friends and leagues.','Erstelle ein Konto, um Wörter und Fortschritt online zu sichern und Freunde und Ligen zu nutzen.')})}},2600);
    return;
  }
  if(!a.meAt||Date.now()-a.meAt>6*3600000){a.meAt=Date.now();refreshMe().then(u=>{
    if(u&&u.legacy&&!a.upAsked&&!document.querySelector('.sheetw'))setTimeout(()=>{if(document.querySelector('.sheetw'))return;a.upAsked=true;save();upgradeSheet()},2500);
  })}
}
function upgradeSheet(){
  sheet(`<h3>${tx('Secure your account','Sichere dein Konto')}</h3>
  <p class="sub" style="margin:8px 0 14px">${tx('Kobel now uses usernames instead of the Kobel ID. Your words, progress and friends stay exactly as they are. Add a username and password, or link your Google account, so you can sign in on any phone.','Kobel nutzt jetzt Benutzernamen statt der Kobel-ID. Wörter, Fortschritt und Freunde bleiben genau wie sie sind. Lege Benutzername und Passwort fest oder verknüpfe dein Google-Konto, damit du dich auf jedem Handy anmelden kannst.')}</p>
  <button class="btn c-fern" id="up-u" type="button">${tx('Choose username and password','Benutzername und Passwort wählen')}</button>
  ${defaultApi()?`<button class="btn au-g" id="up-g" type="button" style="margin-top:10px">${GOOGLE_G}<span>${tx('Link my Google account','Mein Google-Konto verknüpfen')}</span></button>`:''}
  <button class="btn ghost" id="up-x" type="button" style="margin-top:10px">${tx('Later','Später')}</button>`,sh=>{
    $('#up-u',sh).onclick=()=>{closeSheet();setTimeout(()=>usernameSheet(),250)};
    const g=$('#up-g',sh);if(g)g.onclick=()=>{closeSheet();googleStart('link')};
    $('#up-x',sh).onclick=()=>closeSheet();
  });
}
/* first launch: create an account, sign in, or carry on without one */
function showWelcome(){
  if(S.settings.welcomed||document.getElementById('welcome'))return;
  const d=document.createElement('div');d.id='welcome';
  d.innerHTML=`<img class="wl-art" src="brand/welcome.png" alt="" onerror="this.remove()">
  <div class="wl-in"><div class="wl-lang"><button data-w="en">English</button><button data-w="de">Deutsch</button></div>
  <div class="wl-mid"><img class="wl-logo" src="brand/logo.png" alt="" onerror="this.outerHTML='<span class=&quot;wl-mk&quot;>K</span>'"><h1>Kobel</h1><p class="wl-sub"></p></div>
  <button class="btn shine wl-go"></button><button class="btn ghost wl-in2"></button><button class="wl-have" type="button"></button><p class="wl-note"></p></div>`;
  document.body.appendChild(d);
  const api0=!!defaultApi();
  const fill=()=>{d.querySelector('.wl-sub').textContent=tx('Your German, your notes, your league.','Dein Deutsch, deine Notizen, deine Liga.');
    d.querySelector('.wl-go').textContent=api0?tx('Create account','Konto erstellen'):tx('Kick off','Anpfiff');
    const i2=d.querySelector('.wl-in2');i2.textContent=tx('Sign in','Anmelden');i2.style.display=api0?'':'none';
    d.querySelector('.wl-have').textContent=api0?tx('Continue without an account','Ohne Konto weiter'):tx('I already have an ID','Ich habe schon eine ID');
    d.querySelector('.wl-note').textContent=api0?tx('Your words and progress are saved on this phone. An account also backs them up online and unlocks friends and leagues.','Deine Wörter und dein Fortschritt werden auf diesem Handy gespeichert. Ein Konto sichert sie auch online und schaltet Freunde und Ligen frei.'):tx('Your words and progress are saved on this phone.','Deine Wörter und dein Fortschritt werden auf diesem Handy gespeichert.');
    d.querySelectorAll('.wl-lang button').forEach(b=>b.classList.toggle('on',b.dataset.w===LANG))};
  fill();
  d.querySelectorAll('.wl-lang button').forEach(b=>b.onclick=()=>{S.settings.lang=b.dataset.w;setLang(S.settings.lang);save();fill();render()});
  const carryOn=()=>{S.settings.welcomed=true;acct().noAuto=true;acct().asked=true;save();d.classList.add('out');setTimeout(()=>d.remove(),400)};
  d.querySelector('.wl-go').onclick=()=>{if(api0)authSheet('signup');else carryOn()};
  d.querySelector('.wl-in2').onclick=()=>authSheet('login');
  d.querySelector('.wl-have').onclick=()=>{if(api0)carryOn();else restoreSheet()};
}
const AUTH_ACTIONS={authup:()=>authSheet('signup'),authin:()=>authSheet('login'),authname:()=>usernameSheet(),authpw:()=>passwordSheet(),
  authlink:()=>googleStart('link'),authunlink:unlinkGoogle,authout:t=>signOut(t)};
