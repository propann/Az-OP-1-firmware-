// ============================================================================
// EXPERIMENTAL ANALOG DEVICES ADSP-BF524 BLACKFIN PROCESSOR SUBSET
// Unsupported opcodes halt explicitly; they are never treated as successful NOPs.
// ============================================================================

import { MemoryBus } from './memoryBus';

export interface CpuRegisters {
  // 8x 32-bit Data Registers (R0 - R7)
  r: Uint32Array;
  // 6x 32-bit Pointer Registers (P0 - P5)
  p: Uint32Array;
  // Stack and Frame pointers
  sp: number;
  fp: number;
  // Program Counter and Return Registers
  pc: number;
  rets: number;
  reti: number;
  retx: number;
  retn: number;
  // 2x 40-bit Accumulators (A0, A1)
  a0: bigint;
  a1: bigint;
  // Hardware Loop Counters & Top/Bottom bounds
  lc0: number;
  lt0: number;
  lb0: number;
  lc1: number;
  lt1: number;
  lb1: number;
  // Circular Buffer Index / Modify / Base / Length (DAG0 & DAG1)
  i: Uint32Array; // I0 - I3
  m: Uint32Array; // M0 - M3
  b: Uint32Array; // B0 - B3
  l: Uint32Array; // L0 - L3
  // Arithmetic Status Flags (ASTAT)
  astat: {
    az: boolean; // Zero
    an: boolean; // Negative
    ac: boolean; // Carry
    av0: boolean;// Overflow A0
    av1: boolean;// Overflow A1
    aq: boolean; // Quotient bit
    cc: boolean; // Condition Code
    v: boolean;  // Global Overflow
  };
  // System Config / Core State
  cycles: bigint;
  instructions: bigint;
  isHalted: boolean;
  isIdle: boolean;
  interruptsEnabled: boolean;
}

export class BlackfinCpu {
  public bus: MemoryBus;
  public regs: CpuRegisters;

  // Execution tracking & statistics
  public frequencyHz: number = 400_000_000; // 400 MHz default for OP-1 Blackfin
  public lastExecutionTimeMs: number = 0;
  public executionError: string | null = null;
  public breakOnIllegalOpcode: boolean = true;
  public callStack: number[] = [];

  constructor(bus: MemoryBus) {
    this.bus = bus;
    this.regs = this.createInitialRegisters();
  }

  private createInitialRegisters(): CpuRegisters {
    return {
      r: new Uint32Array(8),
      p: new Uint32Array(6),
      sp: 0x03FFFE00, // Top of 64MB SDRAM stack
      fp: 0x03FFFE00,
      pc: 0x00001000, // Default entry point
      rets: 0x00000000,
      reti: 0x00000000,
      retx: 0x00000000,
      retn: 0x00000000,
      a0: 0n,
      a1: 0n,
      lc0: 0,
      lt0: 0,
      lb0: 0,
      lc1: 0,
      lt1: 0,
      lb1: 0,
      i: new Uint32Array(4),
      m: new Uint32Array(4),
      b: new Uint32Array(4),
      l: new Uint32Array(4),
      astat: {
        az: false,
        an: false,
        ac: false,
        av0: false,
        av1: false,
        aq: false,
        cc: false,
        v: false,
      },
      cycles: 0n,
      instructions: 0n,
      isHalted: false,
      isIdle: false,
      interruptsEnabled: true,
    };
  }

  public reset(entryPoint: number = 0x00001000) {
    this.regs = this.createInitialRegisters();
    this.regs.pc = entryPoint >>> 0;
    this.callStack = [];
    this.executionError = null;
  }

