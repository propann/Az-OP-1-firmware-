export type SynthEngineType = 
  | 'iter'          // Hidden mod synth: Cellular/Additive FM
  | 'digital'       // Iconic gritty digital synth with ring mod
  | 'fm'            // 4-operator FM synthesis
  | 'pulse'         // Pulse-width modulation square wave
  | 'string'        // Karplus-strong physical string modeling
  | 'cluster'       // Multi-saw wave unison detune cluster
  | 'phase'         // Phase distortion synthesis
  | 'drwave'        // Formant / vocal wavetable synthesis
  | 'granular'      // Custom DSP Engine 1: Granular Glitch Cloud
  | 'sidchip'       // Custom DSP Engine 2: 6581 SID Chiptune
  | 'acid303'       // Custom DSP Engine 3: Transistor Bassline
  | 'bellres'       // Custom DSP Engine 4: Modal Resonator Bell
  | 'sampler'       // Sample-based / drum
  | 'wavetable'     // Custom DSP Engine 5: Morphing Wavetable
  | 'formantvox'    // Custom DSP Engine 6: Robotic Speech Synthesizer
  | 'phasedist'     // Custom DSP Engine 7: CZ Resonant Phase Shifter
  | 'supersaw'      // Custom DSP Engine 8: Hyper-Unison Trance Saw
  | 'subbass'       // Custom DSP Engine 9: Analog Fat 808 Sub-Osc
  | 'chiptune'      // Custom DSP Engine 10: 2A03 8-bit Arpeggiator
  | 'spectralres'   // Custom DSP Engine 11: Comb-Filter Spectral Resonator
  | 'harmonic';     // Custom DSP Engine 12: Additive Harmonic Drawbar

export type ScreenMode = 'synth' | 'drum' | 'tape' | 'mixer' | 'modder' | 'sequencer' | 'preset' | 'engineering';

export type FxType = 'cwo' | 'delay' | 'nitro' | 'filter' | 'reverb' | 'chorus';

export type LfoType = 'tremolo' | 'filter' | 'pitch' | 'random';

export type CwoAnimal = 'cow' | 'moose' | 'cat' | 'shiba';

export type OledTheme = 'classic' | 'neon' | 'cyberpunk' | 'solarized' | 'inverted' | 'amber';

export interface SynthParams {
  // Knobs: Blue, Green, White, Orange
  blue: number;   // 0 - 100
  green: number;  // 0 - 100
  white: number;  // 0 - 100
  orange: number; // 0 - 100
}

export interface EnvelopeParams {
  attack: number;  // 0 - 100 (0.01s - 3s)
  decay: number;   // 0 - 100 (0.05s - 4s)
  sustain: number; // 0 - 100 (0.0 - 1.0 gain)
  release: number; // 0 - 100 (0.01s - 5s)
}

export interface FxParams {
  type: FxType;
  enabled: boolean;
  blue: number;   // e.g. Freq / Time / Wet
  green: number;  // e.g. Feedback / Size / Shift
  white: number;  // e.g. Damping / Color / Depth
  orange: number; // e.g. Wet/Dry mix
}

export interface LfoParams {
  type: LfoType;
  rate: number;    // 0 - 100 (0.1Hz - 20Hz)
  amount: number;  // 0 - 100
  target: 'pitch' | 'filter' | 'volume' | 'pan';
}

export interface TapeTrack {
  id: number;
  name: string;
  muted: boolean;
  solo: boolean;
  volume: number; // 0 - 100
  pan: number;    // -50 (L) to +50 (R)
  recordedBuffer: Float32Array | null;
  recordedLength: number; // in seconds
  waveformPoints: number[];
}

export interface TapeState {
  isPlaying: boolean;
  isRecording: boolean;
  selectedTrack: number; // 1, 2, 3, 4
  playheadPosition: number; // 0 to 60 seconds
  loopStart: number;
  loopEnd: number;
  isLooping: boolean;
  speed: number; // 0.5, 1, 2, -1 (reverse)
  tapeLength: number; // default 30s
  tracks: [TapeTrack, TapeTrack, TapeTrack, TapeTrack];
}

export interface DrumPad {
  id: number;
  name: string;
  key: string;
  type: 'kick' | 'snare' | 'hihat_closed' | 'hihat_open' | 'tom' | 'clap' | 'laser' | 'cowbell';
  pitch: number;
  decay: number;
  filter: number;
  pan: number;
}

