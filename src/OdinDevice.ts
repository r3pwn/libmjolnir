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
import { timeoutPromise } from './utils/helpers';
import { FileTransferResponse } from './packets/inbound/FileTransferResponse';
import { TotalBytesPacket } from './packets/outbound/TotalBytesPacket';
import { EraseUserdataPacket } from './packets/outbound/EraseUserdataPacket';
import { EmptyTransferFlags } from './constants';

export type DeviceOptions = {
  /** whether to enable additional logging (basic logging is already enabled) */
  logging: boolean;
  /** the number of milliseconds to time out after */
  timeout: number;
  /** some OSes (like Ubuntu) have an issue with libusb that requires a reset call to be made on initialization */
  resetOnInit: boolean;
}

const USB_CLASS_CDC_DATA = 0x0A;

const EMPTY_TRANSFER_TIMEOUT = 100;

const DEFAULT_DEVICE_OPTIONS = {
  logging: false,
  timeout: 5000,
  resetOnInit: false
} as DeviceOptions;

export class OdinDevice {
  usbDevice: USBDevice;
  outEndpointNum = -1;
  inEndpointNum = -1;
  deviceOptions: DeviceOptions;
  
  _devicePit?: PitData;

  /** The amount of time to wait for flash packets (per packet, in milliseconds) */
  _flashTimeout = 30_000;
  _flashSequence = 240;
  /** The maximum packet size for flash packets */
	_flashPacketSize = 131072;

