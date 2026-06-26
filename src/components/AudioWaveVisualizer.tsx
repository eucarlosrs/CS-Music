import React, { useRef, useEffect } from 'react';

interface AudioWaveVisualizerProps {
  isPlaying: boolean;
}

interface VisualizerParticle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  alpha: number;
  color: string;
}

export const AudioWaveVisualizer: React.FC<AudioWaveVisualizerProps> = ({ isPlaying }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    
    // Configs for our 3D-feeling spectrum equalizer
    const numBars = 42;
    const barHeights = new Float32Array(numBars);
    const peakHeights = new Float32Array(numBars);
    const peakDecaySpeed = 0.65; // speed at which peak indicators fall
    let particles: VisualizerParticle[] = [];

    const handleResize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth * window.devicePixelRatio;
        canvas.height = parent.clientHeight * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const render = () => {
      const width = canvas.width / window.devicePixelRatio;
      const height = canvas.height / window.devicePixelRatio;

      // Clear with very slight dark tail for motion-blur magic
      ctx.clearRect(0, 0, width, height);

      const isMobile = width < 768;
      
      // Calculate layout properties
      const barSpacing = isMobile ? 3 : 5;
      const totalSpacingWidth = barSpacing * (numBars - 1);
      const remainingWidth = width * 1; // expand spectrum horizontally
      const barWidth = Math.max(3, Math.min(10, (width - totalSpacingWidth) / numBars));
      const startX = (width - (numBars * barWidth + totalSpacingWidth)) / 2;
      
      // The baseline height where our equalizer sits (exactly flush with the bottom bound)
      const baselineY = height;
      const maxEqualizerHeight = isMobile ? 55 : 95;

      // Time variables
      const timeSecs = Date.now() / 1000;
      const bpm = 125;
      const bps = bpm / 60;
      const beatCycle = timeSecs * bps * Math.PI * 2;
      
      // Primary kicked rhythm scale
      const rawBeat = Math.sin(beatCycle);
      const kickPeak = Math.max(0, rawBeat);
      const beatScale = isPlaying ? Math.pow(kickPeak, 3) * 0.9 + 0.1 : 0;

      // Generate particles on beats
      if (isPlaying && kickPeak > 0.85 && Math.random() < 0.2) {
        const pCount = isMobile ? 2 : 4;
        for (let j = 0; j < pCount; j++) {
          const randomBarIdx = Math.floor(Math.random() * numBars);
          const px = startX + randomBarIdx * (barWidth + barSpacing) + barWidth / 2;
          particles.push({
            x: px,
            y: baselineY - 10,
            size: Math.random() * 3 + 1,
            speedY: -(Math.random() * 1.5 + 0.8),
            alpha: 1,
            color: Math.random() > 0.5 ? '#00E5FF' : '#EC4899',
          });
        }
      }

      // 1. Draw glowing ambient light under active frequency rows
      if (isPlaying) {
        ctx.save();
        const pulseAmbient = 60 + Math.sin(timeSecs * 2.5) * 30;
        const radialGlow = ctx.createRadialGradient(width / 2, baselineY - 20, 10, width / 2, baselineY - 20, width / 2);
        radialGlow.addColorStop(0, 'rgba(0, 229, 255, 0.08)');
        radialGlow.addColorStop(0.5, 'rgba(236, 72, 153, 0.03)');
        radialGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = radialGlow;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }

      // 2. Draw rising particles
      particles = particles.filter(p => {
        p.y += p.speedY;
        p.alpha -= 0.012;
        if (p.alpha <= 0) return false;

        ctx.save();
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return true;
      });

      // 3. Render Spectrum Equalizer Columns
      for (let i = 0; i < numBars; i++) {
        let targetHeight = 0;

        if (isPlaying) {
          // Bass frequencies (left sector: indices 0 to 11) - heavily reactive to beatScale
          if (i < 12) {
            const frequencyWeight = (12 - i) / 12;
            targetHeight = (beatScale * 0.7 + Math.sin(timeSecs * 4 + i * 0.15) * 0.2 + 0.1) * maxEqualizerHeight * (0.6 + frequencyWeight * 0.4);
          } 
          // Mid frequencies (middle sector: indices 12 to 28) - melodic flowing oscillations
          else if (i >= 12 && i < 29) {
            const flow = Math.sin(timeSecs * 3.5 + i * 0.3) * 0.3 + Math.cos(timeSecs * 1.8 - i * 0.1) * 0.2 + 0.4;
            // responsive accent when beat hits
            const dynamicHop = beatScale * 0.25; 
            targetHeight = (flow + dynamicHop) * maxEqualizerHeight * 0.65;
          } 
          // Treble/High frequencies (right sector: indices 29 to 41) - fast random tickling
          else {
            const highSpark = Math.sin(timeSecs * 9 + i * 0.9) * 0.2 + Math.random() * 0.3 + 0.2;
            const trebleAccent = beatScale * 0.15;
            targetHeight = (highSpark + trebleAccent) * maxEqualizerHeight * 0.55;
          }

          // Smooth low heights constraint
          targetHeight = Math.max(5, targetHeight);
        } else {
          // Standby/Paused Mode - gentle, sleeping ocean-wave sound spectrum
          targetHeight = (Math.sin(timeSecs * 1.5 + i * 0.15) * 0.12 + 0.15) * maxEqualizerHeight * 0.35 + Math.cos(timeSecs * 0.5 + i * 0.05) * 4;
          targetHeight = Math.max(2, targetHeight);
        }

        // Apply smooth lerping to our bar heights to avoid flickering
        const lerpConstant = isPlaying ? 0.22 : 0.08;
        barHeights[i] += (targetHeight - barHeights[i]) * lerpConstant;

        const currentHeight = barHeights[i];

        // Peak Drop logic (horizontal line that sits momentarily and drifts down)
        if (currentHeight >= peakHeights[i]) {
          peakHeights[i] = currentHeight;
        } else {
          peakHeights[i] = Math.max(0, peakHeights[i] - peakDecaySpeed);
        }

        const x = startX + i * (barWidth + barSpacing);
        const y = baselineY - currentHeight;

        // Create elegant individual vertical gradient for each column
        // Cyan color at the bottom, purple in the middle, pink/fuchsia at the top peaks.
        const columnGradient = ctx.createLinearGradient(0, baselineY, 0, baselineY - maxEqualizerHeight);
        columnGradient.addColorStop(0, '#00E5FF'); // Cyan base
        columnGradient.addColorStop(0.5, '#9D50BB'); // Purple mid
        columnGradient.addColorStop(1, '#EC4899'); // Fuchsia peak

        // Draw the main active bar column
        ctx.save();
        ctx.fillStyle = columnGradient;
        
        // Use soft glowing neon blur when playing
        if (isPlaying) {
          ctx.shadowBlur = 6;
          ctx.shadowColor = '#00E5FF';
        }

        // Draw pill-shaped columns
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, y, barWidth, currentHeight, barWidth / 2);
        } else {
          // Fallback simple rectangle if roundRect is not supported
          ctx.rect(x, y, barWidth, currentHeight);
        }
        ctx.fill();
        ctx.restore();

        // 4. Draw falling Peak Dots
        if (isPlaying && peakHeights[i] > 3) {
          ctx.save();
          const peakY = baselineY - peakHeights[i] - (isMobile ? 2 : 3);
          
          // Color peaks according to their relative height
          const peakRatio = peakHeights[i] / maxEqualizerHeight;
          const peakColor = peakRatio > 0.7 ? '#EC4899' : (peakRatio > 0.4 ? '#9D50BB' : '#00E5FF');

          ctx.fillStyle = peakColor;
          ctx.shadowBlur = 10;
          ctx.shadowColor = peakColor;

          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(x, peakY, barWidth, isMobile ? 1.5 : 2, barWidth / 2);
          } else {
            ctx.rect(x, peakY, barWidth, isMobile ? 1.5 : 2);
          }
          ctx.fill();
          ctx.restore();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [isPlaying]);

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-full block"
      style={{ mixBlendMode: 'screen' }}
    />
  );
};
