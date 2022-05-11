import Texture2D from '../Texture2D';
import TextureCube, { CubeTarget } from '../TextureCube';
import vendor from '../core/vendor';
import EnvironmentMapPass from '../prePass/EnvironmentMap';
import Skybox from '../plugin/Skybox';
import Scene from '../Scene';

import * as dds from './dds';
import * as hdr from './hdr';
import type Renderer from '../Renderer';

interface LoadTextureOpts {
  fileType?: string;
  exposure?: number;
}

type TextureOnload = (texture: Texture2D) => void;
type TextureOnerror = (err: any) => void;

// TODO change to promise?
export function loadTexture(
  path: string,
  onload?: TextureOnload,
  onerror?: TextureOnerror
): Texture2D;
export function loadTexture(
  path: string,
  option: LoadTextureOpts,
  onload?: TextureOnload,
  onerror?: TextureOnerror
): Texture2D;
export function loadTexture(
  path: string,
  option?: LoadTextureOpts | TextureOnload,
  onload?: TextureOnload | TextureOnerror,
  onerror?: TextureOnerror
): Texture2D {
  let texture: Texture2D;
  if (typeof option === 'function') {
    onload = option;
    onerror = onload;
    option = {};
  } else {
    option = option || {};
  }
  if (path.match(/.hdr$/) || option.fileType === 'hdr') {
    texture = new Texture2D({
      width: 0,
      height: 0,
      sRGB: false
    });
    fetchTexture(
      path,
      (data: ArrayBuffer) => {
        hdr.parseRGBE(data, texture, (option as LoadTextureOpts).exposure);
        texture.dirty();
        onload && onload(texture);
      },
      onerror
    );
    return texture;
  } else if (path.match(/.dds$/) || option.fileType === 'dds') {
    texture = new Texture2D({
      width: 0,
      height: 0
    });
    fetchTexture(
      path,
      (data: ArrayBuffer) => {
        dds.parse(data, texture);
        texture.dirty();
        onload && onload(texture);
      },
      onerror
    );
  } else {
    texture = new Texture2D();
    texture
      .load(path)
      .success(onload as TextureOnload)
      .error(onerror as TextureOnerror);
  }
  return texture;
}

interface LoadPanoramaOpts extends LoadTextureOpts {
  encodeRGBM?: boolean;
  flipY?: boolean;
}

/**
 * Load a panorama texture and render it to a cube map
 */
export function loadPanorama(
  renderer: Renderer,
  path: string,
  cubeMap: TextureCube,
  option?: LoadPanoramaOpts
) {
  return new Promise((resolve, reject) => {
    loadTexture(
      path,
      option || {},
      (texture: Texture2D) => {
        // PENDING
        texture.flipY = (option as LoadPanoramaOpts).flipY || false;
        panoramaToCubeMap(renderer, texture, cubeMap, option as LoadPanoramaOpts);
        texture.dispose(renderer);
        resolve(cubeMap);
      },
      reject
    );
  });
}

/**
 * Render a panorama texture to a cube map
 */
export function panoramaToCubeMap(
  renderer: Renderer,
  panoramaMap: Texture2D,
  cubeMap: TextureCube,
  option?: {
    encodeRGBM?: boolean;
  }
) {
  const environmentMapPass = new EnvironmentMapPass();
  const skybox = new Skybox({
    scene: new Scene()
  });
  skybox.setEnvironmentMap(panoramaMap);

  option = option || {};
  if (option.encodeRGBM) {
    skybox.material.define('fragment', 'RGBM_ENCODE');
  }

  // Share sRGB
  cubeMap.sRGB = panoramaMap.sRGB;

  environmentMapPass.texture = cubeMap;
  environmentMapPass.render(renderer, skybox.getScene()!);
  environmentMapPass.texture = undefined;
  environmentMapPass.dispose(renderer);
  return cubeMap;
}

/**
 * Convert height map to normal map
 * @param {HTMLImageElement|HTMLCanvasElement} image
 * @param {boolean} [checkBump=false]
 * @return {HTMLCanvasElement}
 */
