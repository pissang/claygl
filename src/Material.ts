import * as util from './core/util';
import * as colorUtil from './core/color';
import Shader, { ShaderDefineValue, ShaderPrecision, ShaderType, ShaderUniform } from './Shader';
const parseColor = colorUtil.parseToFloat;

const programKeyCache: Record<string, string> = {};

function getDefineCode(defines: Record<string, ShaderDefineValue>) {
  const defineKeys = Object.keys(defines);
  defineKeys.sort();
  const defineStr = [];
  // Custom Defines
  for (let i = 0; i < defineKeys.length; i++) {
    const key = defineKeys[i];
    const value = defines[key];
    defineStr.push(value == null ? key : key + ' ' + value.toString());
  }
  return defineStr.join('\n');
}

function getProgramKey(
  vertexDefines: Record<string, ShaderDefineValue>,
  fragmentDefines: Record<string, ShaderDefineValue>,
  enabledTextures: string[]
) {
  enabledTextures.sort();
  const defineStr = [];
  for (let i = 0; i < enabledTextures.length; i++) {
    const symbol = enabledTextures[i];
    defineStr.push(symbol);
  }
  const key =
    getDefineCode(vertexDefines) +
    '\n' +
    getDefineCode(fragmentDefines) +
    '\n' +
    defineStr.join('\n');

  if (programKeyCache[key]) {
    return programKeyCache[key];
  }

  const id = util.genGUID() + '';
  programKeyCache[key] = id;
  return id;
}

interface TextureStatus {
  shaderType: ShaderType;
  type: 'sampler2D' | 'samplerCube';
  enabled?: boolean;
}

interface MaterialOpts {
  depthTest: boolean;
  depthMask: boolean;
  transparent: boolean;
  shader: Shader;
}

interface Material extends Omit<MaterialOpts, 'shader'> {}
/**
 * Material defines the appearance of mesh surface, like `color`, `roughness`, `metalness`, etc.
 * It contains a {@link clay.Shader} and corresponding uniforms.
 *
 * Here is a basic example to create a standard material
```js
const material = new clay.Material({
    shader: new clay.Shader(
        clay.Shader.source('clay.vertex'),
        clay.Shader.source('clay.fragment')
    )
});
```
 * @constructor clay.Material
 * @extends clay.core.Base
 */
class Material {
  readonly __uid__: number = util.genGUID();

  /**
   * @type {clay.Shader}
   */

  /**
   * Blend func is a callback function when the material
   * have custom blending
   * The gl context will be the only argument passed in tho the
   * blend function
   * Detail of blend function in WebGL:
   * http://www.khronos.org/registry/gles/specs/2.0/es_full_spec_2.0.25.pdf
   *
   * Example :
   * function(_gl) {
   *  _gl.blendEquation(_gl.FUNC_ADD);
   *  _gl.blendFunc(_gl.SRC_ALPHA, _gl.ONE_MINUS_SRC_ALPHA);
   * }
   */
  blend?: (gl: WebGLRenderingContext) => void;

  /**
   * If update texture status automatically.
   */
  autoUpdateTextureStatus = true;

  precision: ShaderPrecision = 'highp';

  uniforms: Record<string, ShaderUniform> = {};
  vertexDefines: Record<string, ShaderDefineValue> = {};
  fragmentDefines: Record<string, ShaderDefineValue> = {};

  private _shader?: Shader;

  private _textureStatus: Record<string, TextureStatus> = {};

  // shadowTransparentMap : null

  // PENDING enable the uniform that only used in shader.
  private _enabledUniforms: string[] = [];
  private _textureUniforms: string[] = [];

  private _programKey?: string;

  constructor(opts?: Partial<MaterialOpts>) {
    opts = opts || {};
    this.shader = opts.shader;
    this.depthTest = util.optional(opts.depthTest, true);
    this.depthMask = util.optional(opts.depthMask, true);
    this.transparent = opts.transparent || false;
  }

  get shader() {
    return this._shader;
  }

  set shader(shader) {
    if (this._shader !== shader && shader) {
      this.attachShader(shader, true);
    }
  }

  /**
   * Set material uniform
   * @example
   *  mat.setUniform('color', [1, 1, 1, 1]);
   * @param {string} symbol
   * @param {number|array|clay.Texture} value
   */
  setUniform(symbol: string, value: number | string | ArrayLike<number>) {
    if (value === undefined) {
      console.warn('Uniform value "' + symbol + '" is undefined');
    }
    const uniform = this.uniforms[symbol];
    if (uniform) {
      if (typeof value === 'string') {
        // Try to parse as a color. Invalid color string will return null.
        value = parseColor(value) || value;
      }

      uniform.value = value;

      if (this.autoUpdateTextureStatus && uniform.type === 't') {
        value ? this.enableTexture(symbol) : this.disableTexture(symbol);
      }
    }
  }

