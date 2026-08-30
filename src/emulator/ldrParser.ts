// Reference-backed parsers for OP-1 update containers and ADI BF52x LDR streams.
// .op1 format: op1hacks/op1repacker. LDR format: Analog Devices/U-Boot bootrom.h.

import { MemoryBus } from './memoryBus';

export type FirmwareFormat = 'op1-container' | 'ldr-bf52x' | 'unknown';

export const BF52X_LDR_FLAGS = {
  FILL: 0x00000100,
  INIT: 0x00000800,
  IGNORE: 0x00001000,
  FIRST: 0x00004000,
  FINAL: 0x00008000,
  HEADER_CHECK_MASK: 0x00ff0000,
  HEADER_SIGNATURE_MASK: 0xff000000,
  HEADER_SIGNATURE: 0xad000000,
} as const;

export interface LdrBlockHeader {
  blockCode: number;
  targetAddress: number;
  byteCount: number;
  argument: number;
  isFinal: boolean;
  isFill: boolean;
  isIgnore: boolean;
  headerChecksumValid: boolean;
  headerSignatureValid: boolean;
}

export interface ParsedLdrFirmware {
  filename: string;
  format: FirmwareFormat;
  totalSize: number;
  entryPoint: number;
  crc32: string;
  storedCrc32?: string;
  crc32Valid?: boolean;
  lzmaProperties?: number;
  lzmaDictionarySize?: number;
  lzmaUncompressedSize?: bigint | null;
  blocks: Array<{ header: LdrBlockHeader; offset: number; description: string }>;
  isValid: boolean;
  isExecutableByExperimentalCore: boolean;
  warnings: string[];
  errors: string[];
  error?: string;
}

const readU32LE = (data: Uint8Array, offset: number): number => (
  data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24)
) >>> 0;

const xorHeader = (data: Uint8Array, offset: number): number => {
  let result = 0;
  for (let i = 0; i < 16; i++) result ^= data[offset + i];
  return result;
};

const hex32 = (value: number): string => value.toString(16).padStart(8, '0').toUpperCase();

