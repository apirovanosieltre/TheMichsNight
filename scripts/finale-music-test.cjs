'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'..','finale-music.js'),'utf8');

let gesture=false,playCount=0,pauseCount=0,resumeCount=0,lastGain=-1;
const nodes=new Map(),instances=[];
class FakeAudio{
 constructor(src){
  this.src=src;this.loop=false;this.paused=true;this.currentTime=0;
  this.volume=1;this.preload='none';instances.push(this);
 }
 load(){}
 setAttribute(){}
 play(){
  if(!gesture)return Promise.reject(new Error('NotAllowedError: Safari requires user activation'));
  playCount++;this.paused=false;return Promise.resolve();
 }
 pause(){pauseCount++;this.paused=true}
}
class FakeAudioContext{
 constructor(){this.state='suspended';this.currentTime=0;this.destination={}}
 resume(){resumeCount++;this.state='running';return Promise.resolve()}
 createMediaElementSource(media){return {connect(){}}}
 createGain(){
  return {gain:{
   value:0,
   cancelScheduledValues(){},
   setTargetAtTime(value){lastGain=value}
  },connect(){}};
 }
}
const poster={insertAdjacentElement(position,element){this.controls=element}};
const listeners={};
const document={
 hidden:false,
 getElementById(id){return nodes.get(id)||null},
 querySelector(selector){return selector==='.final-poster-artboard'?poster:null},
 createElement(tag){
  const element={tag,attrs:{},children:[],events:{},textContent:'',
   setAttribute(name,value){this.attrs[name]=value},
   addEventListener(type,callback){this.events[type]=callback},
   append(child){this.children.push(child)}
  };
  Object.defineProperty(element,'id',{get(){return this._id},set(v){this._id=v;nodes.set(v,this)}});
  return element;
 },
 addEventListener(type,handler){listeners[type]=handler}
};
const memory=new Map();
const sandbox={
 window:{AudioContext:FakeAudioContext,addEventListener(){}},
 document,Audio:FakeAudio,
 localStorage:{getItem(key){return memory.get(key)||null},setItem(key,value){memory.set(key,value)}},
 Promise,console
};
vm.runInNewContext(code,sandbox);
const music=sandbox.window.michFinaleMusic;
const flush=()=>new Promise(resolve=>setImmediate(resolve));
async function withGesture(callback){gesture=true;try{callback()}finally{gesture=false}await flush()}
(async()=>{
 assert(music&&typeof music.prepareReveal==='function');
 music.onRoute('home',true);
 assert.equal(playCount,0,'Home may never play surprise music');
 music.onRoute('scoperte',true);
 assert.equal(playCount,0,'Surprises list must stay quiet');

 // Safari: async route animation loses activation, so prime in the user click.
 await withGesture(()=>music.prepareReveal(true));
 assert.equal(playCount,1,'Open surprise click must start the media element immediately');
 assert.equal(instances[0].loop,true,'Final music must loop');
 assert.equal(lastGain,-1,'Preparation uses zero initial WebAudio gain');
 assert.equal(instances[0].paused,false);
 instances[0].currentTime=2.8; // Simulate the 3-second duck loading animation.
 gesture=false;
 music.onRoute('finale',true);
 assert.equal(instances[0].currentTime,0,'Reveal must restart from the first note');
 assert.equal(lastGain,.27,'Music becomes audible with the poster');
 assert(poster.controls&&nodes.has('finale-music-toggle'),'Fallback control must be available');
 assert.match(nodes.get('finale-music-toggle').textContent,/MUSICA ON/);

 // Contract visual should remain uninterrupted and quietly underscore the stamp.
 music.underContract(true);
 assert.equal(lastGain,.105);
 music.underContract(false);
 assert.equal(lastGain,.27);
 music.onRoute('finale',true);
 assert.equal(playCount,1,'Contract rendering must not restart the track');

 music.onRoute('scoperte',true);
 assert.equal(instances[0].paused,true,'Music must stop when leaving finale');
 await withGesture(()=>music.prepareReveal(true));
 assert.equal(playCount,2,'Reopening via APRI LA SORPRESA must start music again');
 music.onRoute('finale',true);
 assert.equal(lastGain,.27,'Music must be audible every time finale is reopened');

 // Muting should persist across visits, and unmuting must work in the user click.
 gesture=true;
 nodes.get('finale-music-toggle').events.click();
 gesture=false;
 assert.equal(memory.get('themichsnight-finale-music-muted'),'1');
 music.onRoute('scoperte',true);
 const mutedCount=playCount;
 await withGesture(()=>music.prepareReveal(true));
 music.onRoute('finale',true);
 assert.equal(playCount,mutedCount,'Explicitly muted music must not restart');
 await withGesture(()=>nodes.get('finale-music-toggle').events.click());
 assert.equal(memory.get('themichsnight-finale-music-muted'),'0');
 assert.equal(playCount,mutedCount+1);

 // Sound preferences must be honoured even for new surprise-opening gestures.
 music.onRoute('home',true);
 const soundOffCount=playCount;
 await withGesture(()=>music.prepareReveal(false));
 music.onRoute('finale',false);
 assert.equal(playCount,soundOffCount,'Global mute must suppress finale soundtrack');
 music.onRoute('home',true);
 assert.equal(instances[0].paused,true);
 assert(resumeCount>0,'Safari AudioContext must resume within the real user gesture');
 console.log('PASS: Safari click-to-reveal, 3-second loader, revisiting surprise, contract, mute and stop');
})().catch(err=>{console.error(err);process.exitCode=1});
