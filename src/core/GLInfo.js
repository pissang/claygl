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
    'WEBGL_draw_buffers',
    'EXT_frag_depth',
    'EXT_sRGB',
    'ANGLE_instanced_arrays'
];

var PARAMETER_NAMES = [
    'MAX_TEXTURE_SIZE',
    'MAX_CUBE_MAP_TEXTURE_SIZE'
];

function GLInfo(_gl) {
    var extensions = {};
    var parameters = {};

    // Get webgl extension
    for (var i = 0; i < EXTENSION_LIST.length; i++) {
        var extName = EXTENSION_LIST[i];
        createExtension(extName);
    }
    // Get parameters
    for (var i = 0; i < PARAMETER_NAMES.length; i++) {
        var name = PARAMETER_NAMES[i];
        parameters[name] = _gl.getParameter(_gl[name]);
    }

    this.getExtension = function (name) {
        if (!(name in extensions)) {
            createExtension(name);
        }
        return extensions[name];
    };

    this.getParameter = function (name) {
        return parameters[name];
    };

    function createExtension(name) {
        if (_gl.getExtension) {
            var ext = _gl.getExtension(name);
            if (!ext) {
                ext = _gl.getExtension('MOZ_' + name);
            }
            if (!ext) {
                ext = _gl.getExtension('WEBKIT_' + name);
            }
            extensions[name] = ext;
        }
    }
}

export default GLInfo;
