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