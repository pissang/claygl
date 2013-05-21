/**
 *
 * @export{class} Texture2D
 */
define( function(require){

    var Texture = require('../texture');

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
            
            if( this.cache.miss("anisotropic_ext") ){
                var ext = _gl.getExtension("MOZ_EXT_texture_filter_anisotropic");
                if( ! ext){
                    ext = _gl.getExtension("WEBKIT_EXT_texture_filter_anisotropic");
                }
                this.cache.put("anisotropic_ext", ext);
            }else{
                var ext = this.cache.get("anisotropic_ext");
                if( ext){
                    _gl.texParameterf(_gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, this.anisotropic);
                }
            }

            if( this.image ){
                // After image is loaded
                if( this.image.width )
                    _gl.texImage2D( _gl.TEXTURE_2D, 0, glFormat, glFormat, glType, this.image );
            }
            // Can be used as a blank texture when writing render to texture(RTT)
            else{
                _gl.texImage2D( _gl.TEXTURE_2D, 0, glFormat, this.width, this.height, 0, glFormat, glType, this.pixels);
            }           
        
            if( ! this.NPOT && this.generateMipmaps  ){
                _gl.generateMipmap( _gl.TEXTURE_2D );
            }
            
            _gl.bindTexture( _gl.TEXTURE_2D, null );

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