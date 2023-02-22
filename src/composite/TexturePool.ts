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
  | 'internalFormat'
  | 'wrapS'
  | 'wrapT'
  | 'minFilter'
  | 'magFilter'
  | 'useMipmap'
  | 'anisotropic'
>;

const textureAllocatedMap = new WeakMap<Texture2D, boolean>();

const MAX_ALLOCATE_TEXTURE = 1e3;

class TexturePool {
  private _pool: Record<string, Texture2D[]> = {};
  private _allocated: Texture2D[] = [];

  /**d
   * Allocate a new texture from pool.
   */
  allocate(parameters: Partial<TexturePoolParameters>): Texture2D {
    if (this._allocated.length > MAX_ALLOCATE_TEXTURE) {
      throw 'Allocated moo much textures.';
    }
    const key = generateKey(parameters);
    const list = (this._pool[key] = this._pool[key] || []);
    if (!list.length) {
      const texture = new Texture2D(parameters);
      this._allocated.push(texture);
      textureAllocatedMap.set(texture, true);
      return texture;
    }
    const texture = list.pop() as Texture2D;
    util.assign(texture, parameters);
    textureAllocatedMap.set(texture, true);
    return texture;
  }

  release(texture: Texture2D) {
    // Already been released.
    if (!textureAllocatedMap.get(texture)) {
      return;
    }

    const key = generateKey(texture);
    if (!util.hasOwn(this._pool, key)) {
      this._pool[key] = [];
    }
    textureAllocatedMap.set(texture, false);
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
  // CAUTION: DO NOT MODIFY THE PARAM
  // parameters.internalFormat =
  //   parameters.internalFormat || getPossiblelInternalFormat(parameters.format!, parameters.type!);

  let key = '';
  for (let i = 0; i < defaultParamPropList.length; i++) {
    key += (parameters as any)[defaultParamPropList[i]].toString();
  }
  return key;
}

export default TexturePool;
