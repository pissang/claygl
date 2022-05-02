import Texture2D from '../Texture2D';
import * as glenum from '../core/glenum';
import * as util from '../core/util';
import Texture, { TextureOpts } from '../Texture';
import Renderer from '../Renderer';

class TexturePool {
  private _pool: Record<string, Texture[]> = {};
  private _allocatedTextures: Texture[] = [];

  get(parameters: Partial<TextureOpts>) {
    const key = generateKey(parameters);
    if (!util.hasOwn(this._pool, key)) {
      this._pool[key] = [];
    }
    const list = this._pool[key];
    if (!list.length) {
      const texture = new Texture2D(parameters);
      this._allocatedTextures.push(texture);
      return texture;
    }
    return list.pop();
  }

  put(texture: Texture) {
    const key = generateKey(texture);
    if (!util.hasOwn(this._pool, key)) {
      this._pool[key] = [];
    }
    const list = this._pool[key];
    list.push(texture);
  }

  clear(renderer: Renderer) {
    for (let i = 0; i < this._allocatedTextures.length; i++) {
      this._allocatedTextures[i].dispose(renderer);
    }
    this._pool = {};
    this._allocatedTextures = [];
  }
}
const defaultParams: Partial<TextureOpts> = {
  width: 512,
  height: 512,
  type: glenum.UNSIGNED_BYTE,
  format: glenum.RGBA,
  wrapS: glenum.CLAMP_TO_EDGE,
  wrapT: glenum.CLAMP_TO_EDGE,
  minFilter: glenum.LINEAR_MIPMAP_LINEAR,
  magFilter: glenum.LINEAR,
  useMipmap: true,
  anisotropic: 1,
  flipY: true,
  unpackAlignment: 4,
  premultiplyAlpha: false
} as const;

const defaultParamPropList = Object.keys(defaultParams);

function generateKey(parameters: Partial<TextureOpts>) {
  util.defaults(parameters, defaultParams);
  fallBack(parameters);

  let key = '';
  for (let i = 0; i < defaultParamPropList.length; i++) {
    key += (parameters as any)[defaultParamPropList[i]].toString();
  }
  return key;
}

function fallBack(target: any) {
  const IPOT = isPowerOfTwo(target.width, target.height);

  if (target.format === glenum.DEPTH_COMPONENT) {
    target.useMipmap = false;
  }

  if (!IPOT || !target.useMipmap) {
    if (
      target.minFilter == glenum.NEAREST_MIPMAP_NEAREST ||
      target.minFilter == glenum.NEAREST_MIPMAP_LINEAR
    ) {
      target.minFilter = glenum.NEAREST;
    } else if (
      target.minFilter == glenum.LINEAR_MIPMAP_LINEAR ||
      target.minFilter == glenum.LINEAR_MIPMAP_NEAREST
    ) {
      target.minFilter = glenum.LINEAR;
    }
  }
  if (!IPOT) {
    target.wrapS = glenum.CLAMP_TO_EDGE;
    target.wrapT = glenum.CLAMP_TO_EDGE;
  }
}

function isPowerOfTwo(width: number, height: number) {
  return (width & (width - 1)) === 0 && (height & (height - 1)) === 0;
}

export default TexturePool;
