import React from 'react';
import { X, Wifi, WifiOff, CheckCircle2, AlertTriangle, HardDrive } from 'lucide-react';

interface OfflineGuideModalProps {
  onClose: () => void;
  trackCount: number;
}

export const OfflineGuideModal: React.FC<OfflineGuideModalProps> = ({ onClose, trackCount }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">オフライン安心ガイド</h3>
              <span className="text-[11px] text-slate-400">本番当日（体育館・ステージ・放送室）の使い方</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs text-slate-300">
          {/* Answer Box */}
          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
            <h4 className="font-bold text-emerald-300 text-sm mb-1 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              事前に曲を入れておけば、オフラインで全く問題ありません！
            </h4>
            <p className="text-slate-300 leading-relaxed text-xs">
              アップロードした音源ファイルは、サーバーではなく<strong>お使いのパソコンのブラウザ内（IndexedDB）</strong>に丸ごと保存されています。
              本番当日にインターネット接続（Wi-Fi）がなくても、そのまま瞬時に音を鳴らすことができます。
            </p>
          </div>

          {/* Three key points */}
          <div className="space-y-3">
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-start gap-3">
              <HardDrive className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-100 font-semibold block mb-0.5">
                  1. 本番で操作するパソコンでアップロードする
                </strong>
                <span className="text-slate-400 leading-relaxed block">
                  曲データは「そのPCのブラウザ」に保存されるため、本番当日に会場で音響卓に繋ぐパソコンで事前に登録してください。
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-start gap-3">
              <WifiOff className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-100 font-semibold block mb-0.5">
                  2. ネットが切れてもページが開けます（キャッシュ対応）
                </strong>
                <span className="text-slate-400 leading-relaxed block">
                  Service Workerによるオフラインキャッシュを搭載しているため、事前に一度このページを開いておけば、電波のない場所でもそのまま開いて動作します。
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-100 font-semibold block mb-0.5">
                  3. ブラウザの履歴・データ消去を行わない
                </strong>
                <span className="text-slate-400 leading-relaxed block">
                  「閲覧履歴データの消去」でCookieやサイトデータを消してしまうと保存した曲も消去されます。文化祭本番が終わるまではブラウザデータを削除しないでください。
                </span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-lg flex items-center justify-between text-slate-400">
            <span>現在の端末内保存曲数:</span>
            <span className="font-mono tabular-nums font-bold text-amber-400">
              {trackCount} 曲 保存済み
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors"
          >
            確認しました
          </button>
        </div>
      </div>
    </div>
  );
};
