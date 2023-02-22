// TODO dispose unused textures.

import Texture2D, { Texture2DOpts } from '../Texture2D';
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

const textureKeyMap = new WeakMap<Texture2D, string>();

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
      textureKeyMap.set(texture, key);
      return texture;
    }
    const texture = list.pop() as Texture2D;
    textureKeyMap.set(texture, key);
    return texture;
  }

  release(texture: Texture2D) {
    const key = textureKeyMap.get(texture);
    // Already been released.
    if (!key) {
      return;
    }

    if (!util.hasOwn(this._pool, key)) {
      this._pool[key] = [];
    }
    textureKeyMap.set(texture, '');
    const list = this._pool[key];
    list.push(texture);
  }

  clear(renderer: Renderer) {
    this._allocated.forEach(renderer.dispose.bind(renderer));
    this._pool = {};
    this._allocated = [];
  }
}

const texturePropList = [
  'width',
  'height',
  'format',
  'internalFormat',
  'type',
  'wrapS',
  'wrapT',
  'minFilter',
  'magFilter',
  'useMipmap',
  'anisotropic'
];

function generateKey(parameters: Partial<TexturePoolParameters>) {
  let key = '';
  for (let i = 0; i < texturePropList.length; i++) {
    key += (parameters as any)[texturePropList[i]] ?? 'df';
  }
  return key;
}

export default TexturePool;
