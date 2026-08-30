// ============================================================================
// BLACKFIN ADSP-BF533 VIRTUAL MEMORY BUS (MMU / PERIPHERAL MAP)
// Emulates the 32-bit physical address space of Analog Devices ADSP-BF533
// ============================================================================

export interface MemoryRange {
  start: number;
  end: number;
  name: string;
  type: 'SDRAM' | 'FLASH' | 'L1_CODE' | 'L1_DATA_A' | 'L1_DATA_B' | 'SCRATCH' | 'MMR' | 'UNMAPPED';
  readable: boolean;
  writable: boolean;
  executable: boolean;
}

export class MemoryBus {
  // Memory Banks
  public sdram: Uint8Array;        // 64 MB External SDRAM: 0x00000000 - 0x03FFFFFF
  public flashRom: Uint8Array;     // 16 MB SPI Flash ROM:  0x20000000 - 0x20FFFFFF
  public l1InstSram: Uint8Array;   // 32 KB L1 Code SRAM:   0xFFA00000 - 0xFFA07FFF
  public l1DataASram: Uint8Array;  // 16 KB L1 Data A:      0xFF800000 - 0xFF803FFF
  public l1DataBSram: Uint8Array;  // 16 KB L1 Data B:      0xFF900000 - 0xFF903FFF
  public l1Scratchpad: Uint8Array; // 4 KB Scratchpad:      0xFFB00000 - 0xFFB00FFF
  public mmr: Map<number, number>; // Memory Mapped Registers: 0xFFC00000 - 0xFFFFFFFF

  // Memory access stats & watchpoints
  public readCount: number = 0;
  public writeCount: number = 0;
  public breakpoints: Set<number> = new Set();
  public watchpoints: Set<number> = new Set();

  // Callbacks for MMIO peripherals (SPORT0 Audio, PPI Display, UART, DMA)
  public onMmrWrite?: (address: number, value: number, size: 1 | 2 | 4) => void;
  public onMmrRead?: (address: number, size: 1 | 2 | 4) => number | undefined;

  constructor() {
    // Allocate memory buffers
    this.sdram = new Uint8Array(64 * 1024 * 1024);     // 64MB SDRAM
    this.flashRom = new Uint8Array(16 * 1024 * 1024);   // 16MB Flash ROM
    this.l1InstSram = new Uint8Array(32 * 1024);        // 32KB L1 Code
    this.l1DataASram = new Uint8Array(16 * 1024);       // 16KB L1 Data A
    this.l1DataBSram = new Uint8Array(16 * 1024);       // 16KB L1 Data B
    this.l1Scratchpad = new Uint8Array(4 * 1024);       // 4KB Scratchpad
    this.mmr = new Map();
    this.initDefaultMmr();
  }

  public reset() {
    this.sdram.fill(0);
    this.l1InstSram.fill(0);
    this.l1DataASram.fill(0);
    this.l1DataBSram.fill(0);
    this.l1Scratchpad.fill(0);
    this.mmr.clear();
    this.readCount = 0;
    this.writeCount = 0;
    this.initDefaultMmr();
  }

  private initDefaultMmr() {
    // Initialize standard ADSP-BF533 System Control Registers
    this.write32(0xFFC00000, 0x00000000); // PLL_CTL (500MHz VCO)
    this.write32(0xFFC00004, 0x00000005); // PLL_DIV (CCLK = 400MHz, SCLK = 100MHz)
    this.write32(0xFFC00014, 0x00000001); // VR_CTL (Core Voltage Regulator 1.2V)
    this.write32(0xFFC00100, 0x00000000); // SIC_ISR (Interrupt Status)
    this.write32(0xFFC00104, 0x00000000); // SIC_IWR (Wakeup Enable)
    this.write32(0xFFC00108, 0x00000000); // SIC_IMASK (Interrupt Mask)
    this.write32(0xFFC00400, 0x00000000); // PPI_CONTROL (OLED 320x240 Display Port)
    this.write32(0xFFC00800, 0x00000000); // SPORT0_TCR1 (Audio TX Config)
    this.write32(0xFFC00804, 0x00000000); // SPORT0_TCR2 (Audio 24-bit Stereo)
    this.write32(0xFFC00808, 0x00000000); // SPORT0_TCLKDIV (44.1kHz Audio Clock)
  }

