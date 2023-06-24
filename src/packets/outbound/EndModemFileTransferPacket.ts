import { EndFileTransferPacket, FileTransferDestination } from './EndFileTransferPacket';

export class EndModemFileTransferPacket extends EndFileTransferPacket {
  endOfFile: number;

  constructor(sequenceByteCount: number, unknown1: number, chipIdentifier: number, endOfFile: boolean) {
    super(FileTransferDestination.Modem, sequenceByteCount, unknown1, chipIdentifier);
    this.endOfFile = endOfFile ? 1 : 0;
  }

  pack () {
    super.pack();

    this.packInteger(EndFileTransferPacket.dataSize, this.endOfFile);
  }
}