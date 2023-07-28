import * as util from './core/util';
import * as colorUtil from './core/color';
import Shader, {
  ShaderDefineValue,
  ShaderPrecision,
  ShaderType,
  VertexShader,
  FragmentShader,
  UniformType,
  isTextureUniform,
  NativeUniformType
} from './Shader';
import { defaultGetMaterialProgramKey } from './gl/ProgramManager';
import Texture from './Texture';
import Texture2D from './Texture2D';
import TextureCube from './TextureCube';
import Texture2DArray from './Texture2DArray';
import Texture3D from './Texture3D';

const programKeyCache: Record<string, string> = {};

function getProgramKey(
  vertexDefines: Record<string, ShaderDefineValue>,
  fragmentDefines: Record<string, ShaderDefineValue>,
  enabledTextures: string[]
) {
  const key = defaultGetMaterialProgramKey(vertexDefines, fragmentDefines, enabledTextures);
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

export interface MaterialOpts {
  name: string;
  depthTest: boolean;
  depthMask: boolean;
  transparent: boolean;
  shader: Shader;
  precision: ShaderPrecision;
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
  blend?: (gl: WebGL2RenderingContext) => void;

  vertexDefines: Record<string, ShaderDefineValue>;
  fragmentDefines: Record<string, ShaderDefineValue>;
}

type CreateSamplerMaterialUniformObject<Type, Value> =
  | {
      type: Type;
      array: false;
      value: Value | null;
    }
  | {
      type: Type;
      array: true;
      value: Value[] | null;
    };

export type GeneralMaterialUniformObject =
  | CreateSamplerMaterialUniformObject<'sampler2D', Texture2D>
  | CreateSamplerMaterialUniformObject<'samplerCube', TextureCube>
  | CreateSamplerMaterialUniformObject<'sampler2DArray', Texture2DArray>
  | CreateSamplerMaterialUniformObject<'sampler3D', Texture3D>
  // | {
  //     type: '_struct';
  //     struct: Record<string, NativeUniformType>;
  //     array: boolean;
  //     value: Record<string, any>;
  //   }
  | {
      type: Exclude<UniformType, 'sampler2D' | 'samplerCube' | 'sampler2DArray' | 'sampler3D'>;
      array: boolean;
      value: any;
    };

type UniformValueRecord<T extends Shader['uniformTpls']> = {
  [key in keyof T]?: T[key]['value'] | null;
};
type PickTextureUniforms<T extends Shader['uniformTpls']> = Pick<
  T,
  {
    [key in keyof T]: T[key]['type'] extends 'sampler2D' | 'samplerCube' ? key : never;
  }[keyof T]
>;

interface Material extends Omit<MaterialOpts, 'shader'> {
  // Hooks
  beforeCompileShader?(): void;
  afterCompileShader?(): void;
}
/**
 * Material defines the appearance of mesh surface, like `color`, `roughness`, `metalness`, etc.
 * It contains a {@link clay.Shader} and corresponding uniforms.
 *
 * Here is a basic example to create a standard material
```js
const material = new clay.Material(createStandardShader());
```
 */
class Material<
  // PENDING
  // Use any by default to avoid assigning error because key type in get() method is not compatitable.
  // like: renderPass([{ material }])
  T extends Shader = Shader<VertexShader<any, any, any, any>, FragmentShader<any, any, any>>
> {
  readonly uid: number = util.genGUID();

  name: string;

  /**
   * If update texture status automatically.
   */
  autoUpdateTextureStatus = true;

  readonly uniforms!: T['uniformTpls'];

  vertexDefines: Record<string, ShaderDefineValue> = {};
  fragmentDefines: Record<string, ShaderDefineValue> = {};

  private readonly _shader: T;

  private _textureStatus = {} as Record<keyof PickTextureUniforms<T['uniformTpls']>, TextureStatus>;

  // shadowTransparentMap : null

  // PENDING enable the uniform that only used in shader.
  private _enabledUniforms: (keyof T['uniformTpls'])[] = [];
  private _textureUniforms: (keyof PickTextureUniforms<T['uniformTpls']>)[] = [];

  private _programKey?: string;

  constructor(shader: T, opts?: Partial<MaterialOpts>) {
    opts = opts || {};

    this._shader = shader;
    const uniforms = (this.uniforms = shader.createUniforms());

    // Make sure uniforms are set in same order to avoid texture slot wrong
    const enabledUniforms = (this._enabledUniforms = util
      .keys(uniforms)
      .sort() as (keyof T['uniformTpls'])[]);
    this._textureUniforms = enabledUniforms.filter((uniformName) =>
      isTextureUniform(uniforms[uniformName])
    ) as (keyof PickTextureUniforms<T['uniformTpls']>)[];

    this.vertexDefines = util.clone(shader.vertexDefines);
    this.fragmentDefines = util.clone(shader.fragmentDefines);

    const textureStatus = {} as Material<T>['_textureStatus'];
    const shaderTextures = shader.textures;
    for (const key in shaderTextures) {
      (textureStatus as any)[key] = util.assign({}, shaderTextures[key]);
    }

    this._textureStatus = textureStatus;

    this.name = opts.name || '';
    this.depthTest = util.optional(opts.depthTest, true);
    this.depthMask = util.optional(opts.depthMask, true);
    this.blend = opts.blend;
    this.transparent = opts.transparent || false;
    this.precision = opts.precision || 'highp';

    util.assign(this.vertexDefines, opts.vertexDefines);
    util.assign(this.fragmentDefines, opts.fragmentDefines);
  }

  get shader() {
    return this._shader;
  }

  /**
   * Set material uniform
   * @example
   *  mat.set('color', [1, 1, 1, 1]);
   * @param symbol
   * @param value
   */
  set<K extends keyof T['uniformTpls']>(symbol: K, value: T['uniformTpls'][K]['value'] | null) {
    // PENDING. Should we GIVE WARN when value is undefined?
    if (value === undefined) {
      return;
    }
    const uniform = this.uniforms[symbol];
    if (uniform) {
      if (util.isString(value)) {
        // Try to parse as a color. Invalid color string will return null.
        value = colorUtil.parseToFloat(value) || value;
      }

      uniform.value = value;

      if (this.autoUpdateTextureStatus && isTextureUniform(uniform)) {
        this[value ? 'enableTexture' : 'disableTexture'](symbol as any);
      }
    }
  }

  setUniforms(obj: UniformValueRecord<T['uniformTpls']>) {
    util.keys(obj).forEach((key) => {
      const val = obj[key];
      this.set(key, val);
    });
  }

  isUniformEnabled(symbol: keyof T['uniformTpls']) {
    return this._enabledUniforms.indexOf(symbol as any) >= 0;
  }

  getEnabledUniforms(): (keyof T['uniformTpls'])[] {
    return this._enabledUniforms;
  }

  getTextureUniforms() {
    return this._textureUniforms;
  }

  /**
   * Get uniform value
   *
   */
  get<K extends keyof T['uniformTpls']>(symbol: K) {
    const uniform = this.uniforms[symbol];
    if (uniform) {
      return uniform.value as T['uniformTpls'][K]['value'];
    }
  }

  /**
   * Clone a new material and keep uniforms, shader will not be cloned
   */
  clone(): Material<T> {
    const material = new (this as any).constructor(this.shader) as Material<T>;
    for (const symbol in this.uniforms) {
      material.uniforms[symbol].value = this.uniforms[symbol].value;
    }
    material.depthTest = this.depthTest;
    material.depthMask = this.depthMask;
    material.transparent = this.transparent;
    material.blend = this.blend;

    material.vertexDefines = util.clone(this.vertexDefines);
    material.fragmentDefines = util.clone(this.fragmentDefines);
    material.enableTexture(this.getEnabledTextures() as any);
    material.precision = this.precision;

    return material;
  }

  /**
   * Add a #define macro in shader code
   * @param  {string} shaderType Can be vertex, fragment or both
   * @param  {string} symbol
   * @param  {number} [val]
   */
  define(symbol: string, val?: ShaderDefineValue): void;
  define(shaderType: ShaderType | 'both', symbol?: string, val?: ShaderDefineValue): void;
  define(
    shaderType: ShaderType | 'both',
    symbol?: string | ShaderDefineValue,
    val?: ShaderDefineValue
  ) {
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
      if (vertexDefines[symbol as string] !== val) {
        vertexDefines[symbol as string] = val;
        // Mark as dirty
        this._programKey = '';
      }
    }
    if (shaderType === 'fragment' || shaderType === 'both') {
      if (fragmentDefines[symbol as string] !== val) {
        fragmentDefines[symbol as string] = val;
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
  undefine(symbol?: string): void;
  undefine(shaderType: ShaderType | 'both', symbol?: string): void;
  undefine(shaderType: ShaderType | 'both' | string, symbol?: string) {
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
      if (this.isDefined('vertex', symbol as string)) {
        delete this.vertexDefines[symbol as string];
        // Mark as dirty
        this._programKey = '';
      }
    }
    if (shaderType === 'fragment' || shaderType === 'both') {
      if (this.isDefined('fragment', symbol as string)) {
        delete this.fragmentDefines[symbol as string];
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
    return this.getDefine(shaderType, symbol) !== undefined;
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
  enableTexture(
    symbol:
      | keyof PickTextureUniforms<T['uniformTpls']>
      | keyof PickTextureUniforms<T['uniformTpls']>[]
  ) {
    if (util.isArray(symbol)) {
      for (let i = 0; i < symbol.length; i++) {
        this.enableTexture(symbol[i]);
      }
      return;
    }

    const status = this._textureStatus[symbol as keyof PickTextureUniforms<T['uniformTpls']>];
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

    util.keys(textureStatus).forEach((key) => {
      (textureStatus as any)[key].enabled = true;
    });

    this._programKey = '';
  }
  /**
   * Disable a texture, it remove a #define macro in the shader
   * @param  {string} symbol
   */
  disableTexture(symbol: keyof PickTextureUniforms<T['uniformTpls']>) {
    if (util.isArray(symbol)) {
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
    util.keys(textureStatus).forEach((key) => {
      (textureStatus as any)[key].enabled = false;
    });

    this._programKey = '';
  }
  /**
   * If texture of given type is enabled.
   * @param  {string}  symbol
   * @return {boolean}
   */
  isTextureEnabled(symbol: keyof PickTextureUniforms<T['uniformTpls']>): boolean {
    const textureStatus = this._textureStatus;
    return !!(textureStatus[symbol] && textureStatus[symbol].enabled);
  }

  /**
   * Get all enabled textures
   * @return {string[]}
   */
  getEnabledTextures() {
    const textureStatus = this._textureStatus;
    return util
      .keys(textureStatus)
      .filter((key) => (textureStatus as any)[key].enabled) as (keyof PickTextureUniforms<
      T['uniformTpls']
    >)[];
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
