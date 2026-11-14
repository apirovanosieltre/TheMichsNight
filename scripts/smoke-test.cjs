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
assert.equal(run("safeRoute('sfida-2')"),'missioni');
assert.equal(run("safeRoute('scoperta-1')"),'scoperte');
assert(run("renderFinal()").includes('AREA RISERVATISSIMA'));
assert(run('renderMissions()').includes('BLOCCATA'));
assert.equal(run('state.safe.length'),4,'The safe must have four dials');
assert(run('renderSafe()').includes('Quarta cifra'),'The safe needs four clues');
assert(read('app.js').includes("state.safe.join('')==='7839'"),'Four-digit answer required');
assert.equal(run('(()=>{let g=initialLights();for(const i of [1,4,7])g=toggleArray(g,i);return g.every(Boolean)})()'),true);
run('state.completed=3');
const finale=run('renderFinal()');
assert(finale.includes('Una notte di fuoco'));
assert(finale.includes('Deni'));
assert(finale.includes('IN OMAGGIO'));
assert(finale.includes('ACCETTO IL MIO DESTINO'));
assert(finale.includes('Il comitato organizzatore declina ogni responsabilità riguardante questa parte di regalo'));
assert(run('renderDiscoveries()').includes('Il gran finale'));
const html=read('index.html'),css=read('styles.css'),loader=read('loader.js');
assert(html.includes('loader.js')&&html.includes('duck-loader'));
assert(css.includes('duck-orbit')&&css.includes('duck-rotate'));
assert(loader.includes('MIN_MS=3000')&&loader.includes('length:8'));
assert(read('app.js').includes('window.michLoader.navigate'));
for(const image of ['mich-sorriso.svg','mich-barba.svg','mich-avatar.svg','binario-anteprima.svg']){
 const s=read('assets/'+image);
 assert(s.includes('<svg')&&s.includes('</svg>'),image+' must contain SVG markup');
}
assert(fs.statSync(path.join(root,'assets/quack.mp3')).size>1500,'The supplied sound sample must be present');
assert(loader.includes('assets/quack.mp3'),'Duck sound must use the attached audio sample');
assert(css.includes('grid-template-columns:repeat(3,minmax(0,1fr))'),'Mobile navigation must wrap');
for(const file of ['index.html','styles.css','loader.js','app.js'])assert(fs.statSync(path.join(root,file)).size>0);
console.log('PASS: routing, four-digit safe, mobile, final scene, three-second ducks, asset integrity');
