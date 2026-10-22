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
