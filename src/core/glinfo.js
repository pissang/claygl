/**
 * @namespace qtek.core.glinfo
 * @see http://www.khronos.org/registry/webgl/extensions/
 */
define(function() {
    
    'use strict';

    var EXTENSION_LIST = [
        'OES_texture_float',
        'OES_texture_half_float',
        'OES_texture_float_linear',
        'OES_texture_half_float_linear',
        'OES_standard_derivatives',
        'OES_vertex_array_object',
        'OES_element_index_uint',
        'WEBGL_compressed_texture_s3tc',
        'WEBGL_depth_texture',
        'EXT_texture_filter_anisotropic',
        'EXT_shader_texture_lod',
        'WEBGL_draw_buffers'
    ];

    var PARAMETER_NAMES = [
        'MAX_TEXTURE_SIZE',
        'MAX_CUBE_MAP_TEXTURE_SIZE'
    ]

    var extensions = {};
    var parameters = {};

    var glinfo = {
        /**
         * Initialize all extensions and parameters in context
         * @param  {WebGLRenderingContext} _gl
         * @memberOf qtek.core.glinfo
         */
        initialize: function(_gl) {
            var glid = _gl.__GLID__;
            if (extensions[glid]) {
                return;
            }
            extensions[glid] = {};
            parameters[glid] = {};
            // Get webgl extension
            for (var i = 0; i < EXTENSION_LIST.length; i++) {
                var extName = EXTENSION_LIST[i];

                this._createExtension(_gl, extName);
            }
            // Get parameters
            for (var i = 0; i < PARAMETER_NAMES.length; i++) {
                var name = PARAMETER_NAMES[i];
                parameters[glid][name] = _gl.getParameter(_gl[name]);
            }
        },

        /**
         * Get extension
         * @param  {WebGLRenderingContext} _gl
         * @param {string} name - Extension name, vendorless
         * @return {WebGLExtension}
         * @memberOf qtek.core.glinfo
         */
        getExtension: function(_gl, name) {
            var glid = _gl.__GLID__;
            if (extensions[glid]) {
                if (typeof(extensions[glid][name]) == 'undefined') {
                    this._createExtension(_gl, name);
                }
                return extensions[glid][name];
            }
        },

        /**
         * Get parameter
         * @param {WebGLRenderingContext} _gl
         * @param {string} name Parameter name
         * @return {*}
         */
        getParameter: function(_gl, name) {
            var glid = _gl.__GLID__;
            if (parameters[glid]) {
                return parameters[glid][name];
            }
        },

        /**
         * Dispose context
         * @param  {WebGLRenderingContext} _gl
         * @memberOf qtek.core.glinfo
         */
        dispose: function(_gl) {
            delete extensions[_gl.__GLID__];
            delete parameters[_gl.__GLID__];
        },

        _createExtension: function(_gl, name) {
            var ext = _gl.getExtension(name);
            if (!ext) {
                ext = _gl.getExtension('MOZ_' + name);
            }
            if (!ext) {
                ext = _gl.getExtension('WEBKIT_' + name);
            }

            extensions[_gl.__GLID__][name] = ext;
        }
    };

    return glinfo;
});