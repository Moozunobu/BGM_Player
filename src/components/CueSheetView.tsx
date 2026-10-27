import React, { useState } from 'react';
import { Play, Square, Check, ArrowUp, ArrowDown, Trash2, Plus, Clock, FileText, CornerDownRight, ListOrdered } from 'lucide-react';
import { CueItem, SoundTrack, ActiveTrackState } from '../types';

interface CueSheetViewProps {
  cues: CueItem[];
  tracks: SoundTrack[];
  activeStates: Record<string, ActiveTrackState>;
  onPlayTrack: (track: SoundTrack) => void;
  onStopTrack: (trackId: string) => void;
  onUpdateCues: (cues: CueItem[]) => void;
  onTriggerNextCue: () => void;
}

export const CueSheetView: React.FC<CueSheetViewProps> = ({
  cues,
  tracks,
  activeStates,
  onPlayTrack,
  onStopTrack,
  onUpdateCues,
  onTriggerNextCue,
}) => {
  const [editingCueId, setEditingCueId] = useState<string | null>(null);

  // Find next pending cue
  const nextCueIndex = cues.findIndex((c) => !c.completed);
  const nextCue = nextCueIndex >= 0 ? cues[nextCueIndex] : null;
  const nextTrack = nextCue ? tracks.find((t) => t.id === nextCue.trackId) : null;

  const toggleCueCompleted = (id: string) => {
    const updated = cues.map((c) =>
      c.id === id ? { ...c, completed: !c.completed } : c
    );
    onUpdateCues(updated);
  };

  const moveCue = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= cues.length) return;

    const updated = [...cues];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;

    // re-index order
    updated.forEach((c, i) => (c.order = i + 1));
    onUpdateCues(updated);
  };

  const deleteCue = (id: string) => {
    const updated = cues.filter((c) => c.id !== id);
    updated.forEach((c, i) => (c.order = i + 1));
    onUpdateCues(updated);
  };

  const addNewCue = () => {
    const newCue: CueItem = {
      id: `cue-${Date.now()}`,
      order: cues.length + 1,
      timeSlot: '12:00',
      title: '新規ステージ演目BGM',
      trackId: tracks[0]?.id || '',
      note: '司会の合図で再生',
      completed: false,
      actionType: 'play',
    };
    onUpdateCues([...cues, newCue]);
    setEditingCueId(newCue.id);
  };

  const updateCueField = (id: string, field: keyof CueItem, value: any) => {
    const updated = cues.map((c) =>
      c.id === id ? { ...c, [field]: value } : c
    );
    onUpdateCues(updated);
  };

  const resetAllCues = () => {
    const updated = cues.map((c) => ({ ...c, completed: false }));
    onUpdateCues(updated);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Next Cue Trigger Console */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 lg:p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
              NEXT CUE (次の演目)
            </span>
            {nextCue && (
              <span className="text-xs text-slate-400 font-mono">
                #{nextCue.order} · {nextCue.timeSlot}
              </span>
            )}
          </div>

          {nextCue ? (
            <div>
              <h3 className="text-lg font-bold text-white mb-0.5">{nextCue.title}</h3>
              <p className="text-xs text-slate-400 flex items-center gap-2">
                <span>音源: <strong className="text-slate-200">{nextTrack?.title || '音源未選択'}</strong></span>
                {nextCue.note && <span>· 備考: {nextCue.note}</span>}
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-400 font-medium">
              すべてのキューが完了しました。
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={resetAllCues}
            className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-800/80 border border-slate-700 rounded-lg transition-colors"
          >
            キュー進捗をリセット
          </button>

          <button
            onClick={onTriggerNextCue}
            disabled={!nextCue}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:pointer-events-none rounded-lg shadow-md transition-all active:scale-95 whitespace-nowrap"
          >
            <Play className="w-4 h-4 fill-current ml-0.5" />
            <span>NEXT CUE 実行 [Spaceキー]</span>
          </button>
        </div>
      </div>

      {/* Cues Table / List */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200">
            ステージ進行表・キューリスト ({cues.length} 項目)
          </h3>
          <button
            onClick={addNewCue}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-md transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>項目を追加</span>
          </button>
        </div>

        {cues.length === 0 ? (
          <div className="py-16 text-center p-6">
            <ListOrdered className="w-8 h-8 text-slate-600 mx-auto mb-3" />
            <h4 className="text-sm font-semibold text-slate-300 mb-1">
              進行表（キューリスト）がまだ登録されていません
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
              文化祭のステージタイムテーブルや進行順に合わせて項目を追加してください。
            </p>
            <button
              onClick={addNewCue}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>最初の演目を追加</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
          {cues.map((cue, index) => {
            const track = tracks.find((t) => t.id === cue.trackId);
            const isPlaying = track ? activeStates[track.id]?.status === 'playing' : false;
            const isNext = nextCue?.id === cue.id;

            return (
              <div
                key={cue.id}
                className={`p-4 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                  cue.completed
                    ? 'bg-slate-950/40 opacity-60'
                    : isNext
                    ? 'bg-amber-500/5 ring-1 ring-inset ring-amber-500/20'
                    : 'hover:bg-slate-800/30'
                }`}
              >
                {/* Left: Checkbox + Order + Time + Title */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <button
                    onClick={() => toggleCueCompleted(cue.id)}
                    className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0 ${
                      cue.completed
                        ? 'bg-amber-500 border-amber-500 text-slate-950'
                        : 'border-slate-700 hover:border-slate-500 bg-slate-800'
                    }`}
                    title={cue.completed ? '完了を解除' : '完了済みにマーク'}
                  >
                    {cue.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-slate-400">
                        #{cue.order}
                      </span>
                      <input
                        type="text"
                        value={cue.timeSlot || ''}
                        onChange={(e) => updateCueField(cue.id, 'timeSlot', e.target.value)}
                        placeholder="時間 (例 10:00)"
                        className="w-20 px-1.5 py-0.5 text-xs bg-slate-950/50 border border-slate-800 rounded font-mono text-slate-300 focus:outline-none focus:border-amber-500"
                      />
                      {isNext && (
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          次の演目
                        </span>
                      )}
                    </div>

                    <input
                      type="text"
                      value={cue.title}
                      onChange={(e) => updateCueField(cue.id, 'title', e.target.value)}
                      placeholder="キューの演目名・イベント名"
                      className="font-semibold text-sm text-slate-100 bg-transparent hover:bg-slate-950/40 px-1 py-0.5 rounded w-full focus:outline-none focus:bg-slate-950 focus:border-amber-500 border border-transparent"
                    />

                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      {/* Linked Track selector */}
                      <div className="flex items-center gap-1.5">
                        <CornerDownRight className="w-3 h-3 text-slate-500" />
                        <span className="text-[11px] text-slate-500">再生音源:</span>
                        <select
                          value={cue.trackId || ''}
                          onChange={(e) => updateCueField(cue.id, 'trackId', e.target.value)}
                          className="bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 max-w-[200px]"
                        >
                          <option value="">(音源なし / 司会マイクのみ)</option>
                          {tracks.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.title} ({t.categoryLabel || t.category})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Note */}
                      <div className="flex-1 min-w-[200px]">
                        <input
                          type="text"
                          value={cue.note || ''}
                          onChange={(e) => updateCueField(cue.id, 'note', e.target.value)}
                          placeholder="PAメモ（例: 暗転と同時にフェードアウト）"
                          className="w-full text-xs text-slate-400 bg-transparent hover:bg-slate-950/40 px-1.5 py-0.5 rounded focus:outline-none focus:bg-slate-950 border border-transparent focus:border-slate-700"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Quick Play / Stop + Reorder + Delete */}
                <div className="flex items-center gap-1 shrink-0 self-end md:self-center">
                  {track && (
                    <button
                      onClick={() => {
                        if (isPlaying) {
                          onStopTrack(track.id);
                        } else {
                          onPlayTrack(track);
                        }
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                        isPlaying
                          ? 'bg-amber-500 border-amber-400 text-slate-950'
                          : 'bg-slate-800 border-slate-700 text-slate-200 hover:text-white hover:bg-slate-700'
                      }`}
                    >
                      {isPlaying ? (
                        <>
                          <Square className="w-3 h-3 fill-current" />
                          <span>停止</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 fill-current" />
                          <span>再生テスト</span>
                        </>
                      )}
                    </button>
                  )}

                  <div className="h-4 w-px bg-slate-800 mx-1" />

                  <button
                    onClick={() => moveCue(index, 'up')}
                    disabled={index === 0}
                    className="p-1.5 text-slate-400 hover:text-slate-200 disabled:opacity-20 hover:bg-slate-800 rounded transition-colors"
                    title="上へ移動"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => moveCue(index, 'down')}
                    disabled={index === cues.length - 1}
                    className="p-1.5 text-slate-400 hover:text-slate-200 disabled:opacity-20 hover:bg-slate-800 rounded transition-colors"
                    title="下へ移動"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteCue(cue.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors ml-1"
                    title="削除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>
    </div>
  );
};