  // Address Range classification
  public getMemoryRegion(addr: number): MemoryRange {
    const a = addr >>> 0;
    if (a >= 0x00000000 && a < 0x04000000) {
      return { start: 0x00000000, end: 0x03FFFFFF, name: 'External SDRAM (64MB)', type: 'SDRAM', readable: true, writable: true, executable: true };
    }
    if (a >= 0x20000000 && a < 0x21000000) {
      return { start: 0x20000000, end: 0x20FFFFFF, name: 'SPI Flash ROM (16MB)', type: 'FLASH', readable: true, writable: false, executable: true };
    }
    if (a >= 0xFFA00000 && a < 0xFFA08000) {
      return { start: 0xFFA00000, end: 0xFFA07FFF, name: 'L1 Instruction SRAM (32KB)', type: 'L1_CODE', readable: true, writable: true, executable: true };
    }
    if (a >= 0xFF800000 && a < 0xFF804000) {
      return { start: 0xFF800000, end: 0xFF803FFF, name: 'L1 Data Bank A (16KB)', type: 'L1_DATA_A', readable: true, writable: true, executable: false };
    }
    if (a >= 0xFF900000 && a < 0xFF904000) {
      return { start: 0xFF900000, end: 0xFF903FFF, name: 'L1 Data Bank B (16KB)', type: 'L1_DATA_B', readable: true, writable: true, executable: false };
    }
    if (a >= 0xFFB00000 && a < 0xFFB01000) {
      return { start: 0xFFB00000, end: 0xFFB00FFF, name: 'L1 Scratchpad (4KB)', type: 'SCRATCH', readable: true, writable: true, executable: false };
    }
    if (a >= 0xFFC00000) {
      return { start: 0xFFC00000, end: 0xFFFFFFFF, name: 'System MMR Registers', type: 'MMR', readable: true, writable: true, executable: false };
    }
    return { start: a, end: a, name: 'Unmapped Space', type: 'UNMAPPED', readable: false, writable: false, executable: false };
  }

  // 8-bit Read
  public read8(addr: number): number {
    this.readCount++;
    const a = addr >>> 0;

    if (a < 0x04000000) return this.sdram[a];
    if (a >= 0x20000000 && a < 0x21000000) return this.flashRom[a - 0x20000000];
    if (a >= 0xFFA00000 && a < 0xFFA08000) return this.l1InstSram[a - 0xFFA00000];
    if (a >= 0xFF800000 && a < 0xFF804000) return this.l1DataASram[a - 0xFF800000];
    if (a >= 0xFF900000 && a < 0xFF904000) return this.l1DataBSram[a - 0xFF900000];
    if (a >= 0xFFB00000 && a < 0xFFB01000) return this.l1Scratchpad[a - 0xFFB00000];
    if (a >= 0xFFC00000) {
      if (this.onMmrRead) {
        const val = this.onMmrRead(a, 1);
        if (val !== undefined) return val & 0xFF;
      }
      return (this.mmr.get(a & ~3) || 0) & 0xFF;
    }
    return 0;
  }

  // 16-bit Read (Little Endian)
  public read16(addr: number): number {
    this.readCount++;
    const a = addr >>> 0;

    if (a < 0x03FFFFFE) {
      return this.sdram[a] | (this.sdram[a + 1] << 8);
    }
    if (a >= 0x20000000 && a < 0x20FFFFFE) {
      const offset = a - 0x20000000;
      return this.flashRom[offset] | (this.flashRom[offset + 1] << 8);
    }
    if (a >= 0xFFA00000 && a < 0xFFA07FFE) {
      const offset = a - 0xFFA00000;
      return this.l1InstSram[offset] | (this.l1InstSram[offset + 1] << 8);
    }
    if (a >= 0xFF800000 && a < 0xFF803FFE) {
      const offset = a - 0xFF800000;
      return this.l1DataASram[offset] | (this.l1DataASram[offset + 1] << 8);
    }
    if (a >= 0xFF900000 && a < 0xFF903FFE) {
      const offset = a - 0xFF900000;
      return this.l1DataBSram[offset] | (this.l1DataBSram[offset + 1] << 8);
    }
    if (a >= 0xFFB00000 && a < 0xFFB00FFE) {
      const offset = a - 0xFFB00000;
      return this.l1Scratchpad[offset] | (this.l1Scratchpad[offset + 1] << 8);
    }
    if (a >= 0xFFC00000) {
      if (this.onMmrRead) {
        const val = this.onMmrRead(a, 2);
        if (val !== undefined) return val & 0xFFFF;
      }
      return (this.mmr.get(a & ~3) || 0) & 0xFFFF;
    }

    return this.read8(a) | (this.read8(a + 1) << 8);
  }

