// TODO check if name of varyings, uniforms, attributes conflicts
// TODO Shader slot
// TODO struct uniform
// TODO createUniform can be assigned to varying and attributes.

// import { parseToFloat } from './core/color';
import { Dict, UnionToIntersection } from './core/type';
import { assign, genGUID, isString, keys } from './core/util';
import { mat2, mat3, mat4, vec2, vec3, vec4 } from './glmatrix';
import Texture2D from './Texture2D';
import TextureCube from './TextureCube';

export type ShaderDefineValue = boolean | string | number | undefined | null;
export type ShaderPrecision = 'highp' | 'lowp' | 'mediump';
export type ShaderType = 'vertex' | 'fragment';

const uniformTypeMap = {
  bool: '1i',
  int: '1i',
  sampler2D: 't',
  samplerCube: 't',
  float: '1f',
  vec2: '2f',
  vec3: '3f',
  vec4: '4f',
  ivec2: '2i',
  ivec3: '3i',
  ivec4: '4i',
  mat2: 'm2',
  mat3: 'm3',
  mat4: 'm4',
  // It's not builtin glsl type. But a special type that support string and will be parsed in material
  rgb: '3f',
  rgba: '4f'
} as const;

const attributeSizeMap = {
  vec2: 2,
  vec3: 3,
  vec4: 4,
  float: 1
} as const;

type NativeToMaterialUniformTypeMap = typeof uniformTypeMap;
type NativeUniformType = keyof NativeToMaterialUniformTypeMap;
type NativeUniformValueMap = {
  bool: number;
  int: number;
  sampler2D: Texture2D;
  samplerCube: TextureCube;
  float: number;
  vec2: vec2.Vec2Array;
  vec3: vec3.Vec3Array;
  vec4: vec4.Vec4Array;
  ivec2: vec2.Vec2Array;
  ivec3: vec3.Vec3Array;
  ivec4: vec4.Vec4Array;
  mat2: mat2.Mat2Array;
  mat3: mat3.Mat3Array;
  mat4: mat4.Mat4Array;
  // Special type color that support string
  rgb: vec3.Vec3Array | string;
  rgba: vec4.Vec4Array | string;
};

type NativeUniformArrayValueMap = {
  bool: ArrayLike<number>;
  int: ArrayLike<number>;
  sampler2D: Texture2D[];
  samplerCube: TextureCube[];
  float: ArrayLike<number>;
  vec2: ArrayLike<number>;
  vec3: ArrayLike<number>;
  vec4: ArrayLike<number>;
  ivec2: ArrayLike<number>;
  ivec3: ArrayLike<number>;
  ivec4: ArrayLike<number>;
  mat2: ArrayLike<number>;
  mat3: ArrayLike<number>;
  mat4: ArrayLike<number>;
  // TODO
  rgb: ArrayLike<number>;
  rgba: ArrayLike<number>;
};

type NativeAttributeType = 'float' | 'vec2' | 'vec3' | 'vec4';
type NativeToClayAttributeMap = {
  float: 'float';
  vec2: 'float';
  vec3: 'float';
  vec4: 'float';
};

type NativeToMaterialUniformArrayTypeMap = {
  bool: '1iv';
  int: '1iv';
  sampler2D: 'tv';
  samplerCube: 'tv';
  float: '1fv';
  vec2: '2fv';
  vec3: '3fv';
  vec4: '4fv';
  ivec2: '2iv';
  ivec3: '3iv';
  ivec4: '4iv';
  mat2: 'm2v';
  mat3: 'm3v';
  mat4: 'm4v';
  rgb: '3fv';
  rgba: '4fv';
};

export type MaterialUniformType =
  | NativeToMaterialUniformTypeMap[NativeUniformType]
  | NativeToMaterialUniformArrayTypeMap[keyof NativeToMaterialUniformArrayTypeMap];

