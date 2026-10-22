=== COMO ADICIONAR MÚSICAS AO SONIC THRUST ===

1. Coloca os teus ficheiros de áudio (.mp3 ou .wav) dentro desta pasta:
   /public/tracks/ (ou ./public/tracks/)

2. Abre o ficheiro /public/tracks/tracks.json e adiciona a tua música à lista:
   Exemplo:
   [
     {
       "id": "minha-musica",
       "title": "Nome da Tua Música",
       "artist": "Teu Nome / Artista",
       "filename": "minha-musica.mp3",
       "description": "Faixa personalizada"
     }
   ]

3. Guarda o ficheiro tracks.json. O jogo deteta automaticamente o ficheiro, calcula a duração e o BPM aproximado através da Web Audio API!

DICA: Também podes clicar no botão "+ CARREGAR MP3 / WAV LOCAL" diretamente no menu do jogo para testar qualquer música instantaneamente sem precisar reiniciar ou mover ficheiros!
