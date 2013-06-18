/**
 *
 * @export{class} TextureCube
 */
define( function(require){

    var Texture = require('../texture');
    var WebGLInfo = require('../webglinfo');
    var _ = require('_');

    var targetMap = {
        'px' : 'TEXTURE_CUBE_MAP_POSITIVE_X',
        'py' : 'TEXTURE_CUBE_MAP_POSITIVE_Y',
        'pz' : 'TEXTURE_CUBE_MAP_POSITIVE_Z',
        'nx' : 'TEXTURE_CUBE_MAP_NEGATIVE_X',
        'ny' : 'TEXTURE_CUBE_MAP_NEGATIVE_Y',
        'nz' : 'TEXTURE_CUBE_MAP_NEGATIVE_Z',
    }

    var TextureCube = Texture.derive({
        image : {
            px : null,
            nx : null,
            py : null,
            ny : null,
            pz : null,
            nz : null
        },
        pixels : {
            px : null,
            nx : null,
            py : null,
            ny : null,
            pz : null,
            nz : null
        }
    }, {

        update : function( _gl ){

            _gl.bindTexture( _gl.TEXTURE_CUBE_MAP, this.cache.get("webgl_texture") );

            this.beforeUpdate( _gl );

            var glFormat = _gl[ this.format.toUpperCase() ],
                glType = _gl[ this.type.toUpperCase() ];

            _gl.texParameteri( _gl.TEXTURE_CUBE_MAP, _gl.TEXTURE_WRAP_S, _gl[ this.wrapS.toUpperCase() ] );
            _gl.texParameteri( _gl.TEXTURE_CUBE_MAP, _gl.TEXTURE_WRAP_T, _gl[ this.wrapT.toUpperCase() ] );

            _gl.texParameteri( _gl.TEXTURE_CUBE_MAP, _gl.TEXTURE_MAG_FILTER, _gl[ this.magFilter.toUpperCase() ] );
            _gl.texParameteri( _gl.TEXTURE_CUBE_MAP, _gl.TEXTURE_MIN_FILTER, _gl[ this.minFilter.toUpperCase() ] );
            
            var anisotropicExt = WebGLInfo.getExtension("EXT_texture_filter_anisotropic");
            if( anisotropicExt && this.anisotropic > 1){
                _gl.texParameterf(_gl.TEXTURE_CUBE_MAP, anisotropicExt.TEXTURE_MAX_ANISOTROPY_EXT, this.anisotropic);
            }

            _.each( this.image, function(img, target){
                if( img )
                    _gl.texImage2D( _gl[ targetMap[target] ], 0, glFormat, glFormat, glType, img );
                else
                    _gl.texImage2D( _gl[ targetMap[target] ], 0, glFormat, this.width, this.height, 0, glFormat, glType, this.pixels[target] );
            }, this);

            if( !this.NPOT && this.generateMipmaps ){
                _gl.generateMipmap( _gl.TEXTURE_CUBE_MAP );
            }

            _gl.bindTexture( _gl.TEXTURE_CUBE_MAP, null );
        },
        bind : function( _gl ){

            _gl.bindTexture( _gl.TEXTURE_CUBE_MAP, this.getWebGLTexture(_gl) );
        },
        unbind : function( _gl ){
            _gl.bindTexture( _gl.TEXTURE_CUBE_MAP, null );
        },
        // Overwrite the isPowerOfTwo method
        isPowerOfTwo : function(){
            if( this.image.px ){
                return isPowerOfTwo( this.image.px.width ) &&
                        isPowerOfTwo( this.image.px.height );
            }else{
                return isPowerOfTwo( this.width ) &&
                        isPowerOfTwo( this.height );
            }

            function isPowerOfTwo( value ){
                return value & (value-1) === 0
            }
        },
        isRenderable : function(){
            if( this.image.px ){
                return this.image.px.complete &&
                        this.image.nx.complete &&
                        this.image.py.complete &&
                        this.image.ny.complete &&
                        this.image.pz.complete &&
                        this.image.nz.complete;
            }else{
                return this.width && this.height;
            }
        }
    });

    return TextureCube;
} )