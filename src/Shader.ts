/**
 * Mainly do the parse and compile of shader string
 * Support shader code chunk import and export
 * Support shader semantics
 * http://www.nvidia.com/object/using_sas.html
 * https://github.com/KhronosGroup/collada2json/issues/45
 */
import * as util from './core/util';

const uniformRegex =
  /uniform\s+(bool|float|int|vec2|vec3|vec4|ivec2|ivec3|ivec4|mat2|mat3|mat4|sampler2D|samplerCube)\s+([\s\S]*?);/g;
const attributeRegex = /attribute\s+(float|int|vec2|vec3|vec4)\s+([\s\S]*?);/g;
// Only parse number define.
const defineRegex = /#define\s+(\w+)?(\s+[\d-.]+)?\s*;?\s*\n/g;

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
  mat4: 'm4'
} as const;

type NativeUniformType = keyof typeof uniformTypeMap;
export type UniformType =
  | typeof uniformTypeMap[NativeUniformType]
  | '1iv'
  | 'tv'
  | '1fv'
  | '2fv'
  | '3fv'
  | '4fv'
  | '2iv'
  | '3iv'
  | '4iv'
  | 'm2v'
  | 'm3v'
  | 'm4v';

interface ParsedAttributeSemantic {
  symbol: string;
  type: string;
}
interface ParsedMatrixSemantic {
  symbol: string;
  type: UniformType;
  isTranspose: boolean;
  semanticNoTranspose: string;
}

export interface ParsedUniformSemantic {
  symbol: string;
  type: UniformType;
}

interface ParsedDeclaration {
  value: any;
  isArray: boolean;
  arraySize: string;
  ignore: boolean;
  semantic: string;
}

interface ParsedTexture {
  shaderType: 'fragment' | 'vertex';
  type: 'sampler2D' | 'samplerCube';
}

interface ParsedAttribute {
  // TODO Can only be float
  type: 'float';
  size: number;
  semantic?: string;
}

interface ParsedUniformTemplate {
  type: UniformType;
  value: () => void;
  semantic?: string;
}

export type ShaderPrecision = 'highp' | 'lowp' | 'mediump';

export interface ShaderUniform {
  type: UniformType;
  value: any;
  semantic?: string;
}

export type ShaderDefineValue = boolean | string | number | undefined | null;
/**
 * @constructor
 * @extends clay.core.Base
 * @alias clay.Shader
 * @param {string} vertex
 * @param {string} fragment
 * @example
 * // Create a phong shader
 * const shader = new clay.Shader(
 *      clay.Shader.source('clay.standard.vertex'),
 *      clay.Shader.source('clay.standard.fragment')
 * );
 */

export type ShaderType = 'vertex' | 'fragment';

function createZeroArray(len: number) {
  const arr = [];
  for (let i = 0; i < len; i++) {
    arr[i] = 0;
  }
  return arr;
}

const uniformValueConstructor = {
  bool: function () {
    return true;
  },
  int: function () {
    return 0;
  },
  float: function () {
    return 0;
  },
  sampler2D: function () {
    return;
  },
  samplerCube: function () {
    return;
  },

  vec2: function () {
    return createZeroArray(2);
  },
  vec3: function () {
    return createZeroArray(3);
  },
  vec4: function () {
    return createZeroArray(4);
  },

  ivec2: function () {
    return createZeroArray(2);
  },
  ivec3: function () {
    return createZeroArray(3);
  },
  ivec4: function () {
    return createZeroArray(4);
  },

  mat2: function () {
    return createZeroArray(4);
  },
  mat3: function () {
    return createZeroArray(9);
  },
  mat4: function () {
    return createZeroArray(16);
  },

  array: function () {
    return [];
  }
};

