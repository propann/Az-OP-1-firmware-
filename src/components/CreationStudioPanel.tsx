import React, { useState, useEffect, useRef } from 'react';
import { 
  Cpu, 
  Layers, 
  Volume2, 
  Play, 
  Square, 
  Sliders, 
  Code2, 
  Zap, 
  Activity, 
  Radio, 
  Grid, 
  Flame, 
  Bell, 
  Disc, 
  Music,
  CheckCircle2,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { 
  SynthEngineType, 
  SynthParams, 
  EnvelopeParams, 
  FxParams, 
  LfoParams, 
  TapeState, 
  CustomDspEngineDefinition 
} from '../types';
import { DSP_ENGINES_CATALOG } from '../data/firmwareData';
import { audioEngine } from '../audio/engine';
import { KnobControl } from './KnobControl';

interface CreationStudioPanelProps {
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
}

export const CreationStudioPanel: React.FC<CreationStudioPanelProps> = ({
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
  tapeState
}) => {
  const [selectedEngineDef, setSelectedEngineDef] = useState<CustomDspEngineDefinition>(
    DSP_ENGINES_CATALOG.find(e => e.id === currentEngine) || DSP_ENGINES_CATALOG[0]
  );
  const [activeDemo, setActiveDemo] = useState<string>('');
  const [selectedOctave, setSelectedOctave] = useState(4);
  const [activeKeys, setActiveKeys] = useState<number[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  // Live Canvas Visualizer
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const found = DSP_ENGINES_CATALOG.find(e => e.id === currentEngine);
    if (found) setSelectedEngineDef(found);
  }, [currentEngine]);

  useEffect(() => {
    let animId: number;
    const renderWave = () => {
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          const wave = audioEngine.getWaveformData();
          ctx.fillStyle = '#09090b';
          ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);

          ctx.lineWidth = 2;
          ctx.strokeStyle = '#06b6d4'; // Cyan
          ctx.beginPath();

          const sliceWidth = (canvasRef.current.width * 1.0) / wave.length;
          let x = 0;

          for (let i = 0; i < wave.length; i++) {
            const v = wave[i] / 128.0;
            const y = (v * canvasRef.current.height) / 2;

            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
            x += sliceWidth;
          }

          ctx.lineTo(canvasRef.current.width, canvasRef.current.height / 2);
          ctx.stroke();
        }
      }
      animId = requestAnimationFrame(renderWave);
    };

    renderWave();
    return () => cancelAnimationFrame(animId);
  }, []);

  const handleSelectEngine = (engineDef: CustomDspEngineDefinition) => {
    setSelectedEngineDef(engineDef);
    setCurrentEngine(engineDef.id);
    audioEngine.playNote(60, engineDef.id, synthParams, envelope, fx, lfo, 0.7);
    setTimeout(() => audioEngine.stopNote(60), 300);
  };

  const handlePlayKey = (midi: number) => {
    audioEngine.playNote(midi, currentEngine, synthParams, envelope, fx, lfo, 0.8);
    setActiveKeys(prev => [...prev, midi]);
  };

  const handleStopKey = (midi: number) => {
    audioEngine.stopNote(midi);
    setActiveKeys(prev => prev.filter(k => k !== midi));
  };

  const handleToggleDemo = (pattern: 'arp' | 'chord' | 'bass' | 'lead') => {
    if (activeDemo === pattern) {
      audioEngine.stopDemoPattern();
      setActiveDemo('');
    } else {
      audioEngine.playDemoPattern(currentEngine, pattern, synthParams, envelope, fx, lfo);
      setActiveDemo(pattern);
    }
  };

  const filteredEngines = DSP_ENGINES_CATALOG.filter(e => {
    if (filterCategory === 'ALL') return true;
    if (filterCategory === 'MODDED') return e.isCommunityMod;
    if (filterCategory === 'FACTORY') return !e.isCommunityMod;
    return true;
  });

  return (
    <div id="creation-studio-panel" className="space-y-6">
      {/* Top Banner: Modular Rack & Visualizer */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              Architecture Studio & Rack Virtuel Connectable
            </span>
            <h2 className="text-xl font-bold font-mono text-zinc-100">
              Workspace DSP : {selectedEngineDef.name}
            </h2>
            <p className="text-xs text-zinc-400 font-mono mt-1">
              Catégorie : {selectedEngineDef.category} • Auteur : {selectedEngineDef.author} • Offset ROM : {selectedEngineDef.romOffsetHex}
            </p>
          </div>

          {/* Quick Demo Preview Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleToggleDemo('arp')}
              className={`px-3 py-2 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                activeDemo === 'arp'
                  ? 'bg-cyan-500 text-black font-bold shadow-md shadow-cyan-500/30'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              {activeDemo === 'arp' ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              Arp 120 BPM
            </button>

            <button
              onClick={() => handleToggleDemo('chord')}
              className={`px-3 py-2 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                activeDemo === 'chord'
                  ? 'bg-cyan-500 text-black font-bold shadow-md shadow-cyan-500/30'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              {activeDemo === 'chord' ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              Accords
            </button>

            <button
              onClick={() => handleToggleDemo('bass')}
              className={`px-3 py-2 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                activeDemo === 'bass'
                  ? 'bg-cyan-500 text-black font-bold shadow-md shadow-cyan-500/30'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              {activeDemo === 'bass' ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              Basse Groove
            </button>

            <button
              onClick={() => handleToggleDemo('lead')}
              className={`px-3 py-2 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                activeDemo === 'lead'
                  ? 'bg-cyan-500 text-black font-bold shadow-md shadow-cyan-500/30'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              {activeDemo === 'lead' ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              Solo Lead
            </button>

            {activeDemo && (
              <button
                onClick={() => {
                  audioEngine.stopDemoPattern();
                  setActiveDemo('');
                }}
                className="p-2 bg-red-950 text-red-400 border border-red-800/80 rounded-lg hover:bg-red-900 cursor-pointer"
                title="Arrêter la lecture"
              >
                <Square className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* RACK VIRTUEL : 4 MODULES CONNECTÉS AVEC CÂBLES VIRTUELS */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 font-mono">
              Rack Modulaire Virtuel (Signal Flow : MIDI → DSP Core → FX Chain → Master Tape)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Signal Bus Active
          </span>
        </div>

        {/* 4 Rack Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 relative">
          {/* Module 1: MIDI & Keyboard Control */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold">MOD 1: MIDI GENERATOR</span>
              <span className="text-[10px] font-mono text-zinc-400">Octave {selectedOctave}</span>
            </div>
            
            <div className="space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 text-[11px]">Transposition :</span>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setSelectedOctave(Math.max(1, selectedOctave - 1))}
                    className="px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded text-xs hover:bg-zinc-700"
                  >
                    -
                  </button>
                  <span className="px-2 font-bold text-cyan-400">OCT {selectedOctave}</span>
                  <button 
                    onClick={() => setSelectedOctave(Math.min(7, selectedOctave + 1))}
                    className="px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded text-xs hover:bg-zinc-700"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Mini Piano Roll for Module 1 */}
            <div className="pt-2">
              <div className="flex items-end justify-between gap-1 h-16 bg-black p-1.5 rounded-lg border border-zinc-800">
                {[0, 2, 4, 5, 7, 9, 11, 12].map((noteOffset, idx) => {
                  const midi = selectedOctave * 12 + noteOffset;
                  const isPressed = activeKeys.includes(midi);
                  return (
                    <button
                      key={idx}
                      onMouseDown={() => handlePlayKey(midi)}
                      onMouseUp={() => handleStopKey(midi)}
                      onMouseLeave={() => handleStopKey(midi)}
                      className={`flex-1 h-full rounded transition-all flex items-end justify-center pb-1 text-[10px] font-mono font-bold cursor-pointer ${
                        isPressed
                          ? 'bg-cyan-400 text-black shadow-lg shadow-cyan-400/50'
                          : 'bg-zinc-200 text-zinc-800 hover:bg-white'
                      }`}
                    >
                      {['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C'][idx]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Module 2: DSP Engine & 4 Color Encoders */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold">MOD 2: DSP ENGINE</span>
              <span className="text-[10px] font-mono text-cyan-300 font-bold">{selectedEngineDef.id.toUpperCase()}</span>
            </div>

            {/* 4 Physical OP-1 Continuous Encoders */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <KnobControl
                color="blue"
                label={selectedEngineDef.knobBlueLabel}
                value={synthParams.blue}
                onChange={(val) => setSynthParams(prev => ({ ...prev, blue: val }))}
              />
              <KnobControl
                color="green"
                label={selectedEngineDef.knobGreenLabel}
                value={synthParams.green}
                onChange={(val) => setSynthParams(prev => ({ ...prev, green: val }))}
              />
              <KnobControl
                color="white"
                label={selectedEngineDef.knobWhiteLabel}
                value={synthParams.white}
                onChange={(val) => setSynthParams(prev => ({ ...prev, white: val }))}
              />
              <KnobControl
                color="orange"
                label={selectedEngineDef.knobOrangeLabel}
                value={synthParams.orange}
                onChange={(val) => setSynthParams(prev => ({ ...prev, orange: val }))}
              />
            </div>
          </div>

          {/* Module 3: FX Rack Unit */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold">MOD 3: MASTER FX CHAIN</span>
              <span className="text-[10px] font-mono text-amber-400 font-bold">{fx.type.toUpperCase()}</span>
            </div>

            <div className="grid grid-cols-3 gap-1">
              {(['cwo', 'nitro', 'filter', 'delay', 'reverb', 'chorus'] as const).map((fxType) => (
                <button
                  key={fxType}
                  onClick={() => {
                    setFx(prev => ({ ...prev, type: fxType, enabled: true }));
                    audioEngine.playChime('save');
                  }}
                  className={`p-1.5 rounded text-[10px] font-mono uppercase transition-colors cursor-pointer ${
                    fx.type === fxType
                      ? 'bg-amber-500 text-black font-bold'
                      : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                  }`}
                >
                  {fxType}
                </button>
              ))}
            </div>

            <div className="space-y-2 pt-1 font-mono text-xs">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-400">Wet/Dry Mix :</span>
                <span className="text-amber-400 font-bold">{fx.orange}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={fx.orange}
                onChange={(e) => setFx(prev => ({ ...prev, orange: parseInt(e.target.value) }))}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>
          </div>

          {/* Module 4: Live Oscilloscope & Master Bus */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold">MOD 4: MASTER BUS & SCOPE</span>
              <span className="text-[10px] font-mono text-emerald-400">44.1 kHz</span>
            </div>

            <canvas
              ref={canvasRef}
              width={260}
              height={100}
              className="w-full h-24 bg-black rounded border border-zinc-800"
            />
          </div>
        </div>
      </div>

      {/* 20 MOTEURS AUDIO CATALOG (12 USINE + 8 DSP MODS) */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800 pb-4">
          <div>
            <h3 className="text-sm font-bold font-mono text-zinc-100 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              Catalogue des 20 Moteurs Audio Disponibles
            </h3>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              12 Moteurs d'Usine Teenage Engineering + 8 Nouveaux Moteurs DSP Moddés Blackfin ADSP-BF524.
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            {['ALL', 'MODDED', 'FACTORY'].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                  filterCategory === cat
                    ? 'bg-cyan-600 text-white font-bold'
                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Engine Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredEngines.map((engine) => {
            const isSelected = selectedEngineDef.id === engine.id;
            return (
              <div
                key={engine.id}
                onClick={() => handleSelectEngine(engine)}
                className={`p-3.5 rounded-lg border text-left cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-950/40 ring-1 ring-cyan-500/50'
                    : 'bg-zinc-950/70 border-zinc-800/80 hover:bg-zinc-800/60 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className={`text-xs font-bold font-mono ${isSelected ? 'text-cyan-300' : 'text-zinc-200'}`}>
                    {engine.name}
                  </span>
                  {engine.isCommunityMod ? (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-cyan-950 text-cyan-400 border border-cyan-800/80">
                      DSP MOD
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-zinc-800 text-zinc-400">
                      FACTORY
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400 font-mono mt-1 line-clamp-2">
                  {engine.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Selected Engine C++ DSP Source & Details */}
        <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800 font-mono text-xs space-y-3">
          <div className="flex items-center justify-between text-zinc-400 text-[11px]">
            <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
              <Code2 className="w-3.5 h-3.5" />
              Code Source C++ Blackfin DSP (Symbole Hook : {selectedEngineDef.hookTargetSymbol})
            </span>
            <span>Adresse ROM : {selectedEngineDef.romOffsetHex}</span>
          </div>
          <pre className="p-3 bg-black/60 rounded border border-zinc-800/80 text-zinc-300 overflow-x-auto text-[11px] leading-relaxed">
            {selectedEngineDef.codeCpp}
          </pre>
        </div>
      </div>
    </div>
  );
};
