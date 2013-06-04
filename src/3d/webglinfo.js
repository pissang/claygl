/**
 * @export{class} WebGLInfo
 */
define( function(){


    // http://www.khronos.org/registry/webgl/extensions/
    var EXTENSION_LIST = ["OES_texture_float",
                            "OES_texture_half_float",
                            "OES_standard_derivatives",
                            "OES_vertex_array_object",
                            "OES_element_index_uint",
                            "WEBGL_compressed_texture_s3tc",
                            'WEBGL_depth_texture',
                            "EXT_texture_filter_anisotropic"];
                            // "EXT_draw_buffers"];

    var initialized = false;

    var extensions = {};

    var WebGLInfo = {

        initialize : function( _gl ){
            if(initialized){
                return;
            }
            // Basic info

            // Get webgl extension
            for(var i = 0; i < EXTENSION_LIST.length; i++){
                var extName = EXTENSION_LIST[i];

                var ext = _gl.getExtension(extName);
                // Try vendors
                if( ! ext){
                    ext = _gl.getExtension("MOZ_" + extName);
                }
                if( ! ext){
                    ext = _gl.getExtension("WEBKIT_" + extName);
                }

                extensions[extName] = ext;
            }

            initialized = true;
        },

        getExtension : function(name){
            return extensions[name];
        }
    }

    return WebGLInfo;
} )