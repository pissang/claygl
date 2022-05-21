// TODO dispose unused textures.

import Texture2D, { Texture2DOpts } from '../Texture2D';
import * as constants from '../core/constants';
import * as util from '../core/util';
import Renderer from '../Renderer';

export type TexturePoolParameters = Pick<
  Texture2DOpts,
  | 'width'
  | 'height'
  | 'type'
  | 'format'
  | 'wrapS'
  | 'wrapT'
  | 'minFilter'
  | 'magFilter'
  | 'useMipmap'
  | 'anisotropic'
>;

const MAX_ALLOCATE_TEXTURE = 1e3;

class TexturePool {
  private _pool: Record<string, Texture2D[]> = {};
  private _allocated: Texture2D[] = [];

  get(parameters: Partial<TexturePoolParameters>): Texture2D {
    if (this._allocated.length > MAX_ALLOCATE_TEXTURE) {
      throw 'Allocated moo much textures.';
    }
    const key = generateKey(parameters);
    const list = (this._pool[key] = this._pool[key] || []);
    if (!list.length) {
      const texture = new Texture2D(parameters);
      this._allocated.push(texture);
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
    this._allocated.forEach(renderer.dispose.bind(renderer));
    this._pool = {};
    this._allocated = [];
  }
}
const defaultParams: Partial<TexturePoolParameters> = {
  width: 512,
  height: 512,
  type: constants.UNSIGNED_BYTE,
  format: constants.RGBA,
  wrapS: constants.CLAMP_TO_EDGE,
  wrapT: constants.CLAMP_TO_EDGE,
  minFilter: constants.LINEAR_MIPMAP_LINEAR,
  magFilter: constants.LINEAR,
  useMipmap: true,
  anisotropic: 1
} as const;

const defaultParamPropList = util.keys(defaultParams);

function generateKey(parameters: Partial<TexturePoolParameters>) {
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