  _flashSessionStarted = false;

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
        this._flashSessionStarted = false;
        navigator.usb.removeEventListener('disconnect', eventHandler);
      }
    };
    navigator.usb.addEventListener('disconnect', eventHandler);
  }

  /**
   * Open and claim the device, and perform the Odin handshake
   */
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

      let interfaceNum = -1;
      let altInterfaceNum = -1;

      if (!this.usbDevice.configuration) {
        throw new Error('Unable to select the proper configuration');
      }

      const usbConfiguration = this.usbDevice.configuration;

      for (const interfaceIndex in usbConfiguration.interfaces) {
        const usbInterface = usbConfiguration.interfaces[interfaceIndex];

        for (const altIndex in usbInterface.alternates) {
          const altInterface = usbInterface.alternates[altIndex];

          const outEndpoint = altInterface.endpoints.find(endpoint => endpoint.direction === 'out')?.endpointNumber || -1;
          const inEndpoint = altInterface.endpoints.find(endpoint => endpoint.direction === 'in')?.endpointNumber || -1;
  
          if (altInterface.endpoints.length === 2 && altInterface.interfaceClass === USB_CLASS_CDC_DATA &&
            outEndpoint != -1 && inEndpoint != -1)
          {
            altInterfaceNum = Number(altIndex);
            this.outEndpointNum = outEndpoint;
            this.inEndpointNum = inEndpoint;
            break;
          }
        }

        if (altInterfaceNum !== -1) {
          interfaceNum = Number(interfaceIndex);
          break;
        }
      }

      if (this.outEndpointNum === -1 || this.inEndpointNum === -1) {
        throw new Error('Unable to locate the bulk command endpoints');
      }

      await timeoutPromise(
        this.usbDevice.claimInterface(interfaceNum),
        '[initialize] unable to claim device interface',
        this.deviceOptions.timeout
      );

      if (altInterfaceNum !== 0) {
        await timeoutPromise(
          this.usbDevice.selectAlternateInterface(interfaceNum, 0),
          '[initialize] unable to select device\'s ODIN interface',
          this.deviceOptions.timeout
        );
      }
    } catch (errorMsg) {
      this.deviceOptions.logging && console.log(errorMsg);
      throw new Error('Unable to open and claim device');
    }

    return this.handshake();
  }

  /**
   * Perform the Odin handshake, required for any Odin operations
   */
  async handshake () {
    // Samsung are Norse mythology fans, I guess?
    const helloMsg = 'ODIN';
    const acknowledgeMsg = 'LOKE';

    if (this.deviceOptions.resetOnInit) {
      await timeoutPromise(
        this.usbDevice.reset(),
        '[handshake] unable to reset device',
        this.deviceOptions.timeout
      );
    }

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

  async requestDeviceType () {
    await this.sendPacket(new DeviceTypePacket());
    await this.receivePacket(SessionSetupResponse);
  }
  
  /**
   * Begin a session on the device. This is a pre-requisite for many Odin operations
   */
  async beginSession (forceBegin = false) {
    // ensure a flash session has not already been started
    if (this._flashSessionStarted && !forceBegin) {
      return;
    }

    await this.sendPacket(new BeginSessionPacket());
    
    const beginSessionResponse = await this.receivePacket(SessionSetupResponse);

    const defaultPacketSize = beginSessionResponse.result;

    // version 2 and above allow us to negotiate the packet size
    if (defaultPacketSize >= 2) {
      this._flashTimeout = 120_000
      await this.setFlashPacketSize(1048576, 30);
    }

    this._flashSessionStarted = true;
  }

  /**
   * Tells the device to accept a specific packet size for flash operations.
   * 
   * Note: This is not supported on all devices.
   */
  async setFlashPacketSize (packetSize: number, sequence: number) {
    await this.sendPacket(new FilePartSizePacket(packetSize))
    
    const filePartSizeResponse = await this.receivePacket(SessionSetupResponse);
    
    if (filePartSizeResponse.result !== 0) {
      throw new Error(`Unexpected file part size response!, Expected: 0, Received: ${filePartSizeResponse.result}`);
		}

    this._flashPacketSize = packetSize;
    this._flashSequence = sequence;
  }

  /**
   * Tells the device the size of the payload you wish to send it
   */
  async setFlashTotalSize (totalSize: number) {
    await this.sendPacket(new TotalBytesPacket(totalSize));
    
    const fileTotalSizeResponse = await this.receivePacket(SessionSetupResponse);
    
    if (fileTotalSizeResponse.result !== 0) {
      throw new Error(`Unexpected file part size response!, Expected: 0, Received: ${fileTotalSizeResponse.result}`);
		}
  }

  /**
   * Ends the current flash session
   * @param reboot - whether to reboot the device
   */
  async endSession (reboot = false, forceEnd = false) {
    // ensure a flash session has been started
    if (!this._flashSessionStarted && !forceEnd) {
      return;
    }
    await this.sendPacket(new EndSessionPacket(reboot ? EndSessionRequest.RebootDevice : EndSessionRequest.EndSession));
    await this.receivePacket(EndSessionResponse);
    this._flashSessionStarted = false;
  }

  /**
   * Reboots the device, ending the current flash session if one is in progress
   */
  async reboot () {
    await this.endSession(true, true);
  }
  
  /**
   * Returns the device's partion table in Samsung's "PIT" format
   */
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
      await this.sendPacket(new DumpPartPitFilePacket(i), undefined, EmptyTransferFlags.None);
      
      const receivePitPartResponse = await this.receivePacket(ReceiveFilePartPacket);

      // Copy all of the packet data into the buffer.
      fileData.set(receivePitPartResponse.data, offset);
      offset += receivePitPartResponse.receivedSize;
    }

    await this._emptyReceive();
    
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

  /**
   * Flash a file to the specified partition
   * @param {string} partitionName - the name of the partition to be flashed
   * @param {Uint8Array} fileData - the data to flash to the partition
   */
  async flashPartition(partitionName: string, fileData: Uint8Array) {
    await this.beginSession();

    if (!this._devicePit) {
      await this.getPitData();
    }
    
    const entry = this._devicePit?.findEntryByName(partitionName);

    if (!entry) {
      throw new Error(`erasePartition: device PIT does not have a partition named ${partitionName}`);
    }

    await this.setFlashTotalSize(fileData.byteLength);
    await this.sendFile(fileData, FileTransferDestination.Phone, entry.deviceType, entry.identifier);
    
    await this.endSession();
  }

  /**
   * Tells Odin to erase the device's userdata.
   */
  async eraseUserdata() {
    await this.sendPacket(new EraseUserdataPacket());
    await this.receivePacket(SessionSetupResponse);
  }

  /**
   * Flash a file to a device
   * @param fileData - a byte array of the file's contents
   * @param destination - whether this is a normal flash, or a modem flash
   * @param deviceType - the partition's "deviceType"
   * @param fileIdentifier - the partition ID you wish to flash to
   */
  async sendFile(fileData: Uint8Array, destination: FileTransferDestination, deviceType: number, fileIdentifier: number) {
    if (destination === FileTransferDestination.Modem && !fileIdentifier) {
      throw new Error('The modem file does not have an identifier!');
    }

    await this.sendPacket(new FileTransferPacket(FileTransferRequest.Flash));
    await this.receivePacket(FileTransferResponse);
    
    const fileSize = fileData.length;

    let sequenceCount = Math.floor(fileSize / (this._flashSequence * this._flashPacketSize));
    let lastSequenceSize = this._flashSequence;
    const partialPacketByteCount = fileSize % this._flashPacketSize;

    if (fileSize % (this._flashSequence * this._flashPacketSize) !== 0)
    {
      sequenceCount++;
  
      const lastSequenceBytes = fileSize % (this._flashSequence * this._flashPacketSize);
      lastSequenceSize = Math.floor(lastSequenceBytes / this._flashPacketSize);
  
      if (partialPacketByteCount !== 0) {
        lastSequenceSize++;
      }
    }

    let startOffset = 0;
    let endOffset = this._flashPacketSize;

    for (let sequenceIndex = 0; sequenceIndex < sequenceCount; sequenceIndex++) {
      console.log(`sending sequence ${sequenceIndex + 1} of ${sequenceCount}`);
      const isLastSequence = sequenceIndex === (sequenceCount - 1);
      const sequenceSize = (isLastSequence) ? lastSequenceSize : this._flashSequence;
      const sequenceTotalByteCount = sequenceSize * this._flashPacketSize;

      await this.sendPacket(new FlashPartFileTransferPacket(sequenceTotalByteCount), this._flashTimeout);
      await this.receivePacket(FileTransferResponse, this._flashTimeout);


      for (let filePartIndex = 0; filePartIndex < sequenceSize; filePartIndex++) {
        console.log(`sending part ${filePartIndex + 1} of ${sequenceSize}`);

        if (filePartIndex !== 0) {
          await this._emptySend();
        }

        await this.sendPacket(new SendFilePartPacket(fileData.slice(startOffset, endOffset), this._flashPacketSize), this._flashTimeout, EmptyTransferFlags.None);

        const sendFilePartResponse = await this.receivePacket(SendFilePartResponse, this._flashTimeout);
        const receivedPartIndex = sendFilePartResponse.partIndex;

        if (receivedPartIndex !== filePartIndex) {
          throw new Error(`Expected file part index: ${filePartIndex} Received: ${receivedPartIndex}`);
        }

        startOffset += this._flashPacketSize;
        endOffset += this._flashPacketSize;

        if (startOffset > fileSize) {
          startOffset = fileSize;
        }
        if (endOffset > fileSize) {
          endOffset = fileSize;
        }
      }

      const sequenceEffectiveByteCount = (isLastSequence && partialPacketByteCount != 0) ?
        this._flashPacketSize * (lastSequenceSize - 1) + partialPacketByteCount : sequenceTotalByteCount;

      if (destination === FileTransferDestination.Phone)
      {
        await this.sendPacket(
          new EndPhoneFileTransferPacket(sequenceEffectiveByteCount, 0, deviceType, fileIdentifier, isLastSequence),
          undefined,
          EmptyTransferFlags.Both
        );
      } else {
        await this.sendPacket(
          new EndModemFileTransferPacket(sequenceEffectiveByteCount, 0, deviceType, isLastSequence),
          undefined,
          EmptyTransferFlags.Both
        );
      }
      
      await this.receivePacket(FileTransferResponse);
    }
  }

  async sendPacket (packet: OutboundPacket, timeout?: number, emptyTransferFlags = EmptyTransferFlags.After) {
    packet.pack();

    if (emptyTransferFlags & EmptyTransferFlags.Before) {
      await this._emptySend();
    }

    this.deviceOptions.logging && console.log('sending', packet);

    const sendResult = await timeoutPromise(
      this.usbDevice.transferOut(this.outEndpointNum, packet.data),
      '[device] unable to send packet',
      timeout ?? this.deviceOptions.timeout
    ).then(result => {
      this.deviceOptions.logging && console.log('sendPacket response', result);
      return result;
    });

    if (emptyTransferFlags & EmptyTransferFlags.After) {
      await this._emptySend();
    }

    return sendResult;
  }

  async receivePacket <T extends InboundPacket> (type: { new(): T }, timeout?: number, emptyTransferFlags = EmptyTransferFlags.None): Promise<T> {
    if (emptyTransferFlags & EmptyTransferFlags.Before) {
      await this._emptyReceive();
    }

    const packet = new type();

    const data = await timeoutPromise(
      this.usbDevice.transferIn(this.inEndpointNum, packet.size),
      '[device] unable to receive packet from device',
      timeout ?? this.deviceOptions.timeout
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

    if (emptyTransferFlags & EmptyTransferFlags.After) {
      await this._emptyReceive();
    }

    return packet;
  }

  async _emptySend (timeout?: number) {
    try {
      await timeoutPromise(
        this.usbDevice.transferOut(this.outEndpointNum, new Uint8Array()),
        '[device] device did not respond to empty send, continuing...',
        timeout ?? EMPTY_TRANSFER_TIMEOUT
      );
    } catch (error) {
      console.warn(error);
    }
  }

  async _emptyReceive (timeout?: number) {
    try {
      await timeoutPromise(
        this.usbDevice.transferIn(this.inEndpointNum, 1),
        '[device] device did not respond to empty receive, continuing...',
        timeout ?? EMPTY_TRANSFER_TIMEOUT
      );
    } catch (error) {
      console.warn(error);
    }
  }
}