export function heightToNormal(image: HTMLImageElement | HTMLCanvasElement, checkBump?: boolean) {
  const canvas = document.createElement('canvas');
  const width = (canvas.width = image.width);
  const height = (canvas.height = image.height);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(image, 0, 0, width, height);
  checkBump = checkBump || false;
  const srcData = ctx.getImageData(0, 0, width, height);
  const dstData = ctx.createImageData(width, height);
  for (let i = 0; i < srcData.data.length; i += 4) {
    if (checkBump) {
      const r = srcData.data[i];
      const g = srcData.data[i + 1];
      const b = srcData.data[i + 2];
      const diff = Math.abs(r - g) + Math.abs(g - b);
      if (diff > 20) {
        console.warn('Given image is not a height map');
        return image;
      }
    }
    // Modified from http://mrdoob.com/lab/javascript/height2normal/
    let x1, y1, x2, y2;
    if (i % (width * 4) === 0) {
      // left edge
      x1 = srcData.data[i];
      x2 = srcData.data[i + 4];
    } else if (i % (width * 4) === (width - 1) * 4) {
      // right edge
      x1 = srcData.data[i - 4];
      x2 = srcData.data[i];
    } else {
      x1 = srcData.data[i - 4];
      x2 = srcData.data[i + 4];
    }

    if (i < width * 4) {
      // top edge
      y1 = srcData.data[i];
      y2 = srcData.data[i + width * 4];
    } else if (i > width * (height - 1) * 4) {
      // bottom edge
      y1 = srcData.data[i - width * 4];
      y2 = srcData.data[i];
    } else {
      y1 = srcData.data[i - width * 4];
      y2 = srcData.data[i + width * 4];
    }

    dstData.data[i] = x1 - x2 + 127;
    dstData.data[i + 1] = y1 - y2 + 127;
    dstData.data[i + 2] = 255;
    dstData.data[i + 3] = 255;
  }
  ctx.putImageData(dstData, 0, 0);
  return canvas;
}

/**
 * Convert height map to normal map
 * @param {HTMLImageElement|HTMLCanvasElement} image
 * @param {boolean} [checkBump=false]
 * @param {number} [threshold=20]
 * @return {HTMLCanvasElement}
 */
export function isHeightImage(
  img: HTMLImageElement | HTMLCanvasElement,
  downScaleSize: number,
  threshold: number
) {
  if (!img || !img.width || !img.height) {
    return false;
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const size = downScaleSize || 32;
  threshold = threshold || 20;
  canvas.width = canvas.height = size;
  ctx.drawImage(img, 0, 0, size, size);
  const srcData = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < srcData.data.length; i += 4) {
    const r = srcData.data[i];
    const g = srcData.data[i + 1];
    const b = srcData.data[i + 2];
    const diff = Math.abs(r - g) + Math.abs(g - b);
    if (diff > threshold) {
      return false;
    }
  }
  return true;
}

function fetchTexture(
  path: string,
  onload: (buffer: ArrayBuffer) => void,
  onerror?: (err: any) => void
) {
  vendor.request.get({
    url: path,
    responseType: 'arraybuffer',
    onload,
    onerror
  });
}

/**
 * Create a chessboard texture
 * @param  {number} [size]
 * @param  {number} [unitSize]
 * @param  {string} [color1]
 * @param  {string} [color2]
 * @return {clay.Texture2D}
 */
export function createChessboard(size: number, unitSize: number, color1: string, color2: string) {
  size = size || 512;
  unitSize = unitSize || 64;
  color1 = color1 || 'black';
  color2 = color2 || 'white';

  const repeat = Math.ceil(size / unitSize);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = color2;
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = color1;
  for (let i = 0; i < repeat; i++) {
    for (let j = 0; j < repeat; j++) {
      const isFill = j % 2 ? i % 2 : (i % 2) - 1;
      if (isFill) {
        ctx.fillRect(i * unitSize, j * unitSize, unitSize, unitSize);
      }
    }
  }

  const texture = new Texture2D({
    image: canvas,
    anisotropic: 8
  });

  return texture;
}

/**
 * Create a blank pure color 1x1 texture
 * @param  {string} color
 * @return {clay.Texture2D}
 */
export function createBlank(color: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);

  const texture = new Texture2D({
    image: canvas
  });

  return texture;
}