const attributeSemantics = [
  'POSITION',
  'NORMAL',
  'BINORMAL',
  'TANGENT',
  'TEXCOORD',
  'TEXCOORD_0',
  'TEXCOORD_1',
  'COLOR',
  // Skinning
  // https://github.com/KhronosGroup/glTF/blob/master/specification/README.md#semantics
  'JOINT',
  'WEIGHT'
];
const uniformSemantics = [
  'SKIN_MATRIX',
  // Information about viewport
  'VIEWPORT_SIZE',
  'VIEWPORT',
  'DEVICEPIXELRATIO',
  // Window size for window relative coordinate
  // https://www.opengl.org/sdk/docs/man/html/gl_FragCoord.xhtml
  'WINDOW_SIZE',
  // Infomation about camera
  'NEAR',
  'FAR',
  // Time
  'TIME',
  // Log depth buffer
  'LOG_DEPTH_BUFFER_FC'
];
const matrixSemantics = [
  'WORLD',
  'VIEW',
  'PROJECTION',
  'WORLDVIEW',
  'VIEWPROJECTION',
  'WORLDVIEWPROJECTION',
  'WORLDINVERSE',
  'VIEWINVERSE',
  'PROJECTIONINVERSE',
  'WORLDVIEWINVERSE',
  'VIEWPROJECTIONINVERSE',
  'WORLDVIEWPROJECTIONINVERSE',
  'WORLDTRANSPOSE',
  'VIEWTRANSPOSE',
  'PROJECTIONTRANSPOSE',
  'WORLDVIEWTRANSPOSE',
  'VIEWPROJECTIONTRANSPOSE',
  'WORLDVIEWPROJECTIONTRANSPOSE',
  'WORLDINVERSETRANSPOSE',
  'VIEWINVERSETRANSPOSE',
  'PROJECTIONINVERSETRANSPOSE',
  'WORLDVIEWINVERSETRANSPOSE',
  'VIEWPROJECTIONINVERSETRANSPOSE',
  'WORLDVIEWPROJECTIONINVERSETRANSPOSE'
];

const attributeSizeMap: Record<string, number> = {
  // WebGL does not support integer attributes
  vec4: 4,
  vec3: 3,
  vec2: 2,
  float: 1
};

const shaderIDCache: Record<string, string> = {};
const shaderCodeCache: Record<
  string,
  {
    vertex: string;
    fragment: string;
  }
> = {};

function getShaderID(vertex: string, fragment: string) {
  const key = 'vertex:' + vertex + 'fragment:' + fragment;
  if (shaderIDCache[key]) {
    return shaderIDCache[key];
  }
  const id = util.genGUID() + '';
  shaderIDCache[key] = id;

  shaderCodeCache[id] = {
    vertex,
    fragment
  };

  return id;
}

