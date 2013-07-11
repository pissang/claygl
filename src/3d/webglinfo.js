/**
 * @export{class} WebGLInfo
 */
define(function() {


    // http://www.khronos.org/registry/webgl/extensions/
    var EXTENSION_LIST = ["OES_texture_float",
                            "OES_texture_half_float",
                            "OES_standard_derivatives",
                            "OES_vertex_array_object",
                            "OES_element_index_uint",
                            "WEBGL_compressed_texture_s3tc",
                            'WEBGL_depth_texture',
                            "EXT_texture_filter_anisotropic",
                            "EXT_draw_buffers"];

    var initialized = {};

    var extensions = {};

    var WebGLInfo = {

        initialize : function(_gl) {

            if (initialized[_gl.__GUID__]) {
                return;
            }
            // Basic info

            // Get webgl extension
            for (var i = 0; i < EXTENSION_LIST.length; i++) {
                var extName = EXTENSION_LIST[i];

                var ext = _gl.getExtension(extName);
                // Try vendors
                if (! ext) {
                    ext = _gl.getExtension("MOZ_" + extName);
                }
                if (! ext) {
                    ext = _gl.getExtension("WEBKIT_" + extName);
                }

                extensions[extName] = ext;
            }

            initialized[_gl.__GUID__] = true;
        },

        getExtension : function(_gl, name) {
            var guid = _gl.__GUID__;
            if (extensions[guid]) {
                return extensions[guid][name];
            }
        }
    }

    return WebGLInfo;
})