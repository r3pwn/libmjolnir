import { SessionRequest, SessionSetupPacket } from './SessionSetupPacket';

export class DeviceTypePacket extends SessionSetupPacket {
  constructor () {
    super(SessionRequest.DeviceType)
  }
}