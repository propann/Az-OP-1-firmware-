// ============================================================================
// AZ-OP-1 ENGINEERING STUDIO · ADSP-BF524 HARDWARE LAB WORKBENCH
// Authentic Blackfin DSP Cockpit: True 320x160 PPI DMA Framebuffer,
// 4 Optical Rotary Encoders (MMIO), Web MIDI Controller & 24-Key Physical Keybed.
// ============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  op1Vm, 
  VmStatus 
} from '../emulator/op1VirtualMachine';
import { CpuRegisters } from '../emulator/blackfinCpu';
import { DisassembledInstruction } from '../emulator/disassembler';
import { LdrParser, ParsedLdrFirmware } from '../emulator/ldrParser';
import { audioEngine } from '../audio/engine';
import { OFFICIAL_FIRMWARES } from '../data/firmwareData';
import { KnobControl } from './KnobControl';
import { Keyboard } from './Keyboard';
import { MidiControllerBar } from './MidiControllerBar';
import { 
  SynthEngineType, 
  SynthParams, 
  EnvelopeParams, 
  FxParams, 
  LfoParams, 
  TapeState,
  FirmwareModState
} from '../types';
import { 
  Cpu, 
  Play, 
  Pause, 
  RotateCcw, 
  StepForward, 
  SkipForward, 
  OctagonX, 
  Binary, 
  FileCode, 
  Layers, 
  Activity, 
  Upload, 
  Terminal, 
  Search, 
  Zap, 
  Sliders, 
  Volume2, 
  VolumeX, 
  Tv, 
  Music, 
  BookOpen, 
  Sparkles, 
  Dices,
  RefreshCw,
  Eye,
  HardDrive
} from 'lucide-react';

interface BlackfinHardwareLabProps {
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
  setTapeState: React.Dispatch<React.SetStateAction<TapeState>>;
  onOpenEngineeringLab: () => void;
  onOpenFirmwareModder: () => void;
  onOpenTombola: () => void;
  onOpenDocs: () => void;
}

