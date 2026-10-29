# Sonic Thrust - Agent Architecture & Maintenance Guide

## 1. Project Overview
**Sonic Thrust** is a 2D neon vector audio-navigation game built with React, Vite, Canvas 2D, Matter.js physics principles, and the Web Audio API. The player pilots a dual-thruster spacecraft through music-generated roller-coaster tunnels whose boundaries, obstacles, and visual effects react dynamically in real-time to music FFT frequencies (sub-bass, bass, mids, treble).

---

## 2. Architecture & Core Systems
- **Versioning Rule**: Every change that ships to the game requires bumping the version string in the main menu footer (`TitleMenu.tsx`: `v1.X.0 · DD/MM/YYYY`) and adding a matching changelog entry to this file (`agents.md`). Version must be bumped on every feature/fix/deploy.

### A. Physics & World Simulation (`/src/physics/PhysicsWorld.ts`)
- **Dual-Thruster Aerodynamics**:
  - Independent Left (`A` / `ArrowLeft`) and Right (`D` / `ArrowRight`) thruster controls.
  - Forward cruise baseline velocity synchronized with track duration to ensure arrival at the Finish Portal precisely as the audio track concludes.
  - Optional Flight Assist (Auto-Estabilização) providing spring torque correction towards horizontal alignment when controls are released.
- **Music-Seeded Roller-Coaster Terrain**:
  - Each audio track computes a deterministic hash seed from `trackId`, `estimatedBpm`, and `duration`.
  - Harmonically modulated terrain generates multi-phase sweeping hills, chicanes, and cavernous breathing zones unique to each song.
- **Safe Spawn Runway (`x: 0` to `800px`)**:
  - Center axis is locked dead-center at `worldHeight / 2` with guaranteed wide clearance (minimum 260px half-width).
  - Smoothstep cubic Hermite blend smoothly transitions the tunnel into dynamic track curves between `x = 750` and `1350`.
  - Guarantees the ship **never spawns inside walls** regardless of track seed or BPM.
- **Anti-Gravity Launch Stabilizer (`launchGraceTimer = 2.8s`)**:
  - On mission start, vertical gravity acceleration is suspended for 2.8 seconds.
  - Soft magnetic damping (`vy *= 0.88`) gently hovers the ship in the center of the runway, giving the player ample time to react and engage thrusters without crashing on frame 1.
- **Hard Boundary Clamping & Anti-Tunneling**:
  - Evaluated on every physics step and collision query:
    `minSafeY = terrain.ceilY + shipRadius`, `maxSafeY = terrain.floorY - shipRadius`.
  - The ship coordinates are hard-clamped to `[minSafeY, maxSafeY]`.
  - Eliminates wall tunneling/penetration even under high-speed impacts or during shield bounce invulnerability.

### B. High-Performance Canvas 2D Renderer (`/src/graphics/GameRenderer.ts`)
- **Gravitational Ripple Contour Lines (Outside Playable Space)**:
  - 5 multi-layer neon rainbow harmonic ripple waves that propagate **strictly outward into the bedrock** (above ceiling and below floor).
  - Behave like gravitational shockwaves radiating outward (analogous to concentric ripples when a stone falls into still water).
  - Modulated by audio bass kicks, transients, and tempo, with exponential fadeout as they expand deeper into the bedrock.
  - Keeps the central playable flight corridor 100% clean, clear, and visible.
- **Full-Screen 'Neon Pulse' Layer with Corridor Cutout**:
  - Center-outward expanding neon arc waves reacting to bass energy.
  - Uses an inverse linear gradient mask (`destination-out`) across the central 340px flight band, so waves frame the screen horizons and outer corners majestically without obstructing or cluttering the pilot's flight path.
- **Visual Anti-Gravity Launch Field**:
  - Renders a rotating cyan magnetic shield ring with dashed pulses and a floating `ANTI-G [Xs]` indicator above the ship while `launchGraceTimer > 0`.
- **Dynamic Entities**:
  - **Power-Ups**: Holographic celestial beacons with orbital satellites and pulsing colors (Cyan Shield, Emerald Damper, Solar Gold Low-G).
- **Hypersonic Atmospheric Entry & Dissipating Wake Trails**:
  - *Front Atmospheric Bow Shock & Vapor Streamlines*: At speeds starting strictly at 500 (threshold `500+` px/s, scaling to 780+ px/s), a curved supersonic bow shock wave envelope forms ahead of the nose and wraps around the ship's wings, featuring an aerodynamic stagnation compression heat cushion, Prandtl-Glauert vapor shockwaves, and aerodynamic Mach streamlines.
  - *Smoothly Dissipating Fiery Wake Tracks*: Behind the ship, dual incandescent temporal tire/plasma tracks are laid into the wake from the twin thruster pods. As they age, they smoothly and organically dissipate into the vacuum over ~1.6 seconds without sudden cutoffs, shedding drifting fiery embers and sparks.

### C. Audio Engine (`/src/audio/AudioEngine.ts`)
- Web Audio API pipeline with master, pre-fader music bus, and sfx routing.
- Real-time 1024-bin FFT analyser with smoothed bass, mids, treble, and beat detection.
- Proximity radar clicks with frequency scaling as the craft nears terrain.
- Instantaneous one-click track preview switching in the Title Menu with automated menu music pause/resume and dedicated mute controls.
- Smooth volume fadeout (`fadeOutAndStopTrack`) and continuous node silence on crash or menu exit.
- Background track preloading (`preloadTrack`), in-flight promise caching/deduplication, and seamless buffer caching.
- Seamless track looping (`setLoopTrack(true)`) to maintain continuous audio playback and live visualizers on the Victory screen.

### D. User Interface Components (`/src/components/`)
- **TitleMenu (`/src/components/TitleMenu.tsx`)**:
  - Clean title lockup with `SONIC THRUST` neon glow.
  - Non-overlapping utility controls: Fullscreen and Menu Music Mute buttons positioned safely away from the game title.
  - Ambient starfield background with subtle 1px twinkling white stars behind the 3D synthesizer visualizer.
  - Interactive "INICIAR" pill button with circulating neon laser beam and rotating conic comet loader indicator when launching and decoding track audio.
  - Curated track selector with inline scrollable dropdown, artist info, BPM, and instant 1-click preview.
  - Inline scrollable dropdown menus for Difficulty, Options (Flight Assist, Drift Compensation), and Flight Manual / Rules.
