'use strict';
/* Paperelle in orbita, QUACK a intervalli casuali e gestione audio compatibile con i browser mobili. */
(()=> {
  const MIN_MS=3000;
  const KEY='the-michs-night-v1';
  const CLIP='assets/quack.mp3?v=20261114-random-quacks';
  const WORDS=['QUACK! 🦆','QUACK QUACK!','PAPERE IN AVVICINAMENTO...','PREPARAZIONE PAPERE...','QUACK! MISSIONE IN ARRIVO...'];
  let busy=false,ctx=null,quackBuffer=null,quackBytes=null,decodePromise=null;
  let quackTimer=null,finishTimer=null,suppressNextHash=false,firstQuackPlayed=false;
  const playing=new Set();
  const root=document.getElementById('duck-loader');
  if(!root)return;
  const status=document.getElementById('duck-loader-text');
  const audioButton=document.getElementById('duck-audio-unlock');
  const duckSvg='<svg viewBox="0 0 102 90" aria-hidden="true"><path fill="#ffdb31" stroke="#51351d" stroke-width="3.3" stroke-linejoin="round" d="M14 58Q11 41 30 35Q23 25 29 17Q35 5 48 7Q63 10 61 28Q67 32 70 43Q85 39 91 50Q100 72 81 79Q47 89 24 77Q13 70 14 58Z"/><path fill="#f6bc12" d="M36 47Q50 37 65 48Q57 64 42 64Q32 59 36 47Z"/><circle cx="49" cy="25" r="4.2" fill="#2d1927"/><circle cx="50.5" cy="23.3" r="1.1" fill="#fff"/><path fill="#ff923f" stroke="#7d371c" stroke-width="2.2" stroke-linejoin="round" d="M60 29L80 33Q86 35 81 40L61 41Z"/><path stroke="#fff7a1" stroke-width="3" fill="none" stroke-linecap="round" d="M24 55Q24 49 28 45"/></svg>';
  const orbit=document.getElementById('duck-orbit');
  orbit.innerHTML=Array.from({length:8},(_,i)=>'<span class="orbit-duck" style="--n:'+i+'">'+duckSvg+'</span>').join('');

  function soundOn(){
    try{return JSON.parse(localStorage.getItem(KEY)||'{}').sound!==false}
    catch{return true}
  }
  const audioReady=()=>!!(ctx&&ctx.state==='running'&&quackBuffer);
  function updateAudioButton(){
    if(audioButton)audioButton.hidden=!busy||!soundOn()||audioReady();
  }
  function preloadQuack(){
    if(!quackBytes){
      if(typeof fetch!=='function')return Promise.resolve(null);
      quackBytes=fetch(CLIP).then(response=>{
        if(!response.ok)throw Error('QUACK non disponibile');
        return response.arrayBuffer();
      }).catch(()=>null);
    }
    return quackBytes;
  }
  function decodeQuack(){
    if(quackBuffer||!ctx)return Promise.resolve();
    if(!decodePromise){
      decodePromise=preloadQuack().then(bytes=>bytes?ctx.decodeAudioData(bytes.slice(0)):null)
        .then(buffer=>{quackBuffer=buffer})
        .catch(()=>{decodePromise=null});
    }
    return decodePromise;
  }
  function stopPlaying(){
    playing.forEach(source=>{try{source.stop()}catch{}});
    playing.clear();
  }
  function playQuack(){
    if(!busy||!soundOn()||!audioReady())return false;
    try{
      const source=ctx.createBufferSource(),gain=ctx.createGain();
      source.buffer=quackBuffer;
      source.playbackRate.value=.94+Math.random()*.12;
      gain.gain.value=.5;
      source.connect(gain);gain.connect(ctx.destination);
      source.onended=()=>playing.delete(source);
      playing.add(source);
      source.start();
      firstQuackPlayed=true;
      return true;
    }catch{return false}
  }
  function randomDelay(min,max){return min+Math.floor(Math.random()*(max-min+1))}
  function scheduleQuack(first=false){
    clearTimeout(quackTimer);
    if(!busy)return;
    quackTimer=setTimeout(()=>{
      quackTimer=null;
      if(!busy)return;
      if(status)status.textContent=WORDS[Math.floor(Math.random()*WORDS.length)];
      playQuack();
      scheduleQuack();
    },first?randomDelay(280,600):randomDelay(620,1370));
  }
  function unlockAudio(){
    if(!soundOn()){updateAudioButton();return}
    try{
      const AudioContextClass=window.AudioContext||window.webkitAudioContext;
      if(!AudioContextClass){updateAudioButton();return}
      ctx=ctx||new AudioContextClass();
      // Resume is invoked synchronously inside pointerdown/keydown/click, as Safari requires.
      const resume=ctx.state==='suspended'?ctx.resume():Promise.resolve();
      Promise.resolve(resume).then(decodeQuack).then(()=>{
        updateAudioButton();
        if(busy&&audioReady()&&!firstQuackPlayed){
          playQuack();
          scheduleQuack();
        }
      }).catch(updateAudioButton);
    }catch{updateAudioButton()}
  }
  function cleanup(){
    clearTimeout(quackTimer);quackTimer=null;
    clearTimeout(finishTimer);finishTimer=null;
    stopPlaying();
  }
  function show(){
    cleanup();
    busy=true;firstQuackPlayed=false;
    root.hidden=false;root.classList.add('is-visible');root.setAttribute('aria-hidden','false');
    if(status)status.textContent='QUACK! PREPARAZIONE PAPERE...';
    updateAudioButton();
    // Start downloading before the user touches the page to avoid losing the first quack.
    preloadQuack();
    unlockAudio(); // Autoplay works only where the browser allows it.
    scheduleQuack(true);
  }
  function hide(){
    busy=false;cleanup();
    root.classList.remove('is-visible');root.setAttribute('aria-hidden','true');
    updateAudioButton();
    setTimeout(()=>{if(!busy)root.hidden=true},300);
  }
  function navigate(target,callback){
    if(busy)return;
    show();
    finishTimer=setTimeout(()=>{
      suppressNextHash=true;
      hide();callback();
      window.scrollTo({top:0,behavior:'instant'});
      setTimeout(()=>{suppressNextHash=false},100);
    },MIN_MS);
  }
  window.michLoader={navigate,isBusy:()=>busy,show,hide};
  if(audioButton)audioButton.addEventListener('click',unlockAudio);
  document.addEventListener('pointerdown',unlockAudio,{once:true,capture:true});
  document.addEventListener('keydown',unlockAudio,{once:true,capture:true});
  /* Il loader iniziale appare subito: nei browser che richiedono un gesto, il pulsante attiva i QUACK. */
  show();
  finishTimer=setTimeout(hide,MIN_MS);
  window.addEventListener('hashchange',()=>{
    if(busy||suppressNextHash)return;
    if(location.hash&&location.hash!=='#home'){
      show();finishTimer=setTimeout(hide,MIN_MS);
    }
  });
})();
