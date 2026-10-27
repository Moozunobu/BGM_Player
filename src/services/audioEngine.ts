import { SoundTrack, ActiveTrackState } from '../types';

interface PlayingNodeInstance {
  source?: AudioBufferSourceNode;
  audioEl?: HTMLAudioElement;
  hasMediaElementSource?: boolean;
  gainNode: GainNode;
  startTime: number;
  pauseOffset: number;
  track: SoundTrack;
  fadeTimer?: number;
  blobUrl?: string;
}

type StateListener = (states: Record<string, ActiveTrackState>) => void;

/**
 * Sniffs binary magic bytes from the ArrayBuffer to accurately identify the container format.
 * Prevents HTML5 Audio "The operation is not supported" errors caused by wrong MIME types.
 */
export function detectAudioMimeFromBytes(buffer: ArrayBuffer, fallbackMime?: string): string {
  if (!buffer || buffer.byteLength < 4) {
    return fallbackMime || 'audio/mpeg';
  }
  const bytes = new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 32));

  // WAV: "RIFF" .... "WAVE"
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
    return 'audio/wav';
  }

  // OGG: "OggS"
  if (bytes[0] === 0x4f && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53) {
    return 'audio/ogg';
  }

  // FLAC: "fLaC"
  if (bytes[0] === 0x46 && bytes[1] === 0x4c && bytes[2] === 0x61 && bytes[3] === 0x43) {
    return 'audio/flac';
  }

  // MP3 with ID3v2: "ID3"
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    return 'audio/mpeg';
  }

  // MP3 raw frame sync: 0xFF followed by 0xFB, 0xF3, 0xF2, 0xFA
  if (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) {
    return 'audio/mpeg';
  }

  // MP4 / M4A / AAC / QuickTime MOV: bytes 4-8 contain "ftyp", "moov", "mdat", or "wide"
  if (buffer.byteLength >= 8) {
    const box = String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7]);
    if (box === 'ftyp' || box === 'moov' || box === 'mdat' || box === 'wide') {
      return fallbackMime && fallbackMime.includes('quicktime') ? 'video/quicktime' : 'audio/mp4';
    }
  }

  // AIFF: "FORM" .... "AIFF"
  if (bytes[0] === 0x46 && bytes[1] === 0x4f && bytes[2] === 0x52 && bytes[3] === 0x4d) {
    return 'audio/aiff';
  }

  return fallbackMime || 'audio/mpeg';
}

/**
 * Robust extraction of binary ArrayBuffer from a SoundTrack, handling both
 * stored audioData (immune to Chromium file detach bugs) and audioBlob fallbacks.
 */
export async function getArrayBufferFromTrack(track: SoundTrack): Promise<ArrayBuffer | null> {
  // 1. Direct ArrayBuffer in track
  if (track.audioData && track.audioData.byteLength > 0) {
    return track.audioData;
  }

  // 2. From audioBlob
  const blob = track.audioBlob;
  if (!blob || !(blob instanceof Blob) || blob.size === 0) {
    return null;
  }

  // Method A: blob.arrayBuffer()
  if (typeof blob.arrayBuffer === 'function') {
    try {
      const buf = await blob.arrayBuffer();
      if (buf && buf.byteLength > 0) return buf;
    } catch {}
  }

  // Method B: Response(blob).arrayBuffer()
  if (typeof Response !== 'undefined') {
    try {
      const buf = await new Response(blob).arrayBuffer();
      if (buf && buf.byteLength > 0) return buf;
    } catch {}
  }

  // Method C: FileReader
  if (typeof FileReader !== 'undefined') {
    try {
      const buf = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(blob);
      });
      if (buf && buf.byteLength > 0) return buf;
    } catch {}
  }

  return null;
}

/**
 * Universal safe wrapper around ctx.decodeAudioData supporting both modern Promise
 * and legacy callback APIs, always copying the buffer to prevent detachment errors.
 */
