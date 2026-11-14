'use strict';
/* Music starts only when the final reward is revealed. The original MP3 is user supplied.
   Web Audio preserves a quiet background mix on iPhone; Safari may require a user gesture. */
(()=> {
  const SRC='assets/finale-music.mp3?v=20261114-finale';
  const KEY='themichsnight-finale-music-muted';
  const VOLUME=.22;
  let context=null, buffer=null, preloadPromise=null, decodePromise=null;
  let source=null, gain=null, active=false, siteSoundOn=true;
  let desiredRoute='home', musicMuted=false, status='', fallback=null;
  try{musicMuted=localStorage.getItem(KEY)==='1'}catch{}

  function emitStatus(value){
    status=value;
    const button=document.getElementById('finale-music-toggle');
    if(!button)return;
    const playing=!!source||!!(fallback&&!fallback.paused);
    button.setAttribute('aria-pressed',String(!musicMuted&&siteSoundOn));
    button.textContent=musicMuted||!siteSoundOn?'♫ MUSICA DISATTIVATA':
      playing?'♫ MUSICA ON · TOCCA PER DISATTIVARE':
      status==='loading'?'♫ CARICAMENTO MUSICA...':
      '♫ TOCCA PER ASCOLTARE LA MUSICA';
  }
  function allowed(){return desiredRoute==='finale'&&siteSoundOn&&!musicMuted}
  function preload(){
    if(preloadPromise)return preloadPromise;
    if(typeof fetch!=='function')return Promise.resolve(null);
    preloadPromise=fetch(SRC).then(r=>{
      if(!r.ok)throw Error('Finale soundtrack unavailable');
      return r.arrayBuffer();
    }).catch(()=>null);
    return preloadPromise;
  }
  function ensureContext(){
    if(context)return context;
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(!Audio)return null;
    try{context=new Audio()}catch{return null}
    return context;
  }
  function decode(){
    if(buffer)return Promise.resolve(buffer);
    const audio=ensureContext();
    if(!audio)return Promise.resolve(null);
    if(!decodePromise){
      decodePromise=preload().then(bytes=>bytes?audio.decodeAudioData(bytes.slice(0)):null)
        .then(decoded=>{buffer=decoded;return decoded})
        .catch(()=>null);
    }
    return decodePromise;
  }
  function stop(){
    active=false;
    if(source){
      try{source.stop()}catch{}
      try{source.disconnect()}catch{}
      source=null;
    }
    if(fallback){
      try{fallback.pause();fallback.currentTime=0}catch{}
    }
    emitStatus('stopped');
  }
  function playFallback(){
    if(!allowed()||source)return;
    if(!fallback){
      fallback=new Audio(SRC);
      fallback.loop=true;
      fallback.preload='auto';
      fallback.volume=VOLUME;
    }
    if(!fallback.paused){emitStatus('playing');return}
    const result=fallback.play();
    if(result&&typeof result.then==='function'){
      result.then(()=>emitStatus('playing')).catch(()=>emitStatus('tap'));
    }
  }
  async function start(){
    if(!allowed()){stop();return}
    if(source||fallback&&!fallback.paused){emitStatus('playing');return}
    const audio=ensureContext();
    if(!audio){playFallback();return}
    emitStatus('loading');
    if(audio.state!=='running'){
      // On iOS resume() is invoked by arm() in the original tap handler.
      // Do not use a delayed resume() here, because Safari may reject it.
      emitStatus('tap');return;
    }
    const clip=await decode();
    if(!allowed())return;
    if(!clip){emitStatus('tap');return}
    if(audio.state!=='running'){emitStatus('tap');return}
    if(source){emitStatus('playing');return}
    try{
      const s=audio.createBufferSource();
      const g=audio.createGain();
      s.buffer=clip;s.loop=true;
      g.gain.value=VOLUME;
      s.connect(g);g.connect(audio.destination);
      s.onended=()=>{if(source===s){source=null;active=false;emitStatus('stopped')}};
      source=s;gain=g;active=true;s.start(0);
      emitStatus('playing');
    }catch{source=null;active=false;emitStatus('tap')}
  }
  function arm(){
    if(!siteSoundOn||musicMuted)return;
    const audio=ensureContext();
    if(!audio){if(desiredRoute==='finale')playFallback();return}
    // This runs *synchronously* within pointerdown/keydown/click, as iOS Safari requires.
    try{
      const resumed=audio.state==='suspended'?audio.resume():Promise.resolve();
      Promise.resolve(resumed).then(()=>decode()).then(()=>{
        if(allowed())start();
      }).catch(()=>emitStatus('tap'));
    }catch{}
  }
  function setMusicMuted(next){
    musicMuted=!!next;
    try{localStorage.setItem(KEY,musicMuted?'1':'0')}catch{}
    if(musicMuted)stop();
    else{arm();start()}
    emitStatus();
  }
  function makeControls(){
    if(document.getElementById('finale-music-controls'))return;
    const poster=document.querySelector('.final-poster-artboard');
    if(!poster)return;
    const controls=document.createElement('div');
    controls.id='finale-music-controls';
    controls.className='finale-music-controls';
    const button=document.createElement('button');
    button.id='finale-music-toggle';
    button.className='finale-music-toggle';
    button.type='button';
    button.setAttribute('aria-label','Attiva o disattiva la musica del gran finale');
    button.addEventListener('click',()=>{
      if(musicMuted||!siteSoundOn){
        if(!siteSoundOn){
          // Respect the global sound setting: this control cannot override it.
          emitStatus('tap');return;
        }
        setMusicMuted(false);
      }else if(!active&&!(fallback&&!fallback.paused)){
        arm();start();
      }else setMusicMuted(true);
    });
    controls.append(button);
    const caption=document.createElement('small');
    caption.textContent='Musica della sorpresa · volume delicato';
    controls.append(caption);
    poster.insertAdjacentElement('afterend',controls);
    emitStatus();
  }
  function onRoute(route,soundOn){
    desiredRoute=route;
    siteSoundOn=soundOn!==false;
    if(route!=='finale'){stop();return}
    makeControls();
    if(allowed())start();
    else stop();
  }
  function onSoundChange(enabled){
    siteSoundOn=!!enabled;
    if(!siteSoundOn)stop();else if(desiredRoute==='finale'){arm();start()}
    emitStatus();
  }
  function underContract(isOpen){
    if(!gain||!context)return;
    try{
      const time=context.currentTime;
      gain.gain.cancelScheduledValues(time);
      gain.gain.setTargetAtTime(isOpen?.105:VOLUME,time,.2);
    }catch{}
  }
  document.addEventListener('pointerdown',arm,{capture:true});
  document.addEventListener('keydown',arm,{capture:true});
  // Keyboard activation and iOS click fallback.
  document.addEventListener('click',arm,{capture:true});
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)stop();
    else if(desiredRoute==='finale'&&allowed())start();
  });
  window.addEventListener('pagehide',stop);
  window.michFinaleMusic={onRoute,onSoundChange,underContract,stop,preload,arm,start};
  // The MP3 is preloaded but not played until the surprise is actually revealed.
  preload();
})();
