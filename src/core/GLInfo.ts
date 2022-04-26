const EXTENSION_LIST = [
  'OES_texture_float',
  'OES_texture_half_float',
  'OES_texture_float_linear',
  'OES_texture_half_float_linear',
  'OES_standard_derivatives',
  'OES_vertex_array_object',
  'OES_element_index_uint',
  'WEBGL_compressed_texture_s3tc',
  'WEBGL_compressed_texture_etc',
  'WEBGL_compressed_texture_etc1',
  'WEBGL_compressed_texture_pvrtc',
  'WEBGL_compressed_texture_atc',
  'WEBGL_compressed_texture_astc',
  'WEBGL_depth_texture',
  'EXT_texture_filter_anisotropic',
  'EXT_shader_texture_lod',
  'WEBGL_draw_buffers',
  'EXT_frag_depth',
  'EXT_sRGB',
  'ANGLE_instanced_arrays'
] as const;

const PARAMETER_NAMES = ['MAX_TEXTURE_SIZE', 'MAX_CUBE_MAP_TEXTURE_SIZE'];

class GLInfo {
  private _extensions: Record<string, any> = {};
  private _parameters: Record<string, any> = {};
  gl: WebGLRenderingContext;

  constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
    // Get webgl extension
    for (let i = 0; i < EXTENSION_LIST.length; i++) {
      const extName = EXTENSION_LIST[i];
      this._createExtension(extName);
    }
    // Get parameters
    for (let i = 0; i < PARAMETER_NAMES.length; i++) {
      const name = PARAMETER_NAMES[i];
      this._parameters[name] = gl.getParameter((gl as any)[name]);
    }
  }

  getExtension(name: string) {
    if (!(name in this._extensions)) {
      this._createExtension(name);
    }
    return this._extensions[name];
  }

  getParameter(name: string) {
    return this._parameters[name];
  }

  private _createExtension(name: string) {
    const gl = this.gl;
    if (gl.getExtension) {
      let ext = gl.getExtension(name);
      if (!ext) {
        ext = gl.getExtension('MOZ_' + name);
      }
      if (!ext) {
        ext = gl.getExtension('WEBKIT_' + name);
      }
      this._extensions[name] = ext;
    }
  }
}

export default GLInfo;
