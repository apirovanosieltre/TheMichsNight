'use strict';
/* Otto paperelle in orbita: QUACK reali via HTMLAudioElement.
 * Safari iOS può bloccare audio all'avvio senza interazione, ma i tocchi
 * sulle missioni chiamano play() nello stesso gesto (prima del loader).
 * Un unico lettore viene riutilizzato per non perdere l'autorizzazione. */
(()=>{
 const MIN_MS=3000;
 const KEY='the-michs-night-v1';
 const CLIP='assets/quack.mp3?v=20261114-quack-native-v2';
 const WORDS=['QUACK! MISSIONE IN ARRIVO...','LE PAPERE SONO QUASI PRONTE...','PREPARAZIONE MISSIONE...','QUACK QUACK... CI SIAMO!','ACCESSO ALL’AVVENTURA...'];
 let busy=false,quack=null,quackTimer=null,finishTimer=null,suppressNextHash=false;
 let firstQuackPlayed=false,quackPending=false,quackUnlocked=false,quackFailed=false,playToken=0;
 const root=document.getElementById('duck-loader');
 if(!root)return;
 const status=document.getElementById('duck-loader-text');
 const audioButton=document.getElementById('duck-audio-unlock');
 const audioState=document.getElementById('duck-audio-state');
 const orbit=document.getElementById('duck-orbit');
 const duckSvg='<svg viewBox="0 0 102 90" aria-hidden="true"><path fill="#ffdb31" stroke="#51351d" stroke-width="3.3" stroke-linejoin="round" d="M14 58Q11 41 30 35Q23 25 29 17Q35 5 48 7Q63 10 61 28Q67 32 70 43Q85 39 91 50Q100 72 81 79Q47 89 24 77Q13 70 14 58Z"/><path fill="#f6bc12" d="M36 47Q50 37 65 48Q57 64 42 64Q32 59 36 47Z"/><circle cx="49" cy="25" r="4.2" fill="#2d1927"/><circle cx="50.5" cy="23.3" r="1.1" fill="#fff"/><path fill="#ff923f" stroke="#7d371c" stroke-width="2.2" stroke-linejoin="round" d="M60 29L80 33Q86 35 81 40L61 41Z"/><path stroke="#fff7a1" stroke-width="3" fill="none" stroke-linecap="round" d="M24 55Q24 49 28 45"/></svg>';
 orbit.innerHTML=Array.from({length:8},(_,i)=>'<span class="orbit-duck" style="--angle:'+(i*45)+'deg;--counter:'+(-i*45)+'deg">'+duckSvg+'</span>').join('');
 function soundOn(){
  try{return JSON.parse(localStorage.getItem(KEY)||'{}').sound!==false}
  catch{return true}
 }
 function audio(){
  if(quack)return quack;
  try{
   quack=new Audio(CLIP);
   quack.preload='auto';
   quack.volume=.65;
   quack.loop=false;
   quack.playsInline=true;
   quack.setAttribute?.('playsinline','');
   quack.addEventListener?.('ended',()=>{
    quackPending=false;
    updateAudioButton();
   });
   quack.addEventListener?.('error',()=>{
    quackFailed=true;
    quackPending=false;
    updateAudioButton();
   });
   quack.load?.();
  }catch{return null}
  return quack;
 }
 function preloadQuack(){return audio()}
 function audioReady(){return quackUnlocked&&!!quack&&!quackFailed}
 function updateAudioButton(){
  const enabled=soundOn(),ready=audioReady();
  if(audioButton){
   audioButton.hidden=!busy||!enabled||ready;
   audioButton.textContent=quackFailed?'🔊 RIPROVA I QUACK':'🔊 ATTIVA I QUACK';
  }
  if(audioState){
   audioState.hidden=!busy||(enabled&&!ready);
   if(!audioState.hidden)audioState.textContent=enabled?'♫ QUACK ATTIVATI':'♫ AUDIO DISATTIVATO';
  }
 }
 function stopPlaying(){
  playToken++;
  quackPending=false;
  if(quack){
   try{quack.pause();quack.currentTime=0}catch{}
  }
 }
 function playQuack(){
  if(!busy||!soundOn())return false;
  const el=audio();
  if(!el||quackPending)return false;
  const token=++playToken;
  try{
   if(!el.paused){
    // Non tagliare un verso ancora in corso.
    return false;
   }
   try{el.currentTime=0}catch{}
   quackPending=true;
   const result=el.play();
   if(result&&typeof result.then==='function'){
    result.then(()=>{
     if(token!==playToken)return;
     quackPending=false;
     quackUnlocked=true;
     quackFailed=false;
     firstQuackPlayed=true;
     updateAudioButton();
    }).catch(()=>{
     if(token!==playToken)return;
     quackPending=false;
     quackFailed=true;
     updateAudioButton();
    });
   }else{
    quackPending=false;
    quackUnlocked=true;
    quackFailed=false;
    firstQuackPlayed=true;
    updateAudioButton();
   }
   return true;
  }catch{
   quackPending=false;
   quackFailed=true;
   updateAudioButton();
   return false;
  }
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
  },first?randomDelay(780,1050):randomDelay(750,1180));
 }
 function unlockAudio(){
  if(!busy||!soundOn()){updateAudioButton();return}
  // Native media playback happens synchronously in the user gesture.
  playQuack();
  updateAudioButton();
 }
 function cleanup(){
  clearTimeout(quackTimer);quackTimer=null;
  clearTimeout(finishTimer);finishTimer=null;
  stopPlaying();
 }
 function show(){
  cleanup();
  busy=true;firstQuackPlayed=false;quackFailed=false;
  root.hidden=false;
  root.classList.add('is-visible');
  root.setAttribute('aria-hidden','false');
  document.documentElement?.classList?.add('duck-loading');
  document.body?.classList?.add('duck-loading');
  if(status)status.textContent='PREPARAZIONE MISSIONE...';
  preloadQuack();
  updateAudioButton();
  // Quando si arriva qui da un pulsante, siamo ancora nel click di Safari.
  // Al primo caricamento senza gesto resta il pulsante di attivazione.
  playQuack();
  scheduleQuack(true);
 }
 function hide(){
  busy=false;cleanup();
  root.classList.remove('is-visible');
  root.setAttribute('aria-hidden','true');
  document.documentElement?.classList?.remove('duck-loading');
  document.body?.classList?.remove('duck-loading');
  updateAudioButton();
  setTimeout(()=>{if(!busy)root.hidden=true},300);
 }
 function navigate(target,callback){
  if(busy)return;
  show();
  finishTimer=setTimeout(()=>{
   suppressNextHash=true;
   hide();
   callback();
   window.scrollTo({top:0,behavior:'instant'});
   setTimeout(()=>{suppressNextHash=false},100);
  },MIN_MS);
 }
 window.michLoader={navigate,isBusy:()=>busy,show,hide,playQuack,preloadQuack};
 if(audioButton)audioButton.addEventListener('click',unlockAudio);
 document.addEventListener('pointerdown',()=>{if(busy)unlockAudio()},{capture:true});
 document.addEventListener('keydown',()=>{if(busy)unlockAudio()},{capture:true});
 show();
 finishTimer=setTimeout(hide,MIN_MS);
 window.addEventListener('hashchange',()=>{
  if(busy||suppressNextHash)return;
  if(location.hash&&location.hash!=='#home'){
   show();finishTimer=setTimeout(hide,MIN_MS);
  }
 });
})();
