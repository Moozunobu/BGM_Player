import React from 'react';
import { Volume2, VolumeX, TrendingDown, Layers } from 'lucide-react';

interface MasterControlBarProps {
  masterVolume: number;
  onVolumeChange: (vol: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onFadeOutAll: (fadeSec?: number) => void;
  masterFadeSec?: number;
  onMasterFadeSecChange?: (sec: number) => void;
  activePlayingCount: number;
  soloBgmMode?: boolean;
  onToggleSoloBgm?: () => void;
}

export const MasterControlBar: React.FC<MasterControlBarProps> = ({
  masterVolume,
  onVolumeChange,
  isMuted,
  onToggleMute,
  onFadeOutAll,
  masterFadeSec = 2.5,
  onMasterFadeSecChange,
  activePlayingCount,
  soloBgmMode = false,
  onToggleSoloBgm,
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
              step="0.01"
              value={isMuted ? 0 : masterVolume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-28 sm:w-36 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <span className="text-xs font-mono tabular-nums font-bold text-amber-400 w-12 text-right">
              {isMuted ? 'MUTE' : `${percentage}%`}
            </span>
          </div>
        </div>

        {/* Center/Right: Playback Mode (Simultaneous BGM) & Active Count & Smooth Fade Out Stop */}
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          {onToggleSoloBgm && (
            <button
              onClick={onToggleSoloBgm}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                !soloBgmMode
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-sm'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
              title={
                !soloBgmMode
                  ? '現在：複数BGMの同時再生が有効です（クリックで単独再生に切替）'
                  : '現在：単独再生モード（クリックで複数BGMの同時再生に切替）'
              }
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>{!soloBgmMode ? '同時再生: ON (複数BGM可)' : '単独再生モード'}</span>
            </button>
          )}

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

          {/* Master Fade Out with configurable duration */}
          <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
            <button
              onClick={() => onFadeOutAll(masterFadeSec)}
              disabled={activePlayingCount === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white disabled:opacity-40 disabled:pointer-events-none transition-colors whitespace-nowrap"
              title={`再生中のすべての音源を${masterFadeSec}秒かけて滑らかにフェードアウト停止します`}
            >
              <TrendingDown className="w-3.5 h-3.5 text-amber-400" />
              <span>{masterFadeSec}s 全フェード停止</span>
            </button>

            {onMasterFadeSecChange && (
              <select
                value={masterFadeSec}
                onChange={(e) => onMasterFadeSecChange(parseFloat(e.target.value))}
                className="bg-slate-900 border-l border-slate-700 text-xs text-amber-400 font-mono px-2 py-1.5 focus:outline-none cursor-pointer hover:bg-slate-800"
                title="全体フェード停止の秒数を変更"
              >
                <option value={1}>1.0s</option>
                <option value={1.5}>1.5s</option>
                <option value={2}>2.0s</option>
                <option value={2.5}>2.5s</option>
                <option value={3}>3.0s</option>
                <option value={4}>4.0s</option>
                <option value={5}>5.0s</option>
                <option value={7}>7.0s</option>
              </select>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
