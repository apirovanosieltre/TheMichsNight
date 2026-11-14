'use strict';
/* User-supplied finale tune.
 * IMPORTANT: on iPhone use a plain HTMLAudioElement, NOT createMediaElementSource().
 * Web Audio may route music through the silent/ringer channel while media appears
 * to be playing. play() is called synchronously in the "Apri la sorpresa" click.
 * Duck loading remains 3s; the tune is restarted at 0 when the poster appears. */
(()=>{
  const SRC='assets/finale-music.mp3?v=20261114-finale';
  const KEY='themichsnight-finale-music-muted';
  const VOLUME=.4,CONTRACT_VOLUME=.17;
  let desiredRoute='home',siteSoundOn=true,musicMuted=false;
  let media=null,prepared=false,playId=0;
  try{musicMuted=localStorage.getItem(KEY)==='1'}catch{}

  function audio(){
    if(media)return media;
    try{
      media=new Audio(SRC);
      media.loop=true;
      media.preload='auto';
      media.playsInline=true;
      media.setAttribute?.('playsinline','');
      media.volume=VOLUME;
      media.addEventListener?.('play',refresh);
      media.addEventListener?.('playing',refresh);
      media.addEventListener?.('pause',refresh);
      media.addEventListener?.('ended',refresh);
      media.addEventListener?.('error',refresh);
      media.load?.();
    }catch{return null}
    return media;
  }
  function allowed(){return desiredRoute==='finale'&&siteSoundOn&&!musicMuted}
  function refresh(){
    const button=document.getElementById('finale-music-toggle');
    const mute=document.getElementById('finale-music-mute');
    const status=document.getElementById('finale-music-state');
    const running=!!media&&!media.paused&&allowed();
    if(button){
      button.textContent=musicMuted?'♫ ATTIVA LA MUSICHETTA':
        running?'♫ RIASCOLTA DALL’INIZIO':'♫ RIPRODUCI MUSICHETTA';
      button.disabled=!siteSoundOn;
      button.setAttribute('aria-pressed',String(running));
    }
    if(mute){
      mute.textContent=musicMuted?'🔈 RIATTIVA':'🔇 SILENZIA';
      mute.disabled=!siteSoundOn;
      mute.setAttribute('aria-pressed',String(musicMuted));
    }
    if(status){
      status.textContent=!siteSoundOn?'Audio generale disattivato':
        musicMuted?'Musica disattivata':
        running?'♫ Musica in riproduzione':'♫ Tocca Riproduci per attivare';
    }
  }
  function attemptPlay(restart=false){
    if(!allowed())return false;
    const el=audio();
    if(!el)return false;
    if(restart){
      try{el.pause();el.currentTime=0}catch{}
    }
    if(!el.paused){refresh();return true}
    const id=++playId;
    try{
      // Remains directly within the original user click for Safari.
      const promise=el.play();
      if(promise&&typeof promise.then==='function'){
        promise.then(()=>{
          if(id!==playId||!allowed())return;
          refresh();
        }).catch(()=>{
          if(id===playId)refresh(); // Offer manual retry; never claim audible playback.
        });
      }
      refresh();
      return true;
    }catch{refresh();return false}
  }
  function prepareReveal(enabled){
    desiredRoute='finale';
    siteSoundOn=enabled!==false;
    prepared=true;
    if(!allowed()){refresh();return}
    // It may begin beneath the duck loader. This is deliberate: keeps Safari's
    // gesture permission and guarantees the music is already unlocked.
    attemptPlay(true);
  }
  function stop(){
    prepared=false;
    playId++;
    if(media){
      try{media.pause();media.currentTime=0}catch{}
    }
    refresh();
  }
  function controlBar(){
    if(document.getElementById('finale-music-controls'))return;
    const poster=document.querySelector('.final-poster-artboard');
    if(!poster)return;
    const box=document.createElement('div');
    box.id='finale-music-controls';
    box.className='finale-music-controls';
    const playButton=document.createElement('button');
    playButton.id='finale-music-toggle';
    playButton.className='finale-music-toggle';
    playButton.type='button';
    playButton.setAttribute('aria-label','Riproduci o riascolta dall’inizio la musichetta del gran finale');
    playButton.addEventListener('click',()=>{
      if(!siteSoundOn){refresh();return}
      if(musicMuted){
        musicMuted=false;
        try{localStorage.setItem(KEY,'0')}catch{}
      }
      attemptPlay(true);
      refresh();
    });
    box.append(playButton);
    const mute=document.createElement('button');
    mute.id='finale-music-mute';
    mute.type='button';
    mute.className='finale-music-mute';
    mute.setAttribute('aria-label','Silenzia o riattiva la musichetta del gran finale');
    mute.addEventListener('click',()=>{
      if(!siteSoundOn){refresh();return}
      musicMuted=!musicMuted;
      try{localStorage.setItem(KEY,musicMuted?'1':'0')}catch{}
      if(musicMuted)stop();
      else attemptPlay(true);
      refresh();
    });
    box.append(mute);
    const state=document.createElement('small');
    state.id='finale-music-state';
    state.className='finale-music-state';
    box.append(state);
    // Above the poster instead of below the artwork, where Safari hides it
    // behind the floating browser toolbar.
    poster.insertAdjacentElement('beforebegin',box);
    refresh();
  }
  function onRoute(route,soundOn){
    const wasPrepared=prepared;
    desiredRoute=route;siteSoundOn=soundOn!==false;
    if(route!=='finale'){stop();return}
    controlBar();
    prepared=false;
    if(!allowed()){stop();return}
    const el=audio();
    if(wasPrepared&&el&&!el.paused){
      try{el.currentTime=0}catch{}
      el.volume=VOLUME;
      refresh();
      return;
    }
    if(el)el.volume=VOLUME;
    if(el&&!el.paused){refresh();return}
    // Direct hash / reload can be rejected by Safari. A prominent manual
    // 'Riproduci musichetta' button is already visible above the poster.
    attemptPlay(false);
    refresh();
  }
  function onSoundChange(enabled){
    siteSoundOn=!!enabled;
    if(!siteSoundOn)stop();
    else if(desiredRoute==='finale')attemptPlay(false);
    refresh();
  }
  function underContract(isOpen){
    // Native media remains audible even on iPhone in silent mode.
    // iOS controls media volume with the system buttons, so attenuation there
    // may be limited. The contract scene and music always remain independent.
    if(media&&allowed())try{media.volume=isOpen?CONTRACT_VOLUME:VOLUME}catch{}
  }
  function preload(){audio()}
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)stop();
    else if(desiredRoute==='finale')refresh();
  });
  window.addEventListener('pagehide',stop);
  window.michFinaleMusic={
    onRoute,onSoundChange,underContract,stop,preload,
    arm:attemptPlay,start:attemptPlay,prepareReveal
  };
  preload();
})();
