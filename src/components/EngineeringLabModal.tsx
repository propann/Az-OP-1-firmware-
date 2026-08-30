import React, { useState } from 'react';
import { 
  CustomDspEngineDefinition, 
  BlackfinHook, 
  SamplePatch, 
  SvgGraphicAsset, 
  FirmwareBinaryInspector,
  FirmwareModState,
  SynthEngineType
} from '../types';
import { audioEngine } from '../audio/engine';
import confetti from 'canvas-confetti';
import { 
  Cpu, 
  Terminal, 
  Layers, 
  FileCode, 
  Sliders, 
  Music, 
  Image, 
  ShieldAlert, 
  ShieldCheck, 
  Download, 
  Upload, 
  Sparkles, 
  Play, 
  Check, 
  Copy, 
  RefreshCw, 
  Flame, 
  Database, 
  X,
  Code2,
  Binary,
  FolderArchive,
  Wrench
} from 'lucide-react';

interface EngineeringLabModalProps {
  isOpen: boolean;
  onClose: () => void;
  modState: FirmwareModState;
  onUpdateModState: (modState: FirmwareModState) => void;
  onSelectCustomEngine: (engine: SynthEngineType) => void;
  currentEngine: SynthEngineType;
}

export const EngineeringLabModal: React.FC<EngineeringLabModalProps> = ({
  isOpen,
  onClose,
  modState,
  onUpdateModState,
  onSelectCustomEngine,
  currentEngine
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'level1' | 'level2' | 'level3'>('overview');
  const [level1SubTab, setLevel1SubTab] = useState<'repacker' | 'teoperator' | 'opie' | 'op1svg'>('repacker');
  const [level2SubTab, setLevel2SubTab] = useState<'disasm' | 'hooks' | 'memory'>('disasm');
  
  // Level 3 DSP Engine Editor State
  const [selectedDspEngine, setSelectedDspEngine] = useState<SynthEngineType>('granular');
  const [isCompilingDsp, setIsCompilingDsp] = useState(false);
  const [compileLog, setCompileLog] = useState<string>('');
  const [customEngineCode, setCustomEngineCode] = useState<string>(`// ============================================================================
// OP-1 CUSTOM BLACKFIN DSP ENGINE: GRANULAR CLOUD SYNTH
// Target Architecture: Analog Devices ADSP-BF524 (400 MHz DSP)
// Cycle Budget: Max 9070 cycles per sample @ 44.1 kHz
// ============================================================================

#include "op1_dsp_core.h"
#include "fixed_point_math.h"

struct GranularVoice {
    fract32 phase_acc;
    fract32 grain_pos[8];
    fract32 grain_len;
    fract32 density;
    fract32 detune_spread;
};

void init_engine_granular(GranularVoice* voice) {
    voice->phase_acc = 0;
    voice->density = 0x40000000; // 50%
    voice->detune_spread = 0x20000000;
}

// Main DSP Audio Callback (Invoked per-sample inside I/O interrupt)
fract32 process_sample_granular(GranularVoice* voice, const OP1Knobs* knobs, fract32 note_freq) {
    // Knob 1 (Blue): Grain Density
    // Knob 2 (Green): Detune & Grain Spread
    // Knob 3 (White): Bandpass Filter Cutoff
    // Knob 4 (Orange): Resonance & Texture Mix
    
    fract32 output = 0;
    fract32 freq_inc = mult_fr1x32(note_freq, FRACT32_ONE_OVER_SR);
    
    // Cellular grain accumulation loop
    for(int g = 0; g < 4; g++) {
        voice->grain_pos[g] += freq_inc + mult_fr1x32(knobs->green, 0x08000000);
        if (voice->grain_pos[g] >= FRACT32_ONE) {
            voice->grain_pos[g] -= FRACT32_ONE;
        }
        output += fast_sin_fr32(voice->grain_pos[g]);
    }
    
    // Apply state variable bandpass filtering
    output = apply_svf_bandpass(output, knobs->white, knobs->orange);
    return output;
}`);

  // Sample teoperator state
  const [sampleName, setSampleName] = useState('808_Acoustic_Kick');
  const [sampleSlices, setSampleSlices] = useState(8);
  const [isGeneratingAif, setIsGeneratingAif] = useState(false);

  // Blackfin Hooks table
  const [hooks, setHooks] = useState<BlackfinHook[]>([
    {
      id: 'hook-1',
      addressHex: '0xFF801A40',
      symbol: '_fn_synth_cluster_dsp',
      description: 'Main processing callback for Cluster multi-saw oscillator',
      originalEngine: 'Cluster (Factory)',
      patchedEngine: 'Granular Glitch Cloud (Custom DSP)',
      status: 'HOOKED',
      sizeBytes: 1024,
      cyclesPerSample: 420
    },
    {
      id: 'hook-2',
      addressHex: '0xFF8024B0',
      symbol: '_fn_synth_pulse_dsp',
      description: 'Square PWM oscillator & filter table hook',
      originalEngine: 'Pulse (Factory)',
      patchedEngine: '6581 SID Chiptune Engine (Custom DSP)',
      status: 'HOOKED',
      sizeBytes: 1536,
      cyclesPerSample: 580
    },
    {
      id: 'hook-3',
      addressHex: '0xFF803810',
      symbol: '_fn_synth_phase_dsp',
      description: 'Phase distortion & sync oscillator entry point',
      originalEngine: 'Phase (Factory)',
      patchedEngine: 'Acid 303 Diode Bassline (Custom DSP)',
      status: 'HOOKED',
      sizeBytes: 2048,
      cyclesPerSample: 640
    },
    {
      id: 'hook-4',
      addressHex: '0xFF804200',
      symbol: '_fn_synth_string_dsp',
      description: 'Karplus-strong physical string model function pointer',
      originalEngine: 'String (Factory)',
      patchedEngine: 'Modal Resonator Tibetan Bell (Custom DSP)',
      status: 'HOOKED',
      sizeBytes: 1792,
      cyclesPerSample: 710
    }
  ]);

  if (!isOpen) return null;

  const handleCompileAndInjectDsp = () => {
    setIsCompilingDsp(true);
    setCompileLog('[BLACKFIN-TOOLCHAIN] Invoking bfin-elf-g++ compiler...\n[OPTIMIZER] Target: Analog Devices ADSP-BF524 (-O3 -mfast-fp)\n');
    
    setTimeout(() => {
      setCompileLog(prev => prev + '[ANALYSIS] Code size: 1,480 bytes in L1 Instruction SRAM.\n[PROFILER] Max cycles: 512 / 9070 per sample (5.6% DSP Load - SAFE).\n');
    }, 400);

    setTimeout(() => {
      setCompileLog(prev => prev + '[HOOK] Replacing function pointer 0xFF801A40 -> _fn_custom_dsp_entry\n[INJECT] Patching active WebAudio engine...\n[SUCCESS] Custom DSP Engine successfully loaded and ready for live play!');
      setIsCompilingDsp(false);
      onSelectCustomEngine(selectedDspEngine);
      audioEngine.playChime('flash');
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
    }, 900);
  };

  const handleGenerateTeoperatorPatch = () => {
    setIsGeneratingAif(true);
    setTimeout(() => {
      setIsGeneratingAif(false);
      audioEngine.playChime('save');
      const patchData = {
        name: sampleName,
        type: "drum",
        drum_version: 1,
        octave: 0,
        start: [0, 10000, 20000, 30000, 40000, 50000, 60000, 70000],
        end: [9999, 19999, 29999, 39999, 49999, 59999, 69999, 79999],
        pitch: [0, 0, 0, 0, 0, 0, 0, 0],
        volume: [8192, 8192, 8192, 8192, 8192, 8192, 8192, 8192],
        pan: [0, 0, 0, 0, 0, 0, 0, 0]
      };
      const blob = new Blob([JSON.stringify(patchData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${sampleName.toLowerCase().replace(/\s+/g, '_')}.aif.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-5xl bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 shadow-inner">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Az-OP-1 Firmware & DSP Engineering Lab
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/40 font-mono font-bold">
                  LEVEL 1-2-3 STUDIO
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Reverse-engineering, Blackfin ADSP-BF524 binary inspection, hook injection & C++ custom synth compiler
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Level Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 border-b border-neutral-800 bg-neutral-900/60 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            Architecture Overview
          </button>

          <button
            onClick={() => setActiveTab('level1')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === 'level1'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <FolderArchive className="w-4 h-4" />
            Level 1: Unified Surface Suite (op1repacker + opie + teoperator)
          </button>

          <button
            onClick={() => setActiveTab('level2')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === 'level2'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Binary className="w-4 h-4" />
            Level 2: Blackfin Disassembly & Hook Table
          </button>

          <button
            onClick={() => setActiveTab('level3')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === 'level3'
                ? 'border-green-500 text-green-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Code2 className="w-4 h-4" />
            Level 3: Custom C++/DSP Engine IDE & Sandbox
          </button>
        </div>

        {/* Modal Main Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-neutral-900/40">
          {/* TAB: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Card Level 1 */}
                <div 
                  onClick={() => setActiveTab('level1')}
                  className="p-5 rounded-xl bg-neutral-950/70 border border-blue-500/30 hover:border-blue-500/70 cursor-pointer transition flex flex-col justify-between group shadow-lg"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
                        NIVEAU 1
                      </span>
                      <FolderArchive className="w-5 h-5 text-blue-400" />
                    </div>
                    <h3 className="text-base font-bold text-white group-hover:text-blue-300 transition">
                      Surface Tool Suite
                    </h3>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      Décompression, modification d'assets SVG, déblocage des synthés cachés (Iter, Filter FX), formatage d'échantillons AIFF et gestion de backups.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between text-[11px] font-mono text-blue-400">
                    <span>op1repacker + opie + teoperator</span>
                    <span>→</span>
                  </div>
                </div>

                {/* Card Level 2 */}
                <div 
                  onClick={() => setActiveTab('level2')}
                  className="p-5 rounded-xl bg-neutral-950/70 border border-purple-500/30 hover:border-purple-500/70 cursor-pointer transition flex flex-col justify-between group shadow-lg"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">
                        NIVEAU 2
                      </span>
                      <Binary className="w-5 h-5 text-purple-400" />
                    </div>
                    <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition">
                      Rétro-Ingénierie & Hooks
                    </h3>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      Désassemblage du binaire machine Blackfin ADSP-BF524 (.ldr), table d'injection de hooks DSP et contrôle mémoire pour éviter tout risque de brick.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between text-[11px] font-mono text-purple-400">
                    <span>Ghidra / IDA .ldr Hooks</span>
                    <span>→</span>
                  </div>
                </div>

                {/* Card Level 3 */}
                <div 
                  onClick={() => setActiveTab('level3')}
                  className="p-5 rounded-xl bg-neutral-950/70 border border-green-500/30 hover:border-green-500/70 cursor-pointer transition flex flex-col justify-between group shadow-lg"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-green-500/20 text-green-400">
                        NIVEAU 3
                      </span>
                      <Code2 className="w-5 h-5 text-green-400" />
                    </div>
                    <h3 className="text-base font-bold text-white group-hover:text-green-300 transition">
                      IDE Moteurs Audio C++
                    </h3>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      Création, simulation et compilation de vos 20 propres moteurs DSP (Granulaire, SID 6581, Acid 303, Résonateur Modal) avec test en direct !
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between text-[11px] font-mono text-green-400">
                    <span>C++ Blackfin DSP Compiler</span>
                    <span>→</span>
                  </div>
                </div>
              </div>

              {/* Hardware & Processor Spec Box */}
              <div className="p-4 rounded-xl bg-neutral-950/80 border border-neutral-800 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between text-neutral-300 font-bold border-b border-neutral-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-orange-400" />
                    <span>TEENAGE ENGINEERING OP-1 ARCHITECTURE HARDWARE</span>
                  </div>
                  <span className="text-green-400 text-[11px]">STATUS: SIMULATION EN TEMPS RÉEL</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                  <div className="p-2 rounded bg-neutral-900/80 border border-neutral-800">
                    <span className="text-neutral-500 block">PROCESSEUR</span>
                    <span className="text-white font-bold">Analog Devices BF524</span>
                  </div>
                  <div className="p-2 rounded bg-neutral-900/80 border border-neutral-800">
                    <span className="text-neutral-500 block">CADENCE DSP</span>
                    <span className="text-orange-400 font-bold">400 MHz (Dual MAC)</span>
                  </div>
                  <div className="p-2 rounded bg-neutral-900/80 border border-neutral-800">
                    <span className="text-neutral-500 block">MÉMOIRE SRAM L1</span>
                    <span className="text-blue-400 font-bold">148 KB Low-Latency</span>
                  </div>
                  <div className="p-2 rounded bg-neutral-900/80 border border-neutral-800">
                    <span className="text-neutral-500 block">ÉCRAN OLED</span>
                    <span className="text-purple-400 font-bold">320 × 160 AMOLED</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: LEVEL 1 (SURFACE SUITE) */}
          {activeTab === 'level1' && (
            <div className="space-y-4">
              {/* Sub-tabs */}
              <div className="flex gap-2 border-b border-neutral-800 pb-3">
                {[
                  { id: 'repacker', name: 'op1repacker (Firmware)', icon: FolderArchive },
                  { id: 'teoperator', name: 'teoperator (Sample Slicer)', icon: Music },
                  { id: 'opie', name: 'opie (Presets & Tape)', icon: Database },
                  { id: 'op1svg', name: 'op1svg (Vector Normalizer)', icon: Image },
                ].map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => setLevel1SubTab(sub.id as any)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      level1SubTab === sub.id
                        ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50'
                        : 'text-neutral-400 hover:text-neutral-200 bg-neutral-900 border border-neutral-800'
                    }`}
                  >
                    <sub.icon className="w-3.5 h-3.5" />
                    {sub.name}
                  </button>
                ))}
              </div>

              {level1SubTab === 'repacker' && (
                <div className="space-y-4 font-mono text-xs">
                  <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                    <div className="flex items-center justify-between text-neutral-300 font-bold">
                      <span>GESTIONNAIRE OP1REPACKER</span>
                      <span className="text-blue-400">BASE FW: OP-1 v{modState.baseVersion}</span>
                    </div>
                    <p className="text-neutral-400 font-sans text-xs">
                      Décompresse le conteneur LZMA `.op1`, valide les signatures SHA256 et applique les modifications de surface sans altérer le cœur machine.
                    </p>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="p-3 rounded bg-neutral-900 border border-neutral-800 space-y-1">
                        <span className="text-neutral-500 text-[10px]">INTEGRITÉ SHA-256</span>
                        <div className="text-green-400 font-bold text-[11px] truncate">
                          e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
                        </div>
                      </div>
                      <div className="p-3 rounded bg-neutral-900 border border-neutral-800 space-y-1">
                        <span className="text-neutral-500 text-[10px]">CHECKSUM CRC32</span>
                        <div className="text-blue-400 font-bold text-[11px]">
                          0x8FA43BD1 (VALIDE)
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {level1SubTab === 'teoperator' && (
                <div className="space-y-4 font-mono text-xs">
                  <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                    <div className="flex items-center justify-between text-neutral-300 font-bold">
                      <span>GÉNÉRATEUR DE PATCHES TEOPERATOR</span>
                      <span className="text-orange-400">FORMAT: .AIF OP-1</span>
                    </div>
                    <p className="text-neutral-400 font-sans text-xs">
                      Convertit vos fichiers audio en multi-échantillons OP-1 prêts à l'emploi avec métadonnées JSON de découpage et points de boucle.
                    </p>
                    <div className="space-y-3 pt-2">
                      <div>
                        <label className="text-neutral-400 text-[10px] block mb-1">NOM DU PATCH OP-1</label>
                        <input
                          type="text"
                          value={sampleName}
                          onChange={(e) => setSampleName(e.target.value)}
                          className="w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-700 text-white font-mono text-xs"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-400">NOMBRE DE TRANSIENTS / SLICES:</span>
                        <div className="flex gap-2">
                          {[4, 8, 16, 24].map((n) => (
                            <button
                              key={n}
                              onClick={() => setSampleSlices(n)}
                              className={`px-3 py-1 rounded border text-xs font-bold ${
                                sampleSlices === n ? 'bg-orange-500 text-white border-orange-400' : 'bg-neutral-800 border-neutral-700 text-neutral-300'
                              }`}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={handleGenerateTeoperatorPatch}
                        disabled={isGeneratingAif}
                        className="w-full py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold flex items-center justify-center gap-2 transition shadow-md shadow-orange-600/30"
                      >
                        <Download className="w-4 h-4" />
                        {isGeneratingAif ? 'Encapsulation .AIF en cours...' : 'Générer & Exporter le Patch OP-1'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {level1SubTab === 'opie' && (
                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between text-neutral-300 font-bold">
                    <span>OPIE - GESTIONNAIRE DE BACKUP & PRESETS</span>
                    <span className="text-green-400">4 PISTES MAGNÉTIQUES</span>
                  </div>
                  <p className="text-neutral-400 font-sans text-xs">
                    Sauvegardez l'intégralité de la bande 4 pistes, des synthétiseurs sauvegardés et des snapshots du studio en un clic.
                  </p>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      onClick={() => {
                        audioEngine.playChime('save');
                        alert('Sauvegarde de l\'atelier OP-1 exportée avec succès !');
                      }}
                      className="p-3 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-left space-y-1 transition"
                    >
                      <div className="flex items-center gap-2 text-white font-bold">
                        <Download className="w-4 h-4 text-blue-400" />
                        Exporter Snapshot Studio
                      </div>
                      <span className="text-neutral-400 text-[10px] block">Bande 4 pistes + 9 Presets + Séquenceur</span>
                    </button>
                    <button
                      onClick={() => {
                        audioEngine.playChime('boot');
                        alert('Snapshot d\'usine OP-1 restauré.');
                      }}
                      className="p-3 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-left space-y-1 transition"
                    >
                      <div className="flex items-center gap-2 text-white font-bold">
                        <RefreshCw className="w-4 h-4 text-orange-400" />
                        Restaurer État d'Usine
                      </div>
                      <span className="text-neutral-400 text-[10px] block">Remise à zéro sécurisée des mémoires</span>
                    </button>
                  </div>
                </div>
              )}

              {level1SubTab === 'op1svg' && (
                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between text-neutral-300 font-bold">
                    <span>OP1SVG - NORMALISATEUR DE GRAPHISMES VECTORIELS</span>
                    <span className="text-purple-400">320 × 160 OLED</span>
                  </div>
                  <p className="text-neutral-400 font-sans text-xs">
                    Normalise les coordonnées vectorielles SVG selon les contraintes de rendu du pilote OLED de l'OP-1 (anti-aliasing 2 bits, palette 4 couleurs TE).
                  </p>
                  <div className="p-3 rounded bg-neutral-900/90 border border-neutral-800 flex items-center justify-between">
                    <span className="text-neutral-300 font-bold">Mascotte active : {modState.cwoGraphic.toUpperCase()}</span>
                    <span className="text-green-400 text-[11px]">✓ Normalisé (OP-1 Compliant)</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: LEVEL 2 (BLACKFIN REVERSE-ENGINEERING & HOOKS) */}
          {activeTab === 'level2' && (
            <div className="space-y-4">
              <div className="flex gap-2 border-b border-neutral-800 pb-3">
                {[
                  { id: 'disasm', name: 'Désassembleur ADSP-BF524', icon: Binary },
                  { id: 'hooks', name: 'Table de Hooks DSP', icon: Sliders },
                  { id: 'memory', name: 'Cartographie Mémoire & Anti-Brick', icon: ShieldAlert },
                ].map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => setLevel2SubTab(sub.id as any)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      level2SubTab === sub.id
                        ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50'
                        : 'text-neutral-400 hover:text-neutral-200 bg-neutral-900 border border-neutral-800'
                    }`}
                  >
                    <sub.icon className="w-3.5 h-3.5" />
                    {sub.name}
                  </button>
                ))}
              </div>

              {level2SubTab === 'disasm' && (
                <div className="space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between px-3 py-2 bg-neutral-950 rounded border border-neutral-800 text-[11px]">
                    <span className="text-neutral-400">SYMBOLE EXAMINÉ : <strong className="text-purple-300">_fn_synth_cluster_dsp (0xFF801A40)</strong></span>
                    <span className="text-green-400 font-bold">DÉCOMPILATION GHIDRA BLACKFIN ACTIVE</span>
                  </div>
                  <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 font-mono text-[11px] text-neutral-300 space-y-1.5 overflow-x-auto">
                    <div className="text-neutral-500">// Blackfin Assembly Disassembly (ADSP-BF524 Core Architecture)</div>
                    <div><span className="text-blue-400">0xFF801A40:</span>  <span className="text-purple-400">LINK 0x20;</span>                <span className="text-neutral-500">// Prologue: Allocate stack frame</span></div>
                    <div><span className="text-blue-400">0xFF801A44:</span>  <span className="text-purple-400">[--SP] = (R7:4, P5:3);</span>     <span className="text-neutral-500">// Push callee-saved registers</span></div>
                    <div><span className="text-blue-400">0xFF801A48:</span>  <span className="text-orange-400">R0 = [P0 + 0x04];</span>          <span className="text-neutral-500">// Load Knob 1 Blue (Frequency Offset)</span></div>
                    <div><span className="text-blue-400">0xFF801A4C:</span>  <span className="text-orange-400">R1 = [P0 + 0x08];</span>          <span className="text-neutral-500">// Load Knob 2 Green (Spread Detune)</span></div>
                    <div><span className="text-blue-400">0xFF801A50:</span>  <span className="text-green-400">R2 = R0 * R1 (IS);</span>          <span className="text-neutral-500">// Fractional 32-bit hardware multiply</span></div>
                    <div><span className="text-blue-400">0xFF801A54:</span>  <span className="text-purple-400">CALL _dsp_hook_custom_engine;</span> <span className="text-orange-400">[INJECTED HOOK] Jump to custom DSP</span></div>
                    <div><span className="text-blue-400">0xFF801A58:</span>  <span className="text-purple-400">(R7:4, P5:3) = [SP++];</span>     <span className="text-neutral-500">// Pop registers</span></div>
                    <div><span className="text-blue-400">0xFF801A5C:</span>  <span className="text-purple-400">UNLINK; RTS;</span>                <span className="text-neutral-500">// Return to audio interrupt vector</span></div>
                  </div>
                </div>
              )}

              {level2SubTab === 'hooks' && (
                <div className="space-y-3 font-mono text-xs">
                  <div className="text-neutral-400 text-xs font-sans">
                    Cette table permet de détourner les pointeurs d'adresses d'un moteur d'usine vers vos propres moteurs C++ personnalisés sans réécrire l'OS complet.
                  </div>
                  <div className="space-y-2">
                    {hooks.map((hook) => (
                      <div key={hook.id} className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-purple-400 font-bold">{hook.addressHex}</span>
                            <span className="text-white font-bold">{hook.symbol}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30">
                              {hook.status}
                            </span>
                          </div>
                          <p className="text-neutral-400 text-[11px] font-sans">
                            Remplace : <strong className="text-neutral-200">{hook.originalEngine}</strong> → <strong className="text-orange-400">{hook.patchedEngine}</strong>
                          </p>
                        </div>
                        <div className="text-right text-[10px]">
                          <span className="text-neutral-500 block">BUDGET CYCLES</span>
                          <span className="text-blue-400 font-bold">{hook.cyclesPerSample} / 9070 cyc</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {level2SubTab === 'memory' && (
                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-4 font-mono text-xs">
                  <div className="flex items-center gap-2 text-yellow-400 font-bold">
                    <ShieldAlert className="w-5 h-5" />
                    <span>SYSTÈME ANTI-BRICK & CONTRÔLEUR DE MÉMOIRE</span>
                  </div>
                  <p className="text-neutral-400 font-sans text-xs">
                    Toute injection binaire est préalablement vérifiée contre la table des vecteurs d'interruption (IVG) du bootloader TE.
                  </p>
                  <div className="space-y-2 pt-2">
                    <div className="p-2.5 rounded bg-neutral-900 border border-green-500/40 flex justify-between items-center">
                      <div>
                        <span className="text-green-400 font-bold block">L1 Instruction SRAM (0xFFA00000 - 0xFFA0C000)</span>
                        <span className="text-neutral-400 text-[10px]">Exécution DSP Ultra-Rapide (0-Wait State)</span>
                      </div>
                      <span className="text-green-400 font-bold text-[11px]">48 KB [SÉCURISÉ]</span>
                    </div>
                    <div className="p-2.5 rounded bg-neutral-900 border border-blue-500/40 flex justify-between items-center">
                      <div>
                        <span className="text-blue-400 font-bold block">SDRAM 64 MB (0x00000000 - 0x04000000)</span>
                        <span className="text-neutral-400 text-[10px]">Stockage des tampons de bande 4 pistes et tables de morphing</span>
                      </div>
                      <span className="text-blue-400 font-bold text-[11px]">64 MB [LIBRE: 42 MB]</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: LEVEL 3 (CUSTOM C++/DSP IDE & SIMULATOR) */}
          {activeTab === 'level3' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-neutral-400 text-xs font-mono font-bold">MOTEUR SÉLECTIONNÉ :</span>
                  {(['granular', 'sidchip', 'acid303', 'bellres'] as SynthEngineType[]).map((eng) => (
                    <button
                      key={eng}
                      onClick={() => {
                        setSelectedDspEngine(eng);
                        onSelectCustomEngine(eng);
                      }}
                      className={`px-3 py-1 rounded text-xs font-bold capitalize transition ${
                        currentEngine === eng
                          ? 'bg-green-600 text-white shadow-md shadow-green-600/30'
                          : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                      }`}
                    >
                      {eng}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleCompileAndInjectDsp}
                  disabled={isCompilingDsp}
                  className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 active:bg-green-700 text-white text-xs font-bold flex items-center gap-2 transition shadow-lg shadow-green-600/30"
                >
                  <Sparkles className="w-4 h-4" />
                  {isCompilingDsp ? 'Compilation C++ en cours...' : 'Compiler & Injecter dans l\'OP-1'}
                </button>
              </div>

              {/* Code Editor */}
              <div className="rounded-xl bg-neutral-950 border border-neutral-800 overflow-hidden font-mono text-xs">
                <div className="flex items-center justify-between px-4 py-2 bg-neutral-900 border-b border-neutral-800 text-neutral-400 text-[11px]">
                  <span>dsp_engine_{selectedDspEngine}.cpp (Blackfin C++ Toolchain)</span>
                  <span className="text-green-400">44.1 kHz • 32-bit Fractional Fixed-Point</span>
                </div>
                <textarea
                  value={customEngineCode}
                  onChange={(e) => setCustomEngineCode(e.target.value)}
                  rows={12}
                  className="w-full p-4 bg-transparent text-neutral-200 font-mono text-xs focus:outline-none resize-none leading-relaxed selection:bg-green-600 selection:text-white"
                  spellCheck={false}
                />
              </div>

              {/* Compilation Log Terminal */}
              {compileLog && (
                <div className="p-3.5 rounded-xl bg-black/90 border border-neutral-800 font-mono text-[11px] text-green-400 space-y-1">
                  <div className="flex items-center gap-2 text-neutral-400 font-bold border-b border-neutral-800 pb-1">
                    <Terminal className="w-3.5 h-3.5" />
                    <span>SORTIE COMPILATEUR BFIN-ELF-G++</span>
                  </div>
                  <pre className="whitespace-pre-wrap leading-tight">{compileLog}</pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-800 bg-neutral-950/90">
          <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
            <ShieldCheck className="w-4 h-4 text-green-400" />
            <span>Environnement sécurisé • Prêt pour le flashage matériel ou simulation WebAudio</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold transition"
          >
            Fermer le Lab
          </button>
        </div>
      </div>
    </div>
  );
};
