import React, { useRef } from 'react';
import { TrackColor } from '../types';

interface WaveformProgressBarProps {
  peaks?: number[];
  progressRatio: number; // 0 to 1
  isPlaying: boolean;
  isFading: boolean;
  color?: TrackColor;
  onSeek: (ratio: number) => void;
}

const COLOR_MAP: Record<TrackColor, { activeBar: string; playhead: string }> = {
  slate: { activeBar: 'bg-slate-300', playhead: 'bg-slate-100' },
  amber: { activeBar: 'bg-amber-400', playhead: 'bg-amber-200' },
  emerald: { activeBar: 'bg-emerald-400', playhead: 'bg-emerald-200' },
  blue: { activeBar: 'bg-sky-400', playhead: 'bg-sky-200' },
  rose: { activeBar: 'bg-rose-400', playhead: 'bg-rose-200' },
  violet: { activeBar: 'bg-violet-400', playhead: 'bg-violet-200' },
  cyan: { activeBar: 'bg-cyan-400', playhead: 'bg-cyan-200' },
};

export const WaveformProgressBar: React.FC<WaveformProgressBarProps> = ({
  peaks,
  progressRatio,
  isPlaying,
  isFading,
  color = 'blue',
  onSeek,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const colorStyle = COLOR_MAP[color] || COLOR_MAP.blue;

  const hasPeaks = peaks && peaks.length > 0;
  const totalBars = hasPeaks ? peaks.length : 0;

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
      className="relative w-full h-11 bg-[#070e22] hover:bg-[#0a132e] border border-slate-800/90 rounded-lg overflow-hidden cursor-pointer select-none flex items-center justify-between px-1.5 transition-colors group"
      title="クリックして再生位置を変更"
    >
      {/* If real peaks are loaded, render the actual audio waveform */}
      {hasPeaks ? (
        <div className="w-full h-full flex items-center justify-between gap-[1.5px] pointer-events-none">
          {peaks.map((peak, index) => {
            const barProgress = index / totalBars;
            const isPassed = barProgress <= progressRatio;

            return (
              <div
                key={index}
                className="flex-1 flex items-center justify-center h-full"
              >
                <div
                  className={`w-[2.5px] rounded-full transition-colors duration-75 ${
                    isPassed
                      ? isFading
                        ? 'bg-amber-400/90 shadow-[0_0_4px_rgba(251,191,36,0.4)]'
                        : `${colorStyle.activeBar} shadow-[0_0_4px_rgba(56,189,248,0.4)]`
                      : 'bg-slate-700/60 group-hover:bg-slate-600/70'
                  }`}
                  style={{
                    height: `${Math.max(12, Math.round(peak * 88))}%`,
                  }}
                />
              </div>
            );
          })}
        </div>
      ) : (
        /* Real audio waveform is decoding in background */
        <div className="w-full h-full flex items-center justify-center gap-1 text-[11px] font-mono text-slate-500 animate-pulse pointer-events-none">
          <div className="flex items-center gap-0.5 mr-2">
            <span className="w-1 h-3 bg-slate-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
            <span className="w-1 h-5 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
            <span className="w-1 h-2 bg-slate-600 rounded-full animate-bounce" />
          </div>
          <span>実音源の波形データを解析中...</span>
        </div>
      )}

      {/* Playhead Cursor Line (matching DAW audio editor) */}
      <div
        className="absolute top-0 bottom-0 pointer-events-none transition-all duration-75 z-10"
        style={{ left: `${Math.min(100, Math.max(0, progressRatio * 100))}%` }}
      >
        <div
          className={`w-[2px] h-full ${
            isPlaying ? colorStyle.playhead : 'bg-slate-400/90'
          } shadow-[0_0_8px_rgba(255,255,255,0.7)]`}
        />
      </div>

      {/* Center baseline guideline */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-slate-800/50 pointer-events-none" />
    </div>
  );
};
