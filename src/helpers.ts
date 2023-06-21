import { SamsungDevice } from './SamsungDevice';
import constants from './constants';

export const requestDevice = async function () {
  if (!navigator.usb) {
    return Promise.reject('Browser missing WebUSB feature');
  }
  return navigator.usb.requestDevice({ filters: constants.UsbConstants.DeviceFilters })
  .then(device => {
    return new SamsungDevice(device);
  });
};