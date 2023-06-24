import { ResponsePacket, ResponseType } from './ResponsePacket';

export class SendFilePartResponse extends ResponsePacket {
  partIndex = -1;
  
  constructor () {
    super(ResponseType.SendFilePart);
  }

  async unpack() {
    await super.unpack();
    this.partIndex = this.unpackInteger(ResponsePacket.dataSize);
  }
}
