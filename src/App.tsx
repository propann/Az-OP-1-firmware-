import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  SynthEngineType, 
  ScreenMode, 
  SynthParams, 
  EnvelopeParams, 
  FxParams, 
  LfoParams, 
  TapeState, 
  TapeTrack,
  DrumPad, 
  FirmwareModState,
  SynthPreset 
} from './types';
import { audioEngine } from './audio/engine';
import { FACTORY_PRESETS, INITIAL_DRUM_PADS } from './data/presets';
import { OledDisplay } from './components/OledDisplay';
import { KnobControl } from './components/KnobControl';
import { Keyboard } from './components/Keyboard';
import { TapeControls } from './components/TapeControls';
import { TombolaSequencer } from './components/TombolaSequencer';
import { FirmwareModderModal } from './components/FirmwareModderModal';
import { EngineeringLabModal } from './components/EngineeringLabModal';
import { ModularDashboard } from './components/ModularDashboard';
import { 
  Sparkles, 
  Cpu, 
  Music, 
  Disc, 
  Sliders, 
  Layers, 
  Wrench, 
  FolderHeart,
  LayoutDashboard,
  Monitor
} from 'lucide-react';

const createDefaultTrack = (id: number, name: string): TapeTrack => ({
  id,
  name,
  muted: false,
  solo: false,
  volume: 80,
  pan: 0,
  recordedBuffer: null,
  recordedLength: 0,
  waveformPoints: []
});

