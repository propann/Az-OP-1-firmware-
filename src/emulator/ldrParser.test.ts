import { describe, expect, it } from 'vitest';
import { BF52X_LDR_FLAGS, LdrParser } from './ldrParser';
import { MemoryBus } from './memoryBus';

const writeU32LE = (data: Uint8Array, offset: number, value: number) => {
  data[offset] = value & 0xff;
  data[offset + 1] = (value >>> 8) & 0xff;
  data[offset + 2] = (value >>> 16) & 0xff;
  data[offset + 3] = (value >>> 24) & 0xff;
};

describe('OP-1 container analyser', () => {
  it('validates CRC32 over the LZMA payload', () => {
    const payload = new Uint8Array(13).fill(0xff);
    payload[0] = 0x5d;
    writeU32LE(payload, 1, 1 << 23);
    const container = new Uint8Array(payload.length + 4);
    container.set(payload, 4);
    writeU32LE(container, 0, Number.parseInt(LdrParser.computeCrc32(payload), 16));

    const report = LdrParser.parse(container, 'op1_246.op1');
    expect(report.format).toBe('op1-container');
    expect(report.crc32Valid).toBe(true);
    expect(report.errors).toEqual([]);
    expect(report.isExecutableByExperimentalCore).toBe(false);
  });

  it('rejects a damaged payload', () => {
    const data = new Uint8Array(17);
    data[4] = 0x5d;
    const report = LdrParser.parse(data, 'damaged.op1');
    expect(report.crc32Valid).toBe(false);
    expect(report.isValid).toBe(false);
  });
});

describe('BF52x LDR analyser', () => {
  it('parses and loads the diagnostic stream', () => {
    const ldr = LdrParser.createDiagnosticLdr();
    const report = LdrParser.parse(ldr, 'diagnostic.ldr');
    expect(report.format).toBe('ldr-bf52x');
    expect(report.errors).toEqual([]);
    expect(report.blocks).toHaveLength(2);
    expect(report.blocks[0].header.blockCode & BF52X_LDR_FLAGS.FIRST).not.toBe(0);
    expect(report.blocks[1].header.isFinal).toBe(true);
    expect(report.entryPoint).toBe(0x1000);

    const bus = new MemoryBus();
    const loaded = LdrParser.loadIntoMemory(ldr, bus, 'diagnostic.ldr');
    expect(loaded.loadedBytes).toBe(2);
    expect(bus.read16(0x1000)).toBe(0);
  });

  it('rejects a broken header checksum', () => {
    const ldr = LdrParser.createDiagnosticLdr();
    ldr[5] ^= 1;
    const report = LdrParser.parse(ldr, 'broken.ldr');
    expect(report.isValid).toBe(false);
    expect(report.errors.some((message) => message.includes('checksum'))).toBe(true);
  });
});
