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

      for (const [trackId, instance] of this.activeNodes.entries()) {
        const state = this.trackStates[trackId];
        if (state && (state.status === 'playing' || state.status === 'fading_out')) {
          let current = 0;
          const duration = state.duration || 1;

          if (instance.audioEl) {
            current = instance.audioEl.currentTime || 0;
          } else if (instance.source) {
            const elapsed = now - instance.startTime + instance.pauseOffset;
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
    }, 60);
  }

  public async preloadTrack(track: SoundTrack): Promise<AudioBuffer | null> {
    if (this.bufferCache.has(track.id)) {
      return this.bufferCache.get(track.id)!;
    }
    if (!track.audioBlob) return null;

    try {
      const ctx = this.init();
      const arrayBuffer = await track.audioBlob.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
      this.bufferCache.set(track.id, audioBuffer);
      return audioBuffer;
    } catch {
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
    const clamped = Math.max(0, Math.min(1.0, volume));
    const instance = this.activeNodes.get(trackId);
    if (instance) {
      if (this.ctx && instance.gainNode) {
        instance.gainNode.gain.cancelScheduledValues(this.ctx.currentTime);
        instance.gainNode.gain.setValueAtTime(clamped, this.ctx.currentTime);
      }
      if (instance.audioEl && !instance.hasMediaElementSource) {
        instance.audioEl.volume = Math.min(
          1,
          clamped * (this.isMuted ? 0 : this.masterVolume)
        );
      }
    }
    if (this.trackStates[trackId]) {
      this.trackStates[trackId].volume = clamped;
      this.notify();
    }
  }

  /**
   * Instant Playback:
   * Uses WebAudio AudioBuffer if already decoded, or HTMLAudioElement object URL
   * to guarantee instantaneous sound start with zero blocking.
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
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        // ignore
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

    const targetVol = Math.max(0, Math.min(1.0, track.volume ?? 0.85));
    const fadeIn = options?.fadeInSec ?? track.fadeInSec ?? 0;
    const offset = Math.max(0, options?.offsetSec ?? 0);
    const startTime = ctx.currentTime;

    const gainNode = ctx.createGain();
    if (fadeIn > 0) {
      gainNode.gain.setValueAtTime(0.0001, startTime);
      gainNode.gain.linearRampToValueAtTime(targetVol, startTime + fadeIn);
    } else {
      gainNode.gain.setValueAtTime(targetVol, startTime);
    }
    gainNode.connect(this.masterGain!);

    const buffer = this.bufferCache.get(track.id);

    if (buffer) {
      // 1. WebAudio AudioBufferSourceNode
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = track.loop;
      source.connect(gainNode);

      const instance: PlayingNodeInstance = {
        source,
        gainNode,
        startTime,
        pauseOffset: offset,
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

      source.start(0, offset);
      this.activeNodes.set(track.id, instance);

      this.trackStates[track.id] = {
        trackId: track.id,
        status: 'playing',
        currentTime: offset,
        duration: buffer.duration,
        volume: targetVol,
        loop: track.loop,
      };
      this.notify();
    } else if (track.audioBlob) {
      // 2. Instant Streaming via HTMLAudioElement (starts immediately without waiting for PCM decode)
      const blobUrl = URL.createObjectURL(track.audioBlob);
      const audioEl = new Audio();
      audioEl.src = blobUrl;
      audioEl.loop = track.loop;
      audioEl.currentTime = offset;

      let hasMediaElementSource = false;
      try {
        const sourceNode = ctx.createMediaElementSource(audioEl);
        sourceNode.connect(gainNode);
        hasMediaElementSource = true;
        // Keep audioEl.volume at 1.0 because gainNode handles the volume exclusively
        audioEl.volume = 1.0;
      } catch {
        // Direct audio element volume fallback if context routing unavailable
        hasMediaElementSource = false;
        audioEl.volume = Math.min(1, targetVol * (this.isMuted ? 0 : this.masterVolume));
      }

      const instance: PlayingNodeInstance = {
        audioEl,
        hasMediaElementSource,
        gainNode,
        startTime,
        pauseOffset: offset,
        track,
        blobUrl,
      };

      audioEl.onended = () => {
        if (this.activeNodes.get(track.id) === instance) {
          this.stopTrack(track.id, true);
        }
      };

      try {
        await audioEl.play();
      } catch (err) {
        console.warn('AudioElement play failed:', err);
      }

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
}

export const audioEngine = new AudioEngine();
