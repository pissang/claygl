define( function(require){
    
    var Texture2D = require("../../texture/texture2d");

    var pool = {};

    var texturePool = {

        get : function( parameters ){
            var key = generateKey( parameters );
            if( ! pool.hasOwnProperty( key ) ){
                pool[key] = [];
            }
            var list = pool[key];
            if( ! list.length ){
                var texture = new Texture2D( parameters );
                return texture;
            }
            return list.pop();
        },

        put : function( texture ){
            var key = generateKey( texture );
            if( ! pool.hasOwnProperty( key ) ){
                pool[key] = [];
            }
            var list = pool[key];
            list.push( texture );
        }
    }

    function generateKey( parameters ){
        var defaultParams = {
            width : 512,
            height : 512,
            type : 'UNSIGNED_BYTE',
            format : "RGBA",
            wrapS : "CLAMP_TO_EDGE",
            wrapT : "CLAMP_TO_EDGE",
            minFilter : "LINEAR_MIPMAP_LINEAR",
            magFilter : "LINEAR",
            generateMipMaps : true,
            anisotropy : 1,
            flipY : true,
            unpackAlignment : 4,
            premultiplyAlpha : false
        }
        var key = "";
        for(var name in defaultParams) {
            if( parameters[name] ){
                var chunk = parameters[name].toString();
            }else{
                var chunk = defaultParams[name].toString();
            }
            key += chunk;
        }
        return key;
    }

    return texturePool
} )