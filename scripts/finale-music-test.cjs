'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'..','finale-music.js'),'utf8');
const wavBase64=code.match(/SILENT_WAV='data:audio\/wav;base64,([^']+)'/)[1];
const wav=Buffer.from(wavBase64,'base64');
assert.equal(wav.toString('ascii',0,4),'RIFF');
assert.equal(wav.toString('ascii',8,12),'WAVE');
assert.equal(wav.readUInt32LE(4)+8,wav.length,'Silent WAV must not be truncated');
assert.equal(wav.readUInt32LE(40)+44,wav.length,'Silent audio data chunk must match bytes');

let gesture=false,silentPlays=0,musicPlays=0,musicPauses=0;
const nodes=new Map(),instances=[],storage=new Map();
class FakeAudio{
 constructor(src){this.src=src;this.loop=false;this.paused=true;this.volume=1;this.currentTime=0;this.preload='none';this.unlocked=false;this.events={};instances.push(this)}
 load(){}
 setAttribute(){}
 addEventListener(type,fn){this.events[type]=fn}
 play(){
  if(!gesture&&!this.unlocked)return Promise.reject(new Error('NotAllowedError'));
  this.unlocked=true;this.paused=false;
  if(this.src.startsWith('data:audio/'))silentPlays++;else musicPlays++;
  this.events.playing?.();
  return Promise.resolve();
 }
 pause(){
  if(!this.paused&&this.src.includes('finale-music.mp3'))musicPauses++;
  this.paused=true;this.events.pause?.();
 }
}
const poster={insertAdjacentElement(position,element){this.position=position;this.controls=element}};
const document={
 hidden:false,
 getElementById:id=>nodes.get(id)||null,
 querySelector:selector=>selector==='.final-poster-artboard'?poster:null,
 createElement(tag){
  const el={tag,attrs:{},events:{},children:[],textContent:'',disabled:false,
   setAttribute(k,v){this.attrs[k]=v},
   addEventListener(type,fn){this.events[type]=fn},
   append(child){this.children.push(child)}
  };
  Object.defineProperty(el,'id',{get(){return this._id},set(v){this._id=v;nodes.set(v,this)}});
  return el;
 },
 addEventListener(){}
};
const sandbox={
 window:{addEventListener(){}},document,Audio:FakeAudio,
 localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
 fetch:async()=>({ok:true}),Promise,console
};
vm.runInNewContext(code,sandbox);
const music=sandbox.window.michFinaleMusic,flush=()=>new Promise(r=>setImmediate(r));
async function tap(fn){gesture=true;try{fn()}finally{gesture=false}await flush()}
(async()=>{
 assert.equal(musicPlays,0,'No final music on initial page');
 assert.equal(silentPlays,0,'Silent priming is not autoplay at initial page load');
 music.onRoute('home',true);
 music.onRoute('scoperte',true);

 // Real user click unlocks the same audio player with DIGITAL SILENCE.
 await tap(()=>{music.arm();music.prepareReveal(true)});
 assert.equal(silentPlays,1,'Safari player is primed by silent WAV on original click');
 assert.equal(musicPlays,0,'No music during the full 3-second duck loader');
 assert(instances[0].src.startsWith('data:audio/'),'Only the silent WAV is playing during loading');

 // After the 3-second loading animation, start the real track exactly once.
 music.onRoute('finale',true);
 await flush();
 assert.equal(musicPlays,1,'Track starts when the actual finale appears');
 const el=instances[0];
 assert(el.src.includes('assets/finale-music.mp3'));
 assert.equal(el.loop,true);
 assert.equal(poster.position,'beforebegin','Control must be ABOVE poster');
 assert(nodes.has('finale-music-toggle')&&nodes.has('finale-music-mute'));
 assert.match(nodes.get('finale-music-state').textContent,/in riproduzione/);
 music.onRoute('finale',true);await flush();
 assert.equal(musicPlays,1,'Contract/rerender must not restart music');
 music.underContract(true);
 assert.equal(el.volume,.17);
 music.underContract(false);
 assert.equal(el.volume,.4);

 // Manual replay always restarts the original file.
 await tap(()=>nodes.get('finale-music-toggle').events.click());
 assert.equal(musicPlays,2);
 assert.equal(el.currentTime,0);

 music.onRoute('scoperte',true);
 assert.equal(el.paused,true);
 await tap(()=>music.prepareReveal(true));
 assert.equal(musicPlays,2,'Reopening during loader is silent');
 music.onRoute('finale',true);await flush();
 assert.equal(musicPlays,3,'Reopened surprise starts once after loader');

 // Respect independent mute and global audio settings.
 await tap(()=>nodes.get('finale-music-mute').events.click());
 assert.equal(storage.get('themichsnight-finale-music-muted'),'1');
 assert(el.paused);
 const beforeMuted=musicPlays;
 music.onRoute('scoperte',true);
 await tap(()=>music.prepareReveal(true));
 music.onRoute('finale',true);await flush();
 assert.equal(musicPlays,beforeMuted);
 await tap(()=>nodes.get('finale-music-toggle').events.click());
 assert.equal(storage.get('themichsnight-finale-music-muted'),'0');
 assert.equal(musicPlays,beforeMuted+1);
 music.onRoute('home',true);
 const beforeGlobalMute=musicPlays;
 await tap(()=>music.prepareReveal(false));
 music.onRoute('finale',false);await flush();
 assert.equal(musicPlays,beforeGlobalMute);
 assert(nodes.get('finale-music-toggle').disabled);
 console.log('PASS: valid silent WAV, no soundtrack in loader, one launch per finale, repeat and mute');
})().catch(err=>{console.error(err);process.exitCode=1});
