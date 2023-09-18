import { SessionRequest, SessionSetupPacket } from './SessionSetupPacket';

export class BeginSessionPacket extends SessionSetupPacket {
  constructor () {
    super(SessionRequest.BeginSession);
  }

  static get dataSize () { return super.dataSize + 4; }

  pack() {
    super.pack();
    // Odin protocol version
    this.packInteger(BeginSessionPacket.dataSize, 0x4);
  }
}