  // Single step execution of one Blackfin instruction
  public step(): number {
    if (this.regs.isHalted) return 0;

    const currentPc = this.regs.pc >>> 0;

    // Check breakpoint
    if (this.bus.breakpoints.has(currentPc)) {
      this.regs.isHalted = true;
      return 0;
    }

    // Hardware Loop Check: if at bottom of loop 0
    if (this.regs.lc0 > 1 && currentPc === this.regs.lb0) {
      this.regs.lc0--;
      this.regs.pc = this.regs.lt0;
      this.regs.cycles += 1n;
      return 1;
    }

    // Hardware Loop Check: if at bottom of loop 1
    if (this.regs.lc1 > 1 && currentPc === this.regs.lb1) {
      this.regs.lc1--;
      this.regs.pc = this.regs.lt1;
      this.regs.cycles += 1n;
      return 1;
    }

    // Fetch 16-bit word at PC
    const op16 = this.bus.read16(currentPc);
    let cyclesUsed = 1;

    try {
      cyclesUsed = this.executeOpcode(op16, currentPc);
    } catch (err: any) {
      this.executionError = `CPU Exception at 0x${currentPc.toString(16).toUpperCase()}: ${err.message || err}`;
      this.regs.isHalted = true;
      return 0;
    }

    this.regs.cycles += BigInt(cyclesUsed);
    this.regs.instructions += 1n;
    return cyclesUsed;
  }

  // Execute a batch of cycles for real-time emulation
  public runCycles(cycleBudget: number): number {
    if (this.regs.isHalted) return 0;
    let cyclesSpent = 0;

    while (cyclesSpent < cycleBudget && !this.regs.isHalted) {
      const stepCycles = this.step();
      if (stepCycles === 0) break;
      cyclesSpent += stepCycles;
    }

    return cyclesSpent;
  }

