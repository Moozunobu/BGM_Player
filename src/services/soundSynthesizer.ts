/**
 * High-quality procedural sound synthesizer for school festival audio presets.
 * Renders into AudioBuffers via OfflineAudioContext without requiring external network assets.
 */

export interface PresetMeta {
  id: string;
  title: string;
  category: 'opening_closing' | 'stage' | 'announcement' | 'effects';
  categoryLabel: string;
  duration: number; // in seconds
  color: 'slate' | 'amber' | 'emerald' | 'blue' | 'rose' | 'violet' | 'cyan';
  loop: boolean;
  notes: string;
  suggestedShortcut?: string;
}

export const PRESET_CATALOG: PresetMeta[] = [
  {
    id: 'school_chime',
    title: '学校のチャイム（本鈴）',
    category: 'announcement',
    categoryLabel: '校内放送・案内',
    duration: 10,
    color: 'emerald',
    loop: false,
    notes: '定時連絡・放送開始の予告音。',
    suggestedShortcut: '1',
  },
  {
    id: 'notice_alert',
    title: 'お知らせチャイム（予告音）',
    category: 'announcement',
    categoryLabel: '校内放送・案内',
    duration: 3.5,
    color: 'emerald',
    loop: false,
    notes: 'アナウンス前の注意喚起ピンポン音。',
    suggestedShortcut: '2',
  },
  {
    id: 'fanfare',
    title: '開幕・表彰ファンファーレ',
    category: 'opening_closing',
    categoryLabel: '開会式・閉会式',
    duration: 6.5,
    color: 'amber',
    loop: false,
    notes: '開会宣言・表彰・グランプリ発表に。',
    suggestedShortcut: '3',
  },
  {
    id: 'drumroll_crash',
    title: 'ドラムロール＆シンバル',
    category: 'effects',
    categoryLabel: '効果音・SE',
    duration: 5.5,
    color: 'amber',
    loop: false,
    notes: '結果発表・ドキドキの演出に。',
    suggestedShortcut: '4',
  },
  {
    id: 'taiko',
    title: '和太鼓・開幕の合図（ドン！）',
    category: 'opening_closing',
    categoryLabel: '開会式・閉会式',
    duration: 3.2,
    color: 'rose',
    loop: false,
    notes: '舞台開幕、ステージ開始の引き締まる一打。',
    suggestedShortcut: '5',
  },
  {
    id: 'applause',
    title: '拍手＆大歓声',
    category: 'effects',
    categoryLabel: '効果音・SE',
    duration: 7,
    color: 'cyan',
    loop: false,
    notes: '発表終了時の盛大な拍手サポート。',
    suggestedShortcut: '6',
  },
  {
    id: 'quiz_correct',
    title: '正解（ピンポン！）',
    category: 'effects',
    categoryLabel: '効果音・SE',
    duration: 2.2,
    color: 'cyan',
    loop: false,
    notes: 'クイズ大会・有志ステージの正解音。',
    suggestedShortcut: '7',
  },
  {
    id: 'quiz_incorrect',
    title: '不正解（ブブー！）',
    category: 'effects',
    categoryLabel: '効果音・SE',
    duration: 2.0,
    color: 'rose',
    loop: false,
    notes: 'クイズ大会・ゲームステージの残念音。',
    suggestedShortcut: '8',
  },
  {
    id: 'countdown_start',
    title: 'カウントダウン（3・2・1・START）',
    category: 'effects',
    categoryLabel: '効果音・SE',
    duration: 4.5,
    color: 'violet',
    loop: false,
    notes: '競技・ゲーム・ステージの開始合図。',
    suggestedShortcut: '9',
  },
  {
    id: 'bgm_opening_loop',
    title: '開幕・躍動ステージBGM',
    category: 'stage',
    categoryLabel: 'ステージ発表・転換',
    duration: 12,
    color: 'amber',
    loop: true,
    notes: 'オープニングや転換時の明るく盛り上がるBGM。',
    suggestedShortcut: 'Q',
  },
  {
    id: 'bgm_acoustic_loop',
    title: '学園祭・爽やかアコースティックBGM',
    category: 'stage',
    categoryLabel: 'ステージ発表・転換',
    duration: 12,
    color: 'blue',
    loop: true,
    notes: '展示会場・歓談・ステージ転換に最適な日常BGM。',
    suggestedShortcut: 'W',
  },
  {
    id: 'bgm_emotional_piano',
    title: '閉会式・感動のピアノBGM',
    category: 'opening_closing',
    categoryLabel: '開会式・閉会式',
    duration: 14,
    color: 'violet',
    loop: true,
    notes: '閉会式スピーチ、エンディング、エンドロール用。',
    suggestedShortcut: 'E',
  },
];

