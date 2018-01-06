/**
 * Mainly do the parse and compile of shader string
 * Support shader code chunk import and export
 * Support shader semantics
 * http://www.nvidia.com/object/using_sas.html
 * https://github.com/KhronosGroup/collada2json/issues/45
 *
 * TODO: Use etpl or other string template engine
 */
import util from './core/util';
import vendor from './core/vendor';
import glMatrix from './dep/glmatrix';
var mat2 = glMatrix.mat2;
var mat3 = glMatrix.mat3;
var mat4 = glMatrix.mat4;

var uniformRegex = /uniform\s+(bool|float|int|vec2|vec3|vec4|ivec2|ivec3|ivec4|mat2|mat3|mat4|sampler2D|samplerCube)\s+([\w\,]+)?(\[.*?\])?\s*(:\s*([\S\s]+?))?;/g;
var attributeRegex = /attribute\s+(float|int|vec2|vec3|vec4)\s+(\w*)\s*(:\s*(\w+))?;/g;
var defineRegex = /#define\s+(\w+)?(\s+[\w-.]+)?\s*;?\s*\n/g;

var uniformTypeMap = {
    'bool': '1i',
    'int': '1i',
    'sampler2D': 't',
    'samplerCube': 't',
    'float': '1f',
    'vec2': '2f',
    'vec3': '3f',
    'vec4': '4f',
    'ivec2': '2i',
    'ivec3': '3i',
    'ivec4': '4i',
    'mat2': 'm2',
    'mat3': 'm3',
    'mat4': 'm4'
};

var uniformValueConstructor = {
    'bool': function () {return true;},
    'int': function () {return 0;},
    'float': function () {return 0;},
    'sampler2D': function () {return null;},
    'samplerCube': function () {return null;},

    'vec2': function () {return [0, 0];},
    'vec3': function () {return [0, 0, 0];},
    'vec4': function () {return [0, 0, 0, 0];},

    'ivec2': function () {return [0, 0];},
    'ivec3': function () {return [0, 0, 0];},
    'ivec4': function () {return [0, 0, 0, 0];},

    'mat2': function () {return mat2.create();},
    'mat3': function () {return mat3.create();},
    'mat4': function () {return mat4.create();},

    'array': function () {return [];}
};