export function decodeAudioDataSafe(ctx: AudioContext, buffer: ArrayBuffer): Promise<AudioBuffer> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const onSuccess = (decoded: AudioBuffer) => {
      if (!settled) {
        settled = true;
        resolve(decoded);
      }
    };
    const onError = (error: any) => {
      if (!settled) {
        settled = true;
        reject(error || new Error('音声データのデコードに失敗しました'));
      }
    };

    try {
      const slice = buffer.slice(0);
      const res = ctx.decodeAudioData(slice, onSuccess, onError);
      if (res && typeof (res as any).then === 'function') {
        (res as any).then(onSuccess).catch(onError);
      }
    } catch (e) {
      onError(e);
    }
  });
}

export function getAudioMimeType(fileName?: string, defaultType?: string): string {
  if (
    defaultType &&
    defaultType.startsWith('audio/') &&
    defaultType !== 'audio/mpeg' &&
    defaultType !== 'application/octet-stream'
  ) {
    return defaultType;
  }
  if (!fileName) return defaultType || 'audio/mpeg';

  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'wav':
    case 'wave':
      return 'audio/wav';
    case 'mp3':
      return 'audio/mpeg';
    case 'ogg':
    case 'oga':
      return 'audio/ogg';
    case 'm4a':
      return 'audio/mp4';
    case 'mp4':
      return 'audio/mp4';
    case 'mov':
    case 'qt':
      return 'video/quicktime';
    case 'aac':
      return 'audio/aac';
    case 'flac':
      return 'audio/flac';
    case 'weba':
    case 'webm':
      return 'audio/webm';
    case 'aif':
    case 'aiff':
      return 'audio/aiff';
    default:
      return defaultType || 'audio/mpeg';
  }
}