/**
 * Generate an AudioBuffer for a preset by ID using Web Audio API synthesis.
 */
export async function synthesizePresetBuffer(presetId: string, sampleRate = 44100): Promise<AudioBuffer> {
  const meta = PRESET_CATALOG.find((p) => p.id === presetId);
  const duration = meta ? meta.duration : 4;
  const ctx = new OfflineAudioContext(2, Math.ceil(sampleRate * duration), sampleRate);

  switch (presetId) {
    case 'school_chime':
      renderSchoolChime(ctx);
      break;
    case 'notice_alert':
      renderNoticeAlert(ctx);
      break;
    case 'fanfare':
      renderFanfare(ctx);
      break;
    case 'drumroll_crash':
      renderDrumrollCrash(ctx);
      break;
    case 'taiko':
      renderTaiko(ctx);
      break;
    case 'applause':
      renderApplause(ctx);
      break;
    case 'quiz_correct':
      renderQuizCorrect(ctx);
      break;
    case 'quiz_incorrect':
      renderQuizIncorrect(ctx);
      break;
    case 'countdown_start':
      renderCountdown(ctx);
      break;
    case 'bgm_opening_loop':
      renderBgmOpening(ctx);
      break;
    case 'bgm_acoustic_loop':
      renderBgmAcoustic(ctx);
      break;
    case 'bgm_emotional_piano':
      renderBgmEmotionalPiano(ctx);
      break;
    default:
      renderNoticeAlert(ctx);
      break;
  }

  return await ctx.startRendering();
}

/**
 * Helper to play a bell/chime harmonic note
 */
function playBellTone(
  ctx: OfflineAudioContext,
  freq: number,
  startTime: number,
  duration = 2.4,
  volume = 0.35
) {
  // Harmonics for a tubular chime
  const harmonics = [
    { ratio: 1.0, gain: 1.0, decay: duration },
    { ratio: 2.76, gain: 0.45, decay: duration * 0.7 },
    { ratio: 5.4, gain: 0.25, decay: duration * 0.4 },
    { ratio: 8.9, gain: 0.12, decay: duration * 0.25 },
  ];

  harmonics.forEach((h) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * h.ratio, startTime);

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume * h.gain, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + h.decay);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + h.decay + 0.1);
  });
}

/**
 * Japanese Westminster School Chime
 * Notes: F#4, A4, G4, D4 (phrase 1) | F#4, G4, A4, F#4 (phrase 2)
 */
function renderSchoolChime(ctx: OfflineAudioContext) {
  const fSharp4 = 369.99;
  const a4 = 440.0;
  const g4 = 392.0;
  const d4 = 293.66;

  // Pattern: 4 notes phrase 1, slight pause, 4 notes phrase 2
  const phrase1 = [
    { note: fSharp4, time: 0.2 },
    { note: a4, time: 1.2 },
    { note: g4, time: 2.2 },
    { note: d4, time: 3.2 },
  ];

  const phrase2 = [
    { note: fSharp4, time: 4.8 },
    { note: g4, time: 5.8 },
    { note: a4, time: 6.8 },
    { note: fSharp4, time: 7.8 },
  ];

  [...phrase1, ...phrase2].forEach(({ note, time }) => {
    playBellTone(ctx, note, time, 2.2, 0.3);
  });
}

/**
 * Notice / Pre-announcement Harp/Glockenspiel Alert
 */
function renderNoticeAlert(ctx: OfflineAudioContext) {
  const notes = [
    { freq: 587.33, time: 0.1 }, // D5
    { freq: 739.99, time: 0.35 }, // F#5
    { freq: 880.0, time: 0.6 }, // A5
    { freq: 1174.66, time: 0.85 }, // D6
  ];

  notes.forEach((n) => {
    playBellTone(ctx, n.freq, n.time, 2.5, 0.35);
  });
}

/**
 * Opening Brass Fanfare
 */
