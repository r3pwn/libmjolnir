export class BasePacket {
  size: number;
  data: Uint8Array;
  _buffer: ArrayBuffer;

  constructor(size: number) {
    this.size = size;
    this._buffer = new ArrayBuffer(size);
    this.data = new Uint8Array(this._buffer);
  }
}