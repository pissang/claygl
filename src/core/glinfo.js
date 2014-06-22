/**
 * @namespace qtek.core.glinfo
 * @see http://www.khronos.org/registry/webgl/extensions/
 */
define(function() {
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
        /**
         * Initialize all extensions in context
         * @param  {WebGLRenderingContext} _gl
         * @memberOf qtek.core.glinfo
         */
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

        /**
         * Get extension
         * @param  {WebGLRenderingContext} _gl
         * @param {string} name - Extension name, vendorless
         * @return {WebGLExtension}
         * @memberOf qtek.core.glinfo
         */
        getExtension : function(_gl, name) {
            var glid = _gl.__GLID__;
            if (extensions[glid]) {
                if (typeof(extensions[glid][name]) == 'undefined') {
                    this._createExtension(_gl, name);
                }
                return extensions[glid][name];
            }
        },
        /**
         * Dispose context
         * @param  {WebGLRenderingContext} _gl
         * @memberOf qtek.core.glinfo
         */
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