function removeComment(code: string) {
  return code
    .replace(/[ \t]*\/\/.*\n/g, '') // remove //
    .replace(/[ \t]*\/\*[\s\S]*?\*\//g, ''); // remove /* */
}

function logSyntaxError() {
  console.error('Wrong uniform/attributes syntax');
}

function parseDeclarations(type: string, line: string) {
  const speratorsRegexp = /[,=():]/;
  let tokens = line
    // Convert `symbol: [1,2,3]` to `symbol: vec3(1,2,3)`
    .replace(/:\s*\[\s*(.*)\s*\]/g, '=' + type + '($1)')
    .replace(/\s+/g, '')
    .split(/(?=[,=():])/g);

  const newTokens = [];
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].match(speratorsRegexp)) {
      newTokens.push(tokens[i].charAt(0), tokens[i].slice(1));
    } else {
      newTokens.push(tokens[i]);
    }
  }
  tokens = newTokens;

  const TYPE_SYMBOL = 0;
  const TYPE_ASSIGN = 1;
  const TYPE_VEC = 2;
  const TYPE_ARR = 3;
  const TYPE_SEMANTIC = 4;
  const TYPE_NORMAL = 5;

  let opType = TYPE_SYMBOL;
  const declarations: Record<string, ParsedDeclaration> = {};
  let declarationValue: any;
  let currentDeclaration: string = '';

  addSymbol(tokens[0]);

  function addSymbol(symbol: string) {
    if (!symbol) {
      logSyntaxError();
    }
    const arrResult = symbol.match(/\[(.*?)\]/);
    currentDeclaration = symbol.replace(/\[(.*?)\]/, '');
    declarations[currentDeclaration] = {} as ParsedDeclaration;
    if (arrResult) {
      declarations[currentDeclaration].isArray = true;
      declarations[currentDeclaration].arraySize = arrResult[1] as any;
    }
  }

  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i];
    if (!token) {
      // Empty token;
      continue;
    }
    if (token === '=') {
      if (opType !== TYPE_SYMBOL && opType !== TYPE_ARR) {
        logSyntaxError();
        break;
      }
      opType = TYPE_ASSIGN;

      continue;
    } else if (token === ':') {
      opType = TYPE_SEMANTIC;

      continue;
    } else if (token === ',') {
      if (opType === TYPE_VEC) {
        if (!(declarationValue instanceof Array)) {
          logSyntaxError();
          break;
        }
        declarationValue.push(+tokens[++i]);
      } else {
        opType = TYPE_NORMAL;
      }

      continue;
    } else if (token === ')') {
      declarations[currentDeclaration].value = new Float32Array(declarationValue);
      declarationValue = null;
      opType = TYPE_NORMAL;
      continue;
    } else if (token === '(') {
      if (opType !== TYPE_VEC) {
        logSyntaxError();
        break;
      }
      if (!(declarationValue instanceof Array)) {
        logSyntaxError();
        break;
      }
      declarationValue.push(+tokens[++i]);
      continue;
    } else if (token.indexOf('vec') >= 0) {
      if (
        opType !== TYPE_ASSIGN &&
        // Compatitable with old syntax `symbol: [1,2,3]`
        opType !== TYPE_SEMANTIC
      ) {
        logSyntaxError();
        break;
      }
      opType = TYPE_VEC;
      declarationValue = [];
      continue;
    } else if (opType === TYPE_ASSIGN) {
      if (type === 'bool') {
        declarations[currentDeclaration].value = token === 'true';
      } else {
        declarations[currentDeclaration].value = parseFloat(token);
      }
      declarationValue = null;
      continue;
    } else if (opType === TYPE_SEMANTIC) {
      const semantic = token;
      if (
        attributeSemantics.indexOf(semantic) >= 0 ||
        uniformSemantics.indexOf(semantic) >= 0 ||
        matrixSemantics.indexOf(semantic) >= 0
      ) {
        declarations[currentDeclaration].semantic = semantic;
      } else if (semantic === 'ignore' || semantic === 'unconfigurable') {
        declarations[currentDeclaration].ignore = true;
      } else {
        // Try to parse as a default tvalue.
        if (type === 'bool') {
          declarations[currentDeclaration].value = semantic === 'true';
        } else {
          declarations[currentDeclaration].value = parseFloat(semantic);
        }
      }
      continue;
    }

    // treat as symbol.
    addSymbol(token);
    opType = TYPE_SYMBOL;
  }

  return declarations;
}

class Shader {
  /**
   * @readOnly
   */
  attributeSemantics: Record<string, ParsedAttributeSemantic> = {};
  /**
   * @readOnly
   */
  matrixSemantics: Record<string, ParsedMatrixSemantic> = {};
  /**
   * @readOnly
   */
  uniformSemantics: Record<string, ParsedUniformSemantic> = {};
  /**
   * @readOnly
   */
  matrixSemanticKeys: string[] = [];
  /**
   * @readOnly
   */
  uniformTemplates: Record<string, ParsedUniformTemplate> = {};
  /**
   * @readOnly
   */
  attributes: Record<string, ParsedAttribute> = {};
  /**
   * @readOnly
   */
  textures: Record<string, ParsedTexture> = {};
  /**
   * @readOnly
   */
  vertexDefines: Record<string, ShaderDefineValue> = {};
  /**
   * @readOnly
   */
  fragmentDefines: Record<string, ShaderDefineValue> = {};

  private _shaderID: string;
  private _vertexCode: string;
  private _fragmentCode: string;

  private _uniformList: string[] = [];

  constructor(opts: { vertex: string; fragment: string });
  constructor(vertex: string, fragment: string);
  constructor(vertex: string | { vertex: string; fragment: string }, fragment?: string) {
    // First argument can be { vertex, fragment }
    if (typeof vertex === 'object') {
      fragment = vertex.fragment;
      vertex = vertex.vertex;
    }

    vertex = removeComment(vertex);
    fragment = removeComment(fragment!);

    this._shaderID = getShaderID(vertex, fragment);

    this._vertexCode = Shader.parseImport(vertex);
    this._fragmentCode = Shader.parseImport(fragment);

    this._parseAttributes();
    this._parseUniforms();
    this._parseDefines();
  }

