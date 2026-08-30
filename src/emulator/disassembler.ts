// ============================================================================
// BLACKFIN ADSP-BF524 INSTRUCTION DISASSEMBLER
// Decodes 16-bit and 32-bit machine code into standard Blackfin Assembly
// ============================================================================

export interface DisassembledInstruction {
  address: number;
  hex: string;
  bytes: number[];
  mnemonic: string;
  size: 2 | 4;
  isBranch?: boolean;
  targetAddress?: number;
  symbol?: string;
}

export class BlackfinDisassembler {
  private symbols: Map<number, string> = new Map();

  constructor() {
    this.initDefaultSymbols();
  }

  public registerSymbol(address: number, name: string) {
    this.symbols.set(address >>> 0, name);
  }

  private initDefaultSymbols() {
    this.symbols.set(0x00001000, '_start');
    this.symbols.set(0x00001040, '_init_pll_clocks');
    this.symbols.set(0x00001080, '_init_sdram_controller');
    this.symbols.set(0x00001100, '_main');
    this.symbols.set(0x00002000, '_op1_dsp_audio_callback');
    this.symbols.set(0x00002400, '_drwave_synthesize_sample');
    this.symbols.set(0x00002800, '_iter_cellular_fm_kernel');
    this.symbols.set(0x00003000, '_ppi_dma_oled_refresh');
    this.symbols.set(0x00003500, '_c8051_keyboard_matrix_scan');
    this.symbols.set(0x00004000, '_te_boot_verify_checksum');
    this.symbols.set(0xFFA00000, '_evt_reset');
    this.symbols.set(0xFFA00004, '_evt_nmi');
    this.symbols.set(0xFFA0002C, '_ivg11_sport0_audio_dma_isr');
    this.symbols.set(0xFFA00028, '_ivg10_keyboard_timer_isr');
  }

