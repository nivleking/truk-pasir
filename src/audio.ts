import { engineTone, sandHiss } from './core/sound';

/** Procedural sound (no audio files): engine, hydraulics, pouring sand and a finish chime. */
export interface GameAudio {
  /** Must be called from a user gesture (click / key) because browsers block autoplay. */
  resume(): void;
  update(s: { speedKmh: number; throttle: number; hydraulics: boolean; movingGrains: number; active: boolean }): void;
  chime(stars: number): void;
  toggleMute(): boolean;
}

function noiseBuffer(ctx: AudioContext) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

export function createAudio(): GameAudio {
  let ctx: AudioContext | null = null;
  let muted = false;
  let nodes: {
    master: GainNode;
    engine: OscillatorNode;
    engineSub: OscillatorNode;
    engineGain: GainNode;
    hydraulicGain: GainNode;
    sandGain: GainNode;
  } | null = null;

  function init() {
    ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.value = 0.6;
    master.connect(ctx.destination);

    // Engine: sawtooth + sub square through a low-pass for a diesel rumble.
    const engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    lp.connect(engineGain).connect(master);
    const engine = ctx.createOscillator();
    engine.type = 'sawtooth';
    const engineSub = ctx.createOscillator();
    engineSub.type = 'square';
    const subGain = ctx.createGain();
    subGain.gain.value = 0.5;
    engine.connect(lp);
    engineSub.connect(subGain).connect(lp);
    engine.start();
    engineSub.start();

    const noise = noiseBuffer(ctx);
    const noiseVoice = (type: BiquadFilterType, freq: number, q: number) => {
      const src = ctx!.createBufferSource();
      src.buffer = noise;
      src.loop = true;
      const f = ctx!.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = q;
      const g = ctx!.createGain();
      g.gain.value = 0;
      src.connect(f).connect(g).connect(master);
      src.start();
      return g;
    };
    // Hydraulic whine: narrow band of noise. Sand: bright, airy hiss.
    const hydraulicGain = noiseVoice('bandpass', 700, 6);
    const sandGain = noiseVoice('highpass', 2500, 0.7);
    nodes = { master, engine, engineSub, engineGain, hydraulicGain, sandGain };
  }

  const ramp = (p: AudioParam, v: number) => ctx && p.setTargetAtTime(v, ctx.currentTime, 0.08);

  return {
    resume() {
      if (!ctx) init();
      void ctx!.resume();
    },
    update(s) {
      if (!ctx || !nodes) return;
      const tone = engineTone(s.speedKmh, s.throttle);
      ramp(nodes.engine.frequency, tone.freq);
      ramp(nodes.engineSub.frequency, tone.freq / 2);
      ramp(nodes.engineGain.gain, s.active ? tone.gain : 0);
      ramp(nodes.hydraulicGain.gain, s.active && s.hydraulics ? 0.25 : 0);
      ramp(nodes.sandGain.gain, s.active ? sandHiss(s.movingGrains) : 0);
    },
    chime(stars) {
      if (!ctx || !nodes) return;
      const notes = [523, 659, 784, 1047].slice(0, Math.max(1, stars + 1));
      notes.forEach((f, i) => {
        const o = ctx!.createOscillator();
        o.type = 'triangle';
        o.frequency.value = f;
        const g = ctx!.createGain();
        const t = ctx!.currentTime + i * 0.14;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.3, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
        o.connect(g).connect(nodes!.master);
        o.start(t);
        o.stop(t + 0.65);
      });
    },
    toggleMute() {
      muted = !muted;
      if (nodes) ramp(nodes.master.gain, muted ? 0 : 0.6);
      return muted;
    },
  };
}
