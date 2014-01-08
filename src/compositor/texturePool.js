define(function(require) {
    
    var Texture2D = require('../texture/Texture2D');
    var glenum = require('../core/glenum');
    var _ = require('_');

    var pool = {};

    var allocatedTextures = [];

    var texturePool = {

        get : function(parameters) {
            var key = generateKey(parameters);
            if (!pool.hasOwnProperty(key)) {
                pool[key] = [];
            }
            var list = pool[key];
            if (!list.length) {
                var texture = new Texture2D(parameters);
                allocatedTextures.push(texture);
                return texture;
            }
            return list.pop();
        },

        put : function(texture) {
            var key = generateKey(texture);
            if (!pool.hasOwnProperty(key)) {
                pool[key] = [];
            }
            var list = pool[key];
            list.push(texture);
        },

        clear : function(gl) {
            for (i = 0; i < allocatedTextures.length; i++) {
                allocatedTextures[i].dispose(gl);
            }
            pool = {};
            allocatedTextures = [];
        }
    }

    var defaultParams = {
        width : 512,
        height : 512,
        type : glenum.UNSIGNED_BYTE,
        format : glenum.RGBA,
        wrapS : glenum.CLAMP_TO_EDGE,
        wrapT : glenum.CLAMP_TO_EDGE,
        minFilter : glenum.LINEAR_MIPMAP_LINEAR,
        magFilter : glenum.LINEAR,
        useMipmap : true,
        anisotropic : 1,
        flipY : true,
        unpackAlignment : 4,
        premultiplyAlpha : false
    }

    function generateKey(parameters) {
        _.defaults(parameters, defaultParams);
        fallBack(parameters);

        var key = '';
        for (var name in defaultParams) {
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
                target.minFilter = glenum.LINEAR
            }

            target.wrapS = glenum.CLAMP_TO_EDGE;
            target.wrapT = glenum.CLAMP_TO_EDGE;
        }
    }

    function isPowerOfTwo(width, height) {
        return (width & (width-1)) === 0 &&
                (height & (height-1)) === 0;
    }

    return texturePool;
})