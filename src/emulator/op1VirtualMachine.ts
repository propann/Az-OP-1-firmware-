// ============================================================================
// OP-1 ADSP-BF524 experimental execution core.
// This is intentionally not presented as a complete hardware emulator.
// ============================================================================

import { MemoryBus } from './memoryBus';
import { BlackfinCpu, CpuRegisters } from './blackfinCpu';
import { HardwarePeripherals } from './peripherals';
import { LdrParser, ParsedLdrFirmware } from './ldrParser';
import { BlackfinDisassembler, DisassembledInstruction } from './disassembler';

export interface VmStatus {
  isRunning: boolean;
  isPaused: boolean;
  isBooted: boolean;
  loadedFirmwareName: string;
  firmwareCrc32: string;
  totalLoadedBytes: number;
  entryPoint: number;
  pc: number;
  cycles: string;
  instructions: string;
  mips: number;
  cpuLoadPercent: number;
  executionError: string | null;
}

export class OP1VirtualMachine {
  public bus: MemoryBus;
  public cpu: BlackfinCpu;
  public peripherals: HardwarePeripherals;
  public disassembler: BlackfinDisassembler;

  // VM Execution State
  public isRunning: boolean = false;
  public isPaused: boolean = false;
  public isBooted: boolean = false;
  public loadedFirmware: ParsedLdrFirmware | null = null;
  public executionSpeedMultiplier: number = 1.0; // 1x = Real-Time (400MHz), 0.1x, 2x, Max

  // Animation / Run loop handle
  private animFrameId: number | null = null;
  private lastTimestamp: number = 0;
  private instructionsSinceLastCheck: bigint = 0n;
  private lastMipsCalcTime: number = 0;
  public currentMips: number = 0;
  public cpuLoad: number = 0;

  // Listeners for UI state updates
  public onStateChange?: (status: VmStatus) => void;
  public onRegisterUpdate?: (regs: CpuRegisters) => void;
  public onDisassemblyUpdate?: (instructions: DisassembledInstruction[]) => void;

  constructor() {
    this.bus = new MemoryBus();
    this.cpu = new BlackfinCpu(this.bus);
    this.peripherals = new HardwarePeripherals(this.bus, this.cpu);
    this.disassembler = new BlackfinDisassembler();

    // Load a tiny specification-shaped diagnostic LDR on startup.
    this.loadFactoryFirmware('243', false);
  }

  // Load diagnostic test fixture
  public loadDiagnosticFixture(type: 'alu_diagnostic' | 'teboot_vector' | 'sport0_audio' | 'ppi_framebuffer'): boolean {
    let rawBinary: Uint8Array;
    let name: string;
    switch (type) {
      case 'teboot_vector':
        rawBinary = LdrParser.createTeBootVectorLdr();
        name = 'te-boot_vector_test.ldr';
        break;
      case 'sport0_audio':
        rawBinary = LdrParser.createSport0AudioDmaLdr();
        name = 'sport0_audio_dma_sine.ldr';
        break;
      case 'ppi_framebuffer':
        rawBinary = LdrParser.createPpiFramebufferLdr();
        name = 'ppi_framebuffer_320x160.ldr';
        break;
      case 'alu_diagnostic':
      default:
        rawBinary = LdrParser.createDiagnosticLdr();
        name = 'diagnostic_bf524.ldr';
        break;
    }
    return this.loadFirmwareBinary(rawBinary, name);
  }

  // Backwards-compatible UI action. No proprietary factory firmware is bundled.
  public loadFactoryFirmware(version: string = '243', isModded: boolean = false): boolean {
    const rawBinary = LdrParser.createDiagnosticLdr();
    return this.loadFirmwareBinary(rawBinary, `diagnostic_bf524_${version}${isModded ? '_mod-requested' : ''}.ldr`);
  }

  // Load an uploaded or generated .op1 / .ldr firmware binary
  public loadFirmwareBinary(binary: Uint8Array, filename: string): boolean {
    this.stop();
    this.bus.reset();

    try {
      const parsed = LdrParser.parse(binary, filename);
      if (!parsed.isExecutableByExperimentalCore) {
        throw new Error(parsed.error || 'Ce fichier est analysable mais pas directement exécutable par le cœur expérimental.');
      }
      this.loadedFirmware = parsed;

      const { entryPoint } = LdrParser.loadIntoMemory(binary, this.bus, filename);
      this.cpu.reset(entryPoint);

      this.isBooted = true;
      this.notifyStateChange();
      this.notifyDisassembly();
      return true;
    } catch (err: any) {
      console.error('Failed to load firmware binary:', err);
      return false;
    }
  }

  // Start real-time hardware execution
  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isPaused = false;
    this.cpu.regs.isHalted = false;
    this.lastTimestamp = performance.now();
    this.lastMipsCalcTime = performance.now();
    this.instructionsSinceLastCheck = 0n;

