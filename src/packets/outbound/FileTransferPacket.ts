import { ControlPacket, ControlType } from './ControlPacket';

export enum FileTransferRequest {
  Flash = 0x00,
  Dump = 0x01,
  Part = 0x02,
  End = 0x03
}

export class FileTransferPacket extends ControlPacket {
  request: FileTransferRequest;

  constructor (request: FileTransferRequest) {
    super(ControlType.FileTransfer);
    this.request = request;
  }

  static get dataSize () { return super.dataSize + 4 }

  pack () {
    super.pack();
    this.packInteger(ControlPacket.dataSize, this.request);
  }
}