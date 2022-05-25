class GLExtension {
  private _extensions: Record<string, any> = {};
  gl: WebGLRenderingContext;

  constructor(gl: WebGLRenderingContext, extensions: readonly string[]) {
    this.gl = gl;
    // Get webgl extension
    for (let i = 0; i < extensions.length; i++) {
      const extName = extensions[i];
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
