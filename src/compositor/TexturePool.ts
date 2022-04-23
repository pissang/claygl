// @ts-nocheck
import Texture2D from '../Texture2D';
import glenum from '../core/glenum';
import * as util from '../core/util';

const TexturePool = function () {
  this._pool = {};

  this._allocatedTextures = [];
};

TexturePool.prototype = {
  constructor: TexturePool,

  get: function (parameters) {
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
  },

  put: function (texture) {
    const key = generateKey(texture);
    if (!util.hasOwn(this._pool, key)) {
      this._pool[key] = [];
    }
    const list = this._pool[key];
    list.push(texture);
  },

  clear: function (renderer) {
    for (let i = 0; i < this._allocatedTextures.length; i++) {
      this._allocatedTextures[i].dispose(renderer);
    }
    this._pool = {};
    this._allocatedTextures = [];
  }
};

const defaultParams = {
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
};

const defaultParamPropList = Object.keys(defaultParams);

function generateKey(parameters) {
  util.defaultsWithPropList(parameters, defaultParams, defaultParamPropList);
  fallBack(parameters);

  let key = '';
  for (let i = 0; i < defaultParamPropList.length; i++) {
    const name = defaultParamPropList[i];
    const chunk = parameters[name].toString();
    key += chunk;
  }
  return key;
}

function fallBack(target) {
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

function isPowerOfTwo(width, height) {
  return (width & (width - 1)) === 0 && (height & (height - 1)) === 0;
}

export default TexturePool;
