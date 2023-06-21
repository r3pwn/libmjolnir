import { PitEntry } from './PitEntry';
import { constants } from './constants';

export class PitData {
  unknown1 = 0;
  unknown2 = 0;
  unknown3 = 0;
  unknown4 = 0;
  unknown5 = 0;
  unknown6 = 0;
  unknown7 = 0;
  unknown8 = 0;
  entryCount = 0;
  entries: PitEntry[] = [];

  matches (otherPitData: PitData) {
    return this.entryCount == otherPitData.entryCount &&
      this.unknown1 == otherPitData.unknown1 &&
      this.unknown2 == otherPitData.unknown2 &&
      this.unknown3 == otherPitData.unknown3 &&
      this.unknown4 == otherPitData.unknown4 &&
      this.unknown5 == otherPitData.unknown5 &&
      this.unknown6 == otherPitData.unknown6 &&
      this.unknown7 == otherPitData.unknown7 &&
      this.unknown8 == otherPitData.unknown8 &&
      this.entries.every((entry, index) => entry.matches(otherPitData.entries[index]));
  }

  clear () {
    this.unknown1 = 0;
    this.unknown2 = 0;
    this.unknown3 = 0;
    this.unknown4 = 0;
    this.unknown5 = 0;
    this.unknown6 = 0;
    this.unknown7 = 0;
    this.unknown8 = 0;
    this.entryCount = 0;
    this.entries = [];
  }

  getDataSize () {
    return constants.HeaderDataSize + this.entries.length * constants.EntryDataSize;
  }

  getPaddedSize () {
    const dataSize = this.getDataSize();
    let paddedSize = (dataSize / constants.PaddedSizeMultiplicand) * constants.PaddedSizeMultiplicand;

    if (dataSize % constants.PaddedSizeMultiplicand !== 0)
      paddedSize += constants.PaddedSizeMultiplicand;

    return paddedSize;
  }

  unpackInteger (data: Uint8Array, offset: number) {
    return data[offset]  | (data[offset + 1] << 8) |
      (data[offset + 2] << 16) | (data[offset + 3] << 24);
  }

  packInteger (data: Uint8Array, offset: number, value: number) {
    data[offset] = value & 0x000000FF;
    data[offset + 1] = (value & 0x0000FF00) >> 8;
    data[offset + 2] = (value & 0x00FF0000) >> 16;
    data[offset + 3] = (value & 0xFF000000) >> 24;
  }

  unpackShort (data: Uint8Array, offset: number) {
    return data[offset] | (data[offset + 1] << 8);
  }

  packShort (data: Uint8Array, offset: number, value: number) {
    data[offset] = value & 0x00FF;
    data[offset + 1] = (value & 0xFF00) >> 8;
  }

  unpackCharArray (data: Uint8Array, offset: number, length: number) : Uint8Array {

    return data.slice(offset, offset + length);
  }

  packCharArray (data: Uint8Array, offset: number, value: Uint8Array) {
    data.set(value, offset);
  }

  unpack (data: Uint8Array) : boolean {
    if (this.unpackInteger(data, 0) !== constants.FileIdentifier) {
      return false;
    }

    // Remove existing entries
    this.entries = [];

    this.entryCount = this.unpackInteger(data, 4);

    this.entries = new Array(this.entryCount);

    this.unknown1 = this.unpackInteger(data, 8);
    this.unknown2 = this.unpackInteger(data, 12);
    this.unknown3 = this.unpackShort(data, 16);
    this.unknown4 = this.unpackShort(data, 18);
    this.unknown5 = this.unpackShort(data, 20);
    this.unknown6 = this.unpackShort(data, 22);
    this.unknown7 = this.unpackShort(data, 24);
    this.unknown8 = this.unpackShort(data, 26);

    let entryOffset: number;

    for (let i = 0; i < this.entryCount; i++) {
      entryOffset = constants.HeaderDataSize + i * constants.EntryDataSize;

      this.entries[i] = new PitEntry({
        binaryType: this.unpackInteger(data, entryOffset),
        deviceType: this.unpackInteger(data, entryOffset + 4),
        identifier: this.unpackInteger(data, entryOffset + 8),
        attributes: this.unpackInteger(data, entryOffset + 12),
        updateAttributes: this.unpackInteger(data, entryOffset + 16),
        blockSizeOrOffset: this.unpackInteger(data, entryOffset + 20),
        blockCount: this.unpackInteger(data, entryOffset + 24),
        fileOffset: this.unpackInteger(data, entryOffset + 28),
        fileSize: this.unpackInteger(data, entryOffset + 32),

        _partitionName: this.unpackCharArray(data, 
          entryOffset + 36, constants.PartitionNameMaxLength),
        _flashFilename: this.unpackCharArray(data, 
          entryOffset + 36 + constants.PartitionNameMaxLength, constants.FlashFilenameMaxLength),
        _fotaFilename: this.unpackCharArray(data, 
          entryOffset + 36 + constants.PartitionNameMaxLength + constants.FlashFilenameMaxLength, 
          constants.FotaFilenameMaxLength)
      });
    }

    return true;
  }

  pack (data: Uint8Array) {
    this.packInteger(data, 0, constants.FileIdentifier);
    this.packInteger(data, 4, this.entryCount);

    this.packInteger(data, 8, this.unknown1);
    this.packInteger(data, 12, this.unknown2);
    this.packShort(data, 16, this.unknown3);
    this.packShort(data, 18, this.unknown4);
    this.packShort(data, 20, this.unknown5);
    this.packShort(data, 22, this.unknown6);
    this.packShort(data, 24, this.unknown7);
    this.packShort(data, 26, this.unknown8);

    let entryOffset: number;

    for (let i = 0; i < this.entryCount; i++) {
      entryOffset = constants.HeaderDataSize + i * constants.EntryDataSize;

      this.packInteger(data, entryOffset, this.entries[i].binaryType);

      this.packInteger(data, entryOffset + 4, this.entries[i].deviceType);
      this.packInteger(data, entryOffset + 8, this.entries[i].identifier);
      this.packInteger(data, entryOffset + 12, this.entries[i].attributes);

      this.packInteger(data, entryOffset + 16, this.entries[i].updateAttributes);

      this.packInteger(data, entryOffset + 20, this.entries[i].blockSizeOrOffset);
      this.packInteger(data, entryOffset + 24, this.entries[i].blockCount);

      this.packInteger(data, entryOffset + 28, this.entries[i].fileOffset);
      this.packInteger(data, entryOffset + 32, this.entries[i].fileSize);

      this.packCharArray(data, entryOffset + 36, this.entries[i]._partitionName);
      this.packCharArray(data, entryOffset + 36 + constants.PartitionNameMaxLength, this.entries[i]._flashFilename);
      this.packCharArray(data, entryOffset + 36 + constants.PartitionNameMaxLength + constants.FlashFilenameMaxLength, this.entries[i]._fotaFilename);
    }
  }

  getEntry (index: number) : PitEntry {
    return this.entries[index];
  }

  findEntryByName (partitionName: string) : PitEntry | undefined {
    return this.entries.find(entry => entry.isFlashable() && entry.partitionName === partitionName)
  }

  findEntryByIdentifier (partitionIdentifier: number) : PitEntry | undefined {
    return this.entries.find(entry => entry.isFlashable() && entry.identifier === partitionIdentifier)
  }
}
