/* The Mich's Night: un regalo che si scopre giocando. Nessun backend richiesto. */
'use strict';
const KEY='the-michs-night-v1';
const app=document.getElementById('app');
const DEFAULT={completed:0,lights:null,safe:[0,0,0,0],accepted:false,sound:true};
function load(){try{const raw=JSON.parse(localStorage.getItem(KEY)||'{}');return {...DEFAULT,...raw,completed:Math.min(3,Math.max(0,Number(raw.completed)||0)),safe:Array.isArray(raw.safe)?[...raw.safe.slice(0,4),...Array(4).fill(0)].slice(0,4).map(n=>Number.isInteger(+n)?Math.min(9,Math.max(0,+n)):0):[...DEFAULT.safe]}}catch{return {...DEFAULT}}}
let state=load();
let simon={active:false,accepting:false,index:0,sequence:[0,3,1,2]};
let hintVisible=false,viewToken=0,toastTimer;
let ctx=null;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function save(){localStorage.setItem(KEY,JSON.stringify(state));syncProgress()}
function route(){return decodeURIComponent(location.hash.replace(/^#/,''))||'home'}
function go(where){const action=()=>{if(location.hash==='#'+where)render();else location.hash=where;window.scrollTo({top:0,behavior:'instant'})};if(window.michLoader)window.michLoader.navigate(where,action);else action()}
function safeRoute(r){if(/^sfida-[123]$/.test(r)&&Number(r.slice(-1))>state.completed+1)return 'missioni';if(/^scoperta-[123]$/.test(r)&&Number(r.slice(-1))>state.completed)return 'scoperte';return r}
function toast(message){const el=document.getElementById('toast');el.textContent=message;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),3200)}
function syncProgress(){document.getElementById('status-progress').textContent=`PROGRESSO: ${state.completed}/3`;document.getElementById('sound-toggle').textContent=state.sound?'♫ AUDIO ON':'♫ AUDIO OFF'}
function sound(freq=600,duration=.12,type='sine',volume=.09){if(!state.sound)return;try{ctx=ctx||new(window.AudioContext||window.webkitAudioContext)();if(ctx.state==='suspended')ctx.resume();const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=type;osc.frequency.value=freq;gain.gain.value=volume;gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+duration);osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+duration)}catch{}}
function fanfare(){[523,659,784,1047].forEach((n,i)=>setTimeout(()=>sound(n,.24,'triangle',.095),i*150))}
function confetti(count=85){const parent=document.createElement('div');parent.className='party';document.body.append(parent);const colors=['#ff3cb1','#dfff32','#43ddff','#a87dff','#ff9c1a'];for(let i=0;i<count;i++){const el=document.createElement('i');el.className='confetti';el.style.left=Math.random()*100+'%';el.style.animationDelay=Math.random()*.9+'s';el.style.animationDuration=2+Math.random()*1.6+'s';el.style.background=colors[i%colors.length];el.style.width=(6+Math.random()*8)+'px';el.style.height=(10+Math.random()*12)+'px';parent.append(el)}setTimeout(()=>parent.remove(),4700)}
function setNav(r){document.querySelectorAll('.side-nav button').forEach(b=>{const target=b.dataset.route;const active=target===r||(target==='missioni'&&r.startsWith('sfida-'))||(target==='scoperte'&&r.startsWith('scoperta-'));b.classList.toggle('active',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')})}
function heading(kicker,title,sub){return `<header class="section-head"><div class="eyebrow">${kicker}</div><h1>${title}</h1><p>${sub}</p></header>`}
function renderHome(){
  return `<section class="home-artboard" aria-label="Homepage di The Mich's Night: una serata speciale organizzata dagli amici di Mich">
    <img class="home-art-image" src="assets/home-approved.webp?v=20261114-approved" width="941" height="1672"
      alt="The Mich's Night, la tua serata speciale. Mich senza barba ritagliato con bordo bianco, corona neon e piccoli effetti arcade; la vera foto di Mich con barba in una polaroid, un regalo rosa pixelato, il messaggio Benvenuto Mich e il grande pulsante Inizia l'avventura."
      fetchpriority="high" decoding="async" />
    <nav class="home-art-links" aria-label="Navigazione della homepage">
      <button type="button" class="home-hit home-hit-home" data-route="home" aria-label="Home" title="Home"></button>
      <button type="button" class="home-hit home-hit-mission" data-route="missioni" aria-label="La Missione" title="La Missione"></button>
      <button type="button" class="home-hit home-hit-progress" data-route="scoperte" aria-label="Progressi e scoperte" title="Progressi"></button>
      <button type="button" class="home-hit home-hit-extra" data-route="info" aria-label="Extra e informazioni utili" title="Extra"></button>
    </nav>
    <button type="button" class="home-hit home-hit-start" data-route="missioni" aria-label="INIZIA L'AVVENTURA" title="Inizia l'avventura"></button>
  </section>`;
}
function missionItem(n){const done=state.completed>=n,open=state.completed===n-1;const icon=done?'🏆':open?'🕹️':'🔒';return `<article class="mission-card ${done?'completed':open?'open':''}"><span class="step-label">LIVELLO 0${n}</span><div class="mission-icon" aria-hidden="true">${icon}</div><h2>${done?'COMPLETATA':`MISSIONE ${n}`}</h2><p>${done?'Complimenti! Il tuo premio è già sbloccato.':open?'Una prova veloce ti separa dalla prossima scoperta.':'Per ora è tutto top secret.'}</p><button ${!done&&!open?'disabled':''} data-route="${done?(n===3?'finale':`scoperta-${n}`):`sfida-${n}`}">${done?'Rivedi la sorpresa →':open?'GIOCA ORA →':'🔐 BLOCCATA'}</button></article>`}
function progress(){return `<div class="progress-track" aria-label="Hai completato ${state.completed} missioni su 3"><img class="progress-portrait" src="assets/mich-sorriso.webp?v=20261114-clear" alt="Foto originale di Mich sorridente senza barba"/><span>PROGRESSI</span><div class="progress-meter">${[1,2,3].map(n=>`<span class="${state.completed>=n?'done':''}"></span>`).join('')}</div><strong>${state.completed}/3</strong></div>`}
function renderMissions(){return `${heading('🎮 LIVELLI SEGRETI','La tua missione','Tre sfide, tre sorprese. Ogni prova nasconde un pezzo della serata organizzata dai tuoi amici.')} ${progress()}<div class="mission-grid">${[1,2,3].map(missionItem).join('')}</div><p class="small-note">Puoi riprovare tutte le volte che vuoi. Le scoperte già ottenute resteranno salvate su questo dispositivo. 💾</p>`}
function gameShell(n,icon,title,subtitle,inner){return `<div class="win-panel"><div class="game-top"><img src="assets/mich-avatar.webp?v=20261114-photos" alt="Avatar cartoon di Mich"/><div><div class="eyebrow">${icon} LIVELLO 0${n}</div><h1>${title}</h1><p>${subtitle}</p></div></div><div class="game-field">${inner}</div><div class="game-controls"><button data-route="missioni">← Le missioni</button><button data-action="hint">💡 Un aiutino</button></div><p class="hint" id="hint-area">${hintVisible?hintFor(n):'Nessuna fretta: le prove non hanno un timer.'}</p></div>`}
function hintFor(n){return n===1?'Guarda le caselle che si illuminano e ripeti la sequenza nello stesso ordine.':n===2?'Ogni casella modifica anche le vicine in alto, basso, destra e sinistra. Puoi riprovare senza limiti.':'Per ogni indizio serve una sola cifra. Per il secondo osserva quanto crescono le differenze; per il quarto conta i collegamenti tra i vertici.'}
function renderSimon(){return gameShell(1,'⚡','Sequenza luminosa','Memorizza quattro luci e ripetile nello stesso ordine.',`<h2>OSSERVA. MEMORIZZA. RIPETI.</h2><p>Una piccola prova per scaldare i riflessi.</p><div class="simon-grid">${[0,1,2,3].map(i=>`<button class="simon-pad" data-pad="${i}" aria-label="Luce ${i+1}" ${simon.accepting?'':'disabled'}></button>`).join('')}</div><p class="game-message" id="simon-message">${simon.accepting?`Tocca le luci. ${simon.index}/4`:'Premi il pulsante per vedere la sequenza.'}</p><div class="game-controls"><button class="primary" data-action="start-simon">▶ ${simon.active?'Rivedi la sequenza':'MOSTRA LA SEQUENZA'}</button></div>`)}
async function startSimon(){simon.active=true;simon.accepting=false;simon.index=0;const token=viewToken;const pads=[...document.querySelectorAll('[data-pad]')];const btn=document.querySelector('[data-action="start-simon"]');if(btn)btn.disabled=true;pads.forEach(p=>p.disabled=true);const msg=document.getElementById('simon-message');if(msg)msg.textContent='Occhi aperti... 👀';await sleep(380);for(const i of simon.sequence){if(token!==viewToken)return;const pad=document.querySelector(`[data-pad="${i}"]`);if(!pad)return;pad.classList.add('lit');sound([350,470,590,720][i],.3);await sleep(500);pad.classList.remove('lit');await sleep(230)}if(token!==viewToken)return;simon.accepting=true;document.querySelectorAll('[data-pad]').forEach(p=>p.disabled=false);if(msg)msg.textContent='Tocca le luci nell’ordine giusto! 0/4';if(btn)btn.disabled=false}
function simonPress(i){if(!simon.accepting)return;const pad=document.querySelector(`[data-pad="${i}"]`);pad?.classList.add('lit');setTimeout(()=>pad?.classList.remove('lit'),180);sound([350,470,590,720][i],.15);if(simon.sequence[simon.index]!==i){simon.accepting=false;simon.active=false;sound(150,.4,'sawtooth',.05);toast('Quasi! Riguarda la sequenza e riprova.');render();return}simon.index++;if(simon.index>=simon.sequence.length){simon.accepting=false;completeGame(1);return}document.getElementById('simon-message').textContent=`Ottimo! ${simon.index}/4`;}
function toggleArray(a,i){const next=[...a];[i,i-3,i+3,(i%3===0?-1:i-1),(i%3===2?-1:i+1)].forEach(j=>{if(j>=0&&j<9)next[j]=!next[j]});return next}
function initialLights(){let lights=Array(9).fill(true);for(const i of [1,4,7])lights=toggleArray(lights,i);return lights}
function renderLights(){if(!state.lights){state.lights=initialLights();save()}return gameShell(2,'💡','Interruttori impazziti','Accendi tutte e nove le caselle per aprire la prossima porta.',`<h2>PORTA TUTTE LE LUCI SU ON</h2><p>Attenzione: un interruttore cambia anche alcune caselle vicine.</p><div class="lights-grid">${state.lights.map((on,i)=>`<button data-light="${i}" class="light-tile ${on?'on':''}" aria-label="Luce ${i+1}, ${on?'accesa':'spenta'}" aria-pressed="${on}">${on?'✦':'·'}</button>`).join('')}</div><p class="game-message">Luci accese: ${state.lights.filter(Boolean).length}/9</p><div class="game-controls"><button data-action="reset-lights">↻ Ricomincia il puzzle</button></div>`)}
function lightsPress(i){if(state.completed>=2)return;state.lights=toggleArray(state.lights,i);save();sound(state.lights[i]?610:280,.09,'square',.04);if(state.lights.every(Boolean)){completeGame(2);return}render()}
function digitButton(i,direction){state.safe[i]=(Number(state.safe[i])+direction+10)%10;save();render()}
function renderSafe(){return gameShell(3,'🔐','La cassaforte','Quattro enigmi, quattro cifre. Le papere non hanno lasciato istruzioni facili.',`<h2>DECIFRA IL CODICE A 4 CIFRE</h2><p>Risolvi i quattro enigmi e imposta le rotelle nell’ordine indicato.</p><div class="safe-wrap"><div class="safe-digits">${state.safe.map((n,i)=>`<div class="safe-digit"><button data-digit="${i}" data-dir="1" aria-label="Aumenta cifra ${i+1}">▲</button><strong aria-label="Cifra ${i+1}: ${n}">${n}</strong><button data-digit="${i}" data-dir="-1" aria-label="Diminuisci cifra ${i+1}">▼</button></div>`).join('')}</div></div><div class="clue-list"><div class="clue"><span>01</span> <strong>Prima cifra:</strong> otto paperelle partecipano a un torneo a eliminazione diretta. Ogni partita elimina una paperella: quante partite servono per decretare la vincitrice?</div><div class="clue"><span>02</span> <strong>Seconda cifra:</strong> continua la sequenza 3, 6, 11, 18, 27, … Qual è la cifra delle unità del numero successivo?</div><div class="clue"><span>03</span> <strong>Terza cifra:</strong> due madri e due figlie vanno a cena, ma ognuna delle presenti è una persona diversa. Qual è il numero minimo di persone al tavolo?</div><div class="clue"><span>04</span> <strong>Quarta cifra:</strong> traccia tutte le diagonali di un esagono, senza contarne nessuna due volte. Quante ne ottieni?</div></div><p class="game-message" id="safe-message">Quattro cifre. Un tentativo alla volta.</p><div class="game-controls"><button class="primary" data-action="verify-safe">🔓 VERIFICA COMBINAZIONE</button></div>`)}
function safeCheck(){if(state.safe.join('')==='7839'){completeGame(3);return}sound(170,.27,'sawtooth',.045);const msg=document.getElementById('safe-message');if(msg)msg.textContent='❌ Codice errato. Controlla gli indizi e riprova!'}
function completeGame(n){if(state.completed<n){state.completed=n;save()}simon.accepting=false;simon.active=false;fanfare();confetti();go(n===3?'finale':`scoperta-${n}`)}
function revealContent(n){if(n===1)return `<img class="reveal-photo" src="assets/binario-anteprima.webp?v=20261114-clear" alt="Foto dell'interno del Binario Magic Pub"/><h1>🪄 Binario Magic Pub</h1><p>La prima tappa sarà una <strong>cena al Binario Magic Pub</strong>, un locale a tema magia vicino a Bergamo. Una cornice niente male per iniziare la nostra serata.</p><p>📆 <strong>Quando:</strong> data ancora da definire insieme.<br/>📍 <a target="_blank" rel="noopener noreferrer" href="https://www.binariomagicpub.it/">Scopri il locale ↗</a></p>`;return `<div class="eyebrow">🚪 SECONDA TAPPA</div><h1>Backdoor 1253</h1><p>Le tue abilità verranno messe alla prova in un'<strong>esperienza misteriosa</strong> da vivere insieme ai tuoi amici.</p><p>Non possiamo promettere che tutti ne usciranno con la dignità intatta. 😎</p><p>📆 <strong>Quando:</strong> data da concordare.<br/>🔎 <a target="_blank" rel="noopener noreferrer" href="https://backdoor1253.it/">Scopri Backdoor 1253 ↗</a></p>`}
function renderReveal(n){return `${heading('🎉 MISSIONE COMPLETATA','INDIZIO SBLOCCATO!','Vittoria! Ecco cosa hanno in serbo per te i tuoi amici.')}<article class="reveal-box"><div class="reveal-top">★ RICOMPENSA ${n}/3 OTTENUTA ★</div><div class="reveal-inner">${revealContent(n)}<div class="reveal-buttons"><button class="cta" data-route="missioni">CONTINUA L'AVVENTURA →</button><button class="cta cta-secondary" data-route="scoperte">Le mie scoperte</button></div></div></article>`}
function renderDiscoveries(){return `${heading('✦ ARCHIVIO PERSONALE','Le tue scoperte','Qui ritrovi tutte le informazioni che hai sbloccato, senza dover rifare le sfide.')} ${progress()}<div class="discovery-grid">${[1,2,3].map(i=>{const ready=state.completed>=i;return `<article class="discovery ${ready?'ready':''}"><div class="ico">${ready?['','🪄','🚪','🎁'][i]:'🔒'}</div><div class="eyebrow">RICOMPENSA 0${i}</div><h2>${ready?['','La prima tappa','La seconda tappa','Il gran finale'][i]:'TOP SECRET'}</h2><p>${ready?'La tua sorpresa è stata sbloccata. Puoi rivederla quando vuoi.':'Completa la relativa missione per conoscere i dettagli.'}</p><button ${!ready?'disabled':''} data-route="${i===3?'finale':`scoperta-${i}`}">${ready?'APRI LA SORPRESA →':'🔐 NON ANCORA'}</button></article>`}).join('')}</div>`}
function renderFinal(){
 if(state.completed<3)return '<section class="final-lock"><div class="lock">🔐</div><h1>AREA RISERVATISSIMA</h1><p>Qui si nasconde l’ultima sorpresa. Prima devi completare le missioni.</p><button class="cta" data-route="missioni">TORNA ALLE MISSIONI →</button></section>';
 return '<section class="finale-page" aria-label="Il gran finale della Mich’s Night">'+
 '<div class="final-poster-artboard">'+
 '<img src="assets/gran-finale-approvato.webp?v=20261114-teatro" width="941" height="1672" fetchpriority="high" decoding="async" alt="IN OMAGGIO. IL GRAN FINALE. Una notte di fuoco con la Deni: Mich con rosa tra i denti e smoking rosso scintillante, sul palco con tendaggi rossi, sagoma femminile, cuori e fiamme. Il comitato organizzatore declina ogni responsabilità riguardante questa parte di regalo. ACCETTO IL MIO DESTINO." />'+
 '<button type="button" class="final-poster-cta" data-action="accept" aria-label="ACCETTO IL MIO DESTINO" title="Accetto il mio destino"></button>'+
 '</div>'+
 (state.accepted?'<div class="final-confirm" role="status"><div class="final-confirm-seal" aria-hidden="true">✓</div><h2>📜 CONTRATTO CON IL DESTINO FIRMATO</h2><p>La tua decisione è stata registrata ufficialmente dal comitato organizzatore.</p><button type="button" class="cta cta-secondary" data-action="replay">🎭 RIGUARDA IL GRAN FINALE</button></div>':'')+
 '<p class="final-bottom"><button data-route="scoperte">← Le mie scoperte</button><button data-route="home">Torna all’inizio</button></p></section>';
}

/* Un finto contratto teatrale, non una conferma di prenotazione. */
let contractReturnFocus=null;
let contractTimers=[];
function contractLater(fn,ms){const id=setTimeout(fn,ms);contractTimers.push(id);return id}
function playContractStamp(){
 if(!state.sound)return;
 try{
  const Audio=window.AudioContext||window.webkitAudioContext;
  if(!Audio)return;
  ctx=ctx||new Audio();
  if(ctx.state==='suspended')ctx.resume().catch(()=>{});
  const t=ctx.currentTime+.56;
  const click=ctx.createOscillator(),cg=ctx.createGain();
  click.type='square';
  click.frequency.setValueAtTime(1100,t);
  click.frequency.exponentialRampToValueAtTime(430,t+.055);
  cg.gain.setValueAtTime(.0001,t);
  cg.gain.exponentialRampToValueAtTime(.045,t+.006);
  cg.gain.exponentialRampToValueAtTime(.0001,t+.09);
  click.connect(cg);cg.connect(ctx.destination);click.start(t);click.stop(t+.095);
  const thud=ctx.createOscillator(),tg=ctx.createGain();
  thud.type='triangle';
  thud.frequency.setValueAtTime(180,t);
  thud.frequency.exponentialRampToValueAtTime(55,t+.17);
  tg.gain.setValueAtTime(.0001,t);
  tg.gain.exponentialRampToValueAtTime(.14,t+.009);
  tg.gain.exponentialRampToValueAtTime(.0001,t+.21);
  thud.connect(tg);tg.connect(ctx.destination);thud.start(t);thud.stop(t+.23);
 }catch{}
}
function closeContract(){
 const overlay=document.getElementById('mich-contract-overlay');
 if(!overlay)return;
 contractTimers.forEach(clearTimeout);contractTimers=[];
 overlay.remove();
 document.body.classList.remove('contract-modal-open');
 const origin=contractReturnFocus;contractReturnFocus=null;
 if(origin&&origin.isConnected)origin.focus({preventScroll:true});
 else document.querySelector('.final-poster-cta')?.focus({preventScroll:true});
}
function openContract(){
 closeContract();
 contractReturnFocus=document.activeElement;
 const overlay=document.createElement('div');
 overlay.id='mich-contract-overlay';
 overlay.className='contract-overlay';
 overlay.setAttribute('role','dialog');
 overlay.setAttribute('aria-modal','true');
 overlay.setAttribute('aria-labelledby','mich-contract-title');
 overlay.setAttribute('aria-describedby','mich-contract-body');
 overlay.innerHTML=[
  "<div class='contract-spotlight' aria-hidden='true'></div>",
  "<div class='contract-document'>",
  "<div class='contract-header'><span>★ UFFICIO AFFARI IRREVOCABILI ★</span><button type='button' class='contract-close' aria-label='Chiudi il contratto' data-close-contract>✕</button></div>",
  "<div class='contract-scroll'>",
  "<div class='contract-present'>THE MICH’S NIGHT <span aria-hidden='true'>🔥</span></div>",
  "<div class='contract-stamp-zone' aria-hidden='true'>",
  "<span class='contract-stamp'>CONTRATTO<br>CON IL DESTINO<br><strong>FIRMATO</strong><span class='stamp-tick'>✓</span></span>",
  "<span class='contract-impact'>TAC!</span></div>",
  "<h2 id='mich-contract-title'>DESTINO ACCETTATO!</h2>",
  "<p id='mich-contract-body' class='contract-message'>La tua decisione è stata registrata. <strong>Non sono previsti resi, rimborsi o possibilità di ripensamento.</strong></p>",
  "<p class='contract-deni'>La Deni si riserva il diritto di modificare i termini del contratto. <span aria-hidden='true'>🔥</span></p>",
  "<div class='contract-signatures'><span>FIRMA DEL DESTINATARIO<br><strong>Mich ✓</strong></span><span>IL COMITATO ORGANIZZATORE<br><strong>Approvato 💘</strong></span></div>",
  "<p class='contract-fineprint'>Documento puramente scherzoso. Il regalo si vive con gli amici, la data resta da concordare.</p>",
  "<button class='contract-ack' type='button' data-close-contract>HO CAPITO, È TROPPO TARDI! ↗</button>",
  "</div></div>"
 ].join('');
 document.body.append(overlay);
 document.body.classList.add('contract-modal-open');
 const closeButtons=[...overlay.querySelectorAll('[data-close-contract]')];
 closeButtons.forEach(btn=>btn.addEventListener('click',closeContract));
 overlay.addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();closeContract();return}
  if(event.key!=='Tab')return;
  const first=closeButtons[0],last=closeButtons[closeButtons.length-1];
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
 });
 closeButtons[0].focus({preventScroll:true});
 playContractStamp();
 const reduceMotion=typeof window.matchMedia==='function'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 contractLater(()=>{if(overlay.isConnected&&!reduceMotion)confetti(135)},reduceMotion?0:920);
 contractLater(()=>{if(overlay.isConnected)fanfare()},reduceMotion?0:1060);
}

function renderInfo(){return `${heading('ⓘ DETTAGLI DELLA MISSIONE','Info utili','Qui trovi solo ciò che possiamo dirti senza rovinare le sorprese.')}<div class="info-box"><h2>📆 Quando?</h2><p>La data di <strong>The Mich's Night</strong> è ancora da definire. La sceglieremo insieme prima delle prenotazioni.</p><div class="divider"></div><h2>💜 Con chi?</h2><p>Con i tuoi amici. Non serve un elenco di nomi: quello che conta è che abbiamo pensato questa serata per te.</p><div class="divider"></div><h2>🎮 Come funziona il sito?</h2><p>Premi «Inizia l'avventura», completa tre minigiochi di logica e scopri una sorpresa alla volta. Ogni premio sbloccato resterà disponibile in «Le scoperte».</p><div class="divider"></div><h2>💾 Dove finiscono i progressi?</h2><p>Si salvano automaticamente nel browser di questo dispositivo, senza registrazione. Non cancellare i dati del sito se vuoi conservarli.</p><button class="inline-button" data-action="reset-all" style="margin-top:10px">↻ Ricomincia tutta l'avventura</button><p style="font-size:12px;margin-bottom:0">Questa opzione azzera i progressi solo dopo una conferma.</p></div>`}
function render(){viewToken++;hintVisible=false;const requested=route(),r=safeRoute(requested);if(r!==requested){location.hash=r;return}if(document.body?.classList)document.body.classList.toggle('home-mode',r==='home');setNav(r);syncProgress();switch(r){case'home':app.innerHTML=renderHome();break;case'missioni':app.innerHTML=renderMissions();break;case'sfida-1':simon={active:false,accepting:false,index:0,sequence:[0,3,1,2]};app.innerHTML=renderSimon();break;case'sfida-2':app.innerHTML=renderLights();break;case'sfida-3':app.innerHTML=renderSafe();break;case'scoperta-1':case'scoperta-2':app.innerHTML=renderReveal(Number(r.slice(-1)));break;case'scoperte':app.innerHTML=renderDiscoveries();break;case'finale':app.innerHTML=renderFinal();break;case'info':app.innerHTML=renderInfo();break;default:location.hash='home';return}}
document.addEventListener('click',event=>{const target=event.target.closest('button');if(!target)return;const targetRoute=target.dataset.route;if(targetRoute){sound(720,.09);go(targetRoute);return}if(target.dataset.pad!==undefined){simonPress(Number(target.dataset.pad));return}if(target.dataset.light!==undefined){lightsPress(Number(target.dataset.light));return}if(target.dataset.digit!==undefined){digitButton(Number(target.dataset.digit),Number(target.dataset.dir));sound(320,.05);return}const action=target.dataset.action;if(!action)return;if(action==='start-simon'){sound(800,.05);startSimon()}if(action==='hint'){hintVisible=!hintVisible;const el=document.getElementById('hint-area');const n=Number(route().slice(-1));if(el)el.textContent=hintVisible?hintFor(n):'Nessuna fretta: le prove non hanno un timer.'}if(action==='reset-lights'){state.lights=initialLights();save();render();toast('Puzzle ricominciato.')}if(action==='verify-safe')safeCheck();if(action==='accept'){state.accepted=true;save();render();openContract()}if(action==='replay'){openContract()}if(action==='reset-all'){if(confirm('Vuoi davvero cancellare tutti i progressi di questa avventura su questo dispositivo?')){state={...DEFAULT};save();toast('Avventura ricominciata!');go('home')}}});
document.getElementById('sound-toggle').addEventListener('click',()=>{state.sound=!state.sound;save();if(state.sound)sound(690,.15)});
window.addEventListener('hashchange',render);
if(!location.hash)location.hash='home';render();
