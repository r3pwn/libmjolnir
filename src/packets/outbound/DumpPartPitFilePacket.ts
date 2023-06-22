import { PitFilePacket, PitFileRequest } from './PitFilePacket';

export class DumpPartPitFilePacket extends PitFilePacket {
  partIndex: number;

  constructor (partIndex: number) {
    super(PitFileRequest.Part);
    this.partIndex = partIndex;
  }

  pack() {
    super.pack();

    this.packInteger(PitFilePacket.dataSize, this.partIndex);
  }
}