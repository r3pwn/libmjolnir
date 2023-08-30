import { SessionRequest, SessionSetupPacket } from './SessionSetupPacket';

export class EraseUserdataPacket extends SessionSetupPacket {
  constructor () {
    super(SessionRequest.EraseUserdata);
  }
}