var attributeSemantics = [
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
var uniformSemantics = [
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
    'TIME'
];
var matrixSemantics = [
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


var shaderIDCache = {};
var shaderCodeCache = {};

function getShaderID(vertex, fragment) {
    var key = 'vertex:' + vertex + 'fragment:' + fragment;
    if (shaderIDCache[key]) {
        return shaderIDCache[key];
    }
    var id = util.genGUID();
    shaderIDCache[key] = id;

    shaderCodeCache[id] = {
        vertex: vertex,
        fragment: fragment
    };

    return id;
}

/**
 * @constructor
 * @extends clay.core.Base
 * @alias clay.Shader
 * @example
 * // Create a phong shader
 * var shader = new clay.Shader(
 *      clay.Shader.source('clay.standard.vertex'),
 *      clay.Shader.source('clay.standard.fragment')
 * );
 */
function Shader(vertex, fragment) {
    // First argument can be { vertex, fragment }
    if (typeof vertex === 'object') {
        fragment = vertex.fragment;
        vertex = vertex.vertex;
    }

    this._shaderID = getShaderID(vertex, fragment);

    this._vertexCode = Shader.parseImport(vertex);
    this._fragmentCode = Shader.parseImport(fragment);

    /**
     * @readOnly
     */
    this.attributeSemantics = {};
    /**
     * @readOnly
     */
    this.matrixSemantics = {};
    /**
     * @readOnly
     */
    this.uniformSemantics = {};
    /**
     * @readOnly
     */
    this.matrixSemanticKeys = [];
    /**
     * @readOnly
     */
    this.uniformTemplates = {};
    /**
     * @readOnly
     */
    this.attributes = {};
    /**
     * @readOnly
     */
    this.textures = {};
    /**
     * @readOnly
     */
    this.vertexDefines = {};
    /**
     * @readOnly
     */
    this.fragmentDefines = {};

    this._parseAttributes();
    this._parseUniforms();
    this._parseDefines();
}

Shader.prototype = {

    constructor: Shader,

    // Create a new uniform instance for material
    createUniforms: function () {
        var uniforms = {};

        for (var symbol in this.uniformTemplates){
            var uniformTpl = this.uniformTemplates[symbol];
            uniforms[symbol] = {
                type: uniformTpl.type,
                value: uniformTpl.value()
            };
        }

        return uniforms;
    },

    _parseImport: function () {
        this._vertexCode = Shader.parseImport(this.vertex);
        this._fragmentCode = Shader.parseImport(this.fragment);
    },

    _parseUniforms: function () {
        var uniforms = {};
        var self = this;
        var shaderType = 'vertex';
        this._uniformList = [];

        this._vertexCode = this._vertexCode.replace(uniformRegex, _uniformParser);
        shaderType = 'fragment';
        this._fragmentCode = this._fragmentCode.replace(uniformRegex, _uniformParser);

        self.matrixSemanticKeys = Object.keys(this.matrixSemantics);

        function _uniformParser(str, type, symbol, isArray, semanticWrapper, semantic) {
            if (type && symbol) {
                var uniformType = uniformTypeMap[type];
                var isConfigurable = true;
                var defaultValueFunc;
                if (uniformType) {
                    self._uniformList.push(symbol);
                    if (type === 'sampler2D' || type === 'samplerCube') {
                        // Texture is default disabled
                        self.textures[symbol] = {
                            shaderType: shaderType,
                            type: type
                        };
                    }
                    if (isArray) {
                        uniformType += 'v';
                    }
                    if (semantic) {
                        // This case is only for SKIN_MATRIX
                        // TODO
                        if (attributeSemantics.indexOf(semantic) >= 0) {
                            self.attributeSemantics[semantic] = {
                                symbol: symbol,
                                type: uniformType
                            };
                            isConfigurable = false;
                        }
                        else if (matrixSemantics.indexOf(semantic) >= 0) {
                            var isTranspose = false;
                            var semanticNoTranspose = semantic;
                            if (semantic.match(/TRANSPOSE$/)) {
                                isTranspose = true;
                                semanticNoTranspose = semantic.slice(0, -9);
                            }
                            self.matrixSemantics[semantic] = {
                                symbol: symbol,
                                type: uniformType,
                                isTranspose: isTranspose,
                                semanticNoTranspose: semanticNoTranspose
                            };
                            isConfigurable = false;
                        }
                        else if (uniformSemantics.indexOf(semantic) >= 0) {
                            self.uniformSemantics[semantic] = {
                                symbol: symbol,
                                type: uniformType
                            };
                            isConfigurable = false;
                        }
                        else {
                            // The uniform is not configurable, which means it will not appear
                            // in the material uniform properties
                            if (semantic === 'unconfigurable') {
                                isConfigurable = false;
                            }
                            else {
                                // Uniform have a defalut value, like
                                // uniform vec3 color: [1, 1, 1];
                                defaultValueFunc = self._parseDefaultValue(type, semantic);
                                if (!defaultValueFunc) {
                                    throw new Error('Unkown semantic "' + semantic + '"');
                                }
                                else {
                                    semantic = '';
                                }
                            }
                        }
                    }

                    if (isConfigurable) {
                        uniforms[symbol] = {
                            type: uniformType,
                            value: isArray ? uniformValueConstructor['array'] : (defaultValueFunc || uniformValueConstructor[type]),
                            semantic: semantic || null
                        };
                    }
                }
                return ['uniform', type, symbol, isArray].join(' ') + ';\n';
            }
        }

        this.uniformTemplates = uniforms;
    },

    _parseDefaultValue: function (type, str) {
        var arrayRegex = /\[\s*(.*)\s*\]/;
        if (type === 'vec2' || type === 'vec3' || type === 'vec4') {
            var arrayStr = arrayRegex.exec(str)[1];
            if (arrayStr) {
                var arr = arrayStr.split(/\s*,\s*/);
                return function () {
                    return new vendor.Float32Array(arr);
                };
            }
            else {
                // Invalid value
                return;
            }
        }
        else if (type === 'bool') {
            return function () {
                return str.toLowerCase() === 'true' ? true : false;
            };
        }
        else if (type === 'float') {
            return function () {
                return parseFloat(str);
            };
        }
        else if (type === 'int') {
            return function () {
                return parseInt(str);
            };
        }
    },

    _parseAttributes: function () {
        var attributes = {};
        var self = this;
        this._vertexCode = this._vertexCode.replace(attributeRegex, _attributeParser);

        function _attributeParser(str, type, symbol, semanticWrapper, semantic) {
            if (type && symbol) {
                var size = 1;
                switch (type) {
                    case 'vec4':
                        size = 4;
                        break;
                    case 'vec3':
                        size = 3;
                        break;
                    case 'vec2':
                        size = 2;
                        break;
                    case 'float':
                        size = 1;
                        break;
                }

                attributes[symbol] = {
                    // Can only be float
                    type: 'float',
                    size: size,
                    semantic: semantic || null
                };

                if (semantic) {
                    if (attributeSemantics.indexOf(semantic) < 0) {
                        throw new Error('Unkown semantic "' + semantic + '"');
                    }
                    else {
                        self.attributeSemantics[semantic] = {
                            symbol: symbol,
                            type: type
                        };
                    }
                }
            }

            return ['attribute', type, symbol].join(' ') + ';\n';
        }

        this.attributes = attributes;
    },

    _parseDefines: function () {
        var self = this;
        var shaderType = 'vertex';
        this._vertexCode = this._vertexCode.replace(defineRegex, _defineParser);
        shaderType = 'fragment';
        this._fragmentCode = this._fragmentCode.replace(defineRegex, _defineParser);

        function _defineParser(str, symbol, value) {
            var defines = shaderType === 'vertex' ? self.vertexDefines : self.fragmentDefines;
            if (!defines[symbol]) { // Haven't been defined by user
                if (value == 'false') {
                    defines[symbol] = false;
                }
                else if (value == 'true') {
                    defines[symbol] = true;
                }
                else {
                    defines[symbol] = value
                        // If can parse to float
                        ? (isNaN(parseFloat(value)) ? value.trim() : parseFloat(value))
                        : null;
                }
            }
            return '';
        }
    },

    /**
     * Clone a new shader
     * @return {clay.Shader}
     */
    clone: function () {
        var code = shaderCodeCache[this._shaderID];
        var shader = new Shader(code.vertex, code.fragment);
        return shader;
    }
};

if (Object.defineProperty) {
    Object.defineProperty(Shader.prototype, 'shaderID', {
        get: function () {
            return this._shaderID;
        }
    });
    Object.defineProperty(Shader.prototype, 'vertex', {
        get: function () {
            return this._vertexCode;
        }
    });
    Object.defineProperty(Shader.prototype, 'fragment', {
        get: function () {
            return this._fragmentCode;
        }
    });
    Object.defineProperty(Shader.prototype, 'uniforms', {
        get: function () {
            return this._uniformList;
        }
    });
}

var importRegex = /(@import)\s*([0-9a-zA-Z_\-\.]*)/g;
Shader.parseImport = function (shaderStr) {
    shaderStr = shaderStr.replace(importRegex, function (str, importSymbol, importName) {
        var str = Shader.source(importName);
        if (str) {
            // Recursively parse
            return Shader.parseImport(str);
        }
        else {
            console.error('Shader chunk "' + importName + '" not existed in library');
            return '';
        }
    });
    return shaderStr;
};

var exportRegex = /(@export)\s*([0-9a-zA-Z_\-\.]*)\s*\n([\s\S]*?)@end/g;

/**
 * Import shader source
 * @param  {string} shaderStr
 * @memberOf clay.Shader
 */
Shader['import'] = function (shaderStr) {
    shaderStr.replace(exportRegex, function (str, exportSymbol, exportName, code) {
        var code = code.replace(/(^[\s\t\xa0\u3000]+)|([\u3000\xa0\s\t]+\x24)/g, '');
        if (code) {
            var parts = exportName.split('.');
            var obj = Shader.codes;
            var i = 0;
            var key;
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
};

/**
 * Library to store all the loaded shader codes
 * @type {Object}
 * @readOnly
 * @memberOf clay.Shader
 */
Shader.codes = {};

/**
 * Get shader source
 * @param  {string} name
 * @return {string}
 */
Shader.source = function (name) {
    var parts = name.split('.');
    var obj = Shader.codes;
    var i = 0;
    while (obj && i < parts.length) {
        var key = parts[i++];
        obj = obj[key];
    }
    if (typeof obj !== 'string') {
        // FIXME Use default instead
        console.error('Shader "' + name + '" not existed in library');
        return '';
    }
    return obj;
};

export default Shader;
