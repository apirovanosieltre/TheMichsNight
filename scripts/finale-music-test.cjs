'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'..','finale-music.js'),'utf8');
let playCount=0,stopCount=0,resumeCount=0,lastGain=0;
const nodes={};
class FakeAudioContext{
 constructor(){this.state='suspended';this.currentTime=0;this.destination={}}
 resume(){resumeCount++;this.state='running';return Promise.resolve()}
 decodeAudioData(){return Promise.resolve({duration:13.7665})}
 createBufferSource(){
  return {loop:false,playbackRate:{value:1},connect(){},disconnect(){},
    start(){playCount++},stop(){stopCount++}};
 }
 createGain(){
  return {gain:{value:0,cancelScheduledValues(){},setTargetAtTime(v){lastGain=v}},connect(){}};
 }
}
const poster={insertAdjacentElement(position,element){this.controls=element}};
const listeners={};
const document={
  hidden:false,
  getElementById(id){return nodes[id]||null},
  querySelector(sel){return sel==='.final-poster-artboard'?poster:null},
  createElement(tag){
    const el={tag,attrs:{},children:[],listeners:{},style:{},
      setAttribute(k,v){this.attrs[k]=v},
      addEventListener(type,callback){this.listeners[type]=callback},
      append(child){this.children.push(child)}};
    Object.defineProperty(el,'id',{get(){return this._id},set(value){this._id=value;nodes[value]=this}});
    return el;
  },
  addEventListener(type,fn){listeners[type]=fn}
};
const values=new Map();
const sandbox={
  window:{AudioContext:FakeAudioContext,addEventListener(){}},
  document,localStorage:{
    getItem(k){return values.get(k)||null},
    setItem(k,v){values.set(k,v)}
  },
  fetch:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(64)}),
  Promise,setTimeout,clearTimeout,
  console
};
vm.runInNewContext(code,sandbox);
const music=sandbox.window.michFinaleMusic;
assert(music&&typeof music.onRoute==='function');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
  // The soundtrack must not play on the homepage or while playing games.
  music.onRoute('home',true);await flush();
  assert.equal(playCount,0);
  music.onRoute('sfida-3',true);await flush();
  assert.equal(playCount,0);
  // Going directly to the finale without a tap must not break Safari's audio policy.
  music.onRoute('finale',true);await flush();
  assert.equal(playCount,0);
  assert(poster.controls&&nodes['finale-music-toggle'],'Manual play control must appear');
  assert.match(nodes['finale-music-toggle'].textContent,/TOCCA PER ASCOLTARE/);
  // A user gesture resumes Web Audio and enables the soundtrack.
  music.arm();await flush();await flush();
  assert(resumeCount>0,'Audio context must resume under user interaction');
  assert.equal(playCount,1,'The music must begin when the final poster is revealed');
  assert.match(nodes['finale-music-toggle'].textContent,/MUSICA ON/);
  music.onRoute('finale',true);await flush();
  assert.equal(playCount,1,'Rerendering a signed contract must not restart the soundtrack');
  music.underContract(true);
  assert.equal(lastGain,.105,'Contract stamp should duck the background music');
  music.underContract(false);
  assert.equal(lastGain,.22,'Music must return to its normal background volume');
  music.onRoute('scoperte',true);
  assert.equal(stopCount,1,'Music must stop on leaving the finale');
  // Global sound setting must silence this music too.
  music.onRoute('finale',false);await flush();
  assert.equal(playCount,1);
  music.onSoundChange(true);await flush();await flush();
  assert.equal(playCount,2);
  music.onSoundChange(false);
  assert.equal(stopCount,2);
  console.log('PASS: finale-only music, Safari gesture, looping playback, contract ducking and stop/mute');
})().catch(err=>{console.error(err);process.exitCode=1});
