import { ControlPacket, ControlType } from './ControlPacket';

export enum SessionRequest {
  BeginSession = 0,
  DeviceType = 1, // ?
  TotalBytes = 2,
  //kEnableSomeSortOfFlag = 3,
  FilePartSize = 5,
  EraseUserdata = 7,
  EnableTFlash = 8
}

export class SessionSetupPacket extends ControlPacket {
  request: SessionRequest;

  constructor(request: SessionRequest) {
    super(ControlType.Session);

    this.request = request;
  }

  static get dataSize () { return super.dataSize + 4 }

  pack () {
    super.pack();
    this.packInteger(ControlPacket.dataSize, this.request)
  }
}