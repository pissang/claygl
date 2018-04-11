/**
 * Mainly do the parse and compile of shader string
 * Support shader code chunk import and export
 * Support shader semantics
 * http://www.nvidia.com/object/using_sas.html
 * https://github.com/KhronosGroup/collada2json/issues/45
 */
import util from './core/util';
import vendor from './core/vendor';

var uniformRegex = /uniform\s+(bool|float|int|vec2|vec3|vec4|ivec2|ivec3|ivec4|mat2|mat3|mat4|sampler2D|samplerCube)\s+([\s\S]*?);/g;
var attributeRegex = /attribute\s+(float|int|vec2|vec3|vec4)\s+([\s\S]*?);/g;
// Only parse number define.
var defineRegex = /#define\s+(\w+)?(\s+[\d-.]+)?\s*;?\s*\n/g;

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

function createZeroArray(len) {
    var arr = [];
    for (var i = 0; i < len; i++) {
        arr[i] = 0;
    }
    return arr;
}

var uniformValueConstructor = {
    'bool': function () { return true; },
    'int': function () { return 0; },
    'float': function () { return 0; },
    'sampler2D': function () { return null; },
    'samplerCube': function () { return null; },

    'vec2': function () { return createZeroArray(2); },
    'vec3': function () { return createZeroArray(3); },
    'vec4': function () { return createZeroArray(4); },

    'ivec2': function () { return createZeroArray(2); },
    'ivec3': function () { return createZeroArray(3); },
    'ivec4': function () { return createZeroArray(4); },

    'mat2': function () { return createZeroArray(4); },
    'mat3': function () { return createZeroArray(9); },
    'mat4': function () { return createZeroArray(16); },

    'array': function () { return []; }
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

var attributeSizeMap = {
    // WebGL does not support integer attributes
    'vec4': 4,
    'vec3': 3,
    'vec2': 2,
    'float': 1
};


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

function removeComment(code) {
    return code.replace(/[ \t]*\/\/.*\n/g, '' )   // remove //
        .replace(/[ \t]*\/\*[\s\S]*?\*\//g, '' ); // remove /* */
}

function logSyntaxError() {
    console.error('Wrong uniform/attributes syntax');
}

function parseDeclarations(type, line) {
    var speratorsRegexp = /[,=\(\):]/;
    var tokens = line
        // Convert `symbol: [1,2,3]` to `symbol: vec3(1,2,3)`
        .replace(/:\s*\[\s*(.*)\s*\]/g, '=' + type + '($1)')
        .replace(/\s+/g, '')
        .split(/(?=[,=\(\):])/g);

    var newTokens = [];
    for (var i = 0; i < tokens.length; i++) {
        if (tokens[i].match(speratorsRegexp)) {
            newTokens.push(
                tokens[i].charAt(0),
                tokens[i].slice(1)
            );
        }
        else {
            newTokens.push(tokens[i]);
        }
    }
    tokens = newTokens;

    var TYPE_SYMBOL = 0;
    var TYPE_ASSIGN = 1;
    var TYPE_VEC = 2;
    var TYPE_ARR = 3;
    var TYPE_SEMANTIC = 4;
    var TYPE_NORMAL = 5;

    var opType = TYPE_SYMBOL;
    var declarations = {};
    var declarationValue = null;
    var currentDeclaration;

    addSymbol(tokens[0]);

    function addSymbol(symbol) {
        if (!symbol) {
            logSyntaxError();
        }
        var arrResult = symbol.match(/\[(.*?)\]/);
        currentDeclaration = symbol.replace(/\[(.*?)\]/, '');
        declarations[currentDeclaration] = {};
        if (arrResult) {
            declarations[currentDeclaration].isArray = true;
            declarations[currentDeclaration].arraySize = arrResult[1];
        }
    }

    for (var i = 1; i < tokens.length; i++) {
        var token = tokens[i];
        if (!token) {   // Empty token;
            continue;
        }
        if (token === '=') {
            if (opType !== TYPE_SYMBOL
            && opType !== TYPE_ARR) {
                logSyntaxError();
                break;
            }
            opType = TYPE_ASSIGN;

            continue;
        }
        else if (token === ':') {
            opType = TYPE_SEMANTIC;

            continue;
        }
        else if (token === ',') {
            if (opType === TYPE_VEC) {
                if (!(declarationValue instanceof Array)) {
                    logSyntaxError();
                    break;
                }
                declarationValue.push(+tokens[++i]);
            }
            else {
                opType = TYPE_NORMAL;
            }

            continue;
        }
        else if (token === ')') {
            declarations[currentDeclaration].value = new vendor.Float32Array(declarationValue);
            declarationValue = null;
            opType = TYPE_NORMAL;
            continue;
        }
        else if (token === '(') {
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
        }
        else if (token.indexOf('vec') >= 0) {
            if (opType !== TYPE_ASSIGN
            // Compatitable with old syntax `symbol: [1,2,3]`
            && opType !== TYPE_SEMANTIC) {
                logSyntaxError();
                break;
            }
            opType = TYPE_VEC;
            declarationValue = [];
            continue;
        }
        else if (opType === TYPE_ASSIGN) {
            if (type === 'bool') {
                declarations[currentDeclaration].value = token === 'true';
            }
            else {
                declarations[currentDeclaration].value = parseFloat(token);
            }
            declarationValue = null;
            continue;
        }
        else if (opType === TYPE_SEMANTIC) {
            var semantic = token;
            if (attributeSemantics.indexOf(semantic) >= 0
                || uniformSemantics.indexOf(semantic) >= 0
                || matrixSemantics.indexOf(semantic) >= 0
            ) {
                declarations[currentDeclaration].semantic = semantic;
            }
            else if (semantic === 'ignore' || semantic === 'unconfigurable') {
                declarations[currentDeclaration].ignore = true;
            }
            else {
                // Try to parse as a default tvalue.
                if (type === 'bool') {
                    declarations[currentDeclaration].value = semantic === 'true';
                }
                else {
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


/**
 * @constructor
 * @extends clay.core.Base
 * @alias clay.Shader
 * @param {string} vertex
 * @param {string} fragment
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

    vertex = removeComment(vertex);
    fragment = removeComment(fragment);

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

    _addSemanticUniform: function (symbol, uniformType, semantic) {
        // This case is only for SKIN_MATRIX
        // TODO
        if (attributeSemantics.indexOf(semantic) >= 0) {
            this.attributeSemantics[semantic] = {
                symbol: symbol,
                type: uniformType
            };
        }
        else if (matrixSemantics.indexOf(semantic) >= 0) {
            var isTranspose = false;
            var semanticNoTranspose = semantic;
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
        }
        else if (uniformSemantics.indexOf(semantic) >= 0) {
            this.uniformSemantics[semantic] = {
                symbol: symbol,
                type: uniformType
            };
        }
    },

    _addMaterialUniform: function (symbol, type, uniformType, defaultValueFunc, isArray, materialUniforms) {
        materialUniforms[symbol] = {
            type: uniformType,
            value: isArray ? uniformValueConstructor['array'] : (defaultValueFunc || uniformValueConstructor[type]),
            semantic: null
        };
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

        function makeDefaultValueFunc(value) {
            return value != null ? function () { return value; } : null;
        }

        function _uniformParser(str, type, content) {
            var declaredUniforms = parseDeclarations(type, content);
            var uniformMainStr = [];
            for (var symbol in declaredUniforms) {

                var uniformInfo = declaredUniforms[symbol];
                var semantic = uniformInfo.semantic;
                var tmpStr = symbol;
                var uniformType = uniformTypeMap[type];
                var defaultValueFunc = makeDefaultValueFunc(declaredUniforms[symbol].value);
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
                        self._addSemanticUniform(symbol, uniformType, semantic);
                    }
                    else {
                        self._addMaterialUniform(
                            symbol, type, uniformType, defaultValueFunc,
                            declaredUniforms[symbol].isArray, uniforms
                        );
                    }
                }
            }
            return uniformMainStr.length > 0
                ? 'uniform ' + type + ' ' + uniformMainStr.join(',') + ';\n' : '';
        }

        this.uniformTemplates = uniforms;
    },

    _parseAttributes: function () {
        var attributes = {};
        var self = this;
        this._vertexCode = this._vertexCode.replace(attributeRegex, _attributeParser);

        function _attributeParser(str, type, content) {
            var declaredAttributes = parseDeclarations(type, content);

            var size = attributeSizeMap[type] || 1;
            var attributeMainStr = [];
            for (var symbol in declaredAttributes) {
                var semantic = declaredAttributes[symbol].semantic;
                attributes[symbol] = {
                    // TODO Can only be float
                    type: 'float',
                    size: size,
                    semantic: semantic || null
                };
                // TODO Should not declare multiple symbols if have semantic.
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
                attributeMainStr.push(symbol);
            }

            return 'attribute ' + type + ' ' + attributeMainStr.join(',') + ';\n';
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
                if (value === 'false') {
                    defines[symbol] = false;
                }
                else if (value === 'true') {
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
