/**
 *
 * @export{class} TextureCube
 */
define( function(require){

	var Texture = require('../texture'),
		_ = require('_');

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

			var glFormat = _gl[ this.format.upperCase() ],
				glType = _gl[ this.type.upperCase() ];

			_gl.texParameteri( _gl.TEXTURE_CUBE_MAP, _gl.TEXTURE_WRAP_S, _gl[ this.wrapS.toUpperCase() ] );
			_gl.texParameteri( _gl.TEXTURE_CUBE_MAP, _gl.TEXTURE_WRAP_T, _gl[ this.wrapT.toUpperCase() ] );

			_gl.texParameteri( _gl.TEXTURE_CUBE_MAP, _gl.TEXTURE_MAG_FILTER, _gl[ this.magFilter.toUpperCase() ] );
			_gl.texParameteri( _gl.TEXTURE_CUBE_MAP, _gl.TEXTURE_MIN_FILTER, _gl[ this.minFilter.toUpperCase() ] );
			
            if( this.cache.miss("anisotropic_ext") ){
                var ext = _gl.getExtension("MOZ_EXT_texture_filter_anisotropic");
                if( ! ext){
                    ext = _gl.getExtension("WEBKIT_EXT_texture_filter_anisotropic");
                }
                this.cache.put("anisotropic_ext", null);
            }else{
                var ext = this.cache.get("anisotropic_ext");
                if( ext){
                    _gl.texParameterf(_gl.TEXTURE_CUBE_MAP, ext.TEXTURE_MAX_ANISOTROPY_EXT, this.anisotropic);
                }
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
		isPowerOfTwo : function( image){
			return isPowerOfTwo( image.px.width ) &&
					isPowerOfTwo( image.px.height );
			function isPowerOfTwo( value ){
				return value & (value-1) === 0
			}
		}
	})
} )