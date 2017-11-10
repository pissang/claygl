import Texture2D from '../Texture2D';
import glenum from '../core/glenum';
import util from '../core/util';

var TexturePool = function () {

    this._pool = {};

    this._allocatedTextures = [];
};

TexturePool.prototype = {

    constructor: TexturePool,

    get: function (parameters) {
        var key = generateKey(parameters);
        if (!this._pool.hasOwnProperty(key)) {
            this._pool[key] = [];
        }
        var list = this._pool[key];
        if (!list.length) {
            var texture = new Texture2D(parameters);
            this._allocatedTextures.push(texture);
            return texture;
        }
        return list.pop();
    },

    put: function (texture) {
        var key = generateKey(texture);
        if (!this._pool.hasOwnProperty(key)) {
            this._pool[key] = [];
        }
        var list = this._pool[key];
        list.push(texture);
    },

    clear: function (renderer) {
        for (var i = 0; i < this._allocatedTextures.length; i++) {
            this._allocatedTextures[i].dispose(renderer);
        }
        this._pool = {};
        this._allocatedTextures = [];
    }
};

var defaultParams = {
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

var defaultParamPropList = Object.keys(defaultParams);

function generateKey(parameters) {
    util.defaultsWithPropList(parameters, defaultParams, defaultParamPropList);
    fallBack(parameters);

    var key = '';
    for (var i = 0; i < defaultParamPropList.length; i++) {
        var name = defaultParamPropList[i];
        var chunk = parameters[name].toString();
        key += chunk;
    }
    return key;
}

function fallBack(target) {

    var IPOT = isPowerOfTwo(target.width, target.height);

    if (target.format === glenum.DEPTH_COMPONENT) {
        target.useMipmap = false;
    }

    if (!IPOT || !target.useMipmap) {
        if (target.minFilter == glenum.NEAREST_MIPMAP_NEAREST ||
            target.minFilter == glenum.NEAREST_MIPMAP_LINEAR) {
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
    return (width & (width-1)) === 0 &&
            (height & (height-1)) === 0;
}

export default TexturePool;
