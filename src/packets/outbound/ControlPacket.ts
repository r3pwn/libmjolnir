import { OutboundPacket } from './OutboundPacket';

export enum ControlType {
  Session = 0x64,
  PitFile = 0x65,
  FileTransfer = 0x66,
  EndSession = 0x67
}

export class ControlPacket extends OutboundPacket {
  controlType: ControlType;

  constructor (controlType: ControlType) {
    super(1024);
    this.controlType = controlType;
  }

  static get dataSize () { return 4 }

  pack () {
    this.packInteger(0, this.controlType);
  }
}