// ============================================================================
// EXPERIMENTAL ADSP-BF524 PERIPHERAL ADAPTERS
// Addresses below are placeholders until verified against an OP-1 board trace.
// ============================================================================

import { MemoryBus } from './memoryBus';
import { BlackfinCpu } from './blackfinCpu';

export interface DisplayFrameBuffer {
  width: number;
  height: number;
  data: Uint8ClampedArray; // 320x160 RGBA
  fps: number;
  lastFrameTime: number;
}

export class HardwarePeripherals {
  public bus: MemoryBus;
  public cpu: BlackfinCpu;

  // OP-1 display-sized virtual framebuffer (320 x 160)
  public display: DisplayFrameBuffer;
  public onDisplayRefresh?: (imageData: ImageData) => void;

  // Audio Codec Ring Buffer (SPORT0 DMA @ 44.1kHz Stereo)
  public audioSampleRate: number = 44100;
  public audioBufferL: Float32Array;
  public audioBufferR: Float32Array;
  public audioWriteIndex: number = 0;
  public audioReadIndex: number = 0;
  public onAudioBufferReady?: (left: Float32Array, right: Float32Array) => void;

  // I/O Matrix State (24 keys, 4 encoders, 8 function keys)
  public keyMatrix: Uint32Array = new Uint32Array(2); // Bitmask of 64 switches
  public encoderBlue: number = 50;
  public encoderGreen: number = 50;
  public encoderWhite: number = 50;
  public encoderOrange: number = 50;

  // Core Timer
  private timerPeriod: number = 40000; // 40,000 cycles = 100 µs
  private timerCounter: number = 0;

  constructor(bus: MemoryBus, cpu: BlackfinCpu) {
    this.bus = bus;
    this.cpu = cpu;

    // 320x160 display-sized diagnostic framebuffer
    const w = 320;
    const h = 160;
    this.display = {
      width: w,
      height: h,
      data: new Uint8ClampedArray(w * h * 4),
      fps: 60,
      lastFrameTime: performance.now(),
    };

    // Initialize with OLED Black and boot line
    this.clearDisplay();

    // 4096 samples audio ringbuffer (approx 92ms buffer)
    this.audioBufferL = new Float32Array(4096);
    this.audioBufferR = new Float32Array(4096);

    // Register MMIO Hooks for SPORT0 and PPI
    this.bus.onMmrWrite = (addr, val, size) => this.handleMmrWrite(addr, val, size);
    this.bus.onMmrRead = (addr, size) => this.handleMmrRead(addr, size);
  }

  public clearDisplay() {
    this.display.data.fill(0); // Pure black OLED
    // Alpha channel = 255
    for (let i = 3; i < this.display.data.length; i += 4) {
      this.display.data[i] = 255;
    }
  }

  // MMIO Write Handler
  private handleMmrWrite(addr: number, val: number, _size: number) {
    const a = addr >>> 0;

    // 1. SPORT0 TX Audio Register (0xFFC00810)
    if (a === 0xFFC00810) {
      // 24-bit left/right sample incoming from DSP
      const sampleL = (((val & 0xFFFFFF) << 8) >> 8) / 8388608.0;
      this.audioBufferL[this.audioWriteIndex] = sampleL;
      this.audioBufferR[this.audioWriteIndex] = sampleL;
      this.audioWriteIndex = (this.audioWriteIndex + 1) % this.audioBufferL.length;
    }

    // 2. PPI DMA Trigger (0xFFC00400 PPI_CONTROL)
    if (a === 0xFFC00400 && (val & 0x01)) {
      this.renderPpiFrame();
    }

    // 3. C8051 Keyboard/Encoder Status Write
    if (a === 0xFFC01500) {
      // Acknowledged keyboard scan
    }
  }

