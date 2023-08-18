export const mockEmptyNavigator = () => {
  Object.defineProperty(global, 'navigator', {
    value: {}
  });
}

export const mockUnavailableWebUsb = () => {
  Object.defineProperty(global.navigator, 'usb', {
    value: null,
    configurable: true
  });
};

export const mockWebUsb = () => {
  const requestDeviceMock = jest.fn();

  const usb = {
    requestDevice: requestDeviceMock
  };

  Object.defineProperty(global.navigator, 'usb', {
    value: usb,
    configurable: true
  });

  return { requestDeviceMock };
};

export const mockUsbDevice = () => {
  const open = jest.fn();
  const selectConfiguration = jest.fn();
  const claimInterface = jest.fn();
  const selectAlternateInterface = jest.fn();
  const transferOut = jest.fn();
  const transferIn = jest.fn();
  const close = jest.fn();

  return {
    open,
    selectConfiguration,
    claimInterface,
    selectAlternateInterface,
    transferOut,
    transferIn,
    close
  };
}