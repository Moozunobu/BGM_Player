import React from 'react';
import { Volume2, Keyboard, ListOrdered, FolderOpen, Sliders } from 'lucide-react';
import { StageTimer } from './StageTimer';

interface HeaderProps {
  currentTab: 'soundboard' | 'cuesheet' | 'files';
  onTabChange: (tab: 'soundboard' | 'cuesheet' | 'files') => void;
  onOpenShortcuts: () => void;
  trackCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  onOpenShortcuts,
  trackCount,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-30 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
        {/* Zone 1: Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Volume2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-white font-['Plus_Jakarta_Sans']">
              FestCue
            </span>
          </div>
        </div>

        {/* Zone 2: Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-lg">
          <button
            onClick={() => onTabChange('soundboard')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              currentTab === 'soundboard'
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>ポン出しパッド</span>
          </button>

          <button
            onClick={() => onTabChange('cuesheet')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              currentTab === 'cuesheet'
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5" />
            <span>進行表・キュー</span>
          </button>

          <button
            onClick={() => onTabChange('files')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              currentTab === 'files'
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>音源ファイル ({trackCount})</span>
          </button>
        </nav>

        {/* Zone 3: Clock & Shortcuts Action */}
        <div className="flex items-center gap-2.5 shrink-0">
          <StageTimer />

          <button
            onClick={onOpenShortcuts}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 rounded-lg hover:border-slate-700 hover:text-white transition-colors whitespace-nowrap shrink-0"
            title="キーボードショートカット一覧"
          >
            <Keyboard className="w-3.5 h-3.5 text-slate-400" />
            <span>操作一覧</span>
          </button>
        </div>
      </div>
    </header>
  );
};
