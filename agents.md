# Sonic Thrust - Agent Architecture & Maintenance Guide

## 1. Project Overview
**Sonic Thrust** is a 2D neon vector audio-navigation game built with React, Vite, Canvas 2D, Matter.js physics principles, and the Web Audio API. The player pilots a dual-thruster spacecraft through music-generated roller-coaster tunnels whose boundaries, obstacles, and visual effects react dynamically in real-time to music FFT frequencies (sub-bass, bass, mids, treble).

---

## 2. Architecture & Core Systems

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
