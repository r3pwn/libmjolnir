import { DeviceOptions, OdinDevice } from './OdinDevice';
import constants from './constants';

/**
 * Attempts to connect to a device in Odin mode via WebUSB
 * @param options - configuration options which will get passed to the returned device
\ */
export const requestDevice = async function (options?: Partial<DeviceOptions>) {
  if (!navigator.usb) {
    return Promise.reject('Browser missing WebUSB feature');
  }
  return navigator.usb.requestDevice({ filters: constants.UsbConstants.DeviceFilters })
  .then(device => {
    return new OdinDevice(device, options);
  });
};