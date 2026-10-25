/**
 * Sonic Thrust - Mini Live Equalizer Canvas
 * 60FPS Reactive Audio Spectrum Bars for Track Card.
 * Only bounces and reacts when a track preview is actively playing.
 * Sits quietly in a dimmed resting state during menu music playback.
 */

import React, { useEffect, useRef } from 'react';
import { audio } from '../audio/AudioEngine';

interface MiniEqualizerProps {
  className?: string;
  barCount?: number;
  active?: boolean;
}

export const MiniEqualizer: React.FC<MiniEqualizerProps> = ({
  className = '',
  barCount = 25,
  active = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeRef = useRef(active);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now();

    // Resting baseline heights matching reference mock-up
    const baselineHeights = [
      3, 4, 3, 5, 7, 6, 8, 12, 16, 20, 24, 22, 19, 14, 11, 15, 18, 22, 17, 13, 9, 7, 5, 4, 3
    ];

    // Lerped heights buffer for smooth physical ballistics
    const currentHeights = new Float32Array(barCount).fill(3);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    const render = (time: number) => {
      const dt = Math.min(0.05, (time - lastTime) / 1000);
      lastTime = time;

      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      ctx.clearRect(0, 0, w, h);

      // Only animate actively when explicitly enabled AND a track (preview) is playing.
      // Ignores menu background music so players are not misled into thinking the track is playing.
      const isReactive = activeRef.current && audio.isTrackPlaying();
      const freqData = isReactive ? audio.getFrequencyData(0.25, dt) : null;

      const totalGap = 2; // px between bars
      const barWidth = Math.max(2, (w - (barCount - 1) * totalGap) / barCount);

      for (let i = 0; i < barCount; i++) {
        const norm = i / (barCount - 1);
        const baseline = baselineHeights[i % baselineHeights.length] || 4;

        let targetH = baseline;
        if (isReactive && freqData?.frequencyArray) {
          // Logarithmic bin distribution favoring bass and low-mids
          const binIndex = Math.min(
            freqData.frequencyArray.length - 1,
            Math.max(1, Math.floor(Math.pow(norm, 1.35) * 160))
          );
          const rawEnergy = (freqData.frequencyArray[binIndex] || 0) / 255;
          // Scale to canvas height
          targetH = Math.max(2.5, rawEnergy * (h - 2) + baseline * 0.15);
        } else {
          // Quiet resting standby state
          targetH = Math.max(2, baseline * 0.4);
        }

        // Fast attack, smooth decay
        const attackFactor = targetH > currentHeights[i] ? 0.35 : 0.15;
        currentHeights[i] += (targetH - currentHeights[i]) * attackFactor;

        const bx = i * (barWidth + totalGap);
        const by = h - currentHeights[i];

        // Cyan on left (norm < 0.55) transitioning to Magenta on right
        const color = isReactive
          ? (norm < 0.55 ? '#00f0ff' : '#ec4899')
          : (norm < 0.55 ? 'rgba(0, 240, 255, 0.32)' : 'rgba(236, 72, 153, 0.32)');
        const shadowColor = norm < 0.55 ? 'rgba(0, 240, 255, 0.7)' : 'rgba(236, 72, 153, 0.7)';

        ctx.fillStyle = color;
        ctx.shadowColor = shadowColor;
        ctx.shadowBlur = isReactive ? 4 : 0;

        // Rounded top bar
        const radius = Math.min(barWidth / 2, 1.5);
        ctx.beginPath();
        ctx.moveTo(bx + radius, by);
        ctx.lineTo(bx + barWidth - radius, by);
        ctx.quadraticCurveTo(bx + barWidth, by, bx + barWidth, by + radius);
        ctx.lineTo(bx + barWidth, h);
        ctx.lineTo(bx, h);
        ctx.lineTo(bx, by + radius);
        ctx.quadraticCurveTo(bx, by, bx + radius, by);
        ctx.closePath();
        ctx.fill();

        // Tip highlight
        ctx.fillStyle = isReactive ? '#ffffff' : 'rgba(255, 255, 255, 0.25)';
        ctx.shadowBlur = isReactive ? 2 : 0;
        ctx.fillRect(bx, by, barWidth, 1);
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animId);
    };
  }, [barCount]);

  return (
    <canvas
      ref={canvasRef}
      className={`block w-full h-6 pointer-events-none ${className}`}
    />
  );
};