export const BlackfinHardwareLab: React.FC<BlackfinHardwareLabProps> = ({
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
  setTapeState,
  onOpenEngineeringLab,
  onOpenFirmwareModder,
  onOpenTombola,
  onOpenDocs,
}) => {
  // VM Execution State
  const [vmStatus, setVmStatus] = useState<VmStatus>({
    isRunning: false,
    isPaused: false,
    isBooted: false,
    loadedFirmwareName: 'diagnostic_bf524.ldr',
    firmwareCrc32: '00000000',
    totalLoadedBytes: 34,
    entryPoint: 0x00001000,
    pc: 0x00001000,
    cycles: '0',
    instructions: '0',
    mips: 0,
    cpuLoadPercent: 0,
    executionError: null,
  });

  const [regs, setRegs] = useState<CpuRegisters | null>(null);
  const [disasmList, setDisasmList] = useState<DisassembledInstruction[]>([]);
  const [activeTab, setActiveTab] = useState<'disasm' | 'memory' | 'ldr_blocks' | 'terminal'>('disasm');
  const [memBaseAddr, setMemBaseAddr] = useState<string>('0x00001000');
  const [memRows, setMemRows] = useState<{ address: number; bytes: number[]; ascii: string }[]>([]);
  const [selectedFixture, setSelectedFixture] = useState<'alu_diagnostic' | 'teboot_vector' | 'sport0_audio' | 'ppi_framebuffer'>('alu_diagnostic');
  const [selectedOfficialFw, setSelectedOfficialFw] = useState<string>('op1-fw-243-stock');
  const [analysisReport, setAnalysisReport] = useState<ParsedLdrFirmware | null>(null);
  const [isCrtGlow, setIsCrtGlow] = useState<boolean>(false);
  const [activeMidiNotes, setActiveMidiNotes] = useState<number[]>([]);
  const [octave, setOctave] = useState<number>(3);
  const [masterVolume, setMasterVolume] = useState<number>(85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1.0);
  const [fpsCounter, setFpsCounter] = useState<number>(60);
  const [frameRefreshCount, setFrameRefreshCount] = useState<number>(0);
  const [terminalLogs, setTerminalLogs] = useState<Array<{ id: string; time: string; type: 'mmio' | 'ivg' | 'cpu' | 'error' | 'info'; text: string }>>([
    { id: '1', time: '00:00:00.001', type: 'info', text: 'ADSP-BF524 Core Initialized @ 400 MHz (SRAM L1 Data A/B 32KB, Inst 32KB, SDRAM 64MB)' },
    { id: '2', time: '00:00:00.002', type: 'mmio', text: 'MMR Hook Registered: SPORT0 (0xFFC00810), PPI DMA (0xFFC00400), Matrix (0xFFC01500)' },
    { id: '3', time: '00:00:00.003', type: 'info', text: 'PPI Direct Video DMA Framebuffer 320x160 ready at 0x00010000' }
  ]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const animRef = useRef<number | null>(null);

  // Audio Note Triggering
  const handleNoteOn = useCallback((note: number, velocity: number = 100) => {
    audioEngine.init();
    audioEngine.noteOn(note, velocity, currentEngine, synthParams, envelope, fx, lfo);
    setActiveMidiNotes(prev => (prev.includes(note) ? prev : [...prev, note]));
  }, [currentEngine, synthParams, envelope, fx, lfo]);

  const handleNoteOff = useCallback((note: number) => {
    audioEngine.noteOff(note);
    setActiveMidiNotes(prev => prev.filter(n => n !== note));
  }, []);

  // Master Volume sync
  useEffect(() => {
    audioEngine.setMasterVolume(isMuted ? 0 : masterVolume / 100);
  }, [masterVolume, isMuted]);

  // Subscribe to VM updates
  useEffect(() => {
    op1Vm.onStateChange = (status) => setVmStatus(status);
    op1Vm.onRegisterUpdate = (r) => setRegs({ ...r });
    op1Vm.onDisassemblyUpdate = (d) => setDisasmList([...d]);

    // Direct PPI Framebuffer Hook from Blackfin memory
    op1Vm.peripherals.onDisplayRefresh = (imageData: ImageData) => {
      setFrameRefreshCount(c => c + 1);
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) ctx.putImageData(imageData, 0, 0);
      }
    };

    // Initial state
    setRegs({ ...op1Vm.cpu.regs });
    setDisasmList(op1Vm.getDisassemblyAroundPc(24));
    refreshMemoryView(0x00001000);

    return () => {
      op1Vm.onStateChange = undefined;
      op1Vm.onRegisterUpdate = undefined;
      op1Vm.onDisassemblyUpdate = undefined;
    };
  }, []);

  // Refresh Memory rows
  const refreshMemoryView = (addr: number) => {
    const rows = op1Vm.readMemoryBlock(addr, 256);
    setMemRows(rows);
  };

  const handleMemJump = (hexStr: string) => {
    const addr = parseInt(hexStr.replace('0x', ''), 16);
    if (!isNaN(addr)) {
      setMemBaseAddr('0x' + addr.toString(16).toUpperCase());
      refreshMemoryView(addr);
    }
  };

  // Speed multiplier update
  const handleSpeedChange = (spd: number) => {
    setSpeedMultiplier(spd);
    op1Vm.executionSpeedMultiplier = spd;
  };

  // Diagnostic Fixture Loading
  const handleLoadFixture = (type: 'alu_diagnostic' | 'teboot_vector' | 'sport0_audio' | 'ppi_framebuffer') => {
    setSelectedFixture(type);
    op1Vm.loadDiagnosticFixture(type);
    refreshMemoryView(op1Vm.cpu.regs.pc);
    audioEngine.playChime('boot');
    addTerminalLog('info', `Fixture de test chargée : ${type}. Vecteur de reset initialisé à 0x00001000.`);
  };

  // Official Factory Firmware Loading & Specification Configuration
  const handleLoadOfficialFirmware = (fwId: string) => {
    setSelectedOfficialFw(fwId);
    const fw = OFFICIAL_FIRMWARES.find(f => f.id === fwId);
    if (!fw) return;

    // Load firmware shape into VM
    const versionNumber = fw.version.replace('v', '').split('-')[0] || '243';
    op1Vm.loadFactoryFirmware(versionNumber, fw.isModded);
    refreshMemoryView(op1Vm.cpu.regs.pc);
    audioEngine.playChime('boot');
    addTerminalLog('info', `Firmware officiel sélectionné : ${fw.version} (${fw.fileName}, CRC32: 0x${fw.crc32}).`);
  };

  // File Upload Handler (.op1 / .ldr / .bin)
  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result instanceof ArrayBuffer) {
        const bytes = new Uint8Array(e.target.result);
        const report = LdrParser.parse(bytes, file.name);
        setAnalysisReport(report);

        if (report.isValid) {
          addTerminalLog('info', `Firmware analysé : ${file.name} (${report.format}, ${report.totalSize} octets, CRC32: 0x${report.crc32})`);
        } else {
          addTerminalLog('error', `Erreur d'intégrité firmware : ${report.errors.join(' | ')}`);
        }

        const success = report.isExecutableByExperimentalCore && op1Vm.loadFirmwareBinary(bytes, file.name);
        if (success) {
          refreshMemoryView(op1Vm.cpu.regs.pc);
          audioEngine.playChime('save');
          addTerminalLog('info', `Firmware ${file.name} monté dans la mémoire SDRAM / L1.`);
        }
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const addTerminalLog = (type: 'mmio' | 'ivg' | 'cpu' | 'error' | 'info', text: string) => {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
    setTerminalLogs(prev => [...prev.slice(-99), { id: Math.random().toString(), time: timeStr, type, text }]);
  };

  // Pure Hardware Framebuffer Renderer Loop:
  // Strictly renders the exact 320x160 pixel buffer from op1Vm.peripherals.display.data
  useEffect(() => {
    let active = true;
    let lastTime = performance.now();
    let frames = 0;

    const render = (now: number) => {
      if (!active) return;
      
      // Calculate real FPS
      frames++;
      if (now - lastTime >= 1000) {
        setFpsCounter(frames);
        frames = 0;
        lastTime = now;
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Render the actual hardware display buffer directly into the canvas
          const displayBuf = op1Vm.peripherals.display.data;
          const clamped = new Uint8ClampedArray(displayBuf.buffer as ArrayBuffer);
          const imgData = new ImageData(clamped, 320, 160);
          ctx.putImageData(imgData, 0, 0);
        }
      }

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
    return () => {
      active = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <div className="w-full flex flex-col gap-4 text-neutral-100 font-sans">
      
      {/* 1. TOP HEADER & REAL-TIME HARDWARE CONTROLS */}
      <header className="p-3.5 sm:p-4 rounded-3xl bg-[#141822] border-2 border-[#2b3345] shadow-2xl flex flex-col gap-3">
        
        {/* Row 1: Core Title, Status Badge, CPU Stepper Controls & Modals */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          {/* Logo & Target Identification */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-950/80 border border-cyan-500/50 text-cyan-400 shadow-md">
              <Cpu className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-sm sm:text-base tracking-wider text-white">
                  ÉMULATEUR MATÉRIEL ADSP-BF524
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  vmStatus.isRunning 
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50 animate-pulse'
                    : vmStatus.isPaused
                    ? 'bg-amber-950 text-amber-300 border border-amber-500/50'
                    : 'bg-neutral-800 text-neutral-400'
                }`}>
                  {vmStatus.isRunning ? '● RUNNING (400 MHz)' : vmStatus.isPaused ? '❚❚ PAUSED' : '○ HALTED'}
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Analog Devices ADSP-BF524C2 • PPI DMA Framebuffer 320×160 • SPORT0 44.1kHz • C8051 Matrix
              </p>
            </div>
          </div>

          {/* Real Blackfin CPU Stepper & Execution Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              id="vm-run-btn"
              onClick={() => {
                op1Vm.start();
                audioEngine.init();
                addTerminalLog('cpu', 'Exécution CPU démarrée à 400 MHz.');
              }}
              disabled={vmStatus.isRunning}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-black flex items-center gap-1.5 transition active:scale-95 shadow-md cursor-pointer"
              title="Démarrer l'exécution du DSP en temps réel (400 MHz)"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>RUN</span>
            </button>

            <button
              id="vm-pause-btn"
              onClick={() => {
                op1Vm.pause();
                addTerminalLog('cpu', 'Exécution CPU mise en pause.');
              }}
              disabled={!vmStatus.isRunning}
              className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-xs font-black flex items-center gap-1.5 transition active:scale-95 shadow-md cursor-pointer"
              title="Mettre en pause l'exécution"
            >
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>PAUSE</span>
            </button>

            <button
              id="vm-step-btn"
              onClick={() => {
                op1Vm.pause();
                op1Vm.step();
                addTerminalLog('cpu', `Instruction pas-à-pas exécutée. PC=0x${op1Vm.cpu.regs.pc.toString(16).toUpperCase()}`);
              }}
              className="px-3 py-1.5 rounded-xl bg-[#232938] hover:bg-[#2e374a] text-sky-300 border border-sky-500/40 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
              title="Exécuter une seule instruction (Single Step)"
            >
              <StepForward className="w-3.5 h-3.5" />
              <span>STEP</span>
            </button>

            <button
              id="vm-stepover-btn"
              onClick={() => {
                op1Vm.stepOver();
                addTerminalLog('cpu', 'Step Over subroutine.');
              }}
              className="px-3 py-1.5 rounded-xl bg-[#232938] hover:bg-[#2e374a] text-purple-300 border border-purple-500/40 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
              title="Passer par-dessus la sous-routine (Step Over)"
            >
              <SkipForward className="w-3.5 h-3.5" />
              <span>STEP OVER</span>
            </button>

            <button
              id="vm-reset-btn"
              onClick={() => {
                op1Vm.stop();
                refreshMemoryView(op1Vm.cpu.regs.pc);
                addTerminalLog('cpu', 'CPU réinitialisé au vecteur de reset.');
              }}
              className="px-3 py-1.5 rounded-xl bg-[#232938] hover:bg-[#2e374a] text-neutral-300 border border-neutral-700 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
              title="Réinitialiser le processeur au vecteur de reset"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>RESET</span>
            </button>

            {/* Hardware Emergency Stop (E-Stop) */}
            <button
              id="vm-estop-btn"
              onClick={() => {
                op1Vm.emergencyStop();
                addTerminalLog('error', 'ARRÊT D\'URGENCE MATÉRIEL (E-STOP) ACTIVÉ !');
              }}
              className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black flex items-center gap-1.5 transition active:scale-95 shadow-lg shadow-red-900/40 cursor-pointer"
              title="ARRÊT D'URGENCE IMMÉDIAT (Emergency Stop)"
            >
              <OctagonX className="w-4 h-4 fill-current" />
              <span>E-STOP</span>
            </button>
          </div>

          {/* Quick Modals Navigation Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onOpenEngineeringLab}
              className="px-2.5 py-1.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/70 border border-purple-500/50 text-purple-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              title="Ouvrir le Laboratoire de synthèse DSP"
            >
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
              <span>DSP Lab</span>
            </button>

            <button
              onClick={onOpenFirmwareModder}
              className="px-2.5 py-1.5 rounded-xl bg-amber-950/60 hover:bg-amber-900/70 border border-amber-500/50 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              title="Ouvrir le Workshop Firmware & Patchs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Firmware Modder</span>
            </button>

            <button
              onClick={onOpenTombola}
              className="px-2.5 py-1.5 rounded-xl bg-sky-950/60 hover:bg-sky-900/70 border border-sky-500/50 text-sky-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              title="Ouvrir le Séquenceur Physique Tombola"
            >
              <Dices className="w-3.5 h-3.5 text-sky-400" />
              <span>Tombola</span>
            </button>

            <button
              onClick={onOpenDocs}
              className="px-2.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              title="Documentation technique & Guide Git"
            >
              <BookOpen className="w-3.5 h-3.5 text-neutral-400" />
              <span>Guide</span>
            </button>
          </div>
        </div>

        {/* Row 2: Official Firmware Selector, Diagnostic Fixture Selector, Upload .op1/.ldr, Speed Multiplier & Audio Master */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-neutral-800 text-xs">
          
          {/* ROM & Firmware Selectors */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Official OP-1 Firmware Selector */}
            <div className="flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-bold text-neutral-400">FIRMWARE OP-1 :</span>
              <select
                value={selectedOfficialFw}
                onChange={(e) => handleLoadOfficialFirmware(e.target.value)}
                className="px-2.5 py-1 rounded-xl bg-[#11141a] text-white border border-emerald-500/40 text-xs font-bold focus:outline-none focus:border-emerald-500 cursor-pointer"
                title="Sélectionner une version de firmware officiel OP-1"
              >
                {OFFICIAL_FIRMWARES.map((fw) => (
                  <option key={fw.id} value={fw.id}>
                    {fw.version} ({fw.fileName}) {fw.isModded ? '★ MOD' : '● STOCK'}
                  </option>
                ))}
              </select>
            </div>

            {/* Diagnostic Fixture ROM Selector */}
            <div className="flex items-center gap-1.5 ml-1">
              <span className="font-bold text-neutral-400">FIXTURE :</span>
              <select
                value={selectedFixture}
                onChange={(e) => handleLoadFixture(e.target.value as any)}
                className="px-2.5 py-1 rounded-xl bg-[#11141a] text-white border border-neutral-700 text-xs font-bold focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="alu_diagnostic">diagnostic_bf524.ldr (ALU & NOP)</option>
                <option value="teboot_vector">te-boot_vector_test.ldr (Bootloader Matrix)</option>
                <option value="sport0_audio">sport0_audio_dma_sine.ldr (Audio DMA 44.1kHz)</option>
                <option value="ppi_framebuffer">ppi_framebuffer_320x160.ldr (PPI Video DMA)</option>
              </select>
            </div>

            {/* Upload Button */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".op1,.ldr,.bin"
              onChange={(e) => {
                if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
              }}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer active:scale-95 ml-1"
              title="Charger un fichier .op1 ou .ldr externe"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Charger .op1 / .ldr</span>
            </button>
          </div>

          {/* Right Controls: Speed Multiplier & Master Volume */}
          <div className="flex items-center gap-3 flex-wrap">
            
            {/* Speed Multiplier */}
            <div className="flex items-center gap-1.5 bg-[#11141a] px-2.5 py-1 rounded-xl border border-neutral-800">
              <span className="text-[10px] text-neutral-400 font-bold">VITESSE :</span>
              {[0.25, 1.0, 2.0, 5.0].map((spd) => (
                <button
                  key={spd}
                  onClick={() => handleSpeedChange(spd)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-black cursor-pointer transition ${
                    speedMultiplier === spd
                      ? 'bg-cyan-600 text-white'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>

            {/* Master Audio Volume & Mute */}
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-[#11141a] border border-neutral-800">
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
                className="w-16 h-1.5 accent-cyan-500 bg-neutral-700 rounded-lg cursor-pointer"
              />
              <span className="text-[10px] font-mono text-neutral-300 w-6 text-right">{isMuted ? '0%' : `${masterVolume}%`}</span>
            </div>
          </div>
        </div>
      </header>

      {/* 2. REAL-TIME HARDWARE TELEMETRY RIBBON (REAL EMULATION DATA ONLY) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono">
        <div className="p-2.5 rounded-2xl bg-[#141822] border border-[#2b3345] flex flex-col">
          <span className="text-[10px] text-neutral-400 font-bold uppercase">PROGRAM COUNTER (PC)</span>
          <span className="text-cyan-400 font-black text-sm">
            0x{vmStatus.pc.toString(16).padStart(8, '0').toUpperCase()}
          </span>
        </div>

        <div className="p-2.5 rounded-2xl bg-[#141822] border border-[#2b3345] flex flex-col">
          <span className="text-[10px] text-neutral-400 font-bold uppercase">CYCLES D'HORLOGE</span>
          <span className="text-emerald-400 font-black text-sm">{vmStatus.cycles}</span>
        </div>

        <div className="p-2.5 rounded-2xl bg-[#141822] border border-[#2b3345] flex flex-col">
          <span className="text-[10px] text-neutral-400 font-bold uppercase">MIPS DÉBIT RÉEL</span>
          <span className="text-amber-400 font-black text-sm">{vmStatus.mips} MIPS</span>
        </div>

        <div className="p-2.5 rounded-2xl bg-[#141822] border border-[#2b3345] flex flex-col">
          <span className="text-[10px] text-neutral-400 font-bold uppercase">CHARGE DSP CORE</span>
          <span className="text-purple-400 font-black text-sm">{vmStatus.cpuLoadPercent}%</span>
        </div>

        <div className="p-2.5 rounded-2xl bg-[#141822] border border-[#2b3345] flex flex-col">
          <span className="text-[10px] text-neutral-400 font-bold uppercase">FIRMWARE ACTIF</span>
          <span className="text-white font-bold truncate">{vmStatus.loadedFirmwareName}</span>
        </div>
      </div>

      {/* 3. MAIN HARDWARE WORKBENCH: 320x160 OLED SCREEN + 4 ENCODERS + KEYBOARD DIRECTLY UNDERNEATH */}
      <main className="w-full rounded-3xl bg-[#141822] border-2 border-[#2b3345] p-4 sm:p-6 shadow-2xl flex flex-col gap-4">
        
        {/* TOP SECTION: 320x160 TRUE HARDWARE OLED DISPLAY & 4 ROTARY ENCODERS */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          
          {/* Left Column: Framebuffer & Hardware Display Info */}
          <div className="lg:col-span-3 flex flex-col justify-between gap-3">
            <div className="p-3.5 rounded-2xl bg-[#10141d] border border-neutral-800 flex flex-col gap-2">
              <span className="text-xs font-black text-cyan-400 uppercase flex items-center gap-1.5">
                <Tv className="w-4 h-4 text-cyan-400" />
                <span>AFFICHAGE MATÉRIEL OLED</span>
              </span>
              <div className="space-y-1 text-[11px] font-mono text-neutral-400">
                <div className="flex justify-between">
                  <span>Résolution :</span>
                  <strong className="text-white">320 × 160 px</strong>
                </div>
                <div className="flex justify-between">
                  <span>Format pixels :</span>
                  <strong className="text-white">RGB565 / RGBA</strong>
                </div>
                <div className="flex justify-between">
                  <span>Buffer PPI Base :</span>
                  <strong className="text-cyan-300">0x00010000</strong>
                </div>
                <div className="flex justify-between">
                  <span>Taux de rafraîchissement :</span>
                  <strong className="text-emerald-400">{fpsCounter} FPS</strong>
                </div>
                <div className="flex justify-between">
                  <span>Frames rafraîchies :</span>
                  <strong className="text-amber-400">{frameRefreshCount}</strong>
                </div>
              </div>
            </div>

            {/* Direct PPI Memory Force Trigger */}
            <div className="p-3 rounded-2xl bg-[#10141d] border border-neutral-800 flex flex-col gap-2">
              <button
                onClick={() => {
                  op1Vm.peripherals.renderPpiFrame();
                  addTerminalLog('mmio', 'PPI Frame Render forcé depuis la mémoire SDRAM 0x00010000.');
                }}
                className="w-full py-2 px-3 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Scanner PPI Buffer</span>
              </button>
            </div>
          </div>

          {/* Center Column: True 320x160 Native OLED Display Canvas (Direct Memory Buffer) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center">
            <div className="w-full max-w-[380px] aspect-[2/1] rounded-2xl bg-black border-4 border-[#2b3345] shadow-2xl p-1 relative overflow-hidden flex items-center justify-center">
              <canvas
                ref={canvasRef}
                width={320}
                height={160}
                className={`w-full h-full object-contain ${isCrtGlow ? 'brightness-105 contrast-110 drop-shadow-[0_0_8px_rgba(56,189,248,0.25)]' : ''}`}
                style={{ imageRendering: 'pixelated' }}
              />

              {/* Scanline CRT overlay toggle */}
              <button
                onClick={() => setIsCrtGlow(!isCrtGlow)}
                className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/70 hover:bg-black/90 text-[9px] font-mono text-neutral-400 border border-neutral-700 cursor-pointer"
                title="Activer/Désactiver le filtre CRT"
              >
                {isCrtGlow ? 'CRT GLOW ON' : 'RAW MATRIX'}
              </button>
            </div>
          </div>

          {/* Right Column: 4 Optical Rotary Encoders (MMIO Injectors) */}
          <div className="lg:col-span-4 p-3.5 rounded-2xl bg-[#10141d] border border-neutral-800 flex flex-col gap-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-neutral-400">
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span>ENCODEURS OPTIQUES (MMR 0xFFC01508)</span>
              </span>
              <span className="text-[10px] text-cyan-400 font-mono">IVG9 IRQ</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 pt-1">
              <KnobControl
                color="blue"
                label="Param 1"
                value={synthParams.blue}
                onChange={(val) => {
                  setSynthParams(p => ({ ...p, blue: val }));
                  op1Vm.peripherals.setEncoderValue('blue', val);
                }}
              />
              <KnobControl
                color="green"
                label="Param 2"
                value={synthParams.green}
                onChange={(val) => {
                  setSynthParams(p => ({ ...p, green: val }));
                  op1Vm.peripherals.setEncoderValue('green', val);
                }}
              />
              <KnobControl
                color="white"
                label="Param 3"
                value={synthParams.white}
                onChange={(val) => {
                  setSynthParams(p => ({ ...p, white: val }));
                  op1Vm.peripherals.setEncoderValue('white', val);
                }}
              />
              <KnobControl
                color="orange"
                label="Param 4"
                value={synthParams.orange}
                onChange={(val) => {
                  setSynthParams(p => ({ ...p, orange: val }));
                  op1Vm.peripherals.setEncoderValue('orange', val);
                }}
              />
            </div>
          </div>
        </section>

        {/* BOTTOM WORKBENCH SECTION: WEB MIDI CONTROLLER BAR & 24-KEY PHYSICAL KEYBED DIRECTLY UNDER DISPLAY */}
        <section className="pt-2 border-t border-neutral-800 flex flex-col gap-3">
          
          {/* 1. Web MIDI Controller Bar with Device Detection, Pitch Bend, Octave & Learn */}
          <MidiControllerBar
            onNoteTrigger={(note) => handleNoteOn(note, 100)}
            onKnobChange={(color, val) => {
              setSynthParams(p => ({ ...p, [color]: val }));
              op1Vm.peripherals.setEncoderValue(color, val);
            }}
          />

          {/* 2. Full 24-Key Physical & Virtual Keyboard linked directly to Blackfin MMIO matrix + Audio */}
          <div className="p-3 rounded-2xl bg-[#10141d] border border-neutral-800 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-bold text-neutral-400 px-1">
              <span className="flex items-center gap-2">
                <Music className="w-4 h-4 text-emerald-400" />
                <span>CLAVIER PHYSIQUE 24 TOUCHES • INJECTION MATRICE MMIO DIRECTE</span>
              </span>
              <span className="text-[11px] text-neutral-500 hidden sm:block">
                Clavier PC : [A-J] (Blanches) & [W, E, R, Y, U] (Noires) • Octave F{octave} - E{octave + 2}
              </span>
            </div>

            <Keyboard
              onNoteOn={handleNoteOn}
              onNoteOff={handleNoteOff}
              activeNotes={activeMidiNotes}
              octave={octave}
              onOctaveChange={setOctave}
              onPitchBend={(semitones) => audioEngine.setPitchBend(semitones)}
              onKeyMatrixChange={(keyIndex, pressed) => {
                op1Vm.peripherals.setKey(keyIndex, pressed);
                addTerminalLog('ivg', `Key Matrix Event: Key #${keyIndex} ${pressed ? 'PRESSED' : 'RELEASED'} -> IVG9 triggered.`);
              }}
            />
          </div>
        </section>
      </main>

      {/* 4. MULTI-TAB ENGINEERING & DIAGNOSTIC PANEL (CPU REGISTERS, DISASSEMBLER, MEMORY HEX, LDR BLOCKS, LOGS) */}
      <section className="rounded-3xl bg-[#141822] border-2 border-[#2b3345] p-4 sm:p-5 shadow-2xl flex flex-col gap-3">
        
        {/* Navigation Tabs Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setActiveTab('disasm')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'disasm'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'bg-[#10141d] text-neutral-400 hover:text-white'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Désassembleur Live</span>
            </button>

            <button
              onClick={() => setActiveTab('memory')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'memory'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'bg-[#10141d] text-neutral-400 hover:text-white'
              }`}
            >
              <Binary className="w-3.5 h-3.5" />
              <span>Inspecteur Mémoire & MMR</span>
            </button>

            <button
              onClick={() => setActiveTab('ldr_blocks')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'ldr_blocks'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'bg-[#10141d] text-neutral-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Blocs LDR & Validateur .OP1</span>
            </button>

            <button
              onClick={() => setActiveTab('terminal')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'terminal'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'bg-[#10141d] text-neutral-400 hover:text-white'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Trace MMIO & Logs ({terminalLogs.length})</span>
            </button>
          </div>

          <div className="text-[11px] font-mono text-neutral-400">
            Core Target: <strong className="text-cyan-300">ADSP-BF524C2</strong> @ 400 MHz
          </div>
        </div>

        {/* Tab 1: Live CPU Registers + Disassembler Split View */}
        {activeTab === 'disasm' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* Sub-Column 1: Complete CPU Registers (R0-R7, P0-P5, SP, FP, ASTAT, A0, A1) */}
            <div className="lg:col-span-5 bg-[#10141d] border border-neutral-800 rounded-2xl p-3.5 flex flex-col gap-3 font-mono text-xs">
              
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                <span className="text-xs font-black text-cyan-400 uppercase flex items-center gap-1.5">
                  <Binary className="w-3.5 h-3.5" />
                  <span>REGISTRES CPU (ADSP-BF524)</span>
                </span>
                <span className="text-[10px] text-neutral-500">32-Bit Dual-MAC</span>
              </div>

              {regs && (
                <div className="flex flex-col gap-3">
                  {/* Data Registers R0-R7 */}
                  <div>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase">Data Registers (R0 - R7)</span>
                    <div className="grid grid-cols-2 gap-1.5 mt-1">
                      {Array.from(regs.r).map((val, idx) => (
                        <div key={idx} className="p-1.5 rounded-lg bg-[#181d28] border border-neutral-800 flex justify-between items-center">
                          <span className="text-neutral-400 font-bold">R{idx}</span>
                          <span className="text-cyan-300 font-mono">0x{val.toString(16).padStart(8, '0').toUpperCase()}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pointer Registers P0-P5, FP, SP */}
                  <div>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase">Pointer Registers (P0 - P5, FP, SP)</span>
                    <div className="grid grid-cols-2 gap-1.5 mt-1">
                      {Array.from(regs.p).map((val, idx) => (
                        <div key={idx} className="p-1.5 rounded-lg bg-[#181d28] border border-neutral-800 flex justify-between items-center">
                          <span className="text-neutral-400 font-bold">P{idx}</span>
                          <span className="text-emerald-300 font-mono">0x{val.toString(16).padStart(8, '0').toUpperCase()}</span>
                        </div>
                      ))}
                      <div className="p-1.5 rounded-lg bg-[#181d28] border border-neutral-800 flex justify-between items-center">
                        <span className="text-neutral-400 font-bold">FP</span>
                        <span className="text-amber-300 font-mono">0x{regs.fp.toString(16).padStart(8, '0').toUpperCase()}</span>
                      </div>
                      <div className="p-1.5 rounded-lg bg-[#181d28] border border-neutral-800 flex justify-between items-center">
                        <span className="text-neutral-400 font-bold">SP</span>
                        <span className="text-amber-300 font-mono">0x{regs.sp.toString(16).padStart(8, '0').toUpperCase()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Arithmetic Status Flags ASTAT */}
                  <div>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase">Arithmetic Flags (ASTAT)</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {[
                        { name: 'AZ (Zero)', active: regs.astat.az },
                        { name: 'AN (Neg)', active: regs.astat.an },
                        { name: 'AC (Carry)', active: regs.astat.ac },
                        { name: 'AV0 (Ovf)', active: regs.astat.av0 },
                        { name: 'CC (Cond)', active: regs.astat.cc },
                        { name: 'AQ (Quot)', active: regs.astat.aq },
                      ].map((f) => (
                        <span
                          key={f.name}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            f.active 
                              ? 'bg-emerald-900/80 text-emerald-300 border border-emerald-500/50' 
                              : 'bg-[#181d28] text-neutral-600 border border-neutral-800'
                          }`}
                        >
                          {f.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Accumulators A0, A1 */}
                  <div>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase">Accumulateurs 40-Bit (A0, A1)</span>
                    <div className="grid grid-cols-2 gap-1.5 mt-1">
                      <div className="p-1.5 rounded-lg bg-[#181d28] border border-neutral-800 flex justify-between">
                        <span className="text-neutral-400">A0</span>
                        <span className="text-orange-300 font-mono">0x{regs.a0.toString(16).toUpperCase()}</span>
                      </div>
                      <div className="p-1.5 rounded-lg bg-[#181d28] border border-neutral-800 flex justify-between">
                        <span className="text-neutral-400">A1</span>
                        <span className="text-orange-300 font-mono">0x{regs.a1.toString(16).toUpperCase()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sub-Column 2: Live Disassembler Stream */}
            <div className="lg:col-span-7 bg-[#10141d] border border-neutral-800 rounded-2xl p-3.5 flex flex-col gap-2 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                <span className="text-xs font-black text-cyan-400 uppercase flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5" />
                  <span>FLUX D'INSTRUCTIONS ASSEMBLEUR</span>
                </span>
                <span className="text-[10px] text-neutral-400">PC = 0x{vmStatus.pc.toString(16).padStart(8, '0').toUpperCase()}</span>
              </div>

              <div className="flex-1 max-h-[360px] overflow-y-auto flex flex-col gap-1 pr-1">
                {disasmList.map((inst, idx) => {
                  const isCurrentPc = inst.address === vmStatus.pc;
                  return (
                    <div
                      key={idx}
                      className={`p-2 rounded-xl border flex items-center justify-between text-xs transition ${
                        isCurrentPc
                          ? 'bg-cyan-950/80 border-cyan-400 text-white font-bold shadow-md shadow-cyan-950/50'
                          : 'bg-[#181d28] border-neutral-800 text-neutral-300 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] ${isCurrentPc ? 'text-cyan-300' : 'text-neutral-500'}`}>
                          0x{inst.address.toString(16).padStart(8, '0').toUpperCase()}
                        </span>
                        <span className="text-neutral-400 text-[10px] w-20">
                          {inst.hex}
                        </span>
                        <span className={isCurrentPc ? 'text-cyan-200' : 'text-emerald-400'}>
                          {inst.mnemonic}
                        </span>
                      </div>
                      {isCurrentPc && (
                        <span className="px-2 py-0.5 rounded bg-cyan-500 text-neutral-950 text-[9px] font-black uppercase">
                          PC ACTUEL
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Memory & MMR Hex Inspector */}
        {activeTab === 'memory' && (
          <div className="flex flex-col gap-3 font-mono text-xs">
            
            {/* Quick Memory Space Shortcuts */}
            <div className="flex items-center gap-2 flex-wrap pb-2 border-b border-neutral-800">
              <span className="text-[11px] font-bold text-neutral-400">ESPACES MÉMOIRE BF524 :</span>
              {[
                { label: 'SDRAM (0x00001000)', addr: '0x00001000' },
                { label: 'PPI Framebuffer (0x00010000)', addr: '0x00010000' },
                { label: 'L1 Data A (0xFF800000)', addr: '0xFF800000' },
                { label: 'L1 Data B (0xFF900000)', addr: '0xFF900000' },
                { label: 'L1 Instruction (0xFFA00000)', addr: '0xFFA00000' },
                { label: 'MMRs Système (0xFFC00000)', addr: '0xFFC00000' },
              ].map((m) => (
                <button
                  key={m.label}
                  onClick={() => handleMemJump(m.addr)}
                  className="px-2.5 py-1 rounded-lg bg-[#181d28] hover:bg-[#232938] text-neutral-300 text-[10px] font-bold border border-neutral-800 transition cursor-pointer"
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Jump Input */}
            <div className="flex items-center gap-2">
              <span className="text-neutral-400">Adresse Hex :</span>
              <input
                type="text"
                value={memBaseAddr}
                onChange={(e) => setMemBaseAddr(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleMemJump(memBaseAddr);
                }}
                className="px-2.5 py-1 rounded-lg bg-[#181d28] border border-neutral-700 text-cyan-300 text-xs w-32 focus:outline-none focus:border-cyan-500 font-mono"
              />
              <button
                onClick={() => handleMemJump(memBaseAddr)}
                className="px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition cursor-pointer"
              >
                Inspecter
              </button>
            </div>

            {/* Memory Hex Table */}
            <div className="max-h-[360px] overflow-y-auto bg-[#10141d] rounded-2xl p-3 border border-neutral-800">
              <div className="grid grid-cols-12 gap-1 text-[11px] pb-2 border-b border-neutral-800 font-bold text-neutral-400">
                <span className="col-span-2">ADRESSE</span>
                <span className="col-span-7">OCTETS BRUTS (HEX)</span>
                <span className="col-span-3">ASCII</span>
              </div>
              <div className="divide-y divide-neutral-900/60 pt-1">
                {memRows.map((row) => (
                  <div key={row.address} className="grid grid-cols-12 gap-1 py-1 text-xs hover:bg-[#181d28]">
                    <span className="col-span-2 text-cyan-400 font-bold">
                      0x{row.address.toString(16).padStart(8, '0').toUpperCase()}
                    </span>
                    <span className="col-span-7 text-neutral-300 tracking-wider">
                      {row.bytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')}
                    </span>
                    <span className="col-span-3 text-emerald-400 truncate">
                      {row.ascii}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: LDR Blocks & .OP1 Container Validator */}
        {activeTab === 'ldr_blocks' && (
          <div className="flex flex-col gap-3 font-mono text-xs">
            <div className="p-3 bg-[#10141d] border border-neutral-800 rounded-2xl flex flex-col gap-2">
              <span className="text-xs font-black text-cyan-400 uppercase flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span>STRUCTURE DU CHARGEMENT LDR (ADI BF52x BOOT HEADERS)</span>
              </span>
              <p className="text-[11px] text-neutral-400">
                En-tête ADI 16 octets dans l'ordre strict : <code className="text-cyan-300">dBlockCode</code>, <code className="text-cyan-300">pTargetAddress</code>, <code className="text-cyan-300">dByteCount</code>, <code className="text-cyan-300">dArgument</code>.
              </p>
            </div>

            {analysisReport ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2.5 rounded-xl bg-[#10141d] border border-neutral-800">
                    <span className="text-[10px] text-neutral-400">FORMAT :</span>
                    <p className="font-bold text-cyan-400">{analysisReport.format}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#10141d] border border-neutral-800">
                    <span className="text-[10px] text-neutral-400">TAILLE TOTALE :</span>
                    <p className="font-bold text-emerald-400">{analysisReport.totalSize} octets</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#10141d] border border-neutral-800">
                    <span className="text-[10px] text-neutral-400">CRC32 :</span>
                    <p className="font-bold text-amber-400">0x{analysisReport.crc32}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#10141d] border border-neutral-800">
                    <span className="text-[10px] text-neutral-400">NOMBRE DE BLOCS :</span>
                    <p className="font-bold text-purple-400">{analysisReport.blocks.length}</p>
                  </div>
                </div>

                <div className="max-h-[300px] overflow-y-auto bg-[#10141d] rounded-2xl p-3 border border-neutral-800">
                  <div className="grid grid-cols-12 gap-1 text-[10px] font-bold text-neutral-400 border-b border-neutral-800 pb-2">
                    <span className="col-span-1">#</span>
                    <span className="col-span-3">FLAGS / TYPE</span>
                    <span className="col-span-3">TARGET ADDR</span>
                    <span className="col-span-2">TAILLE</span>
                    <span className="col-span-3">ARGUMENT</span>
                  </div>
                  <div className="divide-y divide-neutral-900 pt-1">
                    {analysisReport.blocks.map((blk, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-1 py-1.5 text-xs hover:bg-[#181d28]">
                        <span className="col-span-1 text-neutral-500 font-bold">{idx + 1}</span>
                        <span className="col-span-3 text-cyan-300 font-bold">
                          0x{blk.header.blockCode.toString(16).toUpperCase()} {blk.header.isFinal ? '(FINAL)' : ''}
                        </span>
                        <span className="col-span-3 text-emerald-400 font-mono">
                          0x{blk.header.targetAddress.toString(16).padStart(8, '0').toUpperCase()}
                        </span>
                        <span className="col-span-2 text-neutral-300">{blk.header.byteCount} B</span>
                        <span className="col-span-3 text-amber-400 font-mono">0x{blk.header.argument.toString(16).toUpperCase()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-[#10141d] border border-neutral-800 text-center text-neutral-400">
                <p>Aucun fichier analysé pour le moment. Chargez un fichier .op1 ou .ldr via le bouton d'import ci-dessus.</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: MMIO Traces & Interrupt Logs */}
        {activeTab === 'terminal' && (
          <div className="flex flex-col gap-2 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-neutral-400">JOURNAL DES ACCÈS MMIO ET INTERRUPTIONS (IVG9, IVG10, IVG11)</span>
              <button
                onClick={() => setTerminalLogs([])}
                className="px-2.5 py-1 rounded bg-[#181d28] hover:bg-[#232938] text-neutral-400 hover:text-white transition cursor-pointer"
              >
                Effacer logs
              </button>
            </div>

            <div className="max-h-[360px] overflow-y-auto bg-[#0a0d14] rounded-2xl p-3 border border-neutral-800 flex flex-col gap-1.5">
              {terminalLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-2.5 text-xs">
                  <span className="text-neutral-500 shrink-0">{log.time}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase shrink-0 ${
                    log.type === 'error'
                      ? 'bg-red-950 text-red-300 border border-red-800'
                      : log.type === 'mmio'
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                      : log.type === 'ivg'
                      ? 'bg-purple-950 text-purple-300 border border-purple-800'
                      : log.type === 'cpu'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-neutral-800 text-neutral-400'
                  }`}>
                    {log.type}
                  </span>
                  <span className="text-neutral-200 break-all">{log.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </section>
    </div>
  );
};
