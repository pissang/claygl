/**
 *
 * @export{class} Texture2D
 */
define( function(require){

    var Texture = require('../texture');
    var WebGLInfo = require('../webglinfo');

    var Texture2D = Texture.derive({
        
        image : null,

        pixels : null,
    }, {
        update : function( _gl ){

            _gl.bindTexture( _gl.TEXTURE_2D, this.cache.get("webgl_texture") );
            
            this.beforeUpdate(  _gl );

            var glFormat = _gl[ this.format.toUpperCase() ],
                glType = _gl[ this.type.toUpperCase() ];

            _gl.texParameteri( _gl.TEXTURE_2D, _gl.TEXTURE_WRAP_S, _gl[ this.wrapS.toUpperCase() ] );
            _gl.texParameteri( _gl.TEXTURE_2D, _gl.TEXTURE_WRAP_T, _gl[ this.wrapT.toUpperCase() ] );

            _gl.texParameteri( _gl.TEXTURE_2D, _gl.TEXTURE_MAG_FILTER, _gl[ this.magFilter.toUpperCase() ] );
            _gl.texParameteri( _gl.TEXTURE_2D, _gl.TEXTURE_MIN_FILTER, _gl[ this.minFilter.toUpperCase() ] );
            
            var anisotropicExt = WebGLInfo.getExtension("EXT_texture_filter_anisotropic");
            if( anisotropicExt && this.anisotropic > 1){
                _gl.texParameterf(_gl.TEXTURE_2D, anisotropicExt.TEXTURE_MAX_ANISOTROPY_EXT, this.anisotropic);
            }

            if( this.image ){
                // After image is loaded
                if( this.image.complete )
                    _gl.texImage2D( _gl.TEXTURE_2D, 0, glFormat, glFormat, glType, this.image );
            }
            // Can be used as a blank texture when writing render to texture(RTT)
            else{
                _gl.texImage2D( _gl.TEXTURE_2D, 0, glFormat, this.width, this.height, 0, glFormat, glType, this.pixels);
            }           
        
            if( ! this.NPOT && this.generateMipmaps ){
                _gl.generateMipmap( _gl.TEXTURE_2D );
            }
            
            _gl.bindTexture( _gl.TEXTURE_2D, null );

        },
        
        isPowerOfTwo : function(){
            if( this.image ){
                var width = this.image.width,
                    height = this.image.height;   
            }else{
                var width = this.width,
                    height = this.height;
            }
            return ( width & (width-1) ) === 0 &&
                    ( height & (height-1) ) === 0;
        },

        isRenderable : function(){
            if( this.image ){
                return this.image.complete;
            }else{
                return this.width && this.height;
            }
        },

        bind : function( _gl ){
            _gl.bindTexture( _gl.TEXTURE_2D, this.getWebGLTexture(_gl) );
        },
        unbind : function( _gl ){
            _gl.bindTexture( _gl.TEXTURE_2D, null );
        },
    })

    return Texture2D;
} )