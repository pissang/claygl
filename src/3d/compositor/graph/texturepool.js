/**
 * @export{class} TexturePool
 */
define( function(require){
    
    var Texture2D = require("../../texture/texture2d");
    var _ = require("_");

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
        },

        clear : function(){
            for(name in pool){
                for(var i = 0; i < pool[name].length; i++){
                    pool[name][i].dispose();
                }
            }
            pool = {};
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
            generateMipmaps : true,
            anisotropy : 1,
            flipY : true,
            unpackAlignment : 4,
            premultiplyAlpha : false
        }

        _.defaults(parameters, defaultParams);
        fallBack(parameters);

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

    function fallBack(target){

        var IPOT = isPowerOfTwo(target.width, target.height);

        if( target.format === "DEPTH_COMPONENT"){
            target.generateMipmaps = false;
        }

        if( ! IPOT || ! target.generateMipmaps){
            if( target.minFilter.indexOf("NEAREST") == 0){
                target.minFilter = 'NEAREST';
            }else{
                target.minFilter = 'LINEAR'
            }

            if( target.magFilter.indexOf("NEAREST") == 0){
                target.magFilter = 'NEAREST';
            }else{
                target.magFilter = 'LINEAR'
            }
            target.wrapS = 'CLAMP_TO_EDGE';
            target.wrapT = 'CLAMP_TO_EDGE';
        }
    }

    function isPowerOfTwo(width, height){
        return ( width & (width-1) ) === 0 &&
                ( height & (height-1) ) === 0;
    }

    return texturePool
} )