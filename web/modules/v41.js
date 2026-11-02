/* ───────── Kobel 4.1: the question stage and match effects ─────────
   Every question is split into a stage (what is asked, on the club colour) and a play area (what you answer with, at the
   thumb). The split happens once, here, so every question type and minigame gets it without its own layout code. */
const V41_PLAY='.opts,.qx-b,.dline,.abk,.dmrows,.mcols,.mm-g,.bb-sky,.ws-g,.sn-row,.qx-toks,.rulec,.flipw';
function v41Stage(m){
  /* a new word: the word itself is the stage, its example is the play area */
  const intro=m.querySelector(':scope>.intro');
  if(intro){
    const mk=intro.querySelector('.mk');if(mk)mk.remove();
    const ex=[...intro.children].findIndex(e=>e.classList.contains('ex'));
    const st=document.createElement('section');st.className='q-stage'+(ex<0?' full':'');
    const rest=[...intro.children].slice(ex<0?intro.children.length:ex);
    [...m.children].filter(e=>e!==intro).forEach(k=>st.appendChild(k));
    [...intro.children].filter(e=>!rest.includes(e)).forEach(k=>st.appendChild(k));
    m.insertBefore(st,intro);intro.className='q-play v41-note';m.classList.add('v41');
    if(!rest.length)intro.remove();
    return;
  }
  const kids=[...m.children],i=kids.findIndex(e=>e.matches(V41_PLAY));
  if(i<1)return;
  const st=document.createElement('section'),pl=document.createElement('section');
  st.className='q-stage';pl.className='q-play';
  kids.slice(0,i).forEach(k=>st.appendChild(k));kids.slice(i).forEach(k=>pl.appendChild(k));
  const head=pl.querySelector('.rulec>.rl-t');if(head)st.appendChild(head);
  m.append(st,pl);m.classList.add('v41');
  if(pl.querySelector('.rulec,.flipw')&&!head)st.classList.add('thin');
  const o=pl.querySelector('.opts');if(o)o.style.setProperty('--n',o.children.length);
}

/* ---- effects: all of them run on transform and opacity, and none of them block the next tap ---- */
const V41={until:0};
function v41Burst(x,y,cols,n){
  if(qxReduce()||!document.body.animate)return;
  for(let i=0;i<n;i++){
    const p=document.createElement('i');p.className='v41-p';p.style.cssText=`left:${x}px;top:${y}px;background:${cols[i%cols.length]}`;document.body.appendChild(p);
    const a=-Math.PI*(.08+Math.random()*.84),d=50+Math.random()*120,g=70+Math.random()*80;
    p.animate([{transform:'translate(-50%,-50%) scale(1)',opacity:1},{transform:`translate(${Math.cos(a)*d}px,${Math.sin(a)*d}px) rotate(${Math.random()*300}deg) scale(1)`,opacity:1,offset:.55},{transform:`translate(${Math.cos(a)*d*1.3}px,${Math.sin(a)*d+g}px) rotate(${Math.random()*600}deg) scale(.5)`,opacity:0}],{duration:620+Math.random()*260,easing:'cubic-bezier(.16,.8,.3,1)'}).onfinish=()=>p.remove();
  }
}
/* the ball flies from your answer into the score bug, and the score changes when it lands */
function v41Ball(from,to){
  if(qxReduce()||!from||!to||!document.body.animate)return false;
  const a=from.getBoundingClientRect(),b=to.getBoundingClientRect();if(!a.width||!b.width)return false;
  const x0=a.left+Math.min(a.width,320)/2,y0=a.top+a.height/2,x1=b.left+b.width/2,y1=b.top+b.height/2;
  const o=document.createElement('div'),i=document.createElement('div');o.className='v41-ball';i.innerHTML=SVG_BALL;o.appendChild(i);o.style.left=x0+'px';o.style.top=y0+'px';document.body.appendChild(o);
  const T=400;
  o.animate([{transform:'translate(-50%,-50%)'},{transform:`translate(calc(-50% + ${x1-x0}px),-50%)`}],{duration:T,easing:'linear'}).onfinish=()=>o.remove();
  i.animate([{transform:'translateY(0) rotate(0)'},{transform:`translateY(${(y1-y0)*.35-90}px) rotate(300deg)`,easing:'ease-in',offset:.5},{transform:`translateY(${y1-y0}px) rotate(720deg)`}],{duration:T,easing:'ease-out'});
  V41.until=Date.now()+T;
  return true;
}
function v41Fx(good,el){
  try{
    const s=document.getElementById('ses');if(!s)return;
    const target=el||s.querySelector('.opt.ok,.qx-slots,.dline,.q-play');
    if(good&&target){const r=target.getBoundingClientRect();v41Burst(r.left+Math.min(r.width,320)/2,r.top+r.height/2,['#2fd27a','#fff',getComputedStyle(document.documentElement).getPropertyValue('--club').trim()||'#D20515','#ffd23f'],16)}
    const cell=document.getElementById(good?'v4bh':'v4ba'),from=(!good&&s.querySelector('.opt.no'))||target;
    if(cell)v41Ball(from,cell);
    const st=s.querySelector('.q-stage');
    if(st&&!qxReduce()){st.classList.remove('v41-sh','v41-no');void st.offsetWidth;st.classList.add(good?'v41-sh':'v41-no')}
  }catch(e){}
}
