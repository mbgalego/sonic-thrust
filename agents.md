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
  - **Obstacles**: Pneumatic Ejector Blocks with hazard chevrons, crystalline Sonic Spikes bursting to bass drops, floating Resonance Mines, and spinning hazard blades.

### C. Audio Engine (`/src/audio/AudioEngine.ts`)
- Web Audio API pipeline with master, music, and sfx routing.
- Real-time 1024-bin FFT analyser with smoothed bass, mids, treble, and beat detection.
- Proximity radar clicks with frequency scaling as the craft nears terrain.
- Instantaneous one-click track preview switching in the Title Menu.
- Smooth volume fadeout (`fadeOutAndStopTrack`) and continuous node silence on crash or menu exit.

### D. User Interface Components (`/src/components/`)
- **TitleMenu (`/src/components/TitleMenu.tsx`)**:
  - Clean title lockup with `SONIC THRUST` neon glow.
  - Fullscreen toggle button with `Maximize` / `Minimize` icons and native `fullscreenchange` listener.
  - Curated track selector with instant 1-click preview, BPM estimation, and clean track count indicator (arbitrary client file upload removed for security hardening).
  - Difficulty presets (`Principiante`, `Pro`, `Extreme`).
- **GameHUD (`/src/components/GameHUD.tsx`)**:
  - Non-occluding top bar with progress bar, track title, timer, and Pause + Fullscreen controls.
  - Anti-G launch stabilizer status banner during the first 2.8 seconds.
  - Speed readout formatted with `whitespace-nowrap` to prevent line wrapping.
  - Dual-thruster pressure gauges and altitude clearance indicators.

---

## 3. Changelog & Recent Fixes
- **v1.7.1 (Macro-Energy Dynamics & Dynamic Contrast Overhaul)**:
  1. *Dynamic Range Expansion & Noise-Floor Suppression*: Implemented non-linear musical noise-floor subtraction and power-law contrast curves (`Math.pow((val - floor) / (1 - floor), 1.65)`) in `AudioEngine.getFrequencyData()`. Replaces flat linear FFT values with true musical contrast: quiet breakdowns and ambient interludes drop to near-zero (~0.01-0.03) while bass drops and climaxes surge to 0.85-1.00.
  2. *Macro Energy Envelope Tracking (`macroEnergy` & `energyContrast`)*: Introduced long-term moving envelope tracking (~1.6-2.0s) with fast rise on drops (0.75s) and slow release into breakdowns (2.2s). Distinguishes song sections (breakdown vs verse vs buildup vs peak drop).
  3. *Dynamic Layer Awakening in Gravitational Ripples*: Outer bedrock ripples now wake up dynamically based on musical energy (`combinedDrive - layerThreshold`). During quiet breakdowns (e.g. Kosmonova - Ayla synth intro/breakdown), outer layers 1-4 sleep peacefully in the dark rock while layer 0 forms a serene, thin, calm glass contour. During buildups and drops, layers 1-4 awaken and illuminate the rock face.
  4. *Energy-Responsive Shockwave Expansion & Tidal Crests*: Outward bedrock thrust scales from a tight 8px baseline in breakdowns to 70-95px in drops (`shockwaveExpansion`). Wave crest amplitude scales from 1-2px in quiet passages to 28-38px in drops.
  5. *Rhythmic Propagation Acceleration*: Monotonic `ripplePhase` and terrain breathing dynamically slow to a gentle subterranean drift (~0.55 rad/s) in quiet sections, accelerating up to 4.2 rad/s during bass surges and beat impulses.
- **v1.7.0 (Multi-Band Rhythmic Gravitational Ripples & Anti-Jitter Architecture)**:
  1. *Multi-Band Attack/Decay Envelope Followers*: Split real-time FFT frequency extraction into distinct physical resonant bands:
     - `subBass` (20-85Hz, 15ms attack / 240ms decay): Governs gravitational heave and deep bedrock outward shockwave expansion.
     - `bass` (85-250Hz, 12ms attack / 180ms decay): Controls kick drum punch, contour line thickness, and boundary breathing.
     - `lowMids` (250-800Hz, 18ms attack / 200ms decay): Governs musical harmonic wavelength and spacing along the flight path, replacing chaotic high-frequency jitter with majestic undulating curves.
     - `highMids` (800-4000Hz, 10ms attack / 140ms decay): Drives luminous neon glow bursts and snare/clap flashes along ripple wavefronts.
     - `beatPulse` (instant rise, 180ms exponential decay): Sequentially propels concentric ripples outward across layers on each beat.
  2. *Monotonic Phase Accumulators*: Replaced erratic frame-to-frame phase addition (`phase = time + energy * 4.2`) with persistent monotonic phase integration in both `PhysicsWorld` (`terrainPhase`) and `GameRenderer` (`ripplePhase`). Completely eliminates 60 FPS spatial phase tearing and erratic visual vibrations.
  3. *Concentric Stone-in-Pond Shockwaves*: Gravitational ripple contour lines in outer bedrock now propagate with true physical outward wave delays (`layerDelay = layer * 0.46`), radiating outward away from the boundary surface like water ripples when a stone drops into a calm pond, while keeping the central playable corridor 100% clean and unobstructed.
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
