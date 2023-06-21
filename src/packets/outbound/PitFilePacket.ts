import { ControlPacket, ControlType } from './ControlPacket';

export enum PitFileRequest {
  Flash = 0x00,
  Dump = 0x01,
  Part = 0x02,
  EndTransfer = 0x03
}

export class PitFilePacket extends ControlPacket {
  request: PitFileRequest;

  constructor(request: PitFileRequest) {
    super(ControlType.PitFile);
    this.request = request;
  }

  get dataSize () { return super.dataSize + 4 };

  pack () {
    super.pack();
    this.packInteger(super.dataSize, this.request);
  }
}