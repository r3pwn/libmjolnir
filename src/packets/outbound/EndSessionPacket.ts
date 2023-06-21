import { ControlPacket, ControlType } from './ControlPacket';

export enum EndSessionRequest {
  EndSession = 0,
  RebootDevice = 1
}

export class EndSessionPacket extends ControlPacket {
  request: EndSessionRequest;

  constructor (request: EndSessionRequest) {
    super(ControlType.EndSession);
    this.request = request;
  }

  pack() {
    super.pack();

    this.packInteger(super.dataSize, this.request);
  }
}