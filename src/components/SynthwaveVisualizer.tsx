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

      // 4. Draw Tangled Neon Oscilloscope Sine Waves (Ribbons) modulated by FFT
      const waveConfigs = [
        { color: 'rgba(6, 182, 212, 0.95)', shadow: 'rgba(6, 182, 212, 0.8)', freq: 0.012, amp: 26, speed: 2.2, phase: 0.2, yOffset: 30, band: freqData.subBass },
        { color: 'rgba(234, 179, 8, 0.95)', shadow: 'rgba(234, 179, 8, 0.8)', freq: 0.015, amp: 32, speed: 1.8, phase: 1.5, yOffset: 48, band: freqData.bass },
        { color: 'rgba(249, 115, 22, 0.95)', shadow: 'rgba(249, 115, 22, 0.8)', freq: 0.011, amp: 28, speed: 2.4, phase: 3.1, yOffset: 65, band: freqData.lowMids },
        { color: 'rgba(244, 63, 94, 0.95)', shadow: 'rgba(244, 63, 94, 0.8)', freq: 0.016, amp: 34, speed: 2.0, phase: 4.2, yOffset: 80, band: freqData.highMids },
        { color: 'rgba(217, 70, 239, 0.95)', shadow: 'rgba(217, 70, 239, 0.8)', freq: 0.013, amp: 30, speed: 2.6, phase: 5.6, yOffset: 95, band: freqData.treble },
        { color: 'rgba(16, 185, 129, 0.9)', shadow: 'rgba(16, 185, 129, 0.7)', freq: 0.018, amp: 22, speed: 1.6, phase: 2.3, yOffset: 110, band: freqData.energy }
      ];

      ctx.save();
      waveConfigs.forEach((cfg) => {
        const audioAmpMod = isAnyPlaying ? 1 + cfg.band * 1.2 : 1;
        ctx.lineWidth = isAnyPlaying && cfg.band > 0.5 ? 2.8 : 2.0;
        ctx.strokeStyle = cfg.color;
        ctx.shadowColor = cfg.shadow;
        ctx.shadowBlur = 8 + (isAnyPlaying ? cfg.band * 14 : 0);
        ctx.beginPath();

        const startX = w * 0.05;
        const endX = w * 0.98;
        const steps = 70;
        const dx = (endX - startX) / steps;

        for (let s = 0; s <= steps; s++) {
          const px = startX + s * dx;
          const progress = s / steps;
          const baseWaveY = horizonY + cfg.yOffset + progress * 60 + Math.sin(progress * Math.PI) * 20;
          const sineY = Math.sin(px * cfg.freq + time * cfg.speed + cfg.phase) * (cfg.amp * audioAmpMod) * Math.sin(progress * Math.PI);
          const py = baseWaveY + sineY;

          if (s === 0) {
            ctx.moveTo(px, py);
          } else {
            ctx.lineTo(px, py);
          }
        }
        ctx.stroke();
      });
      ctx.restore();

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
