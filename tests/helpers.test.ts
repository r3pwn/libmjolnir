import { requestDevice } from '../src/helpers';
import { mockEmptyNavigator, mockUnavailableWebUsb, mockUsbDevice, mockWebUsb } from './jest-utils/usbMocks';

describe('requestDevice', () => {
  beforeAll(() => {
    mockEmptyNavigator();
  });

  test('throws an error if browser does not support webUSB', async () => {
    mockUnavailableWebUsb()

    await expect(requestDevice()).rejects.toBeTruthy();
  });

  test('returns a device after one is connected and selected', async () => {
    const { requestDeviceMock } = mockWebUsb()

    requestDeviceMock.mockResolvedValue(mockUsbDevice());

    await expect(requestDevice()).resolves.toBeTruthy();
  });
});