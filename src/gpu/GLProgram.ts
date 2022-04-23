// @ts-nocheck
import vendor from '../core/vendor';
import Base from '../core/Base';

const SHADER_STATE_TO_ENABLE = 1;
const SHADER_STATE_KEEP_ENABLE = 2;
const SHADER_STATE_PENDING = 3;

// Enable attribute operation is global to all programs
// Here saved the list of all enabled attribute index
// http://www.mjbshaw.com/2013/03/webgl-fixing-invalidoperation.html
const enabledAttributeList = {};

// some util functions
function addLineNumbers(string) {
  const chunks = string.split('\n');
  for (let i = 0, il = chunks.length; i < il; i++) {
    // Chrome reports shader errors on lines
    // starting counting from 1
    chunks[i] = i + 1 + ': ' + chunks[i];
  }
  return chunks.join('\n');
}

// Return true or error msg if error happened
function checkShaderErrorMsg(_gl, shader, shaderString) {
  if (!_gl.getShaderParameter(shader, _gl.COMPILE_STATUS)) {
    return [_gl.getShaderInfoLog(shader), addLineNumbers(shaderString)].join('\n');
  }
}

const tmpFloat32Array16 = new Float32Array(16);

const GLProgram = Base.extend(
  {
    uniformSemantics: {},
    attributes: {}
  },
  function () {
    this._locations = {};

    this._textureSlot = 0;

    this._program = null;
  },
  {
    bind: function (renderer) {
      this._textureSlot = 0;
      renderer.gl.useProgram(this._program);
    },

    hasUniform: function (symbol) {
      const location = this._locations[symbol];
      return location !== null && location !== undefined;
    },

    useTextureSlot: function (renderer, texture, slot) {
      if (texture) {
        renderer.gl.activeTexture(renderer.gl.TEXTURE0 + slot);
        // Maybe texture is not loaded yet;
        if (texture.isRenderable()) {
          texture.bind(renderer);
        } else {
          // Bind texture to null
          texture.unbind(renderer);
        }
      }
    },

    currentTextureSlot: function () {
      return this._textureSlot;
    },

    resetTextureSlot: function (slot) {
      this._textureSlot = slot || 0;
    },

    takeCurrentTextureSlot: function (renderer, texture) {
      const textureSlot = this._textureSlot;

      this.useTextureSlot(renderer, texture, textureSlot);

      this._textureSlot++;

      return textureSlot;
    },

    setUniform: function (_gl, type, symbol, value) {
      const locationMap = this._locations;
      const location = locationMap[symbol];
      // Uniform is not existed in the shader
      if (location === null || location === undefined) {
        return false;
      }

      switch (type) {
        case 'm4':
          if (!(value instanceof Float32Array)) {
            // Use Float32Array is much faster than array when uniformMatrix4fv.
            for (let i = 0; i < value.length; i++) {
              tmpFloat32Array16[i] = value[i];
            }
            value = tmpFloat32Array16;
          }
          _gl.uniformMatrix4fv(location, false, value);
          break;
        case '2i':
          _gl.uniform2i(location, value[0], value[1]);
          break;
        case '2f':
          _gl.uniform2f(location, value[0], value[1]);
          break;
        case '3i':
          _gl.uniform3i(location, value[0], value[1], value[2]);
          break;
        case '3f':
          _gl.uniform3f(location, value[0], value[1], value[2]);
          break;
        case '4i':
          _gl.uniform4i(location, value[0], value[1], value[2], value[3]);
          break;
        case '4f':
          _gl.uniform4f(location, value[0], value[1], value[2], value[3]);
          break;
        case '1i':
          _gl.uniform1i(location, value);
          break;
        case '1f':
          _gl.uniform1f(location, value);
          break;
        case '1fv':
          _gl.uniform1fv(location, value);
          break;
        case '1iv':
          _gl.uniform1iv(location, value);
          break;
        case '2iv':
          _gl.uniform2iv(location, value);
          break;
        case '2fv':
          _gl.uniform2fv(location, value);
          break;
        case '3iv':
          _gl.uniform3iv(location, value);
          break;
        case '3fv':
          _gl.uniform3fv(location, value);
          break;
        case '4iv':
          _gl.uniform4iv(location, value);
          break;
        case '4fv':
          _gl.uniform4fv(location, value);
          break;
        case 'm2':
        case 'm2v':
          _gl.uniformMatrix2fv(location, false, value);
          break;
        case 'm3':
        case 'm3v':
          _gl.uniformMatrix3fv(location, false, value);
          break;
        case 'm4v':
          // Raw value
          if (Array.isArray(value) && Array.isArray(value[0])) {
            const array = new Float32Array(value.length * 16);
            let cursor = 0;
            for (let i = 0; i < value.length; i++) {
              const item = value[i];
              for (let j = 0; j < 16; j++) {
                array[cursor++] = item[j];
              }
            }
            _gl.uniformMatrix4fv(location, false, array);
          } else {
            // ArrayBufferView
            _gl.uniformMatrix4fv(location, false, value);
          }
          break;
      }
      return true;
    },

    setUniformOfSemantic: function (_gl, semantic, val) {
      const semanticInfo = this.uniformSemantics[semantic];
      if (semanticInfo) {
        return this.setUniform(_gl, semanticInfo.type, semanticInfo.symbol, val);
      }
      return false;
    },

    // Used for creating VAO
    // Enable the attributes passed in and disable the rest
    // Example Usage:
    // enableAttributes(renderer, ["position", "texcoords"])
    enableAttributes: function (renderer, attribList, vao) {
      const _gl = renderer.gl;
      const program = this._program;

      const locationMap = this._locations;

      let enabledAttributeListInContext;
      if (vao) {
        enabledAttributeListInContext = vao.__enabledAttributeList;
      } else {
        enabledAttributeListInContext = enabledAttributeList[renderer.__uid__];
      }
      if (!enabledAttributeListInContext) {
        // In vertex array object context
        // PENDING Each vao object needs to enable attributes again?
        if (vao) {
          enabledAttributeListInContext = vao.__enabledAttributeList = [];
        } else {
          enabledAttributeListInContext = enabledAttributeList[renderer.__uid__] = [];
        }
      }
      const locationList = [];
      for (let i = 0; i < attribList.length; i++) {
        const symbol = attribList[i];
        if (!this.attributes[symbol]) {
          locationList[i] = -1;
          continue;
        }
        let location = locationMap[symbol];
        if (location == null) {
          location = _gl.getAttribLocation(program, symbol);
          // Attrib location is a number from 0 to ...
          if (location === -1) {
            locationList[i] = -1;
            continue;
          }
          locationMap[symbol] = location;
        }
        locationList[i] = location;

        if (!enabledAttributeListInContext[location]) {
          enabledAttributeListInContext[location] = SHADER_STATE_TO_ENABLE;
        } else {
          enabledAttributeListInContext[location] = SHADER_STATE_KEEP_ENABLE;
        }
      }

      for (let i = 0; i < enabledAttributeListInContext.length; i++) {
        switch (enabledAttributeListInContext[i]) {
          case SHADER_STATE_TO_ENABLE:
            _gl.enableVertexAttribArray(i);
            enabledAttributeListInContext[i] = SHADER_STATE_PENDING;
            break;
          case SHADER_STATE_KEEP_ENABLE:
            enabledAttributeListInContext[i] = SHADER_STATE_PENDING;
            break;
          // Expired
          case SHADER_STATE_PENDING:
            _gl.disableVertexAttribArray(i);
            enabledAttributeListInContext[i] = 0;
            break;
        }
      }

      return locationList;
    },

    getAttribLocation: function (_gl, symbol) {
      const locationMap = this._locations;

      let location = locationMap[symbol];
      if (location == null) {
        location = _gl.getAttribLocation(this._program, symbol);
        locationMap[symbol] = location;
      }

      return location;
    },

    isAttribEnabled: function (renderer, location) {
      const enabledAttributeListInContext = enabledAttributeList[renderer.__uid__] || [];

      return !!enabledAttributeListInContext[location];
    },

    buildProgram: function (_gl, shader, vertexShaderCode, fragmentShaderCode) {
      const vertexShader = _gl.createShader(_gl.VERTEX_SHADER);
      const program = _gl.createProgram();

      _gl.shaderSource(vertexShader, vertexShaderCode);
      _gl.compileShader(vertexShader);

      const fragmentShader = _gl.createShader(_gl.FRAGMENT_SHADER);
      _gl.shaderSource(fragmentShader, fragmentShaderCode);
      _gl.compileShader(fragmentShader);

      let msg = checkShaderErrorMsg(_gl, vertexShader, vertexShaderCode);
      if (msg) {
        return msg;
      }
      msg = checkShaderErrorMsg(_gl, fragmentShader, fragmentShaderCode);
      if (msg) {
        return msg;
      }

      _gl.attachShader(program, vertexShader);
      _gl.attachShader(program, fragmentShader);
      // Force the position bind to location 0;
      if (shader.attributeSemantics.POSITION) {
        _gl.bindAttribLocation(program, 0, shader.attributeSemantics.POSITION.symbol);
      } else {
        // Else choose an attribute and bind to location 0;
        const keys = Object.keys(this.attributes);
        _gl.bindAttribLocation(program, 0, keys[0]);
      }

      _gl.linkProgram(program);

      _gl.deleteShader(vertexShader);
      _gl.deleteShader(fragmentShader);

      this._program = program;

      // Save code.
      this.vertexCode = vertexShaderCode;
      this.fragmentCode = fragmentShaderCode;

      if (!_gl.getProgramParameter(program, _gl.LINK_STATUS)) {
        return 'Could not link program\n' + _gl.getProgramInfoLog(program);
      }

      // Cache uniform locations
      for (let i = 0; i < shader.uniforms.length; i++) {
        const uniformSymbol = shader.uniforms[i];
        this._locations[uniformSymbol] = _gl.getUniformLocation(program, uniformSymbol);
      }
    }
  }
);

export default GLProgram;
