'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'..','finale-music.js'),'utf8');

let gesture=false,playCount=0,pauseCount=0;
const nodes=new Map(),instances=[];
class FakeAudio{
 constructor(src){
  this.src=src;this.loop=false;this.paused=true;
  this.currentTime=0;this.volume=1;this.preload='none';instances.push(this);
  this.handlers={};
 }
 load(){}
 setAttribute(){}
 addEventListener(type,fn){this.handlers[type]=fn}
 play(){
  if(!gesture)return Promise.reject(new Error('NotAllowedError: Safari requires user activation'));
  playCount++;this.paused=false;this.handlers.play?.();return Promise.resolve();
 }
 pause(){pauseCount++;this.paused=true;this.handlers.pause?.()}
}
const poster={insertAdjacentElement(position,element){this.position=position;this.controls=element}};
const document={
 hidden:false,
 getElementById(id){return nodes.get(id)||null},
 querySelector(selector){return selector==='.final-poster-artboard'?poster:null},
 createElement(tag){
  const element={tag,attrs:{},children:[],events:{},textContent:'',disabled:false,
   setAttribute(name,value){this.attrs[name]=value},
   addEventListener(type,callback){this.events[type]=callback},
   append(child){this.children.push(child)}
  };
  Object.defineProperty(element,'id',{get(){return this._id},set(v){this._id=v;nodes.set(v,this)}});
  return element;
 },
 addEventListener(){}
};
const memory=new Map();
const sandbox={
 window:{addEventListener(){}},document,Audio:FakeAudio,
 localStorage:{getItem(k){return memory.get(k)||null},setItem(k,v){memory.set(k,v)}},
 Promise,console
};
vm.runInNewContext(code,sandbox);
const music=sandbox.window.michFinaleMusic;
const flush=()=>new Promise(resolve=>setImmediate(resolve));
async function tap(fn){gesture=true;try{fn()}finally{gesture=false}await flush()}
(async()=>{
 assert(music&&typeof music.prepareReveal==='function');
 assert(code.includes('new Audio(SRC)'),'Use native media audio instead of Web Audio');
 assert(!code.includes('context.createMediaElementSource('),'Do not route iPhone music through a Web Audio node');
 assert.equal(playCount,0,'No music on initial load');
 music.onRoute('home',true);
 music.onRoute('scoperte',true);
 assert.equal(playCount,0,'No music before opening the surprise');

 // Clicking 'Apri la sorpresa' unlocks media synchronously, before the loader.
 await tap(()=>music.prepareReveal(true));
 assert.equal(playCount,1,'Native audio starts on the user gesture');
 const el=instances[0];
 assert.equal(el.loop,true);
 assert.equal(el.paused,false);
 el.currentTime=2.9; // 3-second duck loading screen.
 gesture=false;
 music.onRoute('finale',true);
 assert.equal(el.currentTime,0,'Poster starts soundtrack from first note');
 assert.equal(el.paused,false,'Music is playing without accepting the contract');
 assert.equal(poster.position,'beforebegin','Audio controls must appear ABOVE poster');
 assert(poster.controls&&nodes.has('finale-music-toggle'));
 assert(nodes.has('finale-music-mute'),'Separate mute option must be available');
 assert.match(nodes.get('finale-music-toggle').textContent,/RIASCOLTA DALL/);
 assert.equal(nodes.get('finale-music-state').textContent,'♫ Musica in riproduzione');

 music.underContract(true);
 assert.equal(el.volume,.17,'Stamp volume should decrease where platform supports it');
 music.underContract(false);
 assert.equal(el.volume,.4);
 music.onRoute('finale',true);
 assert.equal(playCount,1,'Rerendering the contract must not restart the music');

 // Reopening the finale must play again regardless of accepted status.
 music.onRoute('scoperte',true);
 assert.equal(el.paused,true);
 await tap(()=>music.prepareReveal(true));
 assert.equal(playCount,2,'Opening the finale again must start audio');
 music.onRoute('finale',true);
 assert.equal(el.paused,false);

 // Manual retry is explicit and accessible even if Safari falsely reports playback.
 await tap(()=>nodes.get('finale-music-toggle').events.click());
 assert.equal(playCount,3,'Tap replay must restart native playback');
 assert.equal(el.currentTime,0);

 // Muting persists and cannot be overridden by another visit.
 await tap(()=>nodes.get('finale-music-mute').events.click());
 assert.equal(memory.get('themichsnight-finale-music-muted'),'1');
 assert.equal(el.paused,true);
 music.onRoute('home',true);
 const mutedCount=playCount;
 await tap(()=>music.prepareReveal(true));
 music.onRoute('finale',true);
 assert.equal(playCount,mutedCount,'Saved mute preference must persist');
 await tap(()=>nodes.get('finale-music-toggle').events.click());
 assert.equal(memory.get('themichsnight-finale-music-muted'),'0');
 assert.equal(playCount,mutedCount+1);

 // Global sound-off disables music independently of local finale setting.
 music.onRoute('home',true);
 const offCount=playCount;
 await tap(()=>music.prepareReveal(false));
 music.onRoute('finale',false);
 assert.equal(playCount,offCount);
 assert(nodes.get('finale-music-toggle').disabled);

 // Direct reload of the finale: Safari will block auto-play until manual tap.
 music.onRoute('home',true);
 music.onRoute('finale',true);
 await flush();
 assert.equal(instances[0].paused,true);
 assert.match(nodes.get('finale-music-toggle').textContent,/RIPRODUCI/);
 await tap(()=>nodes.get('finale-music-toggle').events.click());
 assert.equal(el.paused,false,'A tap on the visible button must recover audio');
 console.log('PASS: audible native iOS media, final poster before contract, revisit, manual replay, mute');
})().catch(err=>{console.error(err);process.exitCode=1});
