import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { SoundTrack, TrackColor } from '../types';

interface TrackEditModalProps {
  track: SoundTrack;
  onSave: (updated: SoundTrack) => void;
  onClose: () => void;
}

const CATEGORY_OPTIONS = [
  { id: 'opening_closing', label: '開会式・閉会式' },
  { id: 'stage', label: 'ステージ発表・転換' },
  { id: 'announcement', label: '校内放送・案内' },
  { id: 'effects', label: '効果音・SE' },
  { id: 'user', label: 'ユーザー追加音源' },
];

const COLOR_OPTIONS: { id: TrackColor; label: string; bg: string }[] = [
  { id: 'amber', label: 'アンバー (祝祭/暖色)', bg: 'bg-amber-500' },
  { id: 'blue', label: 'ブルー (爽やか)', bg: 'bg-blue-500' },
  { id: 'emerald', label: 'エメラルド (定時/放送)', bg: 'bg-emerald-500' },
  { id: 'rose', label: 'ローズ (劇的/緊張)', bg: 'bg-rose-500' },
  { id: 'violet', label: 'バイオレット (感動)', bg: 'bg-violet-500' },
  { id: 'cyan', label: 'シアン (クイズ/軽快)', bg: 'bg-cyan-500' },
  { id: 'slate', label: 'スレート (標準)', bg: 'bg-slate-400' },
];

export const TrackEditModal: React.FC<TrackEditModalProps> = ({
  track,
  onSave,
  onClose,
}) => {
  const [title, setTitle] = useState(track.title);
  const [category, setCategory] = useState(track.category);
  const [shortcut, setShortcut] = useState(track.shortcut || '');
  const [volume, setVolume] = useState(track.volume ?? 0.85);
  const [loop, setLoop] = useState(track.loop);
  const [fadeOutSec, setFadeOutSec] = useState(track.fadeOutSec ?? 2.5);
  const [fadeInSec, setFadeInSec] = useState(track.fadeInSec ?? 0);
  const [color, setColor] = useState<TrackColor>(track.color || 'slate');
  const [notes, setNotes] = useState(track.notes || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const catMeta = CATEGORY_OPTIONS.find((c) => c.id === category);
    onSave({
      ...track,
      title: title.trim() || track.title,
      category,
      categoryLabel: catMeta?.label || category,
      shortcut: shortcut.trim().toUpperCase() || undefined,
      volume,
      loop,
      fadeOutSec,
      fadeInSec,
      color,
      notes: notes.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h3 className="text-base font-bold text-white">音源設定の編集</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              音源タイトル
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Category & Shortcut */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                カテゴリー
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-amber-500"
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                ショートカットキー (英数字1文字)
              </label>
              <input
                type="text"
                maxLength={1}
                value={shortcut}
                onChange={(e) => setShortcut(e.target.value.toUpperCase())}
                placeholder="例: 1, 2, Q, W"
                className="w-full px-3 py-2 text-sm font-mono font-bold uppercase bg-slate-950 border border-slate-800 rounded-lg text-amber-400 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Volume and Loop */}
          <div className="space-y-3 bg-slate-950/50 p-4 rounded-xl border border-slate-800/80">
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1.5">
                <span>個別音量 (最大200%ブースト)</span>
                <span className={`font-mono text-xs ${volume > 1.0 ? 'text-amber-400 font-bold' : 'text-slate-300'}`}>
                  {Math.round(volume * 100)}%{volume > 1.0 ? ' (⚡大音量ブースト)' : ''}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.05"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              {/* Quick volume presets */}
              <div className="flex items-center gap-1.5 mt-2">
                {[0.5, 0.85, 1.0, 1.25, 1.5, 2.0].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVolume(v)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                      Math.abs(volume - v) < 0.01
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    {Math.round(v * 100)}%{v > 1.0 ? '⚡' : ''}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/60">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                ループ再生
              </label>
              <label className="flex items-center gap-2 cursor-pointer mt-1">
                <input
                  type="checkbox"
                  checked={loop}
                  onChange={(e) => setLoop(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0 w-4 h-4"
                />
                <span className="text-xs text-slate-300">
                  {loop ? '常に繰り返し再生' : '1回のみ再生 (ワンショット)'}
                </span>
              </label>
            </div>
          </div>

          {/* Fade Times */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                フェードアウト時間 (秒)
              </label>
              <select
                value={fadeOutSec}
                onChange={(e) => setFadeOutSec(parseFloat(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-amber-500"
              >
                <option value={0}>0秒 (即時停止)</option>
                <option value={1}>1.0秒 (素早く)</option>
                <option value={2}>2.0秒 (標準)</option>
                <option value={2.5}>2.5秒 (おすすめ)</option>
                <option value={3.5}>3.5秒 (ゆっくり)</option>
                <option value={5}>5.0秒 (じっくり)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                フェードイン時間 (秒)
              </label>
              <select
                value={fadeInSec}
                onChange={(e) => setFadeInSec(parseFloat(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-amber-500"
              >
                <option value={0}>0秒 (即座に最大音量)</option>
                <option value={0.5}>0.5秒</option>
                <option value={1}>1.0秒</option>
                <option value={2}>2.0秒</option>
              </select>
            </div>
          </div>

          {/* Color tag */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              カラータグ
            </label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setColor(c.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border transition-all ${
                    color === c.id
                      ? 'border-white text-white font-semibold bg-slate-800 ring-1 ring-white/20'
                      : 'border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${c.bg}`} />
                  <span>{c.label.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              PA・司会メモ (台本・指示など)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="例: 暗転と同時に再生。校長登壇でフェードアウト。"
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Buttons */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg shadow transition-colors"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>変更を保存</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