export class LdrParser {
  public static computeCrc32(data: Uint8Array): string {
    let crc = 0xffffffff;
    for (const byte of data) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) {
        crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
      }
    }
    return hex32((crc ^ 0xffffffff) >>> 0);
  }

  public static detectFormat(data: Uint8Array, filename = ''): FirmwareFormat {
    const lowerName = filename.toLowerCase();
    if (data.length >= 17 && (lowerName.endsWith('.op1') || data[4] === 0x5d)) return 'op1-container';
    if (data.length >= 16 && (lowerName.endsWith('.ldr') || (readU32LE(data, 0) & 0xff000000) === 0xad000000)) return 'ldr-bf52x';
    return 'unknown';
  }

  public static parse(data: Uint8Array, filename = 'firmware.bin'): ParsedLdrFirmware {
    const format = this.detectFormat(data, filename);
    if (format === 'op1-container') return this.parseOp1Container(data, filename);
    if (format === 'ldr-bf52x') return this.parseBf52xLdr(data, filename);
    return {
      filename, format, totalSize: data.length, entryPoint: 0,
      crc32: this.computeCrc32(data), blocks: [], isValid: false,
      isExecutableByExperimentalCore: false, warnings: [],
      errors: ['Format inconnu : chargez un conteneur .op1 ou un flux ADI BF52x .ldr.'],
      error: 'Unsupported firmware format',
    };
  }

  private static parseOp1Container(data: Uint8Array, filename: string): ParsedLdrFirmware {
    const errors: string[] = [];
    const payload = data.subarray(Math.min(4, data.length));
    const storedCrc32 = data.length >= 4 ? hex32(readU32LE(data, 0)) : '00000000';
    const calculatedCrc = this.computeCrc32(payload);
    const crc32Valid = storedCrc32 === calculatedCrc;
    if (data.length < 17) errors.push('Conteneur .op1 trop court.');
    if (!crc32Valid) errors.push('CRC32 OP-1 invalide : attendu ' + storedCrc32 + ', calculé ' + calculatedCrc + '.');

    const lzmaProperties = payload[0] || 0;
    const lzmaDictionarySize = payload.length >= 5 ? readU32LE(payload, 1) : 0;
    let lzmaUncompressedSize: bigint | null = null;
    if (payload.length >= 13) {
      let size = 0n;
      let unknown = true;
      for (let i = 0; i < 8; i++) {
        if (payload[5 + i] !== 0xff) unknown = false;
        size |= BigInt(payload[5 + i]) << BigInt(i * 8);
      }
      lzmaUncompressedSize = unknown ? null : size;
    }
    // LZMA-Alone accepte plusieurs jeux (pb, lp, lc). 0x5D est courant dans
    // les originaux; les paramètres publics d'op1repacker produisent 0x66.
    if (lzmaProperties >= 9 * 5 * 5) errors.push('Propriétés LZMA-Alone invalides.');

    return {
      filename, format: 'op1-container', totalSize: data.length, entryPoint: 0,
      crc32: calculatedCrc, storedCrc32, crc32Valid, lzmaProperties,
      lzmaDictionarySize, lzmaUncompressedSize, blocks: [],
      isValid: errors.length === 0, isExecutableByExperimentalCore: false,
      warnings: ['Conteneur validé statiquement. Décompressez-le avant d’analyser te-boot.ldr et OP1_vdk.ldr.'],
      errors, error: errors[0],
    };
  }

  private static parseBf52xLdr(data: Uint8Array, filename: string): ParsedLdrFirmware {
    const blocks: ParsedLdrFirmware['blocks'] = [];
    const errors: string[] = [];
    const warnings: string[] = [];
    let offset = 0;
    let entryPoint = 0;
    let finalSeen = false;

    while (offset + 16 <= data.length && !finalSeen) {
      const blockCode = readU32LE(data, offset);
      const targetAddress = readU32LE(data, offset + 4);
      const byteCount = readU32LE(data, offset + 8);
      const argument = readU32LE(data, offset + 12);
      const isFill = (blockCode & BF52X_LDR_FLAGS.FILL) !== 0;
      const isIgnore = (blockCode & BF52X_LDR_FLAGS.IGNORE) !== 0;
      const isFinal = (blockCode & BF52X_LDR_FLAGS.FINAL) !== 0;
      const headerSignatureValid = ((blockCode & BF52X_LDR_FLAGS.HEADER_SIGNATURE_MASK) >>> 0) === BF52X_LDR_FLAGS.HEADER_SIGNATURE;
      const headerChecksumValid = xorHeader(data, offset) === 0;
      const payloadSize = (isFill || isFinal) ? 0 : byteCount;
      const payloadOffset = offset + 16;

      if (!headerSignatureValid) errors.push('Bloc ' + (blocks.length + 1) + ': signature ADI 0xAD absente.');
      if (!headerChecksumValid) errors.push('Bloc ' + (blocks.length + 1) + ': checksum XOR d’en-tête invalide.');
      if (payloadOffset + payloadSize > data.length) {
        errors.push('Bloc ' + (blocks.length + 1) + ': charge utile hors fichier.');
        break;
      }

      const flags: string[] = [];
      if (blockCode & BF52X_LDR_FLAGS.FIRST) flags.push('FIRST');
      if (blockCode & BF52X_LDR_FLAGS.INIT) flags.push('INIT');
      if (isFill) flags.push('FILL');
      if (isIgnore) flags.push('IGNORE');
      if (isFinal) flags.push('FINAL');
      blocks.push({
        header: { blockCode, targetAddress, byteCount, argument, isFinal, isFill, isIgnore, headerChecksumValid, headerSignatureValid },
        offset: payloadOffset,
        description: (flags.join(' | ') || 'DATA') + ' → 0x' + hex32(targetAddress) + ' (' + byteCount + ' B)',
      });

      if (isFinal) {
        entryPoint = targetAddress;
        finalSeen = true;
      }
      offset = payloadOffset + payloadSize;
    }

    if (!finalSeen) errors.push('Aucun bloc FINAL BF52x trouvé.');
    if (finalSeen && offset < data.length) warnings.push((data.length - offset) + ' octets suivent le bloc FINAL.');
    warnings.push('Le cœur TypeScript ne couvre qu’un sous-ensemble d’instructions : ce résultat ne prouve pas qu’un firmware démarrera.');
    return {
      filename, format: 'ldr-bf52x', totalSize: data.length, entryPoint,
      crc32: this.computeCrc32(data), blocks,
      isValid: blocks.length > 0 && errors.length === 0 && finalSeen,
      isExecutableByExperimentalCore: blocks.length > 0 && errors.length === 0 && finalSeen,
      warnings, errors, error: errors[0],
    };
  }

  public static loadIntoMemory(data: Uint8Array, bus: MemoryBus, filename = 'firmware.ldr'): { entryPoint: number; loadedBytes: number } {
    const parsed = this.parse(data, filename);
    if (parsed.format !== 'ldr-bf52x' || !parsed.isValid) throw new Error(parsed.error || 'Flux LDR BF52x invalide.');
    let loadedBytes = 0;
    for (const block of parsed.blocks) {
      if (block.header.isFinal || block.header.isIgnore) continue;
      const payload = block.header.isFill
        ? new Uint8Array(block.header.byteCount).fill(block.header.argument & 0xff)
        : data.subarray(block.offset, block.offset + block.header.byteCount);
      if (!bus.loadBlock(block.header.targetAddress, payload)) throw new Error('Bloc non chargeable à 0x' + hex32(block.header.targetAddress) + '.');
      loadedBytes += payload.length;
    }
    return { entryPoint: parsed.entryPoint, loadedBytes };
  }

  public static createDiagnosticLdr(): Uint8Array {
    // Basic NOP + ALU register test routine
    const code = new Uint8Array([
      0x00, 0x00,             // NOP
      0x00, 0xE1, 0x24, 0x00, // R0 = 0x0024
      0x01, 0xE1, 0x43, 0x00, // R1 = 0x0043
      0x08, 0x50,             // R0 = R0 + R1
      0x00, 0x00              // NOP
    ]);
    const output = new Uint8Array(16 + code.length + 16);
    this.writeAdiHeader(output, 0, BF52X_LDR_FLAGS.HEADER_SIGNATURE | BF52X_LDR_FLAGS.FIRST, 0x1000, code.length, 0);
    output.set(code, 16);
    this.writeAdiHeader(output, 16 + code.length, BF52X_LDR_FLAGS.HEADER_SIGNATURE | BF52X_LDR_FLAGS.FINAL, 0x1000, 0, 0);
    return output;
  }

  public static createTeBootVectorLdr(): Uint8Array {
    // TE-BOOT Bootloader & Key Matrix test routine
    const code = new Uint8Array([
      0x00, 0x00,             // NOP
      0x00, 0xE1, 0x00, 0x15, // R0 = 0x1500 (C8051 Matrix MMR offset)
      0x01, 0xE1, 0xC0, 0xFF, // R1 = 0xFFC0 (MMR Base)
      0x00, 0x00              // NOP
    ]);
    const output = new Uint8Array(16 + code.length + 16);
    this.writeAdiHeader(output, 0, BF52X_LDR_FLAGS.HEADER_SIGNATURE | BF52X_LDR_FLAGS.FIRST, 0x1000, code.length, 0);
    output.set(code, 16);
    this.writeAdiHeader(output, 16 + code.length, BF52X_LDR_FLAGS.HEADER_SIGNATURE | BF52X_LDR_FLAGS.FINAL, 0x1000, 0, 0);
    return output;
  }

  public static createSport0AudioDmaLdr(): Uint8Array {
    // SPORT0 DMA Audio Codec 44.1kHz test routine
    const code = new Uint8Array([
      0x00, 0x00,             // NOP
      0x00, 0xE1, 0x10, 0x08, // R0 = 0x0810 (SPORT0 TX MMR)
      0x01, 0xE1, 0xC0, 0xFF, // R1 = 0xFFC0 (MMR Base)
      0x00, 0x00              // NOP
    ]);
    const output = new Uint8Array(16 + code.length + 16);
    this.writeAdiHeader(output, 0, BF52X_LDR_FLAGS.HEADER_SIGNATURE | BF52X_LDR_FLAGS.FIRST, 0x1000, code.length, 0);
    output.set(code, 16);
    this.writeAdiHeader(output, 16 + code.length, BF52X_LDR_FLAGS.HEADER_SIGNATURE | BF52X_LDR_FLAGS.FINAL, 0x1000, 0, 0);
    return output;
  }

  public static createPpiFramebufferLdr(): Uint8Array {
    // 1. Code Block: Routine that configures PPI DMA MMRs
    const code = new Uint8Array([
      0x00, 0x00,             // NOP
      0x00, 0xE1, 0x00, 0x04, // R0 = 0x0400 (PPI Control MMR)
      0x01, 0xE1, 0xC0, 0xFF, // R1 = 0xFFC0 (MMR Base)
      0x00, 0x00              // NOP
    ]);

    // 2. Video Framebuffer Block: 320x160 RGB565 pixel pattern loaded directly at 0x00010000 (SDRAM)
    const fbBytes = new Uint8Array(320 * 160 * 2);
    let offset = 0;
    for (let y = 0; y < 160; y++) {
      for (let x = 0; x < 320; x++) {
        let rgb565 = 0x0000;
        // Top status bar (y < 20)
        if (y < 20) {
          rgb565 = 0x18E3; // Dark slate
        } else if (y === 20 || y === 140) {
          rgb565 = 0x3DEF; // Cyan border line
        } else if (y > 20 && y < 140) {
          // Color bars across X
          const bar = Math.floor(x / 40);
          switch (bar) {
            case 0: rgb565 = 0xF800; break; // Red
            case 1: rgb565 = 0x07E0; break; // Green
            case 2: rgb565 = 0x001F; break; // Blue
            case 3: rgb565 = 0xFFE0; break; // Yellow
            case 4: rgb565 = 0x07FF; break; // Cyan
            case 5: rgb565 = 0xF81F; break; // Magenta
            case 6: rgb565 = 0xFFFF; break; // White
            default: rgb565 = 0x2104; break; // Gray
          }
        } else {
          // Bottom area
          rgb565 = 0x1082;
        }

        fbBytes[offset] = rgb565 & 0xFF;
        fbBytes[offset + 1] = (rgb565 >> 8) & 0xFF;
        offset += 2;
      }
    }

    // 3. Assemble multi-block LDR:
    // Block 1 (First): Code block at 0x1000
    // Block 2: Framebuffer block at 0x00010000
    // Block 3 (Final): Final zero-length block
    const output = new Uint8Array(16 + code.length + 16 + fbBytes.length + 16);
    let p = 0;

    // Block 1
    this.writeAdiHeader(output, p, BF52X_LDR_FLAGS.HEADER_SIGNATURE | BF52X_LDR_FLAGS.FIRST, 0x1000, code.length, 0);
    p += 16;
    output.set(code, p);
    p += code.length;

    // Block 2 (Framebuffer at 0x00010000)
    this.writeAdiHeader(output, p, BF52X_LDR_FLAGS.HEADER_SIGNATURE, 0x00010000, fbBytes.length, 0);
    p += 16;
    output.set(fbBytes, p);
    p += fbBytes.length;

    // Block 3 (Final)
    this.writeAdiHeader(output, p, BF52X_LDR_FLAGS.HEADER_SIGNATURE | BF52X_LDR_FLAGS.FINAL, 0x1000, 0, 0);

    return output;
  }

  public static createFactoryFirmwareBinary(): Uint8Array {
    return this.createDiagnosticLdr();
  }

  private static writeAdiHeader(buffer: Uint8Array, offset: number, blockCode: number, target: number, count: number, argument: number) {
    this.write32LE(buffer, offset, blockCode & ~BF52X_LDR_FLAGS.HEADER_CHECK_MASK);
    this.write32LE(buffer, offset + 4, target);
    this.write32LE(buffer, offset + 8, count);
    this.write32LE(buffer, offset + 12, argument);
    buffer[offset + 2] = xorHeader(buffer, offset);
  }

  private static write32LE(buffer: Uint8Array, offset: number, value: number) {
    buffer[offset] = value & 0xff;
    buffer[offset + 1] = (value >>> 8) & 0xff;
    buffer[offset + 2] = (value >>> 16) & 0xff;
    buffer[offset + 3] = (value >>> 24) & 0xff;
  }
}