function renderFanfare(ctx: OfflineAudioContext) {
  // Majestic brass chords progression: C5 - E5 - G5 - C6
  // Rythm: Ta-ta-ta-taaaaaan, Ta-ta-ta-taaaaaan, Ta-ta-ta-ta-ta-ta-WAAAAAN!
  const c4 = 261.63;
  const e4 = 329.63;
  const g4 = 392.0;
  const c5 = 523.25;
  const e5 = 659.25;
  const g5 = 783.99;
  const c6 = 1046.5;

  const playBrassNote = (freq: number, start: number, len: number, vol = 0.2) => {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, start);
    osc2.frequency.setValueAtTime(freq * 1.002, start); // subtle detune for thick brass

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 2, start);
    filter.frequency.linearRampToValueAtTime(freq * 4.5, start + 0.05);
    filter.frequency.exponentialRampToValueAtTime(freq * 1.5, start + len);

    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(vol, start + 0.04);
    gain.gain.setValueAtTime(vol * 0.85, start + len * 0.8);
    gain.gain.exponentialRampToValueAtTime(0.001, start + len);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(start);
    osc2.start(start);
    osc1.stop(start + len + 0.05);
    osc2.stop(start + len + 0.05);
  };

  const playChord = (freqs: number[], start: number, len: number, vol = 0.15) => {
    freqs.forEach((f) => playBrassNote(f, start, len, vol));
  };

  // Intro rhythm
  playChord([c4, g4, c5], 0.1, 0.2, 0.15);
  playChord([c4, g4, c5], 0.4, 0.2, 0.15);
  playChord([c4, g4, c5], 0.7, 0.2, 0.15);
  playChord([c4, e4, g4, c5], 1.0, 0.8, 0.2);

  // Measure 2
  playChord([c4, g4, c5], 2.0, 0.2, 0.15);
  playChord([c4, g4, c5], 2.3, 0.2, 0.15);
  playChord([c4, g4, c5], 2.6, 0.2, 0.15);
  playChord([e4, g4, c5, e5], 2.9, 0.9, 0.22);

  // Grand finale chords
  playChord([f4(349.23), a4(440), c5], 4.0, 0.25, 0.16);
  playChord([g4, c5, e5], 4.35, 0.25, 0.18);
  playChord([c4, e4, g4, c5, e5, g5, c6], 4.75, 1.8, 0.25);

  function f4(v: number) {
    return v;
  }
  function a4(v: number) {
    return v;
  }
}

/**
 * Drumroll and Crash Cymbal
 */
function renderDrumrollCrash(ctx: OfflineAudioContext) {
  const rollDuration = 3.8;
  const crashTime = 3.8;

  // Snare roll: continuous modulated noise bursts with accelerating density
  const totalHits = 45;
  for (let i = 0; i < totalHits; i++) {
    const t = 0.1 + (i / totalHits) * rollDuration;
    const intensity = 0.05 + Math.pow(i / totalHits, 1.8) * 0.25;

    // Hit noise
    const bufferSize = ctx.sampleRate * 0.05;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let j = 0; j < bufferSize; j++) {
      data[j] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200 + Math.random() * 400, t);
    filter.Q.value = 3;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(intensity, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(t);
    noise.stop(t + 0.05);
  }

  // Crash Cymbal at end
  const crashLen = 1.6;
  const crashBufSize = ctx.sampleRate * crashLen;
  const crashBuffer = ctx.createBuffer(2, crashBufSize, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const cData = crashBuffer.getChannelData(ch);
    for (let j = 0; j < crashBufSize; j++) {
      cData[j] = (Math.random() * 2 - 1) * Math.exp(-j / (ctx.sampleRate * 0.45));
    }
  }

  const crashSrc = ctx.createBufferSource();
  crashSrc.buffer = crashBuffer;

  const highPass = ctx.createBiquadFilter();
  highPass.type = 'highpass';
  highPass.frequency.setValueAtTime(4500, crashTime);

  const crashGain = ctx.createGain();
  crashGain.gain.setValueAtTime(0.45, crashTime);
  crashGain.gain.exponentialRampToValueAtTime(0.001, crashTime + crashLen);

  crashSrc.connect(highPass);
  highPass.connect(crashGain);
  crashGain.connect(ctx.destination);

  crashSrc.start(crashTime);
  crashSrc.stop(crashTime + crashLen);

  // Bass kick punch on crash
  const kickOsc = ctx.createOscillator();
  const kickGain = ctx.createGain();
  kickOsc.frequency.setValueAtTime(140, crashTime);
  kickOsc.frequency.exponentialRampToValueAtTime(45, crashTime + 0.2);
  kickGain.gain.setValueAtTime(0.6, crashTime);
  kickGain.gain.exponentialRampToValueAtTime(0.001, crashTime + 0.35);

  kickOsc.connect(kickGain);
  kickGain.connect(ctx.destination);
  kickOsc.start(crashTime);
  kickOsc.stop(crashTime + 0.4);
}