export type AttributeSemantic =
  | 'POSITION'
  | 'NORMAL'
  | 'BINORMAL'
  | 'TANGENT'
  | 'TEXCOORD'
  | 'TEXCOORD_0'
  | 'TEXCOORD_1'
  | 'COLOR'
  // Skinning
  // https://github.com/KhronosGroup/glTF/blob/master/specification/README.md#semantics
  | 'JOINT'
  | 'WEIGHT';

export type UniformSemantic =
  // | 'SKIN_MATRIX'
  // Information about viewport
  | 'VIEWPORT_SIZE'
  | 'VIEWPORT'
  | 'DEVICEPIXELRATIO'
  // Window size for window relative coordinate
  // https://www.opengl.org/sdk/docs/man/html/gl_FragCoord.xhtml
  | 'WINDOW_SIZE'
  // Infomation about camera
  | 'NEAR'
  | 'FAR'
  // Time
  | 'TIME'
  // Log depth buffer
  | 'LOG_DEPTH_BUFFER_FC';

export const BASIC_MATRIX_SEMANTICS = [
  'WORLD',
  'VIEW',
  'PROJECTION',
  'WORLDVIEW',
  'VIEWPROJECTION',
  'WORLDVIEWPROJECTION'
] as const;

type MatrixSemanticNoTranpose =
  | 'WORLD'
  | 'VIEW'
  | 'PROJECTION'
  | 'WORLDVIEW'
  | 'VIEWPROJECTION'
  | 'WORLDVIEWPROJECTION'
  | 'WORLDINVERSE'
  | 'VIEWINVERSE'
  | 'PROJECTIONINVERSE'
  | 'WORLDVIEWINVERSE'
  | 'VIEWPROJECTIONINVERSE'
  | 'WORLDVIEWPROJECTIONINVERSE';
export type MatrixSemantic =
  | MatrixSemanticNoTranpose
  | 'WORLDTRANSPOSE'
  | 'VIEWTRANSPOSE'
  | 'PROJECTIONTRANSPOSE'
  | 'WORLDVIEWTRANSPOSE'
  | 'VIEWPROJECTIONTRANSPOSE'
  | 'WORLDVIEWPROJECTIONTRANSPOSE'
  | 'WORLDINVERSETRANSPOSE'
  | 'VIEWINVERSETRANSPOSE'
  | 'PROJECTIONINVERSETRANSPOSE'
  | 'WORLDVIEWINVERSETRANSPOSE'
  | 'VIEWPROJECTIONINVERSETRANSPOSE'
  | 'WORLDVIEWPROJECTIONINVERSETRANSPOSE';

// type ShaderUniform<T extends NativeUniformType> = {
//   type: T;
//   value: NativeUniformValueMap[T];
//   semantic?: string;
// };
export interface MaterialUniform {
  type: MaterialUniformType;
  value: any;
  semantic?: string;
}

// Tagged template
export function glsl(strings: TemplateStringsArray, ...values: string[]) {
  let newStr = '';
  for (let i = 0; i < strings.length; i++) {
    if (i > 0) {
      newStr += values[i - 1];
    }
    newStr += strings[i];
  }
  return newStr;
}

type ShaderUniformLoose = {
  type: NativeUniformType;
  value?: unknown;
  semantic?: AttributeSemantic | UniformSemantic | MatrixSemantic;
  len?: number | string;
  array?: boolean;
};

type ShaderAttributeLoose = {
  type: NativeAttributeType;
  semantic?: AttributeSemantic;
};

type ShaderVaringLoose = {
  type: NativeUniformType;
};

export function createUniform<
  T extends NativeUniformType,
  S extends MatrixSemantic | UniformSemantic
  // don't support string color to be default value.
  // Avoid including color as core module.
>(type: T, value?: Exclude<NativeUniformValueMap[T], string>, semantic?: S) {
  return {
    type,
    value: value as NativeUniformValueMap[T],
    semantic
  };
}

export function createSemanticUniform<
  T extends NativeUniformType,
  S extends MatrixSemantic | UniformSemantic