  /**
   * @param {Object} obj
   */
  setUniforms(obj: Record<string, any>) {
    for (const key in obj) {
      const val = obj[key];
      this.setUniform(key, val);
    }
  }

  /**
   * @param  {string}  symbol
   * @return {boolean}
   */
  isUniformEnabled(symbol: string) {
    return this._enabledUniforms.indexOf(symbol) >= 0;
  }

  getEnabledUniforms() {
    return this._enabledUniforms;
  }
  getTextureUniforms() {
    return this._textureUniforms;
  }

  /**
   * Alias of setUniform and setUniforms
   * @param {object|string} symbol
   * @param {number|array|clay.Texture|ArrayBufferView} [value]
   */
  set(symbol: string | Record<string, any>, value?: any) {
    if (typeof symbol === 'object') {
      for (const key in symbol) {
        const val = symbol[key];
        this.setUniform(key, val);
      }
    } else {
      this.setUniform(symbol, value);
    }
  }
  /**
   * Get uniform value
   * @param  {string} symbol
   * @return {number|array|clay.Texture|ArrayBufferView}
   */
  get(symbol: string) {
    const uniform = this.uniforms[symbol];
    if (uniform) {
      return uniform.value;
    }
  }
  /**
   * Attach a shader instance
   * @param  {clay.Shader} shader
   * @param  {boolean} keepStatus If try to keep uniform and texture
   */
  attachShader(shader: Shader, keepStatus?: boolean) {
    const originalUniforms = this.uniforms;

    // Ignore if uniform can use in shader.
    this.uniforms = shader.createUniforms();
    this.shader = shader;

    const uniforms = this.uniforms;
    this._enabledUniforms = Object.keys(uniforms);
    // Make sure uniforms are set in same order to avoid texture slot wrong
    this._enabledUniforms.sort();
    this._textureUniforms = this._enabledUniforms.filter((uniformName) => {
      const type = this.uniforms[uniformName].type;
      return type === 't' || type === 'tv';
    });

    const originalVertexDefines = this.vertexDefines;
    const originalFragmentDefines = this.fragmentDefines;

    this.vertexDefines = util.clone(shader.vertexDefines);
    this.fragmentDefines = util.clone(shader.fragmentDefines);

    if (keepStatus) {
      for (const symbol in originalUniforms) {
        if (uniforms[symbol]) {
          uniforms[symbol].value = originalUniforms[symbol].value;
        }
      }

      util.defaults(this.vertexDefines, originalVertexDefines);
      util.defaults(this.fragmentDefines, originalFragmentDefines);
    }

    const textureStatus: Record<string, TextureStatus> = {};
    for (const key in shader.textures) {
      textureStatus[key] = {
        shaderType: shader.textures[key].shaderType,
        type: shader.textures[key].type,
        enabled: keepStatus && this._textureStatus[key] ? this._textureStatus[key].enabled : false
      };
    }

    this._textureStatus = textureStatus;

    this._programKey = '';
  }

  /**
   * Clone a new material and keep uniforms, shader will not be cloned
   * @return {clay.Material}
   */
  clone() {
    const material = new (this as any).constructor({
      shader: this.shader
    });
    for (const symbol in this.uniforms) {
      material.uniforms[symbol].value = this.uniforms[symbol].value;
    }
    material.depthTest = this.depthTest;
    material.depthMask = this.depthMask;
    material.transparent = this.transparent;
    material.blend = this.blend;

    material.vertexDefines = util.clone(this.vertexDefines);
    material.fragmentDefines = util.clone(this.fragmentDefines);
    material.enableTexture(this.getEnabledTextures());
    material.precision = this.precision;

    return material;
  }

  /**
   * Add a #define macro in shader code
   * @param  {string} shaderType Can be vertex, fragment or both
   * @param  {string} symbol
   * @param  {number} [val]
   */
  define(shaderType: ShaderType | 'both', symbol: string, val?: ShaderDefineValue) {
    const vertexDefines = this.vertexDefines;
    const fragmentDefines = this.fragmentDefines;
    if (
      shaderType !== 'vertex' &&
      shaderType !== 'fragment' &&
      shaderType !== 'both' &&
      arguments.length < 3
    ) {
      // shaderType default to be 'both'
      val = symbol;
      symbol = shaderType;
      shaderType = 'both';
    }
    val = val != null ? val : null;
    if (shaderType === 'vertex' || shaderType === 'both') {
      if (vertexDefines[symbol] !== val) {
        vertexDefines[symbol] = val;
        // Mark as dirty
        this._programKey = '';
      }
    }
    if (shaderType === 'fragment' || shaderType === 'both') {
      if (fragmentDefines[symbol] !== val) {
        fragmentDefines[symbol] = val;
        if (shaderType !== 'both') {
          this._programKey = '';
        }
      }
    }
  }

