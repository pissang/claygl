define(function(require) {
    
    var Texture2D = require('../texture/texture2d');
    var glenum = require('../glenum');
    var _ = require('_');

    var pool = {};

    var texturePool = {

        get : function(parameters) {
            var key = generateKey(parameters);
            if (!pool.hasOwnProperty(key)) {
                pool[key] = [];
            }
            var list = pool[key];
            if (!list.length) {
                var texture = new Texture2D(parameters);
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
            for (name in pool) {
                for (var i = 0; i < pool[name].length; i++) {
                    pool[name][i].dispose(gl);
                }
            }
            pool = {};
        }
    }

    function generateKey(parameters) {
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
            anisotropy : 1,
            flipY : true,
            unpackAlignment : 4,
            premultiplyAlpha : false
        }

        _.defaults(parameters, defaultParams);
        fallBack(parameters);

        var key = '';
        for (var name in defaultParams) {
            if (parameters[name]) {
                var chunk = parameters[name].toString();
            }else{
                var chunk = defaultParams[name].toString();
            }
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
            if (this.minFilter == glenum.NEAREST_MIPMAP_NEAREST ||
                this.minFilter == glenum.NEAREST_MIPMAP_LINEAR) {
                this.minFilter = glenum.NEAREST;
            } else if (
                this.minFilter == glenum.LINEAR_MIPMAP_LINEAR ||
                this.minFilter == glenum.LINEAR_MIPMAP_NEAREST
            ) {
                this.minFilter = glenum.LINEAR
            }

            target.wrapS = glenum.CLAMP_TO_EDGE;
            target.wrapT = glenum.CLAMP_TO_EDGE;
        }
    }

    function isPowerOfTwo(width, height) {
        return (width & (width-1)) === 0 &&
                (height & (height-1)) === 0;
    }

    return texturePool
})