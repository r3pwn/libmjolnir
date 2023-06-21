import { InboundPacket } from './InboundPacket';

export enum ResponseType {
  SendFilePart = 0x00,
  SessionSetup = 0x64,
  PitFile = 0x65,
  FileTransfer = 0x66,
  EndSession = 0x67
}

export class ResponsePacket extends InboundPacket {
  responseType: ResponseType;

  constructor (responseType: ResponseType) {
    super(8);
    this.responseType = responseType;
  }

  get dataSize () { return 4; }

  async unpack () {
    const receivedResponseType = this.unpackInteger(0);
    if (receivedResponseType != this.responseType) {
      this.responseType = receivedResponseType;
      throw new Error('requested and received response types differ')
    }
  }
}