  // 32-bit Read (Little Endian)
  public read32(addr: number): number {
    this.readCount++;
    const a = addr >>> 0;

    if (a < 0x03FFFFFC) {
      return (this.sdram[a] |
              (this.sdram[a + 1] << 8) |
              (this.sdram[a + 2] << 16) |
              (this.sdram[a + 3] << 24)) >>> 0;
    }
    if (a >= 0x20000000 && a < 0x20FFFFFC) {
      const offset = a - 0x20000000;
      return (this.flashRom[offset] |
              (this.flashRom[offset + 1] << 8) |
              (this.flashRom[offset + 2] << 16) |
              (this.flashRom[offset + 3] << 24)) >>> 0;
    }
    if (a >= 0xFFA00000 && a < 0xFFA07FFC) {
      const offset = a - 0xFFA00000;
      return (this.l1InstSram[offset] |
              (this.l1InstSram[offset + 1] << 8) |
              (this.l1InstSram[offset + 2] << 16) |
              (this.l1InstSram[offset + 3] << 24)) >>> 0;
    }
    if (a >= 0xFF800000 && a < 0xFF803FFC) {
      const offset = a - 0xFF800000;
      return (this.l1DataASram[offset] |
              (this.l1DataASram[offset + 1] << 8) |
              (this.l1DataASram[offset + 2] << 16) |
              (this.l1DataASram[offset + 3] << 24)) >>> 0;
    }
    if (a >= 0xFF900000 && a < 0xFF903FFC) {
      const offset = a - 0xFF900000;
      return (this.l1DataBSram[offset] |
              (this.l1DataBSram[offset + 1] << 8) |
              (this.l1DataBSram[offset + 2] << 16) |
              (this.l1DataBSram[offset + 3] << 24)) >>> 0;
    }
    if (a >= 0xFFB00000 && a < 0xFFB00FFC) {
      const offset = a - 0xFFB00000;
      return (this.l1Scratchpad[offset] |
              (this.l1Scratchpad[offset + 1] << 8) |
              (this.l1Scratchpad[offset + 2] << 16) |
              (this.l1Scratchpad[offset + 3] << 24)) >>> 0;
    }
    if (a >= 0xFFC00000) {
      if (this.onMmrRead) {
        const val = this.onMmrRead(a, 4);
        if (val !== undefined) return val >>> 0;
      }
      return (this.mmr.get(a) || 0) >>> 0;
    }

    return (this.read8(a) |
           (this.read8(a + 1) << 8) |
           (this.read8(a + 2) << 16) |
           (this.read8(a + 3) << 24)) >>> 0;
  }

  // 8-bit Write
  public write8(addr: number, val: number) {
    this.writeCount++;
    const a = addr >>> 0;
    const v = val & 0xFF;

    if (a < 0x04000000) {
      this.sdram[a] = v;
    } else if (a >= 0xFFA00000 && a < 0xFFA08000) {
      this.l1InstSram[a - 0xFFA00000] = v;
    } else if (a >= 0xFF800000 && a < 0xFF804000) {
      this.l1DataASram[a - 0xFF800000] = v;
    } else if (a >= 0xFF900000 && a < 0xFF904000) {
      this.l1DataBSram[a - 0xFF900000] = v;
    } else if (a >= 0xFFB00000 && a < 0xFFB01000) {
      this.l1Scratchpad[a - 0xFFB00000] = v;
    } else if (a >= 0xFFC00000) {
      const base = a & ~3;
      const shift = (a & 3) * 8;
      const cur = this.mmr.get(base) || 0;
      const next = (cur & ~(0xFF << shift)) | (v << shift);
      this.mmr.set(base, next >>> 0);
      if (this.onMmrWrite) this.onMmrWrite(a, v, 1);
    }
  }

  // 16-bit Write (Little Endian)
  public write16(addr: number, val: number) {
    this.writeCount++;
    const a = addr >>> 0;
    const v = val & 0xFFFF;

    if (a < 0x03FFFFFE) {
      this.sdram[a] = v & 0xFF;
      this.sdram[a + 1] = (v >> 8) & 0xFF;
    } else if (a >= 0xFFA00000 && a < 0xFFA07FFE) {
      const off = a - 0xFFA00000;
      this.l1InstSram[off] = v & 0xFF;
      this.l1InstSram[off + 1] = (v >> 8) & 0xFF;
    } else if (a >= 0xFF800000 && a < 0xFF803FFE) {
      const off = a - 0xFF800000;
      this.l1DataASram[off] = v & 0xFF;
      this.l1DataASram[off + 1] = (v >> 8) & 0xFF;
    } else if (a >= 0xFF900000 && a < 0xFF903FFE) {
      const off = a - 0xFF900000;
      this.l1DataBSram[off] = v & 0xFF;
      this.l1DataBSram[off + 1] = (v >> 8) & 0xFF;
    } else if (a >= 0xFFB00000 && a < 0xFFB00FFE) {
      const off = a - 0xFFB00000;
      this.l1Scratchpad[off] = v & 0xFF;
      this.l1Scratchpad[off + 1] = (v >> 8) & 0xFF;
    } else if (a >= 0xFFC00000) {
      const base = a & ~3;
      const shift = (a & 2) ? 16 : 0;
      const cur = this.mmr.get(base) || 0;
      const next = (cur & ~(0xFFFF << shift)) | (v << shift);
      this.mmr.set(base, next >>> 0);
      if (this.onMmrWrite) this.onMmrWrite(a, v, 2);
    } else {
      this.write8(a, v & 0xFF);
      this.write8(a + 1, (v >> 8) & 0xFF);
    }
  }

