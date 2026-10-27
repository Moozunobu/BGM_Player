import React, { useRef } from 'react';
import { TrackColor } from '../types';

interface ProgressBarProps {
  progressRatio: number; // 0 to 1
  isPlaying: boolean;
  isFading: boolean;
  color?: TrackColor;
  onSeek: (ratio: number) => void;
}

const COLOR_MAP: Record<TrackColor, { bar: string; glow: string; thumb: string }> = {
  slate: { bar: 'bg-slate-300', glow: 'shadow-slate-400/50', thumb: 'border-slate-200' },
  amber: { bar: 'bg-amber-400', glow: 'shadow-amber-400/50', thumb: 'border-amber-300' },
  emerald: { bar: 'bg-emerald-400', glow: 'shadow-emerald-400/50', thumb: 'border-emerald-300' },
  blue: { bar: 'bg-sky-400', glow: 'shadow-sky-400/50', thumb: 'border-sky-300' },
  rose: { bar: 'bg-rose-400', glow: 'shadow-rose-400/50', thumb: 'border-rose-300' },
  violet: { bar: 'bg-violet-400', glow: 'shadow-violet-400/50', thumb: 'border-violet-300' },
  cyan: { bar: 'bg-cyan-400', glow: 'shadow-cyan-400/50', thumb: 'border-cyan-300' },
};

export const SimpleProgressBar: React.FC<ProgressBarProps> = ({
  progressRatio,
  isPlaying,
  isFading,
  color = 'blue',
  onSeek,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const colorStyle = COLOR_MAP[color] || COLOR_MAP.blue;
  const clampedRatio = Math.max(0, Math.min(1, progressRatio));

  const handlePointerAction = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clickX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const ratio = rect.width > 0 ? clickX / rect.width : 0;
    onSeek(ratio);
  };

  return (
    <div
      ref={containerRef}
      onClick={handlePointerAction}
      className="relative w-full h-3 bg-slate-800/90 hover:bg-slate-800 border border-slate-700/60 rounded-full cursor-pointer select-none transition-colors group flex items-center p-0.5 overflow-hidden"
      title="クリックして再生位置を変更"
    >
      {/* Background Track with subtle center guide */}
      <div className="absolute inset-x-0 h-full bg-slate-900/60" />

      {/* Progress Fill Bar */}
      <div
        className={`h-full rounded-full transition-all duration-75 relative ${
          isFading
            ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
            : isPlaying
            ? `${colorStyle.bar} shadow-[0_0_8px_rgba(56,189,248,0.5)]`
            : 'bg-slate-500'
        }`}
        style={{ width: `${clampedRatio * 100}%` }}
      />

      {/* Thumb Indicator on hover / playing */}
      {clampedRatio > 0 && (
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none transition-all duration-75"
          style={{ left: `${clampedRatio * 100}%` }}
        >
          <div
            className={`w-2.5 h-2.5 rounded-full bg-white shadow-md border ${
              isFading ? 'border-amber-400' : colorStyle.thumb
            }`}
          />
        </div>
      )}
    </div>
  );
};

// Alias for compatibility
export const WaveformProgressBar = SimpleProgressBar;