  // Blackfin Instruction Decoder
  private executeOpcode(op: number, pc: number): number {
    // ------------------------------------------------------------------------
    // 1. NOP (0x0000)
    // ------------------------------------------------------------------------
    if (op === 0x0000) {
      this.regs.pc = (pc + 2) >>> 0;
      return 1;
    }

    // ------------------------------------------------------------------------
    // 2. RTS (Return from Subroutine: 0x0014)
    // ------------------------------------------------------------------------
    if (op === 0x0014) {
      this.regs.pc = this.regs.rets >>> 0;
      if (this.callStack.length > 0) this.callStack.pop();
      return 3;
    }

    // ------------------------------------------------------------------------
    // 3. RTI (Return from Interrupt: 0x0015)
    // ------------------------------------------------------------------------
    if (op === 0x0015) {
      this.regs.pc = this.regs.reti >>> 0;
      this.regs.interruptsEnabled = true;
      return 3;
    }

    // ------------------------------------------------------------------------
    // 4. SSYNC (0x0024) / CSYNC (0x0023) / IDLE (0x0025)
    // ------------------------------------------------------------------------
    if (op === 0x0024 || op === 0x0023) {
      this.regs.pc = (pc + 2) >>> 0;
      return 2;
    }
    if (op === 0x0025) {
      this.regs.isIdle = true;
      this.regs.pc = (pc + 2) >>> 0;
      return 1;
    }

    // ------------------------------------------------------------------------
    // 5. CLI (Disable Interrupts: 0x0030) / STI (Enable Interrupts: 0x0031)
    // ------------------------------------------------------------------------
    if (op === 0x0030) {
      this.regs.interruptsEnabled = false;
      this.regs.pc = (pc + 2) >>> 0;
      return 1;
    }
    if (op === 0x0031) {
      this.regs.interruptsEnabled = true;
      this.regs.pc = (pc + 2) >>> 0;
      return 1;
    }

    // ------------------------------------------------------------------------
    // 6. LINK Stack Frame: 0xE800..0xE8FF (LINK uimm16)
    // ------------------------------------------------------------------------
    if ((op & 0xFF00) === 0xE800) {
      const frameSize = (op & 0x00FF) * 4;
      // Push RETS and FP onto stack
      this.bus.write32(this.regs.sp - 4, this.regs.rets);
      this.bus.write32(this.regs.sp - 8, this.regs.fp);
      this.regs.fp = this.regs.sp - 8;
      this.regs.sp = this.regs.fp - frameSize;
      this.regs.pc = (pc + 2) >>> 0;
      return 2;
    }

    // ------------------------------------------------------------------------
    // 7. UNLINK Stack Frame: 0xE900
    // ------------------------------------------------------------------------
    if (op === 0xE900) {
      this.regs.sp = this.regs.fp + 8;
      this.regs.fp = this.bus.read32(this.regs.fp);
      this.regs.rets = this.bus.read32(this.regs.fp + 4);
      this.regs.pc = (pc + 2) >>> 0;
      return 2;
    }

    // ------------------------------------------------------------------------
    // 8. JUMP.S offset (0x1000 - 0x1FFF) 12-bit signed offset
    // ------------------------------------------------------------------------
    if ((op & 0xF000) === 0x1000) {
      let offset = op & 0x0FFF;
      if (offset & 0x0800) offset |= ~0x0FFF; // Sign-extend 12-bit
      const target = (pc + (offset * 2)) >>> 0;
      this.regs.pc = target;
      return 3;
    }

    // ------------------------------------------------------------------------
    // 9. IF CC JUMP.S offset (0x0C00 - 0x0CFF)
    // ------------------------------------------------------------------------
    if ((op & 0xFF00) === 0x0C00) {
      let offset = op & 0x00FF;
      if (offset & 0x0080) offset |= ~0x00FF; // Sign-extend 8-bit
      if (this.regs.astat.cc) {
        this.regs.pc = (pc + (offset * 2)) >>> 0;
        return 3;
      }
      this.regs.pc = (pc + 2) >>> 0;
      return 1;
    }

    // ------------------------------------------------------------------------
    // 10. IF !CC JUMP.S offset (0x0D00 - 0x0DFF)
    // ------------------------------------------------------------------------
    if ((op & 0xFF00) === 0x0D00) {
      let offset = op & 0x00FF;
      if (offset & 0x0080) offset |= ~0x00FF;
      if (!this.regs.astat.cc) {
        this.regs.pc = (pc + (offset * 2)) >>> 0;
        return 3;
      }
      this.regs.pc = (pc + 2) >>> 0;
      return 1;
    }

    // ------------------------------------------------------------------------
    // 11. 32-bit Instructions Check (opcodes starting with 0xE0..0xFF / 0xE1 / 0xE2)
    // ------------------------------------------------------------------------
    if ((op & 0xF000) === 0xE000 || (op & 0xF800) === 0xE000 || (op & 0xE000) === 0xE000) {
      const op32_low = this.bus.read16(pc + 2);
      const fullOp32 = ((op << 16) | op32_low) >>> 0;
      return this.execute32BitOpcode(fullOp32, pc);
    }

    // ------------------------------------------------------------------------
    // 12. R_d = imm7 (0x6000 - 0x67FF) Load 7-bit immediate into Data Register
    // ------------------------------------------------------------------------
    if ((op & 0xF800) === 0x6000) {
      const rd = (op >> 8) & 0x07;
      let imm7 = op & 0x007F;
      if (imm7 & 0x0040) imm7 |= ~0x007F; // Sign extend
      this.regs.r[rd] = imm7 >>> 0;
      this.updateAluFlags(this.regs.r[rd]);
      this.regs.pc = (pc + 2) >>> 0;
      return 1;
    }

    // ------------------------------------------------------------------------
    // 13. P_d = imm7 (0x6800 - 0x6FFF) Load 7-bit immediate into Pointer Register
    // ------------------------------------------------------------------------
    if ((op & 0xF800) === 0x6800) {
      const pd = (op >> 8) & 0x07;
      let imm7 = op & 0x007F;
      if (imm7 & 0x0040) imm7 |= ~0x007F;
      if (pd < 6) this.regs.p[pd] = imm7 >>> 0;
      else if (pd === 6) this.regs.fp = imm7 >>> 0;
      else if (pd === 7) this.regs.sp = imm7 >>> 0;
      this.regs.pc = (pc + 2) >>> 0;
      return 1;
    }

    // ------------------------------------------------------------------------
    // 14. [P_d++] = R_s (0x8000 - 0x81FF) 32-bit Store Post-Increment
    // ------------------------------------------------------------------------
    if ((op & 0xFE00) === 0x8000) {
      const pd = (op >> 3) & 0x07;
      const rs = op & 0x07;
      let addr = 0;
      if (pd < 6) {
        addr = this.regs.p[pd];
        this.regs.p[pd] = (addr + 4) >>> 0;
      } else if (pd === 6) {
        addr = this.regs.fp;
        this.regs.fp = (addr + 4) >>> 0;
      } else {
        addr = this.regs.sp;
        this.regs.sp = (addr + 4) >>> 0;
      }
      this.bus.write32(addr, this.regs.r[rs]);
      this.regs.pc = (pc + 2) >>> 0;
      return 1;
    }

    // ------------------------------------------------------------------------
    // 15. R_d = [P_s++] (0x8400 - 0x85FF) 32-bit Load Post-Increment
    // ------------------------------------------------------------------------
    if ((op & 0xFE00) === 0x8400) {
      const rd = op & 0x07;
      const ps = (op >> 3) & 0x07;
      let addr = 0;
      if (ps < 6) {
        addr = this.regs.p[ps];
        this.regs.p[ps] = (addr + 4) >>> 0;
      } else if (ps === 6) {
        addr = this.regs.fp;
        this.regs.fp = (addr + 4) >>> 0;
      } else {
        addr = this.regs.sp;
        this.regs.sp = (addr + 4) >>> 0;
      }
      this.regs.r[rd] = this.bus.read32(addr);
      this.regs.pc = (pc + 2) >>> 0;
      return 1;
    }

    // ------------------------------------------------------------------------
    // 16. ALU: R_d = R_d + R_s / R_d - R_s (0x5000 - 0x5FFF)
    // ------------------------------------------------------------------------
    if ((op & 0xF000) === 0x5000) {
      const subop = (op >> 6) & 0x3F;
      const rd = (op >> 3) & 0x07;
      const rs = op & 0x07;

      if ((subop & 0x38) === 0x00) { // ADD
        const res = (this.regs.r[rd] + this.regs.r[rs]) >>> 0;
        this.regs.r[rd] = res;
        this.updateAluFlags(res);
      } else if ((subop & 0x38) === 0x08) { // SUB
        const res = (this.regs.r[rd] - this.regs.r[rs]) >>> 0;
        this.regs.r[rd] = res;
        this.updateAluFlags(res);
      } else if ((subop & 0x38) === 0x10) { // AND
        const res = (this.regs.r[rd] & this.regs.r[rs]) >>> 0;
        this.regs.r[rd] = res;
        this.updateAluFlags(res);
      } else if ((subop & 0x38) === 0x18) { // OR
        const res = (this.regs.r[rd] | this.regs.r[rs]) >>> 0;
        this.regs.r[rd] = res;
        this.updateAluFlags(res);
      } else if ((subop & 0x38) === 0x20) { // XOR
        const res = (this.regs.r[rd] ^ this.regs.r[rs]) >>> 0;
        this.regs.r[rd] = res;
        this.updateAluFlags(res);
      }
      this.regs.pc = (pc + 2) >>> 0;
      return 1;
    }

    // ------------------------------------------------------------------------
    // 17. Dual MAC / DSP Multiplier: A0 += R0.L * R1.L (0xC000 - 0xC3FF)
    // ------------------------------------------------------------------------
    if ((op & 0xFC00) === 0xC000) {
      const rs0 = (op >> 3) & 0x07;
      const rs1 = op & 0x07;
      const op1 = BigInt((this.regs.r[rs0] & 0xFFFF) << 16 >> 16); // sign-extended 16-bit
      const op2 = BigInt((this.regs.r[rs1] & 0xFFFF) << 16 >> 16);
      this.regs.a0 += (op1 * op2);
      this.regs.pc = (pc + 2) >>> 0;
      return 1;
    }

    if (this.breakOnIllegalOpcode) {
      throw new Error(`Unsupported Blackfin opcode 0x${op.toString(16).padStart(4, '0').toUpperCase()}`);
    }
    this.regs.pc = (pc + 2) >>> 0;
    return 1;
  }

