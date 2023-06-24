import { PitData } from './libpit';
import { InboundPacket } from './packets/inbound/InboundPacket';
import { PitFileResponse } from './packets/inbound/PitFileResponse';
import { ReceiveFilePartPacket } from './packets/inbound/ReceiveFilePartPacket';
import { ResponsePacket, ResponseType } from './packets/inbound/ResponsePacket';
import { SendFilePartResponse } from './packets/inbound/SendFilePartResponse';
import { SessionSetupResponse } from './packets/inbound/SessionSetupResponse';
import { BeginSessionPacket } from './packets/outbound/BeginSessionPacket';
import { DeviceTypePacket } from './packets/outbound/DeviceTypePacket';
import { DumpPartPitFilePacket } from './packets/outbound/DumpPartPitFilePacket';
import { FileTransferDestination } from './packets/outbound/EndFileTransferPacket';
import { EndModemFileTransferPacket } from './packets/outbound/EndModemFileTransferPacket';
import { EndPhoneFileTransferPacket } from './packets/outbound/EndPhoneFileTransferPacket';
import { EndSessionPacket, EndSessionRequest } from './packets/outbound/EndSessionPacket';
import { FilePartSizePacket } from './packets/outbound/FilePartSizePacket';
import { FileTransferPacket, FileTransferRequest } from './packets/outbound/FileTransferPacket';
import { FlashPartFileTransferPacket } from './packets/outbound/FlashPartFileTransferPacket';
import { OutboundPacket } from './packets/outbound/OutboundPacket';
import { PitFilePacket, PitFileRequest } from './packets/outbound/PitFilePacket';
import { SendFilePartPacket } from './packets/outbound/SendFilePartPacket';
import { ByteArray } from './utils/ByteArray';

const USB_CLASS_CDC_DATA = 0x0A;

export type DeviceOptions = {
  logging: boolean;
}

export class SamsungDevice {
  usbDevice: USBDevice;
  outEndpointNum = -1;
  inEndpointNum = -1;
  deviceOptions: DeviceOptions;

  _fileTransferSequenceMaxLength = 800;
	_fileTransferPacketSize = 131072;

  constructor (usbDevice: USBDevice, options?: DeviceOptions) {
    this.usbDevice = usbDevice;

    if (!options) {
      this.deviceOptions = {
        logging: false
      };
    } else {
      this.deviceOptions = options;
    }
  }

  onDisconnect (callback: () => void) {
    const eventHandler = (event: USBConnectionEvent) => {
      if (event.device === this.usbDevice) {
        callback();
        navigator.usb.removeEventListener('disconnect', eventHandler);
      }
    };
    navigator.usb.addEventListener('disconnect', eventHandler);
  }

  async initialize () {
    try {
      await this.usbDevice.open();
      
      if (!this.usbDevice.configuration) {
        await this.usbDevice.selectConfiguration(1);
      }

      const interfaceNum = this.usbDevice.configuration?.interfaces.find(iface => 
        iface.alternate.endpoints.length === 2 &&
        iface.alternate.interfaceClass === USB_CLASS_CDC_DATA
      )?.interfaceNumber ?? -1;

      if (this.usbDevice.configuration == null || interfaceNum < 0) {
        throw new Error('Unable to select the proper configuration');
      }

      const usbInterface = this.usbDevice.configuration.interfaces[interfaceNum];
      const altEndpoints = usbInterface.alternate.endpoints;

      this.outEndpointNum = altEndpoints.find(endpoint => endpoint.direction === 'out')?.endpointNumber || -1;
      this.inEndpointNum = altEndpoints.find(endpoint => endpoint.direction === 'in')?.endpointNumber || -1;

      if (this.outEndpointNum === -1 || this.inEndpointNum === -1) {
        throw new Error('Unable to locate the bulk command endpoints');
      }

      await this.usbDevice.claimInterface(interfaceNum);
      await this.usbDevice.selectAlternateInterface(interfaceNum, 0);
    } catch (errorMsg) {
      console.log(errorMsg);
      throw new Error('Unable to open and claim device');
    }

    return this.handshake();
  }

