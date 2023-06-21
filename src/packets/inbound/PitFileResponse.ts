import { ResponsePacket, ResponseType } from './ResponsePacket';

export class PitFileResponse extends ResponsePacket {
  fileSize = 0;

  constructor() {
    super(ResponseType.PitFile);
  }

  async unpack () {
    await super.unpack();
    this.fileSize = this.unpackInteger(super.dataSize);
  }
}