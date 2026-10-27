import React, { useRef, useState } from 'react';
import { UploadCloud, Music, Trash2, Edit3, Download, Play, Square, AlertTriangle } from 'lucide-react';
import { SoundTrack, ActiveTrackState } from '../types';
import { saveTrack, deleteTrack, clearAllTracks, resetDB } from '../services/db';
import { audioEngine, getAudioMimeType, detectAudioMimeFromBytes } from '../services/audioEngine';

interface FileManagerViewProps {
  tracks: SoundTrack[];
  activeStates: Record<string, ActiveTrackState>;
  onPlayTrack: (track: SoundTrack) => void;
  onStopTrack: (trackId: string) => void;
  onTrackUpdated: () => void;
  onEditTrack: (track: SoundTrack) => void;
}

function formatBytes(bytes?: number): string {
  if (!bytes) return '--';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const FileManagerView: React.FC<FileManagerViewProps> = ({
  tracks,
  activeStates,
  onPlayTrack,
  onStopTrack,
  onTrackUpdated,
  onEditTrack,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [trackToDelete, setTrackToDelete] = useState<SoundTrack | null>(null);

  const getAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const audio = new Audio();
      audio.preload = 'metadata';

      let settled = false;
      const cleanup = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        audio.onloadedmetadata = null;
        audio.onerror = null;
        try {
          audio.src = '';
          audio.load();
        } catch {}
        try {
          URL.revokeObjectURL(url);
        } catch {}
      };

      const timer = window.setTimeout(() => {
        cleanup();
        resolve(30);
      }, 1800);

      audio.onloadedmetadata = () => {
        const dur = audio.duration;
        cleanup();
        resolve(Number.isFinite(dur) && dur > 0 ? dur : 30);
      };

      audio.onerror = () => {
        cleanup();
        resolve(30);
      };

      audio.src = url;
    });
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsProcessing(true);

    let successCount = 0;
    const failedFiles: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          setStatusMessage(`音源を処理・登録中 (${i + 1}/${files.length}): ${file.name}`);
          // Allow UI to breathe, update progress, and let garbage collection run
          await new Promise((r) => window.setTimeout(r, 35));

          const duration = await getAudioDuration(file);

          // Read only first 32 bytes to sniff format, saving massive RAM during 18+ bulk file imports
          const headerBytes = await file.slice(0, 32).arrayBuffer();
          const correctMime = detectAudioMimeFromBytes(headerBytes, getAudioMimeType(file.name, file.type));
          const safeBlob = file.slice(0, file.size, correctMime);

          // Clean filename for title
          const cleanTitle = file.name.replace(/\.[^/.]+$/, '');

          // Determine category suggestion
          let category = 'stage';
          let categoryLabel = 'ステージ発表・転換';
          const lower = file.name.toLowerCase();
          if (
            lower.includes('se') ||
            lower.includes('effect') ||
            lower.includes('音') ||
            lower.includes('剣') ||
            lower.includes('雷') ||
            lower.includes('雨') ||
            duration <= 12
          ) {
            category = 'effects';
            categoryLabel = '効果音・SE';
          } else if (lower.includes('chime') || lower.includes('bell') || lower.includes('announce')) {
            category = 'announcement';
            categoryLabel = '校内放送・案内';
          } else if (lower.includes('opening') || lower.includes('ending') || lower.includes('式')) {
            category = 'opening_closing';
            categoryLabel = '開会式・閉会式';
          }

          const isEffect = category === 'effects' || duration <= 10;

          const newTrack: SoundTrack = {
            id: `custom-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
            title: cleanTitle,
            category,
            categoryLabel,
            duration,
            volume: 1.0, // Default 100% volume
            loop: isEffect ? false : duration > 20, // sound effects never loop by default
            fadeInSec: isEffect ? 0 : 0.8, // Sound effects hit at 100% instantly with 0s fade
            fadeOutSec: isEffect ? 0 : 2.5,
            color: isEffect ? 'amber' : 'blue',
            isPreset: false,
            audioBlob: safeBlob,
            fileName: file.name,
            fileSize: file.size,
            addedAt: Date.now(),
            notes: '文化祭持ち込み音源',
          };

          await saveTrack(newTrack);
          successCount++;
        } catch (fileErr) {
          console.warn(`Failed to import file "${file.name}":`, fileErr);
          failedFiles.push(file.name);
          // CRITICAL: Reset DB connection and wait so an error on one file never blocks subsequent files
          await resetDB();
        }
      }

      if (successCount > 0) {
        onTrackUpdated();
        setStatusMessage(
          failedFiles.length > 0
            ? `${successCount} 件の音源を追加しました（${failedFiles.length}件スキップ: ${failedFiles.join(', ')}）`
            : `${successCount} 件の音源を追加しました！すぐに再生できます`
        );
      } else if (failedFiles.length > 0) {
        setStatusMessage(`音源の登録に失敗しました: ${failedFiles.join(', ')}`);
      }
      setTimeout(() => setStatusMessage(null), 4500);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = (track: SoundTrack) => {
    setTrackToDelete(track);
  };

  const handleConfirmDeleteAll = async () => {
    setIsProcessing(true);
    try {
      audioEngine.clearAll();
      await clearAllTracks();
      onTrackUpdated();
      setStatusMessage('すべての音源ファイルを消去しました');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (e) {
      console.warn('Failed to clear tracks:', e);
      setStatusMessage('音源の消去に失敗しました');
    } finally {
      setIsProcessing(false);
      setIsDeleteAllModalOpen(false);
    }
  };

  const handleConfirmDeleteSingle = async () => {
    if (!trackToDelete) return;
    try {
      audioEngine.stopTrack(trackToDelete.id, true);
      await deleteTrack(trackToDelete.id);
      onTrackUpdated();
    } catch (e) {
      console.warn('Failed to delete track:', e);
    } finally {
      setTrackToDelete(null);
    }
  };

  const handleDownloadBlob = (track: SoundTrack) => {
    if (!track.audioBlob) return;
    const url = URL.createObjectURL(track.audioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = track.fileName || `${track.title}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-amber-400 bg-amber-500/10 scale-[1.01]'
            : 'border-slate-800 hover:border-slate-700 bg-slate-900/50 hover:bg-slate-900'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.mov,.mp4"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center mx-auto mb-3 text-amber-400">
          <UploadCloud className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-white mb-1">
          BGMや効果音ファイルをここにドラッグ＆ドロップ
        </h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto mb-3">
          クリックしてファイルを選択も可能。MP3, WAV, AAC, M4A, OGG, MOV形式に対応。
          ファイルはブラウザのローカルストレージ（IndexedDB）に安全に保存され、オフラインでも即座に再生できます。
        </p>
        <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-md bg-amber-400 text-slate-950">
          ファイルを選択する
        </span>
      </div>

      {/* Status banner */}
      {statusMessage && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs px-4 py-2.5 rounded-lg flex items-center justify-between">
          <span>{statusMessage}</span>
          {isProcessing && <span className="animate-spin">⏳</span>}
        </div>
      )}

      {/* All Tracks Table Header & Clear Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-slate-200">
              登録済み音源一覧 ({tracks.length} 曲)
            </h3>
            <span className="text-xs text-slate-400">
              合計容量: {formatBytes(tracks.reduce((acc, t) => acc + (t.fileSize || 0), 0))}
            </span>
          </div>

          {tracks.length > 0 && (
            <button
              onClick={() => setIsDeleteAllModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/30 rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              音源をすべて消去
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-4">再生</th>
                <th className="py-2.5 px-4">音源名</th>
                <th className="py-2.5 px-4">カテゴリー</th>
                <th className="py-2.5 px-4">キー</th>
                <th className="py-2.5 px-4">長さ</th>
                <th className="py-2.5 px-4">音量</th>
                <th className="py-2.5 px-4">サイズ</th>
                <th className="py-2.5 px-4">ループ</th>
                <th className="py-2.5 px-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {tracks.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 font-sans text-xs">
                    音源はまだ登録されていません。上のエリアから音楽ファイルを追加してください。
                  </td>
                </tr>
              ) : (
                tracks.map((track) => {
                const isPlaying = activeStates[track.id]?.status === 'playing';

                return (
                  <tr key={track.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Play/Stop button */}
                    <td className="py-2 px-4 whitespace-nowrap">
                      <button
                        onClick={() => {
                          if (isPlaying) onStopTrack(track.id);
                          else onPlayTrack(track);
                        }}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          isPlaying
                            ? 'bg-amber-500 border-amber-400 text-slate-950'
                            : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                        }`}
                        title={isPlaying ? '停止' : '試聴'}
                      >
                        {isPlaying ? (
                          <Square className="w-3.5 h-3.5 fill-current" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                        )}
                      </button>
                    </td>

                    {/* Title */}
                    <td className="py-2 px-4 font-sans font-medium text-slate-200">
                      <div>
                        <span>{track.title}</span>
                        {track.isPreset && (
                          <span className="ml-2 text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                            プリセット
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-2 px-4 font-sans text-slate-400 whitespace-nowrap">
                      {track.categoryLabel || track.category}
                    </td>

                    {/* Shortcut */}
                    <td className="py-2 px-4 whitespace-nowrap">
                      {track.shortcut ? (
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-bold">
                          {track.shortcut}
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>

                    {/* Duration */}
                    <td className="py-2 px-4 tabular-nums whitespace-nowrap">
                      {formatDuration(track.duration)}
                    </td>

                    {/* Volume */}
                    <td className="py-2 px-4 tabular-nums whitespace-nowrap">
                      <span className={track.volume > 1.0 ? 'text-amber-400 font-bold' : 'text-slate-300'}>
                        {Math.round((track.volume ?? 0.85) * 100)}%
                        {track.volume > 1.0 && '⚡'}
                      </span>
                    </td>

                    {/* File Size */}
                    <td className="py-2 px-4 tabular-nums text-slate-400 whitespace-nowrap">
                      {formatBytes(track.fileSize)}
                    </td>

                    {/* Loop */}
                    <td className="py-2 px-4 whitespace-nowrap font-sans">
                      {track.loop ? (
                        <span className="text-amber-400 text-[11px]">ON</span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">OFF</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-2 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onEditTrack(track)}
                          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                          title="設定を編集"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {track.audioBlob && (
                          <button
                            onClick={() => handleDownloadBlob(track)}
                            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                            title="音源ファイルを書き出し"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(track)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                          title="削除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal: Delete All Tracks */}
      {isDeleteAllModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-rose-500/50 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white mb-1">
                すべての音源（{tracks.length}曲）を消去しますか？
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                ブラウザのローカルストレージ（IndexedDB）に保存されているすべての音源ファイルと再生キャッシュが完全に削除されます。この操作は取り消せません。
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsDeleteAllModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                キャンセル
              </button>
              <button
                onClick={handleConfirmDeleteAll}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors shadow-lg shadow-rose-600/30 cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                すべて消去する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete Single Track */}
      {trackToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Trash2 className="w-5 h-5" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white mb-1">
                音源を削除しますか？
              </h3>
              <p className="text-xs text-slate-300 font-semibold mb-1">
                「{trackToDelete.title}」
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                この音源ファイルをライブラリから削除します。
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setTrackToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                キャンセル
              </button>
              <button
                onClick={handleConfirmDeleteSingle}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors shadow-lg shadow-rose-600/30 cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
