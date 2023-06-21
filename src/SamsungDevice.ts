import { InboundPacket } from './packets/inbound/InboundPacket';
import { ResponsePacket, ResponseType } from './packets/inbound/ResponsePacket';
import { SessionSetupResponse } from './packets/inbound/SessionSetupResponse';
import { DeviceTypePacket } from './packets/outbound/DeviceTypePacket';
import { EndSessionPacket, EndSessionRequest } from './packets/outbound/EndSessionPacket';
import { OutboundPacket } from './packets/outbound/OutboundPacket';
import { ByteArray } from './utils/ByteArray';

const USB_CLASS_CDC_DATA = 0x0A;

export class SamsungDevice {
  usbDevice: USBDevice;
  outEndpointNum = -1;
  inEndpointNum = -1;

  constructor (usbDevice: USBDevice) {
    this.usbDevice = usbDevice;
  }

  async initialize () {
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

    return this.handshake();
  }

  async handshake () {
    // Samsung are Norse mythology fans, I guess?
    const helloMsg = 'ODIN';
    const acknowledgeMsg = 'LOKE';

    const outResult = await this.usbDevice.transferOut(this.outEndpointNum, ByteArray.fromString(helloMsg));
    console.log(`sent: ${helloMsg}, status: ${outResult.status}`);
    if (outResult.status !== 'ok') {
      throw new Error(`handshake transmit status ${outResult.status}`);
    }

    const inResult = await this.usbDevice.transferIn(this.inEndpointNum, 7);
    if (inResult.data == null || inResult.status !== 'ok') {
      throw new Error(`handshake response status ${inResult.status}`);
    }

    const stringResult = ByteArray.toString(new Uint8Array(inResult.data.buffer));

    console.log(`received: ${stringResult}`)
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
      .then(result => { console.log(result); return result; });
  }

  async receivePacket (packet: InboundPacket) {
    const data = await this.usbDevice.transferIn(this.inEndpointNum, packet.size);
    console.log(data);

    if (data.data == null || data.status !== 'ok') {
      throw new Error('receivePacket failed');
    }

    if (data.data?.byteLength != packet.size && !packet.sizeVariable) {
      throw new Error('incorrect size received');
    }
    packet.data.set(new Uint8Array(data.data.buffer));
    packet.receivedSize = packet.size;

    packet.unpack();
  }

  async reboot () {
    await this.sendPacket(new EndSessionPacket(EndSessionRequest.RebootDevice));
    const responsePacket = new ResponsePacket(ResponseType.EndSession);
    await this.receivePacket(responsePacket);
    console.log(responsePacket);
  }

  async requestDeviceType () {
    const packet = new DeviceTypePacket()
    const result = await this.sendPacket(packet);
    console.log(result);

    const responsePacket = new SessionSetupResponse();
    await this.receivePacket(responsePacket);
    console.log(responsePacket);
  }
}