- **GameHUD (`/src/components/GameHUD.tsx`)**:
  - Non-occluding top bar with progress bar, track title, timer, and Pause + Fullscreen controls.
  - Anti-G launch stabilizer status banner during the first 2.8 seconds.
  - Speed readout formatted with `whitespace-nowrap` to prevent line wrapping.
  - Dual-thruster pressure gauges and altitude clearance indicators.
- **EndGameModal (`/src/components/EndGameModal.tsx`)**:
  - Pixel-faithful cyberpunk victory and defeat modal with zero DOM layout shifts (60 FPS direct-canvas rendering).
  - Concentric pulsing neon rings, orbiting star particles, and neon trophy emblem for Victory.
  - Live 60 FPS mirrored audio waveform and reactive bass/mids soundwave lines under telemetry stats (Progresso, Tempo Voo, Vel. Máx, Orbes).
  - Dynamic corner mini VU equalizers rendered to dedicated canvases without triggering React state re-renders.
  - Clean "GAME OVER" header for defeat, accompanied by explicit collision/destruction telemetry.
  - Cyberpunk action buttons: `TENTAR NOVAMENTE` with side vibration soundwaves and `MENU INICIAL`.

---

## 3. Changelog & Recent Fixes
- **v1.33.1 (Fix: EndGameModal visualizers missing on hi-DPI screens)**:
  1. *Root cause*: Regression from v1.32.1 — the ResizeObserver DPR-resize handler overwrote `canvas.width/height` with device-pixel sizes + applied a `dpr` scale transform, but the drawing code read `canvas.width/height` as logical (CSS px) coordinates. On screens with `devicePixelRatio ≠ 1` (e.g. Windows 125%/150% scaling) everything was drawn double-scaled: corner mini-VU segments landed off-canvas (invisible) and the central spectrum was zoomed/clipped.
  2. *Fix*: Logical (CSS px) sizes are now stored in a `WeakMap` during resize and all canvas drawing (`drawMiniVU`, `drawDynamicWaveLine`, central spectrum) uses `getLogicalSize()` instead of `canvas.width/height` — crisp at any DPR, with degenerate 0-size measurements guarded.
  3. *Visibility*: Mini-VU minimum level floor raised 0.1 → 0.3 so at least one segment is always lit (no "dead" equalizers during silence).
  4. *Verified objectively* via Playwright at `deviceScaleFactor` 1 and 2: buffers ×dpr, CSS layout stable (no ResizeObserver feedback loop), all 7 canvases drawing, corner VUs lit, central visualizer rendered.
