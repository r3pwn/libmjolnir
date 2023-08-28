import { ResponsePacket, ResponseType } from './ResponsePacket';

export class FileTransferResponse extends ResponsePacket {  
  constructor () {
    super(ResponseType.FileTransfer);
  }

  async unpack() {
    await super.unpack();
  }
}
