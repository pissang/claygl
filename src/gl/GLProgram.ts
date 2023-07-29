import { assign, genGUID, isArray, keys } from '../core/util';
import Shader, { AttributeSemantic, UniformSemantic, UniformType } from '../Shader';
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
  _gl: WebGL2RenderingContext,
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

  private _vertexShader?: WebGLShader;
  private _fragmentShader?: WebGLShader;

  // Error message
  __error?: string;

  // Used when using parallel compile
  __compiling?: boolean;

  constructor() {}

  bind(gl: WebGL2RenderingContext) {
    // Reset texture slot
    this._textureSlot = 0;
    if (this._program) {
      gl.useProgram(this._program);
    }
    this._valueCache = {};
  }

  isValid() {
    return !!this._program && !this.__compiling;
  }

  isCompiling() {
    return this.__compiling;
  }

  checkParallelCompiled(gl: WebGL2RenderingContext, parallelExt: any) {
    return (
      this._program &&
      gl.getProgramParameter(this._program, parallelExt.COMPLETION_STATUS_KHR) == true
    );
  }

  hasUniform(symbol: string) {
    const location = this._uniformLocations[symbol];
    return location !== null && location !== undefined;
  }

  useTextureSlot(gl: WebGL2RenderingContext, texture: GLTexture | undefined, slot: number) {
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

  takeTextureSlot(gl: WebGL2RenderingContext, texture?: GLTexture) {
    const textureSlot = this._textureSlot;
    this.useTextureSlot(gl, texture, textureSlot);
    this._textureSlot++;
    return textureSlot;
  }

  set(
    _gl: WebGL2RenderingContext,
    type: UniformType,
    symbol: string,
    value: any,
    valueArray: boolean,
    force?: boolean
  ) {
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
      case 'mat4':
        if (valueArray) {
          if (isArray(value) && isArray(value[0])) {
            const tmpArray = new Float32Array(value.length * 16);
            let cursor = 0;
            for (let i = 0; i < value.length; i++) {
              const item = value[i];
              for (let j = 0; j < 16; j++) {
                tmpArray[cursor++] = item[j];
              }
            }
            value = tmpArray;
          }
          // else ArrayBufferView
        } else {
          if (!(value instanceof Float32Array)) {
            // Use Float32Array is much faster than array when uniformMatrix4fv.
            for (let i = 0; i < value.length; i++) {
              tmpFloat32Array16[i] = value[i];
            }
            value = tmpFloat32Array16;
          }
        }
        _gl.uniformMatrix4fv(location, false, value);
        break;
      case 'float':
        valueArray ? _gl.uniform1fv(location, value) : _gl.uniform1f(location, value);
        break;
      case 'vec2':
        valueArray ? _gl.uniform2fv(location, value) : _gl.uniform2f(location, value[0], value[1]);
        break;
      case 'vec3':
        valueArray
          ? _gl.uniform3fv(location, value)
          : _gl.uniform3f(location, value[0], value[1], value[2]);
        break;
      case 'vec4':
        valueArray
          ? _gl.uniform4fv(location, value)
          : _gl.uniform4f(location, value[0], value[1], value[2], value[3]);
        break;
      case 'int':
      case 'bool':
        valueArray ? _gl.uniform1iv(location, value) : _gl.uniform1i(location, value);
        break;
      case 'ivec2':
        valueArray ? _gl.uniform2iv(location, value) : _gl.uniform2i(location, value[0], value[1]);
        break;
      case 'ivec3':
        valueArray
          ? _gl.uniform3iv(location, value)
          : _gl.uniform3i(location, value[0], value[1], value[2]);
        break;
      case 'ivec4':
        valueArray
          ? _gl.uniform4iv(location, value)
          : _gl.uniform4i(location, value[0], value[1], value[2], value[3]);
        break;
      case 'mat2':
        _gl.uniformMatrix2fv(location, false, value);
        break;
      case 'mat3':
        _gl.uniformMatrix3fv(location, false, value);
        break;
      // case '_struct':

      default:
        throw 'Unknown type ' + type;
    }
    return true;
  }

  setSemanticUniform(_gl: WebGL2RenderingContext, semantic: string, val: any) {
    const semanticInfo = this.semanticsMap[semantic as UniformSemantic];
    if (semanticInfo) {
      // Uniform with semantic can't be array.
      // Force set for semantic uniforms.
      return this.set(_gl, semanticInfo.type, semanticInfo.name, val, false, true);
    }
    return false;
  }

  getAttributeLocation(
    gl: WebGL2RenderingContext,
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
    gl: WebGL2RenderingContext,
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

    // Save code.
    this.vertexCode = vertexShaderCode;
    this.fragmentCode = fragmentShaderCode;

    this._vertexShader = vertexShader;
    this._fragmentShader = fragmentShader;
    this._program = program;
  }

  updateLinkStatus(gl: WebGL2RenderingContext) {
    const program = this._program;
    const vertexShader = this._vertexShader;
    const fragmentShader = this._fragmentShader;
    const vertexShaderCode = this.vertexCode;
    const fragmentShaderCode = this.fragmentCode;

    if (!program) {
      return;
    }

    let errMsg = '';
    if (!gl.getProgramParameter(program, constants.LINK_STATUS)) {
      // Only check after linked
      // https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices#dont_check_shader_compile_status_unless_linking_fails
      let msg = checkShaderErrorMsg(gl, vertexShader!, vertexShaderCode);
      if (msg) {
        errMsg = msg;
      }
      if (!errMsg) {
        msg = checkShaderErrorMsg(gl, fragmentShader!, fragmentShaderCode);
        if (msg) {
          errMsg = msg;
        }
      }
      if (!errMsg) {
        errMsg = 'Could not link program\n' + gl.getProgramInfoLog(program);
      }
    }

    this.__error = errMsg;

    gl.deleteShader(vertexShader!);
    gl.deleteShader(fragmentShader!);
    this._vertexShader = this._fragmentShader = undefined;

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

    this.__compiling = false;
  }
}

export default GLProgram;
