import Shader from '../Shader';

var _library = {};

function ShaderLibrary () {
    this._pool = {};
}

ShaderLibrary.prototype.get = function(name) {
    var key = name;

    if (this._pool[key]) {
        return this._pool[key];
    }
    else {
        var source = _library[name];
        if (!source) {
            console.error('Shader "' + name + '"' + ' is not in the library');
            return;
        }
        var shader = new Shader(source.vertex, source.fragment);
        this._pool[key] = shader;
        return shader;
    }
};

ShaderLibrary.prototype.clear = function() {
    this._pool = {};
};

function template(name, vertex, fragment) {
    _library[name] = {
        vertex: vertex,
        fragment: fragment
    };
}

var defaultLibrary = new ShaderLibrary();

/**
 * ### Builin shaders
 * + qtek.standard
 * + qtek.basic
 * + qtek.lambert
 * + qtek.wireframe
 *
 * @namespace qtek.shader.library
 */
export default {
    /**
     * Create a new shader library.
     */
    createLibrary: function () {
        return new ShaderLibrary();
    },
    /**
     * Get shader from default library.
     * @param {string} name
     * @return {qtek.Shader}
     * @memberOf qtek.shader.library
     * @example
     *     qtek.shader.library.get('qtek.standard')
     */
    get: function () {
        return defaultLibrary.get.apply(defaultLibrary, arguments);
    },
    /**
     * @memberOf qtek.shader.library
     * @param  {string} name
     * @param  {string} vertex - Vertex shader code
     * @param  {string} fragment - Fragment shader code
     */
    template: template,
    clear: function () {
        return defaultLibrary.clear();
    }
};
