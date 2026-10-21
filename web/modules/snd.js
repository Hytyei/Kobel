/* ───────── Sound: a small synth with a master chain (compressor + soft low-pass), warm tones, noise clicks, climbing combo notes ─────────
   Replaces tone() and sfx() from the base file (later declarations win). Same signatures, so every old call site gets the new sound. */
let SND=null;
function sndInit(){
  if(SND&&SND.ctx.state!=='closed'){if(SND.ctx.state==='suspended')try{SND.ctx.resume()}catch(e){}return SND}
  const ctx=new (window.AudioContext||window.webkitAudioContext)();
  const comp=ctx.createDynamicsCompressor();comp.threshold.value=-18;comp.knee.value=18;comp.ratio.value=4;comp.attack.value=.004;comp.release.value=.2;
  const out=ctx.createGain();out.gain.value=.9;
  const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=9000;
  lp.connect(comp);comp.connect(out);out.connect(ctx.destination);
  const len=ctx.sampleRate*1,buf=ctx.createBuffer(1,len,ctx.sampleRate),d=buf.getChannelData(0);
  for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
  SND={ctx,bus:lp,noise:buf};AC=ctx;return SND;
}
/* one voice: main oscillator + a slightly detuned twin, low-passed, soft attack, exponential tail; glide optional */
function tone(f,t,d,type='sine',v=.12,glide){
  try{
    const S0=sndInit(),ctx=S0.ctx,t0=ctx.currentTime+t,g=ctx.createGain(),flt=ctx.createBiquadFilter();
    const rough=type==='sawtooth'||type==='square';
    flt.type='lowpass';flt.frequency.value=Math.min(9000,f*(rough?3:7));flt.Q.value=.5;
    const vv=v*(rough?.7:1);
    g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(vv,t0+.008);g.gain.setTargetAtTime(0,t0+Math.min(.04,d*.25),Math.max(.02,d/4));
    const mk=det=>{const o=ctx.createOscillator();o.type=type;o.frequency.setValueAtTime(f,t0);if(glide)o.frequency.exponentialRampToValueAtTime(Math.max(30,glide),t0+d);o.detune.value=det;o.connect(flt);o.start(t0);o.stop(t0+d+.25);return o};
    mk(-4);mk(5);flt.connect(g);g.connect(S0.bus);
  }catch(e){}
}
/* filtered noise burst: clicks, whooshes, stamps */
function noiseHit(t,d,freq,q,v,sweepTo){
  try{
    const S0=sndInit(),ctx=S0.ctx,t0=ctx.currentTime+t,src=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();
    src.buffer=S0.noise;src.loop=true;f.type='bandpass';f.Q.value=q;f.frequency.setValueAtTime(freq,t0);if(sweepTo)f.frequency.exponentialRampToValueAtTime(sweepTo,t0+d);
    g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(v,t0+.005);g.gain.setTargetAtTime(0,t0+d*.3,d/4);
    src.connect(f);f.connect(g);g.connect(S0.bus);src.start(t0,Math.random()*.5);src.stop(t0+d+.2);
  }catch(e){}
}
const SND_PENT=[0,2,4,7,9,12,14,16,19];                   // major pentatonic: every correct answer in a row climbs one step
const sndHz=(base,st)=>base*Math.pow(2,st/12);
function sfx(k,n){
  if(!S.settings.sound)return;
  const run=n!=null?n:((typeof ses!=='undefined'&&ses&&ses.combo)|0);
  if(k==='ok'){
    const st=SND_PENT[Math.min(SND_PENT.length-1,Math.max(0,run-1))],b=sndHz(523.25,st);
    tone(b,0,.2,'triangle',.11);tone(b*1.5,.07,.3,'sine',.1);tone(b*3,.07,.18,'sine',.025);
  }
  else if(k==='close'){tone(440,0,.18,'triangle',.09);tone(554,.08,.22,'sine',.08)}
  else if(k==='bad'||k==='no'){
    tone(233,0,.32,'triangle',.11,150);tone(175,.11,.4,'sine',.1,110);noiseHit(0,.08,300,.8,.03);
  }
  else if(k==='tick'){noiseHit(0,.035,2200,2.5,.07);tone(640,0,.06,'sine',.06,420)}
  else if(k==='slot'){const p=sndHz(520,Math.min(12,(n|0)));noiseHit(0,.03,2400,2.5,.05);tone(p,0,.09,'sine',.07,p*.7)}
  else if(k==='back'){noiseHit(0,.03,1500,2,.05);tone(360,0,.08,'sine',.05,260)}
  else if(k==='hint'){tone(1046,0,.4,'sine',.07);tone(1568,.1,.5,'sine',.05)}
  else if(k==='whoosh'){noiseHit(0,.22,500,.9,.028,2600)}
  else if(k==='stamp'){tone(110,0,.3,'sine',.2,55);noiseHit(0,.12,900,.7,.08)}
  else if(k==='combo'){
    const b=sndHz(523.25,SND_PENT[Math.min(SND_PENT.length-1,Math.floor((n|0)/3))]);
    [0,4,7,12,16].forEach((s,i)=>tone(sndHz(b,s),.05+i*.055,.32,'triangle',.07));tone(sndHz(b,12)*2,.3,.5,'sine',.03);
  }
  else if(k==='win'){
    [0,4,7,12,14,16].forEach((s,i)=>tone(sndHz(392,s),i*.085,.45,'triangle',.095));
    tone(196,0,.7,'sine',.12);tone(sndHz(392,28),.45,.7,'sine',.03);
  }
  else if(k==='lose'){[0,-3,-7].forEach((s,i)=>tone(sndHz(330,s),i*.16,.5,'triangle',.09,sndHz(330,s)*.95))}
}
