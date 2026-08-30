import React, { useState } from 'react';
import { 
  HardDrive, 
  Wrench, 
  Cpu, 
  Package, 
  Sliders, 
  ShieldCheck, 
  Radio, 
  Layers, 
  Activity, 
  Monitor, 
  Sparkles,
  Zap,
  Volume2
} from 'lucide-react';
import { 
  DashboardTab, 
  FirmwareModState, 
  SynthEngineType, 
  SynthParams, 
  EnvelopeParams, 
  FxParams, 
  LfoParams, 
  TapeState 
} from '../types';
import { FirmwareManagerPanel } from './FirmwareManagerPanel';
import { ModificationWorkshopPanel } from './ModificationWorkshopPanel';
import { CreationStudioPanel } from './CreationStudioPanel';
import { ProductionPipelinePanel } from './ProductionPipelinePanel';
import { audioEngine } from '../audio/engine';

interface ModularDashboardProps {
  modState: FirmwareModState;
  setModState: React.Dispatch<React.SetStateAction<FirmwareModState>>;
  currentEngine: SynthEngineType;
  setCurrentEngine: (engine: SynthEngineType) => void;
  synthParams: SynthParams;
  setSynthParams: React.Dispatch<React.SetStateAction<SynthParams>>;
  envelope: EnvelopeParams;
  setEnvelope: React.Dispatch<React.SetStateAction<EnvelopeParams>>;
  fx: FxParams;
  setFx: React.Dispatch<React.SetStateAction<FxParams>>;
  lfo: LfoParams;
  setLfo: React.Dispatch<React.SetStateAction<LfoParams>>;
  tapeState: TapeState;
  onSwitchToHardwareView: () => void;
}

