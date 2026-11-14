'use strict';
/* Finale soundtrack: Safari-safe gesture-initiated playback.
 * On every trip to the finale, begin the HTMLAudioElement.play() within the tap.
 * Keep it inaudible during the 3-second duck loader, then reveal from time zero.
 * Web Audio controls volume on iOS, where media.volume may not be adjustable. */
(()=>{
  const SRC='assets/finale-music.mp3?v=20261114-finale';
  const KEY='themichsnight-finale-music-muted';
  const VOLUME=.27,CONTRACT_VOLUME=.105;
  let desiredRoute='home',siteSoundOn=true,musicMuted=false;
  let context=null,sourceNode=null,gainNode=null,pendingReveal=false;
  let media=null,lastStatus='',playAttempt=0;
  try{musicMuted=localStorage.getItem(KEY)==='1'}catch{}

  function ensureMedia(){
    if(media)return media;
    try{
      media=new Audio(SRC);
      media.loop=true;
      media.preload='auto';
      media.playsInline=true;
      media.setAttribute?.('playsinline','');
      media.volume=VOLUME;
      media.load?.();
    }catch{return null}
    return media;
  }
  function ensureGraph(){
    if(context)return context;
    const AudioContextClass=window.AudioContext||window.webkitAudioContext;
    if(!AudioContextClass)return null;
    const audio=ensureMedia();
    if(!audio)return null;
    try{
      context=new AudioContextClass();
      sourceNode=context.createMediaElementSource(audio);
      gainNode=context.createGain();
      gainNode.gain.value=0;
      sourceNode.connect(gainNode);
      gainNode.connect(context.destination);
      audio.volume=1; // Volume is controlled by Web Audio, including on iPhone.
    }catch{
      context=null;sourceNode=null;gainNode=null;
      audio.volume=VOLUME;
    }
    return context;
  }
  function level(value){
    const v=Math.max(0,Math.min(1,value));
    if(gainNode&&context){
      try{
        const t=context.currentTime;
        gainNode.gain.cancelScheduledValues(t);
        gainNode.gain.setTargetAtTime(v,t,.11);
        return;
      }catch{}
    }
    if(media){
      try{media.volume=v}catch{}
    }
  }
  function allowed(){return desiredRoute==='finale'&&siteSoundOn&&!musicMuted}
  function status(value){
    lastStatus=value;
    const button=document.getElementById('finale-music-toggle');
    if(!button)return;
    const playing=!!media&&!media.paused&&!pendingReveal;
    button.setAttribute('aria-pressed',String(playing&&allowed()));
    if(!siteSoundOn)button.textContent='♫ AUDIO GENERALE DISATTIVATO';
    else if(musicMuted)button.textContent='♫ MUSICA OFF · TOCCA PER ATTIVARE';
    else if(playing)button.textContent='♫ MUSICA ON · TOCCA PER DISATTIVARE';
    else if(value==='loading')button.textContent='♫ CARICAMENTO MUSICA...';
    else button.textContent='♫ TOCCA PER ASCOLTARE LA MUSICA';
  }
  function playFromGesture(){
    const audio=ensureMedia();
    if(!audio||!siteSoundOn||musicMuted)return false;
    ensureGraph();
    // resume() and play() happen synchronously inside the real click on Safari.
    try{
      if(context?.state==='suspended')context.resume().catch(()=>{});
      if(!audio.paused){status('playing');return true}
      const attempt=++playAttempt;
      const result=audio.play();
      if(result&&typeof result.then==='function'){
        result.then(()=>{
          if(attempt!==playAttempt||!audio)return;
          if(!allowed()&&!pendingReveal){audio.pause();return}
          status('playing');
        }).catch(()=>{if(attempt===playAttempt)status('tap')});
      }
      return true;
    }catch{status('tap');return false}
  }
  function prepareReveal(enabled){
    // Called by go('finale') before the loader, during a user gesture.
    siteSoundOn=enabled!==false;
    desiredRoute='finale';
    pendingReveal=true;
    if(!siteSoundOn||musicMuted){status('tap');return}
    level(0);
    playFromGesture();
  }
  function stop(){
    pendingReveal=false;
    playAttempt++;
    if(media){
      try{media.pause();media.currentTime=0}catch{}
    }
    level(0);
    status('stopped');
  }
  function controls(){
    if(document.getElementById('finale-music-controls'))return;
    const poster=document.querySelector('.final-poster-artboard');
    if(!poster)return;
    const panel=document.createElement('div');
    panel.id='finale-music-controls';
    panel.className='finale-music-controls';
    const button=document.createElement('button');
    button.type='button';button.id='finale-music-toggle';
    button.className='finale-music-toggle';
    button.setAttribute('aria-label','Attiva o disattiva la musica del gran finale');
    button.addEventListener('click',()=>{
      if(!siteSoundOn){status('tap');return}
      if(musicMuted){
        musicMuted=false;
        try{localStorage.setItem(KEY,'0')}catch{}
        level(VOLUME);
        playFromGesture();
      }else if(media&&!media.paused){
        musicMuted=true;
        try{localStorage.setItem(KEY,'1')}catch{}
        stop();
      }else{
        level(VOLUME);
        playFromGesture();
      }
      status();
    });
    panel.append(button);
    const caption=document.createElement('small');
    caption.textContent='Musica della sorpresa · volume delicato';
    panel.append(caption);
    poster.insertAdjacentElement('afterend',panel);
    status();
  }
  function onRoute(route,soundOn){
    const revealWasPrepared=pendingReveal;
    desiredRoute=route;siteSoundOn=soundOn!==false;
    if(route!=='finale'){stop();return}
    controls();
    pendingReveal=false;
    if(!allowed()){stop();return}
    if(revealWasPrepared&&media&&!media.paused){
      // Always restart at the beginning, not at second 3 of the loader.
      try{media.currentTime=0}catch{}
      level(VOLUME);
      status('playing');
      return;
    }
    level(VOLUME);
    if(media&&!media.paused){status('playing');return}
    // Direct URL, browser back or blocked autoplay: offer the explicit button.
    playFromGesture();
    status(media&&!media.paused?'playing':'tap');
  }
  function onSoundChange(enabled){
    siteSoundOn=!!enabled;
    if(!siteSoundOn)stop();
    else if(desiredRoute==='finale'){
      level(VOLUME);
      playFromGesture(); // This callback is invoked by the actual sound-toggle click.
    }
    status();
  }
  function underContract(isOpen){
    if(allowed())level(isOpen?CONTRACT_VOLUME:VOLUME);
  }
  function preload(){ensureMedia()}
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)stop();
    else if(desiredRoute==='finale')status('tap');
  });
  window.addEventListener('pagehide',stop);
  window.michFinaleMusic={onRoute,onSoundChange,underContract,stop,preload,arm:playFromGesture,start:playFromGesture,prepareReveal};
  preload();
})();
