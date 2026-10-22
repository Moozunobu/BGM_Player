import { SoundTrack, ActiveTrackState, PlaybackStatus } from '../types';

interface PlayingNodeInstance {
  source: AudioBufferSourceNode;
  gainNode: GainNode;
  startTime: number;
  pauseOffset: number;
  track: SoundTrack;
  fadeTimer?: number;
}

type StateListener = (states: Record<string, ActiveTrackState>) => void;

export function extractWaveformPeaks(buffer: AudioBuffer, numBars = 72): number[] {
  const numChannels = buffer.numberOfChannels;
  const channelData0 = buffer.getChannelData(0);
  const channelData1 = numChannels > 1 ? buffer.getChannelData(1) : null;
  const length = channelData0.length;
  const step = Math.floor(length / numBars) || 1;
  const peaks: number[] = [];
  let maxPeak = 0;

  for (let i = 0; i < numBars; i++) {
    const start = i * step;
    const end = Math.min(start + step, length);
    let peak = 0;
    const sampleStep = Math.max(1, Math.floor((end - start) / 120));
    for (let j = start; j < end; j += sampleStep) {
      const val0 = Math.abs(channelData0[j]);
      const val1 = channelData1 ? Math.abs(channelData1[j]) : 0;
      const val = Math.max(val0, val1);
      if (val > peak) peak = val;
    }
    peaks.push(peak);
    if (peak > maxPeak) maxPeak = peak;
  }

  const factor = maxPeak > 0 ? 1 / maxPeak : 1;
  return peaks.map((p) => {
    const normalized = p * factor;
    const scaled = Math.pow(normalized, 0.85);
    return Math.max(0.06, Math.min(1.0, scaled));
  });
}

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private bufferCache: Map<string, AudioBuffer> = new Map();
  private peakCache: Map<string, number[]> = new Map();
  private activeNodes: Map<string, PlayingNodeInstance> = new Map();
  private trackStates: Record<string, ActiveTrackState> = {};
  private listeners: Set<StateListener> = new Set();
  private masterVolume: number = 1.0;
  private isMuted: boolean = false;
  private updateInterval: number | null = null;

  public init(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master Compressor to protect PA equipment
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-6, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(12, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(4, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);

      this.masterGain.connect(this.compressor);
      this.compressor.connect(this.ctx.destination);

      this.startProgressTracker();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
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
        if (state && state.status === 'playing') {
          const elapsed = (now - instance.startTime + instance.pauseOffset);
          const duration = state.duration || 1;
          
          if (instance.track.loop) {
            state.currentTime = elapsed % duration;
          } else {
            state.currentTime = Math.min(elapsed, duration);
          }
          changed = true;
        }
      }

      if (changed) {
        this.notify();
      }
    }, 80);
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
      
      const peaks = extractWaveformPeaks(audioBuffer, 72);
      this.peakCache.set(track.id, peaks);

      return audioBuffer;
    } catch (e) {
      console.error(`Failed to decode track ${track.title}:`, e);
      return null;
    }
  }

  public getWaveformPeaks(trackId: string): number[] | undefined {
    return this.peakCache.get(trackId);
  }

  public setMasterVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(1.5, vol));
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
    }
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : this.masterVolume, this.ctx.currentTime);
    }
  }

  public setTrackVolume(trackId: string, volume: number) {
    const instance = this.activeNodes.get(trackId);
    if (instance && this.ctx) {
      instance.gainNode.gain.cancelScheduledValues(this.ctx.currentTime);
      instance.gainNode.gain.setValueAtTime(volume, this.ctx.currentTime);
    }
    if (this.trackStates[trackId]) {
      this.trackStates[trackId].volume = volume;
      this.notify();
    }
  }

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
      await ctx.resume();
    }

    // If solo BGM mode is active and this track is BGM/Stage/Opening, fade out other active BGMs
    const isBgm = track.category !== 'effects' && track.category !== 'announcement';
    if (options?.soloBgmMode && isBgm) {
      for (const [id, instance] of this.activeNodes.entries()) {
        if (id !== track.id) {
          const otherIsBgm = instance.track.category !== 'effects' && instance.track.category !== 'announcement';
          if (otherIsBgm) {
            this.fadeOutTrack(id, 1.2);
          }
        }
      }
    }

    // Stop current instance of this track if already playing
    this.stopTrack(track.id, false);

    // Get buffer
    let buffer = this.bufferCache.get(track.id);
    if (!buffer) {
      buffer = (await this.preloadTrack(track)) || undefined;
    }
    if (!buffer) {
      console.warn('No audio buffer available for track:', track.title);
      return;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = track.loop;

    const gainNode = ctx.createGain();
    const targetVol = track.volume ?? 0.85;
    const fadeIn = options?.fadeInSec ?? track.fadeInSec ?? 0;

    const startTime = ctx.currentTime;
    const offset = options?.offsetSec ?? 0;

    if (fadeIn > 0) {
      gainNode.gain.setValueAtTime(0.0001, startTime);
      gainNode.gain.linearRampToValueAtTime(targetVol, startTime + fadeIn);
    } else {
      gainNode.gain.setValueAtTime(targetVol, startTime);
    }

    source.connect(gainNode);
    gainNode.connect(this.masterGain!);

    const instance: PlayingNodeInstance = {
      source,
      gainNode,
      startTime,
      pauseOffset: offset,
      track,
    };

    source.onended = () => {
      // If natural finish (not looping)
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
  }

  public seekTrack(track: SoundTrack, targetSec: number) {
    const clampedSec = Math.max(0, Math.min(track.duration || 1, targetSec));
    const isPlaying = this.isTrackPlaying(track.id);
    if (isPlaying) {
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

    const ctx = this.ctx;
    const now = ctx.currentTime;
    const currentGain = instance.gainNode.gain.value;

    if (this.trackStates[trackId]) {
      this.trackStates[trackId].status = 'fading_out';
      this.notify();
    }

    instance.gainNode.gain.cancelScheduledValues(now);
    instance.gainNode.gain.setValueAtTime(Math.max(currentGain, 0.001), now);
    instance.gainNode.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    if (instance.fadeTimer) {
      window.clearTimeout(instance.fadeTimer);
    }

    instance.fadeTimer = window.setTimeout(() => {
      this.stopTrack(trackId, true);
    }, durationSec * 1000 + 50);
  }

  public stopTrack(trackId: string, resetTime = true) {
    const instance = this.activeNodes.get(trackId);
    if (instance) {
      if (instance.fadeTimer) {
        window.clearTimeout(instance.fadeTimer);
      }
      try {
        instance.source.stop();
        instance.source.disconnect();
        instance.gainNode.disconnect();
      } catch {
        // already stopped
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

  /**
   * Emergency Stop / Panic Stop All
   */
  public panicStopAll() {
    for (const trackId of Array.from(this.activeNodes.keys())) {
      this.stopTrack(trackId, true);
    }
  }

  /**
   * Smoothly fade out everything currently playing over fadeSec (defaults to 2.5s)
   */
  public fadeOutAll(fadeSec = 2.5) {
    for (const trackId of Array.from(this.activeNodes.keys())) {
      this.fadeOutTrack(trackId, fadeSec);
    }
  }

  public isTrackPlaying(trackId: string): boolean {
    const instance = this.activeNodes.get(trackId);
    return !!instance;
  }

  public getTrackState(trackId: string): ActiveTrackState | undefined {
    return this.trackStates[trackId];
  }
}

export const audioEngine = new AudioEngine();
