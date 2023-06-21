import { ByteArray } from '../utils/ByteArray';
import { constants } from './constants';

enum EntryBinaryType
{
  ApplicationProcessor = 0,
  CommunicationProcessor = 1
}

enum EntryDeviceType
{
  OneNand = 0,
  File, // FAT
  MMC,
  All // ?
}

enum EntryAttribute
{
  Write = 1,
  STL = 1 << 1
  // BML = 1 << 2 // ???
}

enum EntryUpdateAttribute
{
  Fota = 1,
  Secure = 1 << 1
}

export class PitEntry {
  binaryType: EntryBinaryType = 0;
  deviceType: EntryDeviceType = 0;
  identifier = 0;
  attributes: EntryAttribute = EntryAttribute.Write;
  updateAttributes: EntryUpdateAttribute = EntryUpdateAttribute.Fota;

  blockSizeOrOffset = 0;
  blockCount = 0;

  fileOffset = 0; // Obsolete
  fileSize = 0; // Obsolete

  _partitionName: Uint8Array;
  _flashFilename: Uint8Array; // USB flash filename
  _fotaFilename: Uint8Array; // Firmware over the air

  constructor (entry? : Partial<PitEntry>) {
    this._partitionName = new Uint8Array(constants.PartitionNameMaxLength);
    this._flashFilename = new Uint8Array(constants.FlashFilenameMaxLength);
    this._fotaFilename = new Uint8Array(constants.FotaFilenameMaxLength);

    if (entry) {
      Object.assign(this, entry);
    }
  }
  
  matches(otherPitEntry: PitEntry): boolean {
    return otherPitEntry != null &&
      this.binaryType === otherPitEntry.binaryType &&
      this.deviceType === otherPitEntry.deviceType &&
      this.identifier === otherPitEntry.identifier &&
      this.attributes === otherPitEntry.attributes &&
      this.updateAttributes === otherPitEntry.updateAttributes &&
      this.blockSizeOrOffset === otherPitEntry.blockSizeOrOffset &&
      this.blockCount === otherPitEntry.blockCount &&
      this.fileOffset === otherPitEntry.fileOffset &&
      this.fileSize === otherPitEntry.fileSize &&
      this.partitionName === otherPitEntry.partitionName &&
      this.flashFilename === otherPitEntry.flashFilename &&
      this.fotaFilename === otherPitEntry.fotaFilename;
  }

  isFlashable(): boolean {
    return !!this.partitionName?.length;
  }

  get partitionName() {
    return ByteArray.toString(this._partitionName);
  }

  set partitionName(desiredName: string) {
    this._partitionName.set(ByteArray.fromString(desiredName));
  }

  get flashFilename() {
    return ByteArray.toString(this._flashFilename);
  }

  set flashFilename(desiredName: string) {
    this._flashFilename.set(ByteArray.fromString(desiredName));
  }

  get fotaFilename() {
    return ByteArray.toString(this._fotaFilename);
  }

  set fotaFilename(desiredName: string) {
    this._fotaFilename.set(ByteArray.fromString(desiredName));
  }
}