  async handshake () {
    // Samsung are Norse mythology fans, I guess?
    const helloMsg = 'ODIN';
    const acknowledgeMsg = 'LOKE';

    const outResult = await this.usbDevice.transferOut(this.outEndpointNum, ByteArray.fromString(helloMsg));
    this.deviceOptions.logging && console.log(`sent: ${helloMsg}, status: ${outResult.status}`);
    if (outResult.status !== 'ok') {
      throw new Error(`handshake transmit status ${outResult.status}`);
    }

    const inResult = await this.usbDevice.transferIn(this.inEndpointNum, 7);
    if (inResult.data == null || inResult.status !== 'ok') {
      throw new Error(`handshake response status ${inResult.status}`);
    }

    const stringResult = ByteArray.toString(new Uint8Array(inResult.data.buffer));

    this.deviceOptions.logging && console.log(`received: ${stringResult}`)
    if (stringResult !== acknowledgeMsg) {
      throw new Error('handshake challenge mismatch');
    }
  }

  async close () {
    await this.usbDevice.close();
  }

  async sendPacket (packet: OutboundPacket) {
    packet.pack();
    return this.usbDevice.transferOut(this.outEndpointNum, packet.data)
      .then(result => {
        this.deviceOptions.logging && console.log('sendPacket', result);
        return result;
      });
  }

  async receivePacket (packet: InboundPacket) {
    const data = await this.usbDevice.transferIn(this.inEndpointNum, packet.size);
    this.deviceOptions.logging && console.log('receivePacket', data);

    if (data.data == null || data.status !== 'ok') {
      throw new Error('receivePacket failed');
    }

    if (data.data?.byteLength !== packet.size && !packet.sizeVariable) {
      throw new Error('incorrect size received');
    }
    packet.data = new Uint8Array(data.data.buffer);
    packet.receivedSize = data.data.byteLength;

    packet.unpack();
  }
  
  async _emptyReceive () {
    await this.usbDevice.transferIn(this.inEndpointNum, 1);
  }

  async _emptySend () {
    await this.usbDevice.transferOut(this.inEndpointNum, new Uint8Array());
  }

  async requestDeviceType () {
    await this.sendPacket(new DeviceTypePacket());

    const responsePacket = new SessionSetupResponse();
    await this.receivePacket(responsePacket);
  }

  async getPitData () : Promise<PitData> {
    await this.sendPacket(new PitFilePacket(PitFileRequest.Dump));

    const dumpResponse = new PitFileResponse();
    await this.receivePacket(dumpResponse);

    const fileSize = dumpResponse.fileSize;

    const transferCount = Math.ceil(fileSize / ReceiveFilePartPacket.dataSize);

    const buffer = new ArrayBuffer(fileSize);
    const fileData = new Uint8Array(buffer);
    let offset = 0;

    for (let i = 0; i < transferCount; i++) {
      this.deviceOptions.logging && console.log(`receivePitFile: sending partial packet ${i+1} of ${transferCount}`);
      await this.sendPacket(new DumpPartPitFilePacket(i));
      
      const receivePitPartResponse = new ReceiveFilePartPacket();

      await this.receivePacket(receivePitPartResponse);

      // Copy all of the packet data into the buffer.
      fileData.set(receivePitPartResponse.data, offset);
      offset += receivePitPartResponse.receivedSize;
    }

    await this._emptyReceive();
    
    await this.sendPacket(new PitFilePacket(PitFileRequest.EndTransfer));
    
    const pitFileResponse = new PitFileResponse();
    await this.receivePacket(pitFileResponse);

    const pitData = new PitData();
    pitData.unpack(fileData);
    return pitData;
  }
  
  async beginSession () {
    await this.sendPacket(new BeginSessionPacket());
    
    const beginSessionResponse = new SessionSetupResponse();
    await this.receivePacket(beginSessionResponse);

    const defaultPacketSize = beginSessionResponse.result;

    // 0 means changing the packet size is not supported.
    if (defaultPacketSize === 0) {
      return;
    }

    this._fileTransferPacketSize = 1048576; // 1 MiB
		this._fileTransferSequenceMaxLength = 30; // Therefore, packetSize * sequenceMaxLength == 30 MiB per sequence.

    await this.sendPacket(new FilePartSizePacket(this._fileTransferPacketSize))

    const filePartSizeResponse = new SessionSetupResponse();

		await this.receivePacket(filePartSizeResponse);

    if (filePartSizeResponse.result !== 0) {
			throw new Error(`Unexpected file part size response!, Expected: 0, Received: ${filePartSizeResponse.result}`);
		}
  }

