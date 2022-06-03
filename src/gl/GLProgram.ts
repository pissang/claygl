import { assign, genGUID, isArray, keys } from '../core/util';
import Shader, { AttributeSemantic, UniformSemantic } from '../Shader';
import * as constants from '../core/constants';
import GLTexture from './GLTexture';

// some util functions
function addLineNumbers(string: string) {
  const chunks = string.split('\n');
  for (let i = 0, il = chunks.length; i < il; i++) {
    // Chrome reports shader errors on lines
    // starting counting from 1
    chunks[i] = i + 1 + ': ' + chunks[i];
  }
  return chunks.join('\n');
}

// Return true or error msg if error happened
function checkShaderErrorMsg(
  _gl: WebGLRenderingContext,
  shader: WebGLShader,
  shaderString: string
) {
  if (!_gl.getShaderParameter(shader, constants.COMPILE_STATUS)) {
    return [_gl.getShaderInfoLog(shader), addLineNumbers(shaderString)].join('\n');
  }
}

const tmpFloat32Array16 = new Float32Array(16);

class GLProgram {
  readonly uid = genGUID();

  semanticsMap: Shader['semanticsMap'] = {};
  attributes: Shader['attributes'] = {};

  vertexCode: string = '';
  fragmentCode: string = '';

  private _uniformLocations: Record<string, WebGLUniformLocation> = {};
  private _textureSlot: number = 0;

  private _program?: WebGLProgram;

  private _cachedAttribLoc: Record<string, number> = {};

  private _valueCache: Record<string, any> = {};

  // Error message
  __error?: string;

  constructor() {}

  bind(gl: WebGLRenderingContext) {
    // Reset texture slot
    this._textureSlot = 0;
    if (this._program) {
      gl.useProgram(this._program);
    }
    this._valueCache = {};
  }

  isValid() {
    return !!this._program;
  }

  hasUniform(symbol: string) {
    const location = this._uniformLocations[symbol];
    return location !== null && location !== undefined;
  }

  useTextureSlot(gl: WebGLRenderingContext, texture: GLTexture | undefined, slot: number) {
    if (texture) {
      gl.activeTexture(constants.TEXTURE0 + slot);
      texture.bind(gl);
    }
  }

  currentTextureSlot() {
    return this._textureSlot;
  }

  resetTextureSlot(slot: number) {
    this._textureSlot = slot || 0;
  }

  takeTextureSlot(gl: WebGLRenderingContext, texture?: GLTexture) {
    const textureSlot = this._textureSlot;
    this.useTextureSlot(gl, texture, textureSlot);
    this._textureSlot++;
    return textureSlot;
  }

  set(_gl: WebGLRenderingContext, type: string, symbol: string, value: any, force?: boolean) {
    const locationMap = this._uniformLocations;
    const location = locationMap[symbol];
    const valueCache = this._valueCache;
    // Uniform is not existed in the shader
    if (location == null) {
      return false;
    }

    const prevVal = valueCache[symbol];
    // Only compare the instance because we assume the value is immutable during the rendering pass.
    if (prevVal === value && !force) {
      // Stil return true.
      return true;
    }
    valueCache[symbol] = value;

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
        if (isArray(value) && isArray(value[0])) {
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
  }

  setSemanticUniform(_gl: WebGLRenderingContext, semantic: string, val: any) {
    const semanticInfo = this.semanticsMap[semantic as UniformSemantic];
    if (semanticInfo) {
      // Force set for semantic uniforms.
      return this.set(_gl, semanticInfo.type, semanticInfo.name, val, true);
    }
    return false;
  }

  getAttributeLocation(
    gl: WebGLRenderingContext,
    attribBuffer: {
      name: string;
      semantic?: AttributeSemantic;
    }
  ) {
    const cachedAttribLoc = this._cachedAttribLoc;

    const semantic = attribBuffer.semantic;
    let symbol = attribBuffer.name;

    if (semantic) {
      const semanticInfo = this.semanticsMap[semantic as AttributeSemantic];
      symbol = (semanticInfo && semanticInfo.name)!;
    }

    let location = cachedAttribLoc[symbol];
    if (location === undefined) {
      location = cachedAttribLoc[symbol] = gl.getAttribLocation(this._program!, symbol);
    }
    return location;
  }

  buildProgram(
    gl: WebGLRenderingContext,
    shader: Shader,
    vertexShaderCode: string,
    fragmentShaderCode: string
  ) {
    const vertexShader = gl.createShader(constants.VERTEX_SHADER)!;
    const program = gl.createProgram()!;
    const semanticsMap = shader.semanticsMap;

    assign(this.semanticsMap, semanticsMap);

    gl.shaderSource(vertexShader, vertexShaderCode);
    gl.compileShader(vertexShader);

    const fragmentShader = gl.createShader(constants.FRAGMENT_SHADER)!;
    gl.shaderSource(fragmentShader, fragmentShaderCode);
    gl.compileShader(fragmentShader);

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    // Force the position bind to location 0;
    // Must bindAttribLocation before link program.
    const POSITION = semanticsMap.POSITION;
    if (POSITION) {
      gl.bindAttribLocation(program, 0, POSITION.name);
    } else {
      // Else choose an attribute and bind to location 0;
      gl.bindAttribLocation(program, 0, keys(this.attributes)[0]);
    }
    gl.linkProgram(program);

    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    // Save code.
    this.vertexCode = vertexShaderCode;
    this.fragmentCode = fragmentShaderCode;

    if (!gl.getProgramParameter(program, constants.LINK_STATUS)) {
      // Only check after linked
      // https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices#dont_check_shader_compile_status_unless_linking_fails
      let msg = checkShaderErrorMsg(gl, vertexShader, vertexShaderCode);
      if (msg) {
        return msg;
      }
      msg = checkShaderErrorMsg(gl, fragmentShader, fragmentShaderCode);
      if (msg) {
        return msg;
      }

      return 'Could not link program\n' + gl.getProgramInfoLog(program);
    }
    this._program = program;

    // Cache uniform locations
    const numUniforms = gl.getProgramParameter(program, constants.ACTIVE_UNIFORMS);
    for (let i = 0; i < numUniforms; ++i) {
      const info = gl.getActiveUniform(program, i);
      // TODO Cache other properties?
      if (info) {
        const symbol = info.name;
        // TODO is it robust enough to remove [0]?
        this._uniformLocations[symbol.replace('[0]', '')] = gl.getUniformLocation(program, symbol)!;
      }
    }
  }
}

export default GLProgram;
