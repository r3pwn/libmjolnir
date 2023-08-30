import { SessionRequest, SessionSetupPacket } from './SessionSetupPacket';

export class TotalBytesPacket extends SessionSetupPacket {
  fileTotalSize: number;

  constructor (filePartSize: number) {
    super(SessionRequest.TotalBytes);
    this.fileTotalSize = filePartSize;
  }

  pack () {
    super.pack();
    this.packInteger(SessionSetupPacket.dataSize, this.fileTotalSize);
  }
}