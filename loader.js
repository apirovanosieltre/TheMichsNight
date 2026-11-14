'use strict';
/* Otto paperelle in orbita, con una durata minima di 3 secondi. */
(()=> {
  const MIN_MS=3000;
  let busy=false, soundUnlocked=false, ctx=null, ticks=[], labelTimer=null, finishTimer=null;
  const root=document.getElementById('duck-loader');
  if(!root)return;
  const status=document.getElementById('duck-loader-text');
  const duckSvg='<svg viewBox="0 0 102 90" aria-hidden="true"><path fill="#ffdb31" stroke="#51351d" stroke-width="3.3" stroke-linejoin="round" d="M14 58Q11 41 30 35Q23 25 29 17Q35 5 48 7Q63 10 61 28Q67 32 70 43Q85 39 91 50Q100 72 81 79Q47 89 24 77Q13 70 14 58Z"/><path fill="#f6bc12" d="M36 47Q50 37 65 48Q57 64 42 64Q32 59 36 47Z"/><circle cx="49" cy="25" r="4.2" fill="#2d1927"/><circle cx="50.5" cy="23.3" r="1.1" fill="#fff"/><path fill="#ff923f" stroke="#7d371c" stroke-width="2.2" stroke-linejoin="round" d="M60 29L80 33Q86 35 81 40L61 41Z"/><path stroke="#fff7a1" stroke-width="3" fill="none" stroke-linecap="round" d="M24 55Q24 49 28 45"/></svg>';
  const orbit=document.getElementById('duck-orbit');
  orbit.innerHTML=Array.from({length:8},(_,i)=>'<span class="orbit-duck" style="--n:'+i+'">'+duckSvg+'</span>').join('');
  function soundOn(){try{const data=JSON.parse(localStorage.getItem('the-michs-night-v1')||'{}');return data.sound!==false}catch{return true}}
  function quack(){
    if(!soundUnlocked||!soundOn())return;
    try{
      const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
      ctx=ctx||new Audio();
      if(ctx.state==='suspended')ctx.resume();
      const t=ctx.currentTime,osc=ctx.createOscillator(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
      osc.type='sawtooth';osc.frequency.setValueAtTime(570,t);osc.frequency.exponentialRampToValueAtTime(315,t+.09);osc.frequency.exponentialRampToValueAtTime(450,t+.19);
      filter.type='lowpass';filter.frequency.setValueAtTime(930,t);filter.Q.value=1.4;
      gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(.045,t+.025);gain.gain.setValueAtTime(.04,t+.08);gain.gain.exponentialRampToValueAtTime(.0001,t+.22);
      osc.connect(filter);filter.connect(gain);gain.connect(ctx.destination);osc.start(t);osc.stop(t+.23);
    }catch{}
  }
  function cleanup(){ticks.forEach(clearTimeout);ticks=[];clearTimeout(labelTimer);labelTimer=null;clearTimeout(finishTimer);finishTimer=null}
  function show(){
    cleanup();busy=true;root.hidden=false;root.classList.add('is-visible');root.setAttribute('aria-hidden','false');
    const words=['QUACK! 🐤','QUACK QUACK!','PREPARAZIONE PAPERE...','QUACK!','MISSIONE IN ARRIVO...'];
    if(status)status.textContent='QUACK! PREPARAZIONE PAPERE...';
    [500,1270,1990,2650].forEach((time,i)=>ticks.push(setTimeout(()=>{if(status)status.textContent=words[i];quack()},time)));
  }
  function hide(){cleanup();root.classList.remove('is-visible');root.setAttribute('aria-hidden','true');setTimeout(()=>{if(!busy)root.hidden=true},300);busy=false}
  function navigate(target,callback){
    if(busy)return;
    show();
    finishTimer=setTimeout(()=>{hide();callback();window.scrollTo({top:0,behavior:'instant'})},MIN_MS);
  }
  window.michLoader={navigate, isBusy:()=>busy, show, hide};
  document.addEventListener('pointerdown',()=>{soundUnlocked=true},{once:true,capture:true});
  document.addEventListener('keydown',()=>{soundUnlocked=true},{once:true,capture:true});
  /* Il markup del loader è presente dall'inizio: non appare un flash di pagina vuota. */
  show();
  finishTimer=setTimeout(hide,MIN_MS);
  window.addEventListener('hashchange',()=>{
    /* Supporto anche indietro/avanti del browser. La navigazione guidata è già gestita da navigate(). */
    if(busy)return;
    const now=location.hash;
    if(now&&now!=='#home'){
      show();finishTimer=setTimeout(hide,MIN_MS);
    }
  });
})();