/**
 * Resonant Japanese Taiko Drum (Don-!)
 */
function renderTaiko(ctx: OfflineAudioContext) {
  const t = 0.1;

  // Fundamental boom with pitch glide
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(120, t);
  osc.frequency.exponentialRampToValueAtTime(50, t + 0.15);
  osc.frequency.exponentialRampToValueAtTime(38, t + 1.8);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.9, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 2.9);

  // Wooden skin slap / stick impact
  const slapLen = 0.08;
  const slapBuf = ctx.createBuffer(1, ctx.sampleRate * slapLen, ctx.sampleRate);
  const slapData = slapBuf.getChannelData(0);
  for (let i = 0; i < slapData.length; i++) {
    slapData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.015));
  }

  const slapSrc = ctx.createBufferSource();
  slapSrc.buffer = slapBuf;

  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 600;
  band.Q.value = 2;

  const slapGain = ctx.createGain();
  slapGain.gain.setValueAtTime(0.5, t);
  slapGain.gain.exponentialRampToValueAtTime(0.001, t + slapLen);

  slapSrc.connect(band);
  band.connect(slapGain);
  slapGain.connect(ctx.destination);

  slapSrc.start(t);
}

/**
 * Realistic Applause & Cheers
 */
function renderApplause(ctx: OfflineAudioContext) {
  const duration = 6.8;
  const totalClaps = 380;

  for (let i = 0; i < totalClaps; i++) {
    const t = 0.2 + Math.random() * (duration - 0.6);
    // Envelope: swells in first 1.5s, stays loud, gently tapers off
    let envelope = 1.0;
    if (t < 1.5) envelope = t / 1.5;
    else if (t > 5.0) envelope = Math.max(0, 1 - (t - 5.0) / 1.5);

    const clapLen = 0.03 + Math.random() * 0.02;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * clapLen), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let j = 0; j < data.length; j++) {
      data[j] = (Math.random() * 2 - 1) * Math.exp(-j / (ctx.sampleRate * 0.006));
    }

    const src = ctx.createBufferSource();
    src.buffer = buf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1000 + Math.random() * 1800;
    filter.Q.value = 1.2;

    const gain = ctx.createGain();
    const pan = (Math.random() * 2 - 1) * 0.7;
    gain.gain.setValueAtTime(envelope * (0.04 + Math.random() * 0.08), t);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    src.start(t);
    src.stop(t + clapLen + 0.01);
  }
}

/**
 * Quiz Correct Ding-Dong (High pitch resonant chimes)
 */
function renderQuizCorrect(ctx: OfflineAudioContext) {
  // Tone 1: C6 (1046.5 Hz)
  playBellTone(ctx, 1046.5, 0.1, 0.8, 0.4);
  // Tone 2: G6 (1567.98 Hz)
  playBellTone(ctx, 1567.98, 0.45, 1.5, 0.45);
}

/**
 * Quiz Incorrect (Low two-tone buzz)
 */
function renderQuizIncorrect(ctx: OfflineAudioContext) {
  const playBuzz = (start: number, len: number) => {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc1.frequency.setValueAtTime(138.59, start); // C#3
    osc2.frequency.setValueAtTime(146.83, start); // D3 (dissonance)

    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.3, start + 0.02);
    gain.gain.setValueAtTime(0.3, start + len - 0.03);
    gain.gain.linearRampToValueAtTime(0.001, start + len);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(start);
    osc2.start(start);
    osc1.stop(start + len + 0.01);
    osc2.stop(start + len + 0.01);
  };

  playBuzz(0.1, 0.35);
  playBuzz(0.55, 0.65);
}

/**
 * Countdown 3-2-1-Start
 */
