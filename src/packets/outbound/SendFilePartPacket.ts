import { OutboundPacket } from './OutboundPacket';

export class SendFilePartPacket extends OutboundPacket {
  constructor(byteData: Uint8Array, size: number) {
    super(size);
    this.data.set(byteData);
  }

  pack () {
      // this packet is already packed
  }
}