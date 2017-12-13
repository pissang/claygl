/**
 * @export{Object} library
 */
import Shader from '../Shader';

var _library = {};

/**
 * @export qtek.shader.library~Libaray
 */
function ShaderLibrary () {
    this._pool = {};
}

/**
 * ### Builin shaders
 * + qtek.standard
 * + qtek.basic
 * + qtek.lambert
 * + qtek.wireframe
 *
 * @namespace qtek.shader.library
 */
/**
 *
 * Get shader from library. use shader name and option as hash key.
 *
 * @param {string} name
 * @param {Object|string|Array.<string>} [option]
 * @return {qtek.Shader}
 *
 * @example
 *     qtek.shader.library.get('qtek.standard')
 */
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

/**
 * Clear shaders
 */
ShaderLibrary.prototype.clear = function() {
    this._pool = {};
};

/**
 * @memberOf qtek.shader.library
 * @param  {string} name
 * @param  {string} vertex - Vertex shader code
 * @param  {string} fragment - Fragment shader code
 */
function template(name, vertex, fragment) {
    _library[name] = {
        vertex: vertex,
        fragment: fragment
    };
}

var defaultLibrary = new ShaderLibrary();

/**
 * @alias qtek.shader.library
 */
export default {
    /**
     * Create a new shader library.
     */
    createLibrary: function () {
        return new ShaderLibrary();
    },
    get: function () {
        return defaultLibrary.get.apply(defaultLibrary, arguments);
    },
    template: template,
    clear: function () {
        return defaultLibrary.clear();
    }
};
