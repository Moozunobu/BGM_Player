import React from 'react';
import { X, Keyboard, AlertTriangle, ShieldCheck } from 'lucide-react';
import { SoundTrack } from '../types';

interface ShortcutsHelpModalProps {
  tracks: SoundTrack[];
  shortcutsEnabled: boolean;
  onToggleShortcuts: () => void;
  onClose: () => void;
}

export const ShortcutsHelpModal: React.FC<ShortcutsHelpModalProps> = ({
  tracks,
  shortcutsEnabled,
  onToggleShortcuts,
  onClose,
}) => {
  const assignedTracks = tracks.filter((t) => t.shortcut);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Keyboard className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">キーボード操作一覧</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Shortcuts Enable/Disable Toggle */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-semibold text-slate-200">
                キーボードショートカット機能
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                タイピングミスによる誤爆を防ぐ場合はOFFにできます
              </p>
            </div>
            <button
              onClick={onToggleShortcuts}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                shortcutsEnabled
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {shortcutsEnabled ? '有効 (ON)' : '無効 (OFF)'}
            </button>
          </div>

          {/* Global Master Shortcuts */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              全体・緊急操作キー
            </h4>
            <div className="space-y-2 text-xs">

              <div className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-800 rounded-lg">
                <span className="text-slate-300 font-medium">全体フェード停止 (3秒で全音源を滑らかに終了)</span>
                <kbd className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded text-amber-300 font-mono font-bold">
                  Shift + Esc
                </kbd>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-800 rounded-lg">
                <span className="text-slate-300 font-medium">進行表の「NEXT CUE」を実行</span>
                <kbd className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded text-amber-300 font-mono font-bold">
                  Space
                </kbd>
              </div>
            </div>
          </div>

          {/* Assigned Track Shortcuts */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              各音源のポン出しショートカット ({assignedTracks.length} 個設定中)
            </h4>

            {assignedTracks.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 text-xs">
                {assignedTracks.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-2 bg-slate-950 border border-slate-800 rounded-lg"
                  >
                    <span className="text-slate-300 truncate max-w-[150px]">
                      {t.title}
                    </span>
                    <kbd className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded text-amber-400 font-mono font-bold">
                      [{t.shortcut}]
                    </kbd>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-3 text-center border border-dashed border-slate-800 rounded-lg">
                キーが割り当てられた音源はありません。音源カードの鉛筆アイコンからキーを設定できます。
              </p>
            )}
          </div>
        </div>

        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