export const ModularDashboard: React.FC<ModularDashboardProps> = ({
  modState,
  setModState,
  currentEngine,
  setCurrentEngine,
  synthParams,
  setSynthParams,
  envelope,
  setEnvelope,
  fx,
  setFx,
  lfo,
  setLfo,
  tapeState,
  onSwitchToHardwareView
}) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('firmware-manager');

  const handleTabChange = (tab: DashboardTab) => {
    setActiveTab(tab);
    audioEngine.playChime('save');
  };

  return (
    <div id="modular-dashboard-container" className="w-full max-w-7xl mx-auto space-y-6 pb-12">
      {/* Top Header & Telemetry Bar */}
      <header className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-black font-bold shadow-lg shadow-cyan-500/20">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold font-mono tracking-wider text-zinc-100 uppercase">
                ENGINEERING STUDIO
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800/80 font-bold">
                OP-1 LAB v2.4
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono">
              Suite Modulaire de Firmware, DSP Blackfin & Studio de Création
            </p>
          </div>
        </div>

        {/* Telemetry Chips & Switcher Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="px-3 py-1.5 bg-zinc-950/80 rounded-lg border border-zinc-800 text-xs font-mono flex items-center gap-2">
            <span className="text-zinc-400 text-[11px]">Firmware :</span>
            <span className="text-cyan-400 font-bold">{modState.firmwareVersion}</span>
          </div>

          <div className="px-3 py-1.5 bg-zinc-950/80 rounded-lg border border-zinc-800 text-xs font-mono flex items-center gap-2">
            <span className="text-zinc-400 text-[11px]">Moteur :</span>
            <span className="text-amber-400 font-bold">{currentEngine.toUpperCase()}</span>
          </div>

          <button
            id="btn-switch-to-hardware"
            onClick={onSwitchToHardwareView}
            className="px-4 py-2 bg-gradient-to-r from-zinc-800 to-zinc-700 hover:from-zinc-700 hover:to-zinc-600 text-zinc-100 rounded-lg text-xs font-mono font-bold flex items-center gap-2 border border-zinc-600 transition-all shadow-md cursor-pointer ml-1"
          >
            <Monitor className="w-3.5 h-3.5 text-cyan-400" />
            Console OP-1 Matérielle
          </button>
        </div>
      </header>

      {/* 4 Main Tabs Navigation Bar */}
      <nav aria-label="Dashboard Panels" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Tab 1: Fondations & Firmwares */}
        <button
          id="nav-tab-firmware-manager"
          onClick={() => handleTabChange('firmware-manager')}
          className={`p-4 rounded-xl border text-left font-mono transition-all cursor-pointer ${
            activeTab === 'firmware-manager'
              ? 'bg-cyan-950/40 border-cyan-500 shadow-lg shadow-cyan-950/30 ring-1 ring-cyan-500/50'
              : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800/80 hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className={`p-2 rounded-lg ${activeTab === 'firmware-manager' ? 'bg-cyan-500 text-black' : 'bg-zinc-800 text-zinc-300'}`}>
              <HardDrive className="w-4 h-4" />
            </div>
            <span className="text-[10px] uppercase font-bold text-cyan-400">Phase 1</span>
          </div>
          <h2 className={`text-sm font-bold ${activeTab === 'firmware-manager' ? 'text-cyan-300' : 'text-zinc-200'}`}>
            Fondations & Rack Logiciel
          </h2>
          <p className="text-[11px] text-zinc-400 mt-1 line-clamp-1">
            13 FW Officiels (Non-Field), Suite Python & CLI
          </p>
        </button>

        {/* Tab 2: Atelier de Modifications */}
        <button
          id="nav-tab-mod-workshop"
          onClick={() => handleTabChange('mod-workshop')}
          className={`p-4 rounded-xl border text-left font-mono transition-all cursor-pointer ${
            activeTab === 'mod-workshop'
              ? 'bg-cyan-950/40 border-cyan-500 shadow-lg shadow-cyan-950/30 ring-1 ring-cyan-500/50'
              : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800/80 hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className={`p-2 rounded-lg ${activeTab === 'mod-workshop' ? 'bg-cyan-500 text-black' : 'bg-zinc-800 text-zinc-300'}`}>
              <Wrench className="w-4 h-4" />
            </div>
            <span className="text-[10px] uppercase font-bold text-amber-400">Phase 2</span>
          </div>
          <h2 className={`text-sm font-bold ${activeTab === 'mod-workshop' ? 'text-cyan-300' : 'text-zinc-200'}`}>
            Atelier de Modifications
          </h2>
          <p className="text-[11px] text-zinc-400 mt-1 line-clamp-1">
            Mods 1-Clic, Explorateur, Slices AIF, SQLite DB
          </p>
        </button>

        {/* Tab 3: Studio de Création & Rétro-Ingénierie */}
        <button
          id="nav-tab-creation-studio"
          onClick={() => handleTabChange('creation-studio')}
          className={`p-4 rounded-xl border text-left font-mono transition-all cursor-pointer ${
            activeTab === 'creation-studio'
              ? 'bg-cyan-950/40 border-cyan-500 shadow-lg shadow-cyan-950/30 ring-1 ring-cyan-500/50'
              : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800/80 hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className={`p-2 rounded-lg ${activeTab === 'creation-studio' ? 'bg-cyan-500 text-black' : 'bg-zinc-800 text-zinc-300'}`}>
              <Cpu className="w-4 h-4" />
            </div>
            <span className="text-[10px] uppercase font-bold text-emerald-400">Phase 3</span>
          </div>
          <h2 className={`text-sm font-bold ${activeTab === 'creation-studio' ? 'text-cyan-300' : 'text-zinc-200'}`}>
            Studio & Rétro-Ingénierie
          </h2>
          <p className="text-[11px] text-zinc-400 mt-1 line-clamp-1">
            20 Moteurs DSP, C++ Blackfin, Ghidra & Clés OTP
          </p>
        </button>

        {/* Tab 4: Émulateur & Chaîne de Test */}
        <button
          id="nav-tab-production-pipeline"
          onClick={() => handleTabChange('production-pipeline')}
          className={`p-4 rounded-xl border text-left font-mono transition-all cursor-pointer ${
            activeTab === 'production-pipeline'
              ? 'bg-cyan-950/40 border-cyan-500 shadow-lg shadow-cyan-950/30 ring-1 ring-cyan-500/50'
              : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800/80 hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className={`p-2 rounded-lg ${activeTab === 'production-pipeline' ? 'bg-cyan-500 text-black' : 'bg-zinc-800 text-zinc-300'}`}>
              <Package className="w-4 h-4" />
            </div>
            <span className="text-[10px] uppercase font-bold text-purple-400">Phase 4</span>
          </div>
          <h2 className={`text-sm font-bold ${activeTab === 'production-pipeline' ? 'text-cyan-300' : 'text-zinc-200'}`}>
            Émulateur & Pipeline
          </h2>
          <p className="text-[11px] text-zinc-400 mt-1 line-clamp-1">
            BF524 Lab 320x160 · moteur natif en construction
          </p>
        </button>
      </nav>

      {/* Main Panel Content Area */}
      <main className="transition-opacity duration-200">
        {activeTab === 'firmware-manager' && (
          <FirmwareManagerPanel
            modState={modState}
            setModState={setModState}
            onOpenWorkshop={() => handleTabChange('mod-workshop')}
            onOpenPipeline={() => handleTabChange('production-pipeline')}
            onOpenEmulator={onSwitchToHardwareView}
          />
        )}

        {activeTab === 'mod-workshop' && (
          <ModificationWorkshopPanel
            modState={modState}
            setModState={setModState}
          />
        )}

        {activeTab === 'creation-studio' && (
          <CreationStudioPanel
            currentEngine={currentEngine}
            setCurrentEngine={setCurrentEngine}
            synthParams={synthParams}
            setSynthParams={setSynthParams}
            envelope={envelope}
            setEnvelope={setEnvelope}
            fx={fx}
            setFx={setFx}
            lfo={lfo}
            setLfo={setLfo}
            tapeState={tapeState}
          />
        )}

        {activeTab === 'production-pipeline' && (
          <ProductionPipelinePanel
            modState={modState}
            setModState={setModState}
            onOpenHardware={onSwitchToHardwareView}
          />
        )}
      </main>
    </div>
  );
};
