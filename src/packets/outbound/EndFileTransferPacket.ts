import { FileTransferPacket, FileTransferRequest } from './FileTransferPacket';

export enum FileTransferDestination {
  Phone = 0x00,
  Modem = 0x01
}

export class EndFileTransferPacket extends FileTransferPacket {
  destination: FileTransferDestination;
  sequenceByteCount: number;
  unknown1: number;
  deviceType: number;

  constructor (destination: FileTransferDestination, sequenceByteCount: number, unknown1: number, deviceType: number) {
    super(FileTransferRequest.End);
    this.destination = destination;
    this.sequenceByteCount = sequenceByteCount;
    this.unknown1 = unknown1;
    this.deviceType = deviceType;
  }

  static get dataSize () { return super.dataSize + 16; }

  pack () {
    super.pack();

    this.packInteger(FileTransferPacket.dataSize, this.destination);
    this.packInteger(FileTransferPacket.dataSize + 4, this.sequenceByteCount);
    this.packInteger(FileTransferPacket.dataSize + 8, this.unknown1);
    this.packInteger(FileTransferPacket.dataSize + 12, this.deviceType);
  }
}