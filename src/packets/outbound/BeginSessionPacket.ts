import { SessionRequest, SessionSetupPacket } from './SessionSetupPacket';

export class BeginSessionPacket extends SessionSetupPacket {
  constructor () {
    super(SessionRequest.BeginSession);
  }
}