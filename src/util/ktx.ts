// KTX loader
// Modified from https://github.com/mrdoob/three.js/blob/dev/examples/js/loaders/KTXLoader.js

import Texture2D from '../Texture2D';

const HEADER_LEN = 12 + 13 * 4; // identifier + header elements (not including key value meta-data pairs)

function getUint32(buffer: Uint8Array, offset: number, littleEndian?: boolean) {
  let a;
  let b;
  let c;
  let d;
  if (littleEndian) {
    a = buffer[offset];
    b = buffer[offset + 1];
    c = buffer[offset + 2];
    d = buffer[offset + 3];
  } else {
    a = buffer[offset + 3];
    b = buffer[offset + 2];
    c = buffer[offset + 1];
    d = buffer[offset];
  }
  return ((d << 24) >>> 0) + ((c << 16) | (b << 8) | a);
}

export function parse(arraybuffer: ArrayBuffer, loadMipmaps?: boolean, out?: Texture2D) {
  const facesExpected = 1;
  // Test that it is a ktx formatted file, based on the first 12 bytes, character representation is:
  // '´', 'K', 'T', 'X', ' ', '1', '1', 'ª', '\r', '\n', '\x1A', '\n'
  // 0xAB, 0x4B, 0x54, 0x58, 0x20, 0x31, 0x31, 0xBB, 0x0D, 0x0A, 0x1A, 0x0A
  const data = new Uint8Array(arraybuffer);
  if (
    data[0] !== 0xab ||
    data[1] !== 0x4b ||
    data[2] !== 0x54 ||
    data[3] !== 0x58 ||
    data[4] !== 0x20 ||
    data[5] !== 0x31 ||
    data[6] !== 0x31 ||
    data[7] !== 0xbb ||
    data[8] !== 0x0d ||
    data[9] !== 0x0a ||
    data[10] !== 0x1a ||
    data[11] !== 0x0a
  ) {
    console.error('texture missing KTX identifier');
    return;
  }

  // load the reset of the header in native 32 bit uint
  const dataSize = Uint32Array.BYTES_PER_ELEMENT;
  const offset = 12;
  // const headerDataView = new DataView( this.arrayBuffer, 12, 13 * dataSize );
  const endianness = getUint32(data, offset, true);
  const littleEndian = endianness === 0x04030201;

  const glType = getUint32(data, offset + 1 * dataSize, littleEndian); // must be 0 for compressed textures
  const glTypeSize = getUint32(data, offset + 2 * dataSize, littleEndian); // must be 1 for compressed textures
  const glFormat = getUint32(data, offset + 3 * dataSize, littleEndian); // must be 0 for compressed textures
  const glInternalFormat = getUint32(data, offset + 4 * dataSize, littleEndian); // the value of arg passed to gl.compressedTexImage2D(,,x,,,,)
  const glBaseInternalFormat = getUint32(data, offset + 5 * dataSize, littleEndian); // specify GL_RGB, GL_RGBA, GL_ALPHA, etc (un-compressed only)
  const pixelWidth = getUint32(data, offset + 6 * dataSize, littleEndian); // level 0 value of arg passed to gl.compressedTexImage2D(,,,x,,,)
  const pixelHeight = getUint32(data, offset + 7 * dataSize, littleEndian); // level 0 value of arg passed to gl.compressedTexImage2D(,,,,x,,)
  const pixelDepth = getUint32(data, offset + 8 * dataSize, littleEndian); // level 0 value of arg passed to gl.compressedTexImage3D(,,,,,x,,)
  const numberOfArrayElements = getUint32(data, offset + 9 * dataSize, littleEndian); // used for texture arrays
  const numberOfFaces = getUint32(data, offset + 10 * dataSize, littleEndian); // used for cubemap textures, should either be 1 or 6
  let numberOfMipmapLevels = getUint32(data, offset + 11 * dataSize, littleEndian); // number of levels; disregard possibility of 0 for compressed textures
  const bytesOfKeyValueData = getUint32(data, offset + 12 * dataSize, littleEndian); // the amount of space after the header for meta-data

  // Make sure we have a compressed type.  Not only reduces work, but probably better to let dev know they are not compressing.
  if (glType !== 0) {
    console.warn('only compressed formats currently supported');
    return;
  } else {
    // value of zero is an indication to generate mipmaps @ runtime.  Not usually allowed for compressed, so disregard.
    numberOfMipmapLevels = Math.max(1, numberOfMipmapLevels);
  }
  if (pixelHeight === 0 || pixelDepth !== 0) {
    console.warn('only 2D textures currently supported');
    return;
  }
  if (numberOfArrayElements !== 0) {
    console.warn('texture arrays not currently supported');
    return;
  }
  if (numberOfFaces !== facesExpected) {
    console.warn('number of faces expected' + facesExpected + ', but found ' + numberOfFaces);
    return;
  }

  const mipmaps = [];

  // initialize width & height for level 1
  let dataOffset = HEADER_LEN + bytesOfKeyValueData;
  let width = pixelWidth;
  let height = pixelHeight;
  const mipmapCount = loadMipmaps ? numberOfMipmapLevels : 1;

  for (let level = 0; level < mipmapCount; level++) {
    const imageSize = new Int32Array(arraybuffer, dataOffset, 1)[0]; // size per face, since not supporting array cubemaps
    for (let face = 0; face < numberOfFaces; face++) {
      const byteArray = new Uint8Array(arraybuffer, dataOffset + 4, imageSize);
      mipmaps.push({
        data: byteArray,
        width: width,
        height: height
      });

      dataOffset += imageSize + 4; // size of the image + 4 for the imageSize field
      dataOffset += 3 - ((imageSize + 3) % 4); // add padding for odd sized image
    }
    width = Math.max(1.0, width * 0.5);
    height = Math.max(1.0, height * 0.5);
  }

  out =
    out ||
    new Texture2D({
      format: glInternalFormat
    });
  if (loadMipmaps) {
    out.mipmaps = mipmaps;
    // res.mipmapCount = numberOfMipmapLevels;
  }
  out.source = {
    data: mipmaps[0].data,
    width: pixelWidth,
    height: pixelHeight
  };
  return out;
}