  // 32-bit Write (Little Endian)
  public write32(addr: number, val: number) {
    this.writeCount++;
    const a = addr >>> 0;
    const v = val >>> 0;

    if (a < 0x03FFFFFC) {
      this.sdram[a] = v & 0xFF;
      this.sdram[a + 1] = (v >> 8) & 0xFF;
      this.sdram[a + 2] = (v >> 16) & 0xFF;
      this.sdram[a + 3] = (v >> 24) & 0xFF;
    } else if (a >= 0xFFA00000 && a < 0xFFA07FFC) {
      const off = a - 0xFFA00000;
      this.l1InstSram[off] = v & 0xFF;
      this.l1InstSram[off + 1] = (v >> 8) & 0xFF;
      this.l1InstSram[off + 2] = (v >> 16) & 0xFF;
      this.l1InstSram[off + 3] = (v >> 24) & 0xFF;
    } else if (a >= 0xFF800000 && a < 0xFF803FFC) {
      const off = a - 0xFF800000;
      this.l1DataASram[off] = v & 0xFF;
      this.l1DataASram[off + 1] = (v >> 8) & 0xFF;
      this.l1DataASram[off + 2] = (v >> 16) & 0xFF;
      this.l1DataASram[off + 3] = (v >> 24) & 0xFF;
    } else if (a >= 0xFF900000 && a < 0xFF903FFC) {
      const off = a - 0xFF900000;
      this.l1DataBSram[off] = v & 0xFF;
      this.l1DataBSram[off + 1] = (v >> 8) & 0xFF;
      this.l1DataBSram[off + 2] = (v >> 16) & 0xFF;
      this.l1DataBSram[off + 3] = (v >> 24) & 0xFF;
    } else if (a >= 0xFFB00000 && a < 0xFFB00FFC) {
      const off = a - 0xFFB00000;
      this.l1Scratchpad[off] = v & 0xFF;
      this.l1Scratchpad[off + 1] = (v >> 8) & 0xFF;
      this.l1Scratchpad[off + 2] = (v >> 16) & 0xFF;
      this.l1Scratchpad[off + 3] = (v >> 24) & 0xFF;
    } else if (a >= 0xFFC00000) {
      this.mmr.set(a, v);
      if (this.onMmrWrite) this.onMmrWrite(a, v, 4);
    } else {
      this.write8(a, v & 0xFF);
      this.write8(a + 1, (v >> 8) & 0xFF);
      this.write8(a + 2, (v >> 16) & 0xFF);
      this.write8(a + 3, (v >> 24) & 0xFF);
    }
  }

  // Block copy into target memory address (e.g. firmware loader)
  public loadBlock(targetAddr: number, data: Uint8Array): boolean {
    const a = targetAddr >>> 0;
    const len = data.length;

    if (a + len <= 0x04000000) {
      this.sdram.set(data, a);
      return true;
    }
    if (a >= 0xFFA00000 && a + len <= 0xFFA08000) {
      this.l1InstSram.set(data, a - 0xFFA00000);
      return true;
    }
    if (a >= 0xFF800000 && a + len <= 0xFF804000) {
      this.l1DataASram.set(data, a - 0xFF800000);
      return true;
    }
    if (a >= 0xFF900000 && a + len <= 0xFF904000) {
      this.l1DataBSram.set(data, a - 0xFF900000);
      return true;
    }
    if (a >= 0x20000000 && a + len <= 0x21000000) {
      this.flashRom.set(data, a - 0x20000000);
      return true;
    }

    // Byte-by-byte fallback
    for (let i = 0; i < len; i++) {
      this.write8(a + i, data[i]);
    }
    return true;
  }
}
