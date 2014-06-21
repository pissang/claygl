define(function() {
    // http://www.khronos.org/registry/webgl/extensions/
    var EXTENSION_LIST = [
        "OES_texture_float",
        "OES_texture_half_float",
        "OES_texture_float_linear",
        "OES_texture_half_float_linear",
        "OES_standard_derivatives",
        "OES_vertex_array_object",
        "OES_element_index_uint",
        "WEBGL_compressed_texture_s3tc",
        'WEBGL_depth_texture',
        "EXT_texture_filter_anisotropic",
        "WEBGL_draw_buffers"
    ];

    var extensions = {};

    var glinfo = {

        initialize : function(_gl) {

            if (extensions[_gl.__GLID__]) {
                return;
            }
            extensions[_gl.__GLID__] = {};
            // Get webgl extension
            for (var i = 0; i < EXTENSION_LIST.length; i++) {
                var extName = EXTENSION_LIST[i];

                this._createExtension(_gl, extName);
            }
        },

        getExtension : function(_gl, name) {
            var glid = _gl.__GLID__;
            if (extensions[glid]) {
                if (typeof(extensions[glid][name]) == 'undefined') {
                    this._createExtension(_gl, name);
                }
                return extensions[glid][name];
            }
        },

        dispose: function(_gl) {
            delete extensions[_gl.__GLID__];
        },

        _createExtension : function(_gl, name) {
            var ext = _gl.getExtension(name);
            if (!ext) {
                ext = _gl.getExtension('MOZ_' + name);
            }
            if (!ext) {
                ext = _gl.getExtension('WEBKIT_' + name);
            }

            extensions[_gl.__GLID__][name] = ext;
        }
    }

    return glinfo;
})