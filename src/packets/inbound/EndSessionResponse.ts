import { ResponsePacket, ResponseType } from './ResponsePacket';

export class EndSessionResponse extends ResponsePacket {  
  constructor () {
    super(ResponseType.EndSession);
  }

  async unpack() {
    await super.unpack();
  }
}
