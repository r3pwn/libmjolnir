import { DeviceOptions, OdinDevice } from './OdinDevice';
import constants from './constants';

export const requestDevice = async function (options?: Partial<DeviceOptions>) {
  if (!navigator.usb) {
    return Promise.reject('Browser missing WebUSB feature');
  }
  return navigator.usb.requestDevice({ filters: constants.UsbConstants.DeviceFilters })
  .then(device => {
    return new OdinDevice(device, options);
  });
};