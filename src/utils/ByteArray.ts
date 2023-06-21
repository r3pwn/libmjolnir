export const ByteArray = {
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

  toString (byteData: Uint8Array) {
    return byteData
      .filter(code => code !== 0)
      .reduce((prev, current) => `${prev}${String.fromCharCode(current)}`, '');
  }
}