  public disassemble(read16: (addr: number) => number, address: number): DisassembledInstruction {
    const addr = address >>> 0;
    const op16 = read16(addr);
    const sym = this.symbols.get(addr);

    // 1. NOP
    if (op16 === 0x0000) {
      return { address: addr, hex: '0000', bytes: [0, 0], mnemonic: 'NOP;', size: 2, symbol: sym };
    }

    // 2. RTS
    if (op16 === 0x0014) {
      return { address: addr, hex: '0014', bytes: [0x14, 0], mnemonic: 'RTS;', size: 2, isBranch: true, symbol: sym };
    }

    // 3. RTI
    if (op16 === 0x0015) {
      return { address: addr, hex: '0015', bytes: [0x15, 0], mnemonic: 'RTI;', size: 2, isBranch: true, symbol: sym };
    }

    // 4. SSYNC / CSYNC / IDLE
    if (op16 === 0x0024) return { address: addr, hex: '0024', bytes: [0x24, 0], mnemonic: 'SSYNC;', size: 2, symbol: sym };
    if (op16 === 0x0023) return { address: addr, hex: '0023', bytes: [0x23, 0], mnemonic: 'CSYNC;', size: 2, symbol: sym };
    if (op16 === 0x0025) return { address: addr, hex: '0025', bytes: [0x25, 0], mnemonic: 'IDLE;', size: 2, symbol: sym };

    // 5. CLI / STI
    if (op16 === 0x0030) return { address: addr, hex: '0030', bytes: [0x30, 0], mnemonic: 'CLI R0;', size: 2, symbol: sym };
    if (op16 === 0x0031) return { address: addr, hex: '0031', bytes: [0x31, 0], mnemonic: 'STI R0;', size: 2, symbol: sym };

    // 6. LINK / UNLINK
    if ((op16 & 0xFF00) === 0xE800) {
      const framesize = (op16 & 0xFF) * 4;
      return { address: addr, hex: op16.toString(16).padStart(4, '0'), bytes: [op16 & 0xFF, (op16 >> 8) & 0xFF], mnemonic: `LINK ${framesize};`, size: 2, symbol: sym };
    }
    if (op16 === 0xE900) {
      return { address: addr, hex: 'E900', bytes: [0, 0xE9], mnemonic: 'UNLINK;', size: 2, symbol: sym };
    }

    // 7. JUMP.S
    if ((op16 & 0xF000) === 0x1000) {
      let off = op16 & 0x0FFF;
      if (off & 0x0800) off |= ~0x0FFF;
      const target = (addr + off * 2) >>> 0;
      const targetSym = this.symbols.get(target);
      return {
        address: addr,
        hex: op16.toString(16).padStart(4, '0'),
        bytes: [op16 & 0xFF, (op16 >> 8) & 0xFF],
        mnemonic: `JUMP.S ${targetSym ? targetSym : '0x' + target.toString(16).toUpperCase()};`,
        size: 2,
        isBranch: true,
        targetAddress: target,
        symbol: sym
      };
    }

    // 8. IF CC JUMP.S / IF !CC JUMP.S
    if ((op16 & 0xFF00) === 0x0C00) {
      let off = op16 & 0x00FF;
      if (off & 0x0080) off |= ~0x00FF;
      const target = (addr + off * 2) >>> 0;
      return { address: addr, hex: op16.toString(16).padStart(4, '0'), bytes: [op16 & 0xFF, (op16 >> 8) & 0xFF], mnemonic: `IF CC JUMP 0x${target.toString(16).toUpperCase()};`, size: 2, isBranch: true, targetAddress: target, symbol: sym };
    }
    if ((op16 & 0xFF00) === 0x0D00) {
      let off = op16 & 0x00FF;
      if (off & 0x0080) off |= ~0x00FF;
      const target = (addr + off * 2) >>> 0;
      return { address: addr, hex: op16.toString(16).padStart(4, '0'), bytes: [op16 & 0xFF, (op16 >> 8) & 0xFF], mnemonic: `IF !CC JUMP 0x${target.toString(16).toUpperCase()};`, size: 2, isBranch: true, targetAddress: target, symbol: sym };
    }

    // 9. 32-bit instructions (CALL, JUMP.L, Long loads)
    if ((op16 & 0xF000) === 0xE000 || (op16 & 0xF800) === 0xE000 || (op16 & 0xE000) === 0xE000) {
      const op16_low = read16(addr + 2);
      const full = ((op16 << 16) | op16_low) >>> 0;
      const hexStr = full.toString(16).padStart(8, '0').toUpperCase();

      // CALL offset24
      if ((op16 & 0xFE00) === 0xE200) {
        let off24 = ((op16 & 0x01FF) << 16) | op16_low;
        if (off24 & 0x01000000) off24 |= ~0x01FFFFFF;
        const target = (addr + off24 * 2) >>> 0;
        const targetSym = this.symbols.get(target);
        return {
          address: addr,
          hex: hexStr,
          bytes: [op16_low & 0xFF, (op16_low >> 8) & 0xFF, op16 & 0xFF, (op16 >> 8) & 0xFF],
          mnemonic: `CALL ${targetSym ? targetSym : '0x' + target.toString(16).toUpperCase()};`,
          size: 4,
          isBranch: true,
          targetAddress: target,
          symbol: sym
        };
      }

      // JUMP.L offset24
      if ((op16 & 0xFE00) === 0xE000) {
        let off24 = ((op16 & 0x01FF) << 16) | op16_low;
        if (off24 & 0x01000000) off24 |= ~0x01FFFFFF;
        const target = (addr + off24 * 2) >>> 0;
        const targetSym = this.symbols.get(target);
        return {
          address: addr,
          hex: hexStr,
          bytes: [op16_low & 0xFF, (op16_low >> 8) & 0xFF, op16 & 0xFF, (op16 >> 8) & 0xFF],
          mnemonic: `JUMP.L ${targetSym ? targetSym : '0x' + target.toString(16).toUpperCase()};`,
          size: 4,
          isBranch: true,
          targetAddress: target,
          symbol: sym
        };
      }

      // R_d = imm32
      if ((op16 & 0xFFF8) === 0xE100) {
        const rd = op16 & 0x07;
        return {
          address: addr,
          hex: hexStr,
          bytes: [op16_low & 0xFF, (op16_low >> 8) & 0xFF, op16 & 0xFF, (op16 >> 8) & 0xFF],
          mnemonic: `R${rd} = 0x${op16_low.toString(16).toUpperCase()};`,
          size: 4,
          symbol: sym
        };
      }

      // P_d = imm32
      if ((op16 & 0xFFF8) === 0xE108) {
        const pd = op16 & 0x07;
        const pName = pd < 6 ? `P${pd}` : (pd === 6 ? 'FP' : 'SP');
        return {
          address: addr,
          hex: hexStr,
          bytes: [op16_low & 0xFF, (op16_low >> 8) & 0xFF, op16 & 0xFF, (op16 >> 8) & 0xFF],
          mnemonic: `${pName} = 0x${op16_low.toString(16).toUpperCase()};`,
          size: 4,
          symbol: sym
        };
      }

      return {
        address: addr,
        hex: hexStr,
        bytes: [op16_low & 0xFF, (op16_low >> 8) & 0xFF, op16 & 0xFF, (op16 >> 8) & 0xFF],
        mnemonic: `[32-bit OP: 0x${hexStr}]`,
        size: 4,
        symbol: sym
      };
    }

    // 10. Load / Store Post-Increment
    if ((op16 & 0xFE00) === 0x8000) {
      const pd = (op16 >> 3) & 0x07;
      const rs = op16 & 0x07;
      const pName = pd < 6 ? `P${pd}` : (pd === 6 ? 'FP' : 'SP');
      return { address: addr, hex: op16.toString(16).padStart(4, '0'), bytes: [op16 & 0xFF, (op16 >> 8) & 0xFF], mnemonic: `[${pName}++] = R${rs};`, size: 2, symbol: sym };
    }
    if ((op16 & 0xFE00) === 0x8400) {
      const rd = op16 & 0x07;
      const ps = (op16 >> 3) & 0x07;
      const pName = ps < 6 ? `P${ps}` : (ps === 6 ? 'FP' : 'SP');
      return { address: addr, hex: op16.toString(16).padStart(4, '0'), bytes: [op16 & 0xFF, (op16 >> 8) & 0xFF], mnemonic: `R${rd} = [${pName}++];`, size: 2, symbol: sym };
    }

    // 11. ALU
    if ((op16 & 0xF000) === 0x5000) {
      const subop = (op16 >> 6) & 0x3F;
      const rd = (op16 >> 3) & 0x07;
      const rs = op16 & 0x07;
      let opName = 'ADD';
      if ((subop & 0x38) === 0x08) opName = 'SUB';
      if ((subop & 0x38) === 0x10) opName = 'AND';
      if ((subop & 0x38) === 0x18) opName = 'OR';
      if ((subop & 0x38) === 0x20) opName = 'XOR';
      return { address: addr, hex: op16.toString(16).padStart(4, '0'), bytes: [op16 & 0xFF, (op16 >> 8) & 0xFF], mnemonic: `R${rd} = R${rd} ${opName.toLowerCase()} R${rs};`, size: 2, symbol: sym };
    }

    // 12. R_d = imm7 / P_d = imm7
    if ((op16 & 0xF800) === 0x6000) {
      const rd = (op16 >> 8) & 0x07;
      const imm7 = op16 & 0x007F;
      return { address: addr, hex: op16.toString(16).padStart(4, '0'), bytes: [op16 & 0xFF, (op16 >> 8) & 0xFF], mnemonic: `R${rd} = ${imm7};`, size: 2, symbol: sym };
    }
    if ((op16 & 0xF800) === 0x6800) {
      const pd = (op16 >> 8) & 0x07;
      const imm7 = op16 & 0x007F;
      const pName = pd < 6 ? `P${pd}` : (pd === 6 ? 'FP' : 'SP');
      return { address: addr, hex: op16.toString(16).padStart(4, '0'), bytes: [op16 & 0xFF, (op16 >> 8) & 0xFF], mnemonic: `${pName} = ${imm7};`, size: 2, symbol: sym };
    }

    // Default Fallback
    return {
      address: addr,
      hex: op16.toString(16).padStart(4, '0').toUpperCase(),
      bytes: [op16 & 0xFF, (op16 >> 8) & 0xFF],
      mnemonic: `.short 0x${op16.toString(16).toUpperCase()};`,
      size: 2,
      symbol: sym
    };
  }

  // Disassemble a range of instructions
  public disassembleBlock(read16: (addr: number) => number, startAddr: number, count: number): DisassembledInstruction[] {
    const list: DisassembledInstruction[] = [];
    let cur = startAddr >>> 0;
    for (let i = 0; i < count; i++) {
      const inst = this.disassemble(read16, cur);
      list.push(inst);
      cur = (cur + inst.size) >>> 0;
    }
    return list;
  }
}