  // Create a new uniform instance for material
  createUniforms() {
    const uniforms: Record<string, ShaderUniform> = {};

    for (const symbol in this.uniformTemplates) {
      const uniformTpl = this.uniformTemplates[symbol];
      uniforms[symbol] = {
        type: uniformTpl.type,
        value: uniformTpl.value()
      };
    }

    return uniforms;
  }

  _parseImport() {
    this._vertexCode = Shader.parseImport(this.vertex);
    this._fragmentCode = Shader.parseImport(this.fragment);
  }

  _addSemanticUniform(symbol: string, uniformType: UniformType, semantic: string) {
    // This case is only for SKIN_MATRIX
    // TODO
    if (attributeSemantics.indexOf(semantic) >= 0) {
      this.attributeSemantics[semantic] = {
        symbol: symbol,
        type: uniformType
      };
    } else if (matrixSemantics.indexOf(semantic) >= 0) {
      let isTranspose = false;
      let semanticNoTranspose = semantic;
      if (semantic.match(/TRANSPOSE$/)) {
        isTranspose = true;
        semanticNoTranspose = semantic.slice(0, -9);
      }
      this.matrixSemantics[semantic] = {
        symbol: symbol,
        type: uniformType,
        isTranspose: isTranspose,
        semanticNoTranspose: semanticNoTranspose
      };
    } else if (uniformSemantics.indexOf(semantic) >= 0) {
      this.uniformSemantics[semantic] = {
        symbol: symbol,
        type: uniformType
      };
    }
  }

  _addMaterialUniform(
    symbol: string,
    type: NativeUniformType,
    uniformType: UniformType,
    defaultValueFunc: (() => any) | undefined,
    isArray: boolean,
    materialUniforms: Record<string, ParsedUniformTemplate>
  ) {
    materialUniforms[symbol] = {
      type: uniformType,
      value: isArray
        ? uniformValueConstructor.array
        : defaultValueFunc || uniformValueConstructor[type],
      semantic: undefined
    };
  }

  _parseUniforms() {
    const uniformsTemplates: Record<string, ParsedUniformTemplate> = {};
    const self = this;
    let shaderType: ShaderType = 'vertex';
    this._uniformList = [];

    this._vertexCode = this._vertexCode.replace(uniformRegex, _uniformParser);
    shaderType = 'fragment';
    this._fragmentCode = this._fragmentCode.replace(uniformRegex, _uniformParser);

    self.matrixSemanticKeys = Object.keys(this.matrixSemantics);

    function makeDefaultValueFunc(value: any) {
      return value != null
        ? function () {
            return value;
          }
        : undefined;
    }

    function _uniformParser(str: string, type: NativeUniformType, content: string) {
      const declaredUniforms = parseDeclarations(type, content);
      const uniformMainStr = [];
      for (const symbol in declaredUniforms) {
        const uniformInfo = declaredUniforms[symbol];
        const semantic = uniformInfo.semantic;
        let tmpStr = symbol;
        let uniformType = uniformTypeMap[type];
        const defaultValueFunc = makeDefaultValueFunc(declaredUniforms[symbol].value);
        if (declaredUniforms[symbol].isArray) {
          tmpStr += '[' + declaredUniforms[symbol].arraySize + ']';
          uniformType += 'v';
        }

        uniformMainStr.push(tmpStr);

        self._uniformList.push(symbol);

        if (!uniformInfo.ignore) {
          if (type === 'sampler2D' || type === 'samplerCube') {
            // Texture is default disabled
            self.textures[symbol] = {
              shaderType: shaderType,
              type: type
            };
          }

          if (semantic) {
            // TODO Should not declare multiple symbols if have semantic.
            self._addSemanticUniform(symbol, uniformType as UniformType, semantic);
          } else {
            self._addMaterialUniform(
              symbol,
              type,
              uniformType as UniformType,
              defaultValueFunc,
              declaredUniforms[symbol].isArray,
              uniformsTemplates
            );
          }
        }
      }
      return uniformMainStr.length > 0
        ? 'uniform ' + type + ' ' + uniformMainStr.join(',') + ';\n'
        : '';
    }

    this.uniformTemplates = uniformsTemplates;
  }

