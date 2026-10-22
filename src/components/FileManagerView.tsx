import React, { useRef, useState } from 'react';
import { UploadCloud, Music, Trash2, Edit3, Download, Play, Square } from 'lucide-react';
import { SoundTrack, ActiveTrackState } from '../types';
import { saveTrack, deleteTrack } from '../services/db';
import { extractWaveformPeaks } from '../services/audioEngine';

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

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsProcessing(true);
    setStatusMessage(`${files.length} 件のファイルを読み込み中...`);

    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const arrayBuf = await file.arrayBuffer();

        let duration = 30;
        let peaks: number[] | undefined;
        try {
          const decoded = await audioCtx.decodeAudioData(arrayBuf.slice(0));
          duration = decoded.duration;
          peaks = extractWaveformPeaks(decoded, 72);
        } catch (e) {
          console.warn('Could not decode audio duration, defaulting to 30s', e);
        }

        // Clean filename for title
        const cleanTitle = file.name.replace(/\.[^/.]+$/, '');

        // Determine category suggestion
        let category = 'stage';
        let categoryLabel = 'ステージ発表・転換';
        const lower = file.name.toLowerCase();
        if (lower.includes('se') || lower.includes('effect') || duration < 8) {
          category = 'effects';
          categoryLabel = '効果音・SE';
        } else if (lower.includes('chime') || lower.includes('bell') || lower.includes('announce')) {
          category = 'announcement';
          categoryLabel = '校内放送・案内';
        } else if (lower.includes('opening') || lower.includes('ending') || lower.includes('式')) {
          category = 'opening_closing';
          categoryLabel = '開会式・閉会式';
        }

        const newTrack: SoundTrack = {
          id: `custom-${Date.now()}-${i}`,
          title: cleanTitle,
          category,
          categoryLabel,
          duration,
          volume: 0.85,
          loop: duration > 15, // default long tracks to loop
          fadeInSec: 1.0,
          fadeOutSec: 2.5,
          color: 'blue',
          isPreset: false,
          audioBlob: file,
          fileName: file.name,
          fileSize: file.size,
          addedAt: Date.now(),
          notes: '文化祭持ち込み音源',
          peaks,
        };

        await saveTrack(newTrack);
      }

      onTrackUpdated();
      setStatusMessage(`${files.length} 件の音源を追加しました！`);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.error('File import error:', err);
      setStatusMessage('ファイルの読み込みに失敗しました。対応形式: MP3, WAV, AAC, M4A, OGG');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (track: SoundTrack) => {
    if (confirm(`音源「${track.title}」を削除しますか？`)) {
      await deleteTrack(track.id);
      onTrackUpdated();
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
          accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac"
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
          クリックしてファイルを選択も可能。MP3, WAV, AAC, M4A, OGG形式に対応。
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
              onClick={async () => {
                if (confirm('登録されているすべての音源ファイルを削除して初期化しますか？')) {
                  for (const t of tracks) {
                    await deleteTrack(t.id);
                  }
                  onTrackUpdated();
                }
              }}
              className="text-xs text-rose-400 hover:text-rose-300 hover:underline transition-colors"
            >
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
                <th className="py-2.5 px-4">サイズ</th>
                <th className="py-2.5 px-4">ループ</th>
                <th className="py-2.5 px-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {tracks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 font-sans text-xs">
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
    </div>
  );
};
