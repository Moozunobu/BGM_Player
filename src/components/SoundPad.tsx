import React from 'react';
import { Play, Square, Repeat, TrendingDown, Edit3, Volume2 } from 'lucide-react';
import { SoundTrack, ActiveTrackState, TrackColor } from '../types';
import { SimpleProgressBar } from './WaveformProgressBar';

interface SoundPadProps {
  track: SoundTrack;
  activeState?: ActiveTrackState;
  onPlay: (track: SoundTrack) => void;
  onStop: (trackId: string) => void;
  onFadeOut: (trackId: string, durationSec?: number) => void;
  onToggleLoop: (trackId: string) => void;
  onVolumeChange: (trackId: string, volume: number) => void;
  onFadeSecChange?: (trackId: string, fadeOutSec: number) => void;
  onEdit: (track: SoundTrack) => void;
  onSeek?: (track: SoundTrack, targetSec: number) => void;
}

const COLOR_STYLES: Record<
  TrackColor,
  {
    borderActive: string;
    bgActive: string;
    textAccent: string;
    badgeBg: string;
    buttonHover: string;
  }
> = {
  slate: {
    borderActive: 'border-slate-400',
    bgActive: 'bg-slate-800/80',
    textAccent: 'text-slate-300',
    badgeBg: 'bg-slate-800 text-slate-300 border-slate-700',
    buttonHover: 'hover:bg-slate-800',
  },
  amber: {
    borderActive: 'border-amber-500',
    bgActive: 'bg-amber-950/40',
    textAccent: 'text-amber-400',
    badgeBg: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    buttonHover: 'hover:bg-amber-500/20',
  },
  emerald: {
    borderActive: 'border-emerald-500',
    bgActive: 'bg-emerald-950/40',
    textAccent: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    buttonHover: 'hover:bg-emerald-500/20',
  },
  blue: {
    borderActive: 'border-blue-500',
    bgActive: 'bg-blue-950/40',
    textAccent: 'text-blue-400',
    badgeBg: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
    buttonHover: 'hover:bg-blue-500/20',
  },
  rose: {
    borderActive: 'border-rose-500',
    bgActive: 'bg-rose-950/40',
    textAccent: 'text-rose-400',
    badgeBg: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
    buttonHover: 'hover:bg-rose-500/20',
  },
  violet: {
    borderActive: 'border-violet-500',
    bgActive: 'bg-violet-950/40',
    textAccent: 'text-violet-400',
    badgeBg: 'bg-violet-500/10 text-violet-300 border-violet-500/30',
    buttonHover: 'hover:bg-violet-500/20',
  },
  cyan: {
    borderActive: 'border-cyan-500',
    bgActive: 'bg-cyan-950/40',
    textAccent: 'text-cyan-400',
    badgeBg: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
    buttonHover: 'hover:bg-cyan-500/20',
  },
};

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const SoundPad: React.FC<SoundPadProps> = ({
  track,
  activeState,
  onPlay,
  onStop,
  onFadeOut,
  onToggleLoop,
  onVolumeChange,
  onFadeSecChange,
  onEdit,
  onSeek,
}) => {
  const isPlaying = activeState?.status === 'playing';
  const isFading = activeState?.status === 'fading_out';
  const isBusy = isPlaying || isFading;

  const colorConfig = COLOR_STYLES[track.color || 'slate'];
  const currentTime = activeState?.currentTime ?? 0;
  const totalDuration = track.duration || 1;
  const progressRatio = Math.min(1, Math.max(0, currentTime / totalDuration));
  const remainingSec = Math.max(0, totalDuration - currentTime);
  const currentVol = track.volume ?? 0.85;
  const fadeSec = track.fadeOutSec ?? 2.5;

  return (
    <div
      className={`relative flex flex-col justify-between p-4 rounded-xl border transition-all duration-150 select-none ${
        isBusy
          ? `${colorConfig.borderActive} ${colorConfig.bgActive} shadow-lg ring-1 ring-amber-500/30`
          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
      }`}
    >
      {/* Top Bar inside card: Shortcut badge and Edit button */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div>
          {track.shortcut && (
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${colorConfig.badgeBg}`}
              title={`ショートカットキー: [${track.shortcut}]`}
            >
              [{track.shortcut}]
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onToggleLoop(track.id)}
            className={`p-1 rounded text-xs transition-colors ${
              track.loop
                ? 'text-amber-400 bg-amber-500/10'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
            }`}
            title={track.loop ? 'ループ再生: ON' : 'ループ再生: OFF'}
          >
            <Repeat className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onEdit(track)}
            className="p-1 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded transition-colors"
            title="音源設定を編集"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Trigger Button Area */}
      <div
        onClick={() => {
          if (isBusy) {
            onStop(track.id);
          } else {
            onPlay(track);
          }
        }}
        className="cursor-pointer group py-2"
      >
        <div className="flex items-start justify-between gap-3 mb-1">
          <h3
            className={`font-semibold text-sm leading-snug line-clamp-2 transition-colors ${
              isBusy ? 'text-white' : 'text-slate-200 group-hover:text-white'
            }`}
          >
            {track.title}
          </h3>

          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
              isBusy
                ? 'bg-amber-500 border-amber-400 text-slate-950 font-bold shadow-md shadow-amber-500/30'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 group-hover:bg-slate-700 group-hover:text-white'
            }`}
          >
            {isBusy ? (
              <Square className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </div>
        </div>

        {track.notes && (
          <p className="text-[11px] text-slate-400 line-clamp-1 mb-2">
            {track.notes}
          </p>
        )}

        {/* Playback Progress Bar */}
        <div className="mt-2.5">
          <SimpleProgressBar
            progressRatio={progressRatio}
            isPlaying={isPlaying}
            isFading={isFading}
            color={track.color}
            onSeek={(ratio) => {
              if (onSeek) {
                onSeek(track, ratio * totalDuration);
              }
            }}
          />

          <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-400 mt-1">
            <span>
              {isFading ? (
                <span className="text-amber-400 font-sans font-semibold">フェードアウト中...</span>
              ) : isPlaying ? (
                <span className="text-emerald-400 font-semibold">再生中</span>
              ) : (
                <span>停止中</span>
              )}
            </span>
            <span>
              {isPlaying
                ? `-${formatDuration(remainingSec)} / ${formatDuration(totalDuration)}`
                : formatDuration(totalDuration)}
            </span>
          </div>
        </div>
      </div>

      {/* Footer Controls: Fade-out duration selector, Fade-out button & Volume Fader */}
      <div className="pt-3 mt-1 border-t border-slate-800/80 flex items-center justify-between gap-2">
        {/* Fade Out Button with Quick Seconds Selector */}
        <div className="flex items-center bg-slate-800/90 border border-slate-700/80 rounded-md overflow-hidden">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFadeOut(track.id, fadeSec);
            }}
            disabled={!isPlaying}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-colors whitespace-nowrap"
            title={`${fadeSec}秒フェードアウト停止`}
          >
            <TrendingDown className="w-3 h-3 text-amber-400" />
            <span>{fadeSec}s フェード</span>
          </button>

          {onFadeSecChange && (
            <select
              value={fadeSec}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                e.stopPropagation();
                onFadeSecChange(track.id, parseFloat(e.target.value));
              }}
              className="bg-slate-900 border-l border-slate-700/80 text-[10px] text-amber-400 font-mono px-1 py-1 focus:outline-none cursor-pointer hover:bg-slate-800"
              title="フェードアウト秒数を変更"
            >
              <option value={0.5}>0.5s</option>
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

        {/* Individual Volume Control */}
        <div className="flex items-center gap-1.5">
          <Volume2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={currentVol}
            onChange={(e) => {
              e.stopPropagation();
              onVolumeChange(track.id, parseFloat(e.target.value));
            }}
            className="w-16 sm:w-20 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            title={`音量: ${Math.round(currentVol * 100)}%`}
          />
          <span className="text-[10px] font-mono tabular-nums text-slate-400 w-8 text-right">
            {Math.round(currentVol * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
};
