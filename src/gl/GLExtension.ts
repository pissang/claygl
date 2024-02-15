class GLExtension {
  private _extensions: Record<string, any> = {};
  gl: WebGL2RenderingContext;

  constructor(gl: WebGL2RenderingContext, extensions: readonly string[]) {
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
    // This is not used and will warn on chrome.
    if (name === 'WEBGL_polygon_mode') {
      return;
    }

    const gl = this.gl;
    if (gl.getExtension) {
      let ext = gl.getExtension(name);
      this._extensions[name] = ext;
    }
  }
}

export default GLExtension;