export function ensureCorrectBlobMime(blob: Blob, fileName?: string): Blob {
  if (!fileName) return blob;
  const targetMime = getAudioMimeType(fileName, blob.type);
  if (blob.type === targetMime) return blob;
  try {
    return new Blob([blob], { type: targetMime });
  } catch {
    return blob;
  }
}

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private bufferCache: Map<string, AudioBuffer> = new Map();
  private activeNodes: Map<string, PlayingNodeInstance> = new Map();
  private trackStates: Record<string, ActiveTrackState> = {};
  private listeners: Set<StateListener> = new Set();
  private masterVolume: number = 1.0;
  private isMuted: boolean = false;
  private updateInterval: number | null = null;

  public init(): AudioContext {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master Compressor to protect PA equipment
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-6, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(12, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(4, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(
        this.isMuted ? 0 : this.masterVolume,
        this.ctx.currentTime
      );

      this.masterGain.connect(this.compressor);
      this.compressor.connect(this.ctx.destination);

      this.startProgressTracker();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public async resume(): Promise<void> {
    const ctx = this.init();
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch (e) {
        console.warn('AudioContext resume warning:', e);
      }
    }
  }

  public isSuspended(): boolean {
    return !this.ctx || this.ctx.state === 'suspended';
  }

  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener({ ...this.trackStates });
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const copy = { ...this.trackStates };
    this.listeners.forEach((fn) => fn(copy));
  }

  private startProgressTracker() {
    if (this.updateInterval) return;
    this.updateInterval = window.setInterval(() => {
      let changed = false;
      const now = this.ctx ? this.ctx.currentTime : 0;

      // Auto-resume if browser unexpectedly suspended context while audio should be playing
      if (this.ctx && this.ctx.state === 'suspended' && this.activeNodes.size > 0) {
        this.ctx.resume().catch(() => {});
      }

      for (const [trackId, instance] of this.activeNodes.entries()) {
        const state = this.trackStates[trackId];
        if (state && (state.status === 'playing' || state.status === 'fading_out')) {
          let current = 0;
          const duration = state.duration || 1;

          if (instance.audioEl) {
            current = instance.audioEl.currentTime || 0;
          } else if (instance.source) {
            const elapsed = Math.max(0, now - instance.startTime + instance.pauseOffset);
            if (instance.track.loop) {
              current = elapsed % duration;
            } else {
              current = Math.min(elapsed, duration);
            }
          }

          state.currentTime = current;
          changed = true;
        }
      }

      if (changed) {
        this.notify();
      }
    }, 50);
  }

  public async preloadTrack(track: SoundTrack): Promise<AudioBuffer | null> {
    if (this.bufferCache.has(track.id)) {
      return this.bufferCache.get(track.id)!;
    }

    // Skip pre-decoding large BGM files (>8MB or >60s) into uncompressed RAM;
    // they stream directly via HTML5 Audio with near-zero memory footprint.
    const isLargeFile = Boolean(track.fileSize && track.fileSize > 8 * 1024 * 1024);
    const isLongTrack = Boolean(track.duration && track.duration > 60);
    if ((isLargeFile || isLongTrack) && track.category !== 'effects') {
      return null;
    }

    try {
      const arrayBuffer = await getArrayBufferFromTrack(track);
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        return null;
      }

      const ctx = this.init();
      const audioBuffer = await decodeAudioDataSafe(ctx, arrayBuffer);
      if (!audioBuffer) return null;

      // Keep cache size bounded (max 15 items) to prevent browser memory exhaustion
      if (this.bufferCache.size >= 15) {
        const oldestKey = this.bufferCache.keys().next().value;
        if (oldestKey) this.bufferCache.delete(oldestKey);
      }

      this.bufferCache.set(track.id, audioBuffer);
      return audioBuffer;
    } catch (err) {
      console.warn(`[FestCue AudioEngine] Preload decode skipped for "${track.title}":`, err);
      return null;
    }
  }

  public setMasterVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(1.5, vol));
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
    }
    for (const instance of this.activeNodes.values()) {
      if (instance.audioEl && !instance.hasMediaElementSource) {
        instance.audioEl.volume = Math.min(
          1,
          (instance.track.volume ?? 0.85) * (this.isMuted ? 0 : this.masterVolume)
        );
      }
    }
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.setValueAtTime(muted ? 0 : this.masterVolume, this.ctx.currentTime);
    }
    for (const instance of this.activeNodes.values()) {
      if (instance.audioEl && !instance.hasMediaElementSource) {
        instance.audioEl.volume = muted
          ? 0
          : Math.min(1, (instance.track.volume ?? 0.85) * this.masterVolume);
      }
    }
  }

  public setTrackVolume(trackId: string, volume: number) {
    const clamped = Math.max(0, Math.min(2.0, volume));
    const instance = this.activeNodes.get(trackId);
    if (instance) {
      if (this.ctx && instance.gainNode) {
        instance.gainNode.gain.cancelScheduledValues(this.ctx.currentTime);
        instance.gainNode.gain.setValueAtTime(clamped, this.ctx.currentTime);
      }
      if (instance.audioEl && !instance.hasMediaElementSource) {
        instance.audioEl.volume = Math.min(
          1,
          Math.min(1.0, clamped) * (this.isMuted ? 0 : this.masterVolume)
        );
      }
    }
    if (this.trackStates[trackId]) {
      this.trackStates[trackId].volume = clamped;
      this.notify();
    }
  }

  private startWebAudioNode(
    track: SoundTrack,
    buffer: AudioBuffer,
    ctx: AudioContext,
    targetVol: number,
    fadeIn: number,
    offset: number
  ) {
    if (!buffer || buffer.length === 0) {
      throw new Error('音声バッファが無効です');
    }

    const gainNode = ctx.createGain();
    const startTime = ctx.currentTime;
    if (fadeIn > 0) {
      gainNode.gain.setValueAtTime(0.0001, startTime);
      gainNode.gain.linearRampToValueAtTime(targetVol, startTime + fadeIn);
    } else {
      gainNode.gain.setValueAtTime(targetVol, startTime);
    }
    if (!this.masterGain) {
      this.init();
    }
    gainNode.connect(this.masterGain!);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = Boolean(track.loop);
    source.connect(gainNode);

    // Clamp safe offset
    const safeOffset = Math.max(0, Math.min(Math.max(0, buffer.duration - 0.05), offset));

    const instance: PlayingNodeInstance = {
      source,
      gainNode,
      startTime,
      pauseOffset: safeOffset,
      track,
    };

    source.onended = () => {
      if (this.activeNodes.get(track.id) === instance) {
        this.activeNodes.delete(track.id);
        this.trackStates[track.id] = {
          trackId: track.id,
          status: 'idle',
          currentTime: 0,
          duration: buffer.duration,
          volume: targetVol,
          loop: track.loop,
        };
        this.notify();
      }
    };

    try {
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      if (safeOffset > 0) {
        source.start(0, safeOffset);
      } else {
        source.start(0);
      }
    } catch (startErr) {
      console.warn('source.start execution warning:', startErr);
    }
    this.activeNodes.set(track.id, instance);

    this.trackStates[track.id] = {
      trackId: track.id,
      status: 'playing',
      currentTime: safeOffset,
      duration: buffer.duration,
      volume: targetVol,
      loop: track.loop,
    };
    this.notify();
  }

  public async decodeTrackDirectly(track: SoundTrack): Promise<AudioBuffer | null> {
    if (this.bufferCache.has(track.id)) {
      return this.bufferCache.get(track.id)!;
    }

    try {
      const arrayBuffer = await getArrayBufferFromTrack(track);
      if (!arrayBuffer || arrayBuffer.byteLength === 0) return null;

      const ctx = this.init();
      const audioBuffer = await decodeAudioDataSafe(ctx, arrayBuffer);
      if (audioBuffer) {
        this.bufferCache.set(track.id, audioBuffer);
        return audioBuffer;
      }
      return null;
    } catch (err) {
      console.warn(`[FestCue AudioEngine] Direct decode failed for "${track.title}":`, err);
      return null;
    }
  }

  /**
   * Instant Playback:
   * First tries Web Audio if cached, then direct Web Audio decode (0ms latency, handles all audio formats),
   * with secondary fallback to streaming HTML5 Audio using byte-level sniffed MIME container types.
   */
  public async playTrack(
    track: SoundTrack,
    options?: {
      soloBgmMode?: boolean;
      offsetSec?: number;
      fadeInSec?: number;
    }
  ) {
    const ctx = this.init();
    // Synchronously initiate resume within the direct user interaction call stack
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch (e) {
        console.warn('AudioContext initial resume warning:', e);
      }
    }

    // Solo BGM mode: fade out other active BGMs
    const isBgm = track.category !== 'effects' && track.category !== 'announcement';
    if (options?.soloBgmMode && isBgm) {
      for (const [id, instance] of this.activeNodes.entries()) {
        if (id !== track.id) {
          const otherIsBgm =
            instance.track.category !== 'effects' && instance.track.category !== 'announcement';
          if (otherIsBgm) {
            this.fadeOutTrack(id, 1.2);
          }
        }
      }
    }

    // Stop current instance of this track if already playing
    this.stopTrack(track.id, false);

    const targetVol = Math.max(0, Math.min(2.0, track.volume ?? 0.85));
    const isEffect = track.category === 'effects' || (track.duration !== undefined && track.duration <= 10);
    const fadeIn = isEffect ? 0 : (options?.fadeInSec ?? track.fadeInSec ?? 0);
    const offset = Math.max(0, options?.offsetSec ?? 0);

    try {
      // 1. If buffer is already in memory cache, start via Web Audio immediately (0ms latency)
      let buffer = this.bufferCache.get(track.id);
      if (buffer) {
        if (ctx.state === 'suspended') await ctx.resume().catch(() => {});
        this.startWebAudioNode(track, buffer, ctx, targetVol, fadeIn, offset);
        return;
      }

      // 2. Extract valid ArrayBuffer bytes from track (audioData or audioBlob)
      const arrayBuffer = await getArrayBufferFromTrack(track);

      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        import('./db').then(({ deleteTrack }) => deleteTrack(track.id)).catch(() => {});
        throw new Error('音源データが破損していたため自動クリーンアップしました。お手数ですがファイルを再登録してください。');
      }

      // 3. Detect true MIME type from the magic bytes in the arrayBuffer
      const trueMime = detectAudioMimeFromBytes(arrayBuffer, track.audioBlob?.type);

      // 4. PRIMARY: Decode directly with Web Audio (bypasses MIME issues, iframe restrictions, codec bugs)
      try {
        if (ctx.state === 'suspended') await ctx.resume().catch(() => {});
        const decodedBuffer = await decodeAudioDataSafe(ctx, arrayBuffer);

        if (decodedBuffer) {
          // Bound memory cache to 15 items
          if (this.bufferCache.size >= 15) {
            const oldestKey = this.bufferCache.keys().next().value;
            if (oldestKey) this.bufferCache.delete(oldestKey);
          }
          this.bufferCache.set(track.id, decodedBuffer);

          this.startWebAudioNode(track, decodedBuffer, ctx, targetVol, fadeIn, offset);
          return;
        }
      } catch (decodeErr) {
        console.warn(
          `[FestCue AudioEngine] Direct Web Audio decode failed for "${track.title}", attempting HTML5 Audio fallback:`,
          decodeErr
        );
      }

      // 5. SECONDARY: Fallback to HTML5 streaming Audio with guaranteed correct MIME type
      try {
        const freshBlob = new Blob([arrayBuffer], { type: trueMime });
        const blobUrl = URL.createObjectURL(freshBlob);
        const audioEl = new Audio();
        audioEl.src = blobUrl;
        audioEl.preload = 'auto';
        audioEl.loop = track.loop;
        audioEl.volume = Math.min(1, targetVol * (this.isMuted ? 0 : this.masterVolume));

        if (offset > 0) {
          if (audioEl.readyState >= 1) {
            audioEl.currentTime = offset;
          } else {
            audioEl.onloadedmetadata = () => {
              try {
                audioEl.currentTime = offset;
              } catch {}
            };
          }
        }

        const gainNode = ctx.createGain();
        gainNode.connect(this.masterGain!);

        const instance: PlayingNodeInstance = {
          audioEl,
          hasMediaElementSource: false,
          gainNode,
          startTime: ctx.currentTime,
          pauseOffset: offset,
          track,
          blobUrl,
        };

        audioEl.onended = () => {
          if (this.activeNodes.get(track.id) === instance) {
            this.stopTrack(track.id, true);
          }
        };

        await audioEl.play();

        this.activeNodes.set(track.id, instance);
        this.trackStates[track.id] = {
          trackId: track.id,
          status: 'playing',
          currentTime: offset,
          duration: track.duration || 30,
          volume: targetVol,
          loop: track.loop,
        };
        this.notify();
        return;
      } catch (html5Err) {
        console.warn(
          `[FestCue AudioEngine] HTML5 Audio also failed for "${track.title}":`,
          html5Err
        );
      }

      throw new Error('音声フォーマットに対応していないか、データが破損しています。ファイルを再度アップロードしてください。');
    } catch (err) {
      console.warn(`[FestCue AudioEngine] Playback warning for "${track.title}":`, err);
      // Clean up and reset status to 'idle' so it never gets stuck in "再生中..."
      this.stopTrack(track.id, true);
      this.trackStates[track.id] = {
        trackId: track.id,
        status: 'idle',
        currentTime: 0,
        duration: track.duration || 1,
        volume: targetVol,
        loop: track.loop,
      };
      this.notify();

      window.dispatchEvent(
        new CustomEvent('festcue-play-error', {
          detail: {
            title: track.title,
            error:
              err instanceof Error
                ? err.message
                : '音声の再生を開始できませんでした。ブラウザの音声許可を確認してください。',
          },
        })
      );
    }
  }

  public seekTrack(track: SoundTrack, targetSec: number) {
    const clampedSec = Math.max(0, Math.min(track.duration || 1, targetSec));
    const isPlaying = this.isTrackPlaying(track.id);
    const instance = this.activeNodes.get(track.id);

    if (isPlaying && instance?.audioEl) {
      instance.audioEl.currentTime = clampedSec;
      if (this.trackStates[track.id]) {
        this.trackStates[track.id].currentTime = clampedSec;
        this.notify();
      }
    } else if (isPlaying) {
      this.playTrack(track, { offsetSec: clampedSec });
    } else {
      const prev = this.trackStates[track.id];
      this.trackStates[track.id] = {
        ...(prev || {
          trackId: track.id,
          duration: track.duration || 1,
          volume: track.volume ?? 0.85,
          loop: track.loop,
        }),
        status: 'idle',
        currentTime: clampedSec,
      };
      this.notify();
    }
  }

  public fadeOutTrack(trackId: string, durationSec = 2.5) {
    const instance = this.activeNodes.get(trackId);
    if (!instance || !this.ctx) return;

    if (durationSec <= 0.05) {
      this.stopTrack(trackId, true);
      return;
    }

    const ctx = this.ctx;
    const now = ctx.currentTime;
    const currentGain = Math.max(instance.gainNode.gain.value, 0.001);

    if (this.trackStates[trackId]) {
      this.trackStates[trackId].status = 'fading_out';
      this.notify();
    }

    instance.gainNode.gain.cancelScheduledValues(now);
    instance.gainNode.gain.setValueAtTime(currentGain, now);
    instance.gainNode.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    // Only if using direct audioEl without web audio routing
    if (instance.audioEl && !instance.hasMediaElementSource) {
      const startVol = instance.audioEl.volume;
      const startTime = Date.now();
      const interval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        if (elapsed >= durationSec || !this.activeNodes.has(trackId)) {
          clearInterval(interval);
          if (instance.audioEl) instance.audioEl.volume = 0;
        } else {
          if (instance.audioEl) {
            instance.audioEl.volume = Math.max(0, startVol * (1 - elapsed / durationSec));
          }
        }
      }, 50);
    }

    if (instance.fadeTimer) {
      window.clearTimeout(instance.fadeTimer);
    }

    instance.fadeTimer = window.setTimeout(() => {
      this.stopTrack(trackId, true);
    }, durationSec * 1000 + 40);
  }

  public stopTrack(trackId: string, resetTime = true) {
    const instance = this.activeNodes.get(trackId);
    if (instance) {
      if (instance.fadeTimer) {
        window.clearTimeout(instance.fadeTimer);
      }
      if (instance.source) {
        try {
          instance.source.stop();
          instance.source.disconnect();
        } catch {
          // ignore
        }
      }
      if (instance.audioEl) {
        try {
          instance.audioEl.pause();
          instance.audioEl.currentTime = 0;
          instance.audioEl.src = '';
        } catch {
          // ignore
        }
      }
      if (instance.blobUrl) {
        try {
          URL.revokeObjectURL(instance.blobUrl);
        } catch {
          // ignore
        }
      }
      try {
        instance.gainNode.disconnect();
      } catch {
        // ignore
      }
      this.activeNodes.delete(trackId);
    }

    const state = this.trackStates[trackId];
    if (state) {
      this.trackStates[trackId] = {
        ...state,
        status: 'idle',
        currentTime: resetTime ? 0 : state.currentTime,
      };
      this.notify();
    }
  }

  public panicStopAll() {
    for (const trackId of Array.from(this.activeNodes.keys())) {
      this.stopTrack(trackId, true);
    }
  }

  public fadeOutAll(fadeSec = 2.5) {
    for (const trackId of Array.from(this.activeNodes.keys())) {
      this.fadeOutTrack(trackId, fadeSec);
    }
  }

  public isTrackPlaying(trackId: string): boolean {
    return this.activeNodes.has(trackId);
  }

  public getTrackState(trackId: string): ActiveTrackState | undefined {
    return this.trackStates[trackId];
  }

  public clearAll() {
    this.panicStopAll();
    this.bufferCache.clear();
    this.trackStates = {};
    this.notify();
  }
}

export const audioEngine = new AudioEngine();