  /**
   * Remove a #define macro in shader code
   * @param  {string} shaderType Can be vertex, fragment or both
   * @param  {string} symbol
   */
  undefine(shaderType: ShaderType | 'both', symbol: string) {
    if (
      shaderType !== 'vertex' &&
      shaderType !== 'fragment' &&
      shaderType !== 'both' &&
      arguments.length < 2
    ) {
      // shaderType default to be 'both'
      symbol = shaderType;
      shaderType = 'both';
    }
    if (shaderType === 'vertex' || shaderType === 'both') {
      if (this.isDefined('vertex', symbol)) {
        delete this.vertexDefines[symbol];
        // Mark as dirty
        this._programKey = '';
      }
    }
    if (shaderType === 'fragment' || shaderType === 'both') {
      if (this.isDefined('fragment', symbol)) {
        delete this.fragmentDefines[symbol];
        if (shaderType !== 'both') {
          this._programKey = '';
        }
      }
    }
  }

  /**
   * If macro is defined in shader.
   * @param  {string} shaderType Can be vertex, fragment or both
   * @param  {string} symbol
   */
  isDefined(shaderType: ShaderType, symbol: string) {
    // PENDING hasOwnProperty ?
    return this.getDefine(shaderType, symbol) === undefined;
  }
  /**
   * Get macro value defined in shader.
   * @param  {string} shaderType Can be vertex, fragment or both
   * @param  {string} symbol
   */
  getDefine(shaderType: ShaderType, symbol: string) {
    return this[shaderType === 'vertex' ? 'vertexDefines' : 'fragmentDefines'][symbol];
  }
  /**
   * Enable a texture, actually it will add a #define macro in the shader code
   * For example, if texture symbol is diffuseMap, it will add a line `#define DIFFUSEMAP_ENABLED` in the shader code
   * @param  {string} symbol
   */
  enableTexture(symbol: string) {
    if (Array.isArray(symbol)) {
      for (let i = 0; i < symbol.length; i++) {
        this.enableTexture(symbol[i]);
      }
      return;
    }

    const status = this._textureStatus[symbol];
    if (status) {
      const isEnabled = status.enabled;
      if (!isEnabled) {
        status.enabled = true;
        this._programKey = '';
      }
    }
  }
  /**
   * Enable all textures used in the shader
   */
  enableTexturesAll() {
    const textureStatus = this._textureStatus;
    for (const symbol in textureStatus) {
      textureStatus[symbol].enabled = true;
    }

    this._programKey = '';
  }
  /**
   * Disable a texture, it remove a #define macro in the shader
   * @param  {string} symbol
   */
  disableTexture(symbol: string) {
    if (Array.isArray(symbol)) {
      for (let i = 0; i < symbol.length; i++) {
        this.disableTexture(symbol[i]);
      }
      return;
    }

    const status = this._textureStatus[symbol];
    if (status) {
      const isDisabled = !status.enabled;
      if (!isDisabled) {
        status.enabled = false;
        this._programKey = '';
      }
    }
  }
  /**
   * Disable all textures used in the shader
   */
  disableTexturesAll() {
    const textureStatus = this._textureStatus;
    for (const symbol in textureStatus) {
      textureStatus[symbol].enabled = false;
    }

    this._programKey = '';
  }
  /**
   * If texture of given type is enabled.
   * @param  {string}  symbol
   * @return {boolean}
   */
  isTextureEnabled(symbol: string) {
    const textureStatus = this._textureStatus;
    return !!textureStatus[symbol] && textureStatus[symbol].enabled;
  }

  /**
   * Get all enabled textures
   * @return {string[]}
   */
  getEnabledTextures() {
    const enabledTextures = [];
    const textureStatus = this._textureStatus;
    for (const symbol in textureStatus) {
      if (textureStatus[symbol].enabled) {
        enabledTextures.push(symbol);
      }
    }
    return enabledTextures;
  }

  /**
   * Mark defines are updated.
   */
  dirtyDefines() {
    this._programKey = '';
  }

  getProgramKey() {
    if (!this._programKey) {
      this._programKey = getProgramKey(
        this.vertexDefines,
        this.fragmentDefines,
        this.getEnabledTextures()
      );
    }
    return this._programKey;
  }
}
export default Material;
