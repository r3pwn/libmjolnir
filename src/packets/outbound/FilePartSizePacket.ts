import { SessionRequest, SessionSetupPacket } from './SessionSetupPacket';

export class FilePartSizePacket extends SessionSetupPacket {
  filePartSize: number;

  constructor (filePartSize: number) {
    super(SessionRequest.FilePartSize);
    this.filePartSize = filePartSize;
  }

  pack () {
    super.pack();
    this.packInteger(SessionSetupPacket.dataSize, this.filePartSize);
  }
}