  async endSession (reboot?: boolean) {
    await this.sendPacket(new EndSessionPacket(reboot ? EndSessionRequest.RebootDevice : EndSessionRequest.EndSession));
    const responsePacket = new ResponsePacket(ResponseType.EndSession);
    await this.receivePacket(responsePacket);
  }

  async reboot () {
    await this.endSession(true);
  }

  async sendFile(fileData: Uint8Array, destination: FileTransferDestination, deviceType: number, fileIdentifier: number) {
    if (destination === FileTransferDestination.Modem && !fileIdentifier) {
      throw new Error('The modem file does not have an identifier!');
    }

    await this.sendPacket(new FileTransferPacket(FileTransferRequest.Flash));

    const fileSize = fileData.length;

    let fileTransferResponse = new ResponsePacket(ResponseType.FileTransfer);
    await this.receivePacket(fileTransferResponse);

    let sequenceCount = fileSize / (this._fileTransferSequenceMaxLength * this._fileTransferPacketSize);
    let lastSequenceSize = this._fileTransferSequenceMaxLength;
    const partialPacketByteCount = fileSize % this._fileTransferPacketSize;

    if (fileSize % (this._fileTransferSequenceMaxLength * this._fileTransferPacketSize) != 0)
    {
      sequenceCount++;
  
      const lastSequenceBytes = fileSize % (this._fileTransferSequenceMaxLength * this._fileTransferPacketSize);
      lastSequenceSize = lastSequenceBytes / this._fileTransferPacketSize;
  
      if (partialPacketByteCount !== 0) {
        lastSequenceSize++;
      }
    }

    let bytesTransferred = 0;

    for (let sequenceIndex = 0; sequenceIndex < sequenceCount; sequenceIndex++) {
      const isLastSequence = (sequenceIndex == sequenceCount - 1);
      const sequenceSize = (isLastSequence) ? lastSequenceSize : this._fileTransferSequenceMaxLength;
      const sequenceTotalByteCount = sequenceSize * this._fileTransferPacketSize;

      await this.sendPacket(new FlashPartFileTransferPacket(sequenceTotalByteCount));

      await this.receivePacket(new ResponsePacket(ResponseType.FileTransfer));

      for (let filePartIndex = 0; filePartIndex < sequenceSize; filePartIndex++) {
        if (filePartIndex !== 0) {
          await this._emptyReceive();
        }

        await this.sendPacket(new SendFilePartPacket(fileData, this._fileTransferPacketSize));

        const sendFilePartResponse = new SendFilePartResponse();
        await this.receivePacket(sendFilePartResponse);
        
        const receivedPartIndex = sendFilePartResponse.partIndex;

        if (receivedPartIndex != filePartIndex) {
          throw new Error(`Expected file part index: ${filePartIndex} Received: ${receivedPartIndex}`);
        }

        bytesTransferred += this._fileTransferPacketSize;

        if (bytesTransferred > fileSize) {
          bytesTransferred = fileSize;
        }
      }

      const sequenceEffectiveByteCount = (isLastSequence && partialPacketByteCount != 0) ?
        this._fileTransferPacketSize * (lastSequenceSize - 1) + partialPacketByteCount : sequenceTotalByteCount;

      if (destination === FileTransferDestination.Phone)
      {
        await this._emptySend();
        await this.sendPacket(new EndPhoneFileTransferPacket(sequenceEffectiveByteCount, 0, deviceType, fileIdentifier, isLastSequence));
        await this._emptySend();
      } else {
        await this._emptySend();
        await this.sendPacket(new EndModemFileTransferPacket(sequenceEffectiveByteCount, 0, deviceType, isLastSequence));
        await this._emptySend();
      }
    }

    fileTransferResponse = new ResponsePacket(ResponseType.FileTransfer);
		await this.receivePacket(fileTransferResponse);
  }
}
