/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { MasterControlBar } from './components/MasterControlBar';
import { SoundboardView } from './components/SoundboardView';
import { CueSheetView } from './components/CueSheetView';
import { FileManagerView } from './components/FileManagerView';
import { TrackEditModal } from './components/TrackEditModal';
import { ShortcutsHelpModal } from './components/ShortcutsHelpModal';
import { SoundTrack, CueItem, AppSettings, ActiveTrackState } from './types';
import {
  initializeDatabase,
  getAllTracks,
  saveTrack,
  saveSettings,
  saveAllCues,
} from './services/db';
import { audioEngine } from './services/audioEngine';

export default function App() {
  const [tracks, setTracks] = useState<SoundTrack[]>([]);
  const [cues, setCues] = useState<CueItem[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    masterVolume: 1.0,
    isMuted: false,
    soloBgmMode: false,
    keyboardShortcutsEnabled: true,
    defaultFadeOutSec: 2.5,
    themeMode: 'stage',
  });
  const [activeStates, setActiveStates] = useState<Record<string, ActiveTrackState>>({});
  const [currentTab, setCurrentTab] = useState<'soundboard' | 'cuesheet' | 'files'>('soundboard');
  const [editingTrack, setEditingTrack] = useState<SoundTrack | null>(null);
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize DB & AudioEngine on mount
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    async function bootstrap() {
      try {
        const { tracks: loadedTracks, cues: loadedCues, settings: loadedSettings } =
          await initializeDatabase();
        setTracks(loadedTracks);
        setCues(loadedCues);
        const effectiveSettings = {
          ...loadedSettings,
          soloBgmMode: false, // Ensure simultaneous BGM playback is enabled by default
        };
        setSettings(effectiveSettings);

        audioEngine.setMasterVolume(loadedSettings.masterVolume);
        audioEngine.setMute(loadedSettings.isMuted);

        // Preload audio buffers in background for instant trigger response
        loadedTracks.forEach((t) => {
          audioEngine.preloadTrack(t).catch(() => {});
        });

        unsubscribe = audioEngine.subscribe((states) => {
          setActiveStates(states);
        });
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    bootstrap();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const refreshTracks = async () => {
    const all = await getAllTracks();
    setTracks(all);
    all.forEach((t) => audioEngine.preloadTrack(t).catch(() => {}));
  };

  // Playback Handlers
  const handlePlayTrack = useCallback(
    (track: SoundTrack) => {
      audioEngine.playTrack(track, {
        soloBgmMode: settings.soloBgmMode,
        fadeInSec: track.fadeInSec,
      });
    },
    [settings.soloBgmMode]
  );

  const handleStopTrack = useCallback((trackId: string) => {
    audioEngine.stopTrack(trackId, true);
  }, []);

  const handleFadeOutTrack = useCallback((trackId: string, durationSec = 2.5) => {
    audioEngine.fadeOutTrack(trackId, durationSec);
  }, []);

  const handleSeekTrack = useCallback((track: SoundTrack, targetSec: number) => {
    audioEngine.seekTrack(track, targetSec);
  }, []);

  const handleToggleLoop = useCallback(
    async (trackId: string) => {
      const track = tracks.find((t) => t.id === trackId);
      if (!track) return;
      const updated = { ...track, loop: !track.loop };
      await saveTrack(updated);
      setTracks((prev) => prev.map((t) => (t.id === trackId ? updated : t)));
    },
    [tracks]
  );

  const volumeDebounceRef = useRef<Record<string, number>>({});

  const handleTrackVolumeChange = useCallback(
    (trackId: string, volume: number) => {
      audioEngine.setTrackVolume(trackId, volume);
      setTracks((prev) =>
        prev.map((t) => (t.id === trackId ? { ...t, volume } : t))
      );

      // Debounce saving to IndexedDB so dragging volume slider is 100% fluid without DB lock
      if (volumeDebounceRef.current[trackId]) {
        window.clearTimeout(volumeDebounceRef.current[trackId]);
      }
      volumeDebounceRef.current[trackId] = window.setTimeout(async () => {
        const all = await getAllTracks();
        const target = all.find((t) => t.id === trackId);
        if (target) {
          await saveTrack({ ...target, volume });
        }
      }, 350);
    },
    []
  );

  const handleFadeSecChange = useCallback(
    async (trackId: string, fadeOutSec: number) => {
      const track = tracks.find((t) => t.id === trackId);
      if (!track) return;
      const updated = { ...track, fadeOutSec };
      await saveTrack(updated);
      setTracks((prev) => prev.map((t) => (t.id === trackId ? updated : t)));
    },
    [tracks]
  );

  // Master Controls
  const masterVolDebounceRef = useRef<number | null>(null);

  const handleMasterVolumeChange = useCallback(
    (vol: number) => {
      audioEngine.setMasterVolume(vol);
      setSettings((prev) => {
        const updated = { ...prev, masterVolume: vol, isMuted: false };
        if (masterVolDebounceRef.current) {
          window.clearTimeout(masterVolDebounceRef.current);
        }
        masterVolDebounceRef.current = window.setTimeout(() => {
          saveSettings(updated);
        }, 300);
        return updated;
      });
    },
    []
  );

  const handleMasterFadeSecChange = useCallback((sec: number) => {
    setSettings((prev) => {
      const updated = { ...prev, defaultFadeOutSec: sec };
      saveSettings(updated);
      return updated;
    });
  }, []);

  const handleToggleMute = useCallback(() => {
    const newMuted = !settings.isMuted;
    audioEngine.setMute(newMuted);
    const updated = { ...settings, isMuted: newMuted };
    setSettings(updated);
    saveSettings(updated);
  }, [settings]);

  const handleToggleSoloBgm = useCallback(() => {
    const newSolo = !settings.soloBgmMode;
    const updated = { ...settings, soloBgmMode: newSolo };
    setSettings(updated);
    saveSettings(updated);
  }, [settings]);

  const handlePanicStopAll = useCallback(() => {
    audioEngine.panicStopAll();
  }, []);

  const handleFadeOutAll = useCallback((fadeSec?: number) => {
    audioEngine.fadeOutAll(fadeSec ?? settings.defaultFadeOutSec ?? 2.5);
  }, [settings.defaultFadeOutSec]);

  // Track Save
  const handleSaveTrack = useCallback(async (updated: SoundTrack) => {
    await saveTrack(updated);
    setTracks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    audioEngine.preloadTrack(updated).catch(() => {});
  }, []);

  // Cue Sheet Handlers
  const handleUpdateCues = useCallback(async (newCues: CueItem[]) => {
    setCues(newCues);
    await saveAllCues(newCues);
  }, []);

  const handleTriggerNextCue = useCallback(() => {
    const nextIndex = cues.findIndex((c) => !c.completed);
    if (nextIndex < 0) return;

    const cue = cues[nextIndex];
    if (cue.trackId) {
      const track = tracks.find((t) => t.id === cue.trackId);
      if (track) {
        audioEngine.playTrack(track, {
          soloBgmMode: settings.soloBgmMode,
          fadeInSec: track.fadeInSec,
        });
      }
    }

    // Mark completed
    const updated = cues.map((c, i) => (i === nextIndex ? { ...c, completed: true } : c));
    handleUpdateCues(updated);
  }, [cues, tracks, settings.soloBgmMode, handleUpdateCues]);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing inside an input/textarea/select
      const activeEl = document.activeElement;
      const isInput =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT');

      if (isInput) return;

      // Escape closes open modals
      if (e.key === 'Escape') {
        if (editingTrack) setEditingTrack(null);
        if (isShortcutsHelpOpen) setIsShortcutsHelpOpen(false);
        return;
      }

      // If shortcuts disabled
      if (!settings.keyboardShortcutsEnabled) return;

      // Space: Trigger Next Cue
      if (e.code === 'Space') {
        e.preventDefault();
        handleTriggerNextCue();
        return;
      }

      // Check single character shortcuts
      const key = e.key.toUpperCase();
      const matchedTrack = tracks.find((t) => t.shortcut?.toUpperCase() === key);
      if (matchedTrack) {
        e.preventDefault();
        if (audioEngine.isTrackPlaying(matchedTrack.id)) {
          audioEngine.stopTrack(matchedTrack.id, true);
        } else {
          audioEngine.playTrack(matchedTrack, {
            soloBgmMode: settings.soloBgmMode,
            fadeInSec: matchedTrack.fadeInSec,
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    tracks,
    settings.keyboardShortcutsEnabled,
    settings.soloBgmMode,
    handlePanicStopAll,
    handleFadeOutAll,
    handleTriggerNextCue,
  ]);

  const activePlayingCount = Object.values(activeStates).filter(
    (s) => s.status === 'playing' || s.status === 'fading_out'
  ).length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono tracking-wider text-slate-300">
          FestCue コンソール初期化中...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Header */}
      <Header
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onOpenShortcuts={() => setIsShortcutsHelpOpen(true)}
        trackCount={tracks.length}
      />

      {/* Master PA Control Bar */}
      <MasterControlBar
        masterVolume={settings.masterVolume}
        onVolumeChange={handleMasterVolumeChange}
        isMuted={settings.isMuted}
        onToggleMute={handleToggleMute}
        onFadeOutAll={handleFadeOutAll}
        masterFadeSec={settings.defaultFadeOutSec || 2.5}
        onMasterFadeSecChange={handleMasterFadeSecChange}
        activePlayingCount={activePlayingCount}
        soloBgmMode={settings.soloBgmMode}
        onToggleSoloBgm={handleToggleSoloBgm}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8">
        {currentTab === 'soundboard' && (
          <SoundboardView
            tracks={tracks}
            activeStates={activeStates}
            onPlay={handlePlayTrack}
            onStop={handleStopTrack}
            onFadeOut={handleFadeOutTrack}
            onToggleLoop={handleToggleLoop}
            onVolumeChange={handleTrackVolumeChange}
            onFadeSecChange={handleFadeSecChange}
            onEdit={(track) => setEditingTrack(track)}
            onOpenAddModal={() => setCurrentTab('files')}
            onSeek={handleSeekTrack}
          />
        )}

        {currentTab === 'cuesheet' && (
          <CueSheetView
            cues={cues}
            tracks={tracks}
            activeStates={activeStates}
            onPlayTrack={handlePlayTrack}
            onStopTrack={handleStopTrack}
            onUpdateCues={handleUpdateCues}
            onTriggerNextCue={handleTriggerNextCue}
          />
        )}

        {currentTab === 'files' && (
          <FileManagerView
            tracks={tracks}
            activeStates={activeStates}
            onPlayTrack={handlePlayTrack}
            onStopTrack={handleStopTrack}
            onTrackUpdated={refreshTracks}
            onEditTrack={(track) => setEditingTrack(track)}
          />
        )}
      </main>

      {/* Track Edit Modal */}
      {editingTrack && (
        <TrackEditModal
          track={editingTrack}
          onSave={handleSaveTrack}
          onClose={() => setEditingTrack(null)}
        />
      )}

      {/* Keyboard Shortcuts Cheat Sheet */}
      {isShortcutsHelpOpen && (
        <ShortcutsHelpModal
          tracks={tracks}
          shortcutsEnabled={settings.keyboardShortcutsEnabled}
          onToggleShortcuts={() => {
            const next = !settings.keyboardShortcutsEnabled;
            const updated = { ...settings, keyboardShortcutsEnabled: next };
            setSettings(updated);
            saveSettings(updated);
          }}
          onClose={() => setIsShortcutsHelpOpen(false)}
        />
      )}
    </div>
  );
}
