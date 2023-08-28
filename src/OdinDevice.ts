import { PitData } from './libpit';
import { InboundPacket } from './packets/inbound/InboundPacket';
import { PitFileResponse } from './packets/inbound/PitFileResponse';
import { EndSessionResponse } from './packets/inbound/EndSessionResponse';
import { ReceiveFilePartPacket } from './packets/inbound/ReceiveFilePartPacket';
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
import { timeoutPromise } from './utils/timeoutPromise';
import { FileTransferResponse } from './packets/inbound/FileTransferResponse';

export type DeviceOptions = {
  logging: boolean;
  timeout: number;
}

export type EmptyPacketOptions = {
  timeout?: number;
}

const USB_CLASS_CDC_DATA = 0x0A;

const DEFAULT_DEVICE_OPTIONS = {
  logging: true,
  timeout: 5000
} as DeviceOptions;

export class OdinDevice {
  usbDevice: USBDevice;
  outEndpointNum = -1;
  inEndpointNum = -1;
  deviceOptions: DeviceOptions;
  
  _devicePit?: PitData;

  _fileTransferSequenceMaxLength = 800;
	_fileTransferPacketSize = 131072;

  constructor (usbDevice: USBDevice, options?: Partial<DeviceOptions>) {
    this.usbDevice = usbDevice;
    this.deviceOptions = DEFAULT_DEVICE_OPTIONS;

    if (options) {
      this.deviceOptions = Object.assign(DEFAULT_DEVICE_OPTIONS, options);
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
      await timeoutPromise(
        this.usbDevice.open(),
        '[initialize] unable to open device handle',
        this.deviceOptions.timeout
      );
      
      if (!this.usbDevice.configuration) {
        await timeoutPromise(
          this.usbDevice.selectConfiguration(1),
          '[initialize] unable to select device configuration',
          this.deviceOptions.timeout
        );
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

      await timeoutPromise(
        this.usbDevice.claimInterface(interfaceNum),
        '[initialize] unable to claim device interface',
        this.deviceOptions.timeout
      );
      await timeoutPromise(
        this.usbDevice.selectAlternateInterface(interfaceNum, 0),
        '[initialize] unable to select device\'s ODIN interface',
        this.deviceOptions.timeout
      );
    } catch (errorMsg) {
      this.deviceOptions.logging && console.log(errorMsg);
      throw new Error('Unable to open and claim device');
    }

    return this.handshake();
  }

  async handshake () {
    // Samsung are Norse mythology fans, I guess?
    const helloMsg = 'ODIN';
    const acknowledgeMsg = 'LOKE';

    const outResult = await timeoutPromise(
      this.usbDevice.transferOut(this.outEndpointNum, ByteArray.fromString(helloMsg)),
      '[handshake] unable to send ODIN handshake',
      this.deviceOptions.timeout
    );
    this.deviceOptions.logging && console.log(`sent: ${helloMsg}, status: ${outResult.status}`);
    if (outResult.status !== 'ok') {
      throw new Error(`handshake transmit status ${outResult.status}`);
    }

    const inResult = await timeoutPromise(
      this.usbDevice.transferIn(this.inEndpointNum, 7),
      '[handshake] unable to receive ODIN handshake response',
      this.deviceOptions.timeout
    );
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
    await timeoutPromise(
      this.usbDevice.close(),
      '[close] unable to close device',
      this.deviceOptions.timeout
    );
  }

  async sendPacket (packet: OutboundPacket) {
    packet.pack();

    this.deviceOptions.logging && console.log('sending', packet);

    return await timeoutPromise(
      this.usbDevice.transferOut(this.outEndpointNum, packet.data),
      '[device] unable to send packet',
      this.deviceOptions.timeout
    ).then(result => {
      this.deviceOptions.logging && console.log('sendPacket response', result);
      return result;
    });
  }

  async receivePacket <T extends InboundPacket> (type: { new(): T }): Promise<T> {
    const packet = new type();

    const data = await timeoutPromise(
      this.usbDevice.transferIn(this.inEndpointNum, packet.size),
      '[device] unable to receive packet from device',
      this.deviceOptions.timeout
    )
    this.deviceOptions.logging && console.log('received packet', packet);

    if (data.data == null || data.status !== 'ok') {
      throw new Error('receivePacket failed');
    }

    if (data.data?.byteLength !== packet.size && !packet.sizeVariable) {
      throw new Error('incorrect size received');
    }
    packet.data = new Uint8Array(data.data.buffer);
    packet.receivedSize = data.data.byteLength;

    packet.unpack();
    return packet;
  }

  async requestDeviceType () {
    await this.sendPacket(new DeviceTypePacket());
    await this.receivePacket(SessionSetupResponse);
  }
  
  async beginSession () {
    await this.sendPacket(new BeginSessionPacket());
    
    const beginSessionResponse = await this.receivePacket(SessionSetupResponse);

    const defaultPacketSize = beginSessionResponse.result;

    // 0 means changing the packet size is not supported.
    if (defaultPacketSize === 0) {
      return;
    }

    this._fileTransferPacketSize = 1048576; // 1 MiB
		this._fileTransferSequenceMaxLength = 30; // Therefore, packetSize * sequenceMaxLength == 30 MiB per sequence.

    await this.sendPacket(new FilePartSizePacket(this._fileTransferPacketSize))

    const filePartSizeResponse = await this.receivePacket(SessionSetupResponse);

    if (filePartSizeResponse.result !== 0) {
			throw new Error(`Unexpected file part size response!, Expected: 0, Received: ${filePartSizeResponse.result}`);
		}
  }

  async endSession (reboot?: boolean) {
    await this.sendPacket(new EndSessionPacket(reboot ? EndSessionRequest.RebootDevice : EndSessionRequest.EndSession));
    await this.receivePacket(EndSessionResponse);
  }

  async reboot () {
    await this.endSession(true);
  }
  
  async getPitData () : Promise<PitData> {
    await this.sendPacket(new PitFilePacket(PitFileRequest.Dump));

    const dumpResponse = await this.receivePacket(PitFileResponse);

    const fileSize = dumpResponse.fileSize;

    const transferCount = Math.ceil(fileSize / ReceiveFilePartPacket.dataSize);

    const buffer = new ArrayBuffer(fileSize);
    const fileData = new Uint8Array(buffer);
    let offset = 0;

    for (let i = 0; i < transferCount; i++) {
      this.deviceOptions.logging && console.log(`getPitData: sending partial packet ${i+1} of ${transferCount}`);
      await this.sendPacket(new DumpPartPitFilePacket(i));
      
      const receivePitPartResponse = await this.receivePacket(ReceiveFilePartPacket);

      // Copy all of the packet data into the buffer.
      fileData.set(receivePitPartResponse.data, offset);
      offset += receivePitPartResponse.receivedSize;
    }

    try {
      await this._emptyReceive({ timeout: 500 });
    } catch {
      console.info('getPitData: empty receive failed, continuing anyways...');
    }
    
    try {
      await this.sendPacket(new PitFilePacket(PitFileRequest.EndTransfer));
      await this.receivePacket(PitFileResponse);
    } catch {
      console.info('getPitData: failed to fully end PIT transfer session, continuing anyways...');
    }

    const pitData = new PitData();
    pitData.unpack(fileData);

    this._devicePit = pitData;
    return pitData;
  }

  async erasePartition(partitionName: string) {
    if (!this._devicePit) {
      await this.getPitData();
    }
    
    const entry = this._devicePit?.findEntryByName(partitionName);

    if (!entry) {
      throw new Error(`erasePartition: device PIT does not have a partition named ${partitionName}`);
    }

    await this.sendFile(new Uint8Array(entry.fileSize), FileTransferDestination.Phone, entry.deviceType, entry.identifier);
  }

  async sendFile(fileData: Uint8Array, destination: FileTransferDestination, deviceType: number, fileIdentifier: number) {
    if (destination === FileTransferDestination.Modem && !fileIdentifier) {
      throw new Error('The modem file does not have an identifier!');
    }

    await this.sendPacket(new FileTransferPacket(FileTransferRequest.Flash));

    const fileSize = fileData.length;
    await this.receivePacket(FileTransferResponse);

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
      await this.receivePacket(FileTransferResponse);

      for (let filePartIndex = 0; filePartIndex < sequenceSize; filePartIndex++) {
        if (filePartIndex !== 0) {
          await this._emptyReceive();
        }

        await this.sendPacket(new SendFilePartPacket(fileData, this._fileTransferPacketSize));

        const sendFilePartResponse = await this.receivePacket(SendFilePartResponse);
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

    await this.receivePacket(FileTransferResponse);
  }

  async _emptySend (options?: EmptyPacketOptions) {
    await timeoutPromise(
      this.usbDevice.transferOut(this.inEndpointNum, new Uint8Array()),
      '[device] device did not respond to empty send',
      options?.timeout ?? this.deviceOptions.timeout
    );
  }
    
  async _emptyReceive (options?: EmptyPacketOptions) {
    await timeoutPromise(
      this.usbDevice.transferIn(this.inEndpointNum, 1),
      '[device] device did not respond to empty receive',
      options?.timeout ?? this.deviceOptions.timeout
    );
  }
}
