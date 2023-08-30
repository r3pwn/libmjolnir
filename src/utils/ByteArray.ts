export const ByteArray = {
  /**
   * Encodes a string into a {@link Uint8Array} with a given size
   * @param message - the provided message
   * @param length - the size to make the byte array
   */
  fromString (message: string, length?: number) {
    if (length && message.length > length) {
      message = message.slice(0, length);
    }

    const buffer = new ArrayBuffer(length || message.length);
    const encoder = new TextEncoder();
    
    const byteArray = new Uint8Array(buffer);
    byteArray.set(encoder.encode(message));
    return byteArray;
  },

  /**
   * Decodes a provided byte array into a string, ignoring any `0x00`'s
   * @param byteData - the provided byte array
   */
  toString (byteData: Uint8Array) {
    return byteData
      .filter(code => code !== 0)
      .reduce((prev, current) => `${prev}${String.fromCharCode(current)}`, '');
  }
}