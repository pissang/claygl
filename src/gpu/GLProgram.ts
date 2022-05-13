import { genGUID, keys } from '../core/util';
import type Renderer from '../Renderer';
import Shader, { UniformSemantic } from '../Shader';
import type Texture from '../Texture';
import * as constants from '../core/constants';

const SHADER_STATE_TO_ENABLE = 1;
const SHADER_STATE_KEEP_ENABLE = 2;
const SHADER_STATE_PENDING = 3;

type ShaderState = 0 | 1 | 2 | 3;

// Enable attribute operation is global to all programs
// Here saved the list of all enabled attribute index
// http://www.mjbshaw.com/2013/03/webgl-fixing-invalidoperation.html
const enabledAttributeList: Record<number, ShaderState[]> = {};

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
  readonly __uid__ = genGUID();

  semanticsMap: Shader['semanticsMap'] = {};
  attributes: Shader['attributes'] = {};

  vertexCode: string = '';
  fragmentCode: string = '';

  private _attrLocations: Record<string, number> = {};
  private _uniformLocations: Record<string, WebGLUniformLocation> = {};
  private _textureSlot: number = 0;

  private _program?: WebGLProgram;

  // Error message
  __error?: string;

  constructor() {}

  bind(renderer: Renderer) {
    this._textureSlot = 0;
    if (this._program) {
      renderer.gl.useProgram(this._program);
    }
  }

  isValid() {
    return !!this._program;
  }

  hasUniform(symbol: string) {
    const location = this._uniformLocations[symbol];
    return location !== null && location !== undefined;
  }

  useTextureSlot(renderer: Renderer, texture: Texture | undefined, slot: number) {
    if (texture) {
      renderer.gl.activeTexture(constants.TEXTURE0 + slot);
      // Maybe texture is not loaded yet;
      if (texture.isRenderable()) {
        texture.bind(renderer);
      } else {
        // Bind texture to null
        texture.unbind(renderer);
      }
    }
  }

  currentTextureSlot() {
    return this._textureSlot;
  }

  resetTextureSlot(slot: number) {
    this._textureSlot = slot || 0;
  }

  takeCurrentTextureSlot(renderer: Renderer, texture?: Texture) {
    const textureSlot = this._textureSlot;

    this.useTextureSlot(renderer, texture, textureSlot);

    this._textureSlot++;

    return textureSlot;
  }

  setUniform(_gl: WebGLRenderingContext, type: string, symbol: string, value: any) {
    const locationMap = this._uniformLocations;
    const location = locationMap[symbol];
    // Uniform is not existed in the shader
    if (location == null) {
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
  }

  setUniformOfSemantic(_gl: WebGLRenderingContext, semantic: string, val: any) {
    const semanticInfo = this.semanticsMap[semantic as UniformSemantic];
    if (semanticInfo) {
      return this.setUniform(_gl, semanticInfo.type, semanticInfo.symbol, val);
    }
    return false;
  }

  // Used for creating VAO
  // Enable the attributes passed in and disable the rest
  // Example Usage:
  // enableAttributes(renderer, ["position", "texcoords"])
  enableAttributes(
    renderer: Renderer,
    attribList: string[],
    vao: {
      __enabledAttrList: ShaderState[];
    }
  ) {
    const _gl = renderer.gl;
    const program = this._program;
    if (!program) {
      return [];
    }

    const locationMap = this._attrLocations;

    let enabledAttributeListInContext;
    if (vao) {
      enabledAttributeListInContext = vao.__enabledAttrList;
    } else {
      enabledAttributeListInContext = enabledAttributeList[renderer.__uid__];
    }
    if (!enabledAttributeListInContext) {
      // In vertex array object context
      // PENDING Each vao object needs to enable attributes again?
      if (vao) {
        enabledAttributeListInContext = vao.__enabledAttrList = [];
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
  }

  getAttribLocation(_gl: WebGLRenderingContext, symbol: string) {
    const locationMap = this._attrLocations;
    const program = this._program;

    let location = locationMap[symbol];
    if (location == null && program) {
      location = _gl.getAttribLocation(program, symbol);
      locationMap[symbol] = location;
    }

    return location;
  }

  isAttribEnabled(renderer: Renderer, location: number) {
    const enabledAttributeListInContext = enabledAttributeList[renderer.__uid__] || [];

    return !!enabledAttributeListInContext[location];
  }

  buildProgram(
    _gl: WebGLRenderingContext,
    shader: Shader,
    vertexShaderCode: string,
    fragmentShaderCode: string
  ) {
    const vertexShader = _gl.createShader(constants.VERTEX_SHADER)!;
    const program = _gl.createProgram()!;
    const semanticsMap = shader.semanticsMap;

    _gl.shaderSource(vertexShader, vertexShaderCode);
    _gl.compileShader(vertexShader);

    const fragmentShader = _gl.createShader(constants.FRAGMENT_SHADER)!;
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
    // Else choose an attribute and bind to location 0;
    _gl.bindAttribLocation(
      program,
      0,
      semanticsMap.POSITION ? semanticsMap.POSITION.symbol : keys(this.attributes)[0]
    );

    _gl.linkProgram(program);

    _gl.deleteShader(vertexShader);
    _gl.deleteShader(fragmentShader);

    this._program = program;

    // Save code.
    this.vertexCode = vertexShaderCode;
    this.fragmentCode = fragmentShaderCode;

    if (!_gl.getProgramParameter(program, constants.LINK_STATUS)) {
      return 'Could not link program\n' + _gl.getProgramInfoLog(program);
    }

    // Cache uniform locations
    for (let i = 0; i < shader.uniforms.length; i++) {
      const uniformSymbol = shader.uniforms[i];
      this._uniformLocations[uniformSymbol] = _gl.getUniformLocation(program, uniformSymbol)!;
    }
  }
}

export default GLProgram;
