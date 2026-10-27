/**
 * Sonic Thrust - Synthwave Audio Landscape Visualizer
 * Replicates the 3D neon wireframe grid, equalizer mountain, rainbow oscilloscope ribbons,
 * and dense dynamic starfield with diffraction spikes, fully reactive to live audio.
 */

import React, { useEffect, useRef } from 'react';
import { audio } from '../audio/AudioEngine';

interface SynthwaveVisualizerProps {
  className?: string;
}

interface Star {
  x: number; // 0..1
  y: number; // 0..1
  baseAlpha: number;
  twinkleSpeed: number;
  phase: number;
}

export const SynthwaveVisualizer: React.FC<SynthwaveVisualizerProps> = ({
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;
    let lastTime = performance.now();
    let ripplePhase = 0; // Monotonic rhythm-synced phase accumulator matching GameRenderer.ts
    let currentPhaseSpeed = 0.75; // Low-pass filtered phase velocity for smooth gliding momentum
    // Adaptive normalization states for the 6 equalizer wave bands (persists across frames)
    const eqAvg = [0.12, 0.12, 0.10, 0.08, 0.06, 0.05];
    const eqPeak = [0.50, 0.50, 0.40, 0.35, 0.30, 0.25];
    // Damped amplitude buffer for each band to completely eliminate jitter and trembling in the menu
    const lerpedWaveAmps = new Float32Array(6).fill(3.0);

    // Number of bars in the equalizer mountain
    const numBars = 46;
    const lerpedHeights = new Float32Array(numBars).fill(0.15);

    // Generate 65 discreet 1-pixel white stars in upper sky background
    const stars: Star[] = [];
    const numStars = 65;
    let seed = 42;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: rnd(),
        // Upper/mid sky area so stars sit quietly in background behind mountain and grid
        y: rnd() * 0.70,
        baseAlpha: 0.2 + rnd() * 0.35,
        twinkleSpeed: 1.0 + rnd() * 2.0,
        phase: rnd() * Math.PI * 2
      });
    }

    // Handle high-DPI scaling
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    // Base height envelope mimicking the mountain silhouette from the mock-up
    const mountainEnvelope = (i: number, total: number) => {
      const x = i / total;
      let env = 0;
      if (x < 0.2) {
        env = 0.25 + 0.35 * (x / 0.2);
      } else if (x < 0.65) {
        env = 0.6 + 0.4 * Math.sin(((x - 0.2) / 0.45) * Math.PI * 0.5);
      } else if (x < 0.8) {
        env = 0.95 + 0.15 * Math.sin(((x - 0.65) / 0.15) * Math.PI);
      } else {
        env = 0.9 * Math.cos(((x - 0.8) / 0.2) * Math.PI * 0.5);
      }
      return Math.max(0.12, env);
    };

    const render = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const freqData = audio.getFrequencyData(0.22, dt);
      const isAnyPlaying = audio.isAnyMusicPlaying();

      // Motion speed modulated by music energy
      const speedMultiplier = isAnyPlaying ? 1 + freqData.energy * 0.8 : 0.6;
      time += dt * speedMultiplier;

      // Lively, organic phase speed for menu waves (clear forward momentum without stutter)
      const macroE = freqData.macroEnergy ?? freqData.energy;
      const targetPhaseSpeed = isAnyPlaying
        ? (1.35 + 1.5 * Math.pow(macroE, 1.2) + (freqData.subBass || 0) * 0.9 + (freqData.beatPulse || 0) * 1.0)
        : 0.95;
      currentPhaseSpeed += (targetPhaseSpeed - currentPhaseSpeed) * 0.18;
      ripplePhase += currentPhaseSpeed * dt;

      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      ctx.clearRect(0, 0, w, h);

      // 1. Draw Starfield in background: discreet 1-pixel white stars with varying intensity
      ctx.save();
      ctx.shadowBlur = 0; // Pure crisp 1px stars without blurry halo

      for (let s = 0; s < stars.length; s++) {
        const star = stars[s];
        const sx = star.x * w;
        const sy = star.y * h;

        // Smooth varying white intensity
        const twinkle = Math.sin(time * star.twinkleSpeed + star.phase);
        const alpha = Math.min(0.85, Math.max(0.12, star.baseAlpha + twinkle * 0.35));

        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        // Exactly 1 pixel:
        ctx.fillRect(Math.floor(sx), Math.floor(sy), 1, 1);
      }
      ctx.restore();

      // 2. Draw 3D Perspective Synthwave Grid at Bottom (Renders ON TOP of background stars)

      ctx.save();
      const horizonY = h * 0.55;
      const vpX = w * 0.82; // Vanishing point skewed towards right as in reference mock-up
      const vpY = horizonY;

      // Perspective grid gradient stroke
      ctx.lineWidth = 1.2;
      const gridBeatBoost = isAnyPlaying ? freqData.subBass * 0.3 : 0;
      ctx.strokeStyle = `rgba(217, 70, 239, ${0.4 + gridBeatBoost})`;
      ctx.shadowColor = 'rgba(236, 72, 153, 0.6)';
      ctx.shadowBlur = 6 + gridBeatBoost * 8;

      // Longitudinal lines converging to vanishing point
      const numLongLines = 14;
      for (let i = -4; i <= numLongLines; i++) {
        const bottomX = (i / (numLongLines - 2)) * w * 1.4 - w * 0.2;
        ctx.beginPath();
        ctx.moveTo(vpX, vpY);
        ctx.lineTo(bottomX, h + 20);
        ctx.stroke();
      }

      // Transverse (horizontal) grid lines moving towards screen
      const numTransLines = 10;
      const gridOffset = (time * 0.45) % 1;
      for (let j = 0; j < numTransLines; j++) {
        const progress = Math.pow((j + gridOffset) / numTransLines, 2.2);
        const y = horizonY + progress * (h - horizonY + 20);
        if (y > horizonY && y <= h) {
          const alpha = Math.min(1, progress * 1.4) * (0.5 + gridBeatBoost * 0.3);
          ctx.strokeStyle = `rgba(217, 70, 239, ${alpha})`;
          ctx.shadowBlur = 4 * alpha;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
      }
      ctx.restore();

      // 3. Draw 3D Equalizer Spectrum Mountain (Driven by Live FFT)
      ctx.save();
      const mountainStartX = w * 0.05;
      const mountainEndX = w * 0.98;
      const mountainWidth = mountainEndX - mountainStartX;
      const barSpacing = mountainWidth / numBars;
      const barWidth = Math.max(3, barSpacing * 0.68);

      for (let i = 0; i < numBars; i++) {
        const norm = i / (numBars - 1);
        const bx = mountainStartX + i * barSpacing;
        
        // Base y follows perspective slope
        const baseY = horizonY + 25 + norm * 45 + Math.sin(norm * Math.PI) * 15;
        const baseEnv = mountainEnvelope(i, numBars);

        // Sample real audio FFT bins for this bar
        let audioEnergy = 0;
        if (isAnyPlaying && freqData.frequencyArray) {
          const binIndex = Math.min(
            freqData.frequencyArray.length - 1,
            Math.max(1, Math.floor(Math.pow(norm, 1.4) * 220))
          );
          audioEnergy = (freqData.frequencyArray[binIndex] || 0) / 255;
        }

        // Live breathing oscillation
        const idlePulse = Math.sin(time * 3 + i * 0.4) * 0.06 + Math.cos(time * 4.5 + i * 0.7) * 0.04;
        
        const targetH = isAnyPlaying
          ? (baseEnv * 0.3 + audioEnergy * 0.75 + freqData.energy * 0.15)
          : (baseEnv + idlePulse);

        // Smooth physical response
        const attack = targetH > lerpedHeights[i] ? 0.35 : 0.18;
        lerpedHeights[i] += (targetH - lerpedHeights[i]) * attack;

        const totalHeight = Math.max(0.08, lerpedHeights[i]) * (h * 0.54);
        const barTopY = baseY - totalHeight;

        // Color transition: Cyan (left) to Magenta/Fuchsia (right)
        const cyanToMagenta = Math.min(1, Math.max(0, (norm - 0.15) / 0.7));
        
        const r = Math.round(6 + cyanToMagenta * (236 - 6));
        const g = Math.round(182 + cyanToMagenta * (72 - 182));
        const b = Math.round(212 + cyanToMagenta * (153 - 212));
        
        const grad = ctx.createLinearGradient(bx, barTopY, bx, baseY);
        grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.95)`);
        grad.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, 0.65)`);
        grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.15)`);

        ctx.fillStyle = grad;
        ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${0.65 + (isAnyPlaying ? audioEnergy * 0.35 : 0)})`;
        ctx.shadowBlur = 8 + (isAnyPlaying ? audioEnergy * 8 : 0);

        // Rounded bar cap
        const radius = barWidth * 0.5;
        ctx.beginPath();
        ctx.moveTo(bx + radius, barTopY);
        ctx.lineTo(bx + barWidth - radius, barTopY);
        ctx.quadraticCurveTo(bx + barWidth, barTopY, bx + barWidth, barTopY + radius);
        ctx.lineTo(bx + barWidth, baseY);
        ctx.lineTo(bx, baseY);
        ctx.lineTo(bx, barTopY + radius);
        ctx.quadraticCurveTo(bx, barTopY, bx + radius, barTopY);
        ctx.closePath();
        ctx.fill();

        // Bright tip glow
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 10;
        ctx.fillRect(bx + 1, barTopY, barWidth - 2, 2.5);
      }
      ctx.restore();

      // 4. In-Game Equalizer Waves (Balanced Sweet Spot for Main Menu Ambience)
      // Visibly alive, flowing, and bouncing to beats and bass drops, while filtered against jitter:
      // - Band 0: Sub-Bass (20 - 85 Hz): Deep rolling ocean swell, heaves with kicks and drops
      // - Band 1: Punch Bass (85 - 250 Hz): Bounces forcefully with kick drums and basslines
      // - Band 2: Low-Mids (250 - 900 Hz): Musical harmonic wave driven by synthesizer chords
      // - Band 3: High-Mids (900 - 4500 Hz): Luminous crests reacting to snares and vocals
      // - Band 4: Treble (4500 - 16000 Hz): Shimmering ribbon undulating with hi-hats and cymbals
      // - Band 5: Presence (Ultra Highs): Upper atmosphere sparkle
      // Strictly preserves the existing menu visualizer layout, dimensions, framing, and bounds!
      const eqWaveBands = [
        {
          name: 'SUB_BASS',
          color: '#00f0ff',
          shadow: 'rgba(0, 240, 255, 0.85)',
          spatialFreq: 0.0032,
          speedMult: 0.90,
          yOffset: 30,
          baseAmp: 4.5,
          maxAmp: 24,
          phaseOffset: 0,
          binStart: 1,
          binEnd: 8
        },
        {
          name: 'PUNCH_BASS',
          color: '#38bdf8',
          shadow: 'rgba(56, 189, 248, 0.85)',
          spatialFreq: 0.0055,
          speedMult: 1.10,
          yOffset: 48,
          baseAmp: 4.0,
          maxAmp: 22,
          phaseOffset: 0.80,
          binStart: 8,
          binEnd: 20
        },
        {
          name: 'LOW_MIDS',
          color: '#f97316',
          shadow: 'rgba(249, 115, 22, 0.85)',
          spatialFreq: 0.0080,
          speedMult: 1.25,
          yOffset: 65,
          baseAmp: 3.8,
          maxAmp: 20,
          phaseOffset: 1.60,
          binStart: 20,
          binEnd: 45
        },
        {
          name: 'HIGH_MIDS',
          color: '#10b981',
          shadow: 'rgba(16, 185, 129, 0.85)',
          spatialFreq: 0.0115,
          speedMult: 1.45,
          yOffset: 80,
          baseAmp: 3.5,
          maxAmp: 18,
          phaseOffset: 2.40,
          binStart: 45,
          binEnd: 90
        },
        {
          name: 'TREBLE',
          color: '#f43f5e',
          shadow: 'rgba(244, 63, 94, 0.85)',
          spatialFreq: 0.0150,
          speedMult: 1.65,
          yOffset: 95,
          baseAmp: 3.2,
          maxAmp: 17,
          phaseOffset: 3.20,
          binStart: 90,
          binEnd: 160
        },
        {
          name: 'PRESENCE',
          color: '#d946ef',
          shadow: 'rgba(217, 70, 239, 0.85)',
          spatialFreq: 0.0100,
          speedMult: 1.35,
          yOffset: 110,
          baseAmp: 3.0,
          maxAmp: 18,
          phaseOffset: 4.50,
          binStart: 160,
          binEnd: 240
        }
      ];

      const beatPulseVal = freqData.beatPulse || (freqData.isBeat ? 1.0 : 0.0);
      const fa = freqData.frequencyArray;

      const startX = w * 0.05;
      const endX = w * 0.98;
      const steps = 90;
      const dx = (endX - startX) / steps;

      for (let b = 0; b < eqWaveBands.length; b++) {
        const band = eqWaveBands[b];

        // 1) Raw bin average for this band's frequency range
        let raw = 0;
        if (isAnyPlaying && fa && fa.length > 0) {
          const count = Math.max(1, band.binEnd - band.binStart);
          for (let i = band.binStart; i < band.binEnd && i < fa.length; i++) {
            raw += (fa[i] || 0) / 255;
          }
          raw /= count;
        }

        // 2) Adaptive normalization with responsive baseline tracking
        const avgAlpha = 1.0 - Math.exp(-dt / 2.2);
        eqAvg[b] += (raw - eqAvg[b]) * avgAlpha;
        eqPeak[b] = Math.max(raw, eqPeak[b] * Math.exp(-dt / 1.6));
        const span = Math.max(0.08, eqPeak[b] - eqAvg[b]);
        const bandE = isAnyPlaying ? Math.min(1.0, Math.max(0.0, (raw - eqAvg[b]) / span)) : 0;

        // 3) Responsive amplitude with fast-attack, silky-decay filtering (sweet spot: lively & smooth)
        const beatBoost = (b <= 1 ? beatPulseVal * 7.5 : beatPulseVal * 4.5);
        const idleBreathing = Math.sin(time * 2.6 + b * 0.9) * 2.4 + Math.cos(time * 1.6 + b * 1.3) * 1.4;
        const targetAmp = isAnyPlaying
          ? (band.baseAmp + bandE * band.maxAmp + beatBoost)
          : (band.baseAmp + idleBreathing);

        // Fast attack (0.30) to feel every beat instantaneously, smooth release (0.15) to kill jitter
        const attackFactor = targetAmp > lerpedWaveAmps[b] ? 0.30 : 0.15;
        lerpedWaveAmps[b] += (targetAmp - lerpedWaveAmps[b]) * attackFactor;
        const amp = lerpedWaveAmps[b];

        // 4) Dynamic glow, thickness, and opacity reflecting energy
        const ampRatio = Math.min(1.0, Math.max(0, (amp - band.baseAmp) / band.maxAmp));
        const alpha = isAnyPlaying ? Math.max(0.40, Math.min(0.98, 0.45 + ampRatio * 0.50)) : 0.48;
        const lineWidth = 1.6 + ampRatio * 2.0;
        const shadowBlur = 6 + ampRatio * 18;

        const wavePhase = ripplePhase * band.speedMult + band.phaseOffset;

        // Sample points across the menu layout width
        const pts: { x: number; y: number }[] = [];
        for (let s = 0; s <= steps; s++) {
          const px = startX + s * dx;
          const progress = s / steps;
          // Exact menu perspective baseline trajectory
          const baseWaveY = horizonY + band.yOffset + progress * 60 + Math.sin(progress * Math.PI) * 20;

          // Harmonic dual synthesis: prominent fundamental + rich overtone
          const s1 = Math.sin(px * band.spatialFreq - wavePhase);
          const s2 = Math.cos(px * (band.spatialFreq * 0.48) - wavePhase * 0.58) * 0.35;
          const displacement = (s1 + s2) * amp;

          // Smooth edge tapering so waves integrate seamlessly into menu layout
          const edgeTaper = Math.sin(Math.pow(progress, 0.85) * Math.PI);
          const py = baseWaveY + displacement * edgeTaper;
          pts.push({ x: px, y: py });
        }

        // Draw with smooth quadratic Bézier spline curves
        ctx.save();
        ctx.strokeStyle = band.color;
        ctx.globalAlpha = alpha;
        ctx.shadowColor = band.shadow;
        ctx.shadowBlur = shadowBlur;
        ctx.lineWidth = lineWidth;

        ctx.beginPath();
        if (pts.length > 0) {
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let s = 1; s < pts.length; s++) {
            const prev = pts[s - 1];
            const curr = pts[s];
            const midX = (prev.x + curr.x) / 2;
            const midY = (prev.y + curr.y) / 2;
            ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
          }
          ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
        }
        ctx.stroke();
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full block pointer-events-none ${className}`}
    />
  );
};
