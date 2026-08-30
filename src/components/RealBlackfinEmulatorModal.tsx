// ============================================================================
// OP-1 BLACKFIN ADSP-BF533 HARDWARE EMULATOR & REVERSE-ENGINEERING COCKPIT
// Native binary execution, cycle-accurate stepping, LDR loader, register viewer
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { 
  op1Vm, 
  VmStatus 
} from '../emulator/op1VirtualMachine';
import { CpuRegisters } from '../emulator/blackfinCpu';
import { DisassembledInstruction } from '../emulator/disassembler';
import { LdrParser } from '../emulator/ldrParser';
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
  Radio, 
  Upload, 
  Download, 
  Check, 
  AlertTriangle, 
  Terminal, 
  Search, 
  X, 
  Zap, 
  Maximize2,
  HardDrive,
  Sliders
} from 'lucide-react';
import { KnobControl } from './KnobControl';

interface RealBlackfinEmulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RealBlackfinEmulatorModal: React.FC<RealBlackfinEmulatorModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [vmStatus, setVmStatus] = useState<VmStatus>({
    isRunning: false,
    isPaused: false,
    isBooted: false,
    loadedFirmwareName: 'op1_factory_243.op1',
    firmwareCrc32: '8B39DF12',
    totalLoadedBytes: 65536,
    entryPoint: 0x00001000,
    pc: 0x00001000,
    cycles: '0',
    instructions: '0',
    mips: 0,
    cpuLoadPercent: 0,
    coreTempC: 38,
    executionError: null,
  });

  const [regs, setRegs] = useState<CpuRegisters | null>(null);
  const [disasmList, setDisasmList] = useState<DisassembledInstruction[]>([]);
  const [activeTab, setActiveTab] = useState<'disasm' | 'memory' | 'ldr_blocks' | 'audio_dma'>('disasm');
  const [memBaseAddr, setMemBaseAddr] = useState<string>('0x00001000');
  const [memRows, setMemRows] = useState<{ address: number; bytes: number[]; ascii: string }[]>([]);
  const [selectedFirmwareVer, setSelectedFirmwareVer] = useState<string>('243');
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [encoderValues, setEncoderValues] = useState({
    blue: 50,
    green: 50,
    white: 50,
    orange: 50
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Subscribe to VM updates
  useEffect(() => {
    op1Vm.onStateChange = (status) => setVmStatus(status);
    op1Vm.onRegisterUpdate = (r) => setRegs({ ...r });
    op1Vm.onDisassemblyUpdate = (d) => setDisasmList([...d]);

    op1Vm.peripherals.onDisplayRefresh = (imgData) => {
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) ctx.putImageData(imgData, 0, 0);
      }
    };

    // Initial state
    setRegs({ ...op1Vm.cpu.regs });
    setDisasmList(op1Vm.getDisassemblyAroundPc(24));
    refreshMemoryView(0x00001000);

    return () => {
      // Clean up VM listeners on unmount
    };
  }, [isOpen]);

  const refreshMemoryView = (addr: number) => {
    const rows = op1Vm.readMemoryBlock(addr, 256);
    setMemRows(rows);
  };

  const handleMemJump = (hexStr: string) => {
    let addr = parseInt(hexStr.replace('0x', ''), 16);
    if (!isNaN(addr)) {
      setMemBaseAddr('0x' + addr.toString(16).toUpperCase());
      refreshMemoryView(addr);
    }
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result instanceof ArrayBuffer) {
        const bytes = new Uint8Array(e.target.result);
        const success = op1Vm.loadFirmwareBinary(bytes, file.name);
        if (success) {
          refreshMemoryView(op1Vm.cpu.regs.pc);
        }
      }
    };
    reader.readAsArrayBuffer(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-7xl h-[92vh] bg-[#12151c] text-neutral-100 border-2 border-[#2d3444] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* TOP BAR: HARDWARE COCKPIT CONTROLS & STATUS */}
        <header className="p-4 bg-[#181c25] border-b border-neutral-800 flex flex-wrap items-center justify-between gap-3">
          
          {/* Logo & Core Status */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-cyan-950/70 border border-cyan-500/50 text-cyan-400">
              <Cpu className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-sm tracking-wider text-white">
                  ÉMULATEUR MATÉRIEL BLACKFIN ADSP-BF533
                </h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
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
                Exécution native du binaire de firmware OP-1 • Dual-MAC 16/32-bit RISC DSP
              </p>
            </div>
          </div>

          {/* Real Execution Controls (Run, Pause, Step Into, Step Over, Reset, E-Stop) */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              id="vm-run-btn"
              onClick={() => op1Vm.start()}
              disabled={vmStatus.isRunning}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-black flex items-center gap-1.5 transition active:scale-95 shadow-md cursor-pointer"
              title="Démarrer l'exécution en temps réel à 400 MHz"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>RUN</span>
            </button>

            <button
              id="vm-pause-btn"
              onClick={() => op1Vm.pause()}
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
              }}
              className="px-3 py-1.5 rounded-xl bg-[#252b38] hover:bg-[#31394a] text-sky-300 border border-sky-500/40 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
              title="Exécuter une seule instruction assembleur (Single Step)"
            >
              <StepForward className="w-3.5 h-3.5" />
              <span>STEP</span>
            </button>

            <button
              id="vm-stepover-btn"
              onClick={() => op1Vm.stepOver()}
              className="px-3 py-1.5 rounded-xl bg-[#252b38] hover:bg-[#31394a] text-purple-300 border border-purple-500/40 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
              title="Passer par-dessus la sous-routine (Step Over)"
            >
              <SkipForward className="w-3.5 h-3.5" />
              <span>STEP OVER</span>
            </button>

            <button
              id="vm-reset-btn"
              onClick={() => op1Vm.stop()}
              className="px-3 py-1.5 rounded-xl bg-[#252b38] hover:bg-[#31394a] text-neutral-300 border border-neutral-700 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
              title="Réinitialiser le processeur au vecteur de reset"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>RESET</span>
            </button>

            {/* Hardware E-Stop Button */}
            <button
              id="vm-estop-btn"
              onClick={() => op1Vm.emergencyStop()}
              className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black flex items-center gap-1.5 transition active:scale-95 shadow-lg shadow-red-900/40 cursor-pointer"
              title="ARRÊT D'URGENCE IMMÉDIAT (Emergency Stop)"
            >
              <OctagonX className="w-4 h-4 fill-current" />
              <span>E-STOP</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition ml-2 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* SUB-HEADER: TELEMETRY & HARDWARE GAUGES */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 p-3 bg-[#151922] border-b border-neutral-800/80 text-xs font-mono">
          <div className="p-2 rounded-xl bg-[#1c212c] border border-neutral-800 flex flex-col">
            <span className="text-[10px] text-neutral-400 font-bold uppercase">PROGRAM COUNTER (PC)</span>
            <span className="text-cyan-400 font-black text-sm">
              0x{vmStatus.pc.toString(16).padStart(8, '0').toUpperCase()}
            </span>
          </div>

          <div className="p-2 rounded-xl bg-[#1c212c] border border-neutral-800 flex flex-col">
            <span className="text-[10px] text-neutral-400 font-bold uppercase">CYCLES / HORLOGE</span>
            <span className="text-emerald-400 font-black text-sm">{vmStatus.cycles}</span>
          </div>

          <div className="p-2 rounded-xl bg-[#1c212c] border border-neutral-800 flex flex-col">
            <span className="text-[10px] text-neutral-400 font-bold uppercase">MIPS DÉBIT RÉEL</span>
            <span className="text-amber-400 font-black text-sm">{vmStatus.mips} MIPS</span>
          </div>

          <div className="p-2 rounded-xl bg-[#1c212c] border border-neutral-800 flex flex-col">
            <span className="text-[10px] text-neutral-400 font-bold uppercase">CHARGE DSP CORE</span>
            <span className="text-purple-400 font-black text-sm">{vmStatus.cpuLoadPercent}%</span>
          </div>

          <div className="p-2 rounded-xl bg-[#1c212c] border border-neutral-800 flex flex-col">
            <span className="text-[10px] text-neutral-400 font-bold uppercase">TEMPÉRATURE CORE</span>
            <span className="text-orange-400 font-black text-sm">{vmStatus.coreTempC} °C</span>
          </div>

          <div className="p-2 rounded-xl bg-[#1c212c] border border-neutral-800 flex flex-col">
            <span className="text-[10px] text-neutral-400 font-bold uppercase">FIRMWARE BIND</span>
            <span className="text-white font-bold truncate">{vmStatus.loadedFirmwareName}</span>
          </div>
        </div>

        {/* MAIN BODY: 3-COLUMN WORKSPACE */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 overflow-hidden min-h-0">
          
          {/* COLUMN 1: LIVE CPU REGISTERS & ARCHITECTURE (L1 / DAG / ASTAT) */}
          <div className="lg:col-span-3 bg-[#181c26] border border-neutral-800 rounded-2xl p-3 flex flex-col gap-3 overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-neutral-700/60 pb-2">
              <span className="text-xs font-black tracking-wider text-cyan-400 uppercase flex items-center gap-1.5">
                <Binary className="w-3.5 h-3.5" />
                <span>REGISTRES CPU (ADSP-BF533)</span>
              </span>
              <span className="text-[10px] font-mono text-neutral-400">32-Bit Dual-MAC</span>
            </div>

            {regs && (
              <div className="flex flex-col gap-3 text-xs font-mono">
                
                {/* Data Registers: R0 - R7 */}
                <div>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase">Data Registers (R0 - R7)</span>
                  <div className="grid grid-cols-2 gap-1.5 mt-1">
                    {Array.from(regs.r).map((val, idx) => (
                      <div key={idx} className="p-1.5 rounded-lg bg-[#11141a] border border-neutral-800 flex justify-between items-center">
                        <span className="text-neutral-400 font-bold">R{idx}</span>
                        <span className="text-cyan-300 font-mono">
                          0x{val.toString(16).padStart(8, '0').toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pointer Registers: P0 - P5, FP, SP */}
                <div>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase">Pointer Registers (P0 - P5, FP, SP)</span>
                  <div className="grid grid-cols-2 gap-1.5 mt-1">
                    {Array.from(regs.p).map((val, idx) => (
                      <div key={idx} className="p-1.5 rounded-lg bg-[#11141a] border border-neutral-800 flex justify-between items-center">
                        <span className="text-neutral-400 font-bold">P{idx}</span>
                        <span className="text-emerald-300 font-mono">
                          0x{val.toString(16).padStart(8, '0').toUpperCase()}
                        </span>
                      </div>
                    ))}
                    <div className="p-1.5 rounded-lg bg-[#11141a] border border-neutral-800 flex justify-between items-center">
                      <span className="text-neutral-400 font-bold">FP</span>
                      <span className="text-amber-300 font-mono">
                        0x{regs.fp.toString(16).padStart(8, '0').toUpperCase()}
                      </span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-[#11141a] border border-neutral-800 flex justify-between items-center">
                      <span className="text-neutral-400 font-bold">SP</span>
                      <span className="text-amber-300 font-mono">
                        0x{regs.sp.toString(16).padStart(8, '0').toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Control & Return Registers */}
                <div>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase">Flow & Loop Counters</span>
                  <div className="grid grid-cols-2 gap-1.5 mt-1">
                    <div className="p-1.5 rounded-lg bg-[#11141a] border border-neutral-800 flex justify-between items-center">
                      <span className="text-neutral-400 font-bold">RETS</span>
                      <span className="text-purple-300 font-mono">0x{regs.rets.toString(16).toUpperCase()}</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-[#11141a] border border-neutral-800 flex justify-between items-center">
                      <span className="text-neutral-400 font-bold">RETI</span>
                      <span className="text-purple-300 font-mono">0x{regs.reti.toString(16).toUpperCase()}</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-[#11141a] border border-neutral-800 flex justify-between items-center">
                      <span className="text-neutral-400 font-bold">LC0</span>
                      <span className="text-sky-300 font-mono">{regs.lc0}</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-[#11141a] border border-neutral-800 flex justify-between items-center">
                      <span className="text-neutral-400 font-bold">LC1</span>
                      <span className="text-sky-300 font-mono">{regs.lc1}</span>
                    </div>
                  </div>
                </div>

                {/* Arithmetic Status Flags (ASTAT) */}
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
                            : 'bg-[#11141a] text-neutral-600 border border-neutral-800'
                        }`}
                      >
                        {f.name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 40-bit Accumulators */}
                <div>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase">Accumulateurs 40-Bit (A0, A1)</span>
                  <div className="flex flex-col gap-1 mt-1">
                    <div className="p-1.5 rounded-lg bg-[#11141a] border border-neutral-800 flex justify-between">
                      <span className="text-neutral-400">A0</span>
                      <span className="text-orange-300 font-mono">0x{regs.a0.toString(16).toUpperCase()}</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-[#11141a] border border-neutral-800 flex justify-between">
                      <span className="text-neutral-400">A1</span>
                      <span className="text-orange-300 font-mono">0x{regs.a1.toString(16).toUpperCase()}</span>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* COLUMN 2: LIVE OLED PPI FRAMEBUFFER & INTERACTIVE FIRMWARE LOADER */}
          <div className="lg:col-span-5 flex flex-col gap-3 min-h-0">
            
            {/* PPI DMA OLED Framebuffer Screen */}
            <div className="bg-[#181c26] border border-neutral-800 rounded-2xl p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black tracking-wider text-white uppercase flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-orange-400" />
                  <span>FRAMEBUFFER PPI DIRECT (SSD1351 OLED 320x240)</span>
                </span>
                <span className="text-[10px] text-neutral-400 font-mono">DMA0 Stream • 60 FPS</span>
              </div>

              {/* OLED Canvas Container */}
              <div className="w-full aspect-[4/3] rounded-xl bg-black border-2 border-neutral-800 shadow-inner flex items-center justify-center overflow-hidden relative">
                <canvas
                  ref={canvasRef}
                  width={320}
                  height={240}
                  className="w-full h-full object-contain"
                />
                {!vmStatus.isRunning && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2 text-center p-4">
                    <span className="text-xs font-bold text-white bg-neutral-900/90 px-3 py-1 rounded-lg border border-neutral-700 shadow-md">
                      Moteur en pause • Cliquez sur RUN pour exécuter
                    </span>
                  </div>
                )}
              </div>

              {/* 4 Physical Progressive Hardware Encoders (MMIO Injectors) */}
              <div className="p-2.5 rounded-xl bg-[#12151c] border border-neutral-800 flex flex-col gap-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-neutral-400">
                  <span className="flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                    <span>ENCODEURS OPTIQUES MATÉRIELS (INJECTION MMIO DIRECTE)</span>
                  </span>
                  <span className="text-[10px] text-cyan-400 font-mono">IVG9 Interrupt Matrix</span>
                </div>
                <div className="grid grid-cols-4 gap-2 pt-1">
                  <KnobControl
                    color="blue"
                    label="Param 1"
                    value={encoderValues.blue}
                    onChange={(val) => {
                      setEncoderValues(prev => ({ ...prev, blue: val }));
                      op1Vm.peripherals.setEncoderValue('blue', val);
                    }}
                  />
                  <KnobControl
                    color="green"
                    label="Param 2"
                    value={encoderValues.green}
                    onChange={(val) => {
                      setEncoderValues(prev => ({ ...prev, green: val }));
                      op1Vm.peripherals.setEncoderValue('green', val);
                    }}
                  />
                  <KnobControl
                    color="white"
                    label="Param 3"
                    value={encoderValues.white}
                    onChange={(val) => {
                      setEncoderValues(prev => ({ ...prev, white: val }));
                      op1Vm.peripherals.setEncoderValue('white', val);
                    }}
                  />
                  <KnobControl
                    color="orange"
                    label="Param 4"
                    value={encoderValues.orange}
                    onChange={(val) => {
                      setEncoderValues(prev => ({ ...prev, orange: val }));
                      op1Vm.peripherals.setEncoderValue('orange', val);
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Quick Firmware Binary Selector & Drag & Drop Loader */}
            <div 
              onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
              onDragLeave={() => setIsDraggingFile(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingFile(false);
                if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
              }}
              className={`p-3 rounded-2xl border transition flex flex-col gap-2 ${
                isDraggingFile
                  ? 'bg-cyan-950/40 border-cyan-400'
                  : 'bg-[#181c26] border-neutral-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                  <span>CHARGER UN BINAIRE DE FIRMWARE OP-1 (.OP1 / .LDR)</span>
                </span>
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
                  className="px-2.5 py-1 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-800 text-[11px] font-bold hover:bg-cyan-900 transition cursor-pointer"
                >
                  Parcourir...
                </button>
              </div>

              {/* Factory Pre-packaged Firmware Selector */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] text-neutral-400">Firmwares Officiels :</span>
                <select
                  value={selectedFirmwareVer}
                  onChange={(e) => {
                    setSelectedFirmwareVer(e.target.value);
                    op1Vm.loadFactoryFirmware(e.target.value, false);
                  }}
                  className="flex-1 px-2.5 py-1 rounded-xl bg-[#11141a] text-white border border-neutral-700 text-xs font-bold focus:outline-none cursor-pointer"
                >
                  <option value="243">op1_factory_243.op1 (Dernier Officiel)</option>
                  <option value="242">op1_factory_242.op1 (Version Stable)</option>
                  <option value="235">op1_factory_235.op1 (Support Arpège)</option>
                  <option value="218">op1_factory_218.op1 (Legacy)</option>
                </select>
                <button
                  onClick={() => op1Vm.loadFactoryFirmware(selectedFirmwareVer, true)}
                  className="px-2.5 py-1 rounded-xl bg-orange-950 text-orange-300 border border-orange-800 text-[11px] font-bold hover:bg-orange-900 transition cursor-pointer"
                  title="Charger la version modifiée avec synthé Iter débloqué"
                >
                  + Mod Iter
                </button>
              </div>
            </div>

          </div>

          {/* COLUMN 3: DISASSEMBLY / MEMORY HEX VIEWER / LDR BLOCK INSPECTOR */}
          <div className="lg:col-span-4 bg-[#181c26] border border-neutral-800 rounded-2xl p-3 flex flex-col gap-2 overflow-hidden">
            
            {/* View Tabs */}
            <div className="flex items-center gap-1 border-b border-neutral-800 pb-2">
              <button
                onClick={() => setActiveTab('disasm')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTab === 'disasm'
                    ? 'bg-cyan-600 text-white'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
              >
                Désassembleur
              </button>
              <button
                onClick={() => setActiveTab('memory')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTab === 'memory'
                    ? 'bg-cyan-600 text-white'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
              >
                Hex Memory
              </button>
              <button
                onClick={() => setActiveTab('ldr_blocks')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTab === 'ldr_blocks'
                    ? 'bg-cyan-600 text-white'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
              >
                Blocs LDR
              </button>
            </div>

            {/* TAB 1: LIVE DISASSEMBLY STREAM */}
            {activeTab === 'disasm' && (
              <div className="flex-1 flex flex-col gap-2 overflow-hidden min-h-0">
                <div className="flex items-center justify-between text-[11px] text-neutral-400 px-1">
                  <span>Adresse / Symbole</span>
                  <span>Opcode & Mnémonique</span>
                </div>

                <div className="flex-1 bg-[#101318] border border-neutral-800/80 rounded-xl p-2 font-mono text-xs overflow-y-auto flex flex-col gap-0.5">
                  {disasmList.map((inst, i) => {
                    const isCurrent = inst.address === vmStatus.pc;
                    return (
                      <div
                        key={i}
                        className={`px-2 py-1 rounded flex items-center justify-between transition ${
                          isCurrent
                            ? 'bg-cyan-950/80 text-cyan-300 border-l-4 border-cyan-400 font-black'
                            : 'text-neutral-300 hover:bg-neutral-800/40'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => op1Vm.toggleBreakpoint(inst.address)}
                            className="w-2.5 h-2.5 rounded-full bg-neutral-700 hover:bg-red-500 cursor-pointer"
                            title="Placer un point d'arrêt (Breakpoint)"
                          />
                          <span className="text-neutral-500">
                            0x{inst.address.toString(16).padStart(8, '0').toUpperCase()}
                          </span>
                          {inst.symbol && (
                            <span className="text-amber-400 font-bold">
                              &lt;{inst.symbol}&gt;
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-neutral-600 text-[10px]">{inst.hex}</span>
                          <span className={isCurrent ? 'text-white font-bold' : 'text-cyan-200'}>
                            {inst.mnemonic}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: LIVE MEMORY HEX VIEWER */}
            {activeTab === 'memory' && (
              <div className="flex-1 flex flex-col gap-2 overflow-hidden min-h-0">
                
                {/* Address Jumper Bar */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-400 font-bold">Adresse :</span>
                  <input
                    type="text"
                    value={memBaseAddr}
                    onChange={(e) => setMemBaseAddr(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleMemJump(memBaseAddr);
                    }}
                    className="flex-1 px-2 py-1 rounded-lg bg-[#11141a] text-white border border-neutral-700 text-xs font-mono"
                    placeholder="0x00001000"
                  />
                  <button
                    onClick={() => handleMemJump(memBaseAddr)}
                    className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white transition cursor-pointer"
                  >
                    Aller
                  </button>
                </div>

                {/* Preset Address Quick Jumps */}
                <div className="flex flex-wrap gap-1 text-[10px]">
                  <button
                    onClick={() => handleMemJump('0x00001000')}
                    className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 cursor-pointer"
                  >
                    SDRAM (0x00001000)
                  </button>
                  <button
                    onClick={() => handleMemJump('0xFFA00000')}
                    className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 cursor-pointer"
                  >
                    L1 Code (0xFFA00000)
                  </button>
                  <button
                    onClick={() => handleMemJump('0xFF800000')}
                    className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 cursor-pointer"
                  >
                    L1 Data A (0xFF800000)
                  </button>
                  <button
                    onClick={() => handleMemJump('0xFFC00000')}
                    className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 cursor-pointer"
                  >
                    MMR System (0xFFC00000)
                  </button>
                </div>

                {/* Hex Stream */}
                <div className="flex-1 bg-[#101318] border border-neutral-800/80 rounded-xl p-2 font-mono text-[11px] overflow-y-auto flex flex-col gap-1">
                  {memRows.map((row, idx) => (
                    <div key={idx} className="flex items-center justify-between hover:bg-neutral-800/30 px-1 rounded">
                      <span className="text-cyan-400 font-bold">
                        0x{row.address.toString(16).padStart(8, '0').toUpperCase()}
                      </span>
                      <span className="text-neutral-300 tracking-wider">
                        {row.bytes.map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')}
                      </span>
                      <span className="text-neutral-500 font-mono border-l border-neutral-800 pl-2">
                        {row.ascii}
                      </span>
                    </div>
                  ))}
                </div>

              </div>
            )}

            {/* TAB 3: LDR BLOCK TABLE INSPECTOR */}
            {activeTab === 'ldr_blocks' && (
              <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
                <div className="text-xs text-neutral-400 font-bold">
                  Structure des Blocs LDR décompressés du binaire :
                </div>

                {op1Vm.loadedFirmware?.blocks.map((b, i) => (
                  <div key={i} className="p-2.5 rounded-xl bg-[#11141a] border border-neutral-800 flex flex-col gap-1 text-xs">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-cyan-300">Bloc #{i + 1} : {b.description}</span>
                      <span className="text-neutral-500 text-[10px]">Offset 0x{b.offset.toString(16)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-400 font-mono">
                      <span>Cible : 0x{b.header.targetAddress.toString(16).toUpperCase()}</span>
                      <span>Taille : {b.header.byteCount} octets</span>
                      <span>Flag / Arg : 0x{b.header.argument.toString(16)}</span>
                      <span>{b.header.isFinal ? '⚡ Bloc Final Boot' : 'Section Payload'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>

        </div>

        {/* FOOTER BAR: CHECKSUM & EMULATOR SIGNATURE */}
        <footer className="p-3 bg-[#181c25] border-t border-neutral-800 flex flex-wrap items-center justify-between text-xs text-neutral-400 font-mono">
          <div>
            Noyau ADSP-BF533 • DMA SPORT0 & PPI Active • CRC32 Firmware : <strong className="text-orange-400">0x{vmStatus.firmwareCrc32}</strong>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Virtual Machine Ready</span>
          </div>
        </footer>

      </div>
    </div>
  );
};
