import { InboundPacket } from './InboundPacket';

export class ReceiveFilePartPacket extends InboundPacket {
  fileSize = 0;

  static get dataSize () { return 500 }

  constructor() {
    super(ReceiveFilePartPacket.dataSize, true);
  }

  async unpack () {
    // method intentionally left blank
  }
}