export const App: React.FC = () => {
  // Global View Mode ('dashboard' = Modular Engineering Studio, 'hardware' = Physical OP-1 Console)
  const [viewMode, setViewMode] = useState<'dashboard' | 'hardware'>('dashboard');

  // Navigation & Mode
  const [screenMode, setScreenMode] = useState<ScreenMode>('synth');
  const [currentEngine, setCurrentEngine] = useState<SynthEngineType>('iter');
  const [synthSubTab, setSynthSubTab] = useState<'engine' | 'envelope' | 'fx' | 'lfo'>('engine');
  
  // Sound Parameters
  const [synthParams, setSynthParams] = useState<SynthParams>({
    blue: 64,
    green: 72,
    white: 80,
    orange: 45
  });

  const [envelopeParams, setEnvelopeParams] = useState<EnvelopeParams>({
    attack: 8,
    decay: 45,
    sustain: 60,
    release: 35
  });

  const [fxParams, setFxParams] = useState<FxParams>({
    type: 'cwo',
    enabled: true,
    blue: 55,
    green: 65,
    white: 40,
    orange: 35
  });

  const [lfoParams, setLfoParams] = useState<LfoParams>({
    type: 'tremolo',
    rate: 40,
    amount: 25,
    target: 'filter'
  });

  // Tape State
  const [tapeState, setTapeState] = useState<TapeState>({
    isPlaying: false,
    isRecording: false,
    selectedTrack: 1,
    playheadPosition: 0,
    loopStart: 0,
    loopEnd: 16,
    isLooping: false,
    speed: 1.0,
    tapeLength: 30,
    tracks: [
      createDefaultTrack(1, 'Track 1'),
      createDefaultTrack(2, 'Track 2'),
      createDefaultTrack(3, 'Track 3'),
      createDefaultTrack(4, 'Track 4')
    ]
  });

  // Firmware & Mod State
  const [modState, setModState] = useState<FirmwareModState>({
    firmwareVersion: 'OP-1 v246 (Az-Modded)',
    baseVersion: '246',
    buildDate: '2024-05-18',
    unlockIterSynth: true,
    unlockFilterEffect: true,
    subtleFx: true,
    cwoGraphic: 'cow',
    oledTheme: 'classic',
    tapeGraphicInvert: false,
    customBootScreenText: 'Az-OP-1 ENGINEERING LAB v2.46',
    batteryIndicatorCustom: true,
    highSampleRateMode: true,
    unlockedHiddenPresets: true,
    flashCount: 3,
    customDspEnginesUnlocked: true
  });

  // Drum Pads & Keyboard State
  const [drumPads] = useState<DrumPad[]>(INITIAL_DRUM_PADS);
  const [activeMidiNotes, setActiveMidiNotes] = useState<number[]>([]);
  const [octave, setOctave] = useState<number>(4);
  const [masterVolume] = useState<number>(80);
  const [bpm] = useState<number>(120);

  // Modals
  const [isFirmwareModalOpen, setIsFirmwareModalOpen] = useState(false);
  const [isEngineeringLabOpen, setIsEngineeringLabOpen] = useState(false);
  const [isTombolaOpen, setIsTombolaOpen] = useState(false);
  const [isPresetsDrawerOpen, setIsPresetsDrawerOpen] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('iter-lab-1');

  // Animation & Tape Timer Ref
  const tapeIntervalRef = useRef<number | null>(null);

  // Initialize FX on engine
  useEffect(() => {
    audioEngine.updateFx(fxParams);
  }, [fxParams]);

  // Master Volume update
  useEffect(() => {
    audioEngine.setMasterVolume(masterVolume / 100);
  }, [masterVolume]);

  // Master BPM update
  useEffect(() => {
    audioEngine.setBpm(bpm);
  }, [bpm]);

  // Note Handlers
  const handleNoteOn = useCallback((note: number) => {
    audioEngine.init();
    setActiveMidiNotes((prev) => Array.from(new Set([...prev, note])));
    audioEngine.playNote(note, currentEngine, synthParams, envelopeParams, fxParams, lfoParams);
  }, [currentEngine, synthParams, envelopeParams, fxParams, lfoParams]);

  const handleNoteOff = useCallback((note: number) => {
    setActiveMidiNotes((prev) => prev.filter((n) => n !== note));
    audioEngine.stopNote(note);
  }, []);

  const handleDrumTrigger = useCallback((pad: DrumPad) => {
    audioEngine.init();
    audioEngine.playDrum(pad.type, pad.pitch, pad.decay, pad.filter);
  }, []);

  // Tape Transport Controls
  const handleTapePlay = () => {
    audioEngine.init();
    setTapeState((prev) => {
      const nextPlay = !prev.isPlaying;
      if (nextPlay) {
        if (!tapeIntervalRef.current) {
          tapeIntervalRef.current = window.setInterval(() => {
            setTapeState((ts) => {
              const nextPos = ts.playheadPosition + 0.1 * ts.speed;
              if (ts.isLooping && nextPos >= ts.loopEnd) {
                return { ...ts, playheadPosition: ts.loopStart };
              }
              return { ...ts, playheadPosition: nextPos };
            });
          }, 100);
        }
      } else {
        if (tapeIntervalRef.current) {
          clearInterval(tapeIntervalRef.current);
          tapeIntervalRef.current = null;
        }
        audioEngine.stopAllTapeTracks();
      }
      return { ...prev, isPlaying: nextPlay };
    });
  };

  const handleTapeStop = () => {
    if (tapeIntervalRef.current) {
      clearInterval(tapeIntervalRef.current);
      tapeIntervalRef.current = null;
    }
    audioEngine.stopAllTapeTracks();
    setTapeState((prev) => ({ ...prev, isPlaying: false, isRecording: false }));
  };

  const handleTapeRecordToggle = () => {
    setTapeState((prev) => {
      const nextRec = !prev.isRecording;
      if (nextRec && !prev.isPlaying) {
        handleTapePlay();
      }
      return { ...prev, isRecording: nextRec };
    });
  };

  const handlePresetSelect = (preset: SynthPreset) => {
    setSelectedPresetId(preset.id);
    setCurrentEngine(preset.engine);
    setSynthParams({ ...preset.params });
    setEnvelopeParams({ ...preset.envelope });
    setFxParams({ ...preset.fx });
    setLfoParams({ ...preset.lfo });
    audioEngine.playChime('save');
  };

  // Select custom engine from Engineering Lab
  const handleSelectCustomEngine = (engine: SynthEngineType) => {
    setCurrentEngine(engine);
    setScreenMode('synth');
    setSynthSubTab('engine');
  };

  // Get current active knob values & labels based on Screen Mode
  const getKnobConfigs = () => {
    if (screenMode === 'synth') {
      if (synthSubTab === 'envelope') {
        return [
          { color: 'blue' as const, label: 'Attack', value: envelopeParams.attack, onChange: (v: number) => setEnvelopeParams(p => ({ ...p, attack: v })) },
          { color: 'green' as const, label: 'Decay', value: envelopeParams.decay, onChange: (v: number) => setEnvelopeParams(p => ({ ...p, decay: v })) },
          { color: 'white' as const, label: 'Sustain', value: envelopeParams.sustain, onChange: (v: number) => setEnvelopeParams(p => ({ ...p, sustain: v })) },
          { color: 'orange' as const, label: 'Release', value: envelopeParams.release, onChange: (v: number) => setEnvelopeParams(p => ({ ...p, release: v })) },
        ];
      }
      if (synthSubTab === 'fx') {
        return [
          { color: 'blue' as const, label: fxParams.type === 'cwo' ? 'Freq Mod' : 'Time / HP', value: fxParams.blue, onChange: (v: number) => setFxParams(p => ({ ...p, blue: v })) },
          { color: 'green' as const, label: fxParams.type === 'cwo' ? 'Resonance' : 'Feedback / LP', value: fxParams.green, onChange: (v: number) => setFxParams(p => ({ ...p, green: v })) },
          { color: 'white' as const, label: fxParams.type === 'cwo' ? 'Mod Depth' : 'Tone / Q', value: fxParams.white, onChange: (v: number) => setFxParams(p => ({ ...p, white: v })) },
          { color: 'orange' as const, label: 'Wet Mix', value: fxParams.orange, onChange: (v: number) => setFxParams(p => ({ ...p, orange: v })) },
        ];
      }
      if (synthSubTab === 'lfo') {
        return [
          { color: 'blue' as const, label: 'Rate (Speed)', value: lfoParams.rate, onChange: (v: number) => setLfoParams(p => ({ ...p, rate: v })) },
          { color: 'green' as const, label: 'Amount (Depth)', value: lfoParams.amount, onChange: (v: number) => setLfoParams(p => ({ ...p, amount: v })) },
          { color: 'white' as const, label: 'Shape / Mod', value: 50, onChange: () => {} },
          { color: 'orange' as const, label: 'Target Param', value: 30, onChange: () => {} },
        ];
      }

      // Default engine labels
      const engineLabels: Record<SynthEngineType, [string, string, string, string]> = {
        iter: ['Density', 'FM Feedbk', 'Cutoff', 'Resonance'],
        drwave: ['Vowel Morph', 'Pitch Env', 'Formant 2', 'Chop Wave'],
        digital: ['Bit Crushing', 'Ring Mod', 'Cutoff', 'Resonance'],
        fm: ['Mod Ratio', 'FM Depth', 'Brightness', 'Envelope'],
        string: ['Noise Impulse', 'Tuning', 'Damping', 'Pluck Mass'],
        pulse: ['Pulse Width', 'Detune', 'Cutoff', 'Resonance'],
        cluster: ['Unison Detune', 'Stereo Spread', 'Cutoff', 'Resonance'],
        phase: ['Phase Angle', 'Sync Harm', 'Bandpass', 'Mod Res'],
        granular: ['Grain Density', 'Detune Scatter', 'Bandpass Cut', 'Grain Texture'],
        sidchip: ['Pulse Width', 'Hard Sync Freq', 'Filter Cut', 'Resonance'],
        acid303: ['Waveform / Slide', 'Env Modulation', 'Cutoff Freq', 'Diode Res'],
        bellres: ['Inharmonic Ratio', 'Strike Attack', 'Damp High', 'Modal Decay'],
        wavetable: ['Wavetable Pos', 'Formant Mod', 'Filter Cut', 'Resonance'],
        formantvox: ['Vowel Shape', 'Throat Formant', 'Breath Air', 'Resonance'],
        phasedist: ['PD Shape', 'Resonance Peak', 'Drive Saturation', 'Warmth'],
        supersaw: ['7-Saw Detune', 'Stereo Spread', 'Lowpass Cut', 'Resonance'],
        subbass: ['Sub 808 Drive', 'Harmonic 2nd', 'Pitch Glide', 'Lowpass Cut'],
        chiptune: ['NES Duty Cycle', 'Arp Speed', 'Bit Depth', 'Noise Mix'],
        spectralres: ['Resonator Bank', 'Damping High', 'Spread Freq', 'Decay Time'],
        harmonic: ['Partials Tilt', 'Odd/Even Balance', 'Formant Peak', 'Harmonic Decay'],
        sampler: ['Sample Start', 'Sample End', 'Filter Cut', 'Pitch Trim']
      };
      const labels = engineLabels[currentEngine] || ['Blue', 'Green', 'White', 'Orange'];
      return [
        { color: 'blue' as const, label: labels[0], value: synthParams.blue, onChange: (v: number) => setSynthParams(p => ({ ...p, blue: v })) },
        { color: 'green' as const, label: labels[1], value: synthParams.green, onChange: (v: number) => setSynthParams(p => ({ ...p, green: v })) },
        { color: 'white' as const, label: labels[2], value: synthParams.white, onChange: (v: number) => setSynthParams(p => ({ ...p, white: v })) },
        { color: 'orange' as const, label: labels[3], value: synthParams.orange, onChange: (v: number) => setSynthParams(p => ({ ...p, orange: v })) },
      ];
    }

    // Tape / Mixer
    return [
      { color: 'blue' as const, label: 'Track 1 Level', value: tapeState.tracks[0].volume, onChange: (v: number) => setTapeState(ts => ({ ...ts, tracks: [ { ...ts.tracks[0], volume: v }, ts.tracks[1], ts.tracks[2], ts.tracks[3] ] })) },
      { color: 'green' as const, label: 'Track 2 Level', value: tapeState.tracks[1].volume, onChange: (v: number) => setTapeState(ts => ({ ...ts, tracks: [ ts.tracks[0], { ...ts.tracks[1], volume: v }, ts.tracks[2], ts.tracks[3] ] })) },
      { color: 'white' as const, label: 'Track 3 Level', value: tapeState.tracks[2].volume, onChange: (v: number) => setTapeState(ts => ({ ...ts, tracks: [ ts.tracks[0], ts.tracks[1], { ...ts.tracks[2], volume: v }, ts.tracks[3] ] })) },
      { color: 'orange' as const, label: 'Track 4 Level', value: tapeState.tracks[3].volume, onChange: (v: number) => setTapeState(ts => ({ ...ts, tracks: [ ts.tracks[0], ts.tracks[1], ts.tracks[2], { ...ts.tracks[3], volume: v } ] })) },
    ];
  };

  const knobConfigs = getKnobConfigs();

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-start p-2 sm:p-4 md:p-6 select-none font-sans">
      {/* Top Global Mode Navigation (Modular Dashboard vs OP-1 Hardware Chassis) */}
      <div className="w-full max-w-7xl flex items-center justify-between gap-4 mb-4 pb-2 border-b border-neutral-800/80">
        <div className="flex items-center gap-2">
          <button
            id="view-mode-dashboard-btn"
            onClick={() => {
              setViewMode('dashboard');
              audioEngine.playChime('save');
            }}
            className={`px-3.5 py-1.5 rounded-lg font-mono text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
              viewMode === 'dashboard'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-900/30'
                : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Studio Modulaire (Dashboard)
          </button>

          <button
            id="view-mode-hardware-btn"
            onClick={() => {
              setViewMode('hardware');
              audioEngine.playChime('save');
            }}
            className={`px-3.5 py-1.5 rounded-lg font-mono text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
              viewMode === 'hardware'
                ? 'bg-orange-600 text-white shadow-md shadow-orange-900/30'
                : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            Console OP-1 Matérielle
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-3 text-xs font-mono text-neutral-400">
          <span>Target: <strong className="text-cyan-400">ADSP-BF533</strong></span>
          <span>•</span>
          <span>BPM: <strong className="text-orange-400">{bpm}</strong></span>
          <span>•</span>
          <span>DSP LOAD: <strong className="text-emerald-400">7.2%</strong></span>
        </div>
      </div>

      {/* VIEW 1: MODULAR ENGINEERING STUDIO DASHBOARD */}
      {viewMode === 'dashboard' && (
        <ModularDashboard
          modState={modState}
          setModState={setModState}
          currentEngine={currentEngine}
          setCurrentEngine={setCurrentEngine}
          synthParams={synthParams}
          setSynthParams={setSynthParams}
          envelope={envelopeParams}
          setEnvelope={setEnvelopeParams}
          fx={fxParams}
          setFx={setFxParams}
          lfo={lfoParams}
          setLfo={setLfoParams}
          tapeState={tapeState}
          onSwitchToHardwareView={() => setViewMode('hardware')}
        />
      )}

      {/* VIEW 2: OP-1 HARDWARE CONSOLE CHASSIS */}
      {viewMode === 'hardware' && (
        <>
          {/* Top Header Bar */}
          <header className="w-full max-w-5xl flex flex-wrap items-center justify-between gap-3 mb-4 px-4 py-2.5 rounded-xl bg-neutral-900/90 border border-neutral-800 shadow-md">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-neutral-800 border border-neutral-700 font-mono text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse"></span>
                <strong className="text-white tracking-wider">TE AZ-OP-1</strong>
                <span className="text-neutral-400 text-[10px]">FW v{modState.baseVersion}</span>
              </div>

              <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-neutral-400">
                <span>BPM: <strong className="text-orange-400">{bpm}</strong></span>
                <span>•</span>
                <span>DSP LOAD: <strong className="text-green-400">7.2%</strong></span>
              </div>
            </div>

            {/* Global Action Modals */}
            <div className="flex items-center gap-2">
              <button
                id="open-engineering-lab-btn"
                onClick={() => setIsEngineeringLabOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-mono text-xs font-bold transition shadow-md shadow-orange-600/30 active:scale-95"
                title="Open Level 1-2-3 Reverse Engineering & DSP IDE"
              >
                <Cpu className="w-4 h-4" />
                <span>Engineering Lab (L1-2-3)</span>
              </button>

              <button
                id="open-firmware-patcher-btn"
                onClick={() => setIsFirmwareModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 font-mono text-xs font-semibold transition active:scale-95"
                title="Firmware Surface Modder"
              >
                <Wrench className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Firmware Patcher</span>
              </button>

              <button
                id="open-tombola-btn"
                onClick={() => setIsTombolaOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 font-mono text-xs font-semibold transition active:scale-95"
                title="Tombola Physics Sequencer"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span className="hidden sm:inline">Tombola</span>
              </button>

              <button
                id="open-presets-btn"
                onClick={() => setIsPresetsDrawerOpen(!isPresetsDrawerOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono text-xs font-semibold transition active:scale-95 ${
                  isPresetsDrawerOpen
                    ? 'bg-blue-600/30 text-blue-300 border-blue-500'
                    : 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-200'
                }`}
              >
                <FolderHeart className="w-3.5 h-3.5 text-blue-400" />
                <span>Presets</span>
              </button>
            </div>
          </header>

          {/* Main OP-1 Hardware Chassis */}
          <main className="w-full max-w-5xl bg-[#1c1c1e] border-2 border-neutral-800 rounded-3xl p-4 sm:p-6 shadow-2xl shadow-black/80 flex flex-col gap-6 relative">
        {/* Top Control Strip: Mode Selector, Engine Picker & Encoders */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          {/* Left: Mode Buttons & Synth Engine Switcher */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            {/* Mode Switcher */}
            <div className="flex items-center justify-between p-1 rounded-xl bg-neutral-900 border border-neutral-800 shadow-inner">
              {[
                { id: 'synth', label: 'SYNTH', icon: Music },
                { id: 'drum', label: 'DRUM', icon: Disc },
                { id: 'tape', label: 'TAPE', icon: Layers },
                { id: 'mixer', label: 'MIXER', icon: Sliders },
              ].map((m) => (
                <button
                  key={m.id}
                  id={`mode-btn-${m.id}`}
                  onClick={() => {
                    setScreenMode(m.id as ScreenMode);
                    audioEngine.init();
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-mono text-xs font-bold transition ${
                    screenMode === m.id
                      ? 'bg-neutral-800 text-orange-400 border border-neutral-700 shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <m.icon className="w-3.5 h-3.5" />
                  {m.label}
                </button>
              ))}
            </div>

            {/* Sub-modes for Synth: Sound / ADSR / FX / LFO */}
            {screenMode === 'synth' && (
              <div className="grid grid-cols-4 gap-1.5 p-1 rounded-lg bg-neutral-950/60 border border-neutral-800/80 font-mono text-[11px]">
                {[
                  { id: 'engine', label: '1 • ENGINE' },
                  { id: 'envelope', label: '2 • ADSR' },
                  { id: 'fx', label: '3 • FX CWO' },
                  { id: 'lfo', label: '4 • LFO' },
                ].map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => setSynthSubTab(sub.id as any)}
                    className={`py-1.5 rounded text-center font-bold transition ${
                      synthSubTab === sub.id
                        ? 'bg-neutral-800 text-blue-400 border border-neutral-700'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
            )}

            {/* Quick Engine Selector Pill List */}
            {screenMode === 'synth' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
                  <span>MOTEUR AUDIO SÉLECTIONNÉ :</span>
                  <span className="text-orange-400 font-bold uppercase">{currentEngine}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'iter', label: 'Iter (Mod)', isMod: true },
                    { id: 'granular', label: 'Granular (DSP)', isMod: true },
                    { id: 'sidchip', label: 'SID 6581 (DSP)', isMod: true },
                    { id: 'acid303', label: 'Acid 303 (DSP)', isMod: true },
                    { id: 'bellres', label: 'Bell Res (DSP)', isMod: true },
                    { id: 'drwave', label: 'Dr. Wave' },
                    { id: 'digital', label: 'Digital' },
                    { id: 'fm', label: 'FM 4-Op' },
                    { id: 'string', label: 'String' },
                    { id: 'pulse', label: 'Pulse PWM' },
                    { id: 'cluster', label: 'Cluster' },
                    { id: 'phase', label: 'Phase Sync' },
                  ].map((eng) => (
                    <button
                      key={eng.id}
                      onClick={() => {
                        setCurrentEngine(eng.id as SynthEngineType);
                        audioEngine.playChime('boot');
                      }}
                      className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold transition ${
                        currentEngine === eng.id
                          ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
                          : eng.isMod
                          ? 'bg-neutral-900 border border-orange-500/30 text-orange-300 hover:bg-neutral-800'
                          : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      {eng.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Center/Right: 4 Optical Encoders (Blue, Green, White, Orange) */}
          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-2xl bg-neutral-950/70 border border-neutral-800/80 shadow-inner">
            {knobConfigs.map((knob) => (
              <KnobControl
                key={knob.color}
                color={knob.color}
                label={knob.label}
                value={knob.value}
                onChange={knob.onChange}
              />
            ))}
          </div>
        </section>

        {/* OLED Screen & Visualization Core */}
        <section className="flex flex-col items-center justify-center p-2 rounded-2xl bg-black border-4 border-neutral-800 shadow-2xl relative">
          <OledDisplay
            mode={screenMode}
            engine={currentEngine}
            synthParams={synthParams}
            envParams={envelopeParams}
            fxParams={fxParams}
            lfoParams={lfoParams}
            tapeState={tapeState}
            modState={modState}
            activeNotes={activeMidiNotes}
            bpm={bpm}
            isEnvelopeTab={synthSubTab === 'envelope'}
          />
        </section>

        {/* Dynamic Contextual Modules: Drum Pads / Tape Deck / Keyboard */}
        {screenMode === 'drum' && (
          <section className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-neutral-400">
              <span>PADS DE BATTERIE 24-VOIX • DÉCLENCHEMENT PHYSIQUE OU CLAVIER [Z-M]</span>
              <span className="text-orange-400 font-bold">MODE SAMPLER DRUM</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
              {drumPads.map((pad) => (
                <button
                  key={pad.id}
                  onClick={() => handleDrumTrigger(pad)}
                  className="p-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 active:bg-orange-500 active:text-white border border-neutral-700 flex flex-col items-center justify-center gap-1.5 transition active:scale-95 group shadow-sm"
                >
                  <span className="text-[10px] font-mono text-neutral-500 group-hover:text-neutral-300">
                    [{pad.key}]
                  </span>
                  <span className="text-xs font-bold text-neutral-200 group-hover:text-white">
                    {pad.name}
                  </span>
                  <span className="text-[9px] font-mono text-orange-400">
                    P:{pad.pitch}%
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {(screenMode === 'tape' || screenMode === 'mixer') && (
          <section>
            <TapeControls
              tapeState={tapeState}
              onPlay={handleTapePlay}
              onStop={handleTapeStop}
              onRecordToggle={handleTapeRecordToggle}
              onTrackSelect={(t) => setTapeState(ts => ({ ...ts, selectedTrack: t + 1 }))}
              onTrackVolumeChange={(t, v) => setTapeState(ts => ({
                ...ts,
                tracks: [
                  t === 0 ? { ...ts.tracks[0], volume: v } : ts.tracks[0],
                  t === 1 ? { ...ts.tracks[1], volume: v } : ts.tracks[1],
                  t === 2 ? { ...ts.tracks[2], volume: v } : ts.tracks[2],
                  t === 3 ? { ...ts.tracks[3], volume: v } : ts.tracks[3],
                ]
              }))}
              onTrackMuteToggle={(t) => setTapeState(ts => ({
                ...ts,
                tracks: [
                  t === 0 ? { ...ts.tracks[0], muted: !ts.tracks[0].muted } : ts.tracks[0],
                  t === 1 ? { ...ts.tracks[1], muted: !ts.tracks[1].muted } : ts.tracks[1],
                  t === 2 ? { ...ts.tracks[2], muted: !ts.tracks[2].muted } : ts.tracks[2],
                  t === 3 ? { ...ts.tracks[3], muted: !ts.tracks[3].muted } : ts.tracks[3],
                ]
              }))}
              onSpeedChange={(s) => setTapeState(ts => ({ ...ts, speed: s }))}
              onLoopToggle={() => setTapeState(ts => ({ ...ts, isLooping: !ts.isLooping }))}
              onClearTrack={(t) => alert(`Piste ${t + 1} effacée.`)}
              onScrub={(sec) => setTapeState(ts => ({ ...ts, playheadPosition: sec }))}
            />
          </section>
        )}

        {/* 24-Key OP-1 Piano Keyboard with Octave & Pitch Bend */}
        <section className="pt-2">
          <Keyboard
            onNoteOn={handleNoteOn}
            onNoteOff={handleNoteOff}
            activeNotes={activeMidiNotes}
            octave={octave}
            onOctaveChange={setOctave}
            onPitchBend={(_semi) => {}}
          />
        </section>
      </main>
      </>
      )}

      {/* Presets Slide-Over Drawer */}
      {isPresetsDrawerOpen && (
        <div className="fixed inset-y-0 right-0 z-40 w-80 bg-neutral-950 border-l border-neutral-800 shadow-2xl p-6 flex flex-col justify-between animate-in slide-in-from-right duration-200">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <FolderHeart className="w-4 h-4 text-blue-400" />
                <h3 className="font-bold text-white text-sm">Banque de Presets OP-1</h3>
              </div>
              <button
                onClick={() => setIsPresetsDrawerOpen(false)}
                className="text-neutral-400 hover:text-white text-xs font-mono"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 overflow-y-auto max-h-[70vh] pr-1">
              {FACTORY_PRESETS.map((preset) => (
                <div
                  key={preset.id}
                  onClick={() => handlePresetSelect(preset)}
                  className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                    selectedPresetId === preset.id
                      ? 'bg-neutral-900 border-orange-500 shadow-sm'
                      : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold text-white block">{preset.name}</span>
                    <span className="text-[10px] font-mono text-neutral-400 capitalize">
                      {preset.category} • {preset.engine}
                    </span>
                  </div>
                  {preset.isModdedPreset && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                      MOD
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-800 text-[11px] font-mono text-neutral-400 flex items-center justify-between">
            <span>TOTAL : {FACTORY_PRESETS.length} PRESETS</span>
            <span className="text-green-400">✓ SYNCHRONISÉ</span>
          </div>
        </div>
      )}

      {/* Engineering Lab Modal (Level 1, 2, 3) */}
      <EngineeringLabModal
        isOpen={isEngineeringLabOpen}
        onClose={() => setIsEngineeringLabOpen(false)}
        modState={modState}
        onUpdateModState={setModState}
        onSelectCustomEngine={handleSelectCustomEngine}
        currentEngine={currentEngine}
      />

      {/* Surface Firmware Patcher Modal */}
      <FirmwareModderModal
        isOpen={isFirmwareModalOpen}
        onClose={() => setIsFirmwareModalOpen(false)}
        modState={modState}
        onUpdateModState={setModState}
        onTriggerBootFlash={() => {
          audioEngine.playChime('flash');
        }}
      />

      {/* Tombola Sequencer Modal */}
      <TombolaSequencer
        isOpen={isTombolaOpen}
        onClose={() => setIsTombolaOpen(false)}
        onTriggerNote={handleNoteOn}
      />
    </div>
  );
};