function renderCountdown(ctx: OfflineAudioContext) {
  // 3 ticks (880Hz beep) then 1 high start tone (1760Hz)
  const ticks = [0.2, 1.2, 2.2];
  ticks.forEach((t) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t);
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.16);
  });

  // Start sound at 3.2s
  const startT = 3.2;
  const startOsc = ctx.createOscillator();
  const startGain = ctx.createGain();
  startOsc.type = 'triangle';
  startOsc.frequency.setValueAtTime(1760, startT);
  startOsc.frequency.linearRampToValueAtTime(2093, startT + 0.2); // pitch up to C7
  startGain.gain.setValueAtTime(0.4, startT);
  startGain.gain.exponentialRampToValueAtTime(0.001, startT + 1.0);
  startOsc.connect(startGain);
  startGain.connect(ctx.destination);
  startOsc.start(startT);
  startOsc.stop(startT + 1.1);
}

/**
 * Upbeat Opening Festival BGM Loop (12 seconds loop)
 */
function renderBgmOpening(ctx: OfflineAudioContext) {
  const bpm = 128;
  const beatSec = 60 / bpm; // ~0.468s
  const totalBeats = 24; // ~11.25s

  // Four on the floor kick
  for (let b = 0; b < totalBeats; b++) {
    const t = b * beatSec;
    // Kick drum
    const kickOsc = ctx.createOscillator();
    const kickGain = ctx.createGain();
    kickOsc.frequency.setValueAtTime(130, t);
    kickOsc.frequency.exponentialRampToValueAtTime(45, t + 0.1);
    kickGain.gain.setValueAtTime(0.5, t);
    kickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    kickOsc.connect(kickGain);
    kickGain.connect(ctx.destination);
    kickOsc.start(t);
    kickOsc.stop(t + 0.25);

    // Hi-hat on offbeat
    const hatT = t + beatSec * 0.5;
    const hatLen = 0.05;
    const hatBuf = ctx.createBuffer(1, ctx.sampleRate * hatLen, ctx.sampleRate);
    const hData = hatBuf.getChannelData(0);
    for (let j = 0; j < hData.length; j++) hData[j] = Math.random() * 2 - 1;
    const hatSrc = ctx.createBufferSource();
    hatSrc.buffer = hatBuf;
    const hFilter = ctx.createBiquadFilter();
    hFilter.type = 'highpass';
    hFilter.frequency.value = 7000;
    const hGain = ctx.createGain();
    hGain.gain.setValueAtTime(0.12, hatT);
    hGain.gain.exponentialRampToValueAtTime(0.001, hatT + hatLen);
    hatSrc.connect(hFilter);
    hFilter.connect(hGain);
    hGain.connect(ctx.destination);
    hatSrc.start(hatT);
    hatSrc.stop(hatT + hatLen + 0.01);
  }

  // Synth Bass line: C -> G -> Am -> F
  const chords = [
    { root: 130.81, time: 0 },
    { root: 98.0, time: 6 * beatSec },
    { root: 110.0, time: 12 * beatSec },
    { root: 87.31, time: 18 * beatSec },
  ];

  chords.forEach((c) => {
    for (let i = 0; i < 6; i++) {
      const t = c.time + i * beatSec;
      const bOsc = ctx.createOscillator();
      const bGain = ctx.createGain();
      bOsc.type = 'sawtooth';
      bOsc.frequency.setValueAtTime(c.root, t);
      bGain.gain.setValueAtTime(0.2, t);
      bGain.gain.exponentialRampToValueAtTime(0.001, t + beatSec * 0.7);
      bOsc.connect(bGain);
      bGain.connect(ctx.destination);
      bOsc.start(t);
      bOsc.stop(t + beatSec * 0.8);
    }
  });

  // Bright melody lead synth (arpeggios)
  const melodyNotes = [
    523.25, 659.25, 783.99, 1046.5, 783.99, 659.25,
    587.33, 698.46, 880.0, 1174.66, 880.0, 698.46,
    440.0, 523.25, 659.25, 880.0, 659.25, 523.25,
    349.23, 440.0, 523.25, 698.46, 523.25, 440.0,
  ];

  melodyNotes.forEach((freq, idx) => {
    const t = idx * (beatSec * 0.5);
    const mOsc = ctx.createOscillator();
    const mGain = ctx.createGain();
    mOsc.type = 'triangle';
    mOsc.frequency.setValueAtTime(freq, t);
    mGain.gain.setValueAtTime(0.18, t);
    mGain.gain.exponentialRampToValueAtTime(0.001, t + beatSec * 0.45);
    mOsc.connect(mGain);
    mGain.connect(ctx.destination);
    mOsc.start(t);
    mOsc.stop(t + beatSec * 0.5);
  });
}