- **v1.33.0 (Track Unlock System & Neo Dreams Secret Track)**:
  1. *Track Unlock System*: New persistent unlock system (`src/utils/trackUnlocks.ts`) using localStorage. Tracks with `unlockCondition` + `secret: true` are hidden until unlocked. Completing any track in PRO or EXTREME mode checks for and grants unlocks.
  2. *Neo Dreams Secret Track*: Added "Neo Dreams" (Dev's Secret Sound) to `tracks.json` — unlockable by completing any track in PRO mode. Dreamy synthwave at 122 BPM, 228s.
  3. *Unlock Notification Toast*: Animated slide-down toast appears when tracks are unlocked, showing track title(s) and confirmation.
  4. *Locked Track UI*: Secret tracks appear in the catalog with lock icon, disabled state, and tooltip showing unlock requirement (e.g., "Completa qualquer faixa no modo PRO para desbloquear").
  4. *Extensible Design*: System ready for future EXTREME-mode unlocks — just add `unlockCondition: { mode: 'EXTREME', description: '...' }` to new tracks.
  5. *Cleanup*: Removed 2 unlicensed MP3s (CARL POPPA, Kosmonova). Added Neon Dreams MP3 to `public/tracks/`.
- **v1.32.0 (High-Resolution Performance & Smart DPR Clamping)**:
  1. *Smart Resolution & DPR Budget*: Clamped maximum canvas internal pixel budget to 2.85 Megapixels (equivalent to 1440p @ 1.0 or 1080p @ 1.25 DPR) on large displays (1440p / 4K / Ultrawides), eliminating memory bandwidth and fill-rate stall.
  2. *Dual-Stroke Neon Glow (Zero Gaussian Blur on Bedrock)*: Replaced expensive `ctx.shadowBlur` (up to 40px across 10 waves) on bedrock equalizer waves with instant dual-stroke neon halos, cutting 20–30ms of GPU raster overhead per frame while preserving vibrant neon aesthetics.
  3. *Optimized Full-Screen Overlays & Trail Blurs*: Streamlined radial gradient passes during drop flashes and capped trail blur kernel sizes.
  4. *Modo Desempenho (60 FPS) Toggle*: Added an explicit graphics mode switch in the Configurações dropdown for players seeking ultra-fluid performance on high-refresh-rate displays.
- **v1.31.0 (Non-Repeating Victory Quote Shuffle Bag)**:
  1. *Shuffle Bag (Deck Without Replacement)*: Replaced raw `Math.random()` with a Fisher-Yates shuffle bag and `sessionStorage` persistence. Guarantees that the player cycles through all 8 quotes before any quote repeats, with 0% chance of consecutive repeats across cycle boundaries.
- **v1.30.0 (Random Iconic Victory Quotes Pool)**:
  1. *Random Iconic Quotes Pool*: Added randomized cycling through an 8-quote pool of pop-culture and Portuguese comedy classics (Duarte e Companhia, Diácono Remédios, Top Gun, Star Wars, Matrix, Terminator, Die Hard) whenever the player reaches the finish portal.
- **v1.29.0 (Victory Screen Reimagined: Cyber Visualizer & Track Countdown)**:
  1. *Track Time Left Countdown*: Added a real-time countdown (`TEMPO RESTANTE DA FAIXA`) below the visualizer on Victory so players can track remaining playback time to relax and listen to the song to completion.
  2. *Next-Gen Cyberpunk Audio Visualizer*: Replaced the basic stroke lines with a multi-layered hardware audio analyzer featuring smooth glow area envelopes, 56 rounded neon frequency pillars, floating analog peak-hold meters, center laser oscilloscope core, and an ambient holographic standby wave.
  3. *Meaningful Victory Phrasing*: Replaced the contradictory subtitle with pilot-celebratory copy acknowledging that the portal was crossed and encouraging the player to enjoy the remaining track.
- **v1.28.0 (End of Game Menus Polish & Bugfixes)**:
  1. *Factual Telemetry Metrics*: Fixed `stats.powerUpsCollected ?? 0` (preventing 0 orbes collected from defaulting to fake 20) and `stats.maxSpeed` (removed fallback to 197 km/h).
  2. *Removed Penalty Badge (User Request)*: Removed the "Penalização" pill badge entirely from the end-game modal, balancing track name and difficulty.
  3. *Accurate Defeat Progress Clamping*: Defeat progress is strictly clamped to `Math.min(99, Math.floor(stats.percentCompleted))` so failure near the end never displays 100%.
  4. *Comprehensive Obstacle Label*: Updated destruction label from specific 'Plataforma Rotativa' to `'Colisão com Obstáculo Sonorreativo'` to accurately cover VU towers, resonance mines, and spinning hazard crosses.
  5. *Timeout Ship Freeze*: In `App.tsx`, ship velocities and destruction are locked immediately when remaining track time reaches 0, preventing gravity from causing a secondary collision explosion during the transition.
  6. *Keyboard Navigation in Modal*: Added `Enter`, `Space`, and `R` to restart, and `Escape` to return to menu from the Victory / Game Over modal.
  7. *Responsive Sizing for Mobile*: Scaled modal emblems and padding for seamless fit on compact screens and mobile landscape.
- **v1.27.0 (Menu Theme Lyrics Overlay — feature branch `feature/lyrics-overlay`)**:
  1. *Timed Lyrics Above the Equalizer Bars*: New `MenuLyrics.tsx` displays the spoken lines of "Sonic Thrust - Main Menu Theme" inside the visualizer box (≈16% from the canvas top — above the equalizer mountain peaks). Only shown while the menu theme itself is playing (hidden during track previews).
  2. *Playback Position Getter*: `AudioEngine.getMenuMusicPosition()` exposes the looping theme's current time (`(ctx.currentTime - startTime) % bufferDuration`), also reporting the pause offset when paused, so lyric windows follow the track even across pause/resume.
  3. *Asymmetric Fading*: Lines fade in quickly (0.3s) and fade out slowly (1.8s ease), holding the last visible line during the dissolve. Very lightweight: a rAF loop only triggers React re-renders when the active line changes.
  4. *Timestamp Tuning*: First-pass placeholder timings live in a single constant (`MENU_THEME_LYRICS`); loop-aware (timings repeat on every 234.8s loop of the theme).
- **v1.26.0 (News Ticker Marquee & Parody Magazine Names)**:
  1. *Continuous Scrolling Marquee*: Replaced the static 4s-cycling headline with an infinitely looping CSS marquee (`@keyframes newsMarquee`, 28s linear, translateX -50%). Headlines glide horizontally like a real news ticker, with soft edge fading (`news-ticker-mask`). `width: max-content; white-space: nowrap` keeps it on one line without affecting layout.
  2. *Parody Magazine/Landmark Names*: Satirized famous outlets so the joke is obvious — `IGN`→`IGNORÂNCIA`, `PC Gamer`→`PC GAMERRA`, `GameSpot`→`GAME SPÔT`, `Polygon`→`POLYGONO`, `Eurogamer`→`EUROGAMBER`, `Edge`→`EDGE NÃO`, `Kotaku`→`KOTAKU MEIO`.
  3. *Layout Preservation*: Marquee is bounded by `max-w-[185px]/[340px]/[520px]` (mobile/tablet/desktop, extended by ~20-24%) inside the existing top bar; mobile menu still fits the viewport (scroll-height ≈ viewport-height).
  4. *Mobile Portrait Title Size Boost*: Raised main menu title font size from `text-3xl` (30px) to `text-[42px]` on mobile portrait (vertical) while guaranteeing `landscape:text-6xl sm:text-6xl` in horizontal orientation. Subtitle enhanced to `text-sm`.
- **v1.25.0 (Mobile Menu Compactness & Visualizer Height Normalization)**:
  1. *Reduced Menu Element Sizes on Mobile*: Shrunk title (`text-5xl`→`text-3xl` base), card paddings (`p-3.5`→`p-2.5`), icons (`w-12`→`w-10`), gaps, headers, metadata rows, and footer so the entire menu fits a ~390×844 viewport without scrolling. Desktop (`sm:`/`lg:`) sizes unchanged.
  2. *Visualizer Height Normalization (`hScale`)*: `SynthwaveVisualizer.tsx` now scales all below-horizon extents (wave ribbons, spectrum mountain) by `min(1, h/480)` so the synthwave scene is never clipped on short canvases; ≥480px canvases render byte-identical to the original. Fixes sine-wave ribbons cut off at the bottom edge on mobile.
  3. *Version Footer*: Bumped to `v1.25.0 · 27/10/2026` in the title menu footer.
- **v1.24.0**:
  1. *Soundwave Drift track added* and audio files migrated from `.m4a` to `.mp3` (all tracks).
  2. *AudioContext persistence* implemented on tab visibility changes to prevent context loss during playback.
  3. *HUD optimization*: imperative DOM refs (`GameHUDHandle`) bypass React reconciliation during flight for smoother 60fps gameplay.
  4. *Physics fixed timestep*: deterministic accumulator-based updates decoupled from display refresh rate.
  5. *Removed AI Studio MP3s*: `Kosmonova_-_Take_Me_Away__Club_Mix__1997_2a08146f.mp3` and `public/tracks/CARL POPPA — Lyric Video [Q9aM9Ch97U8].mp3` deleted from the repo.
- **v1.23.0 (Main Menu Visualizer Motion Smoothing & Anti-Flutter)**:
  1. *Low-Pass Damped Amplitudes (`lerpedWaveAmps`)*: Integrated dedicated physical attack/decay exponential damping (`attack = 0.14`, `decay = 0.07`) on the menu wave ribbons, completely eliminating rapid frame-by-frame vibration, fluttering, and trembling.
  2. *Low-Pass Phase Velocity (`currentPhaseSpeed`)*: Replaced instantaneous velocity spikes on `ripplePhase` with continuous, inertia-damped velocity filtering, providing graceful, unbroken gliding momentum across the menu canvas.
  3. *Elimination of High-Frequency Micro-Jitter*: Removed high-frequency spatial jitter harmonics (`hasJitter`) and widened spatial wavelengths, yielding elegant, silky dual-harmonic ribbons that undulate like liquid neon silk.
  4. *In-Game Terrain Untouched*: All changes apply strictly to the main menu visualizer (`SynthwaveVisualizer.tsx`), leaving in-game terrain ripples, bedrock equalizers, and high-energy physics in `GameRenderer.ts` completely intact.
- **v1.22.0 (In-Game Audio-Reactive Wave Dynamics for Main Menu Visualizer)**:
  1. *In-Game Physics & Rhythm Phase Progression*: Integrated monotonic, tempo-locked `ripplePhase` acceleration into `SynthwaveVisualizer.tsx` matching `GameRenderer.ts` — wave movement accelerates dynamically with musical `macroEnergy` and surges forward on sub-bass and beat transients (`speedImpulse = subBass * 1.8 + beatPulse * 2.2`).
  2. *Adaptive Normalization per Frequency Band*: Ported `GameRenderer.ts`'s rolling baseline average (`eqAvg`) and peak decay (`eqPeak`) envelope followers across 6 resonant frequency bands (Sub-Bass 20-85Hz, Punch Bass 85-250Hz, Low-Mids 250-900Hz, High-Mids 900-4500Hz, Treble 4500-16000Hz, Presence 16000Hz+). Delivers full dynamic range on all tracks regardless of audio mastering or loudness.
  3. *Harmonic Multi-Frequency Synthesis*: Replaced simple artificial sine waves with multi-harmonic synthesis (`Math.sin` fundamental + `Math.cos` second overtone + high-frequency shimmer jitter on snares/hi-hats) and explosive rhythm `beatBoost` kick amplification on drum beats.
  4. *Silky Bézier Curves*: Rendered continuous vector ribbons via midpoint quadratic Bézier splines (`quadraticCurveTo`), eliminating angular polyline segments.
  5. *Strict Layout & Framing Preservation*: Retained 100% of the existing menu visualizer layout, dimensions, framing, perspective horizon slope, and edge tapering.
- **v1.20.0 (Main Menu Overhaul, Visual Touch Controls & In-Game Power-Up Graphics)**:
  1. *Section Header Streamlining*: Removed right-side badge/counter text from all main menu section headers (`SELECIONAR FAIXA`, `DIFICULDADE`, `OPÇÕES`, `INFORMAÇÕES`), leaving clean and uncluttered titles.
  2. *Global Typography & Font-Scale Boost*: Enlarged all sub-12px texts across all menu cards, dropdown selectors, badges, and controls to `text-xs` (12px), `text-sm` (14px), and `text-base` (16px), ensuring great readability on smartphones and small displays.
  3. *Rebuilt "INFORMAÇÕES" Guide*:
     - Renamed from "Manual e Regras" to **"INFORMAÇÕES"** and removed the redundant Zero-Contact card.
     - **Visual Flight Controls (Touchscreen & Keyboard)**: Added an interactive cockpit schematic mapping touch zones (left half = left motor, right half = right motor, simultaneous dual-touch = straight vertical ascent) and keyboard keys (`[A]/[←]`, `[D]/[→]`).
     - **In-Game Power-Up Vector Graphics**: Rendered pixel-faithful vector representations (`PowerUpGraphic`) of all 8 power-ups matching their in-game appearance (phase shield crystals with satellites, damper sine resonators, low-G gyroscopes, sonic pulse waves, ethereal dashed phantom rings, crimson hexagonal shields, chrono clocks, and singularity spiral vortexes) alongside succinct, clear explanations.
- **v1.21.0 (Official Licensing, Flight Assist Removal, Local Music Upload)**:
  1. *Flight Assist Removed Entirely*: `flightAssist` removed from `GameOptions`, `DifficultyConfig`, `PhysicsWorld` constructor and physics loop (`applyThrusterForces`). Flight is now 100% manual by design. Description of EXTREME difficulty updated.
  2. *Music Licensing Formalized*: Added `LICENSE.md` (MIT for source) and `public/tracks/LICENSE.md` (CC BY 4.0 for original music). `package.json` updated with `"license": "MIT"`. TitleMenu licensing card references `CC BY 4.0` and links artist to `https://suno.com/@miguelius`.
  3. *Suno Pro Reference Removed*: All descriptions (HUD, README, TitleMenu) now say "created by the artist" instead of "created with Suno Pro", removing the commercial-platform reference.
  4. *Local Music Upload (IndexedDB)*: Phase 1 (`LocalTrackDB`) — IndexedDB persistence with raw-byte storage (not PCM), LRU-safe (calls `loadTrack` with `audioBuffer`/cached path), fallback for private browsing, self-heal of orphan metadata, storage-estimate display. Phase 2 (`LocalTrackLoader`) — `File → decodeAudioData → detectBpmFromBuffer → TrackMetadata {isLocal}`. Phase 3 (`TitleMenu`) — `+ ADICIONAR` button, `LOCAL` badge, per-track delete with confirmation, upload outcome notices (success / unsupported / session-only), storage-meter card in Informações. Phase 4 — `navigator.storage.persist()` and graceful degradation.
  5. *UI Update*: Button renamed to just "Informações" (dropped "& Guia do Piloto"). Version/footer updated to `v1.21.0 · 26/10/2026`.
  6. *Track Library Update*: Added `Redux Abyssum`, `Hyper-Drive`, `Sonic Drift`, `Sonic Drive`, `The flight... has ended`; removed 5 third-party tracks (`Can't Feel My Face`, `Carl Poppa`, `Clean Bandit - Symphony`, `Kosmonova - Ayla`, `Kosmonova - Take Me Away`, and `I Knew You Were Trouble`). `Sonic Thrust - Game Over.m4a` dedicated defeat jingle (non-playable). Game Over jingle plays on both defeat paths (`onShipDestroyed` and time-up) via `AudioEngine.playGameOverJingle()`.
  7. *Ghost Mode (ETHEREAL) Balance*: Exactly 1 guaranteed ETHEREAL pickup per level at midpoint (`floor(totalPowerUps/2)`), removed from rotation pool.
  8. *Audio State Hardening (C1/C2/M1/M2)*: Stale `onTrackEnded` cleared; `previewRequestRef` token prevents stale async preview resolution; `bufferCache` LRU cap 3; `fadeOutAndStopTrack` captures source for safe timeout kill; `playTrack` restores post-fade gain.

- **v1.19.0 (High-Speed Threshold Calibration, HUD Shield Cleanup & Title Typography)**:
  1. *High-Speed Effect Threshold Raised by +100 km/h*: The activation velocity for the hypersonic atmospheric bow shock and twin burning wake trails was raised by +100 km/h from 350 km/h (500 px/s) to 450 km/h (643 px/s), preserving clean visual flight during normal cruise speeds.
  2. *Removed In-Game Shield HUD Badge*: Removed the `{ship.shields}x ESCUDO` badge from the bottom telemetry cluster; shield presence is now conveyed organically by the rotating cyan vector forcefield sphere rendered around the ship in the flight arena.
  3. *Enlarged Title & Subtitle Typography*: Upgraded the main menu game title to `text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black` with neon cyan/magenta drop-glow, and the descriptive subtitle to `text-sm sm:text-base md:text-lg lg:text-xl font-semibold`.
- **v1.18.0 (Main Menu Footer Attribution & High-Legibility Power-Up Subtitles)**:
  1. *Main Menu Footer Attribution*: Updated footer in `TitleMenu.tsx` to display `v1.18.0 · 25/10/2026` on the left and author credit `Por Miguel Galego` on the right, cleanly formatted and visible on all mobile and desktop screens.
  2. *High-Legibility Power-Up Subtitle Explanations*: Significantly enlarged the power-up notification explanation subtitle in `GameHUD.tsx` from `text-xs sm:text-sm` to `text-base sm:text-xl md:text-2xl font-bold` with dual high-contrast drop-shadows and expanded power-up icons (`w-7 h-7 sm:w-8 sm:h-8`), ensuring effortless readability on small smartphone screens during flight.
- **v1.17.0 (Ghost Mode Overhaul, Chrono Dilation Bullet-Time & Prominent Power-Up Banners)**:
  1. *Permanent Flight Assist Deactivation*: Flight assist is permanently deactivated across all difficulties (`NORMAL`, `PRO`, `EXTREME`) and options menus, cementing 100% manual piloting skill and pure reflexes.
  2. *Authentic Ghost Mode Appearance*: In `ETHEREAL` mode, the ship now renders with a pulsating semi-transparent ghostly opacity (`alpha ~0.16–0.28`), an animated marching dashed outline (`setLineDash([5, 4])`), ghostly translucent lavender/cyan hull coloring, and spectral trailing wisps, making ghost form unmistakable.
  3. *Frameless Text-Only Announcements Below Countdown*: Collecting any power-up displays a clean, frameless neon text announcement directly beneath the countdown timer (pure typography and icon, without any boxed frame), lasting 3 seconds:
     - **Modo Fantasma**: *"Tu és um fantasma!"* ("Atravessa todos os obstáculos por 6 segundos")
     - **Distorção Temporal**: *"Distorção Temporal Ativada!"* ("Câmara lenta a 50% — reflexos hiper-acelerados")
     - **Escudo de Fase**: *"Escudo de Fase Ativado!"* ("Proteção impenetrável contra a próxima colisão")
     - **Amortecedor Inercial**: *"Amortecedor Inercial Ativado!"* ("Absorção de impacto cinético e estabilidade aumentada")
     - **Gravidade Reduzida**: *"Gravidade Reduzida!"* ("Surto de microgravidade — voo ultra-leve")
     - **Pulso Sónico**: *"Pulso Sónico Disparado!"* ("Onda de choque que desativa lasers e minas de ressonância")
     - **Invulnerabilidade**: *"Invulnerabilidade Total!"* ("Imunidade completa contra todos os danos")
     - **Singularidade**: *"Singularidade Gravitacional!"* ("Vórtice atrai todos os orbes e cristais de ressonância")
  4. *Chrono Dilation Physical Bullet-Time & Visual Overhaul*:
     - **Physical Slowdown**: `applyThrusterForces` now scales by `timeScale = 0.50` so ship flight, velocity, gravity, and controls enter true 50% slow-motion bullet time synchronized with obstacle movement.
     - **Temporal After-Images (Chronostasis Echoes)**: Trailing chromatic phantom hulls (teal, cyan, amber, violet) drift in the ship's wake.
     - **Screen-Space Temporal Distortion**: Fullscreen radial teal/matrix vignette, temporal corner framing brackets, and expanding radial time shockwave rings.
  5. *Instruction Manual Cleanup*: Removed the redundant "EMPUXO VERTICAL" box from the Dual-Thruster controls card in the title menu manual.
- **v1.16.0 (Dedicated Menu Theme & Expanded Tracklist)**:
  1. *Official Menu Theme ("Sonic Thrust - Main Menu Theme.mp3")*: The Title Menu background music now streams and loops the dedicated soundtrack `Sonic Thrust - Main Menu Theme.mp3`, preloaded on app initialization and seamlessly decoded with procedural synthwave fallback if unreachable. Excluded from the playable track selector so it serves exclusively as the game's menu identity soundtrack.
  2. *Expanded Playable Track Manifest (`tracks.json`)*: Added newly uploaded songs to `public/tracks/tracks.json` and synchronized `DEFAULT_TRACKS` in `App.tsx`:
     - `Classical Cybernetic` - miguelius (130 BPM, 245s, `.m4a`)
     - `Cúig Nóiméad Eile` - miguelius (128 BPM, 265s)
     - `High Tech Cello` - miguelius (132 BPM, 239s)
     - `No Fear, No Ending` - miguelius (135 BPM, 245s)
     - `O Compasso da Saudade` - miguelius (120 BPM, 230s)
  3. *Equalizer Reactivity Separation*:
     - **Mini Equalizer (`MiniEqualizer.tsx`)**: Sits right beside the selected track title in the mission card; now responds strictly when a track preview is active (`active={previewingTrackId === selectedTrack?.id} && audio.isTrackPlaying()`). During menu music playback, it remains in a dimmed, quiet resting standby baseline so users aren't confused into thinking the mission track is already playing.
     - **Main Visualizer (`SynthwaveVisualizer.tsx`)**: Continues responding to all music across the app (both menu background theme and track previews).
- **v1.15.0 (Hypersonic Atmospheric Entry & Dissipating Wake Trails)**:
  1. *500+ Speed Activation Threshold*: The visual high-speed effects now activate strictly at speeds starting at **500** (`HIGH_SPEED_MIN = 500`, scaling to 780+), ensuring normal cruise speeds (200-400) remain clean without constant activation.
  2. *Atmospheric Bow Shock Envelope & Mach Streamlines*: Replaced electric lightning bolts and synthetic sounds with an authentic hypersonic atmospheric re-entry effect: a curved supersonic bow shock wave wrapping around the nose and wings, aerodynamic air stagnation compression plasma heating on the nosecone, Prandtl-Glauert vapor shock waves, and high-velocity Mach air streamlines.
  3. *Twin Fiery Dissipating Wake Tracks*: Retained the burning twin fire/plasma wake tracks from the twin thruster pods that smoothly and organically dissipate into the vacuum over ~1.6 seconds without sudden cutoffs.
- **v1.14.0 (Preloading & Circulating Laser Loading Indicator on INICIAR)**:
  1. *Perimeter Laser & Orbiting Comet Indicator*: When clicking "INICIAR" and the audio track is loading or decoding, an electric cyan neon laser beam travels around the rounded button perimeter (`animate-laser-sweep`), paired with a counter-orbiting white/magenta particle dot and a high-speed rotating conic gradient comet tail.
  2. *Interactive Button Feedback*: The button switches to `pointer-events-none` with an animated spinning cyber `Loader2` icon and dynamic labels ("A CARREGAR...", "A SINCRONIZAR MP3 & TERRENO"), eliminating confusion or dead freezes while decoding audio.
  3. *Background Track Preloading & In-Flight Deduplication*: `AudioEngine.preloadTrack()` proactively downloads and decodes the selected track in the background when in the menu or when switching songs. Concurrent `loadTrack` calls reuse in-flight promises (`loadingPromises`), preventing duplicate network fetches or duplicate audio decoding.
- **v1.13.0 (End Game Modal Overhaul, Zero-Jitter Canvas Spectrum & "Game Over" Redesign)**:
  1. *Reference Mockup Recreation*: Redesigned `EndGameModal.tsx` following the neon cyberpunk mockup: concentric pulsing neon rings, orbiting star particles, neon vector trophy cup emblem, and vertical cyan-to-magenta gradient header `MISSÃO CUMPRIDA!`.
  2. *Zero-Jitter Hardware-Accelerated Canvases*: Replaced DOM-rendered reactive elements with dedicated fixed-size HTML5 `<canvas>` elements updated directly in a single `requestAnimationFrame` loop without React `setState` calls, completely eliminating layout recalculations, modal jitter, and width/height pumping.
  3. *Dynamic Telemetry & Soundwaves*: Added live dynamic 60 FPS soundwave lines under `PROGRESSO` and `TEMPO VOO` oscillating to live audio frequencies, alongside the central mirrored audio spectrum and 4 corner mini VU bars.
  4. *Track Audio Persistence*: Audio playback loops seamlessly on victory (`audio.setLoopTrack(true)`), ensuring visualizers continue reacting dynamically without freezing when the track duration ends.
  5. *Classic "GAME OVER" Defeat*: Replaced sci-fi text (`SINAL PERDIDO · DESTRUÍDA`) with standard arcade **`GAME OVER`**, preserving specific collision/destruction telemetry as the subtitle.
- **v1.12.0 (Title Menu Synthwave Overhaul, Dropdowns & Audio Harmony)**:
  1. *Procedural Menu Soundtrack & Preview Crossfading*: Added dedicated procedural synthwave audio generator for the title menu with automatic pause on track preview, resume on preview finish, and independent mute toggle.
  2. *Starfield Twinkle Background*: Added subtle 1px twinkling white stars in the background behind the visualizer without overlapping the equalizers.
  3. *Section Cleanup & Streamlined Buttons*: Removed numeric section indicators in the menu; renamed the primary action button to a clean "INICIAR"; removed the redundant "Alterar" label/icon on the track selector to maximize space for artist, BPM, and track length.
  4. *Inline Scrollable Dropdowns*: Converted track selection, difficulty levels, game options (Flight Assist, Drift Compensation), and Flight Manual / Rules into inline scrollable dropdowns to adapt to smaller viewports and mobile screens.
  5. *Header & Overlay Relocation*: Reorganized Fullscreen and Menu Mute controls away from the game title, preventing overlap across all screen dimensions.
- **v1.11.0 (Dynamic Mobile Detection & Adaptive Play Area Zoom)**:
  1. *Dynamic Mobile Viewport Detection*: Dynamically identifies smartphone and small-screen devices across touch points, user-agent indicators, and aspect ratios (`isPortrait` vs `isLandscapeMobile`), reacting immediately to window resize and screen orientation flips (`resize` + `orientationchange` with delayed reflow passes).
  2. *Adaptive Camera Zoom on Play Area*:
     - **Mobile Portrait** ($w < h$, e.g. 390×844): Dynamically zooms out (`targetZoom` ~0.55–0.82) to guarantee a full ~640px of visible world runway ahead. Anchors the ship at 18% of screen width, leaving over 80% as reaction runway for upcoming bends and hazards.
     - **Mobile Landscape** ($h < 560$px, e.g. 844×390): Automatically calculates zoom based on the active corridor and outer bedrock equalizer ribbons (`targetZoom = h / desiredPlayHeight` ~0.60–0.88), ensuring ceiling, floor, and bedrock waves fit comfortably between HUD clusters without clipping.
     - **Desktop** ($w \ge 900, h \ge 600$): Preserves native crisp 1:1 scale and 28% ship offset.
  3. *Corridor-Centric Vertical Camera Tracking*: Smoothly leads the corridor center (70%) and ship position (30%), naturally anticipating roller-coaster climbs and dips so terrain boundaries never clip off-screen.
  4. *Responsive HUD Footprint*: Reduced countdown typography on mobile (`text-3xl sm:text-5xl md:text-6xl`) and container padding (`p-2 sm:p-3 md:p-6`), maximizing the visible play area.
- **v1.10.0 (Sonic Pulse Power-up, Clean HUD & Refined Beams)**:
  1. *Sonic Pulse Power-up (PULSE, cyan)*: New one-shot power-up — on pickup an **expanding shockwave ring** erupts around the ship (small, local — not full-screen): double cyan rings + core flare in the game world, a sub-bass thump + sonar-chirp sfx, and a brief "PULSO SÓNICO!" HUD notification. **Practical effect**: the wavefront **disarms every laser energy beam it crosses** (beam stays dark for 5.5s recharge then re-arms) and **permanently disables resonance mines** inside the envelope. Gives real strategic counter-play against tunnel-beam gauntlets.
  2. *Beam Polish (bright but rarer)*: Laser energy beams are ~2x brighter (aura/body/spine/granulation alphas raised) while spawn density and firing threshold are now **difficulty-scaled**: Principiante 0.55× density + treble gate 0.42 (clearly rarer), Pro 1.0×/0.28, Extreme 1.2×/0.24.
  3. *Simplified Bottom HUD*: Removed the "Folga Canal" clearance gauge, the phase-shield count badge and all motor captions. The footer is now a single compact cluster: **velocity + dual thruster pressure bars** (letters "L"/"R" only). Active power-up info lives in the visuals themselves and in the notification stack below the countdown (now including PULSO SÓNICO).
  4. *Removed Full-Screen Radial 'Neon Pulse' Effect*: The viewport-center radial flare + center-outward propagating arc waves (and their corridor mask) are gone. The retro **Hi-Fi equalizer bedrock stays untouched**. The removed aesthetic now lives only in the local Sonic Pulse shockwave.
- **v1.9.0 (Tension Countdown, Traveling Energy Beams & Flight Options)**:
  1. *Countdown Tension Phases*: The big remaining-time display now changes color with the clock: cyan by default, **amber at ≤45s** and **red with `animate-pulse` at ≤25s**. In the red phase a procedural **tic-toc** (`AudioEngine.playCountdownTick()` — alternating 1320/920Hz square blips driven once per second from the game loop) raises tension until the song ends.
  2. *Laser Energy Beams (replaces full-tunnel laser curtains)*: Lasers no longer block the whole tunnel top-to-bottom (which could make passages impossible). Each gate is now a **small concentrated semi-oval plasma beam** (base half-height ≈ 14% of corridor, clamped 26-60px) rendered as **layered soft blobs** with stacked sine harmonics — no crisp outlines, ill-defined drifting granulation pockets, `lighter` compositing — pulsing its thickness (`beamHalf`) with bass/energy. Treble gating is unchanged (beam activates only on treble/high energy). Collision is a capsule check against the beam core (`±12px` horizontally, `beamHalf` vertically) that pushes the ship away from the beam center. Result: bright tracks with long treble activity always leave a passable window above or below.
  3. *Pro Flight Assist Default*: Selecting **Pro** difficulty now resets Flight Assist to the difficulty preset default (**desligado**), but it stays toggleable in the menu/pause — previously the global `flightAssist: true` leaked through when picking Pro.
  4. *Difficulty Selector Cleanup*: Removed the technical specs shown to players — the `{n}% Def` badges under each difficulty button and the detailed description box below the selector.
  5. *Drift Compensation Option (true strategic hover)*: New option (menu + pause, **LIGADO** por defeito, always available). ON removes the forced forward cruise entirely: the ship holds its horizontal position and only advances when piloted with nose-up thrust (hover/strategy mode). OFF restores the classic auto-runner: forced auto-cruise to the right (baseline 230 px/s) plus a slight rightward drift pull (+46 px/s², capped at 135% of cruise speed).
  6. *Timeout Defeat*: When the countdown reaches zero without the ship reaching the goal portal, the mission now **ends in defeat**: continuous thrusters are silenced, a descending power-down sfx plays (`AudioEngine.playTimeUpSfx()`), and the end modal shows **TEMPO ESGOTADO** ("A faixa terminou antes de alcançares o Portal de Meta"). Victory still requires physically reaching the portal before the song ends.
- **v1.8.0 (Drop Flash — Energy Contrast Consumer)**:
  1. *Drop Hit Bloom*: `GameRenderer` now consumes `AudioFrequencyData.energyContrast` (previously produced but unused). A rising edge above `0.62` (with a 1.5s cooldown) fires a full-arena light burst: additive core + edge bloom, 10px camera-shake kick, and surging EQ ripple amplitude/glow — synced to the "drop hits" moment of the track.
  2. *Fast-decay envelope*: flash rises instantly to 1.0 and decays with a ~0.45s exponential tail, so hits feel percussive without strobing. Tuning constants: `DROP_FLASH_TRIGGER` / `DROP_FLASH_COOLDOWN_S` at the top of `GameRenderer.ts`.
- **v1.7.1 (Macro-Energy Dynamics & Multi-Band EQ Ripples)**:
  1. *Non-Linear Noise-Floor Suppression & Spectral Tilt*: `AudioEngine.getFrequencyData()` now normalizes every band through `eqCurve(val, boost)`: values below 0.02 (noise floor) map to 0, then `(v - 0.02) / 0.98` is raised to `Math.pow(v, 1.15) * 1.25`. Per-band spectral-tilt boosts compensate for natural ~3-4.5 dB/octave falloff: subBass 1.30, punch bass 1.25, lowMids 1.60, highMids 2.20, treble 2.80. Quiet breakdowns land near 0.0-0.2 while drops/climaxes push toward 0.8-1.0.
  2. *Macro Energy Envelope Tracking (`macroEnergy` & `energyContrast`)*: Long-term envelope over the summed band energy: fast rise on drops (0.75s time constant), slow release into breakdowns (2.2s). `energyContrast = clamp((currentEnergy - macroEnergy * 0.65) * 1.6, 0, 1)` measures the instantaneous burst above the macro baseline — currently **produced but not yet consumed by any subsystem** (reserved for future drop-flash effects).
  3. *All-Frequency EQ Ripples Always Rendered (no "layer awakening")*: All 5 bedrock equalizer bands draw every frame. Section dynamics come from per-band amplitude/opacity scaling only: baseline offset into rock is `baseDist` 14px (sub-bass) → 70px (treble) so bands never collapse into one line; wave amplitude breathes from 2.5px idle up to `2.5 + bandEnergy * maxAmp` (maxAmp 18-26px) with +5-8px beat boosts on bass bands; alpha scales 0.30 → 0.95 and `shadowBlur` 4 → ~36 with energy and beats.
  4. *Rhythmic Propagation Acceleration*: Monotonic `ripplePhase` advances at `0.55 + 1.9 * macroEnergy^1.3` rad/s plus impulses (`subBass * 1.8` + `beatPulse * 2.2`), i.e. calm ~0.55 rad/s drift in breakdowns up to ~4.5 rad/s at drops. Physics terrain phase follows the same principle (`terrainPhase += 1.6 * (0.65 + 1.2*macroEnergy + subBass*2.0 + beatPulse*1.4) * dt`).
- **v1.7.0 (Multi-Band Rhythmic Gravitational Ripples & Anti-Jitter Architecture)**:
  1. *Multi-Band Attack/Decay Envelope Followers*: Split real-time FFT frequency extraction into distinct physical resonant bands (band edges in `hzPerBin` bins): 
     - `subBass` (20-85Hz, 12ms attack / 200ms decay): Governs gravitational heave, terrain heave weight (`heave = subBass * 0.65 + bass * 0.35`) and bedrock shockwave thrust.
     - `bassPunch` (85-250Hz, merged as `bass = subBass * 0.40 + punch * 0.60`, 10ms attack / 160ms decay): Controls kick-drum punch, contour-line thickness and boundary breathing.
     - `lowMids` (250-900Hz, 10ms attack / 180ms decay): Governs musical harmonic wavelength and spacing of the mid band ripples.
     - `highMids` (900-4500Hz, 8ms attack / 130ms decay): Drives luminous neon glow bursts and snare/clap flashes along the high-mid band.
     - `treble` (4500-16000Hz, 6ms attack / 90ms decay): Hi-hat/cymbal shimmer band.
     - `beatPulse` (instant rise to 1.0 on beat, 180ms exponential decay): Propels band amplitudes outward on each detected beat.
  2. *Monotonic Phase Accumulators*: Replaced erratic frame-to-frame phase addition (`phase = time + energy * 4.2`) with persistent monotonic phase integration in both `PhysicsWorld` (`terrainPhase`) and `GameRenderer` (`ripplePhase`). Completely eliminates 60 FPS spatial phase tearing and erratic visual vibrations.
  3. *Equalizer Bedrock Waves*: The 5 outer bedrock ripple layers became a vintage Hi-Fi graphic equalizer: each band carries its own ceiling + floor neon color, spatial frequency (0.0032 → 0.028 rad/px), speed multiplier (0.85 → 1.85) and phase offset, keeping the central playable corridor 100% clean and unobstructed.
- **v1.6.0 (Terrain Variation Overhaul)**:
  1. *Per-Track Terrain Personality*: Each track derives a stable multi-axis "personality" from its music seed (hill/chicane amplitude multipliers ~0.7x-1.9x, bend-frequency sharpness ~0.8x-1.45x, wobble 16-46px, an extra mid-band harmonic 14-50px, and breathing-depth factor ~0.45-1.6). Different songs now produce clearly distinct roller-coasters — measured typical bend peaks range from ~210px (floating cruisers) to ~310px (hard, twisting tracks).
  2. *Guaranteed Fair Corridor Clamp*: The corridor center is clamped so `macroCenter ± half-width` always stays inside the world bounds (40px edge margin) — hard bends can no longer squash the tunnel against the world edge.
  3. *Seed-Varied Entity Layouts*: Obstacles, lasers, and power-ups carry seed-stable positional jitter per track, layered with a small per-run `Math.random()` shift so every playthrough places hazards and pickups differently.
- **v1.5.0 (Security Hardening)**:
  1. *Remoção de Upload de Ficheiros MP3/WAV*: Eliminada a funcionalidade de upload arbitrário de ficheiros de áudio locais. Mitiga riscos de vulnerabilidades de parsing binário em decodificadores multimédia do browser (`decodeAudioData`), vetores de ficheiros poliglota e DoS por descompressão desproporcional de memória (audio decompression bombs).
  2. *Limpeza Arquitetural*: Remoção de estados e manipuladores órfãos em `TitleMenu.tsx`, `App.tsx` e `AudioEngine.ts`. Mantida a biblioteca de faixas verificadas e seguras (incluindo *Kosmonova - Ayla* e temas procedurais calibrados).
- **v1.4.0**:
  1. *Wall Contour Lines*: Moved from inside the corridor to strictly **outside** into bedrock (`y < ceilY` and `y > floorY`). Implemented stone-in-pond gravitational ripple expansion synchronized with music beats.
  2. *Neon Pulse Optimization*: Applied central flight corridor mask (`destination-out`) to prevent arc clutter in the player's path while retaining screen-edge stadium energy.
  3. *Zero-Tunneling Bugfix*: Implemented hard positional boundary clamping (`minSafeY`, `maxSafeY`) during physics steps and shield invulnerability bounces to prevent clipping through walls.
  4. *Safe Spawn & Anti-G Launch*: Added flat centered runway for `x <= 800` to eliminate wall spawns. Added 2.8s anti-gravity stabilizer hover window.
  5. *UI Enhancements*: Removed redundant badge above the game title in `TitleMenu`. Added Fullscreen toggle to both Title Menu and Game HUD.
