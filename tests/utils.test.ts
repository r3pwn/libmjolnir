import { ByteArray } from '../src/utils/ByteArray';

describe('ByteArray', () => {
  test('converts a string to a byte array', () => {
    const message = 'LOKI';

    const bytes = ByteArray.fromString(message);
    expect(bytes).toHaveLength(4);
    expect(bytes[0]).toBe(0x4C); // L
    expect(bytes[1]).toBe(0x4F); // O
    expect(bytes[2]).toBe(0x4B); // K
    expect(bytes[3]).toBe(0x49); // I
  });

  test('converts a byte array to a string', () => {
    const bytes = new Uint8Array([0x4C, 0x4F, 0x4B, 0x49]);

    const message = ByteArray.toString(bytes);
    expect(message).toBe('LOKI');
  });

  test('trims a byte array to a given length', () => {
    const bytes = ByteArray.fromString('TESTING', 4);
    const message = ByteArray.toString(bytes);
    
    expect(message).toBe('TEST');
  });
});