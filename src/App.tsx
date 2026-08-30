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
  FirmwareModState,
  OfficialFirmwareInfo,
  SynthPreset
} from './types';
import { audioEngine } from './audio/engine';
import { FACTORY_PRESETS } from './data/presets';
import { OFFICIAL_FIRMWARES } from './data/firmwareData';
import { OledDisplay } from './components/OledDisplay';
import { KnobControl } from './components/KnobControl';
import { Keyboard } from './components/Keyboard';
import { MidiControllerBar } from './components/MidiControllerBar';
import { OP1Button } from './components/OP1Button';
import { webMidi } from './midi/midiManager';
import { ModularDashboard } from './components/ModularDashboard';
import { FirmwareModderModal } from './components/FirmwareModderModal';
import { EngineeringLabModal } from './components/EngineeringLabModal';
import { TombolaSequencer } from './components/TombolaSequencer';
import { ProjectDocumentationModal } from './components/ProjectDocumentationModal';
import { RealBlackfinEmulatorModal } from './components/RealBlackfinEmulatorModal';
import { op1Vm } from './emulator/op1VirtualMachine';
import { 
  Music, 
  Disc, 
  Layers, 
  Sliders, 
  Play, 
  Square, 
  Circle, 
  Upload, 
  Volume2, 
  VolumeX, 
  Zap,
  ArrowUp,
  ArrowDown,
  Repeat,
  Radio,
  Cpu,
  Wrench,
  Sparkles,
  Dices,
  BookOpen,
  LayoutDashboard,
  Gamepad2
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
  // Navigation & Mode
  const [screenMode, setScreenMode] = useState<ScreenMode>('synth');
  const [currentEngine, setCurrentEngine] = useState<SynthEngineType>('drwave');
  const [synthSubTab, setSynthSubTab] = useState<'engine' | 'envelope' | 'fx' | 'lfo'>('engine');
  
  const [viewMode, setViewMode] = useState<'hardware' | 'dashboard'>('hardware');
  const [isFirmwareModalOpen, setIsFirmwareModalOpen] = useState<boolean>(false);
  const [isEngineeringLabOpen, setIsEngineeringLabOpen] = useState<boolean>(false);
  const [isTombolaOpen, setIsTombolaOpen] = useState<boolean>(false);
  const [isDocsOpen, setIsDocsOpen] = useState<boolean>(false);
  const [isRealEmulatorOpen, setIsRealEmulatorOpen] = useState<boolean>(false);

  // Sound Parameters
  const [synthParams, setSynthParams] = useState<SynthParams>({
    blue: 50,
    green: 50,
    white: 50,
    orange: 50
  });

  const [envelopeParams, setEnvelopeParams] = useState<EnvelopeParams>({
    attack: 5,
    decay: 40,
    sustain: 70,
    release: 30
  });

  const [fxParams, setFxParams] = useState<FxParams>({
    type: 'cwo',
    enabled: true,
    blue: 50,
    green: 60,
    white: 40,
    orange: 30
  });

  const [lfoParams, setLfoParams] = useState<LfoParams>({
    type: 'tremolo',
    rate: 35,
    amount: 20,
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
    firmwareVersion: 'v243-STOCK',
    baseVersion: '243',
    buildDate: '2022-06-14',
    unlockIterSynth: false,
    unlockFilterEffect: false,
    subtleFx: false,
    cwoGraphic: 'cow',
    oledTheme: 'classic',
    tapeGraphicInvert: false,
    customBootScreenText: 'TEENAGE ENGINEERING OP-1',
    batteryIndicatorCustom: false,
    highSampleRateMode: false,
    unlockedHiddenPresets: false,
    flashCount: 1,
    customDspEnginesUnlocked: false,
    crc32: '8B39DF12',
    targetChecksum: '8B39DF12'
  });

  const [activeMidiNotes, setActiveMidiNotes] = useState<number[]>([]);
  const [octave, setOctave] = useState<number>(3);
  const [masterVolume, setMasterVolume] = useState<number>(85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [bpm, setBpm] = useState<number>(120);
  const [isMetronomeOn, setIsMetronomeOn] = useState<boolean>(false);

  // MIDI status & Firmware Selection
  const [midiConnectedDevice, setMidiConnectedDevice] = useState<string | null>(null);
  const [selectedFirmwareId, setSelectedFirmwareId] = useState<string>('op1-fw-243-stock');
  const [allFirmwares, setAllFirmwares] = useState<OfficialFirmwareInfo[]>(OFFICIAL_FIRMWARES);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');

  // Boot sequence simulation
  const [isBooting, setIsBooting] = useState<boolean>(false);
  const [bootProgress, setBootProgress] = useState<number>(100);
  const [bootMessage, setBootMessage] = useState<string>('SYSTÈME PRÊT');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Audio Note Triggering
  const handleNoteOn = useCallback((note: number, velocity: number = 100) => {
    audioEngine.init();
    audioEngine.noteOn(note, velocity, currentEngine, synthParams, envelopeParams, fxParams, lfoParams);
    setActiveMidiNotes(prev => (prev.includes(note) ? prev : [...prev, note]));
  }, [currentEngine, synthParams, envelopeParams, fxParams, lfoParams]);

  const handleNoteOff = useCallback((note: number) => {
    audioEngine.noteOff(note);
    setActiveMidiNotes(prev => prev.filter(n => n !== note));
  }, []);

  // Web MIDI API Initialization & Controller Linking
  useEffect(() => {
    let unsubs: Array<() => void> = [];

    const setupMidi = async () => {
      const ok = await webMidi.init();
      if (ok) {
        const activeDev = webMidi.getActiveDevice();
        if (activeDev) setMidiConnectedDevice(activeDev.name);

        unsubs.push(
          webMidi.onDeviceChange((_devs, active) => {
            setMidiConnectedDevice(active ? active.name : null);
          }),
          webMidi.onNoteOn((note, vel) => {
            handleNoteOn(note, vel);
          }),
          webMidi.onNoteOff((note) => {
            handleNoteOff(note);
          }),
          webMidi.onCC((cc, val) => {
            const pct = Math.round((val / 127) * 100);
            if (cc === 1 || cc === 16 || cc === webMidi.mapping.blueKnobCC) {
              setSynthParams(p => ({ ...p, blue: pct }));
            } else if (cc === 2 || cc === 17 || cc === webMidi.mapping.greenKnobCC) {
              setSynthParams(p => ({ ...p, green: pct }));
            } else if (cc === 3 || cc === 18 || cc === webMidi.mapping.whiteKnobCC) {
              setSynthParams(p => ({ ...p, white: pct }));
            } else if (cc === 4 || cc === 19 || cc === webMidi.mapping.orangeKnobCC) {
              setSynthParams(p => ({ ...p, orange: pct }));
            } else if (cc === 50) {
              setScreenMode('synth');
            } else if (cc === 51) {
              setScreenMode('drum');
            } else if (cc === 52) {
              setScreenMode('tape');
            } else if (cc === 53) {
              setScreenMode('mixer');
            } else if (cc === 115) {
              setTapeState(ts => ({ ...ts, isPlaying: !ts.isPlaying }));
            } else if (cc === 116) {
              setTapeState(ts => ({ ...ts, isPlaying: false, playheadPosition: 0 }));
            } else if (cc === 117) {
              setTapeState(ts => ({ ...ts, isRecording: !ts.isRecording }));
            }
          }),
          webMidi.onPitchBend((bendVal) => {
            audioEngine.setPitchBend(bendVal * 2);
          }),
          webMidi.onMatrixKey((keyIndex, pressed) => {
            op1Vm.peripherals.setKey(keyIndex, pressed);
          })
        );
      }
    };

    setupMidi();

    return () => {
      unsubs.forEach(u => u());
    };
  }, [handleNoteOn, handleNoteOff]);

  // Master Volume sync
  useEffect(() => {
    audioEngine.setMasterVolume(isMuted ? 0 : masterVolume / 100);
  }, [masterVolume, isMuted]);

  // Boot Sequence Execution
  const triggerBootSequence = (firmwareName: string, checksum: string) => {
    setIsBooting(true);
    setBootProgress(5);
    setBootMessage(`CHARGEMENT ROM ${firmwareName}...`);
    audioEngine.playChime('boot');

    const steps = [
      { p: 25, msg: 'VÉRIFICATION CHECKSUM CRC32...' },
      { p: 50, msg: 'INITIALISATION DSP ADSP-BF524...' },
      { p: 75, msg: 'MONTAGE FLASH / OP1_factory.db...' },
      { p: 90, msg: 'CALIBRATION CODEC CIRRUS LOGIC 24-BIT...' },
      { p: 100, msg: 'SYSTÈME PRÊT' }
    ];

    steps.forEach((step, idx) => {
      setTimeout(() => {
        setBootProgress(step.p);
        setBootMessage(step.msg);
        if (idx === steps.length - 1) {
          setTimeout(() => {
            setIsBooting(false);
          }, 350);
        }
      }, (idx + 1) * 350);
    });
  };

  // Firmware Selection
  const handleSelectFirmware = (fw: OfficialFirmwareInfo) => {
    setSelectedFirmwareId(fw.id);
    const isCustom = fw.isModded;
    const base = fw.version.replace(/[^\d]/g, '').slice(0, 3) || '243';

    setModState(prev => ({
      ...prev,
      firmwareVersion: fw.version,
      baseVersion: base,
      buildDate: fw.buildDate,
      unlockIterSynth: isCustom,
      unlockFilterEffect: isCustom,
      targetChecksum: fw.crc32 || '8B39DF12'
    }));

    triggerBootSequence(fw.version, fw.crc32 || '8B39DF12');
  };

  // Custom .op1 File Upload
  const handleUploadOp1 = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Load binary into Blackfin Hardware VM
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result instanceof ArrayBuffer) {
        const rawBytes = new Uint8Array(event.target.result);
        op1Vm.loadFirmwareBinary(rawBytes, file.name);
      }
    };
    reader.readAsArrayBuffer(file);

    const newFw: OfficialFirmwareInfo = {
      id: `custom-fw-${Date.now()}`,
      version: file.name.replace('.op1', '').toUpperCase(),
      fileName: file.name,
      buildDate: new Date().toISOString().split('T')[0],
      bootloaderVer: 'v1.02.4',
      sizeMb: parseFloat((file.size / (1024 * 1024)).toFixed(2)),
      sha256: 'custom_sha256_hash_user_uploaded_file',
      md5: 'custom_md5_hash_user_file',
      crc32: 'A4F2C991',
      isModded: true,
      description: 'Firmware personnalisé binaire chargé dans l\'émulateur matériel Blackfin.',
      features: ['Firmware Custom .op1 Utilisateur', 'DSP Moddé', 'Patches Débloqués', 'Binaire Exécutable']
    };

    setAllFirmwares(prev => [newFw, ...prev]);
    handleSelectFirmware(newFw);
  };

  // Preset Selection
  const handlePresetSelect = (p: SynthPreset) => {
    setSelectedPresetId(p.id);
    setCurrentEngine(p.engine);
    setSynthParams(p.params);
    setEnvelopeParams(p.envelope);
    setFxParams(p.fx);
    setLfoParams(p.lfo);
    audioEngine.playChime('boot');
  };

  // 4 Knob Encoders Configuration
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
          { color: 'blue' as const, label: fxParams.type === 'cwo' ? 'Freq Mod' : 'Time', value: fxParams.blue, onChange: (v: number) => setFxParams(p => ({ ...p, blue: v })) },
          { color: 'green' as const, label: fxParams.type === 'cwo' ? 'Resonance' : 'Feedback', value: fxParams.green, onChange: (v: number) => setFxParams(p => ({ ...p, green: v })) },
          { color: 'white' as const, label: fxParams.type === 'cwo' ? 'Delay' : 'Cutoff', value: fxParams.white, onChange: (v: number) => setFxParams(p => ({ ...p, white: v })) },
          { color: 'orange' as const, label: 'Wet Mix', value: fxParams.orange, onChange: (v: number) => setFxParams(p => ({ ...p, orange: v })) },
        ];
      }
      if (synthSubTab === 'lfo') {
        return [
          { color: 'blue' as const, label: 'Rate', value: lfoParams.rate, onChange: (v: number) => setLfoParams(p => ({ ...p, rate: v })) },
          { color: 'green' as const, label: 'Amount', value: lfoParams.amount, onChange: (v: number) => setLfoParams(p => ({ ...p, amount: v })) },
          { color: 'white' as const, label: 'Shape', value: 50, onChange: () => {} },
          { color: 'orange' as const, label: 'Target', value: 30, onChange: () => {} },
        ];
      }

      // Default synth engines parameter names
      const engineLabels: Record<SynthEngineType, [string, string, string, string]> = {
        drwave: ['Freq', 'Formant', 'Chop', 'Wave'],
        iter: ['Cell Density', 'FM Feedback', 'Cutoff', 'Resonance'],
        digital: ['Bit Crush', 'Ring Mod', 'Cutoff', 'Resonance'],
        fm: ['Mod Ratio', 'FM Depth', 'Brightness', 'Envelope'],
        string: ['Noise Burst', 'Tuning', 'Damping', 'Pluck Mass'],
        pulse: ['Pulse Width', 'Detune', 'Cutoff', 'Resonance'],
        cluster: ['Unison Detune', 'Spread', 'Cutoff', 'Resonance'],
        phase: ['Phase Angle', 'Sync Harm', 'Bandpass', 'Mod Res'],
        granular: ['Grain Density', 'Detune', 'Bandpass', 'Texture'],
        sidchip: ['Pulse Width', 'Hard Sync', 'Cutoff', 'Resonance'],
        acid303: ['Slide Rate', 'Env Mod', 'Cutoff', 'Diode Res'],
        bellres: ['Inharm Ratio', 'Attack', 'Damping', 'Decay'],
        wavetable: ['Position', 'Formant', 'Cutoff', 'Resonance'],
        formantvox: ['Vowel', 'Throat', 'Breath', 'Resonance'],
        phasedist: ['PD Shape', 'Res Peak', 'Drive', 'Warmth'],
        supersaw: ['7-Saw Detune', 'Spread', 'Lowpass', 'Resonance'],
        subbass: ['Sub 808 Drive', 'Harmonic', 'Glide', 'Lowpass'],
        chiptune: ['NES Duty', 'Arp Speed', 'Bit Depth', 'Noise Mix'],
        spectralres: ['Resonator', 'Damping', 'Spread', 'Decay'],
        harmonic: ['Partials', 'Odd/Even', 'Formant', 'Decay'],
        sampler: ['Sample Start', 'Sample End', 'Cutoff', 'Pitch']
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
      { color: 'blue' as const, label: 'Track 1', value: tapeState.tracks[0].volume, onChange: (v: number) => setTapeState(ts => ({ ...ts, tracks: [ { ...ts.tracks[0], volume: v }, ts.tracks[1], ts.tracks[2], ts.tracks[3] ] })) },
      { color: 'green' as const, label: 'Track 2', value: tapeState.tracks[1].volume, onChange: (v: number) => setTapeState(ts => ({ ...ts, tracks: [ ts.tracks[0], { ...ts.tracks[1], volume: v }, ts.tracks[2], ts.tracks[3] ] })) },
      { color: 'white' as const, label: 'Track 3', value: tapeState.tracks[2].volume, onChange: (v: number) => setTapeState(ts => ({ ...ts, tracks: [ ts.tracks[0], ts.tracks[1], { ...ts.tracks[2], volume: v }, ts.tracks[3] ] })) },
      { color: 'orange' as const, label: 'Track 4', value: tapeState.tracks[3].volume, onChange: (v: number) => setTapeState(ts => ({ ...ts, tracks: [ ts.tracks[0], ts.tracks[1], ts.tracks[2], { ...ts.tracks[3], volume: v } ] })) },
    ];
  };

  const knobConfigs = getKnobConfigs();

  return (
    <div className="min-h-screen bg-[#121418] text-neutral-200 flex flex-col items-center justify-start p-2 sm:p-4 md:p-6 select-none font-mono">
      
      {/* Hidden file input for custom .op1 firmwares */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleUploadOp1}
        accept=".op1,.bin,.ldr,.json"
        className="hidden"
      />

      {/* TOP HEADER: NAVIGATION, FIRMWARE MODALS & TOOLS BAR */}
      <header className="w-full max-w-7xl mb-4 p-3 rounded-2xl bg-[#1c1f26] border border-[#2d333f] shadow-xl flex flex-col gap-3">
        
        {/* Row 1: Brand, View Mode Switcher, and Tool Modals */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800/80 pb-2.5">
          
          {/* Logo & Main View Switcher */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 pr-3 border-r border-neutral-700">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
              <span className="font-bold text-sm text-white tracking-wider">
                ENGINEERING STUDIO
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                OP-1 LAB
              </span>
            </div>

            {/* View Mode Toggle: Hardware Console vs Modular Dashboard */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[#111317] border border-neutral-800">
              <button
                id="view-mode-hardware-btn"
                onClick={() => setViewMode('hardware')}
                className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  viewMode === 'hardware'
                    ? 'bg-orange-600 text-white shadow-md'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
                }`}
              >
                <Gamepad2 className="w-3.5 h-3.5" />
                <span>Console OP-1</span>
              </button>

              <button
                id="view-mode-dashboard-btn"
                onClick={() => setViewMode('dashboard')}
                className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  viewMode === 'dashboard'
                    ? 'bg-cyan-600 text-white shadow-md'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Studio & Atelier Mods</span>
              </button>
            </div>
          </div>

          {/* Quick Access Tools & Modals Bar */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Real Blackfin Hardware Emulator Button */}
            <button
              id="open-real-emulator-btn"
              onClick={() => setIsRealEmulatorOpen(true)}
              className="px-3.5 py-1 rounded-xl bg-gradient-to-r from-cyan-950/80 to-blue-950/80 hover:from-cyan-900 hover:to-blue-900 border border-cyan-400/60 text-cyan-300 text-xs font-black flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-lg shadow-cyan-950/50 animate-pulse"
              title="Ouvrir le laboratoire BF524 (analyse réelle, exécution expérimentale)"
            >
              <Zap className="w-3.5 h-3.5 text-cyan-400 fill-current" />
              <span>⚡ ÉMULATEUR BLACKFIN</span>
            </button>

            {/* Firmware Modder Modal Button */}
            <button
              id="open-firmware-modder-btn"
              onClick={() => setIsFirmwareModalOpen(true)}
              className="px-3 py-1 rounded-xl bg-orange-950/40 hover:bg-orange-900/60 border border-orange-500/50 text-orange-300 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
              title="Ouvrir l'Atelier de Personnalisation & Patcher de Firmware OP-1"
            >
              <Wrench className="w-3.5 h-3.5 text-orange-400" />
              <span>🛠️ Patcher Firmware</span>
              {modState.unlockIterSynth && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              )}
            </button>

            {/* Engineering Lab DSP Modal Button */}
            <button
              id="open-engineering-lab-btn"
              onClick={() => setIsEngineeringLabOpen(true)}
              className="px-3 py-1 rounded-xl bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/50 text-purple-300 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
              title="Ouvrir le Laboratoire DSP & Reverse-Engineering Blackfin ADSP-BF524"
            >
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
              <span>🔬 Engineering Lab</span>
            </button>

            {/* Tombola Sequencer Button */}
            <button
              id="open-tombola-btn"
              onClick={() => setIsTombolaOpen(true)}
              className="px-3 py-1 rounded-xl bg-sky-950/40 hover:bg-sky-900/60 border border-sky-500/50 text-sky-300 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
              title="Ouvrir le Séquenceur Physique Tombola"
            >
              <Dices className="w-3.5 h-3.5 text-sky-400" />
              <span>🎲 Tombola</span>
            </button>

            {/* Documentation & Git Button */}
            <button
              id="open-docs-btn"
              onClick={() => setIsDocsOpen(true)}
              className="px-3 py-1 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
              title="Documentation, Spécifications Matérielles & Dépôt Git"
            >
              <BookOpen className="w-3.5 h-3.5 text-neutral-400" />
              <span>📖 Guide & Git</span>
            </button>
          </div>
        </div>

        {/* Row 2: Firmware Selector, Web MIDI, Reboot & Audio Master Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          {/* Firmware Selection Dropdown & File Loader */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-neutral-400 font-bold">FIRMWARE ACTIF :</span>
            <select
              value={selectedFirmwareId}
              onChange={(e) => {
                const fw = allFirmwares.find(f => f.id === e.target.value);
                if (fw) handleSelectFirmware(fw);
              }}
              className="px-3 py-1 rounded-xl bg-[#111317] text-white border border-[#3b4252] text-xs font-bold focus:outline-none focus:border-orange-500 cursor-pointer max-w-[240px] truncate"
            >
              {allFirmwares.map((fw) => (
                <option key={fw.id} value={fw.id}>
                  {fw.isModded ? '⚡ ' : '🏷️ '} {fw.version} {fw.isModded ? '[Custom Mod]' : '[Officiel]'}
                </option>
              ))}
            </select>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 rounded-xl bg-[#242933] hover:bg-[#2e3440] text-sky-400 border border-sky-500/30 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer active:scale-95"
              title="Charger un fichier binaire .op1 fait maison ou un patch"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Charger .op1</span>
            </button>
          </div>

          {/* Right Status Controls : MIDI Link, Boot Trigger & Master Volume */}
          <div className="flex items-center gap-3 flex-wrap">
            
            {/* MIDI Controller Badge */}
            <div 
              className={`px-3 py-1 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${
                midiConnectedDevice
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                  : 'bg-[#111317] border-neutral-800 text-neutral-400'
              }`}
              title={midiConnectedDevice ? `Connecté à : ${midiConnectedDevice}` : 'Branchez un vrai OP-1 en USB ou un contrôleur MIDI pour jouer'}
            >
              <Radio className={`w-3.5 h-3.5 ${midiConnectedDevice ? 'text-emerald-400 animate-pulse' : 'text-neutral-500'}`} />
              <span>{midiConnectedDevice ? `MIDI : ${midiConnectedDevice}` : 'MIDI Prêt'}</span>
            </div>

            {/* Reboot Button */}
            <button
              onClick={() => triggerBootSequence(modState.firmwareVersion, modState.targetChecksum || '389A4C01')}
              disabled={isBooting}
              className="px-3 py-1 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
              title="Redémarrer l'OP-1 avec la séquence de boot officielle TE-BOOT"
            >
              <Zap className={`w-3.5 h-3.5 ${isBooting ? 'animate-spin' : ''}`} />
              <span>{isBooting ? 'Boot...' : 'Reboot TE-BOOT'}</span>
            </button>

            {/* Master Volume & Mute */}
            <div className="flex items-center gap-2 px-2.5 py-0.5 rounded-xl bg-[#111317] border border-neutral-800">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="text-neutral-400 hover:text-white transition cursor-pointer"
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : masterVolume}
                onChange={(e) => {
                  setMasterVolume(Number(e.target.value));
                  if (isMuted) setIsMuted(false);
                }}
                className="w-16 h-1.5 accent-orange-500 bg-neutral-700 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        </div>
      </header>

      {/* VIEW CONDITIONAL: MODULAR DASHBOARD OR PHYSICAL HARDWARE EMULATOR */}
      {viewMode === 'dashboard' ? (
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
      ) : (
        /* AUTHENTIC 1:1 PHYSICAL TEENAGE ENGINEERING OP-1 UNIBODY CHASSIS */
        <main className="w-full max-w-5xl bg-[#e2e6ee] text-[#111827] border-4 border-[#b2b9c7] rounded-[2.5rem] p-4 sm:p-6 shadow-2xl shadow-black/80 flex flex-col gap-4 relative">
          
          {/* Screw Decors on 4 Corners */}
          <div className="absolute top-3 left-4 w-2.5 h-2.5 rounded-full border border-neutral-400 bg-neutral-300 opacity-60 flex items-center justify-center"><div className="w-2 h-0.5 bg-neutral-500"></div></div>
          <div className="absolute top-3 right-4 w-2.5 h-2.5 rounded-full border border-neutral-400 bg-neutral-300 opacity-60 flex items-center justify-center"><div className="w-2 h-0.5 bg-neutral-500"></div></div>
          <div className="absolute bottom-3 left-4 w-2.5 h-2.5 rounded-full border border-neutral-400 bg-neutral-300 opacity-60 flex items-center justify-center"><div className="w-2 h-0.5 bg-neutral-500"></div></div>
          <div className="absolute bottom-3 right-4 w-2.5 h-2.5 rounded-full border border-neutral-400 bg-neutral-300 opacity-60 flex items-center justify-center"><div className="w-2 h-0.5 bg-neutral-500"></div></div>

          {/* TOP HARDWARE ROW: SPEAKER, VOLUME, COM, HELP, DISPLAY, AND 4 COLORED ENCODERS */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            
            {/* Left Column: Speaker, Volume Knob, Metronome, Help, COM */}
            <div className="lg:col-span-3 flex flex-col justify-between gap-3">
              
              <div className="flex items-center justify-between gap-2">
                {/* Speaker Perforations */}
                <div className="grid grid-cols-5 gap-1 p-2 rounded-xl bg-[#d5d9e2] border border-[#c2c7d2] shadow-inner">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#7e8799] shadow-inner"></div>
                  ))}
                </div>

                {/* Volume Wheel Knob */}
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[8px] font-bold text-neutral-500 uppercase">VOL</span>
                  <div 
                    className="w-10 h-10 rounded-full bg-neutral-900 border-2 border-neutral-700 shadow-md flex items-center justify-center relative cursor-pointer active:scale-95"
                    onClick={() => setMasterVolume(v => (v >= 100 ? 50 : v + 25))}
                    title="Molette de volume physique"
                  >
                    <div className="w-1 h-3.5 bg-orange-500 rounded-full absolute top-1"></div>
                    <div className="w-4 h-4 rounded-full bg-neutral-800"></div>
                  </div>
                </div>

                {/* COM / TE-BOOT & METRONOME BUTTONS */}
                <div className="flex items-center gap-1.5">
                  <OP1Button
                    label="COM"
                    shape="small-round"
                    variant={screenMode === 'teboot' ? 'orange' : 'light-gray'}
                    isActive={screenMode === 'teboot'}
                    onClick={() => setScreenMode(screenMode === 'teboot' ? 'synth' : 'teboot')}
                    title="Bouton COM (Maintenir pour entrer dans TE-BOOT)"
                  />
                  <OP1Button
                    label="HELP"
                    shape="small-round"
                    variant="light-gray"
                    onClick={() => alert("Teenage Engineering OP-1 Émulation Exacte.\n\n• Jouez les notes avec votre clavier AZERTY [A-J] [K-B] ou un clavier USB MIDI.\n• Tournez les 4 encodeurs couleur pour sculpter le son en direct.\n• Changez de mode avec SYNTH, DRUM, TAPE, MIXER.\n• Utilisez le bouton 'Studio & Atelier Mods' pour personnaliser votre firmware.")}
                    title="Bouton d'aide physique"
                  />
                </div>
              </div>

              {/* 4 Main Modes: SYNTH, DRUM, TAPE, MIXER */}
              <div className="grid grid-cols-4 gap-1 p-1.5 rounded-2xl bg-[#d2d7e2] border border-[#bfc5d2] shadow-inner">
                {[
                  { id: 'synth', label: 'SYNTH', icon: Music },
                  { id: 'drum', label: 'DRUM', icon: Disc },
                  { id: 'tape', label: 'TAPE', icon: Layers },
                  { id: 'mixer', label: 'MIXER', icon: Sliders },
                ].map((m) => (
                  <OP1Button
                    key={m.id}
                    id={`mode-btn-${m.id}`}
                    label={m.label}
                    shape="rect"
                    variant={screenMode === m.id ? 'orange' : 'white'}
                    isActive={screenMode === m.id}
                    onClick={() => {
                      setScreenMode(m.id as ScreenMode);
                      audioEngine.init();
                    }}
                    className="text-[10px]"
                  />
                ))}
              </div>

              {/* 4 Sound Sub-Pages (1: Engine, 2: Envelope, 3: FX, 4: LFO) */}
              {screenMode === 'synth' && (
                <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-[#d2d7e2] border border-[#bfc5d2] shadow-inner text-[9px] font-bold">
                  {[
                    { id: 'engine', label: '1 • ENG' },
                    { id: 'envelope', label: '2 • ENV' },
                    { id: 'fx', label: '3 • FX' },
                    { id: 'lfo', label: '4 • LFO' },
                  ].map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => setSynthSubTab(sub.id as any)}
                      className={`py-1 rounded-lg text-center transition cursor-pointer ${
                        synthSubTab === sub.id
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-[#e4e7ef] text-neutral-600 hover:bg-[#d9dde8]'
                      }`}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Center: Recessed OLED Screen (320x160) */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center">
              <div className="w-full max-w-[340px] aspect-[4/3] rounded-2xl bg-black border-4 border-neutral-900 shadow-2xl p-1 relative overflow-hidden flex items-center justify-center">
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
                  isBooting={isBooting}
                  bootProgress={bootProgress}
                  bootMessage={bootMessage}
                />
              </div>
            </div>

            {/* Right: 4 Colored Rotary Encoders (Blue, Green, White, Orange) */}
            <div className="lg:col-span-4 grid grid-cols-2 gap-3 p-3 rounded-2xl bg-[#d5d9e2] border border-[#c2c7d2] shadow-inner">
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

          {/* MIDDLE SECTION: TAPE TRANSPORT / SYNTH ENGINE SELECTOR / PRESET SELECTOR */}
          <section className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-2xl bg-[#d5d9e2] border border-[#c2c7d2] shadow-inner">
            
            {/* Tape Transport Buttons (Stop, Play, Rec) */}
            <div className="flex items-center gap-1.5">
              <OP1Button
                id="transport-stop"
                icon={<Square className="w-3.5 h-3.5 fill-current" />}
                variant="dark"
                shape="pill"
                onClick={() => setTapeState(ts => ({ ...ts, isPlaying: false, playheadPosition: 0 }))}
                title="Stop & Rembobiner au début"
              />
              <OP1Button
                id="transport-play"
                icon={<Play className="w-3.5 h-3.5 fill-current" />}
                variant={tapeState.isPlaying ? 'green' : 'white'}
                shape="pill"
                isActive={tapeState.isPlaying}
                onClick={() => setTapeState(ts => ({ ...ts, isPlaying: !ts.isPlaying }))}
                title="Play / Pause"
              />
              <OP1Button
                id="transport-rec"
                icon={<Circle className="w-3.5 h-3.5 fill-current" />}
                variant={tapeState.isRecording ? 'red' : 'white'}
                shape="pill"
                isActive={tapeState.isRecording}
                onClick={() => setTapeState(ts => ({ ...ts, isRecording: !ts.isRecording }))}
                title="Enregistrer sur bande (REC)"
              />
              <OP1Button
                id="transport-loop"
                icon={<Repeat className="w-3.5 h-3.5" />}
                variant={tapeState.isLooping ? 'orange' : 'light-gray'}
                shape="pill"
                isActive={tapeState.isLooping}
                onClick={() => setTapeState(ts => ({ ...ts, isLooping: !ts.isLooping }))}
                title="Boucle (Loop)"
              />
            </div>

            {/* Synth Engine Quick Picker */}
            {screenMode === 'synth' && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-neutral-600 uppercase">Moteur :</span>
                <select
                  value={currentEngine}
                  onChange={(e) => {
                    setCurrentEngine(e.target.value as SynthEngineType);
                    audioEngine.playChime('boot');
                  }}
                  className="px-2 py-1 rounded-xl bg-white text-neutral-800 border border-[#b8bfcf] text-xs font-bold focus:outline-none cursor-pointer"
                >
                  <option value="drwave">Dr. Wave (Vocal / Formant)</option>
                  <option value="iter">Iter (Cellular Additive)</option>
                  <option value="digital">Digital (Gritty Wavefold)</option>
                  <option value="fm">FM (4-Operator)</option>
                  <option value="string">String (Karplus-Strong)</option>
                  <option value="pulse">Pulse (PWM Square)</option>
                  <option value="cluster">Cluster (Unison Saw)</option>
                  <option value="phase">Phase (Phase Distortion)</option>
                </select>
              </div>
            )}

            {/* Factory Preset Picker */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-neutral-600 uppercase">Presets :</span>
              <select
                value={selectedPresetId}
                onChange={(e) => {
                  const p = FACTORY_PRESETS.find(pr => pr.id === e.target.value);
                  if (p) handlePresetSelect(p);
                }}
                className="px-2 py-1 rounded-xl bg-white text-neutral-800 border border-[#b8bfcf] text-xs font-bold focus:outline-none cursor-pointer"
              >
                <option value="">-- Choisir un Preset --</option>
                {FACTORY_PRESETS.map((pr) => (
                  <option key={pr.id} value={pr.id}>
                    {pr.name} ({pr.engine})
                  </option>
                ))}
              </select>
            </div>
          </section>

          {/* OCTAVE & PITCH BEND CONTROLS */}
          <section className="flex items-center justify-between px-2 text-xs font-bold text-neutral-600">
            <div className="flex items-center gap-2">
              <span>OCTAVE :</span>
              <OP1Button
                icon={<ArrowDown className="w-3.5 h-3.5" />}
                shape="small-round"
                variant="white"
                onClick={() => setOctave(o => Math.max(1, o - 1))}
                title="Octave inférieure (Touche flèche bas)"
              />
              <span className="px-2 py-0.5 rounded-lg bg-neutral-800 text-white font-mono">
                OCT {octave} (F{octave} - E{octave + 2})
              </span>
              <OP1Button
                icon={<ArrowUp className="w-3.5 h-3.5" />}
                shape="small-round"
                variant="white"
                onClick={() => setOctave(o => Math.min(5, o + 1))}
                title="Octave supérieure (Touche flèche haut)"
              />
            </div>

            <div className="text-[11px] text-neutral-500 hidden sm:block">
              Contrôle Clavier PC : [A-J] (Touches Blanches) & [W, E, R, Y, U] (Touches Noires)
            </div>
          </section>

          {/* BOTTOM SECTION: 24 CIRCULAR KEYS BED (AUTHENTIC TEENAGE ENGINEERING KEYBED) */}
          <section className="pt-1">
            <MidiControllerBar />
            <Keyboard
              onNoteOn={handleNoteOn}
              onNoteOff={handleNoteOff}
              activeNotes={activeMidiNotes}
              octave={octave}
              onOctaveChange={setOctave}
              onPitchBend={(semitones) => audioEngine.setPitchBend(semitones)}
              onKeyMatrixChange={(keyIndex, pressed) => op1Vm.peripherals.setKey(keyIndex, pressed)}
            />
          </section>
        </main>
      )}

      {/* Bottom Footer Specs */}
      <footer className="w-full max-w-7xl mt-4 flex items-center justify-between text-[11px] text-neutral-500 px-2">
        <div>
          Firmware Actif : <strong className="text-orange-400">{modState.firmwareVersion}</strong> (CRC32: 0x{modState.targetChecksum})
        </div>
        <div>
          Blackfin ADSP-BF524 Emulation • Cirrus Logic 24-Bit 44.1kHz DMA • TE-BOOT Ready
        </div>
      </footer>

      {/* MODAL 1: FIRMWARE MODDER & PERSONALIZATION WORKSHOP */}
      <FirmwareModderModal
        isOpen={isFirmwareModalOpen}
        onClose={() => setIsFirmwareModalOpen(false)}
        modState={modState}
        onUpdateModState={setModState}
        onTriggerBootFlash={() => triggerBootSequence(modState.firmwareVersion, modState.targetChecksum || '8B39DF12')}
      />

      {/* MODAL 2: ENGINEERING LAB DSP & BLACKFIN REVERSE-ENGINEERING */}
      <EngineeringLabModal
        isOpen={isEngineeringLabOpen}
        onClose={() => setIsEngineeringLabOpen(false)}
        modState={modState}
        onUpdateModState={setModState}
        onSelectCustomEngine={(eng) => {
          setCurrentEngine(eng);
          setScreenMode('synth');
          setViewMode('hardware');
        }}
        currentEngine={currentEngine}
      />

      {/* MODAL 3: TOMBOLA PHYSICS SEQUENCER */}
      <TombolaSequencer
        isOpen={isTombolaOpen}
        onClose={() => setIsTombolaOpen(false)}
        onTriggerNote={(n) => handleNoteOn(n, 100)}
      />

      {/* MODAL 4: DOCUMENTATION & GIT MANIFEST */}
      <ProjectDocumentationModal
        isOpen={isDocsOpen}
        onClose={() => setIsDocsOpen(false)}
        onOpenEmulator={() => {
          setIsDocsOpen(false);
          setViewMode('hardware');
        }}
      />

      {/* MODAL 5: REAL BLACKFIN ADSP-BF524 HARDWARE EMULATOR */}
      <RealBlackfinEmulatorModal
        isOpen={isRealEmulatorOpen}
        onClose={() => setIsRealEmulatorOpen(false)}
      />
    </div>
  );
};
