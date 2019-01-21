import vendor from '../core/vendor';
import Base from '../core/Base';

var SHADER_STATE_TO_ENABLE = 1;
var SHADER_STATE_KEEP_ENABLE = 2;
var SHADER_STATE_PENDING = 3;

// Enable attribute operation is global to all programs
// Here saved the list of all enabled attribute index
// http://www.mjbshaw.com/2013/03/webgl-fixing-invalidoperation.html
var enabledAttributeList = {};

// some util functions
function addLineNumbers(string) {
    var chunks = string.split('\n');
    for (var i = 0, il = chunks.length; i < il; i ++) {
        // Chrome reports shader errors on lines
        // starting counting from 1
        chunks[i] = (i + 1) + ': ' + chunks[i];
    }
    return chunks.join('\n');
}

// Return true or error msg if error happened
function checkShaderErrorMsg(_gl, shader, shaderString) {
    if (!_gl.getShaderParameter(shader, _gl.COMPILE_STATUS)) {
        return [_gl.getShaderInfoLog(shader), addLineNumbers(shaderString)].join('\n');
    }
}

var tmpFloat32Array16 = new vendor.Float32Array(16);

var GLProgram = Base.extend({

    uniformSemantics: {},
    attributes: {}

}, function () {
    this._locations = {};

    this._textureSlot = 0;

    this._program = null;
}, {

    bind: function (renderer) {
        this._textureSlot = 0;
        renderer.gl.useProgram(this._program);
    },

    hasUniform: function (symbol) {
        var location = this._locations[symbol];
        return location !== null && location !== undefined;
    },

    useTextureSlot: function (renderer, texture, slot) {
        if (texture) {
            renderer.gl.activeTexture(renderer.gl.TEXTURE0 + slot);
            // Maybe texture is not loaded yet;
            if (texture.isRenderable()) {
                texture.bind(renderer);
            }
            else {
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
        var textureSlot = this._textureSlot;

        this.useTextureSlot(renderer, texture, textureSlot);

        this._textureSlot++;

        return textureSlot;
    },

    setUniform: function (_gl, type, symbol, value) {
        var locationMap = this._locations;
        var location = locationMap[symbol];
        // Uniform is not existed in the shader
        if (location === null || location === undefined) {
            return false;
        }

        switch (type) {
            case 'm4':
                if (!(value instanceof Float32Array)) {
                    // Use Float32Array is much faster than array when uniformMatrix4fv.
                    for (var i = 0; i < value.length; i++) {
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
                    var array = new vendor.Float32Array(value.length * 16);
                    var cursor = 0;
                    for (var i = 0; i < value.length; i++) {
                        var item = value[i];
                        for (var j = 0; j < 16; j++) {
                            array[cursor++] = item[j];
                        }
                    }
                    _gl.uniformMatrix4fv(location, false, array);
                }
                else {   // ArrayBufferView
                    _gl.uniformMatrix4fv(location, false, value);
                }
                break;
        }
        return true;
    },

    setUniformOfSemantic: function (_gl, semantic, val) {
        var semanticInfo = this.uniformSemantics[semantic];
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
        var _gl = renderer.gl;
        var program = this._program;

        var locationMap = this._locations;

        var enabledAttributeListInContext;
        if (vao) {
            enabledAttributeListInContext = vao.__enabledAttributeList;
        }
        else {
            enabledAttributeListInContext = enabledAttributeList[renderer.__uid__];
        }
        if (!enabledAttributeListInContext) {
            // In vertex array object context
            // PENDING Each vao object needs to enable attributes again?
            if (vao) {
                enabledAttributeListInContext
                    = vao.__enabledAttributeList
                    = [];
            }
            else {
                enabledAttributeListInContext
                    = enabledAttributeList[renderer.__uid__]
                    = [];
            }
        }
        var locationList = [];
        for (var i = 0; i < attribList.length; i++) {
            var symbol = attribList[i];
            if (!this.attributes[symbol]) {
                locationList[i] = -1;
                continue;
            }
            var location = locationMap[symbol];
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
            }
            else {
                enabledAttributeListInContext[location] = SHADER_STATE_KEEP_ENABLE;
            }
        }

        for (var i = 0; i < enabledAttributeListInContext.length; i++) {
            switch(enabledAttributeListInContext[i]){
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
        var locationMap = this._locations;

        var location = locationMap[symbol];
        if (location == null) {
            location = _gl.getAttribLocation(this._program, symbol);
            locationMap[symbol] = location;
        }

        return location;
    },

    buildProgram: function (_gl, shader, vertexShaderCode, fragmentShaderCode) {
        var vertexShader = _gl.createShader(_gl.VERTEX_SHADER);
        var program = _gl.createProgram();

        _gl.shaderSource(vertexShader, vertexShaderCode);
        _gl.compileShader(vertexShader);

        var fragmentShader = _gl.createShader(_gl.FRAGMENT_SHADER);
        _gl.shaderSource(fragmentShader, fragmentShaderCode);
        _gl.compileShader(fragmentShader);

        var msg = checkShaderErrorMsg(_gl, vertexShader, vertexShaderCode);
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
        if (shader.attributeSemantics['POSITION']) {
            _gl.bindAttribLocation(program, 0, shader.attributeSemantics['POSITION'].symbol);
        }
        else {
            // Else choose an attribute and bind to location 0;
            var keys = Object.keys(this.attributes);
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
        for (var i = 0; i < shader.uniforms.length; i++) {
            var uniformSymbol = shader.uniforms[i];
            this._locations[uniformSymbol] = _gl.getUniformLocation(program, uniformSymbol);
        }

    }
});

export default GLProgram;