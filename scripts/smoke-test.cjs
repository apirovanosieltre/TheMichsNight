const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const app={innerHTML:'',focus(){}};
const els=new Map([['app',app],['status-progress',{}],['sound-toggle',{addEventListener(){}}]]);
const sandbox={
 document:{getElementById:id=>els.get(id)||{},querySelectorAll:()=>[],addEventListener(){}},
 window:{addEventListener(){},scrollTo(){}},
 location:{hash:''},
 localStorage:{getItem(){return null},setItem(){}},
 console,setTimeout,clearTimeout,confirm:()=>false
};
const context=vm.createContext(sandbox);
vm.runInContext(read('app.js'),context);
const run=expr=>vm.runInContext(expr,context);
const home=run('renderHome()');
for(const forbidden of ['Binario Magic Pub','Backdoor 1253','Una notte di fuoco con la Deni'])
 assert.equal(home.includes(forbidden),false,'Home must not spoil: '+forbidden);
assert(home.includes("INIZIA L'AVVENTURA"));
assert(home.includes('assets/home-approved.webp'),'Home must render the approved artwork');
assert(home.includes('home-hit-start'),'The artwork must have a clickable start button');
for(const where of ['home-hit-home','home-hit-mission','home-hit-progress','home-hit-extra'])
 assert(home.includes(where),'Home hotspot missing: '+where);

assert.equal(run("safeRoute('sfida-2')"),'missioni');
assert.equal(run("safeRoute('scoperta-1')"),'scoperte');
assert(run("renderFinal()").includes('AREA RISERVATISSIMA'));
assert(run('renderMissions()').includes('BLOCCATA'));
assert.equal(run('state.safe.length'),4,'The safe must have four dials');
assert(run('renderSafe()').includes('Quarta cifra'),'The safe needs four clues');
assert(run('renderSafe()').includes('aggiungiamo +3, +5, +7, +9'),'Second clue must explain the series');
assert(!run('renderSafe()').includes('Una persona può essere sia madre sia figlia'),'Third clue must not reveal the overlapping roles');
assert(!run('renderSafe()').includes('ognuna delle presenti è una persona diversa'),'Third clue must not contain contradictory wording');
assert(run('renderSafe()').includes('otto paperelle partecipano a un torneo a eliminazione diretta'),'First clue must remain unchanged');
assert(run('renderSafe()').includes('traccia tutte le diagonali di un esagono'),'Fourth clue must remain unchanged');

assert(read('app.js').includes("state.safe.join('')==='7839'"),'Four-digit answer required');
assert.equal(run('SIMON_SEQUENCE.length'),6,'Six notes must be played');
assert(run('renderSimon()').includes('ASCOLTA LE 6 NOTE'));
assert.equal(run('SYMBOLS.length'),6);
assert.equal(run('symbolSafeState().code.length'),4);
assert.equal(run('new Set(symbolSafeState().code).size'),4);
assert(run('renderSymbolSafe()').includes('TENTATIVI: 0/6'));
assert.equal(run('scoreSymbols([0,1,2,3],[3,2,1,0]).exact'),0);
assert.equal(run('scoreSymbols([0,1,2,3],[3,2,1,0]).misplaced'),4);
assert.equal(run('scoreSymbols([0,1,2,3],[0,2,1,4]).exact'),1);
assert.equal(run('scoreSymbols([0,1,2,3],[0,2,1,4]).misplaced'),2);
run('state.symbolSafe={code:[0,1,2,3],guess:[0,1,2,4],selected:2,attempts:[{guess:[0,4,1,2],exact:1,misplaced:2}]}');
assert(run('renderSymbolSafe()').includes('✓ 1 al posto giusto'));
assert.equal(run('symbolSafeState().selected'),2);
assert(read('app.js').includes("case'sfida-2':app.innerHTML=renderSymbolSafe()"));
assert(!read('app.js').includes('renderLights'));
run('state.completed=3');
const finale=run('renderFinal()');
assert(finale.includes('Una notte di fuoco'));
assert(finale.includes('Deni'));
assert(finale.includes('IN OMAGGIO'));
assert(finale.includes('ACCETTO IL MIO DESTINO'));
assert(finale.includes('gran-finale-approvato.webp'),'Approved artwork must be used for the finale');
assert(finale.includes('data-action="accept"'),'Destiny button must remain clickable');
assert(fs.statSync(path.join(root,'assets/gran-finale-approvato.webp')).size>200000,'Approved finale artwork must be present at usable resolution');
assert(finale.includes('Il comitato organizzatore declina ogni responsabilità riguardante questa parte di regalo'));
assert(run('renderDiscoveries()').includes('Il gran finale'));

