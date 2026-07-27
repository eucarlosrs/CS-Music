import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Music, Sparkles, SlidersHorizontal, RotateCcw, Plus, Minus } from 'lucide-react';

interface SynchronizedLyricsProps {
  lyrics: string;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onSeek: (percent: number) => void;
}

interface ParsedLyricLine {
  text: string;
  startTime: number;
  endTime: number;
}

export const SynchronizedLyrics: React.FC<SynchronizedLyricsProps> = ({
  lyrics,
  currentTime,
  duration,
  isPlaying,
  onSeek,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);
  
  // Offset state in seconds to fine-tune sync (+ or - seconds)
  const [syncOffset, setSyncOffset] = useState<number>(0);
  const [showSyncControls, setShowSyncControls] = useState<boolean>(false);

  // Parse lyrics into structured lines with accurate timing
  const parsedLines = useMemo<ParsedLyricLine[]>(() => {
    if (!lyrics || lyrics === 'Instrumental') return [];

    const rawLines = lyrics.split('\n');
    const lrcRegex = /^(?:\[(\d+):(\d+(?:\.\d+)?)\])+(.*)$/;
    const hasLrcTags = rawLines.some((l) => lrcRegex.test(l.trim()));

    if (hasLrcTags) {
      // Parse LRC format [mm:ss.xx] text
      const items: { text: string; startTime: number }[] = [];
      rawLines.forEach((line) => {
        const trimmed = line.trim();
        const match = trimmed.match(/^\[(\d+):(\d+(?:\.\d+)?)\](.*)$/);
        if (match) {
          const minutes = parseFloat(match[1]);
          const seconds = parseFloat(match[2]);
          const startTime = minutes * 60 + seconds;
          const text = match[3].trim();
          items.push({ text, startTime });
        } else if (trimmed.length > 0) {
          items.push({ text: trimmed, startTime: 0 });
        }
      });

      // Sort by start time
      items.sort((a, b) => a.startTime - b.startTime);

      return items.map((item, idx) => {
        const nextStart = items[idx + 1] ? items[idx + 1].startTime : duration || item.startTime + 5;
        return {
          text: item.text,
          startTime: item.startTime,
          endTime: nextStart,
        };
      });
    }

    // For plain text without LRC tags:
    // Filter non-empty lines for timing calculation, but keep structure
    const totalLines = rawLines.length;
    if (totalLines === 0) return [];

    // Most songs have an intro lead-in (e.g. 10s) and an outro (e.g. 10s)
    const introDelay = Math.min(10, Math.max(3, (duration || 180) * 0.08));
    const outroBuffer = Math.min(12, Math.max(4, (duration || 180) * 0.08));
    const vocalDuration = Math.max((duration || 180) - introDelay - outroBuffer, 10);

    let currentVocalIndex = 0;
    const totalVocalLines = rawLines.filter((l) => l.trim() !== '').length || 1;

    return rawLines.map((line) => {
      if (line.trim() === '') {
        return { text: '', startTime: 0, endTime: 0 };
      }

      const startTime = introDelay + (currentVocalIndex / totalVocalLines) * vocalDuration;
      currentVocalIndex++;
      const endTime = introDelay + (currentVocalIndex / totalVocalLines) * vocalDuration;

      return {
        text: line,
        startTime,
        endTime,
      };
    });
  }, [lyrics, duration]);

  // Adjusted current time with user-selected sync offset
  const effectiveTime = Math.max(0, currentTime + syncOffset);

  // Find active line index based on effective time
  const activeLineIndex = useMemo(() => {
    if (!parsedLines.length) return -1;

    let foundIdx = -1;
    for (let i = 0; i < parsedLines.length; i++) {
      const line = parsedLines[i];
      if (line.text.trim() === '') continue;

      if (effectiveTime >= line.startTime) {
        foundIdx = i;
      } else {
        break;
      }
    }

    return foundIdx >= 0 ? foundIdx : 0;
  }, [effectiveTime, parsedLines]);

  // Calculate percentage completion of current active line for karaoke effect
  const lineProgress = useMemo(() => {
    if (activeLineIndex < 0 || activeLineIndex >= parsedLines.length) return 0;
    const currentLine = parsedLines[activeLineIndex];
    if (!currentLine || currentLine.startTime === currentLine.endTime) return 0;

    const lineDuration = currentLine.endTime - currentLine.startTime;
    if (lineDuration <= 0) return 0;

    const progress = (effectiveTime - currentLine.startTime) / lineDuration;
    return Math.min(Math.max(progress * 100, 0), 100);
  }, [activeLineIndex, effectiveTime, parsedLines]);

  // Scroll active line into center smooth view
  useEffect(() => {
    if (activeLineRef.current && containerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeLineIndex]);

  if (!lyrics || lyrics === 'Instrumental') {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[220px] text-center p-6 text-neutral-400 space-y-3">
        <div className="w-12 h-12 rounded-full bg-[#00E5FF]/10 border border-[#00E5FF]/20 flex items-center justify-center text-[#00E5FF] shadow-[0_0_15px_rgba(0,229,255,0.2)]">
          <Music className="w-6 h-6 animate-pulse" />
        </div>
        <p className="text-sm font-medium italic text-neutral-300">
          Esta é uma faixa instrumental original do CS Estúdio.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative group">
      {/* Synchronization Adjustment Control Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 mb-2 bg-[#121214]/80 border border-[#1F1F22] rounded-2xl text-xs text-neutral-400">
        <button
          onClick={() => setShowSyncControls(!showSyncControls)}
          className="flex items-center gap-1.5 text-neutral-300 hover:text-[#00E5FF] transition-colors py-0.5 px-2 rounded-lg hover:bg-white/5"
          title="Ajustar tempo da letra"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#00E5FF]" />
          <span>Ajustar Sincronia {syncOffset !== 0 ? `(${syncOffset > 0 ? '+' : ''}${syncOffset.toFixed(1)}s)` : ''}</span>
        </button>

        {showSyncControls && (
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 animate-fade-in">
            <button
              onClick={() => setSyncOffset((prev) => Math.max(prev - 0.5, -15))}
              className="p-1 rounded-lg hover:bg-[#00E5FF]/20 hover:text-[#00E5FF] transition-all"
              title="Adiantar letra 0.5s"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[#00E5FF] text-[11px] min-w-[36px] text-center">
              {syncOffset > 0 ? `+${syncOffset.toFixed(1)}s` : `${syncOffset.toFixed(1)}s`}
            </span>
            <button
              onClick={() => setSyncOffset((prev) => Math.min(prev + 0.5, 15))}
              className="p-1 rounded-lg hover:bg-[#00E5FF]/20 hover:text-[#00E5FF] transition-all"
              title="Atrasar letra 0.5s"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            {syncOffset !== 0 && (
              <button
                onClick={() => setSyncOffset(0)}
                className="p-1 ml-1 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10"
                title="Resetar sincronia"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Lyrics Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto bg-[#18181B]/60 border border-[#1F1F22] p-4 sm:p-6 rounded-3xl max-h-[320px] md:max-h-none h-full shadow-inner relative scrollbar-thin scrollbar-thumb-[#00E5FF]/30 scrollbar-track-transparent space-y-2 select-none"
      >
        <div className="py-6 space-y-3">
          {parsedLines.map((lineObj, idx) => {
            const isBlank = lineObj.text.trim() === '';
            if (isBlank) {
              return <div key={idx} className="h-3" />;
            }

            const isActive = idx === activeLineIndex;
            const isPast = idx < activeLineIndex;

            const handleLineClick = () => {
              if (duration > 0 && lineObj.startTime >= 0) {
                const targetPercent = Math.min(Math.max((lineObj.startTime / duration) * 100, 0), 100);
                onSeek(targetPercent);
              }
            };

            if (isActive) {
              return (
                <motion.div
                  key={idx}
                  ref={activeLineRef}
                  layout
                  initial={{ scale: 0.96, opacity: 0.8 }}
                  animate={{ scale: 1.02, opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  onClick={handleLineClick}
                  className="relative bg-[#00E5FF]/15 border border-[#00E5FF]/40 shadow-[0_0_22px_rgba(0,229,255,0.35)] rounded-2xl px-4 py-3 cursor-pointer text-center group my-2 overflow-hidden"
                >
                  {/* Subtle Karaoke fill bar inside line */}
                  <div
                    className="absolute inset-y-0 left-0 bg-[#00E5FF]/10 transition-all duration-150 ease-linear pointer-events-none rounded-2xl"
                    style={{ width: `${lineProgress}%` }}
                  />

                  <div className="relative z-10 flex items-center justify-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#00E5FF] animate-spin shrink-0" style={{ animationDuration: '3.5s' }} />
                    <p className="text-[#00E5FF] font-bold text-base md:text-lg tracking-wide drop-shadow-[0_0_12px_rgba(0,229,255,0.95)] transition-all">
                      {lineObj.text}
                    </p>
                    <Sparkles className="w-4 h-4 text-[#00E5FF] animate-spin shrink-0" style={{ animationDuration: '3.5s' }} />
                  </div>
                </motion.div>
              );
            }

            return (
              <div
                key={idx}
                onClick={handleLineClick}
                className={`text-center py-1.5 px-3 rounded-xl transition-all duration-300 cursor-pointer ${
                  isPast
                    ? 'text-[#00E5FF]/70 hover:text-[#00E5FF] font-medium text-sm md:text-base hover:bg-[#00E5FF]/5'
                    : 'text-neutral-500/80 hover:text-neutral-300 font-medium text-sm md:text-base hover:bg-white/5'
                }`}
              >
                {lineObj.text}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
