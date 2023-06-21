import { BasePacket } from '../BasePacket';

export class InboundPacket extends BasePacket {
  sizeVariable: boolean;
  receivedSize = -1;

  constructor (size: number, sizeVariable = false) { 
    super(size);
    this.sizeVariable = sizeVariable;
  }

  unpackInteger (offset: number) {
    return this.data[offset] | (this.data[offset + 1] << 8) |
      (this.data[offset + 2] << 16) | (this.data[offset + 3] << 24);
  }

  async unpack () { throw new Error('Packet has not implemented the `unpack` method'); }
}