/**
 * Cheerful Acoustic / Marimba Loop (12s loop)
 */
function renderBgmAcoustic(ctx: OfflineAudioContext) {
  const tempo = 110;
  const beat = 60 / tempo; // ~0.545s
  const totalBeats = 20;

  // Gentle marimba/pluck arpeggio in F major: F - C - Dm - Bb
  const progression = [
    [349.23, 440.0, 523.25, 698.46], // F
    [261.63, 329.63, 392.0, 523.25], // C
    [293.66, 349.23, 440.0, 587.33], // Dm
    [233.08, 293.66, 349.23, 466.16], // Bb
  ];

  for (let bar = 0; bar < 4; bar++) {
    const chord = progression[bar];
    const barStart = bar * (4 * beat);

    for (let step = 0; step < 8; step++) {
      const noteFreq = chord[step % 4];
      const t = barStart + step * (beat * 0.5);

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(noteFreq, t);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.4);
    }

    // Soft shaker on beat
    for (let s = 0; s < 4; s++) {
      const st = barStart + s * beat;
      const shBuf = ctx.createBuffer(1, ctx.sampleRate * 0.04, ctx.sampleRate);
      const d = shBuf.getChannelData(0);
      for (let j = 0; j < d.length; j++) d[j] = Math.random() * 2 - 1;
      const shSrc = ctx.createBufferSource();
      shSrc.buffer = shBuf;
      const shFilter = ctx.createBiquadFilter();
      shFilter.type = 'highpass';
      shFilter.frequency.value = 5000;
      const shGain = ctx.createGain();
      shGain.gain.setValueAtTime(0.06, st);
      shGain.gain.exponentialRampToValueAtTime(0.001, st + 0.04);
      shSrc.connect(shFilter);
      shFilter.connect(shGain);
      shGain.connect(ctx.destination);
      shSrc.start(st);
      shSrc.stop(st + 0.05);
    }
  }
}

/**
 * Emotional Piano Loop (14s)
 */
function renderBgmEmotionalPiano(ctx: OfflineAudioContext) {
  // G major -> D -> Em -> C emotional progression
  const chords = [
    { bass: 98.0, notes: [196.0, 246.94, 293.66, 392.0], start: 0.2, len: 3.2 },
    { bass: 73.42, notes: [146.83, 220.0, 293.66, 369.99], start: 3.6, len: 3.2 },
    { bass: 82.41, notes: [164.81, 196.0, 246.94, 329.63], start: 7.0, len: 3.2 },
    { bass: 65.41, notes: [130.81, 196.0, 261.63, 329.63, 392.0], start: 10.4, len: 3.2 },
  ];

  chords.forEach(({ bass, notes, start, len }) => {
    // Bass note
    const bOsc = ctx.createOscillator();
    const bGain = ctx.createGain();
    bOsc.type = 'triangle';
    bOsc.frequency.setValueAtTime(bass, start);
    bGain.gain.setValueAtTime(0.28, start);
    bGain.gain.exponentialRampToValueAtTime(0.0001, start + len);
    bOsc.connect(bGain);
    bGain.connect(ctx.destination);
    bOsc.start(start);
    bOsc.stop(start + len + 0.1);

    // Arpeggiated chord notes
    notes.forEach((f, i) => {
      const noteTime = start + i * 0.35;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, noteTime);

      // Subtle piano overtone
      const overOsc = ctx.createOscillator();
      overOsc.type = 'sine';
      overOsc.frequency.setValueAtTime(f * 2, noteTime);

      gain.gain.setValueAtTime(0.22, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 2.5);

      osc.connect(gain);
      overOsc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteTime);
      overOsc.start(noteTime);
      osc.stop(noteTime + 2.6);
      overOsc.stop(noteTime + 2.6);
    });
  });
}

/**
 * Converts an AudioBuffer to a WAV format Blob so it can be stored in IndexedDB or downloaded!
 */
export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const dataLength = buffer.length * blockAlign;
  const bufferLength = 44 + dataLength;

  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // RIFF identifier
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);

  // Write PCM audio data (interleaved)
  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      let sample = buffer.getChannelData(channel)[i];
      // Clamp sample to [-1, 1]
      sample = Math.max(-1, Math.min(1, sample));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([view], { type: 'audio/wav' });
}
