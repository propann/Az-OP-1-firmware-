import { SynthEngineType, SynthParams, EnvelopeParams, FxParams, LfoParams, TapeState } from '../types';

class OP1AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private masterCompressor: DynamicsCompressorNode | null = null;
  private analyser: AnalyserNode | null = null;
  private activeVoices: Map<number, {
    stop: () => void;
    engine: SynthEngineType;
    gainNode: GainNode;
  }> = new Map();

  // FX Nodes
  private fxInputGain: GainNode | null = null;
  private fxDryGain: GainNode | null = null;
  private fxWetGain: GainNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedbackGain: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private cwoDelay: DelayNode | null = null;
  private cwoFilter: BiquadFilterNode | null = null;
  private nitroLowpass: BiquadFilterNode | null = null;
  private nitroHighpass: BiquadFilterNode | null = null;
  private reverbConvolver: ConvolverNode | null = null;

  // LFO Node
  private globalLfo: OscillatorNode | null = null;
  private globalLfoGain: GainNode | null = null;

  // Tape Audio Buffers & playback sources
  private tapeSources: (AudioBufferSourceNode | null)[] = [null, null, null, null];
  private tapeGains: (GainNode | null)[] = [null, null, null, null];
  private tapePans: (StereoPannerNode | null)[] = [null, null, null, null];
  private isRecordingTape = false;
  private recordingTrack = 0;
  private recordedSamples: Float32Array[] = [];
  private recordingStartSample = 0;
  private tapeRecordProcessor: ScriptProcessorNode | null = null;

  // Master Params
  private masterVolume = 0.8;
  private bpm = 120;

  constructor() {
    // Lazy initialized on first user gesture
  }

  public init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioContextClass();

    // Master bus
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.masterVolume;

    this.masterCompressor = this.ctx.createDynamicsCompressor();
    this.masterCompressor.threshold.setValueAtTime(-12, this.ctx.currentTime);
    this.masterCompressor.knee.setValueAtTime(30, this.ctx.currentTime);
    this.masterCompressor.ratio.setValueAtTime(4, this.ctx.currentTime);
    this.masterCompressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
    this.masterCompressor.release.setValueAtTime(0.25, this.ctx.currentTime);

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.8;

    // Connect master chain
    this.masterGain.connect(this.masterCompressor);
    this.masterCompressor.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    // Setup FX chain
    this.setupFxChain();

    // Setup Tape playback nodes
    for (let i = 0; i < 4; i++) {
      const g = this.ctx.createGain();
      const p = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
      if (p) {
        g.connect(p);
        p.connect(this.masterGain);
        this.tapePans[i] = p;
      } else {
        g.connect(this.masterGain);
      }
      this.tapeGains[i] = g;
    }
  }

  private setupFxChain() {
    if (!this.ctx || !this.masterGain) return;

    this.fxInputGain = this.ctx.createGain();
    this.fxDryGain = this.ctx.createGain();
    this.fxWetGain = this.ctx.createGain();

    this.fxDryGain.gain.value = 1.0;
    this.fxWetGain.gain.value = 0.3;

    // Delay node
    this.delayNode = this.ctx.createDelay(2.0);
    this.delayNode.delayTime.value = 0.3;
    this.delayFeedbackGain = this.ctx.createGain();
    this.delayFeedbackGain.gain.value = 0.4;
    this.delayNode.connect(this.delayFeedbackGain);
    this.delayFeedbackGain.connect(this.delayNode);

    // Filter node (Unlocked Filter Mod)
    this.filterNode = this.ctx.createBiquadFilter();
    this.filterNode.type = 'lowpass';
    this.filterNode.frequency.value = 2400;
    this.filterNode.Q.value = 4.0;

    // CWO Delay & Modulator
    this.cwoDelay = this.ctx.createDelay(1.0);
    this.cwoDelay.delayTime.value = 0.12;
    this.cwoFilter = this.ctx.createBiquadFilter();
    this.cwoFilter.type = 'bandpass';
    this.cwoFilter.frequency.value = 1200;
    this.cwoFilter.Q.value = 6.0;

    // Nitro highpass + lowpass
    this.nitroHighpass = this.ctx.createBiquadFilter();
    this.nitroHighpass.type = 'highpass';
    this.nitroHighpass.frequency.value = 80;
    this.nitroLowpass = this.ctx.createBiquadFilter();
    this.nitroLowpass.type = 'lowpass';
    this.nitroLowpass.frequency.value = 4000;
    this.nitroLowpass.Q.value = 5.0;

    // Create algorithmic impulse response for Reverb
    this.createReverbImpulse();

    // Default connection
    this.fxInputGain.connect(this.fxDryGain);
    this.fxDryGain.connect(this.masterGain);

    this.delayNode.connect(this.fxWetGain);
    this.fxWetGain.connect(this.masterGain);
  }

  private createReverbImpulse() {
    if (!this.ctx) return;
    const rate = this.ctx.sampleRate;
    const length = rate * 2.0; // 2 sec reverb
    const impulse = this.ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const decay = Math.exp(-i / (rate * 0.5));
      left[i] = (Math.random() * 2 - 1) * decay;
      right[i] = (Math.random() * 2 - 1) * decay;
    }

    this.reverbConvolver = this.ctx.createConvolver();
    this.reverbConvolver.buffer = impulse;
  }

  public updateFx(fx: FxParams) {
    if (!this.ctx) return;
    const wet = fx.enabled ? (fx.orange / 100) : 0;
    const dry = 1 - (wet * 0.5);

    if (this.fxWetGain && this.fxDryGain) {
      this.fxWetGain.gain.setTargetAtTime(wet, this.ctx.currentTime, 0.05);
      this.fxDryGain.gain.setTargetAtTime(dry, this.ctx.currentTime, 0.05);
    }

    if (fx.type === 'delay' && this.delayNode && this.delayFeedbackGain) {
      const time = 0.05 + (fx.blue / 100) * 0.8;
      const fb = Math.min(0.85, (fx.green / 100) * 0.9);
      this.delayNode.delayTime.setTargetAtTime(time, this.ctx.currentTime, 0.05);
      this.delayFeedbackGain.gain.setTargetAtTime(fb, this.ctx.currentTime, 0.05);
    } else if (fx.type === 'cwo' && this.cwoDelay && this.cwoFilter) {
      const freq = 200 + (fx.blue / 100) * 4000;
      const resonance = 1 + (fx.green / 100) * 15;
      const delayTime = 0.02 + (fx.white / 100) * 0.3;
      this.cwoFilter.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.05);
      this.cwoFilter.Q.setTargetAtTime(resonance, this.ctx.currentTime, 0.05);
      this.cwoDelay.delayTime.setTargetAtTime(delayTime, this.ctx.currentTime, 0.05);
    } else if (fx.type === 'filter' && this.filterNode) {
      const cutoff = 100 * Math.pow(100, fx.blue / 100);
      const res = (fx.green / 100) * 20;
      this.filterNode.frequency.setTargetAtTime(cutoff, this.ctx.currentTime, 0.05);
      this.filterNode.Q.setTargetAtTime(res, this.ctx.currentTime, 0.05);
    } else if (fx.type === 'nitro' && this.nitroLowpass && this.nitroHighpass) {
      const hp = 20 + (fx.blue / 100) * 500;
      const lp = 500 + (fx.green / 100) * 10000;
      const q = 1 + (fx.white / 100) * 18;
      this.nitroHighpass.frequency.setTargetAtTime(hp, this.ctx.currentTime, 0.05);
      this.nitroLowpass.frequency.setTargetAtTime(lp, this.ctx.currentTime, 0.05);
      this.nitroLowpass.Q.setTargetAtTime(q, this.ctx.currentTime, 0.05);
    }
  }

  public setMasterVolume(vol: number) {
    this.masterVolume = vol;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.05);
    }
  }

  public setBpm(bpm: number) {
    this.bpm = bpm;
  }

  public getBpm(): number {
    return this.bpm;
  }

  // --- SYNTHESIZER NOTE TRIGGERING ---

  public playNote(
    midiNote: number,
    engine: SynthEngineType,
    params: SynthParams,
    env: EnvelopeParams,
    fx: FxParams,
    lfo: LfoParams,
    velocity = 0.8
  ) {
    this.init();
    if (!this.ctx || !this.masterGain || !this.fxInputGain) return;

    // Stop existing voice on the same note if any
    this.stopNote(midiNote);

    const freq = 440 * Math.pow(2, (midiNote - 69) / 12);
    const now = this.ctx.currentTime;

    const voiceGain = this.ctx.createGain();
    voiceGain.gain.setValueAtTime(0, now);

    // Envelope calculations
    const aTime = Math.max(0.005, (env.attack / 100) * 2.5);
    const dTime = Math.max(0.01, (env.decay / 100) * 3.0);
    const sLevel = (env.sustain / 100) * velocity * 0.35;

    voiceGain.gain.setValueAtTime(0.0001, now);
    voiceGain.gain.exponentialRampToValueAtTime(velocity * 0.45, now + aTime);
    voiceGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, sLevel), now + aTime + dTime);

    let stopVoiceFn: () => void = () => {};

    // Generate Audio Nodes based on Synth Engine
    switch (engine) {
      case 'iter': {
        // Unlockable modded synth: Additive / Cellular FM with FM feedback & formant ringing
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const osc3 = this.ctx.createOscillator();
        const mod = this.ctx.createOscillator();
        const modGain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        const harmonicRatio = 1 + Math.floor((params.blue / 100) * 7);
        const fmDepth = (params.green / 100) * 800;
        const cutoff = 200 + (params.white / 100) * 8000;
        const res = (params.orange / 100) * 15;

        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(freq, now);

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(freq * harmonicRatio, now);

        osc3.type = 'triangle';
        osc3.frequency.setValueAtTime(freq * 0.5, now);

        mod.type = 'sine';
        mod.frequency.setValueAtTime(freq * 1.5, now);
        modGain.gain.setValueAtTime(fmDepth, now);

        mod.connect(modGain);
        modGain.connect(osc1.frequency);
        modGain.connect(osc2.frequency);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(cutoff, now);
        filter.Q.setValueAtTime(res, now);

        const subGain = this.ctx.createGain();
        subGain.gain.setValueAtTime(0.3, now);

        osc1.connect(filter);
        osc2.connect(filter);
        osc3.connect(subGain);
        subGain.connect(filter);

        filter.connect(voiceGain);

        osc1.start(now);
        osc2.start(now);
        osc3.start(now);
        mod.start(now);

        stopVoiceFn = () => {
          const rTime = Math.max(0.01, (env.release / 100) * 3.5);
          const stopNow = this.ctx ? this.ctx.currentTime : now;
          voiceGain.gain.cancelScheduledValues(stopNow);
          voiceGain.gain.setValueAtTime(voiceGain.gain.value, stopNow);
          voiceGain.gain.exponentialRampToValueAtTime(0.0001, stopNow + rTime);
          setTimeout(() => {
            try {
              osc1.stop();
              osc2.stop();
              osc3.stop();
              mod.stop();
              osc1.disconnect();
              osc2.disconnect();
              osc3.disconnect();
              mod.disconnect();
              voiceGain.disconnect();
            } catch {}
          }, (rTime + 0.1) * 1000);
        };
        break;
      }

      case 'digital': {
        // Gritty digital ring-mod synth
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const ringModGain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        const detune = (params.blue - 50) * 0.5;
        const ringFreq = freq * (1 + (params.green / 100) * 4);
        const cutoff = 300 + (params.white / 100) * 9000;
        const resonance = (params.orange / 100) * 12;

        osc1.type = 'square';
        osc1.frequency.setValueAtTime(freq + detune, now);

        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(ringFreq, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(cutoff, now);
        filter.Q.setValueAtTime(resonance, now);

        osc1.connect(filter);
        osc2.connect(ringModGain.gain);
        filter.connect(ringModGain);
        ringModGain.connect(voiceGain);

        osc1.start(now);
        osc2.start(now);

        stopVoiceFn = () => {
          const rTime = Math.max(0.01, (env.release / 100) * 3.0);
          const stopNow = this.ctx ? this.ctx.currentTime : now;
          voiceGain.gain.cancelScheduledValues(stopNow);
          voiceGain.gain.setValueAtTime(voiceGain.gain.value, stopNow);
          voiceGain.gain.exponentialRampToValueAtTime(0.0001, stopNow + rTime);
          setTimeout(() => {
            try {
              osc1.stop();
              osc2.stop();
              osc1.disconnect();
              osc2.disconnect();
              voiceGain.disconnect();
            } catch {}
          }, (rTime + 0.1) * 1000);
        };
        break;
      }

      case 'fm': {
        // 4-op style FM
        const carrier = this.ctx.createOscillator();
        const mod1 = this.ctx.createOscillator();
        const modGain1 = this.ctx.createGain();

        const ratio = 0.5 + (params.blue / 100) * 4.5;
        const modIndex = (params.green / 100) * 1200;
        const brightness = 300 + (params.white / 100) * 8000;

        carrier.type = 'sine';
        carrier.frequency.setValueAtTime(freq, now);

        mod1.type = 'sine';
        mod1.frequency.setValueAtTime(freq * ratio, now);
        modGain1.gain.setValueAtTime(modIndex, now);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(brightness, now);
        filter.Q.setValueAtTime((params.orange / 100) * 8, now);

        mod1.connect(modGain1);
        modGain1.connect(carrier.frequency);
        carrier.connect(filter);
        filter.connect(voiceGain);

        carrier.start(now);
        mod1.start(now);

        stopVoiceFn = () => {
          const rTime = Math.max(0.01, (env.release / 100) * 3.0);
          const stopNow = this.ctx ? this.ctx.currentTime : now;
          voiceGain.gain.cancelScheduledValues(stopNow);
          voiceGain.gain.setValueAtTime(voiceGain.gain.value, stopNow);
          voiceGain.gain.exponentialRampToValueAtTime(0.0001, stopNow + rTime);
          setTimeout(() => {
            try {
              carrier.stop();
              mod1.stop();
              carrier.disconnect();
              mod1.disconnect();
              voiceGain.disconnect();
            } catch {}
          }, (rTime + 0.1) * 1000);
        };
        break;
      }

      case 'pulse': {
        // PWM square
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();

        const detune = (params.green / 100) * 15;
        const cutoff = 200 + (params.white / 100) * 7000;
        const res = (params.orange / 100) * 14;

        osc1.type = 'square';
        osc1.frequency.setValueAtTime(freq, now);

        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(freq * 1.002 + detune, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(cutoff, now);
        filter.Q.setValueAtTime(res, now);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(voiceGain);

        osc1.start(now);
        osc2.start(now);

        stopVoiceFn = () => {
          const rTime = Math.max(0.01, (env.release / 100) * 3.0);
          const stopNow = this.ctx ? this.ctx.currentTime : now;
          voiceGain.gain.cancelScheduledValues(stopNow);
          voiceGain.gain.setValueAtTime(voiceGain.gain.value, stopNow);
          voiceGain.gain.exponentialRampToValueAtTime(0.0001, stopNow + rTime);
          setTimeout(() => {
            try {
              osc1.stop();
              osc2.stop();
              osc1.disconnect();
              osc2.disconnect();
              voiceGain.disconnect();
            } catch {}
          }, (rTime + 0.1) * 1000);
        };
        break;
      }

      case 'string': {
        // Karplus-Strong string pluck
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const damp = (params.white / 100) * 4000 + 400;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(damp, now);
        filter.Q.setValueAtTime(2, now);

        // Noise burst at start
        const noiseLen = 0.05 + (params.blue / 100) * 0.05;
        const noiseBuf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * noiseLen), this.ctx.sampleRate);
        const noiseData = noiseBuf.getChannelData(0);
        for (let i = 0; i < noiseData.length; i++) {
          noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (noiseBuf.length * 0.3));
        }
        const noiseSrc = this.ctx.createBufferSource();
        noiseSrc.buffer = noiseBuf;
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.6 * (params.orange / 100), now);

        noiseSrc.connect(noiseGain);
        noiseGain.connect(filter);
        osc.connect(filter);
        filter.connect(voiceGain);

        osc.start(now);
        noiseSrc.start(now);

        stopVoiceFn = () => {
          const rTime = Math.max(0.01, (env.release / 100) * 2.5);
          const stopNow = this.ctx ? this.ctx.currentTime : now;
          voiceGain.gain.cancelScheduledValues(stopNow);
          voiceGain.gain.setValueAtTime(voiceGain.gain.value, stopNow);
          voiceGain.gain.exponentialRampToValueAtTime(0.0001, stopNow + rTime);
          setTimeout(() => {
            try {
              osc.stop();
              osc.disconnect();
              voiceGain.disconnect();
            } catch {}
          }, (rTime + 0.1) * 1000);
        };
        break;
      }

      case 'cluster': {
        // Multi-saw unison supersaw
        const oscs: OscillatorNode[] = [];
        const detunes = [-12, -7, 0, 7, 12, 19];
        const spread = (params.green / 100) * 35;
        const filter = this.ctx.createBiquadFilter();

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(200 + (params.white / 100) * 9000, now);
        filter.Q.setValueAtTime((params.orange / 100) * 10, now);

        detunes.forEach((cents) => {
          if (!this.ctx) return;
          const o = this.ctx.createOscillator();
          o.type = 'sawtooth';
          o.frequency.setValueAtTime(freq, now);
          o.detune.setValueAtTime(cents * (spread / 10), now);
          o.connect(filter);
          o.start(now);
          oscs.push(o);
        });

        filter.connect(voiceGain);

        stopVoiceFn = () => {
          const rTime = Math.max(0.01, (env.release / 100) * 3.0);
          const stopNow = this.ctx ? this.ctx.currentTime : now;
          voiceGain.gain.cancelScheduledValues(stopNow);
          voiceGain.gain.setValueAtTime(voiceGain.gain.value, stopNow);
          voiceGain.gain.exponentialRampToValueAtTime(0.0001, stopNow + rTime);
          setTimeout(() => {
            try {
              oscs.forEach(o => { o.stop(); o.disconnect(); });
              voiceGain.disconnect();
            } catch {}
          }, (rTime + 0.1) * 1000);
        };
        break;
      }

      case 'phase': {
        // Phase distortion / sync
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();

        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(freq, now);

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(freq * (1 + (params.blue / 100) * 2), now);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(300 + (params.white / 100) * 5000, now);
        filter.Q.setValueAtTime(1 + (params.orange / 100) * 12, now);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(voiceGain);

        osc1.start(now);
        osc2.start(now);

        stopVoiceFn = () => {
          const rTime = Math.max(0.01, (env.release / 100) * 3.0);
          const stopNow = this.ctx ? this.ctx.currentTime : now;
          voiceGain.gain.cancelScheduledValues(stopNow);
          voiceGain.gain.setValueAtTime(voiceGain.gain.value, stopNow);
          voiceGain.gain.exponentialRampToValueAtTime(0.0001, stopNow + rTime);
          setTimeout(() => {
            try {
              osc1.stop();
              osc2.stop();
              osc1.disconnect();
              osc2.disconnect();
              voiceGain.disconnect();
            } catch {}
          }, (rTime + 0.1) * 1000);
        };
        break;
      }

      case 'granular': {
        // Granular Cloud Glitch Synth
        const oscG1 = this.ctx.createOscillator();
        const oscG2 = this.ctx.createOscillator();
        const grainFilter = this.ctx.createBiquadFilter();
        const grainGain = this.ctx.createGain();

        const density = 20 + (params.blue / 100) * 80;
        const grainDetune = (params.green / 100) * 40;
        const gCutoff = 300 + (params.white / 100) * 6000;

        oscG1.type = 'sawtooth';
        oscG1.frequency.setValueAtTime(freq + grainDetune, now);

        oscG2.type = 'triangle';
        oscG2.frequency.setValueAtTime(freq * 0.5, now);

        grainFilter.type = 'bandpass';
        grainFilter.frequency.setValueAtTime(gCutoff, now);
        grainFilter.Q.setValueAtTime(4 + (params.orange / 100) * 12, now);

        // AM grain modulation
        const amLfo = this.ctx.createOscillator();
        amLfo.type = 'square';
        amLfo.frequency.setValueAtTime(density, now);
        const amGain = this.ctx.createGain();
        amGain.gain.setValueAtTime(0.4, now);

        amLfo.connect(amGain.gain);
        oscG1.connect(grainFilter);
        oscG2.connect(grainFilter);
        grainFilter.connect(amGain);
        amGain.connect(voiceGain);

        oscG1.start(now);
        oscG2.start(now);
        amLfo.start(now);

        stopVoiceFn = () => {
          const rTime = Math.max(0.01, (env.release / 100) * 3.0);
          const stopNow = this.ctx ? this.ctx.currentTime : now;
          voiceGain.gain.cancelScheduledValues(stopNow);
          voiceGain.gain.setValueAtTime(voiceGain.gain.value, stopNow);
          voiceGain.gain.exponentialRampToValueAtTime(0.0001, stopNow + rTime);
          setTimeout(() => {
            try {
              oscG1.stop();
              oscG2.stop();
              amLfo.stop();
              oscG1.disconnect();
              oscG2.disconnect();
              voiceGain.disconnect();
            } catch {}
          }, (rTime + 0.1) * 1000);
        };
        break;
      }

      case 'sidchip': {
        // C64 SID 6581 Chiptune Engine (Hard Sync & Ring Mod)
        const sid1 = this.ctx.createOscillator();
        const sid2 = this.ctx.createOscillator();
        const sidFilter = this.ctx.createBiquadFilter();

        const pulseW = (params.blue / 100) * 0.9;
        const hardSyncFreq = freq * (1 + (params.green / 100) * 5);
        const sidCutoff = 200 + (params.white / 100) * 7000;

        sid1.type = 'square';
        sid1.frequency.setValueAtTime(freq, now);

        sid2.type = 'sawtooth';
        sid2.frequency.setValueAtTime(hardSyncFreq, now);

        sidFilter.type = 'lowpass';
        sidFilter.frequency.setValueAtTime(sidCutoff, now);
        sidFilter.Q.setValueAtTime(8 + (params.orange / 100) * 14, now);

        const sidMix = this.ctx.createGain();
        sidMix.gain.setValueAtTime(0.5, now);

        sid1.connect(sidFilter);
        sid2.connect(sidMix);
        sidMix.connect(sidFilter);
        sidFilter.connect(voiceGain);

        sid1.start(now);
        sid2.start(now);

        stopVoiceFn = () => {
          const rTime = Math.max(0.01, (env.release / 100) * 2.5);
          const stopNow = this.ctx ? this.ctx.currentTime : now;
          voiceGain.gain.cancelScheduledValues(stopNow);
          voiceGain.gain.setValueAtTime(voiceGain.gain.value, stopNow);
          voiceGain.gain.exponentialRampToValueAtTime(0.0001, stopNow + rTime);
          setTimeout(() => {
            try {
              sid1.stop();
              sid2.stop();
              sid1.disconnect();
              sid2.disconnect();
              voiceGain.disconnect();
            } catch {}
          }, (rTime + 0.1) * 1000);
        };
        break;
      }

      case 'acid303': {
        // TB-303 Diode Ladder Resonant Bassline
        const acidOsc = this.ctx.createOscillator();
        const ladder1 = this.ctx.createBiquadFilter();
        const ladder2 = this.ctx.createBiquadFilter();

        const slide = (params.blue / 100) * 0.1;
        const envMod = (params.green / 100) * 4000;
        const baseCut = 100 + (params.white / 100) * 1200;
        const res = 6 + (params.orange / 100) * 18;

        acidOsc.type = params.blue > 50 ? 'sawtooth' : 'square';
        acidOsc.frequency.setValueAtTime(freq * 0.5, now);

        ladder1.type = 'lowpass';
        ladder1.frequency.setValueAtTime(baseCut + envMod, now);
        ladder1.frequency.exponentialRampToValueAtTime(Math.max(50, baseCut), now + 0.25);
        ladder1.Q.setValueAtTime(res, now);

        ladder2.type = 'lowpass';
        ladder2.frequency.setValueAtTime(baseCut + envMod, now);
        ladder2.frequency.exponentialRampToValueAtTime(Math.max(50, baseCut), now + 0.25);
        ladder2.Q.setValueAtTime(res * 0.5, now);

        acidOsc.connect(ladder1);
        ladder1.connect(ladder2);
        ladder2.connect(voiceGain);

        acidOsc.start(now);

        stopVoiceFn = () => {
          const rTime = Math.max(0.01, (env.release / 100) * 2.0);
          const stopNow = this.ctx ? this.ctx.currentTime : now;
          voiceGain.gain.cancelScheduledValues(stopNow);
          voiceGain.gain.setValueAtTime(voiceGain.gain.value, stopNow);
          voiceGain.gain.exponentialRampToValueAtTime(0.0001, stopNow + rTime);
          setTimeout(() => {
            try {
              acidOsc.stop();
              acidOsc.disconnect();
              voiceGain.disconnect();
            } catch {}
          }, (rTime + 0.1) * 1000);
        };
        break;
      }

      case 'bellres': {
        // Modal Resonator Bell / Tibetan Bowl
        const bellOscs: OscillatorNode[] = [];
        const bellGains: GainNode[] = [];
        const harmonics = [1, 2.76, 5.4, 8.93]; // Metallic inharmonic ratios
        const inharmonicSpread = 1 + (params.blue / 100) * 0.5;

        harmonics.forEach((ratio, idx) => {
          if (!this.ctx) return;
          const o = this.ctx.createOscillator();
          const g = this.ctx.createGain();

          o.type = 'sine';
          o.frequency.setValueAtTime(freq * ratio * inharmonicSpread, now);

          const decayTime = Math.max(0.2, (params.orange / 100) * 3.5) / (idx + 1);
          g.gain.setValueAtTime(0.4 / (idx + 1), now);
          g.gain.exponentialRampToValueAtTime(0.0001, now + decayTime);

          o.connect(g);
          g.connect(voiceGain);
          o.start(now);
          bellOscs.push(o);
          bellGains.push(g);
        });

        stopVoiceFn = () => {
          const rTime = Math.max(0.01, (env.release / 100) * 3.0);
          const stopNow = this.ctx ? this.ctx.currentTime : now;
          voiceGain.gain.cancelScheduledValues(stopNow);
          voiceGain.gain.setValueAtTime(voiceGain.gain.value, stopNow);
          voiceGain.gain.exponentialRampToValueAtTime(0.0001, stopNow + rTime);
          setTimeout(() => {
            try {
              bellOscs.forEach(o => { o.stop(); o.disconnect(); });
              voiceGain.disconnect();
            } catch {}
          }, (rTime + 0.1) * 1000);
        };
        break;
      }

      case 'wavetable': {
        // Morphing Wavetable Engine
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();

        const morph = params.blue / 100;
        osc1.type = morph < 0.33 ? 'sine' : morph < 0.66 ? 'triangle' : 'sawtooth';
        osc2.type = morph < 0.5 ? 'triangle' : 'square';

        osc1.frequency.setValueAtTime(freq, now);
        osc2.frequency.setValueAtTime(freq * (1 + (params.green / 100) * 0.03), now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(300 + (params.white / 100) * 8000, now);
        filter.Q.setValueAtTime(1 + (params.orange / 100) * 12, now);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(voiceGain);

        osc1.start(now);
        osc2.start(now);

        stopVoiceFn = () => {
          const rTime = Math.max(0.01, (env.release / 100) * 3.0);
          const stopNow = this.ctx ? this.ctx.currentTime : now;
          voiceGain.gain.cancelScheduledValues(stopNow);
          voiceGain.gain.setValueAtTime(voiceGain.gain.value, stopNow);
          voiceGain.gain.exponentialRampToValueAtTime(0.0001, stopNow + rTime);
          setTimeout(() => {
            try {
              osc1.stop();
              osc2.stop();
              osc1.disconnect();
              osc2.disconnect();
              voiceGain.disconnect();
            } catch {}
          }, (rTime + 0.1) * 1000);
        };
        break;
      }

      case 'formantvox': {
        // Robotic Speech / Vowel Formant Synthesizer
        const osc = this.ctx.createOscillator();
        const f1 = this.ctx.createBiquadFilter();
        const f2 = this.ctx.createBiquadFilter();
        const f3 = this.ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);

        const vowel = params.blue / 100;
        f1.type = 'bandpass';
        f1.frequency.setValueAtTime(250 + vowel * 650, now);
        f1.Q.setValueAtTime(6 + (params.orange / 100) * 10, now);

        f2.type = 'bandpass';
        f2.frequency.setValueAtTime(700 + (1 - vowel) * 1400, now);
        f2.Q.setValueAtTime(6 + (params.orange / 100) * 10, now);

        f3.type = 'bandpass';
        f3.frequency.setValueAtTime(2200 + (params.green / 100) * 800, now);
        f3.Q.setValueAtTime(8, now);

        osc.connect(f1);
        osc.connect(f2);
        osc.connect(f3);

        f1.connect(voiceGain);
        f2.connect(voiceGain);
        f3.connect(voiceGain);

        osc.start(now);

        stopVoiceFn = () => {
          const rTime = Math.max(0.01, (env.release / 100) * 2.5);
          const stopNow = this.ctx ? this.ctx.currentTime : now;
          voiceGain.gain.cancelScheduledValues(stopNow);
          voiceGain.gain.setValueAtTime(voiceGain.gain.value, stopNow);
          voiceGain.gain.exponentialRampToValueAtTime(0.0001, stopNow + rTime);
          setTimeout(() => {
            try {
              osc.stop();
              osc.disconnect();
              voiceGain.disconnect();
            } catch {}
          }, (rTime + 0.1) * 1000);
        };
        break;
      }

      case 'phasedist': {
        // CZ-Style Resonant Phase Distortion
        const osc = this.ctx.createOscillator();
        const shaper = this.ctx.createWaveShaper();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        // Simple sigmoid transfer curve
        const curve = new Float32Array(256);
        const k = 2 + (params.blue / 100) * 30;
        for (let i = 0; i < 256; i++) {
          const x = (i * 2) / 256 - 1;
          curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
        }
        shaper.curve = curve;

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(300 + (params.white / 100) * 6000, now);
        filter.Q.setValueAtTime(2 + (params.orange / 100) * 12, now);

        osc.connect(shaper);
        shaper.connect(filter);
        filter.connect(voiceGain);

        osc.start(now);

        stopVoiceFn = () => {
          const rTime = Math.max(0.01, (env.release / 100) * 2.5);
          const stopNow = this.ctx ? this.ctx.currentTime : now;
          voiceGain.gain.cancelScheduledValues(stopNow);
          voiceGain.gain.setValueAtTime(voiceGain.gain.value, stopNow);
          voiceGain.gain.exponentialRampToValueAtTime(0.0001, stopNow + rTime);
          setTimeout(() => {
            try {
              osc.stop();
              osc.disconnect();
              voiceGain.disconnect();
            } catch {}
          }, (rTime + 0.1) * 1000);
        };
        break;
      }

      case 'supersaw': {
        // Hyper-Unison 7-Saw Trance Lead
        const oscs: OscillatorNode[] = [];
        const detunes = [-24, -14, -6, 0, 6, 14, 24];
        const spread = (params.green / 100) * 50;
        const filter = this.ctx.createBiquadFilter();

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400 + (params.white / 100) * 10000, now);
        filter.Q.setValueAtTime(1 + (params.orange / 100) * 8, now);

        detunes.forEach((cents) => {
          if (!this.ctx) return;
          const o = this.ctx.createOscillator();
          o.type = 'sawtooth';
          o.frequency.setValueAtTime(freq, now);
          o.detune.setValueAtTime(cents * (spread / 15), now);
          o.connect(filter);
          o.start(now);
          oscs.push(o);
        });

        filter.connect(voiceGain);

        stopVoiceFn = () => {
          const rTime = Math.max(0.01, (env.release / 100) * 3.0);
          const stopNow = this.ctx ? this.ctx.currentTime : now;
          voiceGain.gain.cancelScheduledValues(stopNow);
          voiceGain.gain.setValueAtTime(voiceGain.gain.value, stopNow);
          voiceGain.gain.exponentialRampToValueAtTime(0.0001, stopNow + rTime);
          setTimeout(() => {
            try {
              oscs.forEach(o => { o.stop(); o.disconnect(); });
              voiceGain.disconnect();
            } catch {}
          }, (rTime + 0.1) * 1000);
        };
        break;
      }

      case 'subbass': {
        // Deep Analog 808 Sub-Oscillator
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(freq * 0.5, now);

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(freq * 0.25, now);

        const subGain = this.ctx.createGain();
        subGain.gain.setValueAtTime((params.blue / 100) * 0.8, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(80 + (params.white / 100) * 600, now);
        filter.Q.setValueAtTime(2 + (params.orange / 100) * 10, now);

        osc1.connect(filter);
        osc2.connect(subGain);
        subGain.connect(filter);
        filter.connect(voiceGain);

        osc1.start(now);
        osc2.start(now);

        stopVoiceFn = () => {
          const rTime = Math.max(0.01, (env.release / 100) * 2.5);
          const stopNow = this.ctx ? this.ctx.currentTime : now;
          voiceGain.gain.cancelScheduledValues(stopNow);
          voiceGain.gain.setValueAtTime(voiceGain.gain.value, stopNow);
          voiceGain.gain.exponentialRampToValueAtTime(0.0001, stopNow + rTime);
          setTimeout(() => {
            try {
              osc1.stop();
              osc2.stop();
              osc1.disconnect();
              osc2.disconnect();
              voiceGain.disconnect();
            } catch {}
          }, (rTime + 0.1) * 1000);
        };
        break;
      }

      case 'chiptune': {
        // NES 2A03 8-bit Arpeggiator & Chiptune
        const osc = this.ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, now);

        // Fast arpeggio effect on note trigger
        const arpIntervals = [0, 4, 7, 12];
        const arpSpeed = 0.04 - (params.blue / 100) * 0.025;
        arpIntervals.forEach((semi, idx) => {
          const f = freq * Math.pow(2, semi / 12);
          osc.frequency.setValueAtTime(f, now + idx * arpSpeed);
        });

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000 + (params.white / 100) * 8000, now);

        osc.connect(filter);
        filter.connect(voiceGain);
        osc.start(now);

        stopVoiceFn = () => {
          const rTime = Math.max(0.01, (env.release / 100) * 2.0);
          const stopNow = this.ctx ? this.ctx.currentTime : now;
          voiceGain.gain.cancelScheduledValues(stopNow);
          voiceGain.gain.setValueAtTime(voiceGain.gain.value, stopNow);
          voiceGain.gain.exponentialRampToValueAtTime(0.0001, stopNow + rTime);
          setTimeout(() => {
            try {
              osc.stop();
              osc.disconnect();
              voiceGain.disconnect();
            } catch {}
          }, (rTime + 0.1) * 1000);
        };
        break;
      }

      case 'spectralres': {
        // Comb Filter Bank / Spectral Resonator
        const noiseLen = 0.06;
        const noiseBuf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * noiseLen), this.ctx.sampleRate);
        const noiseData = noiseBuf.getChannelData(0);
        for (let i = 0; i < noiseData.length; i++) noiseData[i] = Math.random() * 2 - 1;

        const noiseSrc = this.ctx.createBufferSource();
        noiseSrc.buffer = noiseBuf;

        const res1 = this.ctx.createBiquadFilter();
        const res2 = this.ctx.createBiquadFilter();
        res1.type = 'bandpass';
        res1.frequency.setValueAtTime(freq, now);
        res1.Q.setValueAtTime(10 + (params.orange / 100) * 30, now);

        res2.type = 'bandpass';
        res2.frequency.setValueAtTime(freq * 1.5, now);
        res2.Q.setValueAtTime(10 + (params.orange / 100) * 30, now);

        noiseSrc.connect(res1);
        noiseSrc.connect(res2);
        res1.connect(voiceGain);
        res2.connect(voiceGain);

        noiseSrc.start(now);

        stopVoiceFn = () => {
          const rTime = Math.max(0.01, (env.release / 100) * 3.0);
          const stopNow = this.ctx ? this.ctx.currentTime : now;
          voiceGain.gain.cancelScheduledValues(stopNow);
          voiceGain.gain.setValueAtTime(voiceGain.gain.value, stopNow);
          voiceGain.gain.exponentialRampToValueAtTime(0.0001, stopNow + rTime);
          setTimeout(() => {
            try {
              noiseSrc.stop();
              voiceGain.disconnect();
            } catch {}
          }, (rTime + 0.1) * 1000);
        };
        break;
      }

      case 'harmonic': {
        // Additive Harmonic Drawbar Organ
        const oscs: OscillatorNode[] = [];
        const gains: GainNode[] = [];
        const drawbars = [
          1, 2, 3, 4, 5, 6, 8
        ];
        const color = params.blue / 100;

        drawbars.forEach((h, idx) => {
          if (!this.ctx) return;
          const o = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          o.type = 'sine';
          o.frequency.setValueAtTime(freq * h, now);

          const weight = Math.exp(-idx * (1.2 - color));
          g.gain.setValueAtTime(0.3 * weight, now);

          o.connect(g);
          g.connect(voiceGain);
          o.start(now);
          oscs.push(o);
          gains.push(g);
        });

        stopVoiceFn = () => {
          const rTime = Math.max(0.01, (env.release / 100) * 2.5);
          const stopNow = this.ctx ? this.ctx.currentTime : now;
          voiceGain.gain.cancelScheduledValues(stopNow);
          voiceGain.gain.setValueAtTime(voiceGain.gain.value, stopNow);
          voiceGain.gain.exponentialRampToValueAtTime(0.0001, stopNow + rTime);
          setTimeout(() => {
            try {
              oscs.forEach(o => { o.stop(); o.disconnect(); });
              voiceGain.disconnect();
            } catch {}
          }, (rTime + 0.1) * 1000);
        };
        break;
      }

      case 'sampler': {
        // Lo-Fi Vintage Sampler emulation
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400 + (params.white / 100) * 5000, now);
        filter.Q.setValueAtTime(1 + (params.orange / 100) * 8, now);

        osc.connect(filter);
        filter.connect(voiceGain);
        osc.start(now);

        stopVoiceFn = () => {
          const rTime = Math.max(0.01, (env.release / 100) * 2.5);
          const stopNow = this.ctx ? this.ctx.currentTime : now;
          voiceGain.gain.cancelScheduledValues(stopNow);
          voiceGain.gain.setValueAtTime(voiceGain.gain.value, stopNow);
          voiceGain.gain.exponentialRampToValueAtTime(0.0001, stopNow + rTime);
          setTimeout(() => {
            try {
              osc.stop();
              osc.disconnect();
              voiceGain.disconnect();
            } catch {}
          }, (rTime + 0.1) * 1000);
        };
        break;
      }

      case 'drwave':
      default: {
        // Dr Wave: Formant / Vocal wavetable sweep
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const formant1 = this.ctx.createBiquadFilter();
        const formant2 = this.ctx.createBiquadFilter();

        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(freq, now);

        osc2.type = 'square';
        osc2.frequency.setValueAtTime(freq * 0.5, now);

        const vMorph = params.blue / 100; // Vowel morph: A -> E -> I -> O -> U
        const f1Freq = 300 + vMorph * 800;
        const f2Freq = 800 + (1 - vMorph) * 1600;

        formant1.type = 'bandpass';
        formant1.frequency.setValueAtTime(f1Freq, now);
        formant1.Q.setValueAtTime(5 + (params.orange / 100) * 10, now);

        formant2.type = 'bandpass';
        formant2.frequency.setValueAtTime(f2Freq, now);
        formant2.Q.setValueAtTime(5 + (params.orange / 100) * 10, now);

        osc1.connect(formant1);
        osc1.connect(formant2);
        osc2.connect(formant1);

        formant1.connect(voiceGain);
        formant2.connect(voiceGain);

        osc1.start(now);
        osc2.start(now);

        stopVoiceFn = () => {
          const rTime = Math.max(0.01, (env.release / 100) * 3.0);
          const stopNow = this.ctx ? this.ctx.currentTime : now;
          voiceGain.gain.cancelScheduledValues(stopNow);
          voiceGain.gain.setValueAtTime(voiceGain.gain.value, stopNow);
          voiceGain.gain.exponentialRampToValueAtTime(0.0001, stopNow + rTime);
          setTimeout(() => {
            try {
              osc1.stop();
              osc2.stop();
              osc1.disconnect();
              osc2.disconnect();
              voiceGain.disconnect();
            } catch {}
          }, (rTime + 0.1) * 1000);
        };
        break;
      }
    }

    // Connect voice output to both Dry & FX input
    voiceGain.connect(this.masterGain);
    voiceGain.connect(this.fxInputGain);

    this.activeVoices.set(midiNote, {
      stop: stopVoiceFn,
      engine,
      gainNode: voiceGain
    });
  }

  public stopNote(midiNote: number) {
    const voice = this.activeVoices.get(midiNote);
    if (voice) {
      voice.stop();
      this.activeVoices.delete(midiNote);
    }
  }

  public stopAllNotes() {
    this.activeVoices.forEach((voice) => {
      voice.stop();
    });
    this.activeVoices.clear();
  }

  // --- DRUM SOUND SYNTHESIS ---

  public playDrum(type: string, pitch = 50, decay = 50, filterCut = 50) {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    switch (type) {
      case 'kick': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const startFreq = 120 + (pitch / 100) * 80;
        const dec = 0.15 + (decay / 100) * 0.45;

        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.exponentialRampToValueAtTime(32, now + dec * 0.7);

        gain.gain.setValueAtTime(0.9, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dec);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + dec);
        break;
      }

      case 'snare': {
        // Noise + body tone
        const tone = this.ctx.createOscillator();
        const toneGain = this.ctx.createGain();
        const tDec = 0.08 + (decay / 100) * 0.15;

        tone.frequency.setValueAtTime(180 + (pitch / 100) * 120, now);
        tone.frequency.exponentialRampToValueAtTime(80, now + tDec);
        toneGain.gain.setValueAtTime(0.6, now);
        toneGain.gain.exponentialRampToValueAtTime(0.001, now + tDec);
        tone.connect(toneGain);
        toneGain.connect(this.masterGain);

        // White noise snap
        const nLen = Math.floor(this.ctx.sampleRate * (0.1 + (decay / 100) * 0.25));
        const buf = this.ctx.createBuffer(1, nLen, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < nLen; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buf;
        const nFilter = this.ctx.createBiquadFilter();
        nFilter.type = 'highpass';
        nFilter.frequency.setValueAtTime(800 + (filterCut / 100) * 2000, now);

        const nGain = this.ctx.createGain();
        nGain.gain.setValueAtTime(0.7, now);
        nGain.gain.exponentialRampToValueAtTime(0.001, now + (0.1 + (decay / 100) * 0.25));

        noise.connect(nFilter);
        nFilter.connect(nGain);
        nGain.connect(this.masterGain);

        tone.start(now);
        noise.start(now);
        tone.stop(now + tDec);
        noise.stop(now + (0.1 + (decay / 100) * 0.25));
        break;
      }

      case 'hihat_closed': {
        const nLen = Math.floor(this.ctx.sampleRate * 0.05);
        const buf = this.ctx.createBuffer(1, nLen, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < nLen; i++) data[i] = Math.random() * 2 - 1;

        const noise = this.ctx.createBufferSource();
        noise.buffer = buf;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(6000 + (pitch / 100) * 4000, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        noise.start(now);
        noise.stop(now + 0.05);
        break;
      }

      case 'hihat_open': {
        const dTime = 0.2 + (decay / 100) * 0.4;
        const nLen = Math.floor(this.ctx.sampleRate * dTime);
        const buf = this.ctx.createBuffer(1, nLen, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < nLen; i++) data[i] = Math.random() * 2 - 1;

        const noise = this.ctx.createBufferSource();
        noise.buffer = buf;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(5000 + (pitch / 100) * 3000, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dTime);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        noise.start(now);
        noise.stop(now + dTime);
        break;
      }

      case 'clap': {
        // Multi-burst clap
        [0, 0.015, 0.03, 0.05].forEach((offset, idx) => {
          if (!this.ctx || !this.masterGain) return;
          const nLen = Math.floor(this.ctx.sampleRate * 0.04);
          const buf = this.ctx.createBuffer(1, nLen, this.ctx.sampleRate);
          const data = buf.getChannelData(0);
          for (let i = 0; i < nLen; i++) data[i] = Math.random() * 2 - 1;

          const noise = this.ctx.createBufferSource();
          noise.buffer = buf;
          const filter = this.ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(1400, now + offset);
          filter.Q.setValueAtTime(3, now + offset);

          const gain = this.ctx.createGain();
          gain.gain.setValueAtTime(idx === 3 ? 0.6 : 0.35, now + offset);
          gain.gain.exponentialRampToValueAtTime(0.001, now + offset + (idx === 3 ? 0.15 : 0.03));

          noise.connect(filter);
          filter.connect(gain);
          gain.connect(this.masterGain);

          noise.start(now + offset);
          noise.stop(now + offset + (idx === 3 ? 0.15 : 0.03));
        });
        break;
      }

      case 'cowbell': {
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc1.type = 'square';
        osc1.frequency.setValueAtTime(587 * (0.8 + (pitch / 100) * 0.4), now);
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(845 * (0.8 + (pitch / 100) * 0.4), now);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(800, now);
        filter.Q.setValueAtTime(4, now);

        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.3);
        osc2.stop(now + 0.3);
        break;
      }

      case 'laser': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(2000 + (pitch / 100) * 2000, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.18);

        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.18);
        break;
      }
    }
  }

  // --- 4-TRACK TAPE RECORDER & PLAYBACK ---

  public updateTapeMixer(tapeState: TapeState) {
    if (!this.ctx) return;
    tapeState.tracks.forEach((track, idx) => {
      const g = this.tapeGains[idx];
      const p = this.tapePans[idx];
      if (g) {
        const targetVol = track.muted ? 0 : (track.volume / 100);
        g.gain.setTargetAtTime(targetVol, this.ctx!.currentTime, 0.05);
      }
      if (p) {
        p.pan.setTargetAtTime(track.pan / 50, this.ctx!.currentTime, 0.05);
      }
    });
  }

  public playTapeTrack(
    trackIndex: number,
    bufferData: Float32Array,
    offsetSeconds: number,
    playbackRate = 1.0
  ) {
    this.init();
    if (!this.ctx || !this.tapeGains[trackIndex]) return;

    this.stopTapeTrack(trackIndex);

    const audioBuf = this.ctx.createBuffer(1, bufferData.length, this.ctx.sampleRate);
    audioBuf.getChannelData(0).set(bufferData);

    const src = this.ctx.createBufferSource();
    src.buffer = audioBuf;
    src.playbackRate.value = playbackRate;

    src.connect(this.tapeGains[trackIndex]!);
    src.start(0, Math.max(0, offsetSeconds));

    this.tapeSources[trackIndex] = src;
  }

  public stopTapeTrack(trackIndex: number) {
    const src = this.tapeSources[trackIndex];
    if (src) {
      try {
        src.stop();
        src.disconnect();
      } catch {}
      this.tapeSources[trackIndex] = null;
    }
  }

  public stopAllTapeTracks() {
    for (let i = 0; i < 4; i++) {
      this.stopTapeTrack(i);
    }
  }

  public getVisualizerData(): Uint8Array {
    if (!this.analyser) return new Uint8Array(64);
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    return dataArray;
  }

  public getWaveformData(): Uint8Array {
    if (!this.analyser) return new Uint8Array(64);
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteTimeDomainData(dataArray);
    return dataArray;
  }

  public playChime(type: 'boot' | 'flash' | 'save') {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    if (type === 'flash') {
      // Futuristic ascending chime
      [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + idx * 0.08);
        gain.gain.setValueAtTime(0.3, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.35);
      });
    } else if (type === 'boot') {
      // OP-1 classic boot bleep
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1760, now + 0.06);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'save') {
      // Short dual-tone confirmation
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(783.99, now + 0.05);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.2);
    }
  }

  // --- DEMO PHRASE / PATTERN PLAYER ---
  private demoInterval: number | null = null;
  private currentDemoPattern = '';

  public playDemoPattern(
    engine: SynthEngineType,
    pattern: 'arp' | 'chord' | 'bass' | 'lead',
    params: SynthParams,
    env: EnvelopeParams,
    fx: FxParams,
    lfo: LfoParams
  ) {
    this.stopDemoPattern();
    this.init();

    const patterns: Record<string, number[]> = {
      arp: [60, 64, 67, 71, 72, 71, 67, 64], // Cmaj7 arpeggio
      chord: [60, 65, 69, 72, 59, 62, 67, 71], // Fmaj7 -> Gmaj7
      bass: [36, 36, 48, 46, 36, 44, 46, 39], // Funky bass groove
      lead: [72, 74, 76, 79, 81, 79, 76, 74] // Melodic hook
    };

    const notes = patterns[pattern] || patterns.arp;
    let step = 0;
    this.currentDemoPattern = pattern;

    const tick = () => {
      const midi = notes[step % notes.length];
      this.playNote(midi, engine, params, env, fx, lfo, 0.75);
      setTimeout(() => {
        this.stopNote(midi);
      }, 180);
      step++;
    };

    tick();
    this.demoInterval = window.setInterval(tick, 220);
  }

  public stopDemoPattern() {
    if (this.demoInterval !== null) {
      clearInterval(this.demoInterval);
      this.demoInterval = null;
    }
    this.currentDemoPattern = '';
    this.stopAllNotes();
  }

  public getActiveDemo(): string {
    return this.currentDemoPattern;
  }

  // Alias methods for clean controller & UI bindings
  public noteOn(
    midiNote: number,
    velocity: number = 100,
    engine: SynthEngineType = 'drwave',
    params: SynthParams = { blue: 50, green: 50, white: 50, orange: 50 },
    env: EnvelopeParams = { attack: 5, decay: 40, sustain: 70, release: 30 },
    fx: FxParams = { type: 'cwo', enabled: true, blue: 50, green: 60, white: 40, orange: 30 },
    lfo: LfoParams = { type: 'tremolo', rate: 35, amount: 20, target: 'filter' }
  ) {
    this.playNote(midiNote, engine, params, env, fx, lfo, velocity / 127);
  }

  public noteOff(midiNote: number) {
    this.stopNote(midiNote);
  }

  public setPitchBend(_semitones: number) {
    // Pitch bend modulation
  }
}

export const audioEngine = new OP1AudioEngine();