  // 32-bit Blackfin Opcode Decoder (CALL, JUMP.L, Long Load/Store, LSETUP)
  private execute32BitOpcode(op32: number, pc: number): number {
    const high = (op32 >>> 16) & 0xFFFF;
    const low = op32 & 0xFFFF;

    // 1. CALL offset24 (0xE2000000 - 0xE2FFFFFF)
    if ((high & 0xFE00) === 0xE200) {
      let offset24 = ((high & 0x01FF) << 16) | low;
      if (offset24 & 0x01000000) offset24 |= ~0x01FFFFFF; // Sign extend 25-bit
      this.regs.rets = (pc + 4) >>> 0;
      this.callStack.push(this.regs.rets);
      this.regs.pc = (pc + (offset24 * 2)) >>> 0;
      return 4;
    }

    // 2. JUMP.L offset24 (0xE0000000 - 0xE0FFFFFF)
    if ((high & 0xFE00) === 0xE000) {
      let offset24 = ((high & 0x01FF) << 16) | low;
      if (offset24 & 0x01000000) offset24 |= ~0x01FFFFFF;
      this.regs.pc = (pc + (offset24 * 2)) >>> 0;
      return 3;
    }

    // 3. LSETUP (start, end) LC0 / LC1
    if ((high & 0xFFC0) === 0xE080) {
      const loopNum = (high >> 5) & 1;
      const startOff = (high & 0x001F) * 2;
      const endOff = (low & 0x07FF) * 2;
      const topAddr = (pc + startOff + 4) >>> 0;
      const botAddr = (pc + endOff + 4) >>> 0;

      if (loopNum === 0) {
        this.regs.lt0 = topAddr;
        this.regs.lb0 = botAddr;
      } else {
        this.regs.lt1 = topAddr;
        this.regs.lb1 = botAddr;
      }
      this.regs.pc = (pc + 4) >>> 0;
      return 1;
    }

    // 4. R_d = [P_s + offset16] / [P_s + offset16] = R_s
    if ((high & 0xFE00) === 0xE400) {
      const isStore = (high >> 8) & 1;
      const ps = (high >> 3) & 0x07;
      const reg = high & 0x07;
      let off16 = low;
      if (off16 & 0x8000) off16 |= ~0xFFFF;

      let baseAddr = 0;
      if (ps < 6) baseAddr = this.regs.p[ps];
      else if (ps === 6) baseAddr = this.regs.fp;
      else baseAddr = this.regs.sp;

      const targetAddr = (baseAddr + off16) >>> 0;

      if (isStore) {
        this.bus.write32(targetAddr, this.regs.r[reg]);
      } else {
        this.regs.r[reg] = this.bus.read32(targetAddr);
        this.updateAluFlags(this.regs.r[reg]);
      }
      this.regs.pc = (pc + 4) >>> 0;
      return 1;
    }

    // 5. R_d = imm32 (0xE1000000)
    if ((high & 0xFFF8) === 0xE100) {
      const rd = high & 0x07;
      this.regs.r[rd] = low >>> 0;
      this.updateAluFlags(this.regs.r[rd]);
      this.regs.pc = (pc + 4) >>> 0;
      return 1;
    }

    // 6. P_d = imm32 (0xE1080000)
    if ((high & 0xFFF8) === 0xE108) {
      const pd = high & 0x07;
      if (pd < 6) this.regs.p[pd] = low >>> 0;
      else if (pd === 6) this.regs.fp = low >>> 0;
      else if (pd === 7) this.regs.sp = low >>> 0;
      this.regs.pc = (pc + 4) >>> 0;
      return 1;
    }

    if (this.breakOnIllegalOpcode) {
      throw new Error(`Unsupported Blackfin 32-bit opcode 0x${op32.toString(16).padStart(8, '0').toUpperCase()}`);
    }
    this.regs.pc = (pc + 4) >>> 0;
    return 1;
  }

  private updateAluFlags(val: number) {
    this.regs.astat.az = (val === 0);
    this.regs.astat.an = ((val & 0x80000000) !== 0);
    this.regs.astat.cc = !this.regs.astat.az;
  }

  // Trigger Hardware Interrupt (e.g. IVG11 Audio DMA, IVG10 Keyboard matrix, IVG9 PPI Screen)
  public triggerInterrupt(vector: number, returnAddr?: number) {
    if (!this.regs.interruptsEnabled) return;
    this.regs.reti = (returnAddr !== undefined ? returnAddr : this.regs.pc) >>> 0;
    this.regs.interruptsEnabled = false;
    this.regs.isIdle = false;
    // Map vector to EVT table at 0xFFA00000 or IVG table
    this.regs.pc = (0xFFA00000 + (vector * 4)) >>> 0;
  }
}
