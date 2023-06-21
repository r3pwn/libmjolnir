import fs from 'fs';
import { PitData } from '../../src/libpit/PitData';

const SAMPLES_DIR = 'tests/libpit/samples';

function getFileAsByteArray(filePath: string) {
  let fileData = fs.readFileSync(filePath, 'binary');

  let bytes = [] as number[];
  for(let i = 0; i < fileData.length; i++) {
    bytes.push(fileData.charCodeAt(i) & 0xFF);
  }
  
  return new Uint8Array(bytes);
}

test('unpacks and re-packs a PIT file', () => {
  let bytes = getFileAsByteArray(`${SAMPLES_DIR}/i9100-stock-sample.pit`);
  // clone the bytes array so we can compare it later
  let unpackBytes = bytes.slice();

  let data = new PitData();
  // unpack the data, check for success
  expect(data.unpack(bytes)).toBe(true);

  // re-pack the data
  data.pack(bytes);

  // ensure all bytes match up exactly
  expect(unpackBytes.every(function(byte, index) {
    return byte === bytes[index];
  })).toBe(true);
});