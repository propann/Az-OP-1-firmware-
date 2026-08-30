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
import { BlackfinHardwareLab } from './components/BlackfinHardwareLab';
import { ModularDashboard } from './components/ModularDashboard';
import { FirmwareModderModal } from './components/FirmwareModderModal';
import { EngineeringLabModal } from './components/EngineeringLabModal';
import { TombolaSequencer } from './components/TombolaSequencer';
import { ProjectDocumentationModal } from './components/ProjectDocumentationModal';
import { op1Vm } from './emulator/op1VirtualMachine';
import { 
  Cpu, 
  Wrench, 
  Sparkles, 
  Dices, 
  BookOpen, 
  LayoutDashboard,
  Radio,
  Sliders,
  HardDrive
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
  // Mode & Navigation
  const [viewMode, setViewMode] = useState<'hardware' | 'dashboard'>('hardware');
  const [currentEngine, setCurrentEngine] = useState<SynthEngineType>('drwave');
  
  // Modals state
  const [isFirmwareModalOpen, setIsFirmwareModalOpen] = useState<boolean>(false);
  const [isEngineeringLabOpen, setIsEngineeringLabOpen] = useState<boolean>(false);
  const [isTombolaOpen, setIsTombolaOpen] = useState<boolean>(false);
  const [isDocsOpen, setIsDocsOpen] = useState<boolean>(false);

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

  return (
    <div className="min-h-screen bg-[#0a0d14] text-neutral-100 flex flex-col items-center p-2 sm:p-4 md:p-6 select-none font-sans">
      
      {/* Top Application Bar */}
      <header className="w-full max-w-7xl mb-4 flex items-center justify-between p-3 rounded-2xl bg-[#141822] border border-[#2b3345] shadow-xl flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-500/50 text-cyan-400">
            <Cpu className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm tracking-wider text-white">
                AZ-OP-1 ENGINEERING STUDIO
              </span>
              <span className="px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold">
                ADSP-BF524C2
              </span>
            </div>
            <p className="text-[11px] text-neutral-400">
              Station de diagnostic matériel, émulation DSP Blackfin & contrôle temps réel
            </p>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('hardware')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'hardware'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'bg-[#10141d] text-neutral-400 hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Laboratoire Matériel</span>
          </button>

          <button
            onClick={() => setViewMode('dashboard')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'dashboard'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'bg-[#10141d] text-neutral-400 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Atelier & Mods</span>
          </button>
        </div>
      </header>

      {/* Main View: Real Blackfin Hardware Lab or Modular Dashboard */}
      <div className="w-full max-w-7xl flex-1 flex flex-col">
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
          <BlackfinHardwareLab
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
            setTapeState={setTapeState}
            onOpenEngineeringLab={() => setIsEngineeringLabOpen(true)}
            onOpenFirmwareModder={() => setIsFirmwareModalOpen(true)}
            onOpenTombola={() => setIsTombolaOpen(true)}
            onOpenDocs={() => setIsDocsOpen(true)}
          />
        )}
      </div>

      {/* Footer System Specs */}
      <footer className="w-full max-w-7xl mt-4 flex items-center justify-between text-[11px] text-neutral-500 px-2 flex-wrap gap-2">
        <div>
          Cible Matérielle : <strong className="text-cyan-400">Analog Devices ADSP-BF524C2</strong> • Écran 320 × 160 OLED
        </div>
        <div>
          SPORT0 DMA 44.1kHz • Cirrus Logic 24-Bit • Clavier Matriciel C8051 IVG9
        </div>
      </footer>

      {/* MODALS */}
      <FirmwareModderModal
        isOpen={isFirmwareModalOpen}
        onClose={() => setIsFirmwareModalOpen(false)}
        modState={modState}
        onUpdateModState={setModState}
        onTriggerBootFlash={() => {
          op1Vm.loadDiagnosticFixture('alu_diagnostic');
        }}
      />

      <EngineeringLabModal
        isOpen={isEngineeringLabOpen}
        onClose={() => setIsEngineeringLabOpen(false)}
        modState={modState}
        onUpdateModState={setModState}
        onSelectCustomEngine={(eng) => {
          setCurrentEngine(eng);
          setViewMode('hardware');
        }}
        currentEngine={currentEngine}
      />

      <TombolaSequencer
        isOpen={isTombolaOpen}
        onClose={() => setIsTombolaOpen(false)}
        onTriggerNote={(n) => {
          audioEngine.init();
          audioEngine.noteOn(n, 100, currentEngine, synthParams, envelopeParams, fxParams, lfoParams);
          setTimeout(() => audioEngine.noteOff(n), 200);
        }}
      />

      <ProjectDocumentationModal
        isOpen={isDocsOpen}
        onClose={() => setIsDocsOpen(false)}
        onOpenEmulator={() => {
          setIsDocsOpen(false);
          setViewMode('hardware');
        }}
      />

    </div>
  );
};
