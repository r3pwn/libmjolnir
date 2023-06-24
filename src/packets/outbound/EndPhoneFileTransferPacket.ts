import { EndFileTransferPacket, FileTransferDestination } from './EndFileTransferPacket';

export enum TransferFileIdentifier {
  PrimaryBootloader          = 0x00,
  Pit                        = 0x01, // Don't flash the pit this way!
  SecondaryBootloader		     = 0x03,
  SecondaryBootloaderBackup  = 0x04,
  // unknown file type 0x05
  Kernel						         = 0x06,
  Recovery					         = 0x07,
  TabletModem				         = 0x08,
  // unknown file types 0x09 and 0x0A
  Modem                      = 0x0B,  // Kies flashes the modem this way rather than using the EndModemFileTransferPacket.
  // unkown file types 0x0C through 0x13
  Efs                        = 0x14,
  ParamLfs                   = 0x15,
  FactoryFilesystem          = 0x16,
  DatabaseData               = 0x17,
  Cache                      = 0x18
}

export class EndPhoneFileTransferPacket extends EndFileTransferPacket {
  fileIdentifier: TransferFileIdentifier;
  endOfFile: number;

  constructor(sequenceByteCount: number, unknown1: number, chipIdentifier: number, fileIdentifier: TransferFileIdentifier, endOfFile: boolean) {
    super(FileTransferDestination.Phone, sequenceByteCount, unknown1, chipIdentifier);
    this.fileIdentifier = fileIdentifier;
    this.endOfFile = endOfFile ? 1 : 0;
  }

  pack () {
    super.pack();

    this.packInteger(EndFileTransferPacket.dataSize, this.fileIdentifier);
    this.packInteger(EndFileTransferPacket.dataSize + 4, this.endOfFile);
  }
}