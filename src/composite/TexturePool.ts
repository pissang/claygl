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

const MAX_ALLOCATE_TEXTURE = 1e3;

class TexturePool {
  private _pool: Record<string, Texture2D[]> = {};
  private _allocated: Texture2D[] = [];

  private _textureKeyMap = new WeakMap<Texture2D, string>();
  private _textureUsage = new WeakMap<Texture2D, number>();
  private _textureAllocated = new WeakMap<Texture2D, boolean>();

  /**d
   * Allocate a new texture from pool.
   */
  allocate(parameters: Partial<TexturePoolParameters>): Texture2D {
    if (this._allocated.length > MAX_ALLOCATE_TEXTURE) {
      throw 'Allocated moo much textures.';
    }
    const key = generateKey(parameters);
    const list = (this._pool[key] = this._pool[key] || []);
    const textureKeyMap = this._textureKeyMap;
    let texture: Texture2D;
    if (!list.length) {
      texture = new Texture2D(parameters);
      this._allocated.push(texture);
      textureKeyMap.set(texture, key);
    } else {
      texture = list.pop() as Texture2D;
    }
    this._textureAllocated.set(texture, true);
    return texture;
  }

  useTexture(texture: Texture2D) {
    const key = this._textureKeyMap.get(texture);
    // Ignore the textures that are not allocated from pool.
    if (!key) {
      return;
    }
    if (!this._textureAllocated.get(texture)) {
      console.error('Use texture that is not allocated yet.');
      debugger;
    }
    const textureUsage = this._textureUsage;
    textureUsage.set(texture, (textureUsage.get(texture) || 0) + 1);
  }

  releaseTexture(texture: Texture2D) {
    const textureKeyMap = this._textureKeyMap;
    const key = textureKeyMap.get(texture);
    // Ignore the textures that are not allocated from pool.
    if (!key) {
      return;
    }

    const textureUsage = this._textureUsage;
    const usage = (textureUsage.get(texture) || 0) - 1;
    if (usage < 0) {
      // Already been released.
      return;
    }
    textureUsage.set(texture, usage);
    if (usage <= 0) {
      // Put back into pool
      if (!util.hasOwn(this._pool, key)) {
        this._pool[key] = [];
      }
      const list = this._pool[key];
      list.push(texture);
      this._textureAllocated.delete(texture);
    }
  }

  collectUnusedTextures() {
    this._allocated.forEach((texture) => {
      const usage = this._textureUsage.get(texture) || 0;
      if (usage <= 0) {
        const key = this._textureKeyMap.get(texture);
        if (key) {
          const list = this._pool[key];
          list.push(texture);
        }
        this._textureAllocated.delete(texture);
      }
    });
  }

  clear(renderer: Renderer) {
    this._allocated.forEach(renderer.dispose.bind(renderer));
    this._pool = {};
    this._textureUsage = new WeakMap();
    this._textureKeyMap = new WeakMap();
    this._allocated = [];
  }
}

export const texturePropList = [
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