  _parseAttributes() {
    const attributes: Record<string, ParsedAttribute> = {};
    const self = this;
    this._vertexCode = this._vertexCode.replace(attributeRegex, _attributeParser);

    function _attributeParser(str: string, type: string, content: string) {
      const declaredAttributes = parseDeclarations(type, content);

      const size = attributeSizeMap[type] || 1;
      const attributeMainStr = [];
      for (const symbol in declaredAttributes) {
        const semantic = declaredAttributes[symbol].semantic;
        attributes[symbol] = {
          type: 'float',
          size,
          semantic
        };
        // TODO Should not declare multiple symbols if have semantic.
        if (semantic) {
          if (attributeSemantics.indexOf(semantic) < 0) {
            throw new Error('Unkown semantic "' + semantic + '"');
          } else {
            self.attributeSemantics[semantic] = {
              symbol: symbol,
              type: type
            };
          }
        }
        attributeMainStr.push(symbol);
      }

      return 'attribute ' + type + ' ' + attributeMainStr.join(',') + ';\n';
    }

    this.attributes = attributes;
  }

  _parseDefines() {
    const self = this;
    let shaderType = 'vertex';
    this._vertexCode = this._vertexCode.replace(defineRegex, _defineParser);
    shaderType = 'fragment';
    this._fragmentCode = this._fragmentCode.replace(defineRegex, _defineParser);

    function _defineParser(str: string, symbol: string, value: string) {
      const defines = shaderType === 'vertex' ? self.vertexDefines : self.fragmentDefines;
      if (!defines[symbol]) {
        // Haven't been defined by user
        if (value === 'false') {
          defines[symbol] = false;
        } else if (value === 'true') {
          defines[symbol] = true;
        } else {
          defines[symbol] = value
            ? // If can parse to float
              isNaN(parseFloat(value))
              ? value.trim()
              : parseFloat(value)
            : undefined;
        }
      }
      return '';
    }
  }

  /**
   * Clone a new shader
   * @return {clay.Shader}
   */
  clone() {
    const code = shaderCodeCache[this._shaderID];
    const shader = new Shader(code.vertex, code.fragment);
    return shader;
  }

  get shaderID() {
    return this._shaderID;
  }
  get vertex() {
    return this._vertexCode;
  }
  get fragment() {
    return this._fragmentCode;
  }
  get uniforms() {
    return this._uniformList;
  }

  static parseImport(shaderStr: string) {
    const importRegex = /(@import)\s*([0-9a-zA-Z_\-.]*)/g;
    shaderStr = shaderStr.replace(importRegex, function (str, importSymbol, importName) {
      str = Shader.source(importName);
      if (str) {
        // Recursively parse
        return Shader.parseImport(str);
      } else {
        console.error('Shader chunk "' + importName + '" not existed in library');
        return '';
      }
    });
    return shaderStr;
  }

  /**
   * Import shader source
   * @param  {string} shaderStr
   * @memberOf clay.Shader
   */
  static import(shaderStr: string) {
    const exportRegex = /(@export)\s*([0-9a-zA-Z_\-.]*)\s*\n([\s\S]*?)@end/g;

    shaderStr.replace(exportRegex, function (str, exportSymbol, exportName, code) {
      code = code.replace(/(^[\s\t\xa0\u3000]+)|([\u3000\xa0\s\t]+\x24)/g, '');
      if (code) {
        const parts = exportName.split('.');
        let obj = Shader.codes;
        let i = 0;
        let key;
        while (i < parts.length - 1) {
          key = parts[i++];
          if (!obj[key]) {
            obj[key] = {};
          }
          obj = obj[key];
        }
        key = parts[i];
        obj[key] = code;
      }
      return code;
    });
  }

  /**
   * Library to store all the loaded shader codes
   * @type {Object}
   * @readOnly
   * @memberOf clay.Shader
   */
  static codes: Record<string, any> = {};

  /**
   * Get shader source
   * @param  {string} name
   * @return {string}
   */
  static source(name: string) {
    const parts = name.split('.');
    let obj = Shader.codes;
    let i = 0;
    while (obj && i < parts.length) {
      const key = parts[i++];
      obj = obj[key];
    }
    if (typeof obj !== 'string') {
      // FIXME Use default instead
      console.error('Shader "' + name + '" not existed in library');
      return '';
    }
    return obj;
  }
}

export default Shader;
