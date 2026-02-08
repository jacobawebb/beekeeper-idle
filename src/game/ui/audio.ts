"use client";

let audioContext: AudioContext | null = null;
let musicGain: GainNode | null = null;
let musicSource: AudioBufferSourceNode | null = null;

function getAudioContext() {
  if (audioContext) return audioContext;
  const Context =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Context) return null;
  audioContext = new Context();
  return audioContext;
}

function createMusicBuffer(context: AudioContext) {
  const sampleRate = context.sampleRate;
  const bpm = 64;
  const beat = 60 / bpm;
  const bars = 8;
  const duration = bars * 4 * beat;
  const frameCount = Math.floor(sampleRate * duration);
  const buffer = context.createBuffer(1, frameCount, sampleRate);
  const data = buffer.getChannelData(0);

  const scale = [261.63, 293.66, 329.63, 392.0, 440.0, 493.88]; // C major pentatonic-ish
  const melody = [
    0, 2, 3, 2, 0, 2, 4, 3,
    2, 3, 4, 2, 0, 1, 2, 0,
    0, 2, 3, 2, 0, 2, 4, 3,
    2, 3, 4, 2, 0, 1, 2, 0,
  ];

  const noteDur = beat * 2;
  const release = 0.6;

  for (let i = 0; i < melody.length; i += 1) {
    const freq = scale[melody[i] % scale.length];
    const startTime = i * noteDur;
    const endTime = Math.min(duration, startTime + noteDur);
    const startSample = Math.floor(startTime * sampleRate);
    const endSample = Math.floor(endTime * sampleRate);
    for (let s = startSample; s < endSample; s += 1) {
      const t = s / sampleRate;
      const local = t - startTime;
      const env =
        local < 0.02
          ? local / 0.02
          : Math.exp(-(local - 0.02) / release);
      const tone =
        Math.sin(2 * Math.PI * freq * t) * 0.5 +
        Math.sin(2 * Math.PI * freq * 2 * t) * 0.15;
      data[s] += tone * env * 0.35;
    }
  }

  // soft tape-style saturation
  for (let i = 0; i < data.length; i += 1) {
    data[i] = Math.tanh(data[i] * 1.1) * 0.7;
  }

  return buffer;
}

export function ensureMusicStarted(volume: number) {
  const context = getAudioContext();
  if (!context) return;
  if (context.state === "suspended") {
    context.resume().catch(() => undefined);
  }
  if (!musicSource) {
    const source = context.createBufferSource();
    source.buffer = createMusicBuffer(context);
    source.loop = true;
    const gain = context.createGain();
    gain.gain.value = Math.max(0, Math.min(1, volume));
    source.connect(gain).connect(context.destination);
    source.start();
    musicGain = gain;
    musicSource = source;
  }
  setMusicVolume(volume);
}

export function setMusicVolume(volume: number) {
  if (!musicGain) return;
  musicGain.gain.value = Math.max(0, Math.min(1, volume));
}

export function getSharedAudioContext() {
  return getAudioContext();
}
