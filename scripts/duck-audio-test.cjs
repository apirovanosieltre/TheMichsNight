'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'..','loader.js'),'utf8');
const listeners={document:{},window:{}},nodes=new Map(),timerMap=new Map();
let timerId=0,gesture=false,attempts=0,played=0,stopped=0;
const sound={value:'{}'};
class FakeAudio{
 constructor(src){this.src=src;this.paused=true;this.currentTime=0;this.loop=false;this.handlers={};this.unlocked=false;this.preload='none'}
 setAttribute(){}
 load(){}
 addEventListener(type,fn){this.handlers[type]=fn}
 play(){
  attempts++;
  if(!gesture&&!this.unlocked)return Promise.reject(new Error('NotAllowedError'));
  played++;this.unlocked=true;this.paused=false;
  return Promise.resolve();
 }
 pause(){this.paused=true;stopped++}
 end(){this.paused=true;this.handlers.ended?.()}
}
const audio=new FakeAudio('test');
const elem=(id)=>({
 id,hidden:false,style:{},textContent:'',innerHTML:'',
 classList:{add(){},remove(){}},setAttribute(){},addEventListener(event,fn){this['on_'+event]=fn}
});
for(const id of ['duck-loader','duck-loader-text','duck-audio-unlock','duck-audio-state','duck-orbit'])nodes.set(id,elem(id));
const sandbox={
 console,Promise,Math,Audio:class extends FakeAudio{
 constructor(src){super(src);Object.assign(audio,{src}) ;return audio}
 },
 document:{
  getElementById:id=>nodes.get(id)||null,documentElement:{classList:{add(){},remove(){}}},
  body:{classList:{add(){},remove(){}}},
  addEventListener(name,cb){listeners.document[name]=cb}
 },
 window:{
  scrollTo(){},addEventListener(name,cb){listeners.window[name]=cb}
 },
 location:{hash:'#home'},
 localStorage:{getItem(){return sound.value}},
 setTimeout(fn,ms){const id=++timerId;timerMap.set(id,{fn,ms});return id},
 clearTimeout(id){timerMap.delete(id)}
};
vm.runInNewContext(code,sandbox);
const loader=sandbox.window.michLoader;
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function fireNext(ms){const matches=[...timerMap.entries()].filter(([id,t])=>t.ms===ms);assert(matches.length,'No '+ms+'ms timer');const [id,t]=matches[0];timerMap.delete(id);t.fn()}
(async()=>{
 assert(code.includes('assets/quack.mp3'),'The supplied quack MP3 must be used');
 assert(code.includes('new Audio(CLIP)'),'Use native Safari-compatible media');
 assert(!code.includes('decodeAudioData'),'No flaky Web Audio decoding');
 assert.equal(attempts,1,'First load tries quack once');
 await flush();
 assert.equal(played,0,'Safari blocks initial sound without a gesture');
 assert.equal(nodes.get('duck-audio-unlock').hidden,false,'Activation button must be visible');

 gesture=true;
 nodes.get('duck-audio-unlock').on_click();
 gesture=false;await flush();
 assert.equal(played,1);
 assert.equal(nodes.get('duck-audio-unlock').hidden,true,'Button hides after playback is permitted');
 assert.equal(nodes.get('duck-audio-state').textContent,'♫ QUACK ATTIVATI');
 audio.end();

 assert(loader.playQuack());
 await flush();
 assert.equal(played,2);
 audio.end();
 loader.hide();
 assert.equal(audio.paused,true);

 let navigated=0;
 gesture=true;
 loader.navigate('missioni',()=>navigated++);
 gesture=false;await flush();
 assert.equal(played,3);
 assert.equal(audio.src.includes('assets/quack.mp3'),true);
 assert.equal(audio.loop,false);
 assert.equal(nodes.get('duck-loader').hidden,false);
 fireNext(3000);
 assert.equal(navigated,1);
 assert.equal(audio.paused,true);

 gesture=true;
 loader.navigate('scoperte',()=>navigated++);
 gesture=false;await flush();
 assert.equal(played,4);
 assert.equal(navigated,1);
 assert.equal(attempts>=4,true);

 sound.value=JSON.stringify({sound:false});
 assert.equal(loader.playQuack(),false);
 loader.hide();
 assert.equal(audio.paused,true);
 console.log('PASS: Safari first-load fallback, manual unlock, random repeated QUACK, navigation and mute');
})().catch(e=>{console.error(e);process.exitCode=1});
