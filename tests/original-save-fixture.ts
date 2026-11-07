export class Writer {
  bytes: number[] = []
  u8 = (value: number) => {
    this.bytes.push(value & 255)
  }
  u16 = (value: number) => {
    this.u8(value)
    this.u8(value >> 8)
  }
  u32 = (value: number) => {
    this.u16(value)
    this.u16(value >> 16)
  }
  f32 = (value: number) => {
    const buffer = new ArrayBuffer(4)
    new DataView(buffer).setFloat32(0, value, true)
    this.bytes.push(...new Uint8Array(buffer))
  }
  text = (value: string, size: 8 | 16) => {
    if (size === 8) {
      this.u8(value.length)
    } else {
      this.u16(value.length)
    }
    for (const char of value) {
      this.u8(char.charCodeAt(0))
    }
  }
  name = (name: string) => {
    for (let n = 0; n < 7; ++n) {
      this.u16(n < name.length ? name.charCodeAt(n) - 65 : -1)
    }
  }
  buffer = () => new Uint8Array(this.bytes).buffer
}
export const saveFixture = (states: readonly { name: string; write: (writer: Writer) => void }[] = []): ArrayBuffer => {
  const w = new Writer()
  w.u32(0x1000c)
  w.u16(4)
  w.u16(1)
  w.u8(1)
  w.text('c_dbfrfny4', 8)
  w.text('lego red', 8)
  w.text('END_OF_VARIABLES', 8)
  for (let n = 0; n < 66; ++n) {
    w.u32(0)
    w.u32(0)
    for (let n = 0; n < 8; ++n) {
      w.u8(0)
    }
  }
  for (let n = 0; n < 81; ++n) {
    w.u8(0)
    w.u32(3)
    w.u32(0)
    w.u8(1)
    w.u8(2)
    w.u8(-1)
  }
  for (let n = 0; n < 16; ++n) {
    w.u32(4)
    w.u32(0)
    w.u8(1)
    w.u8(-1)
  }
  w.u8(0)
  w.u16(states.length)
  for (const state of states) {
    w.text(state.name, 16)
    state.write(w)
  }
  w.u16(46)
  return w.buffer()
}
