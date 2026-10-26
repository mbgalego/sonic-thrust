=== COMO ADICIONAR MÚSICAS AO SONIC THRUST ===

1. Coloca os teus ficheiros de áudio dentro desta pasta:
   /public/tracks/ (ou ./public/tracks/)

   Formatos suportados: MP3, WAV, OGG, FLAC, M4A — qualquer formato que o
   navegador consiga descodificar (Web Audio API / decodeAudioData).

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

3. Guarda o ficheiro tracks.json. O jogo carrega a lista a partir deste
   ficheiro; a duração e o BPM aproximado são calculados automaticamente pela
   Web Audio API durante a reprodução.

=== LICENCIAMENTO DE MÚSICA ===

Toda a música original deste jogo (artista «miguelius») foi criada pelo
artista e é licenciada ao autor, podendo ser utilizada comercialmente.
Perfil do artista no Suno: https://suno.com/@miguelius

Partilha permitida — se usares estas músicas noutros projetos, pede-se apenas
atribuição ao autor: crédito «miguelius» com ligação ao repositório
sonic-thrust.