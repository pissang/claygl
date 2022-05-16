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

class GLExtension {
  private _extensions: Record<string, any> = {};
  gl: WebGLRenderingContext;

  constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
    // Get webgl extension
    for (let i = 0; i < EXTENSION_LIST.length; i++) {
      const extName = EXTENSION_LIST[i];
      this._createExtension(extName);
    }
  }

  getExtension(name: string) {
    if (!(name in this._extensions)) {
      this._createExtension(name);
    }
    return this._extensions[name];
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

export default GLExtension;
