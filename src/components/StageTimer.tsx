import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Clock, Timer } from 'lucide-react';

export const StageTimer: React.FC = () => {
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [stopwatchSeconds, setStopwatchSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showStopwatch, setShowStopwatch] = useState(false);

  // Live wall clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      setCurrentTimeStr(`${h}:${m}:${s}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Stopwatch interval
  useEffect(() => {
    let interval: number | undefined;
    if (isTimerRunning) {
      interval = window.setInterval(() => {
        setStopwatchSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const formatStopwatch = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300">
      {/* Wall Clock */}
      <div className="flex items-center gap-1.5 font-mono tabular-nums text-slate-200">
        <Clock className="w-3.5 h-3.5 text-amber-400" />
        <span className="font-semibold text-sm tracking-wider">{currentTimeStr || '--:--:--'}</span>
      </div>

      <div className="h-4 w-px bg-slate-800" aria-hidden="true" />

      {/* Stage Timer toggle */}
      {!showStopwatch ? (
        <button
          onClick={() => setShowStopwatch(true)}
          className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors whitespace-nowrap"
          title="ステージ進行タイマーを開く"
        >
          <Timer className="w-3.5 h-3.5" />
          <span>タイマー</span>
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <span className="font-mono tabular-nums font-bold text-amber-300 text-sm">
            {formatStopwatch(stopwatchSeconds)}
          </span>
          <button
            onClick={() => setIsTimerRunning(!isTimerRunning)}
            className={`p-1 rounded transition-colors ${
              isTimerRunning
                ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            title={isTimerRunning ? '一時停止' : 'スタート'}
          >
            {isTimerRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          </button>
          <button
            onClick={() => {
              setIsTimerRunning(false);
              setStopwatchSeconds(0);
            }}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
            title="リセット"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
          <button
            onClick={() => setShowStopwatch(false)}
            className="text-[10px] text-slate-500 hover:text-slate-400 ml-0.5"
            title="閉じる"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};
