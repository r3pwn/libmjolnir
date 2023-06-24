import { FileTransferPacket, FileTransferRequest } from './FileTransferPacket';

export class FlashPartFileTransferPacket extends FileTransferPacket {
  sequenceByteCount: number;

  constructor (sequenceByteCount: number) {
    super(FileTransferRequest.Part);
    this.sequenceByteCount = sequenceByteCount;
  }

  pack () {
    super.pack();
    this.packInteger(FileTransferPacket.dataSize, this.sequenceByteCount);
  }
}