    this.runLoop();
    this.notifyStateChange();
  }

  // Pause execution
  public pause() {
    this.isRunning = false;
    this.isPaused = true;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.notifyStateChange();
    this.notifyDisassembly();
  }

  // Stop and reset VM
  public stop() {
    this.isRunning = false;
    this.isPaused = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.loadedFirmware) {
      this.cpu.reset(this.loadedFirmware.entryPoint);
    }
    this.notifyStateChange();
    this.notifyDisassembly();
  }

  // Execute a single Blackfin instruction step
  public step(): number {
    const cycles = this.cpu.step();
    this.peripherals.tick(cycles);
    this.notifyStateChange();
    this.notifyDisassembly();
    return cycles;
  }

  // Step Over (skip subroutines)
  public stepOver() {
    const currentPc = this.cpu.regs.pc;
    const inst = this.disassembler.disassemble((addr) => this.bus.read16(addr), currentPc);

    if (inst.mnemonic.startsWith('CALL')) {
      const returnAddr = (currentPc + inst.size) >>> 0;
      this.bus.breakpoints.add(returnAddr);
      this.start();
    } else {
      this.step();
    }
  }

  // Hardware E-Stop (Emergency Stop)
  public emergencyStop() {
    this.pause();
    this.cpu.regs.isHalted = true;
    this.cpu.regs.interruptsEnabled = false;
    this.cpu.executionError = 'EMERGENCY STOP (E-STOP) ACTIVATED BY OPERATOR';
    this.notifyStateChange();
  }

  // Real-Time Execution Loop
  private runLoop = () => {
    if (!this.isRunning) return;

    const now = performance.now();
    const dt = Math.min((now - this.lastTimestamp) / 1000.0, 0.05); // Cap delta to 50ms
    this.lastTimestamp = now;

    // Target instructions per frame (e.g. 400 MHz * dt)
    // In JS we slice execution in bursts of 50,000 cycles for responsive UI
    const targetCycles = Math.floor(400_000_000 * dt * this.executionSpeedMultiplier);
    const sliceCycles = Math.min(targetCycles, 100_000);

    const cyclesRun = this.cpu.runCycles(sliceCycles);
    this.peripherals.tick(cyclesRun);
    this.instructionsSinceLastCheck += BigInt(cyclesRun);

    // Calculate MIPS every 250ms
    if (now - this.lastMipsCalcTime >= 250) {
      const elapsedSec = (now - this.lastMipsCalcTime) / 1000.0;
      this.currentMips = Number(this.instructionsSinceLastCheck) / (elapsedSec * 1_000_000);
      this.cpuLoad = Math.min(100, Math.round((this.currentMips / 400.0) * 100));
      this.instructionsSinceLastCheck = 0n;
      this.lastMipsCalcTime = now;
      this.notifyStateChange();
      this.notifyDisassembly();
    }

    if (!this.cpu.regs.isHalted) {
      this.animFrameId = requestAnimationFrame(this.runLoop);
    } else {
      this.pause();
    }
  };

  // Toggle a breakpoint at an address
  public toggleBreakpoint(addr: number): boolean {
    const a = addr >>> 0;
    if (this.bus.breakpoints.has(a)) {
      this.bus.breakpoints.delete(a);
      return false;
    } else {
      this.bus.breakpoints.add(a);
      return true;
    }
  }

  // Get live disassembly around PC
  public getDisassemblyAroundPc(count: number = 16): DisassembledInstruction[] {
    const pc = this.cpu.regs.pc >>> 0;
    // Step backwards a bit or start at PC
    const startAddr = Math.max(0x00001000, pc - 8);
    return this.disassembler.disassembleBlock((addr) => this.bus.read16(addr), startAddr, count);
  }

  // Read a block of memory for hex viewer
  public readMemoryBlock(startAddr: number, length: number): { address: number; bytes: number[]; ascii: string }[] {
    const rows: { address: number; bytes: number[]; ascii: string }[] = [];
    const addr = startAddr >>> 0;

    for (let i = 0; i < length; i += 16) {
      const rowAddr = (addr + i) >>> 0;
      const bytes: number[] = [];
      let ascii = '';

      for (let j = 0; j < 16; j++) {
        const b = this.bus.read8(rowAddr + j);
        bytes.push(b);
        ascii += (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.';
      }

      rows.push({ address: rowAddr, bytes, ascii });
    }

    return rows;
  }

  // State update notification
  private notifyStateChange() {
    if (!this.onStateChange) return;

    const status: VmStatus = {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      isBooted: this.isBooted,
      loadedFirmwareName: this.loadedFirmware ? this.loadedFirmware.filename : 'Aucun firmware',
      firmwareCrc32: this.loadedFirmware ? this.loadedFirmware.crc32 : '00000000',
      totalLoadedBytes: this.loadedFirmware ? this.loadedFirmware.totalSize : 0,
      entryPoint: this.loadedFirmware ? this.loadedFirmware.entryPoint : 0x00001000,
      pc: this.cpu.regs.pc,
      cycles: this.cpu.regs.cycles.toString(),
      instructions: this.cpu.regs.instructions.toString(),
      mips: Math.round(this.currentMips * 10) / 10,
      cpuLoadPercent: this.cpuLoad,
      executionError: this.cpu.executionError,
    };

    this.onStateChange(status);
    if (this.onRegisterUpdate) {
      this.onRegisterUpdate(this.cpu.regs);
    }
  }

  private notifyDisassembly() {
    if (this.onDisassemblyUpdate) {
      this.onDisassemblyUpdate(this.getDisassemblyAroundPc(20));
    }
  }
}

// Global Singleton VM Instance
export const op1Vm = new OP1VirtualMachine();
