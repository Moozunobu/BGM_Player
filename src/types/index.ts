export type TrackCategory = 
  | 'all'
  | 'opening_closing' // 開会式・閉会式
  | 'stage'           // ステージ発表・転換
  | 'announcement'    // アナウンス・校内放送
  | 'effects'         // 効果音・SE
  | 'user';           // ユーザー音源

export type TrackColor = 
  | 'slate'
  | 'amber'
  | 'emerald'
  | 'blue'
  | 'rose'
  | 'violet'
  | 'cyan';

export interface SoundTrack {
  id: string;
  title: string;
  category: string;
  categoryLabel?: string;
  shortcut?: string; // e.g. '1', '2', 'Q', 'W'
  duration: number; // in seconds
  volume: number; // 0.0 to 1.0
  loop: boolean;
  fadeInSec: number; // 0 to 5
  fadeOutSec: number; // 0 to 5
  color: TrackColor;
  isPreset?: boolean;
  presetId?: string;
  audioBlob?: Blob; // stored in IndexedDB
  fileName?: string;
  fileSize?: number;
  addedAt: number;
  notes?: string; // memo for MC or timing
}

export type PlaybackStatus = 'idle' | 'playing' | 'paused' | 'fading_out';

export interface ActiveTrackState {
  trackId: string;
  status: PlaybackStatus;
  currentTime: number;
  duration: number;
  volume: number;
  loop: boolean;
}

export interface CueItem {
  id: string;
  order: number;
  timeSlot?: string; // e.g. "10:00"
  title: string; // e.g. "オープニング映像 & 入場"
  trackId?: string; // linked track
  note?: string; // e.g. "司会の合図で再生、暗転と同時にフェードアウト"
  completed?: boolean;
  actionType: 'play' | 'fade_stop' | 'chime' | 'pause';
}

export interface AppSettings {
  masterVolume: number; // 0.0 to 1.5
  isMuted: boolean;
  soloBgmMode: boolean; // if true, playing a BGM automatically fades/stops previous BGM (effects can still overlap)
  keyboardShortcutsEnabled: boolean;
  defaultFadeOutSec: number;
  themeMode: 'dark' | 'stage'; // high contrast stage mode
}
