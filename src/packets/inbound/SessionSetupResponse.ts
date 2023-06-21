import { ResponsePacket, ResponseType } from './ResponsePacket';

export class SessionSetupResponse extends ResponsePacket {
  result = 0;

  constructor() {
    super(ResponseType.SessionSetup);
  }

  async unpack () {
    await super.unpack();
    this.result = this.unpackInteger(super.dataSize);
  }
}