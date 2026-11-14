# The Mich's Night 🎮

Sito-regalo arcade per Mich, creato dai suoi amici.

## Funzionamento
- Homepage senza spoiler e pulsante **Inizia l'avventura**.
- Sequenza luminosa → sblocca il Binario Magic Pub.
- Puzzle di interruttori → sblocca l'esperienza Backdoor 1253.
- Cassaforte logica → sblocca il gran finale.
- Finale: **IN OMAGGIO: Una notte di fuoco con la Deni**, con il pulsante **Accetto il mio destino**.
- Progressi salvati localmente nel browser, navigazione tra le sezioni sbloccate e suoni disattivabili.

## Avvio e test
Apri `index.html` o usa un server statico: `python -m http.server 8080`.
Esegui `node scripts/smoke-test.cjs` per il test automatico.

Le prenotazioni e la data sono ancora da definire. Le immagini e il codice distribuiti pubblicamente non costituiscono un meccanismo di segretezza: gli sblocchi sono una funzionalità ludica. Il sito non è pubblicato automaticamente su un dominio dal solo caricamento su GitHub.

## Asset e mobile (14 novembre 2026)
- Navigazione mobile a 2 righe, scene e rotelle responsive, finale teatrale adattivo.
- Cassaforte a 4 cifre con enigmi logici (codice memorizzato nel sorgente); progressi precedenti compatibili.
- Effetto QUACK derivato da un breve campione del WAV fornito e riprodotto solo quando il browser consente l'audio.
- **Ripristinate le foto autentiche di Mich** già presenti nel repository: `mich-sorriso.webp` (sbarbato), `mich-barba.webp` (barbuto) e `mich-avatar.webp` (cartoon). Utilizzate nelle sezioni home, minigiochi e gran finale. Recuperabili dalla cronologia Git se accidentalmente sostituite.
- Il repository contiene versioni WebP compatte delle foto. Per ottenere maggiore risoluzione servono gli originali a piena qualità.
