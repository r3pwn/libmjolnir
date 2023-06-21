import { ByteArray } from '../src/utils/ByteArray';

test('converts a string to a byte array', () => {
  let message = 'LOKI';

  let bytes = ByteArray.fromString(message);
  expect(bytes).toHaveLength(4);
  expect(bytes[0]).toBe(0x4C); // L
  expect(bytes[1]).toBe(0x4F); // O
  expect(bytes[2]).toBe(0x4B); // K
  expect(bytes[3]).toBe(0x49); // I
});

test('converts a byte array to a string', () => {
  let bytes = new Uint8Array([0x4C, 0x4F, 0x4B, 0x49]);

  let message = ByteArray.toString(bytes);
  expect(message).toBe('LOKI');
});

test('trims a byte array to a given length', () => {
  let bytes = ByteArray.fromString("TESTING", 4);
  let message = ByteArray.toString(bytes);
  
  expect(message).toBe('TEST');
});