export interface FirmwareModState {
  firmwareVersion: string;
  baseVersion: string;
  buildDate: string;
  unlockIterSynth: boolean;
  unlockFilterEffect: boolean;
  subtleFx: boolean;
  cwoGraphic: CwoAnimal;
  oledTheme: OledTheme;
  tapeGraphicInvert: boolean;
  customBootScreenText: string;
  batteryIndicatorCustom: boolean;
  highSampleRateMode: boolean;
  unlockedHiddenPresets: boolean;
  flashCount: number;
  customDspEnginesUnlocked: boolean;
}

export interface SynthPreset {
  id: string;
  name: string;
  category: 'Lead' | 'Bass' | 'Pad' | 'Keys' | 'FX' | 'Modded' | 'Custom DSP';
  engine: SynthEngineType;
  params: SynthParams;
  envelope: EnvelopeParams;
  fx: FxParams;
  lfo: LfoParams;
  isModdedPreset?: boolean;
}

export interface SequencerStep {
  active: boolean;
  note: number;
  velocity: number;
}

export interface TombolaBall {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  note: number;
}

// --- MODULAR FIRMWARE SUITE & RACK DATA TYPES ---

export type DashboardTab = 'firmware-manager' | 'mod-workshop' | 'creation-studio' | 'production-pipeline';

export interface OfficialFirmwareInfo {
  id: string;
  version: string;
  fileName: string;
  buildDate: string;
  bootloaderVer: string;
  sizeMb: number;
  sha256: string;
  md5: string;
  crc32: string;
  isModded: boolean;
  description: string;
  features: string[];
}

export interface FirmwareFileNode {
  id: string;
  name: string;
  path: string;
  type: 'folder' | 'file';
  sizeBytes: number;
  extension?: 'svg' | 'aif' | 'json' | 'db' | 'ldr' | 'bin' | 'txt';
  contentPreview?: string;
  children?: FirmwareFileNode[];
}

export interface FactoryDbPresetRow {
  id: string;
  patchName: string;
  engine: SynthEngineType;
  category: 'Lead' | 'Bass' | 'Pad' | 'Keys' | 'FX' | 'Drums' | 'Acoustic' | 'Experimental';
  octave: number;
  blue: number;
  green: number;
  white: number;
  orange: number;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  fxType: FxType;
  fxWet: number;
  isCustom: boolean;
}

export interface BuildLogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR' | 'PATCH' | 'HASH';
  message: string;
  step?: string;
}

export interface CustomDspEngineDefinition {
  id: SynthEngineType;
  name: string;
  category: string;
  author: string;
  description: string;
  hookTargetSymbol: string;
  romOffsetHex: string;
  codeCpp: string;
  knobBlueLabel: string;
  knobGreenLabel: string;
  knobWhiteLabel: string;
  knobOrangeLabel: string;
  icon: string;
  isCommunityMod: boolean;
  waveformType: string;
}

export interface BlackfinHook {
  id: string;
  addressHex: string;
  symbol: string;
  description: string;
  originalEngine: string;
  patchedEngine: string;
  status: 'FACTORY_ROM' | 'HOOKED' | 'BYPASSED' | 'VERIFIED';
  sizeBytes: number;
  cyclesPerSample: number;
}

export interface SamplePatch {
  id: string;
  name: string;
  type: 'synth' | 'drum';
  category: string;
  sampleRate: number;
  rootKey: number;
  slicesCount: number;
  fileSizeBytes: number;
  metadataJson: string;
  hasLoop: boolean;
}

export interface SvgGraphicAsset {
  id: string;
  name: string;
  targetScreen: 'cwo' | 'tape' | 'boot' | 'battery' | 'envelope';
  width: number;
  height: number;
  elementCount: number;
  op1Normalized: boolean;
  svgMarkup: string;
}

export interface FirmwareBinaryInspector {
  version: string;
  buildDate: string;
  bootloaderVersion: string;
  crc32: string;
  sha256: string;
  fileSizeBytes: number;
  decompressedSizeBytes: number;
  lzmaDictionarySize: string;
  blackfinArch: string;
  l1SramUsagePercent: number;
  sdramUsagePercent: number;
}