run('state.accepted=true');
const signedFinale=run('renderFinal()');
assert(signedFinale.includes('CONTRATTO CON IL DESTINO FIRMATO'),'Accepted state must show signed contract');
assert(signedFinale.includes('data-action="replay"'),'User must be able to replay the finale');
const closeButtons=[
 {addEventListener(){},focus(){this.focused=true}},
 {addEventListener(){},focus(){this.focused=true}}
];
let overlay=null,modalOpen=false;
const oldGet=context.document.getElementById;
context.document.getElementById=id=>id==='mich-contract-overlay'?overlay:oldGet(id);
context.document.activeElement={isConnected:true,focus(){}};
context.document.createElement=()=>({
 id:'',innerHTML:'',isConnected:false,attrs:{},
 setAttribute(key,value){this.attrs[key]=value},
 querySelectorAll(){return closeButtons},
 addEventListener(){},
 remove(){this.isConnected=false;overlay=null}
});
context.document.body={
 append(node){overlay=node;node.isConnected=true},
 classList:{add(name){if(name==='contract-modal-open')modalOpen=true},remove(name){if(name==='contract-modal-open')modalOpen=false}}
};
context.window.matchMedia=()=>({matches:true});
run('state.sound=false;openContract()');
assert(overlay&&modalOpen,'Contract must open as a blocking dialog');
assert.equal(overlay.attrs['aria-modal'],'true');
assert(overlay.innerHTML.includes('CONTRATTO<br>CON IL DESTINO'));
assert(overlay.innerHTML.includes('Non sono previsti resi, rimborsi o possibilità di ripensamento.'));
assert(overlay.innerHTML.includes('La Deni si riserva il diritto di modificare i termini del contratto.'));
assert(overlay.innerHTML.includes('HO CAPITO, È TROPPO TARDI!'));
assert(closeButtons[0].focused,'Dialog focus must move to close control');
run('closeContract()');
assert.equal(overlay,null,'Contract dialog must be removed on close');
assert.equal(modalOpen,false,'Page scrolling must be restored after close');

const html=read('index.html'),css=read('styles.css'),loader=read('loader.js');
assert(html.includes('loader.js')&&html.includes('duck-loader'));
assert(html.includes('finale-music.js'),'Finale soundtrack controller must be loaded');
assert(html.indexOf('finale-music.js')<html.indexOf('app.js'),'Music controller must load before app routing');
assert(fs.statSync(path.join(root,'assets/finale-music.mp3')).size>300000,'User supplied finale MP3 must be present');
assert(read('app.js').includes("michFinaleMusic?.onRoute(r,state.sound)"),'Route changes must start or stop finale music');
assert(read('app.js').includes("michFinaleMusic?.underContract(true)"),'Contract must reduce the background volume');
assert(read('app.js').includes("michFinaleMusic?.underContract(false)"),'Closing the contract must restore volume');
assert(read('finale-music.js').includes("SRC='assets/finale-music.mp3"),'Music must come from the user supplied file');
assert(read('finale-music.js').includes('audio.loop=true'),'Finale track should repeat during the reveal');

assert(css.includes('duck-orbit')&&css.includes('duck-rotate'));
assert(css.includes('body.home-mode .window-bar'),'The home artwork must not duplicate the outer title bar');
assert(css.includes('.home-hit-start'),'Mobile homepage must expose a real CTA');
assert(css.includes('.final-poster-cta'),'Finale poster must have an interactive hit area');
assert(css.includes('.contract-overlay')&&css.includes('@keyframes contract-stamp-slam'),'Signed contract must have a styled animated overlay');

assert(loader.includes('MIN_MS=3000')&&loader.includes('length:8'));
assert(html.includes('id="duck-audio-unlock"'),'A manual audio control must be visible when autoplay is blocked');

assert(html.includes('class="duck-box-header"')&&html.includes('class="duck-box-footer"'),'Loader should use a compact header and footer');
assert(html.includes('id="duck-audio-state"'),'Audio status should keep the row stable');
assert(html.includes('duck-loader-progress-fill'),'Progress bar must have an independent fill');
assert(css.includes('duck-orbit-balanced')&&css.includes('duck-keep-upright'),'Eight ducks must orbit while remaining upright');
assert(css.includes('position:absolute;inset:50% auto auto 50%;'),'QUACK badge must be centered precisely');
assert(css.includes('min-height:42px'),'Loading message must have a stable text area');
assert(css.includes('duck-meter-fill 3s'),'Loading progress should animate for three seconds');
assert(css.includes('max-height:calc(100dvh - 22px)'),'Loader card should fit small mobile viewports');
assert(loader.includes("classList?.add('duck-loading')")&&loader.includes("classList?.remove('duck-loading')"),'Background scrolling must be disabled during loading');

assert(css.includes('.duck-audio-unlock'),'Audio unlock must be styled');
assert(loader.includes('preloadQuack()'),'Quack audio must preload before any interaction');
assert(loader.includes('scheduleQuack(true)')&&loader.includes('randomDelay(620,1370)'),'Quacks must be repeated at random intervals');
assert(!loader.includes('[500,1270,1990,2650]'),'No four fixed quack timestamps');
assert(loader.includes('ctx.resume()'),'Mobile browsers must be unlocked from a gesture');
assert(loader.includes('stopPlaying()'),'Hide must stop any playing quacks');

assert(read('app.js').includes('window.michLoader.navigate'));
for(const image of ['mich-sorriso.webp','mich-barba.webp','mich-avatar.webp','binario-anteprima.webp']){
  const b=fs.readFileSync(path.join(root,'assets',image));
  assert.equal(b.toString('ascii',0,4),'RIFF',image+' must be RIFF');
  assert.equal(b.toString('ascii',8,12),'WEBP',image+' must be WebP');
}
assert(fs.statSync(path.join(root,'assets/quack.mp3')).size>1500,'The supplied sound sample must be present');
assert(loader.includes('assets/quack.mp3'),'Duck sound must use the attached audio sample');
assert(css.includes('grid-template-columns:repeat(3,minmax(0,1fr))'),'Mobile navigation must wrap');
assert(css.includes('.symbol-picker')&&css.includes('.symbol-history-row'));
assert(read('app.js').includes('assets/mich-sorriso.webp'),'Real Mich photo must appear in hero and finale');
assert(!read('app.js').includes('assets/mich-sorriso.svg'),'Do not replace Mich portrait with illustrations');
for(const file of ['index.html','styles.css','loader.js','app.js'])assert(fs.statSync(path.join(root,file)).size>0);
console.log('PASS: routing, 6-note sequence, symbol code, finale, signed contract and assets');
