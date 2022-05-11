import Texture2D, { Texture2DOpts } from '../Texture2D';
import * as constants from '../core/constants';
import * as util from '../core/util';
import Renderer from '../Renderer';

class TexturePool {
  private _pool: Record<string, Texture2D[]> = {};
  private _allocatedTextures: Texture2D[] = [];

  get(parameters: Partial<Texture2DOpts>): Texture2D {
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
    return list.pop() as Texture2D;
  }

  put(texture: Texture2D) {
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
const defaultParams: Partial<Texture2DOpts> = {
  width: 512,
  height: 512,
  type: constants.UNSIGNED_BYTE,
  format: constants.RGBA,
  wrapS: constants.CLAMP_TO_EDGE,
  wrapT: constants.CLAMP_TO_EDGE,
  minFilter: constants.LINEAR_MIPMAP_LINEAR,
  magFilter: constants.LINEAR,
  useMipmap: true,
  anisotropic: 1,
  flipY: true,
  unpackAlignment: 4,
  premultiplyAlpha: false
} as const;

const defaultParamPropList = Object.keys(defaultParams);

function generateKey(parameters: Partial<Texture2DOpts>) {
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

  if (target.format === constants.DEPTH_COMPONENT) {
    target.useMipmap = false;
  }

  if (!IPOT || !target.useMipmap) {
    if (
      target.minFilter == constants.NEAREST_MIPMAP_NEAREST ||
      target.minFilter == constants.NEAREST_MIPMAP_LINEAR
    ) {
      target.minFilter = constants.NEAREST;
    } else if (
      target.minFilter == constants.LINEAR_MIPMAP_LINEAR ||
      target.minFilter == constants.LINEAR_MIPMAP_NEAREST
    ) {
      target.minFilter = constants.LINEAR;
    }
  }
  if (!IPOT) {
    target.wrapS = constants.CLAMP_TO_EDGE;
    target.wrapT = constants.CLAMP_TO_EDGE;
  }
}

function isPowerOfTwo(width: number, height: number) {
  return (width & (width - 1)) === 0 && (height & (height - 1)) === 0;
}

export default TexturePool;
