import { requestDevice } from '../src/helpers';
import { mockEmptyNavigator, mockUnavailableWebUsb, mockWebUsb } from './jest-utils/usbMocks';

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

    // todo - use mock device instead of null
    requestDeviceMock.mockResolvedValue(null);

    await expect(requestDevice()).resolves.toBeTruthy();
  });
});