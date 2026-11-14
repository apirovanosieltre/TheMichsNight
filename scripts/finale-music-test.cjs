'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'..','finale-music.js'),'utf8');

let gesture=false,silentStarts=0,musicStarts=0,pauseCount=0;
const nodes=new Map(),instances=[],documentEvents={};
class FakeAudio{
 constructor(src){
  this.src=src;this.loop=false;this.paused=true;this.currentTime=0;
  this.volume=1;this.preload='none';this.unlocked=false;
  this.events={};instances.push(this);
 }
 load(){this.paused=true;this.currentTime=0}
 setAttribute(){}
 addEventListener(type,fn){this.events[type]=fn}
 play(){
  const silent=this.src.startsWith('data:audio/wav;');
  if(!gesture&&!this.unlocked)return Promise.reject(new Error('NotAllowedError: gesture required'));
  if(gesture)this.unlocked=true;
  this.paused=false;
  if(silent)silentStarts++;else musicStarts++;
  this.events.playing?.();
  return Promise.resolve();
 }
 pause(){pauseCount++;this.paused=true;this.events.pause?.()}
}
const poster={insertAdjacentElement(position,element){this.position=position;this.controls=element}};
const document={
 hidden:false,
 getElementById(id){return nodes.get(id)||null},
 querySelector(s){return s==='.final-poster-artboard'?poster:null},
 createElement(tag){
  const el={tag,events:{},attrs:{},children:[],textContent:'',disabled:false,
   addEventListener(type,fn){this.events[type]=fn},
   setAttribute(key,value){this.attrs[key]=value},
   append(node){this.children.push(node)}
  };
  Object.defineProperty(el,'id',{get(){return this._id},set(v){this._id=v;nodes.set(v,this)}});
  return el;
 },
 addEventListener(type,handler){documentEvents[type]=handler}
};
const memory=new Map();
const sandbox={window:{addEventListener(){}},document,Audio:FakeAudio,
 localStorage:{getItem(k){return memory.get(k)||null},setItem(k,v){memory.set(k,v)}},
 fetch:async()=>({ok:true}),Promise,console};
vm.runInNewContext(code,sandbox);
const music=sandbox.window.michFinaleMusic;
const flush=()=>new Promise(resolve=>setImmediate(resolve));
async function tap(fn){gesture=true;try{documentEvents.click?.();fn?.()}finally{gesture=false}await flush()}
(async()=>{
 assert(typeof music.prepareReveal==='function');
 assert(code.includes('new Audio(SILENT_WAV)'),'First media track must be silent');
 assert(!code.includes('createMediaElementSource('),'iOS uses native HTML media audio');
 const silentWav=code.match(/const SILENT_WAV='data:audio\/wav;base64,([^']+)'/)[1];
 const raw=Buffer.from(silentWav,'base64');
 assert.equal(raw.toString('ascii',0,4),'RIFF');
 assert(raw.subarray(44).every(x=>x===128),'Primer must contain no audible samples');
 assert.equal(musicStarts,0);

 // The first legitimate tap (e.g. on the homepage) authorizes this same element.
 await tap(()=>music.onRoute('missioni',true));
 assert.equal(silentStarts,1,'One silent prime on first tap');
 assert.equal(musicStarts,0,'No real music before the finale');
 assert.equal(instances.length,1,'Only one audio element is allowed');
 assert.equal(instances[0].unlocked,true);
 music.onRoute('scoperte',true);

 // User touches APRI LA SORPRESA, then a 3-second duck loader appears.
 await tap(()=>music.prepareReveal(true));
 assert.equal(musicStarts,0,'During first surprise opening no MP3 plays');
 assert.equal(instances[0].src.startsWith('data:'),true);
 // 3 seconds later, only the poster transition starts the MP3.
 gesture=false;music.onRoute('finale',true);await flush();
 assert.equal(musicStarts,1,'The poster starts the real MP3 once');
 const el=instances[0];
 assert(el.src.includes('assets/finale-music.mp3'));
 assert.equal(el.currentTime,0);
 assert.equal(el.loop,true);
 assert.equal(el.paused,false);
 assert.equal(poster.position,'beforebegin','Music controls must be above poster');
 assert.equal(nodes.get('finale-music-state').textContent,'♫ Musica in riproduzione');

 // Opening the contract must not restart or interrupt the tune.
 music.underContract(true);assert.equal(el.volume,.17);
 music.onRoute('finale',true);
 assert.equal(musicStarts,1,'Contract rerender must not replay');
 music.underContract(false);assert.equal(el.volume,.4);

 // Revisiting from Le Scoperte restarts exactly once, after the loader.
 music.onRoute('scoperte',true);
 assert(el.paused);
 await tap(()=>music.prepareReveal(true));
 assert.equal(musicStarts,1,'No soundtrack during revisit loader');
 music.onRoute('finale',true);await flush();
 assert.equal(musicStarts,2,'The revisit starts once at poster reveal');

 // Explicit "Riascolta" restarts on the user tap.
 await tap(()=>nodes.get('finale-music-toggle').events.click());
 assert.equal(musicStarts,3);
 assert.equal(el.currentTime,0);

 // Persistent user mute is respected on all future openings.
 await tap(()=>nodes.get('finale-music-mute').events.click());
 assert.equal(memory.get('themichsnight-finale-music-muted'),'1');
 assert(el.paused);
 music.onRoute('scoperte',true);
 await tap(()=>music.prepareReveal(true));music.onRoute('finale',true);
 assert.equal(musicStarts,3,'Muted state must suppress auto-play');
 await tap(()=>nodes.get('finale-music-toggle').events.click());
 assert.equal(musicStarts,4,'Manual play also unmutes');
 assert.equal(memory.get('themichsnight-finale-music-muted'),'0');

 // Global sound-off cannot be overridden by local replay.
 music.onRoute('home',true);
 const count=musicStarts;
 await tap(()=>music.prepareReveal(false));music.onRoute('finale',false);
 assert.equal(musicStarts,count);
 assert(nodes.get('finale-music-toggle').disabled);

 // Direct #finale URL on a fresh page with no gesture can be blocked,
 // but the explicit button must recover playback on the next user tap.
 const freshInstances=instances.length;
 music.onRoute('home',false);
 music.onRoute('finale',false);await flush();
 assert.equal(musicStarts,count,'Disabled global audio stays silent');
 assert.equal(instances.length,freshInstances);
 console.log('PASS: genuinely silent loading, sticky iOS media grant, first reveal, revisit, contract, manual replay and mute');
})().catch(err=>{console.error(err);process.exitCode=1});
