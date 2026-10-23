import React, { useState, useMemo } from 'react';
import { Search, Plus, Sparkles, Music } from 'lucide-react';
import { SoundTrack, ActiveTrackState } from '../types';
import { SoundPad } from './SoundPad';

interface SoundboardViewProps {
  tracks: SoundTrack[];
  activeStates: Record<string, ActiveTrackState>;
  onPlay: (track: SoundTrack) => void;
  onStop: (trackId: string) => void;
  onFadeOut: (trackId: string, durationSec?: number) => void;
  onToggleLoop: (trackId: string) => void;
  onVolumeChange: (trackId: string, volume: number) => void;
  onFadeSecChange?: (trackId: string, fadeOutSec: number) => void;
  onEdit: (track: SoundTrack) => void;
  onOpenAddModal: () => void;
  onSeek?: (track: SoundTrack, targetSec: number) => void;
}

export const SoundboardView: React.FC<SoundboardViewProps> = ({
  tracks,
  activeStates,
  onPlay,
  onStop,
  onFadeOut,
  onToggleLoop,
  onVolumeChange,
  onFadeSecChange,
  onEdit,
  onOpenAddModal,
  onSeek,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredTracks = useMemo(() => {
    if (!searchQuery.trim()) return tracks;
    const q = searchQuery.toLowerCase();
    return tracks.filter(
      (track) =>
        track.title.toLowerCase().includes(q) ||
        Boolean(track.notes?.toLowerCase().includes(q)) ||
        Boolean(track.shortcut?.toLowerCase() === q)
    );
  }, [tracks, searchQuery]);

  return (
    <div className="space-y-5">
      {/* Search and Action Toolbar */}
      <div className="flex items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="音源名・ショートカットキーで検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 transition-colors"
          />
        </div>

        {/* Add button */}
        <button
          onClick={onOpenAddModal}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-sm transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>音源を追加</span>
        </button>
      </div>

      {/* Grid of Sound Pads */}
      {filteredTracks.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTracks.map((track) => (
            <SoundPad
              key={track.id}
              track={track}
              activeState={activeStates[track.id]}
              onPlay={onPlay}
              onStop={onStop}
              onFadeOut={onFadeOut}
              onToggleLoop={onToggleLoop}
              onVolumeChange={onVolumeChange}
              onFadeSecChange={onFadeSecChange}
              onEdit={onEdit}
              onSeek={onSeek}
            />
          ))}
        </div>
      ) : tracks.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/30 p-8">
          <div className="w-12 h-12 rounded-xl bg-slate-800/80 text-amber-400 flex items-center justify-center mx-auto mb-4">
            <Music className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-white mb-1.5">
            音源ファイルがまだ登録されていません
          </h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-5 leading-relaxed">
            文化祭で使用するBGMや効果音（MP3, WAV, AAC, M4A等）を追加してください。
            ボタンを押すだけですぐに音が鳴るポン出しパッドが自動生成されます。
          </p>
          <button
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg shadow transition-colors"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>音源ファイルを追加・整理する</span>
          </button>
        </div>
      ) : (
        <div className="py-16 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/40">
          <Music className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <h4 className="text-sm font-semibold text-slate-300 mb-1">
            該当する音源が見つかりませんでした
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            {searchQuery
              ? `「${searchQuery}」に一致する音源はありません。`
              : 'このカテゴリーには音源がありません。'}
          </p>
          <button
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>音源を追加する</span>
          </button>
        </div>
      )}
    </div>
  );
};
