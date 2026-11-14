'use strict';
/* Finale music: prime the SAME native audio element with a silent WAV inside
 * the very first user gesture. No soundtrack plays during the duck loader.
 * On the reveal, change that element's src and play the actual track ONCE.
 * iOS Safari grants subsequent playback to the interacted-with media element.
 * The visible play button is the honest fallback for restrictive browsers. */
(()=>{
 const SRC='assets/finale-music.mp3?v=20261114-finale';
 const SILENT_WAV='data:audio/wav;base64,UklGRsQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YaAAAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA';
 const KEY='themichsnight-finale-music-muted';
 const VOLUME=.4,CONTRACT_VOLUME=.17;
 let route='home',globalSound=true,localMuted=false;
 let media=null,primed=false,primePending=false,prepared=false,trackLoaded=false;
 let playbackStatus='idle',request=0;
 try{localMuted=localStorage.getItem(KEY)==='1'}catch{}

 function audio(){
  if(media)return media;
  try{
   media=new Audio(SILENT_WAV);
   media.preload='auto';media.loop=false;media.volume=VOLUME;
   media.playsInline=true;media.setAttribute?.('playsinline','');
   media.addEventListener?.('playing',()=>{
    if(trackLoaded&&route==='finale'){playbackStatus='playing';refresh()}
   });
   media.addEventListener?.('pause',()=>{if(trackLoaded){playbackStatus='paused';refresh()}});
   media.addEventListener?.('error',()=>{
    if(trackLoaded){playbackStatus='blocked';refresh()}
   });
  }catch{return null}
  return media;
 }
 function allowed(){return route==='finale'&&globalSound&&!localMuted}
 function refresh(){
  const button=document.getElementById('finale-music-toggle');
  const mute=document.getElementById('finale-music-mute');
  const state=document.getElementById('finale-music-state');
  const playing=trackLoaded&&media&&!media.paused&&playbackStatus==='playing'&&allowed();
  if(button){
   button.textContent=localMuted?'♫ ATTIVA LA MUSICHETTA':
    playing?'♫ RIASCOLTA DALL’INIZIO':'♫ RIPRODUCI MUSICHETTA';
   button.disabled=!globalSound;
   button.setAttribute('aria-pressed',String(!!playing));
  }
  if(mute){
   mute.textContent=localMuted?'🔈 RIATTIVA':'🔇 SILENZIA';
   mute.disabled=!globalSound;
   mute.setAttribute('aria-pressed',String(localMuted));
  }
  if(state){
   state.textContent=!globalSound?'Audio generale disattivato':
    localMuted?'Musica disattivata':
    playing?'♫ Musica in riproduzione':
    playbackStatus==='loading'?'♫ Avvio musichetta...':
    playbackStatus==='blocked'?'♫ Safari richiede un tocco su Riproduci':
    '♫ Tocca Riproduci per attivare';
  }
 }

 // Called by a REAL click/keydown, not by the delayed route callback.
 // The entire priming sound is digital silence, so it cannot be heard.
 function prime(){
  if(!globalSound||localMuted||primed||primePending||trackLoaded)return;
  const el=audio();if(!el)return;
  primePending=true;
  try{
   const result=el.play();
   if(result&&typeof result.then==='function'){
    result.then(()=>{primed=true;primePending=false})
     .catch(()=>{primePending=false});
   }else{primed=true;primePending=false}
  }catch{primePending=false}
 }

 function prepareReveal(soundOn){
  route='finale';globalSound=soundOn!==false;prepared=true;
  // The click capture listener has already primed the audio element.
  // Never call play() on the real music here: the duck loader is still visible.
  prime();
 }

 function stop(){
  prepared=false;request++;playbackStatus='idle';
  // Do not interrupt the silent primer on an ordinary navigation click.
  // Safari must finish that short silent sample to grant this element playback.
  if(media&&trackLoaded){
   try{media.pause();media.currentTime=0}catch{}
  }
  refresh();
 }

 function playMusic(restart){
  if(!allowed()){refresh();return}
  const el=audio();if(!el)return;
  const token=++request;
  try{
   // Use the SAME element which Safari authorised with its silent sample.
   if(!trackLoaded){
    try{el.pause()}catch{}
    el.src=SRC;trackLoaded=true;el.loop=true;el.preload='auto';
    el.load?.();
   }
   if(restart){
    try{el.pause();el.currentTime=0}catch{}
   }
   if(!el.paused){
    playbackStatus='playing';refresh();return;
   }
   playbackStatus='loading';refresh();
   const promise=el.play();
   if(promise&&typeof promise.then==='function'){
    promise.then(()=>{
     if(token!==request)return;
     if(!allowed()){stop();return}
     playbackStatus='playing';refresh();
    }).catch(()=>{
     if(token!==request)return;
     playbackStatus='blocked';refresh();
    });
   }else{playbackStatus='playing';refresh()}
  }catch{
   if(token===request){playbackStatus='blocked';refresh()}
  }
 }

 function controlBar(){
  if(document.getElementById('finale-music-controls'))return;
  const poster=document.querySelector('.final-poster-artboard');
  if(!poster)return;
  const box=document.createElement('div');
  box.id='finale-music-controls';box.className='finale-music-controls';
  const play=document.createElement('button');
  play.id='finale-music-toggle';play.type='button';play.className='finale-music-toggle';
  play.setAttribute('aria-label','Riproduci o riascolta la musichetta del gran finale');
  play.addEventListener('click',()=>{
   if(!globalSound){refresh();return}
   if(localMuted){
    localMuted=false;try{localStorage.setItem(KEY,'0')}catch{}
   }
   playMusic(true);
  });
  box.append(play);
  const mute=document.createElement('button');
  mute.id='finale-music-mute';mute.type='button';mute.className='finale-music-mute';
  mute.setAttribute('aria-label','Silenzia o riattiva la musichetta del gran finale');
  mute.addEventListener('click',()=>{
   if(!globalSound){refresh();return}
   localMuted=!localMuted;
   try{localStorage.setItem(KEY,localMuted?'1':'0')}catch{}
   if(localMuted)stop();else playMusic(true);
  });
  box.append(mute);
  const state=document.createElement('small');
  state.id='finale-music-state';state.className='finale-music-state';
  box.append(state);
  poster.insertAdjacentElement('beforebegin',box);
  refresh();
 }

 function onRoute(nextRoute,soundOn){
  const wasPrepared=prepared;
  route=nextRoute;globalSound=soundOn!==false;
  if(nextRoute!=='finale'){stop();return}
  controlBar();prepared=false;
  if(!allowed()){stop();return}
  if(wasPrepared){
   // Called after the loader fades out and the poster is in the DOM.
   // THIS is the only place where the actual music can start automatically.
   playMusic(true);return;
  }
  if(trackLoaded&&media&&!media.paused){
   // E.g. the contract rerender. Keep the music uninterrupted.
   refresh();return;
  }
  // Direct #finale URL or browser Back: may be disallowed without a new tap.
  playMusic(false);
 }
 function onSoundChange(enabled){
  globalSound=!!enabled;
  if(!globalSound)stop();
  else if(route==='finale')playMusic(false);
  refresh();
 }
 function underContract(isOpen){
  if(media&&trackLoaded&&allowed()){
   try{media.volume=isOpen?CONTRACT_VOLUME:VOLUME}catch{}
  }
 }
 function preload(){
  audio(); // This source is SILENT, not the finale MP3.
  // Download in advance without starting playback, for a prompt first reveal.
  if(typeof fetch==='function'){
   fetch(SRC,{cache:'force-cache'}).catch(()=>{});
  }
 }
 document.addEventListener('click',prime,{capture:true});
 document.addEventListener('keydown',prime,{capture:true});
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden)stop();else if(route==='finale')refresh();
 });
 window.addEventListener('pagehide',stop);
 window.michFinaleMusic={onRoute,onSoundChange,underContract,stop,preload,prepareReveal,
  arm:prime,start:playMusic};
 preload();
})();
