import { PitData } from './libpit';
import { InboundPacket } from './packets/inbound/InboundPacket';
import { PitFileResponse } from './packets/inbound/PitFileResponse';
import { ReceiveFilePartPacket } from './packets/inbound/ReceiveFilePartPacket';
import { ResponsePacket, ResponseType } from './packets/inbound/ResponsePacket';
import { SessionSetupResponse } from './packets/inbound/SessionSetupResponse';
import { DeviceTypePacket } from './packets/outbound/DeviceTypePacket';
import { DumpPartPitFilePacket } from './packets/outbound/DumpPartPitFilePacket';
import { EndSessionPacket, EndSessionRequest } from './packets/outbound/EndSessionPacket';
import { OutboundPacket } from './packets/outbound/OutboundPacket';
import { PitFilePacket, PitFileRequest } from './packets/outbound/PitFilePacket';
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
  
  async emptyReceive () {
    await this.usbDevice.transferIn(this.inEndpointNum, 1);
  }

  async reboot () {
    await this.sendPacket(new EndSessionPacket(EndSessionRequest.RebootDevice));
    const responsePacket = new ResponsePacket(ResponseType.EndSession);
    await this.receivePacket(responsePacket);
  }

  async requestDeviceType () {
    await this.sendPacket(new DeviceTypePacket());

    const responsePacket = new SessionSetupResponse();
    await this.receivePacket(responsePacket);
  }

  async receivePitFile () {
    await this.sendPacket(new PitFilePacket(PitFileRequest.Dump));

    const dumpResponse = new PitFileResponse();
    await this.receivePacket(dumpResponse);

    const fileSize = dumpResponse.fileSize;

    const transferCount = Math.ceil(fileSize / ReceiveFilePartPacket.dataSize);

    const buffer = new ArrayBuffer(fileSize);
    const fileData = new Uint8Array(buffer);
    let offset = 0;

    for (let i = 0; i < transferCount; i++) {
      console.log(`receivePitFile: sending partial packet ${i+1} of ${transferCount}`);
      await this.sendPacket(new DumpPartPitFilePacket(i));
      
      const receivePitPartResponse = new ReceiveFilePartPacket();

      await this.receivePacket(receivePitPartResponse);

      // Copy all of the packet data into the buffer.
      fileData.set(receivePitPartResponse.data, offset);
      offset += receivePitPartResponse.receivedSize;
    }
    await this.emptyReceive();
    
    await this.sendPacket(new PitFilePacket(PitFileRequest.EndTransfer));
    
    const pitFileResponse = new PitFileResponse();
    await this.receivePacket(pitFileResponse);

    const pitData = new PitData();
    pitData.unpack(fileData);
    return pitData;
  }
}