>(type: T, semantic: S) {
  return {
    type,
    semantic
  };
}

export function createArrayUniform<T extends NativeUniformType>(
  type: T,
  len: string | number, // Can be a define SKIN_COUNT or literal number
  value?: NativeUniformArrayValueMap[T]
) {
  return {
    type,
    value,
    len,
    array: true as const
  };
}

export function createAttribute<T extends NativeAttributeType, S extends AttributeSemantic>(
  type: T,
  semantic?: S
) {
  return {
    // TODO Can only be float
    type,
    semantic
  };
}

export function createVarying<T extends NativeUniformType>(type: T) {
  return { type };
}

type ShaderFunctionLoose = (functionName?: string) => string;
export interface ShaderMixinLoose {
  defines: Dict<ShaderDefineValue>;
  uniforms: Dict<ShaderUniformLoose>;
  attributes: Dict<ShaderAttributeLoose>;
  varyings: Dict<ShaderVaringLoose>;
  functions?: ShaderFunctionLoose[];
  main?: string | Dict<string>;
}

export const FUNCTION_NAME_PLACEHOLDER = '<function_name>';

// TODO should be named to function or header?
/**
 * Shader function is only a plain string that can be reused.
 * It's not magical. So any shader code can be used here.
 * It can include multiple functions. Can use #ifdef.
 * Or even uniforms that want to be not configured
 */
export function createShaderFunction<T extends string>(code: string, defaultName?: T) {
  const func = function (functionName?: string) {
    if (code.indexOf(FUNCTION_NAME_PLACEHOLDER) >= 0 && !defaultName) {
      console.error('defaultName must be given in the shader function:');
      console.error(code);
    }
    return code.replace(
      new RegExp(FUNCTION_NAME_PLACEHOLDER, 'g'),
      functionName || defaultName || ''
    );
  };
  func.displayName = defaultName;
  return func;
}

export function createShaderMixin<
  TDefines extends Dict<ShaderDefineValue> = {},
  TUniforms extends Dict<ShaderUniformLoose> = {},
  TAttributes extends Dict<ShaderAttributeLoose> = {},
  TVaryings extends Dict<ShaderVaringLoose> = {},
  TCode extends Dict<string> | string = string
>(
  options:
    | {
        defines?: TDefines;
        uniforms?: TUniforms;
        attributes?: TAttributes;
        varyings?: TVaryings;
        /**
         * Shader funcitons chunk will be assembled before main code.
         */
        functions?: ShaderFunctionLoose[];
        main?: TCode;
      }
    | string
) {
  if (isString(options)) {
    options = { main: options as TCode };
  }
  // Each part of shader chunk needs to be injected separately
  return assign(
    {
      defines: {},
      uniforms: {},
      varyings: {},
      attributes: {}
    },
    options
  ) as {
    defines: TDefines;
    uniforms: TUniforms;
    attributes: TAttributes;
    varyings: TVaryings;
    functions: ShaderFunctionLoose[];
    main: TCode;
  };
}

type MergeChunk<
  Chunks extends ShaderMixinLoose[],
  P extends 'defines' | 'uniforms' | 'attributes' | 'varyings'
> = UnionToIntersection<Chunks[number][P]>;

class StageShader<
  TDefines extends Dict<ShaderDefineValue> = Dict<ShaderDefineValue>,
  TUniforms extends Dict<ShaderUniformLoose> = {},
  TAttributes extends Dict<ShaderAttributeLoose> = {},
  TVaryings extends Dict<ShaderVaringLoose> = {},
  TMixins extends ShaderMixinLoose[] = never
> {
  readonly defines!: TDefines & MergeChunk<TMixins, 'defines'>;
  readonly uniforms!: TUniforms & MergeChunk<TMixins, 'uniforms'>;
  readonly attributes!: TAttributes & MergeChunk<TMixins, 'attributes'>;
  readonly varyings!: TVaryings & MergeChunk<TMixins, 'varyings'>;
  readonly functions!: ShaderFunctionLoose[];
  readonly main: string;

  constructor(options: {
    name?: string;
    defines?: TDefines;
    uniforms?: TUniforms;
    attributes?: TAttributes;
    varyings?: TVaryings;
    includes?: TMixins;
    main: string;
  }) {
    options = assign(
      {
        defines: options.name
          ? assign(
              {
                SHADER_NAME: options.name
              },
              options.defines
            )
          : options.defines
      },
      options
    );
    const includes = options.includes || ([] as any as TMixins);
    (['defines', 'uniforms', 'attributes', 'varyings'] as const).forEach((prop) => {
      // @ts-ignore we are sure the readonly property is inited in the constructor here.
      const target = (this[prop] = {});
      assign(target, options[prop]);
      includes.forEach((mixin) => {
        assign(target, mixin[prop]);
      });
    });
    this.functions = ([] as any as ShaderFunctionLoose[]).concat(
      ...includes.map((a) => a.functions || [])
    );
    this.main = options.main;
  }
}

export class VertexShader<
  TDefines extends Dict<ShaderDefineValue> = Dict<ShaderDefineValue>,
  // Default to be empty object.
  TUniforms extends Dict<ShaderUniformLoose> = {},
  TAttributes extends Dict<ShaderAttributeLoose> = {},
  TVaryings extends Dict<ShaderVaringLoose> = {},
  TMixins extends ShaderMixinLoose[] = never
> extends StageShader<TDefines, TUniforms, TAttributes, TVaryings, TMixins> {
  constructor(options: {
    name?: string;
    defines?: TDefines;
    uniforms?: TUniforms;
    attributes?: TAttributes;
    varyings?: TVaryings;
    /**
     * uniform, defines, attributes, varyings，functions in mixins will be merged automatically.
     */
    includes?: TMixins;
    main: string;
  }) {
    super(options);
  }
}

export class FragmentShader<
  TDefines extends Dict<ShaderDefineValue> = Dict<ShaderDefineValue>,
  TUniforms extends Dict<ShaderUniformLoose> = {},
  TMixins extends ShaderMixinLoose[] = never
  // TVaryings extends Dict<ShaderVaringLoose> = Dict<ShaderVaringLoose>
> extends StageShader<TDefines, TUniforms, never, never, TMixins> {
  constructor(options: {
    name?: string;
    defines?: TDefines;
    uniforms?: TUniforms;
    /**
     * uniform, defines, attributes, varyings，functions in mixins will be merged automatically.
     */
    includes?: TMixins;
    // varyings will be shared from vertex
    // varyings?: TVaryings;
    main: string;
  }) {
    super(options);
  }
}

/**
 * Compose each part to a final shader string
 */
function composeShaderString(stageShader: StageShader) {
  // TODO If compose based on #ifdef condition.
  function normalizeUniformType(type: string) {
    return type === 'rgb' ? 'vec3' : type === 'rgba' ? 'vec4' : type;
  }

  // Only compose the uniform, attributes, varying, and codes.
  // Defines will be composed dynamically in GLProgram based on the material
  function composePart(
    varType: 'uniform' | 'attribute' | 'varying',
    obj: Dict<ShaderUniformLoose>
  ) {
    return keys(obj)
      .map((symbol) => {
        const item = obj[symbol];
        // Use #define to define the length. Need to check #ifdef here.
        const isDefinedLen = item.array && isNaN(+item.len!);
        const arrayExpr = item.array ? `[${item.len}]` : '';
        return (
          (isDefinedLen ? `#ifdef ${item.len!}\n` : '') +
          `${varType} ${normalizeUniformType(item.type)} ${symbol}${arrayExpr};` +
          (isDefinedLen ? `\n#endif` : '')
        );
      })
      .join('\n');
  }

  return `
${composePart('uniform', stageShader.uniforms as any)}
${composePart('attribute', stageShader.attributes as any)}
${composePart('varying', stageShader.varyings as any)}

${stageShader.functions.map((func) => func()).join('\n')}

${stageShader.main}
    `;
}

type ConvertShaderUniformToMaterialUniform<T extends Dict<ShaderUniformLoose>> = {
  [key in keyof T]: {
    value: T[key]['value'];
    // TODO Needs more precise type
    type: T[key]['array'] extends true
      ? NativeToMaterialUniformArrayTypeMap[T[key]['type']]
      : NativeToMaterialUniformTypeMap[T[key]['type']];
    semantic?: T[key]['semantic'];
  };
};

function cloneUniformVal(type: MaterialUniformType, val: any) {
  if (val && val.length != null) {
    return type.endsWith('v')
      ? val.map((item: any) => cloneUniformVal(type.slice(0, -1) as MaterialUniformType, item))
      : Array.from(val);
  }
  return val;
}

const shaderIDCache: Record<string, string> = {};

function getShaderID(vertex: string, fragment: string) {
  const key = 'vertex:' + vertex + 'fragment:' + fragment;
  if (shaderIDCache[key]) {
    return shaderIDCache[key];
  }
  const id = genGUID() + '';
  shaderIDCache[key] = id;

  return id;
}

export type VertexShaderLoose = VertexShader<
  Dict<ShaderDefineValue>,
  Dict<ShaderUniformLoose>,
  Dict<ShaderAttributeLoose>,
  Dict<ShaderVaringLoose>
>;
export type FragmentShaderLoose = FragmentShader<Dict<ShaderDefineValue>, Dict<ShaderUniformLoose>>;

export type PickFragmentTextureUniforms<
  T extends FragmentShader<Dict<ShaderDefineValue>, Dict<ShaderUniformLoose>>['uniforms']
> = Pick<
  T,
  {
    [key in keyof T]: T[key]['type'] extends 'sampler2D' | 'samplerCube' ? key : never;
  }[keyof T]
>;

export class Shader<
  // Having more loose type so it won't struggle on the key type in th materials.
  V extends VertexShader = VertexShader<
    Dict<ShaderDefineValue>,
    Dict<ShaderUniformLoose>,
    Dict<ShaderAttributeLoose>,
    Dict<ShaderVaringLoose>
  >,
  F extends FragmentShader = FragmentShader<Dict<ShaderDefineValue>, Dict<ShaderUniformLoose>>
> {
  // Default defines
  readonly vertexDefines: Dict<ShaderDefineValue>;
  readonly fragmentDefines: Dict<ShaderDefineValue>;

  readonly textures: Record<
    string,
    {
      shaderType: 'fragment' | 'vertex';
      type: 'sampler2D' | 'samplerCube';
    }
  >;
  /**
   * Processed uniform for material
   */
  readonly uniformTpls: ConvertShaderUniformToMaterialUniform<V['uniforms'] & F['uniforms']>;
  // TODO More precise attributes type
  /**
   * Processed attributes for geometry
   */
  readonly attributes: Record<
    string,
    {
      // TODO Can only be float
      type: 'float';
      size: number;
      semantic?: string;
    }
  >;

  readonly semanticsMap: Partial<
    Record<
      AttributeSemantic,
      {
        name: string;
      }
    > &
      Record<
        MatrixSemantic | UniformSemantic,
        {
          name: string;
          type: MaterialUniformType;
          isTranspose?: boolean;
          isInverse?: boolean;
          semanticNoTranspose?: MatrixSemanticNoTranpose;
        }
      >
  >;

  readonly matrixSemantics: MatrixSemantic[];

  readonly vertex: string;
  readonly fragment: string;

  private readonly _shaderID: string;

  get shaderID() {
    return this._shaderID;
  }

  // Create a new uniform copy for material
  createUniforms() {
    const uniforms: Shader['uniformTpls'] = {};
    const uniformTpls = this.uniformTpls;

    keys(uniformTpls).forEach((uniformName) => {
      const tpl = (uniformTpls as any)[uniformName];
      uniforms[uniformName] = {
        type: tpl.type,
        value: cloneUniformVal(tpl.type, tpl.value) // Default value?
      };
    });

    return uniforms as Shader<V, F>['uniformTpls'];
  }

  constructor(vert: V, frag: F) {
    this.vertexDefines = assign({}, vert.defines);
    this.fragmentDefines = assign({}, frag.defines);

    const textures: Shader['textures'] = {};

    const materialUniformTpls: Shader['uniformTpls'] = {};
    const semanticsMap: Shader['semanticsMap'] = {};
    const attributes: Shader['attributes'] = {};
    const matrixSemantics: MatrixSemantic[] = [];
    // TODO remove any
    function processUniforms(uniforms: Dict<ShaderUniformLoose>, shaderType: ShaderType) {
      keys(uniforms).forEach((uniformName) => {
        const uniform = uniforms[uniformName];
        const uniformType = uniform.type as NativeUniformType;
        const uniformValue = uniform.value as NativeUniformType;
        const uniformSemantic = uniform.semantic;
        if (uniformType === 'sampler2D' || uniformType === 'samplerCube') {
          textures[uniformName] = {
            type: uniformType,
            shaderType
          };
        }
        const materialUniformObj = {
          name: uniformName,
          type: (uniformTypeMap[uniformType] + (uniform.array ? 'v' : '')) as MaterialUniformType
        };

        if (uniformSemantic) {
          const isTranpose = uniformSemantic.endsWith('TRANSPOSE');
          const isInverse = uniformSemantic.endsWith('INVERSE');
          semanticsMap[uniformSemantic] = assign(
            {
              isTranspose: isTranpose,
              isInverse: isInverse,
              semanticNoTranspose: uniformSemantic.slice(0, -9) as MatrixSemanticNoTranpose
            },
            materialUniformObj
          );

          // Is matrix semantic
          // TODO more generic way?
          if (isTranpose || isInverse || BASIC_MATRIX_SEMANTICS.includes(uniformSemantic as any)) {
            matrixSemantics.push(uniformSemantic as MatrixSemantic);
          }
        } else {
          // don't support string color to be default value.
          // Avoid including color as core module.
          // (materialUniformObj as any).value =
          //   (uniformType === 'rgb' || uniformType === 'rgba') && isString(uniformValue)
          //     ? parseToFloat(uniformValue)
          //     : uniformValue;
          (materialUniformObj as any).value = uniformValue;

          // semantic uniform can't be set in material.
          (materialUniformTpls as any)[uniformName] = materialUniformObj;
        }
      });
    }
    // Process uniforms
    processUniforms(vert.uniforms, 'vertex');
    processUniforms(frag.uniforms, 'fragment');

    // Parse attributes in vertex
    keys(vert.attributes).forEach((attrName) => {
      const attr = (vert.attributes as any)[attrName] as ShaderAttributeLoose;
      const semantic = attr.semantic;
      if (semantic) {
        semanticsMap[semantic] = {
          name: attrName
        };
      }
      attributes[attrName] = {
        type: 'float',
        semantic,
        size: attributeSizeMap[attr.type]
      };
    });

    this.textures = textures;
    this.uniformTpls = materialUniformTpls;
    this.semanticsMap = semanticsMap;
    this.matrixSemantics = matrixSemantics;
    this.attributes = attributes;

    const vertex = (this.vertex = composeShaderString(vert));
    // Force sharing varyings between vert and frag.
    const fragment = (this.fragment = composeShaderString(
      assign({}, frag, {
        varyings: vert.varyings
      })
    ));

    this._shaderID = getShaderID(vertex, fragment);
  }

  static uniform = createUniform;
  static arrayUniform = createArrayUniform;
  static attribute = createAttribute;
  static varying = createVarying;

  static Vertex = VertexShader;
  static Fragment = FragmentShader;
}

export default Shader;
