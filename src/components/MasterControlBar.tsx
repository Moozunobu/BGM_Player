import React from 'react';
import { Volume2, VolumeX, TrendingDown } from 'lucide-react';

interface MasterControlBarProps {
  masterVolume: number;
  onVolumeChange: (vol: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onFadeOutAll: () => void;
  activePlayingCount: number;
}

export const MasterControlBar: React.FC<MasterControlBarProps> = ({
  masterVolume,
  onVolumeChange,
  isMuted,
  onToggleMute,
  onFadeOutAll,
  activePlayingCount,
}) => {
  const percentage = Math.round(masterVolume * 100);

  return (
    <div className="bg-slate-900/90 border-b border-slate-800 px-4 lg:px-8 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Left: Master Volume & Mute */}
        <div className="flex items-center gap-4 min-w-[260px]">
          <button
            onClick={onToggleMute}
            className={`p-2 rounded-lg border transition-colors ${
              isMuted
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-400'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
            title={isMuted ? 'ミュート解除' : 'マスターミュート'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <div className="flex-1 flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
              マスター音量
            </span>
            <input
              type="range"
              min="0"
              max="1.5"
              step="0.02"
              value={isMuted ? 0 : masterVolume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-28 sm:w-36 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <span className="text-xs font-mono tabular-nums font-bold text-amber-400 w-12 text-right">
              {isMuted ? 'MUTE' : `${percentage}%`}
            </span>
          </div>
        </div>

        {/* Right: Active playing count & Smooth Fade Out Stop */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>再生中:</span>
            <span
              className={`font-mono tabular-nums font-bold ${
                activePlayingCount > 0 ? 'text-amber-400' : 'text-slate-500'
              }`}
            >
              {activePlayingCount} 曲
            </span>
          </div>

          <button
            onClick={onFadeOutAll}
            disabled={activePlayingCount === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 hover:text-white disabled:opacity-40 disabled:pointer-events-none transition-colors whitespace-nowrap"
            title="再生中のすべての音源を3秒かけて滑らかにフェードアウト停止します"
          >
            <TrendingDown className="w-3.5 h-3.5 text-amber-400" />
            <span>3秒フェード停止</span>
          </button>
        </div>
      </div>
    </div>
  );
};