  // MMIO Read Handler
  private handleMmrRead(addr: number, _size: number): number | undefined {
    const a = addr >>> 0;

    // Read Key Matrix Register 0
    if (a === 0xFFC01500) {
      return this.keyMatrix[0];
    }
    // Read Key Matrix Register 1
    if (a === 0xFFC01504) {
      return this.keyMatrix[1];
    }
    // Read 4 Encoders Register
    if (a === 0xFFC01508) {
      return (
        ((this.encoderBlue & 0xFF) << 0) |
        ((this.encoderGreen & 0xFF) << 8) |
        ((this.encoderWhite & 0xFF) << 16) |
        ((this.encoderOrange & 0xFF) << 24)
      ) >>> 0;
    }

    return undefined;
  }

  // Periodic Peripheral Tick (Invoked every slice of CPU cycles)
  public tick(cyclesElapsed: number) {
    this.timerCounter += cyclesElapsed;

    // Timer Interrupt (IVG10)
    if (this.timerCounter >= this.timerPeriod) {
      this.timerCounter -= this.timerPeriod;
      this.cpu.triggerInterrupt(10); // Hardware Timer Interrupt
    }

    // SPORT0 Audio DMA Interrupt (IVG11) every 9070 cycles (~44.1kHz sample rate @ 400MHz)
    if (this.timerCounter % 9070 < cyclesElapsed) {
      this.cpu.triggerInterrupt(11);
    }
  }

  // Inject Key Press into Hardware Matrix
  public setKey(keyIndex: number, pressed: boolean) {
    const wordIdx = Math.floor(keyIndex / 32);
    const bitIdx = keyIndex % 32;

    if (pressed) {
      this.keyMatrix[wordIdx] |= (1 << bitIdx);
    } else {
      this.keyMatrix[wordIdx] &= ~(1 << bitIdx);
    }

    // Trigger Key Interrupt (IVG9)
    this.cpu.triggerInterrupt(9);
  }

  // Inject Rotary Encoder Direct Value or Progressive Delta
  public setEncoderValue(color: 'blue' | 'green' | 'white' | 'orange', value: number) {
    const clamped = Math.max(0, Math.min(100, value));
    if (color === 'blue') this.encoderBlue = clamped;
    if (color === 'green') this.encoderGreen = clamped;
    if (color === 'white') this.encoderWhite = clamped;
    if (color === 'orange') this.encoderOrange = clamped;

    // Trigger Encoder Interrupt (IVG9) for Blackfin firmware processing
    this.cpu.triggerInterrupt(9);
  }

  public updateEncoder(color: 'blue' | 'green' | 'white' | 'orange', delta: number) {
    if (color === 'blue') this.setEncoderValue('blue', this.encoderBlue + delta);
    if (color === 'green') this.setEncoderValue('green', this.encoderGreen + delta);
    if (color === 'white') this.setEncoderValue('white', this.encoderWhite + delta);
    if (color === 'orange') this.setEncoderValue('orange', this.encoderOrange + delta);
  }

  // Render Framebuffer from SDRAM / PPI DMA buffer to Canvas ImageData
  public renderPpiFrame() {
    const ppiBase = 0x00010000; // Experimental mapping; not yet board-verified.
    const d = this.display.data;
    let p = 0;

    // Read 320x160 RGB565 buffer from virtual SDRAM
    for (let y = 0; y < 160; y++) {
      for (let x = 0; x < 320; x++) {
        const addr = (ppiBase + (y * 320 + x) * 2) >>> 0;
        const rgb565 = this.bus.read16(addr);

        // Unpack RGB565 to RGB888
        const r = Math.round(((rgb565 >> 11) & 0x1F) * (255 / 31));
        const g = Math.round(((rgb565 >> 5) & 0x3F) * (255 / 63));
        const b = Math.round((rgb565 & 0x1F) * (255 / 31));
        d[p] = r;
        d[p + 1] = g;
        d[p + 2] = b;
        d[p + 3] = 255;
        p += 4;
      }
    }

    if (this.onDisplayRefresh) {
      const clamped = new Uint8ClampedArray(this.display.data.buffer as ArrayBuffer);
      const img = new ImageData(clamped, 320, 160);
      this.onDisplayRefresh